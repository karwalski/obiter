/**
 * Obiter Website Server — Synced user settings (ACCT-004)
 *
 * Namespaced JSON settings that sync across a user's devices with last-write-wins
 * semantics guarded by a monotonic `settingsVersion` integer.
 *
 * Endpoints (all requireAuth):
 *   GET /api/user/settings  -> { settingsVersion, settings: { ...namespaces } }
 *   PUT /api/user/settings  body { settingsVersion, settings: { ...namespaces } }
 *
 * Versioning contract (last-write-wins with a stale guard):
 *   - Each user has a stored integer version (0 until the first write).
 *   - A PUT must carry settingsVersion === storedVersion (the version the client
 *     last saw). On match the write applies and the stored version becomes
 *     settingsVersion + 1, returned as newVersion.
 *   - A PUT whose settingsVersion is BEHIND the stored one (a stale client) is
 *     rejected with 409 and the CURRENT server state, so the client can rebase.
 *   - Omitting settingsVersion is treated as version 0 (a first-time client).
 *
 * Namespaces are stored one row per namespace (user_settings.key = namespace,
 * value_json = JSON). Unknown namespaces are preserved opaquely — the server does
 * not validate their shape, it round-trips whatever JSON-serialisable value is
 * sent. Known defaults (llmConfig, templatePrefs, autoRefresh, courtToggles) are
 * filled in on GET when absent.
 *
 * NEVER stores key material: any apiKey field found inside an llmConfig namespace
 * is stripped before storage. The vault (routes/vault.js) is the only place keys
 * live, and it is write-only.
 */

"use strict";

const express = require("express");
const router = express.Router();

const db = require("../db");
const { requireAuth } = require("../lib/requireAuth");
const audit = require("../lib/audit");

// Reserved namespace holding the monotonic version integer. Underscored so it
// cannot collide with a real client namespace.
const VERSION_KEY = "_settingsVersion";

// Default namespaces returned on GET when the user has not stored them yet.
// llmConfig is deliberately key-free (the key lives in the write-only vault).
const DEFAULTS = {
  llmConfig: {},
  templatePrefs: {},
  autoRefresh: false,
  courtToggles: {},
};

/**
 * Strip any key material a client might try to smuggle into settings. Keys must
 * only ever reach the vault. We defensively delete common key field names from
 * any object-valued namespace (deep-ish, one level is enough for our shapes).
 */
const KEY_FIELDS = new Set(["apiKey", "api_key", "key", "secret", "apikey"]);

function stripKeyMaterial(value) {
  if (Array.isArray(value)) {
    return value.map(stripKeyMaterial);
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (KEY_FIELDS.has(k)) continue; // drop key-like fields
      out[k] = stripKeyMaterial(v);
    }
    return out;
  }
  return value;
}

/** Read stored settings for a user into { version, settings }. */
function loadSettings(userId) {
  const rows = db.getUserSettings.all(userId);
  let version = 0;
  const settings = {};
  for (const row of rows) {
    if (row.key === VERSION_KEY) {
      const n = parseInt(row.value_json, 10);
      version = Number.isFinite(n) ? n : 0;
      continue;
    }
    let parsed = null;
    try {
      parsed = row.value_json == null ? null : JSON.parse(row.value_json);
    } catch {
      parsed = null;
    }
    settings[row.key] = parsed;
  }
  return { version, settings };
}

/** GET the user's settings (defaults filled in) plus the current version. */
router.get("/", requireAuth, function (req, res) {
  const { version, settings } = loadSettings(req.user.sub);
  const merged = Object.assign({}, DEFAULTS, settings);
  return res.json({ settingsVersion: version, settings: merged });
});

/**
 * PUT settings. Last-write-wins with a stale-version 409 guard.
 */
router.put("/", requireAuth, function (req, res) {
  const userId = req.user.sub;
  const body = req.body || {};
  const settings = body.settings;
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return res.status(400).json({ error: "A settings object is required.", code: "missing_settings" });
  }

  const incoming = Number.isInteger(body.settingsVersion) ? body.settingsVersion : 0;
  const { version: current } = loadSettings(userId);

  if (incoming !== current) {
    // Stale (or ahead-of-server) client — return current state for a rebase.
    const fresh = loadSettings(userId);
    return res.status(409).json({
      error: "Settings have changed since you last loaded them.",
      code: "stale_version",
      settingsVersion: fresh.version,
      settings: Object.assign({}, DEFAULTS, fresh.settings),
    });
  }

  const nextVersion = current + 1;
  const write = db.db.transaction(function () {
    for (const [ns, value] of Object.entries(settings)) {
      if (ns === VERSION_KEY) continue; // reserved — never client-writable
      const clean = stripKeyMaterial(value); // no key material in any namespace
      db.upsertUserSetting.run({
        userId,
        key: ns,
        valueJson: JSON.stringify(clean === undefined ? null : clean),
      });
    }
    db.upsertUserSetting.run({
      userId,
      key: VERSION_KEY,
      valueJson: String(nextVersion),
    });
  });
  write();

  audit.record(userId, "self", "settings.update", req, { version: nextVersion });

  const fresh = loadSettings(userId);
  return res.json({
    settingsVersion: fresh.version,
    settings: Object.assign({}, DEFAULTS, fresh.settings),
  });
});

module.exports = router;
