/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * wordSourcesXml.ts — Word's Source Manager XML, import only.
 *
 * Word keeps its bibliography sources in a custom XML part (namespace
 * schemas.openxmlformats.org/officeDocument/2006/bibliography) and lets
 * users export the same shape as a "Sources.xml" file. Each <b:Source>
 * carries a Tag, a SourceType and flat fields, with contributors nested
 * under an outer <b:Author> that holds one child per role. Elements may be
 * prefixed "b:" or not, depending on how the file was written, so names
 * are matched on their local part.
 *
 * Export is not supported: Word's schema has no slot for most of what AGLC4
 * needs, and Obiter already writes citations straight into the document.
 */

import { normaliseText, registerCodec } from "../codec";
import type { InterchangeCodec, ParseResult, SerialiseOptions } from "../codec";
import { addPassthrough, createRecord, issue } from "../model";
import type {
  CreatorRole,
  InterchangeCreator,
  InterchangeDate,
  InterchangeIssue,
  InterchangeKind,
  InterchangeLegal,
  InterchangeRecord,
} from "../model";
import { parseFreeTextDate } from "../mapper/dates";
import { parseXml, textOf } from "./xmlLite";
import type { XmlNode } from "./xmlLite";

// ─── Vocabulary ─────────────────────────────────────────────────────────────

/** Word SourceType -> kind. */
const SOURCE_TYPE_TO_KIND: Readonly<Record<string, InterchangeKind>> = {
  book: "book",
  booksection: "chapter",
  journalarticle: "article",
  report: "report",
  case: "case",
  internetsite: "web",
  documentfrominternetsite: "web",
  electronicsource: "web",
  conferenceproceedings: "conference",
  soundrecording: "podcast",
  film: "film",
  articleinaperiodical: "periodical",
  patent: "generic",
  interview: "interview",
  art: "generic",
  performance: "generic",
  misc: "generic",
};

/** Word contributor role element -> creator role. */
const CONTRIBUTOR_ROLES: Readonly<Record<string, CreatorRole>> = {
  author: "author",
  bookauthor: "author",
  editor: "editor",
  compiler: "editor",
  translator: "translator",
  interviewer: "interviewer",
  interviewee: "interviewee",
  director: "director",
  producername: "contributor",
  performer: "contributor",
  composer: "contributor",
  conductor: "contributor",
  writer: "author",
  artist: "author",
  inventor: "author",
  counsel: "contributor",
};

/** Elements read by name; anything else lands in passthrough. */
const HANDLED: ReadonlySet<string> = new Set([
  "tag",
  "sourcetype",
  "author",
  "title",
  "shorttitle",
  "year",
  "month",
  "day",
  "yearaccessed",
  "monthaccessed",
  "dayaccessed",
  "journalname",
  "booktitle",
  "periodicaltitle",
  "internetsitetitle",
  "conferencename",
  "publisher",
  "city",
  "volume",
  "issue",
  "pages",
  "edition",
  "url",
  "standardnumber",
  "institution",
  "court",
  "reporter",
  "casenumber",
  "comments",
  "medium",
  "thesistype",
]);

// ─── Helpers ────────────────────────────────────────────────────────────────

function localName(node: XmlNode): string {
  const colon = node.name.indexOf(":");
  return (colon >= 0 ? node.name.slice(colon + 1) : node.name).toLowerCase();
}

function kids(node: XmlNode | undefined, local: string): XmlNode[] {
  if (!node) return [];
  return node.children.filter((c) => localName(c) === local);
}

function kid(node: XmlNode | undefined, local: string): XmlNode | undefined {
  return kids(node, local)[0];
}

/** Every element with the local name, anywhere beneath `node`. */
function findAllLocal(node: XmlNode, local: string): XmlNode[] {
  const out: XmlNode[] = [];
  const walk = (n: XmlNode): void => {
    for (const c of n.children) {
      if (localName(c) === local) out.push(c);
      else walk(c);
    }
  };
  walk(node);
  return out;
}

function legalOf(record: InterchangeRecord): InterchangeLegal {
  if (!record.legal) record.legal = {};
  return record.legal;
}

function digitsOf(text: string): string {
  return text.replace(/[-\s]/g, "");
}

function looksLikeIsbn(text: string): boolean {
  const compact = digitsOf(text);
  return /^\d{13}$/.test(compact) || /^\d{9}[\dXx]$/.test(compact);
}

function splitPageRange(text: string): { first: string; last?: string } {
  const m = /^([A-Za-z]*\d+)\s*[-–—]\s*([A-Za-z]*\d+)$/.exec(text);
  if (m) return { first: m[1], last: m[2] };
  return { first: text };
}

/** Builds a date from Word's separate Year / Month / Day elements. */
function dateFromParts(
  year: string | undefined,
  month: string | undefined,
  day: string | undefined
): InterchangeDate | undefined {
  if (!year && !month && !day) return undefined;
  const yearNum = year && /^\d{4}$/.test(year) ? Number(year) : undefined;
  if (yearNum === undefined) {
    const text = [day, month, year].filter(Boolean).join(" ");
    return parseFreeTextDate(text) ?? { raw: text };
  }
  const date: InterchangeDate = { year: yearNum };
  let monthNum: number | undefined;
  if (month) {
    if (/^\d{1,2}$/.test(month)) {
      monthNum = Number(month);
    } else {
      monthNum = parseFreeTextDate(`${month} ${yearNum}`)?.month;
    }
    if (monthNum === undefined || monthNum < 1 || monthNum > 12) {
      date.raw = [day, month, year].filter(Boolean).join(" ");
      return date;
    }
    date.month = monthNum;
  }
  if (day && /^\d{1,2}$/.test(day) && monthNum !== undefined) {
    const dayNum = Number(day);
    if (dayNum >= 1 && dayNum <= 31) date.day = dayNum;
  }
  return date;
}

function personCreator(person: XmlNode, role: CreatorRole): InterchangeCreator | undefined {
  const last = textOf(kid(person, "last"));
  const first = textOf(kid(person, "first"));
  const middle = textOf(kid(person, "middle"));
  const given = [first, middle].filter(Boolean).join(" ");
  if (!last && !given) return undefined;
  const raw = last && given ? `${last}, ${given}` : last || given;
  const creator: InterchangeCreator = { role, raw };
  if (last) creator.family = last;
  if (given) creator.given = given;
  return creator;
}

/** Reads the outer <b:Author> block: one child per role, each a NameList or a Corporate. */
function readContributors(outer: XmlNode, record: InterchangeRecord): void {
  for (const roleNode of outer.children) {
    const local = localName(roleNode);
    const role = CONTRIBUTOR_ROLES[local] ?? "contributor";
    const corporate = textOf(kid(roleNode, "corporate"));
    if (corporate) {
      record.creators.push({ role, raw: corporate, literal: corporate });
    }
    for (const person of findAllLocal(roleNode, "person")) {
      const creator = personCreator(person, role);
      if (creator) record.creators.push(creator);
    }
    if (!CONTRIBUTOR_ROLES[local]) addPassthrough(record, "contributor-role", local);
  }
}

// ─── Record mapping ─────────────────────────────────────────────────────────

function mapSource(node: XmlNode, index: number, issues: InterchangeIssue[]): InterchangeRecord {
  const text = (local: string): string | undefined => textOf(kid(node, local)) || undefined;

  const rawType = text("sourcetype") ?? "";
  let kind = SOURCE_TYPE_TO_KIND[rawType.toLowerCase()];
  if (kind === undefined) {
    kind = "generic";
    issues.push(
      issue(
        "warning",
        "unsupported-type",
        rawType
          ? `The Word source type "${rawType}" is not one Obiter maps. The source was imported as a generic source.`
          : "The source has no SourceType. It was imported as a generic source.",
        { recordIndex: index, field: "SourceType" }
      )
    );
  }

  const record = createRecord(kind, {
    format: "word-sources-xml",
    rawType,
    rawId: text("tag"),
    sourceLabel: "Word",
  });
  const isCase = kind === "case";

  const outerAuthor = kid(node, "author");
  if (outerAuthor) readContributors(outerAuthor, record);

  const title = text("title");
  if (title !== undefined) {
    record.title = title;
    if (isCase) legalOf(record).caseName = title;
  }
  const shortTitle = text("shorttitle");
  if (shortTitle !== undefined) record.shortTitle = shortTitle;

  const issued = dateFromParts(text("year"), text("month"), text("day"));
  if (issued) record.issued = issued;
  const accessed = dateFromParts(text("yearaccessed"), text("monthaccessed"), text("dayaccessed"));
  if (accessed) record.accessed = accessed;

  const container =
    text("journalname") ??
    text("booktitle") ??
    text("periodicaltitle") ??
    text("internetsitetitle");
  if (container !== undefined) record.containerTitle = container;

  const event = text("conferencename");
  if (event !== undefined) record.event = event;
  const publisher = text("publisher");
  if (publisher !== undefined) record.publisher = publisher;
  const city = text("city");
  if (city !== undefined) record.place = city;

  const volume = text("volume");
  if (volume !== undefined) {
    record.volume = volume;
    if (isCase) legalOf(record).reporterVolume = volume;
  }
  const issueText = text("issue");
  if (issueText !== undefined) record.issue = issueText;

  const pages = text("pages");
  if (pages !== undefined) {
    const split = splitPageRange(pages);
    record.pageFirst = split.first;
    if (split.last !== undefined) {
      record.pageLast = split.last;
      record.pageRange = pages;
    }
    if (isCase) legalOf(record).firstPage = split.first;
  }

  const edition = text("edition");
  if (edition !== undefined) record.edition = edition;
  const url = text("url");
  if (url !== undefined) {
    record.identifiers.url = url;
    record.identifiers.urls = [url];
  }
  const standardNumber = text("standardnumber");
  if (standardNumber !== undefined) {
    if (looksLikeIsbn(standardNumber)) record.identifiers.isbn = standardNumber;
    else record.identifiers.issn = standardNumber;
  }
  const institution = text("institution");
  if (institution !== undefined) record.institution = institution;

  const court = text("court");
  if (court !== undefined) legalOf(record).courtName = court;
  const reporter = text("reporter");
  if (reporter !== undefined) {
    legalOf(record).reporter = reporter;
    if (record.containerTitle === undefined) record.containerTitle = reporter;
  }
  const caseNumber = text("casenumber");
  if (caseNumber !== undefined) legalOf(record).docket = caseNumber;

  const comments = text("comments");
  if (comments !== undefined) record.notes.push(comments);
  const medium = text("medium");
  if (medium !== undefined) record.medium = medium;
  const thesisType = text("thesistype");
  if (thesisType !== undefined) record.genre = thesisType;

  for (const c of node.children) {
    const local = localName(c);
    if (HANDLED.has(local)) continue;
    const value = textOf(c);
    if (value) addPassthrough(record, local, value);
  }

  return record;
}

// ─── Parse ──────────────────────────────────────────────────────────────────

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Parses Word Source Manager XML. Never throws; malformed sources become issues. */
export function parseWordSourcesXml(text: string): ParseResult {
  const issues: InterchangeIssue[] = [];
  const records: InterchangeRecord[] = [];
  try {
    const body = normaliseText(text);
    const doc = parseXml(body);
    const sources = findAllLocal(doc, "source");
    if (sources.length === 0 && body.trim()) {
      issues.push(
        issue(
          "warning",
          "parse-error",
          "No <b:Source> elements were found. Check that the file is a Word Source Manager export."
        )
      );
    }
    sources.forEach((node, index) => {
      try {
        records.push(mapSource(node, index, issues));
      } catch (err) {
        issues.push(
          issue(
            "error",
            "parse-error",
            `Source ${index + 1} could not be read (${describe(err)}). It was skipped.`,
            { recordIndex: index }
          )
        );
      }
    });
  } catch (err) {
    issues.push(
      issue("error", "parse-error", `The Word sources XML could not be read (${describe(err)}).`)
    );
  }
  return { records, issues };
}

// ─── Codec ──────────────────────────────────────────────────────────────────

const SNIFF_WINDOW = 4096;

const BIBLIOGRAPHY_NS = "schemas.openxmlformats.org/officeDocument/2006/bibliography";

export const wordSourcesXmlCodec: InterchangeCodec = {
  format: "word-sources-xml",
  label: "Word Source Manager",
  extensions: [".xml"],
  mimeType: "application/xml",
  canExport: false,

  sniff(text: string): number {
    const head = normaliseText(text.slice(0, SNIFF_WINDOW));
    if (/<b:Sources\b/.test(head) || head.includes(BIBLIOGRAPHY_NS)) return 0.95;
    return 0;
  },

  parse(text: string): ParseResult {
    return parseWordSourcesXml(text);
  },

  serialise(_records: InterchangeRecord[], _options?: SerialiseOptions): string {
    throw new Error("Word Source Manager export is not supported");
  },
};

registerCodec(wordSourcesXmlCodec);
