/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * OSCOLA 5 §3.7.13 — Generative AI Citation (OSC-011)
 *
 * Pure formatting function for generative AI output per OSCOLA 5's
 * new rule for citing AI-generated content.
 */

import { FormattedRun } from "../../../types/formattedRun";

// ─── GenAI Citation (OSCOLA 5 §3.7.13) ──────────────────────────────────────

/**
 * Formats a generative AI output citation per OSCOLA 5 §3.7.13.
 *
 * OSCOLA 5 introduced a dedicated rule for citing AI-generated content.
 * The citation includes the AI tool name, the prompt (in single quotes per
 * OSCOLA quotation style), the date of generation, and optionally a URL.
 *
 * Format:
 *   AI Tool Name, 'Prompt text' (Date generated) <URL>
 *
 * @example
 *   ChatGPT (OpenAI), 'Summarise the rule in Donoghue v Stevenson'
 *   (response generated 15 March 2026)
 *   <https://chat.openai.com/share/abc123>
 *
 * @example
 *   Claude (Anthropic), 'What are the elements of negligence in
 *   English law?' (response generated 10 January 2026)
 */
export function formatGenAiCitation(data: {
  toolName: string;
  provider?: string;
  prompt: string;
  dateGenerated: string;
  url?: string;
  version?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // AI tool name (with optional provider)
  let toolText = data.toolName;
  if (data.provider) {
    toolText += ` (${data.provider})`;
  }
  runs.push({ text: toolText });

  // Version if specified
  if (data.version) {
    runs.push({ text: ` (version ${data.version})` });
  }

  // Prompt in single quotes (OSCOLA uses single quotation marks)
  runs.push({ text: `, \u2018${data.prompt}\u2019` });

  // Date of generation
  runs.push({ text: ` (response generated ${data.dateGenerated})` });

  // URL if available
  if (data.url) {
    runs.push({ text: ` <${data.url}>` });
  }

  return runs;
}
