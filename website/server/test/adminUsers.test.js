/**
 * Obiter Website Server — Admin user management tests (ADM-002)
 *
 * Run with: npm test  (node --test test/)
 *
 * Covers the user-management console under /api/admin/users:
 *   - list projects safe columns + a stored-key COUNT, never key material/hash
 *   - lock blocks login immediately; unlock restores it
 *   - force-password-reset revokes refresh tokens and issues a reset token
 *   - mfa-reset requires the typed confirmation phrase and clears MFA
 *   - delete requires the typed phrase, purges keys/settings/tokens, anonymises
 *     the user row and its audit rows
 *   - a non-admin token is rejected (403) on every endpoint
 */

"use strict";

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const h = require("./helpers");
const tokens = require("../lib/tokens");
const db = require("../db");
const crypto = require("crypto");

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

function bearer(token) {
  return { Authorization: "Bearer " + token };
}

// Seed an admin (active, verified, mfa off) and return { id, token }.
function seedAdmin(emailAddr) {
  const info = db.db
    .prepare(
      "INSERT INTO users (email, password_hash, role, status, email_verified_at) " +
        "VALUES (?, ?, 'admin', 'active', datetime('now'))"
    )
    .run(emailAddr || "admin-um@example.com", "x");
  const id = info.lastInsertRowid;
  return { id, token: tokens.issueAccessToken(id, "admin") };
}

// Register + verify + login a normal user; returns { user, accessToken, refreshToken }.
async function makeUser(emailAddr, password) {
  const reg = await h.api(base, "POST", "/api/auth/register", { email: emailAddr, password });
  assert.equal(reg.status, 201);
  const user = h.getUserByEmail(emailAddr);
  await h.api(base, "POST", "/api/auth/verify-email/" + user.verification_token);
  const login = await h.api(base, "POST", "/api/auth/login", { email: emailAddr, password });
  assert.equal(login.status, 200);
  return { user, accessToken: login.body.accessToken, refreshToken: login.body.refreshToken };
}

test("list returns safe metadata + key count, never key material or hash", async () => {
  const admin = seedAdmin("admin-list@example.com");
  const { user, accessToken } = await makeUser("list-target@example.com", "a strong password");
  const RAW_KEY = "sk-listtest-SECRETKEY-abcdef1234TAIL";
  await h.api(base, "PUT", "/api/user/keys/openai", { apiKey: RAW_KEY }, bearer(accessToken));

  const res = await h.api(base, "GET", "/api/admin/users?q=list-target", undefined, bearer(admin.token));
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.users));
  const row = res.body.users.find((u) => u.id === user.id);
  assert.ok(row, "target user present");
  assert.equal(row.email, "list-target@example.com");
  assert.equal(row.keyCount, 1, "stored-key count reported");
  assert.equal(row.mfaEnabled, false);
  // No key material and no password hash anywhere in the response.
  const dump = JSON.stringify(res.body);
  assert.ok(!dump.includes(RAW_KEY), "raw key must not appear");
  assert.ok(!dump.includes("key_ciphertext"), "no ciphertext field");
  assert.ok(!/password_hash|passwordHash/.test(dump), "no password hash field");
});

test("search + pagination narrow the result set", async () => {
  const admin = seedAdmin("admin-search@example.com");
  await makeUser("alpha-search@example.com", "a strong password");
  await makeUser("beta-search@example.com", "a strong password");

  const both = await h.api(base, "GET", "/api/admin/users?q=search@example.com&limit=100", undefined, bearer(admin.token));
  assert.ok(both.body.total >= 2);

  const one = await h.api(base, "GET", "/api/admin/users?q=alpha-search", undefined, bearer(admin.token));
  assert.equal(one.body.users.length, 1);
  assert.equal(one.body.users[0].email, "alpha-search@example.com");

  const paged = await h.api(base, "GET", "/api/admin/users?limit=1&offset=0", undefined, bearer(admin.token));
  assert.equal(paged.body.users.length, 1);
  assert.equal(paged.body.limit, 1);
});

test("lock blocks login immediately; unlock restores it", async () => {
  const admin = seedAdmin("admin-lock@example.com");
  const password = "lock me out please";
  const { user } = await makeUser("lock-target@example.com", password);

  // Locks the account.
  const lock = await h.api(base, "POST", "/api/admin/users/" + user.id + "/lock", { reason: "abuse" }, bearer(admin.token));
  assert.equal(lock.status, 200);
  assert.equal(lock.body.status, "locked");

  // Login is now refused (locked_until in the far future -> 423).
  const blocked = await h.api(base, "POST", "/api/auth/login", { email: "lock-target@example.com", password });
  assert.equal(blocked.status, 423, "locked account cannot log in");

  // The lock action is audited with the reason.
  const auditRow = db.db
    .prepare("SELECT * FROM audit_log WHERE user_id = ? AND action = 'admin.user.lock' ORDER BY id DESC LIMIT 1")
    .get(user.id);
  assert.ok(auditRow, "lock audited");
  assert.ok(String(auditRow.detail).includes("abuse"), "reason captured in audit detail");
  assert.equal(auditRow.actor, String(admin.id), "admin recorded as actor");

  // Unlock restores access.
  const unlock = await h.api(base, "POST", "/api/admin/users/" + user.id + "/unlock", {}, bearer(admin.token));
  assert.equal(unlock.status, 200);
  const ok = await h.api(base, "POST", "/api/auth/login", { email: "lock-target@example.com", password });
  assert.equal(ok.status, 200, "unlocked account can log in again");
});

test("force-password-reset revokes sessions and issues a reset token", async () => {
  const admin = seedAdmin("admin-fpr@example.com");
  const { user, refreshToken } = await makeUser("fpr-target@example.com", "a strong password");

  const before = db.db.prepare("SELECT COUNT(*) AS c FROM password_reset_tokens WHERE user_id = ?").get(user.id).c;

  const res = await h.api(base, "POST", "/api/admin/users/" + user.id + "/force-password-reset", {}, bearer(admin.token));
  assert.equal(res.status, 200);

  // A reset token was created.
  const after = db.db.prepare("SELECT COUNT(*) AS c FROM password_reset_tokens WHERE user_id = ?").get(user.id).c;
  assert.equal(after, before + 1, "reset token issued");

  // All refresh tokens revoked -> the previously issued refresh cannot rotate.
  const rot = await h.api(base, "POST", "/api/auth/refresh", { refreshToken });
  assert.equal(rot.status, 401, "sessions revoked");

  const auditRow = db.db
    .prepare("SELECT * FROM audit_log WHERE user_id = ? AND action = 'admin.user.force_password_reset'")
    .get(user.id);
  assert.ok(auditRow, "force-reset audited");
});

test("mfa-reset needs the typed confirm phrase and clears MFA", async () => {
  const admin = seedAdmin("admin-mfa@example.com");
  const { user } = await makeUser("mfa-target@example.com", "a strong password");
  // Force MFA on directly (enrolment path is ACCT-003's concern).
  db.db.prepare("UPDATE users SET mfa_enabled = 1, mfa_secret_enc = 'x', recovery_codes_hash = '[]' WHERE id = ?").run(user.id);

  // Wrong phrase -> 400, MFA still on.
  const wrong = await h.api(base, "POST", "/api/admin/users/" + user.id + "/mfa-reset", { confirm: "RESET MFA wrong@example.com" }, bearer(admin.token));
  assert.equal(wrong.status, 400);
  assert.equal(wrong.body.code, "confirmation_mismatch");
  assert.equal(db.db.prepare("SELECT mfa_enabled FROM users WHERE id = ?").get(user.id).mfa_enabled, 1);

  // Correct phrase -> cleared.
  const right = await h.api(base, "POST", "/api/admin/users/" + user.id + "/mfa-reset", { confirm: "RESET MFA mfa-target@example.com" }, bearer(admin.token));
  assert.equal(right.status, 200);
  const row = db.db.prepare("SELECT mfa_enabled, mfa_secret_enc, recovery_codes_hash FROM users WHERE id = ?").get(user.id);
  assert.equal(row.mfa_enabled, 0);
  assert.equal(row.mfa_secret_enc, null);
  assert.equal(row.recovery_codes_hash, null);
});

test("delete needs the typed phrase; purges keys/settings/tokens and anonymises", async () => {
  const admin = seedAdmin("admin-del@example.com");
  const { user, accessToken } = await makeUser("del-target@example.com", "a strong password");
  await h.api(base, "PUT", "/api/user/keys/openai", { apiKey: "sk-del-SECRET-1234TAIL" }, bearer(accessToken));
  db.upsertUserSetting.run({ userId: user.id, key: "llmConfig", valueJson: '{"x":1}' });

  // Wrong phrase -> refused, nothing purged.
  const wrong = await h.api(base, "POST", "/api/admin/users/" + user.id + "/delete", { confirm: "DELETE nope@example.com" }, bearer(admin.token));
  assert.equal(wrong.status, 400);
  assert.equal(db.db.prepare("SELECT COUNT(*) AS c FROM user_keys WHERE user_id = ?").get(user.id).c, 1);

  // Correct phrase -> purge + anonymise.
  const ok = await h.api(base, "POST", "/api/admin/users/" + user.id + "/delete", { confirm: "DELETE del-target@example.com" }, bearer(admin.token));
  assert.equal(ok.status, 200);

  assert.equal(db.db.prepare("SELECT COUNT(*) AS c FROM user_keys WHERE user_id = ?").get(user.id).c, 0, "keys purged");
  assert.equal(db.db.prepare("SELECT COUNT(*) AS c FROM user_settings WHERE user_id = ?").get(user.id).c, 0, "settings purged");
  assert.equal(db.db.prepare("SELECT COUNT(*) AS c FROM refresh_tokens WHERE user_id = ? AND revoked_at IS NULL").get(user.id).c, 0, "tokens revoked");

  const row = db.db.prepare("SELECT email, password_hash, status FROM users WHERE id = ?").get(user.id);
  assert.ok(row, "row retained (soft delete)");
  assert.equal(row.status, "deleted");
  assert.equal(row.email, "deleted+" + user.id + "@obiter.invalid");
  assert.equal(row.password_hash, null);

  // Audit rows for the account are anonymised (detail nulled) but retained.
  const withDetail = db.db.prepare("SELECT COUNT(*) AS c FROM audit_log WHERE user_id = ? AND detail IS NOT NULL AND action != 'admin.user.delete'").get(user.id).c;
  assert.equal(withDetail, 0, "prior audit detail anonymised");
  const anyRows = db.db.prepare("SELECT COUNT(*) AS c FROM audit_log WHERE user_id = ?").get(user.id).c;
  assert.ok(anyRows > 0, "audit trail retained");
});

test("every admin-users endpoint rejects a non-admin token (403)", async () => {
  const { user, accessToken: userToken } = await makeUser("nonadmin@example.com", "a strong password");
  const targetId = user.id;

  const calls = [
    ["GET", "/api/admin/users"],
    ["POST", "/api/admin/users/" + targetId + "/lock"],
    ["POST", "/api/admin/users/" + targetId + "/unlock"],
    ["POST", "/api/admin/users/" + targetId + "/force-password-reset"],
    ["POST", "/api/admin/users/" + targetId + "/mfa-reset"],
    ["POST", "/api/admin/users/" + targetId + "/resend-verification"],
    ["POST", "/api/admin/users/" + targetId + "/delete"],
  ];
  for (const [method, path] of calls) {
    const res = await h.api(base, method, path, method === "GET" ? undefined : {}, bearer(userToken));
    assert.equal(res.status, 403, method + " " + path + " must be 403 for a non-admin");
  }
});
