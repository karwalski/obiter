/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * INTEROP-002: format detection and the codec registry.
 */

import {
  registerCodec,
  getCodec,
  hasCodec,
  listCodecs,
  normaliseText,
} from "../../../src/api/interchange/codec";
import type { InterchangeCodec } from "../../../src/api/interchange/codec";
import {
  countRecords,
  detectFormat,
  DETECTION_THRESHOLD,
} from "../../../src/api/interchange/detect";

function fakeCodec(
  format: InterchangeCodec["format"],
  ext: string,
  marker: string
): InterchangeCodec {
  return {
    format,
    label: format,
    extensions: [ext],
    mimeType: "text/plain",
    canExport: true,
    sniff: (text) => (text.includes(marker) ? 0.9 : 0),
    parse: () => ({ records: [], issues: [] }),
    serialise: () => "",
  };
}

describe("codec registry and detection", () => {
  beforeAll(() => {
    registerCodec(fakeCodec("ris", ".ris", "TY  - "));
    registerCodec(fakeCodec("bibtex", ".bib", "@article{"));
  });

  test("registry lookups", () => {
    expect(hasCodec("ris")).toBe(true);
    expect(getCodec("ris").format).toBe("ris");
    expect(listCodecs().map((c) => c.format)).toEqual(expect.arrayContaining(["ris", "bibtex"]));
    expect(() => getCodec("word-sources-xml")).toThrow(/No interchange codec/);
  });

  test("normaliseText strips the BOM and CRLF", () => {
    expect(normaliseText("﻿TY  - JOUR\r\nER  - \r\n")).toBe("TY  - JOUR\nER  - \n");
  });

  test("a hint wins outright", () => {
    const result = detectFormat("nothing recognisable", { formatHint: "bibtex" });
    expect(result.format).toBe("bibtex");
    expect(result.confidence).toBe(1);
  });

  test("sniffing picks the best codec above the threshold", () => {
    const result = detectFormat("TY  - JOUR\nTI  - X\nER  - \n");
    expect(result.format).toBe("ris");
    expect(result.confidence).toBeGreaterThanOrEqual(DETECTION_THRESHOLD);
    expect(result.count).toBe(1);
  });

  test("an extension adds confidence and breaks ties", () => {
    const none = detectFormat("plain text");
    expect(none.format).toBeNull();
    const withExt = detectFormat("TY  - JOUR\n@article{x,", { fileName: "lib.bib" });
    expect(withExt.format).toBe("bibtex");
  });

  test("countRecords is cheap per format", () => {
    expect(countRecords("TY  - JOUR\nER  - \nTY  - BOOK\nER  - \n", "ris")).toBe(2);
    expect(countRecords("@comment{x}\n@article{a,\n}\n@book{b,\n}", "bibtex")).toBe(2);
    expect(countRecords("<xml><records><record/><record/></records></xml>", "endnote-xml")).toBe(2);
    expect(countRecords('[{"type":"book"},{"type":"legal_case"}]', "csl-json")).toBe(2);
    expect(countRecords("not json", "csl-json")).toBe(0);
  });
});
