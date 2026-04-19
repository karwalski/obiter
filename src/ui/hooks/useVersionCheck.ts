/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { useEffect, useState, useCallback } from "react";
import { APP_VERSION, GITHUB_REPO } from "../../constants";

const CACHE_KEY = "obiter-version-check";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface VersionCheckResult {
  currentVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  updateUrl: string | null;
  loading: boolean;
}

interface CachedVersionData {
  latestVersion: string;
  updateUrl: string;
  timestamp: number;
}

interface GitHubRelease {
  tag_name: string;
  html_url: string;
}

/**
 * Compare two semver version strings. Returns true if remote is newer than local.
 */
function isNewerVersion(local: string, remote: string): boolean {
  const parse = (v: string): number[] =>
    v.replace(/^v/, "").split(".").map(Number);
  const localParts = parse(local);
  const remoteParts = parse(remote);

  for (let i = 0; i < Math.max(localParts.length, remoteParts.length); i++) {
    const l = localParts[i] ?? 0;
    const r = remoteParts[i] ?? 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
}

function getCachedData(): CachedVersionData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as CachedVersionData;
    if (Date.now() - data.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCachedData(latestVersion: string, updateUrl: string): void {
  try {
    const data: CachedVersionData = {
      latestVersion,
      updateUrl,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

async function fetchLatestVersion(): Promise<{ version: string; url: string } | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      {
        headers: { Accept: "application/vnd.github.v3+json" },
      }
    );
    if (!response.ok) return null;
    const data = (await response.json()) as GitHubRelease;
    return {
      version: data.tag_name.replace(/^v/, ""),
      url: data.html_url,
    };
  } catch {
    return null;
  }
}

/**
 * Custom hook that checks for a newer version of Obiter on mount.
 *
 * - Fetches the latest release from the GitHub API
 * - Compares against the current version from constants
 * - Caches the result in localStorage for 24 hours
 * - Gracefully handles network errors (returns no update available)
 */
export function useVersionCheck(): VersionCheckResult {
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [updateUrl, setUpdateUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    setLoading(true);

    // Try cache first
    const cached = getCachedData();
    if (cached) {
      setLatestVersion(cached.latestVersion);
      setUpdateUrl(cached.updateUrl);
      setLoading(false);
      return;
    }

    // Fetch from GitHub
    const result = await fetchLatestVersion();
    if (result) {
      setLatestVersion(result.version);
      setUpdateUrl(result.url);
      setCachedData(result.version, result.url);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  const updateAvailable =
    latestVersion !== null && isNewerVersion(APP_VERSION, latestVersion);

  return {
    currentVersion: APP_VERSION,
    latestVersion,
    updateAvailable,
    updateUrl: updateAvailable ? updateUrl : null,
    loading,
  };
}

/**
 * Manually trigger a version check, bypassing the cache.
 * Returns the same shape as useVersionCheck.
 */
export function clearVersionCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // Ignore
  }
}
