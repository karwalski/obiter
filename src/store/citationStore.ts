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
import {
  OBITER_NAMESPACE,
  serializeStore,
  deserializeStore,
} from "./xmlSerializer";
import type { CitationStandardId } from "../engine/standards/types";
import { APP_VERSION } from "../constants";

const DEFAULT_SCHEMA_VERSION = "1.0";
const DEFAULT_AGLC_VERSION: "4" | "5" = "4";
const DEFAULT_STANDARD_ID: CitationStandardId = "aglc4";

export class CitationStore {
  private storeData: CitationStoreData | null = null;
  private xmlPartId: string | null = null;

  /**
   * Initialise the store. Loads an existing Custom XML Part if one exists
   * for the Obiter namespace, or creates a new empty store.
   */
  async initStore(): Promise<void> {
    await Word.run(async (context) => {
      const scopedParts = context.document.customXmlParts.getByNamespace(OBITER_NAMESPACE);
      scopedParts.load("items");
      await context.sync();

      const partItems = scopedParts.items ?? [];
      if (partItems.length > 0) {
        // Load existing store (use the first matching part)
        const part = partItems[0];
        part.load("id");
        await context.sync();

        this.xmlPartId = part.id;

        const xmlResult = part.getXml();
        await context.sync();

        this.storeData = deserializeStore(xmlResult.value);
      } else {
        // First use — create an empty store
        this.storeData = {
          metadata: {
            schemaVersion: DEFAULT_SCHEMA_VERSION,
            aglcVersion: DEFAULT_AGLC_VERSION,
            standardId: DEFAULT_STANDARD_ID,
          },
          citations: [],
        };
      }
    });

    // Persist the new empty store outside the initial Word.run to avoid nesting
    if (this.storeData && this.xmlPartId === null) {
      await this.persist();
    }
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
   */
  private async persist(): Promise<void> {
    const xml = serializeStore(
      this.storeData!.citations,
      this.storeData!.metadata.schemaVersion,
      this.storeData!.metadata.aglcVersion,
      this.storeData!.metadata.standardId ?? DEFAULT_STANDARD_ID,
      this.storeData!.metadata.writingMode ?? "academic",
      this.storeData!.metadata.courtJurisdiction,
      this.storeData!.metadata.headingListId,
      APP_VERSION,
      this.storeData!.metadata.ccModel,
    );

    await Word.run(async (context) => {
      // Delete existing part if present
      if (this.xmlPartId) {
        try {
          const existingPart = context.document.customXmlParts.getItemOrNullObject(this.xmlPartId);
          existingPart.load("id");
          await context.sync();

          if (!existingPart.isNullObject) {
            existingPart.delete();
            await context.sync();
          }
        } catch {
          // If deletion fails, we still attempt to add the new part
        }
      }

      // Add the new part
      const newPart = context.document.customXmlParts.add(xml);
      newPart.load("id");
      await context.sync();

      this.xmlPartId = newPart.id;
    });
  }

  private ensureInitialised(): void {
    if (!this.storeData) {
      throw new Error("CitationStore not initialised. Call initStore() first.");
    }
  }
}
