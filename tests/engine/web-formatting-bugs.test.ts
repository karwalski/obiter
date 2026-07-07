/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Live web-test formatting bugs (v1.14.1) — dispatch-level regressions:
 *  WEB-007a — unreported no-MNC case (Rule 2.3.2) with no court/date
 *             rendered placeholder punctuation: 'Barton v Chibber (, )'.
 *  WEB-007b — report (Rule 7.1.1) with no year/date rendered a bare '()'.
 *  WEB-008  — GenAI output (Rule 7.12 via MULR interim guidance) rendered
 *             a raw ISO date ('2026-07-07') instead of Rule 1.11.1 form,
 *             and an empty '()' when the model slot was empty.
 *  WEB-009  — Hansard (Rule 7.5.1) rendered the abbreviated jurisdiction
 *             ('Cth' instead of 'Commonwealth') and dropped the pinpoint
 *             (form key `pinpoint` vs engine key `page`).
 */

import { getFormattedPreview } from "../../src/engine/engine";
import type { Citation } from "../../src/types/citation";
import type { FormattedRun } from "../../src/types/formattedRun";

function preview(sourceType: string, data: Record<string, unknown>): FormattedRun[] {
  const citation = {
    id: "", aglcVersion: "4", sourceType, data,
    tags: [], createdAt: "", modifiedAt: "",
  } as Citation;
  return getFormattedPreview(citation);
}
const plain = (r: FormattedRun[]) => r.map((x) => x.text).join("");

describe("WEB-007a — unreported no-MNC placeholder punctuation (Rule 2.3.2)", () => {
  it("renders just the case name when court, judges and date are absent", () => {
    const runs = preview("case.unreported.no_mnc", {
      party1: "Barton",
      party2: "Chibber",
    });
    // Not 'Barton v Chibber (, )'
    expect(plain(runs)).toBe("Barton v Chibber.");
  });

  it("renders a partial parenthetical when only the court is known", () => {
    const runs = preview("case.unreported.no_mnc", {
      party1: "Barton",
      party2: "Chibber",
      court: "Supreme Court of Victoria",
    });
    expect(plain(runs)).toBe("Barton v Chibber (Supreme Court of Victoria).");
  });

  it("still renders the full rule 2.3.2 template when all data exists (ex 84)", () => {
    const runs = preview("case.unreported.no_mnc", {
      party1: "Ross",
      party2: "Chambers",
      court: "Supreme Court of the Northern Territory",
      judges: "Kriewaldt J",
      fullDate: "5 April 1956",
    });
    expect(plain(runs)).toBe(
      "Ross v Chambers (Supreme Court of the Northern Territory, Kriewaldt J, 5 April 1956)."
    );
  });

  it("proceeding (Rule 2.3.3) with no court/number/date renders just the case name", () => {
    const runs = preview("case.proceeding", {
      party1: "Barton",
      party2: "Chibber",
    });
    expect(plain(runs)).toBe("Barton v Chibber.");
  });

  it("court order (Rule 2.3.4) with no court/date renders just the case name", () => {
    const runs = preview("case.court_order", {
      party1: "Barton",
      party2: "Chibber",
      judicialOfficers: "Murphy J",
    });
    expect(plain(runs)).toBe("Order of Murphy J in Barton v Chibber.");
  });
});

describe("WEB-007b — report with missing date renders '()' (Rule 7.1.1)", () => {
  it("omits the parenthetical entirely when type, number and date are absent", () => {
    const runs = preview("report", {
      title: "Motorcycle Lane Filtering Trial: Summary of Trial Results",
    });
    // Not '… Trial Results ()'
    expect(plain(runs)).toBe("Motorcycle Lane Filtering Trial: Summary of Trial Results.");
  });

  it("still renders the parenthetical when a date exists", () => {
    const runs = preview("report", {
      title: "Motorcycle Lane Filtering Trial: Summary of Trial Results",
      date: "February 2015",
    });
    expect(plain(runs)).toBe(
      "Motorcycle Lane Filtering Trial: Summary of Trial Results (February 2015)."
    );
  });
});

describe("WEB-008 — GenAI output date and empty parenthetical (Rule 7.12 via MULR guidance)", () => {
  it("renders an ISO form date per Rule 1.11.1 and the model in parentheses", () => {
    const runs = preview("genai_output", {
      platform: "ChatGPT",
      model: "GPT-4o",
      outputDate: "2026-07-07",
    });
    // Not 'Correspondence from ChatGPT () to the author, 2026-07-07'
    expect(plain(runs)).toBe("Correspondence from ChatGPT (GPT-4o) to the author, 7 July 2026.");
  });

  it("omits the parenthetical entirely when no model is recorded", () => {
    const runs = preview("genai_output", {
      platform: "ChatGPT",
      outputDate: "2026-07-07",
    });
    expect(plain(runs)).toBe("Correspondence from ChatGPT to the author, 7 July 2026.");
  });

  it("passes an already-formatted date through unchanged (Rule 1.11.1 form)", () => {
    const runs = preview("genai_output", {
      platform: "Claude",
      model: "Claude 3.5 Sonnet",
      outputDate: "10 January 2026",
      url: "https://claude.ai/chat/abc123",
    });
    expect(plain(runs)).toBe(
      "Correspondence from Claude (Claude 3.5 Sonnet) to the author, 10 January 2026 " +
        "<https://claude.ai/chat/abc123>."
    );
  });
});

describe("WEB-009 — Hansard jurisdiction abbreviation and dropped pinpoint (Rule 7.5.1)", () => {
  it("expands 'Cth' to 'Commonwealth' and reads the form's `pinpoint` key", () => {
    const runs = preview("hansard", {
      jurisdiction: "Cth",
      chamber: "House of Representatives",
      date: "12 May 2021",
      pinpoint: "4501",
      speaker: "Anthony Albanese",
    });
    // Not 'Cth, Parliamentary Debates, House of Representatives, 12 May 2021,  (Anthony Albanese)'
    expect(plain(runs)).toBe(
      "Commonwealth, Parliamentary Debates, House of Representatives, 12 May 2021, 4501 " +
        "(Anthony Albanese)."
    );
  });

  it("still accepts the legacy `page` key", () => {
    const runs = preview("hansard", {
      jurisdiction: "Vic",
      chamber: "Legislative Council",
      date: "14 December 2017",
      page: "6854",
    });
    // Rule 7.5.1 ex 48
    expect(plain(runs)).toBe(
      "Victoria, Parliamentary Debates, Legislative Council, 14 December 2017, 6854."
    );
  });

  it("leaves no double space or stray comma when the pinpoint is absent", () => {
    const runs = preview("hansard", {
      jurisdiction: "NSW",
      chamber: "Legislative Assembly",
      date: "15 December 1909",
      speaker: "Anthony Albanese",
    });
    expect(plain(runs)).toBe(
      "New South Wales, Parliamentary Debates, Legislative Assembly, 15 December 1909 " +
        "(Anthony Albanese)."
    );
  });
});
