/**
 * API-004 — Treaty Database Client
 *
 * Implements SourceLookup for treaty lookups across:
 * - Australian Treaties Database (www.austlii.edu.au/au/other/dfat/)
 * - UN Treaty Collection (treaties.un.org)
 *
 * Supports AGLC4 Rule 8 treaty citations.
 */

import { LookupResult, SourceLookup } from "./types";

const AUSTRALIAN_TREATIES_BASE_URL = "https://www.austlii.edu.au/cgi-bin/viewdb/au/other/dfat";
const UN_TREATIES_BASE_URL = "https://treaties.un.org/api";

type TreatySource = "australian" | "un" | "both";

export class TreatyDatabaseClient implements SourceLookup {
  readonly name = "Treaty Database";

  readonly supportedTypes: string[] = ["treaty"];

  private source: TreatySource;

  constructor(source: TreatySource = "both") {
    this.source = source;
  }

  async search(query: string): Promise<LookupResult[]> {
    if (!query.trim()) {
      return [];
    }

    const searches: Promise<LookupResult[]>[] = [];

    if (this.source === "australian" || this.source === "both") {
      searches.push(this.searchAustralian(query));
    }

    if (this.source === "un" || this.source === "both") {
      searches.push(this.searchUN(query));
    }

    const allResults = await Promise.all(searches);

    return allResults
      .flat()
      .sort((a, b) => b.confidence - a.confidence);
  }

  async fetch(id: string): Promise<Record<string, unknown>> {
    if (!id.trim()) {
      return {};
    }

    // Determine source from the id prefix convention: "au:..." or "un:..."
    if (id.startsWith("un:")) {
      return this.fetchUN(id.slice(3));
    }

    // Default to Australian Treaties Database
    const cleanId = id.startsWith("au:") ? id.slice(3) : id;
    return this.fetchAustralian(cleanId);
  }

  private async searchAustralian(query: string): Promise<LookupResult[]> {
    try {
      const url = new URL(AUSTRALIAN_TREATIES_BASE_URL);
      url.searchParams.set("query", query);

      const response = await globalThis.fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        return [];
      }

      const data: unknown = await response.json();

      return this.parseAustralianResults(data);
    } catch {
      return [];
    }
  }

  private async searchUN(query: string): Promise<LookupResult[]> {
    try {
      const url = new URL(`${UN_TREATIES_BASE_URL}/search`);
      url.searchParams.set("q", query);

      const response = await globalThis.fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        return [];
      }

      const data: unknown = await response.json();

      return this.parseUNResults(data);
    } catch {
      return [];
    }
  }

  private async fetchAustralian(id: string): Promise<Record<string, unknown>> {
    try {
      const url = `${AUSTRALIAN_TREATIES_BASE_URL}/${encodeURIComponent(id)}`;

      const response = await globalThis.fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        return {};
      }

      const data: unknown = await response.json();

      return this.parseTreatyData(data, "australian");
    } catch {
      return {};
    }
  }

  private async fetchUN(id: string): Promise<Record<string, unknown>> {
    try {
      const url = `${UN_TREATIES_BASE_URL}/treaty/${encodeURIComponent(id)}`;

      const response = await globalThis.fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        return {};
      }

      const data: unknown = await response.json();

      return this.parseTreatyData(data, "un");
    } catch {
      return {};
    }
  }

  private parseAustralianResults(data: unknown): LookupResult[] {
    if (!data || typeof data !== "object") {
      return [];
    }

    const obj = data as Record<string, unknown>;
    const results = obj["results"] ?? obj["treaties"];

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
        snippet: String(item["snippet"] ?? item["status"] ?? ""),
        sourceId: `au:${String(item["id"] ?? item["atsId"] ?? "")}`,
        confidence: typeof item["score"] === "number" ? item["score"] : 0.5,
      }));
  }

  private parseUNResults(data: unknown): LookupResult[] {
    if (!data || typeof data !== "object") {
      return [];
    }

    const obj = data as Record<string, unknown>;
    const results = obj["results"] ?? obj["treaties"];

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
        sourceId: `un:${String(item["id"] ?? item["untsId"] ?? "")}`,
        confidence: typeof item["score"] === "number" ? item["score"] : 0.4,
      }));
  }

  private parseTreatyData(
    data: unknown,
    source: "australian" | "un"
  ): Record<string, unknown> {
    if (!data || typeof data !== "object") {
      return {};
    }

    const obj = data as Record<string, unknown>;

    return {
      title: obj["title"] ?? obj["name"] ?? null,
      source,
      dateOpened: obj["dateOpened"] ?? obj["openedForSignature"] ?? null,
      dateInForce: obj["dateInForce"] ?? obj["entryIntoForce"] ?? null,
      parties: obj["parties"] ?? null,
      treatySeries: obj["treatySeries"] ?? obj["series"] ?? null,
      volume: obj["volume"] ?? null,
      startingPage: obj["startingPage"] ?? obj["page"] ?? null,
      untsRegistration: obj["untsRegistration"] ?? null,
      atsNumber: obj["atsNumber"] ?? obj["atnif"] ?? null,
      status: obj["status"] ?? null,
    };
  }
}
