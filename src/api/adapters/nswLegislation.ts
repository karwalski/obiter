/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * NSW Legislation Adapter (Story 17.26)
 *
 * Scrapes legislation.nsw.gov.au for New South Wales Acts and regulations.
 * Crown copyright — live access only, no replication permitted.
 */

import type { SourceAdapterDescriptor, LookupResult, SourceMetadata } from "../sourceAdapter";
import { StateLegislationAdapter } from "./stateLegislationBase";

export class NswLegislationAdapter extends StateLegislationAdapter {
  readonly descriptor: SourceAdapterDescriptor = {
    id: "nsw-legislation",
    displayName: "NSW Legislation",
    jurisdictions: ["AU-NSW"],
    contentTypes: ["legislation"],
    accessTier: "live",
    licence: "Crown Copyright (NSW)",
    requiresKey: false,
    rateLimitHint: { requestsPerSecond: 1, burst: 2 },
    fragile: true,
  };

  protected readonly baseUrl = "https://legislation.nsw.gov.au";

  buildSearchUrl(title: string, year?: number): string {
    const q = year ? `${title} ${year}` : title;
    return `${this.baseUrl}/search?q=${encodeURIComponent(q)}&type=act`;
  }

  buildDetailUrl(id: string): string {
    return `${this.baseUrl}/view/html/inforce/${id}`;
  }

  parseSearchResults(html: string): LookupResult[] {
    const results: LookupResult[] = [];
    // Match search result entries: title in <a> within result headings
    const pattern = /<a[^>]+href="\/view\/html\/inforce\/([^"]+)"[^>]*>\s*([^<]+)<\/a>/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      const id = match[1];
      const title = match[2].trim();
      if (!title) continue;
      results.push({
        title,
        snippet: `NSW legislation: ${title}`,
        sourceId: id,
        confidence: 0.7,
        sourceUrl: `${this.baseUrl}/view/html/inforce/${id}`,
        attribution: "Crown Copyright (NSW)",
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
      jurisdiction: "AU-NSW",
      status: "in force",
    };
  }
}
