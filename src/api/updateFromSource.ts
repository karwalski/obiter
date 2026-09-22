/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * ENP-007: refetch one library citation from the online source it came
 * from (or any enabled adapter for its content type) and report the fields
 * that differ. The caller decides what to apply; nothing here writes to the
 * store. Every adapter call runs under a timeout and the rate limiter.
 */

import type { Citation, SourceData } from "../types/citation";
import type { ContentType, SourceAdapter, SourceMetadata } from "./sourceAdapter";
import { getAllAdapterInstances } from "./adapterSearch";
import { isAdapterEnabled, isMasterEnabled } from "./sourceRegistry";
import { getPreferredAdapters } from "./sourcePreferences";
import { getDevicePref } from "../store/devicePreferences";
import { RateLimiter } from "./rateLimiter";
import { parseCitation } from "./citationParser";
import { calculateConfidence } from "./citationVerifier";
import { contentTypeForSourceType, metadataToFields } from "./metadataMapper";
import { INTERCHANGE_DATA_KEY } from "./interchange/model";
import type { CitationInterchangeBag, InterchangeProvenance } from "./interchange/model";
import { readFieldWithAliases } from "../engine/fieldAliases";

export interface SourceUpdateResult {
  status: "updated" | "same" | "unavailable";
  adapterId?: string;
  adapterLabel?: string;
  attribution?: string;
  /** The adapter's record id, when the fetch went through provenance. */
  rawId?: string;
  metadata?: SourceMetadata;
  /** The metadata as this citation's form fields. */
  fields?: SourceData;
  /** calculateConfidence over the parsed citation text; omitted when the text does not parse. */
  confidence?: number;
  /** One line per mapped field whose value differs from the library's. */
  differences?: string[];
  message?: string;
}

export interface FetchSourceUpdateOptions {
  /** Per-adapter call timeout (default 10 s). */
  timeoutMs?: number;
  /** Replaces the enabled-adapter lookup (tests). */
  adapters?: SourceAdapter[];
  /** Called before each adapter call so a UI can say which source it is checking. */
  onAttempt?: (adapter: { id: string; label: string }) => void;
}

export const LOOKUP_OFF_MESSAGE = "Source lookup is off. Turn it on in Settings.";
export const NO_ADAPTER_MESSAGE =
  "No online source for this citation type is enabled. Turn one on in Settings.";
export const NO_CONTENT_TYPE_MESSAGE = "Online sources do not cover this citation type.";
export const NO_MATCH_MESSAGE =
  "No enabled source returned a match for this citation. Check the citation details, or try again later.";

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * This module's own limiter: adapterSearch keeps its instance private, so a
 * refetch shares buckets with other refetches but not with typeahead searches.
 */
const limiter = new RateLimiter();
const registered = new Set<string>();

function limited(adapter: SourceAdapter): boolean {
  const { id, rateLimitHint } = adapter.descriptor;
  if (rateLimitHint.requestsPerSecond <= 0) return false;
  if (!registered.has(id)) {
    limiter.register(id, rateLimitHint);
    registered.add(id);
  }
  return true;
}

/** The enabled adapters that supply `contentType`, in preference order. */
export function enabledAdaptersFor(
  contentType: ContentType,
  jurisdiction?: string
): SourceAdapter[] {
  const corpusOn = getDevicePref("corpusEnabled") !== false;
  const candidates = getAllAdapterInstances().filter((adapter) => {
    const d = adapter.descriptor;
    if (!d.contentTypes.includes(contentType)) return false;
    if (d.id === "corpus") return corpusOn;
    return isAdapterEnabled(d.id);
  });
  const order = new Map(getPreferredAdapters(contentType, jurisdiction).map((id, i) => [id, i]));
  return candidates.sort(
    (a, b) =>
      (order.get(a.descriptor.id) ?? Number.MAX_SAFE_INTEGER) -
      (order.get(b.descriptor.id) ?? Number.MAX_SAFE_INTEGER)
  );
}

/** The provenance stamped on the citation by an adapter pick or an import, if any. */
export function readProvenance(citation: Citation): InterchangeProvenance | undefined {
  const bag = citation.data[INTERCHANGE_DATA_KEY] as Partial<CitationInterchangeBag> | undefined;
  return bag && typeof bag === "object" ? bag.provenance : undefined;
}

/** Whether a refetch can run for this citation; `reason` says what to change when not. */
export function canUpdateFromSource(citation: Citation): { ok: boolean; reason?: string } {
  if (!isMasterEnabled()) return { ok: false, reason: LOOKUP_OFF_MESSAGE };
  const contentType = contentTypeForSourceType(citation.sourceType);
  if (!contentType) return { ok: false, reason: NO_CONTENT_TYPE_MESSAGE };
  const jurisdiction = readFieldWithAliases(citation.data, "jurisdiction");
  const adapters = enabledAdaptersFor(
    contentType,
    typeof jurisdiction === "string" ? jurisdiction : undefined
  );
  if (adapters.length === 0) return { ok: false, reason: NO_ADAPTER_MESSAGE };
  return { ok: true };
}

/** Rejects after `ms` so an adapter that never answers cannot hang the dialog. */
function withTimeout<T>(work: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expiry = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} did not respond within ${Math.round(ms / 1000)} seconds.`)),
      ms
    );
  });
  return Promise.race([work, expiry]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}

/** Comparison text: name lists by their rendered names, everything else trimmed. */
export function comparableText(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string") return entry.trim();
        if (entry && typeof entry === "object") {
          const person = entry as Record<string, unknown>;
          return `${String(person.givenNames ?? "")} ${String(person.surname ?? person.name ?? "")}`.trim();
        }
        return String(entry);
      })
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value).trim();
}

/** Runs one adapter call under the limiter and the timeout; null on any failure. */
async function attempt(
  adapter: SourceAdapter,
  call: () => Promise<SourceMetadata | null>,
  timeoutMs: number,
  onAttempt: FetchSourceUpdateOptions["onAttempt"]
): Promise<SourceMetadata | null> {
  const { id, displayName } = adapter.descriptor;
  const governed = limited(adapter);
  if (governed) {
    try {
      await limiter.acquireToken(id);
    } catch {
      return null; // circuit breaker open
    }
  }
  onAttempt?.({ id, label: displayName });
  try {
    const metadata = await withTimeout(call(), timeoutMs, displayName);
    if (governed) limiter.recordResponse(id, 200);
    return metadata;
  } catch {
    if (governed) limiter.recordResponse(id, 500);
    return null;
  }
}

/**
 * Fetches fresh metadata for `citation`: the provenance adapter's record
 * first, then each enabled adapter's resolve over the citation text. The
 * first adapter to answer wins.
 */
export async function fetchSourceUpdate(
  citation: Citation,
  citationText: string,
  opts: FetchSourceUpdateOptions = {}
): Promise<SourceUpdateResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!isMasterEnabled()) return { status: "unavailable", message: LOOKUP_OFF_MESSAGE };
  const contentType = contentTypeForSourceType(citation.sourceType);
  if (!contentType) return { status: "unavailable", message: NO_CONTENT_TYPE_MESSAGE };
  const jurisdiction = readFieldWithAliases(citation.data, "jurisdiction");
  const adapters =
    opts.adapters ??
    enabledAdaptersFor(contentType, typeof jurisdiction === "string" ? jurisdiction : undefined);
  if (adapters.length === 0) return { status: "unavailable", message: NO_ADAPTER_MESSAGE };

  let winner: { adapter: SourceAdapter; metadata: SourceMetadata; rawId?: string } | null = null;

  const provenance = readProvenance(citation);
  if (provenance?.format === "adapter" && provenance.adapterId && provenance.rawId) {
    const rawId = provenance.rawId;
    const source = adapters.find((a) => a.descriptor.id === provenance.adapterId);
    if (source) {
      const metadata = await attempt(
        source,
        () => source.getMetadata(rawId),
        timeoutMs,
        opts.onAttempt
      );
      if (metadata) winner = { adapter: source, metadata, rawId };
    }
  }

  const query = citationText.trim();
  for (const adapter of adapters) {
    if (winner) break;
    if (query === "") break;
    const metadata = await attempt(
      adapter,
      () => adapter.resolve(query),
      timeoutMs,
      opts.onAttempt
    );
    if (metadata) winner = { adapter, metadata };
  }

  if (!winner) return { status: "unavailable", message: NO_MATCH_MESSAGE };

  const { adapter, metadata, rawId } = winner;
  const fields = metadataToFields(citation.sourceType, metadata);
  const differences: string[] = [];
  for (const [key, value] of Object.entries(fields)) {
    const current = comparableText(readFieldWithAliases(citation.data, key));
    const fetched = comparableText(value);
    if (current !== fetched) {
      differences.push(
        current === ""
          ? `${key}: empty in the library, "${fetched}" from the source`
          : `${key}: "${current}" in the library, "${fetched}" from the source`
      );
    }
  }
  const parsed = parseCitation(query);
  const attribution = typeof metadata.attribution === "string" ? metadata.attribution : undefined;
  const result: SourceUpdateResult = {
    status: differences.length === 0 ? "same" : "updated",
    adapterId: adapter.descriptor.id,
    adapterLabel: adapter.descriptor.displayName,
    attribution,
    rawId,
    metadata,
    fields,
    differences,
  };
  if (parsed) result.confidence = calculateConfidence(parsed, metadata);
  if (Object.keys(fields).length === 0) {
    return {
      ...result,
      status: "unavailable",
      message: `${adapter.descriptor.displayName} returned a record with none of the fields this citation type uses.`,
    };
  }
  return result;
}
