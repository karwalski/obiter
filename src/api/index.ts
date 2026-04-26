/**
 * External API clients — barrel exports.
 *
 * Each client implements the SourceLookup interface from ./types so the
 * UI and engine layers can consume them uniformly.
 */

export { AustliiClient } from "./austlii";
export { JadeClient } from "./jade";
export { FederalRegisterClient } from "./legislation";
export { TreatyDatabaseClient } from "./treaties";
export type { LookupResult, SourceLookup } from "./types";
export { parseBibTeX, mapBibEntryToObiter, importBibTeX } from "./bibtexImporter";
export type { BibEntry } from "./bibtexImporter";
export {
  checkHealth,
  getHealthStatus,
  getLastError,
  getLastChecked,
  deriveAdapterId,
  markFragile,
  resetHealthState,
} from "./sourceHealth";
export type { HealthStatus } from "./sourceHealth";
export {
  registerAdapter,
  unregisterAdapter,
  getRegisteredAdapters,
  getPreferredAdapters,
  setPreference,
  clearPreference,
  exportPreferences,
  importPreferences,
  resetRegistry,
} from "./sourcePreferences";
export type {
  AdapterKind,
  AdapterMeta,
  ContentType,
} from "./sourcePreferences";
export {
  registerAdapter as registerSourceAdapter,
  getAdapter,
  getAllAdapters,
  getEnabledAdapters,
  isAdapterEnabled,
  setAdapterEnabled,
  getAdaptersByTier,
  TIER_LABELS,
} from "./sourceRegistry";
export type {
  AdapterTier,
  HealthStatus as RegistryHealthStatus,
  SourceAdapterDescriptor,
} from "./sourceRegistry";
export { saveKey, getKey, removeKey, hasKey } from "./keyVault";
