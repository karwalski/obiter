/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * fromCitation.ts — builds an interchange record from an Obiter citation
 * for export. Reads through the shared alias table so citations created by
 * older versions (journalName, caseName, courtIdentifier) still export.
 */

import type { Author, Citation } from "../../../types/citation";
import { readFieldWithAliases } from "../../../engine/fieldAliases";
import { normaliseAuthorList } from "../../../engine/rules/v4/secondary/authors";
import type { JudicialOfficerRef } from "../../../engine/rules/v4/domestic/cases-supplementary";
import type {
  CitationInterchangeBag,
  CreatorRole,
  InterchangeDate,
  InterchangeFormat,
  InterchangeFormatted,
  InterchangeRecord,
} from "../model";
import { INTERCHANGE_DATA_KEY, createRecord } from "../model";
import { fromAglcDateString } from "./dates";
import { sourceTypeToKind } from "./kinds";
import {
  formatJudicialOfficers,
  joinParties,
  jurisdictionLongForm,
  normaliseJurisdiction,
} from "./legal";
import { authorToCreator, parseFreeTextCreators } from "./names";

export interface FromCitationOptions {
  /** The format the record is being written to. */
  format: InterchangeFormat;
  formatted?: InterchangeFormatted;
}

type Data = Record<string, unknown>;

function str(data: Data, key: string): string | undefined {
  const value = readFieldWithAliases(data, key);
  if (value === undefined || value === null) return undefined;
  if (typeof value === "object") return undefined;
  return String(value);
}

function date(data: Data, ...keys: string[]): InterchangeDate | undefined {
  for (const key of keys) {
    const parsed = fromAglcDateString(str(data, key));
    if (parsed) return parsed;
  }
  return undefined;
}

function creators(data: Data, key: string, role: CreatorRole): InterchangeRecord["creators"] {
  const value = readFieldWithAliases(data, key);
  if (value === undefined) return [];
  if (Array.isArray(value) || typeof value === "object") {
    return normaliseAuthorList(value).map((a: Author) => authorToCreator(a, role));
  }
  return parseFreeTextCreators(String(value), role);
}

function bagOf(data: Data): CitationInterchangeBag | undefined {
  const bag = data[INTERCHANGE_DATA_KEY];
  if (bag && typeof bag === "object" && (bag as CitationInterchangeBag).v === 1)
    return bag as CitationInterchangeBag;
  return undefined;
}

/** Builds an interchange record from a citation. */
export function mapCitationToRecord(
  citation: Citation,
  options: FromCitationOptions
): InterchangeRecord {
  const data = citation.data as Data;
  const bag = bagOf(data);
  const kind = sourceTypeToKind(citation.sourceType, data);
  const record = createRecord(kind, {
    format: options.format,
    sourceLabel: "Obiter",
    rawType: citation.sourceType,
    rawId: citation.id,
    obiterId: citation.id,
    obiterSourceType: citation.sourceType,
  });
  record.shortTitle = citation.shortTitle;
  if (options.formatted) record.formatted = options.formatted;

  if (bag) {
    if (bag.identifiers) record.identifiers = { ...bag.identifiers };
    if (bag.keywords) record.keywords = [...bag.keywords];
    if (bag.abstract) record.abstract = bag.abstract;
    if (bag.notes) record.notes = [...bag.notes];
    if (bag.language) record.language = bag.language;
    if (bag.accessed) record.accessed = fromAglcDateString(bag.accessed);
    if (bag.passthrough && bag.provenance.format === options.format) {
      record.passthrough = { ...bag.passthrough };
    }
  }
  if (citation.tags.length > 0) {
    for (const tag of citation.tags) {
      if (!tag.startsWith("import")) record.keywords.push(`obiter-tag:${tag}`);
    }
  }

  const st = citation.sourceType;
  const legal: NonNullable<InterchangeRecord["legal"]> = {};
  const pinpoint = str(data, "pinpoint");
  if (pinpoint) legal.pinpoint = pinpoint;

  if (
    st.startsWith("case.") ||
    (st.startsWith("foreign.") && str(data, "foreignSubType") === "case")
  ) {
    legal.party1 = str(data, "party1");
    legal.party2 = str(data, "party2");
    legal.separator = str(data, "separator");
    legal.caseName = joinParties(legal.party1, legal.party2, legal.separator) || str(data, "title");
    record.title = legal.caseName;
    legal.reporter = str(data, "reportSeries");
    record.containerTitle = legal.reporter;
    legal.reporterVolume = str(data, "volume");
    record.volume = legal.reporterVolume;
    legal.firstPage = str(data, "startingPage");
    record.pageFirst = legal.firstPage;
    const yearType = str(data, "yearType");
    if (yearType === "square" || yearType === "round") legal.yearType = yearType;
    legal.courtCode =
      str(data, "courtId") ?? (st === "case.unreported.mnc" ? str(data, "court") : undefined);
    legal.courtName = st === "case.unreported.mnc" ? undefined : str(data, "court");
    const officers = data.judicialOfficers;
    if (Array.isArray(officers) && officers.length > 0 && typeof officers[0] === "object") {
      legal.judges = formatJudicialOfficers(officers as JudicialOfficerRef[]);
    } else {
      legal.judges =
        str(data, "judges") ??
        str(data, "judicialOfficer") ??
        (typeof officers === "string" ? officers : undefined);
    }
    const year = Number(str(data, "year"));
    if (st === "case.unreported.mnc" && legal.courtCode && str(data, "caseNumber")) {
      const number = Number(str(data, "caseNumber"));
      legal.mnc = {
        year,
        court: legal.courtCode,
        number,
        raw: `[${year}] ${legal.courtCode} ${number}`,
      };
      legal.docket = String(number);
    }
    const mnc = str(data, "mnc");
    if (mnc && !legal.mnc) record.passthrough.mnc = mnc;
    legal.proceedingNumber = str(data, "proceedingNumber");
    if (!Number.isNaN(year) && year > 0) record.issued = { year };
    const decided = date(data, "fullDate", "date", "commencedDate");
    if (decided) {
      legal.decidedDate = decided;
      record.issued = decided;
    }
    const parallel = data.parallelCitations;
    if (Array.isArray(parallel) && parallel.length > 0) {
      legal.parallelCitations = parallel.map((p) =>
        typeof p === "string" ? p : JSON.stringify(p)
      );
    }
    legal.jurisdiction = str(data, "jurisdiction");
    record.number = str(data, "number");
    if (st === "case.submission") {
      record.creators.push(...parseFreeTextCreators(str(data, "partyName") ?? "", "author"));
      record.containerTitle = str(data, "submissionTitle");
    }
    if (st === "case.arbitration") {
      record.title = str(data, "parties") ?? str(data, "awardDescription");
      record.genre = str(data, "awardDescription");
      legal.courtName = str(data, "forum");
      legal.docket = str(data, "caseNumber");
    }
  } else if (st.startsWith("legislation.") && st !== "legislation.quasi") {
    if (st === "legislation.explanatory") {
      record.title = [
        str(data, "type") ?? "Explanatory Memorandum",
        str(data, "billTitle"),
        str(data, "billYear"),
      ]
        .filter(Boolean)
        .join(" ");
      legal.actTitle = str(data, "billTitle");
      legal.actYear = Number(str(data, "billYear")) || undefined;
    } else {
      legal.actTitle = str(data, "title");
      legal.actYear = Number(str(data, "year")) || undefined;
      legal.actNumber = str(data, "number");
      const jurisdiction = str(data, "jurisdiction");
      record.title = [
        legal.actTitle,
        legal.actNumber,
        legal.actYear,
        jurisdiction ? `(${jurisdiction})` : undefined,
      ]
        .filter(Boolean)
        .join(" ");
    }
    legal.jurisdiction = str(data, "jurisdiction");
    if (legal.actYear) record.issued = { year: legal.actYear };
    const section = /^\s*s\s+(.+)$/.exec(pinpoint ?? "");
    if (section) legal.section = section[1];
  } else if (st.startsWith("foreign.")) {
    legal.actTitle = str(data, "title");
    legal.actYear = Number(str(data, "year")) || undefined;
    legal.jurisdiction = str(data, "jurisdiction");
    record.title = [
      legal.actTitle,
      legal.actYear,
      legal.jurisdiction ? `(${legal.jurisdiction})` : undefined,
    ]
      .filter(Boolean)
      .join(" ");
    if (legal.actYear) record.issued = { year: legal.actYear };
    const chapter = str(data, "chapter");
    if (chapter) record.passthrough.chapter = chapter;
    const details = str(data, "citationDetails");
    if (details) record.passthrough["citation-details"] = details;
  } else if (st === "legislation.quasi") {
    record.title = str(data, "noticeTitle") ?? str(data, "title");
    record.genre = str(data, "gazetteType") ?? str(data, "documentType");
    record.creators.push(
      ...parseFreeTextCreators(
        str(data, "noticeAuthor") ?? str(data, "issuingBody") ?? "",
        "author"
      )
    );
    legal.jurisdiction = str(data, "jurisdiction") ?? str(data, "bodyJurisdiction");
    record.number = str(data, "number");
    record.pageFirst = str(data, "page");
    record.issued =
      date(data, "date") ?? (str(data, "year") ? { year: Number(str(data, "year")) } : undefined);
  } else if (st === "hansard" || st === "constitutional_convention") {
    const jurisdiction = str(data, "jurisdiction");
    legal.jurisdiction = jurisdiction;
    legal.chamber = str(data, "chamber");
    record.title = legal.chamber;
    record.containerTitle = "Parliamentary Debates";
    if (jurisdiction)
      record.creators.push({
        role: "author",
        raw: jurisdiction,
        literal: jurisdictionLongForm(normaliseJurisdiction(jurisdiction) ?? jurisdiction),
      });
    const speaker = str(data, "speaker");
    if (speaker) record.creators.push(...parseFreeTextCreators(speaker, "speaker"));
    record.pageFirst = str(data, "page");
    record.issued = date(data, "date");
  } else if (st === "evidence.parliamentary") {
    legal.committee = str(data, "committee");
    legal.legislature = str(data, "parliament");
    record.containerTitle = legal.committee;
    record.collectionTitle = legal.legislature;
    record.title = str(data, "title") ?? "Evidence to " + (legal.committee ?? "committee");
    record.eventPlace = str(data, "location");
    record.pageFirst = str(data, "page");
    record.issued = date(data, "date");
    const witness = str(data, "witness");
    if (witness) record.creators.push(...parseFreeTextCreators(witness, "author"));
  } else if (st === "treaty" || st === "treaty.mou") {
    record.title = str(data, "title");
    const parties = data.parties;
    legal.parties = Array.isArray(parties)
      ? parties.map(String)
      : typeof parties === "string"
        ? parties
            .split(/,|;/)
            .map((p) => p.trim())
            .filter(Boolean)
        : undefined;
    legal.openedDate = date(data, "openedDate");
    legal.signedDate = date(data, "signedDate");
    legal.inForceDate = date(data, "entryIntoForceDate");
    legal.treatySeries =
      [str(data, "seriesVolume"), str(data, "treatySeries"), str(data, "startingPage")]
        .filter(Boolean)
        .join(" ") || undefined;
    legal.seriesVolume = str(data, "seriesVolume");
    record.containerTitle = str(data, "treatySeries");
    record.volume = legal.seriesVolume;
    record.pageFirst = str(data, "startingPage");
    record.issued = legal.openedDate ?? legal.signedDate;
    if (data.notYetInForce) record.passthrough["not-yet-in-force"] = "true";
    record.identifiers.url = str(data, "url") ?? record.identifiers.url;
  } else if (st.startsWith("un.") || st.startsWith("wto.") || st === "gatt.document") {
    record.creators.push(...parseFreeTextCreators(str(data, "author") ?? "", "author"));
    record.title = str(data, "title");
    legal.resolutionNumber = str(data, "resolutionNumber");
    legal.officialRecords = str(data, "officialRecords");
    legal.session = str(data, "session");
    legal.meetingNumber = str(data, "meetingNumber");
    legal.agendaItem = str(data, "agendaItem");
    legal.supplement = str(data, "supplement");
    legal.documentNumber = str(data, "documentNumber");
    record.number = legal.documentNumber;
    record.genre = str(data, "documentDescription");
    record.issued =
      date(data, "date") ?? (str(data, "year") ? { year: Number(str(data, "year")) } : undefined);
  } else if (
    st.startsWith("icj.") ||
    st.startsWith("arbitral.") ||
    st === "icc_tribunal.case" ||
    st === "eu.court" ||
    st === "echr.decision" ||
    st === "supranational.decision"
  ) {
    legal.caseName = str(data, "caseName") ?? str(data, "title");
    record.title = legal.caseName;
    const parties = str(data, "parties");
    if (parties)
      legal.parties = parties
        .split(/,|;/)
        .map((p) => p.trim())
        .filter(Boolean);
    legal.reporter = str(data, "reportSeries");
    record.containerTitle = legal.reporter;
    legal.courtName = str(data, "court");
    legal.reporterVolume = str(data, "volume");
    record.volume = legal.reporterVolume;
    legal.docket = str(data, "caseNumber");
    legal.firstPage = str(data, "startingPage");
    record.pageFirst = legal.firstPage;
    record.issued =
      date(data, "date") ?? (str(data, "year") ? { year: Number(str(data, "year")) } : undefined);
    const phase = str(data, "phase");
    if (phase) record.passthrough.phase = phase;
  } else {
    mapSecondaryToRecord(citation, data, record);
  }

  if (Object.values(legal).some((v) => v !== undefined)) record.legal = legal;

  // AGLC-only fields (pinpoint, year bracket type, court identifier, treaty
  // dates, judicial officers) have no slot in any reference manager. Carry
  // every own data key as an "obiter-field" note line so a re-import into
  // Obiter restores the citation exactly (DECISION-038 item 4).
  for (const [key, value] of Object.entries(data)) {
    if (key === INTERCHANGE_DATA_KEY || value === undefined || value === null || value === "")
      continue;
    record.notes.push(`${FIELD_NOTE_PREFIX}${key}: ${JSON.stringify(value)}`);
  }
  return record;
}

/** Prefix of the note lines that carry Obiter data keys through an export. */
export const FIELD_NOTE_PREFIX = "obiter-field:";

function mapSecondaryToRecord(citation: Citation, data: Data, record: InterchangeRecord): void {
  const st = citation.sourceType;
  const push = (key: string, role: CreatorRole): void => {
    record.creators.push(...creators(data, key, role));
  };
  const year = str(data, "year");
  const issued = date(data, "date") ?? (year ? fromAglcDateString(year) : undefined);
  record.issued = issued;
  record.accessed = date(data, "retrievedDate", "accessDate") ?? record.accessed;
  record.identifiers.url = str(data, "url") ?? record.identifiers.url;

  switch (st) {
    case "journal.article":
    case "journal.online":
    case "journal.forthcoming":
      push("authors", "author");
      record.title = str(data, "title");
      record.containerTitle = str(data, "journal");
      record.volume = str(data, "volume");
      record.issue = str(data, "issue");
      record.pageFirst = str(data, "startingPage");
      record.part = str(data, "partNumber");
      if (data.yearOrganised) record.passthrough["year-square-brackets"] = "true";
      if (str(data, "articleNumber"))
        record.passthrough["article-number"] = str(data, "articleNumber") as string;
      if (st === "journal.forthcoming") record.genre = "forthcoming";
      break;
    case "book":
    case "book.ebook":
    case "book.translated":
    case "book.audiobook":
      push("authors", "author");
      push("editors", "editor");
      push("translator", "translator");
      record.title = str(data, "title");
      record.publisher = str(data, "publisher");
      record.edition = str(data, "edition");
      if (data.revised) record.edition = `${record.edition ?? ""} rev`.trim();
      record.volume = str(data, "volume");
      if (st === "book.ebook") record.medium = "ebook";
      if (st === "book.audiobook") record.medium = "audiobook";
      if (str(data, "originalTitle"))
        record.passthrough["original-title"] = str(data, "originalTitle") as string;
      if (str(data, "originalYear"))
        record.passthrough["original-year"] = str(data, "originalYear") as string;
      break;
    case "book.chapter":
      push("chapterAuthors", "author");
      push("editors", "editor");
      record.title = str(data, "chapterTitle");
      record.containerTitle = str(data, "bookTitle");
      record.publisher = str(data, "publisher");
      record.pageFirst = str(data, "startingPage");
      break;
    case "report":
    case "report.abs":
    case "report.waitangi_tribunal":
      push("authors", "author");
      bodyCreator(record, str(data, "body") ?? str(data, "institutionalAuthor"));
      record.title = str(data, "title");
      record.genre = str(data, "reportType") ?? str(data, "documentType");
      record.number = str(data, "reportNumber") ?? str(data, "number");
      break;
    case "report.parliamentary":
      bodyCreator(record, str(data, "committee"));
      record.legal = { committee: str(data, "committee"), legislature: str(data, "legislature") };
      record.title = str(data, "title");
      record.genre = str(data, "documentType");
      record.number = str(data, "number");
      break;
    case "report.law_reform":
    case "report.royal_commission":
      bodyCreator(record, str(data, "commissionName"));
      if (str(data, "commissionName"))
        record.passthrough.commission = str(data, "commissionName") as string;
      record.title = str(data, "title");
      record.genre = str(data, "documentType") ?? "Report";
      record.number = str(data, "number") ?? str(data, "reportNumber");
      record.volume = str(data, "volume");
      break;
    case "research_paper":
    case "research_paper.parliamentary":
      push("authors", "author");
      record.title = str(data, "title");
      record.institution = str(data, "institution");
      record.genre = str(data, "documentType");
      record.number = str(data, "number");
      break;
    case "conference_paper":
      push("authors", "author");
      record.title = str(data, "title");
      record.event = str(data, "conferenceName");
      record.genre = str(data, "documentType");
      record.eventDate = date(data, "date");
      break;
    case "thesis":
      push("authors", "author");
      record.title = str(data, "title");
      record.genre = str(data, "thesisType");
      record.institution = str(data, "university");
      break;
    case "speech":
      push("speaker", "speaker");
      record.title = str(data, "title");
      record.event = str(data, "event");
      record.genre = str(data, "speechType");
      break;
    case "press_release":
      push("authors", "author");
      bodyCreator(record, str(data, "body"));
      record.title = str(data, "title");
      record.genre = str(data, "releaseType");
      record.number = str(data, "documentNumber");
      record.publisher = str(data, "issuingBody");
      break;
    case "newspaper":
      push("authors", "author");
      record.title = str(data, "title");
      record.containerTitle = str(data, "newspaper");
      record.place = str(data, "place");
      record.pageFirst = str(data, "page");
      break;
    case "periodical":
      push("author", "author");
      record.title = str(data, "title");
      record.containerTitle = str(data, "periodicalName");
      record.issued = fromAglcDateString(str(data, "datePeriod"));
      record.pageFirst = str(data, "page");
      break;
    case "internet_material":
      push("authors", "author");
      record.title = str(data, "title");
      record.containerTitle = str(data, "websiteName");
      record.genre = str(data, "documentType");
      if (str(data, "archivedUrl"))
        record.passthrough["archived-url"] = str(data, "archivedUrl") as string;
      break;
    case "social_media":
      push("author", "author");
      record.title = str(data, "title");
      record.containerTitle = str(data, "platform");
      record.passthrough.platform = str(data, "platform") ?? "";
      if (str(data, "time")) record.passthrough.time = str(data, "time") as string;
      break;
    case "correspondence":
      push("sender", "author");
      push("recipient", "recipient");
      record.genre = str(data, "type") ?? "Letter";
      record.title = record.genre;
      break;
    case "interview":
      push("interviewee", "interviewee");
      push("interviewer", "interviewer");
      record.eventPlace = str(data, "location");
      record.genre = str(data, "interviewType");
      record.title = `Interview with ${str(data, "interviewee") ?? ""}`.trim();
      break;
    case "film_tv_media":
      record.title = str(data, "episodeTitle") ?? str(data, "title");
      record.containerTitle = str(data, "seriesTitle");
      record.medium = str(data, "medium");
      record.publisher =
        str(data, "productionCompany") ?? str(data, "network") ?? str(data, "producer");
      push("director", "director");
      record.volume = str(data, "seasonNumber");
      record.issue = str(data, "episodeNumber");
      if (str(data, "versionDetails"))
        record.passthrough["version-details"] = str(data, "versionDetails") as string;
      break;
    case "dictionary":
      record.title = str(data, "title");
      record.passthrough.entry = str(data, "entry") ?? "";
      record.containerTitle = str(data, "entry");
      record.edition = str(data, "edition");
      if (str(data, "definitionNumber"))
        record.passthrough["definition-number"] = str(data, "definitionNumber") as string;
      break;
    case "legal_encyclopedia":
      record.publisher = str(data, "publisher");
      record.title = str(data, "title");
      record.volume = str(data, "volume");
      record.containerTitle = str(data, "titleName");
      record.number = str(data, "titleNumber");
      record.pageFirst = str(data, "paragraph");
      record.legal = { section: str(data, "topic") };
      break;
    case "looseleaf":
      push("authors", "author");
      record.publisher = str(data, "publisher");
      record.title = str(data, "title");
      record.volume = str(data, "volume");
      record.pageFirst = str(data, "paragraph");
      break;
    case "dataset":
      push("creator", "author");
      record.title = str(data, "title");
      record.publisher = str(data, "repository");
      record.identifiers.doi = str(data, "doi") ?? record.identifiers.doi;
      record.identifiers.url = str(data, "persistentId") ?? record.identifiers.url;
      if (str(data, "version")) record.passthrough.version = str(data, "version") as string;
      break;
    case "software":
      push("author", "author");
      record.title = str(data, "title");
      record.publisher = str(data, "host");
      record.genre = str(data, "designation");
      if (str(data, "versionOrCommit"))
        record.passthrough.version = str(data, "versionOrCommit") as string;
      break;
    case "genai_output":
      record.publisher = str(data, "platform");
      record.genre = str(data, "model");
      record.title = [str(data, "platform"), str(data, "model")].filter(Boolean).join(" ");
      record.edition = str(data, "modelVersion");
      record.issued = date(data, "outputDate");
      if (str(data, "prompt")) record.passthrough.prompt = str(data, "prompt") as string;
      break;
    case "submission.government":
      push("authors", "author");
      bodyCreator(record, str(data, "body"));
      record.containerTitle = str(data, "committee");
      record.collectionTitle = str(data, "inquiry");
      record.number = str(data, "number");
      record.genre = str(data, "documentType");
      record.title = `Submission to ${str(data, "committee") ?? "inquiry"}`;
      break;
    default:
      record.title =
        str(data, "customText") ??
        str(data, "noteText") ??
        citation.overrideText ??
        str(data, "title");
      break;
  }
}

function bodyCreator(record: InterchangeRecord, body: string | undefined): void {
  if (!body) return;
  if (record.creators.some((c) => c.role === "author")) return;
  record.creators.push({ role: "author", raw: body, literal: body });
}
