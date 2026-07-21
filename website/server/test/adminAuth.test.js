/**
 * Obiter Website Server — Admin auth migration tests (ADM-001)
 *
 * Run with: npm test  (node --test test/)
 *
 * Covers requireAdmin's new behaviour against an existing /api/admin/* route
 * (GET /api/admin/signatures):
 *   - a non-admin (role=user) access token is rejected (403)
 *   - an admin-role access token on an active account is accepted (200)
 *   - the legacy static ADMIN_TOKEN via the Authorization header works while
 *     ADMIN_TOKEN_SUNSET is unset, and is rejected once it is set
 *   - a token supplied via ?token= query param is NEVER accepted (401), even
 *     when its value would otherwise be valid
 *   - a valid admin token for a non-active account (locked/deleted) is rejected
 */

"use strict";

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const h = require("./helpers");
const tokens = require("../lib/tokens");

const ADMIN_ROUTE = "/api/admin/signatures";

let base;

before(async () => {
  ({ base } = await h.startServer());
});

after(async () => {
  await h.stopServer();
  h.cleanupDb();
  delete process.env.ADMIN_TOKEN;
  delete process.env.ADMIN_TOKEN_SUNSET;
});

beforeEach(() => {
  h.resetRateLimit();
  delete process.env.ADMIN_TOKEN_SUNSET;
});

// Insert a user row directly and return its id.
function seedUser(email, role, status) {
  const info = h.db.db
    .prepare(
      "INSERT INTO users (email, password_hash, role, status, email_verified_at) " +
        "VALUES (?, ?, ?, ?, datetime('now'))"
    )
    .run(email, "x", role, status || "active");
  return info.lastInsertRowid;
}

function bearer(token) {
  return { Authorization: "Bearer " + token };
}

test("non-admin access token is rejected", async () => {
  const id = seedUser("user1@example.com", "user", "active");
  const tok = tokens.issueAccessToken(id, "user");
  const res = await h.api(base, "GET", ADMIN_ROUTE, undefined, bearer(tok));
  assert.equal(res.status, 403);
});

test("admin-role access token on an active account is accepted", async () => {
  const id = seedUser("admin1@example.com", "admin", "active");
  const tok = tokens.issueAccessToken(id, "admin");
  const res = await h.api(base, "GET", ADMIN_ROUTE, undefined, bearer(tok));
  assert.equal(res.status, 200);
});

test("legacy static ADMIN_TOKEN via header works before sunset, rejected after", async () => {
  process.env.ADMIN_TOKEN = "legacy-secret-token";

  // Pre-sunset: accepted via the Authorization header.
  delete process.env.ADMIN_TOKEN_SUNSET;
  let res = await h.api(base, "GET", ADMIN_ROUTE, undefined, bearer("legacy-secret-token"));
  assert.equal(res.status, 200);

  // Post-sunset: rejected.
  process.env.ADMIN_TOKEN_SUNSET = "1";
  res = await h.api(base, "GET", ADMIN_ROUTE, undefined, bearer("legacy-secret-token"));
  assert.equal(res.status, 401);

  delete process.env.ADMIN_TOKEN;
  delete process.env.ADMIN_TOKEN_SUNSET;
});

test("?token= query param is never accepted, even with the right value", async () => {
  process.env.ADMIN_TOKEN = "legacy-secret-token";
  delete process.env.ADMIN_TOKEN_SUNSET;

  // Legacy static token as a query param -> rejected (401, no header supplied).
  let res = await h.api(base, "GET", ADMIN_ROUTE + "?token=legacy-secret-token");
  assert.equal(res.status, 401);

  // A valid admin access token as a query param -> also rejected.
  const id = seedUser("admin2@example.com", "admin", "active");
  const tok = tokens.issueAccessToken(id, "admin");
  res = await h.api(base, "GET", ADMIN_ROUTE + "?token=" + encodeURIComponent(tok));
  assert.equal(res.status, 401);

  delete process.env.ADMIN_TOKEN;
});

test("a valid admin token for a non-active account is rejected", async () => {
  const lockedId = seedUser("admin3@example.com", "admin", "locked");
  const lockedTok = tokens.issueAccessToken(lockedId, "admin");
  let res = await h.api(base, "GET", ADMIN_ROUTE, undefined, bearer(lockedTok));
  assert.equal(res.status, 403);

  // A token for an account that no longer exists is likewise rejected.
  const goneTok = tokens.issueAccessToken(999999, "admin");
  res = await h.api(base, "GET", ADMIN_ROUTE, undefined, bearer(goneTok));
  assert.equal(res.status, 403);
});
