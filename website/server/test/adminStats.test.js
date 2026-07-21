/**
 * Obiter Website Server — Admin account-stats tests (ADM-004)
 *
 * Run with: npm test  (node --test test/)
 *
 * Covers /api/admin/account-stats: totals, new-in-window, active-in-window, and
 * the MFA / vault-key / synced-settings adoption aggregates on seeded users.
 * Deleted (anonymised) rows are excluded. Non-admin token is rejected (403).
 */

"use strict";

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const h = require("./helpers");
const tokens = require("../lib/tokens");
const db = require("../db");

let base;
let adminToken;

// Insert a user with explicit created_at / last_login_at / mfa flags. Returns id.
function seedUser(opts) {
  const info = db.db
    .prepare(
      "INSERT INTO users (email, password_hash, role, status, mfa_enabled, created_at, last_login_at) " +
        "VALUES (@email, 'x', 'user', @status, @mfa, @created, @lastLogin)"
    )
    .run({
      email: opts.email,
      status: opts.status || "active",
      mfa: opts.mfa ? 1 : 0,
      created: opts.created,
      lastLogin: opts.lastLogin || null,
    });
  return info.lastInsertRowid;
}

function seedKey(userId, provider) {
  db.db
    .prepare(
      "INSERT INTO user_keys (user_id, provider, key_ciphertext, key_iv, key_last4) VALUES (?, ?, 'ct', 'iv', 'TAIL')"
    )
    .run(userId, provider);
}

function seedSetting(userId, key) {
  db.upsertUserSetting.run({ userId, key, valueJson: "{}" });
}

function isoAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

before(async () => {
  ({ base } = await h.startServer());
  const info = db.db
    .prepare(
      "INSERT INTO users (email, password_hash, role, status, email_verified_at) " +
        "VALUES ('admin-stats@example.com', 'x', 'admin', 'active', datetime('now'))"
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

test("account-stats aggregates are correct on seeded users", async () => {
  // Baseline counts (the admin row + anything prior).
  const before = await h.api(base, "GET", "/api/admin/account-stats", undefined, bearer(adminToken));
  const baseTotal = before.body.totalAccounts;

  // 4 fresh users. u1: MFA + key + setting, active recently, created recently.
  const u1 = seedUser({ email: "s1@example.com", mfa: true, created: isoAgo(5), lastLogin: isoAgo(2) });
  seedKey(u1, "openai");
  seedSetting(u1, "llmConfig");
  // u2: key only, active recently, created recently.
  const u2 = seedUser({ email: "s2@example.com", mfa: false, created: isoAgo(5), lastLogin: isoAgo(3) });
  seedKey(u2, "anthropic");
  // u3: MFA, never logged in, created long ago (outside a 30d window).
  seedUser({ email: "s3@example.com", mfa: true, created: isoAgo(100), lastLogin: null });
  // u4: deleted/anonymised — must be excluded from every count.
  seedUser({ email: "deleted+999@obiter.invalid", status: "deleted", mfa: true, created: isoAgo(1), lastLogin: isoAgo(1) });

  const now = new Date();
  const start = isoAgo(30);
  const end = now.toISOString();
  const res = await h.api(
    base,
    "GET",
    "/api/admin/account-stats?start=" + encodeURIComponent(start) + "&end=" + encodeURIComponent(end),
    undefined,
    bearer(adminToken)
  );
  assert.equal(res.status, 200);
  const s = res.body;

  // Total excludes the deleted row: baseline + 3 real new users.
  assert.equal(s.totalAccounts, baseTotal + 3, "deleted rows excluded from total");

  // New accounts within the 30d window: u1, u2 (u3 is 100d old, u4 deleted).
  assert.ok(s.newAccounts >= 2, "u1+u2 are new in the window");

  // Active accounts (last_login within window): u1, u2 (u3 null, u4 deleted).
  assert.ok(s.activeAccounts >= 2, "u1+u2 active");

  // Vault-key adoption: u1 + u2 hold keys.
  assert.ok(s.vaultKeyAccounts >= 2, "two accounts hold vault keys");
  // Settings adoption: u1 only.
  assert.ok(s.settingsAccounts >= 1, "one account has synced settings");
  // MFA: u1 + u3 (u4 deleted excluded).
  assert.ok(s.mfaAccounts >= 2, "two live accounts have MFA");

  // Percentages are on [0,100] and derived from total.
  assert.ok(s.mfaAdoptionPct >= 0 && s.mfaAdoptionPct <= 100);
  assert.equal(s.mfaAdoptionPct, Math.round((s.mfaAccounts / s.totalAccounts) * 1000) / 10);
});

test("default window is the last 30 days when start/end omitted", async () => {
  const res = await h.api(base, "GET", "/api/admin/account-stats", undefined, bearer(adminToken));
  assert.equal(res.status, 200);
  assert.ok(res.body.start && res.body.end, "window echoed back");
  assert.ok(new Date(res.body.start).getTime() < new Date(res.body.end).getTime());
});

test("account-stats rejects a non-admin token (403)", async () => {
  const info = db.db
    .prepare("INSERT INTO users (email, password_hash, role, status) VALUES ('stats-user@example.com', 'x', 'user', 'active')")
    .run();
  const userToken = tokens.issueAccessToken(info.lastInsertRowid, "user");
  const res = await h.api(base, "GET", "/api/admin/account-stats", undefined, bearer(userToken));
  assert.equal(res.status, 403);
});
