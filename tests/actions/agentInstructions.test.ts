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
} from "../../src/actions/agentInstructions";
import { CLASSIFY_SOURCE_SYSTEM_PROMPT } from "../../src/llm/classifySource";
import { PARSE_CITATION_SYSTEM_PROMPT } from "../../src/llm/parseCitation";

describe("buildAgentInstructions", () => {
  const instructions = buildAgentInstructions();

  it("embeds the classify prompt verbatim (no drift from the BYOK path)", () => {
    expect(instructions).toContain(CLASSIFY_SOURCE_SYSTEM_PROMPT);
  });

  it("embeds the parse prompt verbatim (no drift from the BYOK path)", () => {
    expect(instructions).toContain(PARSE_CITATION_SYSTEM_PROMPT);
  });

  it("keeps Obiter's engine the authority for AGLC4 formatting", () => {
    expect(instructions).toContain(AGLC4_AUTHORITY_FRAMING);
    expect(AGLC4_AUTHORITY_FRAMING).toContain("insertCitation");
    // Direct-insert review model (COPILOT-006), not pane-driving.
    expect(AGLC4_AUTHORITY_FRAMING.toLowerCase()).toContain("track changes");
  });
});
