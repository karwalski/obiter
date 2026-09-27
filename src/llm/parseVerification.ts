/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * LCT-010: Parse-verification feedback loop for AI-parsed citations.
 *
 * Every AI parse goes through at least one verification round before the
 * user sees it:
 *
 *   1. Obiter checks the model's answer deterministically: unknown and
 *      missing fields (against the engine's own field contract), numbers
 *      that aren't in the input or are used twice (LCT-001 grounding), fields
 *      the formatter never renders, empty elements in the output, pinpoint
 *      form, report-series/court mix-ups, and input text that went nowhere.
 *   2. Obiter renders the parse with the real AGLC4 engine.
 *   3. The model gets the type's contract (required and optional fields,
 *      Obiter's layout template, Obiter's own rule notes), its previous
 *      answer, the rendering and the numbered issues. It returns a corrected
 *      record, its decisions on the pinpoint, signal and commentary, an
 *      account of any input text AGLC4 drops, and an explanation for any
 *      issue it considers expected. It may switch source type; the next
 *      round then briefs it on the new type.
 *   4. Repeat until the model confirms and no blocking issue is left, or
 *      the round budget runs out. The best-scoring record wins, so a worse
 *      answer in a later round never replaces a better one.
 *
 * In this interactive flow nothing is blanked: remaining problems become
 * warnings on the form, so the user decides. Ideas credited to
 * finnjones/legal-citation-tool (coverage, grounding, rendering checks and
 * one targeted re-ask); reimplemented here, no code copied.
 */

import type { Citation, SourceData, SourceType } from "../types/citation";
import { INTRODUCTORY_SIGNALS, type IntroductorySignal } from "../types/citation";
import type { LLMConfig } from "./config";
import { callLlmMultiTurn, type ChatMessage } from "./client";
import { findOverusedNumbers, findUngroundedNumbers, flattenFields } from "./grounding";
import { exportRuleReference } from "../engine/ruleExporter";
import { formatCitation } from "../engine/engine";
import { FIELD_ALIASES, getFieldAliases } from "../engine/fieldAliases";
import { listMissingRequiredFields } from "../engine/validator";
import { referenceGuideEntries } from "../ui/data/referenceGuide";
import { REPORT_SERIES } from "../engine/data/report-series";
import { APPENDIX_A_SERIES } from "../engine/data/appendix-a-series";
import { UK_REPORT_SERIES } from "../engine/data/uk-report-series";
import { COURT_IDENTIFIERS } from "../engine/data/court-identifiers";
import { PINPOINT_ABBREVIATIONS } from "../engine/data/pinpoint-abbrevs";
import { getFieldSchemaForSourceType } from "./fieldSchema";

// ─── Types ──────────────────────────────────────────────────────────────────

/** A parse as the model (or a previous round) proposes it. */
export interface ParseCandidate {
  sourceType: SourceType;
  data: Record<string, unknown>;
  shortTitle?: string;
  signal?: IntroductorySignal;
  commentaryBefore?: string;
  commentaryAfter?: string;
  /** Input text the model says AGLC4 deliberately drops, with its reason. */
  omitted?: Array<{ text: string; reason: string }>;
  /** Points the model wants the user to check. */
  notes?: string[];
}

export type ParseIssueKind =
  | "unknown_source_type"
  | "unknown_field"
  | "missing_required"
  | "ungrounded_number"
  | "overused_number"
  | "field_not_rendered"
  | "empty_element"
  | "render_failed"
  | "pinpoint_format"
  | "series_court_mixup"
  | "uncovered_text"
  | "et_al_authors"
  | "invalid_signal";

export interface ParseIssue {
  /**
   * Stable across rounds: the kind plus the field, eg "field_not_rendered:
   * edition". The model explains an issue by this id, so a fix elsewhere in
   * the record never shifts which issue an explanation dismisses.
   */
  id: string;
  kind: ParseIssueKind;
  field?: string;
  message: string;
  /** "warning" issues block confirmation; "info" issues are advisory. */
  severity: "warning" | "info";
}

export interface VerificationSummary {
  /** Verification rounds actually sent to the model. */
  rounds: number;
  /** True when the model confirmed the final record and no warning remains. */
  confirmed: boolean;
  /** The final record rendered by Obiter's engine (italics as *…*). */
  rendered: string;
  /** Issues still present on the returned record. */
  remainingIssues: ParseIssue[];
}

export interface VerifiedParse extends ParseCandidate {
  /** User-facing problems to fix or check before inserting. */
  warnings: string[];
  /** User-facing, non-blocking notes (model notes, explained issues). */
  notes: string[];
  verification: VerificationSummary;
}

export interface VerifyOptions {
  /** Maximum verification rounds sent to the model (default 2, minimum 1). */
  maxRounds?: number;
  /** Field names whose numbers may legitimately repeat another field's. */
  ignoreOverusedFields?: string[];
}

// ─── Reference data ─────────────────────────────────────────────────────────

// Built on first use, not at module load: the task pane imports this module
// through the Preview editor even for users who never parse with AI.
type ContractEntry = ReturnType<typeof exportRuleReference>["sourceTypes"][number];
let contract: Map<string, ContractEntry> | null = null;
function getContract(): Map<string, ContractEntry> {
  contract ??= new Map(exportRuleReference().sourceTypes.map((t) => [t.type, t]));
  return contract;
}

let seriesAbbrevs: Set<string> | null = null;
let courtCodes: Set<string> | null = null;
function isReportSeries(abbrev: string): boolean {
  seriesAbbrevs ??= new Set(
    [...REPORT_SERIES, ...APPENDIX_A_SERIES, ...UK_REPORT_SERIES].map((x) => x.abbreviation)
  );
  return seriesAbbrevs.has(abbrev);
}
function isCourtCode(code: string): boolean {
  courtCodes ??= new Set(COURT_IDENTIFIERS.map((c) => c.code));
  return courtCodes.has(code);
}

/** Every source type the engine formats, from the dispatch contract. */
export function isKnownSourceType(value: unknown): value is SourceType {
  return typeof value === "string" && getContract().has(value);
}

/**
 * Map a model's signal to the AGLC4 r 1.2 signal it means, ignoring case,
 * spacing and punctuation ("see, e.g." -> "See, eg,"). Unknown values stay
 * as given so the check can report them; they never reach the form.
 */
export function normaliseSignal(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const key = (x: string): string => x.toLowerCase().replace(/[^a-z]/g, "");
  return INTRODUCTORY_SIGNALS.find((sig) => key(sig) === key(value)) ?? value.trim();
}

function isValidSignal(value: unknown): value is IntroductorySignal {
  return (INTRODUCTORY_SIGNALS as readonly unknown[]).includes(value);
}

/** Fields holding enum-like switches rather than rendered text. */
const NON_RENDERED_FIELDS = new Set([
  "yearType",
  "separator",
  "foreignSubType",
  "notYetInForce",
  "jurisdiction",
  "courtId",
  "court",
  "parallelCitations",
  "caseHistory",
  "judicialOfficers",
]);

/**
 * Words that carry citation furniture rather than content: subsequent
 * reference words and pinpoint labels. Their absence from the rendering is
 * never a coverage problem. Signal words are not noise: a leading signal must
 * be captured in `signal`, so an uncaptured "See" is reported.
 */
const NOISE_WORDS = new Set([
  "at",
  "ibid",
  "id",
  "supra",
  "op",
  "cit",
  "above",
  "n",
  "p",
  "pp",
  "pg",
  "para",
  "paras",
  "no",
  "and",
  "v",
  ...PINPOINT_ABBREVIATIONS.flatMap((a) => [a.singular, a.plural]),
]);

// ─── Type brief ─────────────────────────────────────────────────────────────

/** Fields the model may use for a type: the contract plus the form's names. */
export function allowedFieldsFor(sourceType: SourceType): Set<string> {
  const meta = getContract().get(sourceType);
  const names = [
    ...(meta?.requiredFields ?? []),
    ...(meta?.optionalFields ?? []),
    ...getFieldSchemaForSourceType(sourceType).map((f) => f.name),
  ];
  const allowed = new Set<string>(names);
  for (const n of names) for (const a of getFieldAliases(n)) allowed.add(a);
  allowed.add("pinpoint");
  return allowed;
}

function guideEntriesFor(ruleNumber: string): typeof referenceGuideEntries {
  const section = ruleNumber.split(".").slice(0, 2).join(".");
  return referenceGuideEntries
    .filter((e) =>
      e.ruleNumber
        .split(/,\s*/)
        .some((r) => r === section || r === ruleNumber || ruleNumber.startsWith(`${r}.`))
    )
    .slice(0, 3);
}

/**
 * Build the per-type brief the model verifies against: the engine's field
 * contract, Obiter's layout template and Obiter's own notes on the rule.
 * Everything here is Obiter's derived data, not AGLC4's text.
 */
export function buildTypeBrief(sourceType: SourceType): string {
  const meta = getContract().get(sourceType);
  if (!meta) return `Source type "${sourceType}" is not one Obiter formats.`;
  const descriptions = new Map(
    getFieldSchemaForSourceType(sourceType).map((f) => [f.name, f.description])
  );
  const describe = (f: string): string => {
    const d = descriptions.get(f);
    const aliases = FIELD_ALIASES[f];
    return `    - ${f}${d ? `: ${d}` : ""}${aliases?.length ? ` (also accepted as ${aliases.join(", ")})` : ""}`;
  };
  const guide = guideEntriesFor(meta.ruleNumber)
    .map((e) => `  AGLC4 r ${e.ruleNumber} (${e.title}): ${e.summary} ${e.tips.join(" ")}`)
    .join("\n");
  return [
    `Source type "${sourceType}": ${meta.label} (AGLC4 r ${meta.ruleNumber})`,
    meta.provenance === "experimental_pending_aglc5"
      ? `  Experimental: not an official AGLC4 form. ${meta.provenanceNote ?? ""}`
      : "",
    `  Layout Obiter renders: ${meta.formatTemplate}`,
    `  Required fields:`,
    ...meta.requiredFields.map(describe),
    `  Optional fields:`,
    ...meta.optionalFields.map(describe),
    guide ? `  Obiter's notes on the rule:\n${guide}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * General AGLC4 guidance for the decisions the model must make on every
 * citation, in Obiter's words (derived from AGLC4 rr 1.1.6, 1.1.7, 1.2 and
 * 2.2.5; the guide itself is the authority).
 */
export const GENERAL_DECISION_GUIDANCE = `Deciding the pinpoint (AGLC4 rr 1.1.6-1.1.7):
- The pinpoint is the part of the input that points into the source after the citation proper, usually after a comma. Put it in "pinpoint" exactly as AGLC4 writes it.
- Pages are bare numbers ("42"), never "p 42", "pg 42" or "at 42". Paragraphs are in square brackets ("[20]"), not "para 20", except for legislation and some international materials, which use designations such as "s 5B", "ss 3–5", "art 2", "para 4".
- Page and paragraph together: page first ("528 [57]"). Several pinpoints are separated by commas.
- Spans use an unspaced en dash (–). Page spans are shortened ("431–2"); paragraph spans are not ("[57]–[63]").
- A starting page and a pinpoint can be the same number only if the input repeats it (AGLC4 r 2.2.5 "24 CLR 21, 21"). If the number appears once, it is the starting page and there is no pinpoint.

Deciding signals and commentary (AGLC4 r 1.2):
- A leading introductory signal belongs in "signal". Use exactly one of: ${INTRODUCTORY_SIGNALS.map((s) => `"${s}"`).join(", ")}, or null.
- Prose before the citation goes in "commentaryBefore"; prose after it (eg "(emphasis added)", "and the cases cited there") goes in "commentaryAfter". Do not put them in data fields.
- Text AGLC4 deliberately drops (eg "Pty Ltd" in a publisher, "p" before a page, a trailing full stop) goes in "omitted" with a short reason.

Short title (AGLC4 r 1.4.4):
- Always suggest one in "shortTitle", even if the input has none. Obiter decides when the "('…')" appears in the output, so never remove a short title and don't write notes about whether it appears.

Authors: if the input shows "et al", list only the author(s) it names. Never supply the missing authors, even if you know them; Obiter asks the user.

Never invent. Leave a field out if its value is not in the input. Every number you use must come from the input, and each occurrence of a number in the input fills at most one field.`;

// ─── Rendering ──────────────────────────────────────────────────────────────

function toCitation(c: ParseCandidate): Citation {
  const now = new Date().toISOString();
  return {
    id: "parse-verification",
    aglcVersion: "4",
    sourceType: c.sourceType,
    data: c.data as unknown as SourceData,
    shortTitle: c.shortTitle,
    signal: c.signal,
    commentaryBefore: c.commentaryBefore,
    commentaryAfter: c.commentaryAfter,
    tags: [],
    createdAt: now,
    modifiedAt: now,
  };
}

interface Rendering {
  text: string;
  emptyItalic: boolean;
  error?: string;
}

/** Render a candidate with the real engine: plain text with *italics*. */
export function renderCandidate(c: ParseCandidate): Rendering {
  try {
    const runs = formatCitation(toCitation(c));
    const emptyItalic = runs.some((r) => r.italic && r.text.trim() === "");
    const text = runs
      .map((r) => (r.italic && r.text.trim() ? `*${r.text}*` : r.text))
      .join("")
      .replace(/\*\*/g, "");
    return { text, emptyItalic };
  } catch (err: unknown) {
    return {
      text: "",
      emptyItalic: false,
      error: err instanceof Error ? err.message : "the formatter failed",
    };
  }
}

// ─── Deterministic checks ───────────────────────────────────────────────────

function words(text: string): string[] {
  return (
    text
      .replace(/[*_]/g, " ")
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu) ?? []
  );
}

/**
 * Words of a rendering, plus the bare number of each ordinal: the engine
 * writes an edition stored as "6" as "6th ed", which renders the "6".
 */
function renderedWordSet(text: string): Set<string> {
  const out = new Set<string>();
  for (const w of words(text)) {
    out.add(w);
    const ordinal = /^(\d+)(st|nd|rd|th)$/.exec(w);
    if (ordinal) out.add(ordinal[1]);
  }
  return out;
}

/**
 * Assign ids that stay stable across rounds: kind plus field, with a counter
 * only when the same kind and field occur twice.
 */
function withStableIds(issues: Omit<ParseIssue, "id">[]): ParseIssue[] {
  const seen = new Map<string, number>();
  return issues.map((i) => {
    const base = i.field ? `${i.kind}:${i.field}` : i.kind;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return { ...i, id: n === 1 ? base : `${base}#${n}` };
  });
}

/**
 * A full neutral citation string ("[2011] HCA 11") in `mnc` or
 * `citationDetails` restates the year. Drop the bracketed year before the
 * overuse count, so the year field isn't flagged but the judgment number
 * still is when it's copied into the pinpoint.
 */
function withoutRestatedYears(data: Record<string, unknown>): Record<string, unknown> {
  const out = { ...data };
  for (const k of ["mnc", "citationDetails"]) {
    if (typeof out[k] === "string") out[k] = (out[k] as string).replace(/[[(]\d{4}[\])]/g, "");
  }
  return out;
}

function isPresent(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

function pinpointProblems(sourceType: SourceType, pinpoint: string): string[] {
  const out: string[] = [];
  if (/^\s*(p|pp|pg)\.?\s*\d/i.test(pinpoint)) {
    out.push(
      `Pinpoint "${pinpoint}" has a page prefix; AGLC4 r 1.1.6 gives pages as bare numbers.`
    );
  }
  if (/^\s*at\s/i.test(pinpoint)) {
    out.push(
      `Pinpoint "${pinpoint}" starts with "at"; AGLC4 r 1.1.6 uses "at" only in the r 1.4.6 case.`
    );
  }
  const paraAllowed = /^(legislation|un\.|treaty|icj|wto|gatt|eu\.|supranational)/.test(sourceType);
  if (!paraAllowed && /^\s*paras?\.?\s*\d/i.test(pinpoint)) {
    out.push(
      `Pinpoint "${pinpoint}" uses "para"; AGLC4 r 1.1.6 puts paragraph numbers in square brackets, eg "[20]".`
    );
  }
  if (/\d\s*-\s*\[?\d/.test(pinpoint)) {
    out.push(`Pinpoint "${pinpoint}" uses a hyphen in a span; AGLC4 r 1.1.7 uses an en dash.`);
  }
  return out;
}

/**
 * Run every deterministic check on a candidate. Pure apart from rendering.
 * Ids are stable across rounds (see withStableIds) so the model can cite them.
 */
export function checkParse(
  input: string,
  c: ParseCandidate,
  opts: VerifyOptions = {}
): { issues: ParseIssue[]; rendered: string } {
  const issues: Omit<ParseIssue, "id">[] = [];
  const push = (i: Omit<ParseIssue, "id">): void => {
    issues.push(i);
  };

  if (!isKnownSourceType(c.sourceType)) {
    push({
      kind: "unknown_source_type",
      severity: "warning",
      message: `"${c.sourceType}" is not a source type Obiter formats.`,
    });
    return { issues: withStableIds(issues), rendered: "" };
  }

  // Field contract.
  const allowed = allowedFieldsFor(c.sourceType);
  for (const key of Object.keys(c.data)) {
    if (!allowed.has(key)) {
      push({
        kind: "unknown_field",
        field: key,
        // Dropped automatically before the result is returned, so it never
        // blocks confirmation; the model still hears about it.
        severity: "info",
        message: `Field "${key}" is not a field of ${c.sourceType}, so Obiter drops it. Use one of the listed fields.`,
      });
    }
  }
  for (const f of listMissingRequiredFields(c.sourceType, c.data)) {
    push({
      kind: "missing_required",
      field: f,
      severity: "warning",
      message: `Required field "${f}" is empty.`,
    });
  }

  // Grounding (LCT-001).
  for (const u of findUngroundedNumbers(input, c.data)) {
    push({
      kind: "ungrounded_number",
      field: u.field,
      severity: "warning",
      message: `${u.field} "${u.value}" contains ${u.missing.join(", ")}, which isn't in the input text.`,
    });
  }
  for (const o of findOverusedNumbers(
    input,
    withoutRestatedYears(c.data),
    opts.ignoreOverusedFields ?? []
  )) {
    push({
      kind: "overused_number",
      field: o.fields.join(", "),
      severity: o.fields.some((f) => f.startsWith("pinpoint")) ? "warning" : "info",
      message: `${o.number} appears ${o.inputCount === 1 ? "once" : `${o.inputCount} times`} in the input but fills ${o.fields.join(" and ")}.`,
    });
  }

  // Pinpoint form.
  const pin = typeof c.data.pinpoint === "string" ? c.data.pinpoint : "";
  for (const m of pinpointProblems(c.sourceType, pin)) {
    // A hyphen may be part of a CCH paragraph number (¶41-703), so that one is advisory.
    const severity = m.includes("hyphen") ? "info" : "warning";
    push({ kind: "pinpoint_format", field: "pinpoint", severity, message: m });
  }

  // Report series versus court identifier (AGLC4 rr 2.2, 2.3.1).
  const court = String(c.data.court ?? c.data.courtId ?? "");
  if (
    c.sourceType === "case.unreported.mnc" &&
    court &&
    !isCourtCode(court) &&
    isReportSeries(court)
  ) {
    push({
      kind: "series_court_mixup",
      field: "court",
      severity: "warning",
      message: `"${court}" is a report series, not a court identifier, so this is probably a reported case (case.reported) with "${court}" as the report series.`,
    });
  }
  const series = String(c.data.reportSeries ?? "");
  if (
    c.sourceType === "case.reported" &&
    series &&
    isCourtCode(series) &&
    !isReportSeries(series)
  ) {
    push({
      kind: "series_court_mixup",
      field: "reportSeries",
      severity: "warning",
      message: `"${series}" is a court identifier, not a report series, so this is probably a medium neutral citation (case.unreported.mnc).`,
    });
  }

  // Signal.
  if (c.signal !== undefined && !isValidSignal(c.signal)) {
    push({
      kind: "invalid_signal",
      severity: "warning",
      message: `"${String(c.signal)}" is not an AGLC4 r 1.2 introductory signal.`,
    });
  }

  // Rendering.
  const r = renderCandidate(c);
  if (r.error) {
    push({
      kind: "render_failed",
      severity: "warning",
      message: `Obiter could not format this record: ${r.error}.`,
    });
  } else {
    if (r.emptyItalic || /‘’|''|\(\s*\)|\[\s*\]|\s,|,\s{2,}|\(ed\),\s+\(/.test(r.text)) {
      push({
        kind: "empty_element",
        severity: "warning",
        message:
          "The formatted citation has an empty element, so a field it needs is missing or misnamed.",
      });
    }
    const renderedWords = renderedWordSet(r.text);
    for (const [field, value] of flattenFields(c.data)) {
      const top = field.split(".")[0];
      if (NON_RENDERED_FIELDS.has(top) || top === "pinpoint" || !allowed.has(top)) continue;
      const w = words(value).filter((x) => !NOISE_WORDS.has(x));
      if (w.length === 0) continue;
      const missing = w.filter((x) => !renderedWords.has(x));
      if (missing.length / w.length > 0.5) {
        push({
          kind: "field_not_rendered",
          field,
          severity: "warning",
          message: `${field} "${value}" doesn't appear in Obiter's formatted citation, so the formatter doesn't read it for ${c.sourceType}.`,
        });
      }
    }

    // Coverage: input words that reached neither the rendering nor an
    // accounted-for channel.
    const accounted = new Set([
      ...renderedWords,
      ...words(c.signal ?? ""),
      ...words(c.commentaryBefore ?? ""),
      ...words(c.commentaryAfter ?? ""),
      ...(c.omitted ?? []).flatMap((o) => words(o.text)),
    ]);
    // "et al" in the input means the source has more than three authors
    // (AGLC4 r 4.1.2). The record can't hold authors the input doesn't name,
    // and the engine writes "et al" only once there are four, so tell the
    // user what to add instead of reporting two stray words.
    const etAl = /\bet\.?\s+al\b/i.test(input.replace(/[*_]/g, "")) && !/\bet al\b/.test(r.text);
    if (etAl) {
      push({
        kind: "et_al_authors",
        field: "authors",
        severity: "warning",
        message:
          "The citation says 'et al', so the source has more than three authors (AGLC4 r 4.1.2). Add the other authors from the source; Obiter shows the first author and 'et al' once four are listed.",
      });
    }
    const uncovered = [...new Set(words(input))].filter(
      (x) => !accounted.has(x) && !NOISE_WORDS.has(x) && !(etAl && (x === "et" || x === "al"))
    );
    if (uncovered.length > 0) {
      push({
        kind: "uncovered_text",
        severity: "warning",
        message: `Input text missing from the result: ${uncovered.slice(0, 12).join(", ")}. Place it in a field, the pinpoint, the signal or commentary, or list it in "omitted".`,
      });
    }
  }

  return { issues: withStableIds(issues), rendered: r.text };
}

// ─── The loop ───────────────────────────────────────────────────────────────

/** Kinds the model may explain away as expected (they become notes). */
const EXPLAINABLE = new Set<ParseIssueKind>([
  "field_not_rendered",
  "overused_number",
  "uncovered_text",
  "empty_element",
]);

const VERIFY_SYSTEM_PROMPT = `You check and correct structured legal citation records for Obiter, a Word add-in that formats citations under AGLC4. Obiter's engine renders your record; you compare that rendering with the text the user supplied.

${GENERAL_DECISION_GUIDANCE}

Respond with ONLY valid JSON (no markdown fencing) in this shape:
{
  "confirmed": true | false,
  "sourceType": "<source type>",
  "data": { <the complete corrected record, using only that type's fields> },
  "shortTitle": "<suggested short title; never empty>",
  "signal": <one of the signals above, or null>,
  "commentaryBefore": "<text or empty string>",
  "commentaryAfter": "<text or empty string>",
  "omitted": [ { "text": "<input text AGLC4 drops>", "reason": "<why>" } ],
  "explanations": { "<issue id>": "<why this issue is expected and needs no change>" },
  "notes": [ "<anything the user should check, one short sentence each, at most 3>" ]
}

Set "confirmed" to true only if Obiter's rendering of your returned record represents the input source faithfully under AGLC4. If another source type fits better, change "sourceType" and use that type's fields.`;

interface VerifyResponse {
  confirmed?: unknown;
  sourceType?: unknown;
  data?: unknown;
  shortTitle?: unknown;
  signal?: unknown;
  commentaryBefore?: unknown;
  commentaryAfter?: unknown;
  omitted?: unknown;
  explanations?: unknown;
  notes?: unknown;
}

function buildVerifyMessages(
  input: string,
  c: ParseCandidate,
  rendered: string,
  issues: ParseIssue[],
  round: number
): ChatMessage[] {
  const record = {
    sourceType: c.sourceType,
    data: c.data,
    shortTitle: c.shortTitle ?? "",
    signal: c.signal ?? null,
    commentaryBefore: c.commentaryBefore ?? "",
    commentaryAfter: c.commentaryAfter ?? "",
    omitted: c.omitted ?? [],
  };
  const issueList =
    issues.length > 0
      ? issues.map((i) => `  ${i.id} [${i.severity}] ${i.message}`).join("\n")
      : "  (none found by Obiter's checks)";
  return [
    { role: "system", content: VERIFY_SYSTEM_PROMPT },
    {
      role: "user",
      content: `Verification round ${round}.

Input text supplied by the user:
${input}

Contract for the current source type:
${buildTypeBrief(c.sourceType)}

Current record:
${JSON.stringify(record, null, 2)}

Obiter's AGLC4 rendering of the current record:
${rendered || "(could not be rendered)"}

Issues Obiter found:
${issueList}

Fix every issue you can. For an issue that is expected and needs no change, explain it in "explanations" by its id. Then confirm or reject the result.`,
    },
  ];
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() !== "" ? v : undefined;
}

/**
 * Return the first complete top-level JSON object in a model reply, so a
 * reply wrapped in prose or code fences still parses. Throws when there is
 * no complete object, for example when the reply was cut off.
 */
export function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  if (start < 0) throw new Error("no JSON object in the reply");
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  throw new Error("the JSON object in the reply is incomplete");
}

/**
 * The verify reply repeats the whole record plus notes and explanations, so it
 * needs more room than a plain parse. The 1,024-token default truncated real
 * replies mid-object.
 */
const MIN_VERIFY_MAX_TOKENS = 2048;

function parseVerifyResponse(
  text: string,
  previous: ParseCandidate
): {
  candidate: ParseCandidate;
  confirmed: boolean;
  explanations: Record<string, string>;
} {
  const raw = JSON.parse(extractJsonObject(text)) as VerifyResponse;
  const data =
    raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)
      ? (raw.data as Record<string, unknown>)
      : previous.data;
  const sourceType = isKnownSourceType(raw.sourceType) ? raw.sourceType : previous.sourceType;
  const omitted = Array.isArray(raw.omitted)
    ? raw.omitted
        .filter((o): o is { text: string; reason?: string } => !!o && typeof o.text === "string")
        .map((o) => ({ text: o.text, reason: String(o.reason ?? "") }))
    : [];
  const explanations: Record<string, string> = {};
  if (raw.explanations && typeof raw.explanations === "object") {
    for (const [k, v] of Object.entries(raw.explanations as Record<string, unknown>)) {
      if (typeof v === "string") explanations[k] = v;
    }
  }
  // Normalised to the r 1.2 list; an unmatched value is kept for the check
  // to report and is dropped before the result reaches the form.
  const signal = normaliseSignal(raw.signal) as IntroductorySignal | undefined;
  return {
    candidate: {
      sourceType,
      data,
      // The model may improve the short title but never remove it: Obiter,
      // not the model, decides when it appears (r 1.4.4).
      shortTitle: asString(raw.shortTitle) ?? previous.shortTitle,
      signal,
      commentaryBefore: asString(raw.commentaryBefore),
      commentaryAfter: asString(raw.commentaryAfter),
      omitted,
      notes: Array.isArray(raw.notes)
        ? raw.notes.filter((n): n is string => typeof n === "string")
        : [],
    },
    confirmed: raw.confirmed === true,
    explanations,
  };
}

/**
 * Rank a record, lower is better: blocking warnings first, then whether the
 * model confirmed it, then advisory issues.
 */
function rank(issues: ParseIssue[], confirmed: boolean): number {
  const warnings = issues.filter((i) => i.severity === "warning").length;
  return warnings * 1000 + (confirmed ? 0 : 100) + (issues.length - warnings);
}

/**
 * Downgrade issues the model explained, where that kind may be explained.
 * Returns the remaining issues and the explanation notes.
 */
function applyExplanations(
  issues: ParseIssue[],
  explanations: Record<string, string>
): { issues: ParseIssue[]; notes: string[] } {
  const notes: string[] = [];
  const remaining = issues.filter((i) => {
    const why = explanations[i.id];
    if (why && EXPLAINABLE.has(i.kind)) {
      notes.push(`${i.message} AI: ${why}`);
      return false;
    }
    return true;
  });
  return { issues: remaining, notes };
}

/**
 * Verify an initial AI parse with the model, refining it until the model
 * confirms and Obiter's checks pass, or the round budget is spent.
 *
 * Never throws for a model failure after the initial parse: the best record
 * so far is returned with a warning that verification didn't finish.
 */
export async function verifyParse(
  input: string,
  initial: ParseCandidate,
  llmConfig: LLMConfig,
  opts: VerifyOptions = {}
): Promise<VerifiedParse> {
  const maxRounds = Math.max(1, opts.maxRounds ?? 2);
  let current = initial;
  let checked = checkParse(input, current, opts);
  let best = { candidate: current, ...checked, explained: [] as string[], confirmed: false };
  let rounds = 0;
  const failures: string[] = [];

  for (let round = 1; round <= maxRounds; round++) {
    rounds = round;
    const verifyConfig = {
      ...llmConfig,
      maxTokens: Math.max(llmConfig.maxTokens ?? 0, MIN_VERIFY_MAX_TOKENS),
    };
    const messages = buildVerifyMessages(input, current, checked.rendered, checked.issues, round);
    let parsed: ReturnType<typeof parseVerifyResponse> | null = null;
    // One repair attempt: if the reply isn't a complete JSON object, show the
    // model its reply and ask for the JSON alone.
    for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
      let response: string;
      try {
        response = await callLlmMultiTurn(verifyConfig, messages);
      } catch (err: unknown) {
        failures.push(err instanceof Error ? err.message : "the AI didn't respond");
        break;
      }
      try {
        parsed = parseVerifyResponse(response, current);
      } catch {
        if (attempt === 0) {
          messages.push(
            { role: "assistant", content: response },
            {
              role: "user",
              content:
                "That reply was not one complete JSON object. Reply again with only the JSON object in the requested shape, with notes kept to one short sentence each.",
            }
          );
        } else {
          failures.push("the AI's reply wasn't valid JSON");
        }
      }
    }
    if (!parsed) break;

    const next = checkParse(input, parsed.candidate, opts);
    const { issues, notes } = applyExplanations(next.issues, parsed.explanations);
    const blocking = issues.some((i) => i.severity === "warning");
    const confirmed = parsed.confirmed && !blocking;

    if (rank(issues, confirmed) <= rank(best.issues, best.confirmed)) {
      best = {
        candidate: parsed.candidate,
        rendered: next.rendered,
        issues,
        explained: notes,
        confirmed,
      };
    }
    current = parsed.candidate;
    // The next round sees only what is still unexplained.
    checked = { issues, rendered: next.rendered };
    if (confirmed) break;
  }

  // Drop fields the type doesn't have: the engine would ignore them anyway,
  // and keeping them would store dead data on the citation.
  const allowed = isKnownSourceType(best.candidate.sourceType)
    ? allowedFieldsFor(best.candidate.sourceType)
    : null;
  const dropped: string[] = [];
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(best.candidate.data)) {
    if (!allowed || allowed.has(k) || !isPresent(v)) data[k] = v;
    else
      dropped.push(
        `${k} "${flattenFields(v)
          .map(([, s]) => s)
          .join(" ")}"`
      );
  }

  const warnings = best.issues.filter((i) => i.severity === "warning").map((i) => i.message);
  if (failures.length > 0) {
    warnings.push(`AI verification didn't finish (${failures[0]}); check every field.`);
  } else if (!best.confirmed) {
    warnings.push("The AI couldn't confirm this citation; check the fields before inserting.");
  }
  const notes = [
    ...best.issues
      .filter((i) => i.severity === "info" && i.kind !== "unknown_field")
      .map((i) => i.message),
    ...best.explained,
    ...(best.candidate.notes ?? []),
    ...dropped.map((d) => `Dropped ${d}: not a field of this source type.`),
  ];

  return {
    ...best.candidate,
    signal: isValidSignal(best.candidate.signal) ? best.candidate.signal : undefined,
    data,
    warnings,
    notes,
    verification: {
      rounds,
      confirmed: best.confirmed,
      rendered: best.rendered,
      remainingIssues: best.issues,
    },
  };
}
