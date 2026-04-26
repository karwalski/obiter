/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Tests for AustLII and Jade.io deep-link constructors
 * (Stories 17.36 and 17.37).
 */

import { AustliiLinkAdapter, buildAustliiUrl } from "../../src/api/adapters/austliiLink";
import { JadeLinkAdapter, buildJadeUrl } from "../../src/api/adapters/jadeLink";
import type { SourceAdapter } from "../../src/api/sourceAdapter";

describe("AustLII Deep-Link Constructor (Story 17.36)", () => {
  let adapter: AustliiLinkAdapter;

  beforeEach(() => {
    adapter = new AustliiLinkAdapter();
  });

  // -----------------------------------------------------------------------
  // Descriptor
  // -----------------------------------------------------------------------

  it("exposes the correct descriptor", () => {
    const d = adapter.descriptor;
    expect(d.id).toBe("austlii-link");
    expect(d.displayName).toBe("AustLII");
    expect(d.accessTier).toBe("link-only");
    expect(d.fragile).toBe(false);
    expect(d.requiresKey).toBe(false);
  });

  it("satisfies the SourceAdapter type", () => {
    const _typed: SourceAdapter = adapter;
    expect(_typed).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // buildAustliiUrl()
  // -----------------------------------------------------------------------

  it("constructs HCA URL correctly", () => {
    const url = buildAustliiUrl("HCA", 1992, 23);
    expect(url).toBe(
      "https://www.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/HCA/1992/23.html",
    );
  });

  it("constructs FCA URL correctly", () => {
    const url = buildAustliiUrl("FCA", 2023, 456);
    expect(url).toBe(
      "https://www.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/FCA/2023/456.html",
    );
  });

  it("constructs NSWSC URL correctly", () => {
    const url = buildAustliiUrl("NSWSC", 2020, 100);
    expect(url).toBe(
      "https://www.austlii.edu.au/cgi-bin/viewdoc/au/cases/nsw/NSWSC/2020/100.html",
    );
  });

  it("constructs VSC URL correctly", () => {
    const url = buildAustliiUrl("VSC", 2019, 55);
    expect(url).toBe(
      "https://www.austlii.edu.au/cgi-bin/viewdoc/au/cases/vic/VSC/2019/55.html",
    );
  });

  it("returns null for unknown court codes", () => {
    const url = buildAustliiUrl("UNKNOWN", 2020, 1);
    expect(url).toBeNull();
  });

  // -----------------------------------------------------------------------
  // resolve()
  // -----------------------------------------------------------------------

  it("resolves an MNC to metadata with AustLII URL", async () => {
    const meta = await adapter.resolve("[1992] HCA 23");
    expect(meta).not.toBeNull();
    expect(meta?.year).toBe(1992);
    expect(meta?.court).toBe("HCA");
    expect(meta?.mnc).toBe("[1992] HCA 23");
    expect(meta?.sourceUrl).toBe(
      "https://www.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/HCA/1992/23.html",
    );
  });

  it("resolves MNC embedded in longer text", async () => {
    const meta = await adapter.resolve("Mabo v Queensland (No 2) [1992] HCA 23");
    expect(meta).not.toBeNull();
    expect(meta?.court).toBe("HCA");
  });

  it("returns null for non-MNC citations", async () => {
    const meta = await adapter.resolve("(1992) 175 CLR 1");
    expect(meta).toBeNull();
  });

  it("returns null for unknown court codes in MNC", async () => {
    const meta = await adapter.resolve("[2020] UNKNOWN 1");
    expect(meta).toBeNull();
  });

  // -----------------------------------------------------------------------
  // search() — link-only, always empty
  // -----------------------------------------------------------------------

  it("returns empty array from search()", async () => {
    const results = await adapter.search("Mabo");
    expect(results).toEqual([]);
  });

  // -----------------------------------------------------------------------
  // getMetadata() — link-only, always null
  // -----------------------------------------------------------------------

  it("returns null from getMetadata()", async () => {
    const meta = await adapter.getMetadata("any-id");
    expect(meta).toBeNull();
  });

  // -----------------------------------------------------------------------
  // healthcheck()
  // -----------------------------------------------------------------------

  it("reports healthy", async () => {
    expect(await adapter.healthcheck()).toBe("healthy");
  });
});

describe("Jade.io Deep-Link Constructor (Story 17.37)", () => {
  let adapter: JadeLinkAdapter;

  beforeEach(() => {
    adapter = new JadeLinkAdapter();
  });

  // -----------------------------------------------------------------------
  // Descriptor
  // -----------------------------------------------------------------------

  it("exposes the correct descriptor", () => {
    const d = adapter.descriptor;
    expect(d.id).toBe("jade-link");
    expect(d.displayName).toBe("Jade.io");
    expect(d.accessTier).toBe("link-only");
    expect(d.fragile).toBe(false);
    expect(d.requiresKey).toBe(false);
  });

  it("satisfies the SourceAdapter type", () => {
    const _typed: SourceAdapter = adapter;
    expect(_typed).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // buildJadeUrl()
  // -----------------------------------------------------------------------

  it("constructs Jade URL correctly", () => {
    const url = buildJadeUrl("HCA", 1992, 23);
    expect(url).toBe("https://jade.io/article/HCA/1992/23");
  });

  it("constructs Jade URL for FCA", () => {
    const url = buildJadeUrl("FCA", 2023, 456);
    expect(url).toBe("https://jade.io/article/FCA/2023/456");
  });

  // -----------------------------------------------------------------------
  // resolve()
  // -----------------------------------------------------------------------

  it("resolves an MNC to metadata with Jade URL", async () => {
    const meta = await adapter.resolve("[1992] HCA 23");
    expect(meta).not.toBeNull();
    expect(meta?.year).toBe(1992);
    expect(meta?.court).toBe("HCA");
    expect(meta?.mnc).toBe("[1992] HCA 23");
    expect(meta?.sourceUrl).toBe("https://jade.io/article/HCA/1992/23");
  });

  it("resolves any court code (no court mapping restriction)", async () => {
    const meta = await adapter.resolve("[2020] NSWSC 100");
    expect(meta).not.toBeNull();
    expect(meta?.sourceUrl).toBe("https://jade.io/article/NSWSC/2020/100");
  });

  it("returns null for non-MNC citations", async () => {
    const meta = await adapter.resolve("(1992) 175 CLR 1");
    expect(meta).toBeNull();
  });

  // -----------------------------------------------------------------------
  // search() — link-only, always empty
  // -----------------------------------------------------------------------

  it("returns empty array from search()", async () => {
    const results = await adapter.search("Mabo");
    expect(results).toEqual([]);
  });

  // -----------------------------------------------------------------------
  // getMetadata() — link-only, always null
  // -----------------------------------------------------------------------

  it("returns null from getMetadata()", async () => {
    const meta = await adapter.getMetadata("any-id");
    expect(meta).toBeNull();
  });

  // -----------------------------------------------------------------------
  // healthcheck()
  // -----------------------------------------------------------------------

  it("reports healthy", async () => {
    expect(await adapter.healthcheck()).toBe("healthy");
  });
});
