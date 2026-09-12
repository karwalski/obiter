/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * ris.ts — the RIS codec (Research Information Systems, Reference Manager
 * 2001 specification as practised by Zotero, EndNote, Trove and Primo).
 *
 * A RIS file is a run of records, each a list of "XX  - value" lines that
 * begins with TY and ends with ER. The parser is tolerant: one space before
 * the dash, lower-case tags from hand-edited files, CRLF or LF, a byte-order
 * mark, untagged continuation lines, and a TY that arrives before the
 * previous ER. Nothing throws; malformed input becomes issues.
 *
 * Every tag with no slot on InterchangeRecord is kept in `passthrough` under
 * its own tag name so a re-export is lossless (DECISION-038).
 */

import { normaliseText, registerCodec } from "../codec";
import type { InterchangeCodec, ParseResult, SerialiseOptions } from "../codec";
import { addPassthrough, createRecord, issue } from "../model";
import type {
  CreatorRole,
  InterchangeDate,
  InterchangeIssue,
  InterchangeKind,
  InterchangeLegal,
  InterchangeRecord,
} from "../model";
import { parseRisDate, toRisDate } from "../mapper/dates";
import { KIND_TO_RIS_TYPE, risTypeToKind } from "../mapper/kinds";
import { creatorsWithRole, formatCommaName, parseCommaName } from "../mapper/names";

// ─── Tag vocabulary ─────────────────────────────────────────────────────────

/**
 * Tags the 2001 specification and the major reference managers emit. A
 * lower-case tag is only accepted when its upper-case form is in this set,
 * so a continuation line such as "it - was" inside an abstract is not
 * mistaken for a tag.
 */
const KNOWN_TAGS: ReadonlySet<string> = new Set([
  "TY",
  "ER",
  "ID",
  "TI",
  "T1",
  "CT",
  "BT",
  "T2",
  "JF",
  "JO",
  "JA",
  "J1",
  "J2",
  "T3",
  "AU",
  "A1",
  "A2",
  "ED",
  "A3",
  "A4",
  "PY",
  "Y1",
  "DA",
  "Y2",
  "VL",
  "IS",
  "CP",
  "SP",
  "EP",
  "PB",
  "CY",
  "ET",
  "SN",
  "DO",
  "UR",
  "L1",
  "L2",
  "L3",
  "L4",
  "N1",
  "N2",
  "AB",
  "KW",
  "ST",
  "SE",
  "SV",
  "OP",
  "M1",
  "M2",
  "M3",
  "LA",
  "DB",
  "DP",
  "AN",
  "C1",
  "C2",
  "C3",
  "C4",
  "C5",
  "C6",
  "C7",
  "C8",
  "U1",
  "U2",
  "U3",
  "U4",
  "U5",
  "AD",
  "AV",
  "RP",
  "RN",
  "TA",
  "TT",
  "NV",
  "LB",
  "RI",
  "PP",
  "PS",
  "WT",
  "WV",
  "WP",
]);

/** Kinds whose BT (secondary title of a book) is the title itself. */
const BOOK_TYPES: ReadonlySet<string> = new Set(["BOOK", "UNPB", "EDBOOK", "EBOOK"]);

const STATUTE_KINDS: ReadonlySet<InterchangeKind> = new Set([
  "legislation",
  "regulation",
  "constitution",
  "bill",
]);

const PARLIAMENT_KINDS: ReadonlySet<InterchangeKind> = new Set(["hansard", "hearing"]);

/** Jurisdiction text as written in a T2 -> Obiter code. */
const JURISDICTIONS: Readonly<Record<string, string>> = {
  cth: "Cth",
  commonwealth: "Cth",
  nsw: "NSW",
  "new south wales": "NSW",
  vic: "Vic",
  victoria: "Vic",
  qld: "Qld",
  queensland: "Qld",
  wa: "WA",
  "western australia": "WA",
  sa: "SA",
  "south australia": "SA",
  tas: "Tas",
  tasmania: "Tas",
  act: "ACT",
  "australian capital territory": "ACT",
  nt: "NT",
  "northern territory": "NT",
  uk: "UK",
  "united kingdom": "UK",
  nz: "NZ",
  "new zealand": "NZ",
};

const DEBATES_PATTERN = /parliamentary debates|hansard/i;

// ─── Tokeniser ──────────────────────────────────────────────────────────────

/** One record's tags in file order, before mapping. */
interface RawRecord {
  ty: string;
  line: number;
  tags: Map<string, string[]>;
  /** The tag most recently opened, for continuation lines. */
  lastTag?: string;
}

const TAG_LINE = /^([A-Za-z][A-Za-z0-9]) {1,2}- ?(.*)$/;

function matchTag(line: string): { tag: string; value: string } | undefined {
  const m = TAG_LINE.exec(line);
  if (!m) return undefined;
  const upper = m[1].toUpperCase();
  if (upper !== m[1] && !KNOWN_TAGS.has(upper)) return undefined;
  return { tag: upper, value: m[2] };
}

function push(record: RawRecord, tag: string, value: string): void {
  const list = record.tags.get(tag);
  if (list) {
    list.push(value);
  } else {
    record.tags.set(tag, [value]);
  }
  record.lastTag = tag;
}

function appendContinuation(record: RawRecord, text: string): void {
  if (!record.lastTag) return;
  const list = record.tags.get(record.lastTag);
  if (!list || list.length === 0) return;
  const last = list[list.length - 1];
  list[list.length - 1] = last ? `${last} ${text}` : text;
}

/** Splits the text into raw records, reporting structural problems. */
function tokenise(text: string, issues: InterchangeIssue[]): RawRecord[] {
  const lines = normaliseText(text).split("\n");
  const records: RawRecord[] = [];
  let current: RawRecord | undefined;

  const close = (): void => {
    if (current) records.push(current);
    current = undefined;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const lineNo = i + 1;
    const tagged = matchTag(line);

    if (!tagged) {
      const trimmed = line.trim();
      if (trimmed && current) appendContinuation(current, trimmed);
      continue;
    }

    if (tagged.tag === "TY") {
      if (current) {
        issues.push(
          issue(
            "info",
            "parse-error",
            `A new TY tag arrived before the previous record's ER on line ${lineNo}. The previous record was closed there.`,
            { recordIndex: records.length, line: lineNo }
          )
        );
        close();
      }
      current = { ty: tagged.value.trim(), line: lineNo, tags: new Map(), lastTag: "TY" };
      continue;
    }

    if (tagged.tag === "ER") {
      if (current) {
        close();
      } else {
        issues.push(
          issue(
            "info",
            "parse-error",
            `An ER tag with no open record on line ${lineNo} was ignored.`,
            {
              line: lineNo,
            }
          )
        );
      }
      continue;
    }

    if (!current) {
      issues.push(
        issue(
          "warning",
          "parse-error",
          `Tag ${tagged.tag} on line ${lineNo} appeared before any TY tag. A record of unknown type was started for it.`,
          { recordIndex: records.length, line: lineNo }
        )
      );
      current = { ty: "", line: lineNo, tags: new Map() };
    }
    push(current, tagged.tag, tagged.value);
  }

  if (current) {
    issues.push(
      issue(
        "info",
        "parse-error",
        `The last record (starting on line ${current.line}) has no ER tag. It was closed at the end of the file.`,
        { recordIndex: records.length, line: current.line }
      )
    );
    close();
  }
  return records;
}

// ─── Mapping helpers ────────────────────────────────────────────────────────

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

function jurisdictionCode(text: string): string | undefined {
  return JURISDICTIONS[text.trim().toLowerCase()];
}

function mergeDates(
  base: InterchangeDate | undefined,
  full: InterchangeDate | undefined
): InterchangeDate | undefined {
  if (!full) return base;
  if (!base) return full;
  const merged: InterchangeDate = { ...base };
  if (full.year !== undefined) merged.year = full.year;
  if (full.month !== undefined) merged.month = full.month;
  if (full.day !== undefined) merged.day = full.day;
  if (full.raw !== undefined) merged.raw = full.raw;
  else if (full.year !== undefined) delete merged.raw;
  return merged;
}

/** Accessor over one raw record with the tags consumed as they are read. */
class TagReader {
  private readonly consumed = new Set<string>();

  constructor(private readonly raw: RawRecord) {}

  has(...tags: string[]): boolean {
    return tags.some((t) => this.raw.tags.has(t));
  }

  /** All values of the given tags, in tag-list order then file order. */
  all(...tags: string[]): string[] {
    const out: string[] = [];
    for (const tag of tags) {
      const values = this.raw.tags.get(tag);
      if (!values) continue;
      this.consumed.add(tag);
      for (const v of values) {
        const trimmed = v.trim();
        if (trimmed) out.push(trimmed);
      }
    }
    return out;
  }

  /** Repeated single-valued tags are joined with "; " rather than lost. */
  one(...tags: string[]): string | undefined {
    const values = this.all(...tags);
    return values.length ? values.join("; ") : undefined;
  }

  /** Marks tags as read without returning them. */
  skip(...tags: string[]): void {
    for (const t of tags) if (this.raw.tags.has(t)) this.consumed.add(t);
  }

  /** Tags nobody consumed, in file order. */
  remaining(): Array<[string, string[]]> {
    const out: Array<[string, string[]]> = [];
    for (const [tag, values] of this.raw.tags) {
      if (!this.consumed.has(tag)) out.push([tag, values]);
    }
    return out;
  }
}

function legalOf(record: InterchangeRecord): InterchangeLegal {
  if (!record.legal) record.legal = {};
  return record.legal;
}

function addCreators(record: InterchangeRecord, values: string[], role: CreatorRole): void {
  for (const v of values) record.creators.push(parseCommaName(v, role));
}

function readDate(
  reader: TagReader,
  tags: string[],
  issues: InterchangeIssue[],
  recordIndex: number
): InterchangeDate | undefined {
  const text = reader.one(...tags);
  if (text === undefined) return undefined;
  const date = parseRisDate(text);
  if (date && date.year === undefined && date.month === undefined && date.day === undefined) {
    issues.push(
      issue(
        "warning",
        "date-unparsed",
        `The ${tags[0]} value "${text}" could not be read as a date. It was kept as text.`,
        { recordIndex, field: tags[0] }
      )
    );
  }
  return date;
}

// ─── Record mapping ─────────────────────────────────────────────────────────

function mapRecord(raw: RawRecord, index: number, issues: InterchangeIssue[]): InterchangeRecord {
  const ty = raw.ty.toUpperCase();
  const reader = new TagReader(raw);
  const rawId = reader.one("ID");

  let kind: InterchangeKind | undefined = ty ? risTypeToKind(ty) : undefined;
  if (kind === undefined) {
    kind = "generic";
    issues.push(
      issue(
        "warning",
        "unsupported-type",
        ty
          ? `The RIS type "${ty}" is not one Obiter maps. The record was imported as a generic source.`
          : "The record has no TY tag. It was imported as a generic source.",
        { recordIndex: index, field: "TY", line: raw.line }
      )
    );
  }

  // HEAR is Hansard when the title or secondary title names the debates.
  const rawTitle = reader.one("TI", "T1", "CT");
  const rawT2 = reader.one("T2", "JF", "JO");
  if (kind === "hearing") {
    if ((rawTitle && DEBATES_PATTERN.test(rawTitle)) || (rawT2 && DEBATES_PATTERN.test(rawT2))) {
      kind = "hansard";
    }
  }

  const record = createRecord(kind, { format: "ris", rawType: ty, rawId });
  const isCase = kind === "case";
  const isStatute = STATUTE_KINDS.has(kind);
  const isParliament = PARLIAMENT_KINDS.has(kind);

  // ── Titles ──
  const bt = reader.one("BT");
  if (rawTitle !== undefined) {
    record.title = rawTitle;
  } else if (bt !== undefined && BOOK_TYPES.has(ty)) {
    record.title = bt;
  }
  if (isCase && record.title) legalOf(record).caseName = record.title;

  let containerTitle = rawT2;
  if (containerTitle === undefined && bt !== undefined && !BOOK_TYPES.has(ty)) {
    containerTitle = bt;
  } else if (bt !== undefined && BOOK_TYPES.has(ty) && rawTitle !== undefined) {
    // Both TI and BT on a book: keep BT as it was.
    addPassthrough(record, "BT", bt);
  }
  if (containerTitle !== undefined) {
    if (isStatute) {
      addPassthrough(record, "T2", containerTitle);
      const code = jurisdictionCode(containerTitle);
      if (code) legalOf(record).jurisdiction = code;
    } else {
      record.containerTitle = containerTitle;
      if (isCase) legalOf(record).reporter = containerTitle;
    }
  }

  const shortContainer = reader.one("JA", "J1", "J2");
  if (shortContainer !== undefined) record.containerTitleShort = shortContainer;

  const t3 = reader.one("T3");
  if (t3 !== undefined) {
    if (kind === "bill" || isParliament) {
      legalOf(record).legislature = t3;
    } else {
      record.collectionTitle = t3;
    }
  }

  const st = reader.one("ST");
  if (st !== undefined) record.shortTitle = st;

  // ── Creators ──
  const authors = reader.all("AU", "A1");
  if (kind === "hansard" && authors.length) {
    legalOf(record).jurisdiction = authors.join("; ");
  } else {
    addCreators(record, authors, "author");
  }

  const secondary = reader.all("A2", "ED");
  if (isCase) {
    const legal = legalOf(record);
    for (const v of secondary) {
      if (legal.reporter === undefined) {
        legal.reporter = v;
        if (record.containerTitle === undefined) record.containerTitle = v;
      } else if (v !== legal.reporter) {
        addPassthrough(record, "A2", v);
      }
    }
  } else {
    addCreators(record, secondary, "editor");
  }
  addCreators(record, reader.all("A3"), "series-editor");
  addCreators(record, reader.all("A4"), "translator");

  // ── Dates ──
  const py = readDate(reader, ["PY", "Y1"], issues, index);
  const da = readDate(reader, ["DA"], issues, index);
  const issued = mergeDates(py, da);
  if (issued) record.issued = issued;
  if (isCase && da) legalOf(record).decidedDate = da;
  const accessed = readDate(reader, ["Y2"], issues, index);
  if (accessed) record.accessed = accessed;

  // ── Numbering and pages ──
  const vl = reader.one("VL");
  if (vl !== undefined) {
    if (isStatute) {
      legalOf(record).actNumber = vl;
    } else {
      record.volume = vl;
      if (isCase) legalOf(record).reporterVolume = vl;
    }
  }
  const is = reader.one("IS", "CP");
  if (is !== undefined) record.issue = is;

  const sp = reader.one("SP");
  const ep = reader.one("EP");
  if (sp !== undefined) {
    const pages = splitPageRange(sp);
    record.pageFirst = pages.first;
    if (pages.last !== undefined) {
      record.pageLast = pages.last;
      record.pageRange = sp;
    }
    if (isCase) legalOf(record).firstPage = pages.first;
  }
  if (ep !== undefined) {
    record.pageLast = ep;
    if (record.pageFirst !== undefined) record.pageRange = `${record.pageFirst}-${ep}`;
  }

  // ── Publication ──
  const pbValues = reader.all("PB");
  if (pbValues.length) {
    if (isCase) {
      legalOf(record).courtName = pbValues.join("; ");
    } else if (kind === "hansard") {
      addCreators(record, pbValues, "speaker");
    } else {
      record.publisher = pbValues.join("; ");
    }
  }
  const cy = reader.one("CY");
  if (cy !== undefined) record.place = cy;
  const et = reader.one("ET");
  if (et !== undefined) record.edition = et;
  const m3 = reader.one("M3");
  if (m3 !== undefined) record.genre = m3;
  const la = reader.one("LA");
  if (la !== undefined) record.language = la;

  // ── Identifiers ──
  const sn = reader.one("SN");
  if (sn !== undefined) {
    if (looksLikeIsbn(sn)) record.identifiers.isbn = sn;
    else record.identifiers.issn = sn;
  }
  const doi = reader.one("DO");
  if (doi !== undefined) record.identifiers.doi = doi;
  const urls = reader
    .all("UR")
    .flatMap((v) => v.split(";"))
    .map((u) => u.trim())
    .filter(Boolean);
  if (urls.length) {
    record.identifiers.url = urls[0];
    record.identifiers.urls = urls;
  }
  const an = reader.one("AN");
  if (an !== undefined) {
    record.identifiers.accessionNumber = an;
    const m = /^obiter:(.+)$/.exec(an);
    if (m) record.provenance.obiterId = m[1].trim();
  }
  record.attachments.push(...reader.all("L1", "L2"));

  // ── Notes, abstract, keywords ──
  record.notes.push(...reader.all("N1"));
  const ab = reader.one("AB");
  const n2 = reader.one("N2");
  if (ab !== undefined) {
    record.abstract = ab;
    if (n2 !== undefined) record.notes.push(n2);
  } else if (n2 !== undefined) {
    record.abstract = n2;
  }
  record.keywords.push(...reader.all("KW"));

  // ── Legal specifics ──
  const se = reader.one("SE");
  if (se !== undefined) {
    const legal = legalOf(record);
    if (isCase && /^\d{4}$/.test(se)) {
      legal.yearType = "square";
      if (record.issued?.year === undefined) {
        record.issued = { ...(record.issued ?? {}), year: Number(se) };
      }
    } else {
      legal.section = se;
    }
  }
  const sv = reader.one("SV");
  if (sv !== undefined) legalOf(record).docket = sv;
  const op = reader.one("OP");
  if (op !== undefined) legalOf(record).history = op;
  const m1 = reader.one("M1");
  if (m1 !== undefined) {
    record.number = m1;
    if (isStatute) legalOf(record).documentNumber = m1;
  }
  if (isParliament && rawT2 !== undefined) {
    const legal = legalOf(record);
    if (kind === "hansard") {
      if (DEBATES_PATTERN.test(rawT2)) {
        if (rawTitle !== undefined) legal.chamber = rawTitle;
      } else {
        legal.chamber = rawT2;
      }
    } else {
      legal.committee = rawT2;
    }
  } else if (kind === "hansard" && rawTitle !== undefined && !DEBATES_PATTERN.test(rawTitle)) {
    legalOf(record).chamber = rawTitle;
  }

  // ── Provenance ──
  const db = reader.one("DB");
  const dp = reader.one("DP");
  if (db !== undefined) {
    record.provenance.sourceLabel = db;
  } else if (dp !== undefined) {
    record.provenance.sourceLabel = dp;
  }
  if (dp !== undefined) addPassthrough(record, "DP", dp);
  for (const c8 of reader.all("C8")) {
    const m = /^obiter-type:(.+)$/.exec(c8);
    if (m) record.provenance.obiterSourceType = m[1].trim();
    else addPassthrough(record, "C8", c8);
  }

  // ── Everything else ──
  for (const [tag, values] of reader.remaining()) {
    for (const v of values) {
      const trimmed = v.trim();
      if (trimmed) addPassthrough(record, tag, trimmed);
    }
  }

  return record;
}

// ─── Parse ──────────────────────────────────────────────────────────────────

/** Parses RIS text. Never throws; malformed records become issues. */
export function parseRisRecords(text: string): ParseResult {
  const issues: InterchangeIssue[] = [];
  const records: InterchangeRecord[] = [];
  try {
    const raws = tokenise(text, issues);
    raws.forEach((raw, index) => {
      try {
        records.push(mapRecord(raw, index, issues));
      } catch (err) {
        issues.push(
          issue(
            "error",
            "parse-error",
            `The record starting on line ${raw.line} could not be read (${describe(err)}). It was skipped.`,
            { recordIndex: index, line: raw.line }
          )
        );
      }
    });
  } catch (err) {
    issues.push(
      issue("error", "parse-error", `The RIS text could not be read (${describe(err)}).`)
    );
  }
  return { records, issues };
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// ─── Serialise ──────────────────────────────────────────────────────────────

const RIS_TAG = /^[A-Z][A-Z0-9]$/;

class RisWriter {
  private readonly lines: string[] = [];
  private readonly written = new Set<string>();

  constructor(private readonly eol: string) {}

  tag(tag: string, value: string | undefined): void {
    if (value === undefined) return;
    const clean = value.replace(/\s*[\r\n]+\s*/g, " ").trim();
    if (!clean) return;
    this.lines.push(`${tag}  - ${clean}`);
    this.written.add(tag);
  }

  each(tag: string, values: readonly string[] | undefined): void {
    for (const v of values ?? []) this.tag(tag, v);
  }

  has(tag: string): boolean {
    return this.written.has(tag);
  }

  text(): string {
    return this.lines.join(this.eol);
  }
}

function yearLine(date: InterchangeDate | undefined): string | undefined {
  if (!date || date.year === undefined) return undefined;
  return `${date.year}///`;
}

function serialiseRecord(record: InterchangeRecord, eol: string): string {
  const w = new RisWriter(eol);
  const kind = record.kind;
  const legal = record.legal ?? {};
  const isCase = kind === "case" || kind === "case-transcript" || kind === "case-submission";
  const isStatute = STATUTE_KINDS.has(kind);
  const isParliament = PARLIAMENT_KINDS.has(kind);
  const ids = record.identifiers;

  w.tag("TY", KIND_TO_RIS_TYPE[kind]);
  w.tag("ID", record.provenance.rawId ?? record.provenance.obiterId);
  w.tag("TI", record.title ?? (isCase ? legal.caseName : undefined));

  if (isCase) {
    const reporter = legal.reporter ?? record.containerTitle;
    w.tag("T2", reporter);
    // Zotero reads the reporter abbreviation from A2 on a CASE record.
    w.tag("A2", legal.reporter);
  } else if (isParliament) {
    w.tag("T2", record.containerTitle ?? legal.committee);
  } else {
    w.tag("T2", record.containerTitle);
  }
  w.tag("JA", record.containerTitleShort);
  w.tag(
    "T3",
    record.collectionTitle ?? (kind === "bill" || isParliament ? legal.legislature : undefined)
  );

  const authors = creatorsWithRole(record.creators, "author");
  if (kind === "hansard" && authors.length === 0) {
    w.tag("AU", legal.jurisdiction);
  }
  w.each("AU", authors.map(formatCommaName));
  if (!isCase) {
    w.each("A2", creatorsWithRole(record.creators, "editor").map(formatCommaName));
  }
  w.each("A3", creatorsWithRole(record.creators, "series-editor").map(formatCommaName));
  w.each("A4", creatorsWithRole(record.creators, "translator").map(formatCommaName));

  const issued = isCase ? (legal.decidedDate ?? record.issued) : record.issued;
  w.tag("PY", yearLine(issued ?? record.issued));
  if (issued && (issued.month !== undefined || issued.day !== undefined)) {
    w.tag("DA", toRisDate(issued));
  }
  if (record.accessed) w.tag("Y2", toRisDate(record.accessed));

  if (isCase) {
    w.tag("VL", legal.reporterVolume ?? record.volume);
  } else if (isStatute) {
    w.tag("VL", record.volume ?? legal.actNumber);
  } else {
    w.tag("VL", record.volume);
  }
  w.tag("IS", record.issue);
  w.tag("SP", isCase ? (legal.firstPage ?? record.pageFirst) : record.pageFirst);
  w.tag("EP", record.pageLast);

  if (isCase) {
    w.tag("PB", legal.courtName);
  } else if (kind === "hansard") {
    const speakers = creatorsWithRole(record.creators, "speaker").map(formatCommaName);
    if (speakers.length) w.each("PB", speakers);
    else w.tag("PB", record.publisher);
  } else {
    w.tag("PB", record.publisher);
  }
  w.tag("CY", record.place);
  w.tag("ET", record.edition);
  w.tag("SN", ids.isbn ?? ids.issn);
  w.tag("DO", ids.doi);
  w.each("UR", ids.urls && ids.urls.length ? ids.urls : ids.url ? [ids.url] : []);
  w.each("L1", record.attachments);
  w.each("KW", record.keywords);
  w.tag("AB", record.abstract);
  w.each("N1", record.notes);
  w.tag("ST", record.shortTitle);

  if (isCase && legal.yearType === "square") {
    const year = issued?.year ?? record.issued?.year;
    w.tag("SE", year !== undefined ? String(year) : legal.section);
  } else {
    w.tag("SE", legal.section);
  }
  w.tag("SV", legal.docket);
  w.tag("OP", legal.history);
  w.tag("M1", record.number ?? (isStatute ? legal.documentNumber : undefined));
  w.tag("M3", record.genre);
  w.tag("LA", record.language);

  if (record.formatted?.footnote) {
    w.tag("N1", `AGLC4 footnote: ${record.formatted.footnote}`);
  }
  if (record.formatted?.bibliography) {
    w.tag("N1", `AGLC4 bibliography: ${record.formatted.bibliography}`);
  }

  if (record.provenance.obiterId) {
    w.tag("DB", "Obiter");
    w.tag("AN", `obiter:${record.provenance.obiterId}`);
    if (record.provenance.obiterSourceType) {
      w.tag("C8", `obiter-type:${record.provenance.obiterSourceType}`);
    }
  } else {
    w.tag("AN", ids.accessionNumber);
  }

  for (const [key, value] of Object.entries(record.passthrough)) {
    const tag = key.toUpperCase();
    if (!RIS_TAG.test(tag) || tag === "TY" || tag === "ER" || w.has(tag)) continue;
    w.each(tag, Array.isArray(value) ? value : [value]);
  }

  return `${w.text()}${eol}ER  - `;
}

// ─── Codec ──────────────────────────────────────────────────────────────────

const SNIFF_WINDOW = 4096;

export const risCodec: InterchangeCodec = {
  format: "ris",
  label: "RIS",
  extensions: [".ris"],
  mimeType: "application/x-research-info-systems",
  canExport: true,

  sniff(text: string): number {
    const head = normaliseText(text.slice(0, SNIFF_WINDOW));
    let score = 0;
    if (/^\s*TY {1,2}- /m.test(head)) score = 0.95;
    else if (/^\s*ty {1,2}- /m.test(head)) score = 0.7;
    else return 0;
    if (/^ER {1,2}-/im.test(head)) score += 0.05;
    return Math.min(1, score);
  },

  parse(text: string): ParseResult {
    return parseRisRecords(text);
  },

  serialise(records: InterchangeRecord[], options: SerialiseOptions = {}): string {
    const eol = options.lineEnding ?? "\r\n";
    const body = records.map((r) => serialiseRecord(r, eol)).join(`${eol}${eol}`);
    return body ? `${body}${eol}` : "";
  },
};

registerCodec(risCodec);
