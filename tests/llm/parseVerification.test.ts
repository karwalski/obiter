/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * LCT-001 grounding + LCT-010 parse-verification loop. The model is mocked:
 * each test scripts the JSON a real model would return, in the style of a
 * replayed real run.
 */

jest.mock("../../src/llm/client", () => ({
  callLlm: jest.fn(),
  callLlmMultiTurn: jest.fn(),
}));

import { callLlm, callLlmMultiTurn } from "../../src/llm/client";
import { findOverusedNumbers, findUngroundedNumbers, numbersIn } from "../../src/llm/grounding";
import {
  buildTypeBrief,
  checkParse,
  extractJsonObject,
  verifyParse,
  type ParseCandidate,
} from "../../src/llm/parseVerification";
import { parseCitationText } from "../../src/llm/parseCitation";
import { parseWithCorpusFirst } from "../../src/llm/corpusEnhancedParse";
import type { LLMConfig } from "../../src/llm/config";

const mockMulti = callLlmMultiTurn as jest.MockedFunction<typeof callLlmMultiTurn>;
const mockSingle = callLlm as jest.MockedFunction<typeof callLlm>;
const config = {
  enabled: true,
  provider: "anthropic",
  apiKey: "k",
  model: "m",
} as unknown as LLMConfig;

const reply = (o: unknown): string => JSON.stringify(o);
const kinds = (c: ParseCandidate, input: string): string[] =>
  checkParse(input, c).issues.map((i) => i.kind);

const MABO = "Mabo v Queensland [No 2] (1992) 175 CLR 1, 42";
const maboData = {
  party1: "Mabo",
  party2: "Queensland [No 2]",
  yearType: "round",
  year: "1992",
  volume: "175",
  reportSeries: "CLR",
  startingPage: "1",
  pinpoint: "42",
};

beforeEach(() => {
  mockMulti.mockReset();
  mockSingle.mockReset();
});

describe("grounding (LCT-001)", () => {
  it("expands a shortened span so the full end point is grounded", () => {
    expect(numbersIn("(2002) 122 FCR 494, 509–12").has("512")).toBe(true);
    expect(findUngroundedNumbers("494, 150–5", { pinpoint: "150–155" })).toEqual([]);
  });

  it("flags an invented year and ignores leading zeros", () => {
    const u = findUngroundedNumbers("(1992) 175 CLR 1", { year: "1993", volume: "0175" });
    expect(u).toEqual([{ field: "year", value: "1993", missing: ["1993"] }]);
  });

  it("flags a number written once but used for both starting page and pinpoint (r 2.2.5)", () => {
    expect(findOverusedNumbers("(1920) 24 CLR 21", { startingPage: "21", pinpoint: "21" })).toEqual(
      [{ number: "21", inputCount: 1, fields: ["startingPage", "pinpoint"] }]
    );
    expect(
      findOverusedNumbers("(1920) 24 CLR 21, 21", { startingPage: "21", pinpoint: "21" })
    ).toEqual([]);
  });
});

describe("checkParse", () => {
  it("passes a correct reported case", () => {
    expect(checkParse(MABO, { sourceType: "case.reported", data: maboData }).issues).toEqual([]);
  });

  it("catches schema drift: book.chapter title the formatter never reads", () => {
    const input = "A Author, 'Chap' in E Ed (ed), BookT (Pub, 2001) 5, 7";
    const drifted: ParseCandidate = {
      sourceType: "book.chapter",
      data: {
        authors: [{ givenNames: "A", surname: "Author" }],
        chapterTitle: "Chap",
        title: "BookT",
        editors: "E Ed",
        publisher: "Pub",
        year: "2001",
        startingPage: "5",
        pinpoint: "7",
      },
    };
    const k = kinds(drifted, input);
    expect(k).toContain("empty_element");
    expect(k).toContain("uncovered_text");
    const fixed = { ...drifted, data: { ...drifted.data, title: undefined, bookTitle: "BookT" } };
    expect(kinds(fixed, input)).not.toContain("empty_element");
  });

  it("flags a report series stored as an MNC court ([1932] AC 562)", () => {
    const c: ParseCandidate = {
      sourceType: "case.unreported.mnc",
      data: {
        party1: "Donoghue",
        party2: "Stevenson",
        year: "1932",
        court: "AC",
        caseNumber: "562",
      },
    };
    expect(kinds(c, "Donoghue v Stevenson [1932] AC 562")).toContain("series_court_mixup");
  });

  it("checks pinpoint form under r 1.1.6", () => {
    const withPin = (pinpoint: string): ParseCandidate => ({
      sourceType: "case.reported",
      data: { ...maboData, pinpoint },
    });
    expect(kinds(withPin("p 42"), "Mabo v Queensland [No 2] (1992) 175 CLR 1, p 42")).toContain(
      "pinpoint_format"
    );
    expect(
      kinds(withPin("para 42"), "Mabo v Queensland [No 2] (1992) 175 CLR 1 para 42")
    ).toContain("pinpoint_format");
    const statute: ParseCandidate = {
      sourceType: "legislation.statute",
      data: { title: "Civil Liability Act", year: "2002", jurisdiction: "NSW", pinpoint: "s 5B" },
    };
    expect(checkParse("Civil Liability Act 2002 (NSW) s 5B", statute).issues).toEqual([]);
  });

  it("treats an edition stored as a number as rendered (6 -> 6th ed)", () => {
    const input = "Peter Butt, Land Law (Lawbook, 6th ed, 2010) 45";
    const c: ParseCandidate = {
      sourceType: "book",
      data: {
        authors: [{ givenNames: "Peter", surname: "Butt" }],
        title: "Land Law",
        publisher: "Lawbook",
        edition: "6",
        year: "2010",
        pinpoint: "45",
      },
    };
    expect(kinds(c, input)).not.toContain("field_not_rendered");
  });

  it("flags an MNC judgment number copied into the pinpoint (r 2.2.5 guard)", () => {
    const c: ParseCandidate = {
      sourceType: "case.unreported.mnc",
      data: {
        party1: "Smith",
        party2: "Jones",
        year: "2020",
        court: "HCA",
        mnc: "20",
        pinpoint: "[20]",
      },
    };
    const k = kinds(c, "Smith v Jones [2020] HCA 20");
    expect(k).toContain("overused_number");
    const full: ParseCandidate = {
      sourceType: "case.unreported.mnc",
      data: { party1: "Smith", party2: "Jones", year: "2020", court: "HCA", mnc: "[2020] HCA 20" },
    };
    expect(kinds(full, "Smith v Jones [2020] HCA 20")).not.toContain("overused_number");
  });

  it("asks for the other authors when the input says 'et al' (r 4.1.2), without a stray-words warning", () => {
    const input =
      "Geoffrey J Leonardelli et al, 'Multiple Equivalent Simultaneous Offers (MESOs) Reduce the Negotiator Dilemma: How a Choice of First Offers Increases Economic and Relational Outcomes' (2019) 152 Organizational Behavior and Human Decision Processes 64.";
    const c: ParseCandidate = {
      sourceType: "journal.article",
      data: {
        authors: [{ givenNames: "Geoffrey J", surname: "Leonardelli" }],
        title:
          "Multiple Equivalent Simultaneous Offers (MESOs) Reduce the Negotiator Dilemma: How a Choice of First Offers Increases Economic and Relational Outcomes",
        year: "2019",
        volume: "152",
        journal: "Organizational Behavior and Human Decision Processes",
        startingPage: "64",
      },
    };
    const issues = checkParse(input, c).issues;
    expect(issues.map((i) => i.kind)).toContain("et_al_authors");
    expect(issues.map((i) => i.kind)).not.toContain("uncovered_text");
    const four = {
      ...c,
      data: {
        ...c.data,
        authors: [
          { givenNames: "Geoffrey J", surname: "Leonardelli" },
          { givenNames: "A", surname: "Two" },
          { givenNames: "B", surname: "Three" },
          { givenNames: "C", surname: "Four" },
        ],
      },
    };
    expect(kinds(four, input)).not.toContain("et_al_authors");
  });

  it("flags RePEc's '(C)' volume placeholder stored as an issue", () => {
    const input =
      'Leonardelli, Geoffrey J. & Gu, Jun & McRuer, Geordie & Medvec, Victoria Husted & Galinsky, Adam D., 2019. "Multiple equivalent simultaneous offers (MESOs) reduce the negotiator dilemma: How a choice of first offers increases economic and relational outcomes," Organizational Behavior and Human Decision Processes, Elsevier, vol. 152(C), pages 64-83.';
    const data = {
      authors: [
        { givenNames: "Geoffrey J", surname: "Leonardelli" },
        { givenNames: "Jun", surname: "Gu" },
        { givenNames: "Geordie", surname: "McRuer" },
        { givenNames: "Victoria Husted", surname: "Medvec" },
        { givenNames: "Adam D", surname: "Galinsky" },
      ],
      title:
        "Multiple Equivalent Simultaneous Offers (MESOs) Reduce the Negotiator Dilemma: How a Choice of First Offers Increases Economic and Relational Outcomes",
      year: "2019",
      volume: "152",
      journal: "Organizational Behavior and Human Decision Processes",
      startingPage: "64",
    };
    expect(
      kinds({ sourceType: "journal.article", data: { ...data, issue: "C" } }, input)
    ).toContain("placeholder_issue");
    expect(kinds({ sourceType: "journal.article", data }, input)).not.toContain(
      "placeholder_issue"
    );
  });

  it("notes a missing issue number (r 5.4) without blocking (Mnookin)", () => {
    const input =
      "Robert H Mnookin, 'Why Negotiations Fail: An Exploration of Barriers to the Resolution of Conflict' (1993) 8 Ohio State Journal on Dispute Resolution 235.";
    const c: ParseCandidate = {
      sourceType: "journal.article",
      data: {
        authors: [{ givenNames: "Robert H", surname: "Mnookin" }],
        title: "Why Negotiations Fail: An Exploration of Barriers to the Resolution of Conflict",
        year: "1993",
        volume: "8",
        journal: "Ohio State Journal on Dispute Resolution",
        startingPage: "235",
      },
    };
    const issue = checkParse(input, c).issues.find((i) => i.kind === "missing_issue");
    expect(issue?.severity).toBe("info");
    expect(kinds({ ...c, data: { ...c.data, issue: "2" } }, input)).not.toContain("missing_issue");
  });

  it("reports input text that reached no field, signal or commentary", () => {
    const input = `See ${MABO} (emphasis added)`;
    const c: ParseCandidate = { sourceType: "case.reported", data: maboData };
    const issue = checkParse(input, c).issues.find((i) => i.kind === "uncovered_text");
    expect(issue?.message).toMatch(/emphasis, added/);
    const decided = { ...c, signal: "See" as const, commentaryAfter: "(emphasis added)" };
    expect(kinds(decided, input)).not.toContain("uncovered_text");
  });

  it("briefs the model from the engine's field contract", () => {
    const brief = buildTypeBrief("book.chapter");
    expect(brief).toMatch(/AGLC4 r 6\.6/);
    expect(brief).toMatch(/bookTitle/);
    expect(brief).toMatch(/Required fields/);
  });
});

describe("verifyParse loop (LCT-010)", () => {
  it("always runs one verification round and applies the model's decisions", async () => {
    const input = `See ${MABO}`;
    mockMulti.mockResolvedValueOnce(
      reply({
        confirmed: true,
        sourceType: "case.reported",
        data: maboData,
        signal: "See",
        shortTitle: "Mabo",
      })
    );
    const r = await verifyParse(input, { sourceType: "case.reported", data: maboData }, config);
    expect(mockMulti).toHaveBeenCalledTimes(1);
    const prompt = mockMulti.mock.calls[0][1].map((m) => m.content).join("\n");
    expect(prompt).toMatch(/Required fields/);
    expect(prompt).toMatch(/uncovered|missing from the result/i);
    expect(r.signal).toBe("See");
    expect(r.verification).toMatchObject({ rounds: 1, confirmed: true });
    expect(r.warnings).toEqual([]);
  });

  it("does not accept a confirmation while an invented number remains", async () => {
    const invented = { ...maboData, year: "1993" };
    mockMulti.mockResolvedValue(
      reply({ confirmed: true, sourceType: "case.reported", data: invented })
    );
    const r = await verifyParse(MABO, { sourceType: "case.reported", data: invented }, config);
    expect(mockMulti).toHaveBeenCalledTimes(2);
    expect(r.verification.confirmed).toBe(false);
    expect(r.warnings.join(" ")).toMatch(/1993.*isn't in the input/);
    expect(r.data.year).toBe("1993"); // warned, never blanked, in the interactive flow
  });

  it("lets the model switch type, and briefs it on the new type", async () => {
    const input = "Donoghue v Stevenson [1932] AC 562";
    mockMulti.mockResolvedValueOnce(
      reply({
        confirmed: true,
        sourceType: "case.reported",
        data: {
          party1: "Donoghue",
          party2: "Stevenson",
          yearType: "square",
          year: "1932",
          reportSeries: "AC",
          startingPage: "562",
        },
      })
    );
    const r = await verifyParse(
      input,
      {
        sourceType: "case.unreported.mnc",
        data: {
          party1: "Donoghue",
          party2: "Stevenson",
          year: "1932",
          court: "AC",
          caseNumber: "562",
        },
      },
      config
    );
    expect(mockMulti.mock.calls[0][1][1].content).toMatch(/report series, not a court identifier/);
    expect(r.sourceType).toBe("case.reported");
    expect(r.verification.confirmed).toBe(true);
    expect(r.verification.rendered).toMatch(/\[1932\] AC 562/);
  });

  it("keeps the better record when a later round is worse", async () => {
    mockMulti
      .mockResolvedValueOnce(
        reply({ confirmed: false, sourceType: "case.reported", data: maboData })
      )
      .mockResolvedValueOnce(
        reply({
          confirmed: false,
          sourceType: "case.reported",
          data: { party1: "Mabo", year: "1999" },
        })
      );
    const r = await verifyParse(MABO, { sourceType: "case.reported", data: maboData }, config);
    expect(r.data).toEqual(maboData);
  });

  it("accepts an explanation for an explainable issue as a note", async () => {
    const input = "Mabo v Queensland [No 2] (1992) 175 C.L.R. 1, 42";
    mockMulti.mockImplementation(async (_c, messages) => {
      expect(messages[1].content).toMatch(/uncovered_text \[warning\] Input text missing/);
      return reply({
        confirmed: true,
        sourceType: "case.reported",
        data: maboData,
        explanations: {
          uncovered_text: "C.L.R. is the dotted form of CLR; AGLC4 omits full stops.",
        },
      });
    });
    const r = await verifyParse(input, { sourceType: "case.reported", data: maboData }, config);
    expect(r.verification.confirmed).toBe(true);
    expect(r.warnings).toEqual([]);
    expect(r.notes.join(" ")).toMatch(/dotted form/);
  });

  it("keeps an explanation on the issue it names when a fix renumbers the others", async () => {
    // Round 1 has a missing required field AND uncovered text. The model fixes
    // the field and explains the text; the explanation must still land.
    const input = "Mabo v Queensland [No 2] (1992) 175 C.L.R. 1, 42";
    const { reportSeries: _omit, ...withoutSeries } = maboData;
    mockMulti.mockResolvedValueOnce(
      reply({
        confirmed: true,
        sourceType: "case.reported",
        data: maboData,
        explanations: { uncovered_text: "C.L.R. is the dotted form of CLR." },
      })
    );
    const r = await verifyParse(
      input,
      { sourceType: "case.reported", data: withoutSeries },
      config
    );
    expect(r.verification.confirmed).toBe(true);
    expect(r.warnings).toEqual([]);
  });

  it("never lets the model explain away a record Obiter can't format", () => {
    const issues = checkParse(MABO, {
      sourceType: "case.reported",
      data: { ...maboData, party1: { bad: true } as unknown as string },
    }).issues;
    const failed = issues.find((i) => i.kind === "render_failed");
    if (failed) expect(failed.severity).toBe("warning");
  });

  it("normalises a signal to the r 1.2 list and drops one that isn't on it", async () => {
    const input = `See ${MABO}`;
    mockMulti.mockResolvedValueOnce(
      reply({ confirmed: true, sourceType: "case.reported", data: maboData, signal: "see" })
    );
    const ok = await verifyParse(input, { sourceType: "case.reported", data: maboData }, config);
    expect(ok.signal).toBe("See");

    mockMulti.mockResolvedValue(
      reply({ confirmed: true, sourceType: "case.reported", data: maboData, signal: "Compare" })
    );
    const bad = await verifyParse(input, { sourceType: "case.reported", data: maboData }, config);
    expect(bad.signal).toBeUndefined();
    // The invalid-signal record ranks worse than the first parse, which is
    // kept: its remaining warning is the uncaptured "See".
    expect(bad.warnings.join(" ")).toMatch(/missing from the result: see/);
    expect(
      checkParse(input, {
        sourceType: "case.reported",
        data: maboData,
        signal: "Compare" as never,
      }).issues.map((i) => i.kind)
    ).toContain("invalid_signal");
  });

  it("keeps the short title when the model returns it empty (r 1.4.4 is Obiter's call)", async () => {
    mockMulti.mockResolvedValueOnce(
      reply({ confirmed: true, sourceType: "case.reported", data: maboData, shortTitle: "" })
    );
    const r = await verifyParse(
      MABO,
      { sourceType: "case.reported", data: maboData, shortTitle: "Mabo" },
      config
    );
    expect(r.shortTitle).toBe("Mabo");
    const prompt = mockMulti.mock.calls[0][1][0].content;
    expect(prompt).toMatch(/never remove a short title/);
  });

  it("recovers JSON wrapped in prose or fences, including braces inside strings", () => {
    expect(
      JSON.parse(extractJsonObject('Here you go:\n```json\n{"a":"x}y","b":{"c":1}}\n```'))
    ).toEqual({
      a: "x}y",
      b: { c: 1 },
    });
    expect(() => extractJsonObject('{"confirmed": true, "data": {"title": "Getting')).toThrow(
      /incomplete/
    );
  });

  it("repairs a truncated reply once, with at least 2,048 output tokens (Getting to Yes)", async () => {
    const input =
      "Roger Fisher, William Ury and Bruce Patton, Getting to Yes: Negotiating Agreement Without Giving In (Random House, 3rd ed, 2012) ch 6";
    const book = {
      authors: [
        { givenNames: "Roger", surname: "Fisher" },
        { givenNames: "William", surname: "Ury" },
        { givenNames: "Bruce", surname: "Patton" },
      ],
      title: "Getting to Yes: Negotiating Agreement Without Giving In",
      publisher: "Random House",
      edition: "3",
      year: "2012",
      pinpoint: "ch 6",
    };
    mockMulti
      .mockResolvedValueOnce(
        '{"confirmed": true, "sourceType": "book", "data": {"authors": [{"givenNames": "Rog'
      )
      .mockResolvedValueOnce(reply({ confirmed: true, sourceType: "book", data: book }));
    const r = await verifyParse(
      input,
      { sourceType: "book", data: book, shortTitle: "Getting to Yes" },
      config
    );
    expect(mockMulti).toHaveBeenCalledTimes(2);
    expect(mockMulti.mock.calls[0][0].maxTokens).toBeGreaterThanOrEqual(2048);
    expect(mockMulti.mock.calls[1][1].at(-1)?.content).toMatch(/only the JSON object/);
    expect(r.verification.confirmed).toBe(true);
    expect(r.warnings).toEqual([]);
  });

  it("shows what the model left out as a note", async () => {
    mockMulti.mockResolvedValueOnce(
      reply({
        confirmed: true,
        sourceType: "case.reported",
        data: maboData,
        omitted: [{ text: "The Monthly Newsletter", reason: "journal subtitle, r 5.5" }],
      })
    );
    const r = await verifyParse(MABO, { sourceType: "case.reported", data: maboData }, config);
    expect(r.notes).toContain("Left out: 'The Monthly Newsletter' (journal subtitle, r 5.5).");
  });

  it("drops fields the type doesn't have, with a note", async () => {
    mockMulti.mockResolvedValueOnce(
      reply({ confirmed: true, sourceType: "case.reported", data: { ...maboData, flavour: "x" } })
    );
    const r = await verifyParse(MABO, { sourceType: "case.reported", data: maboData }, config);
    expect(r.data).not.toHaveProperty("flavour");
    expect(r.notes.join(" ")).toMatch(/Dropped flavour/);
  });

  it("shows the start of an unreadable reply in the notes (Mnookin)", async () => {
    const input =
      "Robert H Mnookin, 'Why Negotiations Fail: An Exploration of Barriers to the Resolution of Conflict' (1993) 8 Ohio State Journal on Dispute Resolution 235.";
    mockMulti.mockResolvedValue("I have checked the record and it looks correct.");
    const r = await verifyParse(
      input,
      { sourceType: "journal.article", data: { title: "Why Negotiations Fail" } },
      config
    );
    expect(mockMulti).toHaveBeenCalledTimes(2);
    expect(r.warnings.join(" ")).toMatch(/wasn't valid JSON/);
    expect(r.notes.join(" ")).toMatch(/it began: "I have checked the record/);
  });

  it("returns the initial parse with a warning when the model fails", async () => {
    mockMulti.mockRejectedValueOnce(new Error("rate limited"));
    const r = await verifyParse(MABO, { sourceType: "case.reported", data: maboData }, config);
    expect(r.data).toEqual(maboData);
    expect(r.warnings.join(" ")).toMatch(/didn't finish \(rate limited\)/);
  });
});

describe("parseCitationText runs the loop", () => {
  it("parses, verifies and returns the decided pinpoint, signal and commentary", async () => {
    const input = `See ${MABO} (emphasis added)`;
    mockSingle.mockResolvedValueOnce(
      reply({
        standard: "aglc4",
        sourceType: "case.reported",
        data: { ...maboData, pinpoint: "" },
        confidence: 0.9,
      })
    );
    mockMulti.mockResolvedValueOnce(
      reply({
        confirmed: true,
        sourceType: "case.reported",
        data: maboData,
        signal: "See",
        commentaryAfter: "(emphasis added)",
      })
    );
    const r = await parseCitationText(input, config);
    expect(r.data.pinpoint).toBe("42");
    expect(r.signal).toBe("See");
    expect(r.commentaryAfter).toBe("(emphasis added)");
    expect(r.verification?.confirmed).toBe(true);
  });

  it("skips the loop when asked", async () => {
    mockSingle.mockResolvedValueOnce(
      reply({ sourceType: "case.reported", data: maboData, confidence: 0.9 })
    );
    const r = await parseCitationText(MABO, config, { verify: false });
    expect(mockMulti).not.toHaveBeenCalled();
    expect(r.warnings).toEqual([]);
  });
});

describe("parseWithCorpusFirst multi-turn path runs the loop", () => {
  it("classifies, extracts, then verifies before returning", async () => {
    const input = "See Mark Leeming, Authority to Decide (Federation Press, 2nd ed, 2020) 42";
    const book = {
      authors: [{ givenNames: "Mark", surname: "Leeming" }],
      title: "Authority to Decide",
      publisher: "Federation Press",
      edition: "2nd",
      year: "2020",
      pinpoint: "42",
    };
    mockMulti
      .mockResolvedValueOnce(reply({ candidates: [{ sourceType: "book", confidence: 0.9 }] }))
      .mockResolvedValueOnce(reply({ sourceType: "book", data: book }))
      .mockResolvedValueOnce(
        reply({ confirmed: true, sourceType: "book", data: book, signal: "See" })
      );
    const res = await parseWithCorpusFirst(input, "book", config);
    expect(mockMulti).toHaveBeenCalledTimes(3);
    expect(res.source).toBe("llm");
    expect(res.signal).toBe("See");
    expect(res.verification?.confirmed).toBe(true);
    expect(res.warnings).toEqual([]);
  });
});
