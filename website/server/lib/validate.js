/**
 * Obiter Website Server — Input validation (ACCT-001)
 *
 * zod schemas for the auth request bodies plus a helper that validates and, on
 * failure, sends a generic 400 (no field-level enumeration that could leak
 * which accounts exist). Later stories add their own schemas alongside these.
 */

"use strict";

const { z } = require("zod");

// Email: trimmed, lowercased, bounded. Password: bounded length only — we do
// not impose composition rules that push users toward weaker, patterned
// passwords; length is the dominant strength factor. Max guards argon2 cost.
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(254)
  .email();

const passwordSchema = z.string().min(8).max(200);

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  // ACCT-002 fills these in; accepted but optional here.
  turnstileToken: z.string().max(4096).optional(),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
  turnstileToken: z.string().max(4096).optional(),
  deviceLabel: z.string().max(120).optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1).max(4096),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1).max(4096),
});

/**
 * Validate req.body against a schema. On success returns the parsed value. On
 * failure sends a generic 400 and returns null (caller should `return` when null).
 */
function parseBody(schema, req, res) {
  const result = schema.safeParse(req.body || {});
  if (!result.success) {
    res.status(400).json({ error: "Invalid request." });
    return null;
  }
  return result.data;
}

module.exports = {
  emailSchema,
  passwordSchema,
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  parseBody,
};
