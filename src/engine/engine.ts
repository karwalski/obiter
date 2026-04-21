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

// ─── OSCOLA Formatter Imports (OSC-ENH-001) ─────────────────────────────────

import { formatOscolaCase } from "./rules/oscola/cases";
import type { OscolaCaseData, OscolaNeutralCitation, OscolaReportCitation } from "./rules/oscola/cases";
import { formatOscolaScottishCase } from "./rules/oscola/cases-scotland";
import type { OscolaScottishCaseData, ScottishNeutralCitation } from "./rules/oscola/cases-scotland";
import { SCOTTISH_COURT_IDS } from "./rules/oscola/cases-scotland";
import { formatOscolaNICase } from "./rules/oscola/cases-ni";
import type { OscolaNICaseData, NINeutralCitation, NIReportCitation } from "./rules/oscola/cases-ni";
import { NI_COURT_IDS } from "./rules/oscola/cases-ni";
import {
  formatOscolaPrimaryLegislation,
  formatOscolaSecondaryLegislation,
} from "./rules/oscola/legislation";
import {
  formatOscolaHansard,
  formatOscolaCommandPaper,
  formatOscolaLawCommission,
  formatOscolaParliamentaryReport,
} from "./rules/oscola/parliamentary";
import {
  formatEuLegislation as oscolaFormatEuLegislation,
  formatCjeuCase as oscolaFormatCjeuCase,
  formatEuTreaty as oscolaFormatEuTreaty,
} from "./rules/oscola/eu";
import {
  formatEcthrCase as oscolaFormatEcthrCase,
  formatEcthrDecision as oscolaFormatEcthrDecision,
  formatCouncilOfEuropeTreaty as oscolaFormatCouncilOfEuropeTreaty,
} from "./rules/oscola/echr";
import {
  formatTreaty as oscolaFormatTreaty,
  formatUnDocument as oscolaFormatUnDocument,
  formatIcjCase as oscolaFormatIcjCase,
  formatIccCase as oscolaFormatIccCase,
  formatWtoReport as oscolaFormatWtoReport,
} from "./rules/oscola/international";
import { formatGenAiCitation as oscolaFormatGenAiCitation } from "./rules/oscola/genai";
import {
  formatIrishCase as oscolaFormatIrishCase,
  formatIrishAct as oscolaFormatIrishAct,
  formatIrishStatutoryInstrument as oscolaFormatIrishStatutoryInstrument,
} from "./rules/oscola/ireland";
import type { IrishCourtIdentifier, IrishReportSeries } from "./rules/oscola/ireland";

// ─── NZLSG Formatter Imports ─────────────────────────────────────────────────

import {
  formatNeutralCitation as nzlsgFormatNeutralCitation,
  formatPreNeutralCase as nzlsgFormatPreNeutralCase,
} from "./rules/nzlsg/cases";
import { formatMaoriLandCourt as nzlsgFormatMaoriLandCourt } from "./rules/nzlsg/maori-land-court";
import { formatWaitangiTribunalReport as nzlsgFormatWaitangiTribunalReport } from "./rules/nzlsg/waitangi";
import {
  formatLegislation as nzlsgFormatLegislation,
  formatDelegatedLegislation as nzlsgFormatDelegatedLegislation,
  formatBill as nzlsgFormatBill,
} from "./rules/nzlsg/legislation";
import {
  formatNZPD as nzlsgFormatNZPD,
  formatSelectCommitteeSubmission as nzlsgFormatSelectCommitteeSubmission,
  formatCabinetDocument as nzlsgFormatCabinetDocument,
  formatNZGazette as nzlsgFormatNZGazette,
  formatAJHR as nzlsgFormatAJHR,
} from "./rules/nzlsg/parliamentary";
import {
  formatBook as nzlsgFormatBook,
  formatJournalArticle as nzlsgFormatJournalArticle,
  formatLawCommission as nzlsgFormatLawCommission,
  formatThesis as nzlsgFormatThesis,
  formatOnlineLooseleaf as nzlsgFormatOnlineLooseleaf,
} from "./rules/nzlsg/secondary";
import {
  formatTreaty as nzlsgFormatTreaty,
  formatUNDocument as nzlsgFormatUNDocument,
  formatICJCase as nzlsgFormatICJCase,
} from "./rules/nzlsg/international";
import {
  formatGeneralSubsequent as nzlsgFormatGeneralSubsequent,
  formatCommercialSubsequent as nzlsgFormatCommercialSubsequent,
} from "./rules/nzlsg/styles";
import type { NZLSGStyle } from "./rules/nzlsg/styles";
import { formatTreatyOfWaitangi as nzlsgFormatTreatyOfWaitangi } from "./rules/nzlsg/treaty-of-waitangi";

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
function dispatchBook(citation: Citation, config?: CitationConfig): FormattedRun[] {
  const d = citation.data;
  return formatBook({
    authors: (d.authors as Author[]) ?? [],
    title: (d.title as string) ?? "",
    publisher: (d.publisher as string) ?? "",
    edition: d.edition as number | undefined,
    year: (d.year as number) ?? 0,
    pinpoint: d.pinpoint as Pinpoint | undefined,
    editionAbbreviation: config?.editionAbbreviation as "ed" | "edn" | undefined,
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

// ─── NZLSG Dispatch (NZLSG-ENH-001) ─────────────────────────────────────────

/**
 * Helper to extract a string-based pinpoint from Citation.data for NZLSG
 * formatters, which accept `string | undefined` rather than a Pinpoint object.
 */
function extractNzlsgPinpoint(data: Record<string, unknown>): string | undefined {
  const pin = data.pinpoint as Pinpoint | undefined;
  if (!pin) return undefined;
  return pin.value;
}

/**
 * Helper to format an Author[] array into a single display string for NZLSG
 * formatters that accept a plain `author: string` field.
 */
function formatNzlsgAuthorString(authors: Author[] | undefined): string {
  if (!authors || authors.length === 0) return "";
  return authors
    .map((a) => {
      const given = a.givenNames?.trim();
      const surname = a.surname?.trim();
      if (given && surname) return `${given} ${surname}`;
      return surname ?? given ?? "";
    })
    .filter(Boolean)
    .join(authors.length === 2 ? " and " : ", ");
}

/**
 * Dispatches a citation to the appropriate NZLSG formatter based on source type.
 *
 * Returns `FormattedRun[]` if an NZLSG-specific formatter handles the source
 * type, or `null` to signal that the caller should fall through to the generic
 * formatter.
 *
 * NZLSG formatters use their own data interfaces (different field names and
 * shapes from the v4 formatters), so adapter logic extracts the right fields
 * from Citation.data.
 */
function dispatchNzlsg(citation: Citation): FormattedRun[] | null {
  const d = citation.data;
  const st = citation.sourceType;

  // ── Cases ──────────────────────────────────────────────────────────────────

  if (st === "case.reported" || st === "case.unreported.mnc") {
    // Determine if this is a pre-neutral citation based on data shape
    const isPreNeutral = Boolean(d.fileNumber);
    if (isPreNeutral) {
      return nzlsgFormatPreNeutralCase({
        caseName: (d.caseName as string) ?? `${(d.party1 as string) ?? ""} v ${(d.party2 as string) ?? ""}`,
        court: (d.court as string) ?? "",
        registry: d.registry as string | undefined,
        fileNumber: (d.fileNumber as string) ?? "",
        date: (d.date as string) ?? "",
        pinpoint: extractNzlsgPinpoint(d),
      });
    }

    // Neutral citation format
    const caseName = (d.caseName as string) ??
      `${(d.party1 as string) ?? ""} v ${(d.party2 as string) ?? ""}`;

    // Build parallel report from data if present
    const parallelReport = d.parallelReport as {
      year: number;
      volume?: number;
      reportSeries: string;
      startPage: number;
    } | undefined;

    return nzlsgFormatNeutralCitation({
      caseName,
      year: (d.year as number) ?? 0,
      courtIdentifier: (d.courtIdentifier as string) ?? (d.court as string) ?? "",
      decisionNumber: (d.decisionNumber as number) ?? (d.caseNumber as number) ?? 0,
      parallelReport: parallelReport ?? undefined,
      pinpoint: extractNzlsgPinpoint(d),
    });
  }

  // ── Maori Land Court (quasi-judicial with minute book data) ────────────────

  if (st === "case.quasi_judicial" && d.minuteBookAbbrev) {
    return nzlsgFormatMaoriLandCourt({
      caseName: (d.caseName as string) ?? "",
      year: (d.year as number) ?? 0,
      blockNumber: (d.blockNumber as number) ?? 0,
      minuteBookDistrict: (d.minuteBookDistrict as string) ?? "",
      minuteBookAbbrev: (d.minuteBookAbbrev as string) ?? "",
      page: (d.page as number) ?? 0,
      shortBlockNumber: d.shortBlockNumber as number | undefined,
      shortCourtAbbrev: d.shortCourtAbbrev as string | undefined,
      shortPage: d.shortPage as number | undefined,
      pinpoint: extractNzlsgPinpoint(d),
      isAppellateCourt: d.isAppellateCourt as boolean | undefined,
    });
  }

  // ── Waitangi Tribunal Reports ──────────────────────────────────────────────

  if (st === "report" && d.waiNumber !== undefined) {
    return nzlsgFormatWaitangiTribunalReport({
      title: (d.title as string) ?? "",
      waiNumber: (d.waiNumber as number) ?? 0,
      year: (d.year as number) ?? 0,
      pinpoint: extractNzlsgPinpoint(d),
    });
  }

  // ── Treaty of Waitangi ─────────────────────────────────────────────────────

  if (st === "treaty" && d.treatyOfWaitangi) {
    return nzlsgFormatTreatyOfWaitangi({
      language: (d.language as "english" | "maori") ?? "english",
      article: d.article as number | undefined,
      preamble: d.preamble as boolean | undefined,
    });
  }

  // ── Legislation ────────────────────────────────────────────────────────────

  if (st === "legislation.statute") {
    return nzlsgFormatLegislation({
      title: (d.title as string) ?? "",
      year: (d.year as number) ?? 0,
      jurisdiction: d.jurisdiction as string | undefined,
      pinpoint: extractNzlsgPinpoint(d),
    });
  }

  if (st === "legislation.delegated") {
    return nzlsgFormatDelegatedLegislation({
      title: (d.title as string) ?? "",
      year: (d.year as number) ?? 0,
      pinpoint: extractNzlsgPinpoint(d),
    });
  }

  if (st === "legislation.bill") {
    return nzlsgFormatBill({
      title: (d.title as string) ?? "",
      billNumber: (d.billNumber as string) ?? "",
      pinpoint: extractNzlsgPinpoint(d),
    });
  }

  // ── Parliamentary Materials ────────────────────────────────────────────────

  if (st === "hansard" && d.nzpd) {
    return nzlsgFormatNZPD({
      date: (d.date as string) ?? "",
      volume: (d.volume as number) ?? 0,
      page: (d.page as number) ?? 0,
      speaker: d.speaker as string | undefined,
      pinpoint: extractNzlsgPinpoint(d),
    });
  }

  if (st === "submission.government" && d.committee) {
    return nzlsgFormatSelectCommitteeSubmission({
      submitter: (d.submitter as string) ?? "",
      committee: (d.committee as string) ?? "",
      inquiryTitle: (d.inquiryTitle as string) ?? "",
      date: d.date as string | undefined,
      pinpoint: extractNzlsgPinpoint(d),
    });
  }

  if (st === "report.parliamentary" && d.cabinetDocument) {
    return nzlsgFormatCabinetDocument({
      title: (d.title as string) ?? "",
      reference: (d.reference as string) ?? "",
      date: (d.date as string) ?? "",
      pinpoint: extractNzlsgPinpoint(d),
    });
  }

  if (st === "report.parliamentary" && d.gazette) {
    return nzlsgFormatNZGazette({
      title: (d.title as string) ?? "",
      year: (d.year as number) ?? 0,
      page: (d.page as number) ?? 0,
      pinpoint: extractNzlsgPinpoint(d),
    });
  }

  if (st === "report.parliamentary" && d.ajhr) {
    return nzlsgFormatAJHR({
      author: d.author as string | undefined,
      title: (d.title as string) ?? "",
      reference: (d.reference as string) ?? "",
      pinpoint: extractNzlsgPinpoint(d),
    });
  }

  // ── Secondary Sources ──────────────────────────────────────────────────────

  if (st === "book") {
    return nzlsgFormatBook({
      author: (d.author as string) ??
        formatNzlsgAuthorString(d.authors as Author[] | undefined),
      title: (d.title as string) ?? "",
      edition: d.edition as string | undefined,
      publisher: (d.publisher as string) ?? "",
      place: (d.place as string) ?? "",
      year: (d.year as number) ?? 0,
      pinpoint: extractNzlsgPinpoint(d),
    });
  }

  if (st === "journal.article") {
    return nzlsgFormatJournalArticle({
      author: (d.author as string) ??
        formatNzlsgAuthorString(d.authors as Author[] | undefined),
      title: (d.title as string) ?? "",
      year: (d.year as number) ?? 0,
      volume: d.volume as number | undefined,
      journal: (d.journal as string) ?? "",
      startPage: (d.startingPage as number) ?? (d.startPage as number) ?? 0,
      pinpoint: extractNzlsgPinpoint(d),
    });
  }

  if (st === "report.law_reform" && d.reportType) {
    return nzlsgFormatLawCommission({
      title: (d.title as string) ?? "",
      reportType: (d.reportType as "R" | "SP" | "IP" | "PP") ?? "R",
      reportNumber: (d.reportNumber as number) ?? 0,
      year: (d.year as number) ?? 0,
      pinpoint: extractNzlsgPinpoint(d),
    });
  }

  if (st === "thesis") {
    return nzlsgFormatThesis({
      author: (d.author as string) ??
        formatNzlsgAuthorString(d.authors as Author[] | undefined),
      title: (d.title as string) ?? "",
      degree: (d.degree as string) ?? "",
      university: (d.university as string) ?? "",
      year: (d.year as number) ?? 0,
      pinpoint: extractNzlsgPinpoint(d),
    });
  }

  if (st === "looseleaf") {
    return nzlsgFormatOnlineLooseleaf({
      editor: (d.editor as string) ?? "",
      title: (d.title as string) ?? "",
      publisher: (d.publisher as string) ?? "",
      accessDate: d.accessDate as string | undefined,
      pinpoint: extractNzlsgPinpoint(d),
    });
  }

  // ── International Materials ────────────────────────────────────────────────

  if (st === "treaty") {
    return nzlsgFormatTreaty({
      title: (d.title as string) ?? "",
      parties: d.parties as string | undefined,
      signingEvent: d.signingEvent as string | undefined,
      treatySeries: d.treatySeries as string | undefined,
      entryIntoForce: d.entryIntoForce as string | undefined,
      pinpoint: extractNzlsgPinpoint(d),
    });
  }

  if (st === "un.document") {
    return nzlsgFormatUNDocument({
      body: (d.body as string) ?? "",
      title: d.title as string | undefined,
      documentSymbol: d.documentSymbol as string | undefined,
      session: d.session as string | undefined,
      date: d.date as string | undefined,
      pinpoint: extractNzlsgPinpoint(d),
    });
  }

  if (st === "icj.decision") {
    return nzlsgFormatICJCase({
      caseName: (d.caseName as string) ?? "",
      phase: d.phase as string | undefined,
      year: (d.year as number) ?? 0,
      icjReportsPage: d.icjReportsPage as number | undefined,
      pinpoint: extractNzlsgPinpoint(d),
    });
  }

  // No NZLSG-specific formatter matched — signal fall-through
  return null;
}

/**
 * Resolves NZLSG subsequent references using general or commercial style.
 *
 * NZLSG Rule 2.3: Two subsequent reference styles exist:
 * - General: "Author, above n X, at pinpoint" (no ibid)
 * - Commercial: "Author at pinpoint" (no cross-reference, no ibid)
 *
 * The style is determined by `citation.data.nzlsgStyle` or defaults to
 * "general". Returns `null` if a full citation should be rendered instead.
 */
function resolveNzlsgSubsequent(
  citation: Citation,
  context: CitationContext,
): FormattedRun[] | null {
  if (context.isFirstCitation) return null;

  const nzlsgStyle: NZLSGStyle =
    (citation.data.nzlsgStyle as NZLSGStyle) ?? "general";

  // Determine the author/title string for the subsequent reference
  const authorOrTitle =
    citation.shortTitle ??
    (citation.data.shortTitle as string | undefined) ??
    (citation.data.author as string | undefined) ??
    formatNzlsgAuthorString(citation.data.authors as Author[] | undefined) ??
    (citation.data.title as string | undefined) ??
    "";

  const pinpointStr = context.currentPinpoint
    ? extractNzlsgPinpoint(citation.data)
    : undefined;

  if (nzlsgStyle === "commercial") {
    return nzlsgFormatCommercialSubsequent({
      authorOrTitle,
      shortTitle: citation.shortTitle ?? (citation.data.shortTitle as string | undefined),
      pinpoint: pinpointStr,
    });
  }

  // General style: "above n X, at pinpoint"
  return nzlsgFormatGeneralSubsequent({
    authorOrTitle,
    footnoteNumber: context.firstFootnoteNumber,
    pinpoint: pinpointStr,
  });
}

/**
 * Returns true if the given standard ID belongs to the NZLSG family.
 */
function isNzlsgStandard(standardId: string): boolean {
  return standardId.startsWith("nzlsg");
}

// ─── OSCOLA Dispatch (OSC-ENH-001) ──────────────────────────────────────────

/**
 * Set of Scottish court identifiers used to route reported cases to the
 * Scottish formatter when operating under an OSCOLA standard.
 */
const SCOTTISH_COURT_SET: ReadonlySet<string> = new Set(SCOTTISH_COURT_IDS);

/**
 * Set of Northern Ireland court identifiers used to route reported cases
 * to the NI formatter when operating under an OSCOLA standard.
 */
const NI_COURT_SET: ReadonlySet<string> = new Set(NI_COURT_IDS);

/**
 * Builds the case name from Citation.data for OSCOLA formatters.
 * Combines party1 + separator + party2, or returns the caseName field directly.
 */
function buildOscolaCaseName(d: Record<string, unknown>): string {
  const caseName = d.caseName as string | undefined;
  if (caseName) return caseName;
  const party1 = (d.party1 as string) ?? "";
  const party2 = (d.party2 as string) ?? "";
  const sep = (d.separator as string) ?? "v";
  if (!party1 && !party2) return "";
  if (!party2) return party1;
  return `${party1} ${sep} ${party2}`;
}

/**
 * Extracts a pinpoint string from Citation.data for OSCOLA formatters.
 * OSCOLA formatters accept a plain string pinpoint, while Citation.data
 * may store either a Pinpoint object or a string.
 */
function extractOscolaPinpoint(d: Record<string, unknown>): string | undefined {
  const pin = d.pinpoint;
  if (!pin) return undefined;
  if (typeof pin === "string") return pin;
  if (typeof pin === "object" && pin !== null && "value" in pin) {
    return (pin as Pinpoint).value;
  }
  return undefined;
}

/**
 * Dispatches a UK case to formatOscolaCase (OSC-001/002).
 * Builds OscolaCaseData from Citation.data fields.
 */
function dispatchOscolaCase(citation: Citation): FormattedRun[] {
  const d = citation.data;
  const data: OscolaCaseData = {
    caseName: buildOscolaCaseName(d),
    pinpoint: extractOscolaPinpoint(d),
    courtId: d.courtId as string | undefined,
    bailiiRetrospective: d.bailiiRetrospective as boolean | undefined,
  };

  // Neutral citation
  const neutralCitation = d.neutralCitation as OscolaNeutralCitation | undefined;
  if (neutralCitation) {
    data.neutralCitation = neutralCitation;
  } else {
    const ncYear = d.neutralCitationYear as number | undefined;
    const ncCourt = d.neutralCitationCourt as string | undefined;
    const ncNumber = d.neutralCitationNumber as number | undefined;
    if (ncYear !== undefined && ncCourt && ncNumber !== undefined) {
      data.neutralCitation = {
        year: ncYear,
        court: ncCourt,
        number: ncNumber,
        ewhcDivision: d.ewhcDivision as string | undefined,
      };
    }
  }

  // Report citation
  const reportCitation = d.reportCitation as OscolaReportCitation | undefined;
  if (reportCitation) {
    data.reportCitation = reportCitation;
  } else if (d.reportSeries || d.year) {
    const year = (d.year as number) ?? 0;
    const series = (d.reportSeries as string) ?? "";
    if (series) {
      data.reportCitation = {
        year,
        yearType: (d.yearType as "round" | "square") ?? "square",
        volume: d.volume as number | undefined,
        series,
        startPage: (d.startingPage as number | string) ?? 0,
      };
    }
  }

  return formatOscolaCase(data);
}

/**
 * Dispatches a Scottish case to formatOscolaScottishCase (OSC-003).
 */
function dispatchOscolaScottishCase(citation: Citation): FormattedRun[] {
  const d = citation.data;
  const data: OscolaScottishCaseData = {
    caseName: buildOscolaCaseName(d),
    year: (d.year as number) ?? 0,
    yearType: (d.yearType as "round" | "square") ?? "round",
    volume: d.volume as number | undefined,
    reportSeries: (d.reportSeries as string) ?? "",
    startPage: (d.startingPage as number | string) ?? 0,
    courtId: d.courtId as string | undefined,
    pinpoint: extractOscolaPinpoint(d),
    historicalSeries: d.historicalSeries as boolean | undefined,
  };

  // Neutral citation
  const neutralCitation = d.neutralCitation as ScottishNeutralCitation | undefined;
  if (neutralCitation) {
    data.neutralCitation = neutralCitation;
  } else {
    const ncYear = d.neutralCitationYear as number | undefined;
    const ncCourt = d.neutralCitationCourt as string | undefined;
    const ncNumber = d.neutralCitationNumber as number | undefined;
    if (ncYear !== undefined && ncCourt && ncNumber !== undefined) {
      data.neutralCitation = { year: ncYear, court: ncCourt, number: ncNumber };
    }
  }

  return formatOscolaScottishCase(data);
}

/**
 * Dispatches a Northern Ireland case to formatOscolaNICase (OSC-004).
 */
function dispatchOscolaNICase(citation: Citation): FormattedRun[] {
  const d = citation.data;
  const data: OscolaNICaseData = {
    caseName: buildOscolaCaseName(d),
    courtId: d.courtId as string | undefined,
    pinpoint: extractOscolaPinpoint(d),
  };

  // Neutral citation
  const neutralCitation = d.neutralCitation as NINeutralCitation | undefined;
  if (neutralCitation) {
    data.neutralCitation = neutralCitation;
  } else {
    const ncYear = d.neutralCitationYear as number | undefined;
    const ncCourt = d.neutralCitationCourt as string | undefined;
    const ncNumber = d.neutralCitationNumber as number | undefined;
    if (ncYear !== undefined && ncCourt && ncNumber !== undefined) {
      data.neutralCitation = { year: ncYear, court: ncCourt, number: ncNumber };
    }
  }

  // Report citation
  const reportCitation = d.reportCitation as NIReportCitation | undefined;
  if (reportCitation) {
    data.reportCitation = reportCitation;
  } else if (d.reportSeries) {
    data.reportCitation = {
      year: (d.year as number) ?? 0,
      yearType: (d.yearType as "round" | "square") ?? "square",
      volume: d.volume as number | undefined,
      series: (d.reportSeries as string) ?? "",
      startPage: (d.startingPage as number | string) ?? 0,
    };
  }

  return formatOscolaNICase(data);
}

/**
 * Dispatches an Irish case to OSCOLA Ireland formatter (OSC-014).
 */
function dispatchOscolaIrishCase(citation: Citation): FormattedRun[] {
  const d = citation.data;

  const neutralCitation = d.neutralCitation as {
    year: number;
    court: IrishCourtIdentifier;
    number: number;
  } | undefined;

  let nc = neutralCitation;
  if (!nc) {
    const ncYear = d.neutralCitationYear as number | undefined;
    const ncCourt = d.neutralCitationCourt as string | undefined;
    const ncNumber = d.neutralCitationNumber as number | undefined;
    if (ncYear !== undefined && ncCourt && ncNumber !== undefined) {
      nc = {
        year: ncYear,
        court: ncCourt as IrishCourtIdentifier,
        number: ncNumber,
      };
    }
  }

  const reportCitation = d.reportCitation as {
    year: number;
    volume?: number;
    series: IrishReportSeries;
    page: number;
  } | undefined;

  let rc = reportCitation;
  if (!rc && d.reportSeries) {
    rc = {
      year: (d.year as number) ?? 0,
      volume: d.volume as number | undefined,
      series: (d.reportSeries as string) as IrishReportSeries,
      page: (d.startingPage as number) ?? 0,
    };
  }

  return oscolaFormatIrishCase({
    caseName: buildOscolaCaseName(d),
    neutralCitation: nc,
    reportCitation: rc,
    pinpoint: extractOscolaPinpoint(d),
  });
}

/**
 * Routes a reported case citation to the appropriate OSCOLA case formatter
 * based on the court identifier or jurisdiction field.
 *
 * Routing logic:
 *   - Scottish court ID -> OSC-003 (cases-scotland.ts)
 *   - NI court ID -> OSC-004 (cases-ni.ts)
 *   - Irish court ID -> OSC-014 (ireland.ts)
 *   - All other -> OSC-001/002 (cases.ts, general UK)
 */
function dispatchOscolaReportedCase(citation: Citation): FormattedRun[] {
  const d = citation.data;
  const courtId = (d.courtId as string) ??
    (d.neutralCitationCourt as string) ??
    ((d.neutralCitation as { court?: string } | undefined)?.court) ??
    "";
  const jurisdiction = (d.jurisdiction as string) ?? "";

  if (SCOTTISH_COURT_SET.has(courtId) || jurisdiction === "Scot") {
    return dispatchOscolaScottishCase(citation);
  }

  if (NI_COURT_SET.has(courtId) || jurisdiction === "NI") {
    return dispatchOscolaNICase(citation);
  }

  if (
    jurisdiction === "IE" ||
    jurisdiction === "Ireland" ||
    ["IESC", "IECA", "IEHC", "IECMC", "IECC"].includes(courtId)
  ) {
    return dispatchOscolaIrishCase(citation);
  }

  return dispatchOscolaCase(citation);
}

/**
 * Dispatches a statute to the appropriate OSCOLA legislation formatter.
 */
function dispatchOscolaStatute(citation: Citation): FormattedRun[] {
  const d = citation.data;
  const legislationType = d.legislationType as string | undefined;

  if (legislationType === "secondary" || legislationType === "delegated") {
    return formatOscolaSecondaryLegislation({
      title: (d.title as string) ?? "",
      year: (d.year as number) ?? 0,
      type: (d.instrumentType as "si" | "ssi" | "wsi" | "sr") ?? "si",
      number: (d.number as number | string) ?? 0,
      pinpoint: extractOscolaPinpoint(d),
    });
  }

  const jurisdiction = (d.jurisdiction as string) ?? "";
  if (jurisdiction === "IE" || jurisdiction === "Ireland") {
    if (d.siNumber !== undefined) {
      return oscolaFormatIrishStatutoryInstrument({
        shortTitle: (d.title as string) ?? "",
        year: (d.year as number) ?? 0,
        siNumber: d.siNumber as number,
        pinpoint: extractOscolaPinpoint(d),
      });
    }
    return oscolaFormatIrishAct({
      shortTitle: (d.title as string) ?? "",
      year: (d.year as number) ?? 0,
      pinpoint: extractOscolaPinpoint(d),
    });
  }

  return formatOscolaPrimaryLegislation({
    title: (d.title as string) ?? "",
    year: (d.year as number) ?? 0,
    type: (d.ukLegislationType as "uk" | "asp" | "anaw" | "asc" | "ni") ?? "uk",
    number: d.number as number | undefined,
    pinpoint: extractOscolaPinpoint(d),
    regnalYear: d.regnalYear as string | undefined,
    chapter: d.chapter as string | undefined,
  });
}

/**
 * Dispatches delegated legislation to OSCOLA secondary legislation formatter.
 */
function dispatchOscolaDelegatedLegislation(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatOscolaSecondaryLegislation({
    title: (d.title as string) ?? "",
    year: (d.year as number) ?? 0,
    type: (d.instrumentType as "si" | "ssi" | "wsi" | "sr") ?? "si",
    number: (d.number as number | string) ?? 0,
    pinpoint: extractOscolaPinpoint(d),
  });
}

/**
 * Dispatches a Hansard citation to formatOscolaHansard (OSC-007).
 */
function dispatchOscolaHansard(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatOscolaHansard({
    chamber: (d.chamber as "HC" | "HL") ?? "HC",
    date: (d.date as string) ?? "",
    volume: (d.volume as number) ?? 0,
    column: (d.column as number | string) ?? 0,
    speaker: d.speaker as string | undefined,
  });
}

/**
 * Dispatches a parliamentary report to the appropriate OSCOLA formatter.
 */
function dispatchOscolaParliamentaryReport(citation: Citation): FormattedRun[] {
  const d = citation.data;
  const reportType = d.reportType as string | undefined;

  if (reportType === "command_paper" || d.seriesPrefix) {
    return formatOscolaCommandPaper({
      author: (d.author as string) ?? (d.committee as string) ?? "",
      title: (d.title as string) ?? "",
      seriesPrefix: (d.seriesPrefix as "C" | "Cd" | "Cmd" | "Cmnd" | "Cm") ?? "Cm",
      paperNumber: (d.paperNumber as string | number) ?? "",
      year: (d.year as number) ?? 0,
      pinpoint: extractOscolaPinpoint(d),
    });
  }

  if (reportType === "law_commission" || d.reportNumber !== undefined) {
    return formatOscolaLawCommission({
      title: (d.title as string) ?? "",
      reportNumber: (d.reportNumber as number | string) ?? 0,
      year: (d.year as number) ?? 0,
      pinpoint: extractOscolaPinpoint(d),
    });
  }

  return formatOscolaParliamentaryReport({
    committee: (d.committee as string) ?? "",
    title: (d.title as string) ?? "",
    session: d.session as string | undefined,
    paperNumber: d.paperNumber as string | undefined,
    year: (d.year as number) ?? 0,
    pinpoint: extractOscolaPinpoint(d),
  });
}

/**
 * Dispatches an EU Official Journal citation to OSCOLA EU formatters (OSC-008).
 */
function dispatchOscolaEuOfficialJournal(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return oscolaFormatEuLegislation({
    instrumentType: (d.instrumentType as string) ?? "",
    number: (d.number as string) ?? "",
    title: (d.title as string) ?? "",
    year: (d.year as number) ?? 0,
    ojSeries: (d.ojSeries as string) ?? "",
    ojPage: (d.ojPage as string) ?? "",
  });
}

/**
 * Dispatches an EU court case to OSCOLA CJEU formatter (OSC-008).
 */
function dispatchOscolaEuCourt(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return oscolaFormatCjeuCase({
    caseNumber: (d.caseNumber as string) ?? "",
    caseName: buildOscolaCaseName(d),
    ecli: d.ecli as string | undefined,
    year: d.year as number | undefined,
    reportSeries: d.reportSeries as string | undefined,
    page: d.page as string | undefined,
    pinpoint: extractOscolaPinpoint(d),
  });
}

/**
 * Dispatches an ECHR decision to OSCOLA ECtHR formatters (OSC-009).
 */
function dispatchOscolaEchrDecision(citation: Citation): FormattedRun[] {
  const d = citation.data;
  const isAdmissibilityDecision = d.isDecision as boolean | undefined;
  if (isAdmissibilityDecision) {
    return oscolaFormatEcthrDecision({
      caseName: buildOscolaCaseName(d),
      respondentState: (d.respondentState as string) ?? "",
      applicationNumber: (d.applicationNumber as string) ?? "",
      date: (d.date as string) ?? "",
      chamber: d.chamber as "Grand Chamber" | string | undefined,
      pinpoint: extractOscolaPinpoint(d),
    });
  }
  return oscolaFormatEcthrCase({
    caseName: buildOscolaCaseName(d),
    respondentState: (d.respondentState as string) ?? "",
    applicationNumber: (d.applicationNumber as string) ?? "",
    chamber: d.chamber as "Grand Chamber" | "Section" | string | undefined,
    date: (d.date as string) ?? "",
    reportReference: d.reportReference as string | undefined,
    pinpoint: extractOscolaPinpoint(d),
  });
}

/**
 * Dispatches a treaty citation to the appropriate OSCOLA treaty formatter.
 */
function dispatchOscolaTreaty(citation: Citation): FormattedRun[] {
  const d = citation.data;

  if (d.ojReference) {
    return oscolaFormatEuTreaty({
      title: (d.title as string) ?? "",
      year: d.year as number | undefined,
      ojReference: d.ojReference as string | undefined,
      pinpoint: extractOscolaPinpoint(d),
    });
  }

  if (d.etsNumber || d.shortTitle) {
    return oscolaFormatCouncilOfEuropeTreaty({
      title: (d.title as string) ?? "",
      shortTitle: d.shortTitle as string | undefined,
      adoptedDate: d.adoptedDate as string | undefined,
      etsNumber: d.etsNumber as string | undefined,
      pinpoint: extractOscolaPinpoint(d),
    });
  }

  return oscolaFormatTreaty({
    title: (d.title as string) ?? "",
    adoptedDate: (d.openedDate as string) ?? (d.adoptedDate as string) ?? undefined,
    entryIntoForceDate: d.entryIntoForceDate as string | undefined,
    notYetInForce: d.notYetInForce as boolean | undefined,
    treatySeries: d.treatySeries as string | undefined,
    seriesVolume: d.seriesVolume as number | undefined,
    startingPage: d.startingPage as number | undefined,
    pinpoint: extractOscolaPinpoint(d),
  });
}

/**
 * Dispatches a UN document to OSCOLA UN formatter (OSC-010).
 */
function dispatchOscolaUnDocument(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return oscolaFormatUnDocument({
    body: (d.body as string) ?? "",
    title: d.title as string | undefined,
    resolutionNumber: d.resolutionNumber as string | undefined,
    sessionInfo: d.sessionInfo as string | undefined,
    date: (d.date as string) ?? "",
    documentSymbol: (d.documentSymbol as string) ?? "",
    pinpoint: extractOscolaPinpoint(d),
  });
}

/**
 * Dispatches an ICJ case to OSCOLA ICJ formatter (OSC-010).
 */
function dispatchOscolaIcjCase(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return oscolaFormatIcjCase({
    caseName: buildOscolaCaseName(d),
    phase: d.phase as string | undefined,
    year: (d.year as number) ?? 0,
    reportSeries: d.reportSeries as string | undefined,
    page: d.page as number | undefined,
    pinpoint: extractOscolaPinpoint(d),
    judge: d.judge as string | undefined,
  });
}

/**
 * Dispatches an ICC tribunal case to OSCOLA ICC formatter (OSC-010).
 */
function dispatchOscolaIccCase(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return oscolaFormatIccCase({
    caseName: buildOscolaCaseName(d),
    phase: (d.phase as string) ?? "",
    court: (d.court as string) ?? "ICC",
    chamber: (d.chamber as string) ?? "",
    caseNumber: (d.caseNumber as string) ?? "",
    date: (d.date as string) ?? "",
    pinpoint: extractOscolaPinpoint(d),
  });
}

/**
 * Dispatches a WTO document to OSCOLA WTO formatter (OSC-010).
 */
function dispatchOscolaWtoDocument(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return oscolaFormatWtoReport({
    reportType: (d.reportType as string) ?? "Panel Report",
    title: (d.title as string) ?? "",
    documentNumber: (d.documentNumber as string) ?? "",
    date: (d.date as string) ?? "",
    pinpoint: extractOscolaPinpoint(d),
  });
}

/**
 * Dispatches a GenAI citation to OSCOLA GenAI formatter (OSC-011).
 */
function dispatchOscolaGenAi(citation: Citation): FormattedRun[] {
  const d = citation.data;
  const platformRaw = (d.platform as string) ?? "";
  const toolName =
    platformRaw === "__other__"
      ? ((d.platformCustom as string) ?? "")
      : platformRaw || ((d.toolName as string) ?? "");
  return oscolaFormatGenAiCitation({
    toolName,
    provider: d.provider as string | undefined,
    prompt: (d.prompt as string) ?? "",
    dateGenerated: (d.outputDate as string) ?? (d.dateGenerated as string) ?? "",
    url: (d.url as string) || undefined,
    version: d.version as string | undefined,
  });
}

/**
 * OSC-ENH-001: Registry mapping SourceType to OSCOLA-specific dispatch
 * functions. When standardId starts with "oscola", this map is checked
 * first; if a formatter exists, it is used instead of the generic
 * SOURCE_DISPATCH. Unmapped source types fall through to SOURCE_DISPATCH
 * and then to formatGenericCitation.
 */
const OSCOLA_DISPATCH: Partial<Record<SourceType, SourceFormatter>> = {
  "case.reported": dispatchOscolaReportedCase,
  "case.unreported.mnc": dispatchOscolaCase,
  "legislation.statute": dispatchOscolaStatute,
  "legislation.delegated": dispatchOscolaDelegatedLegislation,
  hansard: dispatchOscolaHansard,
  "report.parliamentary": dispatchOscolaParliamentaryReport,
  "report.law_reform": dispatchOscolaParliamentaryReport,
  treaty: dispatchOscolaTreaty,
  "un.document": dispatchOscolaUnDocument,
  "icj.decision": dispatchOscolaIcjCase,
  "icc_tribunal.case": dispatchOscolaIccCase,
  "wto.document": dispatchOscolaWtoDocument,
  "wto.decision": dispatchOscolaWtoDocument,
  "eu.official_journal": dispatchOscolaEuOfficialJournal,
  "eu.court": dispatchOscolaEuCourt,
  "echr.decision": dispatchOscolaEchrDecision,
  genai_output: dispatchOscolaGenAi,
};

/**
 * OSC-ENH-001: Returns true if the given standard config represents an
 * OSCOLA standard (oscola4, oscola5, etc.).
 */
function isOscolaStandard(config: CitationConfig): boolean {
  return config.standardId.startsWith("oscola");
}

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

  // ── NZLSG subsequent reference handling (NZLSG-ENH-001) ───────────────────
  // NZLSG uses its own subsequent reference styles (general / commercial)
  // that differ from the shared AGLC4/OSCOLA resolver, so we check here first.
  if (isNzlsgStandard(standardConfig.standardId) && context && !context.isFirstCitation) {
    const nzlsgSubsequentRuns = resolveNzlsgSubsequent(citation, context);
    if (nzlsgSubsequentRuns !== null) {
      return ensureClosingPunctuation(nzlsgSubsequentRuns);
    }
    // null means render full citation — falls through below
  }

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

  // ── OSCOLA full citation dispatch (OSC-ENH-001) ─────────────────────────
  // When the standard is OSCOLA, try OSCOLA-specific formatters first.
  // Falls through to the generic AGLC4 dispatch / generic formatter if
  // no OSCOLA formatter handles this source type.
  if (isOscolaStandard(standardConfig)) {
    const oscolaFormatter = OSCOLA_DISPATCH[citation.sourceType];
    if (oscolaFormatter) {
      const runs = oscolaFormatter(citation, standardConfig);
      return ensureClosingPunctuation(runs);
    }
    // No OSCOLA-specific formatter — fall through to SOURCE_DISPATCH
  }

  // ── NZLSG full citation dispatch (NZLSG-ENH-001) ─────────────────────────
  // When the standard is NZLSG, try NZLSG-specific formatters first.
  // Falls through to the generic AGLC4 dispatch / generic formatter if
  // no NZLSG formatter handles this source type.
  if (isNzlsgStandard(standardConfig.standardId)) {
    const nzlsgRuns = dispatchNzlsg(citation);
    if (nzlsgRuns !== null) {
      return ensureClosingPunctuation(nzlsgRuns);
    }
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

  // OSC-ENH-001: Try OSCOLA-specific formatters first when standard is OSCOLA
  if (isOscolaStandard(standardConfig)) {
    const oscolaFormatter = OSCOLA_DISPATCH[citation.sourceType];
    if (oscolaFormatter) {
      const runs = oscolaFormatter(citation, standardConfig);
      return ensureClosingPunctuation(runs);
    }
  }

  // NZLSG-ENH-001: Try NZLSG-specific formatters first when standard is NZLSG
  if (isNzlsgStandard(standardConfig.standardId)) {
    const nzlsgRuns = dispatchNzlsg(citation);
    if (nzlsgRuns !== null) {
      return ensureClosingPunctuation(nzlsgRuns);
    }
  }

  const dispatcher = SOURCE_DISPATCH[citation.sourceType];
  const runs = dispatcher
    ? dispatcher(citation, standardConfig)
    : formatGenericCitation(citation);

  return ensureClosingPunctuation(runs);
}
