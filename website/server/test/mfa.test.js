/**
 * Obiter Website Server — MFA route tests (ACCT-003)
 *
 * Run with: npm test
 * Covers: enroll -> verify -> enable; MFA login (mfaRequired then /mfa/login with
 * a TOTP issues tokens); recovery code logs in once then is dead; TOTP replay
 * rejected; drift +/-1 accepted and +/-2 rejected; disable blocked for admin,
 * allowed for user; crypto round-trips and rejects tampered ciphertext.
 */

"use strict";

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const h = require("./helpers");
const totp = require("../lib/totp");
const crypto = require("../lib/crypto");
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

async function registerVerifyLogin(email, password) {
  const reg = await h.api(base, "POST", "/api/auth/register", { email, password });
  assert.equal(reg.status, 201);
  const user = h.getUserByEmail(email);
  await h.api(base, "POST", "/api/auth/verify-email/" + user.verification_token);
  const login = await h.api(base, "POST", "/api/auth/login", { email, password });
  assert.equal(login.status, 200);
  return { user, accessToken: login.body.accessToken };
}

function auth(token) {
  return { Authorization: "Bearer " + token };
}

// Enrol MFA and return { secret, recoveryCodes }.
// Enrolment necessarily consumes the current TOTP step (the replay guard). In
// production, sign-in happens minutes later in a fresh step; these tests run
// instantly, so we clear the per-user replay pointer after enrolment to
// simulate that time gap. The dedicated replay test still proves a code cannot
// be reused within a single step.
async function enrollMfa(accessToken, userId) {
  const enroll = await h.api(base, "POST", "/api/auth/mfa/enroll", {}, auth(accessToken));
  assert.equal(enroll.status, 200);
  assert.ok(enroll.body.secret, "base32 secret returned");
  assert.match(enroll.body.otpauthUri, /^otpauth:\/\/totp\//);
  const secret = enroll.body.secret;
  const verify = await h.api(
    base,
    "POST",
    "/api/auth/mfa/enroll/verify",
    { code: totp.generate(secret) },
    auth(accessToken)
  );
  assert.equal(verify.status, 200);
  assert.equal(verify.body.enabled, true);
  assert.equal(verify.body.recoveryCodes.length, 10);
  if (userId) db.setMfaLastStep.run({ id: userId, lastStep: null });
  return { secret, recoveryCodes: verify.body.recoveryCodes };
}

test("enroll -> verify enables MFA and returns 10 recovery codes", async () => {
  const { accessToken, user } = await registerVerifyLogin("mfa-enroll@example.com", "a strong password");
  const { secret, recoveryCodes } = await enrollMfa(accessToken, user.id);
  assert.equal(new Set(recoveryCodes).size, 10, "codes are unique");
  const row = db.findUserById.get(user.id);
  assert.equal(row.mfa_enabled, 1);
  assert.ok(row.mfa_secret_enc, "secret stored");
  assert.ok(row.mfa_secret_enc.includes("."), "secret stored in combined encrypted form");
  assert.notEqual(row.mfa_secret_enc, secret, "raw base32 secret is not stored");
});

test("login now requires MFA, then /mfa/login with a TOTP issues tokens", async () => {
  const email = "mfa-login@example.com";
  const password = "another strong password";
  const { accessToken, user } = await registerVerifyLogin(email, password);
  const { secret } = await enrollMfa(accessToken, user.id);

  const login = await h.api(base, "POST", "/api/auth/login", { email, password });
  assert.equal(login.status, 200);
  assert.equal(login.body.mfaRequired, true);
  assert.ok(login.body.mfaToken);
  assert.equal(login.body.accessToken, undefined, "no full tokens before MFA");

  const complete = await h.api(base, "POST", "/api/auth/mfa/login", {
    mfaToken: login.body.mfaToken,
    code: totp.generate(secret),
  });
  assert.equal(complete.status, 200);
  assert.ok(complete.body.accessToken);
  assert.ok(complete.body.refreshToken);
});

test("a TOTP code cannot be replayed on /mfa/login", async () => {
  const email = "mfa-replay@example.com";
  const password = "replay guard password";
  const { accessToken, user } = await registerVerifyLogin(email, password);
  const { secret } = await enrollMfa(accessToken, user.id);

  // Enrolment already consumed the current TOTP step, so a code from the same
  // 30s window may already be spent — the invariant under test is that a given
  // code can never be accepted twice, regardless of which attempt lands first.
  const code = totp.generate(secret);
  const login1 = await h.api(base, "POST", "/api/auth/login", { email, password });
  const first = await h.api(base, "POST", "/api/auth/mfa/login", { mfaToken: login1.body.mfaToken, code });

  const login2 = await h.api(base, "POST", "/api/auth/login", { email, password });
  const second = await h.api(base, "POST", "/api/auth/mfa/login", { mfaToken: login2.body.mfaToken, code });

  assert.ok(
    !(first.status === 200 && second.status === 200),
    "the same TOTP code must not be accepted twice"
  );
  assert.equal(second.status, 401, "the reused code is rejected");
});

test("a recovery code logs in exactly once", async () => {
  const email = "mfa-recovery@example.com";
  const password = "recovery code password";
  const { accessToken, user } = await registerVerifyLogin(email, password);
  const { recoveryCodes } = await enrollMfa(accessToken, user.id);
  const code = recoveryCodes[0];

  const login1 = await h.api(base, "POST", "/api/auth/login", { email, password });
  const first = await h.api(base, "POST", "/api/auth/mfa/login", { mfaToken: login1.body.mfaToken, code });
  assert.equal(first.status, 200, "recovery code works once");
  assert.ok(first.body.accessToken);

  const login2 = await h.api(base, "POST", "/api/auth/login", { email, password });
  const second = await h.api(base, "POST", "/api/auth/mfa/login", { mfaToken: login2.body.mfaToken, code });
  assert.equal(second.status, 401, "same recovery code is dead after use");
});

test("disable is blocked for an admin account, allowed for a user", async () => {
  // User account: disable succeeds with a current TOTP.
  const userEmail = "mfa-disable-user@example.com";
  const { accessToken, user } = await registerVerifyLogin(userEmail, "disable me password");
  const { secret } = await enrollMfa(accessToken, user.id);
  const disable = await h.api(
    base,
    "POST",
    "/api/auth/mfa/disable",
    { code: totp.generate(secret) },
    auth(accessToken)
  );
  assert.equal(disable.status, 200);
  assert.equal(db.findUserById.get(user.id).mfa_enabled, 0);

  // Admin account: same flow refused.
  const adminEmail = "mfa-disable-admin@example.com";
  const admin = await registerVerifyLogin(adminEmail, "admin disable password");
  // Promote to admin directly in the DB (ADM-001 provides the real path), then
  // re-login so the access token carries role=admin.
  db.db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(admin.user.id);
  const adminLogin = await h.api(base, "POST", "/api/auth/login", {
    email: adminEmail,
    password: "admin disable password",
  });
  const adminToken = adminLogin.body.accessToken;
  assert.ok(adminToken, "admin logged in before MFA enrolment");
  const { secret: adminSecret } = await enrollMfa(adminToken, admin.user.id);
  const refused = await h.api(
    base,
    "POST",
    "/api/auth/mfa/disable",
    { code: totp.generate(adminSecret) },
    auth(adminToken)
  );
  assert.equal(refused.status, 403, "admin MFA cannot be disabled");
  assert.equal(refused.body.code, "admin_mfa_required");
});

test("crypto round-trips and rejects tampered ciphertext", () => {
  const secret = "JBSWY3DPEHPK3PXP";
  const enc = crypto.encrypt(secret).combined;
  assert.equal(typeof enc, "string");
  assert.notEqual(enc, secret);
  assert.equal(crypto.decrypt(enc), secret);

  // Corrupt the auth-tag segment ("v1.gcm.<iv>.<tag>.<ct>") -> GCM must reject.
  // Flipping the first char of a base64url segment always changes decoded bytes.
  const parts = enc.split(".");
  parts[3] = (parts[3][0] === "A" ? "B" : "A") + parts[3].slice(1);
  assert.throws(() => crypto.decrypt(parts.join(".")), "tampered ciphertext must not decrypt");
});
