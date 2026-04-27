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
  IntroductorySignal,
} from "../types/citation";
import type { FormattedRun } from "../types/formattedRun";
import { formatCaseName } from "./rules/v4/domestic/case-names";
import { formatReportedCase } from "./rules/v4/domestic/cases";
import {
  formatUnreportedMnc,
  formatUnreportedNoMnc,
  formatProceeding,
  formatCourtOrder,
} from "./rules/v4/domestic/cases-unreported";
import {
  formatJudicialOfficers,
  formatCaseHistory,
  formatAdministrativeDecision,
  formatArbitration,
  formatTranscript,
  formatHcaTranscript,
  formatSubmission,
} from "./rules/v4/domestic/cases-supplementary";
import { formatStatute, formatBill, formatLegislationPinpoint } from "./rules/v4/domestic/legislation";
import {
  formatDelegatedLegislation,
  formatCommonwealthConstitution,
  formatStateConstitution,
  formatExplanatoryMemorandum,
  formatGazette,
  formatQuasiLegislative,
} from "./rules/v4/domestic/legislation-supplementary";
import { formatJournalArticle, formatOnlineJournalArticle, formatForthcomingArticle } from "./rules/v4/secondary/journals";
import { formatBook, formatBookChapter, formatTranslatedBook, formatAudiobook } from "./rules/v4/secondary/books";
import { formatTreaty } from "./rules/v4/international/treaties";
import { formatGenaiOutput } from "./rules/v4/secondary/genai";
import {
  formatReport,
  formatParliamentaryReport,
  formatRoyalCommissionReport,
  formatLawReformReport,
  formatAbsMaterial,
  formatResearchPaper,
  formatParliamentaryResearchPaper,
  formatConferencePaper,
  formatThesis,
  formatSpeech,
  formatPressRelease,
  formatHansard,
  formatSubmissionToInquiry,
} from "./rules/v4/secondary/other";
import {
  formatParliamentaryEvidence,
  formatConstitutionalConvention,
  formatDictionary,
  formatLegalEncyclopedia,
  formatLooseleaf,
  formatIpMaterial,
  formatConstitutiveDocument,
  formatNewspaper,
  formatCorrespondence,
  formatInterview,
  formatFilm,
  formatInternetMaterial,
  formatSocialMedia,
} from "./rules/v4/secondary/other-media";
import { formatUnDocument, formatUnCommunication, formatUnYearbook } from "./rules/v4/international/un";
import { formatIcjDecision, formatIcjPleading } from "./rules/v4/international/icj";
import { formatStateArbitrationReported, formatStateArbitration, formatIcsidCase } from "./rules/v4/international/arbitral";
import { formatIccCase } from "./rules/v4/international/icc-tribunals";
import { formatWtoDocument, formatWtoDecision, formatGattDocument } from "./rules/v4/international/economic";
import {
  formatEuOfficialJournal,
  formatCjeuCase,
  formatEchrCase,
  formatSupranationalDecision,
  formatSupranationalDocument,
} from "./rules/v4/international/supranational";
import {
  resolveSubsequentReference,
  formatShortTitleIntroduction,
  formatAbbreviationDefinition,
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
 * Normalises a pinpoint from Citation.data — handles both Pinpoint objects
 * (from the engine) and plain strings (from the UI text input).
 */
function normalisePinpoint(raw: unknown): Pinpoint | undefined {
  if (!raw) return undefined;
  if (typeof raw === "string") {
    // Plain string from UI — wrap as a generic pinpoint
    return { type: "page", value: raw };
  }
  // Already a Pinpoint object
  return raw as Pinpoint;
}

// ─── PLUMB-001: Type Coercion Helpers ────────────────────────────────────────
//
// The UI stores all form values as strings (text inputs produce strings).
// The engine formatters expect typed values (number, number | undefined, etc.).
// These helpers safely coerce unknown values from Citation.data at the
// dispatcher boundary so formatters receive correctly typed arguments.

/**
 * Coerces an unknown value to a number, returning the fallback when the
 * value is missing, empty, or not a valid number.
 *
 * Handles: number passthrough, numeric strings ("1992"), empty strings,
 * undefined, null, and NaN results.
 */
function toNumber(raw: unknown, fallback: number): number {
  if (typeof raw === "number") return Number.isNaN(raw) ? fallback : raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed === "") return fallback;
    const n = Number(trimmed);
    return Number.isNaN(n) ? fallback : n;
  }
  return fallback;
}

/**
 * Coerces an unknown value to a number or undefined. Returns undefined
 * when the value is missing, empty, or not a valid number — used for
 * optional numeric fields like volume, edition, seriesVolume.
 */
function toOptionalNumber(raw: unknown): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === "number") return Number.isNaN(raw) ? undefined : raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed === "") return undefined;
    const n = Number(trimmed);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}

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
        year: toNumber(d.year, 0),
        volume: toOptionalNumber(d.volume),
        reportSeries: (d.reportSeries as string) ?? "",
        startingPage: toNumber(d.startingPage, 0),
        pinpoint: normalisePinpoint(d.pinpoint),
        courtId: d.courtId as string | undefined,
        pinpointStyle: config?.pinpointStyle,
      });
      runs.push({ text: `; ${mnc.trim()}` });
      return runs;
    }
  }

  const runs = formatReportedCase({
    caseName,
    yearType: (d.yearType as "round" | "square") ?? "round",
    year: toNumber(d.year, 0),
    volume: toOptionalNumber(d.volume),
    reportSeries: (d.reportSeries as string) ?? "",
    startingPage: toNumber(d.startingPage, 0),
    pinpoint: normalisePinpoint(d.pinpoint),
    courtId: d.courtId as string | undefined,
    parallelCitations,
    pinpointStyle: config?.pinpointStyle,
  });

  // AUDIT2-005: Append judicial officers (Rule 2.4) if present
  const judicialOfficers = d.judicialOfficers as
    | Array<{ name: string; title: string; role?: "majority" | "concurring" | "dissenting" | "agreeing" | "during_argument" }>
    | undefined;
  if (judicialOfficers && judicialOfficers.length > 0) {
    const joRuns = formatJudicialOfficers(judicialOfficers);
    if (joRuns.length > 0) {
      runs.push({ text: " " });
      runs.push(...joRuns);
    }
  }

  // AUDIT2-005: Append case history (Rule 2.5) if present
  const caseHistory = d.caseHistory as
    | Array<{ phrase: string; citation: FormattedRun[] }>
    | undefined;
  if (caseHistory && caseHistory.length > 0) {
    runs.push(...formatCaseHistory(caseHistory));
  }

  return runs;
}

/**
 * Dispatches a statute citation (Rule 3.1).
 */
function dispatchStatute(citation: Citation): FormattedRun[] {
  const d = citation.data;
  const runs = formatStatute({
    title: (d.title as string) ?? "",
    year: toNumber(d.year, 0),
    jurisdiction: (d.jurisdiction as string) ?? "",
    number: d.number as string | undefined,
  });

  // Rule 3.1.4: Append legislation pinpoint after jurisdiction
  const pinpoint = normalisePinpoint(d.pinpoint);
  if (pinpoint) {
    runs.push({ text: " " });
    runs.push(...formatLegislationPinpoint(pinpoint));
  }

  return runs;
}

/**
 * Dispatches a journal article citation (Rule 5).
 */
function dispatchJournalArticle(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatJournalArticle({
    authors: (d.authors as Author[]) ?? [],
    title: (d.title as string) ?? "",
    year: toNumber(d.year, 0),
    volume: toOptionalNumber(d.volume),
    issue: d.issue as string | undefined,
    journal: (d.journal as string) ?? "",
    startingPage: toNumber(d.startingPage, 0),
    pinpoint: normalisePinpoint(d.pinpoint),
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
    edition: toOptionalNumber(d.edition),
    year: toNumber(d.year, 0),
    pinpoint: normalisePinpoint(d.pinpoint),
    editionAbbreviation: config?.editionAbbreviation as "ed" | "edn" | undefined,
  });
}

/**
 * Dispatches a treaty citation (Rule 8).
 */
function dispatchTreaty(citation: Citation): FormattedRun[] {
  const d = citation.data;

  // The UI stores parties as a comma-separated string; the formatter expects
  // string[]. Accept both shapes for robustness.
  let parties: string[] | undefined;
  if (Array.isArray(d.parties)) {
    parties = d.parties as string[];
  } else if (typeof d.parties === "string" && d.parties.trim()) {
    parties = (d.parties as string).split(",").map((p) => p.trim()).filter(Boolean);
  }

  return formatTreaty({
    title: (d.title as string) ?? "",
    parties,
    openedDate: d.openedDate as string | undefined,
    signedDate: d.signedDate as string | undefined,
    treatySeries: (d.treatySeries as string) ?? "",
    seriesVolume: toOptionalNumber(d.seriesVolume ?? d.volume),
    startingPage: toOptionalNumber(d.startingPage),
    entryIntoForceDate: d.entryIntoForceDate as string | undefined,
    notYetInForce: d.notYetInForce as boolean | undefined,
    pinpoint: normalisePinpoint(d.pinpoint),
  });
}

/**
 * Dispatches an unreported case with MNC (Rule 2.3.1).
 * Delegates to formatUnreportedMnc from cases-unreported.ts.
 */
function dispatchUnreportedMnc(citation: Citation): FormattedRun[] {
  const d = citation.data;
  const caseName = formatCaseName(
    (d.party1 as string) ?? "",
    (d.party2 as string) ?? "",
    d.separator as string | undefined,
  );
  return formatUnreportedMnc({
    caseName,
    year: toNumber(d.year, 0),
    courtIdentifier: (d.court as string) ?? (d.courtIdentifier as string) ?? "",
    caseNumber: toNumber(d.caseNumber, 0),
    pinpoint: normalisePinpoint(d.pinpoint),
    judicialOfficer: d.judicialOfficer as string | undefined,
  });
}

/**
 * Dispatches an unreported case without MNC (Rule 2.3.2).
 * Delegates to formatUnreportedNoMnc from cases-unreported.ts.
 */
function dispatchUnreportedNoMnc(citation: Citation): FormattedRun[] {
  const d = citation.data;
  const caseName = formatCaseName(
    (d.party1 as string) ?? "",
    (d.party2 as string) ?? "",
    d.separator as string | undefined,
  );
  return formatUnreportedNoMnc({
    caseName,
    courtIdentifier: (d.courtIdentifier as string) ?? (d.court as string) ?? "",
    fullDate: (d.fullDate as string) ?? (d.date as string) ?? "",
    proceedingNumber: d.proceedingNumber as string | undefined,
  });
}

/**
 * Dispatches a proceeding citation (Rule 2.3.3).
 * Delegates to formatProceeding from cases-unreported.ts.
 */
function dispatchProceeding(citation: Citation): FormattedRun[] {
  const d = citation.data;
  const caseName = formatCaseName(
    (d.party1 as string) ?? "",
    (d.party2 as string) ?? "",
    d.separator as string | undefined,
  );
  return formatProceeding({
    caseName,
    court: (d.court as string) ?? "",
    proceedingNumber: (d.proceedingNumber as string) ?? "",
    commencedDate: (d.commencedDate as string) ?? (d.date as string) ?? "",
  });
}

/**
 * Dispatches a court order citation (Rule 2.3.4).
 * Delegates to formatCourtOrder from cases-unreported.ts.
 */
function dispatchCourtOrder(citation: Citation): FormattedRun[] {
  const d = citation.data;
  const caseName = formatCaseName(
    (d.party1 as string) ?? "",
    (d.party2 as string) ?? "",
    d.separator as string | undefined,
  );
  return formatCourtOrder({
    caseName,
    court: (d.court as string) ?? "",
    orderDate: (d.orderDate as string) ?? (d.date as string) ?? "",
  });
}

/**
 * Dispatches a quasi-judicial / administrative decision citation (Rule 2.6.1).
 * Delegates to formatAdministrativeDecision from cases-supplementary.ts.
 */
function dispatchQuasiJudicial(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatAdministrativeDecision({
    party: (d.party as string) ?? (d.party1 as string) ?? "",
    department: (d.department as string) ?? (d.party2 as string) ?? "",
    year: toNumber(d.year, 0),
    volume: toOptionalNumber(d.volume),
    reportSeries: (d.reportSeries as string) ?? "",
    startingPage: toNumber(d.startingPage, 0),
  });
}

/**
 * Dispatches an arbitration citation (Rule 2.6.2).
 * Delegates to formatArbitration from cases-supplementary.ts.
 */
function dispatchArbitration(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatArbitration({
    parties: (d.parties as string) ?? "",
    arbitrationType: (d.arbitrationType as string) ?? "",
    awardDetails: (d.awardDetails as string) ?? "",
  });
}

/**
 * Dispatches a transcript citation (Rules 2.7.1-2.7.2).
 * Routes to formatHcaTranscript when the transcript is an HCA transcript,
 * otherwise delegates to formatTranscript from cases-supplementary.ts.
 */
function dispatchTranscript(citation: Citation): FormattedRun[] {
  const d = citation.data;
  const caseName = formatCaseName(
    (d.party1 as string) ?? "",
    (d.party2 as string) ?? "",
    d.separator as string | undefined,
  );

  // Rule 2.7.2: HCA transcripts use a special format with [Year] HCATrans Number
  if (d.hcaTranscript || (d.court as string) === "HCATrans") {
    return formatHcaTranscript({
      caseName,
      year: toNumber(d.year, 0),
      number: toNumber(d.number, toNumber(d.caseNumber, 0)),
    });
  }

  // Rule 2.7.1: General transcript format
  return formatTranscript({
    caseName,
    court: (d.court as string) ?? "",
    proceedingNumber: (d.proceedingNumber as string) ?? "",
    date: (d.date as string) ?? "",
  });
}

/**
 * Dispatches a submission citation (Rule 2.8).
 * Delegates to formatSubmission from cases-supplementary.ts.
 */
function dispatchSubmission(citation: Citation): FormattedRun[] {
  const d = citation.data;
  const caseName = formatCaseName(
    (d.caseParty1 as string) ?? (d.party1 as string) ?? "",
    (d.caseParty2 as string) ?? (d.party2 as string) ?? "",
    d.separator as string | undefined,
  );
  return formatSubmission({
    partyName: (d.partyName as string) ?? "",
    submissionTitle: (d.submissionTitle as string) ?? (d.title as string) ?? "",
    caseName,
    proceedingNumber: (d.proceedingNumber as string) ?? "",
    date: (d.date as string) ?? "",
    pinpoint: normalisePinpoint(d.pinpoint),
  });
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
 * Dispatches a custom/manual citation. The user provides free-text
 * citation content which is inserted as-is (roman, no formatting).
 * The short title is stored on the citation for ibid/subsequent ref use.
 */
function dispatchCustom(citation: Citation): FormattedRun[] {
  const text = ((citation.data.customText as string) ?? "").trim();
  if (!text) return [{ text: "[Custom citation]" }];
  return [{ text }];
}

/**
 * Dispatches a bill citation (AUDIT2-009, Rule 3.2).
 *
 * Bills are NOT italicised (unlike statutes). Extracts title, year,
 * jurisdiction, and optional number from Citation.data, then appends
 * a legislation pinpoint if present.
 */
function dispatchBill(citation: Citation): FormattedRun[] {
  const d = citation.data;
  const runs = formatBill({
    title: (d.title as string) ?? "",
    year: toNumber(d.year, 0),
    jurisdiction: (d.jurisdiction as string) ?? "",
    number: d.number as string | undefined,
  });

  const pinpoint = normalisePinpoint(d.pinpoint);
  if (pinpoint) {
    runs.push({ text: " " });
    runs.push(...formatLegislationPinpoint(pinpoint));
  }

  return runs;
}

/**
 * Dispatches a delegated legislation citation (AUDIT2-010, Rule 3.4).
 *
 * Delegated legislation (regulations, rules, orders) is formatted like
 * statutes: title and year in italics, jurisdiction in parentheses.
 */
function dispatchDelegatedLegislation(citation: Citation): FormattedRun[] {
  const d = citation.data;
  const runs = formatDelegatedLegislation({
    title: (d.title as string) ?? "",
    year: toNumber(d.year, 0),
    jurisdiction: (d.jurisdiction as string) ?? "",
  });

  const pinpoint = normalisePinpoint(d.pinpoint);
  if (pinpoint) {
    runs.push({ text: " " });
    runs.push(...formatLegislationPinpoint(pinpoint));
  }

  return runs;
}

/**
 * Dispatches a constitution citation (AUDIT2-011, Rule 3.6).
 *
 * If jurisdiction is "Cth" (or absent, defaulting to Commonwealth),
 * delegates to formatCommonwealthConstitution. Otherwise delegates to
 * formatStateConstitution for state/territory constitutions.
 */
function dispatchConstitution(citation: Citation): FormattedRun[] {
  const d = citation.data;
  const jurisdiction = (d.jurisdiction as string) ?? "Cth";
  const pinpoint = normalisePinpoint(d.pinpoint);

  if (jurisdiction === "Cth") {
    return formatCommonwealthConstitution(pinpoint);
  }

  return formatStateConstitution({
    title: (d.title as string) ?? "Constitution Act",
    year: toNumber(d.year, 0),
    jurisdiction,
    pinpoint,
  });
}

/**
 * Dispatches an explanatory memorandum citation (AUDIT2-012, Rule 3.7).
 *
 * Extracts the document type (e.g. "Explanatory Memorandum"), the bill
 * title and year, jurisdiction, and optional pinpoint.
 */
function dispatchExplanatoryMemorandum(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatExplanatoryMemorandum({
    type: (d.type as string) ?? "Explanatory Memorandum",
    billTitle: (d.billTitle as string) ?? (d.title as string) ?? "",
    billYear: toNumber(d.billYear, toNumber(d.year, 0)),
    jurisdiction: (d.jurisdiction as string) ?? "",
    pinpoint: normalisePinpoint(d.pinpoint),
  });
}

/**
 * Dispatches a quasi-legislative material citation (AUDIT2-013, Rule 3.9).
 *
 * Checks data fields to determine whether this is a gazette (Rule 3.9.1)
 * or another quasi-legislative material (Rules 3.9.2-3.9.4) such as
 * ASIC class orders, ATO rulings, or practice directions.
 */
function dispatchQuasiLegislative(citation: Citation): FormattedRun[] {
  const d = citation.data;

  // If gazette-specific fields are present, format as gazette (Rule 3.9.1)
  if (d.gazetteType) {
    return formatGazette({
      jurisdiction: (d.jurisdiction as string) ?? "",
      gazetteType: (d.gazetteType as string) ?? "",
      number: d.number as string | undefined,
      date: (d.date as string) ?? "",
      page: toOptionalNumber(d.page),
    });
  }

  // Otherwise format as quasi-legislative material (Rules 3.9.2-3.9.4)
  return formatQuasiLegislative({
    issuingBody: (d.issuingBody as string) ?? "",
    documentType: (d.documentType as string) ?? "",
    number: (d.number as string) ?? "",
    date: (d.date as string) ?? "",
    title: d.title as string | undefined,
  });
}

// ─── Group 1: Journal Variants ──────────────────────────────────────────────

/**
 * Dispatches an online journal article citation (Rule 5.10).
 * Delegates to formatOnlineJournalArticle which appends the URL.
 */
function dispatchJournalOnline(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatOnlineJournalArticle({
    authors: (d.authors as Author[]) ?? [],
    title: (d.title as string) ?? "",
    year: toNumber(d.year, 0),
    volume: toOptionalNumber(d.volume),
    issue: d.issue as string | undefined,
    journal: (d.journal as string) ?? "",
    articleNumber: d.articleNumber as string | undefined,
    url: (d.url as string) ?? "",
  });
}

/**
 * Dispatches a forthcoming journal article citation (Rule 5.11).
 * Delegates to formatForthcomingArticle which appends "(forthcoming)".
 */
function dispatchJournalForthcoming(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatForthcomingArticle({
    authors: (d.authors as Author[]) ?? [],
    title: (d.title as string) ?? "",
    journal: (d.journal as string) ?? "",
  });
}

// ─── Group 2: Book Variants ────────────────────────────────────────────────

/**
 * Dispatches a book chapter citation (Rule 6.6.1).
 * Delegates to formatBookChapter.
 */
function dispatchBookChapter(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatBookChapter({
    chapterAuthors: (d.chapterAuthors as Author[]) ?? (d.authors as Author[]) ?? [],
    chapterTitle: (d.chapterTitle as string) ?? (d.title as string) ?? "",
    editors: (d.editors as Author[]) ?? [],
    bookTitle: (d.bookTitle as string) ?? "",
    publisher: (d.publisher as string) ?? "",
    year: toNumber(d.year, 0),
    startingPage: toNumber(d.startingPage, 0),
    pinpoint: normalisePinpoint(d.pinpoint),
  });
}

/**
 * Dispatches a translated book citation (Rule 6.7).
 * Delegates to formatTranslatedBook.
 */
function dispatchBookTranslated(citation: Citation, config?: CitationConfig): FormattedRun[] {
  const d = citation.data;
  return formatTranslatedBook({
    authors: (d.authors as Author[]) ?? [],
    title: (d.title as string) ?? "",
    publisher: (d.publisher as string) ?? "",
    edition: toOptionalNumber(d.edition),
    year: toNumber(d.year, 0),
    translator: (d.translator as string) ?? "",
    pinpoint: normalisePinpoint(d.pinpoint),
    editionAbbreviation: config?.editionAbbreviation as "ed" | "edn" | undefined,
  });
}

/**
 * Dispatches an audiobook citation (Rule 6.9).
 * Delegates to formatAudiobook.
 */
function dispatchBookAudiobook(citation: Citation, config?: CitationConfig): FormattedRun[] {
  const d = citation.data;
  return formatAudiobook({
    authors: (d.authors as Author[]) ?? [],
    title: (d.title as string) ?? "",
    publisher: (d.publisher as string) ?? "",
    edition: toOptionalNumber(d.edition),
    year: toNumber(d.year, 0),
    narrator: (d.narrator as string) ?? "",
    pinpoint: normalisePinpoint(d.pinpoint),
    editionAbbreviation: config?.editionAbbreviation as "ed" | "edn" | undefined,
  });
}

// ─── Group 3: Reports ──────────────────────────────────────────────────────

/**
 * Dispatches a general report citation (Rule 7.1.1).
 * Delegates to formatReport.
 */
function dispatchReport(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatReport({
    authors: d.authors as Author[] | undefined,
    body: d.body as string | undefined,
    bodyJurisdiction: d.bodyJurisdiction as string | undefined,
    bodySubdivision: d.bodySubdivision as string | undefined,
    title: (d.title as string) ?? "",
    reportType: d.reportType as string | undefined,
    reportNumber: d.reportNumber as string | undefined,
    date: (d.date as string) ?? String(toOptionalNumber(d.year) ?? ""),
    pinpoint: normalisePinpoint(d.pinpoint),
  });
}

/**
 * Dispatches a parliamentary committee report citation (Rule 7.1.2).
 * Delegates to formatParliamentaryReport.
 */
function dispatchParliamentaryReport(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatParliamentaryReport({
    jurisdiction: (d.jurisdiction as string) ?? "",
    committee: (d.committee as string) ?? "",
    title: (d.title as string) ?? "",
    documentType: d.documentType as string | undefined,
    number: d.number as string | undefined,
    date: (d.date as string) ?? String(toOptionalNumber(d.year) ?? ""),
  });
}

/**
 * Dispatches a royal commission report citation (Rule 7.1.3).
 * Delegates to formatRoyalCommissionReport.
 */
function dispatchRoyalCommission(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatRoyalCommissionReport({
    commissionName: (d.commissionName as string) ?? (d.body as string) ?? (d.institutionalAuthor as string) ?? "",
    title: (d.title as string) ?? "",
    year: toNumber(d.year, 0),
    volume: toOptionalNumber(d.volume),
  });
}

/**
 * Dispatches a law reform commission report citation (Rule 7.1.4).
 * Delegates to formatLawReformReport.
 */
function dispatchLawReformReport(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatLawReformReport({
    commissionName: (d.commissionName as string) ?? (d.body as string) ?? (d.institutionalAuthor as string) ?? "",
    title: (d.title as string) ?? "",
    documentType: (d.documentType as string) ?? "Report",
    number: (d.number as string) ?? (d.reportNumber as string) ?? "",
    date: (d.date as string) ?? String(toOptionalNumber(d.year) ?? ""),
  });
}

/**
 * Dispatches an ABS material citation (Rule 7.1.5).
 * Delegates to formatAbsMaterial.
 */
function dispatchAbsMaterial(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatAbsMaterial({
    title: (d.title as string) ?? "",
    catalogueNumber: (d.catalogueNumber as string) ?? (d.number as string) ?? "",
    date: (d.date as string) ?? String(toOptionalNumber(d.year) ?? ""),
  });
}

/**
 * Dispatches a Waitangi Tribunal report citation (NZLSG variant).
 * Falls through to formatReport with Waitangi Tribunal as the body.
 */
function dispatchWaitangiTribunalReport(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatReport({
    body: (d.body as string) ?? "Waitangi Tribunal",
    title: (d.title as string) ?? "",
    reportType: d.reportType as string | undefined,
    reportNumber: d.reportNumber as string | undefined,
    date: (d.date as string) ?? String(toOptionalNumber(d.year) ?? ""),
    pinpoint: normalisePinpoint(d.pinpoint),
  });
}

// ─── Group 4: Other Secondary Sources ──────────────────────────────────────

/**
 * Dispatches a research paper citation (Rules 7.2.1-7.2.2).
 * Delegates to formatResearchPaper.
 */
function dispatchResearchPaper(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatResearchPaper({
    authors: (d.authors as Author[]) ?? [],
    title: (d.title as string) ?? "",
    documentType: (d.documentType as string) ?? "Working Paper",
    number: (d.number as string) ?? "",
    institution: (d.institution as string) ?? "",
    year: toNumber(d.year, 0),
  });
}

/**
 * Dispatches a parliamentary research paper citation (Rule 7.2.3).
 * Delegates to formatParliamentaryResearchPaper.
 */
function dispatchParliamentaryResearchPaper(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatParliamentaryResearchPaper({
    body: (d.body as string) ?? (d.institutionalAuthor as string) ?? "",
    jurisdiction: d.jurisdiction as string | undefined,
    title: (d.title as string) ?? "",
    documentType: (d.documentType as string) ?? "Research Paper",
    number: (d.number as string) ?? "",
    year: toNumber(d.year, 0),
  });
}

/**
 * Dispatches a conference paper citation (Rule 7.2.4).
 * Delegates to formatConferencePaper.
 */
function dispatchConferencePaper(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatConferencePaper({
    authors: (d.authors as Author[]) ?? [],
    title: (d.title as string) ?? "",
    conferenceName: (d.conferenceName as string) ?? (d.event as string) ?? "",
    date: (d.date as string) ?? String(toOptionalNumber(d.year) ?? ""),
  });
}

/**
 * Dispatches a thesis citation (Rule 7.2.5).
 * Delegates to formatThesis.
 */
function dispatchThesis(citation: Citation): FormattedRun[] {
  const d = citation.data;
  // formatThesis expects a single Author, not Author[]
  const authors = d.authors as Author[] | undefined;
  const singleAuthor: Author = authors && authors.length > 0
    ? authors[0]
    : { givenNames: "", surname: (d.author as string) ?? "" };
  return formatThesis({
    author: singleAuthor,
    title: (d.title as string) ?? "",
    thesisType: (d.thesisType as string) ?? (d.degree as string) ?? "PhD Thesis",
    university: (d.university as string) ?? (d.institution as string) ?? "",
    year: toNumber(d.year, 0),
  });
}

/**
 * Dispatches a speech citation (Rule 7.3).
 * Delegates to formatSpeech.
 */
function dispatchSpeech(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatSpeech({
    speaker: (d.speaker as string) ?? "",
    title: (d.title as string) ?? "",
    event: (d.event as string) ?? "",
    date: (d.date as string) ?? "",
  });
}

/**
 * Dispatches a press release citation (Rule 7.4).
 * Delegates to formatPressRelease.
 */
function dispatchPressRelease(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatPressRelease({
    authors: d.authors as Author[] | undefined,
    body: d.body as string | undefined,
    title: (d.title as string) ?? "",
    date: (d.date as string) ?? "",
  });
}

/**
 * Dispatches a newspaper article citation (Rules 7.11.1-7.11.4).
 * Delegates to formatNewspaper.
 */
function dispatchNewspaper(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatNewspaper({
    authors: d.authors as Author[] | undefined,
    title: (d.title as string) ?? "",
    newspaper: (d.newspaper as string) ?? "",
    place: (d.place as string) ?? "",
    date: (d.date as string) ?? "",
    page: d.page as string | undefined,
    isElectronic: d.isElectronic as boolean | undefined,
    url: d.url as string | undefined,
  });
}

/**
 * Dispatches a correspondence citation (Rule 7.12).
 * Delegates to formatCorrespondence.
 */
function dispatchCorrespondence(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatCorrespondence({
    type: (d.type as string) ?? (d.correspondenceType as string) ?? "Letter",
    sender: (d.sender as string) ?? (d.author as string) ?? "",
    recipient: (d.recipient as string) ?? "",
    date: (d.date as string) ?? "",
  });
}

/**
 * Dispatches an interview citation (Rule 7.13).
 * Delegates to formatInterview.
 */
function dispatchInterview(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatInterview({
    interviewee: (d.interviewee as string) ?? "",
    interviewer: d.interviewer as string | undefined,
    location: d.location as string | undefined,
    date: (d.date as string) ?? "",
  });
}

/**
 * Dispatches a film/TV/media citation (Rules 7.14.1-7.14.4).
 * Delegates to formatFilm.
 */
function dispatchFilmTvMedia(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatFilm({
    title: (d.title as string) ?? "",
    director: (d.director as string) ?? "",
    year: String(d.year ?? ""),
  });
}

/**
 * Dispatches an internet material citation (Rule 7.15).
 * Delegates to formatInternetMaterial.
 */
function dispatchInternetMaterial(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatInternetMaterial({
    authors: d.authors as Author[] | undefined,
    title: (d.title as string) ?? "",
    website: (d.website as string) ?? (d.siteName as string) ?? "",
    date: (d.date as string) ?? "",
    url: (d.url as string) ?? "",
  });
}

/**
 * Dispatches a social media citation (Rule 7.16).
 * Delegates to formatSocialMedia.
 */
function dispatchSocialMedia(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatSocialMedia({
    author: (d.author as string) ?? (d.handle as string) ?? "",
    platform: (d.platform as string) ?? "",
    title: d.title as string | undefined,
    date: (d.date as string) ?? "",
    time: d.time as string | undefined,
    url: (d.url as string) ?? "",
  });
}

/**
 * Dispatches a dictionary citation (Rule 7.6).
 * Delegates to formatDictionary.
 */
function dispatchDictionary(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatDictionary({
    title: (d.title as string) ?? "",
    publisher: d.publisher as string | undefined,
    edition: d.edition as string | undefined,
    year: String(d.year ?? ""),
    entry: (d.entry as string) ?? "",
    definitionNumber: d.definitionNumber as string | undefined,
  });
}

/**
 * Dispatches a legal encyclopedia citation (Rule 7.7).
 * Delegates to formatLegalEncyclopedia.
 */
function dispatchLegalEncyclopedia(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatLegalEncyclopedia({
    title: (d.title as string) ?? "",
    date: (d.date as string) ?? "",
    volume: d.volume as string | undefined,
    titleNumber: d.titleNumber as string | undefined,
    topic: (d.topic as string) ?? "",
    paragraph: (d.paragraph as string) ?? "",
  });
}

/**
 * Dispatches a looseleaf service citation (Rule 7.8).
 * Delegates to formatLooseleaf.
 */
function dispatchLooseleaf(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatLooseleaf({
    authors: (d.authors as Author[]) ?? [],
    title: (d.title as string) ?? "",
    publisher: (d.publisher as string) ?? (d.service as string) ?? "",
    date: (d.date as string) ?? "",
    volume: d.volume as string | undefined,
    paragraph: d.paragraph as string | undefined,
  });
}

/**
 * Dispatches an intellectual property material citation (Rule 7.9).
 * Delegates to formatIpMaterial.
 */
function dispatchIpMaterial(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatIpMaterial({
    ipType: (d.ipType as string) ?? (d.type as string) ?? "Patent",
    number: (d.number as string) ?? "",
    title: d.title as string | undefined,
    applicant: d.applicant as string | undefined,
    date: d.date as string | undefined,
  });
}

/**
 * Dispatches a constitutive document citation (Rule 7.10).
 * Delegates to formatConstitutiveDocument.
 */
function dispatchConstitutiveDocument(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatConstitutiveDocument({
    companyName: (d.companyName as string) ?? (d.entity as string) ?? "",
    documentType: (d.documentType as string) ?? (d.type as string) ?? "",
    pinpoint: normalisePinpoint(d.pinpoint),
  });
}

// ─── Group 5: Parliamentary ────────────────────────────────────────────────

/**
 * Dispatches a Hansard citation (Rule 7.5.1).
 * Delegates to formatHansard.
 */
function dispatchHansard(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatHansard({
    jurisdiction: (d.jurisdiction as string) ?? "",
    chamber: (d.chamber as string) ?? "",
    date: (d.date as string) ?? "",
    page: (d.page as string) ?? "",
    speaker: d.speaker as string | undefined,
  });
}

/**
 * Dispatches a submission to government inquiry citation (Rule 7.5.2).
 * Delegates to formatSubmissionToInquiry.
 */
function dispatchSubmissionGovernment(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatSubmissionToInquiry({
    authors: d.authors as Author[] | undefined,
    body: d.body as string | undefined,
    documentType: (d.documentType as string) ?? "Submission",
    number: d.number as string | undefined,
    committee: (d.committee as string) ?? "",
    inquiry: (d.inquiry as string) ?? "",
    date: d.date as string | undefined,
  });
}

/**
 * Dispatches a parliamentary evidence citation (Rule 7.5.3).
 * Delegates to formatParliamentaryEvidence.
 */
function dispatchParliamentaryEvidence(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatParliamentaryEvidence({
    title: (d.title as string) ?? "",
    committee: (d.committee as string) ?? "",
    parliament: (d.parliament as string) ?? "",
    jurisdiction: (d.jurisdiction as string) ?? "",
    date: (d.date as string) ?? "",
    page: d.page as string | undefined,
    witness: d.witness as string | undefined,
  });
}

/**
 * Dispatches a constitutional convention citation (Rule 7.5.4).
 * Delegates to formatConstitutionalConvention.
 */
function dispatchConstitutionalConvention(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatConstitutionalConvention({
    conventionName: (d.conventionName as string) ?? (d.title as string) ?? "",
    location: (d.location as string) ?? "",
    date: (d.date as string) ?? "",
    volume: d.volume as string | undefined,
    page: d.page as string | undefined,
  });
}

// ─── Group 6: International Materials ──────────────────────────────────────

/**
 * Dispatches a UN document citation (Rules 9.2.1-9.2.14).
 * Delegates to formatUnDocument.
 */
function dispatchUnDocument(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatUnDocument({
    author: d.author as string | undefined,
    title: (d.title as string) ?? "",
    resolutionNumber: d.resolutionNumber as string | undefined,
    officialRecords: d.officialRecords as string | undefined,
    session: d.session as string | undefined,
    meetingNumber: d.meetingNumber as string | undefined,
    agendaItem: d.agendaItem as string | undefined,
    supplement: d.supplement as string | undefined,
    documentNumber: (d.documentNumber as string) ?? (d.documentSymbol as string) ?? "",
    date: (d.date as string) ?? "",
    annex: d.annex as string | undefined,
    pinpoint: d.pinpoint as string | undefined,
  });
}

/**
 * Dispatches a UN communication citation (Rule 9.3).
 * Delegates to formatUnCommunication.
 */
function dispatchUnCommunication(citation: Citation): FormattedRun[] {
  const d = citation.data;
  // Form field: "author" for the applicant/parties (e.g. "Ángela Poma Poma v Peru")
  // AI may put the case name in "title" instead of "author"
  const author = (d.author as string) ?? (d.title as string) ?? "";
  // Form field: "communicationNumber" (e.g. "1457/2006")
  const commNo = (d.communicationNumber as string) ?? (d.commNumber as string) ?? "";
  // Form field: "committee" (e.g. "Human Rights Committee")
  const committee = (d.committee as string) ?? "";
  // Form field: "docNumber" (e.g. "CCPR/C/95/D/1457/2006")
  const docNumber = (d.docNumber as string) ?? (d.documentNumber as string) ?? (d.documentSymbol as string) ?? "";
  // Build the title: "Author, Committee, Communication No X"
  const titleParts: string[] = [];
  if (committee) titleParts.push(committee);
  if (commNo) titleParts.push(`Communication No ${commNo}`);
  const title = titleParts.join(", ");
  return formatUnCommunication({
    author,
    title,
    committee,
    documentNumber: docNumber,
    date: d.date as string | undefined,
    pinpoint: d.pinpoint as string | undefined,
  });
}

/**
 * Dispatches a UN yearbook citation (Rule 9.4).
 * Delegates to formatUnYearbook.
 */
function dispatchUnYearbook(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatUnYearbook({
    title: d.title as string | undefined,
    yearbook: (d.yearbook as string) ?? "",
    year: toNumber(d.year, 0),
    yearType: d.yearType as "round" | "square" | undefined,
    volume: d.volume as string | undefined,
    startingPage: toOptionalNumber(d.startingPage),
    pinpoint: d.pinpoint as string | undefined,
  });
}

/**
 * Dispatches an ICJ decision citation (Rules 10.1-10.5).
 * Delegates to formatIcjDecision.
 */
function dispatchIcjDecision(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatIcjDecision({
    caseName: (d.caseTitle as string) ?? (d.caseName as string) ?? (d.title as string) ?? "",
    parties: d.parties as string | undefined,
    phase: d.phase as string | undefined,
    year: toNumber(d.year, 0),
    reportSeries: (d.reportSeries as string) ?? "ICJ Reports",
    seriesLetter: d.seriesLetter as string | undefined,
    page: toOptionalNumber(d.page),
    caseNumber: toOptionalNumber(d.caseNumber),
    pinpoint: d.pinpoint as string | undefined,
    judge: d.judge as string | undefined,
  });
}

/**
 * Dispatches an ICJ pleading citation (Rule 10.3).
 * Delegates to formatIcjPleading.
 */
function dispatchIcjPleading(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatIcjPleading({
    documentTitle: (d.documentTitle as string) ?? (d.title as string) ?? "",
    caseName: (d.caseName as string) ?? "",
    parties: d.parties as string | undefined,
    year: toNumber(d.year, 0),
    volume: d.volume as string | undefined,
    page: toOptionalNumber(d.page),
    pinpoint: d.pinpoint as string | undefined,
    speaker: d.speaker as string | undefined,
  });
}

/**
 * Dispatches a state-state arbitration citation (Rule 11.1).
 * Routes to reported or unreported format based on data fields.
 */
function dispatchArbitralStateState(citation: Citation): FormattedRun[] {
  const d = citation.data;
  // If report series is present, use reported format (Rule 11.1.1)
  if (d.reportSeries) {
    return formatStateArbitrationReported({
      caseName: (d.caseTitle as string) ?? (d.caseName as string) ?? (d.title as string) ?? "",
      parties: d.parties as string | undefined,
      phase: d.phase as string | undefined,
      year: toNumber(d.year, 0),
      volume: toOptionalNumber(d.volume),
      reportSeries: (d.reportSeries as string) ?? "",
      startingPage: toNumber(d.startingPage, 0),
      pinpoint: d.pinpoint as string | undefined,
      judge: d.judge as string | undefined,
    });
  }
  // Otherwise unreported format (Rule 11.1.2)
  return formatStateArbitration({
    parties: (d.parties as string) ?? (d.caseName as string) ?? "",
    awardDetails: (d.awardDetails as string) ?? (d.phase as string) ?? "",
    tribunal: (d.tribunal as string) ?? "",
    caseNumber: d.caseNumber as string | undefined,
    date: (d.date as string) ?? "",
    pinpoint: d.pinpoint as string | undefined,
  });
}

/**
 * Dispatches an investor-state arbitration citation (Rules 11.2-11.3).
 * Delegates to formatIcsidCase.
 */
function dispatchArbitralIndividualState(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatIcsidCase({
    caseName: (d.caseTitle as string) ?? (d.caseName as string) ?? (d.title as string) ?? "",
    icsidNumber: (d.icsidNumber as string) ?? (d.caseNumber as string) ?? "",
    awardType: (d.awardType as string) ?? (d.phase as string) ?? "",
    date: (d.date as string) ?? "",
  });
}

/**
 * Dispatches an ICC/international criminal tribunal case citation (Rules 12.1-12.4).
 * Delegates to formatIccCase.
 */
function dispatchIccTribunalCase(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatIccCase({
    caseName: (d.caseTitle as string) ?? (d.caseName as string) ?? (d.title as string) ?? "",
    phase: (d.phase as string) ?? "",
    court: (d.court as string) ?? "ICC",
    chamber: (d.chamber as string) ?? "",
    caseNumber: (d.caseNumber as string) ?? "",
    date: (d.date as string) ?? "",
    pinpoint: d.pinpoint as string | undefined,
  });
}

/**
 * Dispatches a WTO document citation (Rule 13.1.2).
 * Delegates to formatWtoDocument.
 */
function dispatchWtoDocument(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatWtoDocument({
    title: (d.title as string) ?? "",
    documentNumber: (d.documentNumber as string) ?? "",
    date: (d.date as string) ?? "",
  });
}

/**
 * Dispatches a WTO decision citation (Rule 13.1.3).
 * Delegates to formatWtoDecision.
 */
function dispatchWtoDecision(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatWtoDecision({
    documentDescription: (d.documentDescription as string) ?? (d.reportType as string) ?? "Panel Report",
    title: (d.title as string) ?? "",
    documentNumber: (d.documentNumber as string) ?? "",
    date: (d.date as string) ?? "",
    pinpoint: d.pinpoint as string | undefined,
  });
}

/**
 * Dispatches a GATT document citation (Rule 13.2).
 * Delegates to formatGattDocument.
 */
function dispatchGattDocument(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatGattDocument({
    title: (d.title as string) ?? "",
    documentNumber: (d.documentNumber as string) ?? "",
    date: (d.date as string) ?? "",
  });
}

/**
 * Dispatches an EU Official Journal citation (Rule 14.2.1).
 * Delegates to formatEuOfficialJournal.
 */
function dispatchEuOfficialJournal(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatEuOfficialJournal({
    instrumentType: (d.instrumentType as string) ?? "",
    title: (d.title as string) ?? "",
    year: toNumber(d.year, 0),
    ojSeries: (d.ojSeries as string) ?? "",
    page: (d.page as string) ?? "",
  });
}

/**
 * Dispatches an EU court (CJEU) case citation (Rule 14.2.3).
 * Delegates to formatCjeuCase.
 */
function dispatchEuCourt(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatCjeuCase({
    caseName: (d.caseTitle as string) ?? (d.caseName as string) ?? (d.title as string) ?? "",
    caseNumber: (d.caseNumber as string) ?? "",
    year: toNumber(d.year, 0),
    reportSeries: (d.reportSeries as string) ?? "ECR",
    page: (d.page as string) ?? "",
    court: d.court as string | undefined,
  });
}

/**
 * Dispatches an ECHR decision citation (Rules 14.3.1-14.3.3).
 * Delegates to formatEchrCase.
 */
function dispatchEchrDecision(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatEchrCase({
    caseName: (d.caseTitle as string) ?? (d.caseName as string) ?? (d.title as string) ?? "",
    applicationNumber: (d.applicationNumber as string) ?? "",
    chamber: d.chamber as string | undefined,
    reportSeries: d.reportSeries as string | undefined,
    date: (d.date as string) ?? "",
    pinpoint: d.pinpoint as string | undefined,
  });
}

/**
 * Dispatches a supranational decision citation (Rule 14.4).
 * Delegates to formatSupranationalDecision.
 */
function dispatchSupranationalDecision(citation: Citation): FormattedRun[] {
  const d = citation.data;
  const caseName = (d.caseTitle as string) ?? (d.caseName as string) ?? (d.title as string) ?? (d.parties as string) ?? "";
  const court = (d.court as string) ?? (d.tribunal as string) ?? (d.courtTribunal as string) ?? "";
  const caseNumber = (d.caseNumber as string) ?? (d.communicationNumber as string) ?? (d.number as string) ?? "";
  const seriesNo = (d.seriesNumber as string) ?? (d.series as string) ?? "";
  const date = (d.date as string) ?? "";
  const pinpoint = d.pinpoint as string | undefined;

  const runs = formatSupranationalDecision({
    caseName,
    court,
    caseNumber: caseNumber || seriesNo,
    date,
  });
  if (pinpoint) {
    runs.push({ text: ` ${pinpoint}` });
  }
  return runs;
}

/**
 * Dispatches a supranational document citation (Rule 14.5).
 * Delegates to formatSupranationalDocument.
 */
function dispatchSupranationalDocument(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatSupranationalDocument({
    body: (d.body as string) ?? "",
    title: (d.title as string) ?? "",
    documentNumber: (d.documentNumber as string) ?? "",
    date: (d.date as string) ?? "",
  });
}

// ─── Group 7: Foreign Sources ──────────────────────────────────────────────

/**
 * Dispatches any foreign.* source type.
 *
 * Foreign sources are inherently flexible in AGLC4 — they follow the
 * domestic rules of the foreign jurisdiction. Since each foreign
 * jurisdiction has its own formatters (src/engine/rules/v4/foreign/*),
 * but the Citation.data shape varies depending on whether the user
 * entered case, legislation, or other material, we dispatch based on
 * the sub-type field in the data. Falls through to formatGenericCitation
 * when no sub-type is discernible.
 */
function dispatchForeign(citation: Citation): FormattedRun[] {
  // Foreign sources use the generic formatter which already handles
  // Author, Title (italic/quoted as appropriate), Year, etc.
  // This dedicated dispatcher ensures they don't silently lose fields.
  return formatGenericCitation(citation);
}

/**
 * Registry mapping each supported SourceType to its dispatch function.
 * Source types not in this map fall through to the generic formatter.
 */
const SOURCE_DISPATCH: Partial<Record<SourceType, SourceFormatter>> = {
  // ── Domestic Cases ────────────────────────────────────────────────────────
  "case.reported": dispatchReportedCase,
  "case.unreported.mnc": dispatchUnreportedMnc,
  "case.unreported.no_mnc": dispatchUnreportedNoMnc,
  "case.proceeding": dispatchProceeding,
  "case.court_order": dispatchCourtOrder,
  "case.quasi_judicial": dispatchQuasiJudicial,
  "case.arbitration": dispatchArbitration,
  "case.transcript": dispatchTranscript,
  "case.submission": dispatchSubmission,

  // ── Domestic Legislation ──────────────────────────────────────────────────
  "legislation.statute": dispatchStatute,
  "legislation.bill": dispatchBill,
  "legislation.delegated": dispatchDelegatedLegislation,
  "legislation.constitution": dispatchConstitution,
  "legislation.explanatory": dispatchExplanatoryMemorandum,
  "legislation.quasi": dispatchQuasiLegislative,

  // ── Journal Articles (Group 1) ────────────────────────────────────────────
  "journal.article": dispatchJournalArticle,
  "journal.online": dispatchJournalOnline,
  "journal.forthcoming": dispatchJournalForthcoming,

  // ── Books (Group 2) ───────────────────────────────────────────────────────
  book: dispatchBook,
  "book.chapter": dispatchBookChapter,
  "book.translated": dispatchBookTranslated,
  "book.audiobook": dispatchBookAudiobook,

  // ── Reports (Group 3) ─────────────────────────────────────────────────────
  report: dispatchReport,
  "report.parliamentary": dispatchParliamentaryReport,
  "report.royal_commission": dispatchRoyalCommission,
  "report.law_reform": dispatchLawReformReport,
  "report.abs": dispatchAbsMaterial,
  "report.waitangi_tribunal": dispatchWaitangiTribunalReport,

  // ── Other Secondary Sources (Group 4) ─────────────────────────────────────
  research_paper: dispatchResearchPaper,
  "research_paper.parliamentary": dispatchParliamentaryResearchPaper,
  conference_paper: dispatchConferencePaper,
  thesis: dispatchThesis,
  speech: dispatchSpeech,
  press_release: dispatchPressRelease,
  newspaper: dispatchNewspaper,
  correspondence: dispatchCorrespondence,
  interview: dispatchInterview,
  film_tv_media: dispatchFilmTvMedia,
  internet_material: dispatchInternetMaterial,
  social_media: dispatchSocialMedia,
  dictionary: dispatchDictionary,
  legal_encyclopedia: dispatchLegalEncyclopedia,
  looseleaf: dispatchLooseleaf,
  ip_material: dispatchIpMaterial,
  constitutive_document: dispatchConstitutiveDocument,

  // ── Parliamentary (Group 5) ───────────────────────────────────────────────
  hansard: dispatchHansard,
  "submission.government": dispatchSubmissionGovernment,
  "evidence.parliamentary": dispatchParliamentaryEvidence,
  constitutional_convention: dispatchConstitutionalConvention,

  // ── International Materials (Group 6) ─────────────────────────────────────
  "un.document": dispatchUnDocument,
  "un.communication": dispatchUnCommunication,
  "un.yearbook": dispatchUnYearbook,
  "icj.decision": dispatchIcjDecision,
  "icj.pleading": dispatchIcjPleading,
  "arbitral.state_state": dispatchArbitralStateState,
  "arbitral.individual_state": dispatchArbitralIndividualState,
  "icc_tribunal.case": dispatchIccTribunalCase,
  "wto.document": dispatchWtoDocument,
  "wto.decision": dispatchWtoDecision,
  "gatt.document": dispatchGattDocument,
  "eu.official_journal": dispatchEuOfficialJournal,
  "eu.court": dispatchEuCourt,
  "echr.decision": dispatchEchrDecision,
  "supranational.decision": dispatchSupranationalDecision,
  "supranational.document": dispatchSupranationalDocument,

  // ── Foreign Domestic Sources (Group 7) ────────────────────────────────────
  "foreign.canada": dispatchForeign,
  "foreign.china": dispatchForeign,
  "foreign.france": dispatchForeign,
  "foreign.germany": dispatchForeign,
  "foreign.hong_kong": dispatchForeign,
  "foreign.malaysia": dispatchForeign,
  "foreign.new_zealand": dispatchForeign,
  "foreign.singapore": dispatchForeign,
  "foreign.south_africa": dispatchForeign,
  "foreign.uk": dispatchForeign,
  "foreign.usa": dispatchForeign,
  "foreign.other": dispatchForeign,

  // ── Special ───────────────────────────────────────────────────────────────
  treaty: dispatchTreaty,
  genai_output: dispatchGenaiOutput,
  custom: dispatchCustom,
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
      year: toNumber(d.year, 0),
      courtIdentifier: (d.courtIdentifier as string) ?? (d.court as string) ?? "",
      decisionNumber: toNumber(d.decisionNumber, toNumber(d.caseNumber, 0)),
      parallelReport: parallelReport ?? undefined,
      pinpoint: extractNzlsgPinpoint(d),
    });
  }

  // ── Maori Land Court (quasi-judicial with minute book data) ────────────────

  if (st === "case.quasi_judicial" && d.minuteBookAbbrev) {
    return nzlsgFormatMaoriLandCourt({
      caseName: (d.caseName as string) ?? "",
      year: toNumber(d.year, 0),
      blockNumber: toNumber(d.blockNumber, 0),
      minuteBookDistrict: (d.minuteBookDistrict as string) ?? "",
      minuteBookAbbrev: (d.minuteBookAbbrev as string) ?? "",
      page: toNumber(d.page, 0),
      shortBlockNumber: toOptionalNumber(d.shortBlockNumber),
      shortCourtAbbrev: d.shortCourtAbbrev as string | undefined,
      shortPage: toOptionalNumber(d.shortPage),
      pinpoint: extractNzlsgPinpoint(d),
      isAppellateCourt: d.isAppellateCourt as boolean | undefined,
    });
  }

  // ── Waitangi Tribunal Reports ──────────────────────────────────────────────

  if (st === "report" && d.waiNumber !== undefined) {
    return nzlsgFormatWaitangiTribunalReport({
      title: (d.title as string) ?? "",
      waiNumber: toNumber(d.waiNumber, 0),
      year: toNumber(d.year, 0),
      pinpoint: extractNzlsgPinpoint(d),
    });
  }

  // ── Treaty of Waitangi ─────────────────────────────────────────────────────

  if (st === "treaty" && d.treatyOfWaitangi) {
    return nzlsgFormatTreatyOfWaitangi({
      language: (d.language as "english" | "maori") ?? "english",
      article: toOptionalNumber(d.article),
      preamble: d.preamble as boolean | undefined,
    });
  }

  // ── Legislation ────────────────────────────────────────────────────────────

  if (st === "legislation.statute") {
    return nzlsgFormatLegislation({
      title: (d.title as string) ?? "",
      year: toNumber(d.year, 0),
      jurisdiction: d.jurisdiction as string | undefined,
      pinpoint: extractNzlsgPinpoint(d),
    });
  }

  if (st === "legislation.delegated") {
    return nzlsgFormatDelegatedLegislation({
      title: (d.title as string) ?? "",
      year: toNumber(d.year, 0),
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
      volume: toNumber(d.volume, 0),
      page: toNumber(d.page, 0),
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
      year: toNumber(d.year, 0),
      page: toNumber(d.page, 0),
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
      year: toNumber(d.year, 0),
      pinpoint: extractNzlsgPinpoint(d),
    });
  }

  if (st === "journal.article") {
    return nzlsgFormatJournalArticle({
      author: (d.author as string) ??
        formatNzlsgAuthorString(d.authors as Author[] | undefined),
      title: (d.title as string) ?? "",
      year: toNumber(d.year, 0),
      volume: toOptionalNumber(d.volume),
      journal: (d.journal as string) ?? "",
      startPage: toNumber(d.startingPage, toNumber(d.startPage, 0)),
      pinpoint: extractNzlsgPinpoint(d),
    });
  }

  if (st === "report.law_reform" && d.reportType) {
    return nzlsgFormatLawCommission({
      title: (d.title as string) ?? "",
      reportType: (d.reportType as "R" | "SP" | "IP" | "PP") ?? "R",
      reportNumber: toNumber(d.reportNumber, 0),
      year: toNumber(d.year, 0),
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
      year: toNumber(d.year, 0),
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
      year: toNumber(d.year, 0),
      icjReportsPage: toOptionalNumber(d.icjReportsPage),
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
    const ncYear = toOptionalNumber(d.neutralCitationYear);
    const ncCourt = d.neutralCitationCourt as string | undefined;
    const ncNumber = toOptionalNumber(d.neutralCitationNumber);
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
    const year = toNumber(d.year, 0);
    const series = (d.reportSeries as string) ?? "";
    if (series) {
      data.reportCitation = {
        year,
        yearType: (d.yearType as "round" | "square") ?? "square",
        volume: toOptionalNumber(d.volume),
        series,
        startPage: toNumber(d.startingPage, 0),
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
    year: toNumber(d.year, 0),
    yearType: (d.yearType as "round" | "square") ?? "round",
    volume: toOptionalNumber(d.volume),
    reportSeries: (d.reportSeries as string) ?? "",
    startPage: toNumber(d.startingPage, 0),
    courtId: d.courtId as string | undefined,
    pinpoint: extractOscolaPinpoint(d),
    historicalSeries: d.historicalSeries as boolean | undefined,
  };

  // Neutral citation
  const neutralCitation = d.neutralCitation as ScottishNeutralCitation | undefined;
  if (neutralCitation) {
    data.neutralCitation = neutralCitation;
  } else {
    const ncYear = toOptionalNumber(d.neutralCitationYear);
    const ncCourt = d.neutralCitationCourt as string | undefined;
    const ncNumber = toOptionalNumber(d.neutralCitationNumber);
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
    const ncYear = toOptionalNumber(d.neutralCitationYear);
    const ncCourt = d.neutralCitationCourt as string | undefined;
    const ncNumber = toOptionalNumber(d.neutralCitationNumber);
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
      year: toNumber(d.year, 0),
      yearType: (d.yearType as "round" | "square") ?? "square",
      volume: toOptionalNumber(d.volume),
      series: (d.reportSeries as string) ?? "",
      startPage: toNumber(d.startingPage, 0),
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
    const ncYear = toOptionalNumber(d.neutralCitationYear);
    const ncCourt = d.neutralCitationCourt as string | undefined;
    const ncNumber = toOptionalNumber(d.neutralCitationNumber);
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
      year: toNumber(d.year, 0),
      volume: toOptionalNumber(d.volume),
      series: (d.reportSeries as string) as IrishReportSeries,
      page: toNumber(d.startingPage, 0),
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
      year: toNumber(d.year, 0),
      type: (d.instrumentType as "si" | "ssi" | "wsi" | "sr") ?? "si",
      number: toNumber(d.number, 0),
      pinpoint: extractOscolaPinpoint(d),
    });
  }

  const jurisdiction = (d.jurisdiction as string) ?? "";
  if (jurisdiction === "IE" || jurisdiction === "Ireland") {
    if (d.siNumber !== undefined) {
      return oscolaFormatIrishStatutoryInstrument({
        shortTitle: (d.title as string) ?? "",
        year: toNumber(d.year, 0),
        siNumber: toNumber(d.siNumber, 0),
        pinpoint: extractOscolaPinpoint(d),
      });
    }
    return oscolaFormatIrishAct({
      shortTitle: (d.title as string) ?? "",
      year: toNumber(d.year, 0),
      pinpoint: extractOscolaPinpoint(d),
    });
  }

  return formatOscolaPrimaryLegislation({
    title: (d.title as string) ?? "",
    year: toNumber(d.year, 0),
    type: (d.ukLegislationType as "uk" | "asp" | "anaw" | "asc" | "ni") ?? "uk",
    number: toOptionalNumber(d.number),
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
    year: toNumber(d.year, 0),
    type: (d.instrumentType as "si" | "ssi" | "wsi" | "sr") ?? "si",
    number: toNumber(d.number, 0),
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
    volume: toNumber(d.volume, 0),
    column: toNumber(d.column, 0),
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
      year: toNumber(d.year, 0),
      pinpoint: extractOscolaPinpoint(d),
    });
  }

  if (reportType === "law_commission" || d.reportNumber !== undefined) {
    return formatOscolaLawCommission({
      title: (d.title as string) ?? "",
      reportNumber: toNumber(d.reportNumber, 0),
      year: toNumber(d.year, 0),
      pinpoint: extractOscolaPinpoint(d),
    });
  }

  return formatOscolaParliamentaryReport({
    committee: (d.committee as string) ?? "",
    title: (d.title as string) ?? "",
    session: d.session as string | undefined,
    paperNumber: d.paperNumber as string | undefined,
    year: toNumber(d.year, 0),
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
    year: toNumber(d.year, 0),
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
    year: toOptionalNumber(d.year),
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
      year: toOptionalNumber(d.year),
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
    seriesVolume: toOptionalNumber(d.seriesVolume),
    startingPage: toOptionalNumber(d.startingPage),
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
    year: toNumber(d.year, 0),
    reportSeries: d.reportSeries as string | undefined,
    page: toOptionalNumber(d.page),
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

  // Author(s) — structured array or plain string
  const authors = d.authors as Author[] | undefined;
  const authorString = d.author as string | undefined;
  const institutionalAuthor = d.institutionalAuthor as string | undefined;
  const speaker = d.speaker as string | undefined;
  const witness = d.witness as string | undefined;
  const plainAuthor = authorString ?? institutionalAuthor ?? speaker ?? witness;

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
  } else if (plainAuthor) {
    runs.push({ text: plainAuthor });
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
  const year = toOptionalNumber(d.year);
  if (year !== undefined) {
    runs.push({ text: ` (${year})` });
  }

  // Jurisdiction (legislation, cases)
  const jurisdiction = d.jurisdiction as string | undefined;
  if (jurisdiction) {
    runs.push({ text: ` (${jurisdiction})` });
  }

  // Volume
  const volume = toOptionalNumber(d.volume);
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
  const startingPage = toOptionalNumber(d.startingPage);
  if (startingPage !== undefined) {
    runs.push({ text: ` ${startingPage}` });
  }

  // Pinpoint
  const pinpoint = normalisePinpoint(d.pinpoint);
  if (pinpoint) {
    runs.push({ text: `, ${pinpoint.value}` });
  }

  // Report/document number
  const reportNumber = d.reportNumber as string | undefined;
  const number = d.number as string | undefined;
  const docNumber = reportNumber ?? number;
  if (docNumber) {
    runs.push({ text: `, ${docNumber}` });
  }

  // Date (for sources that use date instead of year)
  const date = d.date as string | undefined;
  if (date && !year) {
    runs.push({ text: ` (${date})` });
  }

  // Body / institution / issuing body
  const body = d.body as string | undefined;
  const institution = d.institution as string | undefined;
  const issuingBody = d.issuingBody as string | undefined;
  const org = body ?? institution ?? issuingBody;
  if (org && !runs.some((r) => r.text.includes(org))) {
    runs.push({ text: ` (${org})` });
  }

  // URL
  const url = d.url as string | undefined;
  if (url) {
    runs.push({ text: ` <${url}>` });
  }

  // Additional free-text fields (from generic form or any form with extra data)
  const additional = d.additional as string | undefined;
  if (additional) {
    if (runs.length > 0) runs.push({ text: ", " });
    runs.push({ text: additional });
  }

  return runs;
}

// ─── Signal & Commentary Wrapper (SIGNAL-001) ───────────────────────────────

/**
 * Wraps citation runs with introductory signal and commentary text per
 * AGLC4 Rule 1.2.
 *
 * Order: [commentaryBefore] [signal] [citation runs] [commentaryAfter]
 *
 * - The signal is rendered in italics with a trailing space.
 * - commentaryBefore is plain text with a trailing space.
 * - commentaryAfter is plain text with a leading space, inserted before
 *   closing punctuation.
 *
 * @param runs - The base citation runs (before closing punctuation).
 * @param citation - The citation containing optional signal/commentary fields.
 * @returns A new array of FormattedRun with signal/commentary prepended/appended.
 */
export function applySignalAndCommentary(
  runs: FormattedRun[],
  citation: Citation,
): FormattedRun[] {
  const { signal, commentaryBefore, commentaryAfter } = citation;

  // If nothing to add, return runs unchanged
  if (!signal && !commentaryBefore && !commentaryAfter) {
    return runs;
  }

  const result: FormattedRun[] = [];

  // Prepend commentaryBefore (plain text)
  if (commentaryBefore && commentaryBefore.trim()) {
    result.push({ text: commentaryBefore.trim() + " " });
  }

  // Prepend signal (roman per Rule 1.2)
  if (signal) {
    result.push({ text: signal + " ", italic: false });
  }

  // Append the citation runs
  result.push(...runs);

  // Append commentaryAfter (plain text)
  if (commentaryAfter && commentaryAfter.trim()) {
    result.push({ text: " " + commentaryAfter.trim() });
  }

  return result;
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
      return nzlsgSubsequentRuns;
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
      return subsequentRuns;
    }
    // resolver returned null — render full citation (falls through below)
  }

  // ── Helper: append short title introduction and abbreviation definition
  //    after first citations (Rules 1.4.4 and 1.4.5). These are appended
  //    before closing punctuation so the full stop comes last.
  const isFirstCitation = !context || context.isFirstCitation;
  const appendFirstCitationSuffixes = (runs: FormattedRun[]): FormattedRun[] => {
    if (!isFirstCitation) return runs;
    let result = runs;

    // AUDIT2-015: Short title introduction (Rule 1.4.4)
    // Only append if the short title is genuinely shorter than the full
    // citation text — no point adding ('Watt v R') when the case name
    // is already "Watt v R".
    if (citation.shortTitle) {
      const fullText = result.map((r) => r.text).join("").toLowerCase().trim();
      const shortLower = citation.shortTitle.toLowerCase().trim();
      const isRedundant = fullText.startsWith(shortLower) || fullText.includes(shortLower);
      if (!isRedundant) {
        const intro = formatShortTitleIntroduction(
          citation.shortTitle,
          citation.sourceType,
        );
        result = [...result, { text: " " }, ...intro];
      }
    }

    // AUDIT2-016: Abbreviation definition (Rule 1.4.5)
    const abbreviation = citation.data.abbreviation as string | undefined;
    if (abbreviation && abbreviation !== citation.shortTitle) {
      const abbrevRuns = formatAbbreviationDefinition(abbreviation);
      result = [...result, { text: " " }, ...abbrevRuns];
    }

    return result;
  };

  // ── OSCOLA full citation dispatch (OSC-ENH-001) ─────────────────────────
  // When the standard is OSCOLA, try OSCOLA-specific formatters first.
  // Falls through to the generic AGLC4 dispatch / generic formatter if
  // no OSCOLA formatter handles this source type.
  if (isOscolaStandard(standardConfig)) {
    const oscolaFormatter = OSCOLA_DISPATCH[citation.sourceType];
    if (oscolaFormatter) {
      let runs = oscolaFormatter(citation, standardConfig);
      runs = appendFirstCitationSuffixes(runs);
      return applySignalAndCommentary(runs, citation);
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
      const withSuffixes = appendFirstCitationSuffixes(nzlsgRuns);
      return applySignalAndCommentary(withSuffixes, citation);
    }
  }

  // Dispatch to the source-type-specific formatter, or fallback to generic.
  const dispatcher = SOURCE_DISPATCH[citation.sourceType];
  let runs = dispatcher
    ? dispatcher(citation, standardConfig)
    : formatGenericCitation(citation);
  runs = appendFirstCitationSuffixes(runs);

  return applySignalAndCommentary(runs, citation);
}

// ─── Preview Helper ──────────────────────────────────────────────────────────

/**
 * Formats a citation in "full first citation" mode for the Insert Citation
 * preview panel. No subsequent reference resolution is applied.
 *
 * @param citation - The citation to preview.
 * @returns An array of FormattedRun objects representing the formatted citation.
 */
/**
 * Ensures the last run in the array ends with closing punctuation (. ! ?).
 * Used by getFormattedPreview for UI display — the refresher handles this
 * for actual footnotes, so formatCitation does NOT include it.
 */
function ensurePreviewClosingPunctuation(runs: FormattedRun[]): FormattedRun[] {
  if (runs.length === 0) return runs;
  const last = runs[runs.length - 1];
  const trimmed = last.text.trimEnd();
  if (trimmed.endsWith(".") || trimmed.endsWith("!") || trimmed.endsWith("?")) {
    return runs;
  }
  return [...runs.slice(0, -1), { ...last, text: last.text + "." }];
}

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
      return ensurePreviewClosingPunctuation(applySignalAndCommentary(runs, citation));
    }
  }

  // NZLSG-ENH-001: Try NZLSG-specific formatters first when standard is NZLSG
  if (isNzlsgStandard(standardConfig.standardId)) {
    const nzlsgRuns = dispatchNzlsg(citation);
    if (nzlsgRuns !== null) {
      return ensurePreviewClosingPunctuation(applySignalAndCommentary(nzlsgRuns, citation));
    }
  }

  const dispatcher = SOURCE_DISPATCH[citation.sourceType];
  const runs = dispatcher
    ? dispatcher(citation, standardConfig)
    : formatGenericCitation(citation);

  return ensurePreviewClosingPunctuation(applySignalAndCommentary(runs, citation));
}
