/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * @deprecated Replaced by the Source Registry (sourceRegistry.ts) and adapter
 * framework (adapterSearch.ts) as of Epic 17. Retained for backward
 * compatibility with any code that still reads persisted searchConfig prefs.
 * New code should use isMasterEnabled() / isAdapterEnabled() from
 * sourceRegistry.ts instead.
 *
 * API-001/002/003: Search configuration management.
 *
 * External source lookup is disabled by default. Users must explicitly
 * enable it in Settings and choose which providers to query.
 */

import { getDevicePref, setDevicePref } from "../store/devicePreferences";

export interface SearchConfig {
  enabled: boolean;
  providers: {
    austlii: boolean;
    jade: boolean;
    legislation: boolean;
  };
}

const SETTINGS_KEY = "searchConfig";

const DEFAULTS: SearchConfig = {
  enabled: false,
  providers: {
    austlii: false,
    jade: false,
    legislation: false,
  },
};

export function loadSearchConfig(): SearchConfig {
  const saved = getDevicePref(SETTINGS_KEY);
  if (saved && typeof saved === "object") {
    const partial = saved as Partial<SearchConfig>;
    return {
      ...DEFAULTS,
      ...partial,
      providers: {
        ...DEFAULTS.providers,
        ...(partial.providers ?? {}),
      },
    };
  }
  return { ...DEFAULTS };
}

export function saveSearchConfig(config: SearchConfig): void {
  setDevicePref(SETTINGS_KEY, config);
}

/**
 * Returns true if search is enabled and at least one provider is active.
 */
export function isSearchActive(config: SearchConfig): boolean {
  return config.enabled && Object.values(config.providers).some(Boolean);
}
