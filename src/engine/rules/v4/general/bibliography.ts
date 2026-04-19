/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { Citation, SourceType } from "../../../../types/citation";
import { FormattedRun } from "../../../../types/formattedRun";

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
