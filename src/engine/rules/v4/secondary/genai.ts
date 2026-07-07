/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { FormattedRun } from "../../../../types/formattedRun";
import { formatDate } from "../general/dates";

// ─── Data Interface ──────────────────────────────────────────────────────────

export interface GenaiOutputData {
  platform: string;
  model: string;
  prompt?: string;
  outputDate: string;
  url?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Renders the output date AGLC4-style per Rule 1.11.1.
 *
 * AGLC4 Rule 1.11.1: "Dates should appear in the format 'Day Month Year'
 * (eg '14 July 2018')."
 *
 * The insert form's date input stores an ISO `yyyy-mm-dd` string, which
 * must never surface verbatim in a citation (WEB-008a). Already-formatted
 * dates (eg '15 March 2025' from older stored data or the AI parser) pass
 * through unchanged; malformed values are returned as-is rather than
 * guessed at.
 */
function formatOutputDate(raw: string): string {
  const trimmed = raw.trim();
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (!match) {
    return trimmed;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return trimmed;
  }
  return formatDate({ day, month, year });
}

// ─── GENAI-001 ───────────────────────────────────────────────────────────────

/**
 * Formats a citation for AI-generated content per MULR interim guidance.
 *
 * GenAI output is treated as Written Correspondence under AGLC4 Rule 7.12:
 * "«Type of Correspondence» from «Author» to «Recipient», «Full Date»,
 * «Pinpoint»". The platform/model combination acts as the "sender" and the
 * user is the "recipient".
 *
 * Format: Correspondence from [Platform] ([Model]) to the author, [Date]
 * - The model parenthetical is emitted only when a model is recorded — an
 *   empty '()' must never render (WEB-008b).
 * - The date renders per Rule 1.11.1 ('7 July 2026'); ISO form-input dates
 *   are converted, already-formatted dates pass through (WEB-008a).
 * - If a URL is provided, it is appended in angle brackets.
 *
 * Example:
 *   Correspondence from ChatGPT (GPT-4) to the author, 15 March 2025
 *
 * **Note:** This follows the Melbourne University Law Review interim guidance
 * for citing generative AI output. The format will be updated when AGLC5
 * provides official guidance on AI-generated content.
 *
 * @param data - GenAI output metadata.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.12 (applied via MULR interim guidance for GenAI output);
 *   Rule 1.11.1 (date format).
 */
export function formatGenaiOutput(data: GenaiOutputData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  let text = `Correspondence from ${data.platform}`;

  // Model parenthetical — only where a model is recorded (WEB-008b)
  if (data.model && data.model.trim()) {
    text += ` (${data.model.trim()})`;
  }

  text += " to the author";

  // Full date per Rule 1.11.1 — omitted entirely when absent
  const date = formatOutputDate(data.outputDate ?? "");
  if (date) {
    text += `, ${date}`;
  }

  runs.push({ text });

  if (data.url) {
    runs.push({ text: " <" + data.url + ">" });
  }

  return runs;
}
