/**
 * Obiter Website Server — TOTP core (ACCT-003)
 *
 * Thin wrapper over otplib's authenticator (RFC 6238, SHA-1, 6 digits, 30s
 * period — the parameters every standard authenticator app defaults to). A
 * drift window of +/-1 step (one 30s period either side) is accepted, matching
 * the AGLC/ACCT-003 AC. The secret is a base32 string; it is stored ENCRYPTED
 * at rest via lib/crypto.js and only decrypted in-process to verify a code.
 *
 * Shared by routes/mfa.js and lib/stepUp.js so there is one verification path.
 * A secret or code is NEVER logged.
 */

"use strict";

const { authenticator } = require("otplib");

const PERIOD = 30; // seconds per step
const DRIFT_STEPS = 1; // accept +/-1 step

// Configure the shared authenticator instance. window: [past, future] steps.
authenticator.options = {
  window: [DRIFT_STEPS, DRIFT_STEPS],
  step: PERIOD,
};

function generateSecret() {
  return authenticator.generateSecret(); // base32
}

/**
 * Build the otpauth:// provisioning URI for a QR code / manual entry.
 * label is typically the user's email; issuer is "Obiter".
 */
function keyUri(label, issuer, secret) {
  return authenticator.keyuri(label, issuer, secret);
}

/**
 * Generate the current code for a secret (used in tests / step-up self-check).
 */
function generate(secret) {
  return authenticator.generate(secret);
}

/**
 * Verify a code against a secret within the +/-1 drift window.
 * Returns true/false. Never throws on malformed input.
 */
function verify(code, secret) {
  if (!code || !secret) return false;
  try {
    return authenticator.check(String(code), secret);
  } catch {
    return false;
  }
}

/**
 * Verify AND return the absolute time-step the code belongs to, for replay
 * defence. Returns { ok, step } where step is (epochSeconds/PERIOD) + delta, or
 * { ok: false, step: null } if the code is invalid.
 */
function verifyWithStep(code, secret) {
  if (!code || !secret) return { ok: false, step: null };
  let delta;
  try {
    delta = authenticator.checkDelta(String(code), secret); // number or null
  } catch {
    delta = null;
  }
  if (delta === null || typeof delta !== "number") return { ok: false, step: null };
  const currentStep = Math.floor(Date.now() / 1000 / PERIOD);
  return { ok: true, step: currentStep + delta };
}

module.exports = {
  PERIOD,
  DRIFT_STEPS,
  generateSecret,
  keyUri,
  generate,
  verify,
  verifyWithStep,
};
