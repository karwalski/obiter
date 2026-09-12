/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * INTEROP-002: name forms of each interchange format <-> creators <-> Author.
 */

import {
  authorToCreator,
  creatorToAuthor,
  formatBibTeXName,
  formatCommaName,
  formatCslName,
  joinCreatorsAsText,
  looksLikeBody,
  parseBibTeXName,
  parseCommaName,
  parseCslName,
  splitBibTeXNames,
} from "../../../src/api/interchange/mapper/names";

describe("parseCommaName (RIS / EndNote)", () => {
  test("Last, First, Suffix", () => {
    expect(parseCommaName("Phillips, Albert John, Jr", "author")).toMatchObject({
      family: "Phillips",
      given: "Albert John",
      suffix: "Jr",
    });
    expect(parseCommaName("Phillips,A.J.,Sr.", "author")).toMatchObject({
      family: "Phillips",
      given: "A.J.",
      suffix: "Sr",
    });
  });

  test("natural order and particles", () => {
    expect(parseCommaName("William van de Pol", "author")).toMatchObject({
      family: "van de Pol",
      given: "William",
    });
    expect(parseCommaName("John G Roberts Jr", "author")).toMatchObject({
      family: "Roberts",
      given: "John G",
      suffix: "Jr",
    });
  });

  test("bodies become literals", () => {
    expect(parseCommaName("Australian Law Reform Commission", "author")).toMatchObject({
      literal: "Australian Law Reform Commission",
    });
    expect(parseCommaName("Deloitte", "author")).toMatchObject({ literal: "Deloitte" });
    expect(looksLikeBody("Anonymous 10")).toBe(true);
    expect(looksLikeBody("Harold Luntz")).toBe(false);
  });
});

describe("BibTeX names", () => {
  test("splits on and outside braces", () => {
    expect(splitBibTeXNames("Edelman, James and Bant, Elise")).toEqual([
      "Edelman, James",
      "Bant, Elise",
    ]);
    expect(splitBibTeXNames("{Law Council of Australia and Friends} and Smith, Jane")).toEqual([
      "{Law Council of Australia and Friends}",
      "Smith, Jane",
    ]);
  });

  test("the three BibTeX forms and corporate braces", () => {
    expect(parseBibTeXName("Ludwig van Beethoven", "author")).toMatchObject({
      family: "van Beethoven",
      given: "Ludwig",
    });
    expect(parseBibTeXName("van Beethoven, Ludwig", "author")).toMatchObject({
      family: "van Beethoven",
      given: "Ludwig",
    });
    expect(parseBibTeXName("Roberts, Jr, John G", "author")).toMatchObject({
      family: "Roberts",
      suffix: "Jr",
      given: "John G",
    });
    expect(parseBibTeXName("{Australian Law Reform Commission}", "author")).toMatchObject({
      literal: "Australian Law Reform Commission",
    });
    expect(parseBibTeXName("others", "author")).toMatchObject({ literal: "others" });
  });

  test("formats back to BibTeX", () => {
    expect(
      formatBibTeXName({
        role: "author",
        raw: "",
        family: "Roberts",
        given: "John G",
        suffix: "Jr",
      })
    ).toBe("Roberts, Jr, John G");
    expect(formatBibTeXName({ role: "author", raw: "", literal: "ALRC" })).toBe("{ALRC}");
  });
});

describe("CSL names", () => {
  test("family/given/particles and literal", () => {
    expect(
      parseCslName({ family: "Pol", given: "William", "non-dropping-particle": "van de" }, "author")
    ).toMatchObject({
      family: "van de Pol",
      given: "William",
    });
    expect(parseCslName({ literal: "High Court of Australia" }, "author")).toMatchObject({
      literal: "High Court of Australia",
    });
    expect(formatCslName({ role: "author", raw: "", family: "Luntz", given: "Harold" })).toEqual({
      family: "Luntz",
      given: "Harold",
    });
  });
});

describe("Author conversion", () => {
  test("creator <-> Author round trip", () => {
    const creator = parseCommaName("Luntz, Harold", "author");
    const author = creatorToAuthor(creator);
    expect(author).toEqual({ givenNames: "Harold", surname: "Luntz" });
    expect(authorToCreator(author, "author")).toMatchObject({ family: "Luntz", given: "Harold" });
  });

  test("bodies round trip as a surname-only Author", () => {
    const author = creatorToAuthor({
      role: "author",
      raw: "",
      literal: "Law Council of Australia",
    });
    expect(author).toEqual({ givenNames: "", surname: "Law Council of Australia" });
    expect(authorToCreator(author, "author")).toMatchObject({
      literal: "Law Council of Australia",
    });
  });

  test("comma and joined text forms", () => {
    const a = parseCommaName("Edelman, James", "author");
    const b = parseCommaName("Bant, Elise", "author");
    expect(formatCommaName(a)).toBe("Edelman, James");
    expect(formatCommaName({ role: "author", raw: "", family: "Roberts", suffix: "Jr" })).toBe(
      "Roberts, , Jr"
    );
    expect(joinCreatorsAsText([a, b])).toBe("James Edelman and Elise Bant");
  });
});
