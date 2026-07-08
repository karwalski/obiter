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

  it("provides concise field guidance for the core source types", () => {
    // The agent's authoritative field schema is the plugin manifest params +
    // formatCitation, so field guidance is concise (not the verbatim BYOK
    // parse prompt) to leave budget for the behavioural rules — but it must
    // still cover the common types with their field names.
    expect(instructions).toContain("case.reported");
    expect(instructions).toContain("legislation.statute");
    expect(instructions).toContain("journal.article");
    expect(instructions).toContain("party1");
    expect(instructions).toContain("jurisdiction");
  });

  it("hardens invocation + honest-reporting behaviour (COPILOT-022)", () => {
    // Always call the tool; never claim an insertion that didn't happen;
    // report tool failures plainly instead of pretending success.
    expect(AGLC4_AUTHORITY_FRAMING).toContain("NEVER tell the user you are unable to insert");
    expect(AGLC4_AUTHORITY_FRAMING).toContain("NEVER claim you inserted");
    expect(AGLC4_AUTHORITY_FRAMING).toContain("was NOT inserted");
  });

  it("fits the declarative-agent schema's 8,000-character instructions cap", () => {
    expect(instructions.length).toBeLessThanOrEqual(MAX_AGENT_INSTRUCTIONS_LENGTH);
  });

  it("keeps Obiter's engine the authority for AGLC4 formatting", () => {
    expect(instructions).toContain(AGLC4_AUTHORITY_FRAMING);
    expect(AGLC4_AUTHORITY_FRAMING).toContain("insertCitation");
    // Obiter's engine formats; the agent only supplies fields.
    expect(AGLC4_AUTHORITY_FRAMING).toContain("never format yourself");
  });
});
