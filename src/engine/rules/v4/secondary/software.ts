/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { FormattedRun } from "../../../../types/formattedRun";

// ─── Data Interface ──────────────────────────────────────────────────────────

/**
 * A5-EXP-3 (experimental, pending AGLC5): software / code-repository element
 * set. AGLC4 has no software form; the structure is proposed for AGLC5 in
 * docs/modern-sources-proposal.md §3.2. Badged "Experimental · pending AGLC5
 * (not an official AGLC4 form)".
 */
export interface SoftwareData {
  /** Author or developing organisation. */
  author: string;
  /** Software / project title (rendered italic). */
  title: string;
  /** Year of the release/commit. */
  year: string;
  /** Version tag or commit hash. */
  versionOrCommit?: string;
  /** Designation: "Software" or "Source code". Defaults to "Software". */
  designation?: string;
  /** Host (eg GitHub, GitLab, Zenodo). */
  host?: string;
  /** URL of the repository / release. */
  url?: string;
}

// ─── SOFTWARE-001 (A5-EXP-3) ─────────────────────────────────────────────────

/**
 * Formats a software / code-repository citation on Obiter's interim,
 * experimental basis (pending AGLC5). AGLC4 has no software rule; the structure
 * follows docs/modern-sources-proposal.md §3.2.
 *
 * Format: `Author, *Title* (Designation, VersionOrCommit, Host, Year) <URL>`.
 *
 * Example:
 *   Matthew Watt, *Obiter* (Software, v1.16.0, GitHub, 2026) <https://github.com/…>
 *
 * @param data - Software metadata.
 * @returns FormattedRun[] representing the formatted citation.
 */
export function formatSoftware(data: SoftwareData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  const author = data.author?.trim();
  if (author) {
    runs.push({ text: author });
    runs.push({ text: ", " });
  }

  if (data.title?.trim()) {
    runs.push({ text: data.title.trim(), italic: true });
  }

  // Parenthetical: (Designation, VersionOrCommit, Host, Year)
  const designation = (data.designation ?? "").trim() || "Software";
  const parenParts = [designation, data.versionOrCommit, data.host, data.year]
    .map((p) => (p ?? "").trim())
    .filter(Boolean);
  if (parenParts.length > 0) {
    runs.push({ text: ` (${parenParts.join(", ")})` });
  }

  const url = (data.url ?? "").trim();
  if (url) {
    runs.push({ text: ` <${url}>` });
  }

  return runs;
}
