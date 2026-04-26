/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Story 17.5 — Source Health Indicator: unit tests.
 */

import {
  checkHealth,
  getHealthStatus,
  getLastError,
  getLastChecked,
  deriveAdapterId,
  markFragile,
  resetHealthState,
} from "../../src/api/sourceHealth";
import type { SourceLookup } from "../../src/api/types";

/** Build a minimal SourceLookup stub. */
function makeAdapter(
  name: string,
  overrides?: {
    healthcheck?: () => Promise<void>;
    search?: (q: string) => Promise<never[]>;
  },
): SourceLookup & { healthcheck?: () => Promise<void> } {
  return {
    name,
    supportedTypes: [],
    search: overrides?.search ?? (async () => []),
    fetch: async () => ({}),
    ...(overrides?.healthcheck ? { healthcheck: overrides.healthcheck } : {}),
  };
}

beforeEach(() => {
  resetHealthState();
});

describe("deriveAdapterId", () => {
  it("lowercases and replaces spaces and dots with hyphens", () => {
    const adapter = makeAdapter("Jade.io");
    expect(deriveAdapterId(adapter)).toBe("jade-io");
  });

  it("handles multi-word names", () => {
    const adapter = makeAdapter("Federal Register of Legislation");
    expect(deriveAdapterId(adapter)).toBe("federal-register-of-legislation");
  });
});

describe("checkHealth", () => {
  it("returns 'healthy' when healthcheck succeeds", async () => {
    const adapter = makeAdapter("TestSource", {
      healthcheck: async () => {},
    });
    const status = await checkHealth(adapter);
    expect(status).toBe("healthy");
  });

  it("records healthy status retrievable via getHealthStatus", async () => {
    const adapter = makeAdapter("TestSource", {
      healthcheck: async () => {},
    });
    await checkHealth(adapter);
    expect(getHealthStatus("testsource")).toBe("healthy");
  });

  it("falls back to search('') when no healthcheck method exists", async () => {
    let searchCalled = false;
    const adapter = makeAdapter("FallbackSource", {
      search: async () => {
        searchCalled = true;
        return [];
      },
    });
    const status = await checkHealth(adapter);
    expect(status).toBe("healthy");
    expect(searchCalled).toBe(true);
  });

  it("returns 'offline' for non-fragile adapter on first failure", async () => {
    const adapter = makeAdapter("StableAPI", {
      healthcheck: async () => {
        throw new Error("connection refused");
      },
    });
    const status = await checkHealth(adapter);
    expect(status).toBe("offline");
  });

  it("returns 'degraded' for fragile adapter on first failure", async () => {
    const adapter = makeAdapter("AustLII", {
      healthcheck: async () => {
        throw new Error("timeout");
      },
    });
    // "austlii" is in the default fragile set
    const status = await checkHealth(adapter);
    expect(status).toBe("degraded");
  });

  it("returns 'offline' for fragile adapter on second consecutive failure", async () => {
    const adapter = makeAdapter("AustLII", {
      healthcheck: async () => {
        throw new Error("timeout");
      },
    });
    await checkHealth(adapter); // first failure -> degraded
    const status = await checkHealth(adapter); // second failure -> offline
    expect(status).toBe("offline");
  });

  it("resets consecutive failures on success", async () => {
    let shouldFail = true;
    const adapter = makeAdapter("AustLII", {
      healthcheck: async () => {
        if (shouldFail) throw new Error("fail");
      },
    });

    await checkHealth(adapter); // degraded
    shouldFail = false;
    await checkHealth(adapter); // healthy

    // Next failure should be degraded again (counter reset)
    shouldFail = true;
    const status = await checkHealth(adapter);
    expect(status).toBe("degraded");
  });

  it("records the error message on failure", async () => {
    const adapter = makeAdapter("SomeAPI", {
      healthcheck: async () => {
        throw new Error("DNS resolution failed");
      },
    });
    await checkHealth(adapter);
    expect(getLastError("someapi")).toBe("DNS resolution failed");
  });

  it("records the timestamp on check", async () => {
    const before = Date.now();
    const adapter = makeAdapter("TimedSource", {
      healthcheck: async () => {},
    });
    await checkHealth(adapter);
    const ts = getLastChecked("timedsource");
    expect(ts).toBeDefined();
    expect(ts!).toBeGreaterThanOrEqual(before);
    expect(ts!).toBeLessThanOrEqual(Date.now());
  });
});

describe("getHealthStatus — unknown adapter", () => {
  it("returns 'healthy' for an adapter that has never been checked", () => {
    expect(getHealthStatus("nonexistent")).toBe("healthy");
  });
});

describe("getLastError — unknown adapter", () => {
  it("returns undefined for an adapter that has never been checked", () => {
    expect(getLastError("nonexistent")).toBeUndefined();
  });
});

describe("getLastChecked — unknown adapter", () => {
  it("returns undefined for an adapter that has never been checked", () => {
    expect(getLastChecked("nonexistent")).toBeUndefined();
  });
});

describe("markFragile", () => {
  it("allows dynamically marking an adapter as fragile", async () => {
    markFragile("custom-scraper");
    const adapter = makeAdapter("Custom Scraper", {
      healthcheck: async () => {
        throw new Error("fail");
      },
    });
    const status = await checkHealth(adapter);
    expect(status).toBe("degraded"); // fragile -> degraded on first failure
  });
});
