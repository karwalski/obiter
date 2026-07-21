/**
 * Obiter Website Server — Auth route tests (ACCT-001)
 *
 * Run with: npm test  (node --test test/)
 * Covers: register -> verify -> login happy path; lockout after 8 fails + 423;
 * refresh rotation invalidates the old token; refresh reuse revokes the family;
 * POST-confirm verification required (GET does not verify); generic responses
 * (no enumeration); rate limit trips at the 6th attempt.
 */

"use strict";

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const h = require("./helpers");

let base;

before(async () => {
  ({ base } = await h.startServer());
});

after(async () => {
  await h.stopServer();
  h.cleanupDb();
});

beforeEach(() => {
  // Rate-limit counters are process-global; reset between tests so unrelated
  // tests do not exhaust each other's budget.
  h.resetRateLimit();
});

// Verify a freshly registered account by pulling its token from the DB and
// POSTing the confirm (the anti-scanner pattern requires a POST).
async function registerAndVerify(email, password) {
  const reg = await h.api(base, "POST", "/api/auth/register", { email, password });
  assert.equal(reg.status, 201);
  const user = h.getUserByEmail(email);
  assert.ok(user, "user row created");
  assert.ok(user.verification_token, "verification token present");
  const res = await h.api(base, "POST", "/api/auth/verify-email/" + user.verification_token);
  assert.equal(res.status, 200);
  return user;
}

test("register -> verify -> login happy path", async () => {
  const email = "happy@example.com";
  const password = "correct horse battery";
  await registerAndVerify(email, password);

  const login = await h.api(base, "POST", "/api/auth/login", { email, password });
  assert.equal(login.status, 200);
  assert.ok(login.body.accessToken, "access token issued");
  assert.ok(login.body.refreshToken, "refresh token issued");
  assert.equal(login.body.expiresIn, 15 * 60);
});

test("GET verify-email shows confirm page but does NOT verify", async () => {
  const email = "getverify@example.com";
  await h.api(base, "POST", "/api/auth/register", { email, password: "a strong password" });
  const user = h.getUserByEmail(email);

  const getRes = await h.api(base, "GET", "/api/auth/verify-email/" + user.verification_token);
  assert.equal(getRes.status, 200);
  assert.match(getRes.text, /Verify my email/); // confirm page rendered

  const after = h.getUserByEmail(email);
  assert.equal(after.email_verified_at, null, "GET must not verify the email");
});

test("login lockout after 8 fails then 423 while locked", async () => {
  const email = "lockout@example.com";
  const password = "the right password";
  await registerAndVerify(email, password);

  // 8 wrong-password attempts. (Rate limit reset per test lets us do 8 here;
  // the limiter is exercised separately below.)
  for (let i = 0; i < 8; i++) {
    h.resetRateLimit();
    const bad = await h.api(base, "POST", "/api/auth/login", { email, password: "wrong-" + i });
    assert.equal(bad.status, 401, "attempt " + i + " rejected");
  }

  // Now locked: even the CORRECT password returns 423.
  h.resetRateLimit();
  const locked = await h.api(base, "POST", "/api/auth/login", { email, password });
  assert.equal(locked.status, 423, "account locked -> 423");

  const user = h.getUserByEmail(email);
  assert.ok(user.locked_until, "locked_until set");
  assert.ok(new Date(user.locked_until).getTime() > Date.now(), "lock is in the future");
});

test("refresh rotation invalidates the old token", async () => {
  const email = "rotate@example.com";
  const password = "rotation password";
  await registerAndVerify(email, password);

  const login = await h.api(base, "POST", "/api/auth/login", { email, password });
  const first = login.body.refreshToken;

  const r1 = await h.api(base, "POST", "/api/auth/refresh", { refreshToken: first });
  assert.equal(r1.status, 200);
  assert.ok(r1.body.refreshToken);
  assert.notEqual(r1.body.refreshToken, first, "a new refresh token is issued");

  // The rotated-away (old) token must no longer work.
  const reused = await h.api(base, "POST", "/api/auth/refresh", { refreshToken: first });
  assert.equal(reused.status, 401, "old token rejected after rotation");
});

test("refresh reuse of a rotated token revokes the whole family", async () => {
  const email = "reuse@example.com";
  const password = "reuse password";
  await registerAndVerify(email, password);

  const login = await h.api(base, "POST", "/api/auth/login", { email, password });
  const t0 = login.body.refreshToken;

  // Rotate once -> t1 valid, t0 revoked.
  const r1 = await h.api(base, "POST", "/api/auth/refresh", { refreshToken: t0 });
  assert.equal(r1.status, 200);
  const t1 = r1.body.refreshToken;

  // Reuse t0 (already rotated away) -> reuse detection revokes the family.
  const reuse = await h.api(base, "POST", "/api/auth/refresh", { refreshToken: t0 });
  assert.equal(reuse.status, 401);

  // t1, though it was valid, is now revoked because the whole family died.
  const afterFamilyRevoke = await h.api(base, "POST", "/api/auth/refresh", { refreshToken: t1 });
  assert.equal(afterFamilyRevoke.status, 401, "family revoked -> successor token dead");
});

test("generic responses: no email enumeration on register or login", async () => {
  // Register an existing account, then register the same email again.
  const email = "enum@example.com";
  const first = await h.api(base, "POST", "/api/auth/register", { email, password: "enumeration test" });
  h.resetRateLimit();
  const second = await h.api(base, "POST", "/api/auth/register", { email, password: "enumeration test" });
  assert.equal(first.status, second.status, "duplicate register indistinguishable");
  assert.deepEqual(first.body, second.body, "duplicate register body identical");

  // Login with unknown email vs wrong password: both generic 401.
  h.resetRateLimit();
  const unknown = await h.api(base, "POST", "/api/auth/login", {
    email: "nobody@example.com",
    password: "whatever password",
  });
  assert.equal(unknown.status, 401);
  assert.equal(unknown.body.error, "Invalid credentials.");
});

test("rate limit trips at the 6th attempt within the window", async () => {
  // authStrict = 5/hour. Do NOT reset between calls here.
  h.resetRateLimit();
  const email = "ratelimit@example.com";
  let last;
  for (let i = 0; i < 6; i++) {
    last = await h.api(base, "POST", "/api/auth/login", { email, password: "x wrong password" });
  }
  assert.equal(last.status, 429, "6th attempt rate-limited");
  assert.ok(last.headers.get("retry-after"), "Retry-After header set");
});
