/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * COPILOT-011 — the generated unified Microsoft 365 manifest declares both the
 * add-in extension (shared runtime + one action per catalogued op) and the
 * Copilot agent, and the declarative agent embeds the shared instructions.
 */

import {
  buildUnifiedManifest,
  buildDeclarativeAgent,
  SKILL_HOST,
} from "../../src/actions/unifiedManifest";
import { OBITER_ACTIONS } from "../../src/actions/actionCatalogue";
import { buildAgentInstructions } from "../../src/actions/agentInstructions";

describe("buildUnifiedManifest", () => {
  const manifest = buildUnifiedManifest();

  it("is a v1.17+ manifest with both extensions and copilotAgents", () => {
    expect(manifest.manifestVersion).toBe("1.19");
    expect(Array.isArray(manifest.extensions)).toBe(true);
    expect(manifest.copilotAgents.declarativeAgents.length).toBeGreaterThan(0);
  });

  it("declares one shared runtime action per catalogued action", () => {
    const ext = manifest.extensions[0] as {
      runtimes: Array<{ lifetime: string; actions: Array<{ id: string }> }>;
    };
    const runtime = ext.runtimes[0];
    expect(runtime.lifetime).toBe("long");
    const ids = runtime.actions.map((a) => a.id).sort();
    expect(ids).toEqual(OBITER_ACTIONS.map((a) => a.name).sort());
  });

  it("points the runtime at the shared runtime page on the given host", () => {
    const custom = buildUnifiedManifest("https://example.test/app");
    const ext = custom.extensions[0] as { runtimes: Array<{ code: { page: string } }> };
    expect(ext.runtimes[0].code.page).toBe("https://example.test/app/sharedRuntime.html");
    // Default host is the production skill host.
    const ext0 = manifest.extensions[0] as { runtimes: Array<{ code: { page: string } }> };
    expect(ext0.runtimes[0].code.page).toBe(`${SKILL_HOST}/sharedRuntime.html`);
  });

  it("references colour + outline icons and an accent colour", () => {
    expect(manifest.icons).toEqual({ color: "color.png", outline: "outline.png" });
    expect(manifest.accentColor).toMatch(/^#/);
  });
});

describe("buildDeclarativeAgent", () => {
  const agent = buildDeclarativeAgent();

  it("embeds the shared agent instructions", () => {
    expect(agent.instructions).toBe(buildAgentInstructions());
  });

  it("provides conversation starters", () => {
    expect(agent.conversation_starters.length).toBeGreaterThan(0);
    for (const starter of agent.conversation_starters) {
      expect(starter.title).toBeTruthy();
      expect(starter.text).toBeTruthy();
    }
  });
});
