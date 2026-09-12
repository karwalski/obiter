/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * xmlLite.ts — a small, tolerant XML reader with no DOM dependency.
 *
 * EndNote XML and Word's Source Manager XML are flat, well-behaved
 * documents. Reading them with a hand-written tokenizer keeps the codecs
 * free of DOMParser, which the engine layer cannot use and which Jest's
 * node environment does not provide. Malformed input never throws: unclosed
 * elements are closed at end of input and stray characters become text.
 */

export interface XmlNode {
  name: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  /** Concatenated direct text, entities decoded, CDATA included. */
  text: string;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** Decodes the five XML entities plus numeric references. */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body.startsWith("#x") || body.startsWith("#X")) {
      const code = parseInt(body.slice(2), 16);
      return Number.isNaN(code) ? whole : String.fromCodePoint(code);
    }
    if (body.startsWith("#")) {
      const code = parseInt(body.slice(1), 10);
      return Number.isNaN(code) ? whole : String.fromCodePoint(code);
    }
    return ENTITIES[body] ?? whole;
  });
}

/** Encodes text for element content or attribute values. */
export function encodeEntities(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseAttrs(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([^\s=/]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    attrs[m[1]] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return attrs;
}

/**
 * Parses `xml` into a tree under a synthetic root named "#document".
 * Comments, processing instructions and the declaration are skipped.
 */
export function parseXml(xml: string): XmlNode {
  const root: XmlNode = { name: "#document", attrs: {}, children: [], text: "" };
  const stack: XmlNode[] = [root];
  let i = 0;
  const n = xml.length;

  const appendText = (t: string): void => {
    if (!t) return;
    stack[stack.length - 1].text += t;
  };

  while (i < n) {
    const lt = xml.indexOf("<", i);
    if (lt < 0) {
      appendText(decodeEntities(xml.slice(i)));
      break;
    }
    if (lt > i) appendText(decodeEntities(xml.slice(i, lt)));

    if (xml.startsWith("<!--", lt)) {
      const end = xml.indexOf("-->", lt + 4);
      i = end < 0 ? n : end + 3;
      continue;
    }
    if (xml.startsWith("<![CDATA[", lt)) {
      const end = xml.indexOf("]]>", lt + 9);
      appendText(xml.slice(lt + 9, end < 0 ? n : end));
      i = end < 0 ? n : end + 3;
      continue;
    }
    if (xml.startsWith("<?", lt) || xml.startsWith("<!", lt)) {
      const end = xml.indexOf(">", lt);
      i = end < 0 ? n : end + 1;
      continue;
    }

    const gt = findTagEnd(xml, lt);
    if (gt < 0) {
      appendText(decodeEntities(xml.slice(lt)));
      break;
    }
    const tag = xml.slice(lt + 1, gt);
    i = gt + 1;

    if (tag.startsWith("/")) {
      const name = tag.slice(1).trim();
      // Close up to the matching element; tolerate mismatches.
      for (let depth = stack.length - 1; depth > 0; depth -= 1) {
        if (stack[depth].name === name) {
          stack.length = depth;
          break;
        }
      }
      continue;
    }

    const selfClosing = tag.endsWith("/");
    const body = selfClosing ? tag.slice(0, -1) : tag;
    const nameMatch = /^([^\s/>]+)/.exec(body);
    if (!nameMatch) {
      appendText(decodeEntities(`<${tag}>`));
      continue;
    }
    const node: XmlNode = {
      name: nameMatch[1],
      attrs: parseAttrs(body.slice(nameMatch[1].length)),
      children: [],
      text: "",
    };
    stack[stack.length - 1].children.push(node);
    if (!selfClosing) stack.push(node);
  }

  return root;
}

/** Finds the closing ">" of a tag, skipping quoted attribute values. */
function findTagEnd(xml: string, start: number): number {
  let quote: string | null = null;
  for (let j = start + 1; j < xml.length; j += 1) {
    const ch = xml[j];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === ">") {
      return j;
    }
  }
  return -1;
}

/** First child element with the given name (case-insensitive). */
export function child(node: XmlNode | undefined, name: string): XmlNode | undefined {
  if (!node) return undefined;
  const lower = name.toLowerCase();
  return node.children.find((c) => c.name.toLowerCase() === lower);
}

/** All child elements with the given name. */
export function children(node: XmlNode | undefined, name: string): XmlNode[] {
  if (!node) return [];
  const lower = name.toLowerCase();
  return node.children.filter((c) => c.name.toLowerCase() === lower);
}

/** Walks a path of child names. */
export function descend(node: XmlNode | undefined, ...path: string[]): XmlNode | undefined {
  let current = node;
  for (const name of path) {
    current = child(current, name);
    if (!current) return undefined;
  }
  return current;
}

/**
 * All text beneath a node, including text wrapped in child elements such
 * as EndNote's <style> spans, with whitespace collapsed.
 */
export function textOf(node: XmlNode | undefined): string {
  if (!node) return "";
  const parts: string[] = [node.text];
  for (const c of node.children) parts.push(textOf(c));
  return parts.join("").replace(/\s+/g, " ").trim();
}

/** First matching element anywhere beneath `node` (depth-first). */
export function find(node: XmlNode | undefined, name: string): XmlNode | undefined {
  if (!node) return undefined;
  const lower = name.toLowerCase();
  for (const c of node.children) {
    if (c.name.toLowerCase() === lower) return c;
    const deeper = find(c, name);
    if (deeper) return deeper;
  }
  return undefined;
}

/** All matching elements anywhere beneath `node`. */
export function findAll(node: XmlNode | undefined, name: string): XmlNode[] {
  const out: XmlNode[] = [];
  if (!node) return out;
  const lower = name.toLowerCase();
  const walk = (n: XmlNode): void => {
    for (const c of n.children) {
      if (c.name.toLowerCase() === lower) out.push(c);
      walk(c);
    }
  };
  walk(node);
  return out;
}

/** Serialises an element. Text is encoded; attributes are quoted. */
export function element(
  name: string,
  content: string | XmlChild[],
  attrs: Record<string, string> = {}
): string {
  const attrText = Object.entries(attrs)
    .map(([k, v]) => ` ${k}="${encodeEntities(v)}"`)
    .join("");
  if (typeof content === "string") {
    return `<${name}${attrText}>${encodeEntities(content)}</${name}>`;
  }
  const inner = content.filter((c): c is string => typeof c === "string" && c.length > 0).join("");
  return `<${name}${attrText}>${inner}</${name}>`;
}

/** A pre-serialised child or nothing. */
export type XmlChild = string | undefined | null | false;
