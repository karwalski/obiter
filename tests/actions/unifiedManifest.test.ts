/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * COPILOT-011/017/018 — the generated unified Microsoft 365 manifest declares
 * the add-in extension (shared runtime with executeDataFunction actions +
 * per-view task-pane runtimes + full classic ribbon parity) and the Copilot
 * agent; the declarative agent embeds the shared instructions and binds to the
 * plugin file. The chain Copilot resolves — agent → plugin function names →
 * runtime executeDataFunction ids → Office.actions.associate ids — is guarded
 * here end to end.
 */

import {
  buildUnifiedManifest,
  buildDeclarativeAgent,
  SKILL_HOST,
  PLUGIN_FILE_NAME,
} from "../../src/actions/unifiedManifest";
import { buildPluginManifest } from "../../src/actions/pluginManifest";
import { OBITER_ACTIONS } from "../../src/actions/actionCatalogue";
import { buildAgentInstructions } from "../../src/actions/agentInstructions";

interface RuntimeShape {
  id: string;
  lifetime: string;
  code: { page: string };
  actions: Array<{ id: string; type: string; view?: string }>;
}

interface ControlShape {
  id: string;
  label: string;
  actionId: string;
}

function extension(manifest: ReturnType<typeof buildUnifiedManifest>): {
  runtimes: RuntimeShape[];
  ribbons: Array<{ tabs: Array<{ groups: Array<{ label: string; controls: ControlShape[] }> }> }>;
} {
  return manifest.extensions[0] as never;
}

describe("buildUnifiedManifest", () => {
  const manifest = buildUnifiedManifest();
  const ext = extension(manifest);
  const sharedRuntime = ext.runtimes.find((r) => r.id === "SharedRuntime")!;
  const allControls = ext.ribbons[0].tabs[0].groups.flatMap((g) => g.controls);

  it("uses a numbered schema that supports executeDataFunction (v1.25+)", () => {
    expect(manifest.manifestVersion).toBe("1.25");
    expect(Array.isArray(manifest.extensions)).toBe(true);
    expect(manifest.copilotAgents.declarativeAgents.length).toBeGreaterThan(0);
  });

  it("emits the devPreview schema when requested (Agents-Toolkit sideload fallback)", () => {
    const dev = buildUnifiedManifest(undefined, { devPreview: true });
    expect(dev.manifestVersion).toBe("devPreview");
    expect(dev.$schema).toContain("vDevPreview");
  });

  it("declares each catalogued action as an executeDataFunction on the shared runtime (COPILOT-017)", () => {
    expect(sharedRuntime.lifetime).toBe("long");
    const dataActions = sharedRuntime.actions.filter((a) => a.type === "executeDataFunction");
    expect(dataActions.map((a) => a.id).sort()).toEqual(OBITER_ACTIONS.map((a) => a.name).sort());
  });

  it("keeps ribbon command functions as executeFunction actions", () => {
    const fnActions = sharedRuntime.actions.filter((a) => a.type === "executeFunction");
    expect(fnActions.map((a) => a.id).sort()).toEqual(
      ["applyBlockQuote", "applyTemplate", "refreshAll"].sort()
    );
  });

  it("points the shared runtime at the shared runtime page on the given host", () => {
    const custom = extension(buildUnifiedManifest("https://example.test/app"));
    expect(custom.runtimes.find((r) => r.id === "SharedRuntime")!.code.page).toBe(
      "https://example.test/app/sharedRuntime.html"
    );
    expect(sharedRuntime.code.page).toBe(`${SKILL_HOST}/sharedRuntime.html`);
  });

  it("mirrors the classic ribbon: 3 groups, 11 controls (COPILOT-018)", () => {
    const groups = ext.ribbons[0].tabs[0].groups;
    expect(groups.map((g) => g.label)).toEqual(["Obiter", "Document", "Tools"]);
    expect(allControls).toHaveLength(11);
    expect(allControls.map((c) => c.label)).toEqual([
      "Obiter",
      "Insert Citation",
      "Library",
      "Validate",
      "Bibliography",
      "Guide",
      "Refresh All",
      "Apply Template",
      "Block Quote",
      "Styling",
      "Settings",
    ]);
  });

  it("wires every ribbon control to a declared runtime action", () => {
    const declared = new Set(ext.runtimes.flatMap((r) => r.actions.map((a) => a.id)));
    for (const control of allControls) {
      expect(declared).toContain(control.actionId);
    }
  });

  it("gives each pane view its own runtime with the classic hash-route URL", () => {
    const library = ext.runtimes.find((r) => r.actions.some((a) => a.id === "openLibrary"))!;
    expect(library.code.page).toBe(`${SKILL_HOST}/taskpane.html#library`);
    expect(library.actions[0].type).toBe("openPage");
    const settings = ext.runtimes.find((r) => r.actions.some((a) => a.id === "openSettings"))!;
    expect(settings.code.page).toBe(`${SKILL_HOST}/taskpane.html#settings`);
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

  it("binds the agent to the add-in plugin file (COPILOT-017)", () => {
    expect(agent.actions).toEqual([{ id: "obiterAddInActions", file: PLUGIN_FILE_NAME }]);
  });

  it("provides conversation starters", () => {
    expect(agent.conversation_starters.length).toBeGreaterThan(0);
    for (const starter of agent.conversation_starters) {
      expect(starter.title).toBeTruthy();
      expect(starter.text).toBeTruthy();
    }
  });
});

describe("buildPluginManifest (COPILOT-017)", () => {
  const plugin = buildPluginManifest();

  it("routes to the add-in via the AddInFunctions namespace", () => {
    expect(plugin.namespace).toBe("AddInFunctions");
    expect(plugin.schema_version).toBe("v2.3");
  });

  it("declares one function per catalogued action, names matching the runtime action ids", () => {
    const manifest = buildUnifiedManifest();
    const dataIds = extension(manifest)
      .runtimes.flatMap((r) => r.actions)
      .filter((a) => a.type === "executeDataFunction")
      .map((a) => a.id)
      .sort();
    expect(plugin.functions.map((f) => f.name).sort()).toEqual(dataIds);
    expect(plugin.functions.map((f) => f.name).sort()).toEqual(
      OBITER_ACTIONS.map((a) => a.name).sort()
    );
  });

  it("gives insertCitation the CitationInsertRequest parameter contract", () => {
    const insert = plugin.functions.find((f) => f.name === "insertCitation")!;
    expect(insert.parameters.required).toEqual(["sourceType", "data"]);
    expect(Object.keys(insert.parameters.properties)).toEqual(
      expect.arrayContaining(["sourceType", "data", "shortTitle", "signal", "appendToFootnoteIndex"])
    );
  });

  it("provides reasoning and responding state instructions for every function", () => {
    for (const fn of plugin.functions) {
      expect(fn.states.reasoning.instructions.length).toBeGreaterThan(20);
      expect(fn.states.responding.instructions.length).toBeGreaterThan(10);
      expect(fn.description.length).toBeGreaterThan(10);
    }
  });
});
