/**
 * ENP-012: summarise / ask about a loaded passage with the user's own key.
 *
 * `callLlm` is mocked so the tests can prove what leaves the device: only
 * the supplied text (split into chunks within the input budget, each sent
 * once) plus the framing prompts, with one reduce call over the partials.
 */

import type { LLMConfig } from "../../src/llm/config";
import {
  ASK_SYSTEM_PROMPT,
  CHUNK_CHARS,
  MAX_TEXT_CHARS,
  SUMMARISE_SYSTEM_PROMPT,
  TEXT_MARKER,
  askAboutPassage,
  chunkBudgetFor,
  countWords,
  describeLlmError,
  describeSend,
  estimateTokens,
  splitIntoChunks,
  summarisePassage,
} from "../../src/llm/summariseJudgment";

interface RecordedCall {
  system: string;
  user: string;
}

const mockCalls: RecordedCall[] = [];
const mockReplies: string[] = [];
const mockCallLlm = jest.fn(
  async (_config: LLMConfig, system: string, user: string): Promise<string> => {
    mockCalls.push({ system, user });
    return mockReplies.length > 0 ? (mockReplies.shift() as string) : `reply ${mockCalls.length}`;
  }
);
jest.mock("../../src/llm/client", () => ({
  callLlm: (config: LLMConfig, system: string, user: string): Promise<string> =>
    mockCallLlm(config, system, user),
}));

const config: LLMConfig = {
  provider: "anthropic",
  apiKey: "sk-test",
  model: "claude-sonnet-4-6",
  maxTokens: 1024,
  enabled: true,
};

/** The passage text carried by a user prompt (everything after the marker line). */
function sentText(user: string): string {
  const at = user.indexOf(`${TEXT_MARKER}\n`);
  expect(at).toBeGreaterThanOrEqual(0);
  return user.slice(at + TEXT_MARKER.length + 1);
}

const squash = (s: string): string => s.replace(/\s+/g, " ").trim();

/** A judgment-shaped passage: numbered paragraphs of several sentences each. */
function makeJudgment(targetChars: number): string {
  const paragraphs: string[] = [];
  let n = 1;
  let length = 0;
  while (length < targetChars) {
    const sentences = [
      `The appellant contended that the primary judge erred in finding that the duty of care extended to purely economic loss suffered by a subsequent purchaser.`,
      `That contention must be rejected for the reasons given by the Court of Appeal, which correctly applied the salient features approach.`,
      `Nothing in the evidence supports the alternative case advanced on the hearing of the appeal.`,
    ];
    const paragraph = `[${n}] ${sentences.join(" ")}`;
    paragraphs.push(paragraph);
    length += paragraph.length + 1;
    n++;
  }
  return paragraphs.join("\n");
}

beforeEach(() => {
  mockCalls.length = 0;
  mockReplies.length = 0;
  mockCallLlm.mockClear();
});

describe("splitIntoChunks", () => {
  test("keeps a short text whole and drops empty input", () => {
    expect(splitIntoChunks("  ", 100)).toEqual([]);
    expect(splitIntoChunks("One. Two.", 100)).toEqual(["One. Two."]);
  });

  test("breaks at sentence boundaries and keeps [42] markers with their sentence", () => {
    const text =
      "[41] The first paragraph ends here. [42] The second paragraph starts with a marker. [43] The third one too.";
    const chunks = splitIntoChunks(text, 60);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(60);
      expect(chunk).toMatch(/^\[\d+\] /);
      expect(chunk).not.toMatch(/\[\d*$/);
    }
    expect(chunks.join(" ").match(/\[\d+\]/g)).toEqual(["[41]", "[42]", "[43]"]);
    expect(squash(chunks.join(" "))).toBe(squash(text));
  });

  test("prefers paragraph boundaries", () => {
    const text = "First paragraph. Still first.\nSecond paragraph. Still second.\nThird.";
    expect(splitIntoChunks(text, 32)).toEqual([
      "First paragraph. Still first.",
      "Second paragraph. Still second.",
      "Third.",
    ]);
  });

  test("hard-splits a single sentence longer than the budget", () => {
    const text = "a".repeat(25);
    expect(splitIntoChunks(text, 10)).toEqual(["aaaaaaaaaa", "aaaaaaaaaa", "aaaaa"]);
  });
});

describe("summarisePassage", () => {
  test("a 30-page judgment is chunked within the budget, each chunk sent once, then reduced", async () => {
    const judgment = makeJudgment(150_000);
    expect(judgment.length).toBeGreaterThan(140_000);
    const progress: Array<[number, number]> = [];

    const expectedChunks = splitIntoChunks(judgment, chunkBudgetFor(config));
    expect(expectedChunks.length).toBeGreaterThan(5);
    for (let i = 0; i < expectedChunks.length; i++) mockReplies.push(`partial ${i + 1}`);
    mockReplies.push("FINAL SUMMARY");

    const result = await summarisePassage(judgment, config, {
      onProgress: (done, total) => progress.push([done, total]),
    });

    expect(result).toBe("FINAL SUMMARY");
    expect(mockCalls).toHaveLength(expectedChunks.length + 1);

    // Every map call carries exactly one chunk, within the budget, and every
    // chunk is sent exactly once, in order.
    const mapCalls = mockCalls.slice(0, expectedChunks.length);
    const sent = mapCalls.map((c) => sentText(c.user));
    expect(sent).toEqual(expectedChunks);
    for (const [i, chunk] of sent.entries()) {
      expect(chunk.length).toBeLessThanOrEqual(CHUNK_CHARS);
      expect(mapCalls[i].system).toBe(SUMMARISE_SYSTEM_PROMPT);
      expect(mapCalls[i].user).toContain(`part ${i + 1} of ${expectedChunks.length}`);
      // Only the loaded text is sent: each chunk is a verbatim slice of it.
      expect(judgment).toContain(chunk);
    }
    // Together the chunks are the whole passage and nothing more.
    expect(squash(sent.join(" "))).toBe(squash(judgment));
    // Markers are never broken across chunks.
    expect(sent.join(" ").match(/\[\d+\]/g)).toEqual(judgment.match(/\[\d+\]/g));

    // The reduce call receives every partial and none of the raw text.
    const reduce = mockCalls[mockCalls.length - 1];
    expect(reduce.system).toBe(SUMMARISE_SYSTEM_PROMPT);
    expect(reduce.user).toMatch(/^Combine these partial summaries/);
    for (let i = 0; i < expectedChunks.length; i++) {
      expect(reduce.user).toContain(`Part ${i + 1} of ${expectedChunks.length}:\npartial ${i + 1}`);
    }
    expect(reduce.user).not.toContain("The appellant contended");

    expect(progress[0]).toEqual([1, expectedChunks.length + 1]);
    expect(progress[progress.length - 1]).toEqual([
      expectedChunks.length + 1,
      expectedChunks.length + 1,
    ]);
  });

  test("a short passage is one call carrying exactly that text", async () => {
    mockReplies.push("short summary");
    const text =
      "[42] Native title has its origin in the traditional laws of the indigenous inhabitants.";
    const result = await summarisePassage(`  ${text}\n`, config);
    expect(result).toBe("short summary");
    expect(mockCalls).toHaveLength(1);
    expect(mockCalls[0].system).toBe(SUMMARISE_SYSTEM_PROMPT);
    expect(sentText(mockCalls[0].user)).toBe(text);
    expect(mockCalls[0].user).not.toContain("part 1 of");
  });

  test("refuses empty text and text over the cap without calling the provider", async () => {
    await expect(summarisePassage("   ", config)).rejects.toThrow("There is no text to send.");
    await expect(summarisePassage("x".repeat(MAX_TEXT_CHARS + 1), config)).rejects.toThrow(
      /longer than 200,000 characters/
    );
    expect(mockCallLlm).not.toHaveBeenCalled();
  });
});

describe("askAboutPassage", () => {
  test("single chunk: the question and the text go in one call", async () => {
    mockReplies.push("The court held X [42].");
    const text = "[42] The court held X.";
    const result = await askAboutPassage(text, " What did the court hold? ", config);
    expect(result).toBe("The court held X [42].");
    expect(mockCalls).toHaveLength(1);
    expect(mockCalls[0].system).toBe(ASK_SYSTEM_PROMPT);
    expect(mockCalls[0].user).toContain("Question: What did the court hold?");
    expect(sentText(mockCalls[0].user)).toBe(text);
  });

  test("long passage: each part answers, then one reduce combines the answers", async () => {
    const judgment = makeJudgment(60_000);
    const expectedChunks = splitIntoChunks(judgment, chunkBudgetFor(config));
    expect(expectedChunks.length).toBeGreaterThan(1);
    for (let i = 0; i < expectedChunks.length; i++) mockReplies.push(`answer ${i + 1}`);
    mockReplies.push("COMBINED");

    const result = await askAboutPassage(judgment, "Was the duty of care extended?", config);
    expect(result).toBe("COMBINED");
    expect(mockCalls).toHaveLength(expectedChunks.length + 1);
    const sent = mockCalls.slice(0, expectedChunks.length).map((c) => sentText(c.user));
    expect(sent).toEqual(expectedChunks);
    for (const call of mockCalls) {
      expect(call.system).toBe(ASK_SYSTEM_PROMPT);
      expect(call.user).toContain("Question: Was the duty of care extended?");
    }
    const reduce = mockCalls[mockCalls.length - 1];
    expect(reduce.user).toContain("Prefer answers that cite paragraph numbers");
    for (let i = 0; i < expectedChunks.length; i++) {
      expect(reduce.user).toContain(`answer ${i + 1}`);
    }
    expect(reduce.user).not.toContain("The appellant contended");
  });

  test("refuses an empty question without calling the provider", async () => {
    await expect(askAboutPassage("Some text.", "  ", config)).rejects.toThrow(
      "Type a question to ask about the text."
    );
    expect(mockCallLlm).not.toHaveBeenCalled();
  });
});

describe("describeSend and helpers", () => {
  test("counts words, parts and names the provider", () => {
    expect(describeSend("", config)).toEqual({
      words: 0,
      chunks: 0,
      providerLabel: "Anthropic",
      chars: 0,
    });
    expect(describeSend("one two  three\nfour", config)).toMatchObject({
      words: 4,
      chunks: 1,
      providerLabel: "Anthropic",
    });
    const long = makeJudgment(60_000);
    const described = describeSend(long, { ...config, provider: "openai" });
    expect(described.chunks).toBe(splitIntoChunks(long, CHUNK_CHARS).length);
    expect(described.chunks).toBeGreaterThan(1);
    expect(described.providerLabel).toBe("OpenAI");
    expect(described.words).toBe(countWords(long));
  });

  test("a custom endpoint is named by its host", () => {
    const custom: LLMConfig = {
      ...config,
      provider: "custom",
      endpoint: "https://llm.example.edu.au/v1/chat/completions",
    };
    expect(describeSend("hello", custom).providerLabel).toBe("llm.example.edu.au");
    expect(chunkBudgetFor(custom)).toBeLessThanOrEqual(CHUNK_CHARS);
    expect(chunkBudgetFor(custom)).toBeGreaterThanOrEqual(2000);
  });

  test("estimateTokens is about a quarter of the characters", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("a".repeat(400))).toBe(100);
    expect(estimateTokens("a".repeat(401))).toBe(101);
  });

  test("describeLlmError appends the Settings hint only for auth-like failures", () => {
    expect(describeLlmError(new Error("anthropic API error (401): invalid x-api-key"))).toBe(
      "anthropic API error (401): invalid x-api-key Check your key and model in Settings."
    );
    expect(describeLlmError(new Error("openai API error (403): forbidden"))).toMatch(
      /Check your key and model in Settings\.$/
    );
    expect(describeLlmError(new Error("Incorrect API key provided"))).toMatch(
      /Check your key and model in Settings\.$/
    );
    expect(describeLlmError(new Error("anthropic API error (429): rate limited"))).toBe(
      "anthropic API error (429): rate limited"
    );
    expect(describeLlmError("")).toBe("The request failed.");
  });
});
