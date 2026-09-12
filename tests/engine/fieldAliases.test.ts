/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * INTEROP-001: one alias table shared by the insert-time completeness check,
 * the Edit form and the interchange layer.
 */

import {
  FIELD_ALIASES,
  getFieldAliases,
  isFieldValuePresent,
  readFieldWithAliases,
} from "../../src/engine/fieldAliases";
import { listMissingRequiredFields } from "../../src/engine/validator";
import { getFieldsForSourceType } from "../../src/ui/views/editCitationFields";

describe("fieldAliases", () => {
  test("getFieldAliases returns the table entry or an empty list", () => {
    expect(getFieldAliases("journal")).toEqual(["journalName"]);
    expect(getFieldAliases("no-such-field")).toEqual([]);
  });

  test("readFieldWithAliases prefers the primary key, then aliases in order", () => {
    expect(readFieldWithAliases({ journal: "MULR", journalName: "X" }, "journal")).toBe("MULR");
    expect(readFieldWithAliases({ journalName: "X" }, "journal")).toBe("X");
    expect(readFieldWithAliases({ journal: "  " }, "journal")).toBeUndefined();
  });

  test("isFieldValuePresent mirrors the dispatcher notion of presence", () => {
    expect(isFieldValuePresent("")).toBe(false);
    expect(isFieldValuePresent([])).toBe(false);
    expect(isFieldValuePresent(0)).toBe(true);
    expect(isFieldValuePresent(Number.NaN)).toBe(false);
    expect(isFieldValuePresent({ a: 1 })).toBe(true);
  });

  test("the validator's completeness check reads the shared table", () => {
    // journal.article requires `journal`; an importer that wrote `journalName`
    // must still count as complete.
    const missing = listMissingRequiredFields("journal.article", {
      authors: [{ givenNames: "H", surname: "Luntz" }],
      title: "T",
      year: 2005,
      journalName: "Sydney Law Review",
      startingPage: 393,
    });
    expect(missing).toEqual([]);
  });

  test("the Edit form's aliases come from the shared table", () => {
    const mncFields = getFieldsForSourceType("case.unreported.mnc");
    const court = mncFields.find((f) => f.key === "court");
    expect(court?.aliases).toEqual([...FIELD_ALIASES.court]);
    const caseNumber = mncFields.find((f) => f.key === "caseNumber");
    expect(caseNumber?.aliases).toEqual([...FIELD_ALIASES.caseNumber]);
  });
});
