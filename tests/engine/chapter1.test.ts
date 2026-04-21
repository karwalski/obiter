/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Chapter 1 — General Rules: integration tests using AGLC4's own examples.
 */

import { formatPinpoint, formatPinpoints } from "../../src/engine/rules/v4/general/pinpoints";
import { ensureClosingPunctuation, joinMultipleCitations } from "../../src/engine/rules/v4/general/footnotes";
import { formatSignal, formatLinkingPhrase, joinLinkedSources } from "../../src/engine/rules/v4/general/signals";
import type { IntroductorySignal } from "../../src/engine/rules/v4/general/signals";
import { toTitleCase, validateCapitalisation } from "../../src/engine/rules/v4/general/capitalisation";
import { shouldItaliciseTitle, shouldQuoteTitle, wrapTitle } from "../../src/engine/rules/v4/general/italicisation";
import { numberToWords, formatNumber, checkNumberFormatting } from "../../src/engine/rules/v4/general/numbers";
import { formatDate, formatDateSpan, formatYearSpan, checkDateFormatting } from "../../src/engine/rules/v4/general/dates";
import { checkAbbreviationFullStops, fixAbbreviationFullStops, checkDashes, fixDashes } from "../../src/engine/rules/v4/general/punctuation";
import {
  resolveIbid,
  formatShortReference,
  formatShortTitleIntroduction,
  formatWithinFootnoteReference,
  resolveSubsequentReference,
} from "../../src/engine/resolver";
import type { Pinpoint, Citation } from "../../src/types/citation";
import type { FormattedRun } from "../../src/types/formattedRun";

/** Helper: join run texts for easy assertion. */
function runsToText(runs: FormattedRun[]): string {
  return runs.map((r) => r.text).join("");
}

/** Helper: check if a specific run is italic. */
function isRunItalic(runs: FormattedRun[], index: number): boolean {
  return runs[index]?.italic === true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule 1.1.3 — Multiple Sources in Footnotes
// ─────────────────────────────────────────────────────────────────────────────

describe("Rule 1.1.3 — Multiple sources in footnotes", () => {
  test("sources separated by semicolons (AGLC4 fn 21)", () => {
    const citation1: FormattedRun[] = [{ text: "Muschinski v Dodds (1985) 160 CLR 583", italic: true }];
    const citation2: FormattedRun[] = [{ text: "Baumgartner v Baumgartner (1987) 164 CLR 137", italic: true }];
    const citation3: FormattedRun[] = [
      { text: "Bryson v Bryant", italic: true },
      { text: " (1992) 29 NSWLR 188, 194\u20135" },
    ];

    const result = joinMultipleCitations([citation1, citation2, citation3]);
    const text = runsToText(result);

    expect(text).toContain("; ");
    expect(text).not.toContain(" and ");
  });

  test("different introductory signal starts new sentence (AGLC4 fn 22)", () => {
    const citation1: FormattedRun[] = [{ text: "Spratt v Hermes (1965) 114 CLR 226" }];
    const citation2: FormattedRun[] = [{ text: "Capital TV & Appliances Pty Ltd v Falconer (1971) 125 CLR 591" }];
    const citation3: FormattedRun[] = [{ text: "Kruger v Commonwealth (1997) 190 CLR 1" }];
    const citation4: FormattedRun[] = [{ text: "Cf R v Bernasconi (1915) 19 CLR 629" }];

    // First three share same signal (none), fourth has "Cf"
    const result = joinMultipleCitations(
      [citation1, citation2, citation3, citation4],
      [undefined, undefined, undefined, "Cf"],
    );
    const text = runsToText(result);

    // Between 1-2 and 2-3: semicolons
    // Between 3-4: new sentence (". ") because signal changed
    expect(text).toContain(". ");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rule 1.1.4 — Closing Punctuation in Footnotes
// ─────────────────────────────────────────────────────────────────────────────

describe("Rule 1.1.4 — Closing punctuation", () => {
  test("adds full stop if missing (AGLC4 fn 23)", () => {
    const runs: FormattedRun[] = [{ text: "R v Gomez [1993] AC 442" }];
    const result = ensureClosingPunctuation(runs);
    expect(runsToText(result)).toBe("R v Gomez [1993] AC 442.");
  });

  test("does not add full stop if already present", () => {
    const runs: FormattedRun[] = [{ text: "R v Gomez [1993] AC 442." }];
    const result = ensureClosingPunctuation(runs);
    expect(runsToText(result)).toBe("R v Gomez [1993] AC 442.");
  });

  test("preserves question mark (AGLC4 fn 25)", () => {
    const runs: FormattedRun[] = [{ text: "But what of the second proposition?" }];
    const result = ensureClosingPunctuation(runs);
    expect(runsToText(result)).toBe("But what of the second proposition?");
  });

  test("preserves exclamation mark", () => {
    const runs: FormattedRun[] = [{ text: "This is remarkable!" }];
    const result = ensureClosingPunctuation(runs);
    expect(runsToText(result)).toBe("This is remarkable!");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rule 1.1.6 — Pinpoint References
// ─────────────────────────────────────────────────────────────────────────────

describe("Rule 1.1.6 — Pinpoint references", () => {
  test("page pinpoint: plain number, no prefix (AGLC4 fn 31)", () => {
    // HLA Hart, The Concept of Law (Clarendon Press, 1970) 15.
    const pin: Pinpoint = { type: "page", value: "15" };
    const result = formatPinpoint(pin);
    expect(runsToText(result)).toBe("15");
  });

  test("paragraph pinpoint: square brackets, no 'para' (AGLC4 fn 30)", () => {
    // Agius v South Australia [No 6] [2018] FCA 358, [90]–[97]
    const pin: Pinpoint = { type: "paragraph", value: "[90]\u2013[97]" };
    const result = formatPinpoint(pin);
    expect(runsToText(result)).toBe("[90]\u2013[97]");
  });

  test("page + paragraph sub-pinpoint (AGLC4 fn 32)", () => {
    // 6 [23]
    const pin: Pinpoint = {
      type: "page",
      value: "6",
      subPinpoint: { type: "paragraph", value: "[23]" },
    };
    const result = formatPinpoint(pin);
    expect(runsToText(result)).toBe("6 [23]");
  });

  test("footnote pinpoint with page and paragraph (AGLC4 fn 34)", () => {
    // 528 [57] n 6
    const pin: Pinpoint = {
      type: "page",
      value: "528",
      subPinpoint: {
        type: "paragraph",
        value: "[57]",
        subPinpoint: { type: "footnote", value: "6" },
      },
    };
    const result = formatPinpoint(pin);
    expect(runsToText(result)).toBe("528 [57] n 6");
  });

  test("multiple pinpoints separated by commas (AGLC4 fn 35)", () => {
    // 509 [43], [45]
    const pins: Pinpoint[] = [
      {
        type: "page",
        value: "509",
        subPinpoint: { type: "paragraph", value: "[43]" },
      },
      { type: "paragraph", value: "[45]" },
    ];
    const result = formatPinpoints(pins);
    expect(runsToText(result)).toBe("509 [43], [45]");
  });

  test("section pinpoint uses 's' prefix", () => {
    const pin: Pinpoint = { type: "section", value: "37" };
    const result = formatPinpoint(pin);
    expect(runsToText(result)).toBe("s 37");
  });

  test("chapter pinpoint uses 'ch' prefix", () => {
    const pin: Pinpoint = { type: "chapter", value: "4" };
    const result = formatPinpoint(pin);
    expect(runsToText(result)).toBe("ch 4");
  });

  test("schedule pinpoint uses 'sch' prefix", () => {
    const pin: Pinpoint = { type: "schedule", value: "1" };
    const result = formatPinpoint(pin);
    expect(runsToText(result)).toBe("sch 1");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rule 1.1.7 — Spans of Pinpoint References
// ─────────────────────────────────────────────────────────────────────────────

describe("Rule 1.1.7 — Spans of pinpoint references", () => {
  test("page span uses en-dash (AGLC4 fn 36: 182\u201391)", () => {
    const pin: Pinpoint = { type: "page", value: "182\u201391" };
    const result = formatPinpoint(pin);
    expect(runsToText(result)).toBe("182\u201391");
  });

  test("paragraph span with separate brackets (AGLC4 fn 37: [50]\u2013[59])", () => {
    const pin: Pinpoint = { type: "paragraph", value: "[50]\u2013[59]" };
    const result = formatPinpoint(pin);
    expect(runsToText(result)).toBe("[50]\u2013[59]");
  });

  test("page span + paragraph span (AGLC4 fn 38: 389\u201390 [196]\u2013[197])", () => {
    const pin: Pinpoint = {
      type: "page",
      value: "389\u201390",
      subPinpoint: { type: "paragraph", value: "[196]\u2013[197]" },
    };
    const result = formatPinpoint(pin);
    expect(runsToText(result)).toBe("389\u201390 [196]\u2013[197]");
  });

  test("footnote number span (AGLC4 fn 39: 348 nn 22\u20134)", () => {
    // "nn" is for multiple footnotes; stored as value "22\u20134" with prefix "n"
    // Per appendix C, "nn" is the plural of "n".
    // The current model stores this as a single footnote pinpoint with value "22\u20134"
    // which would render "n 22\u20134". AGLC4 uses "nn" for plural spans.
    // This is a known limitation: the Pinpoint type doesn't distinguish singular/plural.
    const pin: Pinpoint = {
      type: "page",
      value: "348",
      subPinpoint: { type: "footnote", value: "22\u20134" },
    };
    const result = formatPinpoint(pin);
    // Current output: "348 n 22\u20134" — should ideally be "348 nn 22\u20134"
    // but the type system has no plural concept. Test current behaviour.
    expect(runsToText(result)).toBe("348 n 22\u20134");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rule 1.2 — Introductory Signals
// ─────────────────────────────────────────────────────────────────────────────

describe("Rule 1.2 — Introductory signals", () => {
  test("'See' signal (AGLC4 fn 43)", () => {
    const result = formatSignal("see");
    expect(runsToText(result)).toBe("See ");
    expect(result[0].italic).toBe(false);
  });

  test("'See also' signal (AGLC4 fn 40)", () => {
    const result = formatSignal("see_also");
    expect(runsToText(result)).toBe("See also ");
  });

  test("'See, eg,' signal (AGLC4 fn 45)", () => {
    const result = formatSignal("see_eg");
    expect(runsToText(result)).toBe("See, eg, ");
  });

  test("'See especially' signal (AGLC4 table)", () => {
    const result = formatSignal("see_especially");
    expect(runsToText(result)).toBe("See especially ");
  });

  test("'See generally' signal (AGLC4 fn 43)", () => {
    const result = formatSignal("see_generally");
    expect(runsToText(result)).toBe("See generally ");
  });

  test("'Cf' signal (AGLC4 fn 41)", () => {
    const result = formatSignal("cf");
    expect(runsToText(result)).toBe("Cf ");
  });

  test("'But see' signal", () => {
    const result = formatSignal("but_see");
    expect(runsToText(result)).toBe("But see ");
  });

  test("signals are not italicised (Rule 1.2)", () => {
    const signals: IntroductorySignal[] = [
      "see", "see_also", "see_eg", "see_especially", "see_generally", "cf", "but_see",
    ];
    for (const sig of signals) {
      const result = formatSignal(sig);
      expect(result[0].italic).toBe(false);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rule 1.3 — Sources Referring to Other Sources
// ─────────────────────────────────────────────────────────────────────────────

describe("Rule 1.3 — Linking phrases", () => {
  test("'quoting' linking phrase (AGLC4 fn 46)", () => {
    const result = formatLinkingPhrase("quoting");
    expect(runsToText(result)).toBe(", quoting ");
    expect(result[0].italic).toBe(false);
  });

  test("'cited in' linking phrase (AGLC4 fn 47)", () => {
    const result = formatLinkingPhrase("cited_in");
    expect(runsToText(result)).toBe(", cited in ");
  });

  test("joinLinkedSources produces correct output", () => {
    const primary: FormattedRun[] = [{ text: "Source A" }];
    const secondary: FormattedRun[] = [{ text: "Source B" }];
    const result = joinLinkedSources(primary, secondary, "quoting");
    expect(runsToText(result)).toBe("Source A, quoting Source B");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rule 1.4.1 — Subsequent References (General)
// ─────────────────────────────────────────────────────────────────────────────

describe("Rule 1.4.1 — Subsequent references", () => {
  const makeBookCitation = (surname: string, title: string, id = "c1"): Citation => ({
    id,
    aglcVersion: "4",
    sourceType: "book",
    data: {
      authors: [{ givenNames: "Catharine", surname }],
      title,
    },
    tags: [],
    createdAt: "",
    modifiedAt: "",
  });

  test("secondary source: Surname (n X) pinpoint (AGLC4 fn 50)", () => {
    // MacMillan (n 48) 41.
    const citation = makeBookCitation("MacMillan", "Mistakes in Contract Law");
    const pin: Pinpoint = { type: "page", value: "41" };
    const result = formatShortReference(citation, 48, pin);
    expect(runsToText(result)).toBe("MacMillan (n 48) 41");
  });

  test("case short title in subsequent reference (AGLC4 fn 56)", () => {
    // Penfolds Wines (n 53) 224 (Dixon J).
    const citation: Citation = {
      id: "c2",
      aglcVersion: "4",
      sourceType: "case.reported",
      data: { title: "Penfolds Wines Pty Ltd v Elliott" },
      shortTitle: "Penfolds Wines",
      tags: [],
      createdAt: "",
      modifiedAt: "",
    };
    const pin: Pinpoint = { type: "page", value: "224" };
    const result = formatShortReference(citation, 53, pin);
    const text = runsToText(result);
    expect(text).toBe("Penfolds Wines (n 53) 224");
    // Case short title should be italicised
    expect(isRunItalic(result, 0)).toBe(true);
  });

  test("disambiguation: surname + title (AGLC4 fns 61\u201362)", () => {
    // Rubenstein, Australian Citizenship Law in Context (n 59) 48, 65\u201374.
    const citation = makeBookCitation("Rubenstein", "Australian Citizenship Law in Context");
    const pin: Pinpoint = { type: "page", value: "48" };
    const result = formatShortReference(citation, 59, pin, true);
    const text = runsToText(result);
    expect(text).toContain("Rubenstein");
    expect(text).toContain("Australian Citizenship Law in Context");
    expect(text).toContain("(n 59)");
    expect(text).toContain("48");
  });

  test("legislation short title in subsequent reference (AGLC4 fn 65)", () => {
    // ADJR Act (n 63) s 5(2).
    const citation: Citation = {
      id: "c3",
      aglcVersion: "4",
      sourceType: "legislation.statute",
      data: { title: "Administrative Decisions (Judicial Review) Act 1977" },
      shortTitle: "ADJR Act",
      tags: [],
      createdAt: "",
      modifiedAt: "",
    };
    const pin: Pinpoint = { type: "section", value: "5(2)" };
    const result = formatShortReference(citation, 63, pin);
    const text = runsToText(result);
    expect(text).toBe("ADJR Act (n 63) s 5(2)");
    // Legislation short title should be italicised
    expect(isRunItalic(result, 0)).toBe(true);
  });

  test("AUDIT2-020: legislation subsequent ref uses plural pinpoint abbreviations (Rule 3.5)", () => {
    // Legislation pinpoints should use ss (not s) for section ranges,
    // regs (not reg) for regulation ranges, etc.
    const citation: Citation = {
      id: "c4",
      aglcVersion: "4",
      sourceType: "legislation.statute",
      data: { title: "Migration Act 1958" },
      shortTitle: "Migration Act",
      tags: [],
      createdAt: "",
      modifiedAt: "",
    };
    const pin: Pinpoint = { type: "section", value: "5\u20137" };
    const result = formatShortReference(citation, 10, pin);
    const text = runsToText(result);
    // Should use "ss" (plural) not "s" (singular) for en-dash range
    expect(text).toBe("Migration Act (n 10) ss 5\u20137");
  });

  test("AUDIT2-020: legislation subsequent ref uses regulation abbreviation", () => {
    const citation: Citation = {
      id: "c5",
      aglcVersion: "4",
      sourceType: "legislation.delegated",
      data: { title: "Migration Regulations 1994" },
      shortTitle: "Migration Regulations",
      tags: [],
      createdAt: "",
      modifiedAt: "",
    };
    const pin: Pinpoint = { type: "regulation", value: "2.01" };
    const result = formatShortReference(citation, 20, pin);
    expect(runsToText(result)).toBe("Migration Regulations (n 20) reg 2.01");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rule 1.4.3 — Ibid
// ─────────────────────────────────────────────────────────────────────────────

describe("Rule 1.4.3 — Ibid", () => {
  test("same source, same pinpoint: 'Ibid' (AGLC4 fn 69)", () => {
    // fn 68: ... 163. fn 69: See ibid.
    const preceding: Pinpoint = { type: "page", value: "163" };
    const current: Pinpoint = { type: "page", value: "163" };
    const result = resolveIbid(current, preceding);
    expect(runsToText(result)).toBe("Ibid");
  });

  test("same source, no pinpoints: 'Ibid'", () => {
    const result = resolveIbid(undefined, undefined);
    expect(runsToText(result)).toBe("Ibid");
  });

  test("same source, different pinpoint: 'Ibid pinpoint' (AGLC4 fn 70)", () => {
    // fn 68: ... 163. fn 70: Ibid 162.
    const preceding: Pinpoint = { type: "page", value: "163" };
    const current: Pinpoint = { type: "page", value: "162" };
    const result = resolveIbid(current, preceding);
    expect(runsToText(result)).toBe("Ibid 162");
  });

  test("ibid with section pinpoint (AGLC4 fn 73)", () => {
    // fn 72: ... s 37. fn 73: Ibid s 38.
    const preceding: Pinpoint = { type: "section", value: "37" };
    const current: Pinpoint = { type: "section", value: "38" };
    const result = resolveIbid(current, preceding);
    expect(runsToText(result)).toBe("Ibid s 38");
  });

  test("ibid with multiple pinpoints (AGLC4 fn 79)", () => {
    // fn 78: Higgins (n 75) 220. fn 79: Ibid 222, 239.
    // "222, 239" is two pinpoints — the current model represents the first only
    const preceding: Pinpoint = { type: "page", value: "220" };
    const current: Pinpoint = { type: "page", value: "222" };
    const result = resolveIbid(current, preceding);
    expect(runsToText(result)).toBe("Ibid 222");
  });

  test("ibid capitalised at start of footnote (AGLC4 fn 70)", () => {
    // Rule says 'Ibid' should be capitalised at start of footnote
    const result = resolveIbid({ type: "page", value: "162" }, { type: "page", value: "163" });
    expect(result[0].text).toBe("Ibid ");
    expect(result[0].text.charAt(0)).toBe("I");
  });

  test("resolveSubsequentReference uses ibid when eligible", () => {
    const citation: Citation = {
      id: "c1",
      aglcVersion: "4",
      sourceType: "book",
      data: { authors: [{ givenNames: "Eric", surname: "Barendt" }], title: "Freedom of Speech" },
      tags: [],
      createdAt: "",
      modifiedAt: "",
    };
    const result = resolveSubsequentReference(citation, {
      isFirstCitation: false,
      isSameAsPreceding: true,
      precedingFootnoteCitationCount: 1,
      precedingPinpoint: { type: "page", value: "163" },
      currentPinpoint: { type: "page", value: "162" },
      firstFootnoteNumber: 68,
      isWithinSameFootnote: false,
      formatPreference: "auto",
    });
    expect(result).not.toBeNull();
    expect(runsToText(result!)).toBe("Ibid 162");
  });

  test("ibid NOT used when preceding footnote has multiple sources (Rule 1.4.3)", () => {
    const citation: Citation = {
      id: "c1",
      aglcVersion: "4",
      sourceType: "book",
      data: { authors: [{ givenNames: "Eric", surname: "Barendt" }], title: "Freedom of Speech" },
      tags: [],
      createdAt: "",
      modifiedAt: "",
    };
    const result = resolveSubsequentReference(citation, {
      isFirstCitation: false,
      isSameAsPreceding: true,
      precedingFootnoteCitationCount: 2, // multiple sources
      precedingPinpoint: { type: "page", value: "163" },
      currentPinpoint: { type: "page", value: "67" },
      firstFootnoteNumber: 68,
      isWithinSameFootnote: false,
      formatPreference: "auto",
    });
    // Should use short reference instead of ibid (AGLC4 fn 76)
    expect(result).not.toBeNull();
    expect(runsToText(result!)).toContain("Barendt");
    expect(runsToText(result!)).toContain("(n 68)");
  });

  test("ibid NOT used when preceding had pinpoint but current does not (AGLC4 fn 80)", () => {
    const citation: Citation = {
      id: "c1",
      aglcVersion: "4",
      sourceType: "book",
      data: { authors: [{ givenNames: "Rosalyn", surname: "Higgins" }], title: "Problems and Process" },
      tags: [],
      createdAt: "",
      modifiedAt: "",
    };
    const result = resolveSubsequentReference(citation, {
      isFirstCitation: false,
      isSameAsPreceding: true,
      precedingFootnoteCitationCount: 1,
      precedingPinpoint: { type: "page", value: "222" },
      currentPinpoint: undefined, // no pinpoint
      firstFootnoteNumber: 75,
      isWithinSameFootnote: false,
      formatPreference: "auto",
    });
    // Should use short reference: Higgins (n 75)
    expect(result).not.toBeNull();
    expect(runsToText(result!)).toContain("Higgins");
    expect(runsToText(result!)).toContain("(n 75)");
    expect(runsToText(result!)).not.toContain("Ibid");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rule 1.4.4 — Short Title Introduction
// ─────────────────────────────────────────────────────────────────────────────

describe("Rule 1.4.4 — Short titles", () => {
  test("case short title: parenthesised with quotes and italic (AGLC4 fn 53)", () => {
    // ('Penfolds Wines')
    const result = formatShortTitleIntroduction("Penfolds Wines", "case.reported");
    expect(runsToText(result)).toBe("('Penfolds Wines')");
    // The short title itself should be italicised
    expect(isRunItalic(result, 1)).toBe(true);
  });

  test("secondary source short title: not italic (AGLC4 fn 58)", () => {
    // ('Meanings of Membership')
    const result = formatShortTitleIntroduction("Meanings of Membership", "journal.article");
    expect(runsToText(result)).toBe("('Meanings of Membership')");
    // Should NOT be italic
    expect(result[0].italic).toBeUndefined();
  });

  test("legislation short title: italic (AGLC4 fn 63)", () => {
    // ('ADJR Act')
    const result = formatShortTitleIntroduction("ADJR Act", "legislation.statute");
    expect(runsToText(result)).toBe("('ADJR Act')");
    expect(isRunItalic(result, 1)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rule 1.4.6 — Within-Footnote Subsequent References
// ─────────────────────────────────────────────────────────────────────────────

describe("Rule 1.4.6 — Within-footnote 'at' references", () => {
  test("'at' with page pinpoint (AGLC4 fn 27)", () => {
    // ... at 75 [395].
    const pin: Pinpoint = {
      type: "page",
      value: "75",
      subPinpoint: { type: "paragraph", value: "[395]" },
    };
    const result = formatWithinFootnoteReference(pin);
    expect(runsToText(result)).toBe("at 75 [395]");
  });

  test("'at' with schedule pinpoint (AGLC4 fn 28)", () => {
    // at sch 1
    const pin: Pinpoint = { type: "schedule", value: "1" };
    const result = formatWithinFootnoteReference(pin);
    expect(runsToText(result)).toBe("at sch 1");
  });

  test("resolveSubsequentReference uses 'at' within same footnote", () => {
    const citation: Citation = {
      id: "c1",
      aglcVersion: "4",
      sourceType: "case.reported",
      data: { title: "Sullivan v Moody" },
      shortTitle: "Sullivan",
      tags: [],
      createdAt: "",
      modifiedAt: "",
    };
    const result = resolveSubsequentReference(citation, {
      isFirstCitation: false,
      isSameAsPreceding: true,
      precedingFootnoteCitationCount: 1,
      currentPinpoint: { type: "page", value: "580", subPinpoint: { type: "paragraph", value: "[53]" } },
      firstFootnoteNumber: 95,
      isWithinSameFootnote: true,
      formatPreference: "auto",
    });
    expect(result).not.toBeNull();
    expect(runsToText(result!)).toBe("at 580 [53]");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rule 1.6.1 — Full Stops in Abbreviations
// ─────────────────────────────────────────────────────────────────────────────

describe("Rule 1.6.1 — Full stops in abbreviations", () => {
  test("detects 'e.g.' with full stops", () => {
    const issues = checkAbbreviationFullStops("This is true, e.g. in many cases");
    expect(issues.length).toBe(1);
    expect(issues[0].suggestion).toBe("eg");
  });

  test("fixes dotted abbreviations", () => {
    const fixed = fixAbbreviationFullStops("See e.g. Pty. Ltd.");
    expect(fixed).toBe("See eg Pty Ltd");
  });

  test("detects 'i.e.'", () => {
    const issues = checkAbbreviationFullStops("that is, i.e. the main point");
    expect(issues.length).toBe(1);
    expect(issues[0].suggestion).toBe("ie");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rule 1.6.3 — Dashes and Hyphens
// ─────────────────────────────────────────────────────────────────────────────

describe("Rule 1.6.3 — Dashes and hyphens", () => {
  test("double hyphens should be em-dashes", () => {
    const issues = checkDashes("the result--whatever it may be");
    expect(issues.some((i) => i.suggestion === "\u2014")).toBe(true);
  });

  test("fixes double hyphens to em-dashes", () => {
    expect(fixDashes("the result--whatever")).toBe("the result\u2014whatever");
  });

  test("removes spaces around em-dashes", () => {
    expect(fixDashes("the result \u2014 whatever")).toBe("the result\u2014whatever");
  });

  test("hyphens in number spans become en-dashes", () => {
    expect(fixDashes("pages 42-5")).toBe("pages 42\u20135");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rule 1.7 — Capitalisation
// ─────────────────────────────────────────────────────────────────────────────

describe("Rule 1.7 — Capitalisation (title case)", () => {
  test("capitalises first and last words regardless", () => {
    expect(toTitleCase("the law of the")).toBe("The Law of The");
  });

  test("lowercases articles in mid-title", () => {
    expect(toTitleCase("a guide to the law")).toBe("A Guide to the Law");
  });

  test("lowercases short prepositions", () => {
    expect(toTitleCase("rights in rem and in personam")).toBe("Rights in Rem and in Personam");
  });

  test("lowercases conjunctions", () => {
    expect(toTitleCase("law and order")).toBe("Law and Order");
  });

  test("handles AGLC4-style title: journal article", () => {
    const input = "meanings of membership";
    const expected = "Meanings of Membership";
    expect(toTitleCase(input)).toBe(expected);
  });

  test("validates capitalisation of correct title", () => {
    const result = validateCapitalisation("Meanings of Membership");
    expect(result.valid).toBe(true);
  });

  test("suggests correction for incorrect capitalisation", () => {
    const result = validateCapitalisation("meanings Of membership");
    expect(result.valid).toBe(false);
    expect(result.suggested).toBe("Meanings of Membership");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rule 1.8.2 — Italicisation of Source Titles
// ─────────────────────────────────────────────────────────────────────────────

describe("Rule 1.8.2 — Italicisation of source titles", () => {
  test("case names should be italicised", () => {
    expect(shouldItaliciseTitle("case.reported")).toBe(true);
    expect(shouldItaliciseTitle("case.unreported.mnc")).toBe(true);
  });

  test("legislation titles should be italicised", () => {
    expect(shouldItaliciseTitle("legislation.statute")).toBe(true);
    expect(shouldItaliciseTitle("legislation.bill")).toBe(true);
  });

  test("book titles should be italicised", () => {
    expect(shouldItaliciseTitle("book")).toBe(true);
  });

  test("book chapter titles should NOT be italicised (quoted)", () => {
    expect(shouldItaliciseTitle("book.chapter")).toBe(false);
    expect(shouldQuoteTitle("book.chapter")).toBe(true);
  });

  test("journal article titles should be quoted, not italicised", () => {
    expect(shouldItaliciseTitle("journal.article")).toBe(false);
    expect(shouldQuoteTitle("journal.article")).toBe(true);
  });

  test("report titles should be italicised", () => {
    expect(shouldItaliciseTitle("report")).toBe(true);
  });

  test("treaty titles should be italicised", () => {
    expect(shouldItaliciseTitle("treaty")).toBe(true);
  });

  test("wrapTitle returns italic run for case", () => {
    const result = wrapTitle("Mabo v Queensland", "case.reported");
    expect(result.length).toBe(1);
    expect(result[0].text).toBe("Mabo v Queensland");
    expect(result[0].italic).toBe(true);
  });

  test("wrapTitle returns quoted runs for journal article", () => {
    const result = wrapTitle("Some Article Title", "journal.article");
    expect(result.length).toBe(3);
    expect(result[0].text).toBe("\u2018"); // opening single quote
    expect(result[1].text).toBe("Some Article Title");
    expect(result[2].text).toBe("\u2019"); // closing single quote
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rule 1.10.1 — Numbers
// ─────────────────────────────────────────────────────────────────────────────

describe("Rule 1.10.1 — Number formatting", () => {
  test("numbers 1\u20139 written as words", () => {
    expect(numberToWords(1)).toBe("one");
    expect(numberToWords(5)).toBe("five");
    expect(numberToWords(9)).toBe("nine");
  });

  test("numbers 10+ written as numerals", () => {
    expect(numberToWords(10)).toBe("10");
    expect(numberToWords(100)).toBe("100");
    expect(numberToWords(42)).toBe("42");
  });

  test("no comma separators in numbers", () => {
    expect(formatNumber(10000)).toBe("10000");
    expect(formatNumber(1000000)).toBe("1000000");
  });

  test("detects comma-separated numbers", () => {
    const issues = checkNumberFormatting("There were 10,000 cases");
    expect(issues.some((i) => i.ruleNumber === "1.10.1" && i.suggestion === "10000")).toBe(true);
  });

  test("detects standalone digits that should be words", () => {
    const issues = checkNumberFormatting("There were 3 cases");
    expect(issues.some((i) => i.suggestion === "three")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rule 1.11.1 — Full Date
// ─────────────────────────────────────────────────────────────────────────────

describe("Rule 1.11.1 — Date formatting", () => {
  test("formats 'Day Month Year' (AGLC4 example: '14 July 2018')", () => {
    expect(formatDate({ day: 14, month: 7, year: 2018 })).toBe("14 July 2018");
  });

  test("formats month-year only: 'December 2015'", () => {
    expect(formatDate({ month: 12, year: 2015 })).toBe("December 2015");
  });

  test("formats Date object correctly", () => {
    const d = new Date(2018, 6, 14); // July = month 6 (0-indexed)
    expect(formatDate(d)).toBe("14 July 2018");
  });

  test("no commas in dates", () => {
    const result = formatDate({ day: 14, month: 7, year: 2018 });
    expect(result).not.toContain(",");
  });

  test("no ordinal indicators", () => {
    const result = formatDate({ day: 1, month: 1, year: 2020 });
    expect(result).toBe("1 January 2020");
    expect(result).not.toMatch(/\dst|\dnd|\drd|\dth/);
  });

  test("no abbreviated month names", () => {
    for (let m = 1; m <= 12; m++) {
      const result = formatDate({ month: m, year: 2020 });
      // Months should be at least 3 chars and not abbreviated
      expect(result).not.toMatch(/\b(Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\b(?!uary|ruary|ch|il|e|y|ust|tember|ober|ember)/);
    }
  });

  test("detects US-style dates with commas", () => {
    const issues = checkDateFormatting("July 14, 2018");
    expect(issues.some((i) => i.ruleNumber === "1.11.1")).toBe(true);
  });

  test("detects ordinal indicators before month", () => {
    const issues = checkDateFormatting("14th July 2018");
    expect(issues.some((i) => i.ruleNumber === "1.11.1" && i.message.includes("Ordinal"))).toBe(true);
  });

  test("detects abbreviated month names", () => {
    const issues = checkDateFormatting("14 Jul 2018");
    expect(issues.some((i) => i.ruleNumber === "1.11.1" && i.suggestion === "July")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rules 1.11.3 / 1.11.4 — Date and Year Spans
// ─────────────────────────────────────────────────────────────────────────────

describe("Rules 1.11.3/1.11.4 — Date and year spans", () => {
  test("same century year span abbreviated: 1986\u201387", () => {
    expect(formatYearSpan(1986, 1987)).toBe("1986\u201387");
  });

  test("cross-century year span: 1999\u20132009", () => {
    expect(formatYearSpan(1999, 2009)).toBe("1999\u20132009");
  });

  test("same month day span: 21\u201322 September 2018", () => {
    const result = formatDateSpan(
      { day: 21, month: 9, year: 2018 },
      { day: 22, month: 9, year: 2018 },
    );
    expect(result).toBe("21\u201322 September 2018");
  });

  test("different month same year span: 21 September \u2013 3 October 2018", () => {
    const result = formatDateSpan(
      { day: 21, month: 9, year: 2018 },
      { day: 3, month: 10, year: 2018 },
    );
    expect(result).toBe("21 September \u2013 3 October 2018");
  });

  test("year-only span", () => {
    const result = formatDateSpan({ year: 1986 }, { year: 1987 });
    expect(result).toBe("1986\u201387");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rule 1.12.2 — Heading Levels
// ─────────────────────────────────────────────────────────────────────────────

describe("Rule 1.12.2 — Heading prefixes", () => {
  // Import inline to avoid Office.js dependency issues
  let getHeadingPrefix: (level: 1 | 2 | 3 | 4 | 5, number: number) => string;

  beforeAll(async () => {
    const mod = await import("../../src/word/styles");
    getHeadingPrefix = mod.getHeadingPrefix;
  });

  test("Level I: Roman numerals", () => {
    expect(getHeadingPrefix(1, 1)).toBe("I");
    expect(getHeadingPrefix(1, 4)).toBe("IV");
  });

  test("Level II: upper letters", () => {
    expect(getHeadingPrefix(2, 1)).toBe("A");
    expect(getHeadingPrefix(2, 3)).toBe("C");
  });

  test("Level III: Arabic numerals", () => {
    expect(getHeadingPrefix(3, 1)).toBe("1");
    expect(getHeadingPrefix(3, 10)).toBe("10");
  });

  test("Level IV: lower letters in parens", () => {
    expect(getHeadingPrefix(4, 1)).toBe("(a)");
    expect(getHeadingPrefix(4, 3)).toBe("(c)");
  });

  test("Level V: lower Roman in parens", () => {
    expect(getHeadingPrefix(5, 1)).toBe("(i)");
    expect(getHeadingPrefix(5, 4)).toBe("(iv)");
  });
});
