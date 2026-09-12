/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * importPipeline.ts — detect, parse, map, validate and dedupe pasted or
 * uploaded records into a preview the Import dialog can show, then commit
 * the included rows to the store in one persist.
 *
 * The pipeline is synchronous and store-free until commitImport, so the UI
 * can preview thousands of records without touching Word.
 */

import type { Citation, SourceType } from "../../types/citation";
import type { CitationStore } from "../../store/citationStore";
import type { DetectionResult } from "./detect";
import type { InterchangeFormat, InterchangeIssue, InterchangeRecord } from "./model";

export interface ImportSource {
  /** Pasted text or a file's contents. */
  text: string;
  /** File name when uploaded; used for detection and the preview label. */
  fileName?: string;
  /** User-chosen format for this source. */
  formatHint?: InterchangeFormat;
}

export interface ImportOptions {
  /** Citations already in the library, for duplicate detection. */
  existing: Citation[];
  aglcVersion: "4" | "5";
  /** ISO timestamp override for tests. */
  now?: string;
}

export interface ImportPreviewRow {
  index: number;
  sourceName?: string;
  record: InterchangeRecord;
  citation: Citation;
  sourceType: SourceType;
  /** Why the mapper chose this type (shown on hover). */
  reasons: string[];
  missingFields: string[];
  /** An existing library citation this record duplicates. */
  duplicateOf?: Citation;
  /** True when the duplicate match came from an Obiter id (a round trip). */
  roundTrip: boolean;
  issues: InterchangeIssue[];
  include: boolean;
  /** For round-trip rows: replace the existing citation instead of skipping. */
  update: boolean;
}

export interface ImportPreviewCounts {
  total: number;
  ready: number;
  incomplete: number;
  duplicates: number;
  failed: number;
}

export interface ImportPreview {
  sources: Array<{ name?: string; detection: DetectionResult }>;
  rows: ImportPreviewRow[];
  issues: InterchangeIssue[];
  counts: ImportPreviewCounts;
}

export interface ImportCommitResult {
  added: number;
  updated: number;
  skippedDuplicates: number;
  incomplete: number;
  ids: string[];
  incompleteIds: string[];
}

export interface ImportCommitOptions {
  includeIncomplete?: boolean;
}

/** Placeholder until INTEROP-010 lands; keeps the UI compiling against the contract. */
function notImplemented(name: string): never {
  throw new Error(`${name} is not implemented yet (INTEROP-010)`);
}

export function prepareImport(_sources: ImportSource[], _options: ImportOptions): ImportPreview {
  return notImplemented("prepareImport");
}

export function retypeRow(
  _row: ImportPreviewRow,
  _sourceType: SourceType,
  _options: ImportOptions
): ImportPreviewRow {
  return notImplemented("retypeRow");
}

export async function commitImport(
  _preview: ImportPreview,
  _store: CitationStore,
  _options: ImportCommitOptions = {}
): Promise<ImportCommitResult> {
  return notImplemented("commitImport");
}
