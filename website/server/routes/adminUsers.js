/**
 * Obiter Website Server — Admin user management console (ADM-002)
 *
 * Mounted at /api/admin/users by index.js (the mount pre-exists). Every endpoint
 * is guarded by requireAdmin (ADM-001 account access token, role=admin, active
 * account) and every mutating action is recorded to audit_log with the admin as
 * actor (req.adminId). Inputs are zod-validated.
 *
 * Endpoints:
 *   GET    /                          search + list users (metadata + key COUNT)
 *   POST   /:id/lock                  lock an account (status='locked'), audit
 *   POST   /:id/unlock                unlock an account, audit
 *   POST   /:id/force-password-reset  revoke sessions + send a reset email, audit
 *   POST   /:id/mfa-reset             typed-confirmation; clear MFA, audit
 *   POST   /:id/resend-verification   re-send the verification email, audit
 *   POST   /:id/delete                typed-confirmation; purge + anonymise, audit
 *
 * Data-handling guardrails (ADM-002 AC):
 *   - No response ever contains key ciphertext/plaintext or a password hash. The
 *     list projects an explicit safe column set and a stored-key COUNT only.
 *   - Delete is a soft-delete: user_settings, user_keys and refresh tokens are
 *     purged, the user row is ANONYMISED (email scrubbed, hash/MFA cleared,
 *     status='deleted') rather than hard-deleted, and the account's audit_log
 *     rows are anonymised (detail nulled) but retained.
 *   - Lock blocks login immediately: status='locked' is rejected by requireAdmin
 *     and the login route's status/lock checks; locked_until is also set far in
 *     the future as belt-and-braces.
 *   - MFA reset assumes an out-of-band identity check has been completed before
 *     use; the typed confirmation phrase is a deliberate friction, not the check.
 */

"use strict";

const express = require("express");
const crypto = require("crypto");
const { z } = require("zod");

const db = require("../db");
const email = require("../email");
const audit = require("../lib/audit");
const { requireAdmin } = require("../auth");

const router = express.Router();

// Lock sets locked_until this far ahead so a stale token / timing check still
// treats the account as locked even before the status='locked' check runs.
const LOCK_FAR_FUTURE = "9999-12-31T23:59:59.000Z";
const RESET_TTL_MS = 30 * 60 * 1000; // 30 minutes (matches routes/reset.js)

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const listQuerySchema = z.object({
  q: z.string().trim().max(254).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const reasonSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

/** Parse :id to a positive integer, or null. */
function parseId(raw) {
  const n = Number.parseInt(String(raw), 10);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

/** Load a target user or send 404. Returns the row or null (response sent). */
function loadTarget(req, res) {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "Invalid user id." });
    return null;
  }
  const user = db.findUserById.get(id);
  if (!user) {
    res.status(404).json({ error: "User not found." });
    return null;
  }
  return user;
}

// ---------------------------------------------------------------------------
// GET /api/admin/users  — search + list
// ---------------------------------------------------------------------------

router.get("/", requireAdmin, function (req, res) {
  try {
    const parsed = listQuerySchema.safeParse(req.query || {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request." });
    }
    const { q, limit, offset } = parsed.data;
    const pattern = q ? "%" + q.replace(/[%_\\]/g, "\\$&") + "%" : null;
    const lim = limit || 50;
    const off = offset || 0;

    const total = db.adminCountUsers.get({ q: pattern }).total;
    const rows = db.adminListUsers.all({ q: pattern, limit: lim, offset: off });

    // Project a safe, explicit shape. No password hash, no key material — only a
    // stored-key COUNT is exposed.
    const users = rows.map(function (u) {
      return {
        id: u.id,
        email: u.email,
        role: u.role,
        status: u.status,
        mfaEnabled: !!u.mfa_enabled,
        emailVerified: !!u.email_verified_at,
        createdAt: u.created_at,
        lastLoginAt: u.last_login_at,
        failedLoginCount: u.failed_login_count,
        lockedUntil: u.locked_until,
        keyCount: u.key_count,
      };
    });

    return res.json({ users, total, limit: lim, offset: off });
  } catch (err) {
    console.error("GET /api/admin/users error:", err.message);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/users/:id/lock
// ---------------------------------------------------------------------------

router.post("/:id/lock", requireAdmin, function (req, res) {
  try {
    const user = loadTarget(req, res);
    if (!user) return;

    const parsed = reasonSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: "Invalid request." });
    const reason = parsed.data.reason || null;

    db.adminLockUser.run({ id: user.id, lockedUntil: LOCK_FAR_FUTURE });
    audit.record(user.id, String(req.adminId), "admin.user.lock", req, { reason });

    return res.json({ message: "Account locked.", id: user.id, status: "locked" });
  } catch (err) {
    console.error("POST /api/admin/users/:id/lock error:", err.message);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/users/:id/unlock
// ---------------------------------------------------------------------------

router.post("/:id/unlock", requireAdmin, function (req, res) {
  try {
    const user = loadTarget(req, res);
    if (!user) return;

    const parsed = reasonSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: "Invalid request." });
    const reason = parsed.data.reason || null;

    db.adminUnlockUser.run({ id: user.id });
    audit.record(user.id, String(req.adminId), "admin.user.unlock", req, { reason });

    return res.json({ message: "Account unlocked.", id: user.id, status: "active" });
  } catch (err) {
    console.error("POST /api/admin/users/:id/unlock error:", err.message);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/users/:id/force-password-reset
//
// Revokes all of the user's refresh tokens (immediate sign-out everywhere) and
// issues a single-use reset token, emailing the reset link (reusing the
// ACCT-006 path). Generic success even if the email cannot be sent.
// ---------------------------------------------------------------------------

router.post("/:id/force-password-reset", requireAdmin, function (req, res) {
  try {
    const user = loadTarget(req, res);
    if (!user) return;

    const now = new Date().toISOString();
    db.revokeAllRefreshTokensForUser.run({ userId: user.id, revokedAt: now });

    // Mint a single-use, 30-minute reset token (only its hash is stored).
    const raw = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
    const expiresAt = new Date(Date.now() + RESET_TTL_MS).toISOString();
    db.insertResetToken.run({ userId: user.id, tokenHash, expiresAt });

    const siteUrl = process.env.SITE_URL || "https://obiter.com.au";
    const resetUrl = siteUrl + "/api/auth/reset/confirm/" + raw;
    // Fire-and-forget (do not block or fail the request on send errors).
    email.sendPasswordReset(user.email, resetUrl);

    audit.record(user.id, String(req.adminId), "admin.user.force_password_reset", req, null);

    return res.json({ message: "Sessions revoked and a password reset email has been sent." });
  } catch (err) {
    console.error("POST /api/admin/users/:id/force-password-reset error:", err.message);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/users/:id/mfa-reset
//
// Requires a typed-confirmation phrase "RESET MFA <email>". Clears the account's
// MFA entirely (secret, enabled flag, recovery codes, last step). An out-of-band
// identity check of the account holder is ASSUMED to have happened before this
// is used — the phrase is friction, not identity proof.
// ---------------------------------------------------------------------------

router.post("/:id/mfa-reset", requireAdmin, function (req, res) {
  try {
    const user = loadTarget(req, res);
    if (!user) return;

    const confirm = String((req.body || {}).confirm || "");
    const expected = "RESET MFA " + user.email;
    if (confirm !== expected) {
      return res.status(400).json({
        error: "Confirmation phrase does not match.",
        code: "confirmation_mismatch",
      });
    }

    db.clearMfa.run({ id: user.id });
    audit.record(user.id, String(req.adminId), "admin.user.mfa_reset", req, null);

    return res.json({ message: "MFA has been reset for this account.", id: user.id });
  } catch (err) {
    console.error("POST /api/admin/users/:id/mfa-reset error:", err.message);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/users/:id/resend-verification
// ---------------------------------------------------------------------------

router.post("/:id/resend-verification", requireAdmin, function (req, res) {
  try {
    const user = loadTarget(req, res);
    if (!user) return;

    if (user.email_verified_at) {
      return res.status(400).json({ error: "This account is already verified." });
    }

    let token = user.verification_token;
    if (!token) {
      token = crypto.randomBytes(32).toString("hex");
      db.db.prepare("UPDATE users SET verification_token = ? WHERE id = ?").run(token, user.id);
    }
    email.sendAccountVerification(user.email, token);
    audit.record(user.id, String(req.adminId), "admin.user.resend_verification", req, null);

    return res.json({ message: "Verification email sent." });
  } catch (err) {
    console.error("POST /api/admin/users/:id/resend-verification error:", err.message);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/users/:id/delete
//
// Two-step: requires a typed-confirmation phrase "DELETE <email>". Purges
// user_settings, user_keys and refresh tokens, then ANONYMISES the user row
// (email -> deleted+<id>@obiter.invalid, password hash cleared, MFA cleared,
// status='deleted') rather than hard-deleting it, and anonymises (keeps) the
// account's audit_log rows.
// ---------------------------------------------------------------------------

router.post("/:id/delete", requireAdmin, function (req, res) {
  try {
    const user = loadTarget(req, res);
    if (!user) return;

    const confirm = String((req.body || {}).confirm || "");
    const expected = "DELETE " + user.email;
    if (confirm !== expected) {
      return res.status(400).json({
        error: "Confirmation phrase does not match.",
        code: "confirmation_mismatch",
      });
    }

    const now = new Date().toISOString();
    const anonEmail = "deleted+" + user.id + "@obiter.invalid";

    // Purge synced state and revoke sessions, then anonymise the row and its
    // audit trail. Wrapped in a transaction so the account cannot be left in a
    // half-purged state.
    const purge = db.db.transaction(function () {
      db.deleteAllUserSettings.run(user.id);
      db.deleteAllUserKeys.run(user.id);
      db.revokeAllRefreshTokensForUser.run({ userId: user.id, revokedAt: now });
      db.adminAnonymiseUser.run({ id: user.id, email: anonEmail });
      db.adminAnonymiseAuditForUser.run(user.id);
    });
    purge();

    audit.record(user.id, String(req.adminId), "admin.user.delete", req, null);

    return res.json({ message: "Account deleted and anonymised.", id: user.id });
  } catch (err) {
    console.error("POST /api/admin/users/:id/delete error:", err.message);
    return res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
