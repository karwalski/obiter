/**
 * LLM integration barrel exports.
 *
 * All LLM features are optional — they require the user to configure an API
 * key and enable the integration via the task pane settings panel.
 */

export { LLMConfig, saveLlmConfig, loadLlmConfig, testConnection } from "./config";
export { callLlm } from "./client";
export { parseCitationText, ParsedCitation } from "./parseCitation";
export {
  verifyCitationFormat,
  VerificationResult,
} from "./verifyCitation";
export { suggestShortTitle } from "./suggestShortTitle";
export {
  classifySourceType,
  ClassificationResult,
} from "./classifySource";
