/**
 * Obiter Website Server — Self-service data-rights tests (ACCT-007)
 *
 * Covers the three inline /api/user endpoints:
 *   DELETE /api/user/account — step-up gated; purges settings + keys + tokens,
 *     anonymises the user row, nulls the detail on the user's audit rows.
 *   GET /api/user/export — returns ONLY the caller's own data (account, settings,
 *     audit action+time) and never key material, the password hash, or ip_hash,
 *     and never another user's rows (two-user isolation asserted).
 *   GET /api/user/me — correct live flags (MFA, key providers, synced settings).
 */

"use strict";

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const h = require("./helpers");
const totp = require("../lib/totp");
const db = require("../db");

let base;

before(async () => {
  ({ base } = await h.startServer());
});

after(async () => {
  await h.stopServer();
  h.cleanupDb();
});

beforeEach(() => {
  h.resetRateLimit();
});

function auth(token) {
  return { Authorization: "Bearer " + token };
}

async function registerVerifyLogin(email, password) {
  const reg = await h.api(base, "POST", "/api/auth/register", { email, password });
  assert.equal(reg.status, 201);
  const user = h.getUserByEmail(email);
  await h.api(base, "POST", "/api/auth/verify-email/" + user.verification_token);
  const login = await h.api(base, "POST", "/api/auth/login", { email, password });
  assert.equal(login.status, 200);
  return { user, accessToken: login.body.accessToken };
}

function jsonContains(value, needle) {
  return JSON.stringify(value || null).includes(needle);
}

const RAW_KEY = "sk-test-EXPORT-SECRET-abcdef1234567890TAIL";

test("me returns correct flags (MFA off, providers, synced settings)", async () => {
  const password = "a strong password here";
  const { accessToken } = await registerVerifyLogin("me-flags@example.com", password);

  // Fresh account: no keys, no synced settings, MFA off.
  let me = await h.api(base, "GET", "/api/user/me", undefined, auth(accessToken));
  assert.equal(me.status, 200);
  assert.equal(me.body.email, "me-flags@example.com");
  assert.equal(me.body.mfaEnabled, false);
  assert.deepEqual(me.body.keyProviders, []);
  assert.equal(me.body.syncedSettings, false);

  // Store a key and sync a setting -> flags flip.
  await h.api(base, "PUT", "/api/user/keys/openai", { apiKey: RAW_KEY }, auth(accessToken));
  await h.api(
    base,
    "PUT",
    "/api/user/settings",
    { settingsVersion: 0, settings: { templatePrefs: { theme: "dark" } } },
    auth(accessToken)
  );

  me = await h.api(base, "GET", "/api/user/me", undefined, auth(accessToken));
  assert.equal(me.status, 200);
  assert.deepEqual(me.body.keyProviders, ["openai"]);
  assert.equal(me.body.syncedSettings, true);
  assert.ok(!jsonContains(me.body, RAW_KEY), "me must never leak key material");
});

test("me and export require authentication", async () => {
  const noauthMe = await h.api(base, "GET", "/api/user/me");
  assert.equal(noauthMe.status, 401);
  const noauthExport = await h.api(base, "GET", "/api/user/export");
  assert.equal(noauthExport.status, 401);
  const noauthDelete = await h.api(base, "DELETE", "/api/user/account", {});
  assert.equal(noauthDelete.status, 401);
});

test("export returns only the caller's own data (two-user isolation)", async () => {
  const { accessToken: tokenA } = await registerVerifyLogin("export-a@example.com", "password one here");
  const { accessToken: tokenB } = await registerVerifyLogin("export-b@example.com", "password two here");

  // Give each user distinct settings and a stored key (which also writes audit rows).
  await h.api(
    base,
    "PUT",
    "/api/user/settings",
    { settingsVersion: 0, settings: { templatePrefs: { owner: "A-ONLY-MARKER" } } },
    auth(tokenA)
  );
  await h.api(base, "PUT", "/api/user/keys/openai", { apiKey: "sk-A-ONLY-KEY-aaaa1111" }, auth(tokenA));

  await h.api(
    base,
    "PUT",
    "/api/user/settings",
    { settingsVersion: 0, settings: { templatePrefs: { owner: "B-ONLY-MARKER" } } },
    auth(tokenB)
  );
  await h.api(base, "PUT", "/api/user/keys/anthropic", { apiKey: "sk-B-ONLY-KEY-bbbb2222" }, auth(tokenB));

  const exp = await h.api(base, "GET", "/api/user/export", undefined, auth(tokenA));
  assert.equal(exp.status, 200);
  assert.equal(exp.body.account.email, "export-a@example.com");
  assert.equal(exp.body.account.mfa_enabled, false);
  assert.ok(exp.body.account.created_at, "created_at present");

  // Own settings present, other user's not.
  assert.equal(exp.body.settings.templatePrefs.owner, "A-ONLY-MARKER");
  assert.ok(!jsonContains(exp.body, "B-ONLY-MARKER"), "must not contain user B's settings");

  // Audit present as action+time only; NEVER key material, ip_hash, password hash.
  assert.ok(Array.isArray(exp.body.audit), "audit is an array");
  assert.ok(exp.body.audit.length > 0, "audit trail present");
  for (const row of exp.body.audit) {
    assert.deepEqual(Object.keys(row).sort(), ["action", "created_at"]);
  }
  assert.ok(!jsonContains(exp.body, "sk-A-ONLY-KEY"), "no key material in export");
  assert.ok(!jsonContains(exp.body, "ip_hash"), "no ip_hash key in export");
  assert.ok(!jsonContains(exp.body, "password_hash"), "no password hash in export");
  assert.ok(!jsonContains(exp.body, "mfa_secret"), "no MFA secret in export");
});

test("delete is step-up gated and purges settings/keys/tokens + anonymises", async () => {
  const email = "delete-me@example.com";
  const password = "delete this account now";
  const { user, accessToken } = await registerVerifyLogin(email, password);

  // Seed settings, a key, and (from login) refresh tokens exist already.
  await h.api(
    base,
    "PUT",
    "/api/user/settings",
    { settingsVersion: 0, settings: { templatePrefs: { theme: "light" } } },
    auth(accessToken)
  );
  await h.api(base, "PUT", "/api/user/keys/openai", { apiKey: RAW_KEY }, auth(accessToken));

  // Enrol MFA so the account is step-up protected by a TOTP code.
  const enroll = await h.api(base, "POST", "/api/auth/mfa/enroll", {}, auth(accessToken));
  const secret = enroll.body.secret;
  await h.api(base, "POST", "/api/auth/mfa/enroll/verify", { code: totp.generate(secret) }, auth(accessToken));
  db.setMfaLastStep.run({ id: user.id, lastStep: null });

  // No step-up material -> 401, nothing purged.
  const noStep = await h.api(base, "DELETE", "/api/user/account", {}, auth(accessToken));
  assert.equal(noStep.status, 401);
  assert.equal(noStep.body.code, "step_up_required");
  const stillKeys = db.db
    .prepare("SELECT COUNT(*) AS c FROM user_keys WHERE user_id = ?")
    .get(user.id);
  assert.equal(stillKeys.c, 1, "keys survive a step-up-less delete");

  // Valid TOTP -> deletion proceeds.
  const del = await h.api(
    base,
    "DELETE",
    "/api/user/account",
    { code: totp.generate(secret) },
    auth(accessToken)
  );
  assert.equal(del.status, 200);
  assert.equal(del.body.deleted, true);

  // Settings and keys purged.
  const keyCount = db.db.prepare("SELECT COUNT(*) AS c FROM user_keys WHERE user_id = ?").get(user.id);
  assert.equal(keyCount.c, 0, "keys purged");
  const settingsCount = db.db
    .prepare("SELECT COUNT(*) AS c FROM user_settings WHERE user_id = ?")
    .get(user.id);
  assert.equal(settingsCount.c, 0, "settings purged");

  // All refresh tokens revoked.
  const liveTokens = db.db
    .prepare("SELECT COUNT(*) AS c FROM refresh_tokens WHERE user_id = ? AND revoked_at IS NULL")
    .get(user.id);
  assert.equal(liveTokens.c, 0, "all refresh tokens revoked");

  // User row anonymised (soft-deleted).
  const row = db.findUserById.get(user.id);
  assert.equal(row.status, "deleted");
  assert.equal(row.email, "deleted+" + user.id + "@obiter.invalid");
  assert.equal(row.password_hash, null);
  assert.equal(row.mfa_enabled, 0);
  assert.equal(row.mfa_secret_enc, null);

  // Audit detail nulled for the user's earlier rows; the trail itself is kept.
  const withDetail = db.db
    .prepare("SELECT COUNT(*) AS c FROM audit_log WHERE user_id = ? AND detail IS NOT NULL")
    .get(user.id);
  assert.equal(withDetail.c, 0, "no PII detail survives on the user's audit rows");
});

test("non-MFA user deletes via password step-up fallback", async () => {
  const email = "delete-pw@example.com";
  const password = "password fallback delete";
  const { user, accessToken } = await registerVerifyLogin(email, password);
  await h.api(base, "PUT", "/api/user/keys/xai", { apiKey: RAW_KEY }, auth(accessToken));

  const wrong = await h.api(base, "DELETE", "/api/user/account", { password: "nope" }, auth(accessToken));
  assert.equal(wrong.status, 401);
  const still = db.findUserById.get(user.id);
  assert.notEqual(still.status, "deleted");

  const ok = await h.api(base, "DELETE", "/api/user/account", { password }, auth(accessToken));
  assert.equal(ok.status, 200);
  assert.equal(ok.body.deleted, true);
  const row = db.findUserById.get(user.id);
  assert.equal(row.status, "deleted");
});
