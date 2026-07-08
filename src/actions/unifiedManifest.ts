/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Unified Microsoft 365 manifest generator (COPILOT-011). Produces the JSON app
 * manifest (v1.17+) that packages the Obiter add-in AND registers it as a Copilot
 * skill, plus the companion declarative-agent file. Both are generated from the
 * live action catalogue + agent instructions so the shipped package can never
 * drift from the one code path (citationService / skillFunctions).
 *
 * The classic add-in XML manifest cannot declare `copilotAgents`; this is the
 * migration to the unified manifest. The exact preview binding of add-in runtime
 * actions to agent skills can shift — validate with the Microsoft 365 Agents
 * Toolkit against a Copilot tenant (COPILOT-014). Production manifest.xml is
 * untouched; this is staged.
 */

import { OBITER_ACTIONS } from "./actionCatalogue";
import { buildAgentInstructions } from "./agentInstructions";
import { CITATION_REQUEST_CONTRACT_VERSION } from "./citationRequest";

/** The production host the packaged manifest points at (COPILOT-013 substitutes). */
export const SKILL_HOST = "https://obiter.com.au/app";

/**
 * App id for the Copilot companion product ("Obiter for Microsoft 365 Copilot").
 * Distinct from the classic add-in id (933c30ed…, live as WA200010629): AppSource
 * keys on the id, so the two products must not share one. Set on the copilot/* line
 * only (see docs/copilot-branching.md).
 */
const APP_ID = "1fe03f6c-b9b7-4a44-a55f-4b08f9813729";

/** App version for the skill package (minor bump over the shipping 1.14.0). */
export const SKILL_APP_VERSION = "1.15.0";

// Manifest schema caps description.short at 80 characters.
const SHORT_DESCRIPTION = "Insert AGLC4 citations as native Word footnotes via Microsoft 365 Copilot.";

const FULL_DESCRIPTION =
  "Obiter Skill for Copilot connects the Obiter AGLC4 citation engine to Microsoft 365 Copilot. " +
  "Describe a source or paste a rough reference in Copilot and Obiter formats it to the Australian " +
  "Guide to Legal Citation, 4th edition, and inserts a native Word footnote. Copilot handles the " +
  "language understanding; Obiter's engine remains the authority for citation correctness, so every " +
  "footnote traces to a numbered AGLC4 rule rather than being written by a language model. No separate " +
  "API key is required on the Copilot path. Companion to the free, open-source Obiter Word add-in.";

/** The declarative-agent definition (referenced by copilotAgents in the manifest). */
export interface DeclarativeAgent {
  $schema: string;
  version: string;
  name: string;
  description: string;
  instructions: string;
  conversation_starters: Array<{ title: string; text: string }>;
}

export function buildDeclarativeAgent(): DeclarativeAgent {
  return {
    $schema:
      "https://developer.microsoft.com/json-schemas/copilot/declarative-agent/v1.0/schema.json",
    version: "v1.0",
    name: "Obiter — AGLC4 Citations",
    description: SHORT_DESCRIPTION,
    instructions: buildAgentInstructions(),
    conversation_starters: [
      {
        title: "Cite a case",
        text: "Cite Mabo v Queensland (No 2) (1992) 175 CLR 1 as a footnote.",
      },
      {
        title: "Format a pasted citation",
        text: "Format this citation to AGLC4: Competition and Consumer Act 2010 (Cth) s 51.",
      },
      {
        title: "Fix references",
        text: "Refresh the footnotes so ibid and short references are correct.",
      },
    ],
  };
}

/** The unified Microsoft 365 app manifest (subset of the v1.17+ schema Obiter uses). */
export interface UnifiedManifest {
  $schema: string;
  manifestVersion: string;
  id: string;
  version: string;
  developer: Record<string, string>;
  name: { short: string; full: string };
  description: { short: string; full: string };
  icons: { color: string; outline: string };
  accentColor: string;
  localizationInfo: { defaultLanguageTag: string };
  authorization: { permissions: { resourceSpecific: Array<{ name: string; type: string }> } };
  validDomains: string[];
  extensions: unknown[];
  copilotAgents: { declarativeAgents: Array<{ id: string; file: string }> };
}

export function buildUnifiedManifest(host: string = SKILL_HOST): UnifiedManifest {
  // Each catalogued action becomes a runtime function Copilot can invoke.
  // The manifest schema allows only id/type/displayName etc. here — no
  // description property. The LLM-facing action descriptions reach Copilot
  // through the agent instructions (buildAgentInstructions) instead.
  const runtimeActions = OBITER_ACTIONS.map((a) => ({
    id: a.name,
    type: "executeFunction",
    displayName: a.name,
  }));

  return {
    $schema: "https://developer.microsoft.com/json-schemas/teams/v1.19/MicrosoftTeams.schema.json",
    manifestVersion: "1.19",
    id: APP_ID,
    version: SKILL_APP_VERSION,
    developer: {
      name: "Matthew Watt",
      websiteUrl: "https://obiter.com.au",
      privacyUrl: "https://obiter.com.au/privacy.html",
      termsOfUseUrl: "https://obiter.com.au/terms.html",
    },
    name: { short: "Obiter Copilot", full: "Obiter for Microsoft 365 Copilot" },
    description: { short: SHORT_DESCRIPTION, full: FULL_DESCRIPTION },
    icons: { color: "color.png", outline: "outline.png" },
    accentColor: "#2AA198",
    localizationInfo: { defaultLanguageTag: "en-us" },
    authorization: {
      permissions: {
        resourceSpecific: [{ name: "Document.ReadWrite.User", type: "Delegated" }],
      },
    },
    validDomains: ["obiter.com.au"],
    extensions: [
      {
        // NOTE: the citation contract version is deliberately NOT emitted here —
        // the manifest schema rejects unknown extension properties
        // (CITATION_REQUEST_CONTRACT_VERSION travels in the skill manifest and
        // docs/copilot-skill-contract.md instead).
        requirements: {
          scopes: ["document"],
          capabilities: [{ name: "SharedRuntime", minVersion: "1.1" }],
        },
        runtimes: [
          {
            id: "SharedRuntime",
            type: "general",
            code: { page: `${host}/sharedRuntime.html` },
            lifetime: "long",
            actions: runtimeActions,
          },
        ],
        ribbons: [
          {
            contexts: ["default"],
            tabs: [
              {
                builtInTabId: "TabHome",
                groups: [
                  {
                    id: "obiterCitationGroup",
                    label: "Obiter",
                    icons: [
                      { size: 16, url: `${host}/assets/icon-16.png` },
                      { size: 32, url: `${host}/assets/icon-32.png` },
                      { size: 80, url: `${host}/assets/icon-80.png` },
                    ],
                    controls: [
                      {
                        id: "obiterShowPane",
                        type: "button",
                        label: "Obiter",
                        icons: [
                          { size: 16, url: `${host}/assets/icon-16.png` },
                          { size: 32, url: `${host}/assets/icon-32.png` },
                          { size: 80, url: `${host}/assets/icon-80.png` },
                        ],
                        supertip: {
                          title: "Obiter",
                          description: "Show the Obiter task pane.",
                        },
                        actionId: "showTaskpane",
                      },
                      {
                        id: "obiterRefreshAll",
                        type: "button",
                        label: "Refresh All",
                        icons: [
                          { size: 16, url: `${host}/assets/icon-refresh-16.png` },
                          { size: 32, url: `${host}/assets/icon-refresh-32.png` },
                          { size: 80, url: `${host}/assets/icon-refresh-80.png` },
                        ],
                        supertip: {
                          title: "Refresh All",
                          description: "Rebuild citations, headings, and inline formatting.",
                        },
                        actionId: "refreshAll",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    copilotAgents: {
      declarativeAgents: [{ id: "obiterCitations", file: "declarativeAgent.json" }],
    },
  };
}
