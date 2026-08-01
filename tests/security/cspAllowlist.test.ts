/**
 * TRUST-001: CSP connect-src allowlist guard.
 *
 * Scans every TypeScript file under src/ for `https://<host>` string
 * literals and fails when a host is neither in the CSP connect-src
 * allowlist (config/csp.js CONNECT_SRC_HOSTS) nor in the explicit
 * ignore-list below. This makes CI fail when someone adds a fetch to a
 * new external host without updating the allowlist — the built pages
 * ship a strict `connect-src`, so an unlisted host would be blocked at
 * runtime on every platform.
 *
 * If this test fails on a host you added:
 *   - if the host is fetched at runtime (fetch/XHR), add it to
 *     CONNECT_SRC_HOSTS in config/csp.js (with a comment saying which
 *     module fetches it), and
 *   - if it is only ever a hyperlink, documentation reference, or example
 *     string, add it to IGNORED_HOSTS below with a comment.
 */

import * as fs from "fs";
import * as path from "path";

import {
  CONNECT_SRC_HOSTS,
  SCRIPT_SRC_HOSTS,
  CSP_META_POLICY,
  CSP_HEADER_POLICY,
} from "../../config/csp";

const SRC_DIR = path.resolve(__dirname, "../../src");

/**
 * Hosts that appear as https:// literals in src/ but are never fetch()
 * targets. Every entry carries a justification; remove entries when the
 * corresponding literal disappears from src/.
 */
const IGNORED_HOSTS: ReadonlySet<string> = new Set([
  // -- Placeholders / test fixtures (never contacted) --
  "https://example.com", // generic placeholder in comments and UI examples
  "https://api.example.com", // Settings custom-endpoint input placeholder
  "https://example.govt.nz", // NZ legislation placeholder examples
  "https://mock.obiter.test", // mockAdapter fake sourceUrl (tests/dev only)

  // -- Provider consoles: "get your API key" hyperlinks in Settings --
  "https://platform.openai.com",
  "https://console.anthropic.com",
  "https://aistudio.google.com",
  "https://console.x.ai",
  "https://platform.deepseek.com",

  // -- Documentation / marketing hyperlinks (opened in browser, not fetched) --
  "https://github.com", // repo + releases links (api.github.com IS fetched and allowlisted)
  "https://marketplace.microsoft.com", // AppSource listing / reviews link
  "https://developer.microsoft.com", // Office Add-ins documentation links
  "https://creativecommons.org", // licence links in citation data
  "https://claude.ai", // provider mention in LLM docs/comments

  // -- Source links built for the user to open (window.open / <a href>) --
  "https://doi.org", // DOI resolver links built from adapter metadata
  "https://pro.jade.io", // Jade Professional article links (jadeProAdapter)
  "https://au.westlaw.com", // Westlaw AU deep links (westlawAdapter, link-only)
  "https://advance.lexis.com", // Lexis+ deep links (lexisAdapter, link-only)
  "https://au.vlex.com", // vLex reader links (api.vlex.com IS fetched and allowlisted)
  "https://heinonline.org", // HeinOnline links (link-only source)
  "https://www.timebase.com.au", // TimeBase links (link-only source)
  "https://papers.ssrn.com", // SSRN links (link-only source)
  "https://scholar.google.com", // Google Scholar links (link-only)
  "https://books.google.com", // Google Books links (link-only)
  "https://www.google.com", // generic search links (link-only)

  // -- Court / tribunal / government websites referenced in UI data and
  //    practice-direction guides (src/ui/data/*, src/engine/court/*) —
  //    displayed as hyperlinks, never fetched --
  "https://www.hcourt.gov.au",
  "https://eresources.hcourt.gov.au",
  "https://www.fcfcoa.gov.au",
  "https://www.comcourts.gov.au",
  "https://www.fwc.gov.au",
  "https://www.art.gov.au",
  "https://www.ag.gov.au",
  "https://www.courts.act.gov.au",
  "https://www.courts.qld.gov.au",
  "https://www.courts.sa.gov.au",
  "https://supremecourt.nsw.gov.au", // CRIT-004: justice.nsw.gov.au host retired (expired cert)
  "https://www.supremecourt.vic.gov.au",
  "https://www.supremecourt.wa.gov.au",
  "https://www.supremecourt.tas.gov.au",
  "https://www.supremecourt.nt.gov.au",
  // A5-CM-1: AI-use practice-direction reference links (displayed, never fetched)
  "https://www.districtcourt.nsw.gov.au",
  "https://localcourt.nsw.gov.au",
  "https://ncat.nsw.gov.au",
  "https://www.countycourt.vic.gov.au",
  "https://www.qcat.qld.gov.au",

  // -- Example citations in reference-guide data (cited sources, not fetched) --
  "https://www.smh.com.au", // newspaper citation example
  "https://www.health.gov.au", // government-material citation example
  "https://chat.openai.com", // AI-tool citation example (AGLC internet materials)
  "https://twitter.com", // social-media citation example
  "https://youtube.com", // social-media citation example
]);

/** Recursively collect .ts/.tsx files under a directory. */
function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectSourceFiles(full));
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** Extract unique https:// origins (scheme + host) from file contents. */
function extractHosts(files: string[]): Map<string, string[]> {
  // Hostname must contain at least one dot so scheme-only fragments like
  // `startsWith("https://")` are not counted.
  const pattern = /https:\/\/[A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z0-9-]+/g;
  const hosts = new Map<string, string[]>();
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    for (const match of content.match(pattern) ?? []) {
      const origin = match.toLowerCase();
      const list = hosts.get(origin) ?? [];
      if (!list.includes(file)) list.push(file);
      hosts.set(origin, list);
    }
  }
  return hosts;
}

describe("TRUST-001 CSP connect-src allowlist", () => {
  const files = collectSourceFiles(SRC_DIR);
  const found = extractHosts(files);
  const allowed = new Set([...CONNECT_SRC_HOSTS, ...SCRIPT_SRC_HOSTS]);

  test("every https:// host referenced in src/ is allowlisted or explicitly ignored", () => {
    const unknown: string[] = [];
    for (const [origin, where] of found) {
      if (allowed.has(origin) || IGNORED_HOSTS.has(origin)) continue;
      const rel = where.map((f) => path.relative(path.dirname(SRC_DIR), f)).join(", ");
      unknown.push(`${origin} (referenced in: ${rel})`);
    }
    expect({
      hint:
        "New external host detected. If it is fetched at runtime, add it to " +
        "CONNECT_SRC_HOSTS in config/csp.js; if it is link-only, add it to " +
        "IGNORED_HOSTS in tests/security/cspAllowlist.test.ts. See file headers.",
      unknownHosts: unknown,
    }).toEqual({ hint: expect.any(String), unknownHosts: [] });
  });

  test("allowlist entries are well-formed https origins without paths", () => {
    for (const entry of [...CONNECT_SRC_HOSTS, ...SCRIPT_SRC_HOSTS]) {
      expect(entry).toMatch(/^https:\/\/[a-z0-9][a-z0-9.-]*\.[a-z0-9-]+$/);
    }
  });

  test("allowlist has no duplicate entries", () => {
    const all = [...CONNECT_SRC_HOSTS];
    expect(new Set(all).size).toBe(all.length);
  });

  test("meta policy has no unsafe-inline/unsafe-eval in script-src and no frame-ancestors", () => {
    const scriptSrc = CSP_META_POLICY.split(";").find((d) => d.trim().startsWith("script-src"));
    expect(scriptSrc).toBeDefined();
    expect(scriptSrc).not.toContain("unsafe-inline");
    expect(scriptSrc).not.toContain("unsafe-eval");
    // frame-ancestors is header-only; it must not appear in the meta variant.
    expect(CSP_META_POLICY).not.toContain("frame-ancestors");
  });

  test("header policy (TRUST-002) adds frame-ancestors and Turnstile (ACCT-002)", () => {
    expect(CSP_HEADER_POLICY).toContain(
      "frame-ancestors 'self' https://*.officeapps.live.com https://*.office.com " +
        "https://*.microsoft365.com https://*.cloud.microsoft https://*.sharepoint.com"
    );
    // Turnstile is header-only: allowed on the served web pages (contact/
    // signature/account forms), never in the sandboxed add-in task pane.
    expect(CSP_HEADER_POLICY).toContain("https://challenges.cloudflare.com");
    expect(CSP_HEADER_POLICY).toContain("frame-src 'self' https://challenges.cloudflare.com");
    expect(CSP_META_POLICY).not.toContain("challenges.cloudflare.com");
    expect(CSP_META_POLICY).not.toContain("frame-src");
    // The header still contains every add-in directive from the meta variant.
    expect(CSP_HEADER_POLICY).toContain("default-src 'none'");
    expect(CSP_HEADER_POLICY).toContain("object-src 'none'");
  });

  test("every connect-src allowlist host appears in the built policy", () => {
    for (const host of CONNECT_SRC_HOSTS) {
      expect(CSP_META_POLICY).toContain(host);
    }
  });
});
