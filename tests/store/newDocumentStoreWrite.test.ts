/**
 * STD-028: the first store write on a brand-new document.
 *
 * Word for the web has no addressable custom XML part store until the host
 * has saved a new document once, so the first `customXmlParts.add` comes back
 * as `ItemNotFound`. Reported live on 23 September 2026: every new document
 * opened the pane with "The citation store could not be loaded, so citations
 * may appear missing", although nothing was wrong and the part appeared as
 * soon as the document saved.
 */

import { CitationStore } from "../../src/store/citationStore";
import { FakeDocState, installFakeWord, makeItemNotFoundError } from "./fakeWordHarness";
import { isItemNotFoundError, isNotAllowedError } from "../../src/word/documentAccess";

describe("isItemNotFoundError", () => {
  test("recognises the host's ItemNotFound by code, debugInfo and message", () => {
    expect(isItemNotFoundError(makeItemNotFoundError())).toBe(true);
    expect(isItemNotFoundError({ debugInfo: { code: "ItemNotFound" } })).toBe(true);
    expect(isItemNotFoundError(new Error("ItemNotFound"))).toBe(true);
  });

  test("does not claim unrelated failures", () => {
    expect(isItemNotFoundError(new Error("NotAllowed"))).toBe(false);
    expect(isItemNotFoundError(undefined)).toBe(false);
    expect(isNotAllowedError(makeItemNotFoundError())).toBe(false);
  });
});

describe("first store write on a new document (ItemNotFound)", () => {
  test("initStore succeeds with an empty library instead of failing the load", async () => {
    const doc = new FakeDocState();
    doc.itemNotFoundWrites = 2; // the write and its one retry
    installFakeWord(doc);

    const store = new CitationStore();
    await expect(store.initStore()).resolves.toBeUndefined();

    expect(store.getAll()).toEqual([]);
    expect(store.isReadOnly()).toBe(false);
    expect(doc.obiterParts()).toHaveLength(0);
    expect(store.getDiagnostics().status).toBe("new");
    expect(store.getDiagnostics().detail).toContain("ItemNotFound");
  });

  test("the next write lands once the document accepts parts", async () => {
    const doc = new FakeDocState();
    doc.itemNotFoundWrites = 2;
    installFakeWord(doc);

    const store = new CitationStore();
    await store.initStore();
    expect(doc.obiterParts()).toHaveLength(0);

    await store.add({
      id: "c1",
      aglcVersion: "4",
      sourceType: "book",
      data: {
        title: "Assessment of Damages",
        authors: [{ surname: "Luntz" }],
        publisher: "P",
        year: 2002,
      },
      tags: [],
      createdAt: "",
      modifiedAt: "",
    } as never);

    expect(doc.obiterParts()).toHaveLength(1);
    expect(store.getAll()).toHaveLength(1);
  });

  test("a single ItemNotFound is retried inside the same persist", async () => {
    const doc = new FakeDocState();
    doc.itemNotFoundWrites = 1; // the retry succeeds
    installFakeWord(doc);

    const store = new CitationStore();
    await store.initStore();

    expect(doc.obiterParts()).toHaveLength(1);
    expect(store.getDiagnostics().status).toBe("new");
  });

  test("a refused write is still reported as read-only, not as a new document", async () => {
    const doc = new FakeDocState();
    doc.readOnly = true;
    installFakeWord(doc);

    const store = new CitationStore();
    await store.initStore();

    expect(store.isReadOnly()).toBe(true);
    expect(store.getDiagnostics().status).toBe("read-only");
  });
});
