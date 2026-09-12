/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * sourceImporter.ts — Import bibliography sources from Word's built-in
 * Source Manager into Obiter's citation store.
 *
 * Word stores bibliography sources in a Custom XML Part with the namespace
 * http://schemas.openxmlformats.org/officeDocument/2006/bibliography.
 */

import type { Citation, SourceType, Author } from "../types/citation";
import { getVersionForStandard } from "../actions/citationRequest";
import { commitImport, prepareImport } from "../api/interchange";
import { CitationStore } from "../store/citationStore";

// ─── Constants ──────────────────────────────────────────────────────────────

const BIBLIOGRAPHY_NS = "http://schemas.openxmlformats.org/officeDocument/2006/bibliography";

// ─── WordSource Interface ───────────────────────────────────────────────────

export interface WordSource {
  tag: string;
  sourceType: string;
  authors: Array<{ first: string; last: string }>;
  title?: string;
  year?: string;
  publisher?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  url?: string;
  city?: string;
  edition?: string;
  shortTitle?: string;
  comments?: string;
}

// ─── XML Parsing Helpers ────────────────────────────────────────────────────

/**
 * Extract the direct child element text (non-recursive) to avoid picking up
 * nested elements with the same local name.
 */
function getDirectChildText(parent: Element, localName: string): string | undefined {
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i];
    const childLocal = child.localName || child.nodeName.replace(/^b:/, "");
    if (childLocal === localName) {
      return child.textContent?.trim() || undefined;
    }
  }
  return undefined;
}

/**
 * Parse Person elements from the Author structure.
 * Word uses: <b:Author><b:Author><b:NameList><b:Person>...
 */
function parseAuthors(sourceEl: Element): Array<{ first: string; last: string }> {
  const authors: Array<{ first: string; last: string }> = [];

  // Find all Person elements anywhere under this source
  let persons = sourceEl.getElementsByTagNameNS(BIBLIOGRAPHY_NS, "Person");
  if (persons.length === 0) {
    persons = sourceEl.getElementsByTagName("b:Person");
  }

  for (let i = 0; i < persons.length; i++) {
    const person = persons[i];
    const first = getDirectChildText(person, "First") || getDirectChildText(person, "Middle") || "";
    const last = getDirectChildText(person, "Last") || "";
    if (first || last) {
      authors.push({ first, last });
    }
  }

  return authors;
}

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Read Word's bibliography XML part and parse all sources.
 */
/**
 * Reads Word's Source Manager part as XML, or null when the document has
 * none. The Import dialog feeds this to the Word Sources codec (INTEROP-007).
 */
export async function getWordSourcesXml(context: Word.RequestContext): Promise<string | null> {
  const parts = context.document.customXmlParts.getByNamespace(BIBLIOGRAPHY_NS);
  parts.load("items");
  await context.sync();
  const partItems = parts.items ?? [];
  if (partItems.length === 0) return null;
  const xmlResult = partItems[0].getXml();
  await context.sync();
  // eslint-disable-next-line office-addins/load-object-before-read -- ClientResult value populated by the preceding context.sync()
  return xmlResult.value;
}

export async function getWordSources(context: Word.RequestContext): Promise<WordSource[]> {
  const parts = context.document.customXmlParts.getByNamespace(BIBLIOGRAPHY_NS);
  parts.load("items");
  await context.sync();

  const partItems = parts.items ?? [];
  if (partItems.length === 0) {
    return [];
  }

  const xmlResult = partItems[0].getXml();
  await context.sync();

  // eslint-disable-next-line office-addins/load-object-before-read -- ClientResult value populated by the preceding context.sync()
  const xmlString = xmlResult.value;
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "application/xml");

  // Find all Source elements
  let sources = doc.getElementsByTagNameNS(BIBLIOGRAPHY_NS, "Source");
  if (sources.length === 0) {
    sources = doc.getElementsByTagName("b:Source");
  }

  const result: WordSource[] = [];

  for (let i = 0; i < sources.length; i++) {
    const sourceEl = sources[i];

    const tag = getDirectChildText(sourceEl, "Tag") || `source_${i}`;
    const sourceType = getDirectChildText(sourceEl, "SourceType") || "Misc";
    const authors = parseAuthors(sourceEl);

    const wordSource: WordSource = {
      tag,
      sourceType,
      authors,
      title: getDirectChildText(sourceEl, "Title"),
      year: getDirectChildText(sourceEl, "Year"),
      publisher: getDirectChildText(sourceEl, "Publisher"),
      journal: getDirectChildText(sourceEl, "JournalName"),
      volume: getDirectChildText(sourceEl, "Volume"),
      issue: getDirectChildText(sourceEl, "Issue"),
      pages: getDirectChildText(sourceEl, "Pages"),
      url: getDirectChildText(sourceEl, "URL"),
      city: getDirectChildText(sourceEl, "City"),
      edition: getDirectChildText(sourceEl, "Edition"),
      shortTitle: getDirectChildText(sourceEl, "ShortTitle"),
      comments: getDirectChildText(sourceEl, "Comments"),
    };

    result.push(wordSource);
  }

  return result;
}

/**
 * Map a Word SourceType string to an Obiter SourceType.
 */
function mapSourceType(wordType: string): SourceType {
  const mapping: Record<string, SourceType> = {
    Book: "book",
    BookSection: "book.chapter",
    JournalArticle: "journal.article",
    Report: "report",
    Case: "case.reported",
    InternetSite: "internet_material",
    DocumentFromInternetSite: "internet_material",
    ConferenceProceedings: "conference_paper",
    SoundRecording: "film_tv_media",
    Film: "film_tv_media",
    ArticleInAPeriodical: "newspaper",
    Patent: "ip_material",
    ElectronicSource: "internet_material",
    Misc: "internet_material",
  };

  return mapping[wordType] || "internet_material";
}

/**
 * Map a Word source to an Obiter Citation record.
 */
export function mapWordSourceToObiter(source: WordSource): Citation {
  const sourceType = mapSourceType(source.sourceType);
  const now = new Date().toISOString();

  const authors: Author[] = source.authors.map((a) => ({
    givenNames: a.first,
    surname: a.last,
  }));

  const data: Record<string, unknown> = {};

  if (source.title) data.title = source.title;
  if (authors.length > 0) data.authors = authors;
  if (source.year) data.year = source.year;
  if (source.publisher) data.publisher = source.publisher;
  if (source.journal) data.journalName = source.journal;
  if (source.volume) data.volume = source.volume;
  if (source.issue) data.issue = source.issue;
  if (source.pages) data.startingPage = source.pages;
  if (source.url) data.url = source.url;
  if (source.city) data.placeOfPublication = source.city;
  if (source.edition) data.edition = source.edition;
  if (source.comments) data.comments = source.comments;

  // Map case-specific fields
  if (sourceType === "case.reported" && source.title) {
    data.caseName = source.title;
  }

  return {
    id: generateUUID(),
    aglcVersion: "4",
    sourceType,
    data,
    shortTitle: source.shortTitle,
    tags: ["imported-from-word"],
    createdAt: now,
    modifiedAt: now,
  };
}

/**
 * Import all Word bibliography sources into the Obiter citation store.
 * Skips duplicates by matching title + year + first author surname.
 */
export async function importWordSources(
  context: Word.RequestContext,
  store: CitationStore
): Promise<{ imported: number; skipped: number }> {
  // INTEROP-007: the Word Sources codec and the shared import pipeline do
  // the mapping and duplicate detection, with one persist for the batch.
  const xml = await getWordSourcesXml(context);
  if (!xml) return { imported: 0, skipped: 0 };
  const preview = prepareImport([{ text: xml, formatHint: "word-sources-xml" }], {
    existing: store.getAll(),
    aglcVersion: getVersionForStandard(store.getStandardId()),
  });
  const result = await commitImport(preview, store, { includeIncomplete: true });
  return { imported: result.added, skipped: result.skippedDuplicates };
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

/**
 * Generate a v4-style UUID.
 */
function generateUUID(): string {
  // Use crypto.randomUUID if available, otherwise fallback
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  // Fallback for environments without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
