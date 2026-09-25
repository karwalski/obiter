/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * A5-EXP-6..8 (experimental, pending AGLC5; DECISION-041): the genai_output
 * developer, recipient and opt-in prompt note, exercised through the engine
 * dispatch, OSCOLA, subsequent references, the bibliography and interchange.
 */

import { formatCitation, CitationContext } from "../../src/engine/engine";
import { formatBibliographyEntry } from "../../src/engine/rules/v4/general/bibliography";
import { STANDARD_PROFILES } from "../../src/engine/standards/profiles";
import { isExperimentalSourceType } from "../../src/engine/ruleExporter";
import { mapCitationToRecord } from "../../src/api/interchange/mapper/fromCitation";
import { mapRecordToCitation } from "../../src/api/interchange/mapper/toCitation";
import type { Citation } from "../../src/types/citation";
import type { FormattedRun } from "../../src/types/formattedRun";

const text = (runs: FormattedRun[]): string => runs.map((r) => r.text).join("");

const FIRST: CitationContext = {
  footnoteNumber: 1,
  isFirstCitation: true,
  isSameAsPreceding: false,
  precedingFootnoteCitationCount: 0,
  firstFootnoteNumber: 1,
  isWithinSameFootnote: false,
  formatPreference: "full",
};

const LATER: CitationContext = {
  footnoteNumber: 5,
  isFirstCitation: false,
  isSameAsPreceding: false,
  precedingFootnoteCitationCount: 1,
  firstFootnoteNumber: 1,
  isWithinSameFootnote: false,
  formatPreference: "auto",
};

function genai(data: Citation["data"]): Citation {
  return {
    id: "genai-exp",
    aglcVersion: "4",
    sourceType: "genai_output",
    data: {
      platform: "ChatGPT",
      model: "GPT-5",
      outputDate: "2026-07-07",
      prompt: "Summarise the rule in Mabo",
      ...data,
    },
  } as Citation;
}

describe("A5-EXP-6..8 through the engine", () => {
  test("genai_output stays badged experimental", () => {
    expect(isExperimentalSourceType("genai_output")).toBe(true);
  });

  test("AGLC dispatch renders developer, recipient and the opted-in prompt note", () => {
    const runs = formatCitation(
      genai({ developer: "OpenAI", recipient: "Fred Jones", includePrompt: true }),
      FIRST
    );
    expect(text(runs)).toContain(
      "Output from ChatGPT (GPT-5), OpenAI to Fred Jones, 7 July 2026. " +
        "The output was generated in response to the prompt, ‘Summarise the rule in Mabo’"
    );
  });

  test("a stored string 'true' (XML round trip) still opts in", () => {
    const runs = formatCitation(genai({ includePrompt: "true" }), FIRST);
    expect(text(runs)).toContain("in response to the prompt");
  });

  test("without the new fields the AGLC form is unchanged", () => {
    expect(text(formatCitation(genai({}), FIRST))).toContain(
      "Output from ChatGPT (GPT-5) to the author, 7 July 2026"
    );
    expect(text(formatCitation(genai({}), FIRST))).not.toContain("prompt");
  });

  test("a subsequent reference never repeats the prompt note", () => {
    const runs = formatCitation(genai({ developer: "OpenAI", includePrompt: true }), LATER);
    expect(text(runs)).not.toContain("prompt");
  });

  test("the bibliography entry never carries the prompt note", () => {
    const runs = formatBibliographyEntry(genai({ developer: "OpenAI", includePrompt: true }));
    expect(text(runs)).not.toContain("prompt");
  });

  test("OSCOLA 5 r 3.7.13: AI as author, prompt, developer, date; no URL", () => {
    const runs = formatCitation(
      genai({ developer: "OpenAI", url: "https://chatgpt.com/share/x" }),
      FIRST,
      STANDARD_PROFILES.oscola5.config
    );
    expect(text(runs)).toBe(
      "ChatGPT, response to \u2018Summarise the rule in Mabo\u2019, OpenAI (7 July 2026)"
    );
  });

  // ── A5-EXP-10: later references never lose their identifier ──────────────
  test.each([
    ["AGLC4", undefined, "Output from ChatGPT (n 1)"],
    ["OSCOLA 5", STANDARD_PROFILES.oscola5.config, "ChatGPT (n 1)"],
    ["NZLSG 3", STANDARD_PROFILES.nzlsg3.config, "Output from ChatGPT, above n 1"],
  ])("A5-EXP-10: %s later reference", (_label, config, expected) => {
    expect(text(formatCitation(genai({ developer: "OpenAI" }), LATER, config)).trim()).toBe(
      expected
    );
  });

  test("A5-EXP-10: a named recipient's surname joins the AGLC lead", () => {
    expect(text(formatCitation(genai({ recipient: "Jane Smith" }), LATER))).toBe(
      "Output from ChatGPT to Smith (n 1)"
    );
  });

  test("A5-EXP-10: a user short title replaces the generated lead", () => {
    const c = { ...genai({}), shortTitle: "Mabo summary" };
    expect(text(formatCitation(c, LATER))).toBe("Mabo summary (n 1)");
  });

  // ── A5-EXP-11: AGLC bibliography entry under Other ────────────────────────
  test("A5-EXP-11: bibliography entry leads with the developer", () => {
    expect(text(formatBibliographyEntry(genai({ developer: "OpenAI" })))).toBe(
      "OpenAI, ChatGPT (GPT-5) to the author, Output, 7 July 2026"
    );
  });

  test("A5-EXP-11: bibliography entry without a developer is never empty", () => {
    expect(text(formatBibliographyEntry(genai({ model: "", recipient: "Jane Smith" })))).toBe(
      "ChatGPT to Jane Smith, Output, 7 July 2026"
    );
  });

  test("interchange keeps developer, recipient and the prompt opt-in (CSL-JSON)", () => {
    const record = mapCitationToRecord(
      genai({ developer: "OpenAI", recipient: "Fred Jones", includePrompt: true }),
      { format: "csl-json" }
    );
    // A record from another tool carries no Obiter provenance, so it is read
    // through the genai_output field mapping rather than restored verbatim.
    delete (record as { obiterId?: string }).obiterId;
    const back = mapRecordToCitation(record, {
      aglcVersion: "4",
      sourceTypeOverride: "genai_output",
    }).citation.data;
    expect(back.developer).toBe("OpenAI");
    expect(back.recipient).toBe("Fred Jones");
    expect(back.includePrompt).toBe(true);
  });
});
