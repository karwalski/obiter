/**
 * Obiter Website Server — Step-up re-authentication (ACCT-003)
 *
 * A "step-up" proves the person at the keyboard RIGHT NOW controls the second
 * factor (or, for accounts without MFA, still knows the password) before a
 * sensitive operation. ACCT-003 uses it for disable-MFA and regenerate-recovery-
 * codes; ACCT-004 reuses it for DELETE /api/user/keys/:provider, and the
 * account-deletion story reuses it too.
 *
 * Policy:
 *   - If the user HAS MFA enabled: they must supply a CURRENT TOTP code
 *     (body { code }), verified within the +/-1 drift window. "Fresh within 5
 *     minutes" is satisfied intrinsically — a TOTP is only valid for its own
 *     30s step (+/-1), which is far tighter than 5 minutes, so possession is
 *     necessarily recent. Replayed codes are also rejected via the per-user
 *     last-step guard used elsewhere.
 *   - If the user does NOT have MFA: step-up FALLS BACK to password re-entry
 *     (body { password }), so a non-MFA user can still delete keys / their
 *     account. This is documented policy, not an oversight.
 *
 * Usage — call inside a requireAuth-protected handler:
 *   const stepUp = require("../lib/stepUp");
 *   const gate = await stepUp.requireRecentTotp(req);
 *   if (!gate.ok) return res.status(gate.status).json({ error: gate.error, code: gate.code });
 *   // ...proceed; gate.user is the loaded user row.
 *
 * Returns (never throws):
 *   { ok: true, user }
 *   { ok: false, status, code, error }   // status 401/403; code is a stable slug
 *
 * A password, secret, or TOTP code is NEVER logged.
 */

"use strict";

const db = require("../db");
const totp = require("./totp");
const crypto = require("./crypto");
const passwords = require("./passwords");

/**
 * @param {import('express').Request} req  requireAuth must have set req.user.
 * @returns {Promise<{ok:true,user:object}|{ok:false,status:number,code:string,error:string}>}
 */
async function requireRecentTotp(req) {
  const userId = req.user && req.user.sub;
  if (!userId) {
    return { ok: false, status: 401, code: "unauthenticated", error: "Authentication required." };
  }
  const user = db.findUserById.get(userId);
  if (!user) {
    return { ok: false, status: 401, code: "unauthenticated", error: "Authentication required." };
  }

  const body = req.body || {};

  if (user.mfa_enabled) {
    if (!body.code) {
      return {
        ok: false,
        status: 401,
        code: "step_up_required",
        error: "A current authenticator code is required to continue.",
      };
    }
    let secret;
    try {
      secret = crypto.decrypt(user.mfa_secret_enc);
    } catch {
      return { ok: false, status: 401, code: "step_up_required", error: "Multi-factor verification unavailable." };
    }
    const res = totp.verifyWithStep(String(body.code), secret);
    if (!res.ok) {
      return { ok: false, status: 401, code: "step_up_invalid", error: "That authenticator code is not valid." };
    }
    // Replay guard: a step must be strictly newer than the last consumed one.
    if (user.mfa_last_step != null && res.step <= user.mfa_last_step) {
      return { ok: false, status: 401, code: "step_up_replay", error: "That authenticator code was already used." };
    }
    db.setMfaLastStep.run({ id: user.id, lastStep: res.step });
    return { ok: true, user };
  }

  // No MFA -> password fallback.
  if (!body.password) {
    return {
      ok: false,
      status: 401,
      code: "step_up_required",
      error: "Your password is required to continue.",
    };
  }
  const ok = await passwords.verifyPassword(user.password_hash, String(body.password));
  if (!ok) {
    return { ok: false, status: 401, code: "step_up_invalid", error: "That password is not correct." };
  }
  return { ok: true, user };
}

module.exports = { requireRecentTotp };
