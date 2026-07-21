/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * SAFE-007: Quarantined-part salvage.
 *
 * When a Custom XML Part in the Obiter namespace cannot be deserialized
 * (truncated by a crashed save, corrupted by co-authoring, half-written,
 * or wrapped in the wrong root), the store quarantines it in place — the
 * data is still in the document, just unreadable as a whole. This module
 * recovers whatever individual citations survive inside that XML.
 *
 * Strategy:
 *  1. Strict parse first (`deserializeStore`) — an XML payload that parses
 *     cleanly needs no salvage and returns every citation.
 *  2. On failure: strip XML-invalid control characters (keeping tab, LF,
 *     CR), truncate at the last complete `</obiter:citation>` (discarding
 *     any half-written trailing element), then extract each
 *     `<obiter:citation>` element and parse it individually through
 *     `deserializeCitation` — which wraps each fragment in a
 *     namespace-declaring root and handles both the v2 (attributes +
 *     `<obiter:field>`) and v1 (child elements + `<obiter:data>`) shapes.
 *     A single bad element costs only itself, never its neighbours.
 *
 * Pure module: no Office.js, no store access, input is never modified.
 * Merging salvaged citations into the library (and NEVER touching the
 * quarantined part itself) is the caller's job — see the Recovery view
 * and {@link filterNewCitations}.
 */

import type { Citation } from "../types/citation";
import { deserializeCitation, deserializeStore } from "./xmlSerializer";

/** Outcome of a salvage attempt over one part's XML. */
export interface SalvageResult {
  /** Every citation that could be recovered, in document order, id-deduplicated. */
  citations: Citation[];
  /** Human-readable problems encountered (per-element failures, no-elements). */
  errors: string[];
}

const CITATION_CLOSE_TAG = "</obiter:citation>";

/**
 * Characters invalid in XML 1.0 text: C0 controls except tab (0x09),
 * LF (0x0A) and CR (0x0D), plus the non-characters U+FFFE/U+FFFF.
 * A crashed mid-write save can leave these in the payload, and a single
 * one makes the whole document unparseable.
 */
// eslint-disable-next-line no-control-regex
const INVALID_XML_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g;

/**
 * Matches one complete `<obiter:citation>…</obiter:citation>` element.
 * `\b` prevents matching `<obiter:citationStore>`; the non-greedy body is
 * safe because citation elements never nest.
 */
const CITATION_ELEMENT_RE = /<obiter:citation\b[\s\S]*?<\/obiter:citation>/g;

/**
 * Recover individual citations from a (possibly corrupt) store-part XML
 * string. See the module doc for the strategy. Never throws.
 *
 * @param xml - The raw part XML (e.g. from `getQuarantinedPartXml`).
 * @returns The parseable subset of citations plus per-element errors.
 */
export function salvageCitations(xml: string): SalvageResult {
  // 1. Strict parse — a readable part needs no salvage.
  try {
    const data = deserializeStore(xml);
    return { citations: data.citations, errors: [] };
  } catch {
    // Fall through to element-wise salvage.
  }

  const errors: string[] = [];

  // 2. Strip XML-invalid control characters, then truncate at the last
  //    complete citation close tag — anything after it is at best a
  //    half-written element.
  const cleaned = xml.replace(INVALID_XML_CHARS, "");
  const lastClose = cleaned.lastIndexOf(CITATION_CLOSE_TAG);
  if (lastClose === -1) {
    errors.push("No complete citation elements were found in the stored data.");
    return { citations: [], errors };
  }
  const truncated = cleaned.slice(0, lastClose + CITATION_CLOSE_TAG.length);

  // 3. Parse each citation element individually. deserializeCitation
  //    re-wraps the fragment in a namespace-declaring root internally, so
  //    the undeclared `obiter:` prefix on a bare fragment is handled.
  const fragments = truncated.match(CITATION_ELEMENT_RE) ?? [];
  const citations: Citation[] = [];
  const seenIds = new Set<string>();

  fragments.forEach((fragment, index) => {
    try {
      const citation = deserializeCitation(fragment);
      if (!citation.id) {
        errors.push(`Citation element ${index + 1} has no id and was skipped.`);
        return;
      }
      if (seenIds.has(citation.id)) {
        return; // duplicate copy of the same citation within the part
      }
      seenIds.add(citation.id);
      citations.push(citation);
    } catch (err: unknown) {
      errors.push(
        `Citation element ${index + 1} could not be read: ` +
          `${err instanceof Error ? err.message : String(err)}`
      );
    }
  });

  if (fragments.length === 0) {
    errors.push("No complete citation elements were found in the stored data.");
  }

  return { citations, errors };
}

/**
 * The merge-dedup rule for salvaged citations (SAFE-007): keep only
 * citations whose id is non-empty, not already in the library, and not a
 * duplicate within the salvaged set itself. Pure — the Recovery view feeds
 * the result to `CitationStore.addMany`.
 *
 * @param citations - Salvaged citations, in recovery order.
 * @param existingIds - Ids already present in the library.
 */
export function filterNewCitations(
  citations: readonly Citation[],
  existingIds: ReadonlySet<string>
): Citation[] {
  const seen = new Set<string>();
  return citations.filter((citation) => {
    if (!citation.id || existingIds.has(citation.id) || seen.has(citation.id)) {
      return false;
    }
    seen.add(citation.id);
    return true;
  });
}
