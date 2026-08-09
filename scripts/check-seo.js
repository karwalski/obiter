#!/usr/bin/env node
/*
 * SEO guard for the marketing site (website/).
 *
 * Written after a Google search for "obiter aglc citation" returned the site
 * with "Missing: aglc" — the pages said AGLC4 everywhere and the bare token
 * AGLC nowhere. Google tokenises "AGLC4" as a single word, so it does not
 * match a query for "AGLC"; the fix was to use the plain term, and the
 * TOKENS check below is what stops that regressing.
 *
 * Checks, per page:
 *   - <title>, meta description, canonical, og:title all present
 *   - title and description within the lengths Google will render
 *   - every JSON-LD block parses
 *   - every FAQPage question has a matching visible <summary> on the page
 *     (Google requires marked-up FAQ content to be visible, or the rich
 *     result is dropped — aglc4.html shipped schema with no visible FAQ)
 *   - no two indexable pages share a meta description (duplicate-content
 *     signal — aglc5.html and its archived original once did)
 *   - every page in the sitemap exists on disk, and every indexable page is
 *     in the sitemap
 *   - the homepage genuinely uses each term in TOKENS in its visible text
 *
 * Usage: npm run check-seo
 */
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "website");

// Pages that are deliberately not indexable and so are exempt.
const EXCLUDE = new Set(["admin.html"]);

/** Terms real users search for. Each must appear in the homepage's visible text. */
const TOKENS = [
  { label: "AGLC (bare)", re: /AGLC(?![0-9])/i },
  { label: "AGLC4", re: /AGLC\s?4/i },
  { label: "AGLC5", re: /AGLC\s?5/i },
  { label: "Australian Guide to Legal Citation", re: /Australian\s+Guide\s+to\s+Legal\s+Citation/i },
  { label: "Microsoft", re: /Microsoft/i },
  { label: "MS Word", re: /(?<![A-Za-z])MS\s+Word/i },
  { label: "add-in", re: /add-in/i },
  { label: "add-on", re: /add-?on(?![A-Za-z])/i },
  { label: "plugin", re: /plug-?in/i },
  { label: "tool", re: /(?<![A-Za-z])tools?(?![A-Za-z])/i },
  { label: "citation", re: /citation/i },
  { label: "referencing", re: /referenc/i },
  { label: "footnote", re: /footnote/i },
  { label: "bibliography", re: /bibliograph/i },
];

const errors = [];
const warnings = [];

const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

/** Strip scripts, styles, comments and tags — what a crawler reads as text. */
function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}

const pages = fs
  .readdirSync(root)
  .filter((f) => f.endsWith(".html") && !EXCLUDE.has(f))
  .sort();

const descriptions = new Map();

for (const file of pages) {
  const html = read(file);
  const where = (msg) => errors.push(`${file}: ${msg}`);

  const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
  const desc = (html.match(/<meta name="description" content="([\s\S]*?)">/) || [])[1];

  if (!title) where("no <title>");
  else if (title.length > 65) warnings.push(`${file}: title is ${title.length} chars — Google truncates near 60`);

  if (!desc) where("no meta description");
  else if (desc.length > 165)
    warnings.push(`${file}: meta description is ${desc.length} chars — Google truncates near 160`);
  else if (desc.length < 50) warnings.push(`${file}: meta description is only ${desc.length} chars`);

  if (!/rel="canonical"/.test(html)) where("no canonical link");
  if (!/property="og:title"/.test(html)) where("no og:title");

  if (desc) {
    if (descriptions.has(desc)) {
      where(`meta description is identical to ${descriptions.get(desc)} — duplicate-content signal`);
    } else {
      descriptions.set(desc, file);
    }
  }

  // JSON-LD must parse, and FAQ schema must have visible answers.
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const visibleQuestions = [...html.matchAll(/<summary class="faq__question">([\s\S]*?)<\/summary>/g)].map((m) =>
    visibleText(m[1]).trim()
  );

  blocks.forEach((b, i) => {
    let parsed;
    try {
      parsed = JSON.parse(b[1]);
    } catch (e) {
      where(`JSON-LD block ${i + 1} does not parse: ${e.message}`);
      return;
    }
    if (parsed["@type"] !== "FAQPage") return;
    for (const q of parsed.mainEntity || []) {
      if (!visibleQuestions.includes(q.name)) {
        where(
          `FAQ schema asks "${q.name}" but no visible answer renders it — ` +
            `Google drops rich results whose marked-up content is not on the page`
        );
      }
    }
  });
}

// Sitemap must match the indexable page set both ways.
const sitemap = read("sitemap.xml");
const listed = [...sitemap.matchAll(/<loc>https:\/\/obiter\.com\.au\/([^<]*)<\/loc>/g)].map((m) => m[1]);
for (const loc of listed) {
  const f = loc === "" ? "index.html" : loc;
  if (!fs.existsSync(path.join(root, f))) errors.push(`sitemap.xml: lists ${loc} but ${f} does not exist`);
}
for (const file of pages) {
  const expected = file === "index.html" ? "" : file;
  if (!listed.includes(expected)) errors.push(`sitemap.xml: does not list ${file}`);
}

// The homepage must genuinely use each search term.
const homeText = visibleText(read("index.html"));
for (const t of TOKENS) {
  if (!t.re.test(homeText)) {
    errors.push(`index.html: visible text never uses "${t.label}" — searches for it cannot match`);
  }
}

for (const w of warnings) console.warn(`  warn  ${w}`);

if (errors.length > 0) {
  console.error(`\ncheck-seo: ${errors.length} problem(s) —\n`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}

console.log(`check-seo: OK — ${pages.length} pages checked, ${TOKENS.length} search terms present on the homepage.`);
