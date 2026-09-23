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
 *
 * STD-020: a case carries a SET of legal keys — one for its medium neutral
 * citation (AGLC `court` + `caseNumber`, an "[2008] UKHL 13" string in
 * `mnc`, OSCOLA `neutralCitationYear/Court/Number`, NZ `court` +
 * `decisionNumber`), one for its primary report and one for every parallel
 * citation (`parallelCitations`, `parallelReport`). Two records cluster as
 * `legal` when ANY key matches, so Mabo stored by report (with the MNC as a
 * parallel) and Mabo stored by MNC are the same case.
 */

import type { Author, Citation } from "../../types/citation";
import { readFieldWithAliases } from "../../engine/fieldAliases";
import { normaliseAuthorList } from "../../engine/rules/v4/secondary/authors";
import type { CitationInterchangeBag, InterchangeRecord } from "./model";
import { INTERCHANGE_DATA_KEY } from "./model";
import { COURT_IDENTIFIERS } from "../../engine/data/court-identifiers";
import { UK_COURT_IDENTIFIERS } from "../../engine/data/uk-court-identifiers";
import { NZ_COURT_IDENTIFIERS } from "../../engine/data/nz-court-identifiers";
import { yearOf } from "./mapper/dates";
import { joinParties } from "./mapper/legal";

export interface DedupeKey {
  obiterId?: string;
  doi?: string;
  isbn?: string;
  citeKey?: string;
  /**
   * The strongest legal key: "mnc|2020|hca|41", "report|1992|clr|1" or
   * "statute|native title act|1993|cth". Always `DedupeKeys.legalKeys[0]`.
   */
  legal?: string;
  /** "title|year|surname", normalised. */
  loose?: string;
}

/**
 * STD-020: the full key set. `DedupeKey` stays string-valued so callers
 * that index it by `keyof DedupeKey` (the library's manual cluster) keep
 * working; the legal key SET lives here — the MNC, the primary report and
 * each parallel citation, strongest first. Records cluster as `legal` when
 * any key is shared.
 */
export interface DedupeKeys extends DedupeKey {
  legalKeys?: string[];
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

// ─── Legal keys (STD-020) ────────────────────────────────────────────────────

/** Every court identifier code Obiter knows (AU, UK, NZ), lower-cased. */
const COURT_CODES: ReadonlySet<string> = new Set(
  [...COURT_IDENTIFIERS, ...UK_COURT_IDENTIFIERS, ...NZ_COURT_IDENTIFIERS].map((c) =>
    normaliseForMatch(c.code)
  )
);

/** True when a "report series" is really a medium neutral court identifier (eg "HCA", "EWCA Civ"). */
function isCourtCode(series: string | undefined): boolean {
  const n = normaliseForMatch(series);
  return n !== "" && COURT_CODES.has(n);
}

/** "[2008] EWCA Civ 12" — court codes may carry a division ("EWHC (Ch)"). */
const MNC_TEXT = /^\s*\[(\d{4})\]\s+([A-Za-z][A-Za-z ()&]*?)\s+(\d+)\s*$/;
/** "(1992) 175 CLR 1", "[2008] 1 AC 884" or "[2007] NZLR 91" (volume optional). */
const REPORT_TEXT = /^\s*[[(](\d{4})[\])]\s+(?:(\d+)\s+)?([A-Za-z][A-Za-z .&]*?)\s+(\d+)\s*$/;

function mncKey(
  year: string | number | undefined,
  court: string | undefined,
  number: string | number | undefined
): string | undefined {
  const c = normaliseForMatch(court);
  const y = year === undefined || year === null ? "" : String(year).trim();
  const n = number === undefined || number === null ? "" : String(number).trim();
  if (!c || !/^\d{4}$/.test(y) || !/^\d+$/.test(n)) return undefined;
  return `mnc|${y}|${c}|${Number(n)}`;
}

function reportKey(
  year: string | number | undefined,
  series: string | undefined,
  page: string | number | undefined
): string | undefined {
  const s = normaliseForMatch(series);
  const y = year === undefined || year === null ? "" : String(year).trim();
  const p = page === undefined || page === null ? "" : String(page).trim();
  if (!s || !y || !p) return undefined;
  return `report|${y}|${s}|${p}`;
}

/** A report whose "series" is a court code is an MNC written in report shape (court-mode parallels). */
function reportOrMncKey(
  year: string | number | undefined,
  series: string | undefined,
  page: string | number | undefined
): string | undefined {
  return isCourtCode(series) ? mncKey(year, series, page) : reportKey(year, series, page);
}

/** Parses a citation string ("[1992] HCA 23", "(1992) 175 CLR 1") into a legal key. */
export function legalKeyFromText(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const mnc = MNC_TEXT.exec(text);
  if (mnc) return mncKey(mnc[1], mnc[2], mnc[3]);
  const report = REPORT_TEXT.exec(text);
  if (report) return reportOrMncKey(report[1], report[3], report[4]);
  return undefined;
}

/** Parallel citation shapes: court mode's `parallelCitations` entries and NZLSG's `parallelReport`. */
interface ParallelShape {
  year?: string | number;
  reportSeries?: string;
  series?: string;
  startingPage?: string | number;
  startPage?: string | number;
  page?: string | number;
  court?: string;
  number?: string | number;
  raw?: string;
}

function legalKeyFromParallel(entry: unknown): string | undefined {
  if (typeof entry === "string") return legalKeyFromText(entry);
  if (!entry || typeof entry !== "object") return undefined;
  const p = entry as ParallelShape;
  if (p.court && p.number !== undefined) return mncKey(p.year, p.court, p.number);
  const fromRaw = legalKeyFromText(p.raw);
  if (fromRaw) return fromRaw;
  return reportOrMncKey(
    p.year,
    p.reportSeries ?? p.series,
    p.startingPage ?? p.startPage ?? p.page
  );
}

function pushKey(keys: string[], key: string | undefined): void {
  if (key && !keys.includes(key)) keys.push(key);
}

/** The keys the `caseNumber` contract field is read under; a full MNC string may sit in any of them. */
const CASE_NUMBER_KEYS = ["caseNumber", "mnc", "judgmentNumber", "decisionNumber", "number"];

/**
 * Every legal key a stored case carries, strongest first: MNC forms, then
 * the primary report, then each parallel citation.
 */
function legalKeysForCase(
  data: Record<string, unknown>,
  str: (k: string) => string | undefined
): string[] {
  const keys: string[] = [];
  const year = str("year");
  const court = str("court");

  // Medium neutral citation: AGLC court + caseNumber (and aliases), an MNC
  // string in any number field, OSCOLA neutralCitation* fields and object.
  for (const field of CASE_NUMBER_KEYS) {
    const value = str(field);
    if (!value) continue;
    pushKey(keys, legalKeyFromText(value) ?? mncKey(year, court, value));
  }
  pushKey(
    keys,
    mncKey(str("neutralCitationYear"), str("neutralCitationCourt"), str("neutralCitationNumber"))
  );
  const nc = data.neutralCitation;
  if (nc && typeof nc === "object") {
    const o = nc as { year?: string | number; court?: string; number?: string | number };
    pushKey(keys, mncKey(o.year, o.court, o.number));
  }

  // Primary report, then parallels.
  pushKey(keys, reportOrMncKey(year, str("reportSeries"), str("startingPage")));
  const parallels = data.parallelCitations;
  for (const entry of Array.isArray(parallels) ? parallels : [])
    pushKey(keys, legalKeyFromParallel(entry));
  const parallelReport = data.parallelReport;
  for (const entry of Array.isArray(parallelReport) ? parallelReport : [parallelReport]) {
    pushKey(keys, legalKeyFromParallel(entry));
  }
  return keys;
}

function setLegal(key: DedupeKeys, keys: string[]): void {
  if (keys.length === 0) return;
  key.legal = keys[0];
  key.legalKeys = keys;
}

/** Builds the key set for a citation already in the library. */
export function buildDedupeKeyFromCitation(citation: Citation): DedupeKeys {
  const data = citation.data as Record<string, unknown>;
  const bag = data[INTERCHANGE_DATA_KEY] as CitationInterchangeBag | undefined;
  const key: DedupeKeys = { obiterId: citation.id };
  key.doi = normaliseDoi(bag?.identifiers?.doi ?? (data.doi as string | undefined));
  key.isbn = normaliseIsbn(bag?.identifiers?.isbn ?? (data.isbn as string | undefined));
  key.citeKey = bag?.identifiers?.citeKey;

  const st = citation.sourceType;
  const str = (k: string): string | undefined => {
    const v = readFieldWithAliases(data, k);
    return v === undefined || v === null || typeof v === "object" ? undefined : String(v);
  };
  if (st.startsWith("case.")) {
    setLegal(key, legalKeysForCase(data, str));
  } else if (st.startsWith("legislation.") && str("title")) {
    setLegal(key, [
      `statute|${normaliseForMatch(str("title"))}|${str("year") ?? ""}|${normaliseForMatch(str("jurisdiction"))}`,
    ]);
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
export function buildDedupeKeyFromRecord(record: InterchangeRecord): DedupeKeys {
  const key: DedupeKeys = { obiterId: record.provenance.obiterId };
  key.doi = normaliseDoi(record.identifiers.doi);
  key.isbn = normaliseIsbn(record.identifiers.isbn);
  key.citeKey = record.identifiers.citeKey;
  const legal = record.legal ?? {};
  const year = yearOf(record.issued) ?? yearOf(legal.decidedDate) ?? legal.actYear;
  if (
    (record.kind === "legislation" || record.kind === "bill" || record.kind === "regulation") &&
    (legal.actTitle ?? record.title)
  ) {
    const title = normaliseForMatch(legal.actTitle ?? record.title);
    const stripped = title.replace(/\b(19|20)\d{2}\b.*$/, "").trim();
    setLegal(key, [
      `statute|${stripped}|${legal.actYear ?? year ?? ""}|${normaliseForMatch(legal.jurisdiction)}`,
    ]);
  } else {
    const keys: string[] = [];
    if (legal.mnc) pushKey(keys, mncKey(legal.mnc.year, legal.mnc.court, legal.mnc.number));
    pushKey(keys, reportOrMncKey(year, legal.reporter, legal.firstPage));
    for (const text of legal.parallelCitations ?? []) pushKey(keys, legalKeyFromText(text));
    setLegal(key, keys);
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
    for (const legal of key.legalKeys ?? []) this.byLegal.set(legal, citation);
    if (key.loose) this.byLoose.set(key.loose, citation);
  }

  private findLegal(key: DedupeKeys): DedupeMatch | undefined {
    for (const legal of key.legalKeys ?? []) {
      const citation = this.byLegal.get(legal);
      if (citation) return { citation, kind: "legal" };
    }
    return undefined;
  }

  find(key: DedupeKeys): DedupeMatch | undefined {
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
      this.findLegal(key) ??
      hit(this.byLoose, key.loose, "loose")
    );
  }

  findRecord(record: InterchangeRecord): DedupeMatch | undefined {
    return this.find(buildDedupeKeyFromRecord(record));
  }

  /** ENP-002: groups a library into duplicate clusters. See findDuplicateClusters. */
  static clusters(citations: Citation[]): DuplicateCluster[] {
    return findDuplicateClusters(citations);
  }
}

// ─── Duplicate clusters (ENP-002) ────────────────────────────────────────────

export interface DuplicateCluster {
  kind: DedupeMatchKind;
  /** The shared key value the members were grouped on. */
  key: string;
  /** Ordered by createdAt ascending, then id. */
  members: Citation[];
}

/** A tag of `dedupe:ignore:<key>` on a citation suppresses every pair it forms on that key. */
export const DEDUPE_IGNORE_TAG_PREFIX = "dedupe:ignore:";

/** Strongest first. The Obiter id is unique per citation so it never clusters. */
const CLUSTER_KEY_ORDER: ReadonlyArray<{ field: keyof DedupeKeys; kind: DedupeMatchKind }> = [
  { field: "doi", kind: "doi" },
  { field: "isbn", kind: "isbn" },
  { field: "citeKey", kind: "cite-key" },
  { field: "legalKeys", kind: "legal" },
  { field: "loose", kind: "loose" },
];

/** The key values a citation carries for a field — one for scalars, the set for `legalKeys`. */
function keyValues(key: DedupeKeys | undefined, field: keyof DedupeKeys): string[] {
  const value = key?.[field];
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function ignoresKey(citation: Citation, key: string): boolean {
  const tags = Array.isArray(citation.tags) ? citation.tags : [];
  return tags.includes(`${DEDUPE_IGNORE_TAG_PREFIX}${key}`);
}

function compareByCreated(a: Citation, b: Citation): number {
  const byCreated = String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? ""));
  return byCreated !== 0 ? byCreated : String(a.id ?? "").localeCompare(String(b.id ?? ""));
}

/**
 * A pair is suppressed when either member ignores any legal key both carry
 * (STD-020): "Not a duplicate" on Mabo-by-report against Mabo-by-MNC must
 * not resurface the pair on a second shared key.
 */
function pairSuppressed(a: Citation, b: Citation, aKeys: string[], bKeys: string[]): boolean {
  return aKeys.some((k) => bKeys.includes(k) && (ignoresKey(a, k) || ignoresKey(b, k)));
}

/**
 * Groups a library into duplicate clusters. Each citation joins at most one
 * cluster: the strongest key (doi → isbn → citeKey → legal → loose) it shares
 * with any other citation. A case carries several legal keys (MNC, report,
 * parallels) and clusters when any one is shared; the cluster's `key` is the
 * first shared key of its earliest member. Singletons are dropped. A member
 * carrying `dedupe:ignore:<key>` for the cluster's key is left out of that
 * grouping, so every pair it would have formed on that key is skipped.
 * Members are ordered by createdAt then id; clusters by their earliest member.
 */
export function findDuplicateClusters(citations: Citation[]): DuplicateCluster[] {
  const keys = new Map<Citation, DedupeKeys>();
  for (const citation of citations) keys.set(citation, buildDedupeKeyFromCitation(citation));
  const ordered = [...citations].sort(compareByCreated);
  const assigned = new Set<Citation>();
  const clusters: DuplicateCluster[] = [];

  for (const { field, kind } of CLUSTER_KEY_ORDER) {
    // Every unassigned citation under each key value it carries for this field.
    const groups = new Map<string, Citation[]>();
    const valuesOf = new Map<Citation, string[]>();
    const allValuesOf = new Map<Citation, string[]>();
    for (const citation of ordered) {
      if (assigned.has(citation)) continue;
      const all = keyValues(keys.get(citation), field);
      const values = all.filter((v) => !ignoresKey(citation, v));
      if (values.length === 0) continue;
      valuesOf.set(citation, values);
      allValuesOf.set(citation, all);
      for (const value of values) {
        const group = groups.get(value);
        if (group) group.push(citation);
        else groups.set(value, [citation]);
      }
    }

    // Union citations that share a key; a scalar field has one key per
    // citation so this reduces to the plain grouping.
    const parent = new Map<Citation, Citation>();
    const root = (c: Citation): Citation => {
      let r = c;
      while (parent.get(r) !== undefined && parent.get(r) !== r) r = parent.get(r) as Citation;
      return r;
    };
    for (const members of groups.values()) {
      for (let i = 0; i < members.length; i += 1) {
        for (let j = i + 1; j < members.length; j += 1) {
          const a = members[i];
          const b = members[j];
          if (pairSuppressed(a, b, allValuesOf.get(a) ?? [], allValuesOf.get(b) ?? [])) continue;
          const ra = root(a);
          const rb = root(b);
          if (ra !== rb) parent.set(rb, ra);
        }
      }
    }

    // `ordered` is already by createdAt then id, so each component is too.
    const components = new Map<Citation, Citation[]>();
    for (const citation of ordered) {
      if (!valuesOf.has(citation)) continue;
      const r = root(citation);
      const component = components.get(r);
      if (component) component.push(citation);
      else components.set(r, [citation]);
    }

    for (const members of components.values()) {
      if (members.length < 2) continue;
      const first = valuesOf.get(members[0]) ?? [];
      const key =
        first.find((v) =>
          members.some((m) => m !== members[0] && (valuesOf.get(m) ?? []).includes(v))
        ) ?? first[0];
      clusters.push({ kind, key, members });
      for (const member of members) assigned.add(member);
    }
  }

  clusters.sort((a, b) => compareByCreated(a.members[0], b.members[0]));
  return clusters;
}

/** Convenience for the older importers: is this citation already in the library? */
export function isDuplicateCitation(candidate: Citation, existing: Citation[]): boolean {
  const index = new DedupeIndex(existing);
  const key = buildDedupeKeyFromCitation(candidate);
  delete key.obiterId; // a fresh id never matches; compare on content
  return index.find(key) !== undefined;
}
