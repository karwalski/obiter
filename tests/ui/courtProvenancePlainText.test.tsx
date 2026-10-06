/**
 * @jest-environment jsdom
 *
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * B4 / COURT-115: the provenance shown under each court toggle in Settings
 * is plain English. Internal identifiers (evidence-register rows, decision
 * numbers, story ids, open-question numbers) stay in code comments and the
 * developer doc docs/court-profiles.md.
 */
import * as React from "react";
import { render } from "@testing-library/react";
import { ToggleProvenanceNote } from "../../src/ui/components/CourtProfileInfo";
import { COURT_PRESETS } from "../../src/engine/court/presets";
import { COURT_TOGGLE_KEYS } from "../../src/engine/court/profile";
import { COURT_PRESET_PROVENANCE } from "../../src/engine/court/provenance";

/** Internal ids that must never reach the user. */
const INTERNAL_ID = /COURT-\d|DECISION-\d|\bO-[A-Z]\d|\bregister\b|open question|\bR0\d\b/i;

describe("B4 / COURT-115: court provenance text is plain English", () => {
  test("every field note is free of internal ids", () => {
    for (const [id, prov] of Object.entries(COURT_PRESET_PROVENANCE)) {
      for (const [key, field] of Object.entries(prov.fields)) {
        if (field.note && INTERNAL_ID.test(field.note)) {
          throw new Error(`${id}.${key}: ${field.note}`);
        }
      }
    }
  });

  test("every Settings provenance line is free of internal ids", () => {
    for (const id of Object.keys(COURT_PRESETS)) {
      for (const key of COURT_TOGGLE_KEYS) {
        const { container, unmount } = render(
          <ToggleProvenanceNote jurisdiction={id} toggleKey={key} profile={undefined} />
        );
        const text = container.textContent ?? "";
        if (INTERNAL_ID.test(text)) throw new Error(`${id}.${key}: ${text}`);
        expect(text).not.toContain("!");
        unmount();
      }
    }
  });

  test("ibid: an Obiter default with a plain reason", () => {
    const { container } = render(
      <ToggleProvenanceNote jurisdiction="FCA" toggleKey="ibidSuppression" profile={undefined} />
    );
    expect(container.textContent).toBe(
      "From the court profile. Obiter default. None of the court instruments checked mentions ibid."
    );
  });

  test("FCA parallel order names the instrument, its clause and example", () => {
    const { container } = render(
      <ToggleProvenanceNote jurisdiction="FCA" toggleKey="parallelOrder" profile={undefined} />
    );
    expect(container.textContent).toBe(
      "From the court profile. Court instrument: FCA Lists of Authorities and Citations Practice Note (GPN-AUTH) cl 2.5. Example: “D'Arcy v Myriad Genetics Inc [2014] FCAFC 115; (2014) 224 FCR 479”."
    );
    expect(container.querySelector("a")?.getAttribute("href")).toContain("gpn-auth");
  });

  test("the MNC default reads plainly", () => {
    const { container } = render(
      <ToggleProvenanceNote jurisdiction="FCA" toggleKey="reportedCaseMnc" profile={undefined} />
    );
    expect(container.textContent).toBe(
      "From the court profile. Obiter default. The MNC is given with the report unless the court's instrument says the report replaces it."
    );
  });

  test("developer references are kept for the docs", () => {
    expect(COURT_PRESET_PROVENANCE.FCA.fields.ibidSuppression.refs).toContain("DECISION-043");
    expect(COURT_PRESET_PROVENANCE.FCA.fields.parallelOrder.refs).toContain("O-R2");
  });
});
