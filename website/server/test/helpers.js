/**
 * Obiter Website Server — Test harness (ACCT-001)
 *
 * Uses node:test (built into Node 22 — no new dependency) against an isolated
 * temp SQLite database. IMPORTANT: db.js reads DB_PATH and builds prepared
 * statements at require time, so this module sets a fresh temp DB_PATH BEFORE
 * anything requires ./db. Test files must require this helper first.
 *
 * Usage pattern (see auth.test.js):
 *   const { startServer, api, resetRateLimit } = require("./helpers");
 *   const { base } = await startServer();          // ephemeral port
 *   const res = await api(base, "POST", "/api/auth/register", { email, password });
 *
 * Later stories reuse startServer()/api() unchanged; they get the same fresh DB
 * per test process.
 */

"use strict";

const os = require("os");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// --- Isolate the environment BEFORE requiring the app -----------------------
const tmpDb = path.join(os.tmpdir(), "obiter-test-" + crypto.randomUUID() + ".db");
process.env.DB_PATH = tmpDb;
process.env.AUTH_TOKEN_SECRET = "test-secret";
process.env.AUDIT_IP_SALT = "test-salt";
// No Turnstile / hCaptcha / SMTP in tests: verifyHuman passes through, email
// send is a no-op (Gmail creds absent -> sendEmail logs and swallows).
delete process.env.TURNSTILE_SECRET;

const app = require("../index"); // exports the Express app without listening
const db = require("../db");
const rateLimit = require("../lib/rateLimit");

let server = null;
let baseUrl = null;

/**
 * Start the app on an ephemeral port once per test process. Returns { base }.
 */
function startServer() {
  if (baseUrl) return Promise.resolve({ base: baseUrl });
  return new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      baseUrl = "http://127.0.0.1:" + addr.port;
      resolve({ base: baseUrl });
    });
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (server) server.close(() => resolve());
    else resolve();
  });
}

/**
 * JSON request helper using the global fetch. Returns { status, headers, body }
 * where body is parsed JSON when possible, else the raw text.
 */
async function api(base, method, pathname, body, headers) {
  const res = await fetch(base + pathname, {
    method,
    headers: Object.assign({ "Content-Type": "application/json" }, headers || {}),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    /* leave as text (HTML pages) */
  }
  return { status: res.status, headers: res.headers, body: parsed, text };
}

/** Read a user row directly (tests inspect verification tokens etc.). */
function getUserByEmail(emailAddr) {
  return db.findUserByEmail.get(String(emailAddr).toLowerCase());
}

function resetRateLimit() {
  rateLimit._reset();
}

/** Remove the temp DB files after a run. */
function cleanupDb() {
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      fs.unlinkSync(tmpDb + suffix);
    } catch {
      /* ignore */
    }
  }
}

module.exports = {
  app,
  db,
  startServer,
  stopServer,
  api,
  getUserByEmail,
  resetRateLimit,
  cleanupDb,
  tmpDb,
};
