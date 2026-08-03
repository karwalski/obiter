#!/usr/bin/env node
/*
 * Version-sync guard.
 *
 * package.json is the single source of truth for the Obiter version (the
 * release workflow verifies the git tag against it — see docs/ci-cd.md). This
 * script asserts that every OTHER place a version is baked in agrees, so a
 * release can never ship with a stale displayed version or a stale cache key.
 *
 * Checked locations:
 *   - src/constants.ts   APP_VERSION        must EXACTLY equal package.json.
 *   - src/sw.js          CACHE_NAME         must EXACTLY equal `obiter-v<version>`
 *                                           (bumping it forces the service worker
 *                                           to purge old caches on activate — the
 *                                           web-deploy cache-buster for patches).
 *   - README.md          H1 heading         must EXACTLY equal `# Obiter v<version>`.
 *                                           This is the repo's landing page — a
 *                                           stale H1 is the most visible drift
 *                                           there is (it read v1.14.4 while
 *                                           v1.16.12 was live).
 *   - manifest*.xml      <Version>          major.minor must match package.json.
 *                                           The patch component is allowed to lag:
 *                                           a patch is web-deploy only and does not
 *                                           touch the manifest XML (see the
 *                                           versioning policy in docs/ci-cd.md).
 *
 * Runs automatically before every production build (npm run build -> prebuild)
 * and in CI. Exits non-zero with a precise message on any drift.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const errors = [];

const pkgVersion = require(path.join(root, "package.json")).version;
if (!/^\d+\.\d+\.\d+$/.test(pkgVersion)) {
  console.error(`check-version-sync: package.json version "${pkgVersion}" is not X.Y.Z`);
  process.exit(1);
}
const [pkgMajor, pkgMinor] = pkgVersion.split(".");

// src/constants.ts — APP_VERSION must be an exact match.
const constMatch = read("src/constants.ts").match(/APP_VERSION\s*=\s*"([^"]+)"/);
if (!constMatch) {
  errors.push("src/constants.ts: could not find APP_VERSION");
} else if (constMatch[1] !== pkgVersion) {
  errors.push(
    `src/constants.ts APP_VERSION is "${constMatch[1]}" but package.json is "${pkgVersion}" — bump APP_VERSION to "${pkgVersion}".`
  );
}

// src/sw.js — CACHE_NAME must be obiter-v<version> exactly (cache-buster).
const swMatch = read("src/sw.js").match(/CACHE_NAME\s*=\s*"([^"]+)"/);
const expectedCache = `obiter-v${pkgVersion}`;
if (!swMatch) {
  errors.push("src/sw.js: could not find CACHE_NAME");
} else if (swMatch[1] !== expectedCache) {
  errors.push(
    `src/sw.js CACHE_NAME is "${swMatch[1]}" but should be "${expectedCache}" — bump it so the service worker purges stale caches on deploy.`
  );
}

// README.md — the H1 is the GitHub landing page; it must name the current version.
const readmeMatch = read("README.md").match(/^#\s+Obiter\s+v([\d.]+)\s*$/m);
if (!readmeMatch) {
  errors.push('README.md: could not find an "# Obiter v<version>" H1 heading');
} else if (readmeMatch[1] !== pkgVersion) {
  errors.push(
    `README.md H1 is "Obiter v${readmeMatch[1]}" but package.json is "${pkgVersion}" — ` +
      `update the heading to "# Obiter v${pkgVersion}" (it is the first thing shown on GitHub).`
  );
}

// manifest*.xml — <Version> major.minor must match (patch may lag on web-only patches).
for (const file of fs.readdirSync(root)) {
  if (!/^manifest.*\.xml$/.test(file)) continue;
  // The Copilot/skill variant is on hold and outside the release flow
  // (docs/ci-cd.md), like the release-pruning Copilot exclusion — skip it.
  if (/skill|copilot/i.test(file)) continue;
  const m = read(file).match(/<Version>\s*([\d.]+)\s*<\/Version>/);
  if (!m) continue; // not all manifests carry a <Version>
  const [maj, min] = m[1].split(".");
  if (maj !== pkgMajor || min !== pkgMinor) {
    errors.push(
      `${file} <Version> is "${m[1]}" but package.json major.minor is "${pkgMajor}.${pkgMinor}" — ` +
        `a minor/major release must bump the manifest <Version> (a patch may leave it, as it is web-deploy only).`
    );
  }
}

if (errors.length > 0) {
  console.error("check-version-sync: version drift detected —\n");
  for (const e of errors) console.error("  - " + e);
  console.error("\nSee the deploy checklist in docs/ci-cd.md.");
  process.exit(1);
}

console.log(`check-version-sync: OK — all version locations agree with package.json (${pkgVersion}).`);
