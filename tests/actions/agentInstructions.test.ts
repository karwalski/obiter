/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * COPILOT-007 — the Copilot agent instructions embed the AGLC4-authority framing
 * and reuse the BYOK classify/parse prompts verbatim, so the no-BYOK Copilot path
 * stays exactly as AGLC4-accurate as the pane path (single source of truth).
 */

import {
  buildAgentInstructions,
  AGLC4_AUTHORITY_FRAMING,
  MAX_AGENT_INSTRUCTIONS_LENGTH,
} from "../../src/actions/agentInstructions";
import { CLASSIFY_SOURCE_SYSTEM_PROMPT } from "../../src/llm/classifySource";
import { PARSE_CITATION_SYSTEM_PROMPT } from "../../src/llm/parseCitation";

describe("buildAgentInstructions", () => {
  const instructions = buildAgentInstructions();

  it("embeds the classify prompt's shared text verbatim (no drift from the BYOK path)", () => {
    // The agent variant drops only the BYOK JSON response-shape block; the
    // guidance and the full source-type value list must be verbatim.
    const head = CLASSIFY_SOURCE_SYSTEM_PROMPT.slice(
      0,
      CLASSIFY_SOURCE_SYSTEM_PROMPT.indexOf("Respond with ONLY valid JSON")
    ).trimEnd();
    expect(head.length).toBeGreaterThan(0);
    expect(head).toContain('"case.reported"');
    expect(instructions).toContain(head);
  });

  it("embeds the parse prompt's shared text verbatim (no drift from the BYOK path)", () => {
    // The agent variant drops two BYOK-only blocks (the source-type value list,
    // which the classify prompt already embeds, and the JSON response shape,
    // which action-calling agents don't use) to fit the schema's 8,000-char
    // cap — but the text it keeps must be verbatim from the BYOK prompt.
    const head = PARSE_CITATION_SYSTEM_PROMPT.slice(
      0,
      PARSE_CITATION_SYSTEM_PROMPT.indexOf("Source types (use these exact string values):")
    ).trimEnd();
    const mappings = PARSE_CITATION_SYSTEM_PROMPT.slice(
      PARSE_CITATION_SYSTEM_PROMPT.indexOf("FIELD MAPPING BY SOURCE TYPE:"),
      PARSE_CITATION_SYSTEM_PROMPT.indexOf("Respond with ONLY valid JSON")
    ).trimEnd();
    expect(head.length).toBeGreaterThan(0);
    expect(mappings.length).toBeGreaterThan(0);
    expect(instructions).toContain(head);
    expect(instructions).toContain(mappings);
  });

  it("fits the declarative-agent schema's 8,000-character instructions cap", () => {
    expect(instructions.length).toBeLessThanOrEqual(MAX_AGENT_INSTRUCTIONS_LENGTH);
  });

  it("keeps Obiter's engine the authority for AGLC4 formatting", () => {
    expect(instructions).toContain(AGLC4_AUTHORITY_FRAMING);
    expect(AGLC4_AUTHORITY_FRAMING).toContain("insertCitation");
    // Direct-insert review model (COPILOT-006), not pane-driving.
    expect(AGLC4_AUTHORITY_FRAMING.toLowerCase()).toContain("track changes");
  });
});
