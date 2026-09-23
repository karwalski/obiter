/**
 * @jest-environment jsdom
 *
 * Academic ↔ court mode switching through the refresher (hardening review).
 *
 * The contract under test, using the real refreshAllCitations over the fake
 * Word harness (footnoteBackup.test.ts integration pattern):
 *
 * 1. A mode switch that changes the expected render of a footnote whose
 *    current text still matches the stored rendered-text hash is classified
 *    "rebuild" — a config-driven change reformats, it is never mistaken for
 *    a user edit (SAFE-002 matrix).
 * 2. A locked footnote survives a mode-switch refresh untouched.
 * 3. The refresher reads courtToggles from DOCUMENT store metadata when
 *    present (cross-device correctness) and falls back to the legacy device
 *    preference only when the store value is absent.
 */

import { refreshAllCitations } from "../../src/word/citationRefresher";
import { LOCKED_PARENT_CC_TITLE } from "../../src/word/footnoteManager";
import { CitationStore } from "../../src/store/citationStore";
import { setDevicePref } from "../../src/store/devicePreferences";
import { FakeDocState, installFakeWord, storeXmlWith } from "../store/fakeWordHarness";
import { footnoteTexts, makeRefreshContext } from "../store/fakeFootnoteHarness";

// ─── Harness ────────────────────────────────────────────────────────────────
//
// The fake footnote document (parent `obiter-fn` CC per footnote, child
// citation CCs, insertHtml capture) is the shared tests/store/fakeFootnoteHarness.

/** The refresher never rebuilds without a snapshot; tests supply a no-op hook. */
const noopHook = async (): Promise<void> => undefined;

interface BaselineFootnote {
  /** The text Obiter rendered for this footnote. */
  text: string;
  /** The parent-CC title stamped by the rebuild (carries the text hash). */
  title: string;
}

/**
 * Runs one refresh over footnotes that all cite `citationId` (fn2 cites the
 * same source as fn1, so it resolves to Ibid/short form) and captures what
 * Obiter rendered: the up-to-date document state for the CURRENT store
 * config, as later contexts present it back to the refresher.
 */
async function renderBaseline(
  doc: FakeDocState,
  store: CitationStore,
  citationId: string
): Promise<BaselineFootnote[]> {
  const ctx = makeRefreshContext(doc, [
    { citationId, text: "seed text one" },
    { citationId, text: "seed text two" },
  ]);
  const result = await refreshAllCitations(ctx.context, store, noopHook);
  expect(result.failures).toEqual([]);
  expect(result.updated).toBe(2);
  const texts = footnoteTexts(ctx);
  return ctx.parents.map((parent, i) => ({ text: texts[i], title: parent.title }));
}

/** A doc + initialised store with a single case citation "cit-1". */
async function makeStore(): Promise<{ doc: FakeDocState; store: CitationStore }> {
  const doc = new FakeDocState();
  doc.addPart(storeXmlWith("cit-1"));
  installFakeWord(doc);
  const store = new CitationStore();
  await store.initStore();
  return { doc, store };
}

beforeEach(() => {
  localStorage.clear();
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("mode switch through refreshAllCitations", () => {
  test("sanity: an up-to-date document refreshes as unchanged in the same mode", async () => {
    const { doc, store } = await makeStore();
    const baseline = await renderBaseline(doc, store, "cit-1");

    // Academic mode resolves the consecutive repeat to Ibid.
    expect(baseline[1].text).toBe("Ibid.");

    const { context, parents } = makeRefreshContext(doc, [
      { citationId: "cit-1", text: baseline[0].text, title: baseline[0].title },
      { citationId: "cit-1", text: baseline[1].text, title: baseline[1].title },
    ]);
    const result = await refreshAllCitations(context, store, noopHook);

    expect(result.updated).toBe(0);
    expect(result.unchanged).toBe(2);
    expect(result.userEdits).toEqual([]);
    expect(parents[0].insertHtml).not.toHaveBeenCalled();
    expect(parents[1].insertHtml).not.toHaveBeenCalled();
  });

  test("a mode switch that changes the expected text rebuilds (never flagged as a user edit)", async () => {
    const { doc, store } = await makeStore();
    const baseline = await renderBaseline(doc, store, "cit-1");

    // Switch the DOCUMENT to court mode with ibid suppression (the toggles
    // are document metadata, exactly as Settings now writes them).
    await store.setWritingMode("court");
    await store.setCourtJurisdiction("HCA");
    await store.setCourtToggles({ ibidSuppression: "on" });

    const ctx = makeRefreshContext(doc, [
      { citationId: "cit-1", text: baseline[0].text, title: baseline[0].title },
      { citationId: "cit-1", text: baseline[1].text, title: baseline[1].title },
    ]);
    const { context, parents } = ctx;
    const result = await refreshAllCitations(context, store, noopHook);

    // The academic "Ibid." matches its stored hash, so the config-driven
    // change classifies as a stale Obiter render → rebuild, not user edit.
    expect(result.userEdits).toEqual([]);
    expect(result.failures).toEqual([]);
    expect(parents[1].insertHtml).toHaveBeenCalledTimes(1);
    const rebuiltText = footnoteTexts(ctx)[1];
    expect(rebuiltText).not.toContain("Ibid");
    expect(rebuiltText).not.toBe(baseline[1].text);
  });

  test("a genuine user edit is still protected across a mode switch", async () => {
    const { doc, store } = await makeStore();
    const baseline = await renderBaseline(doc, store, "cit-1");

    await store.setWritingMode("court");
    await store.setCourtToggles({ ibidSuppression: "on" });

    // fn2's text no longer matches the stored hash — the user edited it.
    const { context, parents } = makeRefreshContext(doc, [
      { citationId: "cit-1", text: baseline[0].text, title: baseline[0].title },
      { citationId: "cit-1", text: "My manual correction.", title: baseline[1].title },
    ]);
    const result = await refreshAllCitations(context, store, noopHook);

    expect(result.userEdits).toHaveLength(1);
    expect(result.userEdits[0].footnoteNumber).toBe(2);
    expect(result.userEdits[0].currentText).toBe("My manual correction.");
    expect(parents[1].insertHtml).not.toHaveBeenCalled();
  });

  test("a locked footnote survives a mode-switch refresh untouched", async () => {
    const { doc, store } = await makeStore();
    const baseline = await renderBaseline(doc, store, "cit-1");

    await store.setWritingMode("court");
    await store.setCourtJurisdiction("HCA");
    await store.setCourtToggles({ ibidSuppression: "on" });

    const { context, parents } = makeRefreshContext(doc, [
      { citationId: "cit-1", text: baseline[0].text, title: baseline[0].title },
      // Locked — even though court mode would rewrite this "Ibid.".
      { citationId: "cit-1", text: baseline[1].text, title: LOCKED_PARENT_CC_TITLE },
    ]);
    const result = await refreshAllCitations(context, store, noopHook);

    expect(result.lockedSkipped).toBe(1);
    expect(result.userEdits).toEqual([]);
    expect(parents[1].insertHtml).not.toHaveBeenCalled();
    expect(parents[1].title).toBe(LOCKED_PARENT_CC_TITLE);
    expect(parents[1].text).toBe(baseline[1].text);
  });
});

describe("courtToggles source of truth in the refresher", () => {
  test("store metadata wins over a conflicting device preference", async () => {
    const { doc, store } = await makeStore();
    const baseline = await renderBaseline(doc, store, "cit-1");

    await store.setWritingMode("court");
    await store.setCourtToggles({ ibidSuppression: "on" });
    // Conflicting legacy device value — must be ignored when the store has one.
    setDevicePref("courtToggles", { ibidSuppression: "off" });

    const ctx = makeRefreshContext(doc, [
      { citationId: "cit-1", text: baseline[0].text, title: baseline[0].title },
      { citationId: "cit-1", text: baseline[1].text, title: baseline[1].title },
    ]);
    const { context, parents } = ctx;
    await refreshAllCitations(context, store, noopHook);

    // With the device pref ("off") the expected fn2 text would stay "Ibid."
    // (unchanged). The store value suppresses ibid, so fn2 is rebuilt.
    expect(parents[1].insertHtml).toHaveBeenCalledTimes(1);
    expect(footnoteTexts(ctx)[1]).not.toContain("Ibid");
  });

  test("falls back to the legacy device preference when the store has no toggles", async () => {
    const { doc, store } = await makeStore();
    const baseline = await renderBaseline(doc, store, "cit-1");

    await store.setWritingMode("court");
    expect(store.getCourtToggles()).toBeUndefined();
    setDevicePref("courtToggles", { ibidSuppression: "on" });

    const ctx = makeRefreshContext(doc, [
      { citationId: "cit-1", text: baseline[0].text, title: baseline[0].title },
      { citationId: "cit-1", text: baseline[1].text, title: baseline[1].title },
    ]);
    const { context, parents } = ctx;
    await refreshAllCitations(context, store, noopHook);

    // Base court config leaves ibid enabled; only the device fallback
    // suppresses it, so a rebuild of fn2 proves the fallback was read.
    expect(parents[1].insertHtml).toHaveBeenCalledTimes(1);
    expect(footnoteTexts(ctx)[1]).not.toContain("Ibid");
  });

  test("control: with neither store toggles nor device preference, ibid is kept in court mode", async () => {
    const { doc, store } = await makeStore();
    const baseline = await renderBaseline(doc, store, "cit-1");

    await store.setWritingMode("court");

    const { context, parents } = makeRefreshContext(doc, [
      { citationId: "cit-1", text: baseline[0].text, title: baseline[0].title },
      { citationId: "cit-1", text: baseline[1].text, title: baseline[1].title },
    ]);
    const result = await refreshAllCitations(context, store, noopHook);

    // fn2's expected text is still "Ibid." — nothing suppressed it.
    expect(parents[1].insertHtml).not.toHaveBeenCalled();
    expect(result.userEdits).toEqual([]);
  });
});
