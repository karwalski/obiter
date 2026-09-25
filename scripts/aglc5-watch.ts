/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Script: aglc5-watch (A5-WS-2)
 * Checks the AGLC5 Committee page against scripts/aglc5-watch-baseline.json.
 *
 *   npm run aglc5:watch                  compare with the baseline
 *   npm run aglc5:watch -- --update      record the current page as the baseline
 *
 * Exit codes: 0 unchanged, 1 changed (start runbook §2 triage), 2 unreadable.
 * The page returns HTTP 403 (Cloudflare) to plain fetchers, so on a failed
 * direct fetch the script retries through the r.jina.ai text proxy (set
 * AGLC5_WATCH_NO_PROXY=1 to disable). An unreadable page is never reported
 * as unchanged.
 */

import * as fs from "fs";
import * as path from "path";
import { checkReadable, diffSignals, extractSignals, WatchSignals } from "./aglc5WatchSignals";

const PAGE_URL = "https://law.unimelb.edu.au/mulr/aglc/aglc-5";
const PROXY_URL = `https://r.jina.ai/${PAGE_URL}`;
const BASELINE_PATH = path.resolve(__dirname, "aglc5-watch-baseline.json");
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

interface Baseline {
  url: string;
  recordedAt: string;
  via: string;
  signals: WatchSignals;
}

async function fetchText(
  url: string,
  headers: Record<string, string>
): Promise<{ status: number; body: string }> {
  try {
    const res = await fetch(url, { headers });
    return { status: res.status, body: await res.text() };
  } catch (err) {
    return { status: 0, body: String(err) };
  }
}

async function readPage(): Promise<{ via: string; body: string } | { error: string }> {
  const reasons: string[] = [];
  const direct = await fetchText(PAGE_URL, { "User-Agent": USER_AGENT });
  const directCheck = checkReadable(direct.status, direct.body);
  if (directCheck.readable) return { via: "direct", body: direct.body };
  reasons.push(`direct: ${directCheck.reason}`);

  if (process.env.AGLC5_WATCH_NO_PROXY !== "1") {
    // The proxy refuses browser-like user agents; ask for plain text instead.
    const proxied = await fetchText(PROXY_URL, { Accept: "text/plain" });
    const proxyCheck = checkReadable(proxied.status, proxied.body);
    if (proxyCheck.readable) return { via: "r.jina.ai proxy", body: proxied.body };
    reasons.push(`proxy: ${proxyCheck.reason}`);
  }
  return { error: reasons.join("; ") };
}

async function main(): Promise<number> {
  const update = process.argv.includes("--update");
  const page = await readPage();
  if ("error" in page) {
    console.error(`UNREADABLE: ${PAGE_URL} (${page.error}).`);
    console.error("This is not a 'no change' result. Check the page in a browser.");
    return 2;
  }
  const signals = extractSignals(page.body);

  if (update || !fs.existsSync(BASELINE_PATH)) {
    const baseline: Baseline = {
      url: PAGE_URL,
      recordedAt: new Date().toISOString(),
      via: page.via,
      signals,
    };
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + "\n", "utf-8");
    console.log(`Baseline recorded (${page.via}) at ${BASELINE_PATH}`);
    return 0;
  }

  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf-8")) as Baseline;
  const changes = diffSignals(baseline.signals, signals);
  if (changes.length === 0) {
    console.log(`UNCHANGED since ${baseline.recordedAt} (read ${page.via}).`);
    return 0;
  }
  console.log(`CHANGED since ${baseline.recordedAt} (read ${page.via}):`);
  for (const c of changes) console.log(`  - ${c}`);
  console.log("Triage per docs/aglc5-publication-runbook.md §1, then rerun with --update.");
  return 1;
}

main().then((code) => process.exit(code));
