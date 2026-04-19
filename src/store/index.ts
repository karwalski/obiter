/**
 * Citation Store — Public API
 *
 * Re-exports the CitationStore class and XML serialization utilities.
 */

export { CitationStore } from "./citationStore";
export {
  OBITER_NAMESPACE,
  serializeCitation,
  deserializeCitation,
  serializeStore,
  deserializeStore,
} from "./xmlSerializer";
