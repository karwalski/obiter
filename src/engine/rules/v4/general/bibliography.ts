/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { Citation, SourceType } from "../../../../types/citation";
import { FormattedRun } from "../../../../types/formattedRun";
import type { CitationConfig, LoaType, WritingMode } from "../../../standards/types";
import {
  generateTableOfCases,
  generateTableOfLegislation,
} from "../../oscola/tables";
import type { CaseEntry, LegislationEntry } from "../../oscola/tables";

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
    "report.waitangi_tribunal",
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

  // ── Per-source-type publication details (AUDIT2-017, Rule 1.13) ─────────

  const st = citation.sourceType;
  const year = data["year"] as number | string | undefined;

  if (st === "book" || st === "book.chapter" || st === "book.translated" || st === "book.audiobook") {
    // Books: (Publisher, Edition ed, Year) — Rule 6 bibliography format
    const publisher = data["publisher"] as string | undefined;
    const edition = data["edition"] as number | string | undefined;
    const place = data["place"] as string | undefined;

    const pubParts: string[] = [];
    if (place) pubParts.push(place);
    if (publisher) pubParts.push(publisher);
    if (edition !== undefined) pubParts.push(`${edition} ed`);
    if (year !== undefined) pubParts.push(String(year));

    if (pubParts.length > 0) {
      runs.push({ text: ` (${pubParts.join(", ")})` });
    }
  } else if (st === "journal.article" || st === "journal.online" || st === "journal.forthcoming") {
    // Journal articles: (Year) Volume Journal StartingPage — Rule 5 bibliography format
    if (year !== undefined) {
      runs.push({ text: ` (${year})` });
    }
    const volume = data["volume"] as number | string | undefined;
    const issue = data["issue"] as string | undefined;
    const journal =
      (data["journal"] as string | undefined) ??
      (data["journalName"] as string | undefined);
    const startingPage = data["startingPage"] as number | string | undefined;

    if (journal) {
      runs.push({ text: " " });
      if (volume !== undefined) {
        runs.push({ text: `${volume}` });
        if (issue) {
          runs.push({ text: `(${issue})` });
        }
        runs.push({ text: " " });
      }
      runs.push({ text: journal, italic: true });
      if (startingPage !== undefined) {
        runs.push({ text: ` ${startingPage}` });
      }
    }
  } else if (st.startsWith("report") || st === "research_paper" || st === "research_paper.parliamentary") {
    // Reports: Body Name, Title (Year) — Rule 7 bibliography format
    // If no authors were formatted, use the body name as the author stand-in
    const body = data["body"] as string | undefined;
    if (body && authorRuns.length === 0 && !title) {
      // Body name is the only identifier
      if (runs.length === 0) {
        runs.push({ text: body });
      }
    }
    if (year !== undefined) {
      runs.push({ text: ` (${year})` });
    }
    // Report number if available
    const reportNumber = data["reportNumber"] as string | number | undefined;
    if (reportNumber !== undefined) {
      runs.push({ text: `, Report No ${reportNumber}` });
    }
  } else if (st.startsWith("case.")) {
    // Cases: full case citation — (Year) Volume Series Page (Court)
    const yearType = (data["yearType"] as "round" | "square") ?? "round";
    if (year !== undefined) {
      const bracket = yearType === "square" ? `[${year}]` : `(${year})`;
      runs.push({ text: ` ${bracket}` });
    }
    const volume = data["volume"] as number | string | undefined;
    if (volume !== undefined) {
      runs.push({ text: ` ${volume}` });
    }
    const reportSeries = data["reportSeries"] as string | undefined;
    if (reportSeries) {
      runs.push({ text: ` ${reportSeries}` });
    }
    const startingPage = data["startingPage"] as number | string | undefined;
    if (startingPage !== undefined) {
      runs.push({ text: ` ${startingPage}` });
    }
    const courtId = data["courtId"] as string | undefined;
    const court = data["court"] as string | undefined;
    const courtLabel = courtId ?? court;
    if (courtLabel && yearType !== "square") {
      // Court identifier only needed when year is in round brackets (unreported)
      // or when the report series does not imply the court
    }
    // MNC for unreported cases
    if (!reportSeries) {
      const caseNumber = data["caseNumber"] as string | number | undefined;
      if (court && caseNumber !== undefined) {
        runs.push({ text: ` ${court} ${caseNumber}` });
      }
    }
  } else if (st.startsWith("legislation.")) {
    // Legislation: Year and jurisdiction
    if (year !== undefined) {
      runs.push({ text: ` ${year}` });
    }
    const jurisdiction = data["jurisdiction"] as string | undefined;
    if (jurisdiction) {
      runs.push({ text: ` (${jurisdiction})` });
    }
  } else {
    // Default: Year and any volume/series/page details
    if (year !== undefined) {
      runs.push({ text: ` (${year})` });
    }

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

// ─── OSCOLA Adapters (OSC-ENH-003) ──────────────────────────────────────────

/**
 * Converts a Citation with a case source type to a CaseEntry suitable for
 * the canonical generateTableOfCases() in tables.ts.
 *
 * Extracts the case name from data.title, builds a citation string from the
 * formatted bibliography entry, and maps the source type to an OSCOLA
 * jurisdiction grouping. This avoids duplicating the sorting, grouping, and
 * de-italicisation logic that already exists in tables.ts.
 */
function citationToCaseEntry(citation: Citation): CaseEntry {
  const d = citation.data;
  const caseName = (d["title"] as string | undefined) ?? "";

  // Build citation text from the formatted entry, stripping the case name prefix.
  const fullEntry = formatBibliographyEntry(citation);
  const fullText = fullEntry.map((r) => r.text).join("");
  const citationText = fullText.startsWith(caseName)
    ? fullText.slice(caseName.length).replace(/^,?\s*/, "")
    : fullText;

  // Map source type to OSCOLA jurisdiction grouping.
  let jurisdiction: CaseEntry["jurisdiction"] = "UK";
  if (citation.sourceType === "eu.court") {
    jurisdiction = "EU";
  } else if (citation.sourceType === "echr.decision") {
    jurisdiction = "ECtHR";
  } else if (
    citation.sourceType.startsWith("icj.") ||
    citation.sourceType.startsWith("arbitral.") ||
    citation.sourceType.startsWith("icc_tribunal.") ||
    citation.sourceType.startsWith("wto.") ||
    citation.sourceType.startsWith("gatt.") ||
    citation.sourceType === "un.document" ||
    citation.sourceType === "un.communication"
  ) {
    jurisdiction = "International";
  } else if (citation.sourceType.startsWith("foreign.")) {
    jurisdiction = "Foreign";
  }

  return {
    caseName,
    citation: citationText,
    jurisdiction,
  };
}

/**
 * Converts a Citation with a legislation source type to a LegislationEntry
 * suitable for the canonical generateTableOfLegislation() in tables.ts.
 */
function citationToLegislationEntry(citation: Citation): LegislationEntry {
  const d = citation.data;
  const title = (d["title"] as string | undefined) ?? "";
  const year = d["year"] as number | undefined;

  // Map source type to OSCOLA legislation category.
  let category: LegislationEntry["category"] = "primary";
  if (citation.sourceType === "legislation.delegated") {
    category = "secondary";
  } else if (
    citation.sourceType === "eu.official_journal" ||
    citation.sourceType.startsWith("supranational.")
  ) {
    category = "eu";
  } else if (citation.sourceType === "treaty") {
    category = "treaty";
  }

  return { title, year, category };
}

/**
 * Generates an OSCOLA bibliography with three parts:
 * 1. Table of Cases — delegates to generateTableOfCases() from tables.ts
 *    for jurisdiction-based grouping and de-italicised formatting
 * 2. Table of Legislation — delegates to generateTableOfLegislation() from
 *    tables.ts for category-based grouping
 * 3. Bibliography (secondary sources)
 *
 * OSC-ENH-003: Consolidates duplicate Table of Cases / Table of Legislation
 * logic by reusing the canonical implementations in tables.ts.
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

  // Table of Cases — delegate to tables.ts (OSC-ENH-003)
  if (groups.cases.length > 0) {
    const deduplicated = deduplicateById(groups.cases);
    const caseEntries = deduplicated.map(citationToCaseEntry);
    const caseSections = generateTableOfCases(caseEntries);
    // Single jurisdiction: use unified "Table of Cases" heading.
    // Multiple jurisdictions: preserve the sub-headings from tables.ts.
    if (caseSections.length === 1) {
      sections.push({
        heading: "Table of Cases",
        entries: caseSections[0].entries,
      });
    } else {
      for (const caseSection of caseSections) {
        sections.push(caseSection);
      }
    }
  }

  // Table of Legislation — delegate to tables.ts (OSC-ENH-003)
  if (groups.legislation.length > 0) {
    const deduplicated = deduplicateById(groups.legislation);
    const legEntries = deduplicated.map(citationToLegislationEntry);
    const legSections = generateTableOfLegislation(legEntries);
    if (legSections.length === 1) {
      sections.push({
        heading: "Table of Legislation",
        entries: legSections[0].entries,
      });
    } else {
      for (const legSection of legSections) {
        sections.push(legSection);
      }
    }
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
  if (sourceType === "report.waitangi_tribunal") return "waitangi";
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

// ─── MULTI-014: List of Authorities (Court Mode) ────────────────────────────

/**
 * Extracts the first party name for sorting in the List of Authorities.
 * Uses party1 for cases, title for legislation.
 */
function getLoaSortKey(citation: Citation): string {
  const d = citation.data;
  const party1 = d.party1 as string | undefined;
  if (party1) return party1.toLowerCase();
  const title = (d.title as string | undefined) ?? "";
  return title.toLowerCase();
}

/**
 * Formats a case entry for the List of Authorities, including parallel
 * citations where available.
 *
 * Format: Case Name (year) volume Series startingPage; [MNC or parallels]
 */
function formatLoaCaseEntry(citation: Citation): FormattedRun[] {
  const entry = formatBibliographyEntry(citation);
  const d = citation.data;

  // Append MNC if available and not already represented
  const mnc = d.mnc as string | undefined;
  if (mnc && mnc.trim()) {
    const entryText = entry.map((r) => r.text).join("");
    if (!entryText.includes(mnc.trim())) {
      entry.push({ text: `; ${mnc.trim()}` });
    }
  }

  return entry;
}

/**
 * Generates a List of Authorities for court submissions per Federal Court
 * GPN-AUTH conventions.
 *
 * MULTI-014: Replaces bibliography generation in court mode. Produces:
 * 1. Cases — listed alphabetically by first party name, with parallel citations
 * 2. Legislation — listed alphabetically by short title
 *
 * No secondary sources section is included.
 *
 * @param citations - All citations referenced in the document.
 * @returns An array of BibliographySection objects for the List of Authorities.
 */
export function generateListOfAuthorities(
  citations: Citation[],
): BibliographySection[] {
  const cases: Citation[] = [];
  const legislation: Citation[] = [];

  for (const citation of citations) {
    if (citation.sourceType.startsWith("case.")) {
      cases.push(citation);
    } else if (citation.sourceType.startsWith("legislation.")) {
      legislation.push(citation);
    }
    // Secondary sources, treaties, etc. are excluded from LoA
  }

  const sections: BibliographySection[] = [];

  if (cases.length > 0) {
    const deduplicated = deduplicateById(cases);
    deduplicated.sort((a, b) => getLoaSortKey(a).localeCompare(getLoaSortKey(b)));
    const entries = deduplicated.map((c) => formatLoaCaseEntry(c));
    sections.push({ heading: "Cases", entries });
  }

  if (legislation.length > 0) {
    const deduplicated = deduplicateById(legislation);
    deduplicated.sort((a, b) => getSortKey(a).localeCompare(getSortKey(b)));
    const entries = deduplicated.map((c) => formatBibliographyEntry(c));
    sections.push({ heading: "Legislation", entries });
  }

  return sections;
}

// ─── LOA-002: Part A / Part B List of Authorities ───────────────────────────

/** Validation warning returned by LOA generation functions. */
export interface LoaValidationWarning {
  level: "warning" | "info";
  code: string;
  message: string;
}

/** Result of Part A/B LOA generation, including sections and validation. */
export interface PartABLoaResult {
  partA: BibliographySection[];
  partB: BibliographySection[];
  warnings: LoaValidationWarning[];
}

/**
 * Groups citations into Cases, Legislation, and (optionally) Secondary sources,
 * deduplicates and sorts each group alphabetically.
 */
function groupAndSortForLoa(
  citations: Citation[],
  includeSecondary: boolean,
): { cases: Citation[]; legislation: Citation[]; secondary: Citation[] } {
  const cases: Citation[] = [];
  const legislation: Citation[] = [];
  const secondary: Citation[] = [];

  for (const c of citations) {
    if (c.sourceType.startsWith("case.")) {
      cases.push(c);
    } else if (c.sourceType.startsWith("legislation.")) {
      legislation.push(c);
    } else if (includeSecondary) {
      secondary.push(c);
    }
  }

  const sortAndDedup = (arr: Citation[], keyFn: (c: Citation) => string): Citation[] => {
    const deduped = deduplicateById(arr);
    deduped.sort((a, b) => keyFn(a).localeCompare(keyFn(b)));
    return deduped;
  };

  return {
    cases: sortAndDedup(cases, getLoaSortKey),
    legislation: sortAndDedup(legislation, getSortKey),
    secondary: sortAndDedup(secondary, getSortKey),
  };
}

/**
 * Builds BibliographySection[] from grouped citations, applying the key
 * authority asterisk prefix when isKeyAuthority is set (LOA-004).
 */
function buildLoaSections(
  cases: Citation[],
  legislation: Citation[],
  secondary: Citation[],
): BibliographySection[] {
  const sections: BibliographySection[] = [];

  if (cases.length > 0) {
    const entries = cases.map((c) => formatLoaEntryWithKeyMarker(c));
    sections.push({ heading: "Cases", entries });
  }

  if (legislation.length > 0) {
    const entries = legislation.map((c) => formatLoaEntryWithKeyMarker(c));
    sections.push({ heading: "Legislation", entries });
  }

  if (secondary.length > 0) {
    const entries = secondary.map((c) => formatBibliographyEntry(c));
    sections.push({ heading: "Secondary Sources", entries });
  }

  return sections;
}

/**
 * LOA-004: Formats a LOA entry, prepending an asterisk for key authorities.
 *
 * NSW Court of Appeal practitioner convention: key authorities (up to 5)
 * are marked with an asterisk prefix in the List of Authorities.
 *
 * @param citation - The citation to format.
 * @returns An array of FormattedRun for the LOA entry.
 */
function formatLoaEntryWithKeyMarker(citation: Citation): FormattedRun[] {
  const entry = citation.sourceType.startsWith("case.")
    ? formatLoaCaseEntry(citation)
    : formatBibliographyEntry(citation);

  if (citation.isKeyAuthority) {
    return [{ text: "* " }, ...entry];
  }

  return entry;
}

/**
 * Generates a Part A / Part B List of Authorities from all cited
 * authorities in the document.
 *
 * LOA-002: Splits authorities into:
 * - **Part A** — authorities from which passages are to be read
 *   (cases and legislation only)
 * - **Part B** — authorities to which reference may be made
 *   (cases, legislation, and optionally secondary sources)
 *
 * Each citation's `loaPart` field determines placement. Citations
 * without `loaPart` default to Part B.
 *
 * Source: FCA GPN-AUTH cl 2.1, HCA PD 2/2024 (JBA).
 *
 * @param citations - All citations referenced in the document.
 * @param includeSecondary - Whether to include secondary sources in Part B
 *   (default false, matching LOA-001 convention).
 * @returns A PartABLoaResult containing Part A sections, Part B sections,
 *   and any validation warnings.
 */
export function generatePartABListOfAuthorities(
  citations: Citation[],
  includeSecondary = false,
): PartABLoaResult {
  const warnings: LoaValidationWarning[] = [];

  // Split by loaPart (default to "B").
  const partACitations = citations.filter((c) => c.loaPart === "A");
  const partBCitations = citations.filter((c) => c.loaPart !== "A");

  // Part A: cases and legislation only (no secondary sources).
  const partAGroups = groupAndSortForLoa(partACitations, false);
  const partA = buildLoaSections(partAGroups.cases, partAGroups.legislation, []);

  // Part B: cases, legislation, and optionally secondary sources.
  const partBGroups = groupAndSortForLoa(partBCitations, includeSecondary);
  const partB = buildLoaSections(
    partBGroups.cases,
    partBGroups.legislation,
    partBGroups.secondary,
  );

  // LOA-002 validation: warn if Part A is empty.
  if (partA.length === 0) {
    warnings.push({
      level: "warning",
      code: "LOA_PART_A_EMPTY",
      message:
        "Part A of the List of Authorities is empty. At least one authority " +
        "should be marked for reading (loaPart: \"A\").",
    });
  }

  // LOA-002 validation: warn if total authorities exceed 30.
  const totalCount = deduplicateById(citations).length;
  if (totalCount > 30) {
    warnings.push({
      level: "warning",
      code: "LOA_AUTHORITY_COUNT_HIGH",
      message:
        `Total authorities (${totalCount}) exceed 30. Practitioner convention ` +
        "suggests limiting citations to those necessary to establish principles.",
    });
  }

  // LOA-004 validation: warn if more than 5 key authorities.
  const keyAuthorityCount = citations.filter((c) => c.isKeyAuthority).length;
  if (keyAuthorityCount > 5) {
    warnings.push({
      level: "warning",
      code: "LOA_KEY_AUTHORITY_LIMIT",
      message:
        `${keyAuthorityCount} key authorities marked (maximum 5). ` +
        "NSW Court of Appeal convention limits key authority markers to 5.",
    });
  }

  return { partA, partB, warnings };
}

// ─── LOA-003: HCA Joint Book of Authorities ─────────────────────────────────

/** Case details required for JBA title page and metadata. */
export interface JbaCaseDetails {
  caseName: string;
  fileNumber: string;
  hearingDate?: string; // ISO date string
  replyFilingDate?: string; // ISO date string — for 14-day JBA filing reminder
}

/** A single entry in the JBA index with volume and page range. */
export interface JbaIndexEntry {
  authorityLabel: string;
  volume: number;
  pageRange: string; // e.g. "1–45"
}

/** Result of JBA generation. */
export interface JbaResult {
  titlePage: BibliographySection;
  certificatePlaceholder: BibliographySection;
  index: JbaIndexEntry[];
  partA: BibliographySection[];
  partB: BibliographySection[];
  warnings: LoaValidationWarning[];
}

/**
 * Generates a High Court Joint Book of Authorities per HCA PD 2 of 2024.
 *
 * LOA-003: Extends LOA-002 (Part A / Part B) with HCA-specific metadata:
 * - Title page: "Joint Book of Authorities" + case name + HCA file number
 * - Certificate of senior practitioners (placeholder template)
 * - Full index listing all authorities with volume and page ranges
 *
 * The volume/page allocation is a simplified placeholder — actual page
 * ranges depend on the physical documents bundled into the JBA volumes.
 * The index entries provide the structural framework for the Word adapter
 * to populate with real page numbers.
 *
 * @param citations - All citations referenced in the document.
 * @param caseDetails - HCA case metadata for the title page.
 * @returns A JbaResult containing all JBA components and validation warnings.
 */
export function generateJBA(
  citations: Citation[],
  caseDetails: JbaCaseDetails,
): JbaResult {
  // Generate the Part A/B split via LOA-002.
  const loaResult = generatePartABListOfAuthorities(citations, false);
  const warnings = [...loaResult.warnings];

  // Title page section.
  const titlePage: BibliographySection = {
    heading: "Joint Book of Authorities",
    entries: [
      [
        { text: "Joint Book of Authorities", bold: true, size: 14 },
      ],
      [
        { text: caseDetails.caseName, italic: true },
      ],
      [
        { text: `HCA File No: ${caseDetails.fileNumber}` },
      ],
    ],
  };

  // Certificate placeholder section.
  const certificatePlaceholder: BibliographySection = {
    heading: "Certificate",
    entries: [
      [
        { text: "Certificate of Senior Practitioners", bold: true },
      ],
      [
        {
          text:
            "We, the undersigned senior practitioners for the parties, certify that " +
            "the authorities contained in this Joint Book of Authorities are those " +
            "to which the Court will be referred during the hearing of this matter.",
        },
      ],
      [
        { text: "[Name of Senior Practitioner for the Appellant]" },
      ],
      [
        { text: "[Name of Senior Practitioner for the Respondent]" },
      ],
    ],
  };

  // Build a flat index of all authorities across Part A and Part B.
  const allSections = [...loaResult.partA, ...loaResult.partB];
  const index: JbaIndexEntry[] = [];
  let currentVolume = 1;
  let pageCounter = 1;

  for (const section of allSections) {
    for (const entry of section.entries) {
      const label = entry.map((r) => r.text).join("");
      const estimatedPages = 10; // Placeholder — real page counts filled by Word adapter.
      const pageStart = pageCounter;
      const pageEnd = pageCounter + estimatedPages - 1;
      index.push({
        authorityLabel: label,
        volume: currentVolume,
        pageRange: `${pageStart}\u2013${pageEnd}`,
      });
      pageCounter = pageEnd + 1;

      // Volume break at ~500 pages (per HCA convention for multi-volume JBAs).
      if (pageCounter > currentVolume * 500) {
        currentVolume++;
      }
    }
  }

  // LOA-003 validation: warn if JBA not filed within 14 days of reply.
  if (caseDetails.replyFilingDate) {
    const replyDate = new Date(caseDetails.replyFilingDate);
    const deadlineDate = new Date(replyDate);
    deadlineDate.setDate(deadlineDate.getDate() + 14);
    const now = new Date();
    if (now > deadlineDate) {
      warnings.push({
        level: "warning",
        code: "JBA_FILING_OVERDUE",
        message:
          `JBA filing deadline was ${deadlineDate.toISOString().slice(0, 10)} ` +
          `(14 days after reply filing on ${caseDetails.replyFilingDate}). ` +
          "Check whether the JBA has been filed.",
      });
    }
  }

  return {
    titlePage,
    certificatePlaceholder,
    index,
    partA: loaResult.partA,
    partB: loaResult.partB,
    warnings,
  };
}

// ─── LOA-005: LOA Export Formats ─────────────────────────────────────────────

/**
 * LOA export target — determines how the generated LOA is delivered.
 *
 * - "insert-section" — inserts LOA as a new section in the current document
 *   (with a section break before it)
 * - "new-document" — creates a separate .docx document (existing default)
 * - "pdf" — placeholder for PDF export; Word's built-in Save As PDF handles
 *   the actual conversion. This option signals the UI to prompt the user to
 *   save as PDF after generation.
 */
export type LoaExportTarget = "insert-section" | "new-document" | "pdf";

/**
 * Options for LOA generation, combining format and export target.
 */
export interface LoaGenerationOptions {
  /** LOA type: "simple" uses LOA-001, "part-ab" uses LOA-002. */
  loaType: "simple" | "part-ab";
  /** Whether to include secondary sources (Part B only). */
  includeSecondary: boolean;
  /** Export target for the generated LOA. */
  exportTarget: LoaExportTarget;
}

/**
 * Unified LOA result combining all generation variants.
 *
 * LOA-005: Provides a single return type for the Word adapter layer to
 * consume, regardless of whether simple LOA, Part A/B, or JBA was generated.
 */
export interface LoaResult {
  /** Sections to render (simple LOA or combined Part A + Part B). */
  sections: BibliographySection[];
  /** Part A sections when Part A/B mode is used (undefined for simple LOA). */
  partA?: BibliographySection[];
  /** Part B sections when Part A/B mode is used (undefined for simple LOA). */
  partB?: BibliographySection[];
  /** Export target selected by the user. */
  exportTarget: LoaExportTarget;
  /** Validation warnings. */
  warnings: LoaValidationWarning[];
  /**
   * LOA-005: Note for PDF export — the engine does not generate PDFs
   * directly. Word's built-in "Save as PDF" produces a text-searchable
   * PDF suitable for eLodgment. This flag signals the UI layer.
   */
  pdfExportNote?: string;
}

/**
 * Generates a List of Authorities with the specified options.
 *
 * LOA-005: Unified entry point that handles simple LOA (LOA-001),
 * Part A/B LOA (LOA-002), and export format selection (LOA-005).
 *
 * @param citations - All citations referenced in the document.
 * @param options - Generation options (LOA type, secondary sources, export target).
 * @returns A LoaResult containing sections, warnings, and export metadata.
 */
export function generateLoaWithOptions(
  citations: Citation[],
  options: LoaGenerationOptions,
): LoaResult {
  const warnings: LoaValidationWarning[] = [];

  if (options.loaType === "simple") {
    const sections = generateListOfAuthorities(citations);
    const result: LoaResult = {
      sections,
      exportTarget: options.exportTarget,
      warnings,
    };
    if (options.exportTarget === "pdf") {
      result.pdfExportNote =
        "Use Word's built-in Save As PDF to produce a text-searchable PDF " +
        "suitable for eLodgment filing. Hyperlinks in LOA entries will be " +
        "preserved in the PDF output.";
    }
    return result;
  }

  // Part A/B mode.
  const abResult = generatePartABListOfAuthorities(
    citations,
    options.includeSecondary,
  );

  // Combine Part A and Part B into a single sections array for rendering,
  // with Part A/B headings prepended.
  const combined: BibliographySection[] = [];

  if (abResult.partA.length > 0) {
    combined.push({
      heading: "Part A \u2014 Authorities from which passages are to be read",
      entries: [],
    });
    combined.push(...abResult.partA);
  }

  if (abResult.partB.length > 0) {
    combined.push({
      heading: "Part B \u2014 Authorities to which reference may be made",
      entries: [],
    });
    combined.push(...abResult.partB);
  }

  const result: LoaResult = {
    sections: combined,
    partA: abResult.partA,
    partB: abResult.partB,
    exportTarget: options.exportTarget,
    warnings: [...abResult.warnings],
  };

  if (options.exportTarget === "pdf") {
    result.pdfExportNote =
      "Use Word's built-in Save As PDF to produce a text-searchable PDF " +
      "suitable for eLodgment filing. Hyperlinks in LOA entries will be " +
      "preserved in the PDF output.";
  }

  return result;
}

// ─── Bibliography Dispatcher (MULTI-010 + MULTI-014) ────────────────────────

/**
 * Generates a bibliography or List of Authorities structured according to
 * the active citation standard and writing mode.
 *
 * @param citations - All citations referenced in the document.
 * @param structure - The bibliography structure to use: "aglc", "oscola", or "nzlsg".
 * @param writingMode - Optional writing mode; "court" generates a List of Authorities.
 * @param loaType - Optional LoA format for court mode: "off" (no LoA), "simple"
 *   (flat list), or "part-ab" (Part A / Part B split). Defaults to "simple".
 * @returns An array of BibliographySection objects appropriate to the standard/mode.
 */
export function generateBibliographyForStandard(
  citations: Citation[],
  structure: CitationConfig["bibliographyStructure"],
  writingMode?: WritingMode,
  loaType?: LoaType,
): BibliographySection[] {
  // MULTI-014 + COURT-FIX-005: Court mode generates List of Authorities
  // controlled by the loaType toggle.
  if (writingMode === "court") {
    const effectiveLoaType = loaType ?? "simple";

    if (effectiveLoaType === "off") {
      return [];
    }

    if (effectiveLoaType === "part-ab") {
      const abResult = generatePartABListOfAuthorities(citations);
      const combined: BibliographySection[] = [];

      if (abResult.partA.length > 0) {
        combined.push({
          heading: "Part A \u2014 Authorities from which passages are to be read",
          entries: [],
        });
        combined.push(...abResult.partA);
      }

      if (abResult.partB.length > 0) {
        combined.push({
          heading: "Part B \u2014 Authorities to which reference may be made",
          entries: [],
        });
        combined.push(...abResult.partB);
      }

      return combined;
    }

    // Default: "simple" — flat list of authorities
    return generateListOfAuthorities(citations);
  }

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
