/**
 * AGLC4 Rule 5.4: the issue number follows the volume ('81(4)') where the
 * journal has one. Field report 27 Sep 2026: Galinsky and Mussweiler (2001)
 * 81 JPSP 657 should be 81(4).
 */
import { checkJournalIssue, isJournalIssueMissing } from "../../src/engine/validator";
import type { Citation } from "../../src/types/citation";

const galinsky = {
  id: "g",
  aglcVersion: "4",
  sourceType: "journal.article",
  tags: [],
  createdAt: "",
  modifiedAt: "",
  data: {
    authors: [
      { givenNames: "Adam D", surname: "Galinsky" },
      { givenNames: "Thomas", surname: "Mussweiler" },
    ],
    title: "First Offers as Anchors: The Role of Perspective-Taking and Negotiator Focus",
    year: 2001,
    volume: 81,
    journal: "Journal of Personality and Social Psychology",
    startingPage: 657,
  },
} as unknown as Citation;

describe("Rule 5.4 issue-number hint", () => {
  it("flags a journal article with a volume and no issue, as info", () => {
    const issues = checkJournalIssue(galinsky);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ ruleNumber: "5.4", severity: "info", citationId: "g" });
  });

  it("is silent once the issue is present, and for year-organised or non-journal sources", () => {
    expect(
      checkJournalIssue({ ...galinsky, data: { ...galinsky.data, issue: 4 } } as Citation)
    ).toEqual([]);
    expect(isJournalIssueMissing("journal.article", { year: "2000" })).toBe(false);
    expect(isJournalIssueMissing("book", { volume: "2" })).toBe(false);
  });
});
