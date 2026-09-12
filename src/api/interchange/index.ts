/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Bibliographic interchange: import from and export to RIS, EndNote XML,
 * BibTeX and CSL-JSON, plus Word's Source Manager XML (import only).
 * See docs/decisions.md DECISION-038.
 */

// Codecs register themselves on load.
import "./codecs/ris";
import "./codecs/cslJson";

export type {
  InterchangeFormat,
  InterchangeKind,
  InterchangeRecord,
  InterchangeCreator,
  InterchangeDate,
  InterchangeLegal,
  InterchangeIdentifiers,
  InterchangeProvenance,
  InterchangeIssue,
  IssueCode,
  IssueSeverity,
  CitationInterchangeBag,
} from "./model";
export { INTERCHANGE_DATA_KEY, PASSTHROUGH_TEXT_CAP, createRecord } from "./model";

export type { InterchangeCodec, ParseResult, SerialiseOptions } from "./codec";
export { getCodec, hasCodec, listCodecs, listExportCodecs, normaliseText } from "./codec";

export type { DetectionHints, DetectionResult, DetectionCandidate } from "./detect";
export { detectFormat, countRecords, DETECTION_THRESHOLD } from "./detect";

export type {
  ImportSource,
  ImportOptions,
  ImportPreview,
  ImportPreviewRow,
  ImportPreviewCounts,
  ImportCommitResult,
  ImportCommitOptions,
} from "./importPipeline";
export { prepareImport, retypeRow, commitImport } from "./importPipeline";

export type { ExportFormat, ExportOptions, ExportResult } from "./exportPipeline";
export { exportCitations } from "./exportPipeline";

export { sourceTypeToKind } from "./mapper/kinds";
