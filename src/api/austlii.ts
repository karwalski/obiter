/**
 * API-001 — AustLII Lookup Client
 *
 * Implements SourceLookup for the Australasian Legal Information Institute.
 * Uses AustLII's publicly documented web interface per their guidance at
 * https://www.austlii.edu.au/techlib/webdev/.
 *
 * HTML responses are parsed using the browser-native DOMParser API.
 */

import { LookupResult, SourceLookup } from "./types";

/** Base URL for all AustLII requests. */
const BASE_URL = "https://www.austlii.edu.au";

/** Search endpoint for Australian legal materials. */
const SEARCH_PATH = "/cgi-bin/sinosrch.cgi";

/** User-Agent header identifying this client. */
const USER_AGENT = "Obiter-AGLC4-WordAddin/1.0 (+https://github.com/aglc/obiter)";

/** Minimum delay between consecutive requests (milliseconds). */
const RATE_LIMIT_MS = 1000;

/**
 * Timestamp of the last outgoing request, used for rate-limit enforcement.
 * Shared across all instances — AustLII rate limits apply per origin.
 */
let lastRequestTime = 0;

/**
 * Enforce the minimum inter-request delay. Resolves once it is safe to send
 * the next request.
 */
async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise<void>((resolve) => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

/**
 * Perform a rate-limited fetch against AustLII, returning the response body as
 * text. Returns `null` on any network or HTTP error — callers should treat
 * `null` as "no data available".
 */
async function fetchPage(url: string): Promise<string | null> {
  await waitForRateLimit();
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!response.ok) {
      return null;
    }
    return await response.text();
  } catch {
    return null;
  }
}

/**
 * Parse an AustLII search results page and return structured results.
 *
 * AustLII search result pages contain an ordered list of results. Each result
 * typically includes a link with the document title and a snippet of matching
 * text.
 */
function parseSearchResults(html: string): LookupResult[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const results: LookupResult[] = [];

  // AustLII search results are rendered as list items (<li>) inside an
  // ordered list (<ol>). Each <li> contains an anchor with the title and
  // surrounding text as the snippet.
  const listItems = doc.querySelectorAll("ol li");

  listItems.forEach((li) => {
    const anchor = li.querySelector("a");
    if (!anchor) return;

    const href = anchor.getAttribute("href") ?? "";
    const title = (anchor.textContent ?? "").trim();
    if (!title || !href) return;

    // Build the sourceId: use the path portion of the URL so callers can
    // pass it directly to fetch().
    let sourceId = href;
    try {
      const parsed = new URL(href, BASE_URL);
      sourceId = parsed.pathname;
    } catch {
      // Keep href as-is if parsing fails.
    }

    // The snippet is the text content of the <li> minus the anchor text.
    const fullText = (li.textContent ?? "").trim();
    const snippet = fullText.replace(title, "").trim().substring(0, 300);

    results.push({
      title,
      snippet,
      sourceId,
      confidence: 0.5,
    });
  });

  return results;
}

/**
 * Extract structured citation metadata from an AustLII case or legislation
 * page.
 */
function parseDocumentPage(html: string, id: string): Record<string, unknown> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const pageTitle = (doc.querySelector("title")?.textContent ?? "").trim();

  // Attempt to extract a medium neutral citation from the page content.
  // MNCs follow the pattern: [YYYY] CourtAbbrev Number
  const mncPattern = /\[\d{4}]\s+[A-Z][A-Za-z]+\s+\d+/;
  const bodyText = doc.body?.textContent ?? "";
  const mncMatch = mncPattern.exec(bodyText);

  // Try to extract the court name — often in a heading or meta tag.
  const courtMeta = doc.querySelector('meta[name="DC.Source"]');
  const court = courtMeta
    ? (courtMeta.getAttribute("content") ?? "")
    : "";

  // Try to extract the date — often in a "DC.Date" or "citation_date" meta.
  const dateMeta =
    doc.querySelector('meta[name="DC.Date"]') ??
    doc.querySelector('meta[name="citation_date"]');
  const date = dateMeta ? (dateMeta.getAttribute("content") ?? "") : "";

  // Try to extract parties from the page title (often "Party v Party").
  const parties = pageTitle.replace(/\s*\[.*$/, "").trim();

  const record: Record<string, unknown> = {
    sourceUrl: `${BASE_URL}${id}`,
    title: pageTitle,
  };

  if (mncMatch) {
    record.mnc = mncMatch[0];
  }
  if (court) {
    record.court = court;
  }
  if (date) {
    record.date = date;
  }
  if (parties) {
    record.parties = parties;
  }

  return record;
}

export class AustliiClient implements SourceLookup {
  readonly name = "AustLII";

  readonly supportedTypes: string[] = [
    "case.reported",
    "case.unreported.mnc",
    "case.unreported.no_mnc",
    "legislation.statute",
    "legislation.delegated",
  ];

  /**
   * Search AustLII for Australian legal materials matching the query.
   *
   * Returns an empty array on any failure — never throws.
   */
  async search(query: string): Promise<LookupResult[]> {
    if (!query.trim()) {
      return [];
    }

    const url = `${BASE_URL}${SEARCH_PATH}?query=${encodeURIComponent(query)}&meta=%2Fau`;
    const html = await fetchPage(url);
    if (!html) {
      return [];
    }

    try {
      return parseSearchResults(html);
    } catch {
      return [];
    }
  }

  /**
   * Fetch structured citation metadata for a document identified by its
   * AustLII URL path (e.g. `/au/cases/HCA/2024/1.html`).
   *
   * Returns an empty object on any failure — never throws.
   */
  async fetch(id: string): Promise<Record<string, unknown>> {
    if (!id.trim()) {
      return {};
    }

    const url = `${BASE_URL}${id}`;
    const html = await fetchPage(url);
    if (!html) {
      return {};
    }

    try {
      return parseDocumentPage(html, id);
    } catch {
      return {};
    }
  }
}
