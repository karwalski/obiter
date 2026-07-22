/**
 * Obiter Website Server — Password hashing (ACCT-001)
 *
 * Passwords are hashed with argon2id, the memory-hard password hashing
 * function recommended by OWASP for new applications.
 *
 * Parameters (documented per ACCT-001 AC):
 *   type        = argon2id  (hybrid: resists both GPU and side-channel attacks)
 *   memoryCost  = 19456 KiB (19 MiB) — OWASP minimum for argon2id
 *   timeCost    = 2         iterations
 *   parallelism = 1         lane
 * These are sane, portable defaults that keep verification well under ~100ms on
 * the Lightsail host while remaining memory-hard. If the box is upsized, raise
 * memoryCost first. argon2 encodes the parameters into the stored hash string,
 * so changing them here does not break verification of existing hashes.
 *
 * verifyPassword is timing-safe by argon2's design (constant-time comparison of
 * the derived tag). A password is NEVER logged.
 *
 * argon2 is a NATIVE module. `npm ci --production` on the server must rebuild it
 * against the deployed Node ABI. If the native build is unavailable, this module
 * falls back to scrypt via node:crypto (documented; still a memory-hard KDF).
 */

"use strict";

const crypto = require("crypto");

const ARGON2_OPTIONS = {
  // argon2.argon2id === 2; referenced numerically so we can require lazily.
  type: 2,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

let argon2 = null;
let usingFallback = false;
try {
  // eslint-disable-next-line global-require
  argon2 = require("argon2");
} catch (err) {
  usingFallback = true;
  console.warn(
    "argon2 native module unavailable; falling back to scrypt. " +
    "Rebuild argon2 (npm ci) on the server for production use."
  );
}

// ---- scrypt fallback (only if argon2 cannot load) -------------------------
// Format: scrypt$N$r$p$saltHex$hashHex — self-describing so verify is portable.
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 32;

function scryptHash(password) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 64 * 1024 * 1024,
  });
  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("hex"),
    derived.toString("hex"),
  ].join("$");
}

function scryptVerify(stored, password) {
  const parts = String(stored).split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const N = parseInt(parts[1], 10);
  const r = parseInt(parts[2], 10);
  const p = parseInt(parts[3], 10);
  const salt = Buffer.from(parts[4], "hex");
  const expected = Buffer.from(parts[5], "hex");
  const derived = crypto.scryptSync(password, salt, expected.length, {
    N,
    r,
    p,
    maxmem: 64 * 1024 * 1024,
  });
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

/**
 * Hash a plaintext password. Returns a self-describing hash string.
 */
async function hashPassword(password) {
  if (usingFallback) return scryptHash(password);
  return argon2.hash(password, ARGON2_OPTIONS);
}

/**
 * Verify a plaintext password against a stored hash. Timing-safe.
 * Returns false (never throws) on malformed input.
 */
async function verifyPassword(storedHash, password) {
  if (!storedHash || typeof storedHash !== "string") return false;
  try {
    if (storedHash.startsWith("scrypt$")) return scryptVerify(storedHash, password);
    if (usingFallback) return false; // argon2 hash but no argon2 available
    return await argon2.verify(storedHash, password);
  } catch {
    return false;
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  ARGON2_OPTIONS,
  usingFallback: () => usingFallback,
};
