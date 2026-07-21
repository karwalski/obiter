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

/**
 * Highest store schema version this build can read (SAFE-008).
 * Bump together with a registered migration in ./migrations.ts.
 */
export const MAX_SUPPORTED_SCHEMA_VERSION = 2;

// ─── Errors (BUG-003) ────────────────────────────────────────────────────────

/**
 * Why deserialization of a store part failed:
 * - "empty"        — the part payload was blank
 * - "parse"        — the XML is not well-formed (DOMParser <parsererror>)
 * - "wrong-root"   — well-formed XML but not an <obiter:citationStore>
 * - "newer-schema" — the part was written by a NEWER version of Obiter
 *                    (schema version > 2). SAFE-008: refusing to read it
 *                    quarantines the part instead of half-parsing it and
 *                    overwriting it as v2 on the next persist.
 */
export type StoreXmlErrorReason = "empty" | "parse" | "wrong-root" | "newer-schema";

/**
 * Thrown when store XML cannot be deserialized (empty payload, XML parse
 * failure, a root element that is not an Obiter citation store, or a
 * schema version newer than this build supports).
 *
 * BUG-003: previously DOMParser failures were invisible — `parseFromString`
 * never throws, it returns a `<parsererror>` document whose attribute reads
 * all return null, so a corrupted part silently deserialized to an EMPTY
 * store. That empty store could then be persisted over the real data.
 * Deserialization must fail loudly so callers can quarantine the part.
 */
export class StoreXmlError extends Error {
  constructor(
    message: string,
    public readonly reason: StoreXmlErrorReason
  ) {
    super(message);
    this.name = "StoreXmlError";
  }
}

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
  if (citation.firstFootnoteNumber != null)
    attrs.push(`firstFootnoteNumber="${citation.firstFootnoteNumber}"`);
  if (citation.createdAt) attrs.push(`createdAt="${escapeXml(citation.createdAt)}"`);
  if (citation.modifiedAt) attrs.push(`modifiedAt="${escapeXml(citation.modifiedAt)}"`);

  // SIGNAL-001: Signal and commentary attributes
  if (citation.signal) attrs.push(`signal="${escapeXml(citation.signal)}"`);
  if (citation.commentaryBefore)
    attrs.push(`commentaryBefore="${escapeXml(citation.commentaryBefore)}"`);
  if (citation.commentaryAfter)
    attrs.push(`commentaryAfter="${escapeXml(citation.commentaryAfter)}"`);

  // LINK-001: Linking phrase attributes (Rule 1.3)
  if (citation.linkingPhrase) attrs.push(`linkingPhrase="${escapeXml(citation.linkingPhrase)}"`);
  if (citation.linkedCitationId)
    attrs.push(`linkedCitationId="${escapeXml(citation.linkedCitationId)}"`);

  // LOA fields
  if (citation.loaPart) attrs.push(`loaPart="${escapeXml(citation.loaPart)}"`);
  if (citation.isKeyAuthority) attrs.push(`isKeyAuthority="true"`);

  const lines = [`  <obiter:citation ${attrs.join(" ")}>`];

  // Data fields as <obiter:field name="...">value</obiter:field>
  for (const [key, value] of Object.entries(citation.data)) {
    if (value == null || value === "") continue;
    lines.push(
      `    <obiter:field name="${escapeXml(key)}">${escapeXml(serializeValue(value))}</obiter:field>`
    );
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
  courtToggles?: Record<string, string>
): string {
  const lines: string[] = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  const courtAttr = courtJurisdiction ? ` courtJurisdiction="${escapeXml(courtJurisdiction)}"` : "";
  // Court toggle overrides travel WITH the document (cross-device
  // correctness). Serialized as a JSON-encoded attribute and treated as an
  // opaque key/value bag — no hardcoded key list, so new engine toggle keys
  // round-trip unchanged. Absent attribute deserializes to undefined
  // (v1/v2 backward compatibility).
  const courtTogglesAttr = courtToggles
    ? ` courtToggles="${escapeXml(JSON.stringify(courtToggles))}"`
    : "";
  const headingAttr = headingListId !== undefined ? ` headingListId="${headingListId}"` : "";
  const ccModelAttr = ccModel ? ` ccModel="${escapeXml(ccModel)}"` : "";
  lines.push(
    `<obiter:citationStore xmlns:obiter="${OBITER_NAMESPACE}" version="${escapeXml(schemaVersion)}" aglcVersion="${escapeXml(aglcVersion)}" standardId="${escapeXml(standardId)}" writingMode="${escapeXml(writingMode)}"${courtAttr}${courtTogglesAttr}${headingAttr}${ccModelAttr}>`
  );

  // INFRA-008 Layer 2: generator element
  if (generatorVersion) {
    lines.push(
      `  <obiter:generator name="Obiter" version="${escapeXml(generatorVersion)}" standard="${escapeXml(standardId)}" mode="${escapeXml(writingMode)}" />`
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
    let doc = parser.parseFromString(xml, "text/xml");
    root = doc.documentElement;
    // A standalone <obiter:citation> fragment carries an undeclared
    // `obiter:` prefix, which strict XML parsers reject via <parsererror>.
    // Retry wrapped in a namespace-declaring root (BUG-003 hardening).
    if (isParserError(doc)) {
      doc = parser.parseFromString(
        `<obiter:root xmlns:obiter="${OBITER_NAMESPACE}">${xml}</obiter:root>`,
        "text/xml"
      );
      const wrapped = isParserError(doc) ? null : doc.documentElement.firstElementChild;
      if (!wrapped) {
        throw new StoreXmlError("Citation XML is not well-formed", "parse");
      }
      root = wrapped;
    }
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
        data[name] = deserializeValue(el.textContent ?? "", name);
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
          const innerParser = new DOMParser();
          const innerDoc = innerParser.parseFromString(
            `<root xmlns:obiter="${OBITER_NAMESPACE}">${decoded}</root>`,
            "text/xml"
          );
          dataChildren = Array.from(innerDoc.documentElement.children);
        }
      }

      for (const child of dataChildren) {
        const tagName = child.localName;
        if (tagName === "data") continue; // skip nested data wrappers
        const textContent = child.textContent ?? "";
        data[tagName] = deserializeValue(textContent, tagName);
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

  // SIGNAL-001: Signal and commentary (v2 attributes)
  const signal = root.getAttribute("signal") ?? undefined;
  const commentaryBefore = root.getAttribute("commentaryBefore") ?? undefined;
  const commentaryAfter = root.getAttribute("commentaryAfter") ?? undefined;

  // LINK-001: Linking phrase attributes (Rule 1.3)
  const linkingPhraseAttr = root.getAttribute("linkingPhrase") ?? undefined;
  const linkedCitationIdAttr = root.getAttribute("linkedCitationId") ?? undefined;

  // LOA fields
  const loaPart = (root.getAttribute("loaPart") as "A" | "B" | null) ?? undefined;
  const isKeyAuthorityAttr = root.getAttribute("isKeyAuthority");
  const isKeyAuthority = isKeyAuthorityAttr === "true" ? true : undefined;

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
    ...(signal ? { signal: signal as Citation["signal"] } : {}),
    ...(commentaryBefore ? { commentaryBefore } : {}),
    ...(commentaryAfter ? { commentaryAfter } : {}),
    ...(linkingPhraseAttr ? { linkingPhrase: linkingPhraseAttr as Citation["linkingPhrase"] } : {}),
    ...(linkedCitationIdAttr ? { linkedCitationId: linkedCitationIdAttr } : {}),
    ...(loaPart ? { loaPart } : {}),
    ...(isKeyAuthority ? { isKeyAuthority } : {}),
  };
}

/**
 * Deserialize the full store XML into a CitationStoreData object.
 *
 * Uses DOMParser for root-level attribute extraction, eliminating
 * the fragile regex-based approach.
 *
 * @throws {StoreXmlError} when the payload is empty, the XML does not parse
 *   (browser DOMParsers signal failure via a `<parsererror>` element rather
 *   than throwing), or the root element is not `<obiter:citationStore>`.
 *   Callers must treat this as "part unreadable", never as "no citations".
 */
export function deserializeStore(xml: string): CitationStoreData {
  if (!xml || xml.trim() === "") {
    throw new StoreXmlError("Store XML payload is empty", "empty");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");
  const root = doc.documentElement;

  // DOMParser never throws: Chromium/WebKit embed a <parsererror> element in
  // the result document; jsdom/Firefox make it the document element.
  if (isParserError(doc)) {
    throw new StoreXmlError("Store XML is not well-formed", "parse");
  }
  if (root.localName !== "citationStore") {
    throw new StoreXmlError(
      `Expected <obiter:citationStore> root, found <${root.localName}>`,
      "wrong-root"
    );
  }

  const schemaVersion = root.getAttribute("version") ?? "1.0";

  // SAFE-008 forward-compatibility guard: refuse schemas newer than this
  // build understands. Half-parsing a future v3 document would drop the
  // fields we do not know about, and the next persist would overwrite the
  // document as v2 — silent data loss. Failing loudly makes initStore
  // quarantine the part instead. (Non-numeric versions fall through and are
  // treated as legacy, matching the historic "1.0" default.)
  const versionNumber = parseInt(schemaVersion, 10);
  if (Number.isFinite(versionNumber) && versionNumber > MAX_SUPPORTED_SCHEMA_VERSION) {
    throw new StoreXmlError(
      `Store schema version ${schemaVersion} was created by a newer version of Obiter ` +
        `(this build supports up to version ${MAX_SUPPORTED_SCHEMA_VERSION})`,
      "newer-schema"
    );
  }
  const aglcVersion = (root.getAttribute("aglcVersion") ?? DEFAULT_AGLC_VERSION) as "4" | "5";
  const standardId = root.getAttribute("standardId") ?? "aglc4";
  const writingMode = (root.getAttribute("writingMode") ?? "academic") as "academic" | "court";
  const rawCourtJurisdiction = root.getAttribute("courtJurisdiction") ?? undefined;
  // Migration: "TASCSC" was a typo for the AGLC4 rule 2.3.1 identifier
  // "TASSC" (PARITY-117); documents saved before the rename keep resolving
  // the Tasmanian Supreme Court preset.
  const courtJurisdiction = rawCourtJurisdiction === "TASCSC" ? "TASSC" : rawCourtJurisdiction;
  const courtToggles = parseCourtTogglesAttr(root.getAttribute("courtToggles"));
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
      courtToggles,
      headingListId,
      ccModel,
    },
    generator,
    citations,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Escape a string for embedding as XML text or attribute content.
 * Exported for reuse by the backup serializer (SAFE-001), which embeds
 * whole store XML documents as escaped text — never CDATA, which breaks
 * on payloads containing "]]>".
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Detect a DOMParser failure document. Browsers do not throw on invalid XML:
 * Chromium/WebKit embed a `<parsererror>` element, jsdom/Firefox make it the
 * document element.
 */
function isParserError(doc: Document): boolean {
  const root = doc.documentElement;
  return (
    root == null ||
    root.localName === "parsererror" ||
    doc.getElementsByTagName("parsererror").length > 0
  );
}

/**
 * Parse the JSON-encoded `courtToggles` root attribute into an opaque
 * string-to-string map. Absent or malformed payloads (older documents, hand
 * edits) deserialize to undefined — the refresher then falls back to the
 * jurisdiction preset defaults. Non-string values are dropped rather than
 * failing the whole store read.
 */
function parseCourtTogglesAttr(attr: string | null): Record<string, string> | undefined {
  if (!attr) return undefined;
  try {
    const parsed: unknown = JSON.parse(attr);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return undefined;
    }
    const toggles: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "string") {
        toggles[key] = value;
      }
    }
    return toggles;
  } catch {
    return undefined;
  }
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
 * Data fields that are genuinely numeric and may be coerced from a digit-only
 * string back to a number on deserialization. Everything NOT in this set stays
 * a string — critically ID-like fields such as `proceedingNumber` and `mnc`
 * that are frequently digit-only but are consumed as strings (used with
 * `.trim()` etc. in the formatters). Blindly coercing every digit-only string
 * corrupted those fields to numbers on the store round-trip, so a later
 * rebuild/refresh threw `proceedingNumber.trim is not a function` (WEB-012).
 *
 * Numeric consumers coerce via toNumber/toOptionalNumber (string-safe), so a
 * field mistakenly omitted here is harmless; a string field wrongly included
 * would re-introduce the crash — keep this list to true numeric fields only.
 */
const NUMERIC_DATA_FIELDS = new Set<string>([
  "year",
  "billYear",
  "consolidationYear",
  "neutralCitationYear",
  "volume",
  "seriesVolume",
  "fedRegVolume",
  "startingPage",
  "startPage",
  "shortPage",
  "endingPage",
  "slipOpStartingPage",
  "icjReportsPage",
  "page",
  "issue",
  "edition",
  "reissue",
  "number",
  "caseNumber",
  "partNumber",
  "reportNumber",
  "decisionNumber",
  "blockNumber",
  "shortBlockNumber",
  "siNumber",
  "neutralCitationNumber",
  "waiNumber",
  "regnalNumber",
  "column",
  "article",
  "session",
  "cfrTitle",
  "uscTitle",
]);

/**
 * Deserialize a string value from XML back to a JS value.
 * Objects/arrays are JSON-decoded; only known-numeric fields (see
 * {@link NUMERIC_DATA_FIELDS}) are coerced from digit strings to numbers.
 * @param str - the stored string value
 * @param fieldName - the data field name (drives numeric coercion)
 */
function deserializeValue(str: string, fieldName?: string): unknown {
  const trimmed = str.trim();
  if (trimmed === "") return "";
  // Try JSON parse for objects/arrays
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  // Coerce to number ONLY for genuinely-numeric fields (WEB-012).
  if (fieldName && NUMERIC_DATA_FIELDS.has(fieldName) && /^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }
  return trimmed;
}
