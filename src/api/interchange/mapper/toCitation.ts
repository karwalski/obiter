/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * toCitation.ts — builds an Obiter Citation from an interchange record.
 *
 * Only the dispatch contract's PRIMARY keys are written (ruleExporter
 * SOURCE_TYPE_METADATA), never aliases, so imported citations render and
 * edit exactly like ones created in the task pane. Value shapes follow the
 * dispatchers: numeric years for cases and legislation, AGLC date strings,
 * Author[] for author lists, flat strings for author, speaker and body
 * fields. Everything Obiter does not cite goes into the passthrough bag
 * under data.interchange (DECISION-038).
 */

import type { Author, Citation, SourceType } from "../../../types/citation";
import { generateCitationId } from "../../../actions/citationRequest";
import { listMissingRequiredFields } from "../../../engine/validator";
import type {
  CitationInterchangeBag,
  InterchangeCreator,
  InterchangeIssue,
  InterchangeRecord,
} from "../model";
import { INTERCHANGE_DATA_KEY, PASSTHROUGH_TEXT_CAP, issue } from "../model";
import { toAglcDateString, yearOf } from "./dates";
import { inferSourceType } from "./inferSourceType";
import type { SourceTypeInference } from "./inferSourceType";
import {
  classifyCourtOrJudges,
  composeReportCitation,
  isAustralianJurisdiction,
  jurisdictionLongForm,
  normaliseJurisdiction,
  ordinalEdition,
  parseEdition,
  parseJudicialOfficers,
  parseMnc,
  parseReportCitation,
  parseStatuteTitle,
  parseTreatySeries,
  resolveCourt,
  resolveSeries,
  splitPages,
  splitParties,
  stripCitationFromTitle,
} from "./legal";
import { creatorToAuthor, creatorsWithRole, joinCreatorsAsText } from "./names";

export interface ToCitationOptions {
  aglcVersion: "4" | "5";
  /** ISO timestamp override for tests. */
  now?: string;
  /** Force a source type (the preview's type override). */
  sourceTypeOverride?: SourceType;
}

export interface MappedCitation {
  citation: Citation;
  sourceType: SourceType;
  inference: SourceTypeInference;
  missingFields: string[];
  issues: InterchangeIssue[];
}

type Data = Record<string, unknown>;

function set(data: Data, key: string, value: unknown): void {
  if (value === undefined || value === null) return;
  if (typeof value === "string" && value.trim() === "") return;
  if (Array.isArray(value) && value.length === 0) return;
  data[key] = value;
}

function authorsOf(
  record: InterchangeRecord,
  role: InterchangeCreator["role"] = "author"
): Author[] {
  return creatorsWithRole(record.creators, role).map(creatorToAuthor);
}

function textOf(record: InterchangeRecord, role: InterchangeCreator["role"]): string {
  return joinCreatorsAsText(creatorsWithRole(record.creators, role));
}

function firstLiteral(record: InterchangeRecord): string | undefined {
  return record.creators.find((c) => c.role === "author" && c.literal)?.literal;
}

function yearValue(record: InterchangeRecord): number | undefined {
  return yearOf(record.issued) ?? yearOf(record.legal?.decidedDate);
}

function dateString(record: InterchangeRecord): string | undefined {
  return toAglcDateString(record.issued) ?? toAglcDateString(record.legal?.decidedDate);
}

function pageFirst(record: InterchangeRecord): string | undefined {
  const legal = record.legal?.firstPage;
  if (legal) return splitPages(legal).first ?? legal;
  return record.pageFirst ?? splitPages(record.pageRange).first;
}

function numericOrText(value: string | undefined): number | string | undefined {
  if (value === undefined) return undefined;
  return /^\d+$/.test(value) ? Number(value) : value;
}

// ─── Legal mapping ──────────────────────────────────────────────────────────

function mapParties(record: InterchangeRecord, data: Data, issues: InterchangeIssue[]): void {
  const legal = record.legal ?? {};
  if (legal.party1) {
    set(data, "party1", legal.party1);
    set(data, "party2", legal.party2);
    set(data, "separator", legal.separator);
    return;
  }
  const name = stripCitationFromTitle(legal.caseName ?? record.title ?? "").title;
  const split = splitParties(name);
  set(data, "party1", split.party1);
  set(data, "party2", split.party2);
  if (!split.split && name) {
    issues.push(
      issue(
        "info",
        "party-split-failed",
        `The case name "${name}" has no "v"; it was kept as a single party. Split it in Edit if the source has two parties.`,
        { field: "party2" }
      )
    );
  }
}

function mapReportedCase(record: InterchangeRecord, data: Data, issues: InterchangeIssue[]): void {
  const legal = record.legal ?? {};
  mapParties(record, data, issues);
  const embedded =
    parseReportCitation(record.passthrough.citation as string | undefined) ??
    parseReportCitation(legal.caseName) ??
    parseReportCitation(record.title) ??
    parseReportCitation(record.notes.join(" "));
  const series = resolveSeries(legal.reporter ?? record.containerTitle ?? embedded?.series);
  set(data, "reportSeries", series?.abbreviation ?? embedded?.series);
  const year = yearValue(record) ?? embedded?.year;
  set(data, "year", year);
  const yearType =
    legal.yearType ?? embedded?.yearType ?? (series?.entry?.yearOrganised ? "square" : undefined);
  set(data, "yearType", yearType);
  const volume = legal.reporterVolume ?? record.volume ?? embedded?.volume;
  set(data, "volume", numericOrText(volume));
  set(data, "startingPage", numericOrText(pageFirst(record) ?? embedded?.page));
  const court = classifyCourtOrJudges(legal.courtCode ?? legal.courtName);
  set(data, "courtId", court.courtCode);
  const judgesText = legal.judges ?? court.judges;
  if (judgesText) {
    const officers = parseJudicialOfficers(judgesText);
    if (officers) set(data, "judicialOfficers", officers);
    else {
      issues.push(
        issue(
          "info",
          "judges-unparsed",
          `The judges "${judgesText}" could not be read into officer titles; they were kept as text.`,
          { field: "judicialOfficers" }
        )
      );
      record.passthrough.judgesText = judgesText;
    }
  }
  const mnc = legal.mnc ?? parseMnc(record.notes.join(" "));
  if (mnc) set(data, "mnc", mnc.raw);
  set(data, "parallelCitations", legal.parallelCitations);
  set(data, "pinpoint", legal.pinpoint);
  if (embedded && !record.passthrough.citation) record.passthrough.citation = embedded.raw;
  if (series && !series.known) {
    issues.push(
      issue(
        "warning",
        "unknown-report-series",
        `The report series "${series.abbreviation}" is not in Obiter's tables. Check the abbreviation.`,
        { field: "reportSeries" }
      )
    );
  }
}

function mapMncCase(record: InterchangeRecord, data: Data, issues: InterchangeIssue[]): void {
  const legal = record.legal ?? {};
  mapParties(record, data, issues);
  const mnc = legal.mnc ?? parseMnc([legal.docket, record.title, ...record.notes].join(" "));
  const courtText =
    legal.courtCode ??
    (resolveSeries(legal.reporter ?? record.containerTitle)?.isCourtCode
      ? (legal.reporter ?? record.containerTitle)
      : undefined) ??
    mnc?.court;
  const court = resolveCourt(courtText) ?? resolveCourt(legal.courtName);
  set(data, "court", court?.code ?? courtText ?? legal.courtName);
  set(data, "year", mnc?.year ?? yearValue(record));
  const number = mnc?.number ?? numericOrText(legal.docket ?? record.number ?? record.volume);
  set(data, "caseNumber", number);
  set(data, "judicialOfficer", legal.judges);
  set(data, "pinpoint", legal.pinpoint);
  if (courtText && !court) {
    issues.push(
      issue(
        "warning",
        "unknown-court-code",
        `The court identifier "${courtText}" is not in Obiter's tables. Check the code.`,
        { field: "court" }
      )
    );
  }
}

function mapUnreportedCase(
  record: InterchangeRecord,
  data: Data,
  issues: InterchangeIssue[]
): void {
  const legal = record.legal ?? {};
  mapParties(record, data, issues);
  const courtInfo = classifyCourtOrJudges(legal.courtName ?? legal.courtCode);
  set(data, "court", legal.courtName ?? courtInfo.courtName ?? courtInfo.courtCode);
  const judges = legal.judges ?? courtInfo.judges;
  set(data, "judges", judges);
  set(data, "fullDate", dateString(record));
  set(data, "proceedingNumber", legal.proceedingNumber ?? legal.docket);
  set(data, "pinpoint", legal.pinpoint);
}

function mapProceeding(record: InterchangeRecord, data: Data, issues: InterchangeIssue[]): void {
  const legal = record.legal ?? {};
  mapParties(record, data, issues);
  set(data, "court", legal.courtName ?? legal.courtCode);
  set(data, "proceedingNumber", legal.proceedingNumber ?? legal.docket);
  set(data, "commencedDate", dateString(record));
}

function mapTranscript(record: InterchangeRecord, data: Data, issues: InterchangeIssue[]): void {
  const legal = record.legal ?? {};
  mapParties(record, data, issues);
  set(data, "court", legal.courtName ?? legal.courtCode);
  set(data, "date", dateString(record));
  set(data, "year", yearValue(record));
  set(data, "proceedingNumber", legal.proceedingNumber ?? legal.docket);
  set(data, "judicialOfficers", legal.judges);
  set(data, "number", numericOrText(record.number));
  if (/hcatrans/i.test(legal.courtName ?? legal.courtCode ?? "")) set(data, "hcaTranscript", true);
}

function mapSubmission(record: InterchangeRecord, data: Data, issues: InterchangeIssue[]): void {
  const legal = record.legal ?? {};
  mapParties(record, data, issues);
  set(data, "partyName", textOf(record, "author") || firstLiteral(record));
  set(
    data,
    "submissionTitle",
    (record.passthrough["submission-title"] as string | undefined) ?? record.containerTitle
  );
  set(data, "proceedingNumber", legal.proceedingNumber ?? legal.docket);
  set(data, "date", dateString(record));
}

function mapStatute(record: InterchangeRecord, data: Data, sourceType: SourceType): void {
  const legal = record.legal ?? {};
  const parsed = parseStatuteTitle(legal.actTitle ?? record.title);
  let title = parsed?.title ?? record.title ?? "";
  if (sourceType === "legislation.bill" && !/\bBill\b/.test(title) && record.kind === "bill") {
    title = `${title} Bill`;
  }
  const year = legal.actYear ?? parsed?.year ?? yearValue(record);
  const jurisdiction =
    normaliseJurisdiction(legal.jurisdiction) ??
    parsed?.jurisdiction ??
    normaliseJurisdiction(record.place);
  if (sourceType === "legislation.explanatory") {
    const m = /^((?:Revised\s+)?Explanatory (?:Memorandum|Statement|Notes?)),?\s*(.*)$/i.exec(
      record.title ?? ""
    );
    set(data, "type", m?.[1]);
    const bill = parseStatuteTitle(m?.[2] ?? "");
    set(data, "billTitle", bill?.title ?? m?.[2]);
    set(data, "billYear", bill?.year ?? year);
    set(data, "jurisdiction", bill?.jurisdiction ?? jurisdiction);
    return;
  }
  set(data, "title", title);
  set(data, "year", year);
  set(data, "jurisdiction", jurisdiction);
  set(data, "number", legal.actNumber ?? parsed?.number);
  const section = legal.section ?? parsed?.pinpoint ?? legal.pinpoint;
  if (section)
    set(
      data,
      "pinpoint",
      /^\s*(s|ss|pt|ch|sch|cl|reg|r|div)\b/i.test(section) ? section : `s ${section}`
    );
}

function mapForeign(record: InterchangeRecord, data: Data, issues: InterchangeIssue[]): void {
  const legal = record.legal ?? {};
  const isCase = record.kind === "case" || record.kind === "foreign-case";
  if (isCase) {
    set(data, "foreignSubType", "case");
    mapParties(record, data, issues);
    set(data, "title", record.title ?? legal.caseName);
    const embedded =
      parseReportCitation(record.passthrough.citation as string | undefined) ??
      parseReportCitation(record.title);
    const series = resolveSeries(legal.reporter ?? record.containerTitle ?? embedded?.series);
    set(data, "reportSeries", series?.abbreviation ?? embedded?.series);
    set(data, "year", yearValue(record) ?? embedded?.year);
    set(data, "yearType", legal.yearType ?? embedded?.yearType);
    set(data, "volume", numericOrText(legal.reporterVolume ?? record.volume ?? embedded?.volume));
    set(data, "startingPage", numericOrText(pageFirst(record) ?? embedded?.page));
    const court = resolveCourt(legal.courtCode ?? legal.courtName);
    set(data, "courtId", court?.code);
    set(data, "court", court?.fullName ?? legal.courtName);
    const mnc = legal.mnc ?? parseMnc([legal.docket, record.title].join(" "));
    if (mnc) set(data, "mnc", mnc.raw);
  } else {
    set(data, "foreignSubType", record.kind === "bill" ? "bill" : "legislation");
    const parsed = parseStatuteTitle(legal.actTitle ?? record.title);
    set(data, "title", parsed?.title ?? record.title);
    set(data, "year", legal.actYear ?? parsed?.year ?? yearValue(record));
    set(data, "chapter", record.passthrough.chapter);
    set(data, "siNumber", record.passthrough["si-number"]);
    set(data, "regnalYear", record.passthrough["regnal-year"]);
    set(data, "citationDetails", record.passthrough["citation-details"] ?? legal.history);
  }
  set(data, "jurisdiction", normaliseJurisdiction(legal.jurisdiction) ?? legal.jurisdiction);
  set(data, "pinpoint", legal.pinpoint);
}

function mapHansard(record: InterchangeRecord, data: Data): void {
  const legal = record.legal ?? {};
  const jurisdictionText = legal.jurisdiction ?? firstLiteral(record) ?? textOf(record, "author");
  const code = normaliseJurisdiction(jurisdictionText);
  set(data, "jurisdiction", code ? jurisdictionLongForm(code) : jurisdictionText);
  set(
    data,
    "chamber",
    legal.chamber ??
      (record.title && !/parliamentary debates|hansard/i.test(record.title)
        ? record.title
        : record.containerTitle)
  );
  set(data, "date", dateString(record));
  set(data, "page", pageFirst(record));
  set(data, "speaker", textOf(record, "speaker") || undefined);
}

function mapEvidence(record: InterchangeRecord, data: Data): void {
  const legal = record.legal ?? {};
  set(data, "committee", legal.committee ?? record.containerTitle);
  set(data, "parliament", legal.legislature ?? record.collectionTitle);
  set(data, "location", record.eventPlace ?? record.place);
  set(data, "date", dateString(record));
  set(data, "page", pageFirst(record));
  set(data, "witness", textOf(record, "author") || undefined);
  set(data, "title", record.title);
}

function mapTreaty(record: InterchangeRecord, data: Data, sourceType: SourceType): void {
  const legal = record.legal ?? {};
  set(data, "title", record.title);
  const parties =
    legal.parties ??
    (record.publisher
      ? record.publisher
          .split(/;|,|–/)
          .map((p) => p.trim())
          .filter(Boolean)
      : undefined);
  set(data, "parties", parties);
  set(data, "openedDate", toAglcDateString(legal.openedDate));
  set(
    data,
    "signedDate",
    toAglcDateString(legal.signedDate) ??
      (sourceType === "treaty.mou" ? dateString(record) : undefined)
  );
  set(data, "entryIntoForceDate", toAglcDateString(legal.inForceDate));
  const series = parseTreatySeries(legal.treatySeries ?? record.containerTitle);
  set(data, "treatySeries", series?.treatySeries);
  set(
    data,
    "seriesVolume",
    numericOrText(legal.seriesVolume ?? series?.seriesVolume ?? record.volume)
  );
  set(data, "startingPage", numericOrText(pageFirst(record) ?? series?.startingPage));
  if (record.passthrough["not-yet-in-force"]) set(data, "notYetInForce", true);
  set(data, "pinpoint", legal.pinpoint);
  set(data, "url", record.identifiers.url);
}

function mapUnDocument(record: InterchangeRecord, data: Data): void {
  const legal = record.legal ?? {};
  set(data, "author", (firstLiteral(record) ?? textOf(record, "author")) || undefined);
  set(data, "title", record.title);
  set(data, "resolutionNumber", legal.resolutionNumber);
  set(data, "officialRecords", legal.officialRecords);
  set(data, "session", legal.session ?? record.volume);
  set(data, "meetingNumber", legal.meetingNumber ?? record.issue);
  set(data, "agendaItem", legal.agendaItem);
  set(data, "supplement", legal.supplement);
  set(data, "documentNumber", legal.documentNumber ?? record.number);
  set(data, "date", dateString(record));
  set(data, "year", yearValue(record));
  set(data, "annex", record.passthrough.annex);
  set(data, "documentDescription", record.genre);
}

function mapGazette(record: InterchangeRecord, data: Data): void {
  const legal = record.legal ?? {};
  set(data, "gazetteType", record.genre ?? "Gazette");
  set(data, "issuingBody", (firstLiteral(record) ?? textOf(record, "author")) || undefined);
  set(data, "noticeAuthor", (firstLiteral(record) ?? textOf(record, "author")) || undefined);
  set(data, "title", record.title);
  set(data, "noticeTitle", record.title);
  set(data, "jurisdiction", normaliseJurisdiction(legal.jurisdiction) ?? legal.jurisdiction);
  set(data, "number", record.number);
  set(data, "page", pageFirst(record));
  set(data, "date", dateString(record));
}

// ─── Secondary mapping ──────────────────────────────────────────────────────

function mapAuthors(record: InterchangeRecord, data: Data, key = "authors"): void {
  const authors = authorsOf(record);
  if (authors.length > 0) set(data, key, authors);
}

function mapEditors(record: InterchangeRecord, data: Data): void {
  const editors = authorsOf(record, "editor");
  if (editors.length > 0) set(data, "editors", editors);
}

function mapBodyOrAuthors(record: InterchangeRecord, data: Data, bodyKey: string): void {
  const personal = creatorsWithRole(record.creators, "author").filter((c) => !c.literal);
  const literal = firstLiteral(record);
  if (personal.length > 0) set(data, "authors", personal.map(creatorToAuthor));
  if (literal) set(data, bodyKey, literal);
  else if (personal.length === 0 && record.institution) set(data, bodyKey, record.institution);
}

function mapEdition(
  record: InterchangeRecord,
  data: Data,
  issues: InterchangeIssue[],
  asText = false
): void {
  const parsed = parseEdition(record.edition);
  if (!parsed) return;
  if (parsed.edition !== undefined) {
    set(data, "edition", asText ? ordinalEdition(parsed.edition) : parsed.edition);
  } else {
    issues.push(
      issue(
        "info",
        "edition-unparsed",
        `The edition "${parsed.raw}" could not be read as a number; it was kept in the passthrough bag.`,
        { field: "edition" }
      )
    );
    record.passthrough.editionText = parsed.raw;
  }
  if (parsed.revised) set(data, "revised", true);
}

function mapDateAndYear(record: InterchangeRecord, data: Data, dateRequired: boolean): void {
  const year = yearValue(record);
  set(data, "year", year);
  const full = dateString(record);
  if (full && (record.issued?.month || dateRequired)) set(data, "date", full);
}

function mapSecondary(
  record: InterchangeRecord,
  data: Data,
  sourceType: SourceType,
  issues: InterchangeIssue[]
): void {
  const legal = record.legal ?? {};
  switch (sourceType) {
    case "journal.article":
    case "journal.online":
    case "journal.forthcoming":
      mapAuthors(record, data);
      set(data, "title", record.title);
      set(data, "journal", record.containerTitle);
      set(data, "year", yearValue(record) ?? record.issued?.raw);
      set(data, "volume", numericOrText(record.volume));
      set(data, "issue", record.issue);
      set(data, "startingPage", numericOrText(pageFirst(record)));
      set(data, "partNumber", record.part);
      if (record.passthrough["year-square-brackets"]) set(data, "yearOrganised", true);
      set(data, "articleNumber", record.passthrough["article-number"]);
      if (sourceType !== "journal.article") set(data, "url", record.identifiers.url);
      set(data, "pinpoint", legal.pinpoint);
      break;
    case "book":
    case "book.ebook":
    case "book.translated":
    case "book.audiobook":
      mapAuthors(record, data);
      mapEditors(record, data);
      set(data, "title", record.title);
      set(data, "publisher", record.publisher ?? record.institution);
      set(data, "year", yearValue(record) ?? record.issued?.raw);
      mapEdition(record, data, issues);
      set(data, "volume", numericOrText(record.volume));
      set(data, "translator", textOf(record, "translator") || undefined);
      set(data, "originalTitle", record.passthrough["original-title"]);
      set(data, "originalYear", record.passthrough["original-year"]);
      if (sourceType === "book.ebook") set(data, "url", record.identifiers.url);
      set(data, "pinpoint", legal.pinpoint);
      break;
    case "book.chapter":
      mapAuthors(record, data, "chapterAuthors");
      set(data, "chapterTitle", record.title);
      mapEditors(record, data);
      set(data, "bookTitle", record.containerTitle);
      set(data, "publisher", record.publisher);
      set(data, "year", yearValue(record));
      set(data, "startingPage", numericOrText(pageFirst(record)));
      set(data, "pinpoint", legal.pinpoint);
      break;
    case "report":
    case "report.abs":
    case "report.waitangi_tribunal":
      mapBodyOrAuthors(record, data, "body");
      set(data, "title", record.title);
      mapDateAndYear(record, data, true);
      set(data, "reportType", record.genre);
      set(data, "reportNumber", record.number);
      set(data, "pinpoint", legal.pinpoint);
      break;
    case "report.parliamentary":
      set(
        data,
        "committee",
        (legal.committee ?? firstLiteral(record) ?? textOf(record, "author")) || undefined
      );
      set(
        data,
        "legislature",
        legal.legislature ?? (record.passthrough.jurisdiction as string | undefined)
      );
      set(data, "title", record.title);
      set(data, "documentType", record.genre);
      set(data, "number", record.number);
      mapDateAndYear(record, data, true);
      set(data, "pinpoint", legal.pinpoint);
      break;
    case "report.law_reform":
      set(
        data,
        "commissionName",
        (record.passthrough.commission as string | undefined) ??
          firstLiteral(record) ??
          record.institution
      );
      set(data, "title", record.title);
      set(data, "documentType", record.genre);
      set(data, "number", record.number);
      mapDateAndYear(record, data, true);
      break;
    case "report.royal_commission":
      set(
        data,
        "commissionName",
        (record.passthrough.commission as string | undefined) ?? firstLiteral(record)
      );
      set(data, "title", record.title);
      set(data, "documentType", record.genre);
      set(data, "volume", numericOrText(record.volume));
      set(data, "number", record.number);
      mapDateAndYear(record, data, true);
      break;
    case "research_paper":
    case "research_paper.parliamentary":
      mapBodyOrAuthors(record, data, "institution");
      set(data, "title", record.title);
      set(data, "institution", record.institution ?? record.publisher ?? data.institution);
      set(data, "documentType", record.genre);
      set(data, "number", record.number);
      mapDateAndYear(record, data, true);
      set(data, "url", record.identifiers.url);
      break;
    case "conference_paper":
      mapAuthors(record, data);
      set(data, "title", record.title);
      set(data, "conferenceName", record.event ?? record.containerTitle);
      set(data, "documentType", record.genre);
      set(data, "date", toAglcDateString(record.eventDate) ?? dateString(record));
      set(data, "year", yearValue(record));
      break;
    case "thesis":
      mapAuthors(record, data);
      set(data, "title", record.title);
      set(data, "thesisType", normaliseThesisType(record.genre, record.provenance.rawType));
      set(data, "university", record.institution ?? record.publisher);
      mapDateAndYear(record, data, false);
      break;
    case "speech":
      set(
        data,
        "speaker",
        textOf(record, "speaker") || textOf(record, "author") || firstLiteral(record)
      );
      set(data, "title", record.title);
      set(data, "event", record.event ?? record.containerTitle ?? record.eventPlace);
      set(data, "speechType", record.genre);
      set(data, "date", dateString(record));
      break;
    case "press_release":
      mapBodyOrAuthors(record, data, "body");
      set(data, "title", record.title);
      set(data, "releaseType", record.genre);
      set(data, "documentNumber", record.number);
      set(data, "issuingBody", record.publisher ?? record.institution);
      set(data, "date", dateString(record));
      break;
    case "newspaper":
      mapAuthors(record, data);
      set(data, "title", record.title);
      set(data, "newspaper", record.containerTitle);
      set(data, "date", dateString(record));
      set(data, "place", record.place);
      set(data, "page", pageFirst(record));
      if (record.identifiers.url && !pageFirst(record)) set(data, "isElectronic", true);
      set(data, "url", record.identifiers.url);
      break;
    case "periodical":
      set(data, "author", textOf(record, "author") || firstLiteral(record));
      set(data, "title", record.title);
      set(data, "periodicalName", record.containerTitle);
      set(data, "datePeriod", record.issued?.raw ?? dateString(record));
      set(data, "page", pageFirst(record));
      break;
    case "internet_material":
      mapAuthors(record, data);
      if (!data.authors) set(data, "author", firstLiteral(record));
      set(data, "title", record.title);
      set(data, "websiteName", record.containerTitle ?? record.publisher);
      set(
        data,
        "documentType",
        record.kind === "blog" ? (record.genre ?? "Blog Post") : record.genre
      );
      set(data, "date", dateString(record));
      set(data, "url", record.identifiers.url);
      set(data, "archivedUrl", record.passthrough["archived-url"]);
      break;
    case "social_media":
      set(data, "author", textOf(record, "author") || firstLiteral(record));
      set(data, "title", record.title);
      set(
        data,
        "platform",
        (record.passthrough.platform as string | undefined) ??
          record.containerTitle ??
          record.publisher
      );
      set(data, "date", dateString(record));
      set(data, "time", record.passthrough.time);
      set(data, "url", record.identifiers.url);
      break;
    case "correspondence":
      set(data, "type", record.genre ?? record.title);
      set(data, "sender", textOf(record, "author") || firstLiteral(record));
      set(data, "recipient", textOf(record, "recipient") || undefined);
      set(data, "date", dateString(record));
      break;
    case "interview":
      set(
        data,
        "interviewee",
        textOf(record, "interviewee") || textOf(record, "author") || firstLiteral(record)
      );
      set(
        data,
        "interviewer",
        textOf(record, "interviewer") || textOf(record, "editor") || undefined
      );
      set(data, "location", record.eventPlace ?? record.place ?? record.containerTitle);
      set(data, "date", dateString(record));
      set(data, "interviewType", record.genre);
      break;
    case "film_tv_media": {
      const medium =
        record.medium ??
        (record.kind === "podcast"
          ? "Podcast"
          : record.kind === "broadcast"
            ? "Television"
            : "Film");
      set(data, "medium", medium);
      if (record.containerTitle) {
        set(data, "episodeTitle", record.title);
        set(data, "seriesTitle", record.containerTitle);
        set(data, "title", record.containerTitle);
      } else {
        set(data, "title", record.title);
      }
      set(data, "productionCompany", record.publisher);
      set(data, "producer", record.kind === "podcast" ? record.publisher : undefined);
      set(data, "director", textOf(record, "director") || undefined);
      set(data, "year", yearValue(record));
      set(data, "date", record.issued?.month ? dateString(record) : undefined);
      set(data, "versionDetails", record.passthrough["version-details"]);
      set(data, "seasonNumber", record.volume);
      set(data, "episodeNumber", record.issue);
      set(data, "url", record.identifiers.url);
      break;
    }
    case "dictionary":
      set(data, "title", record.title);
      set(data, "entry", (record.passthrough.entry as string | undefined) ?? record.containerTitle);
      mapEdition(record, data, issues, true);
      set(data, "year", yearValue(record));
      set(data, "retrievedDate", toAglcDateString(record.accessed));
      set(data, "definitionNumber", record.passthrough["definition-number"]);
      break;
    case "legal_encyclopedia":
      set(data, "publisher", record.publisher);
      set(data, "title", record.title);
      set(data, "volume", numericOrText(record.volume));
      set(data, "date", dateString(record));
      set(data, "retrievedDate", toAglcDateString(record.accessed));
      set(data, "titleName", record.containerTitle);
      set(data, "titleNumber", record.number);
      set(data, "topic", legal.section);
      set(data, "paragraph", pageFirst(record));
      break;
    case "looseleaf":
      mapAuthors(record, data);
      set(data, "publisher", record.publisher ?? record.containerTitle);
      set(data, "title", record.title);
      set(data, "volume", numericOrText(record.volume));
      set(
        data,
        "date",
        (record.passthrough["service-or-date"] as string | undefined) ?? dateString(record)
      );
      set(data, "retrievedDate", toAglcDateString(record.accessed));
      set(data, "paragraph", pageFirst(record));
      break;
    case "dataset":
      set(data, "creator", textOf(record, "author") || firstLiteral(record));
      set(data, "title", record.title);
      set(data, "repository", record.publisher ?? record.institution);
      set(data, "year", yearValue(record));
      set(data, "version", record.passthrough.version ?? record.edition);
      set(data, "doi", record.identifiers.doi);
      set(data, "persistentId", record.identifiers.url);
      set(data, "accessDate", toAglcDateString(record.accessed));
      break;
    case "software":
      set(data, "author", textOf(record, "author") || firstLiteral(record));
      set(data, "title", record.title);
      set(data, "year", yearValue(record));
      set(data, "versionOrCommit", record.passthrough.version ?? record.edition);
      set(data, "designation", record.genre);
      set(data, "host", record.publisher);
      set(data, "url", record.identifiers.url);
      break;
    case "genai_output":
      set(data, "platform", record.publisher ?? textOf(record, "author") ?? firstLiteral(record));
      set(data, "model", record.genre ?? record.title);
      set(data, "modelVersion", record.edition);
      set(data, "outputDate", dateString(record));
      set(data, "url", record.identifiers.url);
      set(data, "prompt", record.passthrough.prompt);
      break;
    case "submission.government":
      mapBodyOrAuthors(record, data, "body");
      set(data, "committee", legal.committee ?? record.containerTitle);
      set(data, "inquiry", record.collectionTitle);
      set(data, "number", record.number);
      set(data, "documentType", record.genre);
      set(data, "date", dateString(record));
      break;
    case "custom":
    default:
      set(data, "customText", composeCustomText(record));
      break;
  }
}

function normaliseThesisType(genre: string | undefined, rawType: string): string | undefined {
  const text = (genre ?? rawType).toLowerCase();
  if (/phd|doctor|dphil|sjd/.test(text)) return "PhD Thesis";
  if (/master|llm|mphil/.test(text)) return "Masters Thesis";
  if (/honours|hons/.test(text)) return "Honours Thesis";
  if (/thesis|dissertation/.test(text)) return genre;
  return genre;
}

function composeCustomText(record: InterchangeRecord): string {
  const authors = joinCreatorsAsText(creatorsWithRole(record.creators, "author"));
  const details = [record.publisher, yearValue(record)].filter(Boolean).join(", ");
  const parts = [authors, record.title].filter(Boolean).join(", ");
  const url = record.identifiers.url ? ` <${record.identifiers.url}>` : "";
  return `${parts}${details ? ` (${details})` : ""}${url}`.trim();
}

// ─── Passthrough bag ────────────────────────────────────────────────────────

function truncate(
  text: string | undefined,
  issues: InterchangeIssue[],
  field: string
): string | undefined {
  if (!text) return undefined;
  if (text.length <= PASSTHROUGH_TEXT_CAP) return text;
  issues.push(
    issue(
      "info",
      "passthrough-truncated",
      `Some metadata was not kept (${field} longer than 8 KB).`,
      { field }
    )
  );
  return text.slice(0, PASSTHROUGH_TEXT_CAP);
}

function buildBag(
  record: InterchangeRecord,
  issues: InterchangeIssue[],
  now: string
): CitationInterchangeBag {
  const bag: CitationInterchangeBag = {
    v: 1,
    provenance: { ...record.provenance, importedAt: now },
  };
  const ids = { ...record.identifiers };
  delete ids.urls;
  if (Object.values(ids).some(Boolean)) bag.identifiers = ids;
  if (record.keywords.length > 0) bag.keywords = record.keywords;
  const abstract = truncate(record.abstract, issues, "abstract");
  if (abstract) bag.abstract = abstract;
  const notes = record.notes.filter(
    (n) => !/^(obiter-id|obiter-type|AGLC4 (footnote|bibliography)):/.test(n)
  );
  if (notes.length > 0) {
    const joined = truncate(notes.join("\n"), issues, "notes");
    bag.notes = joined ? joined.split("\n") : undefined;
  }
  if (record.language) bag.language = record.language;
  if (record.accessed?.year) bag.accessed = toAglcDateString(record.accessed);
  const passthrough: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(record.passthrough)) {
    if (/^(L1|L2|file|pdf-urls|attachments)$/i.test(key)) continue;
    passthrough[key] = value;
  }
  if (Object.keys(passthrough).length > 0) bag.passthrough = passthrough;
  return bag;
}

// ─── Entry point ────────────────────────────────────────────────────────────

/** Builds a citation for a record; never throws. */
export function mapRecordToCitation(
  record: InterchangeRecord,
  options: ToCitationOptions
): MappedCitation {
  const issues: InterchangeIssue[] = [];
  const inference = options.sourceTypeOverride
    ? {
        sourceType: options.sourceTypeOverride,
        confidence: 1,
        reasons: ["Chosen in the preview"],
        issues: [],
      }
    : inferSourceType(record);
  issues.push(...inference.issues);
  const sourceType = inference.sourceType;
  const data: Data = {};

  if (sourceType.startsWith("foreign.")) mapForeign(record, data, issues);
  else if (
    sourceType === "case.reported" ||
    sourceType === "case.court_order" ||
    sourceType === "case.quasi_judicial"
  )
    mapReportedCase(record, data, issues);
  else if (sourceType === "case.unreported.mnc") mapMncCase(record, data, issues);
  else if (sourceType === "case.unreported.no_mnc") mapUnreportedCase(record, data, issues);
  else if (sourceType === "case.proceeding") mapProceeding(record, data, issues);
  else if (sourceType === "case.transcript") mapTranscript(record, data, issues);
  else if (sourceType === "case.submission") mapSubmission(record, data, issues);
  else if (sourceType === "case.arbitration") {
    set(data, "awardDescription", record.genre ?? record.containerTitle ?? record.title);
    set(data, "parties", record.title ?? record.legal?.caseName);
    set(data, "forum", record.legal?.courtName ?? record.place);
    set(data, "caseNumber", record.legal?.docket ?? record.number);
    set(data, "date", dateString(record));
    set(data, "reportedIn", record.collectionTitle);
  } else if (sourceType.startsWith("legislation.") && sourceType !== "legislation.quasi")
    mapStatute(record, data, sourceType);
  else if (sourceType === "legislation.quasi") mapGazette(record, data);
  else if (sourceType === "hansard" || sourceType === "constitutional_convention")
    mapHansard(record, data);
  else if (sourceType === "evidence.parliamentary") mapEvidence(record, data);
  else if (sourceType === "treaty" || sourceType === "treaty.mou")
    mapTreaty(record, data, sourceType);
  else if (
    sourceType.startsWith("un.") ||
    sourceType.startsWith("wto.") ||
    sourceType === "gatt.document"
  )
    mapUnDocument(record, data);
  else if (
    sourceType.startsWith("icj.") ||
    sourceType.startsWith("arbitral.") ||
    sourceType === "icc_tribunal.case" ||
    sourceType === "eu.court" ||
    sourceType === "echr.decision" ||
    sourceType === "supranational.decision" ||
    sourceType === "wto.decision"
  ) {
    const legal = record.legal ?? {};
    set(data, "caseName", legal.caseName ?? record.title);
    set(data, "title", record.title);
    set(data, "parties", legal.parties?.join(", ") ?? legal.party1);
    set(data, "phase", record.passthrough.phase);
    set(data, "reportSeries", legal.reporter ?? record.containerTitle);
    set(data, "court", legal.courtName);
    set(data, "volume", numericOrText(legal.reporterVolume ?? record.volume));
    set(data, "caseNumber", legal.docket ?? record.number);
    set(data, "startingPage", numericOrText(pageFirst(record)));
    set(data, "date", dateString(record));
    set(data, "year", yearValue(record));
    set(data, "documentNumber", legal.documentNumber);
    set(data, "documentDescription", record.genre);
  } else mapSecondary(record, data, sourceType, issues);

  if (
    record.kind === "case" &&
    sourceType.startsWith("case.") &&
    record.legal?.mnc &&
    sourceType === "case.reported" &&
    !data.mnc
  ) {
    set(data, "mnc", record.legal.mnc.raw);
  }
  if (
    record.kind === "case" &&
    record.legal?.mnc &&
    record.legal.reporter &&
    sourceType === "case.reported"
  ) {
    issues.push(
      issue(
        "info",
        "ambiguous-case-form",
        "Both a report citation and a medium neutral citation were supplied; the reported form was used and the medium neutral citation kept as a parallel."
      )
    );
  }

  const now = options.now ?? new Date().toISOString();
  data[INTERCHANGE_DATA_KEY] = buildBag(record, issues, now);

  const tags = ["import", `import:${record.provenance.format}`];
  if (record.provenance.format === "bibtex") tags.push("imported-from-bibtex");
  if (record.provenance.format === "word-sources-xml") tags.push("imported-from-word");

  const citation: Citation = {
    id: record.provenance.obiterId ?? generateCitationId(),
    aglcVersion: options.aglcVersion,
    sourceType,
    data,
    ...(record.shortTitle ? { shortTitle: record.shortTitle } : {}),
    tags,
    createdAt: now,
    modifiedAt: now,
  };

  const missingFields = listMissingRequiredFields(sourceType, data);
  if (missingFields.length > 0) {
    citation.tags.push("import:needs-details");
    issues.push(
      issue(
        "warning",
        "missing-required",
        `${missingFields.length} required field${missingFields.length === 1 ? "" : "s"} missing: ${missingFields.join(", ")}.`
      )
    );
  }

  return { citation, sourceType, inference, missingFields, issues };
}

/** Composes the citation string a reported case carried, for round trips. */
export function reportCitationOf(data: Data): string | undefined {
  if (!data.reportSeries || !data.year) return undefined;
  return composeReportCitation({
    year: data.year as number,
    yearType: data.yearType as "round" | "square" | undefined,
    volume: data.volume as string | number | undefined,
    series: String(data.reportSeries),
    page: (data.startingPage as string | number | undefined) ?? "",
  });
}

export { isAustralianJurisdiction };
