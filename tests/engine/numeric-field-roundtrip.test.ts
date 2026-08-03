/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Regression: "t.trim is not a function" on the EditCitation preview.
 *
 * The *Data interfaces declare fields like `reportNumber`, `page` and `year` as
 * `string`, but the Custom XML Part does not round-trip them as strings:
 * `deserializeValue` coerces any digit-only value of a NUMERIC_DATA_FIELD back
 * to a JS `number`. Formatting a citation loaded from a saved document therefore
 * handed a number to code that called `.trim()`, throwing inside the React
 * render and blanking the preview.
 *
 * These tests pass numbers where the interface says string — deliberately, via
 * casts — because that is exactly what the store produces.
 */

import { formatReport, formatHansard } from "../../src/engine/rules/v4/secondary/other";
import { formatSoftware } from "../../src/engine/rules/v4/secondary/software";
import { formatDataset } from "../../src/engine/rules/v4/secondary/dataset";
import { toText } from "../../src/engine/rules/v4/general/coerce";
import { FormattedRun } from "../../src/types/formattedRun";

const text = (runs: FormattedRun[]): string => runs.map((r) => r.text).join("");

describe("toText — XML round-trip coercion", () => {
  it("passes strings through trimmed", () => {
    expect(toText("  99  ")).toBe("99");
  });

  it("renders a number that came back from the store", () => {
    expect(toText(99)).toBe("99");
    expect(toText(0)).toBe("0");
  });

  it("returns empty for absent and non-renderable values", () => {
    expect(toText(undefined)).toBe("");
    expect(toText(null)).toBe("");
    expect(toText(NaN)).toBe("");
    expect(toText({})).toBe("");
    expect(toText(true)).toBe("");
  });

  it("joins a JSON-decoded array", () => {
    expect(toText(["a", "b"])).toBe("a, b");
    expect(toText([1, 2])).toBe("1, 2");
  });
});

describe("numeric fields surviving a save/reload round-trip", () => {
  it("formats a report whose reportNumber deserialized as a number", () => {
    const runs = formatReport({
      body: "Australian Law Reform Commission",
      title: "Genes and Ingenuity",
      reportNumber: 99 as unknown as string,
      date: "2004",
    });
    expect(text(runs)).toContain("Report No 99");
  });

  it("formats Hansard whose page deserialized as a number", () => {
    const runs = formatHansard({
      jurisdiction: "Commonwealth",
      chamber: "House of Representatives",
      date: "12 March 2020",
      page: 2345 as unknown as string,
    });
    expect(text(runs)).toContain("2345");
  });

  it("formats software whose year deserialized as a number", () => {
    const runs = formatSoftware({
      author: "Matthew Watt",
      title: "Obiter",
      year: 2026 as unknown as string,
      host: "GitHub",
    });
    expect(text(runs)).toContain("2026");
  });

  it("formats a dataset whose year deserialized as a number", () => {
    const runs = formatDataset({
      creator: "Australian Bureau of Statistics",
      title: "Census of Population and Housing",
      repository: "ABS",
      year: 2021 as unknown as string,
    });
    expect(text(runs)).toContain("2021");
  });

  it("omits the parenthetical entirely when every part is empty (WEB-007b)", () => {
    const runs = formatReport({ title: "Untitled", date: "" });
    expect(text(runs)).not.toContain("()");
  });
});
