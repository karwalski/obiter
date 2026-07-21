/**
 * Citation Store — Public API
 *
 * Re-exports the CitationStore class and XML serialization utilities.
 */

export { CitationStore, StoreDataLossError } from "./citationStore";
export type { StoreDiagnostics, StorePartInfo, StoreStatus } from "./citationStore";
export { getSharedStore, resetSharedStore } from "./singleton";
export {
  OBITER_NAMESPACE,
  MAX_SUPPORTED_SCHEMA_VERSION,
  StoreXmlError,
  serializeCitation,
  deserializeCitation,
  serializeStore,
  deserializeStore,
} from "./xmlSerializer";
export type { StoreXmlErrorReason } from "./xmlSerializer";
export {
  BACKUP_NAMESPACE,
  BackupXmlError,
  MAX_STORE_SNAPSHOTS,
  MAX_FOOTNOTE_GENERATIONS,
  serializeBackup,
  deserializeBackup,
} from "./backupSerializer";
export type {
  BackupData,
  StoreSnapshot,
  FootnoteSnapshot,
  FootnoteBackupEntry,
  SnapshotReason,
} from "./backupSerializer";
export {
  readBackup,
  writeBackup,
  addSnapshot,
  addFootnoteGeneration,
  listSnapshots,
  getSnapshot,
  listFootnoteGenerations,
} from "./backupStore";
export type { AddSnapshotParams, SnapshotSummary } from "./backupStore";
export {
  CURRENT_SCHEMA_VERSION,
  registerMigration,
  applyMigrations,
  getRegisteredMigrations,
} from "./migrations";
export type { StoreMigration, StoreMigrationFn } from "./migrations";
export { salvageCitations, filterNewCitations } from "./salvage";
export type { SalvageResult } from "./salvage";
