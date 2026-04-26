/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Story 17.40 — Obiter Cloud Search API Client
 *
 * Thin HTTP client that talks to the Obiter Cloud search service.
 * All queries are anonymous (no client identifier). The server enforces
 * per-IP rate limiting. TLS is required.
 */

import { getDevicePref } from "../../store/devicePreferences";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CloudSearchFilter {
  sourceId?: string;
  contentType?: string;
  jurisdiction?: string;
  dateFrom?: string; // ISO date
  dateTo?: string;   // ISO date
}

export interface CloudSearchResult {
  title: string;
  snippet: string;
  sourceId: string;
  sourceUrl: string;
  replicatedAt: string; // ISO date-time
  attributionString: string;
  confidence: number;
}

export interface CloudSearchResponse {
  results: CloudSearchResult[];
  totalHits: number;
  queryTimeMs: number;
}

export interface CloudResolveResponse {
  found: boolean;
  title?: string;
  sourceUrl?: string;
  replicatedAt?: string;
  attributionString?: string;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class CloudClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "CloudClientError";
  }
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = "https://search.obiter.com.au";
const TIMEOUT_MS = 10_000;

export class CloudSearchClient {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl =
      baseUrl ??
      (getDevicePref("cloudBaseUrl") as string | undefined) ??
      DEFAULT_BASE_URL;
  }

  /** Search the Obiter Cloud index. */
  async search(
    query: string,
    filters?: CloudSearchFilter,
  ): Promise<CloudSearchResponse> {
    return this.post<CloudSearchResponse>("/api/search", {
      query,
      ...filters,
    });
  }

  /** Resolve a single citation to its replicated record. */
  async resolve(citation: string): Promise<CloudResolveResponse> {
    return this.post<CloudResolveResponse>("/api/resolve", { citation });
  }

  // -------------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------------

  private async post<T>(path: string, body: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new CloudClientError(
          `Cloud search returned ${response.status}`,
          response.status,
        );
      }

      return (await response.json()) as T;
    } catch (error: unknown) {
      if (error instanceof CloudClientError) throw error;

      if (error instanceof DOMException && error.name === "AbortError") {
        throw new CloudClientError("Cloud search request timed out");
      }

      throw new CloudClientError(
        `Cloud search network error: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
