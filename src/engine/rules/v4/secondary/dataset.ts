/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { FormattedRun } from "../../../../types/formattedRun";

// ─── Data Interface ──────────────────────────────────────────────────────────

/**
 * A5-EXP-2 (experimental, pending AGLC5): published-dataset element set.
 *
 * AGLC4 has no dataset form. The element list follows peer-standard precedent
 * (APA §10.10 / Chicago 18 / AMS) — see docs/modern-sources-proposal.md §3.1.
 * Badged "Experimental · pending AGLC5 (not an official AGLC4 form)".
 */
export interface DatasetData {
  /** Creator / author of the dataset (person or organisation). */
  creator: string;
  /** Dataset title (rendered italic). */
  title: string;
  /** Repository or publisher hosting the dataset. */
  repository: string;
  /** Year of publication/release. */
  year: string;
  /** Dataset version, where the source states one. */
  version?: string;
  /** DOI, preferred as the stable identifier when present. */
  doi?: string;
  /** Persistent identifier / URL, used when no DOI is available. */
  persistentId?: string;
  /** Access date, used as a fallback locator when no DOI is available. */
  accessDate?: string;
}

// ─── DATASET-001 (A5-EXP-2) ──────────────────────────────────────────────────

/**
 * Formats a published-dataset citation on Obiter's interim, experimental basis
 * (pending AGLC5). AGLC4 has no dataset rule; the structure follows APA §10.10 /
 * Chicago 18 / AMS precedent (docs/modern-sources-proposal.md §3.1).
 *
 * Format: `Creator, *Title* (Dataset, Version, Repository, Year) <doi/id>`.
 * A DOI is preferred as the trailing identifier; where none exists the
 * persistent identifier is used, falling back to an "(accessed …)" note.
 *
 * Example:
 *   Australian Bureau of Statistics, *Census of Population and Housing*
 *   (Dataset, 2021) <https://doi.org/10.xxxx/xxxx>
 *
 * @param data - Dataset metadata.
 * @returns FormattedRun[] representing the formatted citation.
 */
export function formatDataset(data: DatasetData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  const creator = data.creator?.trim();
  if (creator) {
    runs.push({ text: creator });
    runs.push({ text: ", " });
  }

  if (data.title?.trim()) {
    runs.push({ text: data.title.trim(), italic: true });
  }

  // Parenthetical: (Dataset, Version, Repository, Year)
  const parenParts = ["Dataset", data.version, data.repository, data.year]
    .map((p) => (p ?? "").trim())
    .filter(Boolean);
  if (parenParts.length > 0) {
    runs.push({ text: ` (${parenParts.join(", ")})` });
  }

  // Trailing identifier: DOI preferred, then persistent id, then access date.
  const doi = (data.doi ?? "").trim();
  const persistentId = (data.persistentId ?? "").trim();
  const accessDate = (data.accessDate ?? "").trim();
  if (doi) {
    runs.push({ text: ` <${doi}>` });
  } else if (persistentId) {
    runs.push({ text: ` <${persistentId}>` });
  } else if (accessDate) {
    runs.push({ text: ` (accessed ${accessDate})` });
  }

  return runs;
}
