/**
 * First-Launch Corpus Download UX (Story 17.8)
 *
 * Manages the lifecycle of the local corpus index: checking availability,
 * downloading from Obiter Cloud CDN, and providing progress feedback.
 *
 * Downloads the corpus index JSON from the Obiter CDN. Falls back to mock
 * data when the CDN is not reachable (development / offline).
 */

import type { CorpusEntry } from "./corpusIndex";
import { InMemoryCorpusIndex } from "./inMemoryCorpusIndex";

export type CorpusStatus = "not-downloaded" | "downloading" | "ready" | "error";

/** Progress callback: (loaded entries, total entries) => void */
export type CorpusProgressCallback = (loaded: number, total: number) => void;

/** CDN endpoint for the corpus index JSON. */
const CORPUS_CDN_URL = "https://obiter.com.au/corpus/index.json";

let corpusStatus: CorpusStatus = "not-downloaded";
let corpusIndex: InMemoryCorpusIndex | null = null;
let skipPreference = false;

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
  } catch {
    corpusStatus = "error";
    throw new Error("Corpus download failed");
  }
}

/** Set preference to skip corpus and use online sources only. */
export function skipCorpus(): void {
  skipPreference = true;
}

/** Check whether the user has opted to skip the corpus. */
export function isCorpusSkipped(): boolean {
  return skipPreference;
}

/**
 * Reset state (for testing).
 * @internal
 */
export function _resetCorpusState(): void {
  corpusStatus = "not-downloaded";
  corpusIndex = null;
  skipPreference = false;
}
