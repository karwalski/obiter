/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * endnoteXml.ts — the EndNote XML codec (EndNote's "XML" export style,
 * as written by EndNote X9, 20 and 21).
 *
 * An EndNote XML file is <xml><records><record>...</record></records></xml>
 * with every value wrapped in <style> spans. The elements are generic
 * (<secondary-title>, <volume>, <section>, ...) and each reference type
 * relabels them; endnoteRefTypes.ts records those relabellings for the UTS
 * AGLC4 reference-type table and EndNote's own legal types. This codec
 * reads a record by resolving its type, then applying each element's role
 * assignment, and writes one by inverting the same table so a re-import
 * lands every value back where it started (DECISION-038).
 *
 * Nothing throws: malformed XML is read as far as it goes and problems
 * become issues.
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
import { parseFreeTextDate, toAglcDateString } from "../mapper/dates";
import {
  endnoteTypeToKind,
  KIND_TO_GENERIC_ENDNOTE,
  SOURCE_TYPE_TO_UTS_ENDNOTE,
} from "../mapper/kinds";
import { creatorsWithRole, formatCommaName, parseCommaName } from "../mapper/names";
import { children, encodeEntities, parseXml, textOf } from "./xmlLite";
import type { XmlNode } from "./xmlLite";
import {
  ENDNOTE_DEFAULT_ID_TO_TYPE,
  ENDNOTE_ELEMENT_ORDER,
  endnoteDefaultTypeId,
  KIND_TO_UTS_ENDNOTE,
  rolesFor,
  utsRefType,
  utsRefTypeId,
} from "./endnoteRefTypes";
import type { EndnoteElement, RoleAssignment, SimpleField } from "./endnoteRefTypes";

// ─── Element geography ──────────────────────────────────────────────────────

/** Elements whose line breaks matter, read without whitespace collapsing. */
const MULTILINE_ELEMENTS: ReadonlySet<string> = new Set(["notes", "research-notes", "abstract"]);

const KNOWN_ELEMENTS: ReadonlySet<string> = new Set<string>(ENDNOTE_ELEMENT_ORDER);

/** Roles that name a plain string field on the record. */
const SIMPLE_FIELDS: ReadonlySet<string> = new Set([
  "title",
  "shortTitle",
  "containerTitle",
  "containerTitleShort",
  "collectionTitle",
  "volume",
  "issue",
  "part",
  "number",
  "numberOfPages",
  "edition",
  "publisher",
  "place",
  "institution",
  "genre",
  "medium",
  "event",
  "eventPlace",
  "language",
  "abstract",
]);

function isSimpleField(role: string): role is SimpleField {
  return SIMPLE_FIELDS.has(role);
}

/** EndNote's internal database key; meaningless outside the library it came from. */
const IGNORED_ELEMENTS: ReadonlySet<string> = new Set(["source-app", "foreign-keys"]);

const JUDICIAL_SUFFIX = /\b(CJ|JJ|JJA|JA|J|P|ACJ|FM|DCJ|AJ|AJA|NPJ|VP|DP|SDP)\b/;

const YEAR = /^\d{4}$/;

const NOTE_LINE = /\r\n|\r|\n/;

// ─── Reading a <record> ─────────────────────────────────────────────────────

interface RawRecord {
  index: number;
  typeName: string;
  typeId: string;
  recNumber?: string;
  databaseName?: string;
  values: Map<EndnoteElement, string[]>;
  /** Elements no role covers, in document order. */
  extra: Array<[string, string]>;
}

/** Text beneath a node with line breaks preserved (for notes). */
function rawTextOf(node: XmlNode | undefined): string {
  if (!node) return "";
  const parts: string[] = [node.text];
  for (const c of node.children) parts.push(rawTextOf(c));
  return parts.join("");
}

function multilineText(node: XmlNode): string {
  return rawTextOf(node)
    .split(NOTE_LINE)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function isEndnoteElement(name: string): name is EndnoteElement {
  return KNOWN_ELEMENTS.has(name);
}

function readRecord(node: XmlNode, index: number): RawRecord {
  const raw: RawRecord = { index, typeName: "", typeId: "", values: new Map(), extra: [] };

  const put = (name: string, text: string): void => {
    if (!text) return;
    if (!isEndnoteElement(name)) {
      raw.extra.push([name, text]);
      return;
    }
    const list = raw.values.get(name);
    if (list) list.push(text);
    else raw.values.set(name, [text]);
  };

  const putEach = (name: string, parent: XmlNode, childName: string): void => {
    const items = children(parent, childName);
    if (items.length === 0) {
      put(name, textOf(parent));
      return;
    }
    for (const item of items) put(name, textOf(item));
  };

  for (const el of node.children) {
    const name = el.name.toLowerCase();
    if (IGNORED_ELEMENTS.has(name)) continue;
    switch (name) {
      case "database":
        raw.databaseName = el.attrs.name || textOf(el) || undefined;
        break;
      case "rec-number":
        raw.recNumber = textOf(el) || undefined;
        break;
      case "ref-type":
        raw.typeName = (el.attrs.name || "").trim();
        raw.typeId = textOf(el);
        break;
      case "contributors":
        // Each group holds <author> children; an unknown group still has them.
        for (const group of el.children) putEach(group.name.toLowerCase(), group, "author");
        break;
      case "titles":
      case "periodical":
        // Unknown children are routed to passthrough by put().
        for (const t of el.children) put(t.name.toLowerCase(), textOf(t));
        break;
      case "dates":
        for (const d of el.children) {
          const dName = d.name.toLowerCase();
          if (dName === "year") put("year", textOf(d));
          else if (dName === "pub-dates") putEach("date", d, "date");
          else put(dName, textOf(d));
        }
        break;
      case "keywords":
        putEach("keywords", el, "keyword");
        break;
      case "urls":
        for (const group of el.children) {
          const groupName = group.name.toLowerCase();
          if (groupName === "related-urls") putEach("urls", group, "url");
          else if (groupName === "pdf-urls") putEach("pdf-urls", group, "url");
          else putEach(groupName, group, "url");
        }
        break;
      default:
        put(name, MULTILINE_ELEMENTS.has(name) ? multilineText(el) : textOf(el));
        break;
    }
  }
  return raw;
}

// ─── Mapping helpers ────────────────────────────────────────────────────────

interface MapContext {
  record: InterchangeRecord;
  raw: RawRecord;
  issues: InterchangeIssue[];
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

function readDate(ctx: MapContext, el: EndnoteElement, text: string): InterchangeDate | undefined {
  const date = parseFreeTextDate(text);
  if (date && date.year === undefined && date.month === undefined && date.day === undefined) {
    ctx.issues.push(
      issue(
        "warning",
        "date-unparsed",
        `The <${el}> value "${text}" could not be read as a date. It was kept as text.`,
        { recordIndex: ctx.raw.index, field: el }
      )
    );
  }
  return date;
}

function setYear(ctx: MapContext, el: EndnoteElement, text: string): boolean {
  const { record } = ctx;
  if (YEAR.test(text)) {
    record.issued = { ...(record.issued ?? {}), year: Number(text) };
    return true;
  }
  const parsed = readDate(ctx, el, text);
  if (parsed?.year !== undefined) {
    record.issued = { ...(record.issued ?? {}), year: parsed.year };
    return true;
  }
  record.issued = mergeDates(record.issued, parsed);
  return false;
}

function splitParties(text: string): string[] {
  return text
    .split(/[;,]/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function liftNoteLine(ctx: MapContext, line: string): boolean {
  const { record } = ctx;
  let m = /^obiter-id:\s*(.+)$/i.exec(line);
  if (m) {
    record.provenance.obiterId = m[1].trim();
    return true;
  }
  m = /^obiter-type:\s*(.+)$/i.exec(line);
  if (m) {
    record.provenance.obiterSourceType = m[1].trim();
    return true;
  }
  m = /^[A-Za-z][A-Za-z0-9]* (footnote|bibliography):\s*(.+)$/.exec(line);
  if (m) {
    addPassthrough(record, `formatted-${m[1]}`, m[2].trim());
    return true;
  }
  return false;
}

// ─── Applying a role ────────────────────────────────────────────────────────

function applyLegalRole(
  ctx: MapContext,
  el: EndnoteElement,
  role: RoleAssignment,
  single: string
): void {
  const { record } = ctx;
  const legal = legalOf(record);
  switch (role) {
    case "legal.caseName":
      legal.caseName = single;
      record.title = single;
      return;
    case "legal.reporter":
      legal.reporter = single;
      record.containerTitle = single;
      return;
    case "legal.reporterVolume":
      legal.reporterVolume = single;
      record.volume = single;
      return;
    case "legal.firstPage":
      legal.firstPage = single;
      record.pageFirst = single;
      return;
    case "legal.yearRound":
      if (setYear(ctx, el, single)) legal.yearType = "round";
      return;
    case "legal.yearSquare":
      if (YEAR.test(single)) {
        record.issued = { ...(record.issued ?? {}), year: Number(single) };
        legal.yearType = "square";
      } else {
        addPassthrough(record, el, single);
      }
      return;
    case "legal.judgesOrCourt":
      if (JUDICIAL_SUFFIX.test(single)) legal.judges = single;
      else legal.courtName = single;
      return;
    case "legal.mncNumber": {
      legal.docket = single;
      const year = record.issued?.year;
      if (/^\d+$/.test(single) && year !== undefined && legal.courtCode) {
        legal.mnc = {
          year,
          court: legal.courtCode,
          number: Number(single),
          raw: `[${year}] ${legal.courtCode} ${single}`,
        };
      }
      return;
    }
    case "legal.actTitle":
      record.title = single;
      legal.actTitle = single;
      return;
    case "legal.actYear":
      if (setYear(ctx, el, single) && record.issued?.year !== undefined) {
        legal.actYear = record.issued.year;
      }
      return;
    case "legal.parties":
      legal.parties = splitParties(single);
      return;
    case "legal.decidedDate":
    case "legal.signedDate":
    case "legal.openedDate":
    case "legal.inForceDate": {
      const date = readDate(ctx, el, single);
      if (date) Object.assign(legal, { [role.slice(6)]: date });
      return;
    }
    case "legal.decidedDate+issued": {
      const date = readDate(ctx, el, single);
      if (date) {
        legal.decidedDate = date;
        record.issued = mergeDates(record.issued, date);
      }
      return;
    }
    case "legal.signedDate+inForceDate": {
      const date = readDate(ctx, el, single);
      if (date) {
        legal.signedDate = date;
        legal.inForceDate = { ...date };
      }
      return;
    }
    case "legal.inForceDate|not-yet":
      if (/not yet/i.test(single)) addPassthrough(record, "not-yet-in-force", single);
      else legal.inForceDate = readDate(ctx, el, single);
      return;
    default:
      // legal.<text field>
      Object.assign(legal, { [role.slice(6)]: single });
      return;
  }
}

function applyRole(
  ctx: MapContext,
  el: EndnoteElement,
  role: RoleAssignment,
  values: string[]
): void {
  const { record } = ctx;
  const single = values.join("; ");

  if (role === "ignore") return;
  if (role.startsWith("passthrough:")) {
    for (const v of values) addPassthrough(record, role.slice("passthrough:".length), v);
    return;
  }
  if (role.startsWith("creators.")) {
    const creatorRole = role.slice("creators.".length) as CreatorRole;
    for (const v of values) record.creators.push(parseCommaName(v, creatorRole));
    return;
  }
  if (role.startsWith("legal.")) {
    applyLegalRole(ctx, el, role, single);
    return;
  }
  if (isSimpleField(role)) {
    record[role] = single;
    return;
  }

  switch (role) {
    case "issued":
      record.issued = mergeDates(record.issued, readDate(ctx, el, single));
      return;
    case "issued.year":
      setYear(ctx, el, single);
      return;
    case "issued.ifNoDate":
      if (ctx.raw.values.has("date")) addPassthrough(record, el, single);
      else record.issued = mergeDates(record.issued, readDate(ctx, el, single));
      return;
    case "issued.yearSquareFlag":
      if (YEAR.test(single)) {
        record.issued = { ...(record.issued ?? {}), year: Number(single) };
        addPassthrough(record, "year-square-brackets", "true");
      } else {
        addPassthrough(record, el, single);
      }
      return;
    case "accessed":
      record.accessed = readDate(ctx, el, single);
      return;
    case "eventDate":
      record.eventDate = readDate(ctx, el, single);
      return;
    case "pageRange": {
      const pages = splitPageRange(single);
      record.pageFirst = pages.first;
      if (pages.last !== undefined) {
        record.pageLast = pages.last;
        record.pageRange = single;
      }
      return;
    }
    case "pageFirst":
      record.pageFirst = single;
      return;
    case "issueOrNumber":
      if (record.kind === "article") record.issue = single;
      else record.number = single;
      return;
    case "keywords":
      record.keywords.push(...values);
      return;
    case "notes":
      for (const value of values) {
        for (const line of value.split(NOTE_LINE)) {
          const trimmed = line.trim();
          if (trimmed && !liftNoteLine(ctx, trimmed)) record.notes.push(trimmed);
        }
      }
      return;
    case "attachments":
      record.attachments.push(...values);
      return;
    case "urls": {
      const urls = values.map((u) => u.trim()).filter(Boolean);
      if (urls.length) {
        record.identifiers.url = urls[0];
        record.identifiers.urls = urls;
      }
      return;
    }
    case "identifiers.doi":
      record.identifiers.doi = single;
      return;
    case "identifiers.isbnOrIssn":
      if (looksLikeIsbn(single)) record.identifiers.isbn = single;
      else record.identifiers.issn = single;
      return;
    case "identifiers.accessionNumber": {
      record.identifiers.accessionNumber = single;
      const m = /^obiter:(.+)$/.exec(single);
      if (m) record.provenance.obiterId = m[1].trim();
      return;
    }
    case "identifiers.callNumber":
      record.identifiers.callNumber = single;
      return;
    case "provenance.sourceLabel":
      record.provenance.sourceLabel = single;
      return;
    case "containerTitle.fallback":
      if (record.containerTitle === undefined) record.containerTitle = single;
      else if (record.containerTitle !== single) addPassthrough(record, el, single);
      return;
    case "containerTitleShort.fallback":
      if (record.containerTitleShort === undefined) record.containerTitleShort = single;
      else if (record.containerTitleShort !== single) addPassthrough(record, el, single);
      return;
    case "lawReform.title":
      if (ctx.raw.values.has("secondary-title")) {
        addPassthrough(record, "royal-commission-title", single);
      } else {
        record.title = single;
      }
      return;
    case "lawReform.commission":
      addPassthrough(record, "commission", single);
      if (!ctx.raw.values.has("authors")) {
        record.creators.push({ role: "author", raw: single, literal: single });
      }
      return;
    case "lawReform.reportTitle":
      if (ctx.raw.values.has("secondary-title")) record.title = single;
      else addPassthrough(record, "report-title", single);
      return;
    default:
      return;
  }
}

// ─── Type resolution ────────────────────────────────────────────────────────

interface ResolvedType {
  /** The name whose role table applies. */
  name: string;
  kind: InterchangeKind;
  /** ref-type@name as written, or the numeric id when the name is missing. */
  rawType: string;
  fallback: boolean;
}

function resolveType(raw: RawRecord): ResolvedType {
  const rawType = raw.typeName || raw.typeId;
  if (raw.typeName) {
    const kind = endnoteTypeToKind(raw.typeName);
    if (kind) return { name: raw.typeName, kind, rawType, fallback: false };
  }
  const numeric = raw.typeId ? Number(raw.typeId) : Number.NaN;
  const defaultName = Number.isInteger(numeric) ? ENDNOTE_DEFAULT_ID_TO_TYPE[numeric] : undefined;
  if (defaultName) {
    const kind = endnoteTypeToKind(defaultName);
    if (kind) return { name: defaultName, kind, rawType, fallback: Boolean(raw.typeName) };
  }
  return { name: "Generic", kind: "generic", rawType, fallback: true };
}

// ─── Record mapping ─────────────────────────────────────────────────────────

function mapRecord(raw: RawRecord, issues: InterchangeIssue[]): InterchangeRecord {
  const type = resolveType(raw);
  if (type.fallback) {
    issues.push(
      issue(
        "warning",
        "unsupported-type",
        raw.typeName
          ? `The EndNote reference type "${raw.typeName}" is not one Obiter maps. The record was imported as ${type.kind === "generic" ? "a generic source" : `"${type.name}"`}.`
          : "The record has no reference type. It was imported as a generic source.",
        { recordIndex: raw.index, field: "ref-type" }
      )
    );
  }

  const record = createRecord(type.kind, {
    format: "endnote-xml",
    rawType: type.rawType,
    rawId: raw.recNumber,
  });
  const ctx: MapContext = { record, raw, issues };
  const roles = rolesFor(type.name);

  for (const el of ENDNOTE_ELEMENT_ORDER) {
    const values = raw.values.get(el);
    if (!values || values.length === 0) continue;
    if (el === "custom8") {
      for (const v of values) {
        const m = /^obiter-type:(.+)$/.exec(v);
        if (m) record.provenance.obiterSourceType = m[1].trim();
        else addPassthrough(record, "custom8", v);
      }
      continue;
    }
    applyRole(ctx, el, roles[el], values);
  }

  if (record.provenance.sourceLabel === undefined && raw.databaseName) {
    record.provenance.sourceLabel = raw.databaseName;
  }

  for (const [name, value] of raw.extra) addPassthrough(record, name, value);

  return record;
}

// ─── Parse ──────────────────────────────────────────────────────────────────

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Every <record> element, wherever it sits (EndNote nests under <xml><records>). */
function recordNodes(doc: XmlNode): XmlNode[] {
  const out: XmlNode[] = [];
  const walk = (node: XmlNode): void => {
    for (const c of node.children) {
      if (c.name.toLowerCase() === "record") out.push(c);
      else walk(c);
    }
  };
  walk(doc);
  return out;
}

/** Parses EndNote XML. Never throws; malformed records become issues. */
export function parseEndnoteXml(text: string): ParseResult {
  const issues: InterchangeIssue[] = [];
  const records: InterchangeRecord[] = [];
  try {
    const body = normaliseText(text);
    const doc = parseXml(body);
    const nodes = recordNodes(doc);
    if (nodes.length === 0 && body.trim()) {
      issues.push(
        issue(
          "warning",
          "parse-error",
          "No <record> elements were found. Check that the file is an EndNote XML export."
        )
      );
    }
    nodes.forEach((node, index) => {
      try {
        records.push(mapRecord(readRecord(node, index), issues));
      } catch (err) {
        issues.push(
          issue(
            "error",
            "parse-error",
            `Record ${index + 1} could not be read (${describe(err)}). It was skipped.`,
            { recordIndex: index }
          )
        );
      }
    });
  } catch (err) {
    issues.push(
      issue("error", "parse-error", `The EndNote XML could not be read (${describe(err)}).`)
    );
  }
  return { records, issues };
}

// ─── Serialise ──────────────────────────────────────────────────────────────

interface ExportContext {
  record: InterchangeRecord;
  options: SerialiseOptions;
  /** passthrough.commission for a law reform record, when present. */
  commission?: string;
}

const UTS_BY_SOURCE_TYPE: Readonly<Record<string, string | undefined>> = SOURCE_TYPE_TO_UTS_ENDNOTE;

function exportTypeName(record: InterchangeRecord, style: "uts-aglc4" | "generic"): string {
  if (style === "generic") return KIND_TO_GENERIC_ENDNOTE[record.kind];
  const sourceType = record.provenance.obiterSourceType;
  const fromSourceType = sourceType ? UTS_BY_SOURCE_TYPE[sourceType] : undefined;
  if (fromSourceType) return fromSourceType;
  // A record that arrived as a UTS type goes back out as the same type.
  const arrived = utsRefType(record.provenance.rawType);
  if (arrived && arrived.kind === record.kind) return arrived.name;
  if (record.kind === "case" && record.legal?.mnc) return "Case (Medium Neutral)";
  return KIND_TO_UTS_ENDNOTE[record.kind];
}

function one(value: string | undefined): string[] | undefined {
  return value !== undefined && value !== "" ? [value] : undefined;
}

function many(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  const list = Array.isArray(value) ? value : [value];
  return list.length ? list : undefined;
}

function yearText(date: InterchangeDate | undefined): string | undefined {
  return date?.year !== undefined ? String(date.year) : undefined;
}

/** Full date text; with `yearElsewhere` a bare year is left to <year>. */
function dateText(date: InterchangeDate | undefined, yearElsewhere: boolean): string | undefined {
  if (!date) return undefined;
  if (yearElsewhere && date.month === undefined && date.day === undefined) return date.raw;
  return toAglcDateString(date);
}

/**
 * Notes plus the formatted citation lines. A record's own `formatted` wins;
 * lines that arrived through an earlier import (passthrough
 * "formatted-footnote" / "formatted-bibliography") are re-emitted otherwise.
 */
function notesLines(ctx: ExportContext): string[] {
  const { record, options } = ctx;
  const lines = [...record.notes];
  const formatted = options.includeFormatted !== false ? record.formatted : undefined;
  const label = record.formatted?.standard || "AGLC4";
  for (const key of ["footnote", "bibliography"] as const) {
    const own = formatted?.[key];
    const values = own ? [own] : (many(record.passthrough[`formatted-${key}`]) ?? []);
    for (const v of values) lines.push(`${label} ${key}: ${v}`);
  }
  return lines;
}

function legalValueFor(ctx: ExportContext, role: RoleAssignment): string[] | undefined {
  const { record } = ctx;
  const legal = record.legal ?? {};
  switch (role) {
    case "legal.caseName":
      return one(record.title ?? legal.caseName);
    case "legal.reporter":
      return one(legal.reporter ?? record.containerTitle);
    case "legal.reporterVolume":
      return one(legal.reporterVolume ?? record.volume);
    case "legal.firstPage":
      return one(legal.firstPage ?? record.pageFirst);
    case "legal.yearRound":
      return legal.yearType === "square" ? undefined : one(yearText(record.issued));
    case "legal.yearSquare":
      return legal.yearType === "square"
        ? one(yearText(record.issued))
        : many(record.passthrough.section);
    case "legal.judgesOrCourt":
      return one(legal.judges ?? legal.courtName);
    case "legal.mncNumber":
      return one(legal.docket ?? (legal.mnc ? String(legal.mnc.number) : undefined));
    case "legal.actTitle":
      return one(record.title ?? legal.actTitle);
    case "legal.actYear":
      return one(legal.actYear !== undefined ? String(legal.actYear) : yearText(record.issued));
    case "legal.parties":
      return legal.parties && legal.parties.length ? [legal.parties.join("; ")] : undefined;
    case "legal.decidedDate":
      return one(toAglcDateString(legal.decidedDate));
    case "legal.openedDate":
      return one(toAglcDateString(legal.openedDate));
    case "legal.signedDate":
      return sameDate(legal.signedDate, legal.inForceDate)
        ? undefined
        : one(toAglcDateString(legal.signedDate));
    case "legal.inForceDate":
      return one(toAglcDateString(legal.inForceDate));
    case "legal.decidedDate+issued":
      return one(toAglcDateString(legal.decidedDate ?? record.issued));
    case "legal.signedDate+inForceDate":
      return sameDate(legal.signedDate, legal.inForceDate)
        ? one(toAglcDateString(legal.signedDate))
        : undefined;
    case "legal.inForceDate|not-yet":
      return (
        many(record.passthrough["not-yet-in-force"]) ??
        (sameDate(legal.signedDate, legal.inForceDate)
          ? undefined
          : one(toAglcDateString(legal.inForceDate)))
      );
    default: {
      const field = role.slice("legal.".length);
      const value: unknown = Object.prototype.hasOwnProperty.call(legal, field)
        ? legal[field as keyof InterchangeLegal]
        : undefined;
      return typeof value === "string" ? one(value) : undefined;
    }
  }
}

function sameDate(a: InterchangeDate | undefined, b: InterchangeDate | undefined): boolean {
  if (!a || !b) return false;
  return a.year === b.year && a.month === b.month && a.day === b.day && a.raw === b.raw;
}

function valueFor(
  ctx: ExportContext,
  el: EndnoteElement,
  role: RoleAssignment
): string[] | undefined {
  const { record } = ctx;
  const ids = record.identifiers;
  const pass = record.passthrough;

  if (el === "custom8" && record.provenance.obiterSourceType) {
    return [`obiter-type:${record.provenance.obiterSourceType}`];
  }
  if (role === "ignore") return undefined;
  if (role.startsWith("passthrough:")) return many(pass[role.slice("passthrough:".length)]);
  if (role.startsWith("creators.")) {
    const creatorRole = role.slice("creators.".length) as CreatorRole;
    let list = creatorsWithRole(record.creators, creatorRole);
    if (ctx.commission !== undefined && creatorRole === "author") {
      list = list.filter((c) => c.literal !== ctx.commission);
    }
    return list.length ? list.map(formatCommaName) : undefined;
  }
  if (role.startsWith("legal.")) return legalValueFor(ctx, role);
  if (isSimpleField(role)) return one(record[role]);

  switch (role) {
    case "issued":
      return one(dateText(record.issued, true));
    case "issued.year":
      return one(yearText(record.issued));
    case "issued.ifNoDate":
      return many(pass[el]);
    case "issued.yearSquareFlag":
      return pass["year-square-brackets"] === "true"
        ? one(yearText(record.issued))
        : many(pass[el]);
    case "accessed":
      return one(dateText(record.accessed, false));
    case "eventDate":
      return one(dateText(record.eventDate, false));
    case "pageRange":
      return one(
        record.pageRange ??
          (record.pageFirst !== undefined && record.pageLast !== undefined
            ? `${record.pageFirst}-${record.pageLast}`
            : record.pageFirst)
      );
    case "pageFirst":
      return one(record.pageFirst);
    case "issueOrNumber":
      return one(
        record.kind === "article"
          ? (record.issue ?? record.number)
          : (record.number ?? record.issue)
      );
    case "keywords":
      return record.keywords.length ? record.keywords : undefined;
    case "notes":
      return el === "notes" ? notesLines(ctx) : undefined;
    case "attachments":
      return record.attachments.length ? record.attachments : undefined;
    case "urls":
      return ids.urls && ids.urls.length ? ids.urls : one(ids.url);
    case "identifiers.doi":
      return one(ids.doi);
    case "identifiers.isbnOrIssn":
      return one(ids.isbn ?? ids.issn);
    case "identifiers.accessionNumber":
      return one(
        record.provenance.obiterId ? `obiter:${record.provenance.obiterId}` : ids.accessionNumber
      );
    case "identifiers.callNumber":
      return one(ids.callNumber);
    case "provenance.sourceLabel":
      return ["Obiter"];
    case "containerTitle.fallback":
    case "containerTitleShort.fallback":
      return many(pass[el]);
    case "lawReform.title":
      return ctx.commission !== undefined
        ? many(pass["royal-commission-title"])
        : one(record.title);
    case "lawReform.commission":
      return one(ctx.commission);
    case "lawReform.reportTitle":
      return ctx.commission !== undefined ? one(record.title) : many(pass["report-title"]);
    default:
      return undefined;
  }
}

const STYLE_OPEN = '<style face="normal" font="default" size="100%">';

function styled(text: string): string {
  return `${STYLE_OPEN}${encodeEntities(text).replace(/\r\n|\r|\n/g, "&#xD;")}</style>`;
}

function el(name: string, values: string[] | undefined): string {
  if (!values || values.length === 0) return "";
  const joined = values.join(name === "notes" || name === "research-notes" ? "\n" : "; ");
  return `<${name}>${styled(joined)}</${name}>`;
}

function elEach(name: string, itemName: string, values: string[] | undefined): string {
  if (!values || values.length === 0) return "";
  return `<${name}>${values.map((v) => `<${itemName}>${styled(v)}</${itemName}>`).join("")}</${name}>`;
}

function wrap(name: string, inner: string): string {
  return inner ? `<${name}>${inner}</${name}>` : "";
}

function attr(name: string, value: string): string {
  return ` ${name}="${encodeEntities(value)}"`;
}

function serialiseRecord(
  record: InterchangeRecord,
  index: number,
  options: SerialiseOptions
): string {
  const style = options.endnoteStyle ?? "uts-aglc4";
  const typeName = exportTypeName(record, style);
  const typeId = style === "generic" ? endnoteDefaultTypeId(typeName) : utsRefTypeId(typeName);
  const roles = rolesFor(typeName);
  const commission = many(record.passthrough.commission)?.[0];
  const ctx: ExportContext = { record, options, commission };

  const out = new Map<EndnoteElement, string[]>();
  for (const name of ENDNOTE_ELEMENT_ORDER) {
    const values = valueFor(ctx, name, roles[name]);
    if (values && values.length) out.set(name, values);
  }
  for (const [key, value] of Object.entries(record.passthrough)) {
    if (isEndnoteElement(key) && !out.has(key)) {
      const values = many(value);
      if (values) out.set(key, values);
    }
  }
  const get = (name: EndnoteElement): string[] | undefined => out.get(name);

  const parts: string[] = [
    `<database${attr("name", "Obiter.enl")}${attr("path", "Obiter.enl")}>Obiter.enl</database>`,
    `<source-app${attr("name", "Obiter")}${attr("version", "1")}>Obiter</source-app>`,
    `<rec-number>${record.provenance.rawId && /^\d+$/.test(record.provenance.rawId) ? record.provenance.rawId : String(index + 1)}</rec-number>`,
    `<ref-type${attr("name", typeName)}>${typeId}</ref-type>`,
    wrap(
      "contributors",
      elEach("authors", "author", get("authors")) +
        elEach("secondary-authors", "author", get("secondary-authors")) +
        elEach("tertiary-authors", "author", get("tertiary-authors")) +
        elEach("subsidiary-authors", "author", get("subsidiary-authors")) +
        elEach("translated-authors", "author", get("translated-authors"))
    ),
    wrap(
      "titles",
      el("title", get("title")) +
        el("secondary-title", get("secondary-title")) +
        el("tertiary-title", get("tertiary-title")) +
        el("alt-title", get("alt-title")) +
        el("short-title", get("short-title")) +
        el("translated-title", get("translated-title"))
    ),
    wrap("periodical", el("full-title", get("full-title")) + el("abbr-1", get("abbr-1"))),
    el("pages", get("pages")),
    el("volume", get("volume")),
    el("number", get("number")),
    el("num-vols", get("num-vols")),
    el("edition", get("edition")),
    el("section", get("section")),
    el("reprint-edition", get("reprint-edition")),
    elEach("keywords", "keyword", get("keywords")),
    wrap("dates", el("year", get("year")) + wrap("pub-dates", el("date", get("date")))),
    el("pub-location", get("pub-location")),
    el("publisher", get("publisher")),
    el("orig-pub", get("orig-pub")),
    el("isbn", get("isbn")),
    el("accession-num", get("accession-num")),
    el("call-num", get("call-num")),
    el("label", get("label")),
    el("work-type", get("work-type")),
    el("abstract", get("abstract")),
    el("notes", get("notes")),
    el("research-notes", get("research-notes")),
    wrap(
      "urls",
      wrap("related-urls", (get("urls") ?? []).map((u) => el("url", [u])).join("")) +
        wrap("pdf-urls", (get("pdf-urls") ?? []).map((u) => el("url", [u])).join(""))
    ),
    el("electronic-resource-num", get("electronic-resource-num")),
    el("custom1", get("custom1")),
    el("custom2", get("custom2")),
    el("custom3", get("custom3")),
    el("custom4", get("custom4")),
    el("custom5", get("custom5")),
    el("custom6", get("custom6")),
    el("custom7", get("custom7")),
    el("custom8", get("custom8")),
    el("access-date", get("access-date")),
    el("language", get("language")),
    el("auth-address", get("auth-address")),
    el("remote-database-name", get("remote-database-name")),
    el("remote-database-provider", get("remote-database-provider")),
  ];
  return `<record>${parts.join("")}</record>`;
}

// ─── Codec ──────────────────────────────────────────────────────────────────

const SNIFF_WINDOW = 4096;

export const endnoteXmlCodec: InterchangeCodec = {
  format: "endnote-xml",
  label: "EndNote XML",
  extensions: [".xml"],
  mimeType: "application/xml",
  canExport: true,

  sniff(text: string): number {
    const head = normaliseText(text.slice(0, SNIFF_WINDOW));
    if (/<b:Sources\b/.test(head)) return 0;
    if (/<records\b/i.test(head) && /<record\b/i.test(head)) return 0.95;
    if (/<ref-type\b/i.test(head)) return 0.85;
    return 0;
  },

  parse(text: string): ParseResult {
    return parseEndnoteXml(text);
  },

  serialise(records: InterchangeRecord[], options: SerialiseOptions = {}): string {
    const eol = options.lineEnding ?? "\n";
    const body = records.map((r, i) => serialiseRecord(r, i, options));
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      "<xml>",
      "<records>",
      ...body,
      "</records>",
      "</xml>",
      "",
    ].join(eol);
  },
};

registerCodec(endnoteXmlCodec);
