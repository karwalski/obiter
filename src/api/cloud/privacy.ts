/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Story 17.43 — Privacy & Query Anonymisation
 *
 * All queries sent to the Obiter Cloud search API pass through the
 * sanitiser in this module, which strips personally identifiable
 * information before the request leaves the client.
 *
 * Privacy guarantees:
 *  - No persistent query logs are kept on the server.
 *  - No client identifier (cookie, device ID, etc.) is transmitted.
 *  - All connections use TLS (HTTPS only).
 */

import { getCloudMode } from "./cloudMode";

// ---------------------------------------------------------------------------
// PII patterns
// ---------------------------------------------------------------------------

/**
 * Patterns that are stripped from outbound queries. Each entry is a
 * [regex, replacement] pair. Order matters — earlier patterns are
 * applied first.
 */
const PII_PATTERNS: [RegExp, string][] = [
  // Email addresses
  [/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, "[REDACTED]"],
  // Australian phone numbers: 04xx xxx xxx, (0x) xxxx xxxx, +61 x xxxx xxxx
  [/(?:\+61\s?|\(?0)[2-478]\)?\s?\d{4}[\s\-]?\d{4}/g, "[REDACTED]"],
  // Australian mobile: 04xx or +614xx
  [/(?:\+614|04)\d{2}[\s\-]?\d{3}[\s\-]?\d{3}/g, "[REDACTED]"],
  // Generic international phone: +<country> followed by 7-12 digits
  [/\+\d{1,3}[\s\-]?\d{7,12}/g, "[REDACTED]"],
  // Australian Tax File Numbers (9 digits, sometimes with spaces/dashes)
  [/\b\d{3}[\s\-]?\d{3}[\s\-]?\d{3}\b/g, "[REDACTED]"],
];

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

/**
 * Strip personally identifiable information from a query string before
 * it is sent to the Obiter Cloud search API.
 */
export function sanitiseQuery(query: string): string {
  let sanitised = query;
  for (const [pattern, replacement] of PII_PATTERNS) {
    sanitised = sanitised.replace(pattern, replacement);
  }
  return sanitised;
}

/**
 * Return the Obiter Cloud privacy policy summary. This text is shown
 * in the settings UI when the user enables cloud search.
 */
export function getPrivacyPolicy(): string {
  return [
    "Obiter Cloud Search Privacy Policy",
    "",
    "When cloud search is enabled, citation queries are sent to the Obiter",
    "Cloud search service over TLS (HTTPS). The following guarantees apply:",
    "",
    "1. No persistent query logs are stored on the server.",
    "2. No client identifier, cookie, or device fingerprint is transmitted.",
    "3. Queries are sanitised on the client to remove personally identifiable",
    "   information (email addresses, phone numbers) before transmission.",
    "4. The search index contains only openly licensed legal materials.",
    "5. All server components are open-source under GPLv3. You may self-host",
    "   the search service for complete control (see docs/self-hosting.md).",
    "",
    "You can disable cloud search at any time by switching to local-only mode",
    "in the Obiter settings panel.",
  ].join("\n");
}

/** Convenience check: true when the user has opted out of cloud search. */
export function isLocalOnlyMode(): boolean {
  return getCloudMode() === "local-only";
}
