/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * exportPipeline.ts — turns library citations into a file in any export
 * format, with the AGLC-formatted citation attached as a note so other
 * tools can display it. "formatted-text" writes the plain numbered list.
 */

import type { Citation } from "../../types/citation";
import { getCodec, hasCodec } from "./codec";
import { mapCitationToRecord } from "./mapper/fromCitation";
import type { InterchangeFormat, InterchangeIssue, InterchangeRecord } from "./model";
import { issue } from "./model";

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

const FORMATTED_EXTENSION = ".txt";
const FORMATTED_MIME = "text/plain";

function localDateStamp(): string {
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Builds the records for a set of citations, formatted note included. */
export function citationsToRecords(
  citations: Citation[],
  options: ExportOptions
): { records: InterchangeRecord[]; issues: InterchangeIssue[] } {
  const issues: InterchangeIssue[] = [];
  const format: InterchangeFormat =
    options.format === "formatted-text" ? "csl-json" : options.format;
  const records: InterchangeRecord[] = [];
  for (const citation of citations) {
    if (citation.sourceType === "explanatory_note" && !options.includeExplanatoryNotes) continue;
    let formatted: InterchangeRecord["formatted"] | undefined;
    if (options.includeFormatted !== false && options.formatCitation) {
      try {
        const out = options.formatCitation(citation);
        formatted = {
          standard: options.standardLabel ?? "AGLC4",
          footnote: out.footnote,
          bibliography: out.bibliography,
        };
      } catch (error) {
        issues.push(
          issue(
            "warning",
            "lossy-mapping",
            `The formatted citation for "${citation.id}" could not be produced: ${(error as Error).message}`
          )
        );
      }
    }
    records.push(mapCitationToRecord(citation, { format, formatted }));
  }
  return { records, issues };
}

/** Exports citations to the chosen format. Never throws for a known format. */
export function exportCitations(citations: Citation[], options: ExportOptions): ExportResult {
  const stamp = options.dateStamp ?? localDateStamp();
  const scope = options.scopeLabel ?? "library";
  const base = `obiter-${scope}-${stamp}`;

  if (options.format === "formatted-text") {
    const lines: string[] = [];
    const issues: InterchangeIssue[] = [];
    let n = 0;
    for (const citation of citations) {
      if (citation.sourceType === "explanatory_note" && !options.includeExplanatoryNotes) continue;
      n += 1;
      let text = "";
      try {
        text = options.formatCitation ? options.formatCitation(citation).footnote : "";
      } catch (error) {
        issues.push(
          issue(
            "warning",
            "lossy-mapping",
            `Citation ${citation.id} could not be formatted: ${(error as Error).message}`
          )
        );
      }
      lines.push(`${n}. ${text}`);
    }
    return {
      text: lines.join("\n") + (lines.length > 0 ? "\n" : ""),
      fileName: `${base}${FORMATTED_EXTENSION}`,
      mimeType: FORMATTED_MIME,
      extension: FORMATTED_EXTENSION,
      records: n,
      issues,
    };
  }

  if (!hasCodec(options.format)) {
    throw new Error(`No export codec for "${options.format}"`);
  }
  const codec = getCodec(options.format);
  if (!codec.canExport) {
    throw new Error(`${codec.label} export is not supported`);
  }
  const { records, issues } = citationsToRecords(citations, options);
  const text = codec.serialise(records, {
    includeFormatted: options.includeFormatted !== false,
    endnoteStyle: options.endnoteStyle ?? "uts-aglc4",
  });
  const extension = codec.extensions[0] ?? ".txt";
  return {
    text,
    fileName: `${base}${extension}`,
    mimeType: codec.mimeType,
    extension,
    records: records.length,
    issues,
  };
}
