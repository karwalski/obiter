/**
 * XML Serialization for the Obiter citation store.
 *
 * Converts between Citation objects and XML strings stored in the
 * Custom XML Part. This module is pure (no Office.js dependency)
 * and can be tested independently.
 */

import { Citation, CitationStoreData, SourceData, SourceType } from "../types/citation";

export const OBITER_NAMESPACE = "urn:obiter:aglc";
const DEFAULT_SCHEMA_VERSION = "1.0";
const DEFAULT_AGLC_VERSION = "4";

// ─── Serialization ───────────────────────────────────────────────────────────

/**
 * Serialize a single Citation into an XML element string.
 */
export function serializeCitation(citation: Citation): string {
  const lines: string[] = [];
  const attrs = [
    `id="${escapeXml(citation.id)}"`,
    `sourceType="${escapeXml(citation.sourceType)}"`,
  ];
  lines.push(`  <obiter:citation ${attrs.join(" ")}>`);

  // data — each key becomes a child element
  lines.push("    <obiter:data>");
  for (const [key, value] of Object.entries(citation.data)) {
    lines.push(`      <obiter:${escapeXml(key)}>${escapeXml(serializeValue(value))}</obiter:${escapeXml(key)}>`);
  }
  lines.push("    </obiter:data>");

  // optional scalar fields
  if (citation.shortTitle != null) {
    lines.push(`    <obiter:shortTitle>${escapeXml(citation.shortTitle)}</obiter:shortTitle>`);
  }
  if (citation.firstFootnoteNumber != null) {
    lines.push(`    <obiter:firstFootnoteNumber>${citation.firstFootnoteNumber}</obiter:firstFootnoteNumber>`);
  }

  // tags
  if (citation.tags.length > 0) {
    lines.push("    <obiter:tags>");
    for (const tag of citation.tags) {
      lines.push(`      <obiter:tag>${escapeXml(tag)}</obiter:tag>`);
    }
    lines.push("    </obiter:tags>");
  }

  // timestamps
  lines.push(`    <obiter:createdAt>${escapeXml(citation.createdAt)}</obiter:createdAt>`);
  lines.push(`    <obiter:modifiedAt>${escapeXml(citation.modifiedAt)}</obiter:modifiedAt>`);
  lines.push(`    <obiter:aglcVersion>${escapeXml(citation.aglcVersion)}</obiter:aglcVersion>`);

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
): string {
  const lines: string[] = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(
    `<obiter:citationStore xmlns:obiter="${OBITER_NAMESPACE}" version="${escapeXml(schemaVersion)}" aglcVersion="${escapeXml(aglcVersion)}" standardId="${escapeXml(standardId)}" writingMode="${escapeXml(writingMode)}">`,
  );

  for (const citation of citations) {
    lines.push(serializeCitation(citation));
  }

  lines.push("</obiter:citationStore>");
  return lines.join("\n");
}

// ─── Deserialization ─────────────────────────────────────────────────────────

/**
 * Deserialize a single <obiter:citation> XML element string into a Citation.
 */
export function deserializeCitation(xml: string): Citation {
  const id = getAttr(xml, "id");
  const sourceType = getAttr(xml, "sourceType") as SourceType;

  // Extract <obiter:data>...</obiter:data>
  const dataBlock = extractBlock(xml, "data");
  const data: SourceData = {};
  if (dataBlock) {
    // Match all child elements inside <obiter:data>
    const fieldRegex = /<obiter:(\w+)>([\s\S]*?)<\/obiter:\1>/g;
    let match: RegExpExecArray | null;
    while ((match = fieldRegex.exec(dataBlock)) !== null) {
      data[match[1]] = deserializeValue(unescapeXml(match[2]));
    }
  }

  const shortTitle = extractText(xml, "shortTitle");
  const firstFootnoteStr = extractText(xml, "firstFootnoteNumber");
  const firstFootnoteNumber = firstFootnoteStr != null ? parseInt(firstFootnoteStr, 10) : undefined;

  // tags
  const tags: string[] = [];
  const tagsBlock = extractBlock(xml, "tags");
  if (tagsBlock) {
    const tagRegex = /<obiter:tag>([\s\S]*?)<\/obiter:tag>/g;
    let tagMatch: RegExpExecArray | null;
    while ((tagMatch = tagRegex.exec(tagsBlock)) !== null) {
      tags.push(unescapeXml(tagMatch[1]));
    }
  }

  const createdAt = extractText(xml, "createdAt") ?? new Date().toISOString();
  const modifiedAt = extractText(xml, "modifiedAt") ?? new Date().toISOString();
  const aglcVersion = (extractText(xml, "aglcVersion") ?? DEFAULT_AGLC_VERSION) as "4" | "5";

  return {
    id,
    sourceType,
    aglcVersion,
    data,
    shortTitle: shortTitle ?? undefined,
    firstFootnoteNumber,
    tags,
    createdAt,
    modifiedAt,
  };
}

/**
 * Deserialize the full store XML into a CitationStoreData object.
 */
export function deserializeStore(xml: string): CitationStoreData {
  // Extract root element attributes
  const versionMatch = xml.match(/<obiter:citationStore[^>]*\sversion="([^"]*)"/);
  const aglcVersionMatch = xml.match(/<obiter:citationStore[^>]*\saglcVersion="([^"]*)"/);

  const schemaVersion = versionMatch ? versionMatch[1] : DEFAULT_SCHEMA_VERSION;
  const aglcVersion = (aglcVersionMatch ? aglcVersionMatch[1] : DEFAULT_AGLC_VERSION) as "4" | "5";

  // Extract standardId attribute (backward compatible — defaults to "aglc4")
  const standardIdMatch = xml.match(/<obiter:citationStore[^>]*\sstandardId="([^"]*)"/);
  const standardId = standardIdMatch ? standardIdMatch[1] : "aglc4";

  // Extract writingMode attribute (MULTI-014 — defaults to "academic")
  const writingModeMatch = xml.match(/<obiter:citationStore[^>]*\swritingMode="([^"]*)"/);
  const writingMode = (writingModeMatch ? writingModeMatch[1] : "academic") as "academic" | "court";

  // Extract all <obiter:citation ...>...</obiter:citation> blocks
  const citations: Citation[] = [];
  const citationRegex = /<obiter:citation\s[^>]*>[\s\S]*?<\/obiter:citation>/g;
  let match: RegExpExecArray | null;
  while ((match = citationRegex.exec(xml)) !== null) {
    citations.push(deserializeCitation(match[0]));
  }

  return {
    metadata: {
      schemaVersion,
      aglcVersion,
      standardId,
      writingMode,
    },
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

function getAttr(xml: string, name: string): string {
  const match = xml.match(new RegExp(`${name}="([^"]*)"`));
  return match ? unescapeXml(match[1]) : "";
}

function extractBlock(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<obiter:${tagName}>[\\s\\S]*?</obiter:${tagName}>`);
  const match = xml.match(regex);
  return match ? match[0] : null;
}

function extractText(xml: string, tagName: string): string | null {
  // Match direct child only (non-greedy, no nested obiter: tags)
  const regex = new RegExp(`<obiter:${tagName}>([\\s\\S]*?)</obiter:${tagName}>`);
  const match = xml.match(regex);
  return match ? unescapeXml(match[1].trim()) : null;
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
