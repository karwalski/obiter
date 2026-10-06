/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Pure helpers for scripts/check-court-links.ts (COURT-114). No network
 * access here, so the classification can be unit tested.
 */

import {
  AI_PRACTICE_DIRECTION_LINKS,
  AI_USE_REMINDERS,
  PRACTICE_DIRECTION_LINKS,
  type LinkStatus,
} from "../src/engine/court/practiceDirections";
import { PROFILE_SOURCES } from "../src/engine/court/provenance";

/** One URL to check, with every place that cites it. */
export interface CourtLinkTarget {
  url: string;
  /** Where the URL is cited, eg "PRACTICE_DIRECTION_LINKS HCA: Practice Direction No 2 ...". */
  citedBy: string[];
  /** The status the register records for the link (absent reads as "ok"). */
  recordedStatus?: LinkStatus;
  /** Text the page should contain (eg a version date). */
  expectText?: string;
}

/**
 * COURT-114: every court URL Obiter cites, deduplicated by URL: the
 * practice-direction links, the AI practice-direction links, the AI reminder
 * instruments and the profile sources (evidence register).
 */
export function collectCourtLinks(): CourtLinkTarget[] {
  const byUrl = new Map<string, CourtLinkTarget>();
  const add = (
    url: string | undefined,
    citedBy: string,
    extra?: { recordedStatus?: LinkStatus; expectText?: string }
  ): void => {
    if (!url) return;
    const existing = byUrl.get(url);
    if (existing) {
      existing.citedBy.push(citedBy);
      if (extra?.expectText && !existing.expectText) existing.expectText = extra.expectText;
      return;
    }
    byUrl.set(url, { url, citedBy: [citedBy], ...extra });
  };

  for (const link of PRACTICE_DIRECTION_LINKS) {
    add(link.url, `practice direction ${link.jurisdiction}: ${link.name}`, {
      recordedStatus: link.status,
      expectText: link.expectText,
    });
  }
  for (const link of AI_PRACTICE_DIRECTION_LINKS) {
    add(link.url, `AI practice direction ${link.jurisdiction}: ${link.name}`, {
      recordedStatus: link.status,
      expectText: link.expectText,
    });
  }
  for (const reminder of AI_USE_REMINDERS) {
    for (const instrument of reminder.instruments) {
      add(instrument.url, `AI reminder ${reminder.jurisdiction}: ${instrument.name}`);
    }
  }
  for (const source of Object.values(PROFILE_SOURCES)) {
    add(source.url, `profile source ${source.id}: ${source.title}`);
  }
  return Array.from(byUrl.values());
}

/** What a fetch of a link returned. */
export interface LinkResponse {
  /** HTTP status of the final response; 0 when the request failed. */
  status: number;
  /** URL after redirects. */
  finalUrl: string;
  /** Response body for HTML pages (may be empty for PDFs). */
  body?: string;
  /** Network error text when status is 0. */
  error?: string;
}

/**
 * COURT-114: the outcome of one check.
 *
 * - "ok" — 2xx and not a "page not found" page.
 * - "blocked" — 401/403/429: the site refuses automated checks (Cloudflare);
 *   reported, never a failure.
 * - "broken" — 404/410, any other 4xx/5xx, or a 200 "page not found" page.
 * - "unreachable" — no response (DNS, TLS or timeout).
 */
export type LinkOutcome = "ok" | "blocked" | "broken" | "unreachable";

export interface LinkCheckResult {
  outcome: LinkOutcome;
  /** Short reason, eg "404", "soft 404 (redirected to an error page)". */
  reason: string;
  /** Whether `expectText` was found; undefined when none was expected or not checkable. */
  versionMatch?: boolean;
}

/** Pages that answer 200 but say the page does not exist. */
const SOFT_404_URL = /\/errors?\/404|\/404(\.html?)?(\?|$)|[?&]notfound/i;
const SOFT_404_TITLE = /<title>[^<]*(page not found|404)[^<]*<\/title>/i;
const SOFT_404_BODY = /\bpage not found\b/i;

/**
 * COURT-114: classify a response. Pure: no network.
 */
export function classifyLinkResponse(response: LinkResponse, expectText?: string): LinkCheckResult {
  const { status, finalUrl, body } = response;
  if (status === 0) {
    return { outcome: "unreachable", reason: response.error ?? "no response" };
  }
  if (status === 401 || status === 403 || status === 429) {
    return { outcome: "blocked", reason: `${status} (site refuses automated checks)` };
  }
  if (status >= 400) {
    return { outcome: "broken", reason: String(status) };
  }
  if (SOFT_404_URL.test(finalUrl)) {
    return { outcome: "broken", reason: `soft 404 (redirected to ${finalUrl})` };
  }
  if (body && (SOFT_404_TITLE.test(body) || SOFT_404_BODY.test(body))) {
    return { outcome: "broken", reason: "soft 404 (the page says it was not found)" };
  }
  const result: LinkCheckResult = { outcome: "ok", reason: String(status) };
  if (expectText) {
    result.versionMatch = body !== undefined ? body.includes(expectText) : undefined;
  }
  return result;
}

/**
 * COURT-114: the script's exit code. Broken or unreachable links fail
 * (1) unless `warnOnly` is set; blocked links and version mismatches are
 * reported but never fail, because some court sites answer every
 * automated request with 403.
 */
export function exitCodeFor(results: readonly LinkCheckResult[], warnOnly: boolean): number {
  if (warnOnly) return 0;
  return results.some((r) => r.outcome === "broken" || r.outcome === "unreachable") ? 1 : 0;
}
