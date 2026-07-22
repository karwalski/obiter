/**
 * SSRF guard for the custom LLM endpoint relay (TRUST-001 hardening).
 *
 * The relay lets a user route an OpenAI-compatible request through the server
 * to a self-configured endpoint. Host-string denylists alone are insufficient:
 * a public hostname can resolve (via a DNS A record the attacker controls) to
 * an internal address such as the cloud metadata endpoint 169.254.169.254 or an
 * RFC1918 host on the server's network. This module validates the *resolved*
 * address at connect time, so validation and connection use the same IP with no
 * TOCTOU / DNS-rebinding window, and pins the socket to the vetted address.
 */

"use strict";

const dns = require("dns");
const net = require("net");
const https = require("https");

/**
 * True when an IP literal is in a range that must never be reachable through
 * the relay: loopback, RFC1918 private, link-local (incl. cloud metadata
 * 169.254.0.0/16), CGNAT, unique-local IPv6, unspecified, and multicast/
 * reserved space. IPv4-mapped IPv6 addresses are unwrapped and re-checked.
 */
function isBlockedAddress(ip) {
  const type = net.isIP(ip);
  if (type === 4) {
    const p = ip.split(".").map(Number);
    if (p.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
    if (p[0] === 0) return true; // 0.0.0.0/8 "this network"
    if (p[0] === 127) return true; // loopback
    if (p[0] === 10) return true; // private
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true; // private
    if (p[0] === 192 && p[1] === 168) return true; // private
    if (p[0] === 169 && p[1] === 254) return true; // link-local + metadata
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true; // CGNAT 100.64/10
    if (p[0] >= 224) return true; // multicast + reserved
    return false;
  }
  if (type === 6) {
    const a = ip.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
    if (a === "::1" || a === "::") return true; // loopback / unspecified
    if (a.startsWith("fe80")) return true; // link-local
    if (a.startsWith("fc") || a.startsWith("fd")) return true; // ULA fc00::/7
    const mapped = a.match(/(?:^|:)ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isBlockedAddress(mapped[1]);
    return false;
  }
  return true; // not a recognised IP literal — refuse
}

/**
 * A drop-in replacement for dns.lookup that fails the resolution when the host
 * resolves to a blocked address. Passed to an https.Agent so the check runs as
 * part of establishing the connection; the returned address is the one the
 * socket connects to.
 */
function ssrfSafeLookup(hostname, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }
  dns.lookup(hostname, options, (err, address, family) => {
    if (err) return callback(err);
    const list = Array.isArray(address) ? address : [{ address, family }];
    for (const entry of list) {
      if (isBlockedAddress(entry.address)) {
        return callback(new Error("Endpoint resolves to a disallowed address."));
      }
    }
    callback(null, address, family);
  });
}

/** Shared agent that validates and pins every custom-endpoint connection. */
const ssrfSafeHttpsAgent = new https.Agent({ lookup: ssrfSafeLookup });

module.exports = { isBlockedAddress, ssrfSafeLookup, ssrfSafeHttpsAgent };
