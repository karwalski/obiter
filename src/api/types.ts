/**
 * Shared interfaces for external API clients (src/api/).
 *
 * Each lookup source (AustLII, Jade, Federal Register, etc.) implements
 * SourceLookup so the UI layer can treat them interchangeably.
 */

/**
 * ENP-006: one LookupResult for every layer. The adapter framework's shape
 * (sourceUrl, attribution, adapterId) is the canonical one; this re-export
 * keeps the older clients compiling while letting the full result reach the
 * typeahead and the Insert Citation form instead of being narrowed away.
 */
import type { LookupResult } from "./sourceAdapter";

export type { LookupResult };

export interface SourceLookup {
  name: string;
  supportedTypes: string[];
  search(query: string): Promise<LookupResult[]>;
  fetch(id: string): Promise<Record<string, unknown>>;
}
