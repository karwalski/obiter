/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * cslJson.ts — the CSL-JSON codec (Zotero, Mendeley, Better BibTeX,
 * citeproc-js). CSL-JSON is the closest of the interchange formats to the
 * canonical record: generic fields map one to one, and the legal block is
 * filled from the CSL fields Zotero uses for cases, statutes and bills.
 *
 * Anything without a slot is kept in `passthrough` under its CSL key and
 * re-emitted verbatim on export, so a Zotero library survives a round trip
 * through Obiter intact (DECISION-038).
 */

import { registerCodec, normaliseText } from "../codec";
import type { InterchangeCodec, ParseResult, SerialiseOptions } from "../codec";
import { addPassthrough, createRecord, issue } from "../model";
import type {
  CreatorRole,
  InterchangeDate,
  InterchangeIssue,
  InterchangeKind,
  InterchangeRecord,
} from "../model";
import { parseDateParts, parseFreeTextDate, toDateParts } from "../mapper/dates";
import { cslTypeToKind, KIND_TO_CSL_TYPE } from "../mapper/kinds";
import { creatorsWithRole, formatCslName, parseCslName } from "../mapper/names";
import type { CslName } from "../mapper/names";

type JsonObject = Record<string, unknown>;

/** CSL creator keys and the role each carries. */
const CREATOR_KEYS: ReadonlyArray<readonly [string, CreatorRole]> = [
  ["author", "author"],
  ["editor", "editor"],
  ["translator", "translator"],
  ["director", "director"],
  ["interviewer", "interviewer"],
  ["recipient", "recipient"],
];

/** CSL jurisdiction codes -> Obiter jurisdiction codes. */
const JURISDICTION_CODES: Readonly<Record<string, string>> = {
  au: "Cth",
  "au-cth": "Cth",
  "au-nsw": "NSW",
  "au-vic": "Vic",
  "au-qld": "Qld",
  "au-wa": "WA",
  "au-sa": "SA",
  "au-tas": "Tas",
  "au-act": "ACT",
  "au-nt": "NT",
  gb: "UK",
  uk: "UK",
  nz: "NZ",
  us: "US",
  ca: "Canada",
};

/** Obiter jurisdiction codes, lower-cased for lookup. */
const OBITER_JURISDICTIONS: Readonly<Record<string, string>> = {
  cth: "Cth",
  commonwealth: "Cth",
  nsw: "NSW",
  vic: "Vic",
  qld: "Qld",
  wa: "WA",
  sa: "SA",
  tas: "Tas",
  act: "ACT",
  nt: "NT",
  uk: "UK",
  nz: "NZ",
  us: "US",
  canada: "Canada",
};

/** Passthrough keys the codec writes itself and must not re-emit verbatim. */
const RESERVED_PASSTHROUGH = new Set(["formatted-footnote", "formatted-bibliography", "code"]);

const NOTE_OBITER_ID = /^obiter-id:\s*(.+?)\s*$/i;
const NOTE_OBITER_TYPE = /^obiter-type:\s*(.+?)\s*$/i;
const NOTE_FOOTNOTE = /^AGLC\w*\s+footnote:\s*(.*?)\s*$/i;
const NOTE_BIBLIOGRAPHY = /^AGLC\w*\s+bibliography:\s*(.*?)\s*$/i;

const PARSE_ADVICE = "Export the library again from Zotero or Mendeley and try again.";

// ─── helpers ────────────────────────────────────────────────────────────────

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A scalar as text; objects and arrays as JSON so nothing is lost. */
function stringify(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

/** A trimmed string, or undefined when the value is empty or absent. */
function text(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const out = stringify(value).trim();
  return out || undefined;
}

/** Obiter jurisdiction code for a CSL jurisdiction value, else the text as given. */
export function normaliseJurisdiction(value: string): string {
  const key = value.trim().toLowerCase();
  return JURISDICTION_CODES[key] ?? OBITER_JURISDICTIONS[key] ?? value.trim();
}

/** True when the text is a recognised jurisdiction code or name. */
function looksLikeJurisdiction(value: string): boolean {
  const key = value.trim().toLowerCase();
  return key in JURISDICTION_CODES || key in OBITER_JURISDICTIONS;
}

/** Parses a CSL date variable: {"date-parts": [[y,m,d]]}, {raw}, {literal} or a string. */
function parseCslDate(value: unknown): InterchangeDate | undefined {
  if (typeof value === "string" || typeof value === "number") {
    return parseFreeTextDate(String(value));
  }
  if (!isObject(value)) return undefined;
  const raw = text(value.raw) ?? text(value.literal);
  const parts = parseDateParts(value["date-parts"]);
  if (parts) {
    if (raw) parts.raw = raw;
    return parts;
  }
  return raw ? (parseFreeTextDate(raw) ?? { raw }) : undefined;
}

/** CSL date object; free text that accompanied a structured date rides along as `raw`. */
function writeCslDate(date: InterchangeDate | undefined): unknown {
  const out = toDateParts(date);
  if (out && "date-parts" in out && date?.raw) return { ...out, raw: date.raw };
  return out;
}

/** Picks the string members of a CSL name object. */
function toCslName(value: JsonObject): CslName {
  const name: CslName = {};
  for (const key of [
    "family",
    "given",
    "suffix",
    "literal",
    "dropping-particle",
    "non-dropping-particle",
  ] as const) {
    const part = text(value[key]);
    if (part) name[key] = part;
  }
  return name;
}

function splitPages(page: string): { first: string; last?: string } {
  const m = /^\s*([^\s–-]+)\s*[–-]\s*([^\s–-]+)\s*$/.exec(page);
  if (!m) return { first: page.trim() };
  return { first: m[1], last: m[2] };
}

function splitKeywords(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((k) => stringify(k).trim()).filter(Boolean);
  }
  const joined = text(value);
  if (!joined) return [];
  return joined
    .split(/[,;]/)
    .map((k) => k.trim())
    .filter(Boolean);
}

function legalOf(record: InterchangeRecord): NonNullable<InterchangeRecord["legal"]> {
  if (!record.legal) record.legal = {};
  return record.legal;
}

function isCase(kind: InterchangeKind): boolean {
  return kind === "case" || kind === "case-transcript" || kind === "case-submission";
}

function isStatute(kind: InterchangeKind): boolean {
  return kind === "legislation" || kind === "bill";
}

function hasLegislature(kind: InterchangeKind): boolean {
  return kind === "bill" || kind === "hearing" || kind === "hansard";
}

// ─── import ─────────────────────────────────────────────────────────────────

const CREATOR_ROLES = new Map<string, CreatorRole>(CREATOR_KEYS);

function readCreators(record: InterchangeRecord, role: CreatorRole, value: unknown): void {
  const list = Array.isArray(value) ? value : [value];
  for (const entry of list) {
    if (isObject(entry)) {
      record.creators.push(parseCslName(toCslName(entry), role));
    } else {
      const raw = text(entry);
      if (raw) record.creators.push(parseCslName({ literal: raw }, role));
    }
  }
}

/** Splits a CSL note into lines, lifting Obiter identity and formatted output. */
function readNote(record: InterchangeRecord, value: unknown): void {
  const note = text(value);
  if (!note) return;
  for (const rawLine of note.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    let m = NOTE_OBITER_ID.exec(line);
    if (m) {
      record.provenance.obiterId = m[1];
      continue;
    }
    m = NOTE_OBITER_TYPE.exec(line);
    if (m) {
      record.provenance.obiterSourceType = m[1];
      continue;
    }
    m = NOTE_FOOTNOTE.exec(line);
    if (m) {
      addPassthrough(record, "formatted-footnote", m[1]);
      continue;
    }
    m = NOTE_BIBLIOGRAPHY.exec(line);
    if (m) {
      addPassthrough(record, "formatted-bibliography", m[1]);
      continue;
    }
    record.notes.push(line);
  }
}

/** Reads one CSL item into a record. */
function readItem(item: JsonObject, index: number, issues: InterchangeIssue[]): InterchangeRecord {
  const rawType = text(item.type) ?? "";
  const mapped = rawType ? cslTypeToKind(rawType) : undefined;
  const kind = mapped ?? "generic";
  const record = createRecord(kind, { format: "csl-json", rawType });
  if (!mapped) {
    issues.push(
      issue(
        "warning",
        "unsupported-type",
        rawType
          ? `Record ${index + 1} has the CSL type "${rawType}", which Obiter does not map. It was imported as a generic source; choose its source type in the preview.`
          : `Record ${index + 1} has no CSL type. It was imported as a generic source; choose its source type in the preview.`,
        { recordIndex: index, field: "type" }
      )
    );
  }

  for (const [key, value] of Object.entries(item)) {
    if (value === undefined || value === null) continue;
    const role = CREATOR_ROLES.get(key);
    if (role) {
      readCreators(record, role, value);
      continue;
    }
    const str = text(value);
    switch (key) {
      case "type":
        break;
      case "id":
        record.provenance.rawId = str;
        break;
      case "citation-key":
        record.identifiers.citeKey = str;
        break;
      case "title":
        record.title = str;
        if (str && isCase(kind)) legalOf(record).caseName = str;
        break;
      case "title-short":
      case "shortTitle":
        record.shortTitle = str;
        break;
      case "container-title":
        if (!str) break;
        if (isCase(kind)) {
          legalOf(record).reporter = str;
        } else if (isStatute(kind)) {
          addPassthrough(record, "code", str);
          if (looksLikeJurisdiction(str) && !legalOf(record).jurisdiction) {
            legalOf(record).jurisdiction = normaliseJurisdiction(str);
          }
        } else {
          record.containerTitle = str;
        }
        break;
      case "container-title-short":
        record.containerTitleShort = str;
        break;
      case "collection-title":
        record.collectionTitle = str;
        break;
      case "issued":
        record.issued = parseCslDate(value);
        break;
      case "accessed":
        record.accessed = parseCslDate(value);
        break;
      case "event-date":
        record.eventDate = parseCslDate(value);
        break;
      case "volume":
        if (!str) break;
        if (isCase(kind)) legalOf(record).reporterVolume = str;
        else if (kind === "legislation") legalOf(record).actNumber = str;
        else record.volume = str;
        break;
      case "issue":
        record.issue = str;
        break;
      case "number":
        if (!str) break;
        if (isCase(kind)) legalOf(record).docket = str;
        else if (isStatute(kind)) legalOf(record).documentNumber = str;
        else record.number = str;
        break;
      case "page": {
        if (!str) break;
        const pages = splitPages(str);
        if (isCase(kind)) {
          legalOf(record).firstPage = pages.first;
        } else {
          record.pageRange = str;
          record.pageFirst = pages.first;
          if (pages.last) record.pageLast = pages.last;
        }
        break;
      }
      case "page-first":
        if (str && !record.pageFirst) record.pageFirst = str;
        break;
      case "publisher":
        record.publisher = str;
        break;
      case "publisher-place":
        record.place = str;
        break;
      case "edition":
        record.edition = str;
        break;
      case "genre":
        record.genre = str;
        break;
      case "medium":
        record.medium = str;
        break;
      case "event":
      case "event-title":
        record.event = str;
        break;
      case "event-place":
        record.eventPlace = str;
        break;
      case "authority":
        if (!str) break;
        if (isCase(kind)) legalOf(record).courtName = str;
        else if (hasLegislature(kind)) legalOf(record).legislature = str;
        else addPassthrough(record, "authority", str);
        break;
      case "jurisdiction":
        if (str) legalOf(record).jurisdiction = normaliseJurisdiction(str);
        break;
      case "section":
        if (str) legalOf(record).section = str;
        break;
      case "references":
        if (str) legalOf(record).history = str;
        break;
      case "chapter-number":
        if (str) legalOf(record).session = str;
        break;
      case "URL":
        record.identifiers.url = str;
        break;
      case "DOI":
        record.identifiers.doi = str;
        break;
      case "ISBN":
        record.identifiers.isbn = str;
        break;
      case "ISSN":
        record.identifiers.issn = str;
        break;
      case "language":
        record.language = str;
        break;
      case "abstract":
        record.abstract = str;
        break;
      case "keyword":
        record.keywords.push(...splitKeywords(value));
        break;
      case "note":
        readNote(record, value);
        break;
      default:
        if (Array.isArray(value)) {
          for (const entry of value) addPassthrough(record, key, stringify(entry));
        } else {
          addPassthrough(record, key, stringify(value));
        }
        break;
    }
  }

  return record;
}

// ─── export ─────────────────────────────────────────────────────────────────

/** A passthrough value back to JSON: objects that were stringified are parsed again. */
function reviveValue(value: string): unknown {
  const trimmed = value.trim();
  if (/^[[{]/.test(trimmed)) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return value;
}

function noteOf(record: InterchangeRecord, includeFormatted: boolean): string | undefined {
  const lines = [...record.notes];
  const { provenance, formatted, passthrough } = record;
  if (provenance.obiterId) lines.push(`obiter-id: ${provenance.obiterId}`);
  if (provenance.obiterSourceType) lines.push(`obiter-type: ${provenance.obiterSourceType}`);
  if (includeFormatted) {
    if (formatted) {
      const label = formatted.standard || "AGLC4";
      if (formatted.footnote) lines.push(`${label} footnote: ${formatted.footnote}`);
      if (formatted.bibliography) lines.push(`${label} bibliography: ${formatted.bibliography}`);
    } else {
      const footnote = passthrough["formatted-footnote"];
      const bibliography = passthrough["formatted-bibliography"];
      if (typeof footnote === "string") lines.push(`AGLC4 footnote: ${footnote}`);
      if (typeof bibliography === "string") lines.push(`AGLC4 bibliography: ${bibliography}`);
    }
  }
  return lines.length ? lines.join("\n") : undefined;
}

function writeItem(record: InterchangeRecord, includeFormatted: boolean): JsonObject {
  const { kind, legal = {}, identifiers, provenance, passthrough } = record;
  const item: JsonObject = {};
  const set = (key: string, value: unknown): void => {
    if (value === undefined || value === "") return;
    if (Array.isArray(value) && value.length === 0) return;
    item[key] = value;
  };

  set("id", provenance.rawId ?? provenance.obiterId);
  set("type", KIND_TO_CSL_TYPE[kind]);
  set("citation-key", identifiers.citeKey);
  set("title", record.title ?? (isCase(kind) ? legal.caseName : undefined));
  set("title-short", record.shortTitle);
  for (const [key, role] of CREATOR_KEYS) {
    set(key, creatorsWithRole(record.creators, role).map(formatCslName));
  }
  if (isCase(kind)) {
    set("container-title", legal.reporter ?? record.containerTitle);
  } else if (isStatute(kind)) {
    const code = passthrough.code;
    set("container-title", record.containerTitle ?? (typeof code === "string" ? code : code?.[0]));
  } else {
    set("container-title", record.containerTitle);
  }
  set("container-title-short", record.containerTitleShort);
  set("collection-title", record.collectionTitle);
  set("issued", writeCslDate(record.issued));
  set("accessed", writeCslDate(record.accessed));
  set("event-date", writeCslDate(record.eventDate));
  if (isCase(kind)) set("volume", legal.reporterVolume ?? record.volume);
  else if (kind === "legislation") set("volume", legal.actNumber ?? record.volume);
  else set("volume", record.volume);
  set("issue", record.issue);
  if (isCase(kind)) set("number", legal.docket ?? record.number);
  else if (isStatute(kind)) set("number", legal.documentNumber ?? record.number);
  else set("number", record.number);
  if (isCase(kind)) set("page", legal.firstPage ?? record.pageRange ?? record.pageFirst);
  else set("page", record.pageRange ?? record.pageFirst);
  set("publisher", record.publisher);
  set("publisher-place", record.place);
  set("edition", record.edition);
  set("genre", record.genre);
  set("medium", record.medium);
  set("event", record.event);
  set("event-place", record.eventPlace);
  if (isCase(kind)) set("authority", legal.courtName);
  else if (hasLegislature(kind)) set("authority", legal.legislature);
  set("jurisdiction", legal.jurisdiction);
  set("section", legal.section);
  set("references", legal.history);
  set("chapter-number", legal.session);
  set("URL", identifiers.url);
  set("DOI", identifiers.doi);
  set("ISBN", identifiers.isbn);
  set("ISSN", identifiers.issn);
  set("language", record.language);
  set("abstract", record.abstract);
  set("keyword", record.keywords.length ? record.keywords.join(", ") : undefined);
  set("note", noteOf(record, includeFormatted));

  for (const [key, value] of Object.entries(passthrough)) {
    if (RESERVED_PASSTHROUGH.has(key) || key in item) continue;
    if (Array.isArray(value)) {
      item[key] = value.map(reviveValue);
    } else {
      item[key] = reviveValue(value);
    }
  }

  return item;
}

// ─── codec ──────────────────────────────────────────────────────────────────

export const cslJsonCodec: InterchangeCodec = {
  format: "csl-json",
  label: "CSL-JSON",
  extensions: [".json"],
  mimeType: "application/json",
  canExport: true,

  sniff(text: string): number {
    const head = normaliseText(text).trimStart();
    if (!head.startsWith("[") && !head.startsWith("{")) return 0;
    if (head.includes('"sourceType"')) return 0.3;
    const hasType = head.includes('"type"');
    const hasIdentity = head.includes('"title"') || head.includes('"id"');
    return hasType && hasIdentity ? 0.9 : 0.3;
  },

  parse(text: string): ParseResult {
    const issues: InterchangeIssue[] = [];
    const records: InterchangeRecord[] = [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(normaliseText(text).trim());
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      issues.push(
        issue("error", "parse-error", `Could not read the CSL-JSON: ${reason}. ${PARSE_ADVICE}`)
      );
      return { records, issues };
    }

    let items: unknown[];
    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (isObject(parsed)) {
      items = [parsed];
    } else {
      issues.push(
        issue(
          "error",
          "parse-error",
          `Could not read the CSL-JSON: expected a list of items or a single item, not ${typeof parsed}. ${PARSE_ADVICE}`
        )
      );
      return { records, issues };
    }

    items.forEach((entry, index) => {
      if (!isObject(entry)) {
        issues.push(
          issue(
            "warning",
            "parse-error",
            `Item ${index + 1} is not a CSL item object and was skipped.`,
            { recordIndex: index }
          )
        );
        return;
      }
      records.push(readItem(entry, records.length, issues));
    });

    return { records, issues };
  },

  serialise(records: InterchangeRecord[], options: SerialiseOptions = {}): string {
    const includeFormatted = options.includeFormatted !== false;
    const items = records.map((record) => writeItem(record, includeFormatted));
    const json = JSON.stringify(items, null, 2);
    return options.lineEnding === "\r\n" ? json.replace(/\n/g, "\r\n") : json;
  },
};

registerCodec(cslJsonCodec);
