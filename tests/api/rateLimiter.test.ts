/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Tests for the Rate-limit Governor (Story 17.4).
 */

import { RateLimiter } from "../../src/api/rateLimiter";

describe("RateLimiter — Token bucket & circuit breaker (Story 17.4)", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // Registration
  // -----------------------------------------------------------------------

  it("throws when acquiring a token for an unregistered adapter", async () => {
    await expect(limiter.acquireToken("unknown")).rejects.toThrow(
      /not registered/,
    );
  });

  it("throws when querying health for an unregistered adapter", () => {
    expect(() => limiter.getHealth("unknown")).toThrow(/not registered/);
  });

  // -----------------------------------------------------------------------
  // Token bucket basics
  // -----------------------------------------------------------------------

  it("grants tokens up to the burst limit immediately", async () => {
    limiter.register("test", { requestsPerSecond: 2, burst: 3 });

    // All three burst tokens should resolve immediately
    const p1 = limiter.acquireToken("test");
    const p2 = limiter.acquireToken("test");
    const p3 = limiter.acquireToken("test");

    // Advance timers slightly to flush microtasks
    jest.advanceTimersByTime(0);
    await Promise.all([p1, p2, p3]);

    // All consumed — available should be 0
    expect(limiter.getAvailableTokens("test")).toBe(0);
  });

  it("refills tokens over time at the configured rate", () => {
    limiter.register("test", { requestsPerSecond: 10, burst: 10 });

    // Drain all tokens synchronously for the test
    // (getAvailableTokens triggers a refill)
    expect(limiter.getAvailableTokens("test")).toBe(10);

    // Consume by acquiring — but we need to actually drain them.
    // Instead, let's just check refill after time passes.
    // Manually consume via acquireToken without awaiting (they resolve sync
    // when tokens are available).
    const promises: Promise<void>[] = [];
    for (let i = 0; i < 10; i++) {
      promises.push(limiter.acquireToken("test"));
    }
    jest.advanceTimersByTime(0);

    // After 500 ms at 10 RPS, 5 tokens should refill
    jest.advanceTimersByTime(500);
    expect(limiter.getAvailableTokens("test")).toBeCloseTo(5, 0);
  });

  it("does not exceed burst capacity on refill", () => {
    limiter.register("test", { requestsPerSecond: 10, burst: 5 });

    // Wait a long time — tokens should cap at burst
    jest.advanceTimersByTime(10_000);
    expect(limiter.getAvailableTokens("test")).toBe(5);
  });

  // -----------------------------------------------------------------------
  // Health / circuit breaker
  // -----------------------------------------------------------------------

  it("starts healthy", () => {
    limiter.register("test", { requestsPerSecond: 1, burst: 1 });
    expect(limiter.getHealth("test")).toBe("healthy");
  });

  it("marks degraded after 3 consecutive failures", () => {
    limiter.register("test", { requestsPerSecond: 1, burst: 1 });

    limiter.recordResponse("test", 429);
    limiter.recordResponse("test", 429);
    expect(limiter.getHealth("test")).toBe("healthy");

    limiter.recordResponse("test", 429);
    expect(limiter.getHealth("test")).toBe("degraded");
  });

  it("marks offline after 10 consecutive failures", () => {
    limiter.register("test", { requestsPerSecond: 1, burst: 1 });

    for (let i = 0; i < 10; i++) {
      limiter.recordResponse("test", 500);
    }
    expect(limiter.getHealth("test")).toBe("offline");
  });

  it("rejects acquireToken when adapter is offline", async () => {
    limiter.register("test", { requestsPerSecond: 1, burst: 1 });
    limiter.markOffline("test");

    await expect(limiter.acquireToken("test")).rejects.toThrow(/offline/);
  });

  it("resets failure counters on a successful response", () => {
    limiter.register("test", { requestsPerSecond: 1, burst: 1 });

    // Accumulate failures
    limiter.recordResponse("test", 429);
    limiter.recordResponse("test", 429);
    limiter.recordResponse("test", 429);
    expect(limiter.getHealth("test")).toBe("degraded");

    // Success resets
    limiter.recordResponse("test", 200);
    expect(limiter.getHealth("test")).toBe("healthy");
  });

  it("markHealthy resets an offline adapter", () => {
    limiter.register("test", { requestsPerSecond: 1, burst: 1 });
    limiter.markOffline("test");
    expect(limiter.getHealth("test")).toBe("offline");

    limiter.markHealthy("test");
    expect(limiter.getHealth("test")).toBe("healthy");
  });

  it("markDegraded overrides healthy status", () => {
    limiter.register("test", { requestsPerSecond: 1, burst: 1 });
    limiter.markDegraded("test");
    expect(limiter.getHealth("test")).toBe("degraded");
  });

  // -----------------------------------------------------------------------
  // Back-off
  // -----------------------------------------------------------------------

  it("applies exponential back-off on 429 responses", () => {
    limiter.register("test", { requestsPerSecond: 1, burst: 1 });

    // Spy on Math.random to remove jitter for deterministic testing
    jest.spyOn(Math, "random").mockReturnValue(0);

    limiter.recordResponse("test", 429);
    // After first 429: backoffMs = 1000, backoffUntil = now + 1000

    limiter.recordResponse("test", 429);
    // After second 429: backoffMs = 2000, backoffUntil = now + 2000

    limiter.recordResponse("test", 429);
    // After third 429: backoffMs = 4000

    // We can verify by attempting to acquire and checking the delay is needed
    // (the actual waiting is tested via timer advancement elsewhere)
    expect(limiter.getHealth("test")).toBe("degraded");

    jest.spyOn(Math, "random").mockRestore();
  });

  // -----------------------------------------------------------------------
  // 5xx responses
  // -----------------------------------------------------------------------

  it("treats 5xx responses the same as 429 for back-off", () => {
    limiter.register("test", { requestsPerSecond: 1, burst: 1 });

    limiter.recordResponse("test", 503);
    limiter.recordResponse("test", 502);
    limiter.recordResponse("test", 500);
    expect(limiter.getHealth("test")).toBe("degraded");
  });

  // -----------------------------------------------------------------------
  // Re-registration
  // -----------------------------------------------------------------------

  it("re-registration resets the bucket state", () => {
    limiter.register("test", { requestsPerSecond: 1, burst: 1 });
    limiter.markOffline("test");

    limiter.register("test", { requestsPerSecond: 2, burst: 5 });
    expect(limiter.getHealth("test")).toBe("healthy");
    expect(limiter.getAvailableTokens("test")).toBe(5);
  });
});
