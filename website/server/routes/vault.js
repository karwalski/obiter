/**
 * Obiter Website Server — Write-only API key vault (ACCT-004)
 *
 * A user stores third-party LLM API keys here so they sync across devices. The
 * vault is WRITE-ONLY by design: there is deliberately NO endpoint that returns
 * a stored key. Keys are encrypted at rest (AES-256-GCM via lib/crypto, master
 * key from env VAULT_MASTER_KEY) and are only ever decrypted in-process by the
 * LLM proxy in index.js when a request is session-authenticated and carries no
 * inline apiKey.
 *
 * Endpoints (all requireAuth):
 *   PUT    /api/user/keys/:provider   body { apiKey }  -> { provider, last4 }
 *   GET    /api/user/keys             -> [{ provider, last4, createdAt }]  (metadata only)
 *   DELETE /api/user/keys/:provider   (step-up: TOTP if MFA, else password) -> { deleted }
 *
 * Storage format: the crypto.encrypt(plaintext).combined self-describing string
 * ("v1.gcm.iv.tag.ct") is stored WHOLE in key_ciphertext and is the single source
 * of truth for decryption. The key_iv column is NOT NULL in the ACCT-001 schema,
 * so it holds the base64 IV (crypto.encrypt().iv) for display/debugging only; the
 * IV is not secret and is also embedded in the combined string, so the column is
 * effectively redundant but kept populated to satisfy the constraint. last4
 * (display only) is stored in key_last4.
 *
 * A key, plaintext, or ciphertext is NEVER logged and NEVER returned to a client.
 */

"use strict";

const express = require("express");
const router = express.Router();

const db = require("../db");
const crypto = require("../lib/crypto");
const { requireAuth } = require("../lib/requireAuth");
const stepUp = require("../lib/stepUp");
const audit = require("../lib/audit");

// Providers a user may store a key for. Must stay a fixed allow-list so an
// attacker cannot pivot the vault into an open key/value store.
const KNOWN_PROVIDERS = new Set([
  "openai",
  "anthropic",
  "gemini",
  "xai",
  "deepseek",
  "custom",
]);

function last4(str) {
  const s = String(str);
  return s.length <= 4 ? s : s.slice(-4);
}

/**
 * PUT /api/user/keys/:provider  { apiKey }
 * Encrypts and stores (or replaces) the key. Returns provider + last4 only.
 */
router.put("/:provider", requireAuth, function (req, res) {
  const provider = String(req.params.provider || "").toLowerCase();
  if (!KNOWN_PROVIDERS.has(provider)) {
    return res.status(400).json({ error: "Unknown provider.", code: "unknown_provider" });
  }
  const apiKey = req.body && req.body.apiKey;
  if (typeof apiKey !== "string" || apiKey.trim() === "") {
    return res.status(400).json({ error: "An apiKey is required.", code: "missing_api_key" });
  }

  const enc = crypto.encrypt(apiKey);
  const l4 = last4(apiKey);
  db.upsertUserKey.run({
    userId: req.user.sub,
    provider,
    keyCiphertext: enc.combined, // whole self-describing string; source of truth
    keyIv: enc.iv, // base64 IV; NOT NULL in schema, redundant with combined
    keyLast4: l4,
  });

  audit.record(req.user.sub, "self", "vault.key.save", req, { provider });
  return res.json({ provider, last4: l4 });
});

/**
 * GET /api/user/keys  -> metadata list only. No key material is ever returned;
 * this is the write-only property. The query itself does not select ciphertext.
 */
router.get("/", requireAuth, function (req, res) {
  const rows = db.listUserKeys.all(req.user.sub);
  const keys = rows.map(function (r) {
    return { provider: r.provider, last4: r.key_last4, createdAt: r.created_at };
  });
  return res.json({ keys });
});

/**
 * DELETE /api/user/keys/:provider  — requires step-up re-authentication.
 * Non-MFA users fall back to password re-entry (handled inside stepUp).
 */
router.delete("/:provider", requireAuth, async function (req, res) {
  const provider = String(req.params.provider || "").toLowerCase();
  if (!KNOWN_PROVIDERS.has(provider)) {
    return res.status(400).json({ error: "Unknown provider.", code: "unknown_provider" });
  }

  const gate = await stepUp.requireRecentTotp(req);
  if (!gate.ok) {
    return res.status(gate.status).json({ error: gate.error, code: gate.code });
  }

  const info = db.deleteUserKey.run({ userId: req.user.sub, provider });
  audit.record(req.user.sub, "self", "vault.key.delete", req, { provider });
  return res.json({ deleted: info.changes > 0, provider });
});

module.exports = router;
