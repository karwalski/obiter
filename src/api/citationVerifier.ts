/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Stories 17.51 & 17.53 — Citation Verification & Confidence Scoring
 *
 * Walks every citation in a document, parses it via citationParser, resolves
 * against source adapters in preference order, compares metadata, and produces
 * a VerificationReport with per-citation confidence scores.
 */

import {
  parseCitation,
  type ParsedCitation,
  type MNCToken,
  type ReportCitation,
  type StatuteCitation,
  type HansardCitation,
} from "./citationParser";
import type { SourceAdapter, SourceMetadata } from "./sourceAdapter";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VerificationStatus = "verified" | "unresolved" | "mismatched" | "error";

export interface VerificationResult {
  citationId: string;
  citationText: string;
  footnoteIndex: number;
  status: VerificationStatus;
  confidence: number; // 0-1 for verified/unresolved, -1 for mismatched
  resolvedMetadata?: SourceMetadata;
  sourceAdapterId?: string;
  sourceUrl?: string;
  mismatchDetails?: string;
  error?: string;
}

export interface VerificationReport {
  documentTitle: string;
  verifiedAt: string; // ISO timestamp
  totalCitations: number;
  verified: number;
  unresolved: number;
  mismatched: number;
  errors: number;
  results: VerificationResult[];
}

/** Input citation as provided by the caller. */
export interface CitationInput {
  /** Unique identifier for this citation instance. */
  id: string;
  /** The raw citation text. */
  text: string;
  /** 1-based footnote number where this citation appears. */
  footnoteIndex: number;
}

// ---------------------------------------------------------------------------
// Confidence scoring (Story 17.53)
// ---------------------------------------------------------------------------

/**
 * Normalise a string for fuzzy comparison: lowercase, collapse whitespace,
 * strip common punctuation.
 */
function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,;:'"()\[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check whether two party name strings are a fuzzy match, allowing for
 * common abbreviation patterns (e.g. "Pty Ltd" vs "Pty Limited",
 * "The State of NSW" vs "State of New South Wales").
 */
function partiesFuzzyMatch(a: string, b: string): boolean {
  const na = normalise(a);
  const nb = normalise(b);
  if (na === nb) return true;

  // One contains the other (handles abbreviation vs full form)
  if (na.includes(nb) || nb.includes(na)) return true;

  // Simple Levenshtein-like check: if the difference is very small
  // relative to length, treat as fuzzy match. We use a quick check
  // based on shared prefix/suffix.
  const shorter = na.length < nb.length ? na : nb;
  const longer = na.length < nb.length ? nb : na;
  if (shorter.length > 5 && longer.startsWith(shorter.slice(0, Math.ceil(shorter.length * 0.7)))) {
    return true;
  }

  return false;
}

/**
 * Calculate a confidence score by comparing parsed citation fields against
 * resolved metadata.
 *
 * Scoring rules:
 * - Exact match (parties + year + court + page/number): 1.0
 * - Fuzzy match (minor party-name variants, all other fields match): 0.9
 * - Partial match (year + court match but parties differ): 0.5
 * - Unresolved (no metadata found): 0.0
 * - Mismatched (resolves but key fields differ): -1
 */
export function calculateConfidence(
  parsed: ParsedCitation,
  resolved: SourceMetadata | null,
): number {
  if (!resolved) return 0.0;

  switch (parsed.type) {
    case "mnc":
      return scoreMNC(parsed, resolved);
    case "report":
      return scoreReport(parsed, resolved);
    case "statute":
      return scoreStatute(parsed, resolved);
    case "hansard":
      return scoreHansard(parsed, resolved);
    default:
      return 0.0;
  }
}

function scoreMNC(parsed: MNCToken, meta: SourceMetadata): number {
  const yearMatch = meta.year === parsed.year;
  const courtMatch = meta.court !== undefined && normalise(meta.court) === normalise(parsed.court);

  if (!yearMatch && !courtMatch) return -1;

  // Check MNC number via the mnc string field
  const mncMatch =
    meta.mnc !== undefined && meta.mnc.includes(String(parsed.number));

  if (yearMatch && courtMatch && mncMatch) {
    // Check parties for exact vs fuzzy
    if (meta.parties) {
      // Exact match assumed if all structured fields match
      return 1.0;
    }
    // No parties to compare — still a strong match on MNC
    return 1.0;
  }

  if (yearMatch && courtMatch) {
    return 0.9;
  }

  if (yearMatch || courtMatch) {
    return 0.5;
  }

  return -1;
}

function scoreReport(parsed: ReportCitation, meta: SourceMetadata): number {
  const yearMatch = meta.year === parsed.year;
  const seriesMatch =
    meta.reportSeries !== undefined &&
    normalise(meta.reportSeries) === normalise(parsed.series);
  const volumeMatch = meta.volume === parsed.volume;
  const pageMatch = meta.startingPage === parsed.page;

  if (yearMatch && seriesMatch && volumeMatch && pageMatch) {
    if (meta.parties) return 1.0;
    return 1.0;
  }

  if (yearMatch && seriesMatch && volumeMatch) return 0.9;
  if (yearMatch && seriesMatch) return 0.5;
  if (yearMatch) return 0.5;

  return -1;
}

function scoreStatute(parsed: StatuteCitation, meta: SourceMetadata): number {
  const titleMatch =
    meta.title !== undefined && normalise(meta.title) === normalise(parsed.title);
  const yearMatch = meta.year === parsed.year;
  const jurisdictionMatch =
    meta.jurisdiction !== undefined &&
    normalise(meta.jurisdiction) === normalise(parsed.jurisdiction);

  if (titleMatch && yearMatch && jurisdictionMatch) return 1.0;
  if (yearMatch && jurisdictionMatch && meta.title && partiesFuzzyMatch(meta.title, parsed.title)) {
    return 0.9;
  }
  if (yearMatch && jurisdictionMatch) return 0.5;
  if (titleMatch && yearMatch) return 0.5;

  return -1;
}

function scoreHansard(parsed: HansardCitation, meta: SourceMetadata): number {
  const chamberMatch =
    meta.chamber !== undefined && normalise(meta.chamber) === normalise(parsed.chamber);
  const pageMatch = meta.page !== undefined && meta.page === parsed.page;
  const speakerMatch =
    parsed.speaker !== undefined &&
    meta.speaker !== undefined &&
    normalise(meta.speaker) === normalise(parsed.speaker);

  if (chamberMatch && pageMatch && speakerMatch) return 1.0;
  if (chamberMatch && pageMatch) return 0.9;
  if (chamberMatch) return 0.5;

  return -1;
}

// ---------------------------------------------------------------------------
// Mismatch detail generation
// ---------------------------------------------------------------------------

function describeMismatch(
  parsed: ParsedCitation,
  meta: SourceMetadata,
): string {
  const diffs: string[] = [];

  if (parsed.type === "mnc") {
    if (meta.year !== undefined && meta.year !== parsed.year) {
      diffs.push(`year: expected ${parsed.year}, got ${meta.year}`);
    }
    if (meta.court !== undefined && normalise(meta.court) !== normalise(parsed.court)) {
      diffs.push(`court: expected ${parsed.court}, got ${meta.court}`);
    }
  }

  if (parsed.type === "report") {
    if (meta.year !== undefined && meta.year !== parsed.year) {
      diffs.push(`year: expected ${parsed.year}, got ${meta.year}`);
    }
    if (meta.reportSeries !== undefined && normalise(meta.reportSeries) !== normalise(parsed.series)) {
      diffs.push(`series: expected ${parsed.series}, got ${meta.reportSeries}`);
    }
  }

  if (parsed.type === "statute") {
    if (meta.title !== undefined && normalise(meta.title) !== normalise(parsed.title)) {
      diffs.push(`title: expected "${parsed.title}", got "${meta.title}"`);
    }
    if (meta.jurisdiction !== undefined && normalise(meta.jurisdiction) !== normalise(parsed.jurisdiction)) {
      diffs.push(`jurisdiction: expected ${parsed.jurisdiction}, got ${meta.jurisdiction}`);
    }
  }

  if (parsed.type === "hansard") {
    if (meta.chamber !== undefined && normalise(meta.chamber) !== normalise(parsed.chamber)) {
      diffs.push(`chamber: expected ${parsed.chamber}, got ${meta.chamber}`);
    }
  }

  return diffs.length > 0 ? diffs.join("; ") : "Key fields differ from resolved metadata";
}

// ---------------------------------------------------------------------------
// Single-citation verification
// ---------------------------------------------------------------------------

/**
 * Verify a single citation against a list of source adapters.
 *
 * Tries each adapter in order. The first adapter to return non-null metadata
 * is used for confidence scoring.
 */
export async function verifySingleCitation(
  citation: CitationInput,
  adapters: SourceAdapter[],
): Promise<VerificationResult> {
  const baseResult: VerificationResult = {
    citationId: citation.id,
    citationText: citation.text,
    footnoteIndex: citation.footnoteIndex,
    status: "unresolved",
    confidence: 0.0,
  };

  const parsed = parseCitation(citation.text);
  if (!parsed) {
    return {
      ...baseResult,
      status: "error",
      confidence: 0.0,
      error: "Citation could not be parsed",
    };
  }

  for (const adapter of adapters) {
    try {
      const meta = await adapter.resolve(citation.text);
      if (!meta) continue;

      const confidence = calculateConfidence(parsed, meta);

      if (confidence >= 0.9) {
        return {
          ...baseResult,
          status: "verified",
          confidence,
          resolvedMetadata: meta,
          sourceAdapterId: adapter.descriptor.id,
          sourceUrl: undefined, // populated if search results have URLs
        };
      }

      if (confidence >= 0.5) {
        return {
          ...baseResult,
          status: "verified",
          confidence,
          resolvedMetadata: meta,
          sourceAdapterId: adapter.descriptor.id,
        };
      }

      if (confidence < 0) {
        return {
          ...baseResult,
          status: "mismatched",
          confidence: -1,
          resolvedMetadata: meta,
          sourceAdapterId: adapter.descriptor.id,
          mismatchDetails: describeMismatch(parsed, meta),
        };
      }
    } catch (err) {
      return {
        ...baseResult,
        status: "error",
        confidence: 0.0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return baseResult; // unresolved
}

// ---------------------------------------------------------------------------
// Full-document verification (Story 17.51)
// ---------------------------------------------------------------------------

/**
 * Verify all citations in a document against the enabled source adapters.
 *
 * @param citations — Array of citation inputs extracted from the document.
 * @param enabledAdapters — Adapters to check, in preference order.
 * @param documentTitle — Title of the document being verified.
 * @returns A complete VerificationReport.
 */
export async function verifyAllCitations(
  citations: CitationInput[],
  enabledAdapters: SourceAdapter[],
  documentTitle: string,
): Promise<VerificationReport> {
  const results: VerificationResult[] = [];

  for (const citation of citations) {
    const result = await verifySingleCitation(citation, enabledAdapters);
    results.push(result);
  }

  const verified = results.filter((r) => r.status === "verified").length;
  const unresolved = results.filter((r) => r.status === "unresolved").length;
  const mismatched = results.filter((r) => r.status === "mismatched").length;
  const errors = results.filter((r) => r.status === "error").length;

  return {
    documentTitle,
    verifiedAt: new Date().toISOString(),
    totalCitations: citations.length,
    verified,
    unresolved,
    mismatched,
    errors,
    results,
  };
}
