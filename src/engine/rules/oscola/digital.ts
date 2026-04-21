/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * OSCOLA 5 §3.7 — Online / Digital Sources (OSC-ENH-005)
 *
 * Pure formatting functions for digital source citations per OSCOLA 5
 * Rules 3.7.1–3.7.5. All formatters return FormattedRun[] and use
 * single curly quotes (\u2018 \u2019) for titles per OSCOLA convention.
 */

import { FormattedRun } from "../../../types/formattedRun";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Wraps text in OSCOLA-style single curly quotes.
 */
function singleQuote(text: string): string {
  return `\u2018${text}\u2019`;
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

// ─── Website (OSCOLA 5 §3.7.1) ──────────────────────────────────────────────

/**
 * Formats a website citation per OSCOLA 5 Rule 3.7.1.
 *
 * Format:
 *   Author, 'Title' (Website Name, Date) <URL> accessed Date
 *
 * @example
 *   Jane Smith, 'The Future of Legal Tech' (Law Society Gazette,
 *   15 March 2026) <https://example.com/article> accessed 20 April 2026
 */
export function formatOscolaWebsite(data: {
  author?: string;
  title: string;
  websiteName: string;
  date?: string;
  url: string;
  accessedDate: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  if (data.author) {
    runs.push({ text: `${data.author}, ` });
  }

  runs.push({ text: singleQuote(data.title) });

  // Parenthetical: (Website Name, Date) or (Website Name)
  const parenthetical = data.date
    ? `${data.websiteName}, ${data.date}`
    : data.websiteName;
  runs.push({ text: ` (${parenthetical})` });

  runs.push({ text: ` ${angleUrl(data.url)}` });
  runs.push({ text: ` ${accessedDate(data.accessedDate)}` });

  return runs;
}

// ─── Blog (OSCOLA 5 §3.7.2) ─────────────────────────────────────────────────

/**
 * Formats a blog post citation per OSCOLA 5 Rule 3.7.2.
 *
 * Format:
 *   Author, 'Title' (Blog Name, Date) <URL> accessed Date
 *
 * @example
 *   Jack of Kent, 'The Importance of Section 3' (Jack of Kent Blog,
 *   15 March 2026) <https://example.com> accessed 20 April 2026
 */
export function formatOscolaBlog(data: {
  author: string;
  title: string;
  blogName: string;
  date: string;
  url: string;
  accessedDate: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  runs.push({ text: `${data.author}, ` });
  runs.push({ text: singleQuote(data.title) });
  runs.push({ text: ` (${data.blogName}, ${data.date})` });
  runs.push({ text: ` ${angleUrl(data.url)}` });
  runs.push({ text: ` ${accessedDate(data.accessedDate)}` });

  return runs;
}

// ─── Social Media (OSCOLA 5 §3.7.3) ─────────────────────────────────────────

/** Maximum characters for social media content excerpt before truncation. */
const SOCIAL_MEDIA_EXCERPT_LENGTH = 50;

/**
 * Truncates content to the excerpt length, appending an ellipsis if needed.
 */
function truncateExcerpt(content: string): string {
  if (content.length <= SOCIAL_MEDIA_EXCERPT_LENGTH) {
    return content;
  }
  return content.slice(0, SOCIAL_MEDIA_EXCERPT_LENGTH).trimEnd() + "\u2026";
}

/**
 * Formats a social media post citation per OSCOLA 5 Rule 3.7.3.
 *
 * Format:
 *   Author (@handle), 'Content excerpt...' (Platform, Date) <URL> accessed Date
 *
 * Content is truncated to ~50 characters if longer.
 *
 * @example
 *   The Law Society (@TheLawSociety), 'New guidance on remote hearings
 *   published today...' (Twitter, 15 March 2026) <https://twitter.com/...>
 *   accessed 20 April 2026
 */
export function formatOscolaSocialMedia(data: {
  author: string;
  handle?: string;
  content: string;
  platform: string;
  date: string;
  url: string;
  accessedDate: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author with optional handle
  let authorText = data.author;
  if (data.handle) {
    authorText += ` (${data.handle})`;
  }
  runs.push({ text: `${authorText}, ` });

  // Content excerpt in single quotes
  const excerpt = truncateExcerpt(data.content);
  runs.push({ text: singleQuote(excerpt) });

  runs.push({ text: ` (${data.platform}, ${data.date})` });
  runs.push({ text: ` ${angleUrl(data.url)}` });
  runs.push({ text: ` ${accessedDate(data.accessedDate)}` });

  return runs;
}

// ─── Podcast (OSCOLA 5 §3.7.4) ──────────────────────────────────────────────

/**
 * Formats a podcast citation per OSCOLA 5 Rule 3.7.4.
 *
 * Format:
 *   'Episode Title' (Series Name, Date) <URL> accessed Date
 *
 * @example
 *   'Law in Action: Supreme Court Review' (BBC Radio 4, 15 March 2026)
 *   <https://example.com/podcast> accessed 20 April 2026
 */
export function formatOscolaPodcast(data: {
  episodeTitle: string;
  seriesName: string;
  date: string;
  url: string;
  accessedDate: string;
  author?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  if (data.author) {
    runs.push({ text: `${data.author}, ` });
  }

  runs.push({ text: singleQuote(data.episodeTitle) });
  runs.push({ text: ` (${data.seriesName}, ${data.date})` });
  runs.push({ text: ` ${angleUrl(data.url)}` });
  runs.push({ text: ` ${accessedDate(data.accessedDate)}` });

  return runs;
}

// ─── Video (OSCOLA 5 §3.7.5) ────────────────────────────────────────────────

/**
 * Formats a video citation per OSCOLA 5 Rule 3.7.5.
 *
 * Format:
 *   Author, 'Title' (Platform, Date) <URL> accessed Date
 *
 * @example
 *   UK Supreme Court, 'R v Adams Judgment Summary' (YouTube, 15 March 2026)
 *   <https://youtube.com/watch?v=abc> accessed 20 April 2026
 */
export function formatOscolaVideo(data: {
  author?: string;
  title: string;
  platform: string;
  date: string;
  url: string;
  accessedDate: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  if (data.author) {
    runs.push({ text: `${data.author}, ` });
  }

  runs.push({ text: singleQuote(data.title) });
  runs.push({ text: ` (${data.platform}, ${data.date})` });
  runs.push({ text: ` ${angleUrl(data.url)}` });
  runs.push({ text: ` ${accessedDate(data.accessedDate)}` });

  return runs;
}
