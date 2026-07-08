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
4. Build the data object from the field mappings below; for source types not listed, use the same camelCase field conventions and verify with formatCitation before inserting.

Review model: insertion is direct — Obiter inserts the native footnote and returns a structured result (status, citationId, mode). The user reviews via Copilot's confirmation and Word's track changes; do not attempt to open or prefill Obiter's task-pane form.`;

/**
 * Hard cap on declarative-agent instructions imposed by Microsoft's
 * declarative-agent schema (v1.0+): "MUST be 8,000 characters or less".
 * `npm run export-skill` fails the build when the composed block exceeds it.
 */
export const MAX_AGENT_INSTRUCTIONS_LENGTH = 8000;

/**
 * The agent variant of the classify guidance, derived mechanically from the
 * BYOK CLASSIFY_SOURCE_SYSTEM_PROMPT (single source of truth — the shared
 * text, including the full source-type value list, is never re-worded). The
 * BYOK-only JSON response-shape block is dropped: the agent calls the
 * insertCitation / formatCitation actions instead of answering with JSON.
 * Falls back to the full prompt if the marker ever moves.
 */
function buildAgentClassifyGuidance(): string {
  const src = CLASSIFY_SOURCE_SYSTEM_PROMPT;
  const jsonShapeStart = src.indexOf("Respond with ONLY valid JSON");
  if (jsonShapeStart === -1) {
    return src;
  }
  return src.slice(0, jsonShapeStart).trimEnd();
}

/**
 * The agent variant of the parse guidance, derived mechanically from the BYOK
 * PARSE_CITATION_SYSTEM_PROMPT (single source of truth — the shared text is
 * never re-worded). Two BYOK-only blocks are dropped to fit the schema's
 * 8,000-character instructions cap:
 *  - the source-type value list (already embedded verbatim via the
 *    classification guidance, which the agent reads first), and
 *  - the JSON response-shape block (the agent calls the insertCitation /
 *    formatCitation actions instead of answering with JSON).
 * Falls back to the full prompt if the markers ever move.
 */
function buildAgentParseGuidance(): string {
  const src = PARSE_CITATION_SYSTEM_PROMPT;
  const typeListStart = src.indexOf("Source types (use these exact string values):");
  const mappingStart = src.indexOf("FIELD MAPPING BY SOURCE TYPE:");
  const jsonShapeStart = src.indexOf("Respond with ONLY valid JSON");
  if (typeListStart === -1 || mappingStart === -1 || jsonShapeStart === -1) {
    return src;
  }
  return (
    src.slice(0, typeListStart).trimEnd() +
    "\n\n(Use exactly the source type values listed in the classification guidance above.)\n\n" +
    src.slice(mappingStart, jsonShapeStart).trimEnd() +
    "\n\nDo not answer with formatted citation text — call insertCitation or formatCitation with { sourceType, data, shortTitle? }."
  );
}

/**
 * Build the full Copilot agent instruction block. Order: authority framing →
 * source-type classification guidance → citation-parsing/field-mapping guidance.
 * The classification prompt is embedded verbatim; the parse prompt is embedded
 * via {@link buildAgentParseGuidance} (verbatim text, two BYOK-only blocks
 * dropped) so the Copilot path stays exactly as AGLC4-accurate as BYOK while
 * fitting the declarative-agent schema's 8,000-character cap.
 */
export function buildAgentInstructions(): string {
  return [
    AGLC4_AUTHORITY_FRAMING,
    "## Classifying a source type\n\n" + buildAgentClassifyGuidance(),
    "## Parsing a formatted citation into fields\n\n" + buildAgentParseGuidance(),
  ].join("\n\n---\n\n");
}
