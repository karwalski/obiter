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
