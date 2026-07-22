/**
 * Obiter Website Server — Encryption vault primitive (ACCT-003; reused by ACCT-004)
 *
 * AES-256-GCM authenticated encryption over a single 32-byte master key held in
 * the environment. This is the shared at-rest encryption primitive for the whole
 * accounts epic: ACCT-003 encrypts each user's TOTP secret with it, and ACCT-004's
 * write-only API-key vault reuses the SAME module so there is one key, one format,
 * one place to audit.
 *
 * Master key:
 *   env VAULT_MASTER_KEY — 32 bytes, provided as 64 hex chars OR base64 (44 chars
 *   with '=' padding, or 43 unpadded). Decoded and length-checked to exactly 32
 *   bytes at load. Generate one with:  openssl rand -hex 32
 *
 *   If VAULT_MASTER_KEY is unset a DERIVED development key is used and a warning is
 *   printed once. In production (NODE_ENV === "production") running on the dev key
 *   is REFUSED — encrypt()/decrypt() throw — so a misconfigured deploy fails loud
 *   rather than silently encrypting real secrets under a public constant.
 *
 * Format (self-describing single string, so callers store ONE column):
 *   "v1.gcm." + base64url(iv) + "." + base64url(tag) + "." + base64url(ciphertext)
 *   - v1.gcm   scheme + version tag (lets us rotate algorithms later)
 *   - iv       12 random bytes, UNIQUE per call (GCM nonce; never reused)
 *   - tag      16-byte GCM authentication tag (integrity: tampering -> decrypt throws)
 *   - ciphertext  the encrypted UTF-8 plaintext
 *
 *   encrypt() also returns the parts individually ({ combined, iv, tag, ciphertext }
 *   as base64) so a caller with separate columns (e.g. the ACCT-001 user_keys table
 *   which already has key_ciphertext + key_iv) can store them apart if it prefers.
 *   decrypt() accepts EITHER the combined string OR an object of the base64 parts.
 *
 * A plaintext or key is NEVER logged.
 */

"use strict";

const crypto = require("crypto");

const ALGO = "aes-256-gcm";
const KEY_LEN = 32; // 256-bit
const IV_LEN = 12; // 96-bit GCM nonce
const TAG_LEN = 16; // 128-bit GCM tag
const SCHEME = "v1.gcm";

// A fixed, PUBLIC development key derived so the server runs out-of-the-box for
// local dev and tests. It carries NO security — production refuses to use it.
const DEV_KEY = crypto
  .createHash("sha256")
  .update("obiter-dev-insecure-vault-master-key")
  .digest(); // 32 bytes

let _warned = false;

/**
 * Resolve the 32-byte master key. Throws in production if only the dev key is
 * available. Cached-per-call (cheap) so a rotated env var takes effect on restart.
 */
function masterKey() {
  const raw = process.env.VAULT_MASTER_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "VAULT_MASTER_KEY is not set. Refusing to run the encryption vault on the " +
          "insecure development key in production. Set VAULT_MASTER_KEY (openssl rand -hex 32)."
      );
    }
    if (!_warned) {
      console.warn(
        "VAULT_MASTER_KEY is not set; using an insecure development key. " +
          "Set VAULT_MASTER_KEY (openssl rand -hex 32) in /etc/obiter/env.sh for production."
      );
      _warned = true;
    }
    return DEV_KEY;
  }
  return decodeKey(raw);
}

function decodeKey(raw) {
  const s = String(raw).trim();
  let buf;
  if (/^[0-9a-fA-F]{64}$/.test(s)) {
    buf = Buffer.from(s, "hex");
  } else {
    buf = Buffer.from(s, "base64");
  }
  if (buf.length !== KEY_LEN) {
    throw new Error(
      "VAULT_MASTER_KEY must decode to exactly 32 bytes (64 hex chars or base64). " +
        "Got " + buf.length + " bytes."
    );
  }
  return buf;
}

function b64(buf) {
  return Buffer.from(buf).toString("base64");
}

/**
 * Encrypt a UTF-8 plaintext string.
 * Returns { combined, iv, tag, ciphertext } where `combined` is the
 * self-describing single string and the others are base64 for split storage.
 */
function encrypt(plaintext) {
  if (typeof plaintext !== "string") {
    throw new TypeError("encrypt expects a string plaintext.");
  }
  const key = masterKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = [SCHEME, b64url(iv), b64url(tag), b64url(ciphertext)].join(".");
  return {
    combined,
    iv: b64(iv),
    tag: b64(tag),
    ciphertext: b64(ciphertext),
  };
}

/**
 * Decrypt. Accepts EITHER:
 *   - the combined "v1.gcm.iv.tag.ct" string, or
 *   - an object { iv, tag, ciphertext } of base64 (or base64url) parts.
 * Returns the UTF-8 plaintext. THROWS if the tag does not verify (tampering) or
 * the input is malformed.
 */
function decrypt(input) {
  const key = masterKey();
  let iv;
  let tag;
  let ciphertext;

  if (typeof input === "string") {
    const parts = input.split(".");
    // scheme is two dotted tokens: "v1" + "gcm"
    if (parts.length !== 5 || parts[0] !== "v1" || parts[1] !== "gcm") {
      throw new Error("decrypt: unrecognised ciphertext format.");
    }
    iv = fromB64(parts[2]);
    tag = fromB64(parts[3]);
    ciphertext = fromB64(parts[4]);
  } else if (input && typeof input === "object") {
    iv = fromB64(input.iv);
    tag = fromB64(input.tag);
    ciphertext = fromB64(input.ciphertext);
  } else {
    throw new Error("decrypt: expected a combined string or a {iv,tag,ciphertext} object.");
  }

  if (iv.length !== IV_LEN) throw new Error("decrypt: bad IV length.");
  if (tag.length !== TAG_LEN) throw new Error("decrypt: bad auth tag length.");

  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  // .final() throws if the GCM tag fails to authenticate.
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString("utf8");
}

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64(str) {
  // Accept both standard base64 and base64url.
  return Buffer.from(String(str).replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

module.exports = {
  encrypt,
  decrypt,
  ALGO,
  SCHEME,
  KEY_LEN,
};
