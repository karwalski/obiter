/**
 * retagOccurrences (merge-duplicate) tests.
 *
 * Re-points every occurrence of one citation id to another so a duplicate can
 * be merged into an existing citation; occurrences keep their pinpoint but have
 * their format preference reset to "auto" so they resolve as subsequent
 * references of the target.
 */
import { createMockContentControl, createMockContentControlCollection } from "../mocks/office";
import { retagOccurrences } from "../../src/word/footnoteManager";

function installWordWith(controls: ReturnType<typeof createMockContentControlCollection>): void {
  (globalThis as Record<string, unknown>).Word = {
    run: async (cb: (ctx: unknown) => unknown) =>
      cb({
        document: { contentControls: controls },
        sync: async () => undefined,
      }),
  };
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>).Word;
});

describe("retagOccurrences", () => {
  it("re-tags every occurrence and resets format to auto, keeping the pinpoint", async () => {
    const dup1 = createMockContentControl({ tag: "dup", title: "Citation:full:[37]" });
    const dup2 = createMockContentControl({ tag: "dup", title: "Citation:short" });
    const other = createMockContentControl({ tag: "other", title: "Citation:auto" });
    installWordWith(createMockContentControlCollection([dup1, dup2, other]));

    const moved = await retagOccurrences("dup", "target");

    expect(moved).toBe(2);
    expect(dup1.tag).toBe("target");
    expect(dup2.tag).toBe("target");
    expect(dup1.title).toBe("Citation:auto:[37]"); // pinpoint kept, pref reset
    expect(dup2.title).toBe("Citation:auto");
    // An unrelated occurrence is untouched.
    expect(other.tag).toBe("other");
  });

  it("returns 0 and touches nothing when there are no occurrences", async () => {
    const other = createMockContentControl({ tag: "other" });
    installWordWith(createMockContentControlCollection([other]));
    expect(await retagOccurrences("dup", "target")).toBe(0);
    expect(other.tag).toBe("other");
  });

  it("is a no-op for empty or identical ids", async () => {
    installWordWith(createMockContentControlCollection([]));
    expect(await retagOccurrences("same", "same")).toBe(0);
    expect(await retagOccurrences("", "target")).toBe(0);
    expect(await retagOccurrences("dup", "")).toBe(0);
  });
});
