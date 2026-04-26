/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * ACT Legislation Adapter (Story 17.32)
 *
 * Scrapes legislation.act.gov.au for Australian Capital Territory Acts and
 * regulations. The ACT register uses structured URLs of the form
 * `a/{year}-{num}/` for Acts.
 */

import type { SourceAdapterDescriptor, LookupResult, SourceMetadata } from "../sourceAdapter";
import { StateLegislationAdapter } from "./stateLegislationBase";

export class ActLegislationAdapter extends StateLegislationAdapter {
  readonly descriptor: SourceAdapterDescriptor = {
    id: "act-legislation",
    displayName: "ACT Legislation",
    jurisdictions: ["AU-ACT"],
    contentTypes: ["legislation"],
    accessTier: "live",
    licence: "ACT Government",
    requiresKey: false,
    rateLimitHint: { requestsPerSecond: 1, burst: 2 },
    fragile: true,
  };

  protected readonly baseUrl = "https://legislation.act.gov.au";

  buildSearchUrl(title: string, year?: number): string {
    const q = year ? `${title} ${year}` : title;
    return `${this.baseUrl}/Search?q=${encodeURIComponent(q)}&type=act`;
  }

  buildDetailUrl(id: string): string {
    // ACT uses structured URLs: a/{year}-{num}/
    return `${this.baseUrl}/a/${id}/`;
  }

  parseSearchResults(html: string): LookupResult[] {
    const results: LookupResult[] = [];
    // Match ACT structured URLs: /a/{year}-{num}/ pattern
    const pattern = /<a[^>]+href="\/a\/(\d{4}-\d+)\/"[^>]*>\s*([^<]+)<\/a>/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      const id = match[1];
      const title = match[2].trim();
      if (!title) continue;
      results.push({
        title,
        snippet: `ACT legislation: ${title}`,
        sourceId: id,
        confidence: 0.7,
        sourceUrl: `${this.baseUrl}/a/${id}/`,
        attribution: "ACT Government",
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
      jurisdiction: "AU-ACT",
      status: "in force",
    };
  }
}
