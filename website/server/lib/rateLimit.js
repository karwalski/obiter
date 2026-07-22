/**
 * Obiter Website Server — Rate limiting (ACCT-001)
 *
 * In-memory sliding-window limiter keyed by ip+action. Hand-rolled with no
 * dependency, matching the existing PROXY_RATE_LIMIT_MS style in index.js and
 * keeping the server's dependency surface minimal.
 *
 * NOTE (documented, acceptable per ACCT-001): the server is a single-process
 * screen session. Counters live in process memory, so a restart resets them.
 * At this scale that is acceptable; if the server is ever clustered, swap the
 * store for a shared one (Redis) without changing the middleware contract.
 *
 * Presets:
 *   authStrict — 5 requests per hour (register / login / reset).
 * Helpers:
 *   progressiveDelayMs(count) — increasing delay as attempts accumulate.
 *   middleware(action, preset) — Express middleware factory returning 429 when
 *   the window is exhausted.
 */

"use strict";

// action -> Map(key -> number[] of request timestamps within the window)
const buckets = new Map();

const PRESETS = {
  authStrict: { limit: 5, windowMs: 60 * 60 * 1000 },
};

/**
 * Record a hit and report whether it is allowed under the sliding window.
 * Returns { allowed, remaining, retryAfterMs, count }.
 */
function hit(action, key, preset) {
  const cfg = typeof preset === "object" ? preset : PRESETS[preset] || PRESETS.authStrict;
  const now = Date.now();
  const windowStart = now - cfg.windowMs;

  let actionBucket = buckets.get(action);
  if (!actionBucket) {
    actionBucket = new Map();
    buckets.set(action, actionBucket);
  }

  const hits = (actionBucket.get(key) || []).filter((t) => t > windowStart);

  if (hits.length >= cfg.limit) {
    const retryAfterMs = hits[0] + cfg.windowMs - now;
    actionBucket.set(key, hits);
    return { allowed: false, remaining: 0, retryAfterMs, count: hits.length };
  }

  hits.push(now);
  actionBucket.set(key, hits);
  return {
    allowed: true,
    remaining: cfg.limit - hits.length,
    retryAfterMs: 0,
    count: hits.length,
  };
}

/**
 * Progressive delay (ms) applied before responding, scaling with the number of
 * recent attempts. Caps at 5s so a slow client is not held open indefinitely.
 */
function progressiveDelayMs(count) {
  if (count <= 1) return 0;
  return Math.min(5000, (count - 1) * 500);
}

/**
 * Client IP resolution. Trusts X-Forwarded-For's first hop (nginx sits in
 * front on the Lightsail host) and falls back to the socket address.
 */
function clientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff) return String(xff).split(",")[0].trim();
  return req.ip || (req.socket && req.socket.remoteAddress) || "unknown";
}

/**
 * Express middleware factory. On exhaustion responds 429 with a generic message
 * and Retry-After. Otherwise applies the progressive delay then calls next().
 */
function middleware(action, preset) {
  return function rateLimitMiddleware(req, res, next) {
    const key = clientIp(req);
    const result = hit(action, key, preset);
    if (!result.allowed) {
      const retrySec = Math.ceil(result.retryAfterMs / 1000);
      res.set("Retry-After", String(retrySec));
      return res.status(429).json({ error: "Too many requests. Please try again later." });
    }
    const delay = progressiveDelayMs(result.count);
    if (delay > 0) {
      setTimeout(next, delay);
    } else {
      next();
    }
  };
}

/** Test-only: clear all counters. */
function _reset() {
  buckets.clear();
}

module.exports = {
  PRESETS,
  hit,
  progressiveDelayMs,
  clientIp,
  middleware,
  _reset,
};
