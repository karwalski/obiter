/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * COPILOT-001/002/008 — the headless citation service, DTO mapper, and the
 * request → Citation → formatted-runs round trip that a Copilot skill or jurisd
 * client will drive. Word-layer + store are auto-mocked; the engine runs for real.
 */

jest.mock("../../src/word/footnoteManager");
jest.mock("../../src/word/citationRefresher");
jest.mock("../../src/store/singleton");

import * as footnoteManager from "../../src/word/footnoteManager";
import * as citationRefresher from "../../src/word/citationRefresher";
import { getSharedStore } from "../../src/store/singleton";
import { getStandardConfig } from "../../src/engine/standards";
import { buildCitationFromRequest, getVersionForStandard } from "../../src/actions/citationRequest";
import {
  insertCitation,
  formatCitationRuns,
  runsToPlainText,
  findMatchingCitation,
} from "../../src/actions/citationService";

const insertFootnote = footnoteManager.insertCitationFootnote as jest.Mock;
const refreshNow = citationRefresher.refreshAllCitationsNow as jest.Mock;
const getStore = getSharedStore as jest.Mock;

const CONFIG = getStandardConfig("aglc4");

const mockStore = {
  getStandardId: () => "aglc4",
  getAll: jest.fn(() => [] as unknown[]),
  add: jest.fn(async () => undefined),
};

const caseRequest = {
  sourceType: "case.reported" as const,
  data: {
    party1: "Mabo",
    party2: "Queensland (No 2)",
    year: "1992",
    volume: "175",
    reporter: "CLR",
    startingPage: "1",
  },
  shortTitle: "Mabo",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockStore.getAll.mockReturnValue([]);
  getStore.mockResolvedValue(mockStore);
  insertFootnote.mockResolvedValue(undefined);
  refreshNow.mockResolvedValue({
    updated: 0,
    unchanged: 0,
    lockedSkipped: 0,
    userEdits: [],
    failures: [],
  });
});

describe("buildCitationFromRequest (COPILOT-002)", () => {
  it("maps request fields and stamps store-lifecycle fields", () => {
    const c = buildCitationFromRequest(caseRequest, "4");
    expect(c.sourceType).toBe("case.reported");
    expect(c.data.party1).toBe("Mabo");
    expect(c.shortTitle).toBe("Mabo");
    expect(c.aglcVersion).toBe("4");
    expect(c.id).toMatch(/[0-9a-f-]{36}/);
    expect(Array.isArray(c.tags)).toBe(true);
    expect(typeof c.createdAt).toBe("string");
  });

  it("normalises empty optional strings to undefined", () => {
    const c = buildCitationFromRequest(
      { sourceType: "book" as const, data: {}, shortTitle: "" },
      "4"
    );
    expect(c.shortTitle).toBeUndefined();
  });

  it("honours an explicit aglcVersion over the default", () => {
    const c = buildCitationFromRequest({ ...caseRequest, aglcVersion: "5" }, "4");
    expect(c.aglcVersion).toBe("5");
  });
});

describe("getVersionForStandard", () => {
  it("maps standards to AGLC editions", () => {
    expect(getVersionForStandard("aglc4")).toBe("4");
    expect(getVersionForStandard("aglc5")).toBe("5");
  });
});

describe("formatCitationRuns + runsToPlainText (COPILOT-008 round trip)", () => {
  it("formats a request to runs without touching the document", () => {
    const runs = formatCitationRuns(caseRequest, CONFIG);
    expect(runs.length).toBeGreaterThan(0);
    const text = runsToPlainText(runs);
    expect(text).toContain("Mabo");
    expect(text).toContain("175");
    expect(insertFootnote).not.toHaveBeenCalled();
  });
});

describe("insertCitation (COPILOT-001, three modes)", () => {
  it("new citation: stores, formats, inserts a native footnote, refreshes", async () => {
    const result = await insertCitation(caseRequest, CONFIG);
    expect(result.mode).toBe("new");
    expect(mockStore.add).toHaveBeenCalledTimes(1);
    expect(insertFootnote).toHaveBeenCalledTimes(1);
    expect(refreshNow).toHaveBeenCalledTimes(1);
  });

  it("reused citation: does not re-add to the store", async () => {
    const existing = buildCitationFromRequest(caseRequest, "4");
    mockStore.getAll.mockReturnValue([existing]);
    const result = await insertCitation(caseRequest, CONFIG);
    expect(result.mode).toBe("reused");
    expect(result.citationId).toBe(existing.id);
    expect(mockStore.add).not.toHaveBeenCalled();
    expect(insertFootnote).toHaveBeenCalledTimes(1);
  });

  it("override: inserts verbatim text, bypassing the engine", async () => {
    const result = await insertCitation(
      { sourceType: "custom" as const, data: {}, overrideText: "Custom footnote text." },
      CONFIG
    );
    expect(result.mode).toBe("override");
    expect(insertFootnote.mock.calls[0][2]).toEqual([{ text: "Custom footnote text." }]);
  });

  it("append: passes the target footnote index through", async () => {
    await insertCitation({ ...caseRequest, appendToFootnoteIndex: 7 }, CONFIG);
    expect(insertFootnote.mock.calls[0][3]).toBe(7);
  });
});

describe("findMatchingCitation", () => {
  it("matches a case on parties + year", () => {
    const a = buildCitationFromRequest(caseRequest, "4");
    expect(findMatchingCitation(a, [a])).toBe(a);
    expect(findMatchingCitation(a, [])).toBeUndefined();
  });
});
