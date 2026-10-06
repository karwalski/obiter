/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/* global Word */

/**
 * COURT-109 (OBI-201, OBI-204, OBI-P01, OBI-P04): detect and preserve
 * fields, bookmarks and content controls that Obiter did not create.
 *
 * Court and firm documents carry automation Obiter does not own: REF fields
 * and `_Ref` bookmarks inside HCA footnotes (O-C3), DOCPROPERTY fields and a
 * custom-XML-bound content control in the FCA judgment template (O-F2), and
 * ADDIN / CITATION fields from citation managers (OBI-P01). A footnote
 * rebuild replaces the managed control's content, which would delete any of
 * these that sit inside it. Decision rule 6 of the backlog applies:
 * preserve, do not integrate.
 *
 * So before rebuilding, the refresher reads the fields (WordApi 1.4, all
 * platforms; R08 §3.4) and bookmarks (WordApi 1.4, all platforms; R08 §3.5)
 * inside each managed control's range, in the SAME batched sync as the text
 * it already reads. A footnote holding anything Obiter did not create is
 * skipped and reported, never rebuilt. Scan & Repair reads the same things
 * per note and lists them as preserved instead of adopting the note.
 *
 * Obiter creates no fields and no bookmarks, so every field and bookmark
 * found is foreign, apart from bookmarks Word maintains itself: `_GoBack`
 * (the "last edit" position) and `_Hlk…` (hidden bookmarks Word adds around
 * copied text). Counting those would stop ordinary documents refreshing
 * whenever a footnote had been copied; `_Ref…` cross-reference targets and
 * every named bookmark are foreign. Obiter never calls `updateResult`,
 * `delete` or a code write on a field, and never edits docVars, custom XML
 * parts outside its own namespaces, or content controls it did not tag.
 */

import { isFeatureAvailable } from "./apiCompat";
import { toText } from "../engine/rules/v4/general/coerce";

/**
 * Field types Scan & Repair names individually (COURT-109). Anything else is
 * reported under its own keyword, or "Field" when the code is empty.
 */
export const NAMED_FIELD_TYPES = [
  "ADDIN",
  "CITATION",
  "BIBLIOGRAPHY",
  "TA",
  "TOA",
  "REF",
  "NOTEREF",
  "PAGEREF",
  "HYPERLINK",
  "DOCPROPERTY",
  "MACROBUTTON",
] as const;

/** Bookmarks Word maintains itself; they are not user or template content. */
const WORD_INTERNAL_BOOKMARKS = new Set(["_GoBack"]);

/** Prefix of the hidden bookmarks Word adds around copied text. */
const WORD_COPY_BOOKMARK_PREFIX = "_Hlk";

/**
 * The field type keyword of a field code, upper-cased (` REF _Ref123 \h ` →
 * `REF`). The code is read through `toText` because a value read back from
 * Word is not guaranteed to be a string. Returns "Field" for an empty code.
 *
 * Pure — exported for tests.
 */
export function fieldTypeFromCode(code: unknown): string {
  const text = toText(code);
  const keyword = text.split(/\s+/)[0] ?? "";
  const cleaned = keyword.replace(/[^A-Za-z]/g, "").toUpperCase();
  return cleaned.length > 0 ? cleaned : "Field";
}

/** True when a bookmark name is user or template content (not `_GoBack` or `_Hlk…`). */
export function isForeignBookmark(name: unknown): boolean {
  const text = toText(name);
  return (
    text.length > 0 &&
    !WORD_INTERNAL_BOOKMARKS.has(text) &&
    !text.startsWith(WORD_COPY_BOOKMARK_PREFIX)
  );
}

/**
 * True when a content control nested in a managed footnote belongs to Obiter:
 * an internal `obiter-` control, a child whose tag is a citation in the
 * library, or a child carrying Obiter's occurrence title (`Citation`,
 * `Citation:<pref>[:<pinpoint>]`; a library entry may be missing after a
 * lost store, and that case keeps its existing behaviour). Anything else,
 * including an untagged control, is foreign.
 *
 * Pure — exported for tests.
 */
export function isObiterNestedControl(
  tag: unknown,
  title: unknown,
  isKnownCitation: (id: string) => boolean
): boolean {
  const tagText = toText(tag);
  if (tagText.length === 0) return false;
  if (tagText.startsWith("obiter-")) return true;
  if (isKnownCitation(tagText)) return true;
  return /^Citation(?::|$)/.test(toText(title));
}

/** What a foreign-content probe found inside one range. */
export interface ForeignContent {
  /** Field type keywords, one per field, in document order (`REF`, `ADDIN`…). */
  fieldTypes: string[];
  /** Bookmark names other than Word's own `_GoBack` and `_Hlk…`. */
  bookmarks: string[];
  /** Tags (or "untagged") of nested content controls Obiter did not create. */
  controls: string[];
}

/** True when a probe found anything Obiter does not own. */
export function hasForeignContent(found: ForeignContent | undefined): boolean {
  return (
    !!found &&
    (found.fieldTypes.length > 0 || found.bookmarks.length > 0 || found.controls.length > 0)
  );
}

/**
 * A short, plain description of foreign content for reports
 * (`2 REF fields, 1 bookmark`). Pure — exported for tests.
 */
export function describeForeignContent(found: ForeignContent): string {
  const parts: string[] = [];
  const counts = new Map<string, number>();
  for (const type of found.fieldTypes) counts.set(type, (counts.get(type) ?? 0) + 1);
  for (const [type, n] of counts) {
    parts.push(`${n} ${type === "Field" ? "" : `${type} `}field${n !== 1 ? "s" : ""}`);
  }
  if (found.bookmarks.length > 0) {
    parts.push(`${found.bookmarks.length} bookmark${found.bookmarks.length !== 1 ? "s" : ""}`);
  }
  if (found.controls.length > 0) {
    parts.push(
      `${found.controls.length} content control${found.controls.length !== 1 ? "s" : ""} from another tool`
    );
  }
  return parts.join(", ");
}

/** The reads `queueForeignContentProbe` queued, resolved after one sync. */
export interface ForeignContentProbe {
  fields?: Word.FieldCollection;
  bookmarks?: OfficeExtension.ClientResult<string[]>;
}

/** Which probes the host supports; computed once per pass, not per footnote. */
export interface ForeignProbeSupport {
  fields: boolean;
  bookmarks: boolean;
}

/** The probe support for this host (WordApi 1.4 for both reads). */
export function getForeignProbeSupport(): ForeignProbeSupport {
  return {
    fields: isFeatureAvailable("fieldsRead"),
    bookmarks: isFeatureAvailable("bookmarks"),
  };
}

/** True when the host supports at least one probe. */
export function anyProbeSupported(support: ForeignProbeSupport): boolean {
  return support.fields || support.bookmarks;
}

/**
 * Queues the field and bookmark reads for one range-bearing object (a
 * content control or a note body). Nothing is read until the caller's next
 * `context.sync()`, so a caller probing every footnote still pays for one
 * sync. A host or proxy without a method simply yields no probe.
 *
 * Bookmarks are read with hidden ones included (`_Ref` cross-reference
 * targets are hidden) and adjacent ones excluded (a bookmark that only
 * touches the edge is not inside the range).
 */
export function queueForeignContentProbe(
  target: Word.ContentControl | Word.Body,
  support: ForeignProbeSupport
): ForeignContentProbe {
  const probe: ForeignContentProbe = {};
  if (support.fields) {
    try {
      const fields = (target as { fields?: Word.FieldCollection }).fields;
      if (fields && typeof fields.load === "function") {
        fields.load("items/code");
        probe.fields = fields;
      }
    } catch {
      // No field collection on this host or proxy.
    }
  }
  if (support.bookmarks) {
    try {
      const getRange = (target as { getRange?: (loc?: string) => Word.Range }).getRange;
      const range = typeof getRange === "function" ? getRange.call(target, "Whole") : undefined;
      if (range && typeof range.getBookmarks === "function") {
        probe.bookmarks = range.getBookmarks(true, false);
      }
    } catch {
      // No bookmark API on this host or proxy.
    }
  }
  return probe;
}

/**
 * Reads a probe after its sync. Never throws: a value the host did not fill
 * reads as empty.
 *
 * @param probe - The probe `queueForeignContentProbe` returned.
 * @param controls - Foreign nested control tags already found by the caller.
 */
export function readForeignContentProbe(
  probe: ForeignContentProbe | undefined,
  controls: string[] = []
): ForeignContent {
  const fieldTypes: string[] = [];
  const bookmarks: string[] = [];
  if (probe?.fields) {
    try {
      for (const field of probe.fields.items ?? []) {
        fieldTypes.push(fieldTypeFromCode(field.code));
      }
    } catch {
      // Not loaded.
    }
  }
  if (probe?.bookmarks) {
    try {
      const names = probe.bookmarks.value;
      if (Array.isArray(names)) {
        for (const name of names) {
          if (isForeignBookmark(name)) bookmarks.push(toText(name));
        }
      }
    } catch {
      // Not loaded.
    }
  }
  return { fieldTypes, bookmarks, controls };
}
