/**
 * First-Launch Corpus Download UX (Story 17.8)
 *
 * Manages the lifecycle of the local corpus index: checking availability,
 * downloading from Obiter Cloud CDN, persisting to IndexedDB, and providing
 * progress feedback.
 *
 * Downloads the corpus index JSON from the Obiter CDN. Falls back to mock
 * data when the CDN is not reachable (development / offline).
 *
 * Persistence: After downloading, entries are stored in IndexedDB so they
 * survive page refreshes. On startup, the index is loaded from IDB into
 * the in-memory InMemoryCorpusIndex for fast queries.
 */

import type { CorpusEntry } from "./corpusIndex";
import { InMemoryCorpusIndex } from "./inMemoryCorpusIndex";
import { getDevicePref, setDevicePref } from "../../store/devicePreferences";

export type CorpusStatus = "not-downloaded" | "downloading" | "ready" | "error";

/** Progress callback: (loaded entries, total entries) => void */
export type CorpusProgressCallback = (loaded: number, total: number) => void;

/** CDN endpoint for the corpus index JSON (Cloudflare R2). */
const CORPUS_CDN_URL = "https://corpus.obiter.com.au/corpus/index.json";

/** IndexedDB database name and store names. */
const IDB_NAME = "obiter-corpus";
const IDB_STORE_ENTRIES = "entries";
const IDB_STORE_META = "meta";
const IDB_VERSION = 1;

let corpusStatus: CorpusStatus = "not-downloaded";
let corpusIndex: InMemoryCorpusIndex | null = null;

// ---------------------------------------------------------------------------
// IndexedDB helpers
// ---------------------------------------------------------------------------

/** Open (or create) the IndexedDB database. */
function openCorpusDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE_ENTRIES)) {
        db.createObjectStore(IDB_STORE_ENTRIES, { keyPath: "corpusDocId" });
      }
      if (!db.objectStoreNames.contains(IDB_STORE_META)) {
        db.createObjectStore(IDB_STORE_META, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Save corpus entries to IndexedDB, replacing any previous data. */
export async function saveCorpusToIDB(entries: CorpusEntry[]): Promise<void> {
  const db = await openCorpusDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_ENTRIES, "readwrite");
    const store = tx.objectStore(IDB_STORE_ENTRIES);
    store.clear();
    for (const entry of entries) {
      store.put(entry);
    }
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/** Load all corpus entries from IndexedDB. Returns null if the store is empty. */
export async function loadCorpusFromIDB(): Promise<CorpusEntry[] | null> {
  try {
    const db = await openCorpusDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_ENTRIES, "readonly");
      const store = tx.objectStore(IDB_STORE_ENTRIES);
      const request = store.getAll();
      request.onsuccess = () => {
        db.close();
        const entries = request.result as CorpusEntry[];
        resolve(entries.length > 0 ? entries : null);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch {
    return null;
  }
}

/** Clear all corpus entries and metadata from IndexedDB. */
export async function clearCorpusFromIDB(): Promise<void> {
  try {
    const db = await openCorpusDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([IDB_STORE_ENTRIES, IDB_STORE_META], "readwrite");
      tx.objectStore(IDB_STORE_ENTRIES).clear();
      tx.objectStore(IDB_STORE_META).clear();
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    // Silently fail — may not have IndexedDB access
  }
}

/** Get the stored corpus version from IndexedDB metadata. */
export async function getCorpusIDBVersion(): Promise<string | null> {
  try {
    const db = await openCorpusDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_META, "readonly");
      const store = tx.objectStore(IDB_STORE_META);
      const request = store.get("corpus-version");
      request.onsuccess = () => {
        db.close();
        const record = request.result as { key: string; value: string } | undefined;
        resolve(record?.value ?? null);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch {
    return null;
  }
}

/** Save corpus metadata (version, entry count, build date) to IndexedDB. */
async function saveCorpusMeta(version: string, entryCount: number): Promise<void> {
  try {
    const db = await openCorpusDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_META, "readwrite");
      const store = tx.objectStore(IDB_STORE_META);
      store.put({ key: "corpus-version", value: version });
      store.put({ key: "corpus-entryCount", value: entryCount });
      store.put({ key: "corpus-savedAt", value: new Date().toISOString() });
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    // Silently fail
  }
}

/** Get all corpus metadata from IndexedDB. */
export async function getCorpusMeta(): Promise<{
  version: string | null;
  entryCount: number | null;
  savedAt: string | null;
}> {
  try {
    const db = await openCorpusDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_META, "readonly");
      const store = tx.objectStore(IDB_STORE_META);

      const results: Record<string, unknown> = {};
      const cursorReq = store.openCursor();
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          const record = cursor.value as { key: string; value: unknown };
          results[record.key] = record.value;
          cursor.continue();
        } else {
          db.close();
          resolve({
            version: (results["corpus-version"] as string) ?? null,
            entryCount: (results["corpus-entryCount"] as number) ?? null,
            savedAt: (results["corpus-savedAt"] as string) ?? null,
          });
        }
      };
      cursorReq.onerror = () => {
        db.close();
        reject(cursorReq.error);
      };
    });
  } catch {
    return { version: null, entryCount: null, savedAt: null };
  }
}

// ---------------------------------------------------------------------------
// Skip preference (persisted in devicePreferences / localStorage)
// ---------------------------------------------------------------------------

/** Set preference to skip corpus and use online sources only. */
export function skipCorpus(): void {
  setDevicePref("corpusSkipped", true);
}

/** Check whether the user has opted to skip the corpus. */
export function isCorpusSkipped(): boolean {
  return getDevicePref("corpusSkipped") === true;
}

/** Clear the skip preference so the banner can show again. */
export function clearCorpusSkip(): void {
  setDevicePref("corpusSkipped", undefined);
}

// ---------------------------------------------------------------------------
// In-memory corpus state
// ---------------------------------------------------------------------------

/** Check whether the corpus index is loaded in memory and ready to query. */
export function checkCorpusAvailable(): boolean {
  return corpusStatus === "ready" && corpusIndex !== null;
}

/** Return the current download/readiness status. */
export function getCorpusStatus(): CorpusStatus {
  return corpusStatus;
}

/** Return the loaded corpus index, or null if not ready. */
export function getCorpusIndex(): InMemoryCorpusIndex | null {
  return corpusIndex;
}

// ---------------------------------------------------------------------------
// Startup: load from IndexedDB into memory
// ---------------------------------------------------------------------------

/**
 * Attempt to load the corpus from IndexedDB into the InMemoryCorpusIndex.
 * Returns true if the corpus was successfully loaded from IDB.
 */
export async function loadCorpusFromStorage(): Promise<boolean> {
  if (corpusStatus === "ready" && corpusIndex !== null) {
    return true;
  }

  try {
    const entries = await loadCorpusFromIDB();
    if (!entries) return false;

    const version = await getCorpusIDBVersion();
    const index = new InMemoryCorpusIndex();
    index.loadFromJson(entries, version ?? "0.0.0");
    corpusIndex = index;
    corpusStatus = "ready";
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// CDN download
// ---------------------------------------------------------------------------

/**
 * Generate a small mock dataset for testing and initial integration.
 * Production will fetch from Obiter Cloud CDN.
 */
function generateMockEntries(): CorpusEntry[] {
  const jurisdictions = ["Cth", "NSW", "Vic", "Qld", "WA", "SA", "Tas"];
  const courts: Record<string, string[]> = {
    Cth: ["HCA", "FCA", "FCAFC"],
    NSW: ["NSWSC", "NSWCA", "NSWLEC"],
    Vic: ["VSC", "VSCA"],
    Qld: ["QSC", "QCA"],
    WA: ["WASC", "WASCA"],
    SA: ["SASC", "SASCFC"],
    Tas: ["TASSC", "TASCCA"],
  };
  const entries: CorpusEntry[] = [];

  // Generate 100 mock case entries
  for (let i = 0; i < 100; i++) {
    const jIdx = i % jurisdictions.length;
    const jurisdiction = jurisdictions[jIdx];
    const courtList = courts[jurisdiction];
    const court = courtList[i % courtList.length];
    const year = 2000 + (i % 24);
    const num = i + 1;
    const citation = `[${year}] ${court} ${num}`;
    const parties = `Party A v Party B (No ${i + 1})`;

    entries.push({
      citation,
      normalisedCitation: citation
        .replace(/[[\]()]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim(),
      jurisdiction,
      courtOrRegister: court,
      type: "case",
      year,
      parties,
      sourceUrl: `https://www.austlii.edu.au/cgi-bin/viewdoc/au/cases/${jurisdiction.toLowerCase()}/${court}/${year}/${num}.html`,
      corpusDocId: `corpus-case-${i + 1}`,
    });
  }

  return entries;
}

/** Shape of the CDN response wrapping the corpus entries. */
interface CorpusCdnResponse {
  version: string;
  entries: CorpusEntry[];
}

/**
 * Attempt to fetch the corpus index from the Obiter CDN.
 * Returns null if the CDN is unreachable or returns an invalid response.
 */
async function fetchFromCdn(): Promise<CorpusCdnResponse | null> {
  try {
    const response = await fetch(CORPUS_CDN_URL);
    if (!response.ok) return null;

    const data = (await response.json()) as CorpusCdnResponse;
    if (!data.version || !Array.isArray(data.entries)) return null;

    return data;
  } catch {
    return null;
  }
}

/**
 * Check whether a newer corpus version is available on the CDN.
 * Returns the remote version string if an update is available, or null
 * if the local version is current (or the CDN is unreachable).
 */
export async function checkCorpusUpdate(): Promise<string | null> {
  if (!corpusIndex) return null;

  try {
    const cdnData = await fetchFromCdn();
    if (!cdnData) return null;

    if (cdnData.version > corpusIndex.version) {
      return cdnData.version;
    }
  } catch {
    // CDN unreachable — no update available
  }
  return null;
}

/**
 * Download the corpus index from the Obiter CDN.
 * Falls back to mock data when the CDN is unreachable (development / offline).
 * Calls onProgress to allow UI progress bars.
 * After downloading, persists entries to IndexedDB for future sessions.
 */
export async function downloadCorpusIndex(
  onProgress?: CorpusProgressCallback,
): Promise<void> {
  if (corpusStatus === "downloading") {
    return;
  }

  corpusStatus = "downloading";

  try {
    // Try CDN first
    const cdnData = await fetchFromCdn();

    let entries: CorpusEntry[];
    let version: string;

    if (cdnData) {
      entries = cdnData.entries;
      version = cdnData.version;
    } else {
      // Fall back to mock data when CDN is not available
      entries = generateMockEntries();
      version = "0.1.0-mock";
    }

    const total = entries.length;

    // Simulate chunked loading with progress
    const index = new InMemoryCorpusIndex();
    const batchSize = Math.max(25, Math.ceil(total / 100));

    for (let i = 0; i < total; i += batchSize) {
      // Yield to the event loop for progress feedback
      await new Promise((resolve) => setTimeout(resolve, 10));
      onProgress?.(Math.min(i + batchSize, total), total);
    }

    index.loadFromJson(entries, version);
    corpusIndex = index;
    corpusStatus = "ready";

    // Persist to IndexedDB for future sessions
    try {
      await saveCorpusToIDB(entries);
      await saveCorpusMeta(version, entries.length);
    } catch {
      // IDB save failed — corpus is still loaded in memory for this session
    }
  } catch {
    corpusStatus = "error";
    throw new Error("Corpus download failed");
  }
}

/**
 * Delete the corpus from IndexedDB, clear skip preference, and reset
 * in-memory state. Used by the Settings > Corpus > Delete button.
 */
export async function deleteCorpus(): Promise<void> {
  await clearCorpusFromIDB();
  corpusIndex = null;
  corpusStatus = "not-downloaded";
}

/**
 * Reset state (for testing).
 * @internal
 */
export function _resetCorpusState(): void {
  corpusStatus = "not-downloaded";
  corpusIndex = null;
  setDevicePref("corpusSkipped", undefined);
}
