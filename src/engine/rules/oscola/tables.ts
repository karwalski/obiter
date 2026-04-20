/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * OSCOLA 5 §1.4, §1.6.2 — Table of Cases and Table of Legislation
 * (OSC-012 + OSC-013)
 *
 * Pure functions for generating OSCOLA-style Tables of Cases and
 * Tables of Legislation from citation data.
 */

import { FormattedRun } from "../../../types/formattedRun";

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * A section within a bibliography table (e.g. "UK Cases", "EU Legislation").
 */
export interface BibliographySection {
  heading: string;
  entries: FormattedRun[][];
}

/**
 * Input data for a case entry in the Table of Cases.
 */
export interface CaseEntry {
  caseName: string;
  citation: string;
  parallelCitations?: string[];
  jurisdiction: "UK" | "EU" | "ECtHR" | "International" | "Foreign" | string;
}

/**
 * Input data for a legislation entry in the Table of Legislation.
 */
export interface LegislationEntry {
  title: string;
  year?: number;
  additionalInfo?: string;
  category: "primary" | "secondary" | "eu" | "treaty";
}

// ─── Table of Cases (OSC-012) ────────────────────────────────────────────────

/**
 * Generates a Table of Cases per OSCOLA 5 §1.4 and §1.6.2.
 *
 * Rules:
 * - All cited cases listed alphabetically by first party name
 * - Case names NOT italic in the Table (unlike footnotes)
 * - "Re X" sorted under R
 * - "Ex p Y" sorted under E
 * - Parallel citations included
 * - Sub-divided by jurisdiction: UK, EU, ECtHR, International, Foreign
 *
 * @param cases - Array of case entries to include in the table.
 * @returns Array of BibliographySection objects, one per jurisdiction.
 */
export function generateTableOfCases(
  cases: CaseEntry[]
): BibliographySection[] {
  const jurisdictionOrder = [
    "UK",
    "EU",
    "ECtHR",
    "International",
    "Foreign",
  ];

  // Group cases by jurisdiction
  const grouped = new Map<string, CaseEntry[]>();
  for (const entry of cases) {
    const jurisdiction = jurisdictionOrder.includes(entry.jurisdiction)
      ? entry.jurisdiction
      : "Foreign";
    const existing = grouped.get(jurisdiction) ?? [];
    existing.push(entry);
    grouped.set(jurisdiction, existing);
  }

  const sections: BibliographySection[] = [];

  for (const jurisdiction of jurisdictionOrder) {
    const entries = grouped.get(jurisdiction);
    if (!entries || entries.length === 0) {
      continue;
    }

    // Sort alphabetically by sort key
    const sorted = [...entries].sort((a, b) => {
      const keyA = getCaseSortKey(a.caseName);
      const keyB = getCaseSortKey(b.caseName);
      return keyA.localeCompare(keyB);
    });

    // Format entries — case names NOT italic in Table of Cases
    const formattedEntries: FormattedRun[][] = sorted.map((entry) => {
      const runs: FormattedRun[] = [];

      // Case name — roman (not italic) per OSCOLA §1.6.2
      runs.push({ text: entry.caseName });

      // Primary citation
      runs.push({ text: ` ${entry.citation}` });

      // Parallel citations
      if (entry.parallelCitations && entry.parallelCitations.length > 0) {
        runs.push({ text: `, ${entry.parallelCitations.join(", ")}` });
      }

      return runs;
    });

    sections.push({
      heading: `${jurisdiction} Cases`,
      entries: formattedEntries,
    });
  }

  return sections;
}

/**
 * Returns the sort key for a case name per OSCOLA conventions.
 * - "Re X" sorts under R (the full name is the key)
 * - "Ex p Y" sorts under E (the full name is the key)
 * - Standard cases sort by first party name
 */
function getCaseSortKey(caseName: string): string {
  // Normalise to lowercase for sorting
  return caseName.toLowerCase().trim();
}

// ─── Table of Legislation (OSC-013) ─────────────────────────────────────────

/**
 * Generates a Table of Legislation per OSCOLA 5 §1.4.
 *
 * Rules:
 * - Primary legislation listed alphabetically by short title
 * - Secondary legislation listed separately
 * - EU legislation listed separately
 * - International treaties listed separately
 * - No italic (legislation is roman in OSCOLA)
 *
 * @param legislation - Array of legislation entries to include.
 * @returns Array of BibliographySection objects, one per category.
 */
export function generateTableOfLegislation(
  legislation: LegislationEntry[]
): BibliographySection[] {
  const categoryConfig: Array<{
    key: LegislationEntry["category"];
    heading: string;
  }> = [
    { key: "primary", heading: "Primary Legislation" },
    { key: "secondary", heading: "Secondary Legislation" },
    { key: "eu", heading: "EU Legislation" },
    { key: "treaty", heading: "Treaties and International Instruments" },
  ];

  const sections: BibliographySection[] = [];

  for (const { key, heading } of categoryConfig) {
    const entries = legislation.filter((l) => l.category === key);
    if (entries.length === 0) {
      continue;
    }

    // Sort alphabetically by title
    const sorted = [...entries].sort((a, b) =>
      a.title.localeCompare(b.title)
    );

    // Format entries — all roman (not italic) per OSCOLA
    const formattedEntries: FormattedRun[][] = sorted.map((entry) => {
      const runs: FormattedRun[] = [];

      // Title — roman
      runs.push({ text: entry.title });

      // Year
      if (entry.year !== undefined) {
        runs.push({ text: ` ${entry.year}` });
      }

      // Additional info (e.g. SI number, OJ reference)
      if (entry.additionalInfo) {
        runs.push({ text: `, ${entry.additionalInfo}` });
      }

      return runs;
    });

    sections.push({
      heading,
      entries: formattedEntries,
    });
  }

  return sections;
}
