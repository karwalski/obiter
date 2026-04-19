/**
 * Obiter Website Server — Email via Gmail API
 *
 * Uses googleapis with OAuth2 to send emails through Gmail.
 * Credentials and tokens are loaded from disk or environment variables.
 *
 * Google Cloud Console setup:
 * 1. Create project at console.cloud.google.com
 * 2. Enable Gmail API
 * 3. OAuth consent screen > External > Add scope: gmail.send
 * 4. Credentials > OAuth 2.0 Client ID > Desktop app
 * 5. Download credentials JSON to /etc/obiter/google-credentials.json
 * 6. First run will prompt for authorization in browser
 * 7. Token is cached at /etc/obiter/google-token.json
 *
 * Environment variables:
 *   ADMIN_TOKEN=<random secure token for admin access>
 *   ADMIN_EMAIL=<your email for notifications>
 *   SITE_URL=https://obiter.com.au
 *   GOOGLE_CREDENTIALS_PATH=/etc/obiter/google-credentials.json  (optional, default shown)
 *   GOOGLE_TOKEN_PATH=/etc/obiter/google-token.json              (optional, default shown)
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const readline = require("readline");

const SCOPES = ["https://www.googleapis.com/auth/gmail.send"];
const CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH || "/etc/obiter/google-credentials.json";
const TOKEN_PATH = process.env.GOOGLE_TOKEN_PATH || "/etc/obiter/google-token.json";

var _authClient = null;

/**
 * Load OAuth2 credentials and return an authorised client.
 * On first run (no token file), prints an authorization URL to the console
 * and waits for the user to paste the authorization code.
 */
async function getAuthClient() {
  if (_authClient) return _authClient;

  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(
      "Google credentials file not found at " + CREDENTIALS_PATH +
      ". See email.js header comments for setup instructions."
    );
  }

  var credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf-8"));
  var { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

  var oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // Try to load an existing token
  if (fs.existsSync(TOKEN_PATH)) {
    var token = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
    oAuth2Client.setCredentials(token);

    // Set up automatic token refresh persistence
    oAuth2Client.on("tokens", function (tokens) {
      var existing = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
      var updated = Object.assign({}, existing, tokens);
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(updated, null, 2));
      console.log("Gmail API token refreshed and saved.");
    });

    _authClient = oAuth2Client;
    return _authClient;
  }

  // No token — interactive authorization required (first run only)
  var authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES
  });

  console.log("\n=== Gmail API Authorization Required ===");
  console.log("Open this URL in your browser:\n");
  console.log(authUrl);
  console.log("\nPaste the authorization code below:\n");

  var rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  var code = await new Promise(function (resolve) {
    rl.question("Code: ", function (answer) {
      rl.close();
      resolve(answer.trim());
    });
  });

  var { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);

  // Persist the token
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log("Token saved to " + TOKEN_PATH);

  _authClient = oAuth2Client;
  return _authClient;
}

/**
 * Build a raw RFC 2822 email message encoded in base64url.
 */
function buildRawEmail(to, subject, htmlBody) {
  var fromEmail = process.env.ADMIN_EMAIL || "noreply@obiter.com.au";

  var messageParts = [
    "From: Obiter <" + fromEmail + ">",
    "To: " + to,
    "Subject: " + subject,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
    "",
    htmlBody
  ];

  var message = messageParts.join("\r\n");
  // Base64url encoding
  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Send an email via the Gmail API.
 */
async function sendEmail(to, subject, htmlBody) {
  try {
    var auth = await getAuthClient();
    var gmail = google.gmail({ version: "v1", auth: auth });

    var raw = buildRawEmail(to, subject, htmlBody);

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: raw }
    });

    console.log("Email sent to " + to + ": " + subject);
  } catch (err) {
    console.error("Failed to send email to " + to + ":", err.message);
    // Do not throw — email failure should not break the API response
  }
}

/**
 * Send a verification email for an open letter signature.
 */
async function sendVerificationEmail(to, name, token) {
  var siteUrl = process.env.SITE_URL || "https://obiter.com.au";
  var verifyUrl = siteUrl + "/api/signatures/verify/" + token;

  var subject = "Verify your signature — Obiter Open Letter";

  var html = [
    "<div style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; color: #1E2A38;\">",
    "  <h2 style=\"font-size: 1.25rem; margin-bottom: 16px;\">Verify your signature</h2>",
    "  <p>Dear " + escapeHtml(name) + ",</p>",
    "  <p>Thank you for signing the open letter supporting the development of AGLC5.</p>",
    "  <p>Please confirm your email address by clicking the link below:</p>",
    "  <p style=\"margin: 24px 0;\">",
    "    <a href=\"" + verifyUrl + "\" style=\"display: inline-block; padding: 12px 24px; background-color: #2AA198; color: #FFFFFF; text-decoration: none; border-radius: 4px; font-weight: 600;\">Verify my signature</a>",
    "  </p>",
    "  <p style=\"font-size: 0.875rem; color: #5A6577;\">If you did not sign this letter, you can safely ignore this email.</p>",
    "  <hr style=\"border: none; border-top: 1px solid #D1D5DB; margin: 24px 0;\">",
    "  <p style=\"font-size: 0.8125rem; color: #5A6577;\">Obiter &mdash; obiter.com.au</p>",
    "</div>"
  ].join("\n");

  await sendEmail(to, subject, html);
}

/**
 * Send a notification to the admin when a new contact form submission arrives.
 */
async function sendContactNotification(contact) {
  var adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn("ADMIN_EMAIL not set; skipping contact notification.");
    return;
  }

  var subject = "New contact form submission (" + contact.type + ") — Obiter";

  var html = [
    "<div style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; color: #1E2A38;\">",
    "  <h2 style=\"font-size: 1.25rem; margin-bottom: 16px;\">New Contact Submission</h2>",
    "  <table style=\"border-collapse: collapse; width: 100%;\">",
    "    <tr><td style=\"padding: 8px 12px; font-weight: 600; border-bottom: 1px solid #D1D5DB;\">Type</td><td style=\"padding: 8px 12px; border-bottom: 1px solid #D1D5DB;\">" + escapeHtml(contact.type) + "</td></tr>",
    "    <tr><td style=\"padding: 8px 12px; font-weight: 600; border-bottom: 1px solid #D1D5DB;\">Name</td><td style=\"padding: 8px 12px; border-bottom: 1px solid #D1D5DB;\">" + escapeHtml(contact.name) + "</td></tr>",
    "    <tr><td style=\"padding: 8px 12px; font-weight: 600; border-bottom: 1px solid #D1D5DB;\">Email</td><td style=\"padding: 8px 12px; border-bottom: 1px solid #D1D5DB;\"><a href=\"mailto:" + escapeHtml(contact.email) + "\">" + escapeHtml(contact.email) + "</a></td></tr>",
    "    <tr><td style=\"padding: 8px 12px; font-weight: 600; vertical-align: top;\">Message</td><td style=\"padding: 8px 12px; white-space: pre-wrap;\">" + escapeHtml(contact.message) + "</td></tr>",
    "  </table>",
    "  <hr style=\"border: none; border-top: 1px solid #D1D5DB; margin: 24px 0;\">",
    "  <p style=\"font-size: 0.8125rem; color: #5A6577;\">Obiter Website Server</p>",
    "</div>"
  ].join("\n");

  await sendEmail(adminEmail, subject, html);
}

/**
 * Send a general admin notification email.
 */
async function sendAdminNotification(subject, body) {
  var adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn("ADMIN_EMAIL not set; skipping admin notification.");
    return;
  }

  var html = [
    "<div style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; color: #1E2A38;\">",
    "  <h2 style=\"font-size: 1.25rem; margin-bottom: 16px;\">" + escapeHtml(subject) + "</h2>",
    "  <div style=\"white-space: pre-wrap;\">" + escapeHtml(body) + "</div>",
    "  <hr style=\"border: none; border-top: 1px solid #D1D5DB; margin: 24px 0;\">",
    "  <p style=\"font-size: 0.8125rem; color: #5A6577;\">Obiter Website Server</p>",
    "</div>"
  ].join("\n");

  await sendEmail(adminEmail, subject, html);
}

/**
 * Escape HTML special characters to prevent injection.
 */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

module.exports = {
  sendVerificationEmail,
  sendContactNotification,
  sendAdminNotification
};
