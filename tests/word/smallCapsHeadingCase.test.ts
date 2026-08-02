import { toSmallCapsHeadingCase } from "../../src/word/styles";

// Level I headings are small-capped (AGLC4 Rule 1.12.2). Word only renders
// lower-case letters as small capitals, so ALL-CAPS body text must be title-
// cased for the effect to show. See toSmallCapsHeadingCase.
describe("toSmallCapsHeadingCase", () => {
  it("title-cases a single all-caps word so small caps renders", () => {
    expect(toSmallCapsHeadingCase("BACKGROUND")).toBe("Background");
  });

  it("lower-cases minor words but not the first or last word", () => {
    expect(toSmallCapsHeadingCase("STATEMENT OF CLAIM")).toBe("Statement of Claim");
    expect(toSmallCapsHeadingCase("THE ROLE OF THE COURT")).toBe("The Role of the Court");
  });

  it("always capitalises the last word even if it is a minor word", () => {
    expect(toSmallCapsHeadingCase("MATTERS TO")).toBe("Matters To");
  });

  it("respects deliberate casing when any lower-case letter is present", () => {
    expect(toSmallCapsHeadingCase("Background")).toBe("Background");
    expect(toSmallCapsHeadingCase("Background to the Dispute")).toBe("Background to the Dispute");
    expect(toSmallCapsHeadingCase("iPhone Litigation")).toBe("iPhone Litigation");
  });

  it("is idempotent — converting twice yields the same result", () => {
    const once = toSmallCapsHeadingCase("STATEMENT OF CLAIM");
    expect(toSmallCapsHeadingCase(once)).toBe(once);
  });

  it("preserves punctuation and whitespace", () => {
    expect(toSmallCapsHeadingCase("FACTS, EVIDENCE AND FINDINGS")).toBe(
      "Facts, Evidence and Findings"
    );
  });

  it("leaves text with no cased letters unchanged", () => {
    expect(toSmallCapsHeadingCase("1.2.3")).toBe("1.2.3");
    expect(toSmallCapsHeadingCase("")).toBe("");
  });
});
