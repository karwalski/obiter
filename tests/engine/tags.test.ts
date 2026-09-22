/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * ENP-001: the pure tag helpers — system-tag detection, normalisation and
 * the user/system split that the editor and the exporter rely on.
 */

import {
  MAX_TAG_LENGTH,
  isSystemTag,
  normaliseTag,
  normaliseTags,
  systemTags,
  userTags,
  withUserTags,
} from "../../src/engine/tags";

describe("isSystemTag", () => {
  test.each([
    "import",
    "import:ris",
    "import:needs-details",
    "imported-from-bibtex",
    "imported-from-word",
    "waitangi_tribunal",
    "dedupe:merged",
  ])("%s is a system tag", (tag) => {
    expect(isSystemTag(tag)).toBe(true);
  });

  test.each(["contract", "remedies", "importance", "imports", "dedupe", "waitangi"])(
    "%s is a user tag",
    (tag) => {
      expect(isSystemTag(tag)).toBe(false);
    }
  );
});

describe("userTags and systemTags", () => {
  const tags = ["import", "contract", "import:ris", "remedies", "waitangi_tribunal"];

  test("split the stored array in order", () => {
    expect(userTags(tags)).toEqual(["contract", "remedies"]);
    expect(systemTags(tags)).toEqual(["import", "import:ris", "waitangi_tribunal"]);
  });
});

describe("normaliseTag", () => {
  test("trims, lower-cases and collapses inner whitespace", () => {
    expect(normaliseTag("  Contract   Law \t")).toBe("contract law");
  });

  test("turns list separators into spaces", () => {
    expect(normaliseTag("contract, remedies;")).toBe("contract remedies");
  });

  test("caps at the maximum length", () => {
    const long = "a".repeat(MAX_TAG_LENGTH + 10);
    expect(normaliseTag(long)).toHaveLength(MAX_TAG_LENGTH);
  });

  test("drops empty and system-shaped values", () => {
    expect(normaliseTag("   ")).toBeUndefined();
    expect(normaliseTag("")).toBeUndefined();
    expect(normaliseTag("Import")).toBeUndefined();
    expect(normaliseTag("import:ris")).toBeUndefined();
  });
});

describe("normaliseTags", () => {
  test("normalises each value and removes duplicates and empties", () => {
    expect(normaliseTags(["Contract", "contract ", "", "Remedies", "REMEDIES"])).toEqual([
      "contract",
      "remedies",
    ]);
  });
});

describe("withUserTags", () => {
  test("keeps system tags in place and puts the normalised user tags after them", () => {
    expect(withUserTags(["import", "old", "import:ris"], ["New", "Other"])).toEqual([
      "import",
      "import:ris",
      "new",
      "other",
    ]);
  });

  test("an empty user list leaves only the system tags", () => {
    expect(withUserTags(["contract", "waitangi_tribunal"], [])).toEqual(["waitangi_tribunal"]);
  });
});
