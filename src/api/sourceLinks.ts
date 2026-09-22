/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * sourceLinks.ts (ENP-004) — derives "View source" links from a stored
 * citation's own data, with no adapter round trip. Pure: no Office.js, no
 * engine imports. Values may arrive as numbers from the XML store, so every
 * field is coerced through String() before it is trimmed.
 *
 * Link order: the citation's url, archived url and persistent identifier,
 * then DOI links, interchange identifiers and provenance, then the AustLII
 * and Jade deep links an MNC allows. Primary sources are listed before
 * aggregators (the ordering getSourceLinks already applies).
 */

import type { Citation } from "../types/citation";
import type { CitationInterchangeBag } from "./interchange/model";
import { INTERCHANGE_DATA_KEY } from "./interchange/model";
import { buildAustliiUrl } from "./adapters/austliiLink";
import { buildJadeUrl } from "./adapters/jadeLink";
import { getSourceLinks } from "./adapters/sourceUrlPassthrough";
import type { SourceLink } from "./adapters/sourceUrlPassthrough";

export type { SourceLink } from "./adapters/sourceUrlPassthrough";

const DOI_PATTERN = /^10\.\d{4,9}\/\S+$/i;
const LAWCITE_BASE = "https://www.austlii.edu.au/cgi-bin/LawCite?cit=";

/** Court-identifier and case-number aliases, mirroring the engine's field aliases. */
const COURT_FIELDS = ["court", "courtIdentifier", "courtId"];
const CASE_NUMBER_FIELDS = ["caseNumber", "mnc", "judgmentNumber", "decisionNumber"];

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

function mncLinks(citation: Citation, data: Record<string, unknown>): string[] {
  if (!citation.sourceType.startsWith("case.")) return [];
  const court = firstText(data, COURT_FIELDS);
  const year = Number(text(data.year));
  const number = Number(firstText(data, CASE_NUMBER_FIELDS));
  if (!/^[A-Za-z]+$/.test(court)) return [];
  if (!Number.isInteger(year) || year <= 0) return [];
  if (!Number.isInteger(number) || number <= 0) return [];
  const links: string[] = [];
  const austlii = buildAustliiUrl(court, year, number);
  if (austlii) links.push(austlii);
  links.push(buildJadeUrl(court, year, number));
  return links;
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
