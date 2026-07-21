/**
 * Obiter Website Server — password reset & email lifecycle (ACCT-006)
 *
 * Mounted at /api/auth/reset by index.js (the mount pre-exists; this file owns
 * its endpoints only). Endpoints:
 *   POST /request               request a reset (Turnstile + rate limit); always
 *                               generic "if that account exists" response.
 *   GET  /confirm/:token        confirmation page (anti-scanner; does NOT reset)
 *   POST /confirm/:token        perform the reset (new password + MFA challenge
 *                               if enrolled); revokes ALL refresh tokens.
 *   POST /resend-verification   re-send an ACCT-001 verification email; generic.
 *
 * Security posture (matches routes/auth.js):
 *   - No user enumeration in ANY response or timing. /request and
 *     /resend-verification always return the same generic body; when the account
 *     does not exist (or is not eligible) a dummy delay keeps timing uniform.
 *   - Reset tokens are 32 random bytes; only sha256(token) is stored, with a
 *     30-minute expiry, single-use. A used/expired token yields a generic error.
 *   - MFA-enrolled accounts MUST pass a TOTP or single-use recovery code before
 *     the new password is applied.
 *   - A password, token, or recovery code is NEVER logged.
 */

"use strict";

const express = require("express");
const nodeCrypto = require("crypto");

const db = require("../db");
const email = require("../email");
const passwords = require("../lib/passwords");
const totp = require("../lib/totp");
const audit = require("../lib/audit");
const rateLimit = require("../lib/rateLimit");
const { verifyHuman } = require("../lib/humanCheck");

const router = express.Router();

const RESET_TTL_MS = 30 * 60 * 1000; // 30 minutes
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 200;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Normalise a submitted email the same way lib/validate does (trim+lowercase). */
function normaliseEmail(input) {
  return String(input || "").trim().toLowerCase();
}

/** Normalise a recovery code for comparison (mirrors routes/mfa.js). */
function normaliseRecoveryCode(input) {
  return String(input || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

function newResetTokenRaw() {
  return nodeCrypto.randomBytes(32).toString("hex");
}

function hashResetToken(raw) {
  return nodeCrypto.createHash("sha256").update(String(raw)).digest("hex");
}

/** Keep timing uniform for the no-op branches (no account / not eligible). */
async function dummyDelay() {
  // Spend a comparable amount of work to an argon2 verify so an attacker cannot
  // distinguish "account exists" from "does not" by response latency.
  await passwords.verifyPassword(
    "$argon2id$v=19$m=19456,t=2,p=1$Zm9vYmFyYmF6cXV4$" +
      "aGFzaGhhc2hoYXNoaGFzaGhhc2hoYXNoaGFzaGhhc2g",
    "timing-uniformity-placeholder"
  );
}

/**
 * Match a submitted recovery code against a user's stored argon2 hashes and, on
 * a hit, consume it (single use). Mirrors the pattern in routes/mfa.js. Returns
 * true when a code was matched and consumed. Kept inline (self-contained) rather
 * than exported so this file does not need to reach into routes/mfa.js.
 */
async function consumeRecoveryCode(user, submitted) {
  if (!user.recovery_codes_hash) return false;
  let hashes;
  try {
    hashes = JSON.parse(user.recovery_codes_hash);
  } catch {
    return false;
  }
  if (!Array.isArray(hashes)) return false;
  const candidate = normaliseRecoveryCode(submitted);
  if (!candidate) return false;
  for (let i = 0; i < hashes.length; i++) {
    if (hashes[i] == null) continue;
    // eslint-disable-next-line no-await-in-loop -- at most 10 codes; stops at first match
    const ok = await passwords.verifyPassword(hashes[i], candidate);
    if (ok) {
      hashes[i] = null; // single use
      db.setRecoveryCodes.run({ id: user.id, recoveryCodesHash: JSON.stringify(hashes) });
      return true;
    }
  }
  return false;
}

/**
 * Verify an MFA challenge (TOTP or recovery code) for a user during reset.
 * Returns true only if a valid, non-replayed TOTP OR an unused recovery code was
 * supplied. TOTP replay is guarded via mfa_last_step, matching routes/mfa.js.
 */
async function verifyMfaChallenge(user, code, req) {
  if (!code) return false;

  // Try TOTP first (if a secret is present).
  if (user.mfa_secret_enc) {
    let secret = null;
    try {
      const crypto = require("../lib/crypto");
      secret = crypto.decrypt(user.mfa_secret_enc);
    } catch {
      secret = null;
    }
    if (secret) {
      const check = totp.verifyWithStep(String(code), secret);
      if (check.ok) {
        if (user.mfa_last_step != null && check.step <= user.mfa_last_step) {
          return false; // replay of an already-consumed step
        }
        db.setMfaLastStep.run({ id: user.id, lastStep: check.step });
        return true;
      }
    }
  }

  // Fall back to a single-use recovery code.
  const consumed = await consumeRecoveryCode(user, code);
  if (consumed) {
    audit.record(user.id, "self", "auth.mfa.recovery_used", req, "password_reset");
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Confirmation / result pages (POST-confirm anti-scanner pattern)
// ---------------------------------------------------------------------------

function confirmPage(token) {
  const action = "/api/auth/reset/confirm/" + encodeURIComponent(token);
  return [
    "<!DOCTYPE html>",
    "<html lang=\"en\">",
    "<head>",
    "  <meta charset=\"UTF-8\">",
    "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">",
    "  <title>Reset Your Password &mdash; Obiter</title>",
    "  <style>",
    "    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #F4F5F7; color: #1E2A38; }",
    "    .card { background: #fff; border: 1px solid #D1D5DB; border-radius: 8px; padding: 48px; max-width: 480px; width: 100%; box-sizing: border-box; }",
    "    h1 { font-size: 1.5rem; margin-bottom: 16px; color: #2AA198; text-align: center; }",
    "    p { color: #5A6577; line-height: 1.6; }",
    "    label { display: block; font-weight: 600; margin: 16px 0 6px; }",
    "    input { width: 100%; padding: 10px 12px; border: 1px solid #D1D5DB; border-radius: 4px; font-size: 1rem; box-sizing: border-box; }",
    "    .btn { display: block; width: 100%; padding: 14px 32px; background: #2AA198; color: #fff; border: none; border-radius: 4px; font-size: 1rem; font-weight: 600; cursor: pointer; margin-top: 24px; }",
    "    .btn:hover { background: #239088; }",
    "    .hint { font-size: 0.8125rem; color: #5A6577; }",
    "  </style>",
    "</head>",
    "<body>",
    "  <div class=\"card\">",
    "    <h1>Reset Your Password</h1>",
    "    <p>Choose a new password for your Obiter account.</p>",
    "    <form method=\"POST\" action=\"" + action + "\">",
    "      <label for=\"password\">New password</label>",
    "      <input id=\"password\" name=\"password\" type=\"password\" autocomplete=\"new-password\" minlength=\"" + PASSWORD_MIN + "\" required>",
    "      <label for=\"code\">Authentication code <span class=\"hint\">(if you use two-factor authentication)</span></label>",
    "      <input id=\"code\" name=\"code\" type=\"text\" inputmode=\"text\" autocomplete=\"one-time-code\">",
    "      <button type=\"submit\" class=\"btn\">Set new password</button>",
    "    </form>",
    "  </div>",
    "</body>",
    "</html>",
  ].join("\n");
}

function resultPage(title, message, success) {
  var colour = success ? "#2E7D32" : "#C62828";
  return [
    "<!DOCTYPE html>",
    "<html lang=\"en\">",
    "<head>",
    "  <meta charset=\"UTF-8\">",
    "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">",
    "  <title>" + escapeHtml(title) + " &mdash; Obiter</title>",
    "  <style>",
    "    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #F4F5F7; color: #1E2A38; }",
    "    .card { background: #fff; border: 1px solid #D1D5DB; border-radius: 8px; padding: 48px; max-width: 480px; text-align: center; }",
    "    h1 { font-size: 1.5rem; margin-bottom: 16px; color: " + colour + "; }",
    "    p { color: #5A6577; line-height: 1.6; }",
    "    a { color: #2AA198; }",
    "  </style>",
    "</head>",
    "<body>",
    "  <div class=\"card\">",
    "    <h1>" + escapeHtml(title) + "</h1>",
    "    <p>" + escapeHtml(message) + "</p>",
    "    <p style=\"margin-top: 24px;\"><a href=\"/\">Return to obiter.com.au</a></p>",
    "  </div>",
    "</body>",
    "</html>",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// POST /api/auth/reset/request  — request a reset (generic, no enumeration)
// ---------------------------------------------------------------------------

const GENERIC_REQUEST = {
  message: "If that account exists, a reset email has been sent.",
};

router.post(
  "/request",
  rateLimit.middleware("auth.reset.request", "authStrict"),
  async function (req, res) {
    try {
      if (!(await verifyHuman((req.body || {}).turnstileToken, req))) {
        return res.status(403).json({ error: "Human verification failed." });
      }

      const emailAddr = normaliseEmail((req.body || {}).email);
      const user = emailAddr ? db.findUserByEmail.get(emailAddr) : null;

      // Only issue a token for an existing, email-verified account. Everything
      // else does a dummy delay so timing does not reveal account state.
      if (user && user.email_verified_at) {
        const raw = newResetTokenRaw();
        const expiresAt = new Date(Date.now() + RESET_TTL_MS).toISOString();
        db.insertResetToken.run({
          userId: user.id,
          tokenHash: hashResetToken(raw),
          expiresAt,
        });
        audit.record(user.id, "self", "auth.reset.requested", req, null);
        const siteUrl = process.env.SITE_URL || "https://obiter.com.au";
        const resetUrl = siteUrl + "/api/auth/reset/confirm/" + raw;
        // Fire-and-forget (do not block or fail the request on send errors).
        email.sendPasswordReset(user.email, resetUrl);
      } else {
        await dummyDelay();
      }

      return res.status(200).json(GENERIC_REQUEST);
    } catch (err) {
      console.error("POST /api/auth/reset/request error:", err.message);
      // Even on error, stay generic to avoid leaking account state.
      return res.status(200).json(GENERIC_REQUEST);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/auth/reset/confirm/:token  — confirmation page (does NOT reset)
// ---------------------------------------------------------------------------

router.get("/confirm/:token", function (req, res) {
  try {
    const row = db.findResetTokenByHash.get(hashResetToken(req.params.token));
    if (!row || row.used_at || new Date(row.expires_at).getTime() <= Date.now()) {
      return res
        .status(400)
        .send(resultPage("Invalid or Expired Link", "This password reset link is invalid or has already been used. You can request a new one.", false));
    }
    return res.status(200).send(confirmPage(req.params.token));
  } catch (err) {
    console.error("GET /api/auth/reset/confirm error:", err.message);
    return res.status(500).send(resultPage("Error", "An error occurred. Please try again later.", false));
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/reset/confirm/:token  — perform the reset
// ---------------------------------------------------------------------------

router.post("/confirm/:token", async function (req, res) {
  const GENERIC_FAIL = { error: "This password reset link is invalid or has already been used." };
  try {
    const password = (req.body || {}).password;
    const code = (req.body || {}).code;

    if (typeof password !== "string" || password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
      return res.status(400).json({ error: "A new password of at least " + PASSWORD_MIN + " characters is required." });
    }

    const row = db.findResetTokenByHash.get(hashResetToken(req.params.token));
    if (!row || row.used_at || new Date(row.expires_at).getTime() <= Date.now()) {
      return res.status(400).json(GENERIC_FAIL);
    }

    const user = db.findUserById.get(row.user_id);
    if (!user) return res.status(400).json(GENERIC_FAIL);

    // MFA gate: an enrolled account cannot reset without a valid TOTP/recovery.
    if (user.mfa_enabled) {
      if (!code) {
        return res.status(401).json({
          error: "An authentication code is required to reset the password on this account.",
          code: "mfa_required",
        });
      }
      const ok = await verifyMfaChallenge(user, code, req);
      if (!ok) {
        audit.record(user.id, "self", "auth.reset.mfa_failed", req, null);
        return res.status(401).json({ error: "That authentication code is not valid.", code: "mfa_invalid" });
      }
    }

    // Apply the new password, consume the token, and revoke ALL sessions.
    const passwordHash = await passwords.hashPassword(password);
    db.setUserPasswordHash.run({ id: user.id, passwordHash });
    db.markResetTokenUsed.run({ id: row.id, usedAt: new Date().toISOString() });
    db.revokeAllRefreshTokensForUser.run({ userId: user.id, revokedAt: new Date().toISOString() });
    audit.record(user.id, "self", "auth.reset.completed", req, null);

    return res.status(200).json({ message: "Your password has been reset. All sessions have been signed out." });
  } catch (err) {
    console.error("POST /api/auth/reset/confirm error:", err.message);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/reset/resend-verification  — re-send verification (generic)
// ---------------------------------------------------------------------------

const GENERIC_RESEND = {
  message: "If that account exists and is not yet verified, a verification email has been sent.",
};

router.post(
  "/resend-verification",
  rateLimit.middleware("auth.reset.resend", "authStrict"),
  async function (req, res) {
    try {
      const emailAddr = normaliseEmail((req.body || {}).email);
      const user = emailAddr ? db.findUserByEmail.get(emailAddr) : null;

      // Only re-send for a still-unverified account that still holds a token.
      if (user && !user.email_verified_at && user.verification_token) {
        audit.record(user.id, "self", "auth.reset.resend_verification", req, null);
        email.sendAccountVerification(user.email, user.verification_token);
      } else {
        await dummyDelay();
      }

      return res.status(200).json(GENERIC_RESEND);
    } catch (err) {
      console.error("POST /api/auth/reset/resend-verification error:", err.message);
      return res.status(200).json(GENERIC_RESEND);
    }
  }
);

module.exports = router;
