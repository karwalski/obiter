/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * ENP-012: summarise, or answer a question about, the passage loaded into the
 * Quote panel, using the user's own LLM key.
 *
 * Privacy contract (website/privacy.html, "User-selected text only"): the only
 * text that leaves the device is the text the caller passes in — the passage
 * shown in the Quote panel (pasted, or the PDF pages the user ticked) and the
 * user's question. Nothing is read from the document or from any other source.
 * Nothing is sent until the panel's button, which names the provider and the
 * size of the payload, is pressed.
 *
 * Long passages are split at paragraph and sentence boundaries into chunks
 * that fit a conservative per-call input budget, each chunk is summarised (or
 * asked) on its own, and one final call combines the partial results
 * (map/reduce). The output cap (`config.maxTokens`) is independent of the
 * input budget.
 */

import { LLMConfig } from "./config";
import { callLlm } from "./client";
import { LLM_PROVIDER_LABELS } from "./providers";
import { hasVaultKey, hasLocalKeyOverride } from "./vaultMode";

// ─── Prompts ────────────────────────────────────────────────────────────────

export const SUMMARISE_SYSTEM_PROMPT = `You summarise legal judgments and other legal texts for an Australian lawyer.

Work only from the text supplied by the user. Write a neutral summary of the facts, the issues, the holding, the reasoning and the orders, as they appear in the supplied text. Use short headed sections (Facts, Issues, Holding, Reasoning, Orders). If the text does not cover a section, say so in one line rather than guessing. If the text is only part of a judgment, summarise that part and say so.

Where the text carries paragraph numbers in square brackets, cite them in square brackets after the point they support, for example [42]. Cite only paragraph numbers that appear in the text.

Do not invent citations, party names, judges, dates or authorities that do not appear in the text. Do not add outside knowledge.

Plain text only: no markdown, no tables, no headings other than the section names on their own line.`;

export const ASK_SYSTEM_PROMPT = `You answer questions about a passage of legal text supplied by the user.

Answer only from the supplied text. Where the passage carries paragraph numbers in square brackets, quote the paragraph number in square brackets for each point the passage supports, for example [42]. Cite only paragraph numbers that appear in the text.

If the passage does not address the question, reply exactly: The passage does not say.

Do not use outside knowledge, and do not invent citations, names or authorities. Plain text only, no markdown.`;

/** Marker line that precedes the passage text in every user prompt. */
export const TEXT_MARKER = "Text:";

// ─── Budgets ────────────────────────────────────────────────────────────────

/**
 * Conservative per-call input size in characters (about 6k tokens), chosen
 * so every supported model's context holds a chunk plus the prompts and the
 * output, independently of `config.maxTokens` (which caps the output).
 */
export const CHUNK_CHARS = 24_000;

/** Smallest chunk budget ever used, whatever the caller asks for. */
const MIN_CHUNK_CHARS = 2_000;

/** Longest passage accepted for one summarise or ask run. */
export const MAX_TEXT_CHARS = 200_000;

/**
 * Largest request body the Obiter proxy accepts (`POST /api/proxy/llm`,
 * `express.json({ limit: "2mb" })`), with headroom for the prompts and the
 * JSON envelope.
 */
const PROXY_MAX_BODY_BYTES = 1.5 * 1024 * 1024;

/** Bytes reserved in a proxy request for the system prompt, model and envelope. */
const PROXY_OVERHEAD_BYTES = 8 * 1024;

/** Worst-case bytes per character once JSON-encoded as UTF-8. */
const MAX_BYTES_PER_CHAR = 4;

export const TEXT_TOO_LONG_MESSAGE = `The text is longer than ${MAX_TEXT_CHARS.toLocaleString("en-AU")} characters. Untick some pages or shorten the passage.`;

/** Rough token estimate: about four characters per token for English prose. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * True when this request will travel through the Obiter proxy rather than
 * straight to the provider: a custom endpoint (TRUST-001) or a vaulted key
 * without a local override (ACCT-005).
 */
export function usesProxy(config: LLMConfig): boolean {
  if (config.endpoint) return true;
  return hasVaultKey(config.provider) && !hasLocalKeyOverride(config.provider);
}

/** The per-chunk character budget for this configuration. */
export function chunkBudgetFor(config: LLMConfig): number {
  let budget = CHUNK_CHARS;
  if (usesProxy(config)) {
    const proxyChars = Math.floor(
      (PROXY_MAX_BODY_BYTES - PROXY_OVERHEAD_BYTES) / MAX_BYTES_PER_CHAR
    );
    budget = Math.min(budget, proxyChars);
  }
  return Math.max(MIN_CHUNK_CHARS, budget);
}

// ─── Chunking ───────────────────────────────────────────────────────────────

/** Characters that may follow a full stop before the sentence really ends. */
const CLOSERS = new Set(["’", "”", "'", '"', ")", "]"]);

/**
 * Splits one paragraph into sentences, each keeping its trailing whitespace
 * so that concatenating the units restores the paragraph exactly. A sentence
 * ends at `.`, `?` or `!` (optionally followed by a closing quote or bracket)
 * and then whitespace, so a marker such as "[42]" that opens the next
 * sentence stays with that sentence.
 */
function splitSentences(paragraph: string): string[] {
  const units: string[] = [];
  let start = 0;
  let i = 0;
  while (i < paragraph.length) {
    const ch = paragraph[i];
    if (ch === "." || ch === "?" || ch === "!") {
      let j = i + 1;
      while (j < paragraph.length && CLOSERS.has(paragraph[j])) j++;
      if (j < paragraph.length && /\s/.test(paragraph[j])) {
        while (j < paragraph.length && /\s/.test(paragraph[j])) j++;
        units.push(paragraph.slice(start, j));
        start = j;
        i = j;
        continue;
      }
    }
    i++;
  }
  if (start < paragraph.length) units.push(paragraph.slice(start));
  return units;
}

/** Splits text into paragraphs, each keeping its trailing newline(s). */
function splitParagraphs(text: string): string[] {
  const units: string[] = [];
  let start = 0;
  let i = 0;
  while (i < text.length) {
    if (text[i] === "\n") {
      let j = i;
      while (j < text.length && text[j] === "\n") j++;
      units.push(text.slice(start, j));
      start = j;
      i = j;
      continue;
    }
    i++;
  }
  if (start < text.length) units.push(text.slice(start));
  return units;
}

/**
 * Splits `text` into chunks of at most `maxChars` characters, breaking at
 * paragraph boundaries where possible, then at sentence boundaries, and only
 * as a last resort inside a sentence. Chunks are trimmed; empty chunks are
 * dropped. Paragraph markers such as "[42]" are never split from the
 * sentence they open.
 */
export function splitIntoChunks(text: string, maxChars: number): string[] {
  const budget = Math.max(1, Math.floor(maxChars));
  const whole = text.trim();
  if (whole.length === 0) return [];
  if (whole.length <= budget) return [whole];

  const chunks: string[] = [];
  let current = "";
  const flush = (): void => {
    const trimmed = current.trim();
    if (trimmed.length > 0) chunks.push(trimmed);
    current = "";
  };
  const addUnit = (unit: string): void => {
    if (unit.length > budget) {
      // A single sentence longer than the budget: hard split.
      flush();
      for (let i = 0; i < unit.length; i += budget) {
        const piece = unit.slice(i, i + budget).trim();
        if (piece.length > 0) chunks.push(piece);
      }
      return;
    }
    if (current.length + unit.length > budget) flush();
    current += unit;
  };

  for (const paragraph of splitParagraphs(whole)) {
    if (paragraph.length <= budget) {
      addUnit(paragraph);
    } else {
      for (const sentence of splitSentences(paragraph)) addUnit(sentence);
    }
  }
  flush();
  return chunks;
}

// ─── Send description (for the button label) ───────────────────────────────

export interface SendDescription {
  /** Whitespace-separated words in the text. */
  words: number;
  /** Number of provider calls the text will be split into (before the reduce call). */
  chunks: number;
  /** Provider name for the button label ("Anthropic", or the custom endpoint's host). */
  providerLabel: string;
  /** Characters in the text (compare with MAX_TEXT_CHARS). */
  chars: number;
}

/** Counts whitespace-separated words. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

/** The provider name the panel shows: the catalogue label, or a custom endpoint's host. */
export function providerLabelFor(config: LLMConfig): string {
  if (config.endpoint) {
    try {
      return new URL(config.endpoint).host || LLM_PROVIDER_LABELS.custom;
    } catch {
      return LLM_PROVIDER_LABELS.custom;
    }
  }
  return LLM_PROVIDER_LABELS[config.provider] ?? config.provider;
}

/**
 * Describes what pressing the button would send: how many words, in how
 * many parts, and to whom. Used for the button label so the user sees the
 * provider and the size of the payload before anything is sent.
 */
export function describeSend(text: string, config: LLMConfig): SendDescription {
  const chunks = splitIntoChunks(text, chunkBudgetFor(config));
  return {
    words: countWords(text),
    chunks: chunks.length,
    providerLabel: providerLabelFor(config),
    chars: text.trim().length,
  };
}

// ─── Map / reduce ───────────────────────────────────────────────────────────

export interface SummariseOptions {
  /** Called after each provider call: `done` of `total` calls complete. */
  onProgress?: (done: number, total: number) => void;
}

function withText(header: string, text: string): string {
  return `${header}\n\n${TEXT_MARKER}\n${text}`;
}

function assertWithinLimit(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length === 0) throw new Error("There is no text to send.");
  if (trimmed.length > MAX_TEXT_CHARS) throw new Error(TEXT_TOO_LONG_MESSAGE);
  return trimmed;
}

/**
 * Summarises the passage. One call when it fits the chunk budget; otherwise
 * each chunk is summarised in turn and one final call combines the partial
 * summaries.
 */
export async function summarisePassage(
  text: string,
  config: LLMConfig,
  opts: SummariseOptions = {}
): Promise<string> {
  const whole = assertWithinLimit(text);
  const chunks = splitIntoChunks(whole, chunkBudgetFor(config));

  if (chunks.length === 1) {
    const result = await callLlm(
      config,
      SUMMARISE_SYSTEM_PROMPT,
      withText("Summarise the following text.", chunks[0])
    );
    opts.onProgress?.(1, 1);
    return result;
  }

  const total = chunks.length + 1;
  const partials: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const header = `This is part ${i + 1} of ${chunks.length} of one judgment or text. Summarise this part only; a later step combines the parts.`;
    partials.push(await callLlm(config, SUMMARISE_SYSTEM_PROMPT, withText(header, chunks[i])));
    opts.onProgress?.(i + 1, total);
  }

  const reducePrompt =
    "Combine these partial summaries of consecutive parts of one judgment or text into one summary with the same headed sections (Facts, Issues, Holding, Reasoning, Orders). Keep the paragraph references in square brackets. Add nothing that is not in the partial summaries.\n\n" +
    partials.map((p, i) => `Part ${i + 1} of ${partials.length}:\n${p}`).join("\n\n");
  const result = await callLlm(config, SUMMARISE_SYSTEM_PROMPT, reducePrompt);
  opts.onProgress?.(total, total);
  return result;
}

/**
 * Answers a question from the passage. One call when it fits the chunk
 * budget; otherwise each chunk answers from its own part and one final call
 * combines the answers, preferring those that cite paragraph numbers.
 */
export async function askAboutPassage(
  text: string,
  question: string,
  config: LLMConfig,
  opts: SummariseOptions = {}
): Promise<string> {
  const whole = assertWithinLimit(text);
  const asked = question.trim();
  if (asked.length === 0) throw new Error("Type a question to ask about the text.");
  const chunks = splitIntoChunks(whole, chunkBudgetFor(config));

  if (chunks.length === 1) {
    const result = await callLlm(
      config,
      ASK_SYSTEM_PROMPT,
      withText(`Question: ${asked}\n\nAnswer from the following text.`, chunks[0])
    );
    opts.onProgress?.(1, 1);
    return result;
  }

  const total = chunks.length + 1;
  const partials: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const header = `Question: ${asked}\n\nThis is part ${i + 1} of ${chunks.length} of one passage. Answer from this part only. If this part does not address the question, reply exactly: The passage does not say.`;
    partials.push(await callLlm(config, ASK_SYSTEM_PROMPT, withText(header, chunks[i])));
    opts.onProgress?.(i + 1, total);
  }

  const reducePrompt =
    `Question: ${asked}\n\nBelow are answers drawn from consecutive parts of one passage. Combine them into one answer to the question. Prefer answers that cite paragraph numbers in square brackets, and keep those references. If every part says the passage does not say, reply exactly: The passage does not say. Add nothing that is not in the answers below.\n\n` +
    partials.map((p, i) => `Part ${i + 1} of ${partials.length}:\n${p}`).join("\n\n");
  const result = await callLlm(config, ASK_SYSTEM_PROMPT, reducePrompt);
  opts.onProgress?.(total, total);
  return result;
}

/**
 * True when a provider error message suggests the key or model is wrong
 * (HTTP 401/403, "invalid api key", "authentication").
 */
export function looksLikeAuthError(message: string): boolean {
  return /\b(401|403)\b|invalid[^.]{0,20}key|api key|unauthori[sz]ed|authenticat|forbidden|permission/i.test(
    message
  );
}

/**
 * Turns a thrown provider error into the message the panel shows: the
 * provider's own text, with "Check your key and model in Settings." appended
 * when it looks like an authentication problem.
 */
export function describeLlmError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  const base = message.trim().length > 0 ? message.trim() : "The request failed.";
  return looksLikeAuthError(base) ? `${base} Check your key and model in Settings.` : base;
}
