/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * COPILOT-004/008 — the action catalogue is well-formed and every action maps to
 * a real citationService export; the published contract carries the version, the
 * actions, and the per-source-type field schema an external caller needs.
 */

jest.mock("../../src/word/footnoteManager");
jest.mock("../../src/word/citationRefresher");
jest.mock("../../src/store/singleton");

import { OBITER_ACTIONS, getCitationInsertContract } from "../../src/actions/actionCatalogue";
import * as citationService from "../../src/actions/citationService";

describe("OBITER_ACTIONS catalogue", () => {
  it("has unique, non-empty action names and descriptions", () => {
    const names = OBITER_ACTIONS.map((a) => a.name);
    expect(new Set(names).size).toBe(names.length);
    for (const a of OBITER_ACTIONS) {
      expect(a.name).toBeTruthy();
      expect(a.description.length).toBeGreaterThan(20);
      expect(["mutation", "read", "pure"]).toContain(a.effect);
    }
  });

  it("every action maps to a real citationService export", () => {
    for (const a of OBITER_ACTIONS) {
      expect(typeof (citationService as Record<string, unknown>)[a.handler]).toBe("function");
    }
  });

  it("exposes the flagship insert action", () => {
    const insert = OBITER_ACTIONS.find((a) => a.name === "insertCitation");
    expect(insert).toBeDefined();
    expect(insert?.effect).toBe("mutation");
    expect(insert?.input).toBe("CitationInsertRequest");
  });
});

describe("getCitationInsertContract (COPILOT-008)", () => {
  it("bundles version, actions, and the per-source-type field schema", () => {
    const contract = getCitationInsertContract();
    expect(contract.contractVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(contract.actions.length).toBe(OBITER_ACTIONS.length);
    // The engine schema lists source types with rule numbers + fields.
    expect(Array.isArray(contract.sourceTypeSchema.sourceTypes)).toBe(true);
    expect(contract.sourceTypeSchema.sourceTypes.length).toBeGreaterThan(10);
    const aCase = contract.sourceTypeSchema.sourceTypes.find((s) => s.type === "case.reported");
    expect(aCase).toBeDefined();
    expect(Array.isArray(aCase?.requiredFields)).toBe(true);
  });
});
