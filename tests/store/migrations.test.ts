/**
 * Store schema migrations registry — unit-test scaffold (SAFE-008).
 *
 * Demonstrates the registration and application-order pattern a real v2→v3
 * migration will follow. Pure module — no DOM or Office mocks required.
 */

import {
  CURRENT_SCHEMA_VERSION,
  applyMigrations,
  clearMigrationsForTest,
  getRegisteredMigrations,
  registerMigration,
} from "../../src/store/migrations";
import type { CitationStoreData } from "../../src/types/citation";

function storeDataAtVersion(schemaVersion: string): CitationStoreData {
  return {
    metadata: { schemaVersion, aglcVersion: "4", standardId: "aglc4" },
    citations: [],
  };
}

beforeEach(() => {
  clearMigrationsForTest();
});

describe("migrations registry (SAFE-008)", () => {
  test("the current build writes schema v2 and has no registered migrations", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(2);
    expect(getRegisteredMigrations()).toEqual([]);
  });

  test("registerMigration rejects steps that do not advance exactly one version", () => {
    expect(() => registerMigration(2, 4, (d) => d)).toThrow(/exactly one version/);
    expect(() => registerMigration(3, 3, (d) => d)).toThrow(/exactly one version/);
  });

  test("registerMigration rejects a duplicate fromVersion", () => {
    registerMigration(2, 3, (d) => d);
    expect(() => registerMigration(2, 3, (d) => d)).toThrow(/already registered/);
  });

  test("template: a v2 -> v3 migration applies and stamps the schema version", () => {
    // This is the shape a real v2→v3 migration will take: transform the
    // data, and let the registry stamp metadata.schemaVersion afterwards.
    registerMigration(2, 3, (data) => ({
      ...data,
      citations: data.citations.map((c) => ({ ...c, tags: c.tags ?? [] })),
    }));

    const migrated = applyMigrations(storeDataAtVersion("2"), 3);
    expect(migrated.metadata.schemaVersion).toBe("3");
  });

  test("migrations chain in ascending order, one version at a time", () => {
    const order: string[] = [];
    registerMigration(3, 4, (data) => {
      order.push(`3->4 saw v${data.metadata.schemaVersion}`);
      return data;
    });
    registerMigration(2, 3, (data) => {
      order.push(`2->3 saw v${data.metadata.schemaVersion}`);
      return data;
    });

    const migrated = applyMigrations(storeDataAtVersion("2"), 4);
    expect(order).toEqual(["2->3 saw v2", "3->4 saw v3"]);
    expect(migrated.metadata.schemaVersion).toBe("4");
  });

  test("the walk stops at a version with no registered step (parser-level compat, like v1 today)", () => {
    // v1 → v2 is implicit in deserializeCitation, so nothing is registered
    // from v1; applyMigrations leaves such data untouched.
    const v1 = storeDataAtVersion("1.0");
    const result = applyMigrations(v1);
    expect(result).toBe(v1);
  });

  test("applyMigrations never mutates its input", () => {
    registerMigration(2, 3, (data) => ({
      ...data,
      metadata: { ...data.metadata, standardId: "aglc5" },
    }));
    const input = storeDataAtVersion("2");
    const migrated = applyMigrations(input, 3);

    expect(input.metadata.schemaVersion).toBe("2");
    expect(input.metadata.standardId).toBe("aglc4");
    expect(migrated).not.toBe(input);
    expect(migrated.metadata.standardId).toBe("aglc5");
  });
});
