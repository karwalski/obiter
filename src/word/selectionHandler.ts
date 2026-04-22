/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/* global Word, Office */

/** Tags used by Obiter for non-citation content controls. */
const NON_CITATION_TAG_PREFIXES = [
  "obiter-heading-",
  "obiter-attribution",
];

/** Returns true if the tag looks like a citation ID (UUID), not an internal Obiter tag. */
function isCitationTag(tag: string): boolean {
  for (const prefix of NON_CITATION_TAG_PREFIXES) {
    if (tag.startsWith(prefix)) return false;
  }
  return true;
}

/**
 * Callback invoked when the user selects or clicks into a citation content
 * control. Receives the citation ID extracted from the content control's tag.
 */
export type CitationSelectedCallback = (citationId: string) => void;

/** Handle returned by Office.js for the registered event handler. */
let selectionHandlerReference: (() => void) | null = null;

/**
 * Registers a document-level selection-changed handler that detects when the
 * user's cursor enters a citation content control. When a content control with
 * a non-empty tag is found at the selection, the callback is invoked with the
 * tag value (citation ID).
 *
 * Only one handler can be active at a time. Calling this function while a
 * handler is already registered will first unregister the previous one.
 *
 * @param onCitationSelected - Callback fired with the citation ID when the
 *   user selects/clicks a citation content control.
 */
export async function registerSelectionHandler(
  onCitationSelected: CitationSelectedCallback,
): Promise<void> {
  // Clean up any existing handler before registering a new one.
  if (selectionHandlerReference) {
    await unregisterSelectionHandler();
  }

  const handler = async (): Promise<void> => {
    try {
      await Word.run(async (context) => {
        const selection = context.document.getSelection();
        const contentControls = selection.contentControls;
        contentControls.load("items/tag");
        await context.sync();

        // Walk through all content controls at the selection and fire the
        // callback for the first one that has a citation tag (not heading/branding tags).
        for (const cc of (contentControls.items ?? [])) {
          if (cc.tag && isCitationTag(cc.tag)) {
            onCitationSelected(cc.tag);
            return;
          }
        }

        // If no content controls at the selection, also check if the
        // selection is *inside* a content control by walking up.
        const parentCC = selection.parentContentControlOrNullObject;
        parentCC.load("tag,isNullObject");
        await context.sync();

        if (!parentCC.isNullObject && parentCC.tag && isCitationTag(parentCC.tag)) {
          onCitationSelected(parentCC.tag);
        }
      });
    } catch {
      // Silently ignore errors from selection queries (e.g. if the document
      // is in a transitional state).
    }
  };

  await new Promise<void>((resolve, reject) => {
    Office.context.document.addHandlerAsync(
      Office.EventType.DocumentSelectionChanged,
      handler,
      (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          selectionHandlerReference = () => {
            Office.context.document.removeHandlerAsync(
              Office.EventType.DocumentSelectionChanged,
              { handler },
            );
          };
          resolve();
        } else {
          reject(
            new Error(
              result.error
                ? result.error.message
                : "Failed to register selection handler",
            ),
          );
        }
      },
    );
  });
}

/**
 * Removes the previously registered selection handler. Safe to call even if
 * no handler is currently registered.
 */
export async function unregisterSelectionHandler(): Promise<void> {
  if (selectionHandlerReference) {
    selectionHandlerReference();
    selectionHandlerReference = null;
  }
}
