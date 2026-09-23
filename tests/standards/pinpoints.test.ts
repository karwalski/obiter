/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * STD-005 — Pinpoints per standard.
 *
 * Part 1 is table-driven over every pinpointed scenario in the expectation
 * tables (`first+<kind>`, `subsequent-short+<kind>`, `subsequent-ibid+<kind>`
 * for page, paragraph, section, article and regulation), through the same
 * driver as STD-004 (tests/standards/matrix.ts): plain tests, `test.failing`
 * under the owning story for recorded deltas, todos for pending rows.
 *
 * Part 2 is the typed round trip the refresher performs on every occurrence:
 * a `Pinpoint` is encoded into an occurrence title (`buildOccurrenceTitle`),
 * read back (`parseOccurrenceTitle`), resolved by type
 * (`resolveOccurrencePinpoint`) and rendered as a subsequent reference under
 * each standard. The assertions are the label vocabulary recorded in
 * docs/standards-rule-notes.md: AGLC4 1.1.6 `42` / `[42]` / `s 6`; OSCOLA 5
 * §2.1.6 and §2.4.2 `42` / `[42]` (no comma after a neutral citation) /
 * `s 6`; NZLSG 3 §3.2.8 and §4.1.1(d) `at 42` / `at [42]` / `s 6`. Where
 * the engine does not yet honour a standard's vocabulary the test is
 * `test.failing` under STD-014; where the notes give no form the test is a
 * todo (DECISION-040), never a guess.
 */

import type { Pinpoint } from "../../src/types/citation";
import type { Citation } from "../../src/types/citation";
import { buildOccurrenceTitle, parseOccurrenceTitle } from "../../src/word/footnoteManager";
import { resolveOccurrencePinpoint } from "../../src/word/citationRefresher";
import {
  bookLuntz,
  cthNativeTitleAct,
  maboReported,
  nzBrooker,
  nzPrivacyAct,
  ukCorr,
  ukHra,
} from "../fixtures/standards/citations";
import { hasPinpoint, interveningSource, runTable, TABLE_KEYS } from "./matrix";
import { renderFirst, renderSubsequent } from "./runner";
import type { StandardKey } from "./runner";

// ─── Part 1: the expectation tables ─────────────────────────────────────────

describe("STD-005: pinpointed scenarios per standard", () => {
  for (const key of TABLE_KEYS) {
    runTable(key, hasPinpoint);
  }
});

// ─── Part 2: typed round trip through the occurrence title ──────────────────

/**
 * Encodes `pin` the way the Insert form writes an occurrence title, reads it
 * back the way the refresher does, and returns the resolved typed pinpoint.
 * The codec must be lossless for the type, value and sub-pinpoint.
 */
function roundTrip(pin: Pinpoint): Pinpoint | undefined {
  const title = buildOccurrenceTitle("short", pin);
  const parsed = parseOccurrenceTitle(title);
  expect(parsed.formatPreference).toBe("short");
  return resolveOccurrencePinpoint(parsed.pinpoint, undefined);
}

/** A short-form (footnote 3, first cited in 1) rendering with the round-tripped pinpoint. */
function renderShortWith(citation: Citation, standard: StandardKey, pin: Pinpoint): string {
  return renderSubsequent(citation, standard, {
    previous: [interveningSource(citation)],
    footnoteNumber: 3,
    firstFootnoteNumber: 1,
    pinpoint: roundTrip(pin),
    formatPreference: "short",
  }).text;
}

const PAGE: Pinpoint = { type: "page", value: "42" };
const PARAGRAPH: Pinpoint = { type: "paragraph", value: "[42]" };
const SECTION: Pinpoint = { type: "section", value: "6" };
const PAGE_WITH_PARAGRAPH: Pinpoint = {
  type: "page",
  value: "6",
  subPinpoint: { type: "paragraph", value: "[23]" },
};
const PAGE_WITH_FOOTNOTE: Pinpoint = {
  type: "page",
  value: "9",
  subPinpoint: { type: "footnote", value: "6" },
};
const PARAGRAPH_RANGE: Pinpoint = { type: "paragraph", value: "[42]–[45]" };

describe("STD-005: the occurrence-title codec is lossless for typed pinpoints", () => {
  test.each<[string, Pinpoint]>([
    ["page", PAGE],
    ["paragraph", PARAGRAPH],
    ["section", SECTION],
    ["page with a paragraph sub-pinpoint (AGLC4 1.1.6 ex '6 [23]')", PAGE_WITH_PARAGRAPH],
    ["paragraph range", PARAGRAPH_RANGE],
    ["page range (AGLC4 1.1.6 '42–5')", { type: "page", value: "42–5" }],
  ])(
    "%s survives buildOccurrenceTitle → parseOccurrenceTitle → resolveOccurrencePinpoint",
    (_, pin) => {
      expect(roundTrip(pin)).toEqual(pin);
    }
  );

  test("page with a footnote sub-pinpoint (OSCOLA 5 §3.1.3 '9 fn 6') survives the codec (STD-014)", () => {
    // STD-014: the compact form '9 n 6' would read back as page "9 n 6", so
    // the codec stores the type-tagged form ('@page:9|footnote:6'); the
    // label ('n' or 'fn') is chosen at render time by the standard.
    expect(buildOccurrenceTitle("short", PAGE_WITH_FOOTNOTE)).toBe(
      "Citation:short:@page:9|footnote:6"
    );
    expect(roundTrip(PAGE_WITH_FOOTNOTE)).toEqual(PAGE_WITH_FOOTNOTE);
  });
});

describe("STD-005: typed round trip renders with the AGLC4 vocabulary (Rules 1.1.6, 1.4.1)", () => {
  test("page: 'Mabo (n 1) 42'", () => {
    expect(renderShortWith(maboReported, "aglc4", PAGE)).toBe("Mabo (n 1) 42");
  });

  test("paragraph: 'Mabo (n 1) [42]'", () => {
    expect(renderShortWith(maboReported, "aglc4", PARAGRAPH)).toBe("Mabo (n 1) [42]");
  });

  test("section on legislation: 'Native Title Act (n 1) s 6'", () => {
    expect(renderShortWith(cthNativeTitleAct, "aglc4", SECTION)).toBe("Native Title Act (n 1) s 6");
  });

  test("page with a paragraph sub-pinpoint: 'Mabo (n 1) 6 [23]'", () => {
    expect(renderShortWith(maboReported, "aglc4", PAGE_WITH_PARAGRAPH)).toBe("Mabo (n 1) 6 [23]");
  });

  test("paragraph range: 'Mabo (n 1) [42]–[45]'", () => {
    expect(renderShortWith(maboReported, "aglc4", PARAGRAPH_RANGE)).toBe("Mabo (n 1) [42]–[45]");
  });
});

describe("STD-005: typed round trip renders with the OSCOLA 5 vocabulary (§1.2.1, §2.1.6, §2.4.2)", () => {
  test("page after (n X): 'Corr (n 1) 42'", () => {
    expect(renderShortWith(ukCorr, "oscola5", PAGE)).toBe("Corr (n 1) 42");
  });

  test("paragraph after (n X): 'Corr (n 1) [42]'", () => {
    expect(renderShortWith(ukCorr, "oscola5", PARAGRAPH)).toBe("Corr (n 1) [42]");
  });

  // STD-014: no comma before a paragraph pinpoint; STD-015: no short-form
  // declaration for a case under OSCOLA (§2.1.2).
  test("paragraph on a first citation follows the neutral citation and report with no comma (§2.1.6)", () => {
    const pin = roundTrip(PARAGRAPH);
    expect(renderFirst(ukCorr, "oscola5", { pinpoint: pin }).text).toBe(
      "Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884 [42]"
    );
  });

  // STD-015: the declared-short-form route for legislation (§1.2.1, no
  // "(n X)"); STD-014 renders the section label after the comma.
  test("section on legislation uses the declared short form with a comma (§1.2.1, §2.4.2): 'HRA 1998, s 6'", () => {
    expect(renderShortWith(ukHra, "oscola5", SECTION)).toBe("HRA 1998, s 6");
  });

  test("page with a footnote sub-pinpoint on a book (§3.1.3 '9 fn 6'): 'Luntz (n 1) 9 fn 6' (STD-014)", () => {
    expect(renderShortWith(bookLuntz, "oscola5", PAGE_WITH_FOOTNOTE)).toBe("Luntz (n 1) 9 fn 6");
  });

  test("paragraph range is never truncated (§1.3.2): 'Corr (n 1) [42]–[45]'", () => {
    expect(renderShortWith(ukCorr, "oscola5", PARAGRAPH_RANGE)).toBe("Corr (n 1) [42]–[45]");
  });
});

describe("STD-005: typed round trip renders with the NZLSG 3 vocabulary (§2.3.1, §3.2.8, §4.1.1(d))", () => {
  // STD-014: resolveNzlsgSubsequent renders the occurrence's typed pinpoint
  // through the standard-aware formatter (', at 42', ', at [42]').
  test("page: 'Brooker, above n 1, at 42' (STD-014)", () => {
    expect(renderShortWith(nzBrooker, "nzlsg3", PAGE)).toBe("Brooker, above n 1, at 42");
  });

  test("paragraph: 'Brooker, above n 1, at [42]' (STD-014)", () => {
    expect(renderShortWith(nzBrooker, "nzlsg3", PARAGRAPH)).toBe("Brooker, above n 1, at [42]");
  });

  test("section on legislation: short title, comma, 's 6' and no 'above n' (§2.3.1(a)(ii)): 'Privacy Act, s 6' (STD-014)", () => {
    expect(renderShortWith(nzPrivacyAct, "nzlsg3", SECTION)).toBe("Privacy Act, s 6");
  });

  test("paragraph range with full digits (§3.2.8): 'Brooker, above n 1, at [42]–[45]' (STD-014)", () => {
    expect(renderShortWith(nzBrooker, "nzlsg3", PARAGRAPH_RANGE)).toBe(
      "Brooker, above n 1, at [42]–[45]"
    );
  });

  test.todo(
    "DECISION-040: NZLSG 3 §3.2.8 gives no form for a page pinpoint with a paragraph sub-pinpoint ('at 6 [23]' is unconfirmed)"
  );
});
