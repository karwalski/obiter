/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * The Obiter action catalogue (COPILOT-004). A declarative registry of the
 * operations Obiter exposes as Microsoft Copilot skill actions — names,
 * LLM-facing descriptions, input contracts, and effect kind. It is the single
 * source the Copilot manifest / declarative-agent config is generated from, and
 * the surface a future jurisd skill / MCP client targets. Each action maps to a
 * function in citationService (the one code path the task pane also uses).
 *
 * This module is pure data + a contract bundler; it does not perform document
 * mutation itself (that happens in citationService, in the add-in runtime).
 */

import { exportRuleReference, RuleReference } from "../engine/ruleExporter";
import { CITATION_REQUEST_CONTRACT_VERSION } from "./citationRequest";

export type ActionEffect = "mutation" | "read" | "pure";

export interface ObiterAction {
  /** Stable action id used in the Copilot manifest. */
  name: string;
  /** Natural-language description the LLM uses to decide when to call the action. */
  description: string;
  /** Human/agent-readable summary of the expected input. */
  input: string;
  /** Whether the action mutates the document, only reads it, or is pure. */
  effect: ActionEffect;
  /** The citationService export that implements it (for in-process dispatch/tests). */
  handler: string;
}

export const OBITER_ACTIONS: ObiterAction[] = [
  {
    name: "insertCitation",
    description:
      "Insert an AGLC4 citation into the Word document as a native footnote. Accepts structured citation fields (source type + data); Obiter formats them per AGLC4 and inserts a real Word footnote, reusing an existing citation for subsequent references.",
    input: "CitationInsertRequest",
    effect: "mutation",
    handler: "insertCitation",
  },
  {
    name: "formatCitation",
    description:
      "Return the AGLC4-formatted text of a citation without inserting it. Use to preview or to obtain the formatted string for display.",
    input: "CitationInsertRequest",
    effect: "pure",
    handler: "formatCitationRuns",
  },
  {
    name: "updateCitation",
    description:
      "Re-format and update every occurrence of an existing citation (identified by its id) from new structured fields.",
    input: "{ citationId: string, request: CitationInsertRequest }",
    effect: "mutation",
    handler: "updateCitation",
  },
  {
    name: "deleteCitation",
    description: "Remove a specific footnote occurrence of a citation from the document.",
    input: "{ citationId: string, footnoteIndex: number }",
    effect: "mutation",
    handler: "deleteCitation",
  },
  {
    name: "refreshFootnotes",
    description:
      "Re-render every managed footnote: fix ibid and short references, renumber, and normalise separators/punctuation.",
    input: "(none)",
    effect: "mutation",
    handler: "refreshFootnotes",
  },
];

/**
 * The complete, versioned insert contract for external callers (Copilot's LLM, a
 * jurisd skill, an MCP client). Bundles the contract version, the action list,
 * and the machine-readable per-source-type field schema (required/optional
 * fields, rule numbers, templates) so a caller can build a valid request.
 */
export interface CitationInsertContract {
  contractVersion: string;
  actions: ObiterAction[];
  /** Per-source-type field schema from the engine (RESEARCH-005). */
  sourceTypeSchema: RuleReference;
}

export function getCitationInsertContract(): CitationInsertContract {
  return {
    contractVersion: CITATION_REQUEST_CONTRACT_VERSION,
    actions: OBITER_ACTIONS,
    sourceTypeSchema: exportRuleReference(),
  };
}
