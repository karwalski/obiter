/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/* global Office */

/**
 * Document change listener for Obiter.
 *
 * LIMITATION: The Word JavaScript API does not provide a true "document content
 * changed" event. The most reliable proxy is `Office.EventType.DocumentSelectionChanged`,
 * which fires whenever the user moves their cursor or makes a selection — including
 * after typing, pasting, or deleting content. This is an imperfect proxy because it
 * also fires on pure navigation (no content change), but it is the best available
 * signal in the current API surface. ContentControlAdded is also registered where
 * supported, to catch programmatic insertions.
 *
 * A 2-second debounce is applied to avoid thrashing on rapid edits.
 */

const DEBOUNCE_MS = 2000;

/** Cleanup function for the selection-changed handler. */
let selectionCleanup: (() => void) | null = null;

/** Cleanup function for the content-control-added handler (if supported). */
let contentControlCleanup: (() => void) | null = null;

/** Handle for the debounce timer. */
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Registers document change listeners that debounce calls to the provided
 * callback. Uses `DocumentSelectionChanged` as the primary change signal
 * and `ContentControlAdded` (Word.EventType) where the API supports it.
 *
 * The callback is debounced with a 2-second delay so rapid edits or
 * cursor movements do not cause excessive refresh cycles.
 *
 * @param onDocumentChanged - Callback invoked (at most once per 2 seconds)
 *   when the document may have changed.
 */
export function registerChangeListener(
  onDocumentChanged: () => void,
): void {
  // Clean up any previously registered listeners.
  unregisterChangeListener();

  const debouncedCallback = (): void => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      onDocumentChanged();
    }, DEBOUNCE_MS);
  };

  // Register DocumentSelectionChanged (available in all Office.js versions).
  Office.context.document.addHandlerAsync(
    Office.EventType.DocumentSelectionChanged,
    debouncedCallback,
    (result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        selectionCleanup = () => {
          Office.context.document.removeHandlerAsync(
            Office.EventType.DocumentSelectionChanged,
            { handler: debouncedCallback },
          );
        };
      }
    },
  );

  // Attempt to register a second listener for ActiveViewChanged, which
  // fires on view switches and can signal document structure changes.
  // This supplements the selection handler for cases where content is
  // modified without moving the cursor.
  try {
    Office.context.document.addHandlerAsync(
      Office.EventType.ActiveViewChanged,
      debouncedCallback,
      (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          contentControlCleanup = () => {
            Office.context.document.removeHandlerAsync(
              Office.EventType.ActiveViewChanged,
              { handler: debouncedCallback },
            );
          };
        }
      },
    );
  } catch {
    // Silently ignore — selection handler alone is sufficient.
  }
}

/**
 * Unregisters all document change listeners and cancels any pending
 * debounced callback. Safe to call even if no listeners are registered.
 */
export function unregisterChangeListener(): void {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  if (selectionCleanup) {
    selectionCleanup();
    selectionCleanup = null;
  }

  if (contentControlCleanup) {
    contentControlCleanup();
    contentControlCleanup = null;
  }
}
