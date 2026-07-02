/**
 * LLM integration barrel exports.
 *
 * All LLM features are optional — they require the user to configure an API
 * key and enable the integration via the task pane settings panel.
 */

export { LLMConfig, saveLlmConfig, loadLlmConfig, testConnection } from "./config";
export { callLlm } from "./client";
export { parseCitationText, ParsedCitation, PARSE_CITATION_SYSTEM_PROMPT } from "./parseCitation";
export { verifyCitationFormat, VerificationResult } from "./verifyCitation";
export { suggestShortTitle } from "./suggestShortTitle";
export {
  classifySourceType,
  ClassificationResult,
  CLASSIFY_SOURCE_SYSTEM_PROMPT,
} from "./classifySource";
