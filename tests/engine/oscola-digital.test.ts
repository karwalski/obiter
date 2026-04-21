/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * OSCOLA Digital Source Formatter Tests (OSC-ENH-005)
 *
 * Tests for OSCOLA 5 Rules 3.7.1–3.7.5 digital source formatters.
 * Each test verifies the joined text output of FormattedRun[] arrays.
 */

import { FormattedRun } from "../../src/types/formattedRun";
import {
  formatOscolaWebsite,
  formatOscolaBlog,
  formatOscolaSocialMedia,
  formatOscolaPodcast,
  formatOscolaVideo,
} from "../../src/engine/rules/oscola/digital";

/** Joins FormattedRun[] into a single string for assertion. */
function joinRuns(runs: FormattedRun[]): string {
  return runs.map((r) => r.text).join("");
}

// ─── Website (OSCOLA 5 §3.7.1) ──────────────────────────────────────────────

describe("formatOscolaWebsite — OSCOLA 5 Rule 3.7.1", () => {
  /**
   * @example Jane Smith, \u2018The Future of Legal Tech\u2019 (Law Society Gazette,
   *   15 March 2026) <https://example.com/article> accessed 20 April 2026
   */
  test("formats a full website citation with all fields", () => {
    const result = joinRuns(
      formatOscolaWebsite({
        author: "Jane Smith",
        title: "The Future of Legal Tech",
        websiteName: "Law Society Gazette",
        date: "15 March 2026",
        url: "https://example.com/article",
        accessedDate: "20 April 2026",
      })
    );
    expect(result).toBe(
      "Jane Smith, \u2018The Future of Legal Tech\u2019 (Law Society Gazette, 15 March 2026) <https://example.com/article> accessed 20 April 2026"
    );
  });

  test("formats a website citation without author", () => {
    const result = joinRuns(
      formatOscolaWebsite({
        title: "About Us",
        websiteName: "Ministry of Justice",
        date: "1 January 2026",
        url: "https://moj.gov.uk/about",
        accessedDate: "10 April 2026",
      })
    );
    expect(result).toBe(
      "\u2018About Us\u2019 (Ministry of Justice, 1 January 2026) <https://moj.gov.uk/about> accessed 10 April 2026"
    );
  });

  test("formats a website citation without date", () => {
    const result = joinRuns(
      formatOscolaWebsite({
        author: "John Doe",
        title: "Legal Resources",
        websiteName: "BAILII",
        url: "https://bailii.org/resources",
        accessedDate: "5 March 2026",
      })
    );
    expect(result).toBe(
      "John Doe, \u2018Legal Resources\u2019 (BAILII) <https://bailii.org/resources> accessed 5 March 2026"
    );
  });

  test("formats a website citation without author or date", () => {
    const result = joinRuns(
      formatOscolaWebsite({
        title: "Sentencing Guidelines",
        websiteName: "Sentencing Council",
        url: "https://sentencingcouncil.org.uk",
        accessedDate: "15 April 2026",
      })
    );
    expect(result).toBe(
      "\u2018Sentencing Guidelines\u2019 (Sentencing Council) <https://sentencingcouncil.org.uk> accessed 15 April 2026"
    );
  });

  test("uses single curly quotes for the title", () => {
    const runs = formatOscolaWebsite({
      author: "A",
      title: "B",
      websiteName: "C",
      url: "https://c.com",
      accessedDate: "1 Jan 2026",
    });
    const titleRun = runs.find((r) => r.text.includes("\u2018"));
    expect(titleRun).toBeDefined();
    expect(titleRun!.text).toContain("\u2018B\u2019");
  });

  test("wraps URL in angle brackets", () => {
    const result = joinRuns(
      formatOscolaWebsite({
        title: "T",
        websiteName: "W",
        url: "https://x.com",
        accessedDate: "1 Jan 2026",
      })
    );
    expect(result).toContain("<https://x.com>");
  });
});

// ─── Blog (OSCOLA 5 §3.7.2) ─────────────────────────────────────────────────

describe("formatOscolaBlog — OSCOLA 5 Rule 3.7.2", () => {
  /**
   * @example Jack of Kent, \u2018The Importance of Section 3\u2019 (Jack of Kent Blog,
   *   15 March 2026) <https://example.com> accessed 20 April 2026
   */
  test("formats a full blog citation", () => {
    const result = joinRuns(
      formatOscolaBlog({
        author: "Jack of Kent",
        title: "The Importance of Section 3",
        blogName: "Jack of Kent Blog",
        date: "15 March 2026",
        url: "https://example.com",
        accessedDate: "20 April 2026",
      })
    );
    expect(result).toBe(
      "Jack of Kent, \u2018The Importance of Section 3\u2019 (Jack of Kent Blog, 15 March 2026) <https://example.com> accessed 20 April 2026"
    );
  });

  test("includes blog name in parenthetical", () => {
    const result = joinRuns(
      formatOscolaBlog({
        author: "A Blogger",
        title: "Post Title",
        blogName: "The Legal Blog",
        date: "1 February 2026",
        url: "https://blog.com/post",
        accessedDate: "10 March 2026",
      })
    );
    expect(result).toContain("(The Legal Blog, 1 February 2026)");
  });

  test("returns correct number of runs", () => {
    const runs = formatOscolaBlog({
      author: "Author",
      title: "Title",
      blogName: "Blog",
      date: "1 Jan 2026",
      url: "https://blog.com",
      accessedDate: "2 Jan 2026",
    });
    expect(runs).toHaveLength(5);
  });
});

// ─── Social Media (OSCOLA 5 §3.7.3) ─────────────────────────────────────────

describe("formatOscolaSocialMedia — OSCOLA 5 Rule 3.7.3", () => {
  test("formats a tweet with handle", () => {
    const result = joinRuns(
      formatOscolaSocialMedia({
        author: "The Law Society",
        handle: "@TheLawSociety",
        content: "New guidance published today",
        platform: "Twitter",
        date: "15 March 2026",
        url: "https://twitter.com/TheLawSociety/status/123",
        accessedDate: "20 April 2026",
      })
    );
    expect(result).toBe(
      "The Law Society (@TheLawSociety), \u2018New guidance published today\u2019 (Twitter, 15 March 2026) <https://twitter.com/TheLawSociety/status/123> accessed 20 April 2026"
    );
  });

  test("formats a post without handle", () => {
    const result = joinRuns(
      formatOscolaSocialMedia({
        author: "Lord Neuberger",
        content: "Reflections on the rule of law",
        platform: "LinkedIn",
        date: "10 February 2026",
        url: "https://linkedin.com/post/abc",
        accessedDate: "15 March 2026",
      })
    );
    expect(result).toContain("Lord Neuberger, ");
    expect(result).not.toContain("(@");
  });

  test("truncates content longer than 50 characters", () => {
    const longContent =
      "This is a very long social media post that exceeds the maximum character limit for excerpts";
    const result = joinRuns(
      formatOscolaSocialMedia({
        author: "Author",
        handle: "@author",
        content: longContent,
        platform: "Twitter",
        date: "1 Jan 2026",
        url: "https://twitter.com/a",
        accessedDate: "2 Jan 2026",
      })
    );
    // Should contain ellipsis character
    expect(result).toContain("\u2026");
    // The excerpt inside quotes should be <= 51 chars (50 + ellipsis)
    const match = result.match(/\u2018(.*?)\u2019/);
    expect(match).toBeDefined();
    expect(match![1].length).toBeLessThanOrEqual(51);
  });

  test("does not truncate content at exactly 50 characters", () => {
    const exact50 = "A".repeat(50);
    const result = joinRuns(
      formatOscolaSocialMedia({
        author: "Author",
        content: exact50,
        platform: "Twitter",
        date: "1 Jan 2026",
        url: "https://t.co/x",
        accessedDate: "2 Jan 2026",
      })
    );
    expect(result).not.toContain("\u2026");
  });

  test("does not truncate content shorter than 50 characters", () => {
    const result = joinRuns(
      formatOscolaSocialMedia({
        author: "Author",
        content: "Short post",
        platform: "Twitter",
        date: "1 Jan 2026",
        url: "https://t.co/x",
        accessedDate: "2 Jan 2026",
      })
    );
    expect(result).toContain("\u2018Short post\u2019");
    expect(result).not.toContain("\u2026");
  });

  test("includes platform in parenthetical", () => {
    const result = joinRuns(
      formatOscolaSocialMedia({
        author: "Author",
        content: "Content",
        platform: "X (formerly Twitter)",
        date: "1 Jan 2026",
        url: "https://x.com/a",
        accessedDate: "2 Jan 2026",
      })
    );
    expect(result).toContain("(X (formerly Twitter), 1 Jan 2026)");
  });
});

// ─── Podcast (OSCOLA 5 §3.7.4) ──────────────────────────────────────────────

describe("formatOscolaPodcast — OSCOLA 5 Rule 3.7.4", () => {
  /**
   * @example \u2018Law in Action: Supreme Court Review\u2019 (BBC Radio 4,
   *   15 March 2026) <https://example.com/podcast> accessed 20 April 2026
   */
  test("formats a podcast citation without author", () => {
    const result = joinRuns(
      formatOscolaPodcast({
        episodeTitle: "Law in Action: Supreme Court Review",
        seriesName: "BBC Radio 4",
        date: "15 March 2026",
        url: "https://example.com/podcast",
        accessedDate: "20 April 2026",
      })
    );
    expect(result).toBe(
      "\u2018Law in Action: Supreme Court Review\u2019 (BBC Radio 4, 15 March 2026) <https://example.com/podcast> accessed 20 April 2026"
    );
  });

  test("formats a podcast citation with author", () => {
    const result = joinRuns(
      formatOscolaPodcast({
        author: "Joshua Rozenberg",
        episodeTitle: "The State of the Judiciary",
        seriesName: "Law in Action",
        date: "1 April 2026",
        url: "https://bbc.co.uk/podcast/123",
        accessedDate: "10 April 2026",
      })
    );
    expect(result).toBe(
      "Joshua Rozenberg, \u2018The State of the Judiciary\u2019 (Law in Action, 1 April 2026) <https://bbc.co.uk/podcast/123> accessed 10 April 2026"
    );
  });

  test("returns correct number of runs without author", () => {
    const runs = formatOscolaPodcast({
      episodeTitle: "Ep",
      seriesName: "Series",
      date: "1 Jan 2026",
      url: "https://pod.com",
      accessedDate: "2 Jan 2026",
    });
    expect(runs).toHaveLength(4);
  });

  test("returns correct number of runs with author", () => {
    const runs = formatOscolaPodcast({
      author: "Host",
      episodeTitle: "Ep",
      seriesName: "Series",
      date: "1 Jan 2026",
      url: "https://pod.com",
      accessedDate: "2 Jan 2026",
    });
    expect(runs).toHaveLength(5);
  });
});

// ─── Video (OSCOLA 5 §3.7.5) ────────────────────────────────────────────────

describe("formatOscolaVideo — OSCOLA 5 Rule 3.7.5", () => {
  /**
   * @example UK Supreme Court, \u2018R v Adams Judgment Summary\u2019 (YouTube,
   *   15 March 2026) <https://youtube.com/watch?v=abc> accessed 20 April 2026
   */
  test("formats a full video citation", () => {
    const result = joinRuns(
      formatOscolaVideo({
        author: "UK Supreme Court",
        title: "R v Adams Judgment Summary",
        platform: "YouTube",
        date: "15 March 2026",
        url: "https://youtube.com/watch?v=abc",
        accessedDate: "20 April 2026",
      })
    );
    expect(result).toBe(
      "UK Supreme Court, \u2018R v Adams Judgment Summary\u2019 (YouTube, 15 March 2026) <https://youtube.com/watch?v=abc> accessed 20 April 2026"
    );
  });

  test("formats a video citation without author", () => {
    const result = joinRuns(
      formatOscolaVideo({
        title: "Parliamentary Debate Highlights",
        platform: "YouTube",
        date: "1 February 2026",
        url: "https://youtube.com/watch?v=xyz",
        accessedDate: "5 March 2026",
      })
    );
    expect(result).toBe(
      "\u2018Parliamentary Debate Highlights\u2019 (YouTube, 1 February 2026) <https://youtube.com/watch?v=xyz> accessed 5 March 2026"
    );
  });

  test("supports non-YouTube platforms", () => {
    const result = joinRuns(
      formatOscolaVideo({
        author: "Inner Temple",
        title: "Advocacy Masterclass",
        platform: "Vimeo",
        date: "20 March 2026",
        url: "https://vimeo.com/123",
        accessedDate: "21 April 2026",
      })
    );
    expect(result).toContain("(Vimeo, 20 March 2026)");
  });

  test("includes accessed date at the end", () => {
    const result = joinRuns(
      formatOscolaVideo({
        title: "Title",
        platform: "YouTube",
        date: "1 Jan 2026",
        url: "https://yt.com/1",
        accessedDate: "15 April 2026",
      })
    );
    expect(result).toMatch(/accessed 15 April 2026$/);
  });
});

// ─── Cross-cutting concerns ─────────────────────────────────────────────────

describe("cross-cutting: all digital formatters", () => {
  test("all formatters return FormattedRun[] with text property", () => {
    const websiteRuns = formatOscolaWebsite({
      title: "T",
      websiteName: "W",
      url: "https://w.com",
      accessedDate: "1 Jan 2026",
    });
    const blogRuns = formatOscolaBlog({
      author: "A",
      title: "T",
      blogName: "B",
      date: "1 Jan 2026",
      url: "https://b.com",
      accessedDate: "1 Jan 2026",
    });
    const socialRuns = formatOscolaSocialMedia({
      author: "A",
      content: "C",
      platform: "P",
      date: "1 Jan 2026",
      url: "https://p.com",
      accessedDate: "1 Jan 2026",
    });
    const podcastRuns = formatOscolaPodcast({
      episodeTitle: "E",
      seriesName: "S",
      date: "1 Jan 2026",
      url: "https://s.com",
      accessedDate: "1 Jan 2026",
    });
    const videoRuns = formatOscolaVideo({
      title: "T",
      platform: "P",
      date: "1 Jan 2026",
      url: "https://p.com",
      accessedDate: "1 Jan 2026",
    });

    for (const runs of [websiteRuns, blogRuns, socialRuns, podcastRuns, videoRuns]) {
      expect(Array.isArray(runs)).toBe(true);
      expect(runs.length).toBeGreaterThan(0);
      for (const run of runs) {
        expect(typeof run.text).toBe("string");
      }
    }
  });
});
