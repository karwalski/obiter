/**
 * Obiter Website Server — Database (SQLite via better-sqlite3)
 *
 * Tables: signatures, contacts, admin_settings
 * Database file stored at ./obiter.db (relative to server directory)
 */

"use strict";

const path = require("path");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "obiter.db");

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");

// -------------------------------------------------------
// Schema initialisation
// -------------------------------------------------------

db.exec(`
  CREATE TABLE IF NOT EXISTS signatures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    institution TEXT,
    email TEXT NOT NULL,
    email_hash TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    verification_token TEXT,
    verified_at TEXT,
    approved_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS admin_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS error_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    action TEXT,
    word_version TEXT,
    platform TEXT,
    obiter_version TEXT,
    form_data TEXT,
    standard_id TEXT,
    writing_mode TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS analytics_loads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    obiter_version TEXT NOT NULL,
    word_version TEXT,
    platform TEXT,
    device_hash TEXT,
    variant TEXT NOT NULL DEFAULT 'classic',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS version_releases (
    obiter_version TEXT PRIMARY KEY,
    released_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- ACCT-001: Accounts foundation ------------------------------------------

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    email_verified_at TEXT,
    password_hash TEXT,
    mfa_secret_enc TEXT,
    mfa_enabled INTEGER NOT NULL DEFAULT 0,
    recovery_codes_hash TEXT,
    mfa_last_step INTEGER,
    role TEXT NOT NULL DEFAULT 'user',
    status TEXT NOT NULL DEFAULT 'active',
    failed_login_count INTEGER NOT NULL DEFAULT 0,
    locked_until TEXT,
    verification_token TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_login_at TEXT
  );

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL,
    family_id TEXT NOT NULL,
    device_label TEXT,
    revoked_at TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens (token_hash);
  CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens (family_id);

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    actor TEXT,
    action TEXT NOT NULL,
    ip_hash TEXT,
    detail TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log (user_id);
  CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log (action);

  CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    value_json TEXT,
    PRIMARY KEY (user_id, key)
  );

  CREATE TABLE IF NOT EXISTS user_keys (
    user_id INTEGER NOT NULL,
    provider TEXT NOT NULL,
    key_ciphertext TEXT NOT NULL,
    key_iv TEXT NOT NULL,
    key_last4 TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, provider)
  );

  -- ACCT-006: Password reset tokens ----------------------------------------
  -- Single-use, 30-minute reset tokens. Only sha256(token) is stored (never the
  -- raw token). used_at marks a consumed token so it cannot be replayed.
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens (token_hash);
  CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens (user_id);
`);

// -------------------------------------------------------
// Migrations (idempotent — for databases created before a column existed)
// -------------------------------------------------------

// SITE-ANALYTICS-01: add the product variant ("classic" | "copilot") to
// analytics_loads so the two product lines can be told apart. Existing rows
// backfill to "classic" via the column default.
{
  const cols = db.prepare("PRAGMA table_info(analytics_loads)").all();
  if (!cols.some((c) => c.name === "variant")) {
    db.exec("ALTER TABLE analytics_loads ADD COLUMN variant TEXT NOT NULL DEFAULT 'classic'");
  }
}

// ACCT-001: add the email verification token column to users for databases
// created by an earlier revision of the accounts schema. Idempotent.
{
  const cols = db.prepare("PRAGMA table_info(users)").all();
  if (cols.length && !cols.some((c) => c.name === "verification_token")) {
    db.exec("ALTER TABLE users ADD COLUMN verification_token TEXT");
  }
}

// ACCT-003: add the last-consumed TOTP step column (replay defence) to users on
// databases created before this column existed. Idempotent.
{
  const cols = db.prepare("PRAGMA table_info(users)").all();
  if (cols.length && !cols.some((c) => c.name === "mfa_last_step")) {
    db.exec("ALTER TABLE users ADD COLUMN mfa_last_step INTEGER");
  }
}

// -------------------------------------------------------
// Prepared statements — signatures
// -------------------------------------------------------

const insertSignature = db.prepare(`
  INSERT INTO signatures (name, title, institution, email, email_hash, verification_token)
  VALUES (@name, @title, @institution, @email, @emailHash, @verificationToken)
`);

const findSignatureByToken = db.prepare(`
  SELECT * FROM signatures WHERE verification_token = ?
`);

const findSignatureByEmailHash = db.prepare(`
  SELECT * FROM signatures WHERE email_hash = ?
`);

const verifySignature = db.prepare(`
  UPDATE signatures
  SET status = @status, verified_at = @verifiedAt, verification_token = NULL
  WHERE id = @id
`);

const approveSignature = db.prepare(`
  UPDATE signatures SET status = 'approved', approved_at = datetime('now') WHERE id = ?
`);

const rejectSignature = db.prepare(`
  UPDATE signatures SET status = 'rejected' WHERE id = ?
`);

const getApprovedSignatures = db.prepare(`
  SELECT id, name, title, institution FROM signatures WHERE status = 'approved' ORDER BY approved_at ASC
`);

const countApprovedSignatures = db.prepare(`
  SELECT COUNT(*) AS count FROM signatures WHERE status = 'approved'
`);

const getAllSignatures = db.prepare(`
  SELECT id, name, title, institution, email, status, verified_at, approved_at, created_at
  FROM signatures ORDER BY created_at DESC
`);

// -------------------------------------------------------
// Prepared statements — contacts
// -------------------------------------------------------

const insertContact = db.prepare(`
  INSERT INTO contacts (name, email, type, message)
  VALUES (@name, @email, @type, @message)
`);

const getAllContacts = db.prepare(`
  SELECT * FROM contacts ORDER BY created_at DESC
`);

const markContactRead = db.prepare(`
  UPDATE contacts SET is_read = 1 WHERE id = ?
`);

// -------------------------------------------------------
// Prepared statements — error reports
// -------------------------------------------------------

const insertError = db.prepare(`
  INSERT INTO error_reports (error_message, error_stack, action, word_version, platform, obiter_version, form_data, standard_id, writing_mode)
  VALUES (@errorMessage, @errorStack, @action, @wordVersion, @platform, @obiterVersion, @formData, @standardId, @writingMode)
`);

const getAllErrors = db.prepare(`
  SELECT * FROM error_reports ORDER BY created_at DESC
`);

const markErrorRead = db.prepare(`
  UPDATE error_reports SET is_read = 1 WHERE id = ?
`);

// -------------------------------------------------------
// Prepared statements — analytics
// -------------------------------------------------------

const insertLoad = db.prepare(`
  INSERT INTO analytics_loads (obiter_version, word_version, platform, device_hash, variant)
  VALUES (@obiterVersion, @wordVersion, @platform, @deviceHash, @variant)
`);

// Range-level unique device count. This is the CORRECT unique-user figure:
// summing per-day COUNT(DISTINCT device_hash) double-counts any device active
// on multiple days (SITE-ANALYTICS-01). `variant` = null counts all variants.
const getUniqueUsersInRange = db.prepare(`
  SELECT COUNT(DISTINCT device_hash) AS unique_users
  FROM analytics_loads
  WHERE created_at >= @start AND created_at < @end
    AND (@variant IS NULL OR variant = @variant)
`);

const getTotalLoadsInRange = db.prepare(`
  SELECT COUNT(*) AS loads
  FROM analytics_loads
  WHERE created_at >= @start AND created_at < @end
    AND (@variant IS NULL OR variant = @variant)
`);

// Loads + unique users per product variant over a range.
const getVariantBreakdown = db.prepare(`
  SELECT COALESCE(variant, 'classic') AS variant,
         COUNT(*) AS loads,
         COUNT(DISTINCT device_hash) AS unique_users
  FROM analytics_loads
  WHERE created_at >= @start AND created_at < @end
  GROUP BY COALESCE(variant, 'classic')
  ORDER BY unique_users DESC
`);

// Version adoption (unique users per version) over a range, per variant.
const getVersionAdoption = db.prepare(`
  SELECT obiter_version,
         COALESCE(variant, 'classic') AS variant,
         COUNT(DISTINCT device_hash) AS unique_users,
         COUNT(*) AS loads
  FROM analytics_loads
  WHERE created_at >= @start AND created_at < @end
  GROUP BY obiter_version, COALESCE(variant, 'classic')
  ORDER BY unique_users DESC, obiter_version DESC
`);

const getLoadsByDay = db.prepare(`
  SELECT date(created_at) AS day,
         COUNT(*) AS loads,
         COUNT(DISTINCT device_hash) AS unique_loads,
         obiter_version
  FROM analytics_loads
  WHERE created_at >= @start AND created_at < @end
  GROUP BY day
  ORDER BY day ASC
`);

// Prefer the explicit release date when recorded, falling back to the
// earliest analytics_loads timestamp (i.e. when the version was first
// observed in the wild). This ensures release markers appear on the chart
// at deploy time rather than only after the first installed user opens
// the new version.
const getVersionChanges = db.prepare(`
  SELECT v.obiter_version AS obiter_version,
         COALESCE(r.released_at, MIN(v.created_at)) AS first_seen
  FROM analytics_loads v
  LEFT JOIN version_releases r ON r.obiter_version = v.obiter_version
  GROUP BY v.obiter_version
  UNION
  SELECT obiter_version, released_at AS first_seen
  FROM version_releases
  WHERE obiter_version NOT IN (SELECT obiter_version FROM analytics_loads)
  ORDER BY first_seen ASC
`);

const recordVersionRelease = db.prepare(`
  INSERT INTO version_releases (obiter_version, released_at)
  VALUES (@obiterVersion, @releasedAt)
  ON CONFLICT(obiter_version) DO NOTHING
`);

// -------------------------------------------------------
// Prepared statements — admin settings
// -------------------------------------------------------

const getSetting = db.prepare(`
  SELECT value FROM admin_settings WHERE key = ?
`);

const upsertSetting = db.prepare(`
  INSERT INTO admin_settings (key, value) VALUES (@key, @value)
  ON CONFLICT(key) DO UPDATE SET value = @value
`);

// -------------------------------------------------------
// Prepared statements — users (ACCT-001)
// -------------------------------------------------------

const insertUser = db.prepare(`
  INSERT INTO users (email, password_hash, role, status, verification_token)
  VALUES (@email, @passwordHash, @role, @status, @verificationToken)
`);

const findUserByEmail = db.prepare(`
  SELECT * FROM users WHERE email = ?
`);

const findUserById = db.prepare(`
  SELECT * FROM users WHERE id = ?
`);

const findUserByVerificationToken = db.prepare(`
  SELECT * FROM users WHERE verification_token = ?
`);

const markUserEmailVerified = db.prepare(`
  UPDATE users
  SET email_verified_at = @verifiedAt, verification_token = NULL
  WHERE id = @id
`);

// Failed-login accounting and lockout.
const incrementFailedLogin = db.prepare(`
  UPDATE users
  SET failed_login_count = failed_login_count + 1
  WHERE id = ?
`);

const setUserLock = db.prepare(`
  UPDATE users SET locked_until = @lockedUntil WHERE id = @id
`);

const resetFailedLogin = db.prepare(`
  UPDATE users
  SET failed_login_count = 0, locked_until = NULL, last_login_at = @lastLoginAt
  WHERE id = @id
`);

// -------------------------------------------------------
// Prepared statements — MFA / TOTP (ACCT-003)
// -------------------------------------------------------

// Store (or replace) the encrypted TOTP secret in a PENDING state. Enrolment is
// not active until /enroll/verify flips mfa_enabled to 1.
const setMfaSecret = db.prepare(`
  UPDATE users SET mfa_secret_enc = @secretEnc WHERE id = @id
`);

// Activate or deactivate MFA (0/1).
const setMfaEnabled = db.prepare(`
  UPDATE users SET mfa_enabled = @enabled WHERE id = @id
`);

// Replace the JSON array of argon2-hashed recovery codes.
const setRecoveryCodes = db.prepare(`
  UPDATE users SET recovery_codes_hash = @recoveryCodesHash WHERE id = @id
`);

// Fully clear MFA on disable: secret, enabled flag, recovery codes, last step.
const clearMfa = db.prepare(`
  UPDATE users
  SET mfa_secret_enc = NULL,
      mfa_enabled = 0,
      recovery_codes_hash = NULL,
      mfa_last_step = NULL
  WHERE id = @id
`);

// Record the last consumed TOTP step (unix-seconds / period) for replay defence.
const setMfaLastStep = db.prepare(`
  UPDATE users SET mfa_last_step = @lastStep WHERE id = @id
`);

// -------------------------------------------------------
// Prepared statements — refresh tokens (ACCT-001)
// -------------------------------------------------------

const insertRefreshToken = db.prepare(`
  INSERT INTO refresh_tokens (user_id, token_hash, family_id, device_label, expires_at)
  VALUES (@userId, @tokenHash, @familyId, @deviceLabel, @expiresAt)
`);

const findRefreshTokenByHash = db.prepare(`
  SELECT * FROM refresh_tokens WHERE token_hash = ?
`);

const revokeRefreshToken = db.prepare(`
  UPDATE refresh_tokens SET revoked_at = @revokedAt WHERE id = @id AND revoked_at IS NULL
`);

// Revoke every live token in a family — used for reuse detection and logout.
const revokeRefreshFamily = db.prepare(`
  UPDATE refresh_tokens SET revoked_at = @revokedAt
  WHERE family_id = @familyId AND revoked_at IS NULL
`);

// Revoke EVERY live refresh token for a user, across all families/devices —
// used by password reset (ACCT-006) to invalidate all sessions at once.
const revokeAllRefreshTokensForUser = db.prepare(`
  UPDATE refresh_tokens SET revoked_at = @revokedAt
  WHERE user_id = @userId AND revoked_at IS NULL
`);

// -------------------------------------------------------
// Prepared statements — password reset tokens (ACCT-006)
// -------------------------------------------------------

// Insert a single-use reset token (only its sha256 hash is stored).
const insertResetToken = db.prepare(`
  INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
  VALUES (@userId, @tokenHash, @expiresAt)
`);

const findResetTokenByHash = db.prepare(`
  SELECT * FROM password_reset_tokens WHERE token_hash = ?
`);

// Mark a token consumed (single use). Only flips an as-yet-unused row.
const markResetTokenUsed = db.prepare(`
  UPDATE password_reset_tokens SET used_at = @usedAt WHERE id = @id AND used_at IS NULL
`);

// Housekeeping: drop expired, unused tokens.
const deleteExpiredResetTokens = db.prepare(`
  DELETE FROM password_reset_tokens WHERE expires_at < @now AND used_at IS NULL
`);

// Set (replace) a user's password hash — used by password reset (ACCT-006).
const setUserPasswordHash = db.prepare(`
  UPDATE users SET password_hash = @passwordHash WHERE id = @id
`);

// -------------------------------------------------------
// Prepared statements — audit log (ACCT-001)
// -------------------------------------------------------

const insertAuditLog = db.prepare(`
  INSERT INTO audit_log (user_id, actor, action, ip_hash, detail)
  VALUES (@userId, @actor, @action, @ipHash, @detail)
`);

// -------------------------------------------------------
// Prepared statements — admin user management (ADM-002)
//
// The console never returns key material or password hashes. adminListUsers
// therefore selects an explicit, safe column set plus a per-user stored-key
// COUNT (from user_keys). Search is an email substring; pagination is
// limit/offset. adminCountUsers backs the total for the same filter.
// -------------------------------------------------------

// @q is a LIKE pattern the caller builds ("%" + substr + "%") or null for all.
const adminListUsers = db.prepare(`
  SELECT u.id,
         u.email,
         u.status,
         u.role,
         u.mfa_enabled,
         u.created_at,
         u.last_login_at,
         u.failed_login_count,
         u.locked_until,
         u.email_verified_at,
         (SELECT COUNT(*) FROM user_keys k WHERE k.user_id = u.id) AS key_count
  FROM users u
  WHERE (@q IS NULL OR u.email LIKE @q)
  ORDER BY u.created_at DESC, u.id DESC
  LIMIT @limit OFFSET @offset
`);

const adminCountUsers = db.prepare(`
  SELECT COUNT(*) AS total
  FROM users u
  WHERE (@q IS NULL OR u.email LIKE @q)
`);

// Set an account's status (e.g. 'locked' | 'active' | 'deleted').
const adminSetUserStatus = db.prepare(`
  UPDATE users SET status = @status WHERE id = @id
`);

// Lock: set status='locked' AND locked_until (login checks both). Unlock clears
// both and resets the failed-login counter so the account is immediately usable.
const adminLockUser = db.prepare(`
  UPDATE users SET status = 'locked', locked_until = @lockedUntil WHERE id = @id
`);

const adminUnlockUser = db.prepare(`
  UPDATE users
  SET status = 'active', locked_until = NULL, failed_login_count = 0
  WHERE id = @id
`);

// Anonymise (soft-delete) a user row: scrub the email to a non-routable
// placeholder, clear the password hash and all MFA material, and set
// status='deleted'. The row is kept (not hard-deleted) so audit_log foreign
// references remain meaningful.
const adminAnonymiseUser = db.prepare(`
  UPDATE users
  SET email = @email,
      password_hash = NULL,
      mfa_secret_enc = NULL,
      mfa_enabled = 0,
      recovery_codes_hash = NULL,
      mfa_last_step = NULL,
      verification_token = NULL,
      status = 'deleted'
  WHERE id = @id
`);

// Purge a user's synced settings on account deletion.
const deleteAllUserSettings = db.prepare(`
  DELETE FROM user_settings WHERE user_id = ?
`);

// -------------------------------------------------------
// Prepared statements — audit viewer (ADM-003)
//
// Filterable, paginated, newest-first. Each filter is optional: a null param
// disables that clause. from/to bound created_at (inclusive-from, exclusive-to
// like the analytics range). adminQueryAudit returns rows; adminCountAudit
// returns the total for the same filter set (for pagination).
// -------------------------------------------------------

const adminQueryAudit = db.prepare(`
  SELECT id, user_id, actor, action, detail, created_at
  FROM audit_log
  WHERE (@userId IS NULL OR user_id = @userId)
    AND (@action IS NULL OR action = @action)
    AND (@from IS NULL OR created_at >= @from)
    AND (@to IS NULL OR created_at < @to)
  ORDER BY created_at DESC, id DESC
  LIMIT @limit OFFSET @offset
`);

const adminCountAudit = db.prepare(`
  SELECT COUNT(*) AS total
  FROM audit_log
  WHERE (@userId IS NULL OR user_id = @userId)
    AND (@action IS NULL OR action = @action)
    AND (@from IS NULL OR created_at >= @from)
    AND (@to IS NULL OR created_at < @to)
`);

// Count audit rows whose action matches a LIKE pattern since a cutoff — used by
// the security summary (failed logins, lockouts, MFA resets, admin actions).
const adminCountAuditSince = db.prepare(`
  SELECT COUNT(*) AS count
  FROM audit_log
  WHERE action LIKE @pattern AND created_at >= @since
`);

// Anonymise audit rows for a deleted user (keep the trail, drop any PII in the
// detail column). We null the detail; the numeric user_id is not itself PII.
const adminAnonymiseAuditForUser = db.prepare(`
  UPDATE audit_log SET detail = NULL WHERE user_id = ?
`);

// Retention (ADM-003): prune audit rows older than the 12-month window.
const deleteOldAuditRows = db.prepare(`
  DELETE FROM audit_log WHERE created_at < @cutoff
`);

// -------------------------------------------------------
// Prepared statements — account stats (ADM-004)
//
// Counts only, no per-user PII. "Active" = last_login_at within the window.
// Adoption metrics are DISTINCT user counts against the vault/settings tables.
// Deleted (anonymised) rows are excluded so the totals reflect real accounts.
// -------------------------------------------------------

const adminCountAccounts = db.prepare(`
  SELECT COUNT(*) AS total FROM users WHERE status != 'deleted'
`);

const adminCountNewAccounts = db.prepare(`
  SELECT COUNT(*) AS count
  FROM users
  WHERE status != 'deleted' AND created_at >= @start AND created_at < @end
`);

const adminCountActiveAccounts = db.prepare(`
  SELECT COUNT(*) AS count
  FROM users
  WHERE status != 'deleted'
    AND last_login_at IS NOT NULL
    AND last_login_at >= @start AND last_login_at < @end
`);

const adminCountMfaAccounts = db.prepare(`
  SELECT COUNT(*) AS count FROM users WHERE status != 'deleted' AND mfa_enabled = 1
`);

// Accounts holding at least one vault key.
const adminCountVaultKeyAccounts = db.prepare(`
  SELECT COUNT(DISTINCT k.user_id) AS count
  FROM user_keys k
  JOIN users u ON u.id = k.user_id
  WHERE u.status != 'deleted'
`);

// Accounts with at least one synced setting row.
const adminCountSettingsAccounts = db.prepare(`
  SELECT COUNT(DISTINCT s.user_id) AS count
  FROM user_settings s
  JOIN users u ON u.id = s.user_id
  WHERE u.status != 'deleted'
`);

// -------------------------------------------------------
// Prepared statements — user settings (ACCT-001, used by ACCT-004)
// -------------------------------------------------------

const upsertUserSetting = db.prepare(`
  INSERT INTO user_settings (user_id, key, value_json) VALUES (@userId, @key, @valueJson)
  ON CONFLICT(user_id, key) DO UPDATE SET value_json = @valueJson
`);

const getUserSettings = db.prepare(`
  SELECT key, value_json FROM user_settings WHERE user_id = ?
`);

// -------------------------------------------------------
// Prepared statements — user keys / vault (ACCT-001, used by ACCT-004)
// -------------------------------------------------------

const upsertUserKey = db.prepare(`
  INSERT INTO user_keys (user_id, provider, key_ciphertext, key_iv, key_last4)
  VALUES (@userId, @provider, @keyCiphertext, @keyIv, @keyLast4)
  ON CONFLICT(user_id, provider) DO UPDATE SET
    key_ciphertext = @keyCiphertext, key_iv = @keyIv, key_last4 = @keyLast4
`);

const getUserKey = db.prepare(`
  SELECT * FROM user_keys WHERE user_id = @userId AND provider = @provider
`);

// ACCT-004: metadata-only listing for the write-only vault. Deliberately DOES
// NOT select key_ciphertext / key_iv so no caller can accidentally leak key
// material through the list endpoint — the key is never read back over the API.
const listUserKeys = db.prepare(`
  SELECT provider, key_last4, created_at
  FROM user_keys WHERE user_id = ? ORDER BY provider ASC
`);

const deleteUserKey = db.prepare(`
  DELETE FROM user_keys WHERE user_id = @userId AND provider = @provider
`);

// ACCT-004: purge every stored key for a user (account deletion / bulk wipe).
const deleteAllUserKeys = db.prepare(`
  DELETE FROM user_keys WHERE user_id = ?
`);

// -------------------------------------------------------
// Exports
// -------------------------------------------------------

module.exports = {
  db,
  DB_PATH,
  // users
  insertUser,
  findUserByEmail,
  findUserById,
  findUserByVerificationToken,
  markUserEmailVerified,
  incrementFailedLogin,
  setUserLock,
  resetFailedLogin,
  setUserPasswordHash,
  // MFA / TOTP (ACCT-003)
  setMfaSecret,
  setMfaEnabled,
  setRecoveryCodes,
  clearMfa,
  setMfaLastStep,
  // refresh tokens
  insertRefreshToken,
  findRefreshTokenByHash,
  revokeRefreshToken,
  revokeRefreshFamily,
  revokeAllRefreshTokensForUser,
  // password reset tokens (ACCT-006)
  insertResetToken,
  findResetTokenByHash,
  markResetTokenUsed,
  deleteExpiredResetTokens,
  // audit log
  insertAuditLog,
  // admin user management (ADM-002)
  adminListUsers,
  adminCountUsers,
  adminSetUserStatus,
  adminLockUser,
  adminUnlockUser,
  adminAnonymiseUser,
  deleteAllUserSettings,
  // audit viewer (ADM-003)
  adminQueryAudit,
  adminCountAudit,
  adminCountAuditSince,
  adminAnonymiseAuditForUser,
  deleteOldAuditRows,
  // account stats (ADM-004)
  adminCountAccounts,
  adminCountNewAccounts,
  adminCountActiveAccounts,
  adminCountMfaAccounts,
  adminCountVaultKeyAccounts,
  adminCountSettingsAccounts,
  // user settings
  upsertUserSetting,
  getUserSettings,
  // user keys
  upsertUserKey,
  getUserKey,
  listUserKeys,
  deleteUserKey,
  deleteAllUserKeys,
  insertSignature,
  findSignatureByToken,
  findSignatureByEmailHash,
  verifySignature,
  approveSignature,
  rejectSignature,
  getApprovedSignatures,
  countApprovedSignatures,
  getAllSignatures,
  insertContact,
  getAllContacts,
  markContactRead,
  insertError,
  getAllErrors,
  markErrorRead,
  insertLoad,
  getLoadsByDay,
  getUniqueUsersInRange,
  getTotalLoadsInRange,
  getVariantBreakdown,
  getVersionAdoption,
  getVersionChanges,
  recordVersionRelease,
  getSetting,
  upsertSetting
};
