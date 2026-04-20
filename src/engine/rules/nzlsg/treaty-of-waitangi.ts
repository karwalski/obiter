/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * NZLSG-009: Treaty of Waitangi Citation
 *
 * NZLSG Rule 10.1 (NZ-adapted): Dedicated formatting for the
 * Treaty of Waitangi and Te Tiriti o Waitangi, including article
 * and preamble references.
 */

import { FormattedRun } from "../../../types/formattedRun";

// ─── Types ──────────────────────────────────────────────────────────────────

export type TreatyLanguage = "english" | "maori";

export interface TreatyOfWaitangiData {
  /** Which language version of the Treaty is being cited. */
  language: TreatyLanguage;
  /** Article number (e.g. 1, 2, 3). */
  article?: number;
  /** Whether referring to the preamble rather than an article. */
  preamble?: boolean;
}

// ─── NZLSG-009: Treaty of Waitangi ─────────────────────────────────────────

/**
 * Formats a Treaty of Waitangi / Te Tiriti o Waitangi citation per NZLSG Rule 10.1.
 *
 * NZLSG Rule 10.1: English text cited as 'Treaty of Waitangi art [number]'.
 * Te reo Maori text cited as 'Te Tiriti o Waitangi art [number]'.
 * Preamble references are also supported.
 *
 * @example
 *   // Treaty of Waitangi art 2
 *   formatTreatyOfWaitangi({ language: "english", article: 2 })
 *
 * @example
 *   // Te Tiriti o Waitangi art 3
 *   formatTreatyOfWaitangi({ language: "maori", article: 3 })
 *
 * @example
 *   // Treaty of Waitangi, preamble
 *   formatTreatyOfWaitangi({ language: "english", preamble: true })
 */
export function formatTreatyOfWaitangi(
  data: TreatyOfWaitangiData,
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Treaty name based on language version
  const treatyName =
    data.language === "english"
      ? "Treaty of Waitangi"
      : "Te Tiriti o Waitangi";

  runs.push({ text: treatyName });

  // Article or preamble reference
  if (data.preamble) {
    runs.push({ text: ", preamble" });
  } else if (data.article !== undefined) {
    runs.push({ text: ` art ${data.article}` });
  }

  return runs;
}
