/**
 * Store schema migrations registry (SAFE-008).
 *
 * Formalizes the migration pattern for schema bumps. The v1 → v2 layout
 * change is IMPLICIT: `deserializeCitation` detects the v1 element layout
 * and reads it directly. The registered v1 → v2 step only advances the
 * version stamp so a v1 document also passes through v2 → v3.
 *
 * v2 → v3 (COURT-106) is the first EXPLICIT migration: a court-mode
 * document with a jurisdiction has the toggle set it renders with today
 * frozen into the document, with a `courtProfile` record (no output change
 * on upgrade). A store without a court profile is still WRITTEN as v2 (see
 * `schemaVersionToWrite`), so builds that predate v3 keep reading academic
 * documents; only documents that carry v3 data are marked v3.
 *
 * How a migration is added:
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

import type { CitationStoreData, StoreMetadata } from "../types/citation";
import type { CitationStandardId } from "../engine/standards/types";
import { getStandardConfig } from "../engine/standards";
import { isCourtJurisdiction } from "../engine/court/presets";
import { createMigratedProfile, freezeEffectiveToggles } from "../engine/court/profile";

/** Current schema version understood by this build (COURT-106: v3). */
export const CURRENT_SCHEMA_VERSION = 3;

/**
 * Inputs a migration may need from outside the document. Kept explicit so
 * migrations stay pure and testable.
 */
export interface MigrationContext {
  /**
   * The legacy device-level court toggles (`obiter-device.courtToggles`).
   * Before the toggles moved into the document, a court document without
   * stored toggles rendered with these on this device; freezing them keeps
   * that output unchanged.
   */
  legacyCourtToggles?: Record<string, string>;
  /** Clock for the frozen-at stamp (tests). */
  now?: Date;
}

/** A pure, single-step schema upgrade. Must not mutate its input. */
export type StoreMigrationFn = (
  data: CitationStoreData,
  context: MigrationContext
) => CitationStoreData;

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
 * Versions with no registered migration end the walk. Never mutates the
 * input. `context` carries inputs from outside the document (COURT-106).
 */
export function applyMigrations(
  data: CitationStoreData,
  targetVersion: number = CURRENT_SCHEMA_VERSION,
  context: MigrationContext = {}
): CitationStoreData {
  let current = data;
  let version = parseInt(current.metadata.schemaVersion, 10);
  if (!Number.isFinite(version)) version = 1;

  while (version < targetVersion) {
    const step = registry.get(version);
    if (!step) break;
    const migrated = step.migrate(current, context);
    current = {
      ...migrated,
      metadata: { ...migrated.metadata, schemaVersion: String(step.toVersion) },
    };
    version = step.toVersion;
  }
  return current;
}

/** Test-only: empty the registry (tests that register their own steps). */
export function clearMigrationsForTest(): void {
  registry.clear();
}

/** Test-only: restore the built-in migrations after clearMigrationsForTest. */
export function resetMigrationsForTest(): void {
  registry.clear();
  registerBuiltInMigrations();
}

// ─── Built-in migrations ────────────────────────────────────────────────────

/**
 * COURT-106 (v2 → v3): freeze the court profile.
 *
 * Only a court-mode AGLC document with a known jurisdiction and no profile
 * is touched. Its `courtToggles` become the full set it renders with today
 * (`freezeEffectiveToggles`: stored values kept, gaps filled the way the
 * engine fills them) and a "migrated" profile is recorded. Every other
 * document is returned unchanged, so academic output is byte for byte the
 * same.
 */
export function freezeCourtProfileMigration(
  data: CitationStoreData,
  context: MigrationContext = {}
): CitationStoreData {
  const meta = data.metadata;
  const standardId = (meta.standardId ?? "aglc4") as CitationStandardId;
  const jurisdiction = meta.courtJurisdiction;
  if (
    meta.writingMode !== "court" ||
    !standardId.startsWith("aglc") ||
    !jurisdiction ||
    !isCourtJurisdiction(jurisdiction) ||
    meta.courtProfile
  ) {
    return data;
  }
  // The refresher reads document toggles first and the legacy device pref
  // only when the document has none; freeze whichever renders today.
  const stored = meta.courtToggles ?? context.legacyCourtToggles;
  const courtToggles = freezeEffectiveToggles(getStandardConfig(standardId), jurisdiction, stored);
  return {
    ...data,
    metadata: {
      ...meta,
      courtToggles,
      courtProfile: createMigratedProfile(jurisdiction, context.now),
    },
  };
}

function registerBuiltInMigrations(): void {
  // v1 → v2 is handled by the parser; this step only advances the stamp.
  registerMigration(1, 2, (data) => data);
  registerMigration(2, 3, freezeCourtProfileMigration);
}

registerBuiltInMigrations();

/**
 * COURT-106: the schema version to write for a store.
 *
 * A store carrying v3 data (a court profile) is written as "3". Anything
 * else is written as it was read, capped at "2", so builds that predate
 * v3 (which quarantine any newer schema, SAFE-008) still open academic
 * documents.
 */
export function schemaVersionToWrite(metadata: StoreMetadata): string {
  if (metadata.courtProfile) return "3";
  const version = parseInt(metadata.schemaVersion, 10);
  return Number.isFinite(version) && version > 2 ? "2" : metadata.schemaVersion;
}
