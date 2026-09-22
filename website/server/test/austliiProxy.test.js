/**
 * Obiter Website Server — AustLII proxy tests (ENP-013)
 *
 * The old GET /api/proxy/austlii/fetch?id= relay appended a caller-supplied
 * path to "https://www.austlii.edu.au" with no host check, so an id such as
 * "@example.com/x" rewrote the upstream host (SSRF). Nothing in the add-in
 * called it; the route is removed. The search stub stays and keeps returning
 * its unavailable message.
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

test("GET /api/proxy/austlii/fetch is gone: a host-rewriting id gets 404, never relayed", async () => {
  const res = await h.api(base, "GET", "/api/proxy/austlii/fetch?id=@example.com/x", undefined, {
    Origin: "https://obiter.com.au",
  });
  assert.equal(res.status, 404);
  const plain = await h.api(base, "GET", "/api/proxy/austlii/fetch?id=/au/cases/cth/HCA/2020/41.html");
  assert.equal(plain.status, 404);
});

test("GET /api/proxy/austlii still returns its unavailable message", async () => {
  const res = await h.api(base, "GET", "/api/proxy/austlii?q=mabo");
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.results, []);
  assert.match(res.body.error, /unavailable/i);
  assert.match(res.body.error, /austlii\.edu\.au/);
});
