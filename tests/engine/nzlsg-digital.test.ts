/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * NZLSG digital/media formatter tests — NZLSG-ENH-004 and NZLSG-ENH-005.
 */

import {
  formatNZWebsite,
  formatNZBlog,
  formatNZSocialMedia,
  formatNZNewspaper,
  formatNZBroadcast,
} from "../../src/engine/rules/nzlsg/digital";
import type { FormattedRun } from "../../src/types/formattedRun";

/** Helper: join run texts for easy assertion. */
function runsToText(runs: FormattedRun[]): string {
  return runs.map((r) => r.text).join("");
}

/** Helper: find the run containing a substring and check if italic. */
function isTextItalic(runs: FormattedRun[], substring: string): boolean {
  const run = runs.find((r) => r.text.includes(substring));
  return run?.italic === true;
}

// =============================================================================
// 1. NZLSG-ENH-004: Website (formatNZWebsite)
// =============================================================================

describe("NZLSG Digital — formatNZWebsite", () => {
  test("JSDoc example: full website citation", () => {
    const runs = formatNZWebsite({
      author: "John Smith",
      title: "Legal Aid in New Zealand",
      year: 2024,
      website: "Ministry of Justice",
      url: "https://example.govt.nz/legal-aid",
    });
    expect(runsToText(runs)).toBe(
      'John Smith \u201CLegal Aid in New Zealand\u201D (2024) Ministry of Justice <https://example.govt.nz/legal-aid>'
    );
  });

  test("website with pinpoint", () => {
    const runs = formatNZWebsite({
      author: "Jane Doe",
      title: "Court Procedures",
      year: 2023,
      website: "Courts of NZ",
      url: "https://example.co.nz",
      pinpoint: "para 5",
    });
    expect(runsToText(runs)).toContain("at para 5");
  });

  test("website without author", () => {
    const runs = formatNZWebsite({
      title: "About Us",
      year: 2024,
      website: "Ministry of Justice",
    });
    const text = runsToText(runs);
    expect(text).toBe(
      '\u201CAbout Us\u201D (2024) Ministry of Justice'
    );
  });

  test("website without year", () => {
    const runs = formatNZWebsite({
      author: "Test Author",
      title: "Test Title",
      website: "Test Site",
    });
    const text = runsToText(runs);
    expect(text).not.toContain("(");
    expect(text).toContain("Test Site");
  });

  test("website without URL", () => {
    const runs = formatNZWebsite({
      author: "Test",
      title: "Test",
      year: 2024,
      website: "Site",
    });
    expect(runsToText(runs)).not.toContain("<");
  });

  test("title uses double curly quotes (U+201C/U+201D)", () => {
    const runs = formatNZWebsite({ title: "My Title" });
    const text = runsToText(runs);
    expect(text).toContain("\u201C");
    expect(text).toContain("\u201D");
  });

  test("minimal website — title only", () => {
    const runs = formatNZWebsite({ title: "Bare Title" });
    expect(runsToText(runs)).toBe('\u201CBare Title\u201D');
  });
});

// =============================================================================
// 2. NZLSG-ENH-004: Blog (formatNZBlog)
// =============================================================================

describe("NZLSG Digital — formatNZBlog", () => {
  test("JSDoc example: full blog citation", () => {
    const runs = formatNZBlog({
      author: "Andrew Geddis",
      title: "The Bill of Rights and Parliament",
      date: "15 March 2024",
      blogName: "Pundit",
      url: "https://example.com",
    });
    expect(runsToText(runs)).toBe(
      'Andrew Geddis \u201CThe Bill of Rights and Parliament\u201D (15 March 2024) Pundit <https://example.com>'
    );
  });

  test("blog without URL", () => {
    const runs = formatNZBlog({
      author: "Test Author",
      title: "Test Post",
      date: "1 January 2024",
      blogName: "Test Blog",
    });
    const text = runsToText(runs);
    expect(text).toBe(
      'Test Author \u201CTest Post\u201D (1 January 2024) Test Blog'
    );
    expect(text).not.toContain("<");
  });

  test("blog with pinpoint", () => {
    const runs = formatNZBlog({
      author: "Author",
      title: "Title",
      date: "1 Jan 2024",
      blogName: "Blog",
      pinpoint: "para 3",
    });
    expect(runsToText(runs)).toContain("at para 3");
  });

  test("title uses double curly quotes", () => {
    const runs = formatNZBlog({
      author: "A",
      title: "B",
      date: "1 Jan 2024",
      blogName: "C",
    });
    const text = runsToText(runs);
    expect(text).toContain("\u201CB\u201D");
  });
});

// =============================================================================
// 3. NZLSG-ENH-004: Social Media (formatNZSocialMedia)
// =============================================================================

describe("NZLSG Digital — formatNZSocialMedia", () => {
  test("full social media citation with handle", () => {
    const runs = formatNZSocialMedia({
      author: "Andrew Little",
      handle: "@AndrewLittleMP",
      content: "Justice reforms announced today",
      platform: "Twitter",
      date: "15 March 2024",
      url: "https://twitter.com/example",
    });
    expect(runsToText(runs)).toBe(
      'Andrew Little (@AndrewLittleMP) \u201CJustice reforms announced today\u201D (Twitter, 15 March 2024) <https://twitter.com/example>'
    );
  });

  test("social media without handle", () => {
    const runs = formatNZSocialMedia({
      author: "Ministry of Justice",
      content: "New court hours",
      platform: "Facebook",
      date: "1 April 2024",
    });
    const text = runsToText(runs);
    expect(text).toBe(
      'Ministry of Justice \u201CNew court hours\u201D (Facebook, 1 April 2024)'
    );
  });

  test("social media without URL", () => {
    const runs = formatNZSocialMedia({
      author: "Test",
      content: "Test content",
      platform: "Instagram",
      date: "1 Jan 2024",
    });
    expect(runsToText(runs)).not.toContain("<");
  });

  test("content uses double curly quotes", () => {
    const runs = formatNZSocialMedia({
      author: "A",
      content: "Some text",
      platform: "X",
      date: "1 Jan 2024",
    });
    const text = runsToText(runs);
    expect(text).toContain("\u201CSome text\u201D");
  });

  test("platform and date in parentheses", () => {
    const runs = formatNZSocialMedia({
      author: "A",
      content: "B",
      platform: "LinkedIn",
      date: "5 May 2024",
    });
    expect(runsToText(runs)).toContain("(LinkedIn, 5 May 2024)");
  });
});

// =============================================================================
// 4. NZLSG-ENH-005: Newspaper (formatNZNewspaper)
// =============================================================================

describe("NZLSG Digital — formatNZNewspaper", () => {
  test("JSDoc example: full newspaper citation", () => {
    const runs = formatNZNewspaper({
      author: "Jane Doe",
      title: "Courts Face Backlog",
      newspaper: "The New Zealand Herald",
      place: "Auckland",
      date: "15 March 2024",
      pinpoint: "A3",
    });
    expect(runsToText(runs)).toBe(
      'Jane Doe \u201CCourts Face Backlog\u201D The New Zealand Herald (Auckland, 15 March 2024) at A3'
    );
  });

  test("newspaper name is italic", () => {
    const runs = formatNZNewspaper({
      title: "Test",
      newspaper: "The Dominion Post",
      date: "1 Jan 2024",
    });
    expect(isTextItalic(runs, "The Dominion Post")).toBe(true);
  });

  test("newspaper without author", () => {
    const runs = formatNZNewspaper({
      title: "Editorial: Reform Needed",
      newspaper: "The Press",
      place: "Christchurch",
      date: "10 June 2024",
    });
    const text = runsToText(runs);
    expect(text).toBe(
      '\u201CEditorial: Reform Needed\u201D The Press (Christchurch, 10 June 2024)'
    );
  });

  test("newspaper without place", () => {
    const runs = formatNZNewspaper({
      author: "Test",
      title: "Test Article",
      newspaper: "Stuff",
      date: "1 Jan 2024",
    });
    expect(runsToText(runs)).toContain("(1 Jan 2024)");
    expect(runsToText(runs)).not.toContain("(,");
  });

  test("newspaper without pinpoint", () => {
    const runs = formatNZNewspaper({
      title: "Headline",
      newspaper: "NZ Herald",
      date: "1 Jan 2024",
    });
    expect(runsToText(runs)).not.toContain("at");
  });

  test("title uses double curly quotes", () => {
    const runs = formatNZNewspaper({
      title: "My Article",
      newspaper: "Paper",
      date: "1 Jan 2024",
    });
    const text = runsToText(runs);
    expect(text).toContain("\u201CMy Article\u201D");
  });

  test("'at' pinpoint prefix is used for page reference", () => {
    const runs = formatNZNewspaper({
      title: "Test",
      newspaper: "Paper",
      date: "1 Jan 2024",
      pinpoint: "B2",
    });
    expect(runsToText(runs)).toContain("at B2");
  });
});

// =============================================================================
// 5. NZLSG-ENH-005: Broadcast (formatNZBroadcast)
// =============================================================================

describe("NZLSG Digital — formatNZBroadcast", () => {
  test("broadcast with presenter and broadcaster", () => {
    const runs = formatNZBroadcast({
      title: "The Case for Justice",
      presenter: "Kim Hill",
      broadcaster: "RNZ",
      date: "15 March 2024",
    });
    expect(runsToText(runs)).toBe(
      '\u201CThe Case for Justice\u201D (Kim Hill, RNZ, 15 March 2024)'
    );
  });

  test("broadcast with director", () => {
    const runs = formatNZBroadcast({
      title: "Legal Drama",
      director: "Peter Jackson",
      broadcaster: "TVNZ",
      date: "1 June 2024",
    });
    expect(runsToText(runs)).toBe(
      '\u201CLegal Drama\u201D (Peter Jackson, TVNZ, 1 June 2024)'
    );
  });

  test("broadcast with both director and presenter", () => {
    const runs = formatNZBroadcast({
      title: "Documentary",
      director: "Director Name",
      presenter: "Presenter Name",
      broadcaster: "TVNZ",
      date: "1 Jan 2024",
    });
    expect(runsToText(runs)).toBe(
      '\u201CDocumentary\u201D (Director Name, Presenter Name, TVNZ, 1 Jan 2024)'
    );
  });

  test("broadcast title only (no production details)", () => {
    const runs = formatNZBroadcast({
      title: "Bare Programme",
    });
    expect(runsToText(runs)).toBe('\u201CBare Programme\u201D');
  });

  test("title uses double curly quotes", () => {
    const runs = formatNZBroadcast({
      title: "Test Show",
      broadcaster: "RNZ",
    });
    const text = runsToText(runs);
    expect(text).toContain("\u201CTest Show\u201D");
  });
});
