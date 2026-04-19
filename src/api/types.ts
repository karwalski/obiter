/**
 * Shared interfaces for external API clients (src/api/).
 *
 * Each lookup source (AustLII, Jade, Federal Register, etc.) implements
 * SourceLookup so the UI layer can treat them interchangeably.
 */

export interface LookupResult {
  title: string;
  snippet: string;
  sourceId: string;
  confidence: number;
}

export interface SourceLookup {
  name: string;
  supportedTypes: string[];
  search(query: string): Promise<LookupResult[]>;
  fetch(id: string): Promise<Record<string, unknown>>;
}
