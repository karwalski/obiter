/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * Edit-view field definitions per source type (BUG-005 (d)).
 *
 * Every key here MUST be a data key the engine dispatch for that source type
 * actually reads (src/engine/engine.ts) — a mismatched key renders an empty,
 * uneditable field and silently drops the user's edits (the original BUG-005:
 * `case.reported` used a `caseName` key the dispatcher never reads, so the
 * parties vanished from the edit form). The contract is enforced by
 * tests/ui/editCitationFieldContract.test.ts, which statically parses the
 * dispatcher the same way tests/engine/rule-exporter.test.ts does.
 */

import type { SourceType } from "../../types/citation";

export interface FieldDefinition {
  key: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  /**
   * "namelist" fields hold the engine's structured Author[] shape but are
   * edited as a single comma/'and'-separated line (see src/ui/nameList.ts).
   */
  type?: "text" | "checkbox" | "namelist";
}

/**
 * Explicit per-type field lists. Types not listed here fall back to
 * DEFAULT_FIELDS via getFieldsForSourceType.
 */
export const EDIT_FIELDS_BY_SOURCE_TYPE: Partial<Record<SourceType, FieldDefinition[]>> = {
  "case.reported": [
    // Reported cases are stored/formatted with party1 + party2 (matching the
    // engine's required fields and the insert form). Using a single caseName
    // field here left the parties blank on edit (BUG-005).
    { key: "party1", label: "Party 1", required: true, placeholder: "e.g. Smith" },
    {
      key: "party2",
      label: "Party 2",
      required: true,
      placeholder: "e.g. Land & House Property Corporation",
    },
    { key: "year", label: "Year", required: true, placeholder: "2024" },
    { key: "yearType", label: "Year Brackets", placeholder: "round or square" },
    { key: "volume", label: "Volume", placeholder: "123" },
    { key: "reportSeries", label: "Report Series", required: true, placeholder: "CLR" },
    { key: "startingPage", label: "Starting Page", required: true, placeholder: "1" },
    { key: "pinpoint", label: "Pinpoint", placeholder: "42" },
    // BUG-005 (d): the dispatcher (and insert form) read `courtId`, not `court`.
    { key: "courtId", label: "Court", placeholder: "HCA" },
  ],
  "case.unreported.mnc": [
    { key: "party1", label: "Party 1", required: true, placeholder: "e.g. Mabo" },
    { key: "party2", label: "Party 2", required: true, placeholder: "e.g. Queensland" },
    { key: "year", label: "Year", required: true, placeholder: "2022" },
    { key: "court", label: "Court", required: true, placeholder: "e.g. FCA, HCA" },
    { key: "caseNumber", label: "Case Number", required: true, placeholder: "e.g. 1136" },
    { key: "pinpoint", label: "Pinpoint", placeholder: "e.g. [42]" },
    { key: "judicialOfficer", label: "Judicial Officer", placeholder: "e.g. Crennan J" },
  ],
  // BUG-005 (d): the dispatcher reads party1/party2 + judges + fullDate|date
  // (Rule 2.3.2); the previous caseName/judgeName keys were never read, so
  // those fields loaded empty and edits to them were dropped.
  "case.unreported.no_mnc": [
    { key: "party1", label: "Party 1", required: true, placeholder: "e.g. Smith" },
    { key: "party2", label: "Party 2", required: true, placeholder: "e.g. Jones" },
    {
      key: "court",
      label: "Court",
      required: true,
      placeholder: "e.g. Supreme Court of New South Wales",
    },
    { key: "judges", label: "Judge(s)", required: true, placeholder: "e.g. Young J" },
    { key: "date", label: "Date", required: true, placeholder: "e.g. 5 October 2020" },
    { key: "pinpoint", label: "Pinpoint" },
  ],
  "legislation.statute": [
    { key: "title", label: "Title", required: true, placeholder: "Competition and Consumer Act" },
    { key: "year", label: "Year", required: true, placeholder: "2010" },
    { key: "jurisdiction", label: "Jurisdiction", required: true, placeholder: "Cth" },
    { key: "pinpoint", label: "Pinpoint", placeholder: "s 52" },
  ],
  // BUG-005 (d): the dispatcher reads number + pinpoint for bills (Rule 3.2);
  // the previous `chamber` key was never read.
  "legislation.bill": [
    { key: "title", label: "Title", required: true },
    { key: "year", label: "Year", required: true },
    { key: "jurisdiction", label: "Jurisdiction", required: true },
    { key: "number", label: "Number" },
    { key: "pinpoint", label: "Pinpoint" },
  ],
  "legislation.delegated": [
    { key: "title", label: "Title", required: true },
    { key: "year", label: "Year", required: true },
    { key: "jurisdiction", label: "Jurisdiction", required: true },
    { key: "pinpoint", label: "Pinpoint" },
  ],
  "legislation.constitution": [
    { key: "jurisdiction", label: "Jurisdiction", required: true, placeholder: "Cth" },
    { key: "pinpoint", label: "Pinpoint", required: true, placeholder: "s 51(i)" },
  ],
  // Keys must match what the insert form / parser / engine use:
  // `journal` (not journalName) and `issue`. Mismatched keys made the
  // Journal Name field load empty and silently dropped edits to it.
  // BUG-005 (d): the dispatcher reads the structured `authors` array, not a
  // flat `author` string — edited as a name-list line.
  "journal.article": [
    {
      key: "authors",
      label: "Author(s)",
      required: true,
      placeholder: "Jane Smith",
      type: "namelist",
    },
    { key: "title", label: "Article Title", required: true },
    { key: "year", label: "Year", required: true },
    { key: "volume", label: "Volume", required: true },
    { key: "issue", label: "Issue" },
    { key: "journal", label: "Journal Name", required: true },
    { key: "startingPage", label: "Starting Page", required: true },
    { key: "pinpoint", label: "Pinpoint" },
  ],
  book: [
    // BUG-005 (d): `authors` (structured array), not `author` (never read).
    { key: "authors", label: "Author(s)", required: true, type: "namelist" },
    { key: "title", label: "Title", required: true },
    // Rule 26.4: bracketed translation of a non-English title
    { key: "translatedTitle", label: "Title Translation", placeholder: "For non-English titles" },
    { key: "publisher", label: "Publisher", required: true },
    { key: "edition", label: "Edition" },
    { key: "year", label: "Year", required: true },
    { key: "pinpoint", label: "Pinpoint" },
  ],
  // BUG-005 (d): the dispatcher reads `authors` (chapter authors) and the
  // structured `editors` array; the previous author/editor keys were never
  // read. `edition` is not an element the chapter dispatcher reads.
  "book.chapter": [
    { key: "authors", label: "Chapter Author(s)", required: true, type: "namelist" },
    { key: "chapterTitle", label: "Chapter Title", required: true },
    {
      key: "editors",
      label: "Editor(s)",
      required: true,
      placeholder: "e.g. Michael Coper and George Williams",
      type: "namelist",
    },
    { key: "bookTitle", label: "Book Title", required: true },
    { key: "publisher", label: "Publisher", required: true },
    { key: "year", label: "Year", required: true },
    { key: "startingPage", label: "Starting Page", required: true },
    { key: "pinpoint", label: "Pinpoint" },
  ],
  film_tv_media: [
    { key: "title", label: "Title", required: true },
    { key: "director", label: "Director" },
    { key: "productionCompany", label: "Production Company" },
    { key: "year", label: "Year" },
    { key: "medium", label: "Medium" },
    { key: "episodeTitle", label: "Episode Title" },
    { key: "seriesTitle", label: "Series Title" },
    { key: "seasonNumber", label: "Season" },
    { key: "episodeNumber", label: "Episode" },
    // BUG-005 (d): the dispatcher (and insert form) read `timePinpoint`
    // (Rule 7.14), not `pinpoint`.
    { key: "timePinpoint", label: "Time Pinpoint", placeholder: "e.g. 0:32:10" },
  ],
  internet_material: [
    { key: "author", label: "Author" },
    { key: "title", label: "Title", required: true },
    // Rule 26.4: bracketed translations of non-English elements
    { key: "translatedTitle", label: "Title Translation", placeholder: "For non-English titles" },
    // BUG-005 (d): the dispatcher (and insert form) read `websiteName`, not
    // the previous `webPage` key.
    { key: "websiteName", label: "Web Page / Site" },
    {
      key: "translatedWebsiteName",
      label: "Web Page Translation",
      placeholder: "For non-English sites",
    },
    { key: "date", label: "Date" },
    // Rule 7.15: pinpoint (usually a bracketed paragraph) before the URL
    { key: "pinpoint", label: "Pinpoint", placeholder: "e.g. [4]" },
    { key: "url", label: "URL", required: true },
  ],
  // BUG-005 (d): the newspaper dispatcher reads no `pinpoint` key (the page
  // element carries the locator, Rule 7.11.2), so that dead field is gone.
  newspaper: [
    { key: "author", label: "Author" },
    { key: "title", label: "Article Title", required: true },
    // Rule 26.4: bracketed translation of a non-English title
    { key: "translatedTitle", label: "Title Translation", placeholder: "For non-English titles" },
    { key: "newspaper", label: "Newspaper", required: true },
    { key: "date", label: "Date", required: true },
    { key: "startingPage", label: "Starting Page" },
  ],
  "book.ebook": [
    // DECISION-019: the '[Platform]' bracket was retired — ebooks render as
    // ordinary books (rules 6.1–6.5) — so no Platform field is offered.
    // BUG-005 (d): `authors` (structured array), not `author` (never read).
    { key: "authors", label: "Author(s)", required: true, type: "namelist" },
    { key: "title", label: "Title", required: true },
    { key: "publisher", label: "Publisher", required: true },
    { key: "edition", label: "Edition" },
    { key: "year", label: "Year", required: true },
    { key: "url", label: "URL" },
    { key: "pinpoint", label: "Pinpoint" },
  ],
  // BUG-005 (d): periodicals without volume/issue numbers are the rule
  // 7.11.3 form this type formats — the dispatcher reads neither `volume`
  // nor `issue` (numbered periodicals are cited as journal articles).
  periodical: [
    { key: "author", label: "Author" },
    { key: "title", label: "Article Title", required: true },
    { key: "periodicalName", label: "Periodical Name", required: true },
    { key: "datePeriod", label: "Date/Period", placeholder: "e.g. Spring 2024, March 2024" },
    { key: "page", label: "Page" },
    { key: "pinpoint", label: "Pinpoint" },
  ],
  "treaty.mou": [
    { key: "title", label: "Title", required: true },
    { key: "parties", label: "Parties" },
    { key: "signedDate", label: "Date Signed" },
    { key: "pinpoint", label: "Pinpoint" },
    { key: "url", label: "URL" },
  ],
  treaty: [
    { key: "title", label: "Title", required: true },
    { key: "openedDate", label: "Date Opened for Signature", required: true },
    { key: "treatySeries", label: "Treaty Series", required: true },
    { key: "seriesVolume", label: "Series Volume" },
    { key: "startingPage", label: "Starting Page" },
    { key: "entryIntoForceDate", label: "Entry into Force Date" },
    { key: "notYetInForce", label: "Not yet in force", type: "checkbox" },
    { key: "pinpoint", label: "Pinpoint" },
  ],
};

/**
 * Generic fallback for source types without an explicit field list: expose
 * the common fields most source types share.
 */
const DEFAULT_FIELDS: FieldDefinition[] = [
  { key: "title", label: "Title" },
  { key: "author", label: "Author" },
  { key: "year", label: "Year" },
  { key: "pinpoint", label: "Pinpoint" },
];

/**
 * Returns field definitions for a given source type. These mirror the Insert
 * view layout — each source type shows only the fields relevant to it.
 */
export function getFieldsForSourceType(sourceType: SourceType): FieldDefinition[] {
  return EDIT_FIELDS_BY_SOURCE_TYPE[sourceType] ?? DEFAULT_FIELDS;
}
