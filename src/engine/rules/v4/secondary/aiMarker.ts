/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * A5-EXP-5 (experimental, pending AGLC5): AI-layer marker preset.
 *
 * Produces a bracketed AI-generation tag to layer over a NORMALLY-cited primary
 * source via the existing commentary field (Citation.commentaryAfter /
 * commentaryBefore) — NO schema change is made. The marker is analogous to the
 * rule 26.1 translator marker `[tr Author]`, applied to machine generation.
 *
 * Basis: docs/modern-sources-proposal.md §2.2. The AI layer is NOT
 * authoritative, so the UI must flag it prominently and it is excluded from any
 * AGLC4-conformance claim. Badged "Experimental · pending AGLC5 (not an official
 * AGLC4 form)".
 *
 * Worked example (over a cited primary source):
 *   Evidence Act 1995 (NSW) [AI-generated summary, ChatGPT (GPT-5), 7 July 2026]
 */

export interface AiMarkerInput {
  /** Kind of AI layer (eg 'summary', 'plain-language summary', 'translation'). */
  kind?: string;
  /** Tool / platform name (eg ChatGPT, Claude). */
  tool: string;
  /** Model name and/or version (eg GPT-5, Claude Opus 4.8). Optional. */
  model?: string;
  /** Generation date (rendered as entered). */
  date?: string;
}

/**
 * Builds the bracketed AI-layer marker string, eg
 * `[AI-generated summary, ChatGPT (GPT-5), 7 July 2026]`.
 *
 * The result is intended to be placed in a citation's `commentaryAfter` field
 * so it renders immediately after the normally-formatted primary source. No new
 * schema field is introduced.
 *
 * @param input - The AI-layer descriptor.
 * @returns The bracketed marker string.
 */
export function buildAiLayerMarker(input: AiMarkerInput): string {
  const kind = (input.kind ?? "").trim() || "summary";
  const tool = (input.tool ?? "").trim();
  const model = (input.model ?? "").trim();
  const date = (input.date ?? "").trim();

  const toolPart = model ? `${tool} (${model})` : tool;
  const parts = [`AI-generated ${kind}`, toolPart, date].map((p) => p.trim()).filter(Boolean);

  return `[${parts.join(", ")}]`;
}
