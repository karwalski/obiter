/**
 * Obiter Website Server — Settings route tests (ACCT-004)
 *
 * Covers namespaced settings round-trip, the settingsVersion stale-write 409
 * guard, opaque preservation of unknown namespaces, default namespaces on GET,
 * and that no key material is ever accepted into settings storage.
 */

"use strict";

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const h = require("./helpers");
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

test("GET returns default namespaces and version 0 before any write", async () => {
  const { accessToken } = await registerVerifyLogin("settings-default@example.com", "a strong password");
  const get = await h.api(base, "GET", "/api/user/settings", undefined, auth(accessToken));
  assert.equal(get.status, 200);
  assert.equal(get.body.settingsVersion, 0);
  assert.deepEqual(get.body.settings.llmConfig, {});
  assert.equal(get.body.settings.autoRefresh, false);
  assert.deepEqual(get.body.settings.courtToggles, {});
  assert.deepEqual(get.body.settings.templatePrefs, {});
});

test("PUT then GET round-trips and bumps the version", async () => {
  const { accessToken } = await registerVerifyLogin("settings-roundtrip@example.com", "a strong password");

  const put = await h.api(
    base,
    "PUT",
    "/api/user/settings",
    {
      settingsVersion: 0,
      settings: { autoRefresh: true, templatePrefs: { font: "Times" } },
    },
    auth(accessToken)
  );
  assert.equal(put.status, 200);
  assert.equal(put.body.settingsVersion, 1, "version bumped to 1");
  assert.equal(put.body.settings.autoRefresh, true);

  const get = await h.api(base, "GET", "/api/user/settings", undefined, auth(accessToken));
  assert.equal(get.status, 200);
  assert.equal(get.body.settingsVersion, 1);
  assert.equal(get.body.settings.autoRefresh, true);
  assert.deepEqual(get.body.settings.templatePrefs, { font: "Times" });
});

test("a stale settingsVersion is rejected with 409 and returns current state", async () => {
  const { accessToken } = await registerVerifyLogin("settings-stale@example.com", "a strong password");

  await h.api(base, "PUT", "/api/user/settings", { settingsVersion: 0, settings: { autoRefresh: true } }, auth(accessToken));

  // Second client still thinks the version is 0 -> stale.
  const stale = await h.api(
    base,
    "PUT",
    "/api/user/settings",
    { settingsVersion: 0, settings: { autoRefresh: false } },
    auth(accessToken)
  );
  assert.equal(stale.status, 409);
  assert.equal(stale.body.code, "stale_version");
  assert.equal(stale.body.settingsVersion, 1, "server returns its current version");
  assert.equal(stale.body.settings.autoRefresh, true, "server state unchanged by the stale write");

  // Rebasing on the current version succeeds.
  const ok = await h.api(
    base,
    "PUT",
    "/api/user/settings",
    { settingsVersion: 1, settings: { autoRefresh: false } },
    auth(accessToken)
  );
  assert.equal(ok.status, 200);
  assert.equal(ok.body.settingsVersion, 2);
  assert.equal(ok.body.settings.autoRefresh, false);
});

test("unknown namespaces are preserved opaquely", async () => {
  const { accessToken } = await registerVerifyLogin("settings-unknown@example.com", "a strong password");

  const opaque = { some: "future", nested: { a: 1, b: [2, 3] } };
  const put = await h.api(
    base,
    "PUT",
    "/api/user/settings",
    { settingsVersion: 0, settings: { futureFeatureX: opaque } },
    auth(accessToken)
  );
  assert.equal(put.status, 200);

  const get = await h.api(base, "GET", "/api/user/settings", undefined, auth(accessToken));
  assert.deepEqual(get.body.settings.futureFeatureX, opaque, "unknown namespace round-trips intact");
});

test("key material is stripped and never stored in settings", async () => {
  const { user, accessToken } = await registerVerifyLogin("settings-nokey@example.com", "a strong password");

  const put = await h.api(
    base,
    "PUT",
    "/api/user/settings",
    {
      settingsVersion: 0,
      settings: { llmConfig: { provider: "openai", apiKey: "sk-should-be-stripped", model: "gpt-4" } },
    },
    auth(accessToken)
  );
  assert.equal(put.status, 200);
  assert.equal(put.body.settings.llmConfig.provider, "openai");
  assert.equal(put.body.settings.llmConfig.model, "gpt-4");
  assert.equal(put.body.settings.llmConfig.apiKey, undefined, "apiKey stripped from response");

  // And it must not be in the stored row either.
  const row = db.db
    .prepare("SELECT value_json FROM user_settings WHERE user_id = ? AND key = 'llmConfig'")
    .get(user.id);
  assert.ok(row, "llmConfig stored");
  assert.ok(!row.value_json.includes("sk-should-be-stripped"), "key material not persisted");
});

test("settings endpoints require authentication", async () => {
  const get = await h.api(base, "GET", "/api/user/settings");
  assert.equal(get.status, 401);
  const put = await h.api(base, "PUT", "/api/user/settings", { settings: {} });
  assert.equal(put.status, 401);
});
