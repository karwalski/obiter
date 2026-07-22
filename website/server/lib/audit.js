/**
 * Obiter Website Server — Audit log (ACCT-001)
 *
 * Records auth and account events to the audit_log table. The raw client IP is
 * NEVER stored: it is one-way hashed as sha256(ip + AUDIT_IP_SALT). The salt
 * comes from env AUDIT_IP_SALT with a dev fallback (warned once). Rotating the
 * salt invalidates correlation of old rows — acceptable for an audit trail.
 *
 * record() never throws — an audit failure must not break the request that
 * triggered it. It also never logs passwords, tokens, or key material; callers
 * pass only non-sensitive detail strings.
 */

"use strict";

const crypto = require("crypto");
const db = require("../db");
const { clientIp } = require("./rateLimit");

let _saltWarned = false;
function ipSalt() {
  const s = process.env.AUDIT_IP_SALT;
  if (s) return s;
  if (!_saltWarned) {
    console.warn(
      "AUDIT_IP_SALT is not set; using a development fallback. " +
      "Set AUDIT_IP_SALT in /etc/obiter/env.sh for production."
    );
    _saltWarned = true;
  }
  return "obiter-dev-audit-ip-salt";
}

/**
 * Hash an IP (string) for storage. Returns null for a missing IP.
 */
function hashIp(ip) {
  if (!ip) return null;
  return crypto.createHash("sha256").update(String(ip) + ipSalt()).digest("hex");
}

/**
 * Record an audit event.
 *   userId — subject account id (nullable, e.g. failed login for unknown email)
 *   actor  — who performed it ("self", "system", or an admin id)
 *   action — short machine action string, e.g. "auth.login.success"
 *   ip     — raw ip string OR an Express req (from which the ip is derived)
 *   detail — optional non-sensitive detail string/object
 */
function record(userId, actor, action, ip, detail) {
  try {
    let rawIp = ip;
    if (ip && typeof ip === "object") rawIp = clientIp(ip); // an Express req
    const detailStr =
      detail == null ? null : typeof detail === "string" ? detail : JSON.stringify(detail);
    db.insertAuditLog.run({
      userId: userId == null ? null : userId,
      actor: actor || null,
      action,
      ipHash: hashIp(rawIp),
      detail: detailStr,
    });
  } catch (err) {
    console.error("audit.record failed:", err.message);
  }
}

module.exports = { record, hashIp };
