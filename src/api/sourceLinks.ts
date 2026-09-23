/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * sourceLinks.ts (ENP-004) — derives "View source" links from a stored
 * citation's own data, with no adapter round trip. Pure: no Office.js; the
 * only engine imports are the court-identifier data tables. Values may
 * arrive as numbers from the XML store, so every field is coerced through
 * String() before it is trimmed.
 *
 * Link order: the citation's url, archived url and persistent identifier,
 * then DOI links, interchange identifiers and provenance, then the deep
 * links a medium neutral citation allows. Primary sources are listed before
 * aggregators (the ordering getSourceLinks already applies).
 *
 * STD-020: the case links are gated by jurisdiction. AustLII and Jade are
 * Australian aggregators and appear only for AU cases; a UK case gets a
 * BAILII link and an NZ case an NZLII link, built from the neutral citation
 * where the court's database path is known and otherwise as that site's
 * citation search. The "Cases citing this" lookup follows the same gate:
 * AustLII's LawCite for AU, BAILII's search for UK, NZLII's search for NZ.
 * All of these are hyperlinks the user opens; nothing here is fetched.
 */

import type { Citation } from "../types/citation";
import type { CitationInterchangeBag } from "./interchange/model";
import { INTERCHANGE_DATA_KEY } from "./interchange/model";
import { buildAustliiUrl } from "./adapters/austliiLink";
import { buildJadeUrl } from "./adapters/jadeLink";
import { getSourceLinks } from "./adapters/sourceUrlPassthrough";
import type { SourceLink } from "./adapters/sourceUrlPassthrough";
import { COURT_IDENTIFIERS } from "../engine/data/court-identifiers";
import { UK_COURT_IDENTIFIERS } from "../engine/data/uk-court-identifiers";
import { NZ_COURT_IDENTIFIERS } from "../engine/data/nz-court-identifiers";

export type { SourceLink } from "./adapters/sourceUrlPassthrough";

const DOI_PATTERN = /^10\.\d{4,9}\/\S+$/i;
const LAWCITE_BASE = "https://www.austlii.edu.au/cgi-bin/LawCite?cit=";
const BAILII_SEARCH_BASE = "https://www.bailii.org/cgi-bin/lucy_search_1.cgi?query=";
const NZLII_SEARCH_BASE = "https://www.nzlii.org/cgi-bin/sinosrch.cgi?query=";

/** Court-identifier and case-number aliases, mirroring the engine's field aliases. */
const COURT_FIELDS = ["court", "courtIdentifier", "courtId", "neutralCitationCourt"];
const CASE_NUMBER_FIELDS = [
  "caseNumber",
  "mnc",
  "judgmentNumber",
  "decisionNumber",
  "neutralCitationNumber",
];
const YEAR_FIELDS = ["year", "neutralCitationYear"];

/** "[2008] EWCA Civ 12" — a court code may carry a division ("EWHC (Ch)"). */
const MNC_TEXT = /^\s*\[(\d{4})\]\s+([A-Za-z][A-Za-z ()&]*?)\s+(\d+)\s*$/;

// ─── Jurisdiction (STD-020) ─────────────────────────────────────────────────

/** The jurisdictions whose legal information institutes Obiter links to. */
export type CaseJurisdiction = "AU" | "UK" | "NZ" | "other";

/** Any spelling of an Australian jurisdiction the forms or importers store. */
const AU_JURISDICTION_TEXT =
  /^(au|aus|australia|cth|commonwealth|federal|nsw|vic|qld|wa|sa|tas|act|nt|au-[a-z]+|new south wales|victoria|queensland|western australia|south australia|tasmania|australian capital territory|northern territory)$/;
const UK_JURISDICTION_TEXT =
  /^(uk|gb|united kingdom|great britain|england|england and wales|e&w|ew|eng|wales|scot|scotland|ni|northern ireland)$/;
const NZ_JURISDICTION_TEXT = /^(nz|new zealand|aotearoa)$/;

function codeSet(codes: readonly { code: string }[]): ReadonlySet<string> {
  return new Set(codes.map((c) => c.code.toLowerCase()));
}
const AU_COURT_CODES = codeSet(COURT_IDENTIFIERS);
const UK_COURT_CODES = codeSet(UK_COURT_IDENTIFIERS);
const NZ_COURT_CODES = codeSet(NZ_COURT_IDENTIFIERS);

/** Maps a stored jurisdiction value to the institute it belongs to; undefined when unrecognised. */
export function jurisdictionOfText(value: unknown): CaseJurisdiction | undefined {
  const t = text(value)
    .toLowerCase()
    .replace(/^\(|\)$/g, "");
  if (!t) return undefined;
  if (AU_JURISDICTION_TEXT.test(t)) return "AU";
  if (UK_JURISDICTION_TEXT.test(t)) return "UK";
  if (NZ_JURISDICTION_TEXT.test(t)) return "NZ";
  return "other";
}

/** Maps a neutral-citation court code (HCA, UKHL, EWCA Civ, NZCA) to its jurisdiction. */
export function jurisdictionOfCourtCode(code: unknown): CaseJurisdiction | undefined {
  const c = text(code).toLowerCase();
  if (!c) return undefined;
  if (AU_COURT_CODES.has(c)) return "AU";
  if (UK_COURT_CODES.has(c)) return "UK";
  if (NZ_COURT_CODES.has(c)) return "NZ";
  return undefined;
}

/** The parts of a medium neutral citation a stored case carries, from any of the field shapes. */
interface NeutralCitation {
  year: number;
  court: string;
  number: number;
}

function neutralCitationOf(data: Record<string, unknown>): NeutralCitation | undefined {
  // A full "[1992] HCA 23" string in any number field wins.
  for (const field of CASE_NUMBER_FIELDS) {
    const m = MNC_TEXT.exec(text(data[field]));
    if (m) return { year: Number(m[1]), court: m[2].trim(), number: Number(m[3]) };
  }
  const nc = data.neutralCitation;
  if (nc && typeof nc === "object") {
    const o = nc as Record<string, unknown>;
    const year = Number(text(o.year));
    const number = Number(text(o.number));
    const court = text(o.court);
    if (court && Number.isInteger(year) && Number.isInteger(number) && number > 0) {
      return { year, court, number };
    }
  }
  const court = firstText(data, COURT_FIELDS);
  const year = Number(firstText(data, YEAR_FIELDS));
  const number = Number(firstText(data, CASE_NUMBER_FIELDS));
  if (!court || !/^[A-Za-z][A-Za-z ()&]*$/.test(court)) return undefined;
  if (!Number.isInteger(year) || year <= 0) return undefined;
  if (!Number.isInteger(number) || number <= 0) return undefined;
  return { year, court, number };
}

/**
 * The jurisdiction a case belongs to: an explicit `jurisdiction` value
 * first, then the court identifier or neutral-citation court code. A case
 * that says nothing is treated as Australian — Obiter is AGLC-first and
 * every hand-entered AU case predates the jurisdiction field.
 */
export function caseJurisdiction(citation: Citation): CaseJurisdiction {
  const data = (citation.data ?? {}) as Record<string, unknown>;
  const explicit = jurisdictionOfText(data.jurisdiction);
  if (explicit && explicit !== "other") return explicit;
  const court = neutralCitationOf(data)?.court ?? firstText(data, COURT_FIELDS);
  const byCourt = jurisdictionOfCourtCode(court);
  if (byCourt) return byCourt;
  return explicit ?? "AU";
}

// ─── BAILII and NZLII (STD-020) ─────────────────────────────────────────────

/**
 * BAILII database paths for the courts whose canonical URL is derivable
 * from the neutral citation alone. Everything else goes to the search.
 */
const BAILII_PATHS: Readonly<Record<string, string>> = {
  UKSC: "uk/cases/UKSC",
  UKHL: "uk/cases/UKHL",
  UKPC: "uk/cases/UKPC",
  "EWCA Civ": "ew/cases/EWCA/Civ",
  "EWCA Crim": "ew/cases/EWCA/Crim",
  "EWHC (Ch)": "ew/cases/EWHC/Ch",
  "EWHC (QB)": "ew/cases/EWHC/QB",
  "EWHC (KB)": "ew/cases/EWHC/KB",
  "EWHC (Fam)": "ew/cases/EWHC/Fam",
  "EWHC (Admin)": "ew/cases/EWHC/Admin",
  "EWHC Admin": "ew/cases/EWHC/Admin",
  "EWHC (Comm)": "ew/cases/EWHC/Comm",
  "EWHC (TCC)": "ew/cases/EWHC/TCC",
  "EWHC (Pat)": "ew/cases/EWHC/Patents",
  "EWHC (Admlty)": "ew/cases/EWHC/Admlty",
  "EWHC (IPEC)": "ew/cases/EWHC/IPEC",
};

/** NZLII database paths; the three senior courts follow the plain pattern. */
const NZLII_PATHS: Readonly<Record<string, string>> = {
  NZSC: "nz/cases/NZSC",
  NZCA: "nz/cases/NZCA",
  NZHC: "nz/cases/NZHC",
};

function lookupPath(table: Readonly<Record<string, string>>, court: string): string | undefined {
  const wanted = court.toLowerCase();
  const match = Object.keys(table).find((code) => code.toLowerCase() === wanted);
  return match ? table[match] : undefined;
}

function neutralCitationText(nc: NeutralCitation): string {
  return `[${nc.year}] ${nc.court} ${nc.number}`;
}

/** BAILII citation search for any text, eg "[2008] UKHL 15". */
export function bailiiSearchUrl(citationText: string): string {
  return `${BAILII_SEARCH_BASE}${encodeURIComponent(text(citationText))}`;
}

/** NZLII search for any text, eg "[2007] NZCA 188". */
export function nzliiSearchUrl(citationText: string): string {
  return `${NZLII_SEARCH_BASE}${encodeURIComponent(text(citationText))}`;
}

/**
 * The BAILII page for a UK neutral citation: the canonical database URL
 * for the courts in BAILII_PATHS, else the citation search.
 */
export function buildBailiiUrl(court: string, year: number, number: number): string {
  const path = lookupPath(BAILII_PATHS, text(court));
  if (path) return `https://www.bailii.org/${path}/${year}/${number}.html`;
  return bailiiSearchUrl(neutralCitationText({ year, court: text(court), number }));
}

/**
 * The NZLII page for an NZ neutral citation: the canonical database URL
 * for the senior courts, else the NZLII search.
 */
export function buildNzliiUrl(court: string, year: number, number: number): string {
  const path = lookupPath(NZLII_PATHS, text(court));
  if (path) return `https://www.nzlii.org/${path}/${year}/${number}.html`;
  return nzliiSearchUrl(neutralCitationText({ year, court: text(court), number }));
}

/** String() then trim, never calling .trim() on an unknown; empty for nullish/objects. */
function text(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return "";
  return String(value).trim();
}

function firstText(data: Record<string, unknown>, fields: string[]): string {
  for (const field of fields) {
    const value = text(data[field]);
    if (value) return value;
  }
  return "";
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/** Strips doi.org / "doi:" prefixes; returns the bare DOI or "" when it is not one. */
function bareDoi(value: string): string {
  const cleaned = value
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .trim();
  return DOI_PATTERN.test(cleaned) ? cleaned : "";
}

function doiUrl(value: unknown): string {
  const doi = bareDoi(text(value));
  return doi ? `https://doi.org/${doi}` : "";
}

/** A persistent identifier is used verbatim when it is an https URL, else as a DOI. */
function persistentIdUrl(value: unknown): string {
  const id = text(value);
  if (!id) return "";
  if (/^https:\/\//i.test(id)) return id;
  return doiUrl(id);
}

/** The institute links a case's neutral citation allows, gated by jurisdiction (STD-020). */
function mncLinks(citation: Citation, data: Record<string, unknown>): string[] {
  if (!citation.sourceType.startsWith("case.")) return [];
  const nc = neutralCitationOf(data);
  if (!nc) return [];
  switch (caseJurisdiction(citation)) {
    case "AU": {
      if (!/^[A-Za-z]+$/.test(nc.court)) return [];
      const links: string[] = [];
      const austlii = buildAustliiUrl(nc.court, nc.year, nc.number);
      if (austlii) links.push(austlii);
      links.push(buildJadeUrl(nc.court, nc.year, nc.number));
      return links;
    }
    case "UK":
      return [buildBailiiUrl(nc.court, nc.year, nc.number)];
    case "NZ":
      return [buildNzliiUrl(nc.court, nc.year, nc.number)];
    default:
      return [];
  }
}

/**
 * Derives every source link a stored citation supports, deduplicated by URL.
 * Primary sources precede aggregators; within each group the source order
 * described in the module header is kept.
 */
export function linksForCitation(citation: Citation): SourceLink[] {
  const data = (citation.data ?? {}) as Record<string, unknown>;
  const bagValue = data[INTERCHANGE_DATA_KEY];
  const bag =
    bagValue && typeof bagValue === "object" ? (bagValue as CitationInterchangeBag) : undefined;
  const identifiers = bag?.identifiers;

  const candidates: string[] = [];
  const push = (value: string): void => {
    if (value && isHttpUrl(value)) candidates.push(value);
  };

  push(text(data.url));
  push(text(data.archivedUrl));
  push(persistentIdUrl(data.persistentId));
  push(doiUrl(data.doi));
  push(doiUrl(identifiers?.doi));
  push(text(identifiers?.url));
  for (const url of Array.isArray(identifiers?.urls) ? identifiers.urls : []) push(text(url));
  push(text(bag?.provenance?.sourceUrl));
  for (const url of mncLinks(citation, data)) push(url);

  const seen = new Set<string>();
  const links: SourceLink[] = [];
  for (const url of candidates) {
    if (seen.has(url)) continue;
    seen.add(url);
    links.push(...getSourceLinks({ sourceUrl: url }));
  }
  // Stable: primary before aggregator, source order kept within each group.
  links.sort((a, b) => {
    if (a.icon === b.icon) return 0;
    return a.icon === "primary" ? -1 : 1;
  });
  return links;
}

/** AustLII LawCite lookup for a citation string, eg "[2020] HCA 41" or "(1992) 175 CLR 1". */
export function lawCiteUrl(citationText: string): string {
  return `${LAWCITE_BASE}${encodeURIComponent(text(citationText))}`;
}

/** A "Cases citing this" lookup: the button label and the URL it opens. */
export interface CitingLookup {
  label: string;
  url: string;
}

/**
 * The jurisdiction's "cases citing this" lookup for a case (STD-020):
 * AustLII's LawCite for the whole citation text of an AU case; BAILII's
 * and NZLII's searches for a UK or NZ case, on the neutral citation when
 * the record carries one (a whole citation line is a poor full-text query)
 * and on the citation text otherwise. Undefined for non-cases and for
 * jurisdictions without a linked institute.
 */
export function casesCitingLookup(
  citation: Citation,
  citationText: string
): CitingLookup | undefined {
  if (!citation.sourceType.startsWith("case.")) return undefined;
  const data = (citation.data ?? {}) as Record<string, unknown>;
  const nc = neutralCitationOf(data);
  const query = nc ? neutralCitationText(nc) : text(citationText);
  switch (caseJurisdiction(citation)) {
    case "AU":
      return { label: "LawCite", url: lawCiteUrl(citationText) };
    case "UK":
      return { label: "BAILII", url: bailiiSearchUrl(query) };
    case "NZ":
      return { label: "NZLII", url: nzliiSearchUrl(query) };
    default:
      return undefined;
  }
}
