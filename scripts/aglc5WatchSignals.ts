/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * A5-WS-2: pure signal extraction for the AGLC5 Committee page watcher.
 *
 * The page sits behind Cloudflare, so a plain fetch can return a challenge
 * page instead of the content. The watcher must report that as UNREADABLE,
 * never as "no change" (docs/aglc5-watch-2026-09.md). Kept free of network
 * code so it can be unit-tested.
 */

export interface WatchSignals {
  /** "considering the outcomes of this consultation" still present. */
  consideringOutcomes: boolean;
  /** "not accepting further feedback" still present. */
  feedbackClosed: boolean;
  /** "prospective new edition" wording (the 2026 softening) still present. */
  prospectiveEdition: boolean;
  /** A published feedback address (aglc-5@unimelb.edu.au) is listed. */
  feedbackAddress: boolean;
  /** Mentions of publish/publication, excluding "general public". */
  publicationMentions: number;
  /** Launch vocabulary: ISBN, pre-order, now available, draft, release date. */
  launchTerms: string[];
  /** Normalised sentences mentioning the edition, Committee or feedback. */
  keySentences: string[];
}

export type Readability = { readable: true } | { readable: false; reason: string };

const CHALLENGE_MARKERS = [
  /just a moment\.\.\./i,
  /attention required/i,
  /cf-challenge|challenge-platform|cf_chl_/i,
  /enable javascript and cookies to continue/i,
];

/** Strips HTML to plain text; passes text (eg proxy output) through. */
export function toPlainText(body: string): string {
  return body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Decides whether a response actually carries the Committee page. */
export function checkReadable(status: number, body: string): Readability {
  if (status !== 200) return { readable: false, reason: `HTTP ${status}` };
  if (CHALLENGE_MARKERS.some((re) => re.test(body))) {
    return { readable: false, reason: "bot-protection challenge page" };
  }
  if (!/AGLC\s*5|AGLC5|fifth edition/i.test(toPlainText(body))) {
    return { readable: false, reason: "response does not mention AGLC5" };
  }
  return { readable: true };
}

export function extractSignals(body: string): WatchSignals {
  const text = toPlainText(body);
  const withoutPublic = text.replace(/general public/gi, "");
  const launch = [
    ["ISBN", /\bISBN\b/i],
    ["pre-order", /pre-?order/i],
    ["now available", /now available/i],
    ["draft", /\bdraft\b/i],
    ["release date", /release date|to be released|will be (published|released)/i],
  ] as const;
  const keySentences = Array.from(
    new Set(
      text
        .split(/(?<=[.!?])\s+/)
        .filter((s) => /AGLC\s*5|AGLC5|new edition|Committee|feedback/i.test(s))
        .filter((s) => s.length < 400)
        .map((s) => s.trim())
    )
  ).sort();
  return {
    consideringOutcomes: /considering the outcomes/i.test(text),
    feedbackClosed: /not accepting (any )?further feedback/i.test(text),
    prospectiveEdition: /prospective new edition/i.test(text),
    feedbackAddress: /aglc-?5@unimelb\.edu\.au/i.test(text),
    publicationMentions: (withoutPublic.match(/publi(sh|cation)/gi) ?? []).length,
    launchTerms: launch.filter(([, re]) => re.test(text)).map(([name]) => name),
    keySentences,
  };
}

/** Lists the signals that differ from the baseline (empty when unchanged). */
export function diffSignals(baseline: WatchSignals, current: WatchSignals): string[] {
  const changes: string[] = [];
  const scalar: (keyof WatchSignals)[] = [
    "consideringOutcomes",
    "feedbackClosed",
    "prospectiveEdition",
    "feedbackAddress",
    "publicationMentions",
  ];
  for (const key of scalar) {
    if (baseline[key] !== current[key]) {
      changes.push(`${key}: ${String(baseline[key])} -> ${String(current[key])}`);
    }
  }
  const added = current.launchTerms.filter((t) => !baseline.launchTerms.includes(t));
  if (added.length) changes.push(`launch terms appeared: ${added.join(", ")}`);
  const newSentences = current.keySentences.filter((s) => !baseline.keySentences.includes(s));
  const goneSentences = baseline.keySentences.filter((s) => !current.keySentences.includes(s));
  for (const s of newSentences) changes.push(`new text: ${s}`);
  for (const s of goneSentences) changes.push(`removed text: ${s}`);
  return changes;
}
