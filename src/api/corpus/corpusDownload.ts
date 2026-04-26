/**
 * First-Launch Corpus Download UX (Story 17.8)
 *
 * Manages the lifecycle of the local corpus index: checking availability,
 * downloading from Obiter Cloud CDN, and providing progress feedback.
 *
 * Current implementation is a stub with mock data. The actual download will
 * be wired to Obiter Cloud in a future story.
 */

import type { CorpusEntry } from "./corpusIndex";
import { InMemoryCorpusIndex } from "./inMemoryCorpusIndex";

export type CorpusStatus = "not-downloaded" | "downloading" | "ready" | "error";

/** Progress callback: (loaded entries, total entries) => void */
export type CorpusProgressCallback = (loaded: number, total: number) => void;

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

/**
 * Download (or in this stub, generate) the corpus index.
 * Calls onProgress to allow UI progress bars.
 *
 * Production implementation will:
 * 1. Fetch manifest from CDN to determine latest version and file size
 * 2. Stream compressed index JSON in chunks
 * 3. Parse and load into InMemoryCorpusIndex
 */
export async function downloadCorpusIndex(
  onProgress?: CorpusProgressCallback,
): Promise<void> {
  if (corpusStatus === "downloading") {
    return;
  }

  corpusStatus = "downloading";

  try {
    const entries = generateMockEntries();
    const total = entries.length;

    // Simulate chunked loading with progress
    const index = new InMemoryCorpusIndex();
    const batchSize = 25;

    for (let i = 0; i < total; i += batchSize) {
      // Simulate async delay for progress feedback
      await new Promise((resolve) => setTimeout(resolve, 10));
      onProgress?.(Math.min(i + batchSize, total), total);
    }

    index.loadFromJson(entries, "0.1.0-mock");
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
