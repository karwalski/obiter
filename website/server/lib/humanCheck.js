/**
 * Obiter Website Server — Human verification (ACCT-002: Cloudflare Turnstile)
 *
 * Verifies a Cloudflare Turnstile token via the siteverify endpoint. Follows
 * the hCaptcha skip-if-unconfigured shape at index.js: when TURNSTILE_SECRET is
 * unset (dev / pre-provisioned environments) this passes through (returns true)
 * with a one-time warning so ACCT-001 flows keep working end to end. When the
 * secret IS configured, the call fails closed (returns false) on any error,
 * timeout, or an unsuccessful verification.
 *
 * Contract (do NOT change the signature — ACCT-001 routes call it):
 *   async verifyHuman(token, req) -> boolean
 *     token — the Turnstile response token from the client
 *     req   — the Express request (for the client IP, bound into siteverify)
 *   Returns true if the request is allowed to proceed, false to fail closed.
 *
 * Security: the token and secret are NEVER logged.
 */

"use strict";

const { clientIp } = require("./rateLimit");

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Abort siteverify if Cloudflare does not respond promptly (ms). */
const SITEVERIFY_TIMEOUT_MS = 5000;

/** Emit the skip-if-unconfigured notice only once per process. */
let warnedUnconfigured = false;

async function verifyHuman(token, req) {
  const secret = process.env.TURNSTILE_SECRET || "";

  if (!secret) {
    // Unconfigured (dev / beta pre-provisioning): pass through, warn once.
    if (!warnedUnconfigured) {
      warnedUnconfigured = true;
      console.warn(
        "humanCheck: TURNSTILE_SECRET is not set — human verification is " +
          "disabled (dev passthrough). Set TURNSTILE_SECRET in production."
      );
    }
    return true;
  }

  // Secret configured but no token supplied: fail closed immediately.
  if (!token) return false;

  const params = new URLSearchParams();
  params.set("secret", secret);
  params.set("response", String(token));
  const remoteip = clientIp(req);
  if (remoteip && remoteip !== "unknown") params.set("remoteip", remoteip);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SITEVERIFY_TIMEOUT_MS);
  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal: controller.signal,
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data && data.success === true;
  } catch {
    // Network error, timeout/abort, or malformed response: fail closed.
    return false;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { verifyHuman };
