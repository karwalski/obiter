/**
 * @jest-environment jsdom
 *
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * COURT-122 follow-up (owner, 7 Oct 2026): the Obiter properties a user
 * removed before handover are recorded in the document's own Obiter store,
 * so the choice survives a reopen on any device. An empty list turns
 * Obiter's properties back on.
 */

import { CitationStore } from "../../src/store/citationStore";
import { FakeDocState, installFakeWord, storeXmlWith } from "./fakeWordHarness";

describe("CitationStore propertyOptOut (COURT-122)", () => {
  test("is empty by default; a recorded opt-out survives a fresh store instance", async () => {
    const doc = new FakeDocState();
    doc.addPart(storeXmlWith("a"));
    installFakeWord(doc);

    const store = new CitationStore();
    await store.initStore();
    expect(store.getPropertyOptOut()).toEqual([]);
    expect(doc.obiterParts()[0].xml).not.toContain("propertyOptOut");

    await store.setPropertyOptOut(["Obiter.Version", "Obiter.Version", " Obiter.CreatedDate "]);
    expect(store.getPropertyOptOut()).toEqual(["Obiter.Version", "Obiter.CreatedDate"]);
    expect(doc.obiterParts()[0].xml).toContain("propertyOptOut=");

    const reopened = new CitationStore();
    await reopened.initStore();
    expect(reopened.getPropertyOptOut()).toEqual(["Obiter.Version", "Obiter.CreatedDate"]);
    // Citations are untouched.
    expect(reopened.getAll()).toHaveLength(1);

    await reopened.setPropertyOptOut([]);
    expect(doc.obiterParts()[0].xml).not.toContain("propertyOptOut");
    const third = new CitationStore();
    await third.initStore();
    expect(third.getPropertyOptOut()).toEqual([]);
  });
});
