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

import { registerCommandFunctions } from "./commandHandlers";
import { registerSkillFunctions } from "../actions/skillFunctions";

Office.onReady(() => {
  registerCommandFunctions();
  registerSkillFunctions();
});
