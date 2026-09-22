/**
 * Obiter Website Server — LLM proxy body limit (ENP-012)
 *
 * The Quote panel's summarise/ask feature sends passage chunks through
 * POST /api/proxy/llm for custom endpoints and vaulted keys, so that route
 * takes a 2 MB JSON body. Every other JSON route keeps the express default
 * (100 KB) and must still refuse a large body with 413.
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
  h.resetRateLimit();
});

const BIG = "x".repeat(Math.floor(1.5 * 1024 * 1024));

test("a 1.5 MB body to /api/proxy/llm passes the body parser (no 413)", async () => {
  // Provider "nope" is rejected by the route's own validation before any
  // upstream call is made, which proves the body was parsed.
  const resp = await h.api(base, "POST", "/api/proxy/llm", {
    provider: "nope",
    model: "m",
    apiKey: "k",
    systemPrompt: "s",
    userPrompt: BIG,
  });
  assert.notEqual(resp.status, 413, "the proxy must accept a 1.5 MB body");
  assert.equal(resp.status, 400);
  assert.match(String(resp.body && resp.body.error), /Unsupported provider/);
});

test("a 1.5 MB body to another JSON route is refused with 413", async () => {
  const resp = await h.api(base, "POST", "/api/auth/login", {
    email: BIG,
    password: "irrelevant",
  });
  assert.equal(resp.status, 413);
});
