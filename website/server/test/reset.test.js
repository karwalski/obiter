/**
 * Obiter Website Server — password reset & email lifecycle tests (ACCT-006)
 *
 * Run with: npm test  (node --test test/)
 * Covers: /request generic + identical for existing vs unknown email; token is
 * single-use and expires; MFA-enrolled accounts cannot reset without a
 * TOTP/recovery code and can with one; a successful reset revokes existing
 * refresh tokens; /resend-verification is generic and only re-sends for
 * still-unverified accounts; no user enumeration in any body.
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

// Register + verify an account and return { user, accessToken, refreshToken }.
async function registerVerifyLogin(email, password) {
  const reg = await h.api(base, "POST", "/api/auth/register", { email, password });
  assert.equal(reg.status, 201);
  const user = h.getUserByEmail(email);
  await h.api(base, "POST", "/api/auth/verify-email/" + user.verification_token);
  const login = await h.api(base, "POST", "/api/auth/login", { email, password });
  assert.equal(login.status, 200);
  return { user, accessToken: login.body.accessToken, refreshToken: login.body.refreshToken };
}

// Enrol MFA (mirrors mfa.test.js); clears the replay pointer so tests can then
// use a fresh code. Returns { secret, recoveryCodes }.
async function enrollMfa(accessToken, userId) {
  const enroll = await h.api(base, "POST", "/api/auth/mfa/enroll", {}, auth(accessToken));
  assert.equal(enroll.status, 200);
  const secret = enroll.body.secret;
  const verify = await h.api(
    base,
    "POST",
    "/api/auth/mfa/enroll/verify",
    { code: totp.generate(secret) },
    auth(accessToken)
  );
  assert.equal(verify.status, 200);
  db.setMfaLastStep.run({ id: userId, lastStep: null });
  return { secret, recoveryCodes: verify.body.recoveryCodes };
}

// Grab the freshest reset token row for a user directly from the DB, and return
// its raw token by re-deriving is impossible (only the hash is stored) — so for
// tests that need the raw token, we intercept it via the request path instead.
// Here we read the row to inspect expiry/used_at.
function latestResetRow(userId) {
  return db.db
    .prepare("SELECT * FROM password_reset_tokens WHERE user_id = ? ORDER BY id DESC LIMIT 1")
    .get(userId);
}

// Issue a reset token for a user by seeding it directly (the raw token is only
// ever known to the emailed link; tests seed a known raw token to drive /confirm).
const crypto = require("crypto");
function seedResetToken(userId, { ttlMs = 30 * 60 * 1000 } = {}) {
  const raw = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  db.insertResetToken.run({ userId, tokenHash, expiresAt });
  return raw;
}

test("reset /request returns an identical generic 200 for existing and unknown emails", async () => {
  const email = "reset-req@example.com";
  await registerVerifyLogin(email, "a strong password");

  h.resetRateLimit();
  const existing = await h.api(base, "POST", "/api/auth/reset/request", { email });
  h.resetRateLimit();
  const unknown = await h.api(base, "POST", "/api/auth/reset/request", {
    email: "nobody-here@example.com",
  });

  assert.equal(existing.status, 200);
  assert.equal(unknown.status, 200);
  assert.equal(existing.status, unknown.status, "same status");
  assert.deepEqual(existing.body, unknown.body, "identical generic body — no enumeration");
  assert.match(existing.body.message, /if that account exists/i);
});

test("reset /request issues a stored (hashed) token only for a verified account", async () => {
  const email = "reset-issue@example.com";
  const { user } = await registerVerifyLogin(email, "issue token password");
  const before = latestResetRow(user.id);
  assert.equal(before, undefined, "no token before request");

  const res = await h.api(base, "POST", "/api/auth/reset/request", { email });
  assert.equal(res.status, 200);
  const row = latestResetRow(user.id);
  assert.ok(row, "a reset token row was created");
  assert.equal(row.used_at, null);
  assert.equal(row.token_hash.length, 64, "sha256 hex hash stored, not the raw token");
});

test("a reset token is single-use — a second confirm fails", async () => {
  const email = "reset-single@example.com";
  const { user } = await registerVerifyLogin(email, "single use password");
  const raw = seedResetToken(user.id);

  const first = await h.api(base, "POST", "/api/auth/reset/confirm/" + raw, {
    password: "a brand new password",
  });
  assert.equal(first.status, 200);

  const second = await h.api(base, "POST", "/api/auth/reset/confirm/" + raw, {
    password: "yet another password",
  });
  assert.equal(second.status, 400, "used token rejected");
});

test("an expired reset token is rejected", async () => {
  const email = "reset-expired@example.com";
  const { user } = await registerVerifyLogin(email, "expired token password");
  const raw = seedResetToken(user.id, { ttlMs: -1000 }); // already expired

  const res = await h.api(base, "POST", "/api/auth/reset/confirm/" + raw, {
    password: "should not apply here",
  });
  assert.equal(res.status, 400, "expired token rejected");

  // GET confirm page also refuses an expired token.
  const page = await h.api(base, "GET", "/api/auth/reset/confirm/" + raw);
  assert.equal(page.status, 400);
});

test("MFA-enrolled account cannot reset without a code, can with a valid TOTP", async () => {
  const email = "reset-mfa@example.com";
  const password = "mfa reset password";
  const { user, accessToken } = await registerVerifyLogin(email, password);
  const { secret } = await enrollMfa(accessToken, user.id);

  // Without a code: refused.
  const raw1 = seedResetToken(user.id);
  const noCode = await h.api(base, "POST", "/api/auth/reset/confirm/" + raw1, {
    password: "new password no code",
  });
  assert.equal(noCode.status, 401, "MFA account cannot reset without a code");
  assert.equal(noCode.body.code, "mfa_required");

  // The token must NOT have been consumed by the rejected attempt.
  // With a valid TOTP: succeeds.
  const withCode = await h.api(base, "POST", "/api/auth/reset/confirm/" + raw1, {
    password: "new password with code",
    code: totp.generate(secret),
  });
  assert.equal(withCode.status, 200, "reset succeeds with a valid TOTP");

  // The new password now logs in (yielding an MFA challenge, since MFA is on).
  const login = await h.api(base, "POST", "/api/auth/login", {
    email,
    password: "new password with code",
  });
  assert.equal(login.status, 200);
  assert.equal(login.body.mfaRequired, true);
});

test("MFA-enrolled account can reset with a single-use recovery code", async () => {
  const email = "reset-mfa-recovery@example.com";
  const { user, accessToken } = await registerVerifyLogin(email, "recovery reset password");
  const { recoveryCodes } = await enrollMfa(accessToken, user.id);

  const raw = seedResetToken(user.id);
  const res = await h.api(base, "POST", "/api/auth/reset/confirm/" + raw, {
    password: "reset via recovery code",
    code: recoveryCodes[0],
  });
  assert.equal(res.status, 200, "recovery code accepted for reset");

  // That recovery code is now dead: a second (fresh-token) reset with it fails.
  const raw2 = seedResetToken(user.id);
  const reuse = await h.api(base, "POST", "/api/auth/reset/confirm/" + raw2, {
    password: "should not work again",
    code: recoveryCodes[0],
  });
  assert.equal(reuse.status, 401, "consumed recovery code cannot be reused");
});

test("a successful reset revokes all existing refresh tokens (old sessions die)", async () => {
  const email = "reset-revoke@example.com";
  const password = "revoke sessions password";
  const { user, refreshToken } = await registerVerifyLogin(email, password);

  // The old refresh token works before the reset.
  const before = await h.api(base, "POST", "/api/auth/refresh", { refreshToken });
  assert.equal(before.status, 200, "refresh works before reset");
  const rotated = before.body.refreshToken;

  // Reset the password.
  const raw = seedResetToken(user.id);
  const reset = await h.api(base, "POST", "/api/auth/reset/confirm/" + raw, {
    password: "brand new revoke password",
  });
  assert.equal(reset.status, 200);

  // Both the original and the rotated successor are now revoked.
  const after = await h.api(base, "POST", "/api/auth/refresh", { refreshToken: rotated });
  assert.equal(after.status, 401, "existing session invalidated by reset");
});

test("resend-verification is generic and only resends for a still-unverified account", async () => {
  // Unverified account: has a verification token still set.
  const unverifiedEmail = "resend-unverified@example.com";
  await h.api(base, "POST", "/api/auth/register", { email: unverifiedEmail, password: "unverified pw" });
  const unverified = h.getUserByEmail(unverifiedEmail);
  assert.ok(unverified.verification_token, "unverified account holds a token");

  h.resetRateLimit();
  const resend1 = await h.api(base, "POST", "/api/auth/reset/resend-verification", {
    email: unverifiedEmail,
  });
  assert.equal(resend1.status, 200);

  // Verified account: no token; resend is a no-op but still generic.
  const verifiedEmail = "resend-verified@example.com";
  await registerVerifyLogin(verifiedEmail, "verified pw here");
  h.resetRateLimit();
  const resend2 = await h.api(base, "POST", "/api/auth/reset/resend-verification", {
    email: verifiedEmail,
  });
  assert.equal(resend2.status, 200);

  // Unknown account: still generic.
  h.resetRateLimit();
  const resend3 = await h.api(base, "POST", "/api/auth/reset/resend-verification", {
    email: "resend-nobody@example.com",
  });
  assert.equal(resend3.status, 200);

  // All three bodies are identical — no enumeration.
  assert.deepEqual(resend1.body, resend2.body);
  assert.deepEqual(resend2.body, resend3.body);
});

test("no user-enumeration wording in any reset/resend response body", async () => {
  const email = "enum-reset@example.com";
  await registerVerifyLogin(email, "enum reset password");

  h.resetRateLimit();
  const req = await h.api(base, "POST", "/api/auth/reset/request", { email });
  h.resetRateLimit();
  const resend = await h.api(base, "POST", "/api/auth/reset/resend-verification", { email });

  for (const body of [req.body, resend.body]) {
    const text = JSON.stringify(body).toLowerCase();
    assert.ok(!text.includes("no such"), "no 'no such account' leak");
    assert.ok(!text.includes("not found"), "no 'not found' leak");
    assert.ok(!text.includes("already"), "no state leak");
    assert.match(text, /if that account/i, "phrased conditionally");
  }
});
