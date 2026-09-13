/**
 * Obiter Website Server — Admin analytics tests (SITE-ANALYTICS-02)
 *
 * Run with: npm test  (node --test test/)
 *
 * Covers /api/admin/analytics all-time figures: distinct installs count each
 * device once across days, rows without a hash are excluded, first and last
 * load timestamps and the monthly trend are reported. Non-admin token is
 * rejected (403).
 */
"use strict";
const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const h = require("./helpers");
const tokens = require("../lib/tokens");
const db = require("../db");

let base;
let adminToken;
let userToken;

function seedLoad(deviceHash, createdAt, variant) {
  db.db
    .prepare(
      "INSERT INTO analytics_loads (obiter_version, word_version, platform, device_hash, variant, created_at) " +
        "VALUES ('1.16.17', '16.0', 'Mac', @hash, @variant, @created)"
    )
    .run({ hash: deviceHash, variant: variant || "classic", created: createdAt });
}

before(async () => {
  ({ base } = await h.startServer());
  const admin = db.db
    .prepare(
      "INSERT INTO users (email, password_hash, role, status, email_verified_at) " +
        "VALUES ('admin-analytics@example.com', 'x', 'admin', 'active', datetime('now'))"
    )
    .run();
  adminToken = tokens.issueAccessToken(admin.lastInsertRowid, "admin");
  const user = db.db
    .prepare(
      "INSERT INTO users (email, password_hash, role, status, email_verified_at) " +
        "VALUES ('user-analytics@example.com', 'x', 'user', 'active', datetime('now'))"
    )
    .run();
  userToken = tokens.issueAccessToken(user.lastInsertRowid, "user");

  db.db.prepare("DELETE FROM analytics_loads").run();
  // Device A loads on three days over two months; device B once; device C once
  // as the copilot variant; one very old row has no hash at all.
  seedLoad("device-a", "2026-01-05 10:00:00");
  seedLoad("device-a", "2026-01-06 10:00:00");
  seedLoad("device-a", "2026-02-01 10:00:00");
  seedLoad("device-b", "2026-02-10 10:00:00");
  seedLoad("device-c", "2026-03-15 10:00:00", "copilot");
  seedLoad(null, "2025-12-01 10:00:00");
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

test("all-time figures count each install once and exclude rows without a hash", async () => {
  const res = await h.api(base, "GET", "/api/admin/analytics", undefined, bearer(adminToken));
  assert.equal(res.status, 200);
  const a = res.body.allTime;
  assert.equal(a.uniqueUsers, 3);
  assert.equal(a.loads, 6);
  assert.equal(String(a.firstLoadAt).slice(0, 10), "2025-12-01");
  assert.equal(String(a.lastLoadAt).slice(0, 10), "2026-03-15");
  const variants = Object.fromEntries(a.variants.map((v) => [v.variant, v.unique_users]));
  assert.equal(variants.classic, 2);
  assert.equal(variants.copilot, 1);
  assert.deepEqual(
    a.byMonth.map((m) => [m.month, m.unique_users, m.loads]),
    [
      ["2026-01", 1, 2],
      ["2026-02", 2, 2],
      ["2026-03", 1, 1],
    ]
  );
});

test("the windowed figures still work alongside the all-time block", async () => {
  const res = await h.api(
    base,
    "GET",
    "/api/admin/analytics?start=2026-02-01&end=2026-03-01",
    undefined,
    bearer(adminToken)
  );
  assert.equal(res.status, 200);
  assert.equal(res.body.rangeUnique, 2);
  assert.equal(res.body.rangeLoads, 2);
  assert.equal(res.body.allTime.uniqueUsers, 3);
});

test("non-admin tokens are rejected", async () => {
  const res = await h.api(base, "GET", "/api/admin/analytics", undefined, bearer(userToken));
  assert.equal(res.status, 403);
});
