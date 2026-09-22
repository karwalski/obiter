/**
 * @jest-environment jsdom
 *
 * ENP-003: merging two duplicate citations through the service against the
 * real CitationStore over the fake Word.customXmlParts harness. The Word
 * footnote layer and the refresher are mocked; the store, its persist path
 * and the backup ring run for real, so the "dedupe" snapshot is observable.
 */

jest.mock("../../src/word/footnoteManager");
jest.mock("../../src/word/citationRefresher");

import * as footnoteManager from "../../src/word/footnoteManager";
import * as citationRefresher from "../../src/word/citationRefresher";
import { getSharedStore, resetSharedStore } from "../../src/store/singleton";
import { listSnapshots } from "../../src/store/backupStore";
import { serializeStore } from "../../src/store/xmlSerializer";
import { findDuplicateClusters } from "../../src/api/interchange/dedupe";
import { ignoreDuplicatePair, mergeDuplicateCitation } from "../../src/actions/citationService";
import { FakeDocState, installFakeWord, makeCitation } from "../store/fakeWordHarness";

const retag = footnoteManager.retagOccurrences as jest.Mock;
const refreshNow = citationRefresher.refreshAllCitationsNow as jest.Mock;

const reported = makeCitation("rep", {
  sourceType: "case.reported",
  data: {
    party1: "Mabo",
    party2: "Queensland (No 2)",
    year: "1992",
    volume: "175",
    reportSeries: "CLR",
    startingPage: "1",
  },
  tags: ["native title"],
  createdAt: "2026-01-01T00:00:00.000Z",
  firstFootnoteNumber: 3,
});
const mnc = makeCitation("mnc", {
  sourceType: "case.unreported.mnc",
  data: {
    party1: "Mabo",
    party2: "Queensland (No 2)",
    year: "1992",
    court: "HCA",
    caseNumber: "23",
  },
  tags: ["import", "land"],
  createdAt: "2026-02-01T00:00:00.000Z",
});
const unrelated = makeCitation("other", {
  data: { caseName: "Wik Peoples v Queensland", year: "1996" },
});

let doc: FakeDocState;

beforeEach(async () => {
  jest.clearAllMocks();
  retag.mockResolvedValue(2);
  refreshNow.mockResolvedValue({
    updated: 0,
    unchanged: 0,
    lockedSkipped: 0,
    userEdits: [],
    failures: [],
  });
  resetSharedStore();
  doc = new FakeDocState();
  installFakeWord(doc);
  doc.addPart(serializeStore([reported, mnc, unrelated]));
  await getSharedStore();
});

describe("duplicate merge through the service (ENP-003)", () => {
  test("the survivor carries both fields, the duplicate is gone, one dedupe snapshot exists", async () => {
    const store = await getSharedStore();
    expect(findDuplicateClusters(store.getAll())).toHaveLength(1);

    const moved = await mergeDuplicateCitation(
      ["mnc"],
      "rep",
      { ...reported.data, court: "HCA", caseNumber: "23" },
      ["native title", "land"]
    );

    expect(moved).toBe(2);
    expect(retag).toHaveBeenCalledWith("mnc", "rep");
    expect(refreshNow).toHaveBeenCalledTimes(1);

    const all = store.getAll();
    expect(all.map((c) => c.id).sort()).toEqual(["other", "rep"]);
    const survivor = all.find((c) => c.id === "rep");
    expect(survivor?.data).toMatchObject({
      reportSeries: "CLR",
      startingPage: "1",
      court: "HCA",
      caseNumber: "23",
    });
    expect(survivor?.tags).toEqual(["native title", "land"]);
    expect(survivor?.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(survivor?.firstFootnoteNumber).toBe(3);
    expect(survivor?.modifiedAt).not.toBe(reported.modifiedAt);
    expect(findDuplicateClusters(all)).toHaveLength(0);

    // The document part reflects the merge and the backup ring holds the pre-merge state.
    expect(doc.obiterParts()).toHaveLength(1);
    expect(doc.obiterParts()[0].xml).not.toContain('id="mnc"');
    const snapshots = await listSnapshots();
    const dedupe = snapshots.filter((s) => s.reason === "dedupe");
    expect(dedupe).toHaveLength(1);
    expect(dedupe[0].citationCount).toBe(3);
  });

  test("the two-argument form still merges without rewriting the survivor", async () => {
    const store = await getSharedStore();
    const before = store.getAll().find((c) => c.id === "rep");
    await mergeDuplicateCitation("mnc", "rep");
    const after = store.getAll().find((c) => c.id === "rep");
    expect(after).toEqual(before);
    expect(store.getAll().some((c) => c.id === "mnc")).toBe(false);
    expect((await listSnapshots()).filter((s) => s.reason === "dedupe")).toHaveLength(1);
  });

  test("Not a duplicate tags both members and the cluster stops appearing", async () => {
    const store = await getSharedStore();
    const [cluster] = findDuplicateClusters(store.getAll());
    const tagged = await ignoreDuplicatePair(cluster.key, ["rep", "mnc"]);
    expect(tagged).toBe(2);
    const all = store.getAll();
    expect(all.find((c) => c.id === "rep")?.tags).toContain(`dedupe:ignore:${cluster.key}`);
    expect(all.find((c) => c.id === "mnc")?.tags).toContain(`dedupe:ignore:${cluster.key}`);
    expect(findDuplicateClusters(all)).toHaveLength(0);
    expect(retag).not.toHaveBeenCalled();
  });
});
