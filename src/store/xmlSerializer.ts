/**
 * XML Serialization for the Obiter citation store (Schema v2).
 *
 * Converts between Citation objects and XML strings stored in the
 * Custom XML Part. This module is pure (no Office.js dependency)
 * and can be tested independently.
 *
 * ## Schema v2 (current)
 *
 * Citation-level scalars (shortTitle, aglcVersion, firstFootnoteNumber,
 * createdAt, modifiedAt) are **attributes** on `<obiter:citation>`.
 * Data fields use `<obiter:field name="...">value</obiter:field>`.
 * This eliminates collisions between same-named fields at different
 * nesting levels (e.g. data.shortTitle vs citation.shortTitle).
 *
 * ## Schema v1 (legacy — read-only)
 *
 * Data fields were child elements inside `<obiter:data>`, and citation-level
 * scalars were sibling elements. The deserializer detects v1 format
 * (absence of `<obiter:field>` elements) and falls back accordingly.
 * After one open+save cycle the document is migrated to v2.
 */

import { Citation, CitationStoreData, SourceData, SourceType } from "../types/citation";

export const OBITER_NAMESPACE = "urn:obiter:aglc";
const DEFAULT_SCHEMA_VERSION = "2";
const DEFAULT_AGLC_VERSION = "4";

// ─── Generator info (INFRA-008 Layer 2) ─────────────────────────────────────

/**
 * Metadata about the Obiter instance that last wrote the store.
 * Embedded as `<obiter:generator>` inside the citation store XML.
 */
export interface GeneratorInfo {
  name: string;
  version: string;
  standard: string;
  mode: string;
}

// ─── Serialization ───────────────────────────────────────────────────────────

/**
 * Serialize a single Citation into an XML element string (v2 schema).
 *
 * Citation-level scalars become attributes; data fields become
 * `<obiter:field name="...">` children.
 */
export function serializeCitation(citation: Citation): string {
  const attrs = [
    `id="${escapeXml(citation.id)}"`,
    `sourceType="${escapeXml(citation.sourceType)}"`,
    `aglcVersion="${escapeXml(citation.aglcVersion)}"`,
  ];
  if (citation.shortTitle) attrs.push(`shortTitle="${escapeXml(citation.shortTitle)}"`);
  if (citation.firstFootnoteNumber != null) attrs.push(`firstFootnoteNumber="${citation.firstFootnoteNumber}"`);
  if (citation.createdAt) attrs.push(`createdAt="${escapeXml(citation.createdAt)}"`);
  if (citation.modifiedAt) attrs.push(`modifiedAt="${escapeXml(citation.modifiedAt)}"`);

  const lines = [`  <obiter:citation ${attrs.join(" ")}>`];

  // Data fields as <obiter:field name="...">value</obiter:field>
  for (const [key, value] of Object.entries(citation.data)) {
    if (value == null || value === "") continue;
    lines.push(`    <obiter:field name="${escapeXml(key)}">${escapeXml(serializeValue(value))}</obiter:field>`);
  }

  // Tags
  if (citation.tags?.length) {
    lines.push("    <obiter:tags>");
    for (const tag of citation.tags) {
      lines.push(`      <obiter:tag>${escapeXml(tag)}</obiter:tag>`);
    }
    lines.push("    </obiter:tags>");
  }

  lines.push("  </obiter:citation>");
  return lines.join("\n");
}

/**
 * Serialize the full citation store into a complete XML document string.
 */
export function serializeStore(
  citations: Citation[],
  schemaVersion: string = DEFAULT_SCHEMA_VERSION,
  aglcVersion: string = DEFAULT_AGLC_VERSION,
  standardId: string = "aglc4",
  writingMode: string = "academic",
  courtJurisdiction?: string,
  headingListId?: number,
  generatorVersion?: string,
  ccModel?: "flat" | "parent-child",
): string {
  const lines: string[] = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  const courtAttr = courtJurisdiction ? ` courtJurisdiction="${escapeXml(courtJurisdiction)}"` : "";
  const headingAttr = headingListId !== undefined ? ` headingListId="${headingListId}"` : "";
  const ccModelAttr = ccModel ? ` ccModel="${escapeXml(ccModel)}"` : "";
  lines.push(
    `<obiter:citationStore xmlns:obiter="${OBITER_NAMESPACE}" version="${escapeXml(schemaVersion)}" aglcVersion="${escapeXml(aglcVersion)}" standardId="${escapeXml(standardId)}" writingMode="${escapeXml(writingMode)}"${courtAttr}${headingAttr}${ccModelAttr}>`,
  );

  // INFRA-008 Layer 2: generator element
  if (generatorVersion) {
    lines.push(
      `  <obiter:generator name="Obiter" version="${escapeXml(generatorVersion)}" standard="${escapeXml(standardId)}" mode="${escapeXml(writingMode)}" />`,
    );
  }

  for (const citation of citations) {
    lines.push(serializeCitation(citation));
  }

  lines.push("</obiter:citationStore>");
  return lines.join("\n");
}

// ─── Deserialization ─────────────────────────────────────────────────────────

/**
 * Deserialize a single `<obiter:citation>` XML element string into a Citation.
 *
 * Handles both v2 (attributes + `<obiter:field>`) and v1 (child elements +
 * `<obiter:data>`) formats. Detection: if `<obiter:field` elements exist,
 * use v2. Otherwise fall back to v1.
 */
export function deserializeCitation(xml: string | Element): Citation {
  let root: Element;
  if (typeof xml === "string") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "text/xml");
    root = doc.documentElement;
  } else {
    root = xml;
  }

  const id = root.getAttribute("id") ?? "";
  const sourceType = (root.getAttribute("sourceType") ?? "") as SourceType;

  // ── v2 detection: look for <obiter:field> children ──
  const fieldEls = findChildrenByLocalName(root, "field");
  const isV2 = fieldEls.length > 0;

  // ── Data fields ──
  const data: SourceData = {};

  if (isV2) {
    // v2: <obiter:field name="title">value</obiter:field>
    for (const el of fieldEls) {
      const name = el.getAttribute("name");
      if (name) {
        data[name] = deserializeValue(el.textContent ?? "");
      }
    }
  } else {
    // v1: <obiter:data><obiter:title>value</obiter:title></obiter:data>
    const dataEl = findChildByLocalName(root, "data");
    if (dataEl) {
      let dataChildren = Array.from(dataEl.children);

      // Handle legacy nested encoding: text content may be HTML-encoded XML
      if (dataChildren.length === 0 && dataEl.textContent) {
        let decoded = dataEl.textContent;
        for (let i = 0; i < 10; i++) {
          if (decoded.includes("<obiter:") || !decoded.includes("&lt;")) break;
          decoded = unescapeXml(decoded);
        }
        // Strip nested <obiter:data> wrappers
        decoded = decoded.replace(/<\/?obiter:data>/g, "");
        if (decoded.includes("<obiter:")) {
          const innerDoc = parser.parseFromString(
            `<root xmlns:obiter="${OBITER_NAMESPACE}">${decoded}</root>`,
            "text/xml",
          );
          dataChildren = Array.from(innerDoc.documentElement.children);
        }
      }

      for (const child of dataChildren) {
        const tagName = child.localName;
        if (tagName === "data") continue; // skip nested data wrappers
        const textContent = child.textContent ?? "";
        data[tagName] = deserializeValue(textContent);
      }
    }
  }

  // ── Citation-level scalars ──
  let shortTitle: string | undefined;
  let firstFootnoteNumber: number | undefined;
  let createdAt: string;
  let modifiedAt: string;
  let aglcVersion: "4" | "5";

  if (isV2) {
    // v2: citation-level scalars are attributes
    shortTitle = root.getAttribute("shortTitle") ?? undefined;
    const firstFn = root.getAttribute("firstFootnoteNumber");
    firstFootnoteNumber = firstFn ? parseInt(firstFn, 10) : undefined;
    createdAt = root.getAttribute("createdAt") ?? new Date().toISOString();
    modifiedAt = root.getAttribute("modifiedAt") ?? new Date().toISOString();
    aglcVersion = (root.getAttribute("aglcVersion") ?? DEFAULT_AGLC_VERSION) as "4" | "5";
  } else {
    // v1: citation-level scalars are child elements (direct children of root only)
    const getDirectChildText = (name: string): string | null => {
      const dataEl = findChildByLocalName(root, "data");
      for (const child of Array.from(root.children)) {
        if (child.localName === name && child !== dataEl) {
          return child.textContent?.trim() ?? null;
        }
      }
      return null;
    };

    shortTitle = getDirectChildText("shortTitle") ?? undefined;
    const firstFnStr = getDirectChildText("firstFootnoteNumber");
    firstFootnoteNumber = firstFnStr != null ? parseInt(firstFnStr, 10) : undefined;
    createdAt = getDirectChildText("createdAt") ?? new Date().toISOString();
    modifiedAt = getDirectChildText("modifiedAt") ?? new Date().toISOString();
    aglcVersion = (getDirectChildText("aglcVersion") ?? DEFAULT_AGLC_VERSION) as "4" | "5";
  }

  // ── Tags (same format in both v1 and v2) ──
  const tags: string[] = [];
  const tagsEl = findChildByLocalName(root, "tags");
  if (tagsEl) {
    for (const tagChild of Array.from(tagsEl.children)) {
      if (tagChild.localName === "tag" && tagChild.textContent) {
        tags.push(tagChild.textContent);
      }
    }
  }

  return {
    id,
    sourceType,
    aglcVersion,
    data,
    shortTitle,
    firstFootnoteNumber,
    tags,
    createdAt,
    modifiedAt,
  };
}

/**
 * Deserialize the full store XML into a CitationStoreData object.
 *
 * Uses DOMParser for root-level attribute extraction, eliminating
 * the fragile regex-based approach.
 */
export function deserializeStore(xml: string): CitationStoreData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");
  const root = doc.documentElement;

  const schemaVersion = root.getAttribute("version") ?? "1.0";
  const aglcVersion = (root.getAttribute("aglcVersion") ?? DEFAULT_AGLC_VERSION) as "4" | "5";
  const standardId = root.getAttribute("standardId") ?? "aglc4";
  const writingMode = (root.getAttribute("writingMode") ?? "academic") as "academic" | "court";
  const courtJurisdiction = root.getAttribute("courtJurisdiction") ?? undefined;
  const headingListIdStr = root.getAttribute("headingListId");
  const headingListId = headingListIdStr ? parseInt(headingListIdStr, 10) : undefined;
  const ccModel = (root.getAttribute("ccModel") as "flat" | "parent-child" | null) ?? undefined;

  // INFRA-008 Layer 2: read generator element
  let generator: GeneratorInfo | undefined;
  const generatorEl = findChildByLocalName(root, "generator");
  if (generatorEl) {
    generator = {
      name: generatorEl.getAttribute("name") || "Obiter",
      version: generatorEl.getAttribute("version") || "",
      standard: generatorEl.getAttribute("standard") || "",
      mode: generatorEl.getAttribute("mode") || "",
    };
  }

  // Extract all <obiter:citation> children — pass Element directly
  // to avoid XMLSerializer re-serialization issues with namespace prefixes.
  const citations: Citation[] = [];
  for (const child of Array.from(root.children)) {
    if (child.localName === "citation") {
      citations.push(deserializeCitation(child));
    }
  }

  return {
    metadata: {
      schemaVersion,
      aglcVersion,
      standardId,
      writingMode,
      courtJurisdiction,
      headingListId,
      ccModel,
    },
    generator,
    citations,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function unescapeXml(str: string): string {
  return str
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

/**
 * Find direct children of an element by localName.
 * Works reliably across DOMParser implementations regardless of namespace handling.
 */
function findChildrenByLocalName(parent: Element, name: string): Element[] {
  const result: Element[] = [];
  for (const child of Array.from(parent.children)) {
    if (child.localName === name) result.push(child);
  }
  return result;
}

/**
 * Find the first direct child of an element by localName.
 */
function findChildByLocalName(parent: Element, name: string): Element | null {
  for (const child of Array.from(parent.children)) {
    if (child.localName === name) return child;
  }
  return null;
}

/**
 * Serialize a JS value to a string for XML storage.
 * Arrays and objects are JSON-encoded; primitives are stringified.
 */
function serializeValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Deserialize a string value from XML back to a JS value.
 * Attempts JSON parse for arrays/objects; returns string otherwise.
 */
function deserializeValue(str: string): unknown {
  const trimmed = str.trim();
  if (trimmed === "") return "";
  // Try JSON parse for objects/arrays
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  // Try numeric
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  return trimmed;
}
