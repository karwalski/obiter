/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * NT Legislation Adapter (Story 17.33)
 *
 * Scrapes legislation.nt.gov.au for Northern Territory Acts and regulations.
 * Crown copyright.
 */

import type { SourceAdapterDescriptor, LookupResult, SourceMetadata } from "../sourceAdapter";
import { StateLegislationAdapter } from "./stateLegislationBase";

export class NtLegislationAdapter extends StateLegislationAdapter {
  readonly descriptor: SourceAdapterDescriptor = {
    id: "nt-legislation",
    displayName: "NT Legislation",
    jurisdictions: ["AU-NT"],
    contentTypes: ["legislation"],
    accessTier: "live",
    licence: "Crown Copyright (NT)",
    requiresKey: false,
    rateLimitHint: { requestsPerSecond: 1, burst: 2 },
    fragile: true,
  };

  protected readonly baseUrl = "https://legislation.nt.gov.au";

  buildSearchUrl(title: string, year?: number): string {
    const q = year ? `${title} ${year}` : title;
    return `${this.baseUrl}/Search?q=${encodeURIComponent(q)}&type=act`;
  }

  buildDetailUrl(id: string): string {
    return `${this.baseUrl}/Legislation/${id}`;
  }

  parseSearchResults(html: string): LookupResult[] {
    const results: LookupResult[] = [];
    const pattern = /<a[^>]+href="\/Legislation\/([^"]+)"[^>]*>\s*([^<]+)<\/a>/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      const id = match[1];
      const title = match[2].trim();
      if (!title) continue;
      results.push({
        title,
        snippet: `NT legislation: ${title}`,
        sourceId: id,
        confidence: 0.7,
        sourceUrl: `${this.baseUrl}/Legislation/${id}`,
        attribution: "Crown Copyright (NT)",
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
      jurisdiction: "AU-NT",
      status: "in force",
    };
  }
}
