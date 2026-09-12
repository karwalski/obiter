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
import { getCodec, hasCodec } from "./codec";
import { detectFormat } from "./detect";
import type { DetectionResult } from "./detect";
import { DedupeIndex } from "./dedupe";
import { mapRecordToCitation } from "./mapper/toCitation";
import type { InterchangeFormat, InterchangeIssue, InterchangeRecord } from "./model";
import { issue } from "./model";

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

function buildRow(
  index: number,
  sourceName: string | undefined,
  record: InterchangeRecord,
  options: ImportOptions,
  dedupe: DedupeIndex,
  sourceTypeOverride?: SourceType
): ImportPreviewRow {
  const mapped = mapRecordToCitation(record, {
    aglcVersion: options.aglcVersion,
    now: options.now,
    sourceTypeOverride,
  });
  const match = dedupe.findRecord(record);
  const roundTrip = match?.kind === "obiter-id";
  const issues = [...mapped.issues];
  if (match) {
    issues.push(
      issue(
        "info",
        "duplicate",
        roundTrip
          ? "This record was exported from this library; choose Update to replace the existing citation."
          : "Already in the library; excluded unless you include it.",
        { recordIndex: index }
      )
    );
  }
  return {
    index,
    sourceName,
    record,
    citation: mapped.citation,
    sourceType: mapped.sourceType,
    reasons: mapped.inference.reasons,
    missingFields: mapped.missingFields,
    duplicateOf: match?.citation,
    roundTrip,
    issues,
    include: !match,
    update: false,
  };
}

function countRows(rows: ImportPreviewRow[], failed: number): ImportPreviewCounts {
  return {
    total: rows.length + failed,
    ready: rows.filter((r) => !r.duplicateOf && r.missingFields.length === 0).length,
    incomplete: rows.filter((r) => !r.duplicateOf && r.missingFields.length > 0).length,
    duplicates: rows.filter((r) => Boolean(r.duplicateOf)).length,
    failed,
  };
}

/**
 * Detects, parses, maps and dedupes every source into preview rows. Never
 * throws: unreadable sources become issues and zero rows.
 */
export function prepareImport(sources: ImportSource[], options: ImportOptions): ImportPreview {
  const dedupe = new DedupeIndex(options.existing);
  const rows: ImportPreviewRow[] = [];
  const issues: InterchangeIssue[] = [];
  const previewSources: ImportPreview["sources"] = [];
  let failed = 0;

  for (const source of sources) {
    const detection = detectFormat(source.text, {
      fileName: source.fileName,
      formatHint: source.formatHint,
    });
    previewSources.push({ name: source.fileName, detection });
    if (!detection.format || !hasCodec(detection.format)) {
      issues.push(
        issue(
          "error",
          "format-unrecognised",
          `${source.fileName ? `${source.fileName}: ` : ""}Format not recognised. Paste RIS, EndNote XML, BibTeX or CSL-JSON records, or choose the exported file instead.`
        )
      );
      continue;
    }
    const codec = getCodec(detection.format);
    const parsed = codec.parse(source.text);
    for (const parseIssue of parsed.issues) {
      issues.push(
        source.fileName
          ? { ...parseIssue, message: `${source.fileName}: ${parseIssue.message}` }
          : parseIssue
      );
      if (parseIssue.severity === "error") failed += 1;
    }
    for (const record of parsed.records) {
      const row = buildRow(rows.length, source.fileName, record, options, dedupe);
      rows.push(row);
      if (!row.duplicateOf) dedupe.add(row.citation);
    }
  }

  return { sources: previewSources, rows, issues, counts: countRows(rows, failed) };
}

/** Re-maps one row after the user chooses a different source type. */
export function retypeRow(
  row: ImportPreviewRow,
  sourceType: SourceType,
  options: ImportOptions
): ImportPreviewRow {
  const dedupe = new DedupeIndex(options.existing);
  const next = buildRow(row.index, row.sourceName, row.record, options, dedupe, sourceType);
  return {
    ...next,
    include: row.include,
    update: row.update,
    duplicateOf: row.duplicateOf,
    roundTrip: row.roundTrip,
  };
}

/** Recounts after the user changes include or update flags. */
export function recount(preview: ImportPreview): ImportPreviewCounts {
  return countRows(preview.rows, preview.counts.failed);
}

/**
 * Adds the included rows to the store in one persist (and updates
 * round-trip rows marked for update in a second). Duplicates that are not
 * marked for update are skipped.
 */
export async function commitImport(
  preview: ImportPreview,
  store: CitationStore,
  options: ImportCommitOptions = {}
): Promise<ImportCommitResult> {
  const includeIncomplete = options.includeIncomplete ?? true;
  const toAdd: Citation[] = [];
  const toUpdate: Citation[] = [];
  let skippedDuplicates = 0;
  const incompleteIds: string[] = [];

  for (const row of preview.rows) {
    if (row.duplicateOf) {
      if (row.include && row.update && row.duplicateOf.id) {
        const existing = row.duplicateOf;
        toUpdate.push({
          ...row.citation,
          id: existing.id,
          createdAt: existing.createdAt,
          firstFootnoteNumber: existing.firstFootnoteNumber,
        });
      } else {
        skippedDuplicates += 1;
      }
      continue;
    }
    if (!row.include) continue;
    if (!includeIncomplete && row.missingFields.length > 0) continue;
    toAdd.push(row.citation);
    if (row.missingFields.length > 0) incompleteIds.push(row.citation.id);
  }

  const added = toAdd.length > 0 ? await store.addMany(toAdd) : 0;
  const updated = toUpdate.length > 0 ? await store.updateMany(toUpdate) : 0;
  return {
    added,
    updated,
    skippedDuplicates,
    incomplete: incompleteIds.length,
    ids: [...toAdd.map((c) => c.id), ...toUpdate.map((c) => c.id)],
    incompleteIds,
  };
}
