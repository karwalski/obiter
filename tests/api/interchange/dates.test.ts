/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * INTEROP-002: date forms of each interchange format <-> AGLC rule 1.11.1 strings.
 */

import {
  fromAglcDateString,
  parseDateParts,
  parseFreeTextDate,
  parseRisDate,
  toAglcDateString,
  toDateParts,
  toIsoDate,
  toRisDate,
} from "../../../src/api/interchange/mapper/dates";

describe("parseRisDate", () => {
  test("full, partial and other-info forms", () => {
    expect(parseRisDate("2020/10/21/")).toEqual({ year: 2020, month: 10, day: 21 });
    expect(parseRisDate("1998///Spring")).toEqual({ year: 1998, raw: "Spring" });
    expect(parseRisDate("2005")).toEqual({ year: 2005 });
    expect(parseRisDate("2005/03")).toEqual({ year: 2005, month: 3 });
  });

  test("free text falls through to the free-text parser", () => {
    expect(parseRisDate("21 October 2020")).toEqual({ year: 2020, month: 10, day: 21 });
  });
});

describe("parseFreeTextDate", () => {
  test("ISO, day-first numeric, and month names", () => {
    expect(parseFreeTextDate("2020-10-21")).toEqual({ year: 2020, month: 10, day: 21 });
    expect(parseFreeTextDate("2020-10")).toEqual({ year: 2020, month: 10 });
    expect(parseFreeTextDate("21/10/2020")).toEqual({ year: 2020, month: 10, day: 21 });
    expect(parseFreeTextDate("October 21, 2020")).toEqual({ year: 2020, month: 10, day: 21 });
    expect(parseFreeTextDate("Oct 2020")).toEqual({ year: 2020, month: 10 });
    expect(parseFreeTextDate("2020")).toEqual({ year: 2020 });
  });

  test("keeps unparseable text with a year hint", () => {
    expect(parseFreeTextDate("Spring 2019")).toEqual({ year: 2019, raw: "Spring 2019" });
    expect(parseFreeTextDate("nd")).toEqual({ raw: "nd" });
    expect(parseFreeTextDate("31/13/2020")).toEqual({ raw: "31/13/2020" });
  });
});

describe("CSL date-parts", () => {
  test("both ways", () => {
    expect(parseDateParts([[2020, 10, 21]])).toEqual({ year: 2020, month: 10, day: 21 });
    expect(parseDateParts([["2020"]])).toEqual({ year: 2020 });
    expect(toDateParts({ year: 2020, month: 10 })).toEqual({ "date-parts": [[2020, 10]] });
    expect(toDateParts({ raw: "Spring" })).toEqual({ raw: "Spring" });
  });
});

describe("AGLC and export strings", () => {
  test("rule 1.11.1 output", () => {
    expect(toAglcDateString({ year: 2020, month: 10, day: 21 })).toBe("21 October 2020");
    expect(toAglcDateString({ year: 2020, month: 10 })).toBe("October 2020");
    expect(toAglcDateString({ year: 2020 })).toBe("2020");
    expect(toAglcDateString({ raw: "Spring" })).toBe("Spring");
  });

  test("AGLC string parses back", () => {
    expect(fromAglcDateString("21 October 2020")).toEqual({ year: 2020, month: 10, day: 21 });
  });

  test("RIS and ISO forms", () => {
    expect(toRisDate({ year: 2020, month: 10, day: 21 })).toBe("2020/10/21/");
    expect(toRisDate({ year: 2020 })).toBe("2020///");
    expect(toIsoDate({ year: 2020, month: 3, day: 4 })).toBe("2020-03-04");
    expect(toIsoDate({ year: 2020 })).toBe("2020");
  });
});
