/**
 * Obiter Website Server — Session auth middleware (ACCT-001)
 *
 * Verifies a bearer access token and attaches req.user = { sub, role }.
 * Bearer header ONLY — a token is NEVER read from a query parameter (that was a
 * leak vector in the legacy static-token admin auth). Later stories reuse this
 * (e.g. ACCT-004 vault/settings, ADM-001 admin auth via requireRole).
 */

"use strict";

const tokens = require("./tokens");

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required." });
  }
  const claims = tokens.verifyAccess(header.slice(7));
  if (!claims) {
    return res.status(401).json({ error: "Authentication required." });
  }
  req.user = claims;
  next();
}

/**
 * Factory that additionally requires a specific role (e.g. "admin"). Used by
 * ADM-001 to migrate off the static ADMIN_TOKEN.
 */
function requireRole(role) {
  return function requireRoleMiddleware(req, res, next) {
    requireAuth(req, res, function () {
      if (req.user.role !== role) {
        return res.status(403).json({ error: "Insufficient privileges." });
      }
      next();
    });
  };
}

module.exports = { requireAuth, requireRole };
