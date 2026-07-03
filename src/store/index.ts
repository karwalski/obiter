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
  StoreXmlError,
  serializeCitation,
  deserializeCitation,
  serializeStore,
  deserializeStore,
} from "./xmlSerializer";
