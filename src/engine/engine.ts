/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * Engine Dispatcher (UI-007 + UI-008)
 *
 * Main entry point for formatting citations. Routes formatting requests to
 * the correct AGLC4 formatter based on source type, handles subsequent
 * reference resolution, and ensures closing punctuation.
 */

import type {
  Citation,
  Pinpoint,
  SourceType,
  Author,
} from "../types/citation";
import type { FormattedRun } from "../types/formattedRun";
import { formatCaseName } from "./rules/v4/domestic/case-names";
import { formatReportedCase } from "./rules/v4/domestic/cases";
import { formatStatute } from "./rules/v4/domestic/legislation";
import { formatJournalArticle } from "./rules/v4/secondary/journals";
import { formatBook } from "./rules/v4/secondary/books";
import { formatTreaty } from "./rules/v4/international/treaties";
import { formatGenaiOutput } from "./rules/v4/secondary/genai";
import { ensureClosingPunctuation } from "./rules/v4/general/footnotes";
import {
  resolveSubsequentReference,
  type SubsequentReferenceContext,
} from "./resolver";
import {
  shouldItaliciseTitle,
  shouldQuoteTitle,
} from "./rules/v4/general/italicisation";
import type { CitationConfig } from "./standards/types";
import { getStandardConfig } from "./standards";

// ─── Citation Context ────────────────────────────────────────────────────────

/**
 * Context describing where a citation appears in the document, used to
 * determine whether a full, short, or ibid reference should be rendered.
 */
export interface CitationContext {
  footnoteNumber: number;
  isFirstCitation: boolean;
  isSameAsPreceding: boolean;
  precedingFootnoteCitationCount: number;
  precedingPinpoint?: Pinpoint;
  currentPinpoint?: Pinpoint;
  firstFootnoteNumber: number;
  isWithinSameFootnote: boolean;
  formatPreference: "full" | "short" | "ibid" | "auto";
}

// ─── Source Type Dispatch Map ────────────────────────────────────────────────

/**
 * A formatter function takes a Citation and optional config, returns FormattedRun[].
 */
type SourceFormatter = (citation: Citation, config?: CitationConfig) => FormattedRun[];

/**
 * Dispatches a reported case citation (Rule 2.2).
 *
 * Extracts party names, year, volume, report series, starting page,
 * pinpoint, court identifier, and parallel citations from the citation
 * data and delegates to formatCaseName + formatReportedCase.
 */
function dispatchReportedCase(citation: Citation, config?: CitationConfig): FormattedRun[] {
  const d = citation.data;
  const caseName = formatCaseName(
    (d.party1 as string) ?? "",
    (d.party2 as string) ?? "",
    (d.separator as string) ?? "v",
  );

  let parallelCitations = d.parallelCitations as
    | {
        yearType: "round" | "square";
        year: number;
        volume?: number;
        reportSeries: string;
        startingPage: number;
      }[]
    | undefined;

  // MULTI-014: Court mode — auto-include MNC as a parallel citation when
  // the case has an MNC but no explicit parallels. This ensures both the
  // authorised report and the MNC are emitted per court practice directions.
  if (config?.writingMode === "court" && !parallelCitations?.length) {
    const mnc = d.mnc as string | undefined;
    if (mnc && mnc.trim()) {
      // Append the MNC as a plain text run after the main citation
      const runs = formatReportedCase({
        caseName,
        yearType: (d.yearType as "round" | "square") ?? "round",
        year: (d.year as number) ?? 0,
        volume: d.volume as number | undefined,
        reportSeries: (d.reportSeries as string) ?? "",
        startingPage: (d.startingPage as number) ?? 0,
        pinpoint: d.pinpoint as Pinpoint | undefined,
        courtId: d.courtId as string | undefined,
        pinpointStyle: config?.pinpointStyle,
      });
      runs.push({ text: `; ${mnc.trim()}` });
      return runs;
    }
  }

  return formatReportedCase({
    caseName,
    yearType: (d.yearType as "round" | "square") ?? "round",
    year: (d.year as number) ?? 0,
    volume: d.volume as number | undefined,
    reportSeries: (d.reportSeries as string) ?? "",
    startingPage: (d.startingPage as number) ?? 0,
    pinpoint: d.pinpoint as Pinpoint | undefined,
    courtId: d.courtId as string | undefined,
    parallelCitations,
    pinpointStyle: config?.pinpointStyle,
  });
}

/**
 * Dispatches a statute citation (Rule 3.1).
 */
function dispatchStatute(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatStatute({
    title: (d.title as string) ?? "",
    year: (d.year as number) ?? 0,
    jurisdiction: (d.jurisdiction as string) ?? "",
    number: d.number as string | undefined,
  });
}

/**
 * Dispatches a journal article citation (Rule 5).
 */
function dispatchJournalArticle(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatJournalArticle({
    authors: (d.authors as Author[]) ?? [],
    title: (d.title as string) ?? "",
    year: (d.year as number) ?? 0,
    volume: d.volume as number | undefined,
    issue: d.issue as string | undefined,
    journal: (d.journal as string) ?? "",
    startingPage: (d.startingPage as number) ?? 0,
    pinpoint: d.pinpoint as Pinpoint | undefined,
  });
}

/**
 * Dispatches a book citation (Rule 6).
 */
function dispatchBook(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatBook({
    authors: (d.authors as Author[]) ?? [],
    title: (d.title as string) ?? "",
    publisher: (d.publisher as string) ?? "",
    edition: d.edition as number | undefined,
    year: (d.year as number) ?? 0,
    pinpoint: d.pinpoint as Pinpoint | undefined,
  });
}

/**
 * Dispatches a treaty citation (Rule 8).
 */
function dispatchTreaty(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatTreaty({
    title: (d.title as string) ?? "",
    parties: d.parties as string[] | undefined,
    openedDate: d.openedDate as string | undefined,
    signedDate: d.signedDate as string | undefined,
    treatySeries: (d.treatySeries as string) ?? "",
    seriesVolume: d.seriesVolume as number | undefined,
    startingPage: d.startingPage as number | undefined,
    entryIntoForceDate: d.entryIntoForceDate as string | undefined,
    notYetInForce: d.notYetInForce as boolean | undefined,
    pinpoint: d.pinpoint as Pinpoint | undefined,
  });
}

/**
 * Dispatches an unreported case with MNC (Rule 2.3.1).
 */
function dispatchUnreportedMnc(citation: Citation): FormattedRun[] {
  const d = citation.data;
  const caseName = formatCaseName(
    (d.party1 as string) ?? "",
    (d.party2 as string) ?? "",
    d.separator as string | undefined,
  );
  const runs: FormattedRun[] = [...caseName];
  runs.push({ text: ` [${d.year}] ${d.court ?? ""} ${d.caseNumber ?? ""}` });
  if (d.pinpoint) {
    runs.push({ text: `, ${(d.pinpoint as Pinpoint).value}` });
  }
  return runs;
}

/**
 * Dispatches a GenAI output citation (MULR interim guidance, Rule 7.12).
 *
 * Resolves the platform name from the dropdown value (using platformCustom
 * when "Other" is selected) and delegates to formatGenaiOutput.
 */
function dispatchGenaiOutput(citation: Citation): FormattedRun[] {
  const d = citation.data;
  const platformRaw = (d.platform as string) ?? "";
  const platform =
    platformRaw === "__other__"
      ? ((d.platformCustom as string) ?? "")
      : platformRaw;
  return formatGenaiOutput({
    platform,
    model: (d.model as string) ?? "",
    prompt: (d.prompt as string) || undefined,
    outputDate: (d.outputDate as string) ?? "",
    url: (d.url as string) || undefined,
  });
}

/**
 * Registry mapping each supported SourceType to its dispatch function.
 * Source types not in this map fall through to the generic formatter.
 */
const SOURCE_DISPATCH: Partial<Record<SourceType, SourceFormatter>> = {
  "case.reported": dispatchReportedCase,
  "case.unreported.mnc": dispatchUnreportedMnc,
  "legislation.statute": dispatchStatute,
  "journal.article": dispatchJournalArticle,
  book: dispatchBook,
  treaty: dispatchTreaty,
  genai_output: dispatchGenaiOutput,
};

// ─── Generic Fallback Formatter ──────────────────────────────────────────────

/**
 * Formats a citation generically when no dedicated formatter exists.
 *
 * Renders fields in a reasonable order:
 *   Author, Title, Year, and remaining significant fields.
 *
 * Title formatting follows AGLC4 Rule 1.8.2:
 * - Complete works (books, reports, treaties, legislation, cases): italic.
 * - Components (articles, chapters): enclosed in single curly quotes.
 * - Other types: plain text.
 */
export function formatGenericCitation(citation: Citation): FormattedRun[] {
  const d = citation.data;
  const runs: FormattedRun[] = [];

  // Author(s)
  const authors = d.authors as Author[] | undefined;
  if (authors && authors.length > 0) {
    const authorText = authors
      .map((a) => {
        const given = a.givenNames?.trim();
        const surname = a.surname?.trim();
        if (given && surname) return `${given} ${surname}`;
        return surname ?? given ?? "";
      })
      .filter(Boolean)
      .join(", ");

    if (authorText) {
      runs.push({ text: authorText });
    }
  }

  // Title
  const title = (d.title as string) ?? (d.name as string);
  if (title) {
    if (runs.length > 0) {
      runs.push({ text: ", " });
    }

    if (shouldItaliciseTitle(citation.sourceType)) {
      runs.push({ text: title, italic: true });
    } else if (shouldQuoteTitle(citation.sourceType)) {
      runs.push({ text: `\u2018${title}\u2019` });
    } else {
      runs.push({ text: title });
    }
  }

  // Year
  const year = d.year as number | undefined;
  if (year !== undefined) {
    runs.push({ text: ` (${year})` });
  }

  // Jurisdiction (legislation, cases)
  const jurisdiction = d.jurisdiction as string | undefined;
  if (jurisdiction) {
    runs.push({ text: ` (${jurisdiction})` });
  }

  // Volume
  const volume = d.volume as number | undefined;
  if (volume !== undefined) {
    runs.push({ text: ` ${volume}` });
  }

  // Journal / Report Series / Publisher
  const journal = d.journal as string | undefined;
  const reportSeries = d.reportSeries as string | undefined;
  const publisher = d.publisher as string | undefined;
  if (journal) {
    runs.push({ text: " " });
    runs.push({ text: journal, italic: true });
  } else if (reportSeries) {
    runs.push({ text: ` ${reportSeries}` });
  } else if (publisher) {
    runs.push({ text: ` (${publisher})` });
  }

  // Starting page
  const startingPage = d.startingPage as number | undefined;
  if (startingPage !== undefined) {
    runs.push({ text: ` ${startingPage}` });
  }

  // Pinpoint
  const pinpoint = d.pinpoint as Pinpoint | undefined;
  if (pinpoint) {
    runs.push({ text: `, ${pinpoint.value}` });
  }

  // URL
  const url = d.url as string | undefined;
  if (url) {
    runs.push({ text: ` <${url}>` });
  }

  return runs;
}

// ─── Main Entry Point ────────────────────────────────────────────────────────

/**
 * Formats a citation, applying subsequent reference resolution when context
 * is provided, and ensuring closing punctuation per AGLC4 Rule 1.1.1.
 *
 * The optional `config` parameter receives the active standard's configuration
 * (MULTI-002). When omitted, AGLC4 config is used as default. Individual
 * config fields will be wired to formatting behaviour in MULTI-003 through
 * MULTI-013.
 *
 * @param citation - The citation to format.
 * @param context - Optional document context for subsequent reference handling.
 * @param config - Optional citation standard configuration (defaults to AGLC4).
 * @returns An array of FormattedRun objects representing the formatted citation.
 */
export function formatCitation(
  citation: Citation,
  context?: CitationContext,
  config?: CitationConfig,
): FormattedRun[] {
  // Resolve standard config — default to AGLC4 for backward compatibility
  const standardConfig = config ?? getStandardConfig("aglc4");
  // If context indicates a subsequent reference, delegate to the resolver.
  if (context && !context.isFirstCitation) {
    const resolverContext: SubsequentReferenceContext = {
      isFirstCitation: context.isFirstCitation,
      isSameAsPreceding: context.isSameAsPreceding,
      precedingFootnoteCitationCount: context.precedingFootnoteCitationCount,
      precedingPinpoint: context.precedingPinpoint,
      currentPinpoint: context.currentPinpoint,
      firstFootnoteNumber: context.firstFootnoteNumber,
      isWithinSameFootnote: context.isWithinSameFootnote,
      formatPreference: context.formatPreference,
      config: standardConfig,
    };

    const subsequentRuns = resolveSubsequentReference(
      citation,
      resolverContext,
    );

    if (subsequentRuns !== null) {
      return ensureClosingPunctuation(subsequentRuns);
    }
    // resolver returned null — render full citation (falls through below)
  }

  // Dispatch to the source-type-specific formatter, or fallback to generic.
  const dispatcher = SOURCE_DISPATCH[citation.sourceType];
  const runs = dispatcher
    ? dispatcher(citation, standardConfig)
    : formatGenericCitation(citation);

  return ensureClosingPunctuation(runs);
}

// ─── Preview Helper ──────────────────────────────────────────────────────────

/**
 * Formats a citation in "full first citation" mode for the Insert Citation
 * preview panel. No subsequent reference resolution is applied.
 *
 * @param citation - The citation to preview.
 * @returns An array of FormattedRun objects representing the formatted citation.
 */
export function getFormattedPreview(
  citation: Citation,
  config?: CitationConfig,
): FormattedRun[] {
  const standardConfig = config ?? getStandardConfig("aglc4");
  const dispatcher = SOURCE_DISPATCH[citation.sourceType];
  const runs = dispatcher
    ? dispatcher(citation, standardConfig)
    : formatGenericCitation(citation);

  return ensureClosingPunctuation(runs);
}
