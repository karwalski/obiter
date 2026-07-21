/**
 * @jest-environment jsdom
 *
 * SAFE-005 — "Use Obiter's version" resolution for a flagged user edit.
 *
 * `acceptObiterVersion` removes the SAFE-002 user-edit protection for ONE
 * footnote by rewriting the parent-CC title so its stored hash equals
 * hash(currentText) — the decision matrix then classifies exactly that
 * footnote as a stale render and rebuilds it — and runs a full refresh.
 *
 * `refreshAllCitationsNow` is mocked (the rebuild pipeline has its own
 * suites); the classification consequence is asserted through the real
 * `classifyFootnote`.
 */

import { acceptObiterVersion, acceptedVersionTitle } from "../../src/word/footnoteBackup";
import { classifyFootnote, refreshAllCitationsNow } from "../../src/word/citationRefresher";
import {
  LOCKED_PARENT_CC_TITLE,
  parseParentTitle,
  isFootnoteLocked,
} from "../../src/word/footnoteManager";
import { hashRenderedText } from "../../src/utils/textHash";
import type { CitationStore } from "../../src/store/citationStore";

jest.mock("../../src/word/citationRefresher", () => ({
  ...jest.requireActual("../../src/word/citationRefresher"),
  refreshAllCitationsNow: jest.fn(),
}));

const mockRefreshNow = refreshAllCitationsNow as jest.MockedFunction<typeof refreshAllCitationsNow>;

const fakeStore = { getAll: () => [] } as unknown as CitationStore;

interface FakeParentCC {
  tag: string;
  title: string;
  text: string;
  load: jest.Mock;
}

/** Install a fake Word.run over footnotes each holding one parent CC. */
function installFakeWordWithFootnotes(parentCCs: (FakeParentCC | null)[]): void {
  const noteItems = parentCCs.map((parentCC) => ({
    body: {
      contentControls: { load: jest.fn(), items: parentCC ? [parentCC] : [] },
    },
  }));
  const context = {
    document: { body: { footnotes: { load: jest.fn(), items: noteItems } } },
    sync: async (): Promise<void> => undefined,
  };
  (global as Record<string, unknown>).Word = {
    run: async <T>(callback: (ctx: typeof context) => Promise<T>): Promise<T> => callback(context),
  };
}

function makeParentCC(title: string, text: string): FakeParentCC {
  return { tag: "obiter-fn", title, text, load: jest.fn() };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRefreshNow.mockResolvedValue({
    updated: 1,
    unchanged: 0,
    lockedSkipped: 0,
    userEdits: [],
    failures: [],
  });
});

describe("SAFE-005 — acceptedVersionTitle (pure)", () => {
  test("encodes an unlocked title whose stored hash is hash(currentText)", () => {
    const text = "Mabo v Queensland (No 2) (1992) 175 CLR 1, edited by hand.";

    const title = acceptedVersionTitle(text);

    const parsed = parseParentTitle(title);
    expect(parsed.locked).toBe(false);
    expect(parsed.renderedHash).toBe(hashRenderedText(text));
  });

  test("the rewritten title flips the SAFE-002 classification from user-edited to rebuild", () => {
    const currentText = "USER EDITED FOOTNOTE TEXT.";
    const expectedText = "Obiter's freshly rendered text.";
    const staleStoredHash = hashRenderedText("what Obiter rendered long ago");

    // Before: protected as a user edit.
    expect(classifyFootnote(currentText, expectedText, staleStoredHash)).toBe("user-edited");

    // After: stored hash == hash(current) → stale render → rebuild.
    const storedHash = parseParentTitle(acceptedVersionTitle(currentText)).renderedHash;
    expect(classifyFootnote(currentText, expectedText, storedHash)).toBe("rebuild");
  });
});

describe("SAFE-005 — acceptObiterVersion", () => {
  test("rewrites only the target footnote's title, then refreshes", async () => {
    const target = makeParentCC(
      acceptedVersionTitle("old render"), // stale stored hash from an earlier render
      "USER EDITED TEXT"
    );
    const other = makeParentCC(acceptedVersionTitle("other old render"), "OTHER EDITED TEXT");
    installFakeWordWithFootnotes([other, target]);

    await acceptObiterVersion(2, fakeStore);

    expect(target.title).toBe(acceptedVersionTitle("USER EDITED TEXT"));
    // Per-footnote precision: the other user-edited footnote keeps its
    // protection (its stored hash still differs from its current text).
    expect(other.title).toBe(acceptedVersionTitle("other old render"));
    expect(mockRefreshNow).toHaveBeenCalledTimes(1);
    expect(mockRefreshNow).toHaveBeenCalledWith(fakeStore);
  });

  test("unlocks a locked footnote as part of accepting Obiter's version", async () => {
    const locked = makeParentCC(LOCKED_PARENT_CC_TITLE, "frozen text");
    installFakeWordWithFootnotes([locked]);

    await acceptObiterVersion(1, fakeStore);

    expect(isFootnoteLocked(locked.title)).toBe(false);
    expect(parseParentTitle(locked.title).renderedHash).toBe(hashRenderedText("frozen text"));
  });

  test("a footnote that no longer exists errors cleanly and does not refresh", async () => {
    installFakeWordWithFootnotes([makeParentCC("Obiter Footnote", "text")]);

    await expect(acceptObiterVersion(5, fakeStore)).rejects.toThrow(
      "Cannot rebuild footnote 5: the document no longer has a footnote at that position."
    );
    expect(mockRefreshNow).not.toHaveBeenCalled();
  });

  test("a footnote without an Obiter content control errors cleanly", async () => {
    installFakeWordWithFootnotes([null]);

    await expect(acceptObiterVersion(1, fakeStore)).rejects.toThrow(
      "Cannot rebuild footnote 1: it has no Obiter content control."
    );
    expect(mockRefreshNow).not.toHaveBeenCalled();
  });
});
