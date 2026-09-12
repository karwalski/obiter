/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * exportPipeline.ts — turns library citations into a file in any export
 * format, with the AGLC-formatted citation attached as a note so other
 * tools can display it.
 */

import type { Citation } from "../../types/citation";
import type { InterchangeFormat, InterchangeIssue } from "./model";

/** "formatted-text" is the plain numbered AGLC list, not an interchange codec. */
export type ExportFormat = InterchangeFormat | "formatted-text";

export interface ExportOptions {
  format: ExportFormat;
  /** Attach the formatted citation as a note (default true). */
  includeFormatted?: boolean;
  /** Include explanatory-note citations (default false). */
  includeExplanatoryNotes?: boolean;
  /** EndNote XML reference-type naming (default "uts-aglc4"). */
  endnoteStyle?: "uts-aglc4" | "generic";
  /** Injected by the UI so the pipeline stays free of document config. */
  formatCitation?: (citation: Citation) => { footnote: string; bibliography?: string };
  /** Label for the formatted note, eg "AGLC4". */
  standardLabel?: string;
  /** Used in the file name: "library" or "selection". */
  scopeLabel?: string;
  /** Date stamp override for tests (YYYY-MM-DD). */
  dateStamp?: string;
}

export interface ExportResult {
  text: string;
  fileName: string;
  mimeType: string;
  extension: string;
  records: number;
  issues: InterchangeIssue[];
}

export function exportCitations(_citations: Citation[], _options: ExportOptions): ExportResult {
  throw new Error("exportCitations is not implemented yet (INTEROP-010)");
}
