/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/* global Word */

import { createLogger } from "../debug/logger";
import { getAutoCreateStylesPref, shouldAutoCreateStyles } from "../store/autoSetupPreference";
import { writeObiterProperties, type PropertyWriteResult } from "./documentProperties";
import { createAglc4Styles } from "./styles";
import { hostReportsReadOnly } from "./documentAccess";

const log = createLogger("StartupSetup");

/** The parts of the citation store the startup tasks read. */
export interface StartupStoreView {
  getAll(): ReadonlyArray<unknown>;
  getStandardId(): string;
  getWritingMode(): "academic" | "court";
}

/** What the startup tasks did, for tests and the debug log. */
export interface StartupSetupResult {
  properties: PropertyWriteResult;
  stylesCreated: string[];
}

/**
 * Document tasks that run when the task pane opens (COURT-101, COURT-102).
 *
 * - Never modifies an existing style. Built-in heading formatting is an
 *   explicit, previewed action in the Styling view.
 * - Creates missing AGLC4 named styles only on a new blank academic document
 *   with the visible setting on (create-only).
 * - Brings Obiter custom properties in line with DECISION-043 item 1: removes
 *   any `Obiter.Author`; writes version and standard only when the store
 *   holds a citation.
 *
 * Each step is best effort; a read-only document degrades to no writes.
 *
 * @param context - A Word.RequestContext from within a Word.run() callback.
 * @param store - The initialised citation store.
 * @param version - The running Obiter version.
 */
export async function runStartupDocumentTasks(
  context: Word.RequestContext,
  store: StartupStoreView,
  version: string
): Promise<StartupSetupResult> {
  const citationCount = (store.getAll() ?? []).length;
  const result: StartupSetupResult = {
    properties: { written: [], removed: [] },
    stylesCreated: [],
  };

  result.properties = await writeObiterProperties(
    context,
    version,
    store.getStandardId(),
    citationCount
  );

  const enabled = getAutoCreateStylesPref();
  const writingMode = store.getWritingMode();
  if (enabled && writingMode !== "court" && citationCount === 0 && !hostReportsReadOnly()) {
    try {
      const body = context.document.body;
      body.load("text");
      await context.sync();
      if (
        shouldAutoCreateStyles({ enabled, writingMode, bodyText: body.text ?? "", citationCount })
      ) {
        result.stylesCreated = await createAglc4Styles(context);
      }
    } catch (err: unknown) {
      log.warn("auto style creation skipped", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("startup document tasks", result);
  return result;
}
