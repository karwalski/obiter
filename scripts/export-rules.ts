/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Script: export-rules
 * Exports the AGLC4 rule reference to docs/aglc4-rules.json.
 */

import * as fs from "fs";
import * as path from "path";
import { exportRuleReference } from "../src/engine/ruleExporter";

const reference = exportRuleReference();
const outputDir = path.resolve(__dirname, "..", "docs");
const outputPath = path.join(outputDir, "aglc4-rules.json");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(reference, null, 2) + "\n", "utf-8");

console.log(`Rule reference exported to ${outputPath}`);
console.log(`  Source types: ${reference.sourceTypes.length}`);
console.log(`  Report series: ${reference.reportSeries.length}`);
console.log(`  Court identifiers: ${reference.courtIdentifiers.length}`);
console.log(`  Pinpoint abbreviations: ${reference.pinpointAbbreviations.length}`);
