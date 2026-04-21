/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/* global Word */

/**
 * Layer 1 — Document custom properties (INFRA-008).
 *
 * Writes machine-readable metadata into the document's custom properties
 * so that Obiter-managed documents can be identified without opening
 * the Custom XML Part.
 */

/**
 * Write (or update) the three Obiter custom document properties.
 *
 * Uses `context.document.properties.customProperties` (WordApi 1.6+).
 * Silently skips if the API is unavailable on the host.
 */
export async function writeObiterProperties(
  context: Word.RequestContext,
  version: string,
  standard: string,
  mode: string,
): Promise<void> {
  try {
    // Runtime-check for customProperties support (WordApi 1.6+)
    if (
      typeof Office !== "undefined" &&
      !Office.context.requirements.isSetSupported("WordApi", "1.6")
    ) {
      return;
    }

    const props = context.document.properties.customProperties;

    props.add("Obiter.Version", version);
    props.add("Obiter.Standard", standard);
    props.add("Obiter.Mode", mode);

    await context.sync();
  } catch {
    // Custom properties API not available — silently skip
  }
}
