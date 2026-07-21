/**
 * Shared fake Word.customXmlParts harness for the store test suites
 * (citationStore.test.ts, backupStore.test.ts, schemaGuard.test.ts).
 *
 * Namespace-aware by design (SAFE-001): parts carry the namespace of their
 * root element, and `getByNamespace` filters exactly — so backup parts in
 * "urn:obiter:aglc:backup" are invisible to main-store scans of
 * "urn:obiter:aglc", matching real Word behaviour.
 *
 * Not a Jest test file — jest.config.js only matches *.test.ts.
 */

import { OBITER_NAMESPACE, serializeStore } from "../../src/store/xmlSerializer";
import { BACKUP_NAMESPACE } from "../../src/store/backupSerializer";
import type { Citation } from "../../src/types/citation";

export class FakePart {
  constructor(
    private readonly doc: FakeDocState,
    public readonly id: string,
    public readonly namespaceUri: string,
    public xml: string
  ) {}

  load(_props: string): void {
    /* no-op — properties are always available on the fake */
  }

  getXml(): { value: string } {
    return { value: this.xml };
  }

  delete(): void {
    this.doc.parts = this.doc.parts.filter((p) => p !== this);
  }
}

/**
 * Derive the part namespace from the XML the way Word does (from the root
 * element's namespace declaration). Checked longest-first so the backup
 * namespace is never mistaken for the main one, of which it is a superstring.
 */
function inferNamespace(xml: string): string {
  if (xml.includes(`"${BACKUP_NAMESPACE}"`)) return BACKUP_NAMESPACE;
  if (xml.includes(`"${OBITER_NAMESPACE}"`)) return OBITER_NAMESPACE;
  return "urn:other:ns";
}

export class FakeDocState {
  parts: FakePart[] = [];
  private nextId = 1;

  addPart(xml: string, namespaceUri?: string): FakePart {
    const ns = namespaceUri ?? inferNamespace(xml);
    const part = new FakePart(this, `part-${this.nextId++}`, ns, xml);
    this.parts.push(part);
    return part;
  }

  /** Parts in the MAIN store namespace only. */
  obiterParts(): FakePart[] {
    return this.parts.filter((p) => p.namespaceUri === OBITER_NAMESPACE);
  }

  /** Parts in the backup namespace only (SAFE-001). */
  backupParts(): FakePart[] {
    return this.parts.filter((p) => p.namespaceUri === BACKUP_NAMESPACE);
  }
}

/** The fake request context created by {@link makeFakeContext}. */
export interface FakeContext {
  document: {
    customXmlParts: {
      getByNamespace(ns: string): { items: FakePart[]; load(props: string): void };
      add(xml: string): FakePart;
    };
  };
  sync(): Promise<void>;
}

/** A fake context plus its instrumentation counters. */
export interface FakeContextHandle {
  context: FakeContext;
  /** Number of `context.sync()` round trips issued so far. */
  getSyncCount(): number;
  /** Number of `customXmlParts.add()` calls (part writes) so far. */
  getPartAddCount(): number;
}

/**
 * Build a fake request context over the given document state, with sync and
 * part-write counters for batching assertions (SAFE-003/SAFE-004 pattern).
 */
export function makeFakeContext(doc: FakeDocState): FakeContextHandle {
  let syncCount = 0;
  let partAddCount = 0;

  const customXmlParts = {
    getByNamespace(ns: string): { items: FakePart[]; load(props: string): void } {
      return {
        get items(): FakePart[] {
          return doc.parts.filter((p) => p.namespaceUri === ns);
        },
        load(_props: string): void {
          /* no-op */
        },
      };
    },
    add(xml: string): FakePart {
      partAddCount++;
      return doc.addPart(xml);
    },
  };

  const context: FakeContext = {
    document: { customXmlParts },
    sync: async (): Promise<void> => {
      syncCount++;
    },
  };

  return {
    context,
    getSyncCount: () => syncCount,
    getPartAddCount: () => partAddCount,
  };
}

/** Install a fake `Word.run` backed by the given document state. */
export function installFakeWord(doc: FakeDocState): void {
  const { context } = makeFakeContext(doc);

  (global as Record<string, unknown>).Word = {
    run: async <T>(callback: (ctx: typeof context) => Promise<T>): Promise<T> => callback(context),
  };
}

// ─── Shared fixtures ────────────────────────────────────────────────────────

export function makeCitation(id: string, overrides: Partial<Citation> = {}): Citation {
  return {
    id,
    sourceType: "case.reported",
    aglcVersion: "4",
    data: {
      caseName: `Case ${id}`,
      year: "1998",
    },
    tags: [],
    createdAt: "2026-01-15T10:30:00.000Z",
    modifiedAt: "2026-03-20T14:45:00.000Z",
    ...overrides,
  };
}

export function storeXmlWith(...ids: string[]): string {
  return serializeStore(ids.map((id) => makeCitation(id)));
}

export const CORRUPT_XML = `<?xml version="1.0"?><obiter:citationStore xmlns:obiter="${OBITER_NAMESPACE}" version="2"><obiter:citation id="a`;
