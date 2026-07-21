#!/usr/bin/env node
/**
 * Obiter Website Server — Bootstrap the first admin (ADM-001)
 *
 * One-off helper to grant the `admin` role to an EXISTING, verified account.
 * Admin auth is now account-based (ADM-001): there is no self-service way to
 * mint the first admin, so this script covers that bootstrap. Later admins can
 * be promoted from the console (ADM-002).
 *
 * Usage:
 *   node scripts/promote-admin.js <email>
 *
 * Requirements:
 *   - The account must already exist (register on the site first).
 *   - The account's email must be verified.
 *
 * After promotion the operator MUST enrol MFA (mandatory for admins): sign in on
 * the site and complete TOTP enrolment before using the admin dashboard.
 *
 * Runs against the same DB_PATH the server uses. On the Lightsail host, source
 * /etc/obiter/env.sh first so DB_PATH matches production.
 */

"use strict";

const db = require("../db");

function fail(message) {
  console.error("Error: " + message);
  process.exit(1);
}

const email = (process.argv[2] || "").trim().toLowerCase();
if (!email) {
  console.error("Usage: node scripts/promote-admin.js <email>");
  process.exit(1);
}

const user = db.findUserByEmail.get(email);
if (!user) {
  fail("No account exists for " + email + ". Have them register on the site first.");
}

if (!user.email_verified_at) {
  fail(
    "Account " + email + " is not email-verified yet. Verify the email before promoting to admin."
  );
}

if (user.role === "admin") {
  console.log(email + " is already an admin (id " + user.id + "). No change made.");
} else {
  db.db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(user.id);
  console.log("Promoted " + email + " (id " + user.id + ") to role=admin.");
}

console.log("");
console.log("IMPORTANT: MFA is mandatory for admins.");
if (!user.mfa_enabled) {
  console.log(
    "This account does NOT have MFA enabled yet. Sign in on the site and complete"
  );
  console.log(
    "TOTP enrolment before signing into the admin dashboard — admin login requires it."
  );
} else {
  console.log("MFA is already enabled on this account. You're ready to sign in.");
}
