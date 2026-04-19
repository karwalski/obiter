/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { FormattedRun } from "../../../../types/formattedRun";

// ─── Data Interface ──────────────────────────────────────────────────────────

export interface GenaiOutputData {
  platform: string;
  model: string;
  prompt?: string;
  outputDate: string;
  url?: string;
}

// ─── GENAI-001 ───────────────────────────────────────────────────────────────

/**
 * Formats a citation for AI-generated content per MULR interim guidance.
 *
 * GenAI output is treated as Written Correspondence under AGLC4 Rule 7.12.
 * The platform/model combination acts as the "sender" and the user is
 * the "recipient".
 *
 * Format: Correspondence from [Platform/Model] to the author, [Date]
 * If a URL is provided, it is appended in angle brackets.
 *
 * Example:
 *   Correspondence from ChatGPT (OpenAI, GPT-4) to the author, 15 March 2025
 *
 * **Note:** This follows the Melbourne University Law Review interim guidance
 * for citing generative AI output. The format will be updated when AGLC5
 * provides official guidance on AI-generated content.
 *
 * @param data - GenAI output metadata.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.12 (applied via MULR interim guidance for GenAI output).
 */
export function formatGenaiOutput(data: GenaiOutputData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  runs.push({
    text:
      "Correspondence from " +
      data.platform +
      " (" +
      data.model +
      ") to the author, " +
      data.outputDate,
  });

  if (data.url) {
    runs.push({ text: " <" + data.url + ">" });
  }

  return runs;
}
