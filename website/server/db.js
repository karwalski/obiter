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
`);

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
// Exports
// -------------------------------------------------------

module.exports = {
  db,
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
  getSetting,
  upsertSetting
};
