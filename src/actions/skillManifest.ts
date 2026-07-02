/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Copilot skill-declaration generator (COPILOT-005/006). Produces the declarative
 * agent / skill payload that registers the Obiter add-in's document operations as
 * Microsoft 365 Copilot actions. It is generated from the same catalogue the task
 * pane uses (OBITER_ACTIONS + getCitationInsertContract), so the skill surface can
 * never drift from the one code path in citationService.
 *
 * This is pure data assembly (no Office.js, no document mutation). A build script
 * (scripts/export-skill.ts) serialises it to docs/obiter-copilot-skill.json for
 * the preview manifest; the exact Copilot manifest schema is preview, so this is
 * the stable intermediate any binding targets.
 */

import { getCitationInsertContract, ObiterAction } from "./actionCatalogue";
import { buildAgentInstructions } from "./agentInstructions";
import { RuleReference } from "../engine/ruleExporter";

/** How a citation is surfaced before it lands in the document (COPILOT-006). */
export type ReviewMode = "direct";

/** A single Copilot-invocable action, projected from an ObiterAction. */
export interface CopilotSkillAction {
  name: string;
  description: string;
  /** Human/agent-readable summary of the expected input shape. */
  input: string;
  /** Whether invoking the action mutates the document, only reads it, or is pure. */
  effect: ObiterAction["effect"];
}

/** The generated Copilot skill declaration. */
export interface CopilotSkillManifest {
  /** Skill id / display name Copilot surfaces. */
  name: string;
  description: string;
  /** Version of the CitationInsertRequest contract these actions accept. */
  contractVersion: string;
  /**
   * Review model for mutations. "direct": Obiter inserts the native footnote and
   * returns a structured result; the user reviews via Copilot's confirmation and
   * Word's track changes (COPILOT-006 — direct insert; no pane-driving needed).
   */
  reviewMode: ReviewMode;
  /** Natural-language instructions embedding the AGLC4 classify/parse guidance. */
  instructions: string;
  /** The Copilot-invocable actions, one per OBITER_ACTIONS entry. */
  actions: CopilotSkillAction[];
  /** Per-source-type field schema (required/optional fields, rule numbers, templates). */
  sourceTypeSchema: RuleReference;
}

/**
 * Build the Copilot skill declaration from the live action catalogue, the
 * versioned insert contract, and the composed agent instructions. Every action
 * in OBITER_ACTIONS becomes a Copilot action; the engine's per-source-type
 * schema is bundled so Copilot's LLM can construct valid CitationInsertRequests.
 */
export function buildCopilotSkillManifest(): CopilotSkillManifest {
  const contract = getCitationInsertContract();
  return {
    name: "Obiter — AGLC4 Citations",
    description:
      "Insert, update, and refresh AGLC4-formatted citations as native Word footnotes. " +
      "Obiter's engine is the authority for AGLC4 formatting; callers supply structured fields.",
    contractVersion: contract.contractVersion,
    reviewMode: "direct",
    instructions: buildAgentInstructions(),
    actions: contract.actions.map((a) => ({
      name: a.name,
      description: a.description,
      input: a.input,
      effect: a.effect,
    })),
    sourceTypeSchema: contract.sourceTypeSchema,
  };
}
