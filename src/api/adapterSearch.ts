/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Unified adapter search — bridges the Source Adapter framework (Epic 17)
 * with the typeahead UI. Replaces the old proxyClient-based search.
 *
 * This module:
 *  - Maintains a singleton registry of SourceAdapter instances
 *  - Filters by contentType and enabled state (from sourceRegistry)
 *  - Orders adapters via sourcePreferences
 *  - Respects rate limits via the RateLimiter
 *  - Merges and deduplicates results by sourceId
 */

import type { SourceAdapter, ContentType, LookupResult, AccessTier } from "./sourceAdapter";
import { getDevicePref } from "../store/devicePreferences";
import {
  isAdapterEnabled,
  isMasterEnabled,
  registerAdapter as registerRegistryAdapter,
  type AdapterTier,
} from "./sourceRegistry";
import {
  getPreferredAdapters,
  registerAdapter as registerPreferenceAdapter,
  type AdapterKind,
} from "./sourcePreferences";
import { RateLimiter } from "./rateLimiter";

// Adapter class imports
import { CorpusAdapter } from "./adapters/corpusAdapter";
import { FrlAdapter } from "./adapters/frlAdapter";
import { NswCaselawAdapter } from "./adapters/nswCaselawAdapter";
import { FcaRssAdapter } from "./adapters/fcaRssAdapter";
import { ActScRssAdapter } from "./adapters/actScRssAdapter";
import { WaScRssAdapter } from "./adapters/waScRssAdapter";
import { SclqldRssAdapter } from "./adapters/sclqldRssAdapter";
import { CrossrefAdapter } from "./adapters/crossrefAdapter";
import { OpenAlexAdapter } from "./adapters/openAlexAdapter";
import { DoajAdapter } from "./adapters/doajAdapter";
import { DfatTreatiesAdapter } from "./adapters/dfatTreatiesAdapter";
import { CthHansardAdapter } from "./adapters/cthHansardAdapter";
import { NswHansardAdapter } from "./adapters/nswHansardAdapter";
import { SaHansardAdapter } from "./adapters/saHansardAdapter";
import { OpenAustraliaAdapter } from "./adapters/openAustraliaAdapter";
import { LrcAdapter } from "./adapters/lrcAdapter";
import { AustliiLinkAdapter } from "./adapters/austliiLink";
import { JadeLinkAdapter } from "./adapters/jadeLink";
import { JadeProAdapter } from "./adapters/jadeProAdapter";
import { LexisAdapter } from "./adapters/lexisAdapter";
import { WestlawAdapter } from "./adapters/westlawAdapter";
import { VlexAdapter } from "./adapters/vlexAdapter";
import { HabeasAdapter } from "./adapters/habeasAdapter";
import { ActLegislationAdapter } from "./adapters/actLegislation";
import { NswLegislationAdapter } from "./adapters/nswLegislation";
import { VicLegislationAdapter } from "./adapters/vicLegislation";
import { QldLegislationAdapter } from "./adapters/qldLegislation";
import { WaLegislationAdapter } from "./adapters/waLegislation";
import { SaLegislationAdapter } from "./adapters/saLegislation";
import { TasLegislationAdapter } from "./adapters/tasLegislation";
import { NtLegislationAdapter } from "./adapters/ntLegislation";

// ---------------------------------------------------------------------------
// Adapter instance registry
// ---------------------------------------------------------------------------

/** All adapter instances, keyed by descriptor.id. */
const adapterInstances = new Map<string, SourceAdapter>();

/** Shared rate limiter for all adapters. */
const rateLimiter = new RateLimiter();

/** Whether the registry has been initialised. */
let initialised = false;

/**
 * Instantiate all adapters and register them with the rate limiter.
 * Safe to call multiple times — only initialises once.
 */
export function initialiseAdapters(): void {
  if (initialised) return;
  initialised = true;

  const allAdapters: SourceAdapter[] = [
    // Corpus / local
    new CorpusAdapter(),
    // Live APIs — cases
    new NswCaselawAdapter(),
    new FcaRssAdapter(),
    new ActScRssAdapter(),
    new WaScRssAdapter(),
    new SclqldRssAdapter(),
    // Live APIs — legislation
    new FrlAdapter(),
    new ActLegislationAdapter(),
    new NswLegislationAdapter(),
    new VicLegislationAdapter(),
    new QldLegislationAdapter(),
    new WaLegislationAdapter(),
    new SaLegislationAdapter(),
    new TasLegislationAdapter(),
    new NtLegislationAdapter(),
    // Live APIs — journal
    new CrossrefAdapter(),
    new OpenAlexAdapter(),
    new DoajAdapter(),
    // Live APIs — treaties
    new DfatTreatiesAdapter(),
    // Live APIs — hansard
    new CthHansardAdapter(),
    new NswHansardAdapter(),
    new SaHansardAdapter(),
    new OpenAustraliaAdapter(),
    // Live APIs — LRC reports
    new LrcAdapter(),
    // Link-only
    new AustliiLinkAdapter(),
    new JadeLinkAdapter(),
    new JadeProAdapter(),
    // Commercial
    new LexisAdapter(),
    new WestlawAdapter(),
    new VlexAdapter(),
    new HabeasAdapter(),
  ];

  for (const adapter of allAdapters) {
    const d = adapter.descriptor;
    adapterInstances.set(d.id, adapter);
    if (d.rateLimitHint.requestsPerSecond > 0) {
      rateLimiter.register(d.id, d.rateLimitHint);
    }
    // Also register in the UI-facing sourceRegistry so Settings can
    // display and toggle these adapters.
    registerRegistryAdapter({
      id: d.id,
      name: d.displayName,
      tier: mapAccessTier(d.accessTier),
      jurisdictions: d.jurisdictions,
      licence: d.licence,
      requiresKey: d.requiresKey,
      fragile: d.fragile,
      health: "green",
    });
    // ENP-006: register with the preference system too, so the default
    // consultation order (corpus > live API > scraper > link-only) is
    // derived from real adapter metadata instead of instantiation order.
    // registerAdapter is a keyed set, so re-registration is harmless.
    registerPreferenceAdapter({
      id: d.id,
      kind: adapterKind(adapter),
      contentTypes: d.contentTypes,
      jurisdictions: d.jurisdictions,
    });
  }
}

/**
 * Get a specific adapter instance by ID.
 */
export function getAdapterInstance(id: string): SourceAdapter | undefined {
  initialiseAdapters();
  return adapterInstances.get(id);
}

/**
 * Get all registered adapter instances.
 */
export function getAllAdapterInstances(): SourceAdapter[] {
  initialiseAdapters();
  return Array.from(adapterInstances.values());
}

// ---------------------------------------------------------------------------
// Unified search
// ---------------------------------------------------------------------------

/**
 * Search across all enabled adapters that support the given content type.
 *
 * - Returns empty array if master toggle is off or no adapters are enabled
 * - Respects rate limits per adapter
 * - Merges results and deduplicates by sourceId
 * - Never throws — errors from individual adapters are swallowed so
 *   partial results from healthy adapters still reach the UI
 */
export async function searchViaAdapters(
  query: string,
  contentType: ContentType,
  jurisdiction?: string
): Promise<LookupResult[]> {
  initialiseAdapters();

  // Get all adapter instances that support this content type.
  // The corpus adapter (local/offline) runs independently of the master
  // toggle but has its own enable/disable preference ("corpusEnabled").
  // All other adapters require the master toggle to be enabled.
  const masterOn = isMasterEnabled();
  const corpusOn = getDevicePref("corpusEnabled") !== false; // default: on
  const candidates: SourceAdapter[] = [];
  for (const adapter of adapterInstances.values()) {
    if (!adapter.descriptor.contentTypes.includes(contentType)) continue;
    const isCorpus = adapter.descriptor.id === "corpus";
    if (isCorpus && !corpusOn) continue;
    if (!isCorpus && !masterOn) continue;
    if (!isCorpus && !isAdapterEnabled(adapter.descriptor.id)) continue;
    candidates.push(adapter);
  }

  if (candidates.length === 0) return [];

  // Order by preferences
  const preferredOrder = getPreferredAdapters(contentType, jurisdiction);
  const ordered = sortByPreference(candidates, preferredOrder);

  // Query all enabled adapters in parallel, respecting rate limits
  const settled = await Promise.allSettled(
    ordered.map(async (adapter) => {
      const { id, rateLimitHint } = adapter.descriptor;

      // Acquire rate-limit token if the adapter is registered
      if (rateLimitHint.requestsPerSecond > 0) {
        try {
          await rateLimiter.acquireToken(id);
        } catch {
          // Circuit breaker open — skip this adapter
          return [] as LookupResult[];
        }
      }

      try {
        const results = await adapter.search(query, {
          contentType,
          jurisdiction,
        });

        // Record success for rate limiter
        if (rateLimitHint.requestsPerSecond > 0) {
          rateLimiter.recordResponse(id, 200);
        }

        // ENP-006: stamp the producing adapter on every hit so the form can
        // record provenance. Copies, never mutates, the adapter-owned objects.
        return results.map((item) => ({ ...item, adapterId: id }));
      } catch {
        // Record failure for rate limiter
        if (rateLimitHint.requestsPerSecond > 0) {
          rateLimiter.recordResponse(id, 500);
        }
        return [] as LookupResult[];
      }
    })
  );

  // Merge and deduplicate
  const seen = new Set<string>();
  const merged: LookupResult[] = [];

  for (const result of settled) {
    if (result.status !== "fulfilled") continue;
    for (const item of result.value) {
      if (!seen.has(item.sourceId)) {
        seen.add(item.sourceId);
        merged.push(item);
      }
    }
  }

  return merged;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Sort adapter instances according to a preferred order list.
 * Adapters not in the preference list are appended at the end.
 */
function sortByPreference(adapters: SourceAdapter[], preferredIds: string[]): SourceAdapter[] {
  const idxMap = new Map<string, number>();
  for (let i = 0; i < preferredIds.length; i++) {
    idxMap.set(preferredIds[i], i);
  }

  return [...adapters].sort((a, b) => {
    const ai = idxMap.get(a.descriptor.id) ?? Number.MAX_SAFE_INTEGER;
    const bi = idxMap.get(b.descriptor.id) ?? Number.MAX_SAFE_INTEGER;
    return ai - bi;
  });
}

/**
 * ENP-006: derive the preference-system kind from an adapter's descriptor,
 * matching the KIND_PRIORITY reliability hierarchy in sourcePreferences:
 * the local corpus first, then live APIs, then scrapers (fragile HTML
 * parsers), then adapters that only build outbound links.
 */
function adapterKind(adapter: SourceAdapter): AdapterKind {
  const d = adapter.descriptor;
  if (d.id === "corpus") return "corpus";
  if (d.accessTier === "link-only" || d.rateLimitHint.requestsPerSecond <= 0) return "link-only";
  return d.fragile ? "scraper" : "live-api";
}

/**
 * Map the SourceAdapter accessTier to the sourceRegistry AdapterTier.
 * Both use the same string literals so this is a direct passthrough,
 * but we keep the function for type safety.
 */
function mapAccessTier(accessTier: AccessTier): AdapterTier {
  return accessTier;
}
