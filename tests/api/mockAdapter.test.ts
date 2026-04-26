/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Tests for MockAdapter (Story 17.1) — verifies that the SourceAdapter
 * interface contract is exercised correctly by the mock implementation.
 */

import { MockAdapter } from "../../src/api/adapters/mockAdapter";
import type { SourceAdapter, LookupResult, SourceMetadata } from "../../src/api/sourceAdapter";

describe("MockAdapter — SourceAdapter interface (Story 17.1)", () => {
  let adapter: MockAdapter;

  beforeEach(() => {
    adapter = new MockAdapter();
  });

  // -----------------------------------------------------------------------
  // Descriptor
  // -----------------------------------------------------------------------

  it("exposes a descriptor with all required fields", () => {
    const d = adapter.descriptor;
    expect(d.id).toBe("mock");
    expect(d.displayName).toBeTruthy();
    expect(d.jurisdictions.length).toBeGreaterThan(0);
    expect(d.contentTypes.length).toBeGreaterThan(0);
    expect(d.accessTier).toBe("open");
    expect(typeof d.requiresKey).toBe("boolean");
    expect(d.rateLimitHint.requestsPerSecond).toBeGreaterThan(0);
    expect(d.rateLimitHint.burst).toBeGreaterThan(0);
    expect(typeof d.fragile).toBe("boolean");
  });

  it("satisfies the SourceAdapter type", () => {
    // Compile-time check — assigning to the interface type must not error.
    const _typed: SourceAdapter = adapter;
    expect(_typed).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // search()
  // -----------------------------------------------------------------------

  it("returns results matching a query by title", async () => {
    const results = await adapter.search("Mabo");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toContain("Mabo");
    expect(results[0].confidence).toBeGreaterThanOrEqual(0);
    expect(results[0].confidence).toBeLessThanOrEqual(1);
    expect(results[0].sourceId).toBeTruthy();
  });

  it("returns empty array for unmatched queries", async () => {
    const results = await adapter.search("xyzzy-no-match-12345");
    expect(results).toEqual([]);
  });

  it("filters by jurisdiction", async () => {
    const au = await adapter.search("v", { jurisdiction: "AU" });
    const gb = await adapter.search("v", { jurisdiction: "GB" });
    // Mabo and Competition Act are AU; Donoghue is GB
    expect(au.some((r) => r.title.includes("Mabo"))).toBe(true);
    expect(au.some((r) => r.title.includes("Donoghue"))).toBe(false);
    expect(gb.some((r) => r.title.includes("Donoghue"))).toBe(true);
  });

  it("filters by year range", async () => {
    const results = await adapter.search("v", { yearFrom: 1990, yearTo: 2000 });
    // Only Mabo (1992) should match
    expect(results.length).toBe(1);
    expect(results[0].title).toContain("Mabo");
  });

  it("filters by content type", async () => {
    const cases = await adapter.search("", { contentType: "case" });
    // sourceIds containing "case" only — mock-case-1, mock-case-2
    for (const r of cases) {
      expect(r.sourceId).toContain("case");
    }
  });

  // -----------------------------------------------------------------------
  // resolve()
  // -----------------------------------------------------------------------

  it("resolves a citation containing a medium-neutral citation", async () => {
    const meta = await adapter.resolve("[1992] HCA 23");
    expect(meta).not.toBeNull();
    expect(meta?.court).toBe("HCA");
    expect(meta?.year).toBe(1992);
  });

  it("resolves a citation containing a title", async () => {
    const meta = await adapter.resolve(
      "Competition and Consumer Act 2010 (Cth)",
    );
    expect(meta).not.toBeNull();
    expect(meta?.frliId).toBe("C2004A00109");
  });

  it("returns null for unrecognised citations", async () => {
    const meta = await adapter.resolve("No Such Case [2099] XYZ 1");
    expect(meta).toBeNull();
  });

  // -----------------------------------------------------------------------
  // getMetadata()
  // -----------------------------------------------------------------------

  it("returns metadata for a known source ID", async () => {
    const meta = await adapter.getMetadata("mock-case-1");
    expect(meta).not.toBeNull();
    expect(meta?.title).toContain("Mabo");
    expect(meta?.volume).toBe(175);
  });

  it("returns null for unknown source ID", async () => {
    const meta = await adapter.getMetadata("no-such-id");
    expect(meta).toBeNull();
  });

  it("returns a copy, not a reference to internal state", async () => {
    const a = await adapter.getMetadata("mock-case-1");
    const b = await adapter.getMetadata("mock-case-1");
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  // -----------------------------------------------------------------------
  // healthcheck()
  // -----------------------------------------------------------------------

  it("reports healthy by default", async () => {
    expect(await adapter.healthcheck()).toBe("healthy");
  });

  it("reflects overridden health status", async () => {
    adapter.setHealth("degraded");
    expect(await adapter.healthcheck()).toBe("degraded");

    adapter.setHealth("offline");
    expect(await adapter.healthcheck()).toBe("offline");
  });
});
