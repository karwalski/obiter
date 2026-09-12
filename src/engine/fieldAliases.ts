/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * fieldAliases.ts — the single table of data keys the engine dispatchers
 * accept in place of a contract field.
 *
 * The dispatch contract (ruleExporter SOURCE_TYPE_METADATA) names the PRIMARY
 * key each dispatch function reads, but the dispatchers also accept legacy
 * and form aliases (eg `date` for `fullDate`, a flat `author` string for the
 * structured `authors` array). Every consumer that needs to know "is this
 * field present under any accepted key" reads this table: the insert-time
 * completeness check (validator.listMissingRequiredFields), the Edit form
 * (editCitationFields aliases) and the interchange exporter
 * (fromCitation). Keeping one table stops the copies drifting apart
 * (INTEROP-001).
 */

/** Contract field -> alternative data keys the dispatcher for that field reads. */
export const FIELD_ALIASES: Readonly<Record<string, readonly string[]>> = {
  // Case dates (rules 2.3.2–2.3.4) all fall back to the form's `date` key
  fullDate: ["date"],
  orderDate: ["date"],
  commencedDate: ["date"],
  // Report/secondary types render the bare year when no full date is stored
  date: ["year"],
  court: ["courtIdentifier", "courtId"],
  caseNumber: ["mnc", "judgmentNumber", "decisionNumber", "number"],
  // Author element shapes (rules 4.1, 6.6.3) — mirrors the completeness keys
  authors: ["author", "chapterAuthors", "institutionalAuthor", "body", "editors"],
  author: ["authors"],
  chapterAuthors: ["authors", "author"],
  editors: ["editorsText"],
  bookTitle: ["title"],
  chapterTitle: ["title"],
  billTitle: ["title"],
  billYear: ["year"],
  journal: ["journalName"],
  newspaper: ["newspaperName", "publication"],
  websiteName: ["website", "siteName"],
  speaker: ["author", "authors", "name"],
  commissionName: ["body", "institutionalAuthor", "author"],
  sender: ["author"],
  interviewee: ["author", "name"],
  interviewer: ["host"],
  conferenceName: ["event"],
  thesisType: ["degree"],
  university: ["institution"],
  treatySeries: ["conventionSeries"],
  catalogueNumber: ["number"],
  legislature: ["jurisdiction"],
  party: ["party1"],
  party1: ["caseName", "caseTitle"],
  caseName: ["party1", "caseTitle", "title"],
  judges: ["judicialOfficer", "judicialOfficers"],
  judicialOfficers: ["judges", "judicialOfficer"],
  documentNumber: ["number"],
  noteText: ["customText"],
  awardDescription: ["arbitrationType", "awardDetails"],
  page: ["startingPage"],
  startingPage: ["page"],
  issuingBody: ["body"],
  documentTitle: ["title"],
};

/** The alternative keys accepted for `field` (empty when it has none). */
export function getFieldAliases(field: string): readonly string[] {
  return FIELD_ALIASES[field] ?? [];
}

/** True for a value the dispatchers treat as present. */
export function isFieldValuePresent(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return !Number.isNaN(value);
  return true;
}

/**
 * Reads `field` from `data`, falling back through its aliases. Returns
 * undefined when neither the primary key nor any alias holds a value.
 */
export function readFieldWithAliases(data: Record<string, unknown>, field: string): unknown {
  if (isFieldValuePresent(data[field])) return data[field];
  for (const alias of getFieldAliases(field)) {
    if (isFieldValuePresent(data[alias])) return data[alias];
  }
  return undefined;
}
