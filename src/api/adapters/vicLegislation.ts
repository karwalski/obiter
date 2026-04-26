/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * VIC Legislation Adapter (Story 17.31)
 *
 * Scrapes legislation.vic.gov.au for Victorian Acts and regulations.
 * Crown copyright. Note: corpus gap — not all Victorian legislation is
 * available online. This adapter is best-effort.
 */

import type { SourceAdapterDescriptor, LookupResult, SourceMetadata } from "../sourceAdapter";
import { StateLegislationAdapter } from "./stateLegislationBase";

export class VicLegislationAdapter extends StateLegislationAdapter {
  readonly descriptor: SourceAdapterDescriptor = {
    id: "vic-legislation",
    displayName: "VIC Legislation",
    jurisdictions: ["AU-VIC"],
    contentTypes: ["legislation"],
    accessTier: "live",
    licence: "Crown Copyright (VIC)",
    requiresKey: false,
    rateLimitHint: { requestsPerSecond: 1, burst: 2 },
    fragile: true,
  };

  protected readonly baseUrl = "https://legislation.vic.gov.au";

  buildSearchUrl(title: string, year?: number): string {
    const q = year ? `${title} ${year}` : title;
    return `${this.baseUrl}/search?q=${encodeURIComponent(q)}&type=act`;
  }

  buildDetailUrl(id: string): string {
    return `${this.baseUrl}/in-force/acts/${id}`;
  }

  parseSearchResults(html: string): LookupResult[] {
    const results: LookupResult[] = [];
    const pattern = /<a[^>]+href="\/in-force\/acts\/([^"]+)"[^>]*>\s*([^<]+)<\/a>/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      const id = match[1];
      const title = match[2].trim();
      if (!title) continue;
      results.push({
        title,
        snippet: `VIC legislation: ${title}`,
        sourceId: id,
        confidence: 0.7,
        sourceUrl: `${this.baseUrl}/in-force/acts/${id}`,
        attribution: "Crown Copyright (VIC)",
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
      jurisdiction: "AU-VIC",
      status: "in force",
    };
  }
}
