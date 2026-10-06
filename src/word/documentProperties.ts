/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/* global Word */

import { toText } from "../engine/rules/v4/general/coerce";
import { createLogger } from "../debug/logger";
import { isFeatureAvailable } from "./apiCompat";
import { hostReportsReadOnly, isWriteRefused } from "./documentAccess";

const log = createLogger("DocumentProperties");

/**
 * Layer 1 — Document custom properties (INFRA-008, COURT-102).
 *
 * DECISION-043 item 1 (owner, 6 Oct 2026): Obiter writes only
 * `Obiter.Version` and the document's actual citation standard. It never
 * writes a person's name; an `Obiter.Author` property already in a document
 * is removed the next time the document is opened. `Obiter.CreatedDate` is
 * set once and never overwritten. `Obiter.Website` is no longer written.
 *
 * Other keys earlier releases wrote (`Obiter.ManagedDocument`,
 * `Obiter.Website`, `Obiter.Standard`, `Obiter.Mode`) are no longer written
 * and existing values are left in place; removing them is a user choice for
 * the finalised-copy work (COURT-122).
 *
 * COURT-122 follow-up (owner, 7 Oct 2026): a property the user removes in
 * the pre-handover check stays removed. The removal is recorded in the
 * document's own Obiter store (`propertyOptOut`), and Obiter does not write
 * that property again until the user turns its properties back on.
 */

/** Custom property keys Obiter writes. */
export const OBITER_PROPERTY_KEYS = {
  version: "Obiter.Version",
  /** The document's actual citation standard id (eg "aglc4", "oscola5"). */
  citationStyle: "Obiter.CitationStyle",
  createdDate: "Obiter.CreatedDate",
} as const;

/** The keys {@link writeObiterProperties} writes, in display order. */
export const WRITTEN_PROPERTY_KEYS: ReadonlyArray<string> = Object.values(OBITER_PROPERTY_KEYS);

/** Keys removed from a document on open (DECISION-043 item 1). */
export const RETIRED_PROPERTY_KEYS: ReadonlyArray<string> = ["Obiter.Author"];

/** What {@link writeObiterProperties} changed, for tests and the debug log. */
export interface PropertyWriteResult {
  written: string[];
  removed: string[];
}

/**
 * Bring the document's Obiter custom properties into line with DECISION-043
 * item 1 (COURT-102).
 *
 * - Always removes a retired `Obiter.Author` property if one is present.
 * - Writes `Obiter.Version` and `Obiter.CitationStyle` (the document's actual
 *   standard id) only when the document's Obiter store holds at least one
 *   citation, so opening the pane on an unrelated document writes nothing.
 *   Unchanged values are not rewritten.
 * - Writes `Obiter.CreatedDate` once, only if absent; never overwrites it.
 * - Never writes a key in `optOut` (the properties the user removed in the
 *   pre-handover check, COURT-122). `Obiter.Author` is removed regardless.
 *
 * `customProperties` is WordApi 1.3 (R08 §3.3), routed through the
 * `customProperties` feature flag. Two syncs at most. A read-only document
 * refuses the write; that is logged and swallowed, never surfaced as an error.
 *
 * @param context - A Word.RequestContext from within a Word.run() callback.
 * @param version - The running Obiter version.
 * @param standardId - The document store's citation standard id.
 * @param citationCount - Number of citations in the document's Obiter store.
 * @param optOut - Property keys the user removed; never written back.
 */
export async function writeObiterProperties(
  context: Word.RequestContext,
  version: string,
  standardId: string,
  citationCount: number,
  optOut: ReadonlyArray<string> = []
): Promise<PropertyWriteResult> {
  const result: PropertyWriteResult = { written: [], removed: [] };
  if (!isFeatureAvailable("customProperties")) return result;
  // A document the host opened read-only cannot take the write; skip it.
  if (hostReportsReadOnly()) return result;

  try {
    const props = context.document.properties.customProperties;
    const retired = RETIRED_PROPERTY_KEYS.map((key) => props.getItemOrNullObject(key));
    const current = {
      version: props.getItemOrNullObject(OBITER_PROPERTY_KEYS.version),
      citationStyle: props.getItemOrNullObject(OBITER_PROPERTY_KEYS.citationStyle),
      createdDate: props.getItemOrNullObject(OBITER_PROPERTY_KEYS.createdDate),
    };
    for (const item of [...retired, ...Object.values(current)]) {
      item.load("isNullObject,value");
    }
    await context.sync();

    retired.forEach((item, i) => {
      if (!item.isNullObject) {
        item.delete();
        result.removed.push(RETIRED_PROPERTY_KEYS[i]);
      }
    });

    if (citationCount > 0) {
      // COURT-122 follow-up: keys the user removed stay removed. Opt-out
      // entries are read through toText() (store round-trip hazard).
      const skipped = new Set(optOut.map((key) => toText(key)));
      // Values typed string can come back from the store as numbers: toText().
      if (
        !skipped.has(OBITER_PROPERTY_KEYS.version) &&
        (current.version.isNullObject || toText(current.version.value) !== version)
      ) {
        props.add(OBITER_PROPERTY_KEYS.version, version);
        result.written.push(OBITER_PROPERTY_KEYS.version);
      }
      if (
        !skipped.has(OBITER_PROPERTY_KEYS.citationStyle) &&
        (current.citationStyle.isNullObject || toText(current.citationStyle.value) !== standardId)
      ) {
        props.add(OBITER_PROPERTY_KEYS.citationStyle, standardId);
        result.written.push(OBITER_PROPERTY_KEYS.citationStyle);
      }
      if (!skipped.has(OBITER_PROPERTY_KEYS.createdDate) && current.createdDate.isNullObject) {
        props.add(OBITER_PROPERTY_KEYS.createdDate, new Date().toISOString());
        result.written.push(OBITER_PROPERTY_KEYS.createdDate);
      }
    }

    if (result.written.length > 0 || result.removed.length > 0) {
      await context.sync();
    }
  } catch (err: unknown) {
    // Custom properties unavailable, or the document refused the write
    // (read-only, IRM or a co-authoring lock) — skip.
    log[isWriteRefused(err) ? "info" : "warn"]("writeObiterProperties skipped", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { written: [], removed: [] };
  }
  return result;
}
