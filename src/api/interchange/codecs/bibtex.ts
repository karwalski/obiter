/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * bibtex.ts — the BibTeX / BibLaTeX interchange codec.
 *
 * Import
 * ------
 * A hand-written tokenizer reads `@type{key, field = value, ...}` entries
 * with `{...}`, `"..."` and bare values, `#` concatenation, `@string`
 * abbreviations (expanded), `@preamble` and `@comment` (skipped), and the
 * month macros jan..dec. Malformed input never throws: an entry with a
 * missing comma after the cite key or an unclosed brace at end of file is
 * still read, with a "parse-error" warning that names the line. LaTeX
 * escapes and accent commands become Unicode; names are split on " and "
 * before that conversion so `{Corporate Name}` braces still protect bodies.
 *
 * Export (BibLaTeX-first)
 * -----------------------
 * Records are written with BibLaTeX field names: `journaltitle` rather
 * than `journal`, `location` rather than `address`, `date` rather than
 * `year`/`month`, `urldate` for the access date, and the `@jurisdiction`,
 * `@legislation` and `@online` entry types. Every mainstream tool that
 * reads BibLaTeX (Zotero, JabRef, Mendeley, biber) accepts these; classic
 * BibTeX styles ignore the unfamiliar fields. Field order is fixed:
 * author, editor, translator, title, shorttitle, journaltitle, booktitle,
 * series, volume, number, pages, publisher, institution, location, edition,
 * date, urldate, eventtitle, venue, eventdate, type, url, doi, isbn, issn,
 * language, keywords, abstract, note, court, jurisdiction, docket, section,
 * obiterid, obitertype, then any passthrough keys that are plain
 * identifiers. Values are brace-wrapped, `& % $ # _` are backslash-escaped
 * (except in the verbatim fields url, doi and file), Unicode is left
 * as-is, entries are two-space indented and separated by a blank line.
 *
 * The AGLC-formatted citation, when the record carries one, is written as
 * `AGLC4 footnote: ...` / `AGLC4 bibliography: ...` lines inside the single
 * `note` field so other tools can display it. The cite key is the record's
 * own when it has one, otherwise `familyYearFirstword` (ASCII, lower-case)
 * with a, b, c suffixes to keep keys unique across a batch.
 */

import { registerCodec, normaliseText } from "../codec";
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
import { bibtexTypeToKind, KIND_TO_BIBTEX_TYPE } from "../mapper/kinds";
import {
  creatorsWithRole,
  formatBibTeXName,
  parseBibTeXName,
  splitBibTeXNames,
} from "../mapper/names";
import { parseFreeTextDate, toIsoDate } from "../mapper/dates";

// ─── BibEntry ───────────────────────────────────────────────────────────────

/** A parsed entry with LaTeX already converted to Unicode in every field. */
export interface BibEntry {
  entryType: string; // e.g. "article", "book", "misc"
  citeKey: string; // e.g. "smith2020"
  fields: Record<string, string>; // field name → value
}

/** An entry as the tokenizer sees it: raw field text, plus where it began. */
interface RawEntry {
  entryType: string;
  citeKey: string;
  fields: Record<string, string>;
  line: number;
}

interface TokenizeResult {
  entries: RawEntry[];
  issues: InterchangeIssue[];
}

// ─── LaTeX Escape Mapping ───────────────────────────────────────────────────

const LATEX_ESCAPES: Record<string, string> = {
  "\\&": "&",
  "\\%": "%",
  "\\$": "$",
  "\\#": "#",
  "\\_": "_",
  "\\{": "{",
  "\\}": "}",
  "\\~": "~",
  "\\^": "^",
  "\\\\": "\\",
  "\\textendash": "\u2013",
  "\\textemdash": "\u2014",
  "\\textquoteleft": "\u2018",
  "\\textquoteright": "\u2019",
  "\\textquotedblleft": "\u201C",
  "\\textquotedblright": "\u201D",
  "\\ldots": "\u2026",
  "\\ss": "\u00DF",
  "\\o": "\u00F8",
  "\\O": "\u00D8",
  "\\ae": "\u00E6",
  "\\AE": "\u00C6",
  "\\oe": "\u0153",
  "\\OE": "\u0152",
  "\\aa": "\u00E5",
  "\\AA": "\u00C5",
  "\\i": "\u0131",
  "\\l": "\u0142",
  "\\L": "\u0141",
};

/** Map of combining accent commands to Unicode combining characters. */
const ACCENT_MAP: Record<string, string> = {
  "`": "\u0300", // grave
  "'": "\u0301", // acute
  "^": "\u0302", // circumflex
  '"': "\u0308", // diaeresis
  "~": "\u0303", // tilde
  "=": "\u0304", // macron
  ".": "\u0307", // dot above
  u: "\u0306", // breve
  v: "\u030C", // caron
  H: "\u030B", // double acute
  c: "\u0327", // cedilla
  k: "\u0328", // ogonek
  d: "\u0323", // dot below
  b: "\u0331", // macron below
  r: "\u030A", // ring above
  t: "\u0361", // tie
};

// Common pre-composed accent results for normalisation
const PRECOMPOSED: Record<string, Record<string, string>> = {
  "'": {
    a: "\u00E1",
    A: "\u00C1",
    e: "\u00E9",
    E: "\u00C9",
    i: "\u00ED",
    I: "\u00CD",
    o: "\u00F3",
    O: "\u00D3",
    u: "\u00FA",
    U: "\u00DA",
    y: "\u00FD",
    Y: "\u00DD",
    c: "\u0107",
    C: "\u0106",
    n: "\u0144",
    N: "\u0143",
    s: "\u015B",
    S: "\u015A",
    z: "\u017A",
    Z: "\u0179",
  },
  "`": {
    a: "\u00E0",
    A: "\u00C0",
    e: "\u00E8",
    E: "\u00C8",
    i: "\u00EC",
    I: "\u00CC",
    o: "\u00F2",
    O: "\u00D2",
    u: "\u00F9",
    U: "\u00D9",
  },
  "^": {
    a: "\u00E2",
    A: "\u00C2",
    e: "\u00EA",
    E: "\u00CA",
    i: "\u00EE",
    I: "\u00CE",
    o: "\u00F4",
    O: "\u00D4",
    u: "\u00FB",
    U: "\u00DB",
  },
  '"': {
    a: "\u00E4",
    A: "\u00C4",
    e: "\u00EB",
    E: "\u00CB",
    i: "\u00EF",
    I: "\u00CF",
    o: "\u00F6",
    O: "\u00D6",
    u: "\u00FC",
    U: "\u00DC",
    y: "\u00FF",
  },
  "~": {
    a: "\u00E3",
    A: "\u00C3",
    n: "\u00F1",
    N: "\u00D1",
    o: "\u00F5",
    O: "\u00D5",
  },
  c: {
    c: "\u00E7",
    C: "\u00C7",
  },
};

// ─── LaTeX to Unicode Conversion ────────────────────────────────────────────

/** Private-use placeholders that keep escaped braces out of the brace strip. */
const OPEN_BRACE_MARK = "\uE000";
const CLOSE_BRACE_MARK = "\uE001";

function accentToUnicode(accent: string, char: string): string {
  const precomp = PRECOMPOSED[accent];
  if (precomp && precomp[char]) return precomp[char];
  const combining = ACCENT_MAP[accent];
  if (combining) return char + combining;
  return char;
}

/**
 * Convert common LaTeX escape sequences and accent commands to Unicode.
 *
 * Accent commands are resolved before the case-protection braces are
 * stripped, so `\c{c}` and `{\'E}` both survive. Escaped braces `\{ \}`
 * are kept as literal braces; every other brace is removed.
 */
export function convertLatexToUnicode(input: string): string {
  let result = input;

  // Literal braces first, so the strip at the end leaves them alone
  result = result.split("\\{").join(OPEN_BRACE_MARK).split("\\}").join(CLOSE_BRACE_MARK);

  // Accent commands with a braced argument: \'{e}, \c{c}, \"{o}
  result = result.replace(
    /\\([`'^"~=.ubvHckdrt])\{([a-zA-Z])\}/g,
    (_match, accent: string, char: string) => accentToUnicode(accent, char)
  );

  // Symbol accents without braces: \'e, \"o, \~n (optionally spaced)
  result = result.replace(/\\([`'^"~=.])\s?([a-zA-Z])/g, (_match, accent: string, char: string) =>
    accentToUnicode(accent, char)
  );

  // Letter accents without braces need a space or brace boundary: \c c, \v{s}
  result = result.replace(
    /\\([ubvHckdrt])\s+([a-zA-Z])(?![a-zA-Z])/g,
    (_match, accent: string, char: string) => accentToUnicode(accent, char)
  );

  // Named commands: \ss, \o, \ae, etc.
  for (const [latex, unicode] of Object.entries(LATEX_ESCAPES)) {
    if (latex === "\\{" || latex === "\\}") continue;
    // Use split/join for literal replacement (no regex special char issues)
    result = result.split(latex).join(unicode);
  }

  // Remove any remaining LaTeX commands we don't recognise (e.g. \textbf{...})
  result = result.replace(/\\[a-zA-Z]+\{([^}]*)\}/g, "$1");

  // Clean up any remaining braces used for case protection
  result = result.replace(/[{}]/g, "");

  result = result.split(OPEN_BRACE_MARK).join("{").split(CLOSE_BRACE_MARK).join("}");

  return result.replace(/\s+/g, " ").trim();
}

// ─── Tokenizer ──────────────────────────────────────────────────────────────

const MONTH_MACROS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const MONTH_NAMES: Record<string, number> = {
  ...MONTH_MACROS,
  sept: 9,
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

/** Builds an index -> 1-based line number lookup for `input`. */
function makeLineFinder(input: string): (index: number) => number {
  const starts: number[] = [];
  for (let i = 0; i < input.length; i += 1) {
    if (input.charCodeAt(i) === 10) starts.push(i + 1);
  }
  return (index: number): number => {
    let lo = 0;
    let hi = starts.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (starts[mid] <= index) lo = mid + 1;
      else hi = mid;
    }
    return lo + 1;
  };
}

function isSpace(ch: string): boolean {
  return ch === " " || ch === "\t" || ch === "\n" || ch === "\r" || ch === "\f" || ch === "\v";
}

/**
 * Finds the index just past the delimiter that closes an entry opened at
 * `openIndex` (a `{` or `(`), counting nested braces. Returns -1 when the
 * input ends first.
 */
function findEntryEnd(input: string, openIndex: number): number {
  const paren = input[openIndex] === "(";
  let depth = paren ? 0 : 1;
  let i = openIndex + 1;
  while (i < input.length) {
    const ch = input[i];
    const escaped = input[i - 1] === "\\";
    if (ch === "{" && !escaped) depth += 1;
    else if (ch === "}" && !escaped) {
      depth -= 1;
      if (!paren && depth === 0) return i + 1;
    } else if (paren && ch === ")" && depth === 0) return i + 1;
    i += 1;
  }
  return -1;
}

/**
 * Reads one value part: `{...}` (nested braces), `"..."` (braces balanced
 * inside) or a bare token. Returns the raw text and the index after it.
 */
function extractValuePart(
  input: string,
  startIndex: number
): { value: string; endIndex: number; bare: boolean } {
  let i = startIndex;
  while (i < input.length && isSpace(input[i])) i += 1;
  if (i >= input.length) return { value: "", endIndex: i, bare: false };

  const delimiter = input[i];

  if (delimiter === "{") {
    let depth = 1;
    let j = i + 1;
    while (j < input.length && depth > 0) {
      if (input[j] === "{" && input[j - 1] !== "\\") depth += 1;
      else if (input[j] === "}" && input[j - 1] !== "\\") depth -= 1;
      j += 1;
    }
    const closed = depth === 0;
    return { value: input.substring(i + 1, closed ? j - 1 : j), endIndex: j, bare: false };
  }

  if (delimiter === '"') {
    let depth = 0;
    let j = i + 1;
    while (j < input.length) {
      const ch = input[j];
      if (ch === "{" && input[j - 1] !== "\\") depth += 1;
      else if (ch === "}" && input[j - 1] !== "\\") depth = Math.max(0, depth - 1);
      else if (ch === '"' && depth === 0 && input[j - 1] !== "\\") break;
      j += 1;
    }
    return { value: input.substring(i + 1, j), endIndex: j + 1, bare: false };
  }

  // Bare value: a number, a @string name or a month macro
  let j = i;
  while (j < input.length && /[a-zA-Z0-9_:.+-]/.test(input[j])) j += 1;
  if (j === i) return { value: "", endIndex: i + 1, bare: false };
  return { value: input.substring(i, j), endIndex: j, bare: true };
}

/**
 * Extracts a whole field value: one or more parts joined by `#`. Bare
 * parts are resolved against the @string table and the month macros.
 */
function extractFieldValue(
  input: string,
  startIndex: number,
  strings: Record<string, string>
): { value: string; endIndex: number } {
  let i = startIndex;
  let value = "";
  for (;;) {
    const part = extractValuePart(input, i);
    i = part.endIndex;
    if (part.bare) {
      const key = part.value.toLowerCase();
      if (/^\d+$/.test(part.value)) value += part.value;
      else if (strings[key] !== undefined) value += strings[key];
      else if (MONTH_MACROS[key] !== undefined) value += String(MONTH_MACROS[key]);
      else value += part.value;
    } else {
      value += part.value;
    }
    let k = i;
    while (k < input.length && isSpace(input[k])) k += 1;
    if (input[k] !== "#") break;
    i = k + 1;
  }
  return { value, endIndex: i };
}

/**
 * Parses an entry body (after the cite key comma) into raw field values.
 */
function parseEntryFields(body: string, strings: Record<string, string>): Record<string, string> {
  const fields: Record<string, string> = {};
  let i = 0;

  while (i < body.length) {
    while (i < body.length && (isSpace(body[i]) || body[i] === ",")) i += 1;
    if (i >= body.length) break;

    let nameEnd = i;
    while (nameEnd < body.length && /[a-zA-Z0-9_-]/.test(body[nameEnd])) nameEnd += 1;
    if (nameEnd === i) {
      i += 1;
      continue;
    }

    const fieldName = body.substring(i, nameEnd).toLowerCase();
    i = nameEnd;

    while (i < body.length && isSpace(body[i])) i += 1;
    if (i >= body.length || body[i] !== "=") continue;
    i += 1;

    const { value, endIndex } = extractFieldValue(body, i, strings);
    fields[fieldName] = value;
    i = endIndex;
  }

  return fields;
}

/**
 * Splits an entry body into cite key and field text. A missing comma after
 * the key is tolerated: the key ends at the first whitespace or comma.
 */
function splitCiteKey(body: string): {
  citeKey: string;
  fieldsBody: string;
  commaMissing: boolean;
} {
  let i = 0;
  while (i < body.length && isSpace(body[i])) i += 1;
  let keyEnd = i;
  while (keyEnd < body.length && !isSpace(body[keyEnd]) && body[keyEnd] !== ",") keyEnd += 1;
  const citeKey = body.substring(i, keyEnd);
  let j = keyEnd;
  while (j < body.length && isSpace(body[j])) j += 1;
  if (body[j] === ",") {
    return { citeKey, fieldsBody: body.substring(j + 1), commaMissing: false };
  }
  if (body[j] === "=" || citeKey.includes("=")) {
    // No cite key at all: the first token is already a field name
    return { citeKey: "", fieldsBody: body, commaMissing: true };
  }
  return { citeKey, fieldsBody: body.substring(keyEnd), commaMissing: j < body.length };
}

/** Tokenizes BibTeX text into raw entries, expanding @string definitions. */
function tokenize(input: string): TokenizeResult {
  const entries: RawEntry[] = [];
  const issues: InterchangeIssue[] = [];
  const strings: Record<string, string> = {};
  const lineAt = makeLineFinder(input);
  let i = 0;

  while (i < input.length) {
    const atIndex = input.indexOf("@", i);
    if (atIndex === -1) break;

    let typeEnd = atIndex + 1;
    while (typeEnd < input.length && /[a-zA-Z]/.test(input[typeEnd])) typeEnd += 1;
    const entryType = input.substring(atIndex + 1, typeEnd).toLowerCase();
    if (!entryType) {
      i = typeEnd;
      continue;
    }

    let open = typeEnd;
    while (open < input.length && isSpace(input[open])) open += 1;
    if (input[open] !== "{" && input[open] !== "(") {
      i = typeEnd;
      continue;
    }

    let entryEnd = findEntryEnd(input, open);
    const line = lineAt(atIndex);
    if (entryEnd === -1) {
      issues.push(
        issue(
          "warning",
          "parse-error",
          `The @${entryType} entry starting on line ${line} is not closed; read to the end of the file.`,
          { line }
        )
      );
      entryEnd = input.length + 1;
    }
    const entryBody = input.substring(open + 1, entryEnd - 1);
    i = Math.min(entryEnd, input.length);

    if (entryType === "comment" || entryType === "preamble") continue;

    if (entryType === "string") {
      const defs = parseEntryFields(entryBody, strings);
      for (const [name, value] of Object.entries(defs)) strings[name] = value;
      continue;
    }

    const { citeKey, fieldsBody, commaMissing } = splitCiteKey(entryBody);
    if (commaMissing) {
      issues.push(
        issue(
          "warning",
          "parse-error",
          `The @${entryType} entry on line ${line} has no comma after its cite key; fields were read anyway.`,
          { line, recordIndex: entries.length }
        )
      );
    }
    const fields = parseEntryFields(fieldsBody, strings);
    entries.push({ entryType, citeKey, fields, line });
  }

  return { entries, issues };
}

// ─── Public parser ──────────────────────────────────────────────────────────

/**
 * Parse a BibTeX/BibLaTeX string into structured entries.
 *
 * Handles:
 * - Curly brace `{...}`, quote `"..."` and bare field values, `#` joins
 * - Nested braces in field values
 * - `@string` abbreviations (expanded) and month macros (jan..dec -> 1..12)
 * - `@preamble` and `@comment` (skipped)
 * - Common LaTeX escapes converted to Unicode in every field
 * - Entries with a missing comma after the cite key
 */
export function parseBibTeX(bibtexString: string): BibEntry[] {
  const { entries } = tokenize(normaliseText(bibtexString));
  return entries.map((entry) => {
    const fields: Record<string, string> = {};
    for (const [name, value] of Object.entries(entry.fields)) {
      fields[name] = convertLatexToUnicode(value);
    }
    return { entryType: entry.entryType, citeKey: entry.citeKey, fields };
  });
}

// ─── Import mapping ─────────────────────────────────────────────────────────

/** Fields BibLaTeX treats as verbatim: no LaTeX decoding in, no escaping out. */
const VERBATIM_FIELDS = new Set(["url", "doi", "file"]);

/** Written without escaping: verbatim fields plus Obiter's own identifiers. */
const UNESCAPED_ON_EXPORT = new Set([...VERBATIM_FIELDS, "obiterid", "obitertype"]);

const ISSUE_KINDS: ReadonlySet<InterchangeKind> = new Set<InterchangeKind>([
  "article",
  "newspaper",
  "periodical",
]);

const CONTAINER_AS_BOOKTITLE: ReadonlySet<InterchangeKind> = new Set<InterchangeKind>([
  "chapter",
  "conference",
]);

const LEGISLATION_KINDS: ReadonlySet<InterchangeKind> = new Set<InterchangeKind>([
  "legislation",
  "bill",
  "regulation",
  "constitution",
]);

const CASE_KINDS: ReadonlySet<InterchangeKind> = new Set<InterchangeKind>([
  "case",
  "case-transcript",
  "case-submission",
  "foreign-case",
]);

const JURISDICTIONS: Record<string, string> = {
  cth: "Cth",
  commonwealth: "Cth",
  australia: "Cth",
  au: "Cth",
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
  gb: "UK",
  nz: "NZ",
  "new zealand": "NZ",
  us: "US",
  usa: "US",
  "united states": "US",
};

/** Canonical Obiter jurisdiction code for a jurisdiction word, or undefined. */
function jurisdictionCode(text: string): string | undefined {
  return JURISDICTIONS[text.trim().replace(/[().]/g, "").toLowerCase()];
}

const ROUND_CITATION = /\((\d{4})\)\s+(\d+)\s+([A-Z][A-Za-z .]+?)\s+(\d+)\b/;
const SQUARE_CITATION = /\[(\d{4})\]\s+([A-Z]{2,10})\s+(\d+)\b/;
const LEGISLATION_TITLE =
  /\b(Act|Regulations?|Rules|Bill|Ordinance)\b.*\b(\d{4})\s*\((Cth|NSW|Vic|Qld|WA|SA|Tas|ACT|NT|UK|NZ)\)/;

function looksLikeUrl(text: string): boolean {
  return /^(https?:\/\/|www\.)/i.test(text.trim());
}

function parseCreators(raw: string, role: CreatorRole): InterchangeCreator[] {
  return splitBibTeXNames(raw).map((part) => {
    const trimmed = part.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}") && !trimmed.slice(1, -1).includes("{")) {
      const literal = convertLatexToUnicode(trimmed.slice(1, -1));
      return { role, raw: trimmed, literal };
    }
    return { ...parseBibTeXName(convertLatexToUnicode(trimmed), role), raw: trimmed };
  });
}

/** BibLaTeX date: YYYY, YYYY-MM, YYYY-MM-DD, or a range "YYYY/YYYY". */
function parseBibDate(text: string): InterchangeDate | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  if (trimmed.includes("/")) {
    const first = parseFreeTextDate(trimmed.split("/")[0]);
    return first?.year !== undefined ? { year: first.year, raw: trimmed } : { raw: trimmed };
  }
  return parseFreeTextDate(trimmed);
}

function monthNumber(text: string): number | undefined {
  const trimmed = text.trim().toLowerCase().replace(/\.$/, "");
  if (/^\d{1,2}$/.test(trimmed)) {
    const n = Number(trimmed);
    return n >= 1 && n <= 12 ? n : undefined;
  }
  return MONTH_NAMES[trimmed];
}

function buildIssued(fields: {
  date?: string;
  year?: string;
  month?: string;
  day?: string;
}): InterchangeDate | undefined {
  let issued: InterchangeDate | undefined;
  if (fields.date) issued = parseBibDate(fields.date);
  if (fields.year && issued?.year === undefined) {
    const year = fields.year.trim();
    const fromYear = /^\d{4}$/.test(year) ? { year: Number(year) } : parseFreeTextDate(year);
    issued = { ...(issued ?? {}), ...(fromYear ?? {}) };
  }
  if (fields.month) {
    const month = monthNumber(fields.month);
    if (month !== undefined) issued = { ...(issued ?? {}), month };
    else if (issued && !issued.raw) issued.raw = `${fields.month} ${fields.year ?? ""}`.trim();
  }
  if (fields.day && issued?.month !== undefined && /^\d{1,2}$/.test(fields.day.trim())) {
    issued = { ...issued, day: Number(fields.day.trim()) };
  }
  return issued;
}

function splitPages(text: string): { first?: string; last?: string; range: string } {
  const range = text.trim().replace(/\s*(?:---|--|\u2013|\u2014)\s*/g, "\u2013");
  const parts = range.split(/\s*[\u2013-]\s*/).filter(Boolean);
  if (parts.length >= 2) return { first: parts[0], last: parts[1], range };
  return { first: parts[0], range };
}

/** Pulls `obiter-id:` / `obiter-type:` lines out of a note. */
function extractObiterLines(note: string): { text: string; id?: string; type?: string } {
  let id: string | undefined;
  let type: string | undefined;
  const kept: string[] = [];
  for (const line of note.split(/\s*(?:\n|;\s)\s*/)) {
    const m = /^obiter-(id|type):\s*(.+)$/i.exec(line.trim());
    if (m) {
      if (m[1].toLowerCase() === "id") id = m[2].trim();
      else type = m[2].trim();
    } else if (line.trim()) {
      kept.push(line.trim());
    }
  }
  return { text: kept.join("; "), id, type };
}

function attachmentPaths(fileField: string): string[] {
  return fileField
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      // Zotero/JabRef triple "Description:path:mime"
      const triple = /^[^:]*:(.+):[^:]*$/.exec(part);
      return triple ? triple[1] : part;
    });
}

function legalOf(record: InterchangeRecord): InterchangeLegal {
  if (!record.legal) record.legal = {};
  return record.legal;
}

/** Applies the @misc heuristics to a still-generic record. */
function refineGeneric(record: InterchangeRecord): void {
  if (record.kind !== "generic") return;
  const title = record.title ?? "";
  const candidates = [title, ...record.notes];
  for (const text of candidates) {
    const round = ROUND_CITATION.exec(text);
    const square = round ? null : SQUARE_CITATION.exec(text);
    const match = round ?? square;
    if (!match) continue;
    record.kind = "case";
    const legal = legalOf(record);
    const citation = match[0];
    let caseName = title;
    const tail = text.slice(match.index + citation.length).trim();
    if (text === title && tail === "") {
      caseName =
        title
          .slice(0, match.index)
          .replace(/[,\s]+$/, "")
          .trim() || title;
      if (caseName !== title) record.title = caseName;
    }
    legal.caseName = caseName;
    addPassthrough(record, "citation", citation);
    if (round) {
      legal.yearType = "round";
      legal.reporterVolume = round[2];
      legal.reporter = round[3].trim();
      legal.firstPage = round[4];
    } else if (square) {
      legal.yearType = "square";
      legal.reporter = square[2];
      legal.firstPage = square[3];
    }
    if (!record.issued) record.issued = { year: Number(match[1]) };
    return;
  }
  const leg = LEGISLATION_TITLE.exec(title);
  if (leg) {
    record.kind = leg[1] === "Bill" ? "bill" : "legislation";
    const legal = legalOf(record);
    legal.jurisdiction = jurisdictionCode(leg[3]) ?? leg[3];
    return;
  }
  if (record.identifiers.url) record.kind = "web";
}

/** Maps one raw entry to an interchange record. */
function entryToRecord(
  entry: RawEntry,
  index: number,
  issues: InterchangeIssue[]
): InterchangeRecord {
  let kind = bibtexTypeToKind(entry.entryType);
  if (!kind) {
    kind = "generic";
    issues.push(
      issue(
        "warning",
        "unsupported-type",
        `BibTeX entry type @${entry.entryType} is not recognised; imported as a generic reference.`,
        { recordIndex: index, line: entry.line }
      )
    );
  }
  const record = createRecord(kind, {
    format: "bibtex",
    rawType: entry.entryType,
    rawId: entry.citeKey || undefined,
  });
  if (entry.citeKey) record.identifiers.citeKey = entry.citeKey;

  const raw = entry.fields;
  const remaining = new Set(Object.keys(raw));
  const take = (name: string): string | undefined => {
    if (!remaining.has(name)) return undefined;
    remaining.delete(name);
    const value = raw[name];
    const text = VERBATIM_FIELDS.has(name) ? value.trim() : convertLatexToUnicode(value);
    return text || undefined;
  };
  const takeRaw = (name: string): string | undefined => {
    if (!remaining.has(name)) return undefined;
    remaining.delete(name);
    return raw[name].trim() || undefined;
  };
  /** First present alias wins; the others are kept in passthrough. */
  const takeFirst = (...names: string[]): string | undefined => {
    let found: string | undefined;
    for (const name of names) {
      const value = take(name);
      if (value === undefined) continue;
      if (found === undefined) found = value;
      else addPassthrough(record, name, value);
    }
    return found;
  };

  const subtype = take("entrysubtype");
  if (subtype) {
    const lower = subtype.toLowerCase();
    if (lower === "newspaper") record.kind = "newspaper";
    else if (lower === "magazine") record.kind = "periodical";
    else addPassthrough(record, "entrysubtype", subtype);
  }

  // Creators, split before LaTeX conversion so corporate braces survive
  for (const [field, role] of [
    ["author", "author"],
    ["editor", "editor"],
    ["translator", "translator"],
  ] as const) {
    const names = takeRaw(field);
    if (!names) continue;
    for (const creator of parseCreators(names, role)) {
      if (creator.literal?.toLowerCase() === "others") {
        addPassthrough(record, "etal", "true");
        continue;
      }
      record.creators.push(creator);
    }
  }

  const title = take("title");
  const subtitle = take("subtitle");
  if (title || subtitle) record.title = [title, subtitle].filter(Boolean).join(": ");
  const shortTitle = take("shorttitle");
  if (shortTitle) record.shortTitle = shortTitle;

  const journal = takeFirst("journaltitle", "journal");
  if (journal) {
    record.containerTitle = journal;
    if (CASE_KINDS.has(record.kind)) legalOf(record).reporter = journal;
  }
  const booktitle = take("booktitle");
  if (booktitle) record.containerTitle = record.containerTitle ?? booktitle;
  if (booktitle && record.containerTitle !== booktitle)
    addPassthrough(record, "booktitle", booktitle);
  const series = take("series");
  if (series) record.collectionTitle = series;

  const issued = buildIssued({
    date: take("date"),
    year: take("year"),
    month: take("month"),
    day: take("day"),
  });
  if (issued) record.issued = issued;
  const urldate = take("urldate");
  if (urldate) record.accessed = parseBibDate(urldate);
  const eventdate = take("eventdate");
  if (eventdate) record.eventDate = parseBibDate(eventdate);

  const volume = take("volume");
  if (volume) {
    record.volume = volume;
    if (CASE_KINDS.has(record.kind)) legalOf(record).reporterVolume = volume;
  }
  const number = takeFirst("number", "issue");
  if (number) {
    if (ISSUE_KINDS.has(record.kind)) record.issue = number;
    else record.number = number;
  }
  const pages = take("pages");
  if (pages) {
    const split = splitPages(pages);
    record.pageRange = split.range;
    if (split.first) record.pageFirst = split.first;
    if (split.last) record.pageLast = split.last;
    if (CASE_KINDS.has(record.kind) && split.first) legalOf(record).firstPage = split.first;
  }

  const publisher = take("publisher");
  if (publisher) record.publisher = publisher;
  const institution = takeFirst("institution", "school", "organization");
  if (institution) {
    record.institution = institution;
    if (!record.publisher) record.publisher = institution;
  }
  const place = takeFirst("location", "address");
  if (place) {
    const code = LEGISLATION_KINDS.has(record.kind) ? jurisdictionCode(place) : undefined;
    if (code) legalOf(record).jurisdiction = code;
    else record.place = place;
  }
  const edition = take("edition");
  if (edition) record.edition = edition;
  const genre = take("type");
  if (genre) record.genre = genre;

  const url = take("url");
  if (url) record.identifiers.url = url;
  const howpublished = take("howpublished");
  if (howpublished) {
    if (looksLikeUrl(howpublished) && !record.identifiers.url) {
      record.identifiers.url = howpublished;
    } else {
      addPassthrough(record, "howpublished", howpublished);
    }
  }
  const doi = take("doi");
  if (doi) record.identifiers.doi = doi;
  const isbn = take("isbn");
  if (isbn) record.identifiers.isbn = isbn;
  const issn = take("issn");
  if (issn) record.identifiers.issn = issn;

  const abstract = take("abstract");
  if (abstract) record.abstract = abstract;
  for (const name of ["note", "annote", "annotation"]) {
    const note = take(name);
    if (!note) continue;
    const scanned = extractObiterLines(note);
    if (scanned.id) record.provenance.obiterId = scanned.id;
    if (scanned.type) record.provenance.obiterSourceType = scanned.type;
    if (scanned.text) record.notes.push(scanned.text);
  }
  const keywords = take("keywords");
  if (keywords) {
    record.keywords = keywords
      .split(/[,;]/)
      .map((k) => k.trim())
      .filter(Boolean);
  }
  const language = takeFirst("langid", "language");
  if (language) record.language = language;

  const obiterId = take("obiterid");
  if (obiterId) record.provenance.obiterId = obiterId;
  const obiterType = take("obitertype");
  if (obiterType) record.provenance.obiterSourceType = obiterType;

  const court = take("court");
  if (court) legalOf(record).courtName = court;
  const jurisdiction = take("jurisdiction");
  if (jurisdiction) legalOf(record).jurisdiction = jurisdictionCode(jurisdiction) ?? jurisdiction;
  const docket = take("docket");
  if (docket) legalOf(record).docket = docket;
  const reporter = take("reporter");
  if (reporter) legalOf(record).reporter = reporter;
  const section = take("section");
  if (section) legalOf(record).section = section;

  const event = take("eventtitle");
  if (event) record.event = event;
  const venue = take("venue");
  if (venue) record.eventPlace = venue;
  const version = take("version");
  if (version) addPassthrough(record, "version", version);
  const file = takeRaw("file");
  if (file) record.attachments.push(...attachmentPaths(file));

  for (const name of remaining) {
    const value = VERBATIM_FIELDS.has(name) ? raw[name].trim() : convertLatexToUnicode(raw[name]);
    if (value) addPassthrough(record, name, value);
  }

  if (CASE_KINDS.has(record.kind) && record.title && !record.legal?.caseName) {
    legalOf(record).caseName = record.title;
  }
  refineGeneric(record);

  return record;
}

// ─── Export ─────────────────────────────────────────────────────────────────

/** Name fields keep their structural braces ({Corporate Name}); only the LaTeX specials are escaped. */
const NAME_FIELDS_ON_EXPORT = new Set(["author", "editor", "translator"]);

function escapeNameField(text: string): string {
  return text.replace(/([&%$#_])/g, "\\$1");
}

function escapeValue(text: string): string {
  // Braces are structural in BibTeX; a literal brace inside a value (JSON
  // in a note, a set-theoretic title) must be escaped or the field ends early.
  return text.replace(/([&%$#_{}])/g, "\\$1");
}

function asciiWord(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toLowerCase();
}

const KEY_STOPWORDS = new Set(["a", "an", "the"]);

function generateCiteKey(record: InterchangeRecord): string {
  const first =
    creatorsWithRole(record.creators, "author")[0] ??
    creatorsWithRole(record.creators, "editor")[0] ??
    record.creators[0];
  const familySource = first ? (first.family ?? first.literal ?? first.raw) : "";
  const family = asciiWord(familySource.split(/\s+/)[0] ?? "");
  const year = record.issued?.year !== undefined ? String(record.issued.year) : "";
  const titleWords = (record.title ?? record.legal?.caseName ?? "")
    .split(/\s+/)
    .map(asciiWord)
    .filter((w) => w && !KEY_STOPWORDS.has(w));
  const word = titleWords[0] ?? "";
  return `${family}${year}${word}` || "ref";
}

function uniqueKey(base: string, used: Set<string>): string {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  for (let n = 0; ; n += 1) {
    const suffix = String.fromCharCode(97 + (n % 26)).repeat(Math.floor(n / 26) + 1);
    const candidate = `${base}${suffix}`;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }
}

function joinNames(creators: InterchangeCreator[]): string {
  return creators.map(formatBibTeXName).join(" and ");
}

function pagesValue(record: InterchangeRecord): string | undefined {
  if (CASE_KINDS.has(record.kind) && record.legal?.firstPage) return record.legal.firstPage;
  const range = record.pageRange ?? record.pageFirst;
  return range?.replace(/\u2013/g, "--");
}

function noteValue(record: InterchangeRecord, includeFormatted: boolean): string | undefined {
  const lines = [...record.notes];
  if (includeFormatted && record.formatted) {
    if (record.formatted.footnote) lines.push(`AGLC4 footnote: ${record.formatted.footnote}`);
    if (record.formatted.bibliography) {
      lines.push(`AGLC4 bibliography: ${record.formatted.bibliography}`);
    }
  }
  return lines.length ? lines.join("; ") : undefined;
}

/** Field name -> value pairs for one record, in the documented order. */
function recordFields(
  record: InterchangeRecord,
  includeFormatted: boolean
): Array<[string, string]> {
  const legal = record.legal ?? {};
  const kind = record.kind;
  const isCase = CASE_KINDS.has(kind);
  const isLegislation = LEGISLATION_KINDS.has(kind);
  const useBooktitle = CONTAINER_AS_BOOKTITLE.has(kind);
  const container = record.containerTitle;
  const etal = record.passthrough.etal === "true";

  const authors = joinNames(creatorsWithRole(record.creators, "author"));
  const out: Array<[string, string | undefined]> = [
    ["author", authors ? (etal ? `${authors} and others` : authors) : undefined],
    ["editor", joinNames(creatorsWithRole(record.creators, "editor")) || undefined],
    ["translator", joinNames(creatorsWithRole(record.creators, "translator")) || undefined],
    ["title", record.title ?? (isCase ? legal.caseName : undefined)],
    ["shorttitle", record.shortTitle],
    [
      "journaltitle",
      useBooktitle ? undefined : ((isCase ? legal.reporter : undefined) ?? container),
    ],
    ["booktitle", useBooktitle ? container : undefined],
    ["series", record.collectionTitle],
    ["volume", isCase ? (legal.reporterVolume ?? record.volume) : record.volume],
    ["number", record.issue ?? record.number],
    ["pages", pagesValue(record)],
    ["publisher", record.publisher],
    ["institution", record.institution],
    ["location", isLegislation ? (legal.jurisdiction ?? record.place) : record.place],
    ["edition", record.edition],
    ["date", toIsoDate(record.issued)],
    ["urldate", toIsoDate(record.accessed)],
    ["eventtitle", record.event],
    ["venue", record.eventPlace],
    ["eventdate", toIsoDate(record.eventDate)],
    ["type", record.genre],
    ["url", record.identifiers.url],
    ["doi", record.identifiers.doi],
    ["isbn", record.identifiers.isbn],
    ["issn", record.identifiers.issn],
    ["language", record.language],
    ["keywords", record.keywords.length ? record.keywords.join(", ") : undefined],
    ["abstract", record.abstract],
    ["note", noteValue(record, includeFormatted)],
    ["court", legal.courtName],
    ["jurisdiction", legal.jurisdiction],
    ["docket", legal.docket],
    ["section", legal.section],
    ["obiterid", record.provenance.obiterId],
    ["obitertype", record.provenance.obiterSourceType],
  ];

  const fields: Array<[string, string]> = [];
  const seen = new Set<string>();
  for (const [name, value] of out) {
    if (value === undefined || value === "") continue;
    fields.push([name, value]);
    seen.add(name);
  }
  for (const [key, value] of Object.entries(record.passthrough)) {
    if (key === "etal" || seen.has(key) || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(key)) continue;
    const text = Array.isArray(value) ? value.join("; ") : value;
    if (text) fields.push([key.toLowerCase(), text]);
  }
  return fields;
}

function serialiseRecords(records: InterchangeRecord[], options: SerialiseOptions = {}): string {
  const eol = options.lineEnding ?? "\n";
  const includeFormatted = options.includeFormatted !== false;
  const used = new Set<string>();
  const blocks = records.map((record) => {
    const type = KIND_TO_BIBTEX_TYPE[record.kind] ?? "misc";
    const key = uniqueKey(record.identifiers.citeKey?.trim() || generateCiteKey(record), used);
    const lines = recordFields(record, includeFormatted).map(([name, value]) => {
      const text = UNESCAPED_ON_EXPORT.has(name)
        ? value
        : NAME_FIELDS_ON_EXPORT.has(name)
          ? escapeNameField(value)
          : escapeValue(value);
      return `  ${name} = {${text}}`;
    });
    const body = lines.length ? `${lines.join(`,${eol}`)}${eol}` : "";
    return `@${type}{${key},${eol}${body}}`;
  });
  return blocks.length ? blocks.join(`${eol}${eol}`) + eol : "";
}

// ─── Codec ──────────────────────────────────────────────────────────────────

const ENTRY_HEAD = /@([A-Za-z]+)\s*[{(]/g;

function sniffBibTeX(text: string): number {
  const head = text.slice(0, 4096);
  const firstAt = head.indexOf("@");
  if (firstAt === -1) return 0;
  if (head.slice(0, firstAt).includes("<")) return 0;
  const types: string[] = [];
  ENTRY_HEAD.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ENTRY_HEAD.exec(head)) !== null) types.push(m[1].toLowerCase());
  if (types.length === 0) return 0;
  const onlyDirectives = types.every((t) => t === "comment" || t === "string" || t === "preamble");
  return onlyDirectives ? 0.6 : 0.9;
}

function parseBibTeXText(text: string): ParseResult {
  try {
    const { entries, issues } = tokenize(normaliseText(text));
    const records = entries.map((entry, index) => entryToRecord(entry, index, issues));
    return { records, issues };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      records: [],
      issues: [
        issue("error", "parse-error", `The BibTeX text could not be read: ${message}`, { line: 1 }),
      ],
    };
  }
}

export const bibtexCodec: InterchangeCodec = {
  format: "bibtex",
  label: "BibTeX",
  extensions: [".bib", ".bibtex"],
  mimeType: "application/x-bibtex",
  canExport: true,
  sniff: sniffBibTeX,
  parse: parseBibTeXText,
  serialise: serialiseRecords,
};

registerCodec(bibtexCodec);
