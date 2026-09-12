/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * legal.ts — string rules the mapper needs for primary sources: party
 * splitting, report and medium neutral citations, statute titles,
 * jurisdiction codes, judges and courts, treaty series, pages and editions.
 *
 * Existing parsers are reused wherever they exist: tokeniseMNC,
 * parseCitation and parseStatuteRef from the citation parser, and the
 * report-series and court-identifier data tables.
 */

import { parseCitation, parseStatuteRef, tokeniseMNC } from "../../citationParser";
import { getByAbbreviation, ALL_REPORT_SERIES } from "../../../engine/data/report-series";
import type { ReportSeriesEntry } from "../../../engine/data/report-series";
import {
  COURT_IDENTIFIERS,
  getByCode,
  searchCourtIdentifiers,
} from "../../../engine/data/court-identifiers";
import { getUKCourtByCode, UK_COURT_IDENTIFIERS } from "../../../engine/data/uk-court-identifiers";
import { getUKReportSeriesByAbbreviation } from "../../../engine/data/uk-report-series";
import { getNZCourtByCode, NZ_COURT_IDENTIFIERS } from "../../../engine/data/nz-court-identifiers";
import { getNZReportSeriesByAbbreviation } from "../../../engine/data/nz-report-series";
import { AU_JUDICIAL_TITLES } from "../../../engine/data/judicial-titles";
import type { JudicialOfficerRef } from "../../../engine/rules/v4/domestic/cases-supplementary";

// ─── Jurisdictions ──────────────────────────────────────────────────────────

/** Obiter jurisdiction code -> long form used by Hansard (rule 7.5.1). */
export const JURISDICTION_LONG_FORM: Readonly<Record<string, string>> = {
  Cth: "Commonwealth",
  NSW: "New South Wales",
  Vic: "Victoria",
  Qld: "Queensland",
  WA: "Western Australia",
  SA: "South Australia",
  Tas: "Tasmania",
  ACT: "Australian Capital Territory",
  NT: "Northern Territory",
  NZ: "New Zealand",
  UK: "United Kingdom",
  US: "United States",
  Canada: "Canada",
};

const JURISDICTION_ALIASES: Readonly<Record<string, string>> = {
  cth: "Cth",
  commonwealth: "Cth",
  "commonwealth of australia": "Cth",
  federal: "Cth",
  australia: "Cth",
  au: "Cth",
  aus: "Cth",
  nsw: "NSW",
  "new south wales": "NSW",
  "au-nsw": "NSW",
  vic: "Vic",
  victoria: "Vic",
  "au-vic": "Vic",
  qld: "Qld",
  queensland: "Qld",
  "au-qld": "Qld",
  wa: "WA",
  "western australia": "WA",
  "au-wa": "WA",
  sa: "SA",
  "south australia": "SA",
  "au-sa": "SA",
  tas: "Tas",
  tasmania: "Tas",
  "au-tas": "Tas",
  act: "ACT",
  "australian capital territory": "ACT",
  "au-act": "ACT",
  nt: "NT",
  "northern territory": "NT",
  "au-nt": "NT",
  nz: "NZ",
  "new zealand": "NZ",
  uk: "UK",
  gb: "UK",
  "united kingdom": "UK",
  england: "UK",
  "england and wales": "UK",
  scotland: "UK",
  wales: "UK",
  "northern ireland": "UK",
  us: "US",
  usa: "US",
  "united states": "US",
  "united states of america": "US",
  ca: "Canada",
  canada: "Canada",
};

export const AU_JURISDICTIONS = new Set([
  "Cth",
  "NSW",
  "Vic",
  "Qld",
  "WA",
  "SA",
  "Tas",
  "ACT",
  "NT",
]);

/** Normalises any spelling to Obiter's code, or undefined when unknown. */
export function normaliseJurisdiction(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const key = text
    .trim()
    .replace(/^\(|\)$/g, "")
    .toLowerCase();
  return JURISDICTION_ALIASES[key];
}

/** True for Australian jurisdictions (statutes cited under chapter 3). */
export function isAustralianJurisdiction(code: string | undefined): boolean {
  return code !== undefined && AU_JURISDICTIONS.has(code);
}

/** Long form for Hansard and legislature fields. */
export function jurisdictionLongForm(code: string): string {
  return JURISDICTION_LONG_FORM[code] ?? code;
}

// ─── Parties ────────────────────────────────────────────────────────────────

export interface PartySplit {
  party1: string;
  party2: string;
  separator: string;
  /** False when no separator was found (single-party names such as "Re X"). */
  split: boolean;
}

/** Splits "A v B" on the first separator; keeps "(No 2)" with the second party. */
export function splitParties(caseName: string): PartySplit {
  const text = caseName.trim();
  const m = /\s+(v|vs?\.|-v-|versus)\s+/i.exec(text);
  if (!m || m.index === undefined) {
    return { party1: text, party2: "", separator: "v", split: false };
  }
  return {
    party1: text.slice(0, m.index).trim(),
    party2: text.slice(m.index + m[0].length).trim(),
    separator: "v",
    split: true,
  };
}

export function joinParties(
  party1: string | undefined,
  party2: string | undefined,
  separator = "v"
): string {
  const p1 = (party1 ?? "").trim();
  const p2 = (party2 ?? "").trim();
  if (p1 && p2) return `${p1} ${separator || "v"} ${p2}`;
  return p1 || p2;
}

// ─── Report series and courts ───────────────────────────────────────────────

export interface SeriesResolution {
  /** Canonical abbreviation ("CLR") or the input trimmed when unknown. */
  abbreviation: string;
  entry?: ReportSeriesEntry;
  /** The text is a medium neutral court identifier, not a report series. */
  isCourtCode: boolean;
  foreign?: "UK" | "NZ";
  known: boolean;
}

/** UK and NZ series live in the Appendix A table too; flag them so cases route to chapter 24/21 forms. */
function foreignOf(entry: ReportSeriesEntry | undefined): "UK" | "NZ" | undefined {
  const j = (entry?.jurisdiction ?? "").toUpperCase();
  if (/^(UK|GB|ENG|E&W|SCOT|NI|WALES)/.test(j)) return "UK";
  if (/^NZ/.test(j)) return "NZ";
  return undefined;
}

function stripSeriesPunctuation(text: string): string {
  return text.replace(/\./g, "").replace(/\s+/g, " ").trim();
}

/**
 * Resolves a report series abbreviation or name through the data tables.
 * "C.L.R." and "Commonwealth Law Reports" both resolve to CLR.
 */
export function resolveSeries(text: string | undefined): SeriesResolution | undefined {
  if (!text || !text.trim()) return undefined;
  const raw = text.trim();
  const candidates = [raw, stripSeriesPunctuation(raw)];
  for (const candidate of candidates) {
    const entry = getByAbbreviation(candidate);
    if (entry) {
      return {
        abbreviation: entry.abbreviation,
        entry,
        isCourtCode: entry.type === "medium_neutral",
        foreign: foreignOf(entry),
        known: true,
      };
    }
  }
  const lower = stripSeriesPunctuation(raw).toLowerCase();
  const byCase = ALL_REPORT_SERIES.find((e) => e.abbreviation.toLowerCase() === lower);
  if (byCase) {
    return {
      abbreviation: byCase.abbreviation,
      entry: byCase,
      isCourtCode: byCase.type === "medium_neutral",
      foreign: foreignOf(byCase),
      known: true,
    };
  }
  const byName = ALL_REPORT_SERIES.find((e) => e.fullName.toLowerCase() === raw.toLowerCase());
  if (byName) {
    return {
      abbreviation: byName.abbreviation,
      entry: byName,
      isCourtCode: byName.type === "medium_neutral",
      foreign: foreignOf(byName),
      known: true,
    };
  }
  if (getByCode(stripSeriesPunctuation(raw))) {
    return { abbreviation: stripSeriesPunctuation(raw), isCourtCode: true, known: true };
  }
  const uk = getUKReportSeriesByAbbreviation(stripSeriesPunctuation(raw));
  if (uk) return { abbreviation: uk.abbreviation, isCourtCode: false, foreign: "UK", known: true };
  const nz = getNZReportSeriesByAbbreviation(stripSeriesPunctuation(raw));
  if (nz) return { abbreviation: nz.abbreviation, isCourtCode: false, foreign: "NZ", known: true };
  return { abbreviation: raw, isCourtCode: false, known: false };
}

export interface CourtResolution {
  code?: string;
  fullName?: string;
  foreign?: "UK" | "NZ";
}

/** Resolves a court code or name through the AU, UK and NZ tables. */
export function resolveCourt(text: string | undefined): CourtResolution | undefined {
  if (!text || !text.trim()) return undefined;
  const raw = text.trim();
  const code = stripSeriesPunctuation(raw);
  const au = getByCode(code);
  if (au) return { code: au.code, fullName: au.fullName };
  const byName = COURT_IDENTIFIERS.find((c) => c.fullName.toLowerCase() === raw.toLowerCase());
  if (byName) return { code: byName.code, fullName: byName.fullName };
  const parenthetical = /\(([A-Z]{2,10})\)\s*$/.exec(raw);
  if (parenthetical && getByCode(parenthetical[1])) {
    const entry = getByCode(parenthetical[1]);
    return { code: entry?.code, fullName: entry?.fullName };
  }
  const uk =
    getUKCourtByCode(code) ??
    UK_COURT_IDENTIFIERS.find((c) => c.fullName.toLowerCase() === raw.toLowerCase());
  if (uk) return { code: uk.code, fullName: uk.fullName, foreign: "UK" };
  const nz =
    getNZCourtByCode(code) ??
    NZ_COURT_IDENTIFIERS.find((c) => c.fullName.toLowerCase() === raw.toLowerCase());
  if (nz) return { code: nz.code, fullName: nz.fullName, foreign: "NZ" };
  const fuzzy = searchCourtIdentifiers(raw).filter((c) =>
    c.fullName.toLowerCase().includes(raw.toLowerCase())
  );
  if (fuzzy.length === 1) return { code: fuzzy[0].code, fullName: fuzzy[0].fullName };
  return undefined;
}

// ─── Judges ─────────────────────────────────────────────────────────────────

const JUDICIAL_ABBREVIATIONS = new Set<string>();
for (const t of AU_JUDICIAL_TITLES) {
  JUDICIAL_ABBREVIATIONS.add(t.abbreviation);
  if (t.abbreviationPlural) JUDICIAL_ABBREVIATIONS.add(t.abbreviationPlural);
}
const TITLE_BEFORE_NAME = AU_JUDICIAL_TITLES.filter((t) => t.titleBeforeName).map(
  (t) => t.abbreviation
);

/** True when the text names judges ("Gleeson CJ, Gummow and Hayne JJ"). */
export function looksLikeJudges(text: string): boolean {
  const segments = text
    .split(/,|\band\b|&/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (segments.length === 0) return false;
  return segments.some((seg) => {
    const tokens = seg.split(/\s+/);
    const last = tokens[tokens.length - 1].replace(/[().]/g, "");
    if (JUDICIAL_ABBREVIATIONS.has(last)) return true;
    return TITLE_BEFORE_NAME.some((t) => seg.startsWith(`${t} `));
  });
}

/**
 * Parses "Gleeson CJ, Gummow and Hayne JJ" into officer references (rule
 * 2.4.1). A plural title applies to every unsuffixed name before it.
 * Returns null when any segment cannot be read.
 */
export function parseJudicialOfficers(text: string): JudicialOfficerRef[] | null {
  const cleaned = text.replace(/\((?:HCA|[A-Z]{2,10})\)\s*$/, "").trim();
  const segments = cleaned
    .split(/,|\band\b|&/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (segments.length === 0) return null;
  const pending: string[] = [];
  const out: JudicialOfficerRef[] = [];
  for (const seg of segments) {
    const tokens = seg.split(/\s+/);
    const first = tokens[0];
    const last = tokens[tokens.length - 1].replace(/[().]/g, "");
    if (TITLE_BEFORE_NAME.includes(first) && tokens.length > 1) {
      out.push({ name: tokens.slice(1).join(" "), title: first, role: "majority" });
      continue;
    }
    if (JUDICIAL_ABBREVIATIONS.has(last) && tokens.length > 1) {
      const name = tokens.slice(0, -1).join(" ");
      const singular = singularTitle(last);
      for (const p of pending) out.push({ name: p, title: singular, role: "majority" });
      pending.length = 0;
      out.push({ name, title: singular, role: "majority" });
      continue;
    }
    if (/^[A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+)*$/.test(seg)) {
      pending.push(seg);
      continue;
    }
    return null;
  }
  if (pending.length > 0) return null;
  return out;
}

function singularTitle(abbrev: string): string {
  const entry = AU_JUDICIAL_TITLES.find((t) => t.abbreviationPlural === abbrev);
  return entry ? entry.abbreviation : abbrev;
}

/** "Gleeson CJ, Gummow and Hayne JJ" from officer references. */
export function formatJudicialOfficers(officers: JudicialOfficerRef[]): string {
  if (officers.length === 0) return "";
  const groups: Array<{ title: string; names: string[] }> = [];
  for (const o of officers) {
    const last = groups[groups.length - 1];
    if (last && last.title === o.title) last.names.push(o.name);
    else groups.push({ title: o.title, names: [o.name] });
  }
  const parts = groups.map((g) => {
    const entry = AU_JUDICIAL_TITLES.find((t) => t.abbreviation === g.title);
    if (entry?.titleBeforeName) return g.names.map((n) => `${g.title} ${n}`).join(" and ");
    const title =
      g.names.length > 1 && entry?.abbreviationPlural ? entry.abbreviationPlural : g.title;
    const names =
      g.names.length > 1
        ? `${g.names.slice(0, -1).join(", ")} and ${g.names[g.names.length - 1]}`
        : g.names[0];
    return `${names} ${title}`;
  });
  // "Gleeson CJ, Gummow and Hayne JJ" but "Mason CJ and Brennan J": the last
  // group joins with "and" when it names a single officer (rule 2.4.1).
  if (parts.length > 1 && groups[groups.length - 1].names.length === 1) {
    return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  }
  return parts.join(", ");
}

export interface CourtOrJudges {
  courtCode?: string;
  courtName?: string;
  judges?: string;
}

/** Sorts a free string into court code, court name or judges. */
export function classifyCourtOrJudges(text: string | undefined): CourtOrJudges {
  if (!text || !text.trim()) return {};
  const raw = text.trim();
  const court = resolveCourt(raw);
  if (court && !looksLikeJudges(raw)) return { courtCode: court.code, courtName: court.fullName };
  if (looksLikeJudges(raw)) {
    const parenthetical = /\(([A-Z]{2,10})\)\s*$/.exec(raw);
    const code = parenthetical ? getByCode(parenthetical[1])?.code : undefined;
    return {
      judges: raw.replace(/\s*\([A-Z]{2,10}\)\s*$/, ""),
      ...(code ? { courtCode: code } : {}),
    };
  }
  return { courtName: raw };
}

// ─── Citations embedded in strings ──────────────────────────────────────────

export interface ParsedReportCitation {
  year: number;
  yearType: "round" | "square";
  volume?: string;
  series: string;
  page: string;
  raw: string;
}

const SQUARE_RE = /\[(\d{4})\]\s+(?:(\d+)\s+)?([A-Z][A-Za-z .&()]*?[A-Za-z)])\s+(\d+|¶\s?[\d-]+)/;

/** Parses "(1992) 175 CLR 1", "[1998] 1 Qd R 1" or "[2005] AC 1". Not an MNC. */
export function parseReportCitation(text: string | undefined): ParsedReportCitation | undefined {
  if (!text) return undefined;
  const round = parseCitation(text);
  if (round && round.type === "report") {
    return {
      year: round.year,
      yearType: "round",
      volume: String(round.volume),
      series: round.series,
      page: String(round.page),
      raw: round.raw,
    };
  }
  const m = SQUARE_RE.exec(text);
  if (m) {
    const series = m[3].trim();
    if (getByCode(series) && !m[2]) return undefined; // "[2020] HCA 41" is an MNC
    return { year: Number(m[1]), yearType: "square", volume: m[2], series, page: m[4], raw: m[0] };
  }
  return undefined;
}

export interface ParsedMnc {
  year: number;
  court: string;
  number: number;
  raw: string;
}

/** Parses "[2020] HCA 41" wherever it appears in the text. */
export function parseMnc(text: string | undefined): ParsedMnc | undefined {
  if (!text) return undefined;
  const token = tokeniseMNC(text);
  if (!token) return undefined;
  return { year: token.year, court: token.court, number: token.number, raw: token.raw };
}

/** Removes a trailing citation from a case title. */
export function stripCitationFromTitle(title: string): { title: string; citation?: string } {
  const m = /\s*[([]\d{4}[)\]].*$/.exec(title);
  if (!m) return { title: title.trim() };
  const tail = m[0].trim();
  if (!parseReportCitation(tail) && !parseMnc(tail)) return { title: title.trim() };
  return { title: title.slice(0, m.index).trim(), citation: tail };
}

/** Composes "(1992) 175 CLR 1" or "[1998] 1 Qd R 1". */
export function composeReportCitation(parts: {
  year: number | string;
  yearType?: "round" | "square";
  volume?: string | number;
  series: string;
  page: string | number;
}): string {
  const year = parts.yearType === "square" ? `[${parts.year}]` : `(${parts.year})`;
  return [year, parts.volume, parts.series, parts.page]
    .filter((p) => p !== undefined && p !== "")
    .join(" ");
}

// ─── Statutes ───────────────────────────────────────────────────────────────

export interface ParsedStatuteTitle {
  title: string;
  year?: number;
  jurisdiction?: string;
  number?: string;
  pinpoint?: string;
  /** "Bill", "Regulations", "Constitution" or undefined. */
  form?: "bill" | "delegated" | "constitution";
}

const LONG_JURISDICTION_IN_PARENS = /\(([A-Za-z .]+)\)\s*$/;

/**
 * Parses "Native Title Act 1993 (Cth)" into title, year and jurisdiction.
 * Long jurisdiction names in the parentheses ("(Commonwealth)") are
 * normalised first so the citation parser recognises them.
 */
export function parseStatuteTitle(text: string | undefined): ParsedStatuteTitle | undefined {
  if (!text || !text.trim()) return undefined;
  let working = text.trim();
  const parens = LONG_JURISDICTION_IN_PARENS.exec(working);
  if (parens) {
    const code = normaliseJurisdiction(parens[1]);
    if (code) working = `${working.slice(0, parens.index).trim()} (${code})`;
  }
  const parsed = parseStatuteRef(working);
  const result: ParsedStatuteTitle = parsed
    ? {
        title: parsed.title,
        year: parsed.year,
        jurisdiction: parsed.jurisdiction,
        number: parsed.number,
        pinpoint: parsed.pinpoint,
      }
    : { title: working.replace(/^the\s+/i, "") };
  if (!parsed) {
    // "Human Rights Act 1998 (UK)" or a bare "Title 1993"
    const m = /^(.+?)\s+(\d{4})(?:\s+\(([A-Za-z .]+)\))?\s*$/.exec(working);
    if (m) {
      result.title = m[1].replace(/^the\s+/i, "");
      result.year = Number(m[2]);
      result.jurisdiction = m[3] ? (normaliseJurisdiction(m[3]) ?? m[3]) : undefined;
    }
  }
  if (/\bBill\b/.test(result.title) && !/\bBills? Digest/i.test(result.title)) result.form = "bill";
  else if (/\bConstitution\b/i.test(result.title)) result.form = "constitution";
  else if (
    /\b(Regulations?|Rules|Ordinance|By-?laws?|Determination|Instrument|Order)\b/.test(result.title)
  )
    result.form = "delegated";
  return result;
}

/** "Native Title Act 1993 (Cth)" from parts. */
export function composeStatuteTitle(parts: {
  title: string;
  year?: number | string;
  jurisdiction?: string;
  number?: string;
}): string {
  const bits = [parts.title];
  if (parts.number) bits.push(parts.number);
  if (parts.year) bits.push(String(parts.year));
  let text = bits.join(" ");
  if (parts.jurisdiction) text += ` (${parts.jurisdiction})`;
  return text;
}

// ─── Treaties, pages, editions ──────────────────────────────────────────────

/** Parses "2187 UNTS 3" into series volume, series and page. */
export function parseTreatySeries(text: string | undefined):
  | {
      seriesVolume?: string;
      treatySeries: string;
      startingPage?: string;
    }
  | undefined {
  if (!text || !text.trim()) return undefined;
  const m = /^\s*(?:\[(\d{4})\]\s+)?(\d+)?\s*([A-Z][A-Za-z .]*?)\s+(\d+)\s*$/.exec(text);
  if (!m) return { treatySeries: text.trim() };
  return { seriesVolume: m[2], treatySeries: m[3].trim(), startingPage: m[4] };
}

export interface PageSplit {
  first?: string;
  last?: string;
  range?: string;
}

/** "393-420", "393–420", "pp 393-420", "393 ff", "¶93-198" (kept whole). */
export function splitPages(text: string | undefined): PageSplit {
  if (!text || !text.trim()) return {};
  const raw = text.trim().replace(/^pp?\.?\s*/i, "");
  if (raw.startsWith("¶") || raw.startsWith("[")) return { first: raw, range: raw };
  const m = /^(\d+)\s*(?:--|–|—|-)\s*(\d+)/.exec(raw);
  if (m) return { first: m[1], last: m[2], range: `${m[1]}–${m[2]}` };
  const single = /^(\d+)/.exec(raw);
  if (single) return { first: single[1], range: raw !== single[1] ? raw : undefined };
  return { first: raw };
}

const ORDINAL_WORDS: Readonly<Record<string, number>> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
  tenth: 10,
  eleventh: 11,
  twelfth: 12,
  thirteenth: 13,
  fourteenth: 14,
  fifteenth: 15,
  sixteenth: 16,
  seventeenth: 17,
  eighteenth: 18,
  nineteenth: 19,
  twentieth: 20,
};

export interface ParsedEdition {
  edition?: number;
  revised?: boolean;
  raw: string;
}

/** "2nd", "Second", "2", "2nd rev ed", "revised" -> number and revised flag. */
export function parseEdition(text: string | undefined): ParsedEdition | undefined {
  if (!text || !text.trim()) return undefined;
  const raw = text.trim();
  const revised = /\brev(?:ised)?\b/i.test(raw);
  const numeric = /(\d+)(?:st|nd|rd|th)?/.exec(raw);
  if (numeric) return { edition: Number(numeric[1]), revised: revised || undefined, raw };
  const word = raw.toLowerCase().split(/\s+/)[0];
  if (ORDINAL_WORDS[word])
    return { edition: ORDINAL_WORDS[word], revised: revised || undefined, raw };
  if (revised) return { revised: true, raw };
  return { raw };
}

/** "2nd ed" from a number, for dictionary-style string editions. */
export function ordinalEdition(edition: number): string {
  const n = edition % 100;
  const suffix = n >= 11 && n <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${edition}${suffix} ed`;
}
