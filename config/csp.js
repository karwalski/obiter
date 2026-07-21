/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * TRUST-001: Single source of truth for the Content Security Policy applied
 * to the served add-in pages (taskpane.html, commands.html, sharedRuntime.html).
 *
 * This module is CommonJS so it can be require()d from webpack.config.js at
 * build time (the templates receive the policy as an injected <meta> tag via
 * HtmlWebpackPlugin's `meta` option) and from the Jest guard test
 * (tests/security/cspAllowlist.test.ts), which fails when a fetch to a new
 * external host is added to src/ without updating CONNECT_SRC_HOSTS below.
 *
 * TRUST-002 (nginx security headers) must use CSP_HEADER_POLICY — identical to
 * the meta policy plus `frame-ancestors`, which is a header-only directive and
 * is ignored inside a <meta> tag.
 *
 * office.js integrity note: SRI/self-hosting of office.js is rejected per
 * Microsoft guidance (the CDN is updated in place and /lib/1/hosted/ is the
 * only supported production URL); host-pinning via script-src below is the
 * mitigation (recorded for TRUST-007 / THREAT-MODEL.md).
 */

"use strict";

/**
 * Hosts allowed to serve scripts. `'self'` is added by buildCsp().
 *
 * - appsforoffice.microsoft.com — office.js production CDN
 * - ajax.aspnetcdn.com — Microsoft Ajax CDN; office.js pulls locale/string
 *   resources from here on some hosts (per the story spec and Microsoft docs)
 *
 * @type {ReadonlyArray<string>}
 */
const SCRIPT_SRC_HOSTS = Object.freeze([
  "https://appsforoffice.microsoft.com",
  "https://ajax.aspnetcdn.com",
]);

/**
 * Cloudflare Turnstile origin (ACCT-002). Added to the HEADER policy variant
 * only (script-src, frame-src, connect-src) — the pages that host the widget
 * are served over the web (contact/signature forms, account auth pages), not
 * the sandboxed add-in task pane.
 */
const TURNSTILE_HOST = "https://challenges.cloudflare.com";

/**
 * Every external origin the add-in fetches at runtime (connect-src).
 * `'self'` is added by buildCsp(). Keep this list in sync with the code —
 * tests/security/cspAllowlist.test.ts enforces it.
 *
 * @type {ReadonlyArray<string>}
 */
const CONNECT_SRC_HOSTS = Object.freeze([
  // ── Obiter infrastructure ─────────────────────────────────────────────
  "https://obiter.com.au", // API proxy (/api/proxy/*), error reports, analytics (src/constants.ts WEBSITE_URL)
  "https://corpus.obiter.com.au", // corpus CDN index + manifests (src/api/corpus/corpusDownload.ts)
  "https://search.obiter.com.au", // cloud search service (src/api/cloud/cloudClient.ts)

  // ── Version check ─────────────────────────────────────────────────────
  "https://api.github.com", // release check (src/ui/hooks/useVersionCheck.ts)

  // ── Fixed LLM providers (src/llm/client.ts DIRECT_ENDPOINTS) ──────────
  // Custom user-configured endpoints are NOT allowed here; they are routed
  // through the obiter.com.au proxy (see resolveEndpoint in src/llm/client.ts).
  "https://api.openai.com",
  "https://api.anthropic.com",
  "https://generativelanguage.googleapis.com",
  "https://api.x.ai",
  "https://api.deepseek.com",

  // ── Primary legal databases (src/api/*.ts clients) ────────────────────
  "https://www.austlii.edu.au", // AustLII (src/api/austlii.ts, src/api/treaties.ts)
  "https://www.legislation.gov.au", // Federal Register of Legislation (src/api/legislation.ts, frlAdapter)
  "https://jade.io", // Jade (src/api/jade.ts)
  "https://treaties.un.org", // UN Treaty Collection (src/api/treaties.ts)

  // ── State/territory legislation (src/api/adapters/*Legislation.ts) ────
  "https://legislation.act.gov.au",
  "https://legislation.nsw.gov.au",
  "https://legislation.nt.gov.au",
  "https://legislation.qld.gov.au",
  "https://legislation.sa.gov.au",
  "https://legislation.tas.gov.au",
  "https://legislation.vic.gov.au",
  "https://legislation.wa.gov.au",

  // ── Courts / case law feeds (src/api/adapters/*) ──────────────────────
  "https://data.gov.au", // ACT Supreme Court RSS (actScRssAdapter)
  "https://ecourts.justice.wa.gov.au", // WA Supreme Court RSS (waScRssAdapter)
  "https://www.fedcourt.gov.au", // FCA judgments RSS (fcaRssAdapter)
  "https://www.sclqld.org.au", // Supreme Court Library Qld RSS (sclqldRssAdapter)
  "https://www.caselaw.nsw.gov.au", // NSW Caselaw (nswCaselawAdapter)

  // ── Parliaments / Hansard (src/api/adapters/*) ────────────────────────
  "https://parlinfo.aph.gov.au", // Commonwealth Hansard (cthHansardAdapter)
  "https://api.parliament.nsw.gov.au", // NSW Hansard (nswHansardAdapter)
  "https://hansard.parliament.sa.gov.au", // SA Hansard (saHansardAdapter)
  "https://www.openaustralia.org.au", // OpenAustralia API (openAustraliaAdapter)

  // ── Treaties (src/api/adapters/dfatTreatiesAdapter.ts) ────────────────
  "https://www.info.dfat.gov.au",

  // ── Journals / scholarly metadata (src/api/adapters/*) ────────────────
  "https://api.crossref.org", // crossrefAdapter
  "https://api.openalex.org", // openAlexAdapter
  "https://doaj.org", // doajAdapter
  "https://api.vlex.com", // vlexAdapter (API; au.vlex.com is link-only)

  // ── Law reform commissions (src/api/adapters/lrcAdapter.ts) ───────────
  "https://www.alrc.gov.au",
  "https://www.lawreform.justice.nsw.gov.au",
  "https://www.lawreform.vic.gov.au",
  "https://www.qlrc.qld.gov.au",
  "https://www.lrc.justice.wa.gov.au",
  "https://law.adelaide.edu.au",
  "https://www.utas.edu.au",
  "https://justice.nt.gov.au",
]);

/**
 * frame-ancestors sources for the HEADER policy only (TRUST-002).
 * frame-ancestors is ignored in <meta> CSP, so it is excluded from
 * CSP_META_POLICY. The Office host domains follow Microsoft's published
 * list of domains that embed add-in pages in iframes (Word on the web).
 *
 * @type {ReadonlyArray<string>}
 */
const FRAME_ANCESTORS = Object.freeze([
  "'self'",
  "https://*.officeapps.live.com",
  "https://*.office.com",
  "https://*.microsoft365.com",
  "https://*.cloud.microsoft",
  "https://*.sharepoint.com",
]);

/**
 * Build the full CSP string.
 *
 * @param {{ dev?: boolean, frameAncestors?: boolean }} [options]
 *   - dev: allow the webpack-dev-server HMR websocket (localhost only)
 *   - frameAncestors: include the header-only frame-ancestors directive
 *     (TRUST-002 nginx header variant; never valid in a <meta> tag)
 * @returns {string}
 */
function buildCsp(options) {
  const opts = options || {};
  // The HEADER variant (frameAncestors:true, TRUST-002 nginx) serves web pages
  // that may host the Cloudflare Turnstile widget (ACCT-002): the contact and
  // signature forms, and the account auth pages the ACCT-005 Office Dialog
  // opens. The add-in task pane never embeds Turnstile, so the tighter META
  // variant does NOT allow it — Turnstile is header-only, like frame-ancestors.
  const isHeader = !!opts.frameAncestors;
  const scriptSrc = ["'self'"].concat(SCRIPT_SRC_HOSTS);
  const connectSrc = ["'self'"].concat(CONNECT_SRC_HOSTS);
  const frameSrc = ["'self'"];
  if (isHeader) {
    scriptSrc.push(TURNSTILE_HOST); // Turnstile api.js
    connectSrc.push(TURNSTILE_HOST); // siteverify challenge callbacks
    frameSrc.push(TURNSTILE_HOST); // Turnstile renders its challenge in an iframe
  }
  if (opts.dev) {
    // webpack-dev-server hot-reload websocket (development builds only)
    connectSrc.push("ws://localhost:3000", "wss://localhost:3000");
  }
  const directives = [
    "default-src 'none'",
    "script-src " + scriptSrc.join(" "),
    "style-src 'self' 'unsafe-inline'", // style-loader + React inline styles require unsafe-inline
    "img-src 'self' data:",
    "font-src 'self' data:",
    "worker-src 'self'",
    "connect-src " + connectSrc.join(" "),
    "base-uri 'self'",
    "form-action 'none'",
    "object-src 'none'",
  ];
  if (isHeader) {
    directives.push("frame-src " + frameSrc.join(" "));
  }
  if (opts.frameAncestors) {
    directives.push("frame-ancestors " + FRAME_ANCESTORS.join(" "));
  }
  return directives.join("; ");
}

/** Production <meta http-equiv="Content-Security-Policy"> policy string. */
const CSP_META_POLICY = buildCsp();

/**
 * Header policy for TRUST-002 (nginx Content-Security-Policy header):
 * the meta policy plus frame-ancestors for the Office host domains.
 */
const CSP_HEADER_POLICY = buildCsp({ frameAncestors: true });

module.exports = {
  SCRIPT_SRC_HOSTS,
  CONNECT_SRC_HOSTS,
  FRAME_ANCESTORS,
  buildCsp,
  CSP_META_POLICY,
  CSP_HEADER_POLICY,
};
