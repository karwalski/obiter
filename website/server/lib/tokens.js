/**
 * Obiter Website Server — Tokens (ACCT-001)
 *
 * Two token types, bearer headers only. Cookies are NOT used (the Word webview
 * iframe makes cookies third-party and unreliable) and tokens are NEVER accepted
 * as query parameters.
 *
 * Access token (short-lived, stateless):
 *   Compact HMAC-signed token, hand-rolled with node:crypto to avoid a JWT
 *   dependency. Format: base64url(payloadJson) + "." + base64url(hmacSha256).
 *   Payload carries { sub, role, typ, exp } (exp = unix seconds). Default TTL
 *   15 minutes. verifyAccess() checks the signature (timing-safe) and expiry.
 *
 * MFA token (login seam for ACCT-003):
 *   Same compact format but typ:"mfa" and a short TTL (5 min). Issued by /login
 *   when mfa_enabled so the client can exchange it for a full token pair after a
 *   TOTP challenge. It carries no session authority on its own.
 *
 * Refresh token (opaque, stateful, rotating):
 *   32 random bytes, returned to the client base64url. Stored ONLY as
 *   sha256(token) in refresh_tokens, tagged with a family_id. Rotation on every
 *   /refresh: verify -> revoke the presented token -> issue a new token in the
 *   same family. Reuse of an already-revoked token is treated as theft: the
 *   WHOLE family is revoked (reuse detection) and the caller must audit it.
 *
 * Signing secret comes from env AUTH_TOKEN_SECRET (dev fallback provided, with a
 * warning — MUST be set in /etc/obiter/env.sh for production).
 */

"use strict";

const crypto = require("crypto");
const db = require("../db");

const ACCESS_TTL_SECONDS = 15 * 60; // 15 minutes
const MFA_TTL_SECONDS = 5 * 60; // 5 minutes
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

let _secretWarned = false;
function signingSecret() {
  const s = process.env.AUTH_TOKEN_SECRET;
  if (s) return s;
  if (!_secretWarned) {
    console.warn(
      "AUTH_TOKEN_SECRET is not set; using an insecure development fallback. " +
      "Set AUTH_TOKEN_SECRET in /etc/obiter/env.sh for production."
    );
    _secretWarned = true;
  }
  return "obiter-dev-insecure-token-secret";
}

function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str) {
  return Buffer.from(String(str).replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function hmac(data) {
  return crypto.createHmac("sha256", signingSecret()).update(data).digest();
}

/**
 * Build a compact HMAC-signed token from a payload object.
 */
function signCompact(payload) {
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(hmac(body));
  return body + "." + sig;
}

/**
 * Verify a compact token. Returns the payload object, or null if the signature
 * is invalid, the token is malformed, or it has expired.
 */
function verifyCompact(token, expectedTyp) {
  if (!token || typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = hmac(body);
  const provided = b64urlDecode(sig);
  if (provided.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(provided, expected)) return null;

  let payload;
  try {
    payload = JSON.parse(b64urlDecode(body).toString("utf8"));
  } catch {
    return null;
  }
  if (expectedTyp && payload.typ !== expectedTyp) return null;
  if (typeof payload.exp !== "number" || payload.exp < nowSeconds()) return null;
  return payload;
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

// ---- Access tokens --------------------------------------------------------

function issueAccessToken(userId, role) {
  return signCompact({
    sub: userId,
    role: role || "user",
    typ: "access",
    exp: nowSeconds() + ACCESS_TTL_SECONDS,
  });
}

/**
 * Verify an access token. Returns { sub, role } on success, null otherwise.
 */
function verifyAccess(token) {
  const payload = verifyCompact(token, "access");
  if (!payload) return null;
  return { sub: payload.sub, role: payload.role };
}

// ---- MFA tokens (ACCT-003 login seam) -------------------------------------

/**
 * Short-lived scoped token proving the user passed password auth but still owes
 * an MFA challenge. ACCT-003 exchanges it (after verifying a TOTP/recovery code)
 * for a full token pair via issuePair(userId).
 */
function issueMfaToken(userId) {
  return signCompact({
    sub: userId,
    typ: "mfa",
    exp: nowSeconds() + MFA_TTL_SECONDS,
  });
}

function verifyMfaToken(token) {
  const payload = verifyCompact(token, "mfa");
  if (!payload) return null;
  return { sub: payload.sub };
}

// ---- Refresh tokens (opaque, rotating, hashed at rest) --------------------

function hashRefresh(rawToken) {
  return crypto.createHash("sha256").update(String(rawToken)).digest("hex");
}

function newRefreshRaw() {
  return b64url(crypto.randomBytes(32));
}

/**
 * Issue a fresh access+refresh pair for a user, starting a NEW refresh family.
 * Returns { accessToken, refreshToken, familyId, expiresAt }.
 */
function issuePair(userId, role, deviceLabel) {
  const raw = newRefreshRaw();
  const familyId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS).toISOString();
  db.insertRefreshToken.run({
    userId,
    tokenHash: hashRefresh(raw),
    familyId,
    deviceLabel: deviceLabel || null,
    expiresAt,
  });
  return {
    accessToken: issueAccessToken(userId, role),
    refreshToken: raw,
    familyId,
    expiresAt,
  };
}

/**
 * Issue a new refresh token in an EXISTING family (used during rotation).
 */
function issueInFamily(userId, familyId, deviceLabel) {
  const raw = newRefreshRaw();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS).toISOString();
  db.insertRefreshToken.run({
    userId,
    tokenHash: hashRefresh(raw),
    familyId,
    deviceLabel: deviceLabel || null,
    expiresAt,
  });
  return { refreshToken: raw, expiresAt };
}

const ROTATE_OK = "ok";
const ROTATE_INVALID = "invalid"; // unknown / expired token
const ROTATE_REUSE = "reuse"; // already-revoked token presented -> theft

/**
 * Rotate a presented refresh token.
 * Returns one of:
 *   { status: "ok", accessToken, refreshToken, userId, familyId, expiresAt }
 *   { status: "reuse", userId, familyId }  — caller MUST audit; family revoked
 *   { status: "invalid" }                  — unknown or expired token
 *
 * Reuse detection: a token that exists but is already revoked means an old,
 * rotated-away token was replayed. We revoke the whole family and refuse.
 */
function rotate(rawToken, role) {
  if (!rawToken) return { status: ROTATE_INVALID };
  const row = db.findRefreshTokenByHash.get(hashRefresh(rawToken));
  if (!row) return { status: ROTATE_INVALID };

  const now = new Date().toISOString();

  if (row.revoked_at) {
    // Reuse of a rotated token — revoke the entire family.
    db.revokeRefreshFamily.run({ familyId: row.family_id, revokedAt: now });
    return { status: ROTATE_REUSE, userId: row.user_id, familyId: row.family_id };
  }

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    db.revokeRefreshToken.run({ id: row.id, revokedAt: now });
    return { status: ROTATE_INVALID };
  }

  // Valid — revoke the presented token and mint a successor in the same family.
  db.revokeRefreshToken.run({ id: row.id, revokedAt: now });
  const next = issueInFamily(row.user_id, row.family_id, row.device_label);
  return {
    status: ROTATE_OK,
    accessToken: issueAccessToken(row.user_id, role),
    refreshToken: next.refreshToken,
    userId: row.user_id,
    familyId: row.family_id,
    expiresAt: next.expiresAt,
  };
}

/**
 * Revoke the family that a presented refresh token belongs to (logout).
 * Returns { userId, familyId } if found, else null. Idempotent.
 */
function revokeByToken(rawToken) {
  if (!rawToken) return null;
  const row = db.findRefreshTokenByHash.get(hashRefresh(rawToken));
  if (!row) return null;
  db.revokeRefreshFamily.run({ familyId: row.family_id, revokedAt: new Date().toISOString() });
  return { userId: row.user_id, familyId: row.family_id };
}

module.exports = {
  ACCESS_TTL_SECONDS,
  MFA_TTL_SECONDS,
  REFRESH_TTL_MS,
  issueAccessToken,
  verifyAccess,
  issueMfaToken,
  verifyMfaToken,
  issuePair,
  rotate,
  revokeByToken,
  hashRefresh,
  ROTATE_OK,
  ROTATE_INVALID,
  ROTATE_REUSE,
};
