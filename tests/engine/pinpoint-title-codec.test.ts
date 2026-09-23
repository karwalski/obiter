/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * ENP-010: the per-occurrence pinpoint stored in a footnote content-control
 * title must round-trip its TYPE. `pinpointToTitleString` is the single
 * encoding (the compact form `formatPinpoint` renders, Rules 1.1.6–1.1.7) and
 * `pinpointFromTitleString` its inverse, tolerant of the bare strings older
 * documents stored: `[n]` / `[n]–[m]` → paragraph, `s n` / `ss n` → section,
 * anything else → page.
 */
import {
  pinpointFromTitleString,
  pinpointToTitleString,
} from "../../src/engine/rules/v4/general/pinpoints";
import type { Pinpoint } from "../../src/types/citation";

describe("pinpointFromTitleString", () => {
  test("bare number is a page", () => {
    expect(pinpointFromTitleString("42")).toEqual({ type: "page", value: "42" });
  });

  test("page spans and roman-numeral pages stay pages (Rule 1.1.7)", () => {
    expect(pinpointFromTitleString("42–5")).toEqual({ type: "page", value: "42–5" });
    expect(pinpointFromTitleString("xiv")).toEqual({ type: "page", value: "xiv" });
  });

  test("bracketed value is a paragraph (Rule 1.1.6)", () => {
    expect(pinpointFromTitleString("[42]")).toEqual({ type: "paragraph", value: "[42]" });
  });

  test("bracketed span is a paragraph", () => {
    expect(pinpointFromTitleString("[42]–[45]")).toEqual({
      type: "paragraph",
      value: "[42]–[45]",
    });
    expect(pinpointFromTitleString("[42]-[45]")).toEqual({
      type: "paragraph",
      value: "[42]-[45]",
    });
  });

  test("'s n' and 'ss n' are sections", () => {
    expect(pinpointFromTitleString("s 5")).toEqual({ type: "section", value: "5" });
    expect(pinpointFromTitleString("ss 5–7")).toEqual({ type: "section", value: "5–7" });
  });

  test("every other AGLC4 label decodes to its type", () => {
    expect(pinpointFromTitleString("ch 3")).toEqual({ type: "chapter", value: "3" });
    expect(pinpointFromTitleString("pt 2")).toEqual({ type: "part", value: "2" });
    expect(pinpointFromTitleString("cl 4")).toEqual({ type: "clause", value: "4" });
    expect(pinpointFromTitleString("sch 1")).toEqual({ type: "schedule", value: "1" });
    expect(pinpointFromTitleString("art 6")).toEqual({ type: "article", value: "6" });
    expect(pinpointFromTitleString("reg 9")).toEqual({ type: "regulation", value: "9" });
    expect(pinpointFromTitleString("r 12")).toEqual({ type: "rule", value: "12" });
    expect(pinpointFromTitleString("n 12")).toEqual({ type: "footnote", value: "12" });
    expect(pinpointFromTitleString("nn 22–4")).toEqual({ type: "footnote", value: "22–4" });
    expect(pinpointFromTitleString("sub-s 3")).toEqual({ type: "subsection", value: "3" });
    expect(pinpointFromTitleString("item 4")).toEqual({ type: "item", value: "4" });
  });

  test("'n [m]' is a page with a paragraph sub-pinpoint (Rule 1.1.6 ex '6 [23]')", () => {
    expect(pinpointFromTitleString("6 [23]")).toEqual({
      type: "page",
      value: "6",
      subPinpoint: { type: "paragraph", value: "[23]" },
    });
  });

  test("unknown label falls back to page", () => {
    expect(pinpointFromTitleString("para 42")).toEqual({ type: "page", value: "para 42" });
  });

  test("surrounding whitespace is trimmed; blank input is undefined", () => {
    expect(pinpointFromTitleString("  [42] ")).toEqual({ type: "paragraph", value: "[42]" });
    expect(pinpointFromTitleString("")).toBeUndefined();
    expect(pinpointFromTitleString("   ")).toBeUndefined();
  });
});

describe("pinpointToTitleString", () => {
  test("renders the compact form for each type", () => {
    expect(pinpointToTitleString({ type: "page", value: "42" })).toBe("42");
    expect(pinpointToTitleString({ type: "paragraph", value: "[42]" })).toBe("[42]");
    expect(pinpointToTitleString({ type: "section", value: "5" })).toBe("s 5");
    expect(pinpointToTitleString({ type: "footnote", value: "22–4" })).toBe("nn 22–4");
    expect(
      pinpointToTitleString({
        type: "page",
        value: "6",
        subPinpoint: { type: "paragraph", value: "[23]" },
      })
    ).toBe("6 [23]");
  });

  test.each<Pinpoint>([
    { type: "page", value: "42" },
    { type: "page", value: "42–5" },
    { type: "paragraph", value: "[42]" },
    { type: "paragraph", value: "[42]–[45]" },
    { type: "section", value: "5" },
    { type: "chapter", value: "3" },
    { type: "footnote", value: "12" },
    { type: "footnote", value: "22–4" },
    { type: "page", value: "6", subPinpoint: { type: "paragraph", value: "[23]" } },
  ])("round-trips %j through the title string", (pin) => {
    expect(pinpointFromTitleString(pinpointToTitleString(pin))).toEqual(pin);
  });
});

describe("STD-014: the type-tagged title form for pinpoints the compact form cannot carry", () => {
  const PAGE_WITH_FOOTNOTE: Pinpoint = {
    type: "page",
    value: "9",
    subPinpoint: { type: "footnote", value: "6" },
  };

  test("a page with a footnote sub-pinpoint ('9 n 6' would read back as page \"9 n 6\") is stored tagged", () => {
    expect(pinpointToTitleString(PAGE_WITH_FOOTNOTE)).toBe("@page:9|footnote:6");
    expect(pinpointFromTitleString("@page:9|footnote:6")).toEqual(PAGE_WITH_FOOTNOTE);
  });

  test("the compact form is kept whenever it is lossless", () => {
    expect(pinpointToTitleString({ type: "page", value: "42" })).toBe("42");
    expect(pinpointToTitleString({ type: "paragraph", value: "[42]" })).toBe("[42]");
    expect(pinpointToTitleString({ type: "section", value: "6" })).toBe("s 6");
    expect(
      pinpointToTitleString({
        type: "page",
        value: "6",
        subPinpoint: { type: "paragraph", value: "[23]" },
      })
    ).toBe("6 [23]");
  });

  test.each<Pinpoint>([
    { type: "page", value: "9", subPinpoint: { type: "footnote", value: "6" } },
    { type: "schedule", value: "3", subPinpoint: { type: "clause", value: "4" } },
    { type: "page", value: "189", subPinpoint: { type: "footnote", value: "92" } },
    { type: "paragraph", value: "[42]", subPinpoint: { type: "footnote", value: "3" } },
    {
      type: "page",
      value: "6",
      subPinpoint: { type: "paragraph", value: "[23]", subPinpoint: { type: "line", value: "4" } },
    },
    // A value with a colon (OSCOLA 5 §3.1.3 audio timestamps) keeps its text.
    { type: "page", value: "14:14–18:30", subPinpoint: { type: "footnote", value: "1" } },
  ])("round-trips %j through the tagged form", (pin) => {
    const title = pinpointToTitleString(pin);
    expect(title.startsWith("@")).toBe(true);
    expect(pinpointFromTitleString(title)).toEqual(pin);
  });

  test("a malformed tagged string falls back to the legacy page reading", () => {
    expect(pinpointFromTitleString("@nonsense:1")).toEqual({ type: "page", value: "@nonsense:1" });
    expect(pinpointFromTitleString("@page")).toEqual({ type: "page", value: "@page" });
    expect(pinpointFromTitleString("@page:")).toEqual({ type: "page", value: "@page:" });
  });

  test("legacy bare titles still decode as before", () => {
    expect(pinpointFromTitleString("9 n 6")).toEqual({ type: "page", value: "9 n 6" });
    expect(pinpointFromTitleString("n 6")).toEqual({ type: "footnote", value: "6" });
  });
});
