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
import {
  buildUnifiedManifest,
  buildDeclarativeAgent,
  PLUGIN_FILE_NAME,
} from "../src/actions/unifiedManifest";
import { buildPluginManifest } from "../src/actions/pluginManifest";
import { MAX_AGENT_INSTRUCTIONS_LENGTH } from "../src/actions/agentInstructions";

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
const pluginPath = path.join(root, PLUGIN_FILE_NAME);
// DEVPREVIEW=1 emits the devPreview manifest schema for Agents-Toolkit
// sideload testing when a distribution service rejects the numbered schema.
const unified = buildUnifiedManifest(undefined, { devPreview: !!process.env.DEVPREVIEW });
const agent = buildDeclarativeAgent();
const plugin = buildPluginManifest();

// Schema gates the admin-center upload enforces — fail the build, not the upload.
if (agent.instructions.length > MAX_AGENT_INSTRUCTIONS_LENGTH) {
  throw new Error(
    `declarativeAgent.instructions is ${agent.instructions.length} chars — the ` +
      `declarative-agent schema caps it at ${MAX_AGENT_INSTRUCTIONS_LENGTH}.`
  );
}
if (unified.description.short.length > 80) {
  throw new Error(
    `manifest description.short is ${unified.description.short.length} chars — the app manifest schema caps it at 80.`
  );
}

// The chain Copilot resolves must stay consistent: agent → plugin functions →
// runtime executeDataFunction action ids → Office.actions.associate ids.
const pluginNames = plugin.functions.map((f) => f.name).sort();
const extensions = unified.extensions as Array<{
  runtimes: Array<{ actions: Array<{ id: string; type: string }> }>;
}>;
const dataActionIds = extensions[0].runtimes
  .flatMap((r) => r.actions)
  .filter((a) => a.type === "executeDataFunction")
  .map((a) => a.id)
  .sort();
if (JSON.stringify(pluginNames) !== JSON.stringify(dataActionIds)) {
  throw new Error(
    `Plugin function names [${pluginNames}] do not match executeDataFunction action ids [${dataActionIds}].`
  );
}

writeJson(unifiedPath, unified);
writeJson(agentPath, agent);
writeJson(pluginPath, plugin);

console.log(`Copilot skill declaration exported to ${skillPath}`);
console.log(`  Contract version: ${skill.contractVersion}`);
console.log(`  Review mode: ${skill.reviewMode}`);
console.log(`  Actions: ${skill.actions.length}`);
console.log(`  Source types in schema: ${skill.sourceTypeSchema.sourceTypes.length}`);
console.log(`Unified M365 manifest exported to ${unifiedPath} (${unified.manifestVersion})`);
console.log(`Declarative agent exported to ${agentPath}`);
console.log(`Copilot plugin exported to ${pluginPath} (${plugin.functions.length} functions)`);
