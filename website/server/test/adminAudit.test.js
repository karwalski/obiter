/**
 * Obiter Website Server — Admin audit viewer tests (ADM-003)
 *
 * Run with: npm test  (node --test test/)
 *
 * Covers /api/admin/audit and /api/admin/audit/summary:
 *   - filters (user, action, from/to) and pagination narrow the result set
 *   - security-summary counts are correct on seeded audit rows
 *   - the retention delete statement prunes rows older than the cutoff
 *   - non-admin token is rejected (403)
 */

"use strict";

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const h = require("./helpers");
const tokens = require("../lib/tokens");
const db = require("../db");

let base;
let adminToken;

before(async () => {
  ({ base } = await h.startServer());
  const info = db.db
    .prepare(
      "INSERT INTO users (email, password_hash, role, status, email_verified_at) " +
        "VALUES ('admin-audit@example.com', 'x', 'admin', 'active', datetime('now'))"
    )
    .run();
  adminToken = tokens.issueAccessToken(info.lastInsertRowid, "admin");
});

after(async () => {
  await h.stopServer();
  h.cleanupDb();
});

beforeEach(() => {
  h.resetRateLimit();
});

function bearer(token) {
  return { Authorization: "Bearer " + token };
}

// Insert an audit row directly at a given created_at.
function seedAudit(userId, actor, action, createdAt, detail) {
  db.db
    .prepare(
      "INSERT INTO audit_log (user_id, actor, action, ip_hash, detail, created_at) VALUES (?, ?, ?, NULL, ?, ?)"
    )
    .run(userId, actor, action, detail || null, createdAt);
}

function isoAgo(ms) {
  return new Date(Date.now() - ms).toISOString();
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

test("filters and pagination narrow the audit result set", async () => {
  const U1 = 100001;
  const U2 = 100002;
  seedAudit(U1, "self", "auth.login.success", isoAgo(2 * HOUR));
  seedAudit(U1, "self", "auth.login.fail", isoAgo(1 * HOUR));
  seedAudit(U2, "self", "auth.login.success", isoAgo(3 * HOUR));

  // Filter by user.
  const byUser = await h.api(base, "GET", "/api/admin/audit?user=" + U1 + "&limit=100", undefined, bearer(adminToken));
  assert.equal(byUser.status, 200);
  assert.ok(byUser.body.entries.every((e) => e.userId === U1));
  assert.ok(byUser.body.entries.length >= 2);

  // Filter by action.
  const byAction = await h.api(base, "GET", "/api/admin/audit?action=auth.login.fail&limit=100", undefined, bearer(adminToken));
  assert.ok(byAction.body.entries.every((e) => e.action === "auth.login.fail"));

  // Newest first.
  const all = await h.api(base, "GET", "/api/admin/audit?user=" + U1 + "&limit=100", undefined, bearer(adminToken));
  const times = all.body.entries.map((e) => e.createdAt);
  const sorted = [...times].sort().reverse();
  assert.deepEqual(times, sorted, "entries are newest-first");

  // Pagination.
  const page1 = await h.api(base, "GET", "/api/admin/audit?user=" + U1 + "&limit=1&offset=0", undefined, bearer(adminToken));
  assert.equal(page1.body.entries.length, 1);
  assert.equal(page1.body.limit, 1);
  assert.ok(page1.body.total >= 2);
});

test("from/to date range bounds the results", async () => {
  const U = 100003;
  seedAudit(U, "self", "auth.login.success", isoAgo(10 * DAY));
  seedAudit(U, "self", "auth.login.success", isoAgo(1 * DAY));

  const from = isoAgo(3 * DAY);
  const res = await h.api(base, "GET", "/api/admin/audit?user=" + U + "&from=" + encodeURIComponent(from), undefined, bearer(adminToken));
  assert.equal(res.body.entries.length, 1, "only the recent row is in range");
});

test("security summary counts are correct on seeded data", async () => {
  const U = 100004;
  // 3 failed logins in 24h, 1 more older-than-24h-but-within-7d.
  seedAudit(U, "self", "auth.login.fail", isoAgo(1 * HOUR));
  seedAudit(U, "self", "auth.login.fail", isoAgo(2 * HOUR));
  seedAudit(U, "self", "auth.login.fail", isoAgo(3 * HOUR));
  seedAudit(U, "self", "auth.login.fail", isoAgo(2 * DAY));
  // 1 lockout in 24h.
  seedAudit(U, "self", "auth.login.lockout", isoAgo(4 * HOUR));
  // 1 mfa reset in 7d.
  seedAudit(U, "42", "admin.user.mfa_reset", isoAgo(1 * DAY));
  // 1 admin action in 24h.
  seedAudit(U, "42", "admin.user.lock", isoAgo(5 * HOUR));

  const res = await h.api(base, "GET", "/api/admin/audit/summary", undefined, bearer(adminToken));
  assert.equal(res.status, 200);
  const s = res.body.summary;
  assert.ok(s.failedLogins24h >= 3, "at least 3 failed logins in 24h");
  assert.ok(s.failedLogins7d >= 4, "at least 4 failed logins in 7d");
  assert.ok(s.failedLogins7d >= s.failedLogins24h, "7d window is a superset of 24h");
  assert.ok(s.lockouts24h >= 1);
  assert.ok(s.mfaResets7d >= 1);
  assert.ok(s.adminActions24h >= 1);
});

test("retention delete removes rows older than the cutoff", async () => {
  const U = 100005;
  seedAudit(U, "self", "auth.login.success", isoAgo(400 * DAY)); // > 12 months
  seedAudit(U, "self", "auth.login.success", isoAgo(1 * DAY)); // recent

  const cutoff = isoAgo(365 * DAY);
  const info = db.deleteOldAuditRows.run({ cutoff });
  assert.ok(info.changes >= 1, "at least the old row pruned");

  const remaining = db.db.prepare("SELECT COUNT(*) AS c FROM audit_log WHERE user_id = ?").get(U).c;
  assert.equal(remaining, 1, "recent row survives");
});

test("audit endpoints reject a non-admin token (403)", async () => {
  const info = db.db
    .prepare("INSERT INTO users (email, password_hash, role, status) VALUES ('audit-user@example.com', 'x', 'user', 'active')")
    .run();
  const userToken = tokens.issueAccessToken(info.lastInsertRowid, "user");

  const a = await h.api(base, "GET", "/api/admin/audit", undefined, bearer(userToken));
  assert.equal(a.status, 403);
  const b = await h.api(base, "GET", "/api/admin/audit/summary", undefined, bearer(userToken));
  assert.equal(b.status, 403);
});
