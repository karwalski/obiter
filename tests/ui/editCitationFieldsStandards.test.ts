/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * STD-021 — standard-specific Edit/Insert field definitions.
 *
 * `getFieldsForSourceType(sourceType, standardId)` adds the OSCOLA / NZLSG
 * fields under those standards and is unchanged under AGLC. Every
 * standard-specific key must be read by the OSCOLA or NZLSG adapter in
 * src/engine/engine.ts (the BUG-005 contract, extended to the STD-021
 * tables): the adapters read through `readAliased(d, "<key>")` as well as
 * `d.<key>`, so either form counts.
 */

import * as fs from "fs";
import * as path from "path";
import {
  EDIT_FIELDS_BY_SOURCE_TYPE,
  STANDARD_FIELDS_BY_SOURCE_TYPE,
  fieldsForStandard,
  getFieldsForSourceType,
  standardExtraFields,
} from "../../src/ui/views/editCitationFields";
import type { SourceType } from "../../src/types/citation";

const engineSource = fs.readFileSync(
  path.resolve(__dirname, "../../src/engine/engine.ts"),
  "utf-8"
);

describe("STD-021: getFieldsForSourceType per standard", () => {
  test("the AGLC lists are unchanged without a standard or under aglc4", () => {
    for (const [type, fields] of Object.entries(EDIT_FIELDS_BY_SOURCE_TYPE)) {
      expect(getFieldsForSourceType(type as SourceType)).toBe(fields);
      expect(getFieldsForSourceType(type as SourceType, "aglc4")).toBe(fields);
    }
    expect(standardExtraFields("case.reported", "aglc4")).toEqual([]);
    expect(standardExtraFields("case.reported")).toEqual([]);
  });

  test("OSCOLA appends the neutral citation fields to the reported-case list", () => {
    const keys = getFieldsForSourceType("case.reported", "oscola5").map((f) => f.key);
    expect(keys.slice(0, EDIT_FIELDS_BY_SOURCE_TYPE["case.reported"]!.length)).toEqual(
      EDIT_FIELDS_BY_SOURCE_TYPE["case.reported"]!.map((f) => f.key)
    );
    expect(keys).toEqual(
      expect.arrayContaining([
        "neutralCitationYear",
        "neutralCitationCourt",
        "neutralCitationNumber",
      ])
    );
    expect(getFieldsForSourceType("case.reported", "oscola4").map((f) => f.key)).toEqual(keys);
  });

  test("NZLSG lists the parallel report for an unreported-MNC case and the Wai number for a Tribunal report", () => {
    expect(getFieldsForSourceType("case.unreported.mnc", "nzlsg3").map((f) => f.key)).toEqual(
      expect.arrayContaining(["reportSeries", "volume", "startingPage"])
    );
    const wai = getFieldsForSourceType("report.waitangi_tribunal", "nzlsg3");
    expect(wai.map((f) => f.key)).toEqual(["title", "waiNumber", "year", "pinpoint", "author"]);
    expect(wai.find((f) => f.key === "waiNumber")?.label).toBe("Wai Claim Number");
  });

  test("a type with only the generic AGLC fallback puts the standard's fields first, without duplicates", () => {
    const keys = getFieldsForSourceType("case.quasi_judicial", "nzlsg3").map((f) => f.key);
    expect(keys.slice(0, 2)).toEqual(["caseName", "year"]);
    expect(keys).toEqual(
      expect.arrayContaining(["minuteBookAbbrev", "minuteBookDistrict", "blockNumber", "page"])
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("fieldsForStandard is the same list keyed by standard first", () => {
    expect(fieldsForStandard("nzlsg3", "legislation.bill")).toEqual(
      getFieldsForSourceType("legislation.bill", "nzlsg3")
    );
    expect(fieldsForStandard(undefined, "book")).toBe(EDIT_FIELDS_BY_SOURCE_TYPE.book);
  });
});

describe("STD-021: standard field keys <-> OSCOLA / NZLSG adapters", () => {
  const entries = (["oscola", "nzlsg"] as const).flatMap((family) =>
    Object.entries(STANDARD_FIELDS_BY_SOURCE_TYPE[family]).map(
      ([type, fields]) => [family, type, fields ?? []] as const
    )
  );

  test.each(entries)("%s %s: every key is read by the engine", (_family, _type, fields) => {
    const unread = fields
      .map((f) => f.key)
      .filter((key) => !engineSource.includes(`d.${key}`) && !engineSource.includes(`"${key}"`));
    expect(unread).toEqual([]);
  });

  test.each(entries)("%s %s: keys are unique and labelled", (_family, _type, fields) => {
    const keys = fields.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const field of fields) expect(field.label.trim()).not.toBe("");
  });
});
