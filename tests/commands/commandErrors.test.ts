/**
 * @jest-environment jsdom
 *
 * SAFE-006 — ribbon command error ring. The commands runtime records failures
 * into the `obiter-command-errors` localStorage ring (max 5 entries) via an
 * inline helper, and event.completed() is always called.
 */

import { installOfficeGlobals, removeOfficeGlobals } from "../mocks/office";

const RING_KEY = "obiter-command-errors";

type CommandHandler = (event: { completed: () => void }) => Promise<void>;

interface RingEntry {
  name: string;
  message: string;
  timestamp: string;
}

function readRing(): RingEntry[] {
  const raw = window.localStorage.getItem(RING_KEY);
  return raw ? (JSON.parse(raw) as RingEntry[]) : [];
}

function setWordRunRejecting(message: string): void {
  (globalThis as Record<string, unknown>).Word = {
    ...(globalThis as { Word?: object }).Word,
    run: jest.fn().mockRejectedValue(new Error(message)),
  };
}

describe("ribbon command error ring (SAFE-006)", () => {
  const handlers: Record<string, CommandHandler> = {};

  beforeAll(() => {
    installOfficeGlobals();
    const office = (globalThis as { Office: { actions: { associate: unknown } } }).Office;
    office.actions.associate = jest.fn((name: string, handler: CommandHandler) => {
      handlers[name] = handler;
    });
    // Import registers the handlers via the associate mock above.
    require("../../src/commands/commands");
  });

  afterAll(() => {
    removeOfficeGlobals();
  });

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("registers the expected commands", () => {
    expect(Object.keys(handlers).sort()).toEqual(
      [
        "applyBlockQuote",
        "applyHeadingI",
        "applyHeadingII",
        "applyHeadingIII",
        "applyHeadingIV",
        "applyHeadingV",
        "applyTemplate",
        "refreshAll",
      ].sort()
    );
  });

  it("records a failing command and still completes the event", async () => {
    setWordRunRejecting("host said no");
    const completed = jest.fn();

    await handlers.applyTemplate({ completed });

    expect(completed).toHaveBeenCalledTimes(1);
    const ring = readRing();
    expect(ring).toHaveLength(1);
    expect(ring[0].name).toBe("Apply Template");
    expect(ring[0].message).toBe("host said no");
    expect(new Date(ring[0].timestamp).toString()).not.toBe("Invalid Date");
  });

  it("records heading failures with the heading level in the name", async () => {
    setWordRunRejecting("cannot format");
    await handlers.applyHeadingIII({ completed: jest.fn() });
    const ring = readRing();
    expect(ring).toHaveLength(1);
    expect(ring[0].name).toBe("Heading 3");
  });

  it("records a block quote failure only when the fallback also fails", async () => {
    setWordRunRejecting("no styles at all");
    const completed = jest.fn();
    await handlers.applyBlockQuote({ completed });

    expect(completed).toHaveBeenCalledTimes(1);
    // Word.run rejected for both the styled path and the fallback → one entry.
    const wordRun = (globalThis as { Word: { run: jest.Mock } }).Word.run;
    expect(wordRun).toHaveBeenCalledTimes(2);
    const ring = readRing();
    expect(ring).toHaveLength(1);
    expect(ring[0].name).toBe("Block Quote");
  });

  it("caps the ring at 5 entries, evicting the oldest", async () => {
    for (let i = 1; i <= 7; i++) {
      setWordRunRejecting(`failure ${i}`);
      await handlers.applyTemplate({ completed: jest.fn() });
    }
    const ring = readRing();
    expect(ring).toHaveLength(5);
    expect(ring.map((e) => e.message)).toEqual([
      "failure 3",
      "failure 4",
      "failure 5",
      "failure 6",
      "failure 7",
    ]);
  });

  it("starts a fresh ring when the stored value is corrupt", async () => {
    window.localStorage.setItem(RING_KEY, "not json");
    setWordRunRejecting("boom");
    await handlers.applyTemplate({ completed: jest.fn() });
    const ring = readRing();
    expect(ring).toHaveLength(1);
    expect(ring[0].message).toBe("boom");
  });

  it("still completes the event when localStorage writes throw", async () => {
    const setItem = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    try {
      setWordRunRejecting("boom");
      const completed = jest.fn();
      await expect(handlers.applyTemplate({ completed })).resolves.toBeUndefined();
      expect(completed).toHaveBeenCalledTimes(1);
    } finally {
      setItem.mockRestore();
    }
  });

  it("does not touch the ring when a command succeeds", async () => {
    // installOfficeGlobals' default Word.run resolves with a mock context.
    installOfficeGlobals();
    await handlers.applyTemplate({ completed: jest.fn() });
    expect(window.localStorage.getItem(RING_KEY)).toBeNull();
  });
});
