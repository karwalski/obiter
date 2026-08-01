#!/usr/bin/env node
/**
 * One-off Gmail OAuth re-authorisation for the Obiter mailer (email.js).
 *
 * Use when sending fails with `invalid_grant`. The usual cause is NOT a code
 * bug: it is that the OAuth consent screen is still in "Testing" mode, where
 * Google expires refresh tokens after 7 days. The token file then carries a
 * `refresh_token_expires_in` field — this script warns if it sees one.
 *
 * DURABLE FIX — do this FIRST, or the new token expires again in 7 days:
 *   Google Cloud Console -> APIs & Services -> OAuth consent screen ->
 *   "Publish app" (Testing -> In production). Production refresh tokens do not
 *   expire on a timer (only if revoked or unused for 6 months).
 *
 * Usage (interactive, on the server):
 *   cd /var/www/obiter/server && source /etc/obiter/env.sh
 *   node scripts/reauth-gmail.js
 * Open the printed URL, sign in as SENDER_EMAIL, approve, then paste the `code`
 * value from the resulting http://localhost/?code=... address bar.
 *
 * The running server auto-refreshes the ACCESS token (email.js `on("tokens")`),
 * so once a durable refresh token is in place no further manual steps are needed.
 */

"use strict";

const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");

const CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH || "/etc/obiter/google-credentials.json";
const TOKEN_PATH = process.env.GOOGLE_TOKEN_PATH || "/etc/obiter/google-token.json";
const SCOPES = ["https://www.googleapis.com/auth/gmail.send"];

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a.trim()); }));
}

async function main() {
  const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
  const { client_id, client_secret, redirect_uris } = creds.installed || creds.web;
  const oAuth2 = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  const url = oAuth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force a fresh refresh_token even if already granted
    scope: SCOPES,
  });

  const sender = process.env.SENDER_EMAIL || "the mailer account";
  console.log("\n1. Open this URL and sign in as the SENDER account (" + sender + "):\n");
  console.log("   " + url + "\n");
  console.log("2. Approve. The browser will redirect to http://localhost/?code=...");
  console.log("   (the page will not load — that is expected). Copy the `code` value");
  console.log("   from the address bar and paste it below.\n");

  const code = await ask("code: ");
  const { tokens } = await oAuth2.getToken(code);

  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log("\nToken written to " + TOKEN_PATH);
  console.log("refresh_token present: " + !!tokens.refresh_token);
  if (!tokens.refresh_token) {
    console.error(
      "\nWARNING: no refresh_token returned. Revoke Obiter's access at " +
      "https://myaccount.google.com/permissions and re-run this script."
    );
  }
  if (tokens.refresh_token_expires_in) {
    console.warn(
      "\n*** WARNING: refresh_token_expires_in = " + tokens.refresh_token_expires_in +
      "s. The OAuth consent screen is still in TESTING mode, so this token WILL " +
      "expire again (~7 days). Publish the app to production and re-run. ***"
    );
  }

  // Confirm the whole path works by sending a test message to ADMIN_EMAIL.
  const to = process.env.ADMIN_EMAIL;
  if (to && tokens.refresh_token) {
    oAuth2.setCredentials(tokens);
    const gmail = google.gmail({ version: "v1", auth: oAuth2 });
    const raw = Buffer.from(
      [
        "From: Obiter <" + (process.env.SENDER_EMAIL || "") + ">",
        "To: " + to,
        "Subject: Obiter mailer re-authorised",
        "MIME-Version: 1.0",
        "Content-Type: text/plain; charset=utf-8",
        "",
        "Gmail re-authorisation succeeded. This confirms the mailer can send again.",
      ].join("\r\n")
    ).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
    console.log("Test email sent to " + to + " — check that inbox to confirm delivery.");
  }

  console.log("\nDone. Restart the server so it loads the new token:");
  console.log("  screen -S obiter -X quit 2>/dev/null; pkill -f 'node.*index.js'; sleep 1");
  console.log("  cd /var/www/obiter/server && screen -dmS obiter bash -c 'source /etc/obiter/env.sh && exec node index.js >> /var/www/obiter/server/server.log 2>&1'");
}

main().catch((err) => {
  console.error("\nRe-auth failed: " + err.message);
  process.exit(1);
});
