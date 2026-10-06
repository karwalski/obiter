/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * COURT-105 (OBI-402): package-level reader for the synthetic OOXML fixtures.
 *
 * The fixtures are Flat OPC files (`<pkg:package>`, one `<pkg:part>` per
 * package part): Word opens them directly, they diff cleanly in review and
 * they need no ZIP reader in the tests. `scripts/research/build_ooxml_fixtures.py`
 * packs them into `.docx` files for device tests and for the R03 inspector.
 *
 * `inventoryOf` reduces a package to a semantic inventory: the structures
 * R03 observed in court documents (style-linked numbering, fields, bookmarks,
 * content controls, docVars, custom XML, custom properties, revisions,
 * comments, footnote text, NBSPs, split italic runs). Revision ids (rsids)
 * and timestamps are never part of the inventory, and `canonicalPart` strips
 * them from raw part XML, so a save that only changes them compares equal.
 *
 * Needs a DOM (`DOMParser`, `XMLSerializer`): suites using it declare
 * `@jest-environment jsdom`. Not a Jest test file.
 */

import { readFileSync } from "fs";
import { join } from "path";

export const PKG_NS = "http://schemas.microsoft.com/office/2006/xmlPackage";
export const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const CUSTP_NS = "http://schemas.openxmlformats.org/officeDocument/2006/custom-properties";

/** The fixture files, by id. Each is modelled on an R03 observation (see its header comment). */
export const FIXTURE_FILES = {
  "hca-footnotes": "hca-footnotes.xml",
  "fca-template": "fca-template.xml",
  "nsw-export": "nsw-export.xml",
  "act-house-template": "act-house-template.xml",
  "obiter-managed": "obiter-managed.xml",
} as const;

export type FixtureId = keyof typeof FIXTURE_FILES;

/** Reads a fixture's Flat OPC XML from disk. */
export function loadFixture(id: FixtureId): string {
  return readFileSync(join(__dirname, FIXTURE_FILES[id]), "utf8");
}

// ─── Parts ──────────────────────────────────────────────────────────────────

function parse(xml: string): Document {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("Fixture XML is not well-formed");
  }
  return doc;
}

/** Each part's root element, keyed by part name (`/word/document.xml`). */
export function readParts(pkgXml: string): Map<string, Element> {
  const pkg = parse(pkgXml);
  const parts = new Map<string, Element>();
  for (const part of Array.from(pkg.getElementsByTagNameNS(PKG_NS, "part"))) {
    const name = part.getAttributeNS(PKG_NS, "name") ?? part.getAttribute("pkg:name") ?? "";
    const data = part.getElementsByTagNameNS(PKG_NS, "xmlData")[0];
    const root = data ? Array.from(data.children)[0] : undefined;
    if (root) parts.set(name, root);
  }
  return parts;
}

/** The serialised XML of one part (the root element, no declaration). */
export function partXml(pkgXml: string, partName: string): string {
  const root = readParts(pkgXml).get(partName);
  if (!root) throw new Error(`No part ${partName}`);
  return new XMLSerializer().serializeToString(root);
}

/**
 * Strips what a save changes without changing content: rsid attributes,
 * the settings `w:rsids` list, revision and comment timestamps, and the
 * core-properties dates and revision counter. Whitespace between tags is
 * collapsed. Everything else is kept byte for byte.
 */
export function canonicalPart(xml: string): string {
  return xml
    .replace(/\s+w:rsid[A-Za-z]*="[^"]*"/g, "")
    .replace(/<w:rsids>[\s\S]*?<\/w:rsids>/g, "")
    .replace(/\s+w:date="[^"]*"/g, "")
    .replace(/<dcterms:(created|modified)\b[^>]*>[^<]*<\/dcterms:\1>/g, "")
    .replace(/<cp:revision>[^<]*<\/cp:revision>/g, "")
    .replace(/>\s+</g, "><")
    .trim();
}

// ─── Inventory ──────────────────────────────────────────────────────────────

/** One content control, where it sits and what it is bound to. */
export interface ControlEntry {
  location: "body" | "footnotes";
  tag: string;
  alias: string;
  /** `xpath @ storeItemID` for a data-bound control. */
  binding?: string;
}

/** One footnote's reading. */
export interface FootnoteEntry {
  id: string;
  /** Visible text: inserted text kept, deleted text and field codes dropped, NBSP as a space. */
  text: string;
  nbsp: number;
  /** Runs of two or more adjacent italic runs (a case name split across runs). */
  splitItalics: number;
  /** Contains an `obiter-fn` control. */
  managed: boolean;
  /** Field types inside the footnote, in order. */
  fields: string[];
  bookmarks: string[];
  /** Pending tracked insertions or deletions inside the footnote. */
  revisions: number;
  /** Tags of the controls nested in this footnote, in order. */
  controls: string[];
}

export interface OoxmlInventory {
  parts: string[];
  /** `styleId (name)`, plus ` numId=N` for a style-linked list. */
  styles: string[];
  /** Body paragraph count per paragraph style id ("" = no style). */
  paragraphStyles: Record<string, number>;
  /** Body paragraphs carrying direct `w:numPr` (not via a style). */
  directNumbering: number;
  /** Normalised field instructions, body then footnotes. */
  fields: { body: string[]; footnotes: string[] };
  bookmarks: { body: string[]; footnotes: string[] };
  hyperlinkAnchors: string[];
  /** Internal hyperlink anchors with no bookmark of that name in the file. */
  danglingAnchors: string[];
  controls: ControlEntry[];
  docVars: string[];
  /** Root namespace of each custom XML part. */
  customXml: string[];
  /** `name = value` for each custom document property. */
  customProperties: string[];
  revisions: { insertions: number; deletions: number };
  comments: number;
  footnotes: FootnoteEntry[];
  nbsp: number;
}

function wAttr(el: Element, name: string): string {
  return el.getAttributeNS(W_NS, name) ?? el.getAttribute(`w:${name}`) ?? "";
}

function all(el: Element | undefined, local: string): Element[] {
  return el ? Array.from(el.getElementsByTagNameNS(W_NS, local)) : [];
}

/** Field instructions in document order: simple fields and complex (instrText runs joined). */
function fieldInstructions(root: Element | undefined): string[] {
  if (!root) return [];
  const out: string[] = [];
  // One entry per open complex field: its instruction so far, and whether
  // it was already emitted at its `separate` mark.
  const open: { instr: string; emitted: boolean }[] = [];
  const walk = (node: Element): void => {
    const local = node.localName;
    if (node.namespaceURI === W_NS) {
      if (local === "fldSimple") {
        out.push(wAttr(node, "instr"));
      } else if (local === "fldChar") {
        const type = wAttr(node, "fldCharType");
        const top = open[open.length - 1];
        if (type === "begin") {
          open.push({ instr: "", emitted: false });
        } else if (top && (type === "separate" || type === "end")) {
          if (!top.emitted) {
            out.push(top.instr);
            top.emitted = true;
          }
          if (type === "end") open.pop();
        }
      } else if (local === "instrText" && open.length > 0) {
        open[open.length - 1].instr += node.textContent ?? "";
      }
    }
    for (const child of Array.from(node.children)) walk(child);
  };
  walk(root);
  return out.map((instr) => instr.replace(/\s+/g, " ").trim());
}

/** The field type from an instruction (`REF`, `ADDIN`, `TOC`, …). */
export function fieldType(instr: string): string {
  return (instr.trim().split(/\s+/)[0] ?? "").toUpperCase();
}

/** Visible text: w:t only (never w:delText or w:instrText), NBSP folded to a space. */
function visibleText(root: Element): string {
  return all(root, "t")
    .map((t) => t.textContent ?? "")
    .join("")
    .replace(/\u00a0/g, " ");
}

function countNbsp(root: Element | undefined): number {
  if (!root) return 0;
  return all(root, "t").reduce(
    (n, t) => n + ((t.textContent ?? "").match(/\u00a0/g) ?? []).length,
    0
  );
}

function isItalicRun(run: Element): boolean {
  const rPr = Array.from(run.children).find((c) => c.localName === "rPr");
  if (!rPr) return false;
  const i = Array.from(rPr.children).find((c) => c.localName === "i");
  return i !== undefined && wAttr(i, "val") !== "0" && wAttr(i, "val") !== "false";
}

/** Counts maximal runs of ≥ 2 adjacent italic text runs in each paragraph (O-C9). */
function countSplitItalics(root: Element): number {
  let count = 0;
  for (const p of all(root, "p")) {
    let streak = 0;
    for (const child of Array.from(p.children)) {
      const italicText =
        child.localName === "r" && isItalicRun(child) && all(child, "t").length > 0;
      if (italicText) {
        streak++;
      } else {
        if (streak >= 2) count++;
        streak = 0;
      }
    }
    if (streak >= 2) count++;
  }
  return count;
}

function controlTag(sdt: Element): string {
  const tag = all(sdt, "tag")[0];
  return tag && tag.parentElement?.parentElement === sdt ? wAttr(tag, "val") : "";
}

function controlAlias(sdt: Element): string {
  const alias = all(sdt, "alias")[0];
  return alias && alias.parentElement?.parentElement === sdt ? wAttr(alias, "val") : "";
}

function controlsOf(root: Element | undefined, location: ControlEntry["location"]): ControlEntry[] {
  return all(root, "sdt").map((sdt) => {
    const pr = Array.from(sdt.children).find((c) => c.localName === "sdtPr");
    const binding = pr
      ? Array.from(pr.children).find((c) => c.localName === "dataBinding")
      : undefined;
    return {
      location,
      tag: controlTag(sdt),
      alias: controlAlias(sdt),
      ...(binding
        ? { binding: `${wAttr(binding, "xpath")} @ ${wAttr(binding, "storeItemID")}` }
        : {}),
    };
  });
}

/** The real (non-separator) footnotes of a footnotes part. */
export function realFootnotes(footnotesRoot: Element | undefined): Element[] {
  return all(footnotesRoot, "footnote").filter((f) => {
    const type = wAttr(f, "type");
    return type === "" || type === "normal";
  });
}

function footnoteEntry(note: Element): FootnoteEntry {
  const controls = all(note, "sdt").map(controlTag);
  return {
    id: wAttr(note, "id"),
    text: visibleText(note).trim(),
    nbsp: countNbsp(note),
    splitItalics: countSplitItalics(note),
    managed: controls.includes("obiter-fn"),
    fields: fieldInstructions(note).map(fieldType),
    bookmarks: all(note, "bookmarkStart").map((b) => wAttr(b, "name")),
    revisions: all(note, "ins").length + all(note, "del").length,
    controls,
  };
}

/** Reduces a Flat OPC package to its semantic inventory (no rsids, no timestamps). */
export function inventoryOf(pkgXml: string): OoxmlInventory {
  const parts = readParts(pkgXml);
  const document = parts.get("/word/document.xml");
  const body = all(document, "body")[0];
  const styles = parts.get("/word/styles.xml");
  const footnotes = parts.get("/word/footnotes.xml");
  const settings = parts.get("/word/settings.xml");
  const comments = parts.get("/word/comments.xml");
  const custom = parts.get("/docProps/custom.xml");

  const paragraphStyles: Record<string, number> = {};
  let directNumbering = 0;
  for (const p of all(body, "p")) {
    const pPr = Array.from(p.children).find((c) => c.localName === "pPr");
    const style = pPr ? all(pPr, "pStyle")[0] : undefined;
    const id = style ? wAttr(style, "val") : "";
    paragraphStyles[id] = (paragraphStyles[id] ?? 0) + 1;
    if (pPr && Array.from(pPr.children).some((c) => c.localName === "numPr")) directNumbering++;
  }

  const bodyBookmarks = all(body, "bookmarkStart").map((b) => wAttr(b, "name"));
  const noteBookmarks = all(footnotes, "bookmarkStart").map((b) => wAttr(b, "name"));
  const allBookmarks = new Set([...bodyBookmarks, ...noteBookmarks]);
  const anchors = [...all(body, "hyperlink"), ...all(footnotes, "hyperlink")]
    .map((h) => wAttr(h, "anchor"))
    .filter((a) => a !== "");

  const customXml = Array.from(parts.entries())
    .filter(([name]) => /^\/customXml\/item\d+\.xml$/.test(name))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, root]) => root.namespaceURI ?? "");

  const customProperties = custom
    ? Array.from(custom.getElementsByTagNameNS(CUSTP_NS, "property")).map(
        (p) => `${p.getAttribute("name") ?? ""} = ${(p.textContent ?? "").trim()}`
      )
    : [];

  const docParts = [document, footnotes].filter((p): p is Element => p !== undefined);

  return {
    parts: Array.from(parts.keys()).sort(),
    styles: all(styles, "style").map((s) => {
      const name = all(s, "name")[0];
      const pPr = Array.from(s.children).find((c) => c.localName === "pPr");
      const numId = pPr ? all(pPr, "numId")[0] : undefined;
      return `${wAttr(s, "styleId")} (${name ? wAttr(name, "val") : ""})${
        numId ? ` numId=${wAttr(numId, "val")}` : ""
      }`;
    }),
    paragraphStyles,
    directNumbering,
    fields: { body: fieldInstructions(body), footnotes: fieldInstructions(footnotes) },
    bookmarks: { body: bodyBookmarks, footnotes: noteBookmarks },
    hyperlinkAnchors: anchors,
    danglingAnchors: anchors.filter((a) => !allBookmarks.has(a)),
    controls: [...controlsOf(body, "body"), ...controlsOf(footnotes, "footnotes")],
    docVars: all(settings, "docVar").map((v) => wAttr(v, "name")),
    customXml,
    customProperties,
    revisions: {
      insertions: docParts.reduce((n, p) => n + all(p, "ins").length, 0),
      deletions: docParts.reduce((n, p) => n + all(p, "del").length, 0),
    },
    comments: all(comments, "comment").length,
    footnotes: realFootnotes(footnotes).map(footnoteEntry),
    nbsp: docParts.reduce((n, p) => n + countNbsp(p), 0),
  };
}

/**
 * Compares two inventories and lists each top-level key that differs, with
 * both values. An empty list means the packages are semantically identical
 * (rsids and timestamps are never in an inventory).
 */
export function compareInventories(before: OoxmlInventory, after: OoxmlInventory): string[] {
  const diffs: string[] = [];
  for (const key of Object.keys(before) as (keyof OoxmlInventory)[]) {
    const a = JSON.stringify(before[key]);
    const b = JSON.stringify(after[key]);
    if (a !== b) diffs.push(`${key}: ${a} -> ${b}`);
  }
  return diffs;
}

// ─── Managed ranges ─────────────────────────────────────────────────────────

/** The `obiter-fn` control in a footnote, if any. */
function managedControl(note: Element): Element | undefined {
  return all(note, "sdt").find((sdt) => controlTag(sdt) === "obiter-fn");
}

/**
 * The package with the content of the managed (`obiter-fn`) controls in the
 * given footnotes emptied, every other part canonicalised. Two packages that
 * agree here differ at most inside those managed ranges (COURT-109: nothing
 * outside a rebuilt footnote's managed control may change).
 */
export function outsideManagedRanges(pkgXml: string, footnoteIds: string[]): string {
  const pkg = parse(pkgXml);
  for (const part of Array.from(pkg.getElementsByTagNameNS(PKG_NS, "part"))) {
    if ((part.getAttributeNS(PKG_NS, "name") ?? "") !== "/word/footnotes.xml") continue;
    for (const note of all(part, "footnote")) {
      if (!footnoteIds.includes(wAttr(note, "id"))) continue;
      const sdt = managedControl(note);
      const content = sdt
        ? Array.from(sdt.children).find((c) => c.localName === "sdtContent")
        : undefined;
      if (content) content.textContent = "";
    }
  }
  return canonicalPart(new XMLSerializer().serializeToString(pkg));
}

/** One piece of a rebuilt footnote: plain text, or text wrapped in a child control. */
export interface RebuildSegment {
  text: string;
  /** Child control tag (the citation id) when the segment is wrapped. */
  tag?: string;
  /** Child control title (`w:alias`). */
  alias?: string;
}

/**
 * Writes a rebuild into a footnote's managed control the way the refresher
 * does: the control's content is replaced by the rendered segments, each
 * citation wrapped in a child control carrying its tag and title. Returns
 * the new package XML. Used to apply refresher output to a fixture.
 */
export function applyManagedRebuild(
  pkgXml: string,
  footnoteId: string,
  segments: RebuildSegment[]
): string {
  const pkg = parse(pkgXml);
  const el = (name: string): Element => pkg.createElementNS(W_NS, `w:${name}`);
  const withVal = (name: string, value: string): Element => {
    const node = el(name);
    node.setAttributeNS(W_NS, "w:val", value);
    return node;
  };
  const run = (text: string): Element => {
    const r = el("r");
    const t = el("t");
    t.setAttribute("xml:space", "preserve");
    t.textContent = text;
    r.appendChild(t);
    return r;
  };
  for (const part of Array.from(pkg.getElementsByTagNameNS(PKG_NS, "part"))) {
    if ((part.getAttributeNS(PKG_NS, "name") ?? "") !== "/word/footnotes.xml") continue;
    const note = all(part, "footnote").find((f) => wAttr(f, "id") === footnoteId);
    const sdt = note ? managedControl(note) : undefined;
    const content = sdt
      ? Array.from(sdt.children).find((c) => c.localName === "sdtContent")
      : undefined;
    if (!content) throw new Error(`Footnote ${footnoteId} has no managed control`);
    while (content.firstChild) content.removeChild(content.firstChild);
    for (const segment of segments) {
      if (segment.tag === undefined) {
        content.appendChild(run(segment.text));
        continue;
      }
      const child = el("sdt");
      const pr = el("sdtPr");
      pr.appendChild(withVal("alias", segment.alias ?? ""));
      pr.appendChild(withVal("tag", segment.tag));
      const childContent = el("sdtContent");
      childContent.appendChild(run(segment.text));
      child.appendChild(pr);
      child.appendChild(childContent);
      content.appendChild(child);
    }
  }
  return new XMLSerializer().serializeToString(pkg);
}

/**
 * What the Word API would report for each footnote of a fixture: the text,
 * field codes, bookmark names and nested controls (tag and title). Feeds the
 * fake contexts the refresher and Scan & Repair tests run against.
 */
export interface ApiFootnote {
  id: string;
  text: string;
  fieldCodes: string[];
  bookmarks: string[];
  /** Controls nested in the footnote, in document order. */
  controls: { tag: string; title: string; inRevision: boolean }[];
}

export function apiFootnotes(pkgXml: string): ApiFootnote[] {
  const footnotes = readParts(pkgXml).get("/word/footnotes.xml");
  return realFootnotes(footnotes).map((note) => ({
    id: wAttr(note, "id"),
    // Word reports a footnote body's text without the reference mark, with
    // NBSPs as they are; the scan normalises them (COURT-121).
    text: all(note, "t")
      .map((t) => t.textContent ?? "")
      .join("")
      .trim(),
    fieldCodes: fieldInstructions(note).map((instr) => ` ${instr} `),
    bookmarks: all(note, "bookmarkStart").map((b) => wAttr(b, "name")),
    controls: all(note, "sdt").map((sdt) => ({
      tag: controlTag(sdt),
      title: controlAlias(sdt),
      inRevision: all(sdt, "ins").length + all(sdt, "del").length > 0,
    })),
  }));
}
