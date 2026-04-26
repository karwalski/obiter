/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Source-URL Passthrough Utility (Story 17.38)
 *
 * When any adapter result includes a sourceUrl, this utility surfaces
 * it as a "View source" link. Distinguishes primary source URLs from
 * aggregator URLs.
 */

import type { SourceMetadata } from "../sourceAdapter";

/** Icon type indicating whether the URL is a primary source or aggregator. */
export type SourceLinkIcon = "primary" | "aggregator";

/** A source link with display metadata. */
export interface SourceLink {
  url: string;
  label: string;
  icon: SourceLinkIcon;
}

/**
 * Known aggregator domains. URLs matching these are labelled as aggregator
 * links rather than primary source links.
 */
const AGGREGATOR_DOMAINS = [
  "austlii.edu.au",
  "jade.io",
  "bailii.org",
  "worldlii.org",
  "commonlii.org",
  "nzlii.org",
  "hklii.hk",
  "saflii.org",
];

/**
 * Determine whether a URL belongs to a known aggregator.
 */
function isAggregatorUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return AGGREGATOR_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    );
  } catch {
    return false;
  }
}

/**
 * Generate a display label for a source URL.
 */
function labelForUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return `View on ${hostname}`;
  } catch {
    return "View source";
  }
}

/**
 * Extract source links from adapter metadata.
 *
 * Scans the metadata for `sourceUrl` and any additional URL fields,
 * classifying each as either a primary source or aggregator link.
 *
 * @param metadata - The SourceMetadata object from an adapter result.
 * @returns An array of SourceLink objects, primary sources first.
 */
export function getSourceLinks(metadata: SourceMetadata): SourceLink[] {
  const links: SourceLink[] = [];
  const seen = new Set<string>();

  // Collect all URL-like values from metadata
  const urls: string[] = [];

  if (typeof metadata.sourceUrl === "string" && metadata.sourceUrl) {
    urls.push(metadata.sourceUrl);
  }

  // Check for additional URL fields adapters may attach
  for (const key of Object.keys(metadata)) {
    if (key === "sourceUrl") continue;
    const value = metadata[key];
    if (typeof value === "string" && value.startsWith("https://")) {
      urls.push(value);
    }
  }

  for (const url of urls) {
    if (seen.has(url)) continue;
    seen.add(url);

    const icon: SourceLinkIcon = isAggregatorUrl(url) ? "aggregator" : "primary";
    links.push({
      url,
      label: labelForUrl(url),
      icon,
    });
  }

  // Sort: primary sources first, then aggregators
  links.sort((a, b) => {
    if (a.icon === "primary" && b.icon === "aggregator") return -1;
    if (a.icon === "aggregator" && b.icon === "primary") return 1;
    return 0;
  });

  return links;
}
