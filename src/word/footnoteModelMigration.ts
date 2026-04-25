/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * FN-005: Footnote Model Migration
 *
 * Migrates documents from the legacy flat content control model (v1)
 * to the parent-child model (v2) introduced in the FN-ARCH epic.
 *
 * Legacy model (v1):
 *   Each citation has a standalone CC (tag = UUID) directly in the
 *   footnote body. Separators and closing punctuation are stored
 *   inside the citation text runs.
 *
 * New model (v2):
 *   [ref mark] [parent-CC tag="obiter-fn"]
 *     [child-CC tag="uuid-1"] citation text (no punctuation) [/child-CC]
 *     "; "
 *     [child-CC tag="uuid-2"] citation text (no punctuation) [/child-CC]
 *     "."
 *   [/parent-CC]
 *
 * Migration is non-destructive: if it fails partway through, legacy
 * CCs remain in place and are still functional via the legacy fallback
 * paths in footnoteManager.ts and citationRefresher.ts.
 *
 * All APIs stay within the WordApi 1.5 baseline.
 */

/* global Word */

import { PARENT_CC_TAG } from "./footnoteManager";
import type { CitationStore } from "../store/citationStore";

// ─── Types ──────────────────────────────────────────────────────────────────

/** Document content control model version. */
export type ModelVersion = "v1" | "v2" | "empty";

/** Result of a migration run. */
export interface MigrationResult {
  /** Number of footnotes successfully migrated from v1 to v2. */
  migratedCount: number;
}

// ─── Module State ───────────────────────────────────────────────────────────

/**
 * Session-level flag to avoid re-checking migration on every call.
 * Reset when the add-in reloads (new session).
 */
let migrationCheckedThisSession = false;

/**
 * Reset the session flag (for testing or when switching documents).
 */
export function resetMigrationFlag(): void {
  migrationCheckedThisSession = false;
}

// ─── Detection ──────────────────────────────────────────────────────────────

/**
 * Scans footnotes to determine which content control model the document uses.
 *
 * Detection algorithm (per Section 7.1 of fn-arch-design.md):
 * - If any footnote has a parent CC tagged "obiter-fn" -> "v2"
 * - If any footnote has standalone CCs with non-obiter tags (UUIDs)
 *   but no parent CC -> "v1"
 * - If no footnotes have any Obiter CCs -> "empty"
 *
 * Mixed-model documents (some footnotes v1, some v2) are treated as "v1"
 * because the v1 footnotes still need migration. The v2 footnotes will
 * be skipped during migrateToV2().
 *
 * @param context - An active Word request context.
 * @returns The detected model version.
 */
export async function detectModelVersion(
  context: Word.RequestContext,
): Promise<ModelVersion> {
  const footnotes = context.document.body.footnotes;
  footnotes.load("items");
  await context.sync();

  const fnItems = footnotes.items ?? [];
  if (fnItems.length === 0) {
    return "empty";
  }

  let hasV2 = false;
  let hasV1 = false;

  for (let i = 0; i < fnItems.length; i++) {
    const noteItem = fnItems[i];
    const contentControls = noteItem.body.contentControls;
    contentControls.load("items/tag");
    await context.sync();

    const ccItems = contentControls.items ?? [];
    let hasParent = false;
    let hasLegacyChildren = false;

    for (const cc of ccItems) {
      if (cc.tag === PARENT_CC_TAG) {
        hasParent = true;
      } else if (cc.tag && !cc.tag.startsWith("obiter-")) {
        hasLegacyChildren = true;
      }
    }

    if (hasParent) {
      hasV2 = true;
    }
    if (hasLegacyChildren && !hasParent) {
      hasV1 = true;
    }
  }

  // Mixed model: some v1, some v2 -- needs migration for the v1 footnotes
  if (hasV1) {
    return "v1";
  }
  if (hasV2) {
    return "v2";
  }
  return "empty";
}

// ─── Migration ──────────────────────────────────────────────────────────────

/**
 * Information about a legacy child CC collected before migration.
 * Captured non-destructively so the original CC can be preserved
 * if migration fails.
 */
interface LegacyCCInfo {
  /** The content control proxy (still in the document). */
  cc: Word.ContentControl;
  /** Citation UUID tag. */
  tag: string;
  /** Human-readable title from the CC. */
  title: string;
  /** Raw text content of the CC (may include inline separators/punctuation). */
  text: string;
}

/**
 * Migrates all v1 (flat) footnotes to v2 (parent-child) model.
 *
 * For each footnote that has legacy standalone CCs (no parent CC):
 *  1. Collects all legacy CCs (tags, titles, text) non-destructively.
 *  2. Strips inline separators ("; ") and closing punctuation (".") from
 *     the collected text, since the refresher now manages these.
 *  3. Deletes the legacy CCs from the footnote body.
 *  4. Creates a parent CC at the end of the first paragraph (after the
 *     footnote reference mark).
 *  5. Re-inserts child CCs inside the parent CC with the original UUID
 *     tags and cleaned text.
 *
 * After all footnotes are migrated, the caller should trigger a full
 * refresh (refreshAllCitations) to re-render with proper formatting,
 * separators, and closing punctuation.
 *
 * @param context - An active Word request context.
 * @returns The count of migrated footnotes.
 */
export async function migrateToV2(
  context: Word.RequestContext,
): Promise<MigrationResult> {
  const footnotes = context.document.body.footnotes;
  footnotes.load("items");
  await context.sync();

  const fnItems = footnotes.items ?? [];
  let migratedCount = 0;

  for (let i = 0; i < fnItems.length; i++) {
    const noteItem = fnItems[i];

    // Load CCs in this footnote
    const contentControls = noteItem.body.contentControls;
    contentControls.load("items/tag,items/title,items/text");
    await context.sync();

    const ccItems = contentControls.items ?? [];

    // Check if this footnote already has a parent CC (skip if v2)
    let hasParent = false;
    const legacyCCs: LegacyCCInfo[] = [];

    for (const cc of ccItems) {
      if (cc.tag === PARENT_CC_TAG) {
        hasParent = true;
        break;
      }
      if (cc.tag && !cc.tag.startsWith("obiter-")) {
        legacyCCs.push({
          cc,
          tag: cc.tag,
          title: cc.title ?? "Citation",
          text: cc.text ?? "",
        });
      }
    }

    // Skip if already v2 or no legacy CCs found
    if (hasParent || legacyCCs.length === 0) {
      continue;
    }

    // Migrate this footnote
    try {
      await migrateFootnote(context, noteItem, legacyCCs);
      migratedCount++;
    } catch (err: unknown) {
      // Non-destructive: if migration fails for a single footnote, log
      // and continue. The legacy CCs remain in place.
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[footnoteModelMigration] Failed to migrate footnote ${i + 1}: ${msg}`,
      );
    }
  }

  return { migratedCount };
}

/**
 * Migrates a single footnote from v1 to v2 model.
 *
 * Steps:
 *  1. Strip inline separators and closing punctuation from legacy CC text.
 *  2. Delete all legacy CCs (removes control and content from footnote body).
 *  3. Create a parent CC at the end of the first paragraph.
 *  4. Insert child CCs inside the parent with cleaned text and original tags.
 *
 * @param context - An active Word request context.
 * @param noteItem - The footnote NoteItem to migrate.
 * @param legacyCCs - The collected legacy CC information (in document order).
 */
async function migrateFootnote(
  context: Word.RequestContext,
  noteItem: Word.NoteItem,
  legacyCCs: LegacyCCInfo[],
): Promise<void> {
  // Step 1: Clean text for each legacy CC
  const cleanedEntries = legacyCCs.map((entry, index) => ({
    ...entry,
    text: stripInlinePunctuation(entry.text, index, legacyCCs.length),
  }));

  // Step 2: Delete all legacy CCs (control + content)
  for (const entry of legacyCCs) {
    entry.cc.delete(false);
  }
  await context.sync();

  // Step 3: Get the first paragraph and create parent CC
  const paragraphs = noteItem.body.paragraphs;
  paragraphs.load("items");
  await context.sync();

  const paraItems = paragraphs.items ?? [];
  if (paraItems.length === 0) {
    throw new Error("Footnote has no paragraphs after deleting legacy CCs.");
  }

  const firstPara = paraItems[0];
  const paraEndRange = firstPara.getRange("End");
  const parentCC = paraEndRange.insertContentControl("RichText");
  parentCC.tag = PARENT_CC_TAG;
  parentCC.title = "Obiter Footnote";
  parentCC.appearance = "Hidden" as Word.ContentControlAppearance;

  // Step 4: Insert child CCs inside the parent
  for (const entry of cleanedEntries) {
    const endRange = parentCC.getRange("End");
    const childCC = endRange.insertContentControl("RichText");
    childCC.tag = entry.tag;
    childCC.title = entry.title;
    childCC.appearance = "Hidden" as Word.ContentControlAppearance;

    // Insert the cleaned text as plain text (the refresher will re-render
    // with proper formatting on the next refresh cycle)
    if (entry.text.length > 0) {
      childCC.insertText(entry.text, "End");
    }
  }

  await context.sync();
}

/**
 * Strips inline separators and closing punctuation from legacy CC text.
 *
 * In the v1 model, separators ("; ") and closing punctuation (".") were
 * stored inside the citation text. The v2 refresher manages these
 * externally, so they must be removed during migration.
 *
 * Stripping rules:
 *  - First citation: no leading separator expected.
 *  - Middle citations: may have a leading "; " (strip it).
 *  - Last citation: may have a trailing "." (strip it).
 *  - A citation that is both first and last (single citation in footnote):
 *    only strip trailing ".".
 *
 * Conservative approach: only strip known separator patterns to avoid
 * accidentally removing meaningful content.
 *
 * @param text - The raw text content from the legacy CC.
 * @param index - The 0-based index of this CC within the footnote.
 * @param total - The total number of legacy CCs in this footnote.
 * @returns The cleaned text.
 */
function stripInlinePunctuation(
  text: string,
  index: number,
  total: number,
): string {
  let cleaned = text;

  // Strip leading separator from non-first citations
  if (index > 0) {
    // Check for leading "; " or ". " (Rule 1.1.3 separators)
    if (cleaned.startsWith("; ") || cleaned.startsWith(". ")) {
      cleaned = cleaned.substring(2);
    }
  }

  // Strip trailing closing punctuation from the last citation
  if (index === total - 1) {
    // Only strip a trailing "." that is closing punctuation, not part of
    // an abbreviation. A lone trailing "." is most likely the footnote
    // closer. Do NOT strip "!" or "?" as they are part of the citation.
    if (cleaned.endsWith(".")) {
      // Guard: don't strip if the text ends with a common abbreviation
      // pattern like "Ltd." or "Inc." — the refresher will handle adding
      // closing punctuation correctly regardless, but stripping an
      // abbreviation period would corrupt the text. We check for a
      // preceding letter (abbreviation) vs preceding space/paren (closer).
      const beforeDot = cleaned.length >= 2 ? cleaned[cleaned.length - 2] : "";
      if (
        beforeDot === " " ||
        beforeDot === ")" ||
        beforeDot === "]" ||
        beforeDot === "\u2019" || // right single quote (closing)
        beforeDot === '"' ||
        beforeDot === "\u201D" || // right double quote
        // Also strip if the dot is the only character after digits (page refs)
        /\d$/.test(beforeDot)
      ) {
        cleaned = cleaned.slice(0, -1);
      }
    }
  }

  return cleaned.trim();
}

// ─── Auto-Trigger ───────────────────────────────────────────────────────────

/**
 * Checks if migration is needed and runs it if so.
 *
 * Should be called once when the add-in loads, after the store is
 * initialised. Uses both a session-level flag (to avoid re-scanning
 * within a session) and the store's `ccModel` metadata field (to avoid
 * re-scanning across sessions).
 *
 * If migration is performed, the store's `ccModel` is updated to
 * `"parent-child"` and persisted. The caller should trigger a full
 * refresh (refreshAllCitations) after this returns with a non-zero
 * migratedCount.
 *
 * @param context - An active Word request context.
 * @param store - The initialised CitationStore instance.
 * @returns The migration result, or null if no migration was needed.
 */
export async function ensureModelMigrated(
  context: Word.RequestContext,
  store: CitationStore,
): Promise<MigrationResult | null> {
  // Skip if already checked this session
  if (migrationCheckedThisSession) {
    return null;
  }
  migrationCheckedThisSession = true;

  // Skip if store already records parent-child model
  const ccModel = store.getCcModel();
  if (ccModel === "parent-child") {
    return null;
  }

  // Detect the actual model version from document content
  const version = await detectModelVersion(context);

  if (version === "empty") {
    // No citations at all — mark as parent-child (new documents start v2)
    await store.setCcModel("parent-child");
    return null;
  }

  if (version === "v2") {
    // Already on the new model but store metadata wasn't updated — fix it
    await store.setCcModel("parent-child");
    return null;
  }

  // version === "v1" — run migration
  const result = await migrateToV2(context);

  if (result.migratedCount > 0) {
    // Persist the model version to avoid re-scanning on next open
    await store.setCcModel("parent-child");
  }

  return result;
}
