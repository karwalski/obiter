/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * OSCOLA 5 §3.7.1–3.7.2 — Online / Digital Sources (OSC-ENH-005, STD-017)
 *
 * Pure formatting functions for digital source citations per OSCOLA 5
 * §3.7.1 (websites, blogs, social media, online video) and §3.7.2
 * (podcasts), as recorded in docs/standards-rule-notes.md. All formatters
 * return FormattedRun[] and use single curly quotes (‘ ’) for
 * titles (OSCOLA 5 §1.5).
 *
 * Access dates: §3.7.1 wants `accessed <date>` after an ordinary URL only;
 * a persistent link (Perma.cc) or a DOI needs none. The formatters emit the
 * access date when one is supplied and leave the choice to the caller.
 *
 * Pinpoints: the engine appends page and paragraph pinpoints after the
 * whole citation (STD-014, `formatPinpointFor`); the audio/video timestamp
 * of §3.1.3 / §3.7.1 / §3.7.2 is an element of the citation itself and sits
 * before the link, so it is a formatter input here.
 */

import { FormattedRun } from "../../../types/formattedRun";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Wraps text in OSCOLA-style single curly quotes.
 */
function singleQuote(text: string): string {
  return `‘${text}’`;
}

/**
 * Formats a URL inside angle brackets.
 */
function angleUrl(url: string): string {
  return `<${url}>`;
}

/**
 * Formats the "accessed" date suffix.
 */
function accessedDate(date: string): string {
  return `accessed ${date}`;
}

/** Appends ` <URL>` and, when given, ` accessed <date>` (§3.7.1). */
function pushLink(runs: FormattedRun[], url: string, accessed?: string): void {
  if (url) {
    runs.push({ text: ` ${angleUrl(url)}` });
  }
  if (accessed) {
    runs.push({ text: ` ${accessedDate(accessed)}` });
  }
}

/**
 * Pushes ` (` + italic site name [+ `, date`] + `)` — the §3.7.1 bracket
 * with the site name in italics — or ` (date)` when there is no site.
 */
function pushSiteBracket(runs: FormattedRun[], site: string, date?: string): void {
  if (!site && !date) return;
  runs.push({ text: " (" });
  if (site) {
    runs.push({ text: site, italic: true });
    if (date) runs.push({ text: ", " });
  }
  if (date) runs.push({ text: date });
  runs.push({ text: ")" });
}

// ─── Website (OSCOLA 5 §3.7.1) ──────────────────────────────────────────────

/**
 * Formats a website citation per OSCOLA 5 §3.7.1.
 *
 * Format:
 *   Author, 'Title' (*Website Name*, Date) <URL> accessed Date
 *
 * With no author the citation starts with the title; the access date is
 * omitted when none is supplied (persistent link or DOI, §3.7.1).
 *
 * @example
 *   Cyclefree, 'Is This Really Necessary, Minister?' (Legal Feminist,
 *   27 April 2023) <https://perma.cc/3THK-P4AX>
 */
export function formatOscolaWebsite(data: {
  author?: string;
  title: string;
  websiteName: string;
  date?: string;
  url: string;
  accessedDate?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  if (data.author) {
    runs.push({ text: `${data.author}, ` });
  }

  runs.push({ text: singleQuote(data.title) });
  pushSiteBracket(runs, data.websiteName, data.date);
  pushLink(runs, data.url, data.accessedDate);

  return runs;
}

// ─── Blog (OSCOLA 5 §3.7.1) ─────────────────────────────────────────────────

/**
 * Formats a blog post citation per OSCOLA 5 §3.7.1 (blogs share the
 * website form).
 *
 * Format:
 *   Author, 'Title' (*Blog Name*, Date) <URL> accessed Date
 *
 * @example
 *   Maximilian Steinbeis, 'A European Network of Constitutional Law Blogs'
 *   (VerfBlog, 17 March 2015) <https://verfassungsblog.de/...>
 *   accessed 21 July 2023
 */
export function formatOscolaBlog(data: {
  author?: string;
  title: string;
  blogName: string;
  date?: string;
  url: string;
  accessedDate?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  if (data.author) {
    runs.push({ text: `${data.author}, ` });
  }

  runs.push({ text: singleQuote(data.title) });
  pushSiteBracket(runs, data.blogName, data.date);
  pushLink(runs, data.url, data.accessedDate);

  return runs;
}

// ─── Social Media (OSCOLA 5 §3.7.1) ─────────────────────────────────────────

/** Maximum characters for social media content excerpt before truncation. */
const SOCIAL_MEDIA_EXCERPT_LENGTH = 50;

/**
 * Truncates content to the excerpt length, appending an ellipsis if needed.
 */
function truncateExcerpt(content: string): string {
  if (content.length <= SOCIAL_MEDIA_EXCERPT_LENGTH) {
    return content;
  }
  return content.slice(0, SOCIAL_MEDIA_EXCERPT_LENGTH).trimEnd() + "…";
}

/**
 * Formats a social media post citation per OSCOLA 5 §3.7.1.
 *
 * Format:
 *   @handle[, 'Content excerpt…'] (Platform, Date[, Time]) <URL> [accessed Date]
 *
 * §3.7.1 cites the username as the author (with `@` for X/Twitter), then
 * the platform, date, and time with zone, then the link:
 * `@The Criminal Bar (Twitter, 26 June 2023, 9:13pm GMT+1) <https://perma.cc/HD6K-3GZQ>`.
 * The handle is preferred over a display name; a quoted excerpt of the
 * post (truncated to ~50 characters) is included only when supplied.
 */
export function formatOscolaSocialMedia(data: {
  author?: string;
  handle?: string;
  content?: string;
  platform: string;
  date: string;
  time?: string;
  url: string;
  accessedDate?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  const poster = (data.handle ?? data.author ?? "").trim();
  const excerpt = (data.content ?? "").trim();

  if (poster) {
    runs.push({ text: excerpt ? `${poster}, ` : poster });
  }

  if (excerpt) {
    runs.push({ text: singleQuote(truncateExcerpt(excerpt)) });
  }

  const when = [data.platform, data.date, data.time]
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(", ");
  if (when) {
    runs.push({ text: ` (${when})` });
  }

  pushLink(runs, data.url, data.accessedDate);

  return runs;
}

// ─── Podcast (OSCOLA 5 §3.7.2) ──────────────────────────────────────────────

/**
 * Formats a podcast citation per OSCOLA 5 §3.7.2.
 *
 * Format:
 *   [Author, ]Podcast Name, 'Episode Title' (Date) [Timestamp] <URL> [accessed Date]
 *
 * @example
 *   Double Jeopardy podcast, 'Episode 27: Dr Bryn Harris – Free Speech,
 *   Harm and the Internet' (7 April 2023) 3:40–3:56
 *   <https://…> accessed 21 July 2023
 */
export function formatOscolaPodcast(data: {
  episodeTitle: string;
  seriesName: string;
  date: string;
  timestamp?: string;
  url: string;
  accessedDate?: string;
  author?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  if (data.author) {
    runs.push({ text: `${data.author}, ` });
  }

  if (data.seriesName) {
    runs.push({ text: `${data.seriesName}, ` });
  }

  runs.push({ text: singleQuote(data.episodeTitle) });

  if (data.date) {
    runs.push({ text: ` (${data.date})` });
  }

  if (data.timestamp) {
    runs.push({ text: ` ${data.timestamp}` });
  }

  pushLink(runs, data.url, data.accessedDate);

  return runs;
}

// ─── Online video (OSCOLA 5 §3.7.1) ─────────────────────────────────────────

/**
 * Formats an online video citation per OSCOLA 5 §3.7.1.
 *
 * Format:
 *   Author, 'Title' (Platform, Date) [Timestamp] <URL> [accessed Date]
 *
 * The timestamp pinpoint (§3.1.3) precedes the link.
 *
 * @example
 *   UK Supreme Court, 'Lady Hale's Valedictory Remarks – 18 December 2019'
 *   (YouTube, 18 December 2019) 42:41–51:17 <https://perma.cc/7YZV-Y43A>
 */
export function formatOscolaVideo(data: {
  author?: string;
  title: string;
  platform: string;
  date: string;
  timestamp?: string;
  url: string;
  accessedDate?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  if (data.author) {
    runs.push({ text: `${data.author}, ` });
  }

  runs.push({ text: singleQuote(data.title) });

  const when = [data.platform, data.date]
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(", ");
  if (when) {
    runs.push({ text: ` (${when})` });
  }

  if (data.timestamp) {
    runs.push({ text: ` ${data.timestamp}` });
  }

  pushLink(runs, data.url, data.accessedDate);

  return runs;
}
