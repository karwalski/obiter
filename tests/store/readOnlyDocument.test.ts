/**
 * @jest-environment jsdom
 *
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Regression: "RichApi.Error: NotAllowed" while loading the citation store.
 *
 * A document the user cannot edit — Protected View, marked as final, IRM,
 * restricted editing, or a file locked by another user — refuses every write.
 * Reading the store worked, but initStore() then persisted a new empty store,
 * Word refused it, and the rejection took down the whole pane with the single
 * unexplained word "NotAllowed".
 *
 * The store must instead degrade to read-only: citations stay readable, and
 * only writes are refused, with a message the user can act on.
 */

import { CitationStore } from "../../src/store/citationStore";
import {
  DocumentReadOnlyError,
  isNotAllowedError,
  READ_ONLY_MESSAGE,
  writeErrorMessage,
} from "../../src/word/documentAccess";
import {
  FakeDocState,
  installFakeWord,
  makeCitation,
  makeNotAllowedError,
  storeXmlWith,
} from "./fakeWordHarness";

describe("isNotAllowedError", () => {
  it("detects the error Word actually throws", () => {
    expect(isNotAllowedError(makeNotAllowedError())).toBe(true);
  });

  it("detects the code on debugInfo alone", () => {
    expect(isNotAllowedError({ debugInfo: { code: "NotAllowed" } })).toBe(true);
  });

  it("detects the code in the message alone", () => {
    expect(isNotAllowedError(new Error("RichApi.Error: NotAllowed"))).toBe(true);
  });

  it("does not fire on unrelated failures", () => {
    expect(isNotAllowedError(new Error("ItemNotFound"))).toBe(false);
    expect(isNotAllowedError({ code: "GeneralException" })).toBe(false);
    expect(isNotAllowedError(null)).toBe(false);
    expect(isNotAllowedError("NotAllowedElsewhere")).toBe(false);
  });
});

describe("writeErrorMessage", () => {
  it("explains a refused write instead of echoing the code", () => {
    expect(writeErrorMessage(makeNotAllowedError(), "fallback")).toBe(READ_ONLY_MESSAGE);
    expect(writeErrorMessage(makeNotAllowedError(), "fallback")).not.toMatch(/^NotAllowed$/);
  });

  it("leaves genuine failures with their own message", () => {
    expect(writeErrorMessage(new Error("Citation is missing a title"), "fallback")).toBe(
      "Citation is missing a title"
    );
    expect(writeErrorMessage({}, "fallback")).toBe("fallback");
  });
});

describe("CitationStore on a read-only document", () => {
  it("initialises instead of rejecting when the first write is refused", async () => {
    const doc = new FakeDocState();
    doc.readOnly = true; // no existing part, so initStore() tries to create one
    installFakeWord(doc);

    const store = new CitationStore();
    await expect(store.initStore()).resolves.toBeUndefined();

    expect(store.isReadOnly()).toBe(true);
    expect(store.getDiagnostics().status).toBe("read-only");
    expect(store.getAll()).toEqual([]);
  });

  it("still reads citations already saved in the document", async () => {
    const doc = new FakeDocState();
    doc.addPart(storeXmlWith("a", "b"));
    doc.readOnly = true;
    installFakeWord(doc);

    const store = new CitationStore();
    await store.initStore();

    // The library must not look empty just because the document is locked.
    expect(store.getAll().map((c) => c.id).sort()).toEqual(["a", "b"]);
  });

  it("reports a refused write with an actionable message, not the raw code", async () => {
    const doc = new FakeDocState();
    doc.addPart(storeXmlWith("a"));
    installFakeWord(doc);

    const store = new CitationStore();
    await store.initStore();

    // The document becomes unwritable after load (eg the user's lock expires,
    // or another user takes the file).
    doc.readOnly = true;

    await expect(store.add(makeCitation("b"))).rejects.toThrow(DocumentReadOnlyError);
    await expect(store.add(makeCitation("c"))).rejects.toThrow(READ_ONLY_MESSAGE);
    expect(store.isReadOnly()).toBe(true);
  });

  it("never surfaces the bare code the user was shown", async () => {
    const doc = new FakeDocState();
    doc.readOnly = true;
    installFakeWord(doc);

    const store = new CitationStore();
    await store.initStore();

    // The original report read only "NotAllowed" — no cause, nothing to act on.
    const shown = await store.add(makeCitation("x")).then(
      () => "",
      (err: unknown) => writeErrorMessage(err, "fallback")
    );
    expect(shown).not.toBe("NotAllowed");
    expect(shown).toContain("read-only");
    expect(shown).toContain("Enable Editing");
  });

  it("keeps a genuine write failure distinguishable from a permission problem", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);

    const store = new CitationStore();
    await store.initStore();
    expect(store.isReadOnly()).toBe(false);
    expect(store.getDiagnostics().status).not.toBe("read-only");
  });
});
