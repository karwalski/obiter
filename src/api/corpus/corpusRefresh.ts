/**
 * Background Corpus Refresh (Story 17.9)
 *
 * Checks whether a newer version of the corpus index is available and
 * coordinates background updates. Current implementation is a stub
 * returning "up-to-date"; production will check the Obiter Cloud manifest.
 */

import { getCorpusIndex } from "./corpusDownload";

/** The manifest URL that will be checked in production. */
export const CORPUS_MANIFEST_URL =
  "https://cdn.obiter.com.au/corpus/manifest.json";

/**
 * Compare the local corpus version against the remote manifest.
 * Returns true if the remote version is newer.
 *
 * Stub: always returns false (up-to-date).
 */
export async function checkForUpdate(): Promise<boolean> {
  // Production implementation:
  // 1. Fetch manifest.json from CORPUS_MANIFEST_URL
  // 2. Compare manifest.version against getLocalVersion()
  // 3. Return true if remote is newer (semver comparison)
  return false;
}

/**
 * Return the version string of the currently loaded corpus index.
 * Returns null if no corpus is loaded.
 */
export function getLocalVersion(): string | null {
  const index = getCorpusIndex();
  return index?.version ?? null;
}

/**
 * Check whether a corpus refresh is available.
 * Convenience wrapper around {@link checkForUpdate}.
 *
 * Stub: always returns false.
 */
export async function isRefreshAvailable(): Promise<boolean> {
  return checkForUpdate();
}
