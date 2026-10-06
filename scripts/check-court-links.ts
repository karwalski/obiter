/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Script: check-court-links (COURT-114)
 * Checks every court practice-direction and source URL Obiter cites and
 * reports the HTTP status, redirects, "page not found" pages and, where a
 * link records one, whether the expected version text is on the page.
 *
 *   npm run check-court-links                 report; exit 1 on a broken link
 *   npm run check-court-links -- --warn-only  report only; always exit 0
 *
 * Not run in CI by default. Sites behind Cloudflare (the Federal Court and
 * the NT Supreme Court) answer automated requests with 403; those are
 * reported as "blocked" and never fail the run. When a link moves, update
 * src/engine/court/practiceDirections.ts and set `lastVerified` only for
 * links this run reached.
 */

import {
  classifyLinkResponse,
  collectCourtLinks,
  exitCodeFor,
  type LinkCheckResult,
  type LinkResponse,
} from "./courtLinkCheck";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";
const TIMEOUT_MS = 25000;
const CONCURRENCY = 4;

async function fetchLink(url: string): Promise<LinkResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/pdf;q=0.9,*/*;q=0.8" },
      redirect: "follow",
      signal: controller.signal,
    });
    const type = res.headers.get("content-type") ?? "";
    // Read HTML bodies (for "page not found" text and version strings);
    // skip PDF and other binary bodies.
    const body = type.includes("html") || type.includes("text") ? await res.text() : undefined;
    if (body === undefined) await res.body?.cancel();
    return { status: res.status, finalUrl: res.url || url, body };
  } catch (err) {
    return { status: 0, finalUrl: url, error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

async function main(): Promise<void> {
  const warnOnly = process.argv.includes("--warn-only");
  const targets = collectCourtLinks();
  const results: Array<{
    url: string;
    citedBy: string[];
    result: LinkCheckResult;
    finalUrl: string;
  }> = [];

  let next = 0;
  async function worker(): Promise<void> {
    while (next < targets.length) {
      const target = targets[next++];
      const response = await fetchLink(target.url);
      results.push({
        url: target.url,
        citedBy: target.citedBy,
        finalUrl: response.finalUrl,
        result: classifyLinkResponse(response, target.expectText),
      });
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const order = { broken: 0, unreachable: 1, blocked: 2, ok: 3 } as const;
  results.sort(
    (a, b) => order[a.result.outcome] - order[b.result.outcome] || a.url.localeCompare(b.url)
  );

  for (const { url, citedBy, finalUrl, result } of results) {
    const label = result.outcome.toUpperCase().padEnd(11);
    console.log(`${label} ${result.reason.padEnd(12)} ${url}`);
    if (finalUrl !== url) console.log(`            redirected to ${finalUrl}`);
    if (result.versionMatch === false) console.log("            expected version text not found");
    if (result.outcome !== "ok") {
      for (const where of citedBy) console.log(`            cited by ${where}`);
    }
  }

  const count = (o: LinkCheckResult["outcome"]): number =>
    results.filter((r) => r.result.outcome === o).length;
  console.log(
    `\n${results.length} links: ${count("ok")} ok, ${count("blocked")} blocked, ` +
      `${count("broken")} broken, ${count("unreachable")} unreachable.`
  );
  process.exitCode = exitCodeFor(
    results.map((r) => r.result),
    warnOnly
  );
}

void main();
