/**
 * Obiter Website Server — Authenticator MFA routes (ACCT-003)
 *
 * TOTP (RFC 6238) enrolment, login completion, recovery codes, and disable.
 * Mounted at /api/auth/mfa by index.js. All secrets are encrypted at rest via
 * lib/crypto (AES-256-GCM); recovery codes are stored only as argon2 hashes.
 * A code, secret, or recovery code is NEVER logged or returned except the
 * one-time reveal of freshly generated recovery codes.
 */

"use strict";

const express = require("express");
const nodeCrypto = require("crypto");
const db = require("../db");
const totp = require("../lib/totp");
const crypto = require("../lib/crypto");
const tokens = require("../lib/tokens");
const passwords = require("../lib/passwords");
const audit = require("../lib/audit");
const rateLimit = require("../lib/rateLimit");
const stepUp = require("../lib/stepUp");
const { requireAuth } = require("../lib/requireAuth");

const router = express.Router();

const RECOVERY_CODE_COUNT = 10;

/** Generate a batch of human-formatted single-use recovery codes. */
function generateRecoveryCodes() {
  const codes = [];
  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
    // 10 hex chars, grouped as xxxxx-xxxxx for legibility.
    const raw = nodeCrypto.randomBytes(5).toString("hex");
    codes.push(raw.slice(0, 5) + "-" + raw.slice(5));
  }
  return codes;
}

/** Hash all recovery codes for storage (argon2 via passwords.hashPassword). */
async function hashRecoveryCodes(codes) {
  return Promise.all(codes.map((c) => passwords.hashPassword(normaliseRecoveryCode(c))));
}

/** Normalise a submitted or generated recovery code for comparison. */
function normaliseRecoveryCode(input) {
  return String(input || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

// ---------------------------------------------------------------------------
// POST /api/auth/mfa/enroll  (requireAuth)
// Generate a pending TOTP secret; return the otpauth URI + base32 for entry.
// Does NOT enable MFA — /enroll/verify does that.
// ---------------------------------------------------------------------------
router.post("/enroll", requireAuth, async function (req, res) {
  try {
    const user = db.findUserById.get(req.user.sub);
    if (!user) return res.status(401).json({ error: "Authentication required." });

    const secret = totp.generateSecret();
    const secretEnc = crypto.encrypt(secret).combined;
    db.setMfaSecret.run({ id: user.id, secretEnc });

    const uri = totp.keyUri(user.email, "Obiter", secret);
    audit.record(user.id, "self", "auth.mfa.enroll_started", req, null);
    return res.status(200).json({ otpauthUri: uri, secret });
  } catch (err) {
    console.error("POST /api/auth/mfa/enroll error:", err.message);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/mfa/enroll/verify  (requireAuth)
// Verify one code against the pending secret; on success enable MFA and return
// 10 recovery codes ONCE.
// ---------------------------------------------------------------------------
router.post("/enroll/verify", requireAuth, async function (req, res) {
  try {
    const user = db.findUserById.get(req.user.sub);
    if (!user) return res.status(401).json({ error: "Authentication required." });
    if (!user.mfa_secret_enc) {
      return res.status(400).json({ error: "Start enrolment before verifying." });
    }
    const code = (req.body || {}).code;
    if (!code) return res.status(400).json({ error: "An authenticator code is required." });

    let secret;
    try {
      secret = crypto.decrypt(user.mfa_secret_enc);
    } catch {
      return res.status(400).json({ error: "Enrolment could not be read. Start again." });
    }
    const check = totp.verifyWithStep(String(code), secret);
    if (!check.ok) {
      return res.status(401).json({ error: "That authenticator code is not valid." });
    }

    const codes = generateRecoveryCodes();
    const hashes = await hashRecoveryCodes(codes);
    db.setRecoveryCodes.run({ id: user.id, recoveryCodesHash: JSON.stringify(hashes) });
    db.setMfaEnabled.run({ id: user.id, enabled: 1 });
    db.setMfaLastStep.run({ id: user.id, lastStep: check.step });
    audit.record(user.id, "self", "auth.mfa.enabled", req, null);

    return res.status(200).json({ enabled: true, recoveryCodes: codes });
  } catch (err) {
    console.error("POST /api/auth/mfa/enroll/verify error:", err.message);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/mfa/login  (NO requireAuth — completes an MFA login)
// Body { mfaToken, code } where code is a TOTP or a recovery code.
// ---------------------------------------------------------------------------
router.post("/login", rateLimit.middleware("auth.mfa.login", "authStrict"), async function (req, res) {
  try {
    const { mfaToken, code } = req.body || {};
    if (!mfaToken || !code) {
      return res.status(400).json({ error: "A verification code is required." });
    }
    const claim = tokens.verifyMfaToken(mfaToken);
    if (!claim) return res.status(401).json({ error: "That sign-in session has expired." });

    const user = db.findUserById.get(claim.sub);
    if (!user || !user.mfa_enabled || !user.mfa_secret_enc) {
      return res.status(401).json({ error: "Multi-factor sign-in is not available." });
    }

    let secret;
    try {
      secret = crypto.decrypt(user.mfa_secret_enc);
    } catch {
      return res.status(401).json({ error: "Multi-factor verification is unavailable." });
    }

    // Try TOTP first.
    const totpCheck = totp.verifyWithStep(String(code), secret);
    if (totpCheck.ok) {
      if (user.mfa_last_step != null && totpCheck.step <= user.mfa_last_step) {
        return res.status(401).json({ error: "That code was already used." });
      }
      db.setMfaLastStep.run({ id: user.id, lastStep: totpCheck.step });
      return completeLogin(req, res, user, "totp");
    }

    // Fall back to a single-use recovery code.
    const consumed = await consumeRecoveryCode(user, code);
    if (consumed) {
      audit.record(user.id, "self", "auth.mfa.recovery_used", req, null);
      return completeLogin(req, res, user, "recovery");
    }

    return res.status(401).json({ error: "That verification code is not valid." });
  } catch (err) {
    console.error("POST /api/auth/mfa/login error:", err.message);
    return res.status(500).json({ error: "Internal server error." });
  }
});

/** Match a submitted recovery code against stored hashes; consume on hit. */
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
  for (let i = 0; i < hashes.length; i++) {
    if (hashes[i] == null) continue;
    // eslint-disable-next-line no-await-in-loop -- at most 10 codes; stops at the first match
    const ok = await passwords.verifyPassword(hashes[i], candidate);
    if (ok) {
      hashes[i] = null; // single use
      db.setRecoveryCodes.run({ id: user.id, recoveryCodesHash: JSON.stringify(hashes) });
      return true;
    }
  }
  return false;
}

/** Issue the full token pair, mirroring routes/auth.js login success. */
function completeLogin(req, res, user, method) {
  const pair = tokens.issuePair(user.id, user.role, (req.body || {}).deviceLabel);
  audit.record(user.id, "self", "auth.login.success", req, method);
  return res.status(200).json({
    accessToken: pair.accessToken,
    refreshToken: pair.refreshToken,
    expiresIn: tokens.ACCESS_TTL_SECONDS,
  });
}

// ---------------------------------------------------------------------------
// POST /api/auth/mfa/recovery-codes/regenerate  (requireAuth + step-up)
// Requires password + current TOTP (step-up); replaces all codes, returns once.
// ---------------------------------------------------------------------------
router.post("/recovery-codes/regenerate", requireAuth, async function (req, res) {
  try {
    const gate = await stepUp.requireRecentTotp(req);
    if (!gate.ok) return res.status(gate.status).json({ error: gate.error, code: gate.code });
    if (!gate.user.mfa_enabled) {
      return res.status(400).json({ error: "Multi-factor authentication is not enabled." });
    }
    // Regenerate additionally requires the account password even for MFA users.
    const password = (req.body || {}).password;
    const passOk = password && (await passwords.verifyPassword(gate.user.password_hash, String(password)));
    if (!passOk) {
      return res.status(401).json({ error: "Your password is required to continue.", code: "password_required" });
    }

    const codes = generateRecoveryCodes();
    const hashes = await hashRecoveryCodes(codes);
    db.setRecoveryCodes.run({ id: gate.user.id, recoveryCodesHash: JSON.stringify(hashes) });
    audit.record(gate.user.id, "self", "auth.mfa.recovery_regenerated", req, null);
    return res.status(200).json({ recoveryCodes: codes });
  } catch (err) {
    console.error("POST /api/auth/mfa/recovery-codes/regenerate error:", err.message);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/mfa/disable  (requireAuth + step-up)
// Refused for admin-role accounts (MFA is mandatory for admins).
// ---------------------------------------------------------------------------
router.post("/disable", requireAuth, async function (req, res) {
  try {
    const gate = await stepUp.requireRecentTotp(req);
    if (!gate.ok) return res.status(gate.status).json({ error: gate.error, code: gate.code });
    if (gate.user.role === "admin") {
      return res.status(403).json({
        error: "Multi-factor authentication cannot be disabled on an administrator account.",
        code: "admin_mfa_required",
      });
    }
    db.clearMfa.run({ id: gate.user.id });
    audit.record(gate.user.id, "self", "auth.mfa.disabled", req, null);
    return res.status(200).json({ enabled: false });
  } catch (err) {
    console.error("POST /api/auth/mfa/disable error:", err.message);
    return res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
