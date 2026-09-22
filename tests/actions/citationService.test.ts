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
  importCitations,
  ignoreDuplicatePair,
  mergeDuplicateCitation,
} from "../../src/actions/citationService";
import type { Citation } from "../../src/types/citation";
import { userTags } from "../../src/engine/tags";

const insertFootnote = footnoteManager.insertCitationFootnote as jest.Mock;
const retag = footnoteManager.retagOccurrences as jest.Mock;
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
    reportSeries: "CLR",
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

describe("insertCitation refuses incomplete citations (BUG-005 (c))", () => {
  const incompleteCase = {
    sourceType: "case.reported" as const,
    // The BUG-005 repro: a bare case name with no year/series/page produced
    // 'Smith v Land & House Property Corporation (0)  0' pre-fix. Rule 2.2
    // requires year, reportSeries and startingPage.
    data: { party1: "Smith", party2: "Land & House Property Corporation" },
  };

  it("rejects a reported case missing year/reportSeries/startingPage (Rule 2.2)", async () => {
    await expect(insertCitation(incompleteCase, CONFIG)).rejects.toThrow(
      /missing required fields: year, reportSeries, startingPage/
    );
    expect(mockStore.add).not.toHaveBeenCalled();
    expect(insertFootnote).not.toHaveBeenCalled();
  });

  it("inserts regardless when the caller sets allowIncomplete", async () => {
    const result = await insertCitation({ ...incompleteCase, allowIncomplete: true }, CONFIG);
    expect(result.mode).toBe("new");
    expect(insertFootnote).toHaveBeenCalledTimes(1);
  });

  it("does not gate a verbatim override (the user's text is authoritative)", async () => {
    const result = await insertCitation(
      { ...incompleteCase, overrideText: "Smith v Land & House Property Corporation." },
      CONFIG
    );
    expect(result.mode).toBe("override");
  });

  it("accepts a complete reported case without the flag", async () => {
    const result = await insertCitation(caseRequest, CONFIG);
    expect(result.mode).toBe("new");
  });
});

describe("findMatchingCitation", () => {
  it("matches a case on parties + year", () => {
    const a = buildCitationFromRequest(caseRequest, "4");
    expect(findMatchingCitation(a, [a])).toBe(a);
    expect(findMatchingCitation(a, [])).toBeUndefined();
  });
});

describe("importCitations tags (ENP-001)", () => {
  it("applies normalised user tags to every imported row and keeps system tags", async () => {
    const addMany = jest.fn(async (cs: unknown[]) => cs.length);
    getStore.mockResolvedValue({
      ...mockStore,
      addMany,
      updateMany: jest.fn(async () => 0),
    });
    const result = await importCitations({
      text: "TY  - JOUR\nAU  - Bell, Justine\nTI  - Coastal Property\nPY  - 2014\nJO  - EPLJ\nVL  - 31\nSP  - 152\nER  -\n",
      format: "ris",
      tags: [" Contract ", "contract", "Remedies"],
    });
    expect(result.added).toBe(1);
    const added = addMany.mock.calls[0][0] as Array<{ tags: string[] }>;
    expect(userTags(added[0].tags)).toEqual(["contract", "remedies"]);
    expect(added[0].tags).toEqual(expect.arrayContaining(["import", "import:ris"]));
  });
});

describe("mergeDuplicateCitation and ignoreDuplicatePair (ENP-003)", () => {
  const survivor: Citation = {
    id: "rep",
    aglcVersion: "4",
    sourceType: "case.reported",
    data: {
      party1: "Mabo",
      party2: "Queensland (No 2)",
      year: "1992",
      reportSeries: "CLR",
      startingPage: "1",
    },
    tags: ["native title"],
    createdAt: "2026-01-01T00:00:00.000Z",
    modifiedAt: "2026-01-01T00:00:00.000Z",
    firstFootnoteNumber: 4,
  };
  const duplicate: Citation = {
    ...survivor,
    id: "mnc",
    sourceType: "case.unreported.mnc",
    data: {
      party1: "Mabo",
      party2: "Queensland (No 2)",
      year: "1992",
      court: "HCA",
      caseNumber: "23",
    },
    tags: ["land"],
    createdAt: "2026-02-01T00:00:00.000Z",
  };
  const third: Citation = { ...duplicate, id: "third", tags: [] };

  const dedupeStore = {
    ...mockStore,
    getAll: jest.fn(() => [survivor, duplicate, third]),
    takeSnapshot: jest.fn(async () => true),
    update: jest.fn(async () => undefined),
    updateMany: jest.fn(async (cs: Citation[]) => cs.length),
    remove: jest.fn(async () => undefined),
  };

  beforeEach(() => {
    getStore.mockResolvedValue(dedupeStore);
    retag.mockResolvedValue(1);
  });

  it("two-argument form: snapshots, retags, removes and refreshes once without rewriting", async () => {
    const moved = await mergeDuplicateCitation("mnc", "rep");
    expect(moved).toBe(1);
    expect(dedupeStore.takeSnapshot).toHaveBeenCalledTimes(1);
    expect(dedupeStore.takeSnapshot).toHaveBeenCalledWith("dedupe");
    expect(retag).toHaveBeenCalledWith("mnc", "rep");
    expect(dedupeStore.update).not.toHaveBeenCalled();
    expect(dedupeStore.remove).toHaveBeenCalledWith("mnc");
    expect(refreshNow).toHaveBeenCalledTimes(1);
  });

  it("writes merged data and tags to the survivor, keeping id, createdAt and firstFootnoteNumber", async () => {
    const merged = { ...survivor.data, court: "HCA", caseNumber: "23" };
    const moved = await mergeDuplicateCitation(["mnc", "third"], "rep", merged, [
      "native title",
      "land",
    ]);
    expect(moved).toBe(2);
    expect(dedupeStore.takeSnapshot).toHaveBeenCalledTimes(1);
    expect(dedupeStore.update).toHaveBeenCalledTimes(1);
    const written = dedupeStore.update.mock.calls[0][0] as Citation;
    expect(written.id).toBe("rep");
    expect(written.createdAt).toBe(survivor.createdAt);
    expect(written.firstFootnoteNumber).toBe(4);
    expect(written.modifiedAt).not.toBe(survivor.modifiedAt);
    expect(written.data).toEqual(merged);
    expect(written.tags).toEqual(["native title", "land"]);
    expect(retag.mock.calls).toEqual([
      ["mnc", "rep"],
      ["third", "rep"],
    ]);
    expect(dedupeStore.remove.mock.calls).toEqual([["mnc"], ["third"]]);
    expect(refreshNow).toHaveBeenCalledTimes(1);
  });

  it("ignores an empty or self-only removal list", async () => {
    expect(await mergeDuplicateCitation([], "rep")).toBe(0);
    expect(await mergeDuplicateCitation("rep", "rep")).toBe(0);
    expect(dedupeStore.takeSnapshot).not.toHaveBeenCalled();
    expect(refreshNow).not.toHaveBeenCalled();
  });

  it("ignoreDuplicatePair appends the dedupe:ignore tag to each member in one persist", async () => {
    const tagged = await ignoreDuplicatePair("mabo|1992|", ["rep", "mnc", "missing"]);
    expect(tagged).toBe(2);
    expect(dedupeStore.updateMany).toHaveBeenCalledTimes(1);
    const updates = dedupeStore.updateMany.mock.calls[0][0] as Citation[];
    expect(updates.map((c) => c.id)).toEqual(["rep", "mnc"]);
    expect(updates[0].tags).toEqual(["native title", "dedupe:ignore:mabo|1992|"]);
    expect(updates[1].tags).toEqual(["land", "dedupe:ignore:mabo|1992|"]);
  });
});
