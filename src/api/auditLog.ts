/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Story 17.54 — Verification Audit Log
 *
 * Creates a structured, local-only audit log from a VerificationReport.
 * Includes a SHA-256 document content hash for integrity verification.
 * Never sent to cloud — stored and exported locally only.
 */

import type { VerificationReport, VerificationResult } from "./citationVerifier";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuditLogEntry {
  citationText: string;
  footnoteIndex: number;
  status: string;
  confidence: number;
  sourceAdapterId?: string;
  resolvedTitle?: string;
  resolvedParties?: string;
  resolvedYear?: number;
  resolvedCourt?: string;
  sourceUrl?: string;
  mismatchDetails?: string;
  error?: string;
}

export interface AuditLog {
  version: 1;
  documentTitle: string;
  documentHash: string; // SHA-256 hex digest
  verifiedAt: string; // ISO timestamp
  totalCitations: number;
  summary: {
    verified: number;
    unresolved: number;
    mismatched: number;
    errors: number;
  };
  entries: AuditLogEntry[];
}

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

/**
 * Compute a SHA-256 hex digest of the given text.
 *
 * Uses the Web Crypto API (available in browsers and modern Node.js).
 * Falls back to a stub if SubtleCrypto is unavailable (e.g. in test
 * environments without a polyfill).
 */
export async function sha256(text: string): Promise<string> {
  if (typeof globalThis.crypto?.subtle?.digest === "function") {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Fallback: simple hash for environments without SubtleCrypto
  // This should never be relied on for real integrity checks.
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const chr = text.charCodeAt(i);
    hash = ((hash << 5) - hash + chr) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

// ---------------------------------------------------------------------------
// Audit log creation
// ---------------------------------------------------------------------------

function resultToEntry(result: VerificationResult): AuditLogEntry {
  return {
    citationText: result.citationText,
    footnoteIndex: result.footnoteIndex,
    status: result.status,
    confidence: result.confidence,
    sourceAdapterId: result.sourceAdapterId,
    resolvedTitle: result.resolvedMetadata?.title as string | undefined,
    resolvedParties: result.resolvedMetadata?.parties as string | undefined,
    resolvedYear: result.resolvedMetadata?.year as number | undefined,
    resolvedCourt: result.resolvedMetadata?.court as string | undefined,
    sourceUrl: result.sourceUrl,
    mismatchDetails: result.mismatchDetails,
    error: result.error,
  };
}

/**
 * Create a structured audit log from a verification report.
 *
 * @param report — The verification report to log.
 * @param documentHash — SHA-256 hex digest of the document body text.
 */
export function createAuditLog(
  report: VerificationReport,
  documentHash: string,
): AuditLog {
  return {
    version: 1,
    documentTitle: report.documentTitle,
    documentHash,
    verifiedAt: report.verifiedAt,
    totalCitations: report.totalCitations,
    summary: {
      verified: report.verified,
      unresolved: report.unresolved,
      mismatched: report.mismatched,
      errors: report.errors,
    },
    entries: report.results.map(resultToEntry),
  };
}

// ---------------------------------------------------------------------------
// Plain text export
// ---------------------------------------------------------------------------

function statusLabel(status: string): string {
  switch (status) {
    case "verified":
      return "VERIFIED";
    case "unresolved":
      return "UNRESOLVED";
    case "mismatched":
      return "MISMATCHED";
    case "error":
      return "ERROR";
    default:
      return status.toUpperCase();
  }
}

/**
 * Export an audit log as a human-readable plain text report.
 */
export function exportAuditLogAsText(log: AuditLog): string {
  const lines: string[] = [];

  lines.push("OBITER CITATION VERIFICATION AUDIT LOG");
  lines.push("=".repeat(50));
  lines.push("");
  lines.push(`Document:      ${log.documentTitle}`);
  lines.push(`Document Hash: ${log.documentHash}`);
  lines.push(`Verified At:   ${log.verifiedAt}`);
  lines.push(`Total:         ${log.totalCitations}`);
  lines.push("");
  lines.push("SUMMARY");
  lines.push("-".repeat(50));
  lines.push(`  Verified:    ${log.summary.verified}`);
  lines.push(`  Unresolved:  ${log.summary.unresolved}`);
  lines.push(`  Mismatched:  ${log.summary.mismatched}`);
  lines.push(`  Errors:      ${log.summary.errors}`);
  lines.push("");
  lines.push("DETAILS");
  lines.push("-".repeat(50));

  for (const entry of log.entries) {
    lines.push("");
    lines.push(`  Footnote ${entry.footnoteIndex}: ${entry.citationText}`);
    lines.push(`    Status:     ${statusLabel(entry.status)}`);
    lines.push(`    Confidence: ${entry.confidence}`);

    if (entry.sourceAdapterId) {
      lines.push(`    Source:     ${entry.sourceAdapterId}`);
    }
    if (entry.resolvedTitle) {
      lines.push(`    Title:      ${entry.resolvedTitle}`);
    }
    if (entry.resolvedParties) {
      lines.push(`    Parties:    ${entry.resolvedParties}`);
    }
    if (entry.resolvedYear) {
      lines.push(`    Year:       ${entry.resolvedYear}`);
    }
    if (entry.resolvedCourt) {
      lines.push(`    Court:      ${entry.resolvedCourt}`);
    }
    if (entry.sourceUrl) {
      lines.push(`    URL:        ${entry.sourceUrl}`);
    }
    if (entry.mismatchDetails) {
      lines.push(`    Mismatch:   ${entry.mismatchDetails}`);
    }
    if (entry.error) {
      lines.push(`    Error:      ${entry.error}`);
    }
  }

  lines.push("");
  lines.push("=".repeat(50));
  lines.push("End of audit log");
  lines.push("");

  return lines.join("\n");
}
