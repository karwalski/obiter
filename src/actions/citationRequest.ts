/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * The public "insert request" contract (COPILOT-002). A CitationInsertRequest is
 * the stable, store-independent shape any caller produces to insert a citation —
 * the task-pane form, and (in future) a Microsoft Copilot skill action or a
 * jurisd MCP client. It is deliberately decoupled from store-lifecycle fields
 * (id, createdAt, modifiedAt, tags) which this module stamps when it maps a
 * request onto a full Citation.
 *
 * Contract version — bump on any breaking change to the request shape. External
 * callers (Copilot / jurisd) should read the machine-readable field schema from
 * engine/ruleExporter.ts (exportRuleReference) for per-source-type requirements.
 */

export const CITATION_REQUEST_CONTRACT_VERSION = "1.0.0";

import { Citation, SourceData, SourceType } from "../types/citation";
import { CitationStandardId } from "../engine/standards/types";

export interface CitationInsertRequest {
  /** AGLC4 source type, e.g. "case.reported", "legislation.statute". */
  sourceType: SourceType;
  /** Source fields keyed per source type (see exportRuleReference for the schema). */
  data: SourceData;
  /** Short title used for subsequent references. */
  shortTitle?: string;
  /** Introductory signal (Rule 1.3), e.g. "See", "Cf". */
  signal?: string;
  /** Discursive text before the citation within the footnote. */
  commentaryBefore?: string;
  /** Discursive text after the citation within the footnote. */
  commentaryAfter?: string;
  /** Verbatim footnote text; when set, the engine is bypassed and this is inserted as-is. */
  overrideText?: string;
  /** AGLC edition; defaults to the document's active standard. */
  aglcVersion?: "4" | "5";
  /** Append to this existing footnote (Rule 1.1.3) instead of creating a new one. */
  appendToFootnoteIndex?: number;
  /**
   * Insert even when engine-required fields for the source type are missing
   * (BUG-005 (c)). Without this flag the insert service refuses an incomplete
   * citation (eg a reported case with no year/reportSeries/startingPage)
   * rather than silently rendering a partial citation. Overrides are exempt.
   */
  allowIncomplete?: boolean;
}

/** RFC-4122 v4 id, using crypto.randomUUID where available. */
export function generateCitationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** The AGLC edition implied by a citation standard. */
export function getVersionForStandard(standardId: CitationStandardId): "4" | "5" {
  if (standardId === "aglc5" || standardId === "oscola5") return "5";
  return "4";
}

/**
 * Map a request onto a full Citation, stamping the store-lifecycle fields.
 * Empty-string optional fields are normalised to undefined (matching the
 * task-pane insert path), so serialisation stays clean.
 */
export function buildCitationFromRequest(
  request: CitationInsertRequest,
  defaultVersion: "4" | "5"
): Citation {
  const now = new Date().toISOString();
  return {
    id: generateCitationId(),
    aglcVersion: request.aglcVersion ?? defaultVersion,
    sourceType: request.sourceType,
    data: { ...request.data } as SourceData,
    shortTitle: request.shortTitle || undefined,
    // The request keeps `signal` a forgiving string for external callers; narrow
    // to the Citation's IntroductorySignal union here.
    signal: (request.signal || undefined) as Citation["signal"],
    commentaryBefore: request.commentaryBefore || undefined,
    commentaryAfter: request.commentaryAfter || undefined,
    overrideText: request.overrideText || undefined,
    tags: [],
    createdAt: now,
    modifiedAt: now,
  };
}
