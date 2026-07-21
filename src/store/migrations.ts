/**
 * Store schema migrations registry (SAFE-008).
 *
 * Formalizes the migration pattern for future schema bumps. Today the only
 * historical migration (v1 → v2) is IMPLICIT: `deserializeCitation` detects
 * the v1 element layout and reads it directly, and the next persist writes
 * v2 — no registered migration is needed for it.
 *
 * This registry is the template for the first EXPLICIT migration (v2 → v3):
 *
 * 1. Bump MAX_SUPPORTED_SCHEMA_VERSION in xmlSerializer.ts (the SAFE-008
 *    forward-compat guard) and teach deserializeStore to parse v3.
 * 2. Register the upgrade here:
 *    ```ts
 *    registerMigration(2, 3, (data) => ({ ...data, ...transformed }));
 *    ```
 * 3. Call `applyMigrations(data)` after deserialization; it walks the chain
 *    one version at a time and stamps `metadata.schemaVersion` after each
 *    step.
 *
 * Migrations must be pure (CitationStoreData in → CitationStoreData out) and
 * advance exactly one version, so a v1 document upgrades deterministically
 * through every step in order.
 */

import type { CitationStoreData } from "../types/citation";

/** Current schema version written by this build. */
export const CURRENT_SCHEMA_VERSION = 2;

/** A pure, single-step schema upgrade. Must not mutate its input. */
export type StoreMigrationFn = (data: CitationStoreData) => CitationStoreData;

export interface StoreMigration {
  fromVersion: number;
  toVersion: number;
  migrate: StoreMigrationFn;
}

/** Keyed by fromVersion — at most one migration may leave each version. */
const registry = new Map<number, StoreMigration>();

/**
 * Register a schema migration. Steps must advance exactly one version
 * (chain v2→v3→v4 rather than jumping v2→v4) and be unique per fromVersion.
 */
export function registerMigration(
  fromVersion: number,
  toVersion: number,
  migrate: StoreMigrationFn
): void {
  if (toVersion !== fromVersion + 1) {
    throw new Error(
      `Migrations must advance exactly one version (got v${fromVersion} -> v${toVersion})`
    );
  }
  if (registry.has(fromVersion)) {
    throw new Error(`A migration from v${fromVersion} is already registered`);
  }
  registry.set(fromVersion, { fromVersion, toVersion, migrate });
}

/** Registered migrations in ascending fromVersion order (for diagnostics). */
export function getRegisteredMigrations(): StoreMigration[] {
  return Array.from(registry.values()).sort((a, b) => a.fromVersion - b.fromVersion);
}

/**
 * Apply every registered migration step from the data's current version up
 * to `targetVersion`, stamping `metadata.schemaVersion` after each step.
 * Versions with no registered migration end the walk (parser-level
 * compatibility, as with v1 today). Never mutates the input.
 */
export function applyMigrations(
  data: CitationStoreData,
  targetVersion: number = CURRENT_SCHEMA_VERSION
): CitationStoreData {
  let current = data;
  let version = parseInt(current.metadata.schemaVersion, 10);
  if (!Number.isFinite(version)) version = 1;

  while (version < targetVersion) {
    const step = registry.get(version);
    if (!step) break;
    const migrated = step.migrate(current);
    current = {
      ...migrated,
      metadata: { ...migrated.metadata, schemaVersion: String(step.toVersion) },
    };
    version = step.toVersion;
  }
  return current;
}

/** Test-only: reset the registry between unit tests. */
export function clearMigrationsForTest(): void {
  registry.clear();
}
