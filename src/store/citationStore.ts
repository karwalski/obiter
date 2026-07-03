/**
 * CitationStore — Custom XML Part wrapper for the Obiter citation data store.
 *
 * Manages read/write operations against the document's Custom XML Part using
 * the Word JavaScript API (WordApi 1.4). Handles first-use initialisation,
 * schema versioning, and CRUD operations on citation records.
 *
 * DECISION-005: Uses Word.Document.customXmlParts (WordApi 1.4) instead of
 * the Common API (Office.context.document.customXmlParts), which has confirmed
 * bugs on Word for Web where custom XML parts are silently stripped.
 */

import { Citation, CitationStoreData, StoreMetadata } from "../types/citation";
import { OBITER_NAMESPACE, serializeStore, deserializeStore } from "./xmlSerializer";
import type { CitationStandardId } from "../engine/standards/types";
import { APP_VERSION } from "../constants";
import { createLogger } from "../debug/logger";

const DEFAULT_SCHEMA_VERSION = "2";
const DEFAULT_AGLC_VERSION: "4" | "5" = "4";
const DEFAULT_STANDARD_ID: CitationStandardId = "aglc4";

const log = createLogger("CitationStore");

// ─── Diagnostics (BUG-003) ───────────────────────────────────────────────────

/**
 * Overall health of the store after initStore():
 * - "ok"          — single readable part loaded normally
 * - "new"         — no part existed; a fresh empty store was created
 * - "recovered"   — multiple/duplicate parts were found; the richest was
 *                   selected, readable duplicates merged + removed, and any
 *                   unreadable parts quarantined (left in the document)
 * - "unreadable"  — part(s) exist but NONE could be deserialized. The library
 *                   presents as empty but the data is still in the document;
 *                   corrupt parts are never deleted or overwritten.
 */
export type StoreStatus = "ok" | "new" | "recovered" | "unreadable";

/** Per-part detail recorded during initStore() part selection. */
export interface StorePartInfo {
  partId: string;
  xmlLength: number;
  /** null when the part could not be deserialized. */
  citationCount: number | null;
  error?: string;
  selected: boolean;
}

/** Snapshot of what initStore() found, for the debug log and the UI. */
export interface StoreDiagnostics {
  status: StoreStatus;
  partsFound: number;
  readableParts: number;
  unreadableParts: number;
  selectedPartId: string | null;
  citationCount: number;
  /** Citations recovered from duplicate parts and merged into the winner. */
  mergedFromDuplicates: number;
  parts: StorePartInfo[];
  /** Human-readable summary for the UI "copy details" affordance. */
  detail: string;
}

/**
 * Thrown when persist() detects it is about to replace a populated store
 * part with an empty library — the BUG-003 data-destruction signature
 * (in-memory state lost/never loaded, then a routine setter persists).
 */
export class StoreDataLossError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoreDataLossError";
  }
}

export class CitationStore {
  private storeData: CitationStoreData | null = null;
  private xmlPartId: string | null = null;
  private diagnostics: StoreDiagnostics = emptyDiagnostics();
  /** Serializes persist() calls so delete+add cycles never interleave. */
  private persistChain: Promise<void> = Promise.resolve();

  /**
   * Initialise the store. Loads an existing Custom XML Part if one exists
   * for the Obiter namespace, or creates a new empty store.
   *
   * BUG-003 hardening: when multiple candidate parts exist (Word duplicates
   * parts on copy/paste between documents, save-as, crashed saves, and our
   * own historical delete+add races), selection is deterministic — the part
   * with the most citations wins (ties broken by larger XML). Citations
   * unique to losing readable parts are merged into the winner; readable
   * losers are then deleted. Unreadable parts are quarantined in place and
   * surfaced via getDiagnostics(), never deleted and never treated as an
   * empty library.
   */
  async initStore(): Promise<void> {
    let mergedCount = 0;

    await Word.run(async (context) => {
      const scopedParts = context.document.customXmlParts.getByNamespace(OBITER_NAMESPACE);
      scopedParts.load("items");
      await context.sync();

      const partItems = scopedParts.items ?? [];
      if (partItems.length === 0) {
        // First use — create an empty store (persisted below, outside Word.run)
        this.storeData = {
          metadata: {
            schemaVersion: DEFAULT_SCHEMA_VERSION,
            aglcVersion: DEFAULT_AGLC_VERSION,
            standardId: DEFAULT_STANDARD_ID,
          },
          citations: [],
        };
        this.diagnostics = {
          ...emptyDiagnostics(),
          status: "new",
          detail: "No Obiter store part found; created a new empty store.",
        };
        log.info("initStore: no store part found, creating new store");
        return;
      }

      // Load ids and XML payloads for every candidate part in one batch.
      for (const part of partItems) {
        part.load("id");
      }
      const xmlResults = partItems.map((part) => part.getXml());
      await context.sync();

      interface Candidate {
        part: Word.CustomXmlPart;
        id: string;
        xml: string;
        data: CitationStoreData | null;
        error?: string;
      }

      const candidates: Candidate[] = partItems.map((part, i) => {
        const xml = xmlResults[i].value ?? "";
        try {
          return { part, id: part.id, xml, data: deserializeStore(xml) };
        } catch (err: unknown) {
          return {
            part,
            id: part.id,
            xml,
            data: null,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      });

      const readable = candidates.filter((c) => c.data !== null);
      const unreadable = candidates.filter((c) => c.data === null);

      const partInfo = (c: Candidate, selected: boolean): StorePartInfo => ({
        partId: c.id,
        xmlLength: c.xml.length,
        citationCount: c.data ? c.data.citations.length : null,
        ...(c.error ? { error: c.error } : {}),
        selected,
      });

      if (readable.length === 0) {
        // Every part is unreadable. Do NOT delete anything, do NOT adopt a
        // part id (so we never overwrite the corrupt part), and report the
        // unreadable state instead of a silently empty library.
        this.storeData = {
          metadata: {
            schemaVersion: DEFAULT_SCHEMA_VERSION,
            aglcVersion: DEFAULT_AGLC_VERSION,
            standardId: DEFAULT_STANDARD_ID,
          },
          citations: [],
        };
        this.xmlPartId = null;
        const parts = candidates.map((c) => partInfo(c, false));
        this.diagnostics = {
          status: "unreadable",
          partsFound: candidates.length,
          readableParts: 0,
          unreadableParts: unreadable.length,
          selectedPartId: null,
          citationCount: 0,
          mergedFromDuplicates: 0,
          parts,
          detail:
            `Found ${candidates.length} Obiter store part(s) but none could be read. ` +
            `The data is still stored in the document and has not been deleted. ` +
            parts
              .map((p) => `Part ${p.partId}: ${p.xmlLength} chars, error: ${p.error ?? "unknown"}`)
              .join(" | "),
        };
        log.error("initStore: store part(s) present but unreadable", this.diagnostics);
        return;
      }

      // Deterministic selection: most citations wins; ties broken by larger
      // XML payload; further ties keep the earliest part.
      let winner = readable[0];
      for (const c of readable) {
        const better =
          c.data!.citations.length > winner.data!.citations.length ||
          (c.data!.citations.length === winner.data!.citations.length &&
            c.xml.length > winner.xml.length);
        if (better) winner = c;
      }

      // Merge citations unique to losing readable parts into the winner.
      const winnerData = winner.data!;
      const knownIds = new Set(winnerData.citations.map((c) => c.id));
      for (const loser of readable) {
        if (loser === winner) continue;
        for (const citation of loser.data!.citations) {
          if (citation.id && !knownIds.has(citation.id)) {
            winnerData.citations.push(citation);
            knownIds.add(citation.id);
            mergedCount++;
          }
        }
      }

      this.xmlPartId = winner.id;
      this.storeData = winnerData;

      // Delete only readable losing duplicates — their citations are merged.
      // Unreadable parts stay quarantined in the document for recovery.
      const losers = readable.filter((c) => c !== winner);
      if (losers.length > 0) {
        for (const loser of losers) {
          try {
            loser.part.delete();
          } catch {
            /* ignore */
          }
        }
        try {
          await context.sync();
        } catch {
          /* ignore cleanup errors */
        }
      }

      const parts = candidates.map((c) => partInfo(c, c === winner));
      const status: StoreStatus = candidates.length > 1 ? "recovered" : "ok";
      this.diagnostics = {
        status,
        partsFound: candidates.length,
        readableParts: readable.length,
        unreadableParts: unreadable.length,
        selectedPartId: winner.id,
        citationCount: winnerData.citations.length,
        mergedFromDuplicates: mergedCount,
        parts,
        detail:
          `Found ${candidates.length} store part(s): ` +
          parts
            .map(
              (p) =>
                `Part ${p.partId}: ${p.xmlLength} chars, ` +
                `${p.citationCount ?? "unreadable"} citations` +
                `${p.selected ? " (selected)" : ""}${p.error ? `, error: ${p.error}` : ""}`
            )
            .join(" | ") +
          (mergedCount > 0 ? `. Merged ${mergedCount} citation(s) from duplicates.` : ""),
      };
      log.info("initStore: store part selection", {
        partsFound: candidates.length,
        readable: readable.length,
        unreadable: unreadable.length,
        selectedPartId: winner.id,
        citationCount: winnerData.citations.length,
        merged: mergedCount,
        parts: parts.map((p) => ({
          id: p.partId,
          size: p.xmlLength,
          citations: p.citationCount,
          selected: p.selected,
        })),
      });
    });

    // Persist the new empty store outside the initial Word.run to avoid nesting.
    // Never auto-persist in the unreadable state (xmlPartId is also null there).
    if (this.storeData && this.xmlPartId === null && this.diagnostics.status === "new") {
      await this.persist();
    }

    // Persist the merged result so duplicate recovery survives the session.
    if (mergedCount > 0) {
      await this.persist();
    }
  }

  /**
   * Snapshot of what initStore() found (part counts, sizes, selection,
   * unreadable parts). Drives the UI diagnostic state and field reports.
   */
  getDiagnostics(): StoreDiagnostics {
    return {
      ...this.diagnostics,
      parts: this.diagnostics.parts.map((p) => ({ ...p })),
    };
  }

  /**
   * Return all citations in the store.
   */
  getAll(): Citation[] {
    this.ensureInitialised();
    return [...this.storeData!.citations];
  }

  /**
   * Return a single citation by ID, or undefined if not found.
   */
  getById(id: string): Citation | undefined {
    this.ensureInitialised();
    return this.storeData!.citations.find((c) => c.id === id);
  }

  /**
   * Add a new citation to the store and persist.
   */
  async add(citation: Citation): Promise<void> {
    this.ensureInitialised();
    const existing = this.storeData!.citations.find((c) => c.id === citation.id);
    if (existing) {
      throw new Error(`Citation with id "${citation.id}" already exists`);
    }
    this.storeData!.citations.push(citation);
    await this.persist();
  }

  /**
   * Update an existing citation in the store and persist.
   * Throws if the citation ID is not found.
   */
  async update(citation: Citation): Promise<void> {
    this.ensureInitialised();
    const index = this.storeData!.citations.findIndex((c) => c.id === citation.id);
    if (index === -1) {
      throw new Error(`Citation with id "${citation.id}" not found`);
    }
    this.storeData!.citations[index] = citation;
    await this.persist();
  }

  /**
   * Remove a citation by ID and persist.
   * Throws if the citation ID is not found.
   */
  async remove(id: string): Promise<void> {
    this.ensureInitialised();
    const index = this.storeData!.citations.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error(`Citation with id "${id}" not found`);
    }
    this.storeData!.citations.splice(index, 1);
    await this.persist();
  }

  /**
   * Return the current schema version string.
   */
  getSchemaVersion(): string {
    this.ensureInitialised();
    return this.storeData!.metadata.schemaVersion;
  }

  /**
   * Return the current AGLC version.
   */
  getAglcVersion(): "4" | "5" {
    this.ensureInitialised();
    return this.storeData!.metadata.aglcVersion;
  }

  /**
   * Update the AGLC version and persist.
   */
  async setAglcVersion(version: "4" | "5"): Promise<void> {
    this.ensureInitialised();
    this.storeData!.metadata.aglcVersion = version;
    await this.persist();
  }

  /**
   * Return the current citation standard ID (MULTI-001).
   * Defaults to "aglc4" for backward compatibility.
   */
  getStandardId(): CitationStandardId {
    this.ensureInitialised();
    return (this.storeData!.metadata.standardId as CitationStandardId) ?? DEFAULT_STANDARD_ID;
  }

  /**
   * Update the citation standard ID and persist (MULTI-001).
   */
  async setStandardId(standardId: CitationStandardId): Promise<void> {
    this.ensureInitialised();
    this.storeData!.metadata.standardId = standardId;
    await this.persist();
  }

  /**
   * Return the current writing mode (MULTI-014).
   * Defaults to "academic" for backward compatibility.
   */
  getWritingMode(): "academic" | "court" {
    this.ensureInitialised();
    return this.storeData!.metadata.writingMode ?? "academic";
  }

  /**
   * Update the writing mode and persist (MULTI-014).
   */
  async setWritingMode(mode: "academic" | "court"): Promise<void> {
    this.ensureInitialised();
    this.storeData!.metadata.writingMode = mode;
    await this.persist();
  }

  /**
   * Return the current court jurisdiction ID (COURT-002).
   * Returns undefined when no jurisdiction is set (academic mode or unselected).
   */
  getCourtJurisdiction(): string | undefined {
    this.ensureInitialised();
    return this.storeData!.metadata.courtJurisdiction;
  }

  /**
   * Update the court jurisdiction and persist (COURT-002).
   * Pass undefined to clear the jurisdiction (e.g. when switching to academic mode).
   */
  async setCourtJurisdiction(jurisdictionId: string | undefined): Promise<void> {
    this.ensureInitialised();
    this.storeData!.metadata.courtJurisdiction = jurisdictionId;
    await this.persist();
  }

  /**
   * Return the persisted heading list ID, or undefined if not set.
   */
  getHeadingListId(): number | undefined {
    this.ensureInitialised();
    return this.storeData!.metadata.headingListId;
  }

  /**
   * Persist the heading list ID so it survives document close/reopen.
   */
  async setHeadingListId(listId: number | undefined): Promise<void> {
    this.ensureInitialised();
    this.storeData!.metadata.headingListId = listId;
    await this.persist();
  }

  /**
   * Return the current content control model version (FN-005).
   * Returns undefined for legacy documents (treated as "flat").
   */
  getCcModel(): "flat" | "parent-child" | undefined {
    this.ensureInitialised();
    return this.storeData!.metadata.ccModel;
  }

  /**
   * Update the content control model version and persist (FN-005).
   */
  async setCcModel(model: "flat" | "parent-child"): Promise<void> {
    this.ensureInitialised();
    this.storeData!.metadata.ccModel = model;
    await this.persist();
  }

  /**
   * Return a snapshot of the store metadata.
   */
  getMetadata(): StoreMetadata {
    this.ensureInitialised();
    return { ...this.storeData!.metadata };
  }

  // ─── Internal ──────────────────────────────────────────────────────────────

  /**
   * Write the current in-memory store data to the Custom XML Part.
   * Replaces the existing part (delete + add) since the CustomXmlParts API
   * does not support in-place update of the XML content.
   *
   * BUG-003 hardening:
   * - Calls are serialized through a promise chain, so two concurrent
   *   persists can never interleave their delete/add cycles (the historic
   *   source of duplicate parts).
   * - Instead of trusting a remembered part id (stale after save-as /
   *   copy-paste / a second CitationStore instance), every persist
   *   re-enumerates ALL parts in the Obiter namespace and removes the
   *   readable ones, so a second part is never left behind.
   * - Unreadable (corrupt) parts are quarantined: never deleted.
   * - Data-loss guard: refuses to replace a populated store part with an
   *   empty library (the signature of persisting after a failed load).
   *   Deliberate clears are unaffected — they drain one citation at a time.
   */
  private persist(): Promise<void> {
    const run = this.persistChain.then(() => this.doPersist());
    // Keep the chain alive after failures so later persists still run.
    this.persistChain = run.catch(() => undefined);
    return run;
  }

  private async doPersist(): Promise<void> {
    const xml = serializeStore(
      this.storeData!.citations,
      this.storeData!.metadata.schemaVersion,
      this.storeData!.metadata.aglcVersion,
      this.storeData!.metadata.standardId ?? DEFAULT_STANDARD_ID,
      this.storeData!.metadata.writingMode ?? "academic",
      this.storeData!.metadata.courtJurisdiction,
      this.storeData!.metadata.headingListId,
      APP_VERSION,
      this.storeData!.metadata.ccModel
    );
    const memoryCount = this.storeData!.citations.length;

    await Word.run(async (context) => {
      // Enumerate every part in the Obiter namespace — never trust a cached id.
      const scopedParts = context.document.customXmlParts.getByNamespace(OBITER_NAMESPACE);
      scopedParts.load("items");
      await context.sync();

      const partItems = scopedParts.items ?? [];
      for (const part of partItems) {
        part.load("id");
      }
      const xmlResults = partItems.map((part) => part.getXml());
      try {
        await context.sync();
      } catch {
        // Reading existing parts failed (e.g. mid-save race). Do not risk a
        // blind delete — abort this persist; the chain retries on next write.
        log.warn("persist: could not read existing parts, aborting this write");
        throw new Error("Citation store write failed: could not read existing store parts");
      }

      const deletable: Word.CustomXmlPart[] = [];
      let maxExistingCitations = 0;
      partItems.forEach((part, i) => {
        try {
          const existing = deserializeStore(xmlResults[i].value ?? "");
          maxExistingCitations = Math.max(maxExistingCitations, existing.citations.length);
          deletable.push(part);
        } catch (err: unknown) {
          // Corrupt part — quarantine (leave in the document, never delete).
          log.warn("persist: quarantining unreadable store part", {
            partId: part.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      });

      // Data-loss guard: an empty in-memory library must never overwrite a
      // part holding 2+ citations. (A legitimate "remove last citation"
      // persist sees exactly 1 citation in the document part.)
      if (memoryCount === 0 && maxExistingCitations > 1) {
        const message =
          `Refused to overwrite the citation store: the document holds ` +
          `${maxExistingCitations} citations but this session's library is empty. ` +
          `Close and reopen the task pane to reload the library.`;
        log.error("persist: data-loss guard triggered", {
          memoryCount,
          maxExistingCitations,
        });
        throw new StoreDataLossError(message);
      }

      // Delete readable parts and add the replacement in a single batch, so
      // there is no synced intermediate state with zero (or two) parts.
      for (const part of deletable) {
        try {
          part.delete();
        } catch {
          /* ignore */
        }
      }
      const newPart = context.document.customXmlParts.add(xml);
      newPart.load("id");
      await context.sync();

      this.xmlPartId = newPart.id;
      log.debug("persist: store written", {
        partId: newPart.id,
        citations: memoryCount,
        replacedParts: deletable.length,
        xmlLength: xml.length,
      });
    });
  }

  private ensureInitialised(): void {
    if (!this.storeData) {
      throw new Error("CitationStore not initialised. Call initStore() first.");
    }
  }
}

/** Default diagnostics before initStore() has run. */
function emptyDiagnostics(): StoreDiagnostics {
  return {
    status: "new",
    partsFound: 0,
    readableParts: 0,
    unreadableParts: 0,
    selectedPartId: null,
    citationCount: 0,
    mergedFromDuplicates: 0,
    parts: [],
    detail: "Store not initialised.",
  };
}
