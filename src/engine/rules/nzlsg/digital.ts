/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * NZLSG-ENH-004: Online/Internet Sources
 * NZLSG-ENH-005: Newspaper/Media
 *
 * NZLSG Rule 7: Internet materials use double quotation marks and 'at' pinpoint prefix.
 * Newspaper articles: title in double quotes, newspaper name italic, place in parentheses.
 * Broadcast: title in double quotes, production details in parentheses.
 */

import { FormattedRun } from "../../../types/formattedRun";

// ─── Data Interfaces ────────────────────────────────────────────────────────

export interface NZWebsiteData {
  /** Author name(s). */
  author?: string;
  /** Title of the page/article (in double quotation marks). */
  title: string;
  /** Year of publication or last update. */
  year?: number;
  /** Website name. */
  website?: string;
  /** URL. */
  url?: string;
  /** Pinpoint reference (used with 'at' prefix). */
  pinpoint?: string;
}

export interface NZBlogData {
  /** Author name(s). */
  author: string;
  /** Title of the blog post (in double quotation marks). */
  title: string;
  /** Date of the post (formatted for display, e.g. "15 March 2024"). */
  date: string;
  /** Name of the blog. */
  blogName: string;
  /** URL. */
  url?: string;
  /** Pinpoint reference (used with 'at' prefix). */
  pinpoint?: string;
}

export interface NZSocialMediaData {
  /** Author name. */
  author: string;
  /** Social media handle (e.g. "@handle"). */
  handle?: string;
  /** Content excerpt (in double quotation marks). */
  content: string;
  /** Platform name (e.g. "Twitter", "Facebook"). */
  platform: string;
  /** Date of the post (formatted for display). */
  date: string;
  /** URL. */
  url?: string;
}

export interface NZNewspaperData {
  /** Author name(s). */
  author?: string;
  /** Title of the article (in double quotation marks). */
  title: string;
  /** Newspaper name (will be italicised). */
  newspaper: string;
  /** Place of publication. */
  place?: string;
  /** Date of publication (formatted for display). */
  date: string;
  /** Page reference (used with 'at' prefix). */
  pinpoint?: string;
}

export interface NZBroadcastData {
  /** Title of the programme/episode (in double quotation marks). */
  title: string;
  /** Director name. */
  director?: string;
  /** Presenter name. */
  presenter?: string;
  /** Broadcaster name (e.g. "TVNZ", "RNZ"). */
  broadcaster?: string;
  /** Date of broadcast (formatted for display). */
  date?: string;
}

// ─── NZLSG-ENH-004: Website ─────────────────────────────────────────────────

/**
 * Formats an internet material citation per NZLSG Rule 7.
 *
 * NZLSG Rule 7: Author "Title" (Year) Website <URL> at pinpoint.
 * Double quotation marks for titles, 'at' pinpoint prefix.
 *
 * @example
 *   // John Smith "Legal Aid in New Zealand" (2024) Ministry of Justice
 *   // <https://example.govt.nz/legal-aid>
 *   formatNZWebsite({
 *     author: "John Smith",
 *     title: "Legal Aid in New Zealand",
 *     year: 2024,
 *     website: "Ministry of Justice",
 *     url: "https://example.govt.nz/legal-aid",
 *   })
 */
export function formatNZWebsite(data: NZWebsiteData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author (optional)
  if (data.author) {
    runs.push({ text: `${data.author} ` });
  }

  // Title in double quotation marks
  runs.push({ text: `\u201C${data.title}\u201D` });

  // Year in parentheses (optional)
  if (data.year !== undefined) {
    runs.push({ text: ` (${data.year})` });
  }

  // Website name (optional)
  if (data.website) {
    runs.push({ text: ` ${data.website}` });
  }

  // URL in angle brackets (optional)
  if (data.url) {
    runs.push({ text: ` <${data.url}>` });
  }

  // Pinpoint with 'at' prefix
  if (data.pinpoint) {
    runs.push({ text: ` at ${data.pinpoint}` });
  }

  return runs;
}

// ─── NZLSG-ENH-004: Blog ────────────────────────────────────────────────────

/**
 * Formats a blog post citation per NZLSG Rule 7.
 *
 * NZLSG Rule 7: Author "Title" (Date) Blog Name <URL>.
 *
 * @example
 *   // Andrew Geddis "The Bill of Rights and Parliament" (15 March 2024)
 *   // Pundit <https://example.com>
 *   formatNZBlog({
 *     author: "Andrew Geddis",
 *     title: "The Bill of Rights and Parliament",
 *     date: "15 March 2024",
 *     blogName: "Pundit",
 *     url: "https://example.com",
 *   })
 */
export function formatNZBlog(data: NZBlogData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author
  runs.push({ text: `${data.author} ` });

  // Title in double quotation marks
  runs.push({ text: `\u201C${data.title}\u201D` });

  // Date in parentheses
  runs.push({ text: ` (${data.date})` });

  // Blog name
  runs.push({ text: ` ${data.blogName}` });

  // URL in angle brackets (optional)
  if (data.url) {
    runs.push({ text: ` <${data.url}>` });
  }

  // Pinpoint with 'at' prefix
  if (data.pinpoint) {
    runs.push({ text: ` at ${data.pinpoint}` });
  }

  return runs;
}

// ─── NZLSG-ENH-004: Social Media ────────────────────────────────────────────

/**
 * Formats a social media citation per NZLSG Rule 7.
 *
 * NZLSG Rule 7: Author (@handle) "Content excerpt" (Platform, Date) <URL>.
 *
 * @example
 *   // Andrew Little (@AndrewLittleMP) "Justice reforms announced today"
 *   // (Twitter, 15 March 2024) <https://example.com>
 *   formatNZSocialMedia({
 *     author: "Andrew Little",
 *     handle: "@AndrewLittleMP",
 *     content: "Justice reforms announced today",
 *     platform: "Twitter",
 *     date: "15 March 2024",
 *     url: "https://example.com",
 *   })
 */
export function formatNZSocialMedia(data: NZSocialMediaData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author with optional handle
  if (data.handle) {
    runs.push({ text: `${data.author} (${data.handle}) ` });
  } else {
    runs.push({ text: `${data.author} ` });
  }

  // Content excerpt in double quotation marks
  runs.push({ text: `\u201C${data.content}\u201D` });

  // Platform and date in parentheses
  runs.push({ text: ` (${data.platform}, ${data.date})` });

  // URL in angle brackets (optional)
  if (data.url) {
    runs.push({ text: ` <${data.url}>` });
  }

  return runs;
}

// ─── NZLSG-ENH-005: Newspaper ───────────────────────────────────────────────

/**
 * Formats a newspaper article citation per NZLSG newspaper convention.
 *
 * Author "Title" Newspaper Name (Place, Date) at page.
 * Title in double quotation marks, newspaper name italic, place in parentheses.
 *
 * @example
 *   // Jane Doe "Courts Face Backlog" The New Zealand Herald
 *   // (Auckland, 15 March 2024) at A3
 *   formatNZNewspaper({
 *     author: "Jane Doe",
 *     title: "Courts Face Backlog",
 *     newspaper: "The New Zealand Herald",
 *     place: "Auckland",
 *     date: "15 March 2024",
 *     pinpoint: "A3",
 *   })
 */
export function formatNZNewspaper(data: NZNewspaperData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author (optional)
  if (data.author) {
    runs.push({ text: `${data.author} ` });
  }

  // Title in double quotation marks
  runs.push({ text: `\u201C${data.title}\u201D` });

  // Newspaper name in italics
  runs.push({ text: ` ` });
  runs.push({ text: data.newspaper, italic: true });

  // Place and date in parentheses
  const parenParts: string[] = [];
  if (data.place) {
    parenParts.push(data.place);
  }
  parenParts.push(data.date);
  runs.push({ text: ` (${parenParts.join(", ")})` });

  // Pinpoint with 'at' prefix
  if (data.pinpoint) {
    runs.push({ text: ` at ${data.pinpoint}` });
  }

  return runs;
}

// ─── NZLSG-ENH-005: Broadcast ───────────────────────────────────────────────

/**
 * Formats a broadcast/media citation per NZLSG convention.
 *
 * "Title" (Director/Presenter, Broadcaster, Date).
 *
 * @example
 *   // "The Case for Justice" (Kim Hill, RNZ, 15 March 2024)
 *   formatNZBroadcast({
 *     title: "The Case for Justice",
 *     presenter: "Kim Hill",
 *     broadcaster: "RNZ",
 *     date: "15 March 2024",
 *   })
 */
export function formatNZBroadcast(data: NZBroadcastData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title in double quotation marks
  runs.push({ text: `\u201C${data.title}\u201D` });

  // Production details in parentheses
  const details: string[] = [];
  if (data.director) {
    details.push(data.director);
  }
  if (data.presenter) {
    details.push(data.presenter);
  }
  if (data.broadcaster) {
    details.push(data.broadcaster);
  }
  if (data.date) {
    details.push(data.date);
  }

  if (details.length > 0) {
    runs.push({ text: ` (${details.join(", ")})` });
  }

  return runs;
}
