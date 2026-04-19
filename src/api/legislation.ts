/**
 * API-003 — Federal Register of Legislation Client
 *
 * Implements SourceLookup for the Federal Register of Legislation
 * (www.legislation.gov.au). Targets the public API for Commonwealth
 * legislation lookup, including Acts, regulations, and other
 * legislative instruments.
 */

import { LookupResult, SourceLookup } from "./types";

const FRL_BASE_URL = "https://www.legislation.gov.au/api";

export class FederalRegisterClient implements SourceLookup {
  readonly name = "Federal Register of Legislation";

  readonly supportedTypes: string[] = [
    "legislation.statute",
    "legislation.delegated",
    "legislation.constitution",
    "legislation.bill",
    "legislation.explanatory",
  ];

  async search(query: string): Promise<LookupResult[]> {
    if (!query.trim()) {
      return [];
    }

    try {
      const url = new URL(`${FRL_BASE_URL}/search`);
      url.searchParams.set("q", query);
      url.searchParams.set("type", "legislation");

      const response = await globalThis.fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
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
      const url = `${FRL_BASE_URL}/legislation/${encodeURIComponent(id)}`;

      const response = await globalThis.fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        return {};
      }

      const data: unknown = await response.json();

      return this.parseLegislationData(data);
    } catch {
      return {};
    }
  }

  private parseSearchResults(data: unknown): LookupResult[] {
    if (!data || typeof data !== "object") {
      return [];
    }

    const obj = data as Record<string, unknown>;
    const results = obj["results"] ?? obj["items"];

    if (!Array.isArray(results)) {
      return [];
    }

    return results
      .filter(
        (item: unknown): item is Record<string, unknown> =>
          item !== null && typeof item === "object"
      )
      .map((item) => ({
        title: String(item["title"] ?? item["name"] ?? ""),
        snippet: String(item["snippet"] ?? item["description"] ?? ""),
        sourceId: String(item["id"] ?? item["registerId"] ?? ""),
        confidence: typeof item["score"] === "number" ? item["score"] : 0.5,
      }));
  }

  private parseLegislationData(data: unknown): Record<string, unknown> {
    if (!data || typeof data !== "object") {
      return {};
    }

    const obj = data as Record<string, unknown>;

    return {
      title: obj["title"] ?? obj["name"] ?? null,
      type: obj["type"] ?? obj["legislationType"] ?? null,
      jurisdiction: obj["jurisdiction"] ?? "Cth",
      year: obj["year"] ?? obj["assent_year"] ?? null,
      number: obj["number"] ?? obj["actNumber"] ?? null,
      registerId: obj["registerId"] ?? obj["id"] ?? null,
      status: obj["status"] ?? null,
      commencementDate: obj["commencementDate"] ?? null,
      repealDate: obj["repealDate"] ?? null,
      series: obj["series"] ?? null,
    };
  }
}
