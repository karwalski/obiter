/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/* global Office, Word */

/**
 * Office.js API Compatibility Layer (COURT-103, OBI-401)
 *
 * Provides runtime detection of the Word API requirement sets the host
 * supports, feature-flag checks so that the add-in can degrade gracefully on
 * hosts without newer sets, and a capability snapshot for issue reports.
 *
 * Core functionality targets WordApi 1.5 (the manifest minimum). Every guard
 * in `src/word/` that depends on a requirement set should go through
 * `isFeatureAvailable()` so the minimum versions live in one place.
 *
 * Sources for every minimum version below: Microsoft Learn Word requirement
 * set tables, retrieved 6 October 2026 (evidence register MS-1, MS-2, MS-4;
 * docs/research/court-interop/R08-word-api-capability-matrix.md §3). A
 * requirement set says what Microsoft documents, not what a given client does:
 * `docs/compatibility-matrix.md` records which cells have been device-tested.
 */

// ─── Feature Flag Definitions ────────────────────────────────────────────────

/** Describes an API feature and the minimum API set version it requires. */
export interface FeatureFlag {
  /** The Office API set name (e.g. "WordApi", "WordApiDesktop"). */
  apiSet: string;
  /** The minimum version of the API set required (e.g. "1.5"). */
  version: string;
  /** Human-readable description of the feature. */
  description?: string;
}

/**
 * Known feature flags, keyed by feature name.
 *
 * Minimum versions follow the Microsoft Learn requirement-set tables (R08 §3).
 * Features at or below the WordApi 1.5 baseline are listed too, so that
 * existing guards can be routed through one table instead of hard-coding a
 * version at each call site.
 */
export const FEATURE_FLAGS: Record<string, FeatureFlag> = {
  // WordApi 1.3 — R08 §3.3, §3.7
  customProperties: {
    apiSet: "WordApi",
    version: "1.3",
    description: "DocumentProperties.customProperties (add, getItemOrNullObject, delete)",
  },
  listApi: {
    apiSet: "WordApi",
    version: "1.3",
    description: "Paragraph list APIs (startNewList, attachToList, listItem)",
  },

  // WordApi 1.4 — R08 §3.4, §3.5, §3.6
  comments: {
    apiSet: "WordApi",
    version: "1.4",
    description: "Range.insertComment, getComments, Comment.reply/resolved",
  },
  changeTrackingMode: {
    apiSet: "WordApi",
    version: "1.4",
    description: "Document.changeTrackingMode (read the user's Track Changes setting)",
  },
  bookmarks: {
    apiSet: "WordApi",
    version: "1.4",
    description: "Range.insertBookmark, getBookmarks, Document.getBookmarkRange",
  },
  fieldsRead: {
    apiSet: "WordApi",
    version: "1.4",
    description: "Reading fields (fields collection, Field.code, Field.result)",
  },

  // WordApi 1.5 — R08 §3.7
  addStyle: {
    apiSet: "WordApi",
    version: "1.5",
    description: "Document.addStyle() and getStyles() for named AGLC4 styles",
  },
  changeTrackingStates: {
    apiSet: "WordApi",
    version: "1.5",
    description:
      "ContentControlCollection.getByChangeTrackingStates (controls inside pending revisions)",
  },

  // WordApi 1.6 — R08 §3.6
  trackedChanges: {
    apiSet: "WordApi",
    version: "1.6",
    description: "getTrackedChanges, TrackedChange accept/reject",
  },

  // WordApi 1.7
  annotations: {
    apiSet: "WordApi",
    version: "1.7",
    description: "Annotations API for inline markup",
  },
  checkboxContentControls: {
    apiSet: "WordApi",
    version: "1.7",
    description: "Checkbox content controls",
  },
  critiqueSuggestions: {
    apiSet: "WordApi",
    version: "1.7",
    description: "Critique and suggestion annotations",
  },

  // WordApiDesktop — Windows and Mac only (R08 §2, §3.5)
  listTemplates: {
    apiSet: "WordApiDesktop",
    version: "1.1",
    description: "ListTemplate / Style.listTemplate inspection",
  },
  tablesOfAuthorities: {
    apiSet: "WordApiDesktop",
    version: "1.4",
    description: "Native table of authorities object model",
  },
};

// ─── Requirement-set probes ──────────────────────────────────────────────────

/** WordApi versions to probe, from newest to oldest (R08 §2). */
const WORDAPI_VERSIONS = ["1.9", "1.8", "1.7", "1.6", "1.5", "1.4", "1.3", "1.2", "1.1"];

/** WordApiDesktop versions to probe (R08 §2). Never present on the web. */
const WORDAPI_DESKTOP_VERSIONS = ["1.5", "1.4", "1.3", "1.2", "1.1"];

/** WordApiHiddenDocument versions to probe (R08 §2). Desktop only. */
const WORDAPI_HIDDEN_VERSIONS = ["1.5", "1.4", "1.3"];

/** isSetSupported that never throws (Office may be absent in tests or early load). */
function setSupported(apiSet: string, version: string): boolean {
  try {
    return Office.context.requirements.isSetSupported(apiSet, version) === true;
  } catch {
    return false;
  }
}

/** Highest version in `versions` (newest first) the host supports, or "none". */
function highestSupported(apiSet: string, versions: string[]): string {
  for (const version of versions) {
    if (setSupported(apiSet, version)) return version;
  }
  return "none";
}

/**
 * Returns the highest WordApi version supported by the current host.
 *
 * Probes from newest to oldest using `Office.context.requirements.isSetSupported()`.
 * If no version is detected (which should not happen on a supported host),
 * returns `"unknown"`.
 *
 * @returns A version string such as `"1.5"`, `"1.9"`, etc.
 */
export function getApiVersion(): string {
  const found = highestSupported("WordApi", WORDAPI_VERSIONS);
  return found === "none" ? "unknown" : found;
}

// ─── Feature Availability Checks ─────────────────────────────────────────────

/**
 * Checks whether a named feature is available in the current host environment.
 *
 * Looks up the feature in `FEATURE_FLAGS` and uses the Office.js requirements
 * API to determine if the host supports the required API set version.
 *
 * A requirement set is a documentation claim, not proof of behaviour: for
 * field writes use `probeFieldsWritable()` instead (R08 §3.4).
 *
 * @param feature - A key from `FEATURE_FLAGS` (e.g. `"addStyle"`,
 *   `"customProperties"`).
 * @returns `true` if the feature is supported, `false` if not supported,
 *   if Office.js is unavailable, or if the feature name is not recognised.
 */
export function isFeatureAvailable(feature: string): boolean {
  const flag = FEATURE_FLAGS[feature];
  if (!flag) {
    return false;
  }
  return setSupported(flag.apiSet, flag.version);
}

// ─── Platform and behaviour flags ────────────────────────────────────────────

/** Office.context.diagnostics.platform, as a string ("PC", "Mac", "OfficeOnline", "iOS"...). */
export function getHostPlatform(): string {
  try {
    const platform = Office.context.diagnostics?.platform;
    return platform !== undefined && platform !== null ? String(platform) : "unknown";
  } catch {
    return "unknown";
  }
}

/** Office.context.diagnostics.version (the client build), or "unknown". */
export function getHostVersion(): string {
  try {
    const version = Office.context.diagnostics?.version;
    return version ? String(version) : "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * True when the host platform is Word on Windows ("PC") or Word on Mac.
 * Microsoft documents field insertion and management for those two clients
 * only; "In Word on the web, fields are mainly read-only" (MS-4, R08 §3.4).
 */
export function isDesktopPlatform(): boolean {
  const platform = getHostPlatform();
  return platform === "PC" || platform === "Mac";
}

let fieldsWritableCache: boolean | undefined;

/**
 * Behaviour flag `fieldsWritable` (COURT-103).
 *
 * True only when the platform is Windows or Mac AND a guarded probe of the
 * WordApi 1.5 field API succeeds. It is never inferred from
 * `isSetSupported` alone, because Word on the web reports WordApi 1.5 while
 * treating fields as mainly read-only (MS-4, R08 §3.4).
 *
 * The probe is read-only: it loads the type of the body's fields. Inserting a
 * test field would change the user's document, so the add-in does not do it;
 * callers that write fields must still wrap the write in try/catch.
 *
 * The result is cached for the session. One sync, regardless of how many
 * fields the document holds.
 *
 * @param context - A Word.RequestContext from within a Word.run() callback.
 */
export async function probeFieldsWritable(context: Word.RequestContext): Promise<boolean> {
  if (fieldsWritableCache !== undefined) return fieldsWritableCache;
  if (!isDesktopPlatform() || !setSupported("WordApi", "1.5")) {
    fieldsWritableCache = false;
    return false;
  }
  try {
    const fields = context.document.body.fields;
    fields.load("items/type");
    await context.sync();
    fieldsWritableCache = true;
  } catch {
    fieldsWritableCache = false;
  }
  return fieldsWritableCache;
}

/** The cached `fieldsWritable` result, or undefined when not yet probed. */
export function getFieldsWritable(): boolean | undefined {
  return fieldsWritableCache;
}

/** Test hook: clear the cached field probe. */
export function resetCapabilityCache(): void {
  fieldsWritableCache = undefined;
}

// ─── Capability snapshot (issue reports) ─────────────────────────────────────

/** A point-in-time record of what the host reports, for diagnostics and issue reports. */
export interface CapabilitySnapshot {
  /** Office.context.diagnostics.platform ("PC", "Mac", "OfficeOnline", "iOS"...). */
  platform: string;
  /** Office.context.diagnostics.version (client build). */
  hostVersion: string;
  /** Highest WordApi version reported, or "unknown". */
  wordApi: string;
  /** Highest WordApiDesktop version reported, or "none". */
  wordApiDesktop: string;
  /** Highest WordApiHiddenDocument version reported, or "none". */
  wordApiHiddenDocument: string;
  /** Each FEATURE_FLAGS key mapped to its requirement-set result. */
  features: Record<string, boolean>;
  /** The fieldsWritable behaviour flag, or "not probed". */
  fieldsWritable: boolean | "not probed";
}

/**
 * Probes WordApi 1.1–1.9, WordApiDesktop 1.1–1.5 and WordApiHiddenDocument
 * 1.3–1.5, and records the host platform and build (COURT-103). Never throws;
 * without Office.js every set reads as unsupported.
 */
export function getCapabilitySnapshot(): CapabilitySnapshot {
  const features: Record<string, boolean> = {};
  for (const key of Object.keys(FEATURE_FLAGS)) {
    features[key] = isFeatureAvailable(key);
  }
  return {
    platform: getHostPlatform(),
    hostVersion: getHostVersion(),
    wordApi: getApiVersion(),
    wordApiDesktop: highestSupported("WordApiDesktop", WORDAPI_DESKTOP_VERSIONS),
    wordApiHiddenDocument: highestSupported("WordApiHiddenDocument", WORDAPI_HIDDEN_VERSIONS),
    features,
    fieldsWritable: fieldsWritableCache === undefined ? "not probed" : fieldsWritableCache,
  };
}

/** Plain-text rendering of a capability snapshot, for logs and issue reports. */
export function formatCapabilitySnapshot(snapshot: CapabilitySnapshot): string {
  const on = Object.entries(snapshot.features)
    .filter(([, v]) => v)
    .map(([k]) => k);
  const off = Object.entries(snapshot.features)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  return [
    `Platform: ${snapshot.platform}`,
    `Word build: ${snapshot.hostVersion}`,
    `WordApi: ${snapshot.wordApi}`,
    `WordApiDesktop: ${snapshot.wordApiDesktop}`,
    `WordApiHiddenDocument: ${snapshot.wordApiHiddenDocument}`,
    `Fields writable: ${String(snapshot.fieldsWritable)}`,
    `Available: ${on.length > 0 ? on.join(", ") : "none"}`,
    `Unavailable: ${off.length > 0 ? off.join(", ") : "none"}`,
  ].join("\n");
}
