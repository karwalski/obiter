/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Script: export-skill
 * Exports the Copilot skill declaration (COPILOT-005) to
 * docs/obiter-copilot-skill.json. Mirrors export-rules.ts.
 */

import * as fs from "fs";
import * as path from "path";
import { buildCopilotSkillManifest } from "../src/actions/skillManifest";
import { buildUnifiedManifest, buildDeclarativeAgent } from "../src/actions/unifiedManifest";

const root = path.resolve(__dirname, "..");
const docsDir = path.join(root, "docs");
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

function writeJson(target: string, value: unknown): void {
  fs.writeFileSync(target, JSON.stringify(value, null, 2) + "\n", "utf-8");
}

// 1) The stable intermediate skill declaration (COPILOT-005) → docs/.
const skill = buildCopilotSkillManifest();
const skillPath = path.join(docsDir, "obiter-copilot-skill.json");
writeJson(skillPath, skill);

// 2) The unified Microsoft 365 app manifest + declarative agent (COPILOT-011) →
// repo root, so scripts/package-skill.sh can zip them with the icons.
const unifiedPath = path.join(root, "manifest.skill.json");
const agentPath = path.join(root, "declarativeAgent.json");
writeJson(unifiedPath, buildUnifiedManifest());
writeJson(agentPath, buildDeclarativeAgent());

console.log(`Copilot skill declaration exported to ${skillPath}`);
console.log(`  Contract version: ${skill.contractVersion}`);
console.log(`  Review mode: ${skill.reviewMode}`);
console.log(`  Actions: ${skill.actions.length}`);
console.log(`  Source types in schema: ${skill.sourceTypeSchema.sourceTypes.length}`);
console.log(`Unified M365 manifest exported to ${unifiedPath}`);
console.log(`Declarative agent exported to ${agentPath}`);
