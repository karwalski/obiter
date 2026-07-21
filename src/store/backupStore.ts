/**
 * BackupStore — Office.js wrapper for the snapshot ring buffer part (SAFE-001).
 *
 * Same layering as citationStore.ts: all schema knowledge and policy live in
 * the pure module ./backupSerializer.ts; this file only moves XML in and out
 * of the document's Custom XML Parts.
 *
 * The backup part lives in BACKUP_NAMESPACE ("urn:obiter:aglc:backup"), a
 * different namespace from the main store, so it is invisible to
 * `initStore()`/`doPersist()` scans of "urn:obiter:aglc".
 *
 * The context-taking functions (readBackup, writeBackup, addSnapshot,
 * addFootnoteGeneration) are designed to run INSIDE an existing Word.run
 * batch — doPersist() calls addSnapshot() in its own batch so the snapshot
 * inherits persistChain serialization. The zero-argument helpers
 * (listSnapshots, getSnapshot, listFootnoteGenerations) open their own
 * Word.run for UI callers.
 *
 * Duplicate-part tolerance (co-authoring, copy/paste, save-as): every read
 * enumerates ALL parts in the backup namespace and merges the readable ones
 * by timestamp, newest kept. Corrupt backup parts are DELETED, not
 * quarantined — unlike the main store, where a corrupt part may be the only
 * copy of the user's data, backups are redundant copies by definition, so a
 * broken one is expendable. Multiple parts are consolidated back to one on
 * the next write.
 */

import {
  BACKUP_NAMESPACE,
  BackupData,
  FootnoteSnapshot,
  SnapshotReason,
  StoreSnapshot,
  applyFootnoteSnapshot,
  applyStoreSnapshot,
  deserializeBackup,
  emptyBackupData,
  mergeBackupData,
  serializeBackup,
} from "./backupSerializer";
import { createLogger } from "../debug/logger";

const log = createLogger("BackupStore");

// ─── Context-level primitives (compose into an existing Word.run) ───────────

interface BackupPartsScan {
  /** Every part found in the backup namespace (readable or not). */
  parts: Word.CustomXmlPart[];
  /** Parts whose XML failed to deserialize — expendable, to be deleted. */
  corruptParts: Word.CustomXmlPart[];
  /** Merged view of all readable parts, newest entries kept. */
  merged: BackupData;
}

/** Enumerate and read every backup-namespace part in the current batch. */
async function scanBackupParts(context: Word.RequestContext): Promise<BackupPartsScan> {
  const scopedParts = context.document.customXmlParts.getByNamespace(BACKUP_NAMESPACE);
  scopedParts.load("items");
  await context.sync();

  const parts = scopedParts.items ?? [];
  if (parts.length === 0) {
    return { parts: [], corruptParts: [], merged: emptyBackupData() };
  }

  for (const part of parts) {
    part.load("id");
  }
  const xmlResults = parts.map((part) => part.getXml());
  await context.sync();

  const readable: BackupData[] = [];
  const corruptParts: Word.CustomXmlPart[] = [];
  parts.forEach((part, i) => {
    try {
      readable.push(deserializeBackup(xmlResults[i].value ?? ""));
    } catch (err: unknown) {
      // Corrupt backup parts are expendable (see module comment) — collect
      // for deletion rather than quarantining.
      log.warn("scanBackupParts: deleting unreadable backup part", {
        error: err instanceof Error ? err.message : String(err),
      });
      corruptParts.push(part);
    }
  });

  return { parts, corruptParts, merged: mergeBackupData(readable) };
}

/** Replace every backup-namespace part with a single part holding `data`. */
function replaceBackupParts(
  context: Word.RequestContext,
  existingParts: Word.CustomXmlPart[],
  data: BackupData
): void {
  for (const part of existingParts) {
    try {
      part.delete();
    } catch {
      /* ignore — the part may already be gone */
    }
  }
  context.document.customXmlParts.add(serializeBackup(data));
}

/**
 * Read the merged backup data. Corrupt backup parts encountered are deleted
 * in the same batch (they are redundant copies — see module comment);
 * duplicate readable parts are consolidated into one.
 */
export async function readBackup(context: Word.RequestContext): Promise<BackupData> {
  const scan = await scanBackupParts(context);
  if (scan.parts.length > 1 || scan.corruptParts.length > 0) {
    const keepData = scan.merged.snapshots.length > 0 || scan.merged.footnoteSnapshots.length > 0;
    if (keepData) {
      replaceBackupParts(context, scan.parts, scan.merged);
    } else {
      for (const part of scan.parts) {
        try {
          part.delete();
        } catch {
          /* ignore */
        }
      }
    }
    await context.sync();
  }
  return scan.merged;
}

/**
 * Overwrite the backup with `data` as a single part (deletes every existing
 * backup-namespace part first, in the same batch — no synced intermediate
 * state with two parts).
 */
export async function writeBackup(context: Word.RequestContext, data: BackupData): Promise<void> {
  const scopedParts = context.document.customXmlParts.getByNamespace(BACKUP_NAMESPACE);
  scopedParts.load("items");
  await context.sync();
  replaceBackupParts(context, scopedParts.items ?? [], data);
  await context.sync();
}

export interface AddSnapshotParams {
  /** The complete serialized main-store XML being snapshotted. */
  storeXml: string;
  /** Citation count of that XML (already known to callers — avoids a re-parse). */
  citationCount: number;
  reason: SnapshotReason;
  /**
   * Citation count of the store about to be written over the snapshotted
   * one; when lower, the write shrinks the library and bypasses the throttle.
   */
  incomingCitationCount?: number;
  /** Override for tests; defaults to now. */
  timestamp?: string;
}

/**
 * Add a full-store snapshot to the ring buffer, applying the SAFE-001 policy
 * (dedup, 30 s throttle with shrink/pre-restore/manual override, ring of
 * MAX_STORE_SNAPSHOTS, byte cap). Runs inside the caller's Word.run batch.
 *
 * @returns true when a snapshot was written, false when policy skipped it.
 */
export async function addSnapshot(
  context: Word.RequestContext,
  params: AddSnapshotParams
): Promise<boolean> {
  const scan = await scanBackupParts(context);
  const snapshot: StoreSnapshot = {
    timestamp: params.timestamp ?? new Date().toISOString(),
    reason: params.reason,
    citationCount: params.citationCount,
    storeXml: params.storeXml,
  };
  const result = applyStoreSnapshot(scan.merged, snapshot, {
    incomingCitationCount: params.incomingCitationCount,
  });

  const needsConsolidation = scan.parts.length > 1 || scan.corruptParts.length > 0;
  if (!result.added && !needsConsolidation) {
    log.debug("addSnapshot: skipped", { reason: params.reason, skipped: result.skipped });
    return false;
  }

  replaceBackupParts(context, scan.parts, result.data);
  await context.sync();
  if (result.added) {
    log.debug("addSnapshot: snapshot written", {
      timestamp: snapshot.timestamp,
      reason: snapshot.reason,
      citationCount: snapshot.citationCount,
      ringSize: result.data.snapshots.length,
    });
  }
  return result.added;
}

/**
 * Add one pre-refresh footnote-text generation (SAFE-004 calls this from the
 * refresh path). Keeps MAX_FOOTNOTE_GENERATIONS generations within the shared
 * byte cap. Runs inside the caller's Word.run batch.
 */
export async function addFootnoteGeneration(
  context: Word.RequestContext,
  generation: FootnoteSnapshot
): Promise<void> {
  const scan = await scanBackupParts(context);
  const data = applyFootnoteSnapshot(scan.merged, generation);
  replaceBackupParts(context, scan.parts, data);
  await context.sync();
}

// ─── Standalone helpers (own Word.run; for the Recovery UI, SAFE-005) ───────

/** Snapshot listing entry — everything except the (potentially large) XML. */
export interface SnapshotSummary {
  timestamp: string;
  reason: SnapshotReason;
  citationCount: number;
}

/** List available store snapshots, newest first. */
export async function listSnapshots(): Promise<SnapshotSummary[]> {
  return Word.run(async (context) => {
    const data = await readBackup(context);
    return data.snapshots.map((s) => ({
      timestamp: s.timestamp,
      reason: s.reason,
      citationCount: s.citationCount,
    }));
  });
}

/** Fetch a single snapshot (including its full store XML) by timestamp. */
export async function getSnapshot(timestamp: string): Promise<StoreSnapshot | null> {
  return Word.run(async (context) => {
    const data = await readBackup(context);
    return data.snapshots.find((s) => s.timestamp === timestamp) ?? null;
  });
}

/** List footnote-text generations, newest first (SAFE-004/005 restore UI). */
export async function listFootnoteGenerations(): Promise<FootnoteSnapshot[]> {
  return Word.run(async (context) => {
    const data = await readBackup(context);
    return data.footnoteSnapshots;
  });
}
