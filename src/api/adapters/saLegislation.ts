/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * SA Legislation Adapter (Story 17.29)
 *
 * Scrapes legislation.sa.gov.au for South Australian Acts and regulations.
 * Crown copyright.
 */

import type { SourceAdapterDescriptor, LookupResult, SourceMetadata } from "../sourceAdapter";
import { StateLegislationAdapter } from "./stateLegislationBase";

export class SaLegislationAdapter extends StateLegislationAdapter {
  readonly descriptor: SourceAdapterDescriptor = {
    id: "sa-legislation",
    displayName: "SA Legislation",
    jurisdictions: ["AU-SA"],
    contentTypes: ["legislation"],
    accessTier: "live",
    licence: "Crown Copyright (SA)",
    requiresKey: false,
    rateLimitHint: { requestsPerSecond: 1, burst: 2 },
    fragile: true,
  };

  protected readonly baseUrl = "https://legislation.sa.gov.au";

  buildSearchUrl(title: string, year?: number): string {
    const q = year ? `${title} ${year}` : title;
    return `${this.baseUrl}/legislation/search?q=${encodeURIComponent(q)}`;
  }

  buildDetailUrl(id: string): string {
    return `${this.baseUrl}/legislation/${id}`;
  }

  parseSearchResults(html: string): LookupResult[] {
    const results: LookupResult[] = [];
    const pattern = /<a[^>]+href="\/legislation\/([^"]+)"[^>]*>\s*([^<]+)<\/a>/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      const id = match[1];
      const title = match[2].trim();
      if (!title || id.startsWith("search")) continue;
      results.push({
        title,
        snippet: `SA legislation: ${title}`,
        sourceId: id,
        confidence: 0.7,
        sourceUrl: `${this.baseUrl}/legislation/${id}`,
        attribution: "Crown Copyright (SA)",
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
      jurisdiction: "AU-SA",
      status: "in force",
    };
  }
}
