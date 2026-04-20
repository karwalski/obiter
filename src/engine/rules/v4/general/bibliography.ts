/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { Citation, SourceType } from "../../../../types/citation";
import { FormattedRun } from "../../../../types/formattedRun";
import type { CitationConfig } from "../../../standards/types";

// ─── Types ───────────────────────────────────────────────────────────────────

/** A single section of an AGLC4 bibliography. */
export interface BibliographySection {
  heading: string;
  entries: FormattedRun[][];
}

// ─── Bibliography Category Mapping (Rule 1.13) ──────────────────────────────

/**
 * Maps a SourceType to its AGLC4 bibliography section letter (A–E).
 *
 * AGLC4 Rule 1.13: Bibliographies should be divided into the following
 * sections:
 * - A  Articles/Books/Reports (secondary sources)
 * - B  Cases
 * - C  Legislation
 * - D  Treaties
 * - E  Other
 *
 * @param sourceType - The source type to categorise.
 * @returns The bibliography section letter.
 */
export function getBibliographyCategory(sourceType: SourceType): string {
  // Cases (Part II domestic cases, Part IV international court decisions,
  // Part V foreign cases)
  if (sourceType.startsWith("case.")) return "B";

  // Legislation
  if (sourceType.startsWith("legislation.")) return "C";

  // Treaties
  if (sourceType === "treaty") return "D";

  // Secondary sources (Part III)
  const secondarySources: SourceType[] = [
    "journal.article",
    "journal.online",
    "journal.forthcoming",
    "book",
    "book.chapter",
    "book.translated",
    "book.audiobook",
    "report",
    "report.parliamentary",
    "report.royal_commission",
    "report.law_reform",
    "report.abs",
    "research_paper",
    "research_paper.parliamentary",
    "conference_paper",
    "thesis",
    "speech",
    "press_release",
    "hansard",
    "submission.government",
    "evidence.parliamentary",
    "constitutional_convention",
    "dictionary",
    "legal_encyclopedia",
    "looseleaf",
    "ip_material",
    "constitutive_document",
    "newspaper",
    "correspondence",
    "interview",
    "film_tv_media",
    "internet_material",
    "social_media",
  ];

  if (secondarySources.includes(sourceType)) return "A";

  // GenAI output — MULR interim guidance treats as correspondence (Rule 7.12),
  // but bibliographically it belongs in section E (Other) pending AGLC5 guidance.
  if (sourceType === "genai_output") return "E";

  // Everything else: international materials, foreign sources, etc.
  return "E";
}

// ─── Author Name Inversion ──────────────────────────────────────────────────

/**
 * Inverts the first author's name to "Surname, Given Names" format for
 * bibliography entries.
 *
 * AGLC4 Rule 1.13: In a bibliography, the first-listed author's name is
 * inverted (surname first). For works with multiple authors, only the
 * first author's name is inverted.
 *
 * @param data - The citation source data.
 * @returns An array of FormattedRun for the author portion, or an empty
 *   array if there are no authors.
 */
function formatBibliographyAuthors(
  data: Record<string, unknown>
): FormattedRun[] {
  const authors = data["authors"] as
    | Array<{ givenNames: string; surname: string; suffix?: string }>
    | undefined;

  if (!authors || authors.length === 0) return [];

  const first = authors[0];
  const invertedFirst = first.suffix
    ? `${first.surname}, ${first.givenNames} ${first.suffix}`
    : `${first.surname}, ${first.givenNames}`;

  if (authors.length === 1) {
    return [{ text: invertedFirst }];
  }

  // Subsequent authors in normal order.
  const rest = authors.slice(1).map((a) => {
    const name = `${a.givenNames} ${a.surname}`;
    return a.suffix ? `${name} ${a.suffix}` : name;
  });

  // Join with commas; final author preceded by "and".
  let authorText: string;
  if (rest.length === 1) {
    authorText = `${invertedFirst} and ${rest[0]}`;
  } else {
    const allButLast = rest.slice(0, -1).join(", ");
    authorText = `${invertedFirst}, ${allButLast} and ${rest[rest.length - 1]}`;
  }

  return [{ text: authorText }];
}

// ─── Sort Key Extraction ────────────────────────────────────────────────────

/**
 * Extracts the alphabetical sort key for a citation's bibliography entry.
 * Uses the first author's surname if available, otherwise falls back to
 * the title.
 */
function getSortKey(citation: Citation): string {
  const data = citation.data;
  const authors = data["authors"] as
    | Array<{ surname: string }>
    | undefined;

  if (authors && authors.length > 0) {
    return authors[0].surname.toLowerCase();
  }

  const title = (data["title"] as string | undefined) ?? "";
  return title.toLowerCase();
}

// ─── Single Entry Formatting ─────────────────────────────────────────────────

/**
 * Formats a single citation as a bibliography entry.
 *
 * AGLC4 Rule 1.13: Bibliography entries differ from footnote citations:
 * - The first author's name is inverted (surname first).
 * - No pinpoint references are included.
 * - No trailing full stop.
 *
 * This is a simplified formatter that produces the author and title. The
 * full per-source-type formatting will be built out as each rule module is
 * completed; this function provides the structural framework.
 *
 * @param citation - The citation to format.
 * @returns An array of FormattedRun representing the bibliography entry.
 */
export function formatBibliographyEntry(citation: Citation): FormattedRun[] {
  const runs: FormattedRun[] = [];
  const data = citation.data;

  // Author(s)
  const authorRuns = formatBibliographyAuthors(data);
  if (authorRuns.length > 0) {
    runs.push(...authorRuns);
  }

  // Title — formatting depends on source type.
  const title = data["title"] as string | undefined;
  if (title) {
    if (runs.length > 0) {
      runs.push({ text: ", " });
    }

    const category = getBibliographyCategory(citation.sourceType);

    if (category === "A") {
      // Secondary sources: books get italic titles; articles get single-quoted.
      if (
        citation.sourceType.startsWith("book") ||
        citation.sourceType.startsWith("report") ||
        citation.sourceType === "thesis" ||
        citation.sourceType === "looseleaf" ||
        citation.sourceType === "legal_encyclopedia" ||
        citation.sourceType === "dictionary"
      ) {
        runs.push({ text: title, italic: true });
      } else {
        runs.push({ text: `'${title}'` });
      }
    } else if (category === "B") {
      // Cases: italic.
      runs.push({ text: title, italic: true });
    } else if (category === "C") {
      // Legislation: italic.
      runs.push({ text: title, italic: true });
    } else {
      // Treaties, Other: italic.
      runs.push({ text: title, italic: true });
    }
  }

  // Year
  const year = data["year"] as number | string | undefined;
  if (year !== undefined) {
    runs.push({ text: ` (${year})` });
  }

  // Publication details (volume, report series, starting page) — secondary sources.
  const volume = data["volume"] as number | string | undefined;
  const reportSeries =
    (data["journalName"] as string | undefined) ??
    (data["reportSeries"] as string | undefined);
  const startingPage = data["startingPage"] as number | string | undefined;

  if (reportSeries) {
    runs.push({ text: " " });
    if (volume !== undefined) {
      runs.push({ text: `${volume} ` });
    }
    runs.push({ text: reportSeries, italic: false });
    if (startingPage !== undefined) {
      runs.push({ text: ` ${startingPage}` });
    }
  }

  // No trailing full stop per AGLC4 Rule 1.13.
  // No pinpoint references in bibliography entries.

  return runs;
}

// ─── Full Bibliography Generation (Rule 1.13) ───────────────────────────────

/** Display headings for each bibliography section. */
const SECTION_HEADINGS: Record<string, string> = {
  A: "A Articles/Books/Reports",
  B: "B Cases",
  C: "C Legislation",
  D: "D Treaties",
  E: "E Other",
};

/** Canonical ordering of bibliography sections. */
const SECTION_ORDER = ["A", "B", "C", "D", "E"];

/**
 * Generates a full AGLC4 bibliography from a list of citations.
 *
 * AGLC4 Rule 1.13: A bibliography should be divided into sections:
 * A (Articles/Books/Reports), B (Cases), C (Legislation), D (Treaties),
 * E (Other). Entries within each section are sorted alphabetically by
 * the first author's surname (or title if there is no author). Empty
 * sections are omitted.
 *
 * @param citations - All citations referenced in the document.
 * @returns An array of BibliographySection objects, one per non-empty section.
 */
export function generateBibliography(
  citations: Citation[]
): BibliographySection[] {
  // Group citations by category.
  const groups: Record<string, Citation[]> = {};
  for (const category of SECTION_ORDER) {
    groups[category] = [];
  }

  for (const citation of citations) {
    const category = getBibliographyCategory(citation.sourceType);
    groups[category].push(citation);
  }

  // Build sections, omitting empty ones.
  const sections: BibliographySection[] = [];

  for (const category of SECTION_ORDER) {
    const citationsInGroup = groups[category];
    if (citationsInGroup.length === 0) continue;

    // Sort alphabetically by first author surname or title.
    citationsInGroup.sort((a, b) => {
      const keyA = getSortKey(a);
      const keyB = getSortKey(b);
      return keyA.localeCompare(keyB);
    });

    // Deduplicate by citation ID.
    const seen = new Set<string>();
    const uniqueCitations: Citation[] = [];
    for (const c of citationsInGroup) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        uniqueCitations.push(c);
      }
    }

    const entries = uniqueCitations.map((c) => formatBibliographyEntry(c));

    sections.push({
      heading: SECTION_HEADINGS[category],
      entries,
    });
  }

  return sections;
}

// ─── OSCOLA Bibliography Structure (MULTI-010) ──────────────────────────────

/**
 * Maps a SourceType to an OSCOLA bibliography section.
 *
 * OSCOLA Rule 1.4: Bibliography is divided into:
 * - Table of Cases (case names de-italicised)
 * - Table of Legislation
 * - Bibliography (secondary sources, subdivided)
 */
function getOscolaBibliographySection(
  sourceType: SourceType,
): "cases" | "legislation" | "secondary" {
  if (sourceType.startsWith("case.")) return "cases";
  if (sourceType.startsWith("legislation.")) return "legislation";
  return "secondary";
}

/**
 * Formats a case name for the OSCOLA Table of Cases by removing italics.
 *
 * OSCOLA Rule 1.4: Case names in the Table of Cases are NOT italicised.
 * "Re X" is sorted under R.
 */
function deItaliciseCaseEntry(entry: FormattedRun[]): FormattedRun[] {
  return entry.map((run) => ({ ...run, italic: false }));
}

/**
 * Extracts the sort key for an OSCOLA Table of Cases entry.
 * Uses the first party name; "Re X" sorts under R.
 */
function getCaseSortKey(citation: Citation): string {
  const title = (citation.data["title"] as string | undefined) ?? "";
  // Sort by first significant word (Re sorts under R naturally)
  return title.toLowerCase();
}

/**
 * Generates an OSCOLA bibliography with three parts:
 * 1. Table of Cases (de-italicised, sorted by first party)
 * 2. Table of Legislation
 * 3. Bibliography (secondary sources)
 *
 * @param citations - All citations referenced in the document.
 * @returns An array of BibliographySection objects for OSCOLA.
 *
 * @see OSCOLA, Rule 1.4.
 */
export function generateOscolaBibliography(
  citations: Citation[],
): BibliographySection[] {
  const groups: Record<"cases" | "legislation" | "secondary", Citation[]> = {
    cases: [],
    legislation: [],
    secondary: [],
  };

  for (const citation of citations) {
    const section = getOscolaBibliographySection(citation.sourceType);
    groups[section].push(citation);
  }

  const sections: BibliographySection[] = [];

  // Table of Cases
  if (groups.cases.length > 0) {
    const deduplicated = deduplicateById(groups.cases);
    deduplicated.sort((a, b) =>
      getCaseSortKey(a).localeCompare(getCaseSortKey(b)),
    );
    const entries = deduplicated.map((c) =>
      deItaliciseCaseEntry(formatBibliographyEntry(c)),
    );
    sections.push({ heading: "Table of Cases", entries });
  }

  // Table of Legislation
  if (groups.legislation.length > 0) {
    const deduplicated = deduplicateById(groups.legislation);
    deduplicated.sort((a, b) => getSortKey(a).localeCompare(getSortKey(b)));
    const entries = deduplicated.map((c) => formatBibliographyEntry(c));
    sections.push({ heading: "Table of Legislation", entries });
  }

  // Bibliography (secondary)
  if (groups.secondary.length > 0) {
    const deduplicated = deduplicateById(groups.secondary);
    deduplicated.sort((a, b) => getSortKey(a).localeCompare(getSortKey(b)));
    const entries = deduplicated.map((c) => formatBibliographyEntry(c));
    sections.push({ heading: "Bibliography", entries });
  }

  return sections;
}

// ─── NZLSG Bibliography Structure (MULTI-010) ───────────────────────────────

/**
 * Maps a SourceType to an NZLSG bibliography section.
 *
 * NZLSG Rule 1.5: Bibliography divided into primary sources (with dedicated
 * Waitangi Tribunal section) and secondary sources.
 */
function getNzlsgBibliographySection(
  sourceType: SourceType,
): "cases" | "legislation" | "waitangi" | "secondary" {
  if (sourceType.startsWith("case.")) return "cases";
  if (sourceType.startsWith("legislation.")) return "legislation";
  // Waitangi Tribunal reports are identified by source type or tag
  // For now, they would be a report type; we use a convention check.
  return "secondary";
}

/**
 * Generates an NZLSG bibliography with primary sources (subdivided,
 * including a dedicated Waitangi Tribunal section) and secondary sources.
 *
 * @param citations - All citations referenced in the document.
 * @returns An array of BibliographySection objects for NZLSG.
 *
 * @see NZLSG, Rule 1.5.
 */
export function generateNzlsgBibliography(
  citations: Citation[],
): BibliographySection[] {
  const groups: Record<
    "cases" | "legislation" | "waitangi" | "secondary",
    Citation[]
  > = {
    cases: [],
    legislation: [],
    waitangi: [],
    secondary: [],
  };

  for (const citation of citations) {
    // Check for Waitangi Tribunal reports (identified by tag or data field)
    const isWaitangi =
      citation.tags.includes("waitangi_tribunal") ||
      (citation.data["body"] as string | undefined)
        ?.toLowerCase()
        .includes("waitangi tribunal");

    if (isWaitangi) {
      groups.waitangi.push(citation);
    } else {
      const section = getNzlsgBibliographySection(citation.sourceType);
      groups[section].push(citation);
    }
  }

  const sections: BibliographySection[] = [];

  // Primary Sources: Cases
  if (groups.cases.length > 0) {
    const deduplicated = deduplicateById(groups.cases);
    deduplicated.sort((a, b) => getSortKey(a).localeCompare(getSortKey(b)));
    const entries = deduplicated.map((c) => formatBibliographyEntry(c));
    sections.push({ heading: "Cases", entries });
  }

  // Primary Sources: Legislation
  if (groups.legislation.length > 0) {
    const deduplicated = deduplicateById(groups.legislation);
    deduplicated.sort((a, b) => getSortKey(a).localeCompare(getSortKey(b)));
    const entries = deduplicated.map((c) => formatBibliographyEntry(c));
    sections.push({ heading: "Legislation", entries });
  }

  // Primary Sources: Waitangi Tribunal
  if (groups.waitangi.length > 0) {
    const deduplicated = deduplicateById(groups.waitangi);
    deduplicated.sort((a, b) => getSortKey(a).localeCompare(getSortKey(b)));
    const entries = deduplicated.map((c) => formatBibliographyEntry(c));
    sections.push({ heading: "Waitangi Tribunal", entries });
  }

  // Secondary Sources
  if (groups.secondary.length > 0) {
    const deduplicated = deduplicateById(groups.secondary);
    deduplicated.sort((a, b) => getSortKey(a).localeCompare(getSortKey(b)));
    const entries = deduplicated.map((c) => formatBibliographyEntry(c));
    sections.push({ heading: "Secondary Sources", entries });
  }

  return sections;
}

// ─── Bibliography Dispatcher (MULTI-010) ────────────────────────────────────

/**
 * Generates a bibliography structured according to the active citation standard.
 *
 * @param citations - All citations referenced in the document.
 * @param structure - The bibliography structure to use: "aglc", "oscola", or "nzlsg".
 * @returns An array of BibliographySection objects appropriate to the standard.
 */
export function generateBibliographyForStandard(
  citations: Citation[],
  structure: CitationConfig["bibliographyStructure"],
): BibliographySection[] {
  switch (structure) {
    case "oscola":
      return generateOscolaBibliography(citations);
    case "nzlsg":
      return generateNzlsgBibliography(citations);
    case "aglc":
    default:
      return generateBibliography(citations);
  }
}

// ─── Shared Helpers ─────────────────────────────────────────────────────────

/** Deduplicates citations by ID, preserving order. */
function deduplicateById(citations: Citation[]): Citation[] {
  const seen = new Set<string>();
  const result: Citation[] = [];
  for (const c of citations) {
    if (!seen.has(c.id)) {
      seen.add(c.id);
      result.push(c);
    }
  }
  return result;
}
