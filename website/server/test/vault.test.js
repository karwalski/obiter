/**
 * Obiter Website Server — Vault route tests (ACCT-004)
 *
 * Covers the write-only key vault: save returns only provider+last4; GET lists
 * metadata and NEVER leaks the raw key; there is no read-back endpoint; the
 * stored ciphertext is not the plaintext; DELETE needs step-up and purges the
 * row; the LLM proxy injects a stored key for an authenticated caller without
 * that key ever appearing in a response body.
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

// Scan any JSON value for a substring (used to prove a key never appears).
function jsonContains(value, needle) {
  return JSON.stringify(value || null).includes(needle);
}

const RAW_KEY = "sk-test-SECRET-abcdef1234567890TAIL";

test("save key returns only provider+last4; GET lists metadata but never the key", async () => {
  const { accessToken } = await registerVerifyLogin("vault-save@example.com", "a strong password");

  const put = await h.api(base, "PUT", "/api/user/keys/openai", { apiKey: RAW_KEY }, auth(accessToken));
  assert.equal(put.status, 200);
  assert.equal(put.body.provider, "openai");
  assert.equal(put.body.last4, "TAIL");
  assert.ok(!jsonContains(put.body, RAW_KEY), "raw key must not be in the save response");

  const list = await h.api(base, "GET", "/api/user/keys", undefined, auth(accessToken));
  assert.equal(list.status, 200);
  assert.equal(list.body.keys.length, 1);
  assert.equal(list.body.keys[0].provider, "openai");
  assert.equal(list.body.keys[0].last4, "TAIL");
  assert.ok(list.body.keys[0].createdAt, "createdAt present");
  assert.ok(!jsonContains(list.body, RAW_KEY), "raw key must not be in the list response");
});

test("stored ciphertext in the DB is not the plaintext", async () => {
  const { user, accessToken } = await registerVerifyLogin("vault-cipher@example.com", "a strong password");
  await h.api(base, "PUT", "/api/user/keys/anthropic", { apiKey: RAW_KEY }, auth(accessToken));

  const row = db.db
    .prepare("SELECT key_ciphertext, key_iv, key_last4 FROM user_keys WHERE user_id = ? AND provider = ?")
    .get(user.id, "anthropic");
  assert.ok(row, "row stored");
  assert.notEqual(row.key_ciphertext, RAW_KEY, "ciphertext is not plaintext");
  assert.ok(!row.key_ciphertext.includes(RAW_KEY), "plaintext not embedded in ciphertext");
  assert.ok(row.key_ciphertext.startsWith("v1.gcm."), "stored in combined GCM form");
  assert.ok(row.key_iv && !row.key_iv.includes(RAW_KEY), "key_iv holds the IV, not the key");
  assert.equal(row.key_last4, "TAIL");
});

test("no read-back endpoint exists for a stored key", async () => {
  const { accessToken } = await registerVerifyLogin("vault-noread@example.com", "a strong password");
  await h.api(base, "PUT", "/api/user/keys/gemini", { apiKey: RAW_KEY }, auth(accessToken));

  // A per-provider GET is deliberately not implemented — must 404.
  const readBack = await h.api(base, "GET", "/api/user/keys/gemini", undefined, auth(accessToken));
  assert.equal(readBack.status, 404, "there must be no single-key read-back route");
});

test("empty key and unknown provider are rejected", async () => {
  const { accessToken } = await registerVerifyLogin("vault-validate@example.com", "a strong password");

  const empty = await h.api(base, "PUT", "/api/user/keys/openai", { apiKey: "   " }, auth(accessToken));
  assert.equal(empty.status, 400);
  assert.equal(empty.body.code, "missing_api_key");

  const unknown = await h.api(base, "PUT", "/api/user/keys/bogusprovider", { apiKey: RAW_KEY }, auth(accessToken));
  assert.equal(unknown.status, 400);
  assert.equal(unknown.body.code, "unknown_provider");
});

test("vault endpoints require authentication", async () => {
  const noauth = await h.api(base, "GET", "/api/user/keys");
  assert.equal(noauth.status, 401);
});

test("DELETE without step-up is refused; with step-up the row is purged", async () => {
  // MFA user: step-up needs a current TOTP code.
  const email = "vault-delete@example.com";
  const password = "delete me password";
  const { user, accessToken } = await registerVerifyLogin(email, password);

  await h.api(base, "PUT", "/api/user/keys/deepseek", { apiKey: RAW_KEY }, auth(accessToken));

  // Enrol MFA so the account is protected by step-up.
  const enroll = await h.api(base, "POST", "/api/auth/mfa/enroll", {}, auth(accessToken));
  const secret = enroll.body.secret;
  await h.api(base, "POST", "/api/auth/mfa/enroll/verify", { code: totp.generate(secret) }, auth(accessToken));
  db.setMfaLastStep.run({ id: user.id, lastStep: null });

  // No step-up material -> 401, row still present.
  const noStep = await h.api(base, "DELETE", "/api/user/keys/deepseek", {}, auth(accessToken));
  assert.equal(noStep.status, 401);
  assert.equal(noStep.body.code, "step_up_required");
  const still = db.db
    .prepare("SELECT COUNT(*) AS c FROM user_keys WHERE user_id = ? AND provider = 'deepseek'")
    .get(user.id);
  assert.equal(still.c, 1, "row survives a step-up-less delete");

  // With a valid TOTP -> deleted, row gone.
  const ok = await h.api(
    base,
    "DELETE",
    "/api/user/keys/deepseek",
    { code: totp.generate(secret) },
    auth(accessToken)
  );
  assert.equal(ok.status, 200);
  assert.equal(ok.body.deleted, true);
  const gone = db.db
    .prepare("SELECT COUNT(*) AS c FROM user_keys WHERE user_id = ? AND provider = 'deepseek'")
    .get(user.id);
  assert.equal(gone.c, 0, "row purged after step-up delete");
});

test("non-MFA user deletes via password step-up fallback", async () => {
  const email = "vault-delete-pw@example.com";
  const password = "password step up here";
  const { user, accessToken } = await registerVerifyLogin(email, password);
  await h.api(base, "PUT", "/api/user/keys/xai", { apiKey: RAW_KEY }, auth(accessToken));

  const wrong = await h.api(base, "DELETE", "/api/user/keys/xai", { password: "nope" }, auth(accessToken));
  assert.equal(wrong.status, 401);

  const ok = await h.api(base, "DELETE", "/api/user/keys/xai", { password }, auth(accessToken));
  assert.equal(ok.status, 200);
  assert.equal(ok.body.deleted, true);
  const gone = db.db
    .prepare("SELECT COUNT(*) AS c FROM user_keys WHERE user_id = ? AND provider = 'xai'")
    .get(user.id);
  assert.equal(gone.c, 0);
});

test("proxy injects a stored key for an authenticated caller without leaking it", async () => {
  const { accessToken } = await registerVerifyLogin("vault-proxy@example.com", "a strong password");
  await h.api(base, "PUT", "/api/user/keys/anthropic", { apiKey: RAW_KEY }, auth(accessToken));

  // Capture the upstream request to prove the decrypted stored key is used, and
  // that it never surfaces in the proxy's response body. Stub global fetch.
  const realFetch = global.fetch;
  let sentAuthKey = null;
  global.fetch = async (url, opts) => {
    // Let the test client's own loopback requests through untouched; only
    // intercept the upstream LLM call.
    if (String(url).includes("127.0.0.1")) return realFetch(url, opts);
    const headers = (opts && opts.headers) || {};
    sentAuthKey = headers["x-api-key"] || headers["Authorization"] || null;
    return {
      ok: true,
      status: 200,
      async json() {
        return { content: [{ type: "text", text: "ok" }] };
      },
      async text() {
        return "";
      },
    };
  };

  try {
    const resp = await h.api(
      base,
      "POST",
      "/api/proxy/llm",
      {
        provider: "anthropic",
        model: "claude-3-haiku",
        systemPrompt: "sys",
        userPrompt: "hi",
        // no apiKey -> server must inject the stored one
      },
      auth(accessToken)
    );
    assert.equal(resp.status, 200);
    assert.equal(resp.body.text, "ok");
    assert.ok(!jsonContains(resp.body, RAW_KEY), "stored key must never appear in the proxy response");
    assert.equal(sentAuthKey, RAW_KEY, "the decrypted stored key was sent upstream");
  } finally {
    global.fetch = realFetch;
  }
});

test("anonymous BYOK proxy path is unchanged (inline key used, no auth needed)", async () => {
  const realFetch = global.fetch;
  let sentAuthKey = null;
  global.fetch = async (url, opts) => {
    if (String(url).includes("127.0.0.1")) return realFetch(url, opts);
    const headers = (opts && opts.headers) || {};
    sentAuthKey = headers["Authorization"] || null;
    return {
      ok: true,
      status: 200,
      async json() {
        return { choices: [{ message: { content: "byok" } }] };
      },
      async text() {
        return "";
      },
    };
  };
  try {
    const resp = await h.api(base, "POST", "/api/proxy/llm", {
      provider: "deepseek",
      model: "deepseek-chat",
      apiKey: "inline-byok-key",
      systemPrompt: "sys",
      userPrompt: "hi",
    });
    assert.equal(resp.status, 200);
    assert.equal(resp.body.text, "byok");
    assert.equal(sentAuthKey, "Bearer inline-byok-key", "inline BYOK key used unchanged");
  } finally {
    global.fetch = realFetch;
  }
});
