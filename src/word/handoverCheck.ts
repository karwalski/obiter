/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/* global Word */

/**
 * COURT-122 (OBI-206): pre-handover check and Obiter metadata review.
 *
 * Evidence: O-K2 (earlier releases wrote six `Obiter.*` properties on every
 * open, including a personal name), O-F9 (Obiter's own markers: the
 * `urn:obiter:aglc` custom XML part, `obiter-fn` controls, `Obiter.*`
 * properties), O-P1 / R08 §3.3–3.6 (custom properties WordApi 1.3; comments
 * and Track Changes mode 1.4; tracked changes 1.6). DECISION-043 item 1.
 *
 * Read-mostly. The only writes are the user's explicit, per-item removal of
 * an `Obiter.*` custom property and its undo. Obiter never removes comments,
 * tracked changes, author metadata, its own data part or its controls here,
 * and never touches a property another tool wrote. Office.js cannot save a
 * separate copy or export a PDF, so this check does neither.
 *
 * The snapshot read is O(1) in syncs (four, whatever the footnote count);
 * each optional read degrades to "unavailable" on hosts without the
 * requirement set or when the host rejects it.
 */

import { toText } from "../engine/rules/v4/general/coerce";
import type { CitationOccurrence } from "../engine/types/validation";
import { OBITER_NAMESPACE } from "../store/xmlSerializer";
import { BACKUP_NAMESPACE } from "../store/backupSerializer";
import { isFeatureAvailable } from "./apiCompat";
import { DocumentReadOnlyError, hostReportsReadOnly, rethrowWriteFailure } from "./documentAccess";
import {
  citationOccurrencesFromControls,
  LOCKED_PARENT_CC_TITLE,
  PARENT_CC_TAG,
} from "./footnoteManager";
import { normaliseTrackingMode, type TrackingMode } from "./trackChanges";
import { OBITER_PROPERTY_KEYS, RETIRED_PROPERTY_KEYS } from "./documentProperties";

/** Prefix of every custom property Obiter has ever written. */
export const OBITER_PROPERTY_PREFIX = "Obiter.";

/** Tags of the notice controls Obiter inserts (add-in notice, template notice, attribution). */
const OBITER_NOTICE_TAGS: ReadonlyArray<string> = [
  "obiter-addin-notice",
  "obiter-template-notice",
  "obiter-attribution",
];

/** Keys earlier releases wrote that this release no longer writes (COURT-102). */
const NO_LONGER_WRITTEN: ReadonlyArray<string> = [
  ...RETIRED_PROPERTY_KEYS,
  "Obiter.Website",
  "Obiter.ManagedDocument",
  "Obiter.Standard",
  "Obiter.Mode",
];

/** Keys Obiter writes again the next time it opens a document with citations. */
const REWRITTEN_ON_OPEN: ReadonlyArray<string> = Object.values(OBITER_PROPERTY_KEYS);

// ─── Types ──────────────────────────────────────────────────────────────────

/** One custom document property as read from the document. */
export interface DocumentPropertyEntry {
  key: string;
  /** The value as Word returned it (string, number, boolean or Date). */
  value: unknown;
  /** Word's property type ("String", "Number", "Boolean", "Date"), when reported. */
  type?: string;
}

/** Obiter's controls in the document, counted by kind. */
export interface ManagedControlCounts {
  /** `obiter-fn` footnote parent controls. */
  footnotes: number;
  /** Of those, footnotes the user locked. */
  locked: number;
  /** Citation controls (tagged with a citation id the store knows). */
  citations: number;
  /** Obiter notice controls (add-in notice, template notice, attribution). */
  notices: number;
}

/** Everything the check reads from the document. `undefined` = not available on this host. */
export interface HandoverSnapshot {
  footnoteTexts: string[];
  bodyText: string;
  headingLevels: number[];
  properties?: DocumentPropertyEntry[];
  /** Number of Obiter store parts (`urn:obiter:aglc`). */
  storeParts?: number;
  /** Number of Obiter backup parts (`urn:obiter:aglc:backup`). */
  backupParts?: number;
  controls: ManagedControlCounts;
  /** Citation occurrences with their footnote pinpoints (COURT-110 / N2). */
  occurrences?: CitationOccurrence[];
  comments?: number;
  pendingRevisions?: number;
  trackingMode: TrackingMode;
}

/** One Obiter property row in the review. */
export interface ObiterPropertyRow {
  key: string;
  /** Display text of the value (toText: string-typed values can return as numbers). */
  value: string;
  /** Earlier releases wrote it; this release no longer does. */
  noLongerWritten: boolean;
  /** Obiter writes it again the next time it opens this document with citations. */
  rewrittenOnOpen: boolean;
}

// ─── Pure helpers ───────────────────────────────────────────────────────────

/** True for a key Obiter owns (and so may offer to remove). */
export function isObiterPropertyKey(key: unknown): boolean {
  return typeof key === "string" && key.startsWith(OBITER_PROPERTY_PREFIX);
}

/**
 * The Obiter rows of a property list, in document order. Properties other
 * tools wrote are never listed; only their count is reported.
 */
export function obiterPropertyRows(properties: DocumentPropertyEntry[]): ObiterPropertyRow[] {
  return properties
    .filter((p) => isObiterPropertyKey(p.key))
    .map((p) => ({
      key: p.key,
      value: p.value instanceof Date ? p.value.toISOString() : toText(p.value),
      noLongerWritten: NO_LONGER_WRITTEN.includes(p.key),
      rewrittenOnOpen: REWRITTEN_ON_OPEN.includes(p.key),
    }));
}

/** Number of custom properties other tools wrote (shown, never changed). */
export function otherPropertyCount(properties: DocumentPropertyEntry[]): number {
  return properties.filter((p) => !isObiterPropertyKey(p.key)).length;
}

/**
 * Counts Obiter's controls from the document's control list.
 *
 * @param controls - tag and title of every content control in the document.
 * @param isKnownCitation - whether a tag is a citation id in the store.
 */
export function countManagedControls(
  controls: ReadonlyArray<{ tag: unknown; title: unknown }>,
  isKnownCitation: (tag: string) => boolean
): ManagedControlCounts {
  const counts: ManagedControlCounts = { footnotes: 0, locked: 0, citations: 0, notices: 0 };
  for (const cc of controls) {
    const tag = toText(cc.tag);
    const title = toText(cc.title);
    if (tag === PARENT_CC_TAG) {
      counts.footnotes++;
      if (title === LOCKED_PARENT_CC_TITLE) counts.locked++;
    } else if (OBITER_NOTICE_TAGS.includes(tag)) {
      counts.notices++;
    } else if (tag !== "" && isKnownCitation(tag)) {
      counts.citations++;
    }
  }
  return counts;
}

/** Outline levels of built-in Heading styles (same reading as the Validate view). */
export function headingLevelsOf(styles: ReadonlyArray<unknown>): number[] {
  const levels: number[] = [];
  for (const style of styles) {
    const match = /^Heading (\d)$/.exec(toText(style));
    if (match) levels.push(parseInt(match[1], 10));
  }
  return levels;
}

// ─── Reading the document ───────────────────────────────────────────────────

interface CountsProbe {
  comments?: Word.CommentCollection;
  revisions?: Word.TrackedChangeCollection;
  readMode: boolean;
}

/**
 * Reads everything the check reports, in four syncs whatever the size of
 * the document:
 *
 * 1. body text, footnotes, paragraph styles and the body's content controls;
 * 2. each footnote's text and content controls (one batch for all footnotes);
 * 3. custom properties (WordApi 1.3) and the Obiter custom XML parts;
 * 4. comment count (1.4), pending tracked changes (1.6), Track Changes mode (1.4).
 *
 * Batches 3 and 4 are optional: a host without the set, or one that rejects
 * the read, leaves those fields undefined rather than failing the check.
 *
 * @param context - A Word.RequestContext from within a Word.run() callback.
 * @param isKnownCitation - whether a control tag is a citation id in the store.
 */
export async function readHandoverSnapshot(
  context: Word.RequestContext,
  isKnownCitation: (tag: string) => boolean
): Promise<HandoverSnapshot> {
  const doc = context.document;
  const body = doc.body;

  // 1. Text, structure and controls.
  body.load("text");
  const footnotes = body.footnotes;
  footnotes.load("items");
  const paragraphs = body.paragraphs;
  paragraphs.load("items/style");
  const bodyControls = body.contentControls;
  bodyControls.load("items/tag,items/title");
  await context.sync();

  // 2. Footnote texts and controls, one batch for all footnotes (the same
  //    per-footnote reads the refresher and Scan & Repair rely on).
  const noteItems = footnotes.items ?? [];
  const noteControls = noteItems.map((note) => {
    note.body.load("text");
    const ccs = note.body.contentControls;
    ccs.load("items/tag,items/title");
    return ccs;
  });
  if (noteItems.length > 0) await context.sync();

  const allControls = [
    ...(bodyControls.items ?? []),
    ...noteControls.flatMap((ccs) => ccs.items ?? []),
  ];
  const snapshot: HandoverSnapshot = {
    footnoteTexts: noteItems.map((note) => toText(note.body.text)),
    bodyText: toText(body.text),
    headingLevels: headingLevelsOf((paragraphs.items ?? []).map((p) => p.style)),
    controls: countManagedControls(allControls, isKnownCitation),
    // COURT-110 (N2): the footnote pinpoints, from the controls read above.
    occurrences: citationOccurrencesFromControls(noteControls.map((ccs) => ccs.items ?? [])),
    trackingMode: "unknown",
  };

  // 3. Custom properties and Obiter's custom XML parts.
  try {
    const props = isFeatureAvailable("customProperties")
      ? doc.properties.customProperties
      : undefined;
    props?.load("items/key,items/value,items/type");
    const store = doc.customXmlParts.getByNamespace(OBITER_NAMESPACE);
    store.load("items/id");
    const backup = doc.customXmlParts.getByNamespace(BACKUP_NAMESPACE);
    backup.load("items/id");
    await context.sync();
    if (props) {
      snapshot.properties = (props.items ?? []).map((p) => ({
        key: toText(p.key),
        value: p.value,
        type: p.type === undefined ? undefined : toText(p.type),
      }));
    }
    snapshot.storeParts = (store.items ?? []).length;
    snapshot.backupParts = (backup.items ?? []).length;
  } catch {
    // Unavailable on this host: the panel says so.
  }

  // 4. Review state, read-only.
  const probe: CountsProbe = { readMode: isFeatureAvailable("changeTrackingMode") };
  try {
    if (isFeatureAvailable("comments")) {
      probe.comments = body.getComments();
      probe.comments.load("items");
    }
    if (isFeatureAvailable("trackedChanges")) {
      probe.revisions = body.getTrackedChanges();
      probe.revisions.load("items");
    }
    if (probe.readMode) doc.load("changeTrackingMode");
    if (probe.comments || probe.revisions || probe.readMode) {
      await context.sync();
      if (probe.comments) snapshot.comments = (probe.comments.items ?? []).length;
      if (probe.revisions) snapshot.pendingRevisions = (probe.revisions.items ?? []).length;
      if (probe.readMode) snapshot.trackingMode = normaliseTrackingMode(doc.changeTrackingMode);
    }
  } catch {
    // Not available on this host: counts stay undefined.
  }

  return snapshot;
}

// ─── Explicit, reversible property removal ──────────────────────────────────

/** A removed property, kept so the removal can be undone. */
export interface RemovedProperty {
  key: string;
  value: unknown;
}

/**
 * Removes one `Obiter.*` custom property at the user's request (COURT-122).
 * Refuses any other key: properties other tools wrote are never changed.
 * Returns what was removed so {@link restoreObiterProperty} can put it
 * back, or undefined when the property was already absent.
 *
 * A document that refuses the write throws {@link DocumentReadOnlyError}.
 *
 * @param context - A Word.RequestContext from within a Word.run() callback.
 * @param key - The property key; must start with `Obiter.`.
 */
export async function removeObiterProperty(
  context: Word.RequestContext,
  key: string
): Promise<RemovedProperty | undefined> {
  if (!isObiterPropertyKey(key)) {
    throw new Error(`Obiter only removes its own properties, not ${key}`);
  }
  if (hostReportsReadOnly()) throw new DocumentReadOnlyError(undefined);
  try {
    const item = context.document.properties.customProperties.getItemOrNullObject(key);
    item.load("isNullObject,value");
    await context.sync();
    if (item.isNullObject) return undefined;
    const removed: RemovedProperty = { key, value: item.value };
    item.delete();
    await context.sync();
    return removed;
  } catch (err: unknown) {
    rethrowWriteFailure(err);
  }
}

/**
 * Puts back a property {@link removeObiterProperty} removed, with its
 * original value. Only `Obiter.*` keys.
 *
 * @param context - A Word.RequestContext from within a Word.run() callback.
 * @param removed - The value `removeObiterProperty` returned.
 */
export async function restoreObiterProperty(
  context: Word.RequestContext,
  removed: RemovedProperty
): Promise<void> {
  if (!isObiterPropertyKey(removed.key)) {
    throw new Error(`Obiter only restores its own properties, not ${removed.key}`);
  }
  if (hostReportsReadOnly()) throw new DocumentReadOnlyError(undefined);
  try {
    context.document.properties.customProperties.add(removed.key, removed.value);
    await context.sync();
  } catch (err: unknown) {
    rethrowWriteFailure(err);
  }
}
