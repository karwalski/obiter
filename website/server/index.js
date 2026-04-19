/**
 * Obiter Website Server — Express API
 *
 * Handles open letter signatures, contact form submissions, and admin operations.
 * Runs on port 3001 by default (configurable via PORT env var).
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
 *   PORT=3001
 */

"use strict";

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const db = require("./db");
const { requireAdmin } = require("./auth");
const email = require("./email");

const app = express();
const PORT = process.env.PORT || 3001;

// -------------------------------------------------------
// Middleware
// -------------------------------------------------------

app.use(cors());
app.use(express.json());

// -------------------------------------------------------
// Public routes
// -------------------------------------------------------

/**
 * POST /api/contact
 *
 * Receives contact form submissions (name, email, type, message).
 * Stores in the database and sends a notification email to the admin.
 */
app.post("/api/contact", async function (req, res) {
  try {
    var { name, email: contactEmail, type, message } = req.body;

    // Validation
    if (!name || !contactEmail || !type || !message) {
      return res.status(400).json({ error: "All fields are required." });
    }

    var validTypes = ["general", "feedback", "issue", "enhancement"];
    if (validTypes.indexOf(type) === -1) {
      return res.status(400).json({ error: "Invalid contact type." });
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return res.status(400).json({ error: "Invalid email address." });
    }

    // Store in database
    var result = db.insertContact.run({
      name: name.trim(),
      email: contactEmail.trim(),
      type: type,
      message: message.trim()
    });

    // Send notification email to admin (non-blocking — do not fail the request)
    email.sendContactNotification({
      name: name.trim(),
      email: contactEmail.trim(),
      type: type,
      message: message.trim()
    });

    res.status(201).json({ id: result.lastInsertRowid, message: "Message received." });
  } catch (err) {
    console.error("POST /api/contact error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * POST /api/signatures
 *
 * Submit a new open letter signature.
 * Generates a verification token and sends a verification email.
 * Duplicate submissions (same email hash) are rejected.
 */
app.post("/api/signatures", async function (req, res) {
  try {
    var { name, title, institution, email: sigEmail } = req.body;

    // Validation
    if (!name || !title || !sigEmail) {
      return res.status(400).json({ error: "Name, title, and email are required." });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sigEmail)) {
      return res.status(400).json({ error: "Invalid email address." });
    }

    // Deduplicate by email hash
    var emailHash = crypto.createHash("sha256").update(sigEmail.trim().toLowerCase()).digest("hex");
    var existing = db.findSignatureByEmailHash.get(emailHash);

    if (existing) {
      // If previously rejected, allow re-signing
      if (existing.status === "rejected") {
        // Update existing record instead of creating duplicate
        db.db.prepare(`
          UPDATE signatures
          SET name = ?, title = ?, institution = ?, status = 'pending',
              verification_token = ?, verified_at = NULL, approved_at = NULL
          WHERE id = ?
        `).run(
          name.trim(),
          title.trim(),
          institution ? institution.trim() : null,
          crypto.randomBytes(32).toString("hex"),
          existing.id
        );

        var updated = db.db.prepare("SELECT * FROM signatures WHERE id = ?").get(existing.id);

        email.sendVerificationEmail(sigEmail.trim(), name.trim(), updated.verification_token);

        return res.status(201).json({
          message: "Verification email sent. Please check your inbox."
        });
      }

      return res.status(409).json({
        error: "This email address has already been used to sign the letter."
      });
    }

    // Generate verification token
    var verificationToken = crypto.randomBytes(32).toString("hex");

    // Store signature as pending
    var result = db.insertSignature.run({
      name: name.trim(),
      title: title.trim(),
      institution: institution ? institution.trim() : null,
      email: sigEmail.trim(),
      emailHash: emailHash,
      verificationToken: verificationToken
    });

    // Send verification email (non-blocking)
    email.sendVerificationEmail(sigEmail.trim(), name.trim(), verificationToken);

    res.status(201).json({
      message: "Verification email sent. Please check your inbox."
    });
  } catch (err) {
    console.error("POST /api/signatures error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * GET /api/signatures/verify/:token
 *
 * Verifies a signature's email address.
 * If the email domain is .edu.au, auto-approves the signature.
 * Otherwise, marks as "verified" (needs admin approval).
 */
app.get("/api/signatures/verify/:token", function (req, res) {
  try {
    var signature = db.findSignatureByToken.get(req.params.token);

    if (!signature) {
      return res.status(404).send(verificationPage(
        "Invalid or Expired Link",
        "This verification link is invalid or has already been used.",
        false
      ));
    }

    if (signature.status !== "pending") {
      return res.status(200).send(verificationPage(
        "Already Verified",
        "Your signature has already been verified. Thank you.",
        true
      ));
    }

    // Check if .edu.au domain — auto-approve
    var emailDomain = signature.email.split("@")[1] || "";
    var isEduAu = emailDomain.endsWith(".edu.au");

    var newStatus = isEduAu ? "approved" : "verified";
    var now = new Date().toISOString();

    db.verifySignature.run({
      id: signature.id,
      status: newStatus,
      verifiedAt: now
    });

    if (isEduAu) {
      db.approveSignature.run(signature.id);

      // Notify admin
      email.sendAdminNotification(
        "Signature auto-approved (.edu.au)",
        "Name: " + signature.name + "\nTitle: " + signature.title + "\nInstitution: " + (signature.institution || "N/A") + "\nEmail: " + signature.email
      );
    } else {
      // Notify admin that a signature needs review
      email.sendAdminNotification(
        "New signature awaiting approval",
        "Name: " + signature.name + "\nTitle: " + signature.title + "\nInstitution: " + (signature.institution || "N/A") + "\nEmail domain: " + emailDomain
      );
    }

    var message = isEduAu
      ? "Your signature has been verified and approved. Thank you for your support."
      : "Your email has been verified. Your signature will appear once approved by an administrator.";

    res.status(200).send(verificationPage("Email Verified", message, true));
  } catch (err) {
    console.error("GET /api/signatures/verify error:", err);
    res.status(500).send(verificationPage("Error", "An error occurred. Please try again later.", false));
  }
});

/**
 * GET /api/signatures
 *
 * Returns all approved signatures (name and title only, no emails).
 * Includes a total count.
 */
app.get("/api/signatures", function (req, res) {
  try {
    var signatures = db.getApprovedSignatures.all();
    var countRow = db.countApprovedSignatures.get();

    res.json({
      count: countRow.count,
      signatures: signatures.map(function (s) {
        return { id: s.id, name: s.name, title: s.title };
      })
    });
  } catch (err) {
    console.error("GET /api/signatures error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// -------------------------------------------------------
// Admin routes (all require authentication)
// -------------------------------------------------------

/**
 * GET /api/admin/signatures
 *
 * Returns all signatures with full details and status.
 */
app.get("/api/admin/signatures", requireAdmin, function (req, res) {
  try {
    var signatures = db.getAllSignatures.all();
    res.json({ signatures: signatures });
  } catch (err) {
    console.error("GET /api/admin/signatures error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * POST /api/admin/signatures/:id/approve
 *
 * Approve a signature (changes status to "approved").
 */
app.post("/api/admin/signatures/:id/approve", requireAdmin, function (req, res) {
  try {
    var result = db.approveSignature.run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Signature not found." });
    }
    res.json({ message: "Signature approved." });
  } catch (err) {
    console.error("POST /api/admin/signatures/:id/approve error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * POST /api/admin/signatures/:id/reject
 *
 * Reject a signature (changes status to "rejected").
 */
app.post("/api/admin/signatures/:id/reject", requireAdmin, function (req, res) {
  try {
    var result = db.rejectSignature.run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Signature not found." });
    }
    res.json({ message: "Signature rejected." });
  } catch (err) {
    console.error("POST /api/admin/signatures/:id/reject error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * GET /api/admin/contacts
 *
 * Returns all contact form submissions.
 */
app.get("/api/admin/contacts", requireAdmin, function (req, res) {
  try {
    var contacts = db.getAllContacts.all();
    res.json({ contacts: contacts });
  } catch (err) {
    console.error("GET /api/admin/contacts error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * POST /api/admin/contacts/:id/read
 *
 * Mark a contact submission as read.
 */
app.post("/api/admin/contacts/:id/read", requireAdmin, function (req, res) {
  try {
    var result = db.markContactRead.run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Contact not found." });
    }
    res.json({ message: "Marked as read." });
  } catch (err) {
    console.error("POST /api/admin/contacts/:id/read error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// -------------------------------------------------------
// Helper: verification result page
// -------------------------------------------------------

function verificationPage(title, message, success) {
  var colour = success ? "#2E7D32" : "#C62828";
  return [
    "<!DOCTYPE html>",
    "<html lang=\"en\">",
    "<head>",
    "  <meta charset=\"UTF-8\">",
    "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">",
    "  <title>" + title + " — Obiter</title>",
    "  <style>",
    "    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #F4F5F7; color: #1E2A38; }",
    "    .card { background: #fff; border: 1px solid #D1D5DB; border-radius: 8px; padding: 48px; max-width: 480px; text-align: center; }",
    "    h1 { font-size: 1.5rem; margin-bottom: 16px; color: " + colour + "; }",
    "    p { color: #5A6577; line-height: 1.6; }",
    "    a { color: #2AA198; }",
    "  </style>",
    "</head>",
    "<body>",
    "  <div class=\"card\">",
    "    <h1>" + title + "</h1>",
    "    <p>" + message + "</p>",
    "    <p style=\"margin-top: 24px;\"><a href=\"/\">Return to obiter.com.au</a></p>",
    "  </div>",
    "</body>",
    "</html>"
  ].join("\n");
}

// -------------------------------------------------------
// Start server
// -------------------------------------------------------

app.listen(PORT, function () {
  console.log("Obiter server listening on port " + PORT);
});
