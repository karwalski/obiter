/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Copilot agent instructions (COPILOT-007). Composes the natural-language
 * instruction block a Microsoft 365 Copilot agent is given when Obiter is
 * registered as a skill. On the Copilot path there is NO BYOK: Copilot's own LLM
 * does the pure parse/classify text transformations, then calls Obiter's
 * structured actions (insertCitation / formatCitation) so the deterministic
 * AGLC4 engine — not the LLM — remains the authority for formatting.
 *
 * The classify/parse guidance is reused verbatim from the BYOK prompts
 * (CLASSIFY_SOURCE_SYSTEM_PROMPT / PARSE_CITATION_SYSTEM_PROMPT) so there is a
 * single source of truth and the two paths cannot drift apart.
 */

import { CLASSIFY_SOURCE_SYSTEM_PROMPT } from "../llm/classifySource";
import { PARSE_CITATION_SYSTEM_PROMPT } from "../llm/parseCitation";

/**
 * The framing that keeps Obiter essential: Copilot supplies structured fields;
 * Obiter's engine owns AGLC4 correctness. Kept separate so tests can assert it
 * is present in the composed instructions.
 */
export const AGLC4_AUTHORITY_FRAMING = `You are helping a user cite legal sources in a Microsoft Word document using Obiter, an AGLC4 citation engine.

Obiter's engine is the sole authority for AGLC4 formatting. Do NOT format citations yourself and do NOT write footnote text. Your job is to extract the structured fields of a source and hand them to Obiter, which formats them per AGLC4 and inserts a native Word footnote. This keeps every citation traceable to a numbered AGLC4 rule.

When the user describes or pastes a source:
1. Determine the AGLC4 source type and extract its structured fields (guidance below).
2. Call the insertCitation action with a CitationInsertRequest ({ sourceType, data, shortTitle? }). Obiter formats and inserts the footnote.
3. To preview the formatted text without inserting, call formatCitation instead.
4. Before building the data object, read the machine-readable per-source-type field schema (required/optional fields, rule numbers, templates) from the skill's citation contract (contractVersion + sourceTypeSchema).

Review model: insertion is direct — Obiter inserts the native footnote and returns a structured result (status, citationId, mode). The user reviews via Copilot's confirmation and Word's track changes; do not attempt to open or prefill Obiter's task-pane form.`;

/**
 * Build the full Copilot agent instruction block. Order: authority framing →
 * source-type classification guidance → citation-parsing/field-mapping guidance.
 * The two prompt constants are embedded verbatim (no re-wording) so the Copilot
 * path stays exactly as AGLC4-accurate as the BYOK path.
 */
export function buildAgentInstructions(): string {
  return [
    AGLC4_AUTHORITY_FRAMING,
    "## Classifying a source type\n\n" + CLASSIFY_SOURCE_SYSTEM_PROMPT,
    "## Parsing a formatted citation into fields\n\n" + PARSE_CITATION_SYSTEM_PROMPT,
  ].join("\n\n---\n\n");
}
