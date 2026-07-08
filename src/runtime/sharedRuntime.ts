/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Shared runtime entry (COPILOT-010). The single long-lived runtime page the
 * shared-runtime manifest (manifest.skill.xml / manifest.skill.json) points at.
 * It registers both the ribbon command functions and the Copilot skill functions
 * in one runtime, so ribbon commands can reach the engine (via citationService)
 * and Copilot actions dispatch through the same one code path.
 *
 * This is staged: the production manifest.xml still uses the separate taskpane +
 * commands pages. Verify the ribbon + pane still work after cutover (COPILOT-014).
 */

/* global Office */

// Polyfills are imported INTO this bundle (not loaded as a separate chunk via
// the HTML) so sharedRuntime.js is self-contained. When Copilot invokes an
// executeDataFunction, Office may load this script standalone via the
// manifest's runtime `code.script` — without the HTML page that would
// otherwise pull in a shared polyfill chunk. A missing polyfill made the
// script fail to initialise, so registerSkillFunctions never ran and Copilot
// reported the tool as "unavailable". Self-containing the bundle fixes that.
import "core-js/stable";
import "regenerator-runtime/runtime";

import { registerCommandFunctions } from "./commandHandlers";
import { registerSkillFunctions } from "../actions/skillFunctions";

Office.onReady(() => {
  registerCommandFunctions();
  registerSkillFunctions();
});
