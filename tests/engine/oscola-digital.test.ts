/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * OSCOLA Digital Source Formatter Tests (OSC-ENH-005, STD-017)
 *
 * Tests for the OSCOLA 5 §3.7.1 (websites, blogs, social media, online
 * video) and §3.7.2 (podcasts) formatters, against the forms recorded in
 * docs/standards-rule-notes.md. Each test verifies the joined text output
 * of FormattedRun[] arrays.
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

/** The texts of the italic runs. */
function italics(runs: FormattedRun[]): string[] {
  return runs.filter((r) => r.italic).map((r) => r.text);
}

// ─── Website (OSCOLA 5 §3.7.1) ──────────────────────────────────────────────

describe("formatOscolaWebsite — OSCOLA 5 §3.7.1", () => {
  test("notes example: persistent link, no access date; site name italic", () => {
    const runs = formatOscolaWebsite({
      author: "Cyclefree",
      title: "Is This Really Necessary, Minister?",
      websiteName: "Legal Feminist",
      date: "27 April 2023",
      url: "https://perma.cc/3THK-P4AX",
    });
    expect(joinRuns(runs)).toBe(
      "Cyclefree, ‘Is This Really Necessary, Minister?’ (Legal Feminist, 27 April 2023) <https://perma.cc/3THK-P4AX>"
    );
    expect(italics(runs)).toEqual(["Legal Feminist"]);
  });

  test("ordinary URL: 'accessed <date>' after the link", () => {
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
      "Jane Smith, ‘The Future of Legal Tech’ (Law Society Gazette, 15 March 2026) <https://example.com/article> accessed 20 April 2026"
    );
  });

  test("no author: the citation starts with the title", () => {
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
      "‘About Us’ (Ministry of Justice, 1 January 2026) <https://moj.gov.uk/about> accessed 10 April 2026"
    );
  });

  test("no date: (Site) alone", () => {
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
      "John Doe, ‘Legal Resources’ (BAILII) <https://bailii.org/resources> accessed 5 March 2026"
    );
  });

  test("no site and no date: no bracket", () => {
    expect(
      joinRuns(formatOscolaWebsite({ title: "Data", websiteName: "", url: "https://example.org" }))
    ).toBe("‘Data’ <https://example.org>");
  });
});

// ─── Blog (OSCOLA 5 §3.7.1) ─────────────────────────────────────────────────

describe("formatOscolaBlog — OSCOLA 5 §3.7.1", () => {
  test("blogs take the website form: author, quoted title, (italic blog, date), link, access date", () => {
    const runs = formatOscolaBlog({
      author: "Jack of Kent",
      title: "The Importance of Section 3",
      blogName: "Jack of Kent Blog",
      date: "15 March 2026",
      url: "https://example.com",
      accessedDate: "20 April 2026",
    });
    expect(joinRuns(runs)).toBe(
      "Jack of Kent, ‘The Importance of Section 3’ (Jack of Kent Blog, 15 March 2026) <https://example.com> accessed 20 April 2026"
    );
    expect(italics(runs)).toEqual(["Jack of Kent Blog"]);
  });

  test("notes example: DOI or persistent link needs no access date", () => {
    expect(
      joinRuns(
        formatOscolaBlog({
          author: "Maximilian Steinbeis",
          title: "A European Network of Constitutional Law Blogs",
          blogName: "VerfBlog",
          date: "17 March 2015",
          url: "https://perma.cc/XXXX-YYYY",
        })
      )
    ).toBe(
      "Maximilian Steinbeis, ‘A European Network of Constitutional Law Blogs’ (VerfBlog, 17 March 2015) <https://perma.cc/XXXX-YYYY>"
    );
  });

  test("no author: starts with the title", () => {
    expect(
      joinRuns(
        formatOscolaBlog({
          title: "Post Title",
          blogName: "The Legal Blog",
          date: "1 February 2026",
          url: "https://blog.com/post",
        })
      )
    ).toBe("‘Post Title’ (The Legal Blog, 1 February 2026) <https://blog.com/post>");
  });
});

// ─── Social Media (OSCOLA 5 §3.7.1) ─────────────────────────────────────────

describe("formatOscolaSocialMedia — OSCOLA 5 §3.7.1", () => {
  test("notes example: username, (platform, date, time), persistent link", () => {
    expect(
      joinRuns(
        formatOscolaSocialMedia({
          handle: "@The Criminal Bar",
          platform: "Twitter",
          date: "26 June 2023",
          time: "9:13pm GMT+1",
          url: "https://perma.cc/HD6K-3GZQ",
        })
      )
    ).toBe("@The Criminal Bar (Twitter, 26 June 2023, 9:13pm GMT+1) <https://perma.cc/HD6K-3GZQ>");
  });

  test("the handle is preferred over the display name", () => {
    const result = joinRuns(
      formatOscolaSocialMedia({
        author: "The Law Society",
        handle: "@TheLawSociety",
        platform: "Twitter",
        date: "15 March 2026",
        url: "https://twitter.com/TheLawSociety/status/123",
        accessedDate: "20 April 2026",
      })
    );
    expect(result).toBe(
      "@TheLawSociety (Twitter, 15 March 2026) <https://twitter.com/TheLawSociety/status/123> accessed 20 April 2026"
    );
  });

  test("no handle: the display name stands as the author", () => {
    const result = joinRuns(
      formatOscolaSocialMedia({
        author: "Lord Neuberger",
        platform: "LinkedIn",
        date: "10 February 2026",
        url: "https://linkedin.com/post/abc",
      })
    );
    expect(result).toBe(
      "Lord Neuberger (LinkedIn, 10 February 2026) <https://linkedin.com/post/abc>"
    );
  });

  test("a supplied post excerpt is quoted after the username", () => {
    expect(
      joinRuns(
        formatOscolaSocialMedia({
          handle: "@author",
          content: "Short post",
          platform: "Twitter",
          date: "1 Jan 2026",
          url: "https://t.co/x",
        })
      )
    ).toBe("@author, ‘Short post’ (Twitter, 1 Jan 2026) <https://t.co/x>");
  });

  test("truncates an excerpt longer than 50 characters with an ellipsis", () => {
    const longContent =
      "This is a very long social media post that exceeds the maximum character limit for excerpts";
    const result = joinRuns(
      formatOscolaSocialMedia({
        handle: "@author",
        content: longContent,
        platform: "Twitter",
        date: "1 Jan 2026",
        url: "https://twitter.com/a",
      })
    );
    expect(result).toContain("…");
    const match = result.match(/‘(.*?)’/);
    expect(match).toBeDefined();
    expect(match![1].length).toBeLessThanOrEqual(51);
  });

  test("does not truncate an excerpt of exactly 50 characters", () => {
    const exact50 = "A".repeat(50);
    const result = joinRuns(
      formatOscolaSocialMedia({
        author: "Author",
        content: exact50,
        platform: "Twitter",
        date: "1 Jan 2026",
        url: "https://t.co/x",
      })
    );
    expect(result).not.toContain("…");
  });
});

// ─── Podcast (OSCOLA 5 §3.7.2) ──────────────────────────────────────────────

describe("formatOscolaPodcast — OSCOLA 5 §3.7.2", () => {
  test("notes example: podcast name, quoted episode title, (date), timestamp, link, access date", () => {
    expect(
      joinRuns(
        formatOscolaPodcast({
          seriesName: "Double Jeopardy podcast",
          episodeTitle: "Episode 27: Dr Bryn Harris – Free Speech, Harm and the Internet",
          date: "7 April 2023",
          timestamp: "3:40–3:56",
          url: "https://example.org/double-jeopardy/27",
          accessedDate: "21 July 2023",
        })
      )
    ).toBe(
      "Double Jeopardy podcast, ‘Episode 27: Dr Bryn Harris – Free Speech, Harm and the Internet’ (7 April 2023) 3:40–3:56 <https://example.org/double-jeopardy/27> accessed 21 July 2023"
    );
  });

  test("no timestamp and no access date", () => {
    expect(
      joinRuns(
        formatOscolaPodcast({
          seriesName: "Law in Action",
          episodeTitle: "The State of the Judiciary",
          date: "1 April 2026",
          url: "https://bbc.co.uk/podcast/123",
        })
      )
    ).toBe(
      "Law in Action, ‘The State of the Judiciary’ (1 April 2026) <https://bbc.co.uk/podcast/123>"
    );
  });

  test("an author precedes the podcast name", () => {
    expect(
      joinRuns(
        formatOscolaPodcast({
          author: "Joshua Rozenberg",
          seriesName: "Law in Action",
          episodeTitle: "Ep",
          date: "1 Jan 2026",
          url: "https://pod.com",
        })
      )
    ).toBe("Joshua Rozenberg, Law in Action, ‘Ep’ (1 Jan 2026) <https://pod.com>");
  });
});

// ─── Online video (OSCOLA 5 §3.7.1) ─────────────────────────────────────────

describe("formatOscolaVideo — OSCOLA 5 §3.7.1", () => {
  test("notes example: author, quoted title, (platform, date), timestamp before the link", () => {
    expect(
      joinRuns(
        formatOscolaVideo({
          author: "UK Supreme Court",
          title: "Lady Hale’s Valedictory Remarks – 18 December 2019",
          platform: "YouTube",
          date: "18 December 2019",
          timestamp: "42:41–51:17",
          url: "https://perma.cc/7YZV-Y43A",
        })
      )
    ).toBe(
      "UK Supreme Court, ‘Lady Hale’s Valedictory Remarks – 18 December 2019’ (YouTube, 18 December 2019) 42:41–51:17 <https://perma.cc/7YZV-Y43A>"
    );
  });

  test("ordinary URL with an access date", () => {
    expect(
      joinRuns(
        formatOscolaVideo({
          author: "UK Supreme Court",
          title: "R v Adams Judgment Summary",
          platform: "YouTube",
          date: "15 March 2026",
          url: "https://youtube.com/watch?v=abc",
          accessedDate: "20 April 2026",
        })
      )
    ).toBe(
      "UK Supreme Court, ‘R v Adams Judgment Summary’ (YouTube, 15 March 2026) <https://youtube.com/watch?v=abc> accessed 20 April 2026"
    );
  });

  test("no author: starts with the title", () => {
    expect(
      joinRuns(
        formatOscolaVideo({
          title: "Parliamentary Debate Highlights",
          platform: "YouTube",
          date: "1 February 2026",
          url: "https://youtube.com/watch?v=xyz",
        })
      )
    ).toBe(
      "‘Parliamentary Debate Highlights’ (YouTube, 1 February 2026) <https://youtube.com/watch?v=xyz>"
    );
  });
});

// ─── Cross-cutting concerns ─────────────────────────────────────────────────

describe("cross-cutting: all digital formatters", () => {
  test("all formatters return FormattedRun[] with text property", () => {
    const websiteRuns = formatOscolaWebsite({ title: "T", websiteName: "W", url: "https://w.com" });
    const blogRuns = formatOscolaBlog({
      author: "A",
      title: "T",
      blogName: "B",
      date: "1 Jan 2026",
      url: "https://b.com",
    });
    const socialRuns = formatOscolaSocialMedia({
      author: "A",
      platform: "P",
      date: "1 Jan 2026",
      url: "https://p.com",
    });
    const podcastRuns = formatOscolaPodcast({
      episodeTitle: "E",
      seriesName: "S",
      date: "1 Jan 2026",
      url: "https://s.com",
    });
    const videoRuns = formatOscolaVideo({
      title: "T",
      platform: "P",
      date: "1 Jan 2026",
      url: "https://p.com",
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
