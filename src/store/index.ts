/**
 * Citation Store — Public API
 *
 * Re-exports the CitationStore class and XML serialization utilities.
 */

export { CitationStore } from "./citationStore";
export { getSharedStore, resetSharedStore } from "./singleton";
export {
  OBITER_NAMESPACE,
  serializeCitation,
  deserializeCitation,
  serializeStore,
  deserializeStore,
} from "./xmlSerializer";
