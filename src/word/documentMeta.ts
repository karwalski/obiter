/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Manages document-level metadata: custom properties, add-in notice,
 * and template preferences. Ensures documents carry Obiter provenance
 * and display a helpful message when opened without the add-in.
 */

/* global Word */

import { toText } from "../engine/rules/v4/general/coerce";

// ─── Custom Document Properties ────────────────────────────────────────────
//
// Writing moved to `writeObiterProperties` in documentProperties.ts, which
// follows DECISION-043 item 1 (COURT-102): only Obiter.Version and the actual
// citation standard, written once the document holds a citation; never a
// person's name.

/**
 * Reads Obiter metadata from the document. Returns null if the document
 * carries no `Obiter.Version` property.
 */
export async function getDocumentMetadata(
  context: Word.RequestContext
): Promise<{ version: string; style: string } | null> {
  try {
    const custom = context.document.properties.customProperties;
    custom.load("items");
    await context.sync();

    let version = "";
    let style = "";

    for (const prop of custom.items ?? []) {
      // Values typed string can come back as numbers from the store: toText().
      if (prop.key === "Obiter.Version") version = toText(prop.value);
      if (prop.key === "Obiter.CitationStyle") style = toText(prop.value);
    }

    if (!version) return null;
    return { version, style };
  } catch {
    return null;
  }
}

// ─── Add-in Notice ─────────────────────────────────────────────────────────

const NOTICE_TAG = "obiter-addin-notice";

const NOTICE_TEXT =
  "This document uses Obiter for AGLC4 citation management. " +
  "Some citations may display as content controls. " +
  "Install the Obiter add-in from obiter.com.au to edit citations, " +
  "regenerate the bibliography, and validate formatting.";

/**
 * Inserts a notice at the top of the document that is visible when the
 * add-in is not installed. The notice is wrapped in a content control
 * tagged so we can hide it when the add-in IS loaded.
 */
export async function insertAddinNotice(context: Word.RequestContext): Promise<void> {
  // Check if notice already exists
  const existing = context.document.contentControls.getByTag(NOTICE_TAG);
  existing.load("items");
  await context.sync();

  // eslint-disable-next-line office-addins/load-object-before-read -- collection loaded and synced immediately before this read
  if ((existing.items ?? []).length > 0) return; // Already present

  const body = context.document.body;
  const para = body.insertParagraph(NOTICE_TEXT, "Start" as Word.InsertLocation.start);
  para.font.size = 9;
  para.font.color = "#888888";
  para.font.italic = true;
  para.alignment = "Left" as Word.Alignment;

  const cc = para.insertContentControl("RichText");
  cc.tag = NOTICE_TAG;
  cc.title = "Obiter Add-in Notice";
  cc.appearance = "Hidden" as Word.ContentControlAppearance;
  cc.cannotDelete = false;
  cc.cannotEdit = true;

  await context.sync();
}

/**
 * Hides or removes the add-in notice. Called when the add-in loads —
 * the notice is only useful for users who open the doc without the add-in.
 */
export async function hideAddinNotice(context: Word.RequestContext): Promise<void> {
  const controls = context.document.contentControls.getByTag(NOTICE_TAG);
  controls.load("items");
  await context.sync();

  const controlItems = controls.items ?? [];
  for (const cc of controlItems) {
    cc.cannotEdit = false;
    cc.cannotDelete = false;
    cc.delete(false); // delete control AND content
  }

  if (controlItems.length > 0) {
    await context.sync();
  }
}

// ─── Template Preferences ──────────────────────────────────────────────────

export interface TemplatePreferences {
  fontName: string;
  fontSize: number;
  lineSpacing: number; // in points
  marginPt: number; // in points (72 = 1 inch)
  includeTitle: boolean;
  includeAuthor: boolean;
  includeNotice: boolean;
}

const DEFAULT_PREFERENCES: TemplatePreferences = {
  fontName: "", // empty = don't override document's default font
  fontSize: 12,
  lineSpacing: 24, // double spacing for 12pt
  marginPt: 72, // 1 inch / 2.54 cm
  includeTitle: true,
  includeAuthor: true,
  includeNotice: true,
};

/**
 * Loads saved template preferences from localStorage.
 */
export function loadTemplatePreferences(): TemplatePreferences {
  try {
    const saved = localStorage.getItem("obiter-templatePrefs");
    if (saved) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_PREFERENCES };
}

/**
 * Saves template preferences to localStorage.
 */
export function saveTemplatePreferences(prefs: TemplatePreferences): void {
  try {
    localStorage.setItem("obiter-templatePrefs", JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

/**
 * Returns the default template preferences.
 */
export function getDefaultPreferences(): TemplatePreferences {
  return { ...DEFAULT_PREFERENCES };
}
