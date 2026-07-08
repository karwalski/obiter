/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Unified Microsoft 365 manifest generator (COPILOT-011/017/018). Produces the
 * JSON app manifest that packages the Obiter add-in AND registers it as a
 * Copilot skill, plus the companion declarative-agent file. Both are generated
 * from the live action catalogue + agent instructions so the shipped package
 * can never drift from the one code path (citationService / skillFunctions).
 *
 * Copilot-invocable functions are declared as runtime actions of type
 * "executeDataFunction" (available in app-manifest schema v1.25+ and
 * devPreview) and bound to the agent through the plugin file emitted by
 * buildPluginManifest (COPILOT-017). The ribbon mirrors the classic add-in's
 * full button set (COPILOT-018) so the Copilot package is a strict superset —
 * replacing the classic add-in loses nothing.
 *
 * The classic add-in XML manifest cannot declare `copilotAgents`; this is the
 * migration to the unified manifest. Production manifest.xml is untouched.
 */

import { OBITER_ACTIONS } from "./actionCatalogue";
import { buildAgentInstructions } from "./agentInstructions";

/** The production host the packaged manifest points at (COPILOT-013 substitutes). */
export const SKILL_HOST = "https://obiter.com.au/app";

/**
 * App id for the Copilot companion product ("Obiter for Microsoft 365 Copilot").
 * Distinct from the classic add-in id (933c30ed…, live as WA200010629): AppSource
 * keys listings on the id and the two products are listed separately.
 */
const APP_ID = "1fe03f6c-b9b7-4a44-a55f-4b08f9813729";

/** App version for the skill package (minor bump over the shipping 1.14.0). */
export const SKILL_APP_VERSION = "1.15.0";

/**
 * App-manifest schema. v1.25 is the lowest numbered (non-devPreview) schema
 * that defines `executeDataFunction` runtime actions; DEVPREVIEW=1 packaging
 * falls back to the devPreview schema for Agents-Toolkit sideload testing if
 * a distribution service rejects the numbered version.
 */
const MANIFEST_VERSION = "1.25";
const MANIFEST_SCHEMA = "https://developer.microsoft.com/json-schemas/teams/v1.25/MicrosoftTeams.schema.json";
const DEVPREVIEW_VERSION = "devPreview";
const DEVPREVIEW_SCHEMA =
  "https://developer.microsoft.com/json-schemas/teams/vDevPreview/MicrosoftTeams.schema.json";

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
  /** Binds the agent to the add-in's runtime functions via the plugin file (COPILOT-017). */
  actions: Array<{ id: string; file: string }>;
}

/** Filename of the plugin manifest inside the app package. */
export const PLUGIN_FILE_NAME = "obiter-plugin.json";

export function buildDeclarativeAgent(): DeclarativeAgent {
  return {
    $schema:
      "https://developer.microsoft.com/json-schemas/copilot/declarative-agent/v1.5/schema.json",
    version: "v1.5",
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
    actions: [{ id: "obiterAddInActions", file: PLUGIN_FILE_NAME }],
  };
}

/** The unified Microsoft 365 app manifest (subset of the schema Obiter uses). */
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

/** Options for buildUnifiedManifest. */
export interface UnifiedManifestOptions {
  /** Emit the devPreview schema (Agents-Toolkit sideload testing). */
  devPreview?: boolean;
}

/**
 * The task-pane views the classic ribbon links to, with the same hash-route
 * URLs the classic manifest uses (App.tsx maps `#library` etc. onto
 * MemoryRouter routes). Each view gets its own short-lived runtime + openPage
 * action in the unified manifest — the unified equivalent of the classic
 * per-view `<bt:Url>` resources.
 */
const TASKPANE_VIEWS: Array<{ id: string; view: string; hash: string }> = [
  { id: "openTaskpane", view: "home", hash: "" },
  { id: "openInsertCitation", view: "insert", hash: "" },
  { id: "openLibrary", view: "library", hash: "#library" },
  { id: "openValidate", view: "validation", hash: "#validation" },
  { id: "openBibliography", view: "bibliography", hash: "#bibliography" },
  { id: "openGuide", view: "guide", hash: "#guide" },
  { id: "openStyling", view: "styling", hash: "#styling" },
  { id: "openSettings", view: "settings", hash: "#settings" },
];

function icons(host: string, base = "icon"): Array<{ size: number; url: string }> {
  return [
    { size: 16, url: `${host}/assets/${base}-16.png` },
    { size: 32, url: `${host}/assets/${base}-32.png` },
    { size: 80, url: `${host}/assets/${base}-80.png` },
  ];
}

function paneButton(
  host: string,
  id: string,
  label: string,
  description: string,
  actionId: string
): Record<string, unknown> {
  return {
    id,
    type: "button",
    label,
    icons: icons(host),
    supertip: { title: label, description },
    actionId,
  };
}

export function buildUnifiedManifest(
  host: string = SKILL_HOST,
  options: UnifiedManifestOptions = {}
): UnifiedManifest {
  // Copilot-invocable functions (COPILOT-017): one executeDataFunction action
  // per catalogued action. The ids MUST match the plugin manifest's function
  // names and the ids registered via Office.actions.associate — Copilot
  // resolves agent → plugin function name → runtime action id → JS handler.
  // The manifest schema allows no description property here; the LLM-facing
  // descriptions live in the plugin file and the agent instructions.
  const skillActions = OBITER_ACTIONS.map((a) => ({
    id: a.name,
    type: "executeDataFunction",
  }));

  // Ribbon command functions handled by src/runtime/commandHandlers.ts.
  const commandActions = [
    { id: "refreshAll", type: "executeFunction" },
    { id: "applyTemplate", type: "executeFunction" },
    { id: "applyBlockQuote", type: "executeFunction" },
  ];

  // One short-lived runtime per task-pane view (openPage actions).
  const taskpaneRuntimes = TASKPANE_VIEWS.map((v) => ({
    id: `TaskpaneRuntime_${v.view}`,
    type: "general",
    code: { page: `${host}/taskpane.html${v.hash}` },
    lifetime: "short",
    actions: [{ id: v.id, type: "openPage", pinnable: false, view: v.view }],
  }));

  return {
    $schema: options.devPreview ? DEVPREVIEW_SCHEMA : MANIFEST_SCHEMA,
    manifestVersion: options.devPreview ? DEVPREVIEW_VERSION : MANIFEST_VERSION,
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
            actions: [...commandActions, ...skillActions],
          },
          ...taskpaneRuntimes,
        ],
        // Full parity with the classic add-in ribbon (COPILOT-018) — same
        // three groups and eleven controls as manifest.prod.xml, so replacing
        // the classic add-in with this package loses no UI.
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
                    icons: icons(host),
                    controls: [
                      paneButton(host, "obiterShowPane", "Obiter", "Show the Obiter task pane.", "openTaskpane"),
                      paneButton(
                        host,
                        "obiterInsertCitation",
                        "Insert Citation",
                        "Insert an AGLC4 citation as a footnote.",
                        "openInsertCitation"
                      ),
                      paneButton(
                        host,
                        "obiterLibrary",
                        "Library",
                        "Browse and manage the document's citation library.",
                        "openLibrary"
                      ),
                    ],
                  },
                  {
                    id: "obiterDocumentGroup",
                    label: "Document",
                    icons: icons(host),
                    controls: [
                      paneButton(
                        host,
                        "obiterValidate",
                        "Validate",
                        "Check the document against AGLC4 rules.",
                        "openValidate"
                      ),
                      paneButton(
                        host,
                        "obiterBibliography",
                        "Bibliography",
                        "Generate and insert the AGLC4 bibliography.",
                        "openBibliography"
                      ),
                      paneButton(
                        host,
                        "obiterGuide",
                        "Guide",
                        "Browse the AGLC4 reference guide.",
                        "openGuide"
                      ),
                      {
                        id: "obiterRefreshAll",
                        type: "button",
                        label: "Refresh All",
                        icons: icons(host, "icon-refresh"),
                        supertip: {
                          title: "Refresh All",
                          description: "Rebuild citations, headings, and inline formatting.",
                        },
                        actionId: "refreshAll",
                      },
                      {
                        id: "obiterApplyTemplate",
                        type: "button",
                        label: "Apply Template",
                        icons: icons(host),
                        supertip: {
                          title: "Apply Template",
                          description: "Apply the AGLC4 document template and styles.",
                        },
                        actionId: "applyTemplate",
                      },
                      {
                        id: "obiterBlockQuote",
                        type: "button",
                        label: "Block Quote",
                        icons: icons(host),
                        supertip: {
                          title: "Block Quote",
                          description: "Format the selection as an AGLC4 block quote (Rule 1.5.1).",
                        },
                        actionId: "applyBlockQuote",
                      },
                    ],
                  },
                  {
                    id: "obiterToolsGroup",
                    label: "Tools",
                    icons: icons(host),
                    controls: [
                      paneButton(
                        host,
                        "obiterStyling",
                        "Styling",
                        "Headings, quotations, and AGLC4 document styling.",
                        "openStyling"
                      ),
                      paneButton(
                        host,
                        "obiterSettings",
                        "Settings",
                        "Obiter settings: citation standard, integrations, and preferences.",
                        "openSettings"
                      ),
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
