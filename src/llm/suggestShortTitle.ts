/**
 * LLM-004: Suggest Short Title
 *
 * Uses Rule 1.4.4 conventions to generate a short title for subsequent
 * references to a citation. The LLM is prompted with the full citation
 * record so it can pick the most natural abbreviated form.
 *
 * Rule 1.4.4: "Where a short title has been provided, it should be used
 * for all subsequent references to the source."
 */

import { Citation } from "../types/citation";
import { LLMConfig } from "./config";
import { callLlm } from "./client";

const SYSTEM_PROMPT = `You are an expert in the Australian Guide to Legal Citation, 4th Edition (AGLC4).

Generate a short title for the given citation following Rule 1.4.4 conventions:

- For cases: use the first party name in italics, e.g. a case "Smith v Jones" becomes "Smith"
- For legislation: use a recognisable abbreviated form of the Act title, e.g. "Competition and Consumer Act 2010 (Cth)" becomes "CCA"
- For books/articles: use a distinctive keyword or phrase from the title
- For reports: use the common abbreviated name if one exists
- The short title must be concise (ideally 1–3 words) and unambiguous

Respond with ONLY the short title text (no quotes, no JSON, no explanation).`;

/**
 * Ask the LLM to suggest a short title for a citation, following AGLC4
 * Rule 1.4.4.
 */
export async function suggestShortTitle(
  citation: Citation,
  config: LLMConfig,
): Promise<string> {
  const userPrompt = [
    `Source type: ${citation.sourceType}`,
    `Data: ${JSON.stringify(citation.data, null, 2)}`,
    citation.shortTitle
      ? `Current short title: ${citation.shortTitle}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await callLlm(config, SYSTEM_PROMPT, userPrompt);

  // Strip any extraneous quotes or whitespace the model may add.
  return response.replace(/^["']+|["']+$/g, "").trim();
}
