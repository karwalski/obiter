/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * OSCOLA 5 §3.7.13 — Generative AI Citation (OSC-011, A5-EXP-13)
 *
 * Pure formatting function for generative AI output per OSCOLA 5's
 * rule for citing AI-generated content.
 */

import { FormattedRun } from "../../../types/formattedRun";
import { formatOutputDate } from "../v4/secondary/genai";

// ─── GenAI Citation (OSCOLA 5 §3.7.13) ──────────────────────────────────────

/**
 * Formats a generative AI output citation per OSCOLA 5 r 3.7.13 (pp 43–44).
 *
 * The rule makes the AI the author; any instructions given follow in
 * inverted commas after "response to"; then the developing organisation and
 * the generation date in brackets. The rule has no URL and no model-version
 * element, so neither is rendered (both stay on the stored record).
 *
 * Format:
 *   AI, response to 'Prompt', Developer (Date)
 *
 * With no prompt (the rule's prompt element is conditional; the remaining
 * form is a judgement call recorded in DECISION-040):
 *   AI, Developer (Date)
 *
 * @example
 *   ChatGPT, response to 'Explain how artificial intelligence works', OpenAI
 *   (16 July 2023)
 */
export function formatGenAiCitation(data: {
  toolName: string;
  provider?: string;
  prompt?: string;
  dateGenerated: string;
}): FormattedRun[] {
  let text = data.toolName.trim();

  const prompt = (data.prompt ?? "").trim();
  if (prompt) {
    // OSCOLA uses single quotation marks (§1.5)
    text += `, response to ‘${prompt}’`;
  }

  const provider = (data.provider ?? "").trim();
  if (provider) {
    text += `, ${provider}`;
  }

  // Date in brackets, no preceding comma; ISO form-input dates are converted.
  const date = formatOutputDate(data.dateGenerated ?? "");
  if (date) {
    text += ` (${date})`;
  }

  return [{ text }];
}
