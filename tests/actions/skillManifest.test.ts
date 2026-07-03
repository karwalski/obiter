/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * COPILOT-005/006 — the generated Copilot skill declaration exposes every
 * catalogued action, carries the versioned insert contract + per-source-type
 * schema an external caller needs, and defaults to direct-insert review.
 */

import { buildCopilotSkillManifest } from "../../src/actions/skillManifest";
import { OBITER_ACTIONS } from "../../src/actions/actionCatalogue";
import { CITATION_REQUEST_CONTRACT_VERSION } from "../../src/actions/citationRequest";

describe("buildCopilotSkillManifest", () => {
  const manifest = buildCopilotSkillManifest();

  it("exposes exactly the catalogued actions, one-to-one", () => {
    const manifestNames = manifest.actions.map((a) => a.name).sort();
    const catalogueNames = OBITER_ACTIONS.map((a) => a.name).sort();
    expect(manifestNames).toEqual(catalogueNames);
  });

  it("preserves each action's description, input and effect", () => {
    for (const action of OBITER_ACTIONS) {
      const projected = manifest.actions.find((a) => a.name === action.name);
      expect(projected).toBeDefined();
      expect(projected?.description).toBe(action.description);
      expect(projected?.input).toBe(action.input);
      expect(projected?.effect).toBe(action.effect);
    }
  });

  it("carries the versioned insert contract", () => {
    expect(manifest.contractVersion).toBe(CITATION_REQUEST_CONTRACT_VERSION);
  });

  it("bundles the per-source-type field schema for building valid requests", () => {
    expect(manifest.sourceTypeSchema.sourceTypes.length).toBeGreaterThan(0);
    const reported = manifest.sourceTypeSchema.sourceTypes.find((s) => s.type === "case.reported");
    expect(reported).toBeDefined();
    expect(reported?.requiredFields.length).toBeGreaterThan(0);
  });

  it("defaults to direct-insert review (COPILOT-006)", () => {
    expect(manifest.reviewMode).toBe("direct");
  });

  it("includes non-empty agent instructions and identifying metadata", () => {
    expect(manifest.instructions.length).toBeGreaterThan(100);
    expect(manifest.name).toBeTruthy();
    expect(manifest.description.length).toBeGreaterThan(20);
  });
});
