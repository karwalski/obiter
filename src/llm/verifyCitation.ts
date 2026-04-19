/**
 * LLM-003: Verify Citation Format
 *
 * Sends a formatted citation string and its governing AGLC4 rule number to
 * the LLM for conformance checking. Returns a structured verdict with
 * specific issues and rule references.
 */

import { LLMConfig } from "./config";
import { callLlm } from "./client";

const SYSTEM_PROMPT = `You are an expert in the Australian Guide to Legal Citation, 4th Edition (AGLC4).

Given a formatted citation string and an AGLC4 rule number, verify whether the
citation conforms to that rule. Check:
- Correct order of elements
- Correct punctuation and spacing
- Correct use of italics markers (represented by underscores around text)
- Correct abbreviation of report series, courts, and jurisdictions
- Year format (round vs square brackets)
- Pinpoint reference format
- Short title formatting

Respond with ONLY valid JSON in this exact shape (no markdown fencing):
{
  "valid": true | false,
  "issues": ["<description of each issue found>"],
  "ruleReferences": ["<relevant AGLC4 rule numbers, e.g. '2.2.1', '1.4.3'>"]
}

If the citation is valid, return an empty issues array.`;

export interface VerificationResult {
  valid: boolean;
  issues: string[];
  ruleReferences: string[];
}

/**
 * Ask the LLM to verify whether a formatted citation conforms to a specific
 * AGLC4 rule.
 */
export async function verifyCitationFormat(
  formattedText: string,
  ruleNumber: string,
  config: LLMConfig,
): Promise<VerificationResult> {
  const userPrompt = `Verify this citation against AGLC4 Rule ${ruleNumber}:\n\n${formattedText}`;

  const response = await callLlm(config, SYSTEM_PROMPT, userPrompt);

  const cleaned = response.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();

  const result = JSON.parse(cleaned) as VerificationResult;

  // Normalise: ensure arrays are present even if the LLM omits them.
  result.issues = Array.isArray(result.issues) ? result.issues : [];
  result.ruleReferences = Array.isArray(result.ruleReferences)
    ? result.ruleReferences
    : [];

  return result;
}
