/**
 * Backup serialization for the Obiter snapshot ring buffer (SAFE-001).
 *
 * The backup lives in a SECOND Custom XML Part in its own namespace
 * (`urn:obiter:aglc:backup`), so it is invisible to every main-store scan —
 * `initStore()` and `doPersist()` enumerate strictly via
 * `getByNamespace("urn:obiter:aglc")`.
 *
 * This module is pure (no Office.js dependency): schema types,
 * (de)serialization, and the snapshot-add policy (dedup, throttle,
 * shrink-override, ring size, byte cap). The Office.js wrapper lives in
 * ./backupStore.ts.
 *
 * ## Backup schema v1
 *
 * ```xml
 * <obiter:backupStore xmlns:obiter="urn:obiter:aglc:backup" version="1">
 *   <obiter:snapshot timestamp="ISO" reason="persist|pre-restore|manual"
 *                    citationCount="N">…escaped full store XML…</obiter:snapshot>
 *   <obiter:footnoteSnapshot timestamp="ISO">
 *     <obiter:fn n="12" hash="…">…escaped footnote text…</obiter:fn>
 *   </obiter:footnoteSnapshot>
 * </obiter:backupStore>
 * ```
 *
 * Store XML is embedded as XML-ESCAPED TEXT, never CDATA: a CDATA section
 * cannot contain "]]>", and citation data can (pasted URLs, quotations).
 * DOMParser's textContent un-escapes on read, so round-tripping is lossless.
 *
 * `<obiter:footnoteSnapshot>` generations are defined here (schema +
 * (de)serialization + policy) but written by SAFE-004's refresh hook, not
 * by SAFE-001.
 */

import { escapeXml } from "./xmlSerializer";

export const BACKUP_NAMESPACE = "urn:obiter:aglc:backup";
const BACKUP_SCHEMA_VERSION = "1";

/** Ring size for full-store snapshots. */
export const MAX_STORE_SNAPSHOTS = 3;
/** Ring size for footnote-text generations (written by SAFE-004). */
export const MAX_FOOTNOTE_GENERATIONS = 2;
/**
 * Approximate total size cap for the serialized backup part (~1.5 MB).
 * Measured in characters of the serialized XML — close enough to bytes for
 * the mostly-ASCII payloads involved, and cheap to compute.
 */
export const MAX_BACKUP_CHARS = 1_500_000;

/** Throttle window for "persist"-reason snapshots. */
export const SNAPSHOT_THROTTLE_MS = 30_000;

// ─── Types ───────────────────────────────────────────────────────────────────

export type SnapshotReason = "persist" | "pre-restore" | "manual";

/** One full-store snapshot in the ring buffer. */
export interface StoreSnapshot {
  /** ISO-8601 timestamp; also the snapshot's identity for lookup/merge. */
  timestamp: string;
  reason: SnapshotReason;
  /** Citation count of the snapshotted store, denormalized for UI listing. */
  citationCount: number;
  /** The complete serialized main-store XML document. */
  storeXml: string;
}

/** One footnote's prior text inside a footnote generation (SAFE-004). */
export interface FootnoteBackupEntry {
  /** Footnote number in the document. */
  n: number;
  /** Rendered-text hash at snapshot time (SAFE-002 hash format). */
  hash: string;
  /** The footnote text as it stood before the rebuild. */
  text: string;
}

/** One generation of pre-refresh footnote texts (written by SAFE-004). */
export interface FootnoteSnapshot {
  timestamp: string;
  footnotes: FootnoteBackupEntry[];
}

/** The full contents of the backup part. Newest-first ordering throughout. */
export interface BackupData {
  snapshots: StoreSnapshot[];
  footnoteSnapshots: FootnoteSnapshot[];
}

/**
 * Thrown when a backup part cannot be deserialized. Unlike the main store
 * (StoreXmlError → quarantine), corrupt backup parts are expendable and are
 * simply deleted by the reader — backups are redundant copies by definition.
 */
export class BackupXmlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupXmlError";
  }
}

export function emptyBackupData(): BackupData {
  return { snapshots: [], footnoteSnapshots: [] };
}

// ─── Serialization ───────────────────────────────────────────────────────────

/**
 * Serialize backup data to the backup-part XML document.
 * Snapshots and generations are written newest-first, matching the
 * in-memory ordering invariant.
 */
export function serializeBackup(data: BackupData): string {
  const lines: string[] = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(
    `<obiter:backupStore xmlns:obiter="${BACKUP_NAMESPACE}" version="${BACKUP_SCHEMA_VERSION}">`
  );
  for (const snap of data.snapshots) {
    lines.push(
      `  <obiter:snapshot timestamp="${escapeXml(snap.timestamp)}" ` +
        `reason="${escapeXml(snap.reason)}" ` +
        `citationCount="${snap.citationCount}">${escapeXml(snap.storeXml)}</obiter:snapshot>`
    );
  }
  for (const gen of data.footnoteSnapshots) {
    lines.push(`  <obiter:footnoteSnapshot timestamp="${escapeXml(gen.timestamp)}">`);
    for (const fn of gen.footnotes) {
      lines.push(
        `    <obiter:fn n="${fn.n}" hash="${escapeXml(fn.hash)}">${escapeXml(fn.text)}</obiter:fn>`
      );
    }
    lines.push(`  </obiter:footnoteSnapshot>`);
  }
  lines.push(`</obiter:backupStore>`);
  return lines.join("\n");
}

/**
 * Deserialize a backup part payload.
 *
 * @throws {BackupXmlError} on an empty payload, malformed XML, or a root
 *   element that is not `<obiter:backupStore>`. Callers delete such parts.
 *   Individual snapshot elements missing a timestamp are skipped, not fatal.
 */
export function deserializeBackup(xml: string): BackupData {
  if (!xml || xml.trim() === "") {
    throw new BackupXmlError("Backup XML payload is empty");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");
  const root = doc.documentElement;

  // DOMParser never throws — same <parsererror> detection as xmlSerializer.
  if (
    root == null ||
    root.localName === "parsererror" ||
    doc.getElementsByTagName("parsererror").length > 0
  ) {
    throw new BackupXmlError("Backup XML is not well-formed");
  }
  if (root.localName !== "backupStore") {
    throw new BackupXmlError(`Expected <obiter:backupStore> root, found <${root.localName}>`);
  }

  const snapshots: StoreSnapshot[] = [];
  const footnoteSnapshots: FootnoteSnapshot[] = [];

  for (const child of Array.from(root.children)) {
    if (child.localName === "snapshot") {
      const timestamp = child.getAttribute("timestamp");
      if (!timestamp) continue; // damaged element — skip, backups are best-effort
      snapshots.push({
        timestamp,
        reason: parseReason(child.getAttribute("reason")),
        citationCount: parseCount(child.getAttribute("citationCount")),
        storeXml: child.textContent ?? "",
      });
    } else if (child.localName === "footnoteSnapshot") {
      const timestamp = child.getAttribute("timestamp");
      if (!timestamp) continue;
      const footnotes: FootnoteBackupEntry[] = [];
      for (const fnEl of Array.from(child.children)) {
        if (fnEl.localName !== "fn") continue;
        const n = parseInt(fnEl.getAttribute("n") ?? "", 10);
        if (!Number.isFinite(n)) continue;
        footnotes.push({
          n,
          hash: fnEl.getAttribute("hash") ?? "",
          text: fnEl.textContent ?? "",
        });
      }
      footnoteSnapshots.push({ timestamp, footnotes });
    }
  }

  return {
    snapshots: sortNewestFirst(snapshots),
    footnoteSnapshots: sortNewestFirst(footnoteSnapshots),
  };
}

// ─── Merge (co-authoring duplicate parts) ────────────────────────────────────

/**
 * Merge the contents of multiple backup parts (Word duplicates parts on
 * copy/paste, save-as, and co-authoring) into one. Entries are identified
 * by timestamp; the newest MAX_STORE_SNAPSHOTS / MAX_FOOTNOTE_GENERATIONS
 * survive, then the byte cap is enforced.
 */
export function mergeBackupData(sources: BackupData[]): BackupData {
  const snapByTs = new Map<string, StoreSnapshot>();
  const genByTs = new Map<string, FootnoteSnapshot>();
  for (const source of sources) {
    for (const snap of source.snapshots) {
      if (!snapByTs.has(snap.timestamp)) snapByTs.set(snap.timestamp, snap);
    }
    for (const gen of source.footnoteSnapshots) {
      if (!genByTs.has(gen.timestamp)) genByTs.set(gen.timestamp, gen);
    }
  }
  const merged: BackupData = {
    snapshots: sortNewestFirst(Array.from(snapByTs.values())).slice(0, MAX_STORE_SNAPSHOTS),
    footnoteSnapshots: sortNewestFirst(Array.from(genByTs.values())).slice(
      0,
      MAX_FOOTNOTE_GENERATIONS
    ),
  };
  return enforceSizeCap(merged);
}

// ─── Snapshot-add policy ─────────────────────────────────────────────────────

export interface ApplySnapshotOptions {
  /**
   * Citation count of the store about to be WRITTEN over the snapshotted
   * one. When it is lower than the snapshot's count the write shrinks the
   * library — the delete/clobber signature — and the throttle is bypassed.
   */
  incomingCitationCount?: number;
}

export interface ApplySnapshotResult {
  data: BackupData;
  /** False when the snapshot was skipped (see skipped). */
  added: boolean;
  skipped?: "duplicate" | "throttled";
}

/**
 * Pure snapshot-add policy (SAFE-001):
 * - dedup: skip if the incoming store XML equals the newest stored snapshot's;
 * - throttle: max one "persist" snapshot per 30 s, EXCEPT when the incoming
 *   write shrinks the library or the reason is "pre-restore"/"manual".
 *   The reference time is the newest stored snapshot's own timestamp — kept
 *   in the backup data, not module state, so it survives reloads;
 * - ring: newest MAX_STORE_SNAPSHOTS survive;
 * - cap: oldest entries evicted until the serialized size fits
 *   MAX_BACKUP_CHARS (a single oversized snapshot degrades the ring to 1).
 */
export function applyStoreSnapshot(
  data: BackupData,
  snapshot: StoreSnapshot,
  opts: ApplySnapshotOptions = {}
): ApplySnapshotResult {
  const newest: StoreSnapshot | undefined = data.snapshots[0];

  if (newest && newest.storeXml === snapshot.storeXml) {
    return { data, added: false, skipped: "duplicate" };
  }

  const shrinks =
    opts.incomingCitationCount != null && opts.incomingCitationCount < snapshot.citationCount;
  const throttleExempt =
    shrinks || snapshot.reason === "pre-restore" || snapshot.reason === "manual";
  if (newest && !throttleExempt) {
    const elapsed = Date.parse(snapshot.timestamp) - Date.parse(newest.timestamp);
    if (Number.isFinite(elapsed) && elapsed < SNAPSHOT_THROTTLE_MS) {
      return { data, added: false, skipped: "throttled" };
    }
  }

  const stamped = { ...snapshot, timestamp: uniqueTimestamp(snapshot.timestamp, data.snapshots) };
  const next: BackupData = {
    snapshots: sortNewestFirst([stamped, ...data.snapshots]).slice(0, MAX_STORE_SNAPSHOTS),
    footnoteSnapshots: data.footnoteSnapshots,
  };
  return { data: enforceSizeCap(next), added: true };
}

/**
 * Add one footnote-text generation (called by SAFE-004's refresh hook).
 * Keeps the newest MAX_FOOTNOTE_GENERATIONS generations, then enforces the
 * shared byte cap.
 */
export function applyFootnoteSnapshot(data: BackupData, generation: FootnoteSnapshot): BackupData {
  const stamped = {
    ...generation,
    timestamp: uniqueTimestamp(generation.timestamp, data.footnoteSnapshots),
  };
  const next: BackupData = {
    snapshots: data.snapshots,
    footnoteSnapshots: sortNewestFirst([stamped, ...data.footnoteSnapshots]).slice(
      0,
      MAX_FOOTNOTE_GENERATIONS
    ),
  };
  return enforceSizeCap(next);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Evict oldest entries until the serialized backup fits MAX_BACKUP_CHARS.
 * Eviction order: oldest store snapshot / footnote generation first
 * (whichever is older), then the last remaining footnote generation. The
 * newest store snapshot is never evicted: if it alone exceeds the cap, the
 * result stays over cap (a single oversized snapshot degrades the ring to
 * 1 — an oversized backup part is still better than no backup).
 */
function enforceSizeCap(data: BackupData): BackupData {
  let snapshots = data.snapshots;
  let footnoteSnapshots = data.footnoteSnapshots;

  while (serializeBackup({ snapshots, footnoteSnapshots }).length > MAX_BACKUP_CHARS) {
    const oldestSnap = snapshots.length > 1 ? snapshots[snapshots.length - 1] : null;
    const oldestGen =
      footnoteSnapshots.length > 1 ? footnoteSnapshots[footnoteSnapshots.length - 1] : null;
    if (oldestSnap && (!oldestGen || oldestSnap.timestamp <= oldestGen.timestamp)) {
      snapshots = snapshots.slice(0, snapshots.length - 1);
    } else if (oldestGen) {
      footnoteSnapshots = footnoteSnapshots.slice(0, footnoteSnapshots.length - 1);
    } else if (footnoteSnapshots.length === 1 && snapshots.length >= 1) {
      // Only the newest of each remains: drop the footnote generation before
      // degrading below one store snapshot.
      footnoteSnapshots = [];
    } else {
      break; // single oversized store snapshot — accept ring-of-1 over cap
    }
  }

  if (snapshots === data.snapshots && footnoteSnapshots === data.footnoteSnapshots) {
    return data;
  }
  return { snapshots, footnoteSnapshots };
}

/**
 * Timestamps are the identity key for snapshots/generations (lookup and
 * duplicate-part merge), so two entries must never share one. Two writes in
 * the same millisecond are possible — e.g. the pre-restore snapshot and the
 * following persist's snapshot — so bump by 1 ms until unique. The bumped
 * entry is the most recently added, so sorting newest-first stays correct.
 */
function uniqueTimestamp(timestamp: string, existing: Array<{ timestamp: string }>): string {
  const taken = new Set(existing.map((e) => e.timestamp));
  let ts = timestamp;
  while (taken.has(ts)) {
    const parsed = Date.parse(ts);
    if (!Number.isFinite(parsed)) break; // unparseable — give up rather than loop
    ts = new Date(parsed + 1).toISOString();
  }
  return ts;
}

/** ISO-8601 timestamps compare correctly as strings; ties keep insertion order. */
function sortNewestFirst<T extends { timestamp: string }>(items: T[]): T[] {
  return [...items].sort((a, b) =>
    a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0
  );
}

function parseReason(raw: string | null): SnapshotReason {
  return raw === "persist" || raw === "pre-restore" || raw === "manual" ? raw : "manual";
}

function parseCount(raw: string | null): number {
  const n = parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
