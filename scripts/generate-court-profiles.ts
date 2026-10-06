/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Script: generate-court-profiles (COURT-115)
 * Writes docs/court-profiles.md from the court preset and provenance data.
 * Run: npx ts-node scripts/generate-court-profiles.ts
 */

import * as fs from "fs";
import * as path from "path";
import { renderCourtProfilesMarkdown } from "../src/engine/court/profileDocs";

const outputPath = path.resolve(__dirname, "..", "docs", "court-profiles.md");
fs.writeFileSync(outputPath, renderCourtProfilesMarkdown(), "utf-8");
console.log(`Court profiles written to ${outputPath}`);
