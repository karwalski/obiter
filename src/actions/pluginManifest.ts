/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Copilot plugin manifest generator (COPILOT-017). Emits the plugin file that
 * binds the declarative agent to the add-in's runtime functions — the missing
 * link that made the shipped agent "Chat only". The chain Copilot resolves is:
 *
 *   declarativeAgent.json  --actions[].file-->  obiter-plugin.json
 *   obiter-plugin.json     --functions[].name-->  unified manifest runtime
 *                              actions (type "executeDataFunction", same ids)
 *   runtime action id      --Office.actions.associate-->  SKILL_DISPATCHERS
 *
 * The `namespace: "AddInFunctions"` value routes function calls to the add-in
 * runtime declared in the same app package (Microsoft's combine-agents-with-
 * add-ins preview). Function `name`s MUST equal the runtime action `id`s and
 * the ids registered via Office.actions.associate — a test guards the triple.
 */

import { OBITER_ACTIONS } from "./actionCatalogue";
import { CITATION_REQUEST_CONTRACT_VERSION } from "./citationRequest";

/** JSON-schema-ish parameter description for a plugin function. */
interface PluginParameters {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
}

interface PluginFunctionStates {
  reasoning: { description: string; instructions: string };
  responding: { description: string; instructions: string };
}

export interface PluginFunction {
  name: string;
  description: string;
  parameters: PluginParameters;
  states: PluginFunctionStates;
}

export interface PluginManifest {
  $schema: string;
  schema_version: string;
  name_for_human: string;
  description_for_human: string;
  namespace: string;
  functions: PluginFunction[];
}

/**
 * The CitationInsertRequest DTO (contract v1.0.0, src/actions/citationRequest.ts)
 * expressed as plugin parameter properties. `data` stays an open object — the
 * per-source-type field schema is delivered through the agent instructions
 * (buildAgentInstructions), which is where Copilot's reasoning reads it.
 */
const INSERT_REQUEST_PROPERTIES: Record<string, unknown> = {
  sourceType: {
    type: "string",
    description:
      "The AGLC4 source type identifier, exactly as listed in the agent instructions (e.g. 'case.reported', 'legislation.statute', 'journal.article', 'book').",
  },
  data: {
    type: "object",
    description:
      "The structured citation fields for the source type, using the field mappings in the agent instructions (e.g. party1, party2, year, volume, reportSeries, startingPage for a reported case).",
  },
  shortTitle: {
    type: "string",
    description: "Optional short title for subsequent references (AGLC4 rule 1.4.4).",
  },
  signal: {
    type: "string",
    description: "Optional introductory signal (AGLC4 rule 1.3), e.g. 'See', 'See also', 'Cf'.",
  },
  commentaryBefore: {
    type: "string",
    description: "Optional text to place before the citation inside the footnote.",
  },
  commentaryAfter: {
    type: "string",
    description: "Optional text to place after the citation inside the footnote.",
  },
  overrideText: {
    type: "string",
    description:
      "Optional verbatim footnote text. Only when the user explicitly wants exact text instead of engine formatting.",
  },
  appendToFootnoteIndex: {
    type: "number",
    description:
      "Optional 1-based footnote number to append this citation to an existing footnote (AGLC4 rule 1.1.3).",
  },
};

/** Per-action parameter schemas, keyed by action name. */
const ACTION_PARAMETERS: Record<string, PluginParameters> = {
  insertCitation: {
    type: "object",
    properties: INSERT_REQUEST_PROPERTIES,
    required: ["sourceType", "data"],
  },
  formatCitation: {
    type: "object",
    properties: INSERT_REQUEST_PROPERTIES,
    required: ["sourceType", "data"],
  },
  updateCitation: {
    type: "object",
    properties: {
      citationId: {
        type: "string",
        description: "The id of the existing citation to update (returned by insertCitation).",
      },
      request: {
        type: "object",
        description: "The new citation fields — same shape as the insertCitation parameters.",
        properties: INSERT_REQUEST_PROPERTIES,
      },
    },
    required: ["citationId", "request"],
  },
  deleteCitation: {
    type: "object",
    properties: {
      citationId: {
        type: "string",
        description: "The id of the citation whose occurrence should be removed.",
      },
      footnoteIndex: {
        type: "number",
        description: "The 1-based footnote number containing the occurrence to remove.",
      },
    },
    required: ["citationId"],
  },
  refreshFootnotes: {
    type: "object",
    properties: {},
  },
};

function statesFor(name: string, description: string): PluginFunctionStates {
  return {
    reasoning: {
      description: `Decides when to call ${name}.`,
      instructions:
        `Call ${name} when the user's request matches: ${description} ` +
        "Build the arguments from the field mappings in the agent instructions; " +
        "never write footnote text yourself — Obiter's engine formats it.",
    },
    responding: {
      description: `Reports the result of ${name}.`,
      instructions:
        "Relay the function result to the user. On success, confirm what was done " +
        "(quote the formatted citation text when the result includes it). On an error " +
        "result, explain which field was missing or invalid and ask for it.",
    },
  };
}

/** Builds the Copilot plugin manifest binding the agent to the add-in functions. */
export function buildPluginManifest(): PluginManifest {
  return {
    $schema: "https://developer.microsoft.com/json-schemas/copilot/plugin/v2.3/schema.json",
    schema_version: "v2.3",
    name_for_human: "Obiter — AGLC4 Citations",
    description_for_human:
      "Insert, preview, update, delete, and refresh AGLC4 citations as native Word footnotes " +
      `(citation contract v${CITATION_REQUEST_CONTRACT_VERSION}).`,
    namespace: "AddInFunctions",
    functions: OBITER_ACTIONS.map((action) => ({
      name: action.name,
      description: action.description,
      parameters: ACTION_PARAMETERS[action.name] ?? { type: "object", properties: {} },
      states: statesFor(action.name, action.description),
    })),
  };
}
