/**
 * Source Adapter Interface (Story 17.1)
 *
 * Defines the contract for all external source adapters in the Source Lookup
 * layer. Each adapter (AustLII, Jade, FRL, BAILII, etc.) implements
 * SourceAdapter so the orchestrator can treat them interchangeably.
 *
 * This supersedes the simpler SourceLookup interface in ./types.ts and adds
 * structured metadata, access-tier awareness, health-checking, and
 * rate-limit hints consumed by the RateLimiter (Story 17.4).
 */

/** How the source is accessed. */
export type AccessTier = "open" | "live" | "link-only";

/** High-level content categories aligned with AGLC4 source types. */
export type ContentType =
  | "case"
  | "legislation"
  | "hansard"
  | "journal"
  | "treaty"
  | "lrc-report";

/**
 * Static descriptor published by every adapter so the orchestrator can
 * filter, prioritise, and display adapters without instantiating them.
 */
export interface SourceAdapterDescriptor {
  /** Unique adapter identifier, e.g. "austlii", "jade", "frl". */
  id: string;
  /** Human-readable name shown in the UI. */
  displayName: string;
  /** ISO 3166-1 alpha-2 jurisdiction codes the adapter covers. */
  jurisdictions: string[];
  /** Content types the adapter can supply. */
  contentTypes: ContentType[];
  /** Access model. */
  accessTier: AccessTier;
  /** Short licence description, e.g. "CC BY 4.0". */
  licence: string;
  /** Whether the adapter requires an API key or credential. */
  requiresKey: boolean;
  /**
   * Hint consumed by the rate-limit governor.
   * `requestsPerSecond` is the sustained rate; `burst` is the bucket size.
   */
  rateLimitHint: { requestsPerSecond: number; burst: number };
  /** True for scrapers that may break on upstream HTML changes. */
  fragile: boolean;
}

/**
 * A single search hit returned by {@link SourceAdapter.search}.
 */
export interface LookupResult {
  /** Display title of the source. */
  title: string;
  /** Short snippet or summary. */
  snippet: string;
  /** Adapter-specific identifier for the source (used by getMetadata). */
  sourceId: string;
  /** Confidence score 0-1. */
  confidence: number;
  /** Deep-link URL if available. */
  sourceUrl?: string;
  /** Attribution string required by the source licence. */
  attribution?: string;
}

/**
 * Rich metadata for a resolved source, covering the AGLC4 fields needed
 * to construct a full citation.
 *
 * Adapters populate only the fields they can supply; the citation engine
 * merges results from multiple adapters as needed.
 */
export interface SourceMetadata {
  // Common AGLC4 fields
  title?: string;
  parties?: string;
  year?: number;
  court?: string;
  /** Medium-neutral citation. */
  mnc?: string;
  reportSeries?: string;
  volume?: number;
  startingPage?: number;
  jurisdiction?: string;

  // Journal fields
  authors?: string[];
  journal?: string;
  issue?: string;
  doi?: string;

  // Legislation fields
  /** Federal Register of Legislation identifier. */
  frliId?: string;
  status?: string;

  // Treaty fields
  treatySeries?: string;

  // Hansard fields
  speaker?: string;
  chamber?: string;
  page?: string;

  /** Adapters may attach arbitrary extra fields. */
  [key: string]: unknown;
}

/**
 * Optional filters passed to {@link SourceAdapter.search} to narrow results.
 */
export interface SearchFilters {
  jurisdiction?: string;
  contentType?: ContentType;
  yearFrom?: number;
  yearTo?: number;
  court?: string;
}

/** Adapter health status used by the circuit-breaker in the rate limiter. */
export type AdapterHealth = "healthy" | "degraded" | "offline";

/**
 * The contract every source adapter must implement.
 *
 * Implementations live in `src/api/adapters/` and are registered with the
 * SourceOrchestrator (Story 17.2).
 */
export interface SourceAdapter {
  /** Static descriptor — must be available synchronously. */
  readonly descriptor: SourceAdapterDescriptor;

  /** Free-text search, returning ranked results. */
  search(query: string, filters?: SearchFilters): Promise<LookupResult[]>;

  /**
   * Attempt to resolve a citation string directly to metadata.
   * Returns null if the adapter cannot recognise the citation.
   */
  resolve(citation: string): Promise<SourceMetadata | null>;

  /**
   * Fetch full metadata for a source by its adapter-specific ID
   * (as returned in {@link LookupResult.sourceId}).
   */
  getMetadata(id: string): Promise<SourceMetadata | null>;

  /** Lightweight health-check (should complete in < 2 s). */
  healthcheck(): Promise<AdapterHealth>;
}
