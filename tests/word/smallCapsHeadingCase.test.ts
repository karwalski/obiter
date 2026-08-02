import { toSmallCapsHeadingCase, cleanHeadingBody } from "../../src/word/styles";

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

describe("cleanHeadingBody", () => {
  it("strips a Markdown ATX marker and a mistrusted number (the example)", () => {
    expect(cleanHeadingBody("## III Statutory Framework and Governing Principles", 1)).toBe(
      "Statutory Framework and Governing Principles"
    );
  });

  it("strips the target level's own enumerator", () => {
    expect(cleanHeadingBody("I Introduction", 1)).toBe("Introduction");
    expect(cleanHeadingBody("IV Analysis", 1)).toBe("Analysis");
    expect(cleanHeadingBody("A Overview", 2)).toBe("Overview");
    expect(cleanHeadingBody("3 Arguments", 3)).toBe("Arguments");
    expect(cleanHeadingBody("(a) First point", 4)).toBe("First point");
    expect(cleanHeadingBody("(iv) Sub-point", 5)).toBe("Sub-point");
  });

  it("strips a stale enumerator that does not match the selected level", () => {
    // Roman number pasted, but applied as Level III (Arabic) — do not trust it.
    expect(cleanHeadingBody("## III Statutory Framework", 3)).toBe("Statutory Framework");
    // Arabic pasted, applied as Level I.
    expect(cleanHeadingBody("## 3. Overview", 1)).toBe("Overview");
    // Parenthesised numeral pasted, applied as Level III.
    expect(cleanHeadingBody("## (i) Detail", 3)).toBe("Detail");
  });

  it("tolerates a trailing dot or paren after the number", () => {
    expect(cleanHeadingBody("III. Framework", 1)).toBe("Framework");
    expect(cleanHeadingBody("3) Arguments", 3)).toBe("Arguments");
  });

  it("does NOT strip heading text that merely starts with Roman letters", () => {
    // "CIVIL" is all Roman-numeral letters but not a valid numeral.
    expect(cleanHeadingBody("CIVIL Procedure", 1)).toBe("CIVIL Procedure");
    expect(cleanHeadingBody("MILL Litigation", 1)).toBe("MILL Litigation");
  });

  it("does NOT strip a bare single letter that is real heading text", () => {
    // Not the target level's format and ambiguous — leave it.
    expect(cleanHeadingBody("A New Approach", 1)).toBe("A New Approach");
    expect(cleanHeadingBody("I Object to the Ruling", 3)).toBe("I Object to the Ruling");
  });

  it("strips a Markdown marker alone when there is no number", () => {
    expect(cleanHeadingBody("## Background", 1)).toBe("Background");
    expect(cleanHeadingBody("### Reasons", 2)).toBe("Reasons");
  });

  it("leaves an already-clean title unchanged", () => {
    expect(cleanHeadingBody("Statutory Framework", 1)).toBe("Statutory Framework");
  });

  it("is idempotent", () => {
    const once = cleanHeadingBody("## III Statutory Framework", 1);
    expect(cleanHeadingBody(once, 1)).toBe(once);
  });
});
