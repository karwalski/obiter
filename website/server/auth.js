/**
 * Obiter Website Server — Admin Authentication
 *
 * Simple bearer token authentication via the ADMIN_TOKEN environment variable.
 * Supports both Authorization header and query parameter for flexibility.
 *
 * Environment variables:
 *   ADMIN_TOKEN=<random secure token for admin access>
 */

"use strict";

/**
 * Express middleware that requires a valid admin token.
 *
 * Accepts the token via:
 *   - Authorization: Bearer <token>
 *   - Query parameter: ?token=<token>
 *
 * Returns 401 if no token is provided, 403 if the token is invalid.
 */
function requireAdmin(req, res, next) {
  var adminToken = process.env.ADMIN_TOKEN;

  if (!adminToken) {
    console.error("ADMIN_TOKEN environment variable is not set.");
    return res.status(500).json({ error: "Server misconfigured." });
  }

  var provided = null;

  // Check Authorization header first
  var authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    provided = authHeader.slice(7);
  }

  // Fall back to query parameter
  if (!provided && req.query.token) {
    provided = req.query.token;
  }

  if (!provided) {
    return res.status(401).json({ error: "Authentication required." });
  }

  if (provided !== adminToken) {
    return res.status(403).json({ error: "Invalid credentials." });
  }

  next();
}

module.exports = { requireAdmin };
