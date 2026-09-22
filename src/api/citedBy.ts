/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * ENP-008: citing works for a journal article ("cited by").
 *
 * Asks every enabled citator adapter for the journal content type (OpenAlex
 * lists the citing works; Crossref only counts them) and merges the answers:
 * the count from the first adapter that reports one, the rows from the first
 * adapter that returns any. Gated by the source-lookup master toggle and the
 * per-adapter enablement, rate-limited per adapter, and capped at 10 s per
 * adapter so a stalled service cannot hold the panel open.
 *
 * Also builds the library record for a citing work the user chooses to keep:
 * a `journal.article` linked back to the article it cites with the Rule 1.3
 * linking phrase "citing" (the new record is the one doing the citing, so the
 * rendered form reads "[citing work], citing [this article]").
 */

import { generateCitationId } from "../actions/citationRequest";
import { getSharedStore } from "../store/singleton";
import type { Author, Citation } from "../types/citation";
import { getAllAdapterInstances, initialiseAdapters } from "./adapterSearch";
import { RateLimiter } from "./rateLimiter";
import type {
  CitatorAdapter,
  CitedByResult,
  LookupResult,
  SourceAdapter,
  SourceMetadata,
} from "./sourceAdapter";
import { isCitatorAdapter } from "./sourceAdapter";
import { isAdapterEnabled, isMasterEnabled } from "./sourceRegistry";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Why citing works cannot be looked up for this record (a precondition, not a failure). */
export interface CitedByUnavailable {
  unavailable: string;
}

export type CitedByOutcome = CitedByResult | CitedByUnavailable;

export interface CitedByOptions {
  /** Maximum citing works to list; adapters may return fewer. Default 10. */
  limit?: number;
}

export const CITED_BY_NO_DOI = "Citing works need a DOI.";
export const CITED_BY_LOOKUP_OFF =
  "Source lookup is off. Turn it on in Settings to see citing works.";
export const CITED_BY_NO_SOURCE =
  "No citing-works source is enabled. Turn on OpenAlex or Crossref in Settings.";
export const CITED_BY_FAILED = "The citing-works services could not be reached.";

/** Per-adapter deadline for a citing-works request. */
export const CITED_BY_TIMEOUT_MS = 10_000;

const DEFAULT_LIMIT = 10;

/** Type guard for the precondition branch of {@link CitedByOutcome}. */
export function isCitedByUnavailable(outcome: CitedByOutcome): outcome is CitedByUnavailable {
  return typeof (outcome as Partial<CitedByUnavailable>).unavailable === "string";
}

// ---------------------------------------------------------------------------
// DOI discovery
// ---------------------------------------------------------------------------

/** String() then trim, never calling .trim() on an unknown; empty for nullish/objects. */
function text(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return "";
  return String(value).trim();
}

/** A bare DOI ("10.xxxx/…") from a DOI, a doi.org URL or a "doi:" prefix. */
export function normaliseDoi(value: unknown): string {
  let doi = text(value);
  if (!doi) return "";
  doi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "");
  return doi.startsWith("10.") ? doi : "";
}

/**
 * The DOI a citation carries: `data.doi`, or the identifier kept by an
 * import under `data.interchange.identifiers.doi`. Empty when it has none.
 */
export function doiForCitation(citation: Citation): string {
  const data = (citation.data ?? {}) as Record<string, unknown>;
  const direct = normaliseDoi(data.doi);
  if (direct) return direct;
  const bag = data.interchange;
  if (bag && typeof bag === "object") {
    const identifiers = (bag as { identifiers?: Record<string, unknown> }).identifiers;
    if (identifiers && typeof identifiers === "object") return normaliseDoi(identifiers.doi);
  }
  return "";
}

// ---------------------------------------------------------------------------
// Adapter selection and rate limiting
// ---------------------------------------------------------------------------

/**
 * Citing-works requests share a limiter of their own: the unified search's
 * limiter is private to that module, and these buckets are keyed by the same
 * adapter ids and hints so the sustained rate is the same.
 */
const limiter = new RateLimiter();
const registered = new Set<string>();

function limiterFor(adapter: SourceAdapter): RateLimiter | null {
  const { id, rateLimitHint } = adapter.descriptor;
  if (rateLimitHint.requestsPerSecond <= 0) return null;
  if (!registered.has(id)) {
    limiter.register(id, rateLimitHint);
    registered.add(id);
  }
  return limiter;
}

/** Enabled journal adapters that can answer a citing-works question. */
function citatorAdapters(): Array<SourceAdapter & CitatorAdapter> {
  initialiseAdapters();
  return getAllAdapterInstances()
    .filter(isCitatorAdapter)
    .filter((adapter) => adapter.descriptor.contentTypes.includes("journal"))
    .filter((adapter) => isAdapterEnabled(adapter.descriptor.id));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${ms} ms`)), ms);
  });
  return Promise.race([promise, deadline]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

/**
 * Citing works for a citation. Resolves to an `unavailable` outcome when the
 * record has no DOI, the master toggle is off or no citator adapter is
 * enabled; rejects with a plain message when every adapter failed.
 */
export async function citedByForCitation(
  citation: Citation,
  opts: CitedByOptions = {}
): Promise<CitedByOutcome> {
  const doi = doiForCitation(citation);
  if (!doi) return { unavailable: CITED_BY_NO_DOI };
  if (!isMasterEnabled()) return { unavailable: CITED_BY_LOOKUP_OFF };

  const adapters = citatorAdapters();
  if (adapters.length === 0) return { unavailable: CITED_BY_NO_SOURCE };

  const limit = opts.limit ?? DEFAULT_LIMIT;

  const settled = await Promise.allSettled(
    adapters.map(async (adapter): Promise<CitedByResult> => {
      const id = adapter.descriptor.id;
      const bucket = limiterFor(adapter);
      // A rejected token means the circuit breaker is open: skip the adapter.
      if (bucket) await bucket.acquireToken(id);
      try {
        const result = await withTimeout(adapter.citedBy(doi, limit), CITED_BY_TIMEOUT_MS);
        bucket?.recordResponse(id, 200);
        return result;
      } catch (err) {
        bucket?.recordResponse(id, 500);
        throw err;
      }
    })
  );

  const answers = settled.filter(
    (outcome): outcome is PromiseFulfilledResult<CitedByResult> => outcome.status === "fulfilled"
  );
  if (answers.length === 0) throw new Error(CITED_BY_FAILED);

  const results = answers.map((a) => a.value);
  const withWorks = results.find((r) => r.works.length > 0);
  const withCount = results.find((r) => r.count !== null);
  const attributions = results
    .filter((r) => r === withWorks || r === withCount)
    .map((r) => r.attribution)
    .filter((a): a is string => !!a);

  return {
    count: withCount?.count ?? null,
    works: withWorks?.works ?? [],
    attribution: attributions.length > 0 ? Array.from(new Set(attributions)).join("; ") : undefined,
  };
}

// ---------------------------------------------------------------------------
// Adding a citing work to the library
// ---------------------------------------------------------------------------

/**
 * Split a display name ("Joseph Raz") into the Author shape the journal
 * formatter expects (Rule 5.1 / 4.1). A single token is treated as a surname.
 */
export function authorFromDisplayName(name: string): Author {
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { givenNames: "", surname: "" };
  const surname = tokens[tokens.length - 1];
  return { givenNames: tokens.slice(0, -1).join(" "), surname };
}

function pick(meta: SourceMetadata | undefined, key: keyof SourceMetadata): unknown {
  return meta ? meta[key] : undefined;
}

/**
 * Build the `journal.article` record for a citing work, linked back to the
 * article it cites. Fields absent from the work's metadata are omitted so
 * the form's required-field checks report them rather than seeing blanks.
 */
export function buildCitingWorkCitation(citedArticle: Citation, work: LookupResult): Citation {
  const meta = work.metadata;
  const data: Record<string, unknown> = {};

  const authorNames = pick(meta, "authors");
  if (Array.isArray(authorNames)) {
    const authors = authorNames
      .map((name) => text(name))
      .filter((name) => name !== "")
      .map(authorFromDisplayName);
    if (authors.length > 0) data.authors = authors;
  }

  const title = text(pick(meta, "title")) || work.title;
  if (title) data.title = title;

  const journal = text(pick(meta, "journal"));
  if (journal) data.journal = journal;

  const volume = pick(meta, "volume");
  if (typeof volume === "number" && Number.isFinite(volume)) data.volume = volume;
  else if (text(volume)) data.volume = text(volume);

  const issue = text(pick(meta, "issue"));
  if (issue) data.issue = issue;

  const startingPage = pick(meta, "startingPage");
  if (typeof startingPage === "number" && Number.isFinite(startingPage))
    data.startingPage = startingPage;
  else if (text(startingPage)) data.startingPage = text(startingPage);

  const year = pick(meta, "year");
  if (typeof year === "number" && Number.isFinite(year)) data.year = year;
  else if (text(year)) data.year = text(year);

  const doi = normaliseDoi(pick(meta, "doi")) || normaliseDoi(work.sourceId);
  if (doi) data.doi = doi;

  const now = new Date().toISOString();
  return {
    id: generateCitationId(),
    aglcVersion: citedArticle.aglcVersion,
    sourceType: "journal.article",
    data,
    tags: [],
    linkingPhrase: "citing",
    linkedCitationId: citedArticle.id,
    createdAt: now,
    modifiedAt: now,
  };
}

/**
 * Add a citing work to the shared library as a journal article linked to
 * the article it cites. Resolves to the stored record.
 */
export async function addCitingWorkToLibrary(
  citedArticle: Citation,
  work: LookupResult
): Promise<Citation> {
  const citation = buildCitingWorkCitation(citedArticle, work);
  const store = await getSharedStore();
  await store.add(citation);
  return citation;
}
