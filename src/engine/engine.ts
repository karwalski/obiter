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

import type { Citation, Pinpoint, SourceType, Author } from "../types/citation";
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
  type JudicialOfficerRef,
  type TranscriptPinpoint,
} from "./rules/v4/domestic/cases-supplementary";
import {
  formatStatute,
  formatBill,
  formatLegislationPinpoint,
  formatLegislativeDefinition,
} from "./rules/v4/domestic/legislation";
import {
  formatDelegatedLegislation,
  formatCommonwealthConstitution,
  formatStateConstitution,
  formatExplanatoryMemorandum,
  formatGazette,
  formatQuasiLegislative,
  formatPracticeDirection,
  formatLegislativeHistory,
  type LegislativeHistory,
} from "./rules/v4/domestic/legislation-supplementary";
import {
  formatJournalArticle,
  formatJournalArticlePart,
  formatOnlineJournalArticle,
  formatForthcomingArticle,
} from "./rules/v4/secondary/journals";
import {
  formatBook,
  formatMultiVolumeBook,
  formatBookChapter,
  formatTranslatedBook,
  formatForthcomingBook,
  formatAudiobook,
} from "./rules/v4/secondary/books";
import { formatTreaty, formatMou } from "./rules/v4/international/treaties";
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
  formatEditorial,
  formatFilm,
  formatTvSeries,
  formatPodcast,
  formatInternetMaterial,
  formatSocialMedia,
} from "./rules/v4/secondary/other-media";
import {
  formatUnCharter,
  formatUnDocument,
  formatUnCommunication,
  formatUnSubmission,
  formatUnYearbook,
} from "./rules/v4/international/un";
import {
  formatIcjDecision,
  formatIcjPleading,
  formatIcjUnreported,
} from "./rules/v4/international/icj";
import {
  formatStateArbitrationReported,
  formatStateArbitration,
  formatIcsidCase,
} from "./rules/v4/international/arbitral";
import { formatIccCase, formatIccCaseReported } from "./rules/v4/international/icc-tribunals";
import {
  formatWtoDocument,
  formatWtoDecision,
  formatGattDocument,
  formatGattPanelReport,
} from "./rules/v4/international/economic";
import {
  formatEuOfficialJournal,
  formatCjeuCase,
  formatCjeuUnreportedCase,
  formatEchrCase,
  formatEchrReportedCase,
  formatSupranationalDecision,
  formatSupranationalDocument,
} from "./rules/v4/international/supranational";
import * as foreignCanada from "./rules/v4/foreign/canada";
import * as foreignChina from "./rules/v4/foreign/china";
import * as foreignFrance from "./rules/v4/foreign/france";
import * as foreignGermany from "./rules/v4/foreign/germany";
import * as foreignHongKong from "./rules/v4/foreign/hong-kong";
import * as foreignMalaysia from "./rules/v4/foreign/malaysia";
import * as foreignNewZealand from "./rules/v4/foreign/new-zealand";
import * as foreignOther from "./rules/v4/foreign/other";
import * as foreignSingapore from "./rules/v4/foreign/singapore";
import * as foreignSouthAfrica from "./rules/v4/foreign/south-africa";
import * as foreignUk from "./rules/v4/foreign/uk";
import * as foreignUsa from "./rules/v4/foreign/usa";
import {
  resolveSubsequentReference,
  formatShortTitleIntroduction,
  formatAbbreviationDefinition,
  type SubsequentReferenceContext,
} from "./resolver";
import { shouldItaliciseTitle, shouldQuoteTitle } from "./rules/v4/general/italicisation";
import type { CitationConfig } from "./standards/types";
import { getStandardConfig } from "./standards";
import { formatLinkingPhrase } from "./rules/v4/general/signals";

// ─── OSCOLA Formatter Imports (OSC-ENH-001) ─────────────────────────────────

import { formatOscolaCase } from "./rules/oscola/cases";
import type {
  OscolaCaseData,
  OscolaNeutralCitation,
  OscolaReportCitation,
} from "./rules/oscola/cases";
import { formatOscolaScottishCase } from "./rules/oscola/cases-scotland";
import type {
  OscolaScottishCaseData,
  ScottishNeutralCitation,
} from "./rules/oscola/cases-scotland";
import { SCOTTISH_COURT_IDS } from "./rules/oscola/cases-scotland";
import { formatOscolaNICase } from "./rules/oscola/cases-ni";
import type {
  OscolaNICaseData,
  NINeutralCitation,
  NIReportCitation,
} from "./rules/oscola/cases-ni";
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
 * Returns the first candidate that is a non-empty string, or "".
 *
 * Unlike the `??` operator, this treats an empty or whitespace-only string as
 * absent, so a stale "" left in `formData` (e.g. when switching source types)
 * does not defeat a fallback to the next candidate field. Use for author/body
 * fields that accept several alternative data keys.
 */
function pickString(...candidates: unknown[]): string {
  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 0) return c;
  }
  return "";
}

/**
 * Safely coerce a data field to a string. Prevents [object Object] in output
 * when the AI parser returns an array or structured object instead of a string.
 * For author arrays, extracts the first author's name.
 */
function toStr(raw: unknown): string {
  if (raw === undefined || raw === null) return "";
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0];
    if (typeof first === "string") return first;
    if (typeof first === "object" && first !== null) {
      const a = first as { givenNames?: string; surname?: string; name?: string };
      if (a.surname) return a.givenNames ? `${a.givenNames} ${a.surname}` : a.surname;
      if (a.name) return a.name;
    }
    return String(first);
  }
  if (typeof raw === "object") {
    const obj = raw as { name?: string; surname?: string; givenNames?: string };
    if (obj.name) return obj.name;
    if (obj.surname) return obj.givenNames ? `${obj.givenNames} ${obj.surname}` : obj.surname;
  }
  return String(raw);
}

/**
 * Safely coerce a data field to boolean. Handles XML round-trip where
 * booleans become strings ("true"/"false"). The string "false" is truthy
 * in JS which causes incorrect behaviour if used directly.
 */
function toBool(raw: unknown): boolean {
  if (raw === true || raw === "true") return true;
  return false;
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
    (d.separator as string) ?? "v"
  );

  // Rule 2.2.7: parallel citations are never used for Australian cases in
  // AGLC academic writing — only court mode passes them through (ex 80).
  const parallelCitations =
    config?.writingMode === "court"
      ? (d.parallelCitations as
          | {
              yearType: "round" | "square";
              year: number;
              volume?: number;
              reportSeries: string;
              startingPage: number;
            }[]
          | undefined)
      : undefined;

  // Rule 2.2.4: a unique reference (eg '¶93-198') stands in for the
  // starting page for series that use one — pass it through as a string
  // rather than coercing it to 0 (exs 67, 75).
  const startingPage =
    typeof d.startingPage === "string" && !/^\d+$/.test(d.startingPage.trim())
      ? d.startingPage.trim()
      : toNumber(d.startingPage, 0);

  // Rules 2.4.1–2.4.5: judicial officers are formatted first and passed
  // into formatReportedCase so they render after the pinpoint and BEFORE
  // the court parenthetical (Rule 2.2.6, ex 79).
  const judicialOfficers = d.judicialOfficers as JudicialOfficerRef[] | undefined;
  const officerRuns =
    judicialOfficers && judicialOfficers.length > 0
      ? formatJudicialOfficers(judicialOfficers)
      : undefined;
  const joRuns = officerRuns && officerRuns.length > 0 ? officerRuns : undefined;

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
        startingPage,
        pinpoint: normalisePinpoint(d.pinpoint),
        courtId: d.courtId as string | undefined,
        pinpointStyle: config?.pinpointStyle,
        judicialOfficers: joRuns,
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
    startingPage,
    pinpoint: normalisePinpoint(d.pinpoint),
    courtId: d.courtId as string | undefined,
    parallelCitations,
    pinpointStyle: config?.pinpointStyle,
    judicialOfficers: joRuns,
  });

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
  const statuteRuns = formatStatute({
    title: (d.title as string) ?? "",
    year: toNumber(d.year, 0),
    jurisdiction: (d.jurisdiction as string) ?? "",
    number: d.number as string | undefined,
  });

  const pinpoint = normalisePinpoint(d.pinpoint);

  // Rule 3.8: opt-in legislative-history tail (DECISION-008 hybrid). The
  // formatter is do-no-harm: incomplete input returns the lead unchanged.
  const history = d.legislativeHistory as LegislativeHistory | undefined;

  // Rule 3.1.6: definitions — '«Statute» s «Section» (definition of «Term»)'.
  // The stored pinpoint supplies the section locator; a portion flag marks
  // verbatim locators like 'Dictionary pt 1' (ex 25).
  const definedTerm = toStr(d.definedTerm);
  if (definedTerm && pinpoint) {
    const pinpointType = toBool(d.definitionInPortion) ? "portion" : pinpoint.type;
    const runs = formatLegislativeDefinition(
      statuteRuns,
      pinpoint.value,
      definedTerm,
      pinpointType,
      toStr(d.definitionParagraph) || undefined
    );
    return history ? formatLegislativeHistory(runs, history) : runs;
  }

  // Rule 3.1.4: Append legislation pinpoint after jurisdiction
  const runs = statuteRuns;
  if (pinpoint) {
    runs.push({ text: " " });
    runs.push(...formatLegislationPinpoint(pinpoint));
  }

  return history ? formatLegislativeHistory(runs, history) : runs;
}

/**
 * Dispatches a journal article citation (Rule 5).
 */
function dispatchJournalArticle(citation: Citation): FormattedRun[] {
  const d = citation.data;
  const core = {
    authors: (d.authors as Author[]) ?? [],
    title: (d.title as string) ?? "",
    // Rule 5.3: string years admit spans for year-organised journals
    // (eg '1992–93'); the formatter accepts both shapes.
    year: toStr(d.year) || toNumber(d.year, 0),
    volume: toOptionalNumber(d.volume),
    issue: d.issue as string | undefined,
    journal: (d.journal as string) ?? "",
    // Rule 5.3: explicit override; when absent the formatter derives
    // year-organised from the missing volume number.
    yearOrganised: d.yearOrganised === undefined ? undefined : toBool(d.yearOrganised),
    startingPage: toNumber(d.startingPage, 0),
    pinpoint: normalisePinpoint(d.pinpoint),
  };

  // Rule 5.8: multi-part articles take '(Pt N)' between title and year
  const partNumber = toOptionalNumber(d.partNumber);
  if (partNumber !== undefined) {
    return formatJournalArticlePart({ ...core, partNumber });
  }

  return formatJournalArticle(core);
}

/**
 * Dispatches a book citation (Rule 6).
 */
function dispatchBook(citation: Citation, config?: CitationConfig): FormattedRun[] {
  const d = citation.data;
  const base = {
    authors: (d.authors as Author[]) ?? [],
    title: (d.title as string) ?? "",
    publisher: toStr(d.publisher) || undefined,
    edition: toOptionalNumber(d.edition),
    // Rule 6.3.3: revised editions render a bare 'rev ed'
    revised: toBool(d.revised),
    // Rule 6.3.4: string years admit spans (eg '1984–88', '1975–')
    year: toStr(d.year) || toNumber(d.year, 0),
    // Rule 6.6.2: editors of an authored book
    editors: d.editors as Author[] | undefined,
    pinpoint: normalisePinpoint(d.pinpoint),
    editionAbbreviation: config?.editionAbbreviation as "ed" | "edn" | undefined,
  };

  // Rule 6.8: forthcoming books — 'forthcoming' replaces the year
  if (toBool(d.forthcoming)) {
    return formatForthcomingBook({
      authors: base.authors,
      title: base.title,
      publisher: base.publisher,
      edition: base.edition,
      editionAbbreviation: base.editionAbbreviation,
    });
  }

  // Rule 6.5: multi-volume books take 'vol N' (or 'bk N') after the
  // publication details
  const volume = toStr(d.volume).trim();
  if (volume) {
    return formatMultiVolumeBook({
      ...base,
      volume: /^\d+$/.test(volume) ? Number(volume) : volume,
      volumeLabel: d.volumeLabel === "bk" ? "bk" : "vol",
    });
  }

  return formatBook(base);
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
    parties = (d.parties as string)
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
  }

  return formatTreaty({
    title: (d.title as string) ?? "",
    parties,
    openedDate: (d.openedDate as string) ?? (d.adoptedDate as string) ?? undefined,
    signedDate: d.signedDate as string | undefined,
    treatySeries: toStr(d.treatySeries) || toStr(d.conventionSeries) || "",
    seriesVolume: toOptionalNumber(d.seriesVolume ?? d.volume ?? d.seriesNumber),
    startingPage: toOptionalNumber(d.startingPage),
    entryIntoForceDate: (d.entryIntoForceDate as string) || undefined,
    notYetInForce: toBool(d.notYetInForce),
    pinpoint: normalisePinpoint(d.pinpoint),
  });
}

/**
 * Dispatches a Memorandum of Understanding citation (Rule 8.6).
 *
 * AGLC4 Rule 8.6: MOUs have a specific format:
 * Title, Parties' Names, signed Date (Memorandum of Understanding) pinpoint
 */
function dispatchTreatyMou(citation: Citation): FormattedRun[] {
  const d = citation.data;
  const title = (d.title as string) ?? "";

  // Empty-data fallback (nothing meaningful to format)
  if (!title) {
    return [{ text: "Memorandum of Understanding" }];
  }

  // Rule 8.6: the formatter handles en-dash party joining (Rule 8.2),
  // descriptor suppression when the title already says 'Memorandum of
  // Understanding', designator pinpoints and the trailing URL.
  return formatMou({
    title,
    parties: d.parties as string[] | string | undefined,
    signedDate: toStr(d.signedDate) || undefined,
    treatySeries: toStr(d.treatySeries) || undefined,
    pinpoint: normalisePinpoint(d.pinpoint),
    url: toStr(d.url) || undefined,
  });
}

/**
 * Dispatches an unreported case with MNC (Rule 2.3.1).
 * Delegates to formatUnreportedMnc from cases-unreported.ts.
 */
function dispatchUnreportedMnc(citation: Citation): FormattedRun[] {
  const d = citation.data;
  const caseName = formatCaseName(
    (d.party1 as string) ?? (d.caseName as string) ?? "",
    (d.party2 as string) ?? "",
    d.separator as string | undefined
  );
  return formatUnreportedMnc({
    caseName,
    year: toNumber(d.year, 0),
    // Accept any of the aliases that callers (parser, corpus, edit form,
    // older docs) may have stored.
    courtIdentifier:
      (d.court as string) ?? (d.courtIdentifier as string) ?? (d.courtId as string) ?? "",
    caseNumber: toNumber(d.caseNumber ?? d.mnc ?? d.judgmentNumber, 0),
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
    d.separator as string | undefined
  );
  return formatUnreportedNoMnc({
    caseName,
    courtIdentifier: (d.courtIdentifier as string) ?? (d.court as string) ?? "",
    fullDate: (d.fullDate as string) ?? (d.date as string) ?? "",
    // Rule 2.3.2: judge(s) are a mandatory template element (ex 84)
    judges: pickString(d.judges, d.judicialOfficer, d.judicialOfficers) || undefined,
    pinpoint: normalisePinpoint(d.pinpoint),
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
    d.separator as string | undefined
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
    d.separator as string | undefined
  );
  return formatCourtOrder({
    caseName,
    court: (d.court as string) ?? "",
    orderDate: (d.orderDate as string) ?? (d.date as string) ?? "",
    // Rule 2.3.4: 'Order of «officers» in «Case Name» …' (exs 88–9)
    judicialOfficers: pickString(d.judicialOfficers, d.judges) || undefined,
    proceedingNumber: toStr(d.proceedingNumber) || undefined,
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
    // Rule 2.6.1: comma-separated pinpoint after the starting page (ex 109)
    pinpoint: normalisePinpoint(d.pinpoint),
    // Rule 2.6.1: party separator as it appears on the decision
    separator: toStr(d.separator) || undefined,
  });
}

/**
 * Dispatches an arbitration citation (Rule 2.6.2).
 * Delegates to formatArbitration from cases-supplementary.ts.
 */
function dispatchArbitration(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatArbitration({
    parties: toStr(d.parties) || undefined,
    // Rule 2.6.2 template fields; the legacy arbitrationType/awardDetails
    // pair still renders stored citations via the formatter's legacy path.
    awardDescription: toStr(d.awardDescription) || undefined,
    forum: toStr(d.forum) || undefined,
    caseNumber: toStr(d.caseNumber) || undefined,
    date: toStr(d.date) || undefined,
    pinpoint: normalisePinpoint(d.pinpoint)?.value,
    reportedIn: d.reportedIn as FormattedRun[] | undefined,
    arbitrationType: toStr(d.arbitrationType) || undefined,
    awardDetails: toStr(d.awardDetails) || undefined,
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
    d.separator as string | undefined
  );

  // Rules 2.7.1–2.7.2: pinpoint/speaker pairs — accept a stored array or a
  // single pinpoint (+ optional speaker) from the form
  let pinpoints: TranscriptPinpoint[] | undefined;
  if (Array.isArray(d.pinpoints) && d.pinpoints.length > 0) {
    pinpoints = d.pinpoints as TranscriptPinpoint[];
  } else {
    const single = normalisePinpoint(d.pinpoint)?.value;
    if (single) {
      pinpoints = [{ value: single, speaker: toStr(d.speaker) || undefined }];
    }
  }

  // Rule 2.7.2: HCA transcripts use a special format with [Year] HCATrans Number
  if (d.hcaTranscript || (d.court as string) === "HCATrans") {
    return formatHcaTranscript({
      caseName,
      year: toNumber(d.year, 0),
      number: toNumber(d.number, toNumber(d.caseNumber, 0)),
      pinpoints,
    });
  }

  // Rule 2.7.1: General transcript format
  return formatTranscript({
    caseName,
    court: (d.court as string) ?? "",
    proceedingNumber: (d.proceedingNumber as string) ?? "",
    // Rule 2.7.1: all judicial officers hearing the matter (exs 116–17)
    judicialOfficers: pickString(d.judicialOfficers, d.judges) || undefined,
    date: (d.date as string) ?? "",
    pinpoints,
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
    d.separator as string | undefined
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
  const platform = platformRaw === "__other__" ? ((d.platformCustom as string) ?? "") : platformRaw;
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
 * Dispatches an explanatory note. Free-text content inserted as-is in roman.
 * Unlike custom citations, explanatory notes have no ibid/short-ref treatment,
 * are excluded from bibliographies, and use sentence separators (". ") when
 * mixed with citations in the same footnote.
 */
function dispatchExplanatoryNote(citation: Citation): FormattedRun[] {
  const text = toStr(citation.data.noteText) || toStr(citation.data.customText);
  if (!text.trim()) return [{ text: "[Explanatory note]" }];
  return [{ text: text.trim() }];
}

/**
 * Returns true if the citation is an explanatory note (not a real citation).
 * Used by the resolver, refresher, and bibliography to skip these.
 */
export function isExplanatoryNote(citation: Citation): boolean {
  return citation.sourceType === "explanatory_note";
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

  // Rule 3.8: opt-in legislative-history tail (DECISION-008 hybrid)
  const history = d.legislativeHistory as LegislativeHistory | undefined;
  return history ? formatLegislativeHistory(runs, history) : runs;
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
 * Sanctioned names under which the Commonwealth Constitution itself may be
 * cited (Rule 3.6). Any other title — eg the territory self-government
 * Acts of exs 50–51 — is cited as an ordinary statute even when the
 * jurisdiction is Cth.
 */
const COMMONWEALTH_CONSTITUTION_ALIASES: ReadonlySet<string> = new Set([
  "australian constitution",
  "commonwealth constitution",
  "constitution",
  "commonwealth of australia constitution act",
]);

/**
 * Dispatches a constitution citation (AUDIT2-011, Rule 3.6).
 *
 * Collapses to formatCommonwealthConstitution only when the citation is
 * actually the Commonwealth Constitution (no meaningful title, or a
 * sanctioned alias). Everything else — state constitutions AND
 * Commonwealth self-government Acts (exs 50–51) — renders in ordinary
 * statute form via formatStateConstitution.
 */
function dispatchConstitution(citation: Citation): FormattedRun[] {
  const d = citation.data;
  const jurisdiction = (d.jurisdiction as string) ?? "Cth";
  const pinpoint = normalisePinpoint(d.pinpoint);
  const title = toStr(d.title).trim();

  const isCommonwealthConstitution =
    jurisdiction === "Cth" &&
    (!title || COMMONWEALTH_CONSTITUTION_ALIASES.has(title.toLowerCase()));
  if (isCommonwealthConstitution) {
    return formatCommonwealthConstitution(pinpoint);
  }

  return formatStateConstitution({
    title: title || "Constitution Act",
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
      // Starting page may be non-numeric — pass strings through (ex 71)
      page: typeof d.page === "number" ? d.page : toStr(d.page) || undefined,
      pinpoint: normalisePinpoint(d.pinpoint)?.value,
      noticeAuthor: toStr(d.noticeAuthor) || undefined,
      noticeTitle: toStr(d.noticeTitle) || undefined,
    });
  }

  // Rule 3.9.4: practice directions/notes have their own template — route
  // them when the court + designation fields are present (exs 78–81)
  if (toStr(d.court) && toStr(d.designation)) {
    return formatPracticeDirection({
      court: toStr(d.court),
      designation: toStr(d.designation),
      identifier: toStr(d.identifier) || toStr(d.number) || undefined,
      title: toStr(d.title),
      reportCitation: toStr(d.reportCitation) || undefined,
      date: toStr(d.date) || undefined,
      pinpoint: normalisePinpoint(d.pinpoint),
    });
  }

  // Otherwise format as quasi-legislative material (Rules 3.9.2-3.9.3)
  return formatQuasiLegislative({
    issuingBody: (d.issuingBody as string) ?? "",
    // Rule 3.9.2: '(Cth)' after a department/officer name (ex 74)
    bodyJurisdiction: toStr(d.bodyJurisdiction) || undefined,
    title: toStr(d.title) || undefined,
    // Legacy alias: used as the title only when `title` is absent
    documentType: toStr(d.documentType) || undefined,
    number: toStr(d.number) || undefined,
    date: toStr(d.date) || undefined,
    // Rule 3.9.3: '(at Date)' form for unnumbered non-government material
    atDate: toStr(d.atDate) || undefined,
    pinpoint: normalisePinpoint(d.pinpoint),
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
    year: toStr(d.year) || toNumber(d.year, 0),
    volume: toOptionalNumber(d.volume),
    issue: d.issue as string | undefined,
    journal: (d.journal as string) ?? "",
    yearOrganised: d.yearOrganised === undefined ? undefined : toBool(d.yearOrganised),
    articleNumber: d.articleNumber as string | undefined,
    startingPage: toOptionalNumber(d.startingPage),
    pinpoint: normalisePinpoint(d.pinpoint),
    url: toStr(d.url) || undefined,
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
    // Rule 5.11: include as much of year/volume/issue as is available
    year: toStr(d.year) || undefined,
    volume: toOptionalNumber(d.volume),
    issue: d.issue as string | undefined,
    yearOrganised: d.yearOrganised === undefined ? undefined : toBool(d.yearOrganised),
    // '(advance)' instead of '(forthcoming)'
    advance: toBool(d.advance),
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
    publisher: toStr(d.publisher) || undefined,
    edition: toOptionalNumber(d.edition),
    revised: toBool(d.revised),
    year: toStr(d.year) || toNumber(d.year, 0),
    translator: (d.translator as string) ?? "",
    editors: d.editors as Author[] | undefined,
    // Rule 6.7: optional '[trans of: «Original Title» (first published «Year»)]'
    originalTitle: toStr(d.originalTitle) || undefined,
    originalYear: toStr(d.originalYear) || undefined,
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
  // Rule 6.9: the narrator is not an AGLC4 element and is no longer passed
  return formatAudiobook({
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
 * Dispatches an ebook citation (UI convenience type).
 *
 * AGLC4 has no ebook rule (Rule 6.8 covers forthcoming books). Per
 * DECISION-019, ebooks render as ordinary books under rules 6.1–6.5, with
 * `<URL>` appended where a URL is provided. The `book.ebook` sourceType is
 * retained as a UI convenience only; the former invented `[Platform]`
 * bracket is not emitted. See docs/decisions.md.
 */
function dispatchBookEbook(citation: Citation, config?: CitationConfig): FormattedRun[] {
  const d = citation.data;
  // Rules 6.1–6.5: format exactly like a regular book
  const runs = formatBook({
    authors: (d.authors as Author[]) ?? [],
    title: (d.title as string) ?? "",
    publisher: (d.publisher as string) ?? "",
    edition: toOptionalNumber(d.edition),
    year: toNumber(d.year, 0),
    pinpoint: normalisePinpoint(d.pinpoint),
    editionAbbreviation: config?.editionAbbreviation as "ed" | "edn" | undefined,
  });

  // Append the URL where provided (matching other secondary types)
  const url = (d.url as string) ?? "";
  if (url) {
    runs.push({ text: ` <${url}>` });
  }

  return runs;
}

// ─── Group 3: Reports ──────────────────────────────────────────────────────

/**
 * Dispatches a general report citation (Rule 7.1.1).
 * Delegates to formatReport.
 */
function dispatchReport(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatReport({
    authors: Array.isArray(d.authors) ? (d.authors as Author[]) : undefined,
    body: toStr(d.body) || toStr(d.institutionalAuthor) || toStr(d.author) || undefined,
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
    // Rule 7.1.2: committee first, then the legislature (ex 4)
    legislature: toStr(d.legislature) || toStr(d.jurisdiction) || undefined,
    committee: (d.committee as string) ?? "",
    title: (d.title as string) ?? "",
    documentType: d.documentType as string | undefined,
    number: d.number as string | undefined,
    date: (d.date as string) ?? String(toOptionalNumber(d.year) ?? ""),
    pinpoint: normalisePinpoint(d.pinpoint),
  });
}

/**
 * Dispatches a royal commission report citation (Rule 7.1.3).
 * Delegates to formatRoyalCommissionReport.
 */
function dispatchRoyalCommission(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatRoyalCommissionReport({
    title: (d.title as string) ?? "",
    // Rule 7.1.3: royal commission reports are cited with NO author — the
    // italic title IS the commission name; commissionName is only a title
    // fallback and must not be synthesised from author fields.
    commissionName: toStr(d.commissionName) || undefined,
    documentType: toStr(d.documentType) || toStr(d.reportType) || undefined,
    date: toStr(d.date) || undefined,
    year: toNumber(d.year, 0),
    volume: toOptionalNumber(d.volume),
    pinpoint: normalisePinpoint(d.pinpoint),
  });
}

/**
 * Dispatches a law reform commission report citation (Rule 7.1.4).
 * Delegates to formatLawReformReport.
 */
function dispatchLawReformReport(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatLawReformReport({
    commissionName: pickString(d.commissionName, d.body, d.institutionalAuthor, d.author),
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
    // Rule 7.2.1: number as printed; omitted when the paper is unnumbered
    number: toStr(d.number) || undefined,
    institution: (d.institution as string) ?? "",
    // Full date preferred over the bare year (Rule 7.2.1)
    date: toStr(d.date) || undefined,
    year: toNumber(d.year, 0),
    pinpoint: normalisePinpoint(d.pinpoint),
    url: toStr(d.url) || undefined,
  });
}

/**
 * Dispatches a parliamentary research paper citation (Rule 7.2.3).
 * Delegates to formatParliamentaryResearchPaper.
 */
function dispatchParliamentaryResearchPaper(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatParliamentaryResearchPaper({
    // Rule 7.2.3: individual author(s) lead where prominently indicated (ex 33)
    authors: (d.authors as Author[]) ?? [],
    body: pickString(d.body, d.institutionalAuthor) || undefined,
    legislature: toStr(d.legislature) || toStr(d.jurisdiction) || undefined,
    title: (d.title as string) ?? "",
    documentType: (d.documentType as string) ?? "Research Paper",
    number: toStr(d.number) || undefined,
    date: toStr(d.date) || undefined,
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
    // Rule 7.2.4: document type as it appears (default 'Conference Paper')
    documentType: toStr(d.documentType) || undefined,
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
  const singleAuthor: Author =
    authors && authors.length > 0
      ? authors[0]
      : { givenNames: "", surname: (d.author as string) ?? "" };
  return formatThesis({
    author: singleAuthor,
    title: (d.title as string) ?? "",
    thesisType: (d.thesisType as string) ?? (d.degree as string) ?? "PhD Thesis",
    university: (d.university as string) ?? (d.institution as string) ?? "",
    // Full date preferred over the bare year (Rule 7.2.5)
    date: toStr(d.date) || undefined,
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
    speaker: toStr(d.speaker) || toStr(d.author) || toStr(d.authors) || toStr(d.name),
    title: toStr(d.title),
    // Rule 7.3: a named lecture replaces the 'Speech' label (ex 42)
    speechType: toStr(d.speechType) || toStr(d.lectureName) || undefined,
    event: toStr(d.event) || toStr(d.occasion) || toStr(d.venue) || toStr(d.location),
    date: toStr(d.date),
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
    // d.issuingBody is no longer an author fallback — it has its own slot
    body: pickString(d.body, d.author) || undefined,
    title: (d.title as string) ?? "",
    // Rule 7.4: release type as printed (default 'Media Release')
    releaseType: toStr(d.releaseType) || undefined,
    // Document number as printed, no comma (eg 'Media Release MSPA 172/09')
    documentNumber: toStr(d.documentNumber) || undefined,
    // Issuing body, included only where it differs from the author
    issuingBody: toStr(d.issuingBody) || undefined,
    date: (d.date as string) ?? "",
    pinpoint: normalisePinpoint(d.pinpoint),
  });
}

/**
 * Dispatches a newspaper article citation (Rules 7.11.1-7.11.4).
 * Delegates to formatNewspaper.
 */
function dispatchNewspaper(citation: Citation): FormattedRun[] {
  const d = citation.data;
  const newspaper =
    (d.newspaper as string) ?? (d.newspaperName as string) ?? (d.publication as string) ?? "";
  const place = (d.place as string) ?? (d.location as string) ?? (d.city as string) ?? "";
  const date = (d.date as string) ?? "";
  const page = (d.page as string) ?? (d.startingPage as string) ?? undefined;
  const isElectronic = toBool(d.isElectronic) || undefined;
  const url = d.url as string | undefined;

  // Rule 7.11.4: editorials lead with 'Editorial' (ex 91)
  if (toBool(d.isEditorial)) {
    return formatEditorial({
      title: toStr(d.title) || undefined,
      newspaper,
      place,
      date,
      page,
      isElectronic,
      url,
    });
  }

  return formatNewspaper({
    authors: d.authors as Author[] | undefined,
    title: (d.title as string) ?? "",
    // Rule 7.11.4: descriptions of untitled pieces take no quotes (ex 92)
    titleIsDescription: toBool(d.titleIsDescription) || undefined,
    newspaper,
    place,
    date,
    page,
    isElectronic,
    url,
  });
}

/**
 * Dispatches a periodical/magazine citation (Rule 7.11.3).
 *
 * AGLC4 Rule 7.11.3: periodicals without volume/issue numbers are cited
 * with the date period parenthetical BEFORE the italic periodical name
 * (ex 89): Author, 'Title' (DatePeriod) PeriodicalName Page.
 * Periodicals WITH volume/issue numbers are cited as journal articles
 * under chapter 5 \u2014 enter them as `journal.article`.
 */
function dispatchPeriodical(citation: Citation): FormattedRun[] {
  const d = citation.data;
  const runs: FormattedRun[] = [];

  const author = (d.author as string) ?? "";
  const title = (d.title as string) ?? "";
  const periodicalName = (d.periodicalName as string) ?? "";
  const datePeriod = (d.datePeriod as string) ?? "";
  const page = (d.page as string) ?? "";
  const pinpoint = normalisePinpoint(d.pinpoint);

  if (author) {
    runs.push({ text: `${author}, ` });
  }

  if (title) {
    runs.push({ text: `\u2018${title}\u2019` });
  }

  // Date period parenthetical precedes the periodical name (ex 89)
  if (datePeriod) {
    runs.push({ text: `${title ? " " : ""}(${datePeriod})` });
  }

  if (periodicalName) {
    if (runs.length > 0) runs.push({ text: " " });
    runs.push({ text: periodicalName, italic: true });
  }

  if (page) {
    runs.push({ text: ` ${page}` });
  }

  if (pinpoint) {
    runs.push({ text: `, ${pinpoint.value}` });
  }

  return runs.length > 0 ? runs : [{ text: title || periodicalName || "Periodical" }];
}

/**
 * Dispatches a correspondence citation (Rule 7.12).
 * Delegates to formatCorrespondence.
 */
function dispatchCorrespondence(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatCorrespondence({
    type: (d.type as string) ?? (d.correspondenceType as string) ?? "Letter",
    sender: pickString(d.sender, d.author),
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
    interviewee: pickString(d.interviewee, d.author, d.name),
    interviewer: (d.interviewer as string) ?? (d.host as string) ?? undefined,
    location:
      (d.location as string) ?? (d.program as string) ?? (d.publication as string) ?? undefined,
    date: (d.date as string) ?? "",
  });
}

/**
 * Dispatches a film/TV/podcast/media citation (Rules 7.14.1-7.14.4).
 *
 * Routes to formatPodcast for podcast/radio media (Rule 7.14.4), to
 * formatTvSeries for television (Rule 7.14.3), and to formatFilm
 * otherwise (Rules 7.14.1-7.14.2).
 */
function dispatchFilmTvMedia(citation: Citation): FormattedRun[] {
  const d = citation.data;
  const medium = (d.medium as string) ?? "";
  const isTv = medium === "Television" || medium === "TV Series";
  const isPodcast = medium === "Podcast" || medium === "Radio";
  const episodeTitle = (d.episodeTitle as string) ?? "";
  const seriesTitle = (d.seriesTitle as string) ?? "";
  const timePinpoint = toStr(d.timePinpoint) || undefined;

  // Rule 7.14.4: podcasts and radio programs
  if (isPodcast) {
    return formatPodcast({
      episodeTitle: episodeTitle || undefined,
      seriesTitle: seriesTitle || ((d.title as string) ?? ""),
      producer: pickString(d.producer, d.productionCompany, d.host) || undefined,
      date: toStr(d.date) || toStr(d.year),
      timePinpoint,
      url: toStr(d.url) || undefined,
    });
  }

  // Rule 7.14.3: TV series — the formatter builds the parenthetical and
  // synthesises 'Season X, Episode Y' episode titles for untitled episodes
  if (isTv && (episodeTitle || seriesTitle)) {
    return formatTvSeries({
      episodeTitle: episodeTitle || toStr(d.title) || undefined,
      seriesTitle: seriesTitle || ((d.title as string) ?? ""),
      seasonNumber: toStr(d.seasonNumber) || undefined,
      episodeNumber: toStr(d.episodeNumber) || undefined,
      versionDetails: toStr(d.versionDetails) || undefined,
      network: toStr(d.productionCompany) || toStr(d.network),
      date: toStr(d.year) || toStr(d.date),
      timePinpoint,
      url: toStr(d.url) || undefined,
    });
  }

  // Rules 7.14.1-7.14.2: film format — no 'Directed by' element; legacy
  // director data renders via the formatter's production-company fallback
  return formatFilm({
    title: (d.title as string) ?? "",
    productionCompany: pickString(d.productionCompany, d.studio, d.producer) || undefined,
    versionDetails: toStr(d.versionDetails) || undefined,
    director: toStr(d.director) || undefined,
    year: String(d.year ?? ""),
    timePinpoint,
  });
}

/**
 * Dispatches an internet material citation (Rule 7.15).
 * Delegates to formatInternetMaterial.
 */
function dispatchInternetMaterial(citation: Citation): FormattedRun[] {
  const d = citation.data;
  // Author: may be a plain string (form) or authors array (AI parser)
  let authors: Author[] | undefined;
  if (Array.isArray(d.authors) && d.authors.length > 0) {
    authors = d.authors as Author[];
  } else if (d.author && typeof d.author === "string") {
    authors = [{ givenNames: "", surname: d.author as string }];
  }
  return formatInternetMaterial({
    authors,
    title: toStr(d.title),
    website: toStr(d.websiteName) || toStr(d.website) || toStr(d.siteName),
    // Rule 7.15: document type opens the parenthetical. Default 'Web Page'
    // only when no stored date exists — legacy data smuggled the type into
    // `date`, and defaulting there would double-type it.
    documentType: toStr(d.documentType) || (toStr(d.date) ? undefined : "Web Page"),
    date: toStr(d.date),
    url: toStr(d.url),
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
    // Rule 7.16: videos take a time pinpoint after the parenthetical (ex 114)
    timePinpoint: toStr(d.timePinpoint) || undefined,
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
    edition: d.edition as string | undefined,
    year: String(d.year ?? ""),
    // Rule 7.6: retrieval date selects the online form '(online at …)'
    retrievedDate: toStr(d.retrievedDate) || undefined,
    // The dictionary's own homograph marker (eg 'v²'), before the def number
    entryType: toStr(d.entryType) || undefined,
    // The dictionary form writes the defined word to `entryTerm`; read both
    // so the term renders (previously read only `entry` → empty '' that the
    // refresher then re-enforced over any manual fix).
    entry: pickString(d.entry, d.entryTerm),
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
    // Rule 7.7: publisher leads the citation (eg 'LexisNexis')
    publisher: toStr(d.publisher) || undefined,
    title: (d.title as string) ?? "",
    date: (d.date as string) ?? "",
    // Retrieval date selects the online form (Rule 7.7)
    retrievedDate: toStr(d.retrievedDate) || undefined,
    volume: d.volume as string | undefined,
    titleNumber: d.titleNumber as string | undefined,
    // Name of the title (eg 'Insurance'), after the title number
    titleName: toStr(d.titleName) || undefined,
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
    // Retrieval date selects the online form (Rule 7.8)
    retrievedDate: toStr(d.retrievedDate) || undefined,
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
    // Rule 7.9: WIPO ST.3 jurisdiction code (eg 'US', 'AU')
    jurisdictionCode: toStr(d.jurisdictionCode) || undefined,
    ipType: (d.ipType as string) ?? (d.type as string) ?? "Patent",
    numberQualifier: toStr(d.numberQualifier) || undefined,
    number: (d.number as string) ?? "",
    filedTerm: d.filedTerm === "lodged" ? "lodged" : d.filedTerm === "filed" ? "filed" : undefined,
    filingDate: toStr(d.filingDate) || undefined,
    status: toStr(d.status) || undefined,
    statusDate: toStr(d.statusDate) || undefined,
    // Legacy: `date` is the filingDate fallback; title/applicant are no
    // longer AGLC4 elements and are not passed
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
    // Rule 7.10: '(at Date)' — date of last update or retrieval
    date: toStr(d.date) || undefined,
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
    // Rule 7.5.2: inquiry name italic and optional (no stray comma, ex 54)
    inquiry: toStr(d.inquiry) || undefined,
    date: d.date as string | undefined,
    pinpoint: normalisePinpoint(d.pinpoint),
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
    // Rule 7.5.3: this slot is the hearing LOCATION (eg 'Canberra'); the
    // legacy `jurisdiction` field never held a jurisdiction
    location: toStr(d.location) || toStr(d.jurisdiction) || undefined,
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
    page: d.page as string | undefined,
    // Rule 7.5.4: speaker in trailing parentheses; volume is not an AGLC
    // element and is no longer passed
    speaker: toStr(d.speaker) || undefined,
  });
}

// ─── Group 6: International Materials ──────────────────────────────────────

/**
 * Dispatches a UN document citation (Rules 9.2.1-9.2.14).
 * Delegates to formatUnDocument.
 */
function dispatchUnDocument(citation: Citation): FormattedRun[] {
  const d = citation.data;

  // Rule 9.1: the UN Charter is cited simply as 'Charter of the United
  // Nations' + article. Reachable via an explicit flag or the title itself
  // (a dedicated un.charter source type is deferred to the UI wave).
  const isCharter =
    toBool(d.isCharter) || /^charter of the united nations$/i.test(toStr(d.title).trim());
  if (isCharter) {
    return formatUnCharter(toStr(d.article) || normalisePinpoint(d.pinpoint)?.value || undefined);
  }

  return formatUnDocument({
    author: d.author as string | undefined,
    title: (d.title as string) ?? "",
    resolutionNumber:
      (d.resolutionNumber as string) ??
      (d.resolutionOrDocumentNumber as string) ??
      (d.resolutionOrDecisionNumber as string) ??
      undefined,
    officialRecords: d.officialRecords as string | undefined,
    session: d.session as string | undefined,
    meetingNumber: d.meetingNumber as string | undefined,
    agendaItem: d.agendaItem as string | undefined,
    supplement: d.supplement as string | undefined,
    documentNumber: toStr(d.documentNumber) || toStr(d.documentSymbol) || toStr(d.docNumber),
    date: toStr(d.date) || (d.year ? String(d.year) : ""),
    annex: (d.annex as string) ?? undefined,
    pinpoint: d.pinpoint as string | undefined,
  });
}

/**
 * Dispatches a UN communication citation (Rule 9.3).
 * Delegates to formatUnCommunication.
 */
function dispatchUnCommunication(citation: Citation): FormattedRun[] {
  const d = citation.data;

  // Rule 9.3.2: parties' submissions in individual communications —
  // 'Author, ‘Title’, Submission to the Committee in *Case*, Date' (ex 41)
  const submissionType = toStr(d.submissionType) || toStr(d.documentType);
  const submissionCase = toStr(d.caseName) || toStr(d.caseTitle);
  if (/^(submission|communication)$/i.test(submissionType.trim()) && submissionCase) {
    return formatUnSubmission({
      author: toStr(d.author),
      documentTitle: toStr(d.documentTitle) || toStr(d.title),
      documentType: submissionType.trim(),
      committee: toStr(d.committee) || toStr(d.body),
      caseName: submissionCase,
      date: toStr(d.date),
      pinpoint: toStr(d.pinpoint) || undefined,
    });
  }

  // Form field: "author" for the applicant/parties (e.g. "Ángela Poma Poma v Peru")
  const author = toStr(d.author);
  // Form field: "communicationNumber" (e.g. "1457/2006")
  const commNo = toStr(d.communicationNumber) || toStr(d.commNumber) || toStr(d.communicationNo);
  // Form field: "committee" (e.g. "Human Rights Committee")
  const committee = toStr(d.committee) || toStr(d.body) || toStr(d.commission) || toStr(d.organ);
  // Form field: "docNumber" (e.g. "CCPR/C/95/D/1457/2006")
  const docNumber =
    toStr(d.docNumber) || toStr(d.documentNumber) || toStr(d.documentSymbol) || toStr(d.unDoc);
  // Build the title: "Views: Communication No X" or just "Communication No X"
  const titlePrefix = toStr(d.decisionType) || toStr(d.documentType) || toStr(d.views);
  const commLabel = commNo ? `Communication No ${commNo}` : "";
  const title =
    titlePrefix && commLabel ? `${titlePrefix}: ${commLabel}` : commLabel || titlePrefix;
  // If no author, committee acts as the author — don't repeat it
  const effectiveAuthor = author || committee;
  const effectiveCommittee = author ? committee : "";
  return formatUnCommunication({
    author: effectiveAuthor,
    title,
    committee: effectiveCommittee,
    // Rule 9.3.1: session between committee and the UN Doc number (ex 38)
    session: toStr(d.session) || undefined,
    documentNumber: docNumber,
    date: (d.date as string) ?? undefined,
    pinpoint: (d.pinpoint as string) ?? undefined,
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

  // Rule 10.4.1: unreported decisions carry a General List number
  if (toStr(d.generalListNumber)) {
    return formatIcjUnreported({
      caseName: toStr(d.caseTitle) || toStr(d.caseName) || toStr(d.title),
      parties: toStr(d.parties) || undefined,
      phase: (d.phase as string) ?? (d.decisionType as string) ?? undefined,
      generalListNumber: toStr(d.generalListNumber),
      date: toStr(d.date),
      pinpoint: (d.pinpoint as string) ?? undefined,
      judge: d.judge as string | undefined,
    });
  }

  return formatIcjDecision({
    caseName: toStr(d.caseTitle) || toStr(d.caseName) || toStr(d.title),
    parties: toStr(d.parties) || undefined,
    phase: (d.phase as string) ?? (d.decisionType as string) ?? undefined,
    year: toNumber(d.year, 0),
    // Rule 10.2.5: 'ICJ Rep' is the AGLC4 abbreviation
    reportSeries: (d.reportSeries as string) ?? "ICJ Rep",
    seriesLetter: d.seriesLetter as string | undefined,
    page: toOptionalNumber(d.icjReportsPage ?? d.page ?? d.startingPage),
    caseNumber: toOptionalNumber(d.caseNumber),
    pinpoint: (d.pinpoint as string) ?? undefined,
    judge: d.judge as string | undefined,
  });
}

/**
 * Dispatches an ICJ pleading citation (Rule 10.3).
 * Delegates to formatIcjPleading.
 */
function dispatchIcjPleading(citation: Citation): FormattedRun[] {
  const d = citation.data;

  // Rule 10.4.2: unreported pleadings — 'Title', Case (General List No, Date)
  if (toStr(d.generalListNumber)) {
    return formatIcjUnreported({
      caseName: (d.caseName as string) ?? "",
      parties: toStr(d.parties) || undefined,
      phase: toStr(d.phase) || undefined,
      generalListNumber: toStr(d.generalListNumber),
      date: toStr(d.date),
      documentTitle: toStr(d.documentTitle) || toStr(d.title) || undefined,
      pinpoint: (d.pinpoint as string) ?? undefined,
    });
  }

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

  // Rule 11.2.1: reported awards — the parties' names open the citation
  // (there is no separate case-name element)
  if (d.reportSeries) {
    return formatStateArbitrationReported({
      caseName:
        (d.parties as string) ??
        (d.caseTitle as string) ??
        (d.caseName as string) ??
        (d.title as string) ??
        "",
      phase: (d.phase as string) ?? (d.awardType as string) ?? undefined,
      year: toNumber(d.year, 0),
      volume: toOptionalNumber(d.volume),
      reportSeries: d.reportSeries as string,
      startingPage: toNumber(d.startingPage, 0),
      pinpoint: (d.pinpoint as string) ?? undefined,
      judge: d.judge as string | undefined,
    });
  }

  // Rule 11.2.2: unreported — *Parties* (*Phase*) (Tribunal, Case No X, Date)
  return formatIcsidCase({
    caseName: (d.caseTitle as string) ?? (d.caseName as string) ?? (d.title as string) ?? "",
    icsidNumber: (d.icsidNumber as string) ?? (d.caseNumber as string) ?? "",
    awardType: (d.awardType as string) ?? (d.phase as string) ?? "",
    date: (d.date as string) ?? "",
    tribunal: toStr(d.tribunal) || undefined,
    pinpoint: (d.pinpoint as string) ?? undefined,
  });
}

/**
 * Dispatches an ICC/international criminal tribunal case citation (Rules 12.1-12.4).
 * Delegates to formatIccCase.
 */
function dispatchIccTribunalCase(citation: Citation): FormattedRun[] {
  const d = citation.data;
  const caseName = (d.caseTitle as string) ?? (d.caseName as string) ?? (d.title as string) ?? "";

  // Rule 12.3: decisions reproduced in a report series (exs 23-4)
  if (d.reportSeries) {
    return formatIccCaseReported({
      caseName,
      phase: toStr(d.phase) || undefined,
      year: toNumber(d.year, 0),
      volume: toOptionalNumber(d.volume),
      reportSeries: d.reportSeries as string,
      startingPage: toNumber(d.startingPage, 0),
      pinpoint: d.pinpoint as string | undefined,
      judge: d.judge as string | undefined,
      tribunal: d.court as string | undefined,
      chamber: toStr(d.chamber) || undefined,
    });
  }

  return formatIccCase({
    caseName,
    phase: (d.phase as string) ?? "",
    court: (d.court as string) ?? "ICC",
    chamber: (d.chamber as string) ?? "",
    caseNumber: (d.caseNumber as string) ?? "",
    date: (d.date as string) ?? "",
    pinpoint: d.pinpoint as string | undefined,
    judge: d.judge as string | undefined,
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
    // Rule 13.1.2: description parenthetical only where on the document
    documentDescription: toStr(d.documentDescription) || undefined,
    pinpoint: (d.pinpoint as string) ?? undefined,
  });
}

/**
 * Dispatches a WTO decision citation (Rule 13.1.3).
 * Delegates to formatWtoDecision.
 */
function dispatchWtoDecision(citation: Citation): FormattedRun[] {
  const d = citation.data;
  return formatWtoDecision({
    documentDescription:
      (d.documentDescription as string) ?? (d.reportType as string) ?? "Panel Report",
    title: (d.title as string) ?? "",
    documentNumber: (d.documentNumber as string) ?? "",
    date: (d.date as string) ?? "",
    // Rule 13.1.3: optional DSR reference after the full date (ex 13)
    dsrReference: toStr(d.dsrReference) || undefined,
    pinpoint: d.pinpoint as string | undefined,
  });
}

/**
 * Dispatches a GATT document citation (Rule 13.2).
 * Delegates to formatGattDocument.
 */
function dispatchGattDocument(citation: Citation): FormattedRun[] {
  const d = citation.data;
  const documentDescription = toStr(d.documentDescription) || toStr(d.reportType);

  // Rule 13.2.2: GATT panel reports lead with 'GATT Panel Report'
  if (/panel report/i.test(documentDescription)) {
    return formatGattPanelReport({
      title: (d.title as string) ?? "",
      documentNumber: (d.documentNumber as string) ?? "",
      date: (d.date as string) ?? "",
      bisdReference: toStr(d.bisdReference) || undefined,
      pinpoint: (d.pinpoint as string) ?? undefined,
    });
  }

  return formatGattDocument({
    title: (d.title as string) ?? "",
    // No comma after the title when the document has no number
    documentNumber: toStr(d.documentNumber) || undefined,
    date: (d.date as string) ?? "",
    documentDescription: documentDescription || undefined,
    // Rule 13.2.1: BISD reference after the full date (ex 16)
    bisdReference: toStr(d.bisdReference) || undefined,
    pinpoint: (d.pinpoint as string) ?? undefined,
  });
}

/**
 * Dispatches an EU Official Journal citation (Rule 14.2.1).
 * Delegates to formatEuOfficialJournal.
 */
function dispatchEuOfficialJournal(citation: Citation): FormattedRun[] {
  const d = citation.data;
  // Rule 14.2.1: the instrument designation is part of the italic title —
  // the deprecated instrumentType field is no longer passed
  return formatEuOfficialJournal({
    title: (d.title as string) ?? "",
    year: toNumber(d.year, 0),
    ojSeries: (d.ojSeries as string) ?? "",
    page: (d.page as string) ?? "",
    pinpoint: (d.pinpoint as string) ?? undefined,
  });
}

/**
 * Dispatches an EU court (CJEU) case citation (Rule 14.2.3).
 * Delegates to formatCjeuCase.
 */
function dispatchEuCourt(citation: Citation): FormattedRun[] {
  const d = citation.data;
  const caseName = (d.caseTitle as string) ?? (d.caseName as string) ?? (d.title as string) ?? "";

  // Rule 14.2.3: decisions not reported in the ECR — *Parties* (Court,
  // Case Number, ECLI, Full Date) Pinpoint. No fabricated 'ECR' citation.
  if (!d.reportSeries && !toStr(d.page)) {
    return formatCjeuUnreportedCase({
      caseName,
      court: (d.court as string) ?? "Court of Justice of the European Union",
      caseNumber: (d.caseNumber as string) ?? "",
      ecli: toStr(d.ecli) || undefined,
      date: (d.date as string) ?? "",
      pinpoint: (d.pinpoint as string) ?? undefined,
    });
  }

  return formatCjeuCase({
    caseName,
    caseNumber: (d.caseNumber as string) ?? "",
    year: toNumber(d.year, 0),
    reportSeries: (d.reportSeries as string) ?? "ECR",
    page: (d.page as string) ?? "",
  });
}

/**
 * Dispatches an ECHR decision citation (Rules 14.3.1-14.3.3).
 * Delegates to formatEchrCase.
 */
function dispatchEchrDecision(citation: Citation): FormattedRun[] {
  const d = citation.data;
  const caseName = (d.caseTitle as string) ?? (d.caseName as string) ?? (d.title as string) ?? "";

  // Rules 14.3.2-14.3.3: decisions in the official reports (exs 30-3, 35)
  if (d.reportSeries) {
    return formatEchrReportedCase({
      caseName,
      year: toNumber(d.year, 0),
      volume: d.volume as string | undefined,
      reportSeries: d.reportSeries as string,
      startingPage: toOptionalNumber(d.startingPage),
      pinpoint: d.pinpoint as string | undefined,
      judge: d.judge as string | undefined,
    });
  }

  // Rule 14.3.1: unreported — the series must NOT be jammed into the
  // unreported parenthetical
  return formatEchrCase({
    caseName,
    applicationNumber: (d.applicationNumber as string) ?? "",
    chamber: d.chamber as string | undefined,
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
  // Case name: try every possible field name the AI or form might use
  let caseName =
    (d.caseTitle as string) ??
    (d.caseName as string) ??
    (d.title as string) ??
    (d.parties as string) ??
    "";
  if (!caseName && d.applicant) {
    caseName = d.respondent ? `${d.applicant} v ${d.respondent}` : (d.applicant as string);
  }
  // Court/body
  const court = pickString(d.court, d.tribunal, d.courtTribunal, d.body, d.commission, d.committee);
  // Case/communication number
  const caseNumber = pickString(
    d.caseNumber,
    d.communicationNumber,
    d.communicationNo,
    d.number,
    d.applicationNumber
  );
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
  // Rule 14.5: all-comma-separated; empty title is dropped, the document
  // number is auto-labelled 'Doc No' (exs 44, 49)
  return formatSupranationalDocument({
    body: (d.body as string) ?? "",
    title: toStr(d.title) || undefined,
    documentNumber: (d.documentNumber as string) ?? "",
    session: toStr(d.session) || undefined,
    date: (d.date as string) ?? "",
    pinpoint: (d.pinpoint as string) ?? undefined,
  });
}

// ─── Group 7: Foreign Sources ──────────────────────────────────────────────

/** Structured citation core derivable for a foreign case (chapters 15–26). */
interface ForeignCaseCore {
  year: number;
  yearType: "round" | "square";
  volume?: number;
  reportSeries: string;
  startingPage: number | string;
}

/**
 * Derives the structured core of a foreign case citation from explicit
 * data fields (reportSeries/year/volume/startingPage) or, failing that,
 * by parsing a `citationDetails` string such as '[2020] UKSC 5',
 * '[1990] 1 SLR 158', '(1998) 193 CLR 173', '2018 FCA 153' or
 * '347 US 483 (1954)'. Returns undefined when no structure is derivable.
 */
function parseForeignCaseCore(d: Record<string, unknown>): ForeignCaseCore | undefined {
  const explicitSeries = toStr(d.reportSeries).trim();
  const explicitYear = toOptionalNumber(d.year);
  if (explicitSeries && explicitYear !== undefined) {
    const rawPage = toStr(d.startingPage).trim();
    return {
      year: explicitYear,
      yearType: d.yearType === "round" ? "round" : "square",
      volume: toOptionalNumber(d.volume),
      reportSeries: explicitSeries,
      startingPage: rawPage && !/^\d+$/.test(rawPage) ? rawPage : toNumber(d.startingPage, 0),
    };
  }

  const details = (toStr(d.citationDetails) || toStr(d.mnc)).trim();
  if (!details) return undefined;

  // '[2020] UKSC 5' | '[1990] 1 SLR 158'
  let m = details.match(/^\[(\d{4})\]\s+(?:(\d+)\s+)?([A-Za-z][A-Za-z .&()']*?)\s+(\d+)$/);
  if (m) {
    return {
      year: Number(m[1]),
      yearType: "square",
      volume: m[2] ? Number(m[2]) : undefined,
      reportSeries: m[3],
      startingPage: Number(m[4]),
    };
  }

  // '(1998) 193 CLR 173'
  m = details.match(/^\((\d{4})\)\s+(?:(\d+)\s+)?([A-Za-z][A-Za-z .&()']*?)\s+(\d+)$/);
  if (m) {
    return {
      year: Number(m[1]),
      yearType: "round",
      volume: m[2] ? Number(m[2]) : undefined,
      reportSeries: m[3],
      startingPage: Number(m[4]),
    };
  }

  // '347 US 483 (1954)' — US reporter style
  m = details.match(/^(\d+)\s+([A-Za-z][A-Za-z .&']*?)\s+(\d+)\s+\((\d{4})\)$/);
  if (m) {
    return {
      year: Number(m[4]),
      yearType: "round",
      volume: Number(m[1]),
      reportSeries: m[2],
      startingPage: Number(m[3]),
    };
  }

  // '2018 FCA 153' — unbracketed neutral style (eg Canada)
  m = details.match(/^(\d{4})\s+([A-Za-z][A-Za-z .&']*?)\s+(\d+)$/);
  if (m) {
    return {
      year: Number(m[1]),
      yearType: "square",
      reportSeries: m[2],
      startingPage: Number(m[3]),
    };
  }

  return undefined;
}

/**
 * Renders UK judicial officers (Rule 24.1.6) from stored data. An array
 * of {name, title} objects goes through foreignUk.formatJudicialOfficers
 * (before-name titles, LJ→LJJ grouping); a plain string — e.g. the
 * guide's own mixed forms like 'Lord Hughes JSC, Baroness Hale PSC' —
 * passes through verbatim. Returns "" when nothing usable is stored.
 */
function renderUkJudicialOfficers(raw: unknown): string {
  if (typeof raw === "string") return raw.trim();
  if (!Array.isArray(raw)) return "";
  const officers: Array<{ name: string; title: string }> = [];
  for (const entry of raw) {
    if (typeof entry === "object" && entry !== null) {
      const record = entry as Record<string, unknown>;
      const name = toStr(record.name);
      if (name) officers.push({ name, title: toStr(record.title) });
    }
  }
  return officers.length > 0 ? foreignUk.formatJudicialOfficers(officers) : "";
}

/**
 * Prefers the chapter 15–26 court-decision formatters where stored
 * fields indicate their shapes (PARITY wave 3): the court-led forms of
 * Rules 17.1/18.1 (court + full date), unreported judgments with docket
 * numbers (Rules 16.2.3 and 25.1.7), Māori Land Court minute books
 * (Rule 21.1.4) and the Rule 26.2 non-common-law element list. Returns
 * null when the fields do not indicate one of these, so the wave-2
 * structured routing (and generic fallback) still applies.
 */
function dispatchForeignCourtDecision(citation: Citation, caseName: string): FormattedRun[] | null {
  const d = citation.data;
  const date = toStr(d.fullDate) || toStr(d.date);
  const caseNumber = toStr(d.caseNumber) || toStr(d.docketNumber);
  const court = toStr(d.court);
  const reportedIn = toStr(d.reportedIn);
  const pinpoint = normalisePinpoint(d.pinpoint)?.value;
  const hasReportCore = parseForeignCaseCore(d) !== undefined;

  switch (citation.sourceType) {
    case "foreign.france":
    case "foreign.germany": {
      // Rules 17.1/18.1: the court-led decision form applies to ALL
      // French/German cases — used whenever a court and full date exist
      if (!court || !date) return null;
      const shape = {
        popularName: toStr(d.popularName) || caseName || undefined,
        court,
        translation: toStr(d.courtTranslation) || toStr(d.translation) || undefined,
        caseNumber: caseNumber || undefined,
        ecli: toStr(d.ecli) || undefined,
        date,
        reportedIn: reportedIn || undefined,
      };
      return citation.sourceType === "foreign.france"
        ? foreignFrance.formatCourtDecision(shape)
        : foreignGermany.formatCourtDecision(shape);
    }
    case "foreign.china": {
      // Rule 16.2.3: unreported judgment — indicated by a case number
      // (or the absence of any parseable report citation)
      if (!caseName || !court || !date) return null;
      if (hasReportCore && !caseNumber) return null;
      return foreignChina.formatUnreportedCase({
        caseName,
        translation: toStr(d.translation) || toStr(d.translatedCaseName) || undefined,
        court,
        courtTranslation: toStr(d.courtTranslation) || undefined,
        caseNumber: caseNumber || undefined,
        caseNumberTranslation: toStr(d.caseNumberTranslation) || undefined,
        date,
        pinpoint,
      });
    }
    case "foreign.new_zealand": {
      // Rule 21.1.4: Māori Land Court minute books — indicated by a registry
      const registry = toStr(d.registry);
      const year = toOptionalNumber(d.year);
      const minuteBookNumber = toStr(d.caseNumber);
      const startingPage = toStr(d.startingPage);
      if (!caseName || !registry || year === undefined || !minuteBookNumber || !startingPage) {
        return null;
      }
      const minuteBook =
        d.minuteBook === "MB" || d.minuteBook === "ACMB" || d.minuteBook === "CJMB"
          ? d.minuteBook
          : undefined;
      return foreignNewZealand.formatMaoriLandCourt({
        parties: caseName,
        blockName: toStr(d.blockName) || undefined,
        year,
        caseNumber: minuteBookNumber,
        registry,
        minuteBook,
        startingPage,
        pinpoint,
        judicialOfficer: toStr(d.judicialOfficer) || toStr(d.judges) || undefined,
      });
    }
    case "foreign.usa": {
      // Rule 25.1.7: unreported/slip opinions — indicated by a docket
      // number without a parseable reporter citation
      const docketNumber = toStr(d.docketNumber) || toStr(d.caseNumber);
      const usCourt = court || toStr(d.courtId);
      if (!caseName || !docketNumber || !usCourt || !date || hasReportCore) return null;
      return foreignUsa.formatUnreportedCase({
        caseName,
        court: usCourt,
        docketNumber,
        date,
        slipOpStartingPage: toOptionalNumber(d.slipOpStartingPage),
        slipOpPinpoint: toStr(d.slipOpPinpoint) || undefined,
      });
    }
    case "foreign.other": {
      // Rule 26.2: non-common-law decisions — comma-separated element
      // list, indicated by a case/decision number, a 'reported in'
      // reference, or a dated decision with no common-law report core
      if (!court) return null;
      if (!caseNumber && !reportedIn && !(date && !hasReportCore)) return null;
      return foreignOther.formatOtherDecision({
        caseName: caseName || undefined,
        court,
        courtTranslation: toStr(d.courtTranslation) || undefined,
        caseNumber: caseNumber || undefined,
        date: date || undefined,
        reportedIn: reportedIn || undefined,
        pinpoint,
        translator: toStr(d.translator) || undefined,
      });
    }
    default:
      return null;
  }
}

/**
 * Routes a foreign case to its per-country formatter (PARITY-114).
 * Field-indicated court-decision forms (PARITY wave 3) are preferred;
 * returns null when the stored data has no derivable citation core, in
 * which case the caller falls back to the generic rendering.
 */
function dispatchForeignCase(citation: Citation, caseName: string): FormattedRun[] | null {
  const d = citation.data;

  // Prefer the new court-decision formatters where fields indicate them
  const courtDecision = dispatchForeignCourtDecision(citation, caseName);
  if (courtDecision) return courtDecision;

  const core = parseForeignCaseCore(d);
  if (!core || !caseName) return null;

  const pinpoint = normalisePinpoint(d.pinpoint)?.value;
  const court = toStr(d.court) || undefined;
  const courtId = toStr(d.courtId) || court;
  const numericPage = toNumber(core.startingPage, 0);
  // Shape shared by the canada/china/france/germany/hong-kong/malaysia modules
  const simpleShape = {
    caseName,
    year: core.year,
    reportSeries: core.reportSeries,
    volume: core.volume,
    startingPage: numericPage,
    court,
  };
  // Shape shared by the nz/singapore/south-africa/uk modules
  const fullShape = {
    caseName,
    year: core.year,
    yearType: core.yearType,
    volume: core.volume,
    reportSeries: core.reportSeries,
    startingPage: core.startingPage,
    pinpoint,
    courtId,
  };

  switch (citation.sourceType) {
    case "foreign.canada":
      // Rule 15.1.2 via 2.2.3–2.2.4: round years for volume-organised series
      return foreignCanada.formatCase({ ...simpleShape, yearType: core.yearType });
    case "foreign.china":
      return foreignChina.formatCase({
        ...simpleShape,
        translation: toStr(d.translatedCaseName) || undefined,
        seriesTranslation: toStr(d.seriesTranslation) || undefined,
        pinpoint,
      });
    case "foreign.france":
      return foreignFrance.formatCase(simpleShape);
    case "foreign.germany":
      return foreignGermany.formatCase(simpleShape);
    case "foreign.hong_kong":
      return foreignHongKong.formatCase({ ...simpleShape, yearType: core.yearType, pinpoint });
    case "foreign.malaysia":
      return foreignMalaysia.formatCase({ ...simpleShape, pinpoint });
    case "foreign.new_zealand":
      return foreignNewZealand.formatCase(fullShape);
    case "foreign.singapore":
      return foreignSingapore.formatCase(fullShape);
    case "foreign.south_africa":
      return foreignSouthAfrica.formatCase(fullShape);
    case "foreign.uk": {
      // Rule 24.1.6: judicial officers follow the pinpoint in parentheses
      const officers = renderUkJudicialOfficers(d.judicialOfficers);
      const runs = foreignUk.formatCase({
        ...fullShape,
        pinpoint: officers && pinpoint ? `${pinpoint} (${officers})` : pinpoint,
        ewhcDivision: toStr(d.ewhcDivision) || undefined,
      });
      if (officers && !pinpoint) {
        runs.push({ text: ` (${officers})` });
      }
      return runs;
    }
    case "foreign.usa": {
      // USCaseData requires a volume; fall back to generic when absent
      if (core.volume === undefined) return null;
      return foreignUsa.formatCase({
        caseName,
        volume: core.volume,
        reporter: core.reportSeries,
        startingPage: numericPage,
        pinpoint,
        year: core.year,
        courtId,
      });
    }
    default:
      return foreignOther.formatCase({
        caseName,
        year: core.year,
        yearType: core.yearType,
        volume: core.volume,
        reportSeries: core.reportSeries,
        startingPage: core.startingPage,
        pinpoint,
        courtId,
        jurisdiction: toStr(d.jurisdiction) || undefined,
        translatedCaseName: toStr(d.translatedCaseName) || undefined,
      });
  }
}

/**
 * Routes foreign legislation to its per-country formatter (PARITY-114).
 * Foreign legislation titles italicise per the chapter rules. Returns
 * null when the country module needs fields the stored data lacks.
 */
function dispatchForeignLegislation(citation: Citation, title: string): FormattedRun[] | null {
  const d = citation.data;
  const pinpoint = normalisePinpoint(d.pinpoint)?.value;

  // Rule 15.3.1 fixed federal constitutional forms need no stored title
  if (citation.sourceType === "foreign.canada") {
    const instrument = toStr(d.constitutionInstrument);
    if (
      instrument === "constitution1982" ||
      instrument === "constitution1867" ||
      instrument === "charter"
    ) {
      return foreignCanada.formatFederalConstitution({ instrument, pinpoint });
    }
  }

  if (!title) return null;

  const year = toOptionalNumber(d.year);
  const jurisdiction = toStr(d.jurisdiction) || undefined;
  const isConstitution =
    toStr(d.foreignSubType).toLowerCase() === "constitution" || toBool(d.isConstitution);
  // Shape shared by the canada/china/france/germany/hong-kong/malaysia modules
  const simpleShape = { title, year, jurisdiction, pinpoint };

  switch (citation.sourceType) {
    case "foreign.canada": {
      // Rules 15.4.1–15.4.3: regulations — indicated by a CRC/SOR/Reg citation
      const regulationCitation =
        toStr(d.regulationCitation) ||
        (/^(CRC\b|SOR\/|RRO\b)|\bReg\b/.test(toStr(d.citationDetails))
          ? toStr(d.citationDetails)
          : "");
      if (regulationCitation) {
        return foreignCanada.formatRegulation({
          title,
          citation: regulationCitation,
          pinpoint,
          consolidationYear: toOptionalNumber(d.consolidationYear),
        });
      }
      return foreignCanada.formatLegislation({
        ...simpleShape,
        sessionOrSupplement: toStr(d.sessionOrSupplement) || undefined,
      });
    }
    case "foreign.china":
      // Rule 16.3.2: fixed constitutional forms
      if (isConstitution) {
        return foreignChina.formatConstitution({
          title,
          translation: toStr(d.translation) || toStr(d.translatedTitle) || undefined,
          pinpoint,
        });
      }
      // Rule 16.3.1: promulgating body, order number, full date, gazette
      return foreignChina.formatLegislation({
        ...simpleShape,
        translation: toStr(d.translation) || toStr(d.translatedTitle) || undefined,
        promulgatingBody: toStr(d.promulgatingBody) || undefined,
        instrumentNumber: toStr(d.instrumentNumber) || undefined,
        promulgationDate: toStr(d.promulgationDate) || toStr(d.date) || undefined,
        gazette: toStr(d.gazette) || undefined,
      });
    case "foreign.france":
      return foreignFrance.formatLegislation(simpleShape);
    case "foreign.germany":
      return foreignGermany.formatLegislation(simpleShape);
    case "foreign.hong_kong":
      // Rule 19.2.1: chapter number after the (Hong Kong) parenthetical
      return foreignHongKong.formatLegislation({
        ...simpleShape,
        capNumber: toStr(d.capNumber) || undefined,
      });
    case "foreign.malaysia":
      return foreignMalaysia.formatLegislation(simpleShape);
    case "foreign.new_zealand":
      return year === undefined
        ? null
        : foreignNewZealand.formatLegislation({ title, year, pinpoint });
    case "foreign.singapore":
      return foreignSingapore.formatLegislation({
        title,
        year,
        jurisdiction,
        pinpoint,
        isConstitution: isConstitution || undefined,
        capNumber: toStr(d.capNumber) || undefined,
        revisedEdition: toStr(d.revisedEdition) || undefined,
        reprint: toStr(d.reprint) || undefined,
      });
    case "foreign.south_africa":
      return year === undefined
        ? null
        : foreignSouthAfrica.formatLegislation({
            title,
            year,
            jurisdiction,
            pinpoint,
            actNumber: toStr(d.actNumber) || undefined,
          });
    case "foreign.uk": {
      if (toStr(d.siNumber)) {
        // Rule 24.3: SI/SR/SR & O — explicit type or defaulted in uk.ts
        const instrumentType =
          d.instrumentType === "SI" || d.instrumentType === "SR" || d.instrumentType === "SR & O"
            ? d.instrumentType
            : undefined;
        return foreignUk.formatStatutoryInstrument({
          title,
          year: year ?? 0,
          siNumber: toStr(d.siNumber),
          jurisdiction,
          pinpoint,
          instrumentType,
        });
      }
      if (year === undefined) return null;
      // Rule 24.2.3: build the regnal year from structured fields where stored
      const monarch = toStr(d.monarch);
      const yearsOfReign = toStr(d.yearsOfReign);
      const regnalYear =
        toStr(d.regnalYear) ||
        (monarch && yearsOfReign
          ? foreignUk.formatRegnalYear({
              yearsOfReign,
              monarch,
              regnalNumber: toOptionalNumber(d.regnalNumber),
              session: toOptionalNumber(d.session),
            })
          : "");
      return foreignUk.formatLegislation({
        title,
        year,
        jurisdiction,
        pinpoint,
        regnalYear: regnalYear || undefined,
        chapter: toStr(d.chapter) || undefined,
      });
    }
    case "foreign.usa": {
      // Rule 25.4: federal and state constitutions (italic titles)
      const constitutionParts = {
        amendment: toStr(d.amendment) || undefined,
        article: toStr(d.article) || undefined,
        section: toStr(d.section) || undefined,
        clause: toStr(d.clause) || undefined,
      };
      const hasConstitutionParts = Object.values(constitutionParts).some(Boolean);
      if (isConstitution || (hasConstitutionParts && /Constitution$/.test(title))) {
        return foreignUsa.formatConstitution({ title, ...constitutionParts });
      }
      // Rule 25.5.1 (CFR form)
      const cfrTitle = toOptionalNumber(d.cfrTitle);
      const cfrSection = toStr(d.cfrSection);
      if (cfrTitle !== undefined && cfrSection) {
        return foreignUsa.formatRegulation({
          title: title || undefined,
          cfrTitle,
          cfrSection,
          year,
          pinpoint,
        });
      }
      const uscTitle = toOptionalNumber(d.uscTitle);
      const uscSection = toStr(d.uscSection);
      // Rule 25.5.1 (Federal Register form) — indicated by a volume,
      // starting page and full date without a USC reference
      const fedRegVolume = toOptionalNumber(d.fedRegVolume) ?? toOptionalNumber(d.volume);
      const fedRegPage = toOptionalNumber(d.startingPage);
      const fedRegDate = toStr(d.date) || toStr(d.fullDate);
      if (
        uscTitle === undefined &&
        fedRegVolume !== undefined &&
        fedRegPage !== undefined &&
        fedRegDate
      ) {
        return foreignUsa.formatFederalRegister({
          title: title || undefined,
          volume: fedRegVolume,
          startingPage: fedRegPage,
          pinpoint,
          date: fedRegDate,
        });
      }
      if (uscTitle === undefined || !uscSection) return null;
      return foreignUsa.formatLegislation({
        title,
        uscTitle,
        uscSection,
        pinpoint,
        supplement: toStr(d.supplement) || undefined,
      });
    }
    default:
      return jurisdiction === undefined
        ? null
        : foreignOther.formatLegislation({
            title,
            year,
            jurisdiction,
            pinpoint,
            translatedTitle: toStr(d.translatedTitle) || undefined,
            // Rule 26.3: comma-separated body/number/date/gazette elements
            otherInformation: toStr(d.otherInformation) || toStr(d.gazette) || undefined,
            // Rule 26.1.1: '[tr …]' as the final element
            translator: toStr(d.translator) || undefined,
            isAuthorTranslation: toBool(d.isAuthorTranslation) || undefined,
          });
  }
}

/**
 * Routes foreign secondary-source forms that are neither cases nor
 * legislation (PARITY wave 3): US Congressional Record (Rule 25.6.1)
 * and Restatements (Rule 25.7), and South African TRC reports
 * (Rule 23.3). Indicated by the `foreignSubType` values
 * "congressional_record" / "restatement" / "trc_report" or by the
 * fields themselves on a "secondary" subtype. Returns null when
 * nothing matches, so the generic fallback applies.
 */
function dispatchForeignSecondary(citation: Citation, title: string): FormattedRun[] | null {
  const d = citation.data;
  const subType = toStr(d.foreignSubType).toLowerCase();
  const pinpoint = normalisePinpoint(d.pinpoint)?.value;
  const year = toOptionalNumber(d.year);

  switch (citation.sourceType) {
    case "foreign.usa": {
      // Rule 25.7: Restatements — subject, ordinal edition and section
      const subject = toStr(d.restatementSubject) || toStr(d.subject);
      const restatementEdition = toStr(d.edition);
      const section = toStr(d.section);
      const editionIsOrdinal =
        restatementEdition !== "" &&
        restatementEdition !== "daily" &&
        restatementEdition !== "bound";
      if (subject && section && year !== undefined && editionIsOrdinal) {
        return foreignUsa.formatRestatement({
          subject,
          edition: restatementEdition,
          section,
          year,
          topic: toStr(d.topic) || undefined,
          pinpoint,
        });
      }
      // Rule 25.6.1: Congressional Record — volume, page and year, with
      // a speaker/edition/chamber indicator
      const volume = toOptionalNumber(d.volume);
      const page = toStr(d.page) || toStr(d.startingPage);
      const speaker = toStr(d.speaker);
      const chamber = toStr(d.chamber);
      const edition = d.edition === "daily" ? "daily" : d.edition === "bound" ? "bound" : undefined;
      if (
        volume !== undefined &&
        page &&
        year !== undefined &&
        (subType === "congressional_record" || speaker || chamber || edition)
      ) {
        return foreignUsa.formatCongressionalRecord({
          volume,
          page,
          year,
          speaker: speaker || undefined,
          edition,
          date: toStr(d.date) || toStr(d.fullDate) || undefined,
          chamber: chamber || undefined,
        });
      }
      return null;
    }
    case "foreign.south_africa": {
      // Rule 23.3: TRC reports as chapter 6 books
      const years = toStr(d.years);
      if (!years || !(subType === "trc_report" || toBool(d.isTRC))) return null;
      return foreignSouthAfrica.formatTRCReport({
        title: title || undefined,
        years,
        volume: toOptionalNumber(d.volume) ?? (toStr(d.volume) || undefined),
        pinpoint,
      });
    }
    default:
      return null;
  }
}

/**
 * Dispatches any foreign.* source type (PARITY-114, chapters 15–26).
 *
 * Routes to the per-country formatters in src/engine/rules/v4/foreign/*
 * based on the `foreignSubType` data field ("case" | "legislation" |
 * "constitution" | "secondary", plus the explicit secondary forms
 * "congressional_record" / "restatement" / "trc_report"). Within the
 * case and legislation routes, field-indicated shapes (docket numbers,
 * gazettes, minute books, regulation designations) prefer the wave-3
 * court-decision and delegated-legislation formatters, with the wave-2
 * structured routing as fallback. Where the stored data is too
 * unstructured for a country module (free-text `citationDetails` that
 * does not parse), falls back to a generic rendering: italic
 * case/legislation title, citation details verbatim, court
 * parenthetical, space-separated pinpoint.
 */
function dispatchForeign(citation: Citation): FormattedRun[] {
  const d = citation.data;

  // Case name / title — try every possible field name
  const caseName =
    (d.caseTitle as string) ??
    (d.caseName as string) ??
    (d.title as string) ??
    (d.parties as string) ??
    "";

  const subType = toStr(d.foreignSubType).toLowerCase();
  const isCase = subType === "case" || (!subType && caseName.includes(" v "));
  const isLegislation =
    subType === "legislation" || subType === "constitution" || toBool(d.isConstitution);

  // Per-country structured routing
  if (isCase) {
    const routed = dispatchForeignCase(citation, caseName);
    if (routed) return routed;
  } else if (isLegislation) {
    const routed = dispatchForeignLegislation(citation, caseName);
    if (routed) return routed;
  } else {
    const routed = dispatchForeignSecondary(citation, caseName);
    if (routed) return routed;
  }

  // Generic fallback for unstructured data
  const runs: FormattedRun[] = [];

  if (caseName) {
    // Rules 26.2/26.1: case names and legislation titles italicise;
    // secondary-source titles stay roman
    runs.push({ text: caseName, italic: isCase || isLegislation });
  }

  // Citation details (MNC, report series, etc.)
  // If AI split MNC into parts (year, court abbreviation, number), reconstruct
  let citationDetails = (d.citationDetails as string) ?? (d.mnc as string) ?? "";
  if (!citationDetails && d.year && d.courtAbbrev) {
    const num = (d.caseNumber as string) ?? (d.number as string) ?? "";
    citationDetails = `${d.year} ${d.courtAbbrev}${num ? " " + num : ""}`;
  }
  if (citationDetails) {
    if (runs.length > 0) runs.push({ text: " " });
    runs.push({ text: citationDetails });
  }

  // Year (only if not already in citation details)
  const year = toOptionalNumber(d.year);
  if (year && !citationDetails.includes(String(year))) {
    runs.push({ text: ` (${year})` });
  }

  // Court/body
  const court = (d.court as string) ?? "";
  if (court && !citationDetails.includes(court)) {
    runs.push({ text: ` (${court})` });
  }

  // Pinpoint — space-separated (foreign pinpoints follow the citation
  // without a comma; the old comma-prefixed form was a generic invention)
  const pinpoint = normalisePinpoint(d.pinpoint);
  if (pinpoint) {
    runs.push({ text: ` ${pinpoint.value}` });
  }

  return runs.length > 0 ? runs : formatGenericCitation(citation);
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
  "book.ebook": dispatchBookEbook,

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
  periodical: dispatchPeriodical,
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
  "treaty.mou": dispatchTreatyMou,
  genai_output: dispatchGenaiOutput,
  custom: dispatchCustom,
  explanatory_note: dispatchExplanatoryNote,
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
        caseName:
          (d.caseName as string) ?? `${(d.party1 as string) ?? ""} v ${(d.party2 as string) ?? ""}`,
        court: (d.court as string) ?? "",
        registry: d.registry as string | undefined,
        fileNumber: (d.fileNumber as string) ?? "",
        date: (d.date as string) ?? "",
        pinpoint: extractNzlsgPinpoint(d),
      });
    }

    // Neutral citation format
    const caseName =
      (d.caseName as string) ?? `${(d.party1 as string) ?? ""} v ${(d.party2 as string) ?? ""}`;

    // Build parallel report from data if present
    const parallelReport = d.parallelReport as
      | {
          year: number;
          volume?: number;
          reportSeries: string;
          startPage: number;
        }
      | undefined;

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
      isAppellateCourt: toBool(d.isAppellateCourt) || undefined,
    });
  }

  // ── Waitangi Tribunal Reports ──────────────────────────────────────────────

  if (st === "report.waitangi_tribunal" || (st === "report" && d.waiNumber !== undefined)) {
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
      preamble: toBool(d.preamble) || undefined,
    });
  }

  // ── Legislation ────────────────────────────────────────────────────────────

  if (st === "legislation.statute") {
    // NZLSG 4.1: the jurisdiction parenthetical marks FOREIGN statutes only —
    // omit it for NZ domestic legislation.
    const statuteJurisdiction = d.jurisdiction as string | undefined;
    const isDomestic = statuteJurisdiction === "NZ" || statuteJurisdiction === "New Zealand";
    return nzlsgFormatLegislation({
      title: (d.title as string) ?? "",
      year: toNumber(d.year, 0),
      jurisdiction: isDomestic ? undefined : statuteJurisdiction,
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
      author: (d.author as string) ?? formatNzlsgAuthorString(d.authors as Author[] | undefined),
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
      author: (d.author as string) ?? formatNzlsgAuthorString(d.authors as Author[] | undefined),
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
      author: (d.author as string) ?? formatNzlsgAuthorString(d.authors as Author[] | undefined),
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
      entryIntoForce: (d.entryIntoForceDate as string) ?? (d.entryIntoForce as string) ?? undefined,
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
  context: CitationContext
): FormattedRun[] | null {
  if (context.isFirstCitation) return null;

  const nzlsgStyle: NZLSGStyle = (citation.data.nzlsgStyle as NZLSGStyle) ?? "general";

  // Determine the author/title string for the subsequent reference
  const authorOrTitle =
    citation.shortTitle ??
    (citation.data.shortTitle as string | undefined) ??
    (citation.data.author as string | undefined) ??
    formatNzlsgAuthorString(citation.data.authors as Author[] | undefined) ??
    (citation.data.title as string | undefined) ??
    "";

  const pinpointStr = context.currentPinpoint ? extractNzlsgPinpoint(citation.data) : undefined;

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
    bailiiRetrospective: toBool(d.bailiiRetrospective) || undefined,
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
    historicalSeries: toBool(d.historicalSeries) || undefined,
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

  const neutralCitation = d.neutralCitation as
    | {
        year: number;
        court: IrishCourtIdentifier;
        number: number;
      }
    | undefined;

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

  const reportCitation = d.reportCitation as
    | {
        year: number;
        volume?: number;
        series: IrishReportSeries;
        page: number;
      }
    | undefined;

  let rc = reportCitation;
  if (!rc && d.reportSeries) {
    rc = {
      year: toNumber(d.year, 0),
      volume: toOptionalNumber(d.volume),
      series: d.reportSeries as string as IrishReportSeries,
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
  const courtId =
    (d.courtId as string) ??
    (d.neutralCitationCourt as string) ??
    (d.neutralCitation as { court?: string } | undefined)?.court ??
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
  const isAdmissibilityDecision = toBool(d.isDecision) || undefined;
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
    entryIntoForceDate: (d.entryIntoForceDate as string) || undefined,
    notYetInForce: toBool(d.notYetInForce),
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
  const authors = Array.isArray(d.authors) ? (d.authors as Author[]) : undefined;
  const plainAuthor =
    toStr(d.author) || toStr(d.institutionalAuthor) || toStr(d.speaker) || toStr(d.witness) || "";

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
export function applySignalAndCommentary(runs: FormattedRun[], citation: Citation): FormattedRun[] {
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

/**
 * AGLC4 Rule 1.3: Appends a linking phrase and secondary citation runs
 * after the primary citation (e.g. ", quoting [secondary citation]").
 */
export function applyLinkingPhrase(
  primaryRuns: FormattedRun[],
  linkingPhrase: Citation["linkingPhrase"],
  secondaryRuns: FormattedRun[]
): FormattedRun[] {
  if (!linkingPhrase || secondaryRuns.length === 0) {
    return primaryRuns;
  }
  return [...primaryRuns, ...formatLinkingPhrase(linkingPhrase), ...secondaryRuns];
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
  config?: CitationConfig
): FormattedRun[] {
  // Manual override: when the user chose "Use as-is" in the Preview editor,
  // the override text is rendered verbatim and structured formatting is
  // bypassed. Subsequent references still get auto-resolved unless the
  // override path was applied at insert time.
  if (citation.overrideText) {
    return [{ text: citation.overrideText }];
  }

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

    const subsequentRuns = resolveSubsequentReference(citation, resolverContext);

    if (subsequentRuns !== null) {
      // Rules 1.4.3/1.2: introductory signals may accompany 'ibid' and
      // short-form references (guide ex 69: 'See ibid'). 'Ibid' keeps its
      // capital only when it opens the footnote — lowercase it when a
      // signal or preceding commentary comes first.
      const precededByText = Boolean(
        citation.signal || (citation.commentaryBefore && citation.commentaryBefore.trim())
      );
      let adjusted = subsequentRuns;
      if (precededByText && adjusted.length > 0 && adjusted[0].text.startsWith("Ibid")) {
        adjusted = [
          { ...adjusted[0], text: `ibid${adjusted[0].text.slice(4)}` },
          ...adjusted.slice(1),
        ];
      }
      return applySignalAndCommentary(adjusted, citation);
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
    // The introduction is redundant only when the short title IS the whole
    // rendered citation ("Watt v R" cited as 'Watt v R'). Mere containment
    // never excuses it: the rule 2.1.14 default short title is the
    // first-named party (guide ex 40/81 introduce ('McGinty')/('Pape')
    // although both are substrings), and ch 3 exs 29/45/47 introduce
    // contained legislation short titles.
    if (citation.shortTitle) {
      const fullText = result
        .map((r) => r.text)
        .join("")
        .toLowerCase()
        .trim();
      const shortLower = citation.shortTitle.toLowerCase().trim();
      const isRedundant = fullText === shortLower;
      if (!isRedundant) {
        const intro = formatShortTitleIntroduction(citation.shortTitle, citation.sourceType);
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
  let runs = dispatcher ? dispatcher(citation, standardConfig) : formatGenericCitation(citation);
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
  linkedCitationRuns?: FormattedRun[]
): FormattedRun[] {
  // Manual override: render verbatim and skip every formatter / signal /
  // linking phrase path. The user has explicitly told us their text is
  // already correct.
  if (citation.overrideText) {
    return [{ text: citation.overrideText }];
  }

  const standardConfig = config ?? getStandardConfig("aglc4");

  // OSC-ENH-001: Try OSCOLA-specific formatters first when standard is OSCOLA
  if (isOscolaStandard(standardConfig)) {
    const oscolaFormatter = OSCOLA_DISPATCH[citation.sourceType];
    if (oscolaFormatter) {
      let runs = oscolaFormatter(citation, standardConfig);
      runs = applySignalAndCommentary(runs, citation);
      runs = applyLinkingPhrase(runs, citation.linkingPhrase, linkedCitationRuns ?? []);
      return ensurePreviewClosingPunctuation(runs);
    }
  }

  // NZLSG-ENH-001: Try NZLSG-specific formatters first when standard is NZLSG
  if (isNzlsgStandard(standardConfig.standardId)) {
    const nzlsgRuns = dispatchNzlsg(citation);
    if (nzlsgRuns !== null) {
      let runs = applySignalAndCommentary(nzlsgRuns, citation);
      runs = applyLinkingPhrase(runs, citation.linkingPhrase, linkedCitationRuns ?? []);
      return ensurePreviewClosingPunctuation(runs);
    }
  }

  const dispatcher = SOURCE_DISPATCH[citation.sourceType];
  let runs = dispatcher ? dispatcher(citation, standardConfig) : formatGenericCitation(citation);

  runs = applySignalAndCommentary(runs, citation);
  runs = applyLinkingPhrase(runs, citation.linkingPhrase, linkedCitationRuns ?? []);
  return ensurePreviewClosingPunctuation(runs);
}
