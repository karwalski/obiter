/**
 * Obiter Website Server — Admin Authentication (ADM-001)
 *
 * Admin is now a ROLE on a normal account (ACCT-001/003) with mandatory MFA, not
 * a shared static token. `requireAdmin` accepts a valid account access token whose
 * embedded role is "admin", and rejects the account if it is no longer active
 * (locked/suspended/deleted) even when the token itself still verifies.
 *
 * Legacy compatibility (one-release overlap):
 *   While ADMIN_TOKEN_SUNSET is NOT set, the legacy static ADMIN_TOKEN is still
 *   accepted, but ONLY via the Authorization: Bearer header. The `?token=` query
 *   parameter path has been removed entirely (it was a leak vector). Once
 *   ADMIN_TOKEN_SUNSET is set to any value, the static token is rejected and
 *   account auth is the only path.
 *
 * Full per-action audit of every /api/admin/* call is ADM-003's scope. Here we
 * audit at the auth layer (login/authorised access) with a throttle so repeated
 * dashboard polling does not spam the audit log, and rate-limit auth failures.
 *
 * Environment variables:
 *   ADMIN_TOKEN         legacy static token (accepted until sunset, header only)
 *   ADMIN_TOKEN_SUNSET  when set, the legacy static token is refused
 */

"use strict";

const crypto = require("crypto");
const tokens = require("./lib/tokens");
const db = require("./db");
const audit = require("./lib/audit");
const rateLimit = require("./lib/rateLimit");

// Throttle successful-access audit rows: at most one per (actor, ip) per window
// so the dashboard's periodic polling does not flood audit_log. Failures are not
// throttled (they matter individually).
const ACCESS_AUDIT_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes
const lastAccessAudit = new Map(); // key -> timestamp

function shouldAuditAccess(key) {
  const now = Date.now();
  const prev = lastAccessAudit.get(key) || 0;
  if (now - prev < ACCESS_AUDIT_THROTTLE_MS) return false;
  lastAccessAudit.set(key, now);
  return true;
}

/**
 * Timing-safe string comparison for the legacy static token.
 */
function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * Express middleware that authorises an admin.
 *
 * Accepts, in order:
 *   1. An account access token (role === "admin") whose account is still active.
 *   2. (Until ADMIN_TOKEN_SUNSET is set) the legacy static ADMIN_TOKEN.
 *
 * Both are read ONLY from the Authorization: Bearer header. The query parameter
 * is never consulted. Returns 401 when no/invalid credentials are presented.
 */
function requireAdmin(req, res, next) {
  const ip = rateLimit.clientIp(req);
  const header = req.headers.authorization;

  const bearer = header && header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!bearer) {
    return res.status(401).json({ error: "Authentication required." });
  }

  const sunset = !!process.env.ADMIN_TOKEN_SUNSET;
  const staticToken = process.env.ADMIN_TOKEN;

  // ---- 1. Account access token (the real path) --------------------------
  const claims = tokens.verifyAccess(bearer);
  if (claims) {
    if (claims.role !== "admin") {
      recordFailure(req, ip, claims.sub, "admin.auth.not_admin");
      return res.status(403).json({ error: "Insufficient privileges." });
    }
    // Reject a token whose account is no longer active (locked/deleted), even
    // though the 15-min token still verifies cryptographically.
    const user = db.findUserById.get(claims.sub);
    if (!user || user.status !== "active") {
      recordFailure(req, ip, claims.sub, "admin.auth.inactive");
      return res.status(403).json({ error: "Insufficient privileges." });
    }
    req.user = claims;
    req.adminId = claims.sub;
    if (shouldAuditAccess("acct:" + claims.sub + ":" + ip)) {
      audit.record(claims.sub, String(claims.sub), "admin.auth.access", req, null);
    }
    return next();
  }

  // ---- 2. Legacy static token (Authorization header only, pre-sunset) ----
  if (!sunset && staticToken && safeEqual(bearer, staticToken)) {
    req.user = { sub: "legacy-admin-token", role: "admin" };
    req.adminId = "legacy-admin-token";
    if (shouldAuditAccess("legacy:" + ip)) {
      audit.record(null, "legacy-admin-token", "admin.auth.legacy_token", req, null);
    }
    return next();
  }

  // ---- Rejected -----------------------------------------------------------
  recordFailure(req, ip, null, sunset ? "admin.auth.fail" : "admin.auth.fail_or_sunset");
  return res.status(401).json({ error: "Authentication required." });
}

/**
 * Record and rate-limit an admin auth failure. The rate limiter is advisory
 * here (we still return 401, not 429, for a bad admin credential) but keeps the
 * per-ip failure count so brute-force attempts are visible/limited alongside the
 * account-auth limiters. Audit is always written for a failure.
 */
function recordFailure(req, ip, userId, action) {
  rateLimit.hit("admin.auth.fail", ip, "authStrict");
  audit.record(userId, "self", action, req, null);
}

module.exports = { requireAdmin };
