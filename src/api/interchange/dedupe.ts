/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * dedupe.ts — finds library citations an imported record duplicates.
 *
 * Match precedence: an Obiter id carried through an earlier export; a DOI;
 * an ISBN; a same-format cite key; a legal signature (medium neutral
 * citation, report citation or statute title with year and jurisdiction);
 * then the loose title + year + first surname match the old importers used,
 * now insensitive to diacritics and punctuation. The index is Map-based so
 * a large import against a large library stays linear.
 */

import type { Author, Citation } from "../../types/citation";
import { readFieldWithAliases } from "../../engine/fieldAliases";
import { normaliseAuthorList } from "../../engine/rules/v4/secondary/authors";
import type { CitationInterchangeBag, InterchangeRecord } from "./model";
import { INTERCHANGE_DATA_KEY } from "./model";
import { yearOf } from "./mapper/dates";
import { joinParties } from "./mapper/legal";

export interface DedupeKey {
  obiterId?: string;
  doi?: string;
  isbn?: string;
  citeKey?: string;
  /** "mnc|2020|HCA|41", "report|1992|CLR|1" or "statute|native title act|1993|cth". */
  legal?: string;
  /** "title|year|surname", normalised. */
  loose?: string;
}

export type DedupeMatchKind = "obiter-id" | "doi" | "isbn" | "cite-key" | "legal" | "loose";

export interface DedupeMatch {
  citation: Citation;
  kind: DedupeMatchKind;
}

/** Lower-cases, strips diacritics and punctuation, collapses whitespace. */
export function normaliseForMatch(text: string | undefined): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[‘’“”'"`.,;:()[\]{}!?*_\-–—/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normaliseDoi(doi: string | undefined): string | undefined {
  if (!doi) return undefined;
  const cleaned = doi
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .toLowerCase();
  return cleaned || undefined;
}

export function normaliseIsbn(isbn: string | undefined): string | undefined {
  if (!isbn) return undefined;
  const digits = isbn.replace(/[^0-9Xx]/g, "").toUpperCase();
  if (digits.length === 10) {
    // ISBN-10 -> ISBN-13 (978 prefix, recomputed check digit)
    const core = `978${digits.slice(0, 9)}`;
    let sum = 0;
    for (let i = 0; i < core.length; i += 1) sum += Number(core[i]) * (i % 2 === 0 ? 1 : 3);
    return `${core}${(10 - (sum % 10)) % 10}`;
  }
  return digits.length === 13 ? digits : undefined;
}

function firstSurname(value: unknown): string {
  const list = normaliseAuthorList(value);
  const first: Author | undefined = list[0];
  return normaliseForMatch(first?.surname ?? first?.givenNames);
}

function looseKey(
  title: string | undefined,
  year: string | number | undefined,
  surname: string
): string | undefined {
  const t = normaliseForMatch(title);
  if (!t) return undefined;
  return `${t}|${year ?? ""}|${surname}`;
}

/** Builds the key set for a citation already in the library. */
export function buildDedupeKeyFromCitation(citation: Citation): DedupeKey {
  const data = citation.data as Record<string, unknown>;
  const bag = data[INTERCHANGE_DATA_KEY] as CitationInterchangeBag | undefined;
  const key: DedupeKey = { obiterId: citation.id };
  key.doi = normaliseDoi(bag?.identifiers?.doi ?? (data.doi as string | undefined));
  key.isbn = normaliseIsbn(bag?.identifiers?.isbn ?? (data.isbn as string | undefined));
  key.citeKey = bag?.identifiers?.citeKey;

  const st = citation.sourceType;
  const str = (k: string): string | undefined => {
    const v = readFieldWithAliases(data, k);
    return v === undefined || v === null || typeof v === "object" ? undefined : String(v);
  };
  if (st === "case.unreported.mnc" && str("court") && str("caseNumber")) {
    key.legal = `mnc|${str("year")}|${normaliseForMatch(str("court"))}|${str("caseNumber")}`;
  } else if (st.startsWith("case.") && str("reportSeries") && str("startingPage")) {
    key.legal = `report|${str("year")}|${normaliseForMatch(str("reportSeries"))}|${str("startingPage")}`;
  } else if (st.startsWith("legislation.") && str("title")) {
    key.legal = `statute|${normaliseForMatch(str("title"))}|${str("year") ?? ""}|${normaliseForMatch(str("jurisdiction"))}`;
  }

  const title =
    str("title") ??
    str("chapterTitle") ??
    joinParties(str("party1"), str("party2"), str("separator")) ??
    str("caseName");
  const authors =
    readFieldWithAliases(data, "authors") ??
    readFieldWithAliases(data, "chapterAuthors") ??
    readFieldWithAliases(data, "author");
  key.loose = looseKey(title, str("year"), firstSurname(authors));
  return key;
}

/** Builds the key set for an incoming record. */
export function buildDedupeKeyFromRecord(record: InterchangeRecord): DedupeKey {
  const key: DedupeKey = { obiterId: record.provenance.obiterId };
  key.doi = normaliseDoi(record.identifiers.doi);
  key.isbn = normaliseIsbn(record.identifiers.isbn);
  key.citeKey = record.identifiers.citeKey;
  const legal = record.legal ?? {};
  const year = yearOf(record.issued) ?? yearOf(legal.decidedDate) ?? legal.actYear;
  if (legal.mnc) {
    key.legal = `mnc|${legal.mnc.year}|${normaliseForMatch(legal.mnc.court)}|${legal.mnc.number}`;
  } else if (legal.reporter && legal.firstPage && year) {
    key.legal = `report|${year}|${normaliseForMatch(legal.reporter)}|${legal.firstPage}`;
  } else if (
    (record.kind === "legislation" || record.kind === "bill" || record.kind === "regulation") &&
    (legal.actTitle ?? record.title)
  ) {
    const title = normaliseForMatch(legal.actTitle ?? record.title);
    const stripped = title.replace(/\b(19|20)\d{2}\b.*$/, "").trim();
    key.legal = `statute|${stripped}|${legal.actYear ?? year ?? ""}|${normaliseForMatch(legal.jurisdiction)}`;
  }
  const first = record.creators.find((c) => c.role === "author");
  const surname = normaliseForMatch(first?.literal ?? first?.family ?? first?.raw);
  key.loose = looseKey(record.title ?? legal.caseName, year, surname);
  return key;
}

/** Map-backed lookup over the library, extended as rows are accepted. */
export class DedupeIndex {
  private readonly byObiterId = new Map<string, Citation>();
  private readonly byDoi = new Map<string, Citation>();
  private readonly byIsbn = new Map<string, Citation>();
  private readonly byCiteKey = new Map<string, Citation>();
  private readonly byLegal = new Map<string, Citation>();
  private readonly byLoose = new Map<string, Citation>();

  constructor(existing: Citation[]) {
    for (const citation of existing) this.add(citation);
  }

  add(citation: Citation): void {
    const key = buildDedupeKeyFromCitation(citation);
    if (key.obiterId) this.byObiterId.set(key.obiterId, citation);
    if (key.doi) this.byDoi.set(key.doi, citation);
    if (key.isbn) this.byIsbn.set(key.isbn, citation);
    if (key.citeKey) this.byCiteKey.set(key.citeKey, citation);
    if (key.legal) this.byLegal.set(key.legal, citation);
    if (key.loose) this.byLoose.set(key.loose, citation);
  }

  find(key: DedupeKey): DedupeMatch | undefined {
    const hit = (
      map: Map<string, Citation>,
      value: string | undefined,
      kind: DedupeMatchKind
    ): DedupeMatch | undefined => {
      if (!value) return undefined;
      const citation = map.get(value);
      return citation ? { citation, kind } : undefined;
    };
    return (
      hit(this.byObiterId, key.obiterId, "obiter-id") ??
      hit(this.byDoi, key.doi, "doi") ??
      hit(this.byIsbn, key.isbn, "isbn") ??
      hit(this.byCiteKey, key.citeKey, "cite-key") ??
      hit(this.byLegal, key.legal, "legal") ??
      hit(this.byLoose, key.loose, "loose")
    );
  }

  findRecord(record: InterchangeRecord): DedupeMatch | undefined {
    return this.find(buildDedupeKeyFromRecord(record));
  }
}

/** Convenience for the older importers: is this citation already in the library? */
export function isDuplicateCitation(candidate: Citation, existing: Citation[]): boolean {
  const index = new DedupeIndex(existing);
  const key = buildDedupeKeyFromCitation(candidate);
  delete key.obiterId; // a fresh id never matches; compare on content
  return index.find(key) !== undefined;
}
