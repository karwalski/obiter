/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * BUG-004: Scan & Repair — plan builder (pure logic, no Office.js).
 *
 * Builds a repair plan from a {@link DocumentScanSnapshot} captured by
 * `documentScanner.ts` and the current citation library:
 *
 *  Pass A — Obiter content controls anywhere in the document (body,
 *  footnotes, endnotes):
 *    - control tag found in the store        -> "linked" (nothing to do)
 *    - control tag missing from the store    -> "rebuild" (lost store):
 *      a store entry is reconstructed from the control's text — structured
 *      where the deterministic parser is confident, otherwise a verbatim
 *      manual citation via the existing `overrideText` mechanism.
 *
 *  Pass B — plain-text notes (no Obiter controls at all), run through the
 *  DETERMINISTIC parser only (never the LLM — Scan & Repair is offline):
 *    - whole note text confidently parsed    -> "adopt" as a managed citation
 *    - anything else with text               -> "verbatim" manual citation
 *      (overrideText), the force-an-override escape hatch.
 *
 * Nothing in this module touches the document: the plan is previewed in the
 * UI and only the user-selected items are applied by `documentScanner.ts`.
 */

import type { Citation, SourceType, SourceData } from "../types/citation";
import { parseCitation } from "../api/citationParser";
import { parseCitationText } from "../ui/components/CitationPreview";
import { PARENT_CC_TAG } from "./footnoteManager";

// ─── Snapshot types (produced by documentScanner.captureDocumentSnapshot) ───

/** Where a scanned item lives in the document. */
export type ScanLocation = "body" | "footnote" | "endnote";

/** A content control as read from the document (one batched load). */
export interface ScannedControl {
  tag: string;
  title: string;
  text: string;
}

/** One footnote/endnote as read from the document. */
export interface ScannedNote {
  noteType: "footnote" | "endnote";
  /** 1-based index within its collection. */
  index: number;
  /** Note body text as read (may include the citation and prose). */
  text: string;
  /** All content controls inside the note. */
  controls: ScannedControl[];
}

/** Read-only capture of everything Scan & Repair inspects. */
export interface DocumentScanSnapshot {
  /** Content controls in the main document body (outside notes). */
  bodyControls: ScannedControl[];
  notes: ScannedNote[];
}

// ─── Plan types ──────────────────────────────────────────────────────────────

export type ScanItemKind = "linked" | "rebuild" | "adopt" | "verbatim";

/**
 * Document-side action taken when the item is applied:
 * - "none"    — store-only (Pass A: the control already exists)
 * - "managed" — replace the note's plain citation text with the parent-child
 *               content control structure (footnotes only; the refresher then
 *               re-renders it with full engine formatting)
 * - "flat"    — wrap the citation text in place with a single tagged content
 *               control, preserving the existing character formatting. Used
 *               for verbatim adoptions and endnotes (the refresher does not
 *               manage either, so the text is left exactly as it reads).
 */
export type ScanWrapMode = "none" | "managed" | "flat";

/** One row of the Scan & Repair preview table. */
export interface ScanItem {
  /** Stable key for selection state. */
  key: string;
  kind: ScanItemKind;
  location: ScanLocation;
  /** 1-based note index (footnote/endnote items only). */
  noteIndex?: number;
  /** Citation id — control tag (Pass A) or freshly generated (Pass B). */
  citationId: string;
  /** Text exactly as it reads in the document (used to locate the range). */
  rawText: string;
  /** Normalised citation text (whitespace collapsed, closing stop removed). */
  text: string;
  /** Proposed store entry; absent for "linked" items. */
  proposedCitation?: Citation;
  /** Trailing pinpoint preserved into the occurrence title on adoption. */
  pinpoint?: string;
  /** Whether the preview offers a checkbox for this item. */
  selectable: boolean;
  /** Default checkbox state (unparseable verbatim items default off). */
  defaultSelected: boolean;
  wrap: ScanWrapMode;
}

/** Aggregate counts for the preview header and the debug-log line. */
export interface ScanCounts {
  /** Total citation markers + plain citations found. */
  found: number;
  /** Controls already linked to store entries. */
  linked: number;
  /** Store entries to rebuild from orphaned controls (lost store). */
  rebuild: number;
  /** Plain-text citations confidently parsed for managed adoption. */
  adopt: number;
  /** Plain-text notes offered as verbatim manual citations. */
  verbatim: number;
}

export interface ScanPlan {
  items: ScanItem[];
  counts: ScanCounts;
}

export interface ScanPlanOptions {
  /** AGLC version stamped on proposed citations (store metadata). */
  aglcVersion?: "4" | "5";
  /** Clock override for tests. */
  now?: () => string;
  /** Id generator override for tests. */
  makeId?: () => string;
}

// ─── Text helpers ────────────────────────────────────────────────────────────

/** Collapse all whitespace runs (Word line breaks, nbsp) to single spaces. */
function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Strip a single trailing full stop (the footnote closer, Rule 1.1.4). */
function stripClosingStop(text: string): string {
  return text.replace(/\.$/, "").trim();
}

/**
 * Signals and prose lead-ins (Rule 1.2). A note starting with one of these
 * is more than a bare citation, so structured adoption is not attempted —
 * the verbatim escape hatch preserves the full text instead.
 */
const PROSE_LEAD_RE =
  /^(see|cf|but|contra|compare|eg|e\.g|ie|i\.e|note|cited|citing|quoting|quoted|affirmed|discussed|generally|especially|also|as|for|the court|above|below)\b/i;

/**
 * A tail that is only a pinpoint (", 42", " 42–43", " s 223", " [17]").
 * Anything longer or wordier means the note holds more than one citation
 * or trailing prose, so structured adoption is not confident.
 */
const PINPOINT_TAIL_RE =
  /^[,;]?\s*(?:at\s+)?(?:(?:ss?|pt|pts|div|sdiv|sch|schs|cl|cll|para|paras|r|rr|reg|regs|o|ord|art|arts|item|items|ch|chs)\s+)?[\d[(][\d[\]().,\-–—\s]*$/i;

const MAX_PINPOINT_TAIL_LENGTH = 40;

/** Extract the pinpoint value from a confident tail (leading comma dropped). */
function cleanPinpoint(tail: string): string | undefined {
  const cleaned = tail.replace(/^[,;]\s*/, "").trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

/** Whether a content control tag is a citation id (not an internal tag). */
function isCitationTag(tag: string | undefined | null): tag is string {
  return typeof tag === "string" && tag.length > 0 && !tag.startsWith("obiter-");
}

/** Fallback id generator (crypto.randomUUID with a non-secure fallback). */
function defaultMakeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Citation proposal ──────────────────────────────────────────────────────

/** Result of proposing a store entry for a piece of citation text. */
export interface CitationProposal {
  citation: Citation;
  /** True when the deterministic parser confidently structured the text. */
  structured: boolean;
  /** Trailing pinpoint captured from the text (structured proposals only). */
  pinpoint?: string;
}

/**
 * Propose a store entry for citation text found in the document.
 *
 * Structured (confident) only when the deterministic parser recognises the
 * text AND the whole string is accounted for (any tail must be a pinpoint).
 * Everything else becomes a verbatim manual citation via `overrideText` —
 * the engine then renders the text exactly as it read in the document.
 */
export function proposeCitationFromText(
  rawText: string,
  citationId: string,
  options?: { aglcVersion?: "4" | "5"; nowIso?: string; firstFootnoteNumber?: number }
): CitationProposal | null {
  const normalised = stripClosingStop(collapseWhitespace(rawText));
  if (normalised.length === 0) return null;

  const nowIso = options?.nowIso ?? new Date().toISOString();
  const aglcVersion = options?.aglcVersion ?? "4";

  const base: Citation = {
    id: citationId,
    aglcVersion,
    sourceType: "custom",
    data: {},
    tags: [],
    createdAt: nowIso,
    modifiedAt: nowIso,
    ...(options?.firstFootnoteNumber !== undefined
      ? { firstFootnoteNumber: options.firstFootnoteNumber }
      : {}),
  };

  const structured = !PROSE_LEAD_RE.test(normalised) ? proposeStructured(normalised, base) : null;
  if (structured) return structured;

  // Verbatim manual citation: the existing overrideText mechanism. The
  // engine bypasses structured formatting and renders the text as-is.
  return {
    citation: {
      ...base,
      sourceType: "custom",
      overrideText: normalised,
      data: {
        customText: normalised,
        title: normalised.substring(0, 80),
      },
    },
    structured: false,
  };
}

/** Attempt a confident structured proposal; null falls back to verbatim. */
function proposeStructured(normalised: string, base: Citation): CitationProposal | null {
  const parsed = parseCitation(normalised);
  if (!parsed) return null;

  // The whole string must be the citation: the text after the parsed core
  // may only be a pinpoint. Extra prose or a second citation is not
  // confident and must go through the verbatim path instead.
  const coreIndex = normalised.indexOf(parsed.raw);
  const tail = coreIndex >= 0 ? normalised.slice(coreIndex + parsed.raw.length).trim() : "";
  const tailOk =
    tail.length === 0 || (tail.length <= MAX_PINPOINT_TAIL_LENGTH && PINPOINT_TAIL_RE.test(tail));
  if (!tailOk) return null;
  const pinpoint = cleanPinpoint(tail);

  if (parsed.type === "report" || parsed.type === "mnc") {
    // Case citation: parties must precede the parsed core (Rule 2.1.1 —
    // the hardened BUG-002 parser splits only on ' v ').
    const sourceType: SourceType =
      parsed.type === "report" ? "case.reported" : "case.unreported.mnc";
    const { data, warnings } = parseCitationText(normalised, sourceType);
    if (warnings.length > 0) return null;
    if (typeof data.party1 !== "string" || typeof data.party2 !== "string") return null;
    if (
      parsed.type === "report" &&
      (data.volume === undefined || data.startingPage === undefined)
    ) {
      // A report core without volume/page fields means the aliasing between
      // the two parsers disagreed — not confident.
      return null;
    }
    if (parsed.type === "mnc" && (data.court === undefined || data.caseNumber === undefined)) {
      return null;
    }
    return {
      citation: { ...base, sourceType, data: data as SourceData },
      structured: true,
      ...(pinpoint ? { pinpoint } : {}),
    };
  }

  if (parsed.type === "statute") {
    // Statute: jurisdiction already validated against the AGLC4 set by the
    // deterministic parser; the title must run from the start of the text.
    if (!normalised.startsWith(parsed.title)) return null;
    return {
      citation: {
        ...base,
        sourceType: "legislation.statute",
        data: {
          title: parsed.title,
          year: parsed.year,
          jurisdiction: parsed.jurisdiction,
        },
      },
      structured: true,
      ...(pinpoint ? { pinpoint } : {}),
    };
  }

  // Hansard (Rule 7.5.1): field names per the engine's hansard dispatcher.
  return {
    citation: {
      ...base,
      sourceType: "hansard",
      data: {
        jurisdiction: parsed.parliament,
        chamber: parsed.chamber,
        date: parsed.date,
        page: parsed.page,
        ...(parsed.speaker ? { speaker: parsed.speaker } : {}),
      },
    },
    structured: true,
    ...(pinpoint ? { pinpoint } : {}),
  };
}

// ─── Plan builder ────────────────────────────────────────────────────────────

/**
 * Build the Scan & Repair plan from a document snapshot and the current
 * library. Pure: nothing is modified; the caller previews `plan.items`
 * and passes the user-selected subset to `applyScanPlan`.
 */
export function buildScanPlan(
  snapshot: DocumentScanSnapshot,
  storeCitations: readonly Citation[],
  options?: ScanPlanOptions
): ScanPlan {
  const nowIso = (options?.now ?? (() => new Date().toISOString()))();
  const makeId = options?.makeId ?? defaultMakeId;
  const aglcVersion = options?.aglcVersion ?? "4";
  const knownIds = new Set(storeCitations.map((c) => c.id));

  const items: ScanItem[] = [];
  /** Control tags already planned for rebuild (dedupe across occurrences). */
  const plannedRebuilds = new Set<string>();

  const addControlItem = (
    control: ScannedControl,
    location: ScanLocation,
    noteIndex?: number
  ): void => {
    if (!isCitationTag(control.tag)) return;
    const keyBase = `${location}-${noteIndex ?? 0}-${control.tag}`;

    if (knownIds.has(control.tag)) {
      items.push({
        key: `linked-${keyBase}`,
        kind: "linked",
        location,
        ...(noteIndex !== undefined ? { noteIndex } : {}),
        citationId: control.tag,
        rawText: control.text.trim(),
        text: stripClosingStop(collapseWhitespace(control.text)),
        selectable: false,
        defaultSelected: false,
        wrap: "none",
      });
      return;
    }

    // Lost store: rebuild the entry from the control's data. Only the first
    // occurrence of a tag proposes the rebuild; repeat occurrences of the
    // same citation are deduplicated.
    if (plannedRebuilds.has(control.tag)) return;
    plannedRebuilds.add(control.tag);

    const proposal = proposeCitationFromText(control.text, control.tag, {
      aglcVersion,
      nowIso,
      ...(location === "footnote" && noteIndex !== undefined
        ? { firstFootnoteNumber: noteIndex }
        : {}),
    });
    if (!proposal) return;

    items.push({
      key: `rebuild-${keyBase}`,
      kind: "rebuild",
      location,
      ...(noteIndex !== undefined ? { noteIndex } : {}),
      citationId: control.tag,
      rawText: control.text.trim(),
      text: stripClosingStop(collapseWhitespace(control.text)),
      proposedCitation: proposal.citation,
      ...(proposal.pinpoint ? { pinpoint: proposal.pinpoint } : {}),
      selectable: true,
      defaultSelected: true,
      wrap: "none",
    });
  };

  // ── Pass A: content controls anywhere in the document ────────────────────
  for (const control of snapshot.bodyControls) {
    addControlItem(control, "body");
  }
  for (const note of snapshot.notes) {
    for (const control of note.controls) {
      addControlItem(control, note.noteType, note.index);
    }
  }

  // ── Pass B: plain-text notes (no Obiter controls at all) ─────────────────
  for (const note of snapshot.notes) {
    const hasObiterStructure = note.controls.some(
      (c) => c.tag === PARENT_CC_TAG || isCitationTag(c.tag)
    );
    if (hasObiterStructure) continue;

    const rawText = note.text.trim();
    if (collapseWhitespace(rawText).length === 0) continue;

    const citationId = makeId();
    const proposal = proposeCitationFromText(rawText, citationId, {
      aglcVersion,
      nowIso,
      ...(note.noteType === "footnote" ? { firstFootnoteNumber: note.index } : {}),
    });
    if (!proposal) continue;

    if (proposal.structured) {
      items.push({
        key: `adopt-${note.noteType}-${note.index}`,
        kind: "adopt",
        location: note.noteType,
        noteIndex: note.index,
        citationId,
        rawText,
        text: stripClosingStop(collapseWhitespace(rawText)),
        proposedCitation: proposal.citation,
        ...(proposal.pinpoint ? { pinpoint: proposal.pinpoint } : {}),
        selectable: true,
        defaultSelected: true,
        // Managed conversion is only meaningful where the refresher formats
        // (footnotes). Endnotes keep their text via an in-place flat wrap.
        wrap: note.noteType === "footnote" ? "managed" : "flat",
      });
    } else {
      items.push({
        key: `verbatim-${note.noteType}-${note.index}`,
        kind: "verbatim",
        location: note.noteType,
        noteIndex: note.index,
        citationId,
        rawText,
        text: stripClosingStop(collapseWhitespace(rawText)),
        proposedCitation: proposal.citation,
        selectable: true,
        // Unparseable text is OFFERED, never auto-selected: the user
        // confirms each verbatim adoption explicitly.
        defaultSelected: false,
        wrap: "flat",
      });
    }
  }

  const counts: ScanCounts = {
    found: items.length,
    linked: items.filter((i) => i.kind === "linked").length,
    rebuild: items.filter((i) => i.kind === "rebuild").length,
    adopt: items.filter((i) => i.kind === "adopt").length,
    verbatim: items.filter((i) => i.kind === "verbatim").length,
  };

  return { items, counts };
}
