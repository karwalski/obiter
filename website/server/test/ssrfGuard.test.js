/**
 * Obiter Website Server — SSRF guard tests (TRUST-001 hardening)
 *
 * The custom LLM endpoint relay must never reach internal/metadata addresses,
 * even when a public hostname resolves to one. Covers the address classifier
 * and the connect-time lookup hook that pins the resolved IP.
 */

"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

const { isBlockedAddress, ssrfSafeLookup } = require("../lib/ssrfGuard");

test("blocks loopback, private, link-local/metadata, CGNAT and unspecified IPv4", () => {
  for (const ip of [
    "127.0.0.1",
    "127.1.2.3",
    "10.0.0.5",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254", // cloud metadata
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
  ]) {
    assert.equal(isBlockedAddress(ip), true, ip + " must be blocked");
  }
});

test("blocks loopback, link-local, ULA and IPv4-mapped internal IPv6", () => {
  for (const ip of ["::1", "::", "fe80::1", "fc00::1", "fd12:3456::1", "::ffff:127.0.0.1", "::ffff:169.254.169.254"]) {
    assert.equal(isBlockedAddress(ip), true, ip + " must be blocked");
  }
});

test("allows ordinary public addresses", () => {
  for (const ip of ["8.8.8.8", "1.1.1.1", "203.0.113.10", "2606:4700:4700::1111"]) {
    assert.equal(isBlockedAddress(ip), false, ip + " must be allowed");
  }
});

test("refuses anything that is not a recognised IP literal", () => {
  assert.equal(isBlockedAddress("not-an-ip"), true);
  assert.equal(isBlockedAddress("999.1.1.1"), true);
});

test("ssrfSafeLookup rejects a host that resolves to the metadata address", () => {
  // Drive the hook with a resolver that mimics an attacker A record pointing at
  // the cloud metadata endpoint, and assert the lookup errors instead of
  // handing the socket an internal IP. Mutating the shared dns module's lookup
  // is visible to ssrfGuard, which reads dns.lookup at call time.
  const dns = require("dns");
  const realLookup = dns.lookup;
  dns.lookup = (hostname, options, cb) => {
    const done = typeof options === "function" ? options : cb;
    done(null, "169.254.169.254", 4);
  };
  try {
    let captured;
    ssrfSafeLookup("evil.example.com", {}, (err) => {
      captured = err;
    });
    assert.ok(captured instanceof Error, "expected the lookup to error");
    assert.match(captured.message, /disallowed address/);
  } finally {
    dns.lookup = realLookup;
  }
});

test("ssrfSafeLookup passes through a public address", () => {
  const dns = require("dns");
  const realLookup = dns.lookup;
  dns.lookup = (hostname, options, cb) => {
    const done = typeof options === "function" ? options : cb;
    done(null, "8.8.8.8", 4);
  };
  try {
    let result;
    ssrfSafeLookup("api.example.com", {}, (err, address) => {
      result = { err, address };
    });
    assert.equal(result.err, null);
    assert.equal(result.address, "8.8.8.8");
  } finally {
    dns.lookup = realLookup;
  }
});
