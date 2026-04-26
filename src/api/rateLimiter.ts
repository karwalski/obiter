/**
 * Rate-limit Governor (Story 17.4)
 *
 * Token-bucket rate limiter with per-adapter state, exponential back-off
 * with jitter on 429 responses, and a simple circuit breaker that tracks
 * adapter health.
 *
 * Usage:
 *   const limiter = new RateLimiter();
 *   limiter.register("austlii", { requestsPerSecond: 2, burst: 5 });
 *   await limiter.acquireToken("austlii");
 *   // … make request …
 *   limiter.recordResponse("austlii", 200);
 */

import type { AdapterHealth } from "./sourceAdapter";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BucketConfig {
  /** Sustained requests per second. */
  requestsPerSecond: number;
  /** Maximum burst size (token bucket capacity). */
  burst: number;
}

interface BucketState {
  config: BucketConfig;
  tokens: number;
  lastRefill: number;
  health: AdapterHealth;
  /** Current back-off delay in ms (doubles on each consecutive 429). */
  backoffMs: number;
  /** Timestamp (ms) when the back-off expires and requests may resume. */
  backoffUntil: number;
  /** Number of consecutive 429 / error responses. */
  consecutiveFailures: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Initial back-off delay after a 429 response (ms). */
const INITIAL_BACKOFF_MS = 1_000;

/** Maximum back-off delay (ms). */
const MAX_BACKOFF_MS = 60_000;

/** After this many consecutive failures, mark adapter as offline. */
const OFFLINE_THRESHOLD = 10;

/** After this many consecutive failures (but below offline), mark degraded. */
const DEGRADED_THRESHOLD = 3;

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export class RateLimiter {
  private buckets = new Map<string, BucketState>();

  /**
   * Register (or re-register) an adapter with the given rate-limit config.
   * Safe to call multiple times; re-registering resets the bucket.
   */
  register(adapterId: string, config: BucketConfig): void {
    this.buckets.set(adapterId, {
      config,
      tokens: config.burst,
      lastRefill: Date.now(),
      health: "healthy",
      backoffMs: 0,
      backoffUntil: 0,
      consecutiveFailures: 0,
    });
  }

  /**
   * Wait until a token is available for the given adapter, then consume it.
   *
   * If the adapter is in back-off, the returned promise resolves only after
   * the back-off period (plus jitter) elapses. If the adapter is offline,
   * the promise rejects immediately.
   */
  async acquireToken(adapterId: string): Promise<void> {
    const bucket = this.getBucket(adapterId);

    if (bucket.health === "offline") {
      throw new Error(
        `Adapter "${adapterId}" is offline — circuit breaker open`,
      );
    }

    // Honour back-off
    const now = Date.now();
    if (now < bucket.backoffUntil) {
      const waitMs = bucket.backoffUntil - now;
      await this.sleep(waitMs);
    }

    // Refill tokens
    this.refill(bucket);

    // Wait for a token if the bucket is empty
    while (bucket.tokens < 1) {
      const waitMs = (1 / bucket.config.requestsPerSecond) * 1_000;
      await this.sleep(waitMs);
      this.refill(bucket);
    }

    bucket.tokens -= 1;
  }

  /**
   * Record an HTTP response status so the limiter can apply back-off on
   * 429 / 5xx responses and reset back-off on success.
   */
  recordResponse(adapterId: string, statusCode: number): void {
    const bucket = this.getBucket(adapterId);

    if (statusCode === 429 || statusCode >= 500) {
      bucket.consecutiveFailures += 1;
      this.applyBackoff(bucket);
      this.updateHealth(bucket);
    } else {
      bucket.consecutiveFailures = 0;
      bucket.backoffMs = 0;
      bucket.backoffUntil = 0;

      if (bucket.health === "degraded") {
        bucket.health = "healthy";
      }
    }
  }

  /**
   * Manually mark an adapter as degraded (e.g. after a health-check).
   * Degraded adapters are still usable but the orchestrator may prefer
   * healthier alternatives.
   */
  markDegraded(adapterId: string): void {
    const bucket = this.getBucket(adapterId);
    bucket.health = "degraded";
  }

  /**
   * Manually mark an adapter as healthy, resetting failure counters.
   */
  markHealthy(adapterId: string): void {
    const bucket = this.getBucket(adapterId);
    bucket.health = "healthy";
    bucket.consecutiveFailures = 0;
    bucket.backoffMs = 0;
    bucket.backoffUntil = 0;
  }

  /**
   * Manually mark an adapter as offline, opening the circuit breaker.
   */
  markOffline(adapterId: string): void {
    const bucket = this.getBucket(adapterId);
    bucket.health = "offline";
  }

  /** Get the current health status of an adapter. */
  getHealth(adapterId: string): AdapterHealth {
    return this.getBucket(adapterId).health;
  }

  /** Get the number of tokens currently available (useful for diagnostics). */
  getAvailableTokens(adapterId: string): number {
    const bucket = this.getBucket(adapterId);
    this.refill(bucket);
    return Math.floor(bucket.tokens);
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  private getBucket(adapterId: string): BucketState {
    const bucket = this.buckets.get(adapterId);
    if (!bucket) {
      throw new Error(
        `Adapter "${adapterId}" is not registered with the rate limiter`,
      );
    }
    return bucket;
  }

  /** Refill tokens based on elapsed time since last refill. */
  private refill(bucket: BucketState): void {
    const now = Date.now();
    const elapsed = (now - bucket.lastRefill) / 1_000; // seconds
    const newTokens = elapsed * bucket.config.requestsPerSecond;
    bucket.tokens = Math.min(bucket.config.burst, bucket.tokens + newTokens);
    bucket.lastRefill = now;
  }

  /** Apply exponential back-off with jitter. */
  private applyBackoff(bucket: BucketState): void {
    if (bucket.backoffMs === 0) {
      bucket.backoffMs = INITIAL_BACKOFF_MS;
    } else {
      bucket.backoffMs = Math.min(bucket.backoffMs * 2, MAX_BACKOFF_MS);
    }

    // Add up to 25 % jitter
    const jitter = bucket.backoffMs * 0.25 * Math.random();
    bucket.backoffUntil = Date.now() + bucket.backoffMs + jitter;
  }

  /** Promote health status based on consecutive failures. */
  private updateHealth(bucket: BucketState): void {
    if (bucket.consecutiveFailures >= OFFLINE_THRESHOLD) {
      bucket.health = "offline";
    } else if (bucket.consecutiveFailures >= DEGRADED_THRESHOLD) {
      bucket.health = "degraded";
    }
  }

  /** Promise-based sleep helper. */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
