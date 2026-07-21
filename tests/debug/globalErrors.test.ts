/**
 * @jest-environment jsdom
 *
 * SAFE-006 — global error surfacing: signature/dedup helpers, the
 * ribbon-command error ring drain, and the installed window handlers.
 */

import {
  errorSignature,
  createErrorDeduper,
  describeError,
  drainCommandErrors,
  installGlobalErrorHandlers,
  GLOBAL_ERROR_EVENT,
  COMMAND_ERROR_STORAGE_KEY,
  ANNOUNCE_WINDOW_MS,
  type GlobalErrorDetail,
} from "../../src/debug/globalErrors";
import { enableDebug, disableDebug, clearLogHistory, getLogHistory } from "../../src/debug/logger";

describe("errorSignature", () => {
  it("is stable for identical input", () => {
    expect(errorSignature("boom", "app.js")).toBe(errorSignature("boom", "app.js"));
  });

  it("is 8 hex digits", () => {
    expect(errorSignature("boom", "app.js")).toMatch(/^[0-9a-f]{8}$/);
    expect(errorSignature("", "")).toMatch(/^[0-9a-f]{8}$/);
  });

  it("differs by message and by source", () => {
    const base = errorSignature("boom", "app.js");
    expect(errorSignature("crash", "app.js")).not.toBe(base);
    expect(errorSignature("boom", "other.js")).not.toBe(base);
  });
});

describe("createErrorDeduper", () => {
  it("accepts the first occurrence and rejects repeats within the window", () => {
    let now = 1_000_000;
    const shouldAnnounce = createErrorDeduper(60_000, () => now);
    expect(shouldAnnounce("sig-a")).toBe(true);
    expect(shouldAnnounce("sig-a")).toBe(false);
    now += 59_999;
    expect(shouldAnnounce("sig-a")).toBe(false);
  });

  it("accepts the same signature again after the window elapses", () => {
    let now = 1_000_000;
    const shouldAnnounce = createErrorDeduper(60_000, () => now);
    expect(shouldAnnounce("sig-a")).toBe(true);
    now += 60_000;
    expect(shouldAnnounce("sig-a")).toBe(true);
    expect(shouldAnnounce("sig-a")).toBe(false);
  });

  it("tracks signatures independently", () => {
    const now = 1_000_000;
    const shouldAnnounce = createErrorDeduper(60_000, () => now);
    expect(shouldAnnounce("sig-a")).toBe(true);
    expect(shouldAnnounce("sig-b")).toBe(true);
    expect(shouldAnnounce("sig-a")).toBe(false);
  });

  it("defaults to the announce window constant", () => {
    expect(ANNOUNCE_WINDOW_MS).toBe(60_000);
  });
});

describe("describeError", () => {
  it("uses message and stack from Error instances", () => {
    const err = new Error("kaput");
    const described = describeError(err);
    expect(described.message).toBe("kaput");
    expect(described.stack).toBe(err.stack);
  });

  it("passes strings through", () => {
    expect(describeError("plain failure").message).toBe("plain failure");
  });

  it("serialises objects and falls back on unserialisable values", () => {
    expect(describeError({ code: 7 }).message).toBe('{"code":7}');
    expect(describeError(undefined).message).toBe("Unknown error");
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(describeError(circular).message).toBe("Unknown error");
  });
});

describe("drainCommandErrors", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns entries oldest-first and clears the ring", () => {
    const entries = [
      { name: "Apply Template", message: "one", timestamp: "2026-07-21T00:00:00.000Z" },
      { name: "Heading 2", message: "two", timestamp: "2026-07-21T00:00:01.000Z" },
    ];
    window.localStorage.setItem(COMMAND_ERROR_STORAGE_KEY, JSON.stringify(entries));
    expect(drainCommandErrors()).toEqual(entries);
    expect(window.localStorage.getItem(COMMAND_ERROR_STORAGE_KEY)).toBeNull();
    expect(drainCommandErrors()).toEqual([]);
  });

  it("returns an empty list when the key is absent", () => {
    expect(drainCommandErrors()).toEqual([]);
  });

  it("discards malformed JSON and non-array payloads", () => {
    window.localStorage.setItem(COMMAND_ERROR_STORAGE_KEY, "not json");
    expect(drainCommandErrors()).toEqual([]);
    window.localStorage.setItem(COMMAND_ERROR_STORAGE_KEY, '{"name":"x"}');
    expect(drainCommandErrors()).toEqual([]);
  });

  it("filters entries missing required fields", () => {
    window.localStorage.setItem(
      COMMAND_ERROR_STORAGE_KEY,
      JSON.stringify([
        { name: "Good", message: "ok", timestamp: "t" },
        { name: "Bad" },
        "junk",
        null,
      ])
    );
    const drained = drainCommandErrors();
    expect(drained).toHaveLength(1);
    expect(drained[0].name).toBe("Good");
  });

  it("returns an empty list when storage access throws", () => {
    const throwing = {
      getItem: (): string | null => {
        throw new Error("storage disabled");
      },
      removeItem: (): void => {
        throw new Error("storage disabled");
      },
    };
    expect(drainCommandErrors(throwing)).toEqual([]);
  });
});

describe("installGlobalErrorHandlers", () => {
  const received: GlobalErrorDetail[] = [];
  const listener = (event: Event): void => {
    received.push((event as CustomEvent<GlobalErrorDetail>).detail);
  };

  beforeAll(() => {
    installGlobalErrorHandlers();
    // Second call must be a no-op — a duplicate install would double-announce.
    installGlobalErrorHandlers();
    window.addEventListener(GLOBAL_ERROR_EVENT, listener);
  });

  afterAll(() => {
    window.removeEventListener(GLOBAL_ERROR_EVENT, listener);
    disableDebug();
  });

  beforeEach(() => {
    received.length = 0;
    enableDebug();
    clearLogHistory();
  });

  function fireRejection(reason: unknown): void {
    const event = new Event("unhandledrejection") as Event & { reason: unknown };
    event.reason = reason;
    window.dispatchEvent(event);
  }

  it("announces an unhandled rejection once per signature but logs every occurrence", () => {
    fireRejection(new Error("rejection-dedup-case"));
    fireRejection(new Error("rejection-dedup-case"));

    expect(received).toHaveLength(1);
    expect(received[0].message).toBe("rejection-dedup-case");
    expect(received[0].kind).toBe("unhandledrejection");

    const logged = getLogHistory().filter((e) => e.message === "Unhandled promise rejection");
    expect(logged).toHaveLength(2);
    expect(logged.every((e) => e.level === "error")).toBe(true);
  });

  it("announces distinct rejection signatures separately", () => {
    fireRejection(new Error("rejection-first"));
    fireRejection(new Error("rejection-second"));
    expect(received.map((d) => d.message)).toEqual(["rejection-first", "rejection-second"]);
  });

  it("wires window.onerror into the logger and announcement event", () => {
    expect(typeof window.onerror).toBe("function");
    const result = window.onerror?.call(
      window,
      "onerror-case",
      "bundle.js",
      10,
      2,
      new Error("onerror-case")
    );
    expect(result).toBe(false);

    expect(received).toHaveLength(1);
    expect(received[0].message).toBe("onerror-case");
    expect(received[0].kind).toBe("error");

    const logged = getLogHistory().filter((e) => e.message === "Unhandled error");
    expect(logged).toHaveLength(1);
    expect(logged[0].level).toBe("error");
  });
});
