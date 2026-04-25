/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

export {
  PARENT_CC_TAG,
  insertCitationFootnote,
  appendToFootnoteByIndex,
  updateCitationContent,
  getAllCitationFootnotes,
  deleteCitationFootnote,
  getFootnoteIndex,
  findParentCC,
  findChildCC,
  getFootnoteCitations,
  getAdjacentFootnote,
  applyRunFormatting,
  writeFormattedRunsToControl,
  insertChildCitation,
} from "./footnoteManager";
export type { CitationFootnoteEntry, AdjacentFootnoteResult } from "./footnoteManager";

export {
  buildFootnoteMap,
  getFootnoteCount,
  getPrecedingFootnoteCitations,
  updateFirstFootnoteNumbers,
  rebuildAllFootnoteTracking,
} from "./footnoteTracker";

export { registerSelectionHandler, unregisterSelectionHandler } from "./selectionHandler";
export type { CitationSelectedCallback } from "./selectionHandler";

export { applyAglc4Styles, getHeadingPrefix, toRoman } from "./styles";

export { getStyleInstallPath, isAglc4StyleInstalled, getInstallInstructions } from "./styleInstaller";

export {
  getWordSources,
  mapWordSourceToObiter,
  importWordSources,
} from "./sourceImporter";
export type { WordSource } from "./sourceImporter";

export {
  scanAndFormatInlineReferences,
  clearInlineFormatting,
  refreshInlineReferences,
} from "./inlineFormatter";
export type { FormatResult } from "./inlineFormatter";

export { renumberHeadings } from "./headingTracker";

export { registerChangeListener, unregisterChangeListener } from "./changeListener";
