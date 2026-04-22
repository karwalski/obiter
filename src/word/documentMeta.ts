/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Manages document-level metadata: custom properties, add-in notice,
 * and template preferences. Ensures documents carry Obiter provenance
 * and display a helpful message when opened without the add-in.
 */

/* global Word */

import { APP_VERSION } from "../constants";

// ─── Custom Document Properties ────────────────────────────────────────────

/**
 * Sets custom document properties identifying this as an Obiter-managed
 * document. These persist in the .docx file and are visible in Word's
 * File > Properties > Custom Properties.
 */
export async function setDocumentMetadata(
  context: Word.RequestContext,
): Promise<void> {
  const properties = context.document.properties;
  properties.load("author,title");
  await context.sync();

  // Set custom properties via the customProperties API
  const custom = properties.customProperties;

  custom.add("Obiter.Version", APP_VERSION);
  custom.add("Obiter.CitationStyle", "AGLC4");
  custom.add("Obiter.Author", "Watt, Matthew");
  custom.add("Obiter.ManagedDocument", "true");
  custom.add("Obiter.CreatedDate", new Date().toISOString());
  custom.add("Obiter.Website", "https://obiter.com.au");

  await context.sync();
}

/**
 * Reads Obiter metadata from the document. Returns null if the document
 * was not created with Obiter.
 */
export async function getDocumentMetadata(
  context: Word.RequestContext,
): Promise<{ version: string; style: string; author: string } | null> {
  try {
    const custom = context.document.properties.customProperties;
    custom.load("items");
    await context.sync();

    let version = "";
    let style = "";
    let author = "";

    for (const prop of (custom.items ?? [])) {
      if (prop.key === "Obiter.Version") version = String(prop.value);
      if (prop.key === "Obiter.CitationStyle") style = String(prop.value);
      if (prop.key === "Obiter.Author") author = String(prop.value);
    }

    if (!version) return null;
    return { version, style, author };
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
export async function insertAddinNotice(
  context: Word.RequestContext,
): Promise<void> {
  // Check if notice already exists
  const existing = context.document.contentControls.getByTag(NOTICE_TAG);
  existing.load("items");
  await context.sync();

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
export async function hideAddinNotice(
  context: Word.RequestContext,
): Promise<void> {
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
  lineSpacing: number;  // in points
  marginPt: number;     // in points (72 = 1 inch)
  includeTitle: boolean;
  includeAuthor: boolean;
  includeNotice: boolean;
}

const DEFAULT_PREFERENCES: TemplatePreferences = {
  fontName: "Times New Roman",
  fontSize: 12,
  lineSpacing: 24,   // double spacing for 12pt
  marginPt: 72,      // 1 inch / 2.54 cm
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
  } catch { /* ignore */ }
  return { ...DEFAULT_PREFERENCES };
}

/**
 * Saves template preferences to localStorage.
 */
export function saveTemplatePreferences(prefs: TemplatePreferences): void {
  try {
    localStorage.setItem("obiter-templatePrefs", JSON.stringify(prefs));
  } catch { /* ignore */ }
}

/**
 * Returns the default template preferences.
 */
export function getDefaultPreferences(): TemplatePreferences {
  return { ...DEFAULT_PREFERENCES };
}
