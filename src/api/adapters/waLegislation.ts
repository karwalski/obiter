/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * WA Legislation Adapter (Story 17.28)
 *
 * Scrapes legislation.wa.gov.au for Western Australian Acts and regulations.
 * Crown copyright.
 */

import type { SourceAdapterDescriptor, LookupResult, SourceMetadata } from "../sourceAdapter";
import { StateLegislationAdapter } from "./stateLegislationBase";

export class WaLegislationAdapter extends StateLegislationAdapter {
  readonly descriptor: SourceAdapterDescriptor = {
    id: "wa-legislation",
    displayName: "WA Legislation",
    jurisdictions: ["AU-WA"],
    contentTypes: ["legislation"],
    accessTier: "live",
    licence: "Crown Copyright (WA)",
    requiresKey: false,
    rateLimitHint: { requestsPerSecond: 1, burst: 2 },
    fragile: true,
  };

  protected readonly baseUrl = "https://legislation.wa.gov.au";

  buildSearchUrl(title: string, year?: number): string {
    const q = year ? `${title} ${year}` : title;
    return `${this.baseUrl}/legislation/statutes.nsf/SearchResult?SearchView&Query=${encodeURIComponent(q)}`;
  }

  buildDetailUrl(id: string): string {
    return `${this.baseUrl}/legislation/statutes.nsf/main_mrtitle_${id}`;
  }

  parseSearchResults(html: string): LookupResult[] {
    const results: LookupResult[] = [];
    const pattern =
      /<a[^>]+href="[^"]*\/statutes\.nsf\/main_mrtitle_([^"]+)"[^>]*>\s*([^<]+)<\/a>/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      const id = match[1];
      const title = match[2].trim();
      if (!title) continue;
      results.push({
        title,
        snippet: `WA legislation: ${title}`,
        sourceId: id,
        confidence: 0.7,
        sourceUrl: `${this.baseUrl}/legislation/statutes.nsf/main_mrtitle_${id}`,
        attribution: "Crown Copyright (WA)",
      });
    }
    return results;
  }

  parseDetailPage(html: string): SourceMetadata | null {
    const titleMatch = html.match(/<h1[^>]*>\s*([^<]+)<\/h1>/i);
    if (!titleMatch) return null;

    const rawTitle = titleMatch[1].trim();
    const yearMatch = rawTitle.match(/\b(\d{4})\b/);

    return {
      title: rawTitle,
      year: yearMatch ? parseInt(yearMatch[1], 10) : undefined,
      jurisdiction: "AU-WA",
      status: "in force",
    };
  }
}
