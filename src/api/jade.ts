/**
 * API-002 — Jade.io Lookup Client
 *
 * Implements SourceLookup for the Jade.io legal research platform.
 * Uses the Jade.io public search endpoint to locate cases and returns
 * structured citation data via fetch().
 */

import { LookupResult, SourceLookup } from "./types";

const JADE_BASE_URL = "https://jade.io/api";

export class JadeClient implements SourceLookup {
  readonly name = "Jade.io";

  readonly supportedTypes: string[] = [
    "case.reported",
    "case.unreported.mnc",
    "case.unreported.no_mnc",
    "case.quasi_judicial",
  ];

  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  async search(query: string): Promise<LookupResult[]> {
    if (!query.trim()) {
      return [];
    }

    try {
      const url = new URL(`${JADE_BASE_URL}/search`);
      url.searchParams.set("q", query);

      const response = await globalThis.fetch(url.toString(), {
        method: "GET",
        headers: this.buildHeaders(),
      });

      if (!response.ok) {
        return [];
      }

      const data: unknown = await response.json();

      return this.parseSearchResults(data);
    } catch {
      return [];
    }
  }

  async fetch(id: string): Promise<Record<string, unknown>> {
    if (!id.trim()) {
      return {};
    }

    try {
      const url = `${JADE_BASE_URL}/article/${encodeURIComponent(id)}`;

      const response = await globalThis.fetch(url, {
        method: "GET",
        headers: this.buildHeaders(),
      });

      if (!response.ok) {
        return {};
      }

      const data: unknown = await response.json();

      return this.parseCitationData(data);
    } catch {
      return {};
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  private parseSearchResults(data: unknown): LookupResult[] {
    if (!data || typeof data !== "object") {
      return [];
    }

    const obj = data as Record<string, unknown>;
    const results = obj["results"];

    if (!Array.isArray(results)) {
      return [];
    }

    return results
      .filter(
        (item: unknown): item is Record<string, unknown> =>
          item !== null && typeof item === "object"
      )
      .map((item) => ({
        title: String(item["title"] ?? ""),
        snippet: String(item["snippet"] ?? item["summary"] ?? ""),
        sourceId: String(item["id"] ?? item["jadeId"] ?? ""),
        confidence: typeof item["score"] === "number" ? item["score"] : 0.5,
      }));
  }

  private parseCitationData(data: unknown): Record<string, unknown> {
    if (!data || typeof data !== "object") {
      return {};
    }

    const obj = data as Record<string, unknown>;

    return {
      title: obj["title"] ?? null,
      citation: obj["citation"] ?? obj["mnc"] ?? null,
      court: obj["court"] ?? null,
      jurisdiction: obj["jurisdiction"] ?? null,
      year: obj["year"] ?? null,
      judges: obj["judges"] ?? null,
      catchwords: obj["catchwords"] ?? null,
      reportSeries: obj["reportSeries"] ?? null,
      startingPage: obj["startingPage"] ?? null,
      medium_neutral_citation: obj["mnc"] ?? obj["medium_neutral_citation"] ?? null,
    };
  }
}
