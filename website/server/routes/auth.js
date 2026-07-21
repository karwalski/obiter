/**
 * Obiter Website Server — Auth router (ACCT-001)
 *
 * Endpoints (mounted at /api/auth by index.js):
 *   POST /register            create account, send verification email (no tokens)
 *   GET  /verify-email/:token confirmation page (anti-scanner; does NOT verify)
 *   POST /verify-email/:token perform verification (human click / POST)
 *   POST /login               password auth, lockout, MFA seam, issue token pair
 *   POST /refresh             rotating refresh with reuse detection
 *   POST /logout              revoke the presented refresh token's family
 *
 * Security posture:
 *   - Bearer tokens only; never a ?token= query parameter.
 *   - Generic responses: register and login never reveal whether an email exists.
 *   - argon2id password hashing; timing-safe verify.
 *   - Every auth event is written to audit_log with a hashed IP.
 */

"use strict";

const express = require("express");
const router = express.Router();

const db = require("../db");
const email = require("../email");
const passwords = require("../lib/passwords");
const tokens = require("../lib/tokens");
const audit = require("../lib/audit");
const rateLimit = require("../lib/rateLimit");
const { verifyHuman } = require("../lib/humanCheck");
const {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  parseBody,
} = require("../lib/validate");

const LOCKOUT_THRESHOLD = 8; // consecutive failures before lockout
const LOCKOUT_MINUTES = 30; // lock duration

const crypto = require("crypto");

function newVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

// ---------------------------------------------------------------------------
// Confirmation / result pages (POST-confirm anti-scanner pattern)
// ---------------------------------------------------------------------------

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function confirmPage(token) {
  return [
    "<!DOCTYPE html>",
    "<html lang=\"en\">",
    "<head>",
    "  <meta charset=\"UTF-8\">",
    "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">",
    "  <title>Confirm Your Email &mdash; Obiter</title>",
    "  <style>",
    "    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #F4F5F7; color: #1E2A38; }",
    "    .card { background: #fff; border: 1px solid #D1D5DB; border-radius: 8px; padding: 48px; max-width: 480px; text-align: center; }",
    "    h1 { font-size: 1.5rem; margin-bottom: 16px; color: #2AA198; }",
    "    p { color: #5A6577; line-height: 1.6; }",
    "    .btn { display: inline-block; padding: 14px 32px; background: #2AA198; color: #fff; border: none; border-radius: 4px; font-size: 1rem; font-weight: 600; cursor: pointer; text-decoration: none; margin-top: 16px; }",
    "    .btn:hover { background: #239088; }",
    "  </style>",
    "</head>",
    "<body>",
    "  <div class=\"card\">",
    "    <h1>Confirm Your Email</h1>",
    "    <p>Please click the button below to verify your email address and activate your Obiter account.</p>",
    "    <form method=\"POST\" action=\"/api/auth/verify-email/" + encodeURIComponent(token) + "\">",
    "      <button type=\"submit\" class=\"btn\">Verify my email</button>",
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
// POST /api/auth/register
// ---------------------------------------------------------------------------

router.post("/register", rateLimit.middleware("auth.register", "authStrict"), async function (req, res) {
  try {
    const data = parseBody(registerSchema, req, res);
    if (!data) return;

    // Turnstile hook (no-op passthrough until ACCT-002 fills verifyHuman in).
    if (!(await verifyHuman(data.turnstileToken, req))) {
      return res.status(403).json({ error: "Human verification failed." });
    }

    // Generic response regardless of whether the email already exists — no
    // enumeration. If it exists we silently skip creation.
    const existing = db.findUserByEmail.get(data.email);
    if (!existing) {
      const passwordHash = await passwords.hashPassword(data.password);
      const verificationToken = newVerificationToken();
      const result = db.insertUser.run({
        email: data.email,
        passwordHash,
        role: "user",
        status: "active",
        verificationToken,
      });
      audit.record(result.lastInsertRowid, "self", "auth.register", req, null);
      // Fire-and-forget email (do not block or fail the request on send errors).
      email.sendAccountVerification(data.email, verificationToken);
    } else {
      audit.record(existing.id, "self", "auth.register.duplicate", req, null);
    }

    return res.status(201).json({
      message: "If that email can be registered, a verification email has been sent.",
    });
  } catch (err) {
    console.error("POST /api/auth/register error:", err.message);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/verify-email/:token  — confirmation page (does NOT verify)
// ---------------------------------------------------------------------------

router.get("/verify-email/:token", function (req, res) {
  try {
    const user = db.findUserByVerificationToken.get(req.params.token);
    if (!user) {
      return res
        .status(404)
        .send(resultPage("Invalid or Expired Link", "This verification link is invalid or has already been used.", false));
    }
    if (user.email_verified_at) {
      return res.status(200).send(resultPage("Already Verified", "Your email has already been verified.", true));
    }
    return res.status(200).send(confirmPage(req.params.token));
  } catch (err) {
    console.error("GET /api/auth/verify-email error:", err.message);
    return res.status(500).send(resultPage("Error", "An error occurred. Please try again later.", false));
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/verify-email/:token  — perform verification
// ---------------------------------------------------------------------------

router.post("/verify-email/:token", function (req, res) {
  try {
    const user = db.findUserByVerificationToken.get(req.params.token);
    if (!user) {
      return res
        .status(404)
        .send(resultPage("Invalid or Expired Link", "This verification link is invalid or has already been used.", false));
    }
    if (user.email_verified_at) {
      return res.status(200).send(resultPage("Already Verified", "Your email has already been verified.", true));
    }
    db.markUserEmailVerified.run({ id: user.id, verifiedAt: new Date().toISOString() });
    audit.record(user.id, "self", "auth.email.verified", req, null);
    return res
      .status(200)
      .send(resultPage("Email Verified", "Your email has been verified. You can now sign in to Obiter.", true));
  } catch (err) {
    console.error("POST /api/auth/verify-email error:", err.message);
    return res.status(500).send(resultPage("Error", "An error occurred. Please try again later.", false));
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------

router.post("/login", rateLimit.middleware("auth.login", "authStrict"), async function (req, res) {
  const GENERIC = { error: "Invalid credentials." };
  try {
    const data = parseBody(loginSchema, req, res);
    if (!data) return;

    if (!(await verifyHuman(data.turnstileToken, req))) {
      return res.status(403).json({ error: "Human verification failed." });
    }

    const user = db.findUserByEmail.get(data.email);

    // Unknown email: still spend an argon2 verify to keep timing uniform, then
    // return the generic error (no enumeration).
    if (!user) {
      await passwords.verifyPassword(
        "$argon2id$v=19$m=19456,t=2,p=1$Zm9vYmFyYmF6cXV4$" +
          "aGFzaGhhc2hoYXNoaGFzaGhhc2hoYXNoaGFzaGhhc2g",
        data.password
      );
      audit.record(null, "self", "auth.login.unknown", req, null);
      return res.status(401).json(GENERIC);
    }

    // Lockout check.
    if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
      audit.record(user.id, "self", "auth.login.locked", req, null);
      return res.status(423).json({ error: "Account temporarily locked. Try again later." });
    }

    const ok = await passwords.verifyPassword(user.password_hash, data.password);
    if (!ok) {
      db.incrementFailedLogin.run(user.id);
      const failures = (user.failed_login_count || 0) + 1;
      if (failures >= LOCKOUT_THRESHOLD) {
        const lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString();
        db.setUserLock.run({ id: user.id, lockedUntil });
        audit.record(user.id, "self", "auth.login.lockout", req, { failures });
      } else {
        audit.record(user.id, "self", "auth.login.fail", req, { failures });
      }
      return res.status(401).json(GENERIC);
    }

    // Success: reset counters and stamp last login.
    db.resetFailedLogin.run({ id: user.id, lastLoginAt: new Date().toISOString() });

    // MFA seam (ACCT-003): do NOT issue full tokens when MFA is enabled. Return
    // a short-lived scoped mfaToken the client exchanges after a TOTP challenge.
    if (user.mfa_enabled) {
      const mfaToken = tokens.issueMfaToken(user.id);
      audit.record(user.id, "self", "auth.login.mfa_required", req, null);
      return res.status(200).json({ mfaRequired: true, mfaToken });
    }

    const pair = tokens.issuePair(user.id, user.role, data.deviceLabel);
    audit.record(user.id, "self", "auth.login.success", req, null);
    return res.status(200).json({
      accessToken: pair.accessToken,
      refreshToken: pair.refreshToken,
      expiresIn: tokens.ACCESS_TTL_SECONDS,
    });
  } catch (err) {
    console.error("POST /api/auth/login error:", err.message);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/refresh  — rotation + reuse detection
// ---------------------------------------------------------------------------

router.post("/refresh", async function (req, res) {
  try {
    const data = parseBody(refreshSchema, req, res);
    if (!data) return;

    // Look up the role to embed in the new access token. rotate() operates on
    // the hashed token; we resolve the user via the token row it finds.
    const row = db.findRefreshTokenByHash.get(tokens.hashRefresh(data.refreshToken));
    const role = row ? (db.findUserById.get(row.user_id) || {}).role : "user";

    const result = tokens.rotate(data.refreshToken, role || "user");

    if (result.status === tokens.ROTATE_REUSE) {
      audit.record(result.userId, "self", "auth.refresh.reuse", req, {
        familyId: result.familyId,
      });
      return res.status(401).json({ error: "Invalid token." });
    }
    if (result.status !== tokens.ROTATE_OK) {
      return res.status(401).json({ error: "Invalid token." });
    }

    audit.record(result.userId, "self", "auth.refresh", req, null);
    return res.status(200).json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: tokens.ACCESS_TTL_SECONDS,
    });
  } catch (err) {
    console.error("POST /api/auth/refresh error:", err.message);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout  — revoke the presented token's family
// ---------------------------------------------------------------------------

router.post("/logout", function (req, res) {
  try {
    const data = parseBody(logoutSchema, req, res);
    if (!data) return;

    const revoked = tokens.revokeByToken(data.refreshToken);
    if (revoked) {
      audit.record(revoked.userId, "self", "auth.logout", req, { familyId: revoked.familyId });
    }
    // Always generic — do not reveal whether the token was valid.
    return res.status(200).json({ message: "Signed out." });
  } catch (err) {
    console.error("POST /api/auth/logout error:", err.message);
    return res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
