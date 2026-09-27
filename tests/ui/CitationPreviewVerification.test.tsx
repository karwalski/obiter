/**
 * @jest-environment jsdom
 *
 * LCT-010 — the Preview editor's "Parse citation" passes the verification
 * loop's signal and commentary decisions to the form, and shows its notes.
 */
import * as React from "react";
import { render, fireEvent, within, waitFor } from "@testing-library/react";
import type { FormattedRun } from "../../src/types/formattedRun";

const mockParse = jest.fn();
jest.mock("../../src/llm/corpusEnhancedParse", () => ({
  parseWithCorpusFirst: (...args: unknown[]): unknown => mockParse(...args),
}));
jest.mock("../../src/llm/config", () => ({
  loadLlmConfig: () => ({ enabled: true, provider: "anthropic", apiKey: "k", model: "m" }),
}));
jest.mock("../../src/api/corpus/corpusDownload", () => ({
  checkCorpusAvailable: () => false,
}));

import CitationPreview from "../../src/ui/components/CitationPreview";

const runs: FormattedRun[] = [{ text: "Mabo v Queensland [No 2] (1992) 175 CLR 1", italic: false }];

describe("CitationPreview AI parse extras (LCT-010)", () => {
  it("passes the signal and commentary to onParsed and renders the notes", async () => {
    mockParse.mockResolvedValueOnce({
      data: { party1: "Mabo", party2: "Queensland [No 2]" },
      source: "llm",
      warnings: [],
      signal: "See",
      commentaryAfter: "(emphasis added)",
      notes: ["C.L.R. is the dotted form of CLR."],
    });
    const onParsed = jest.fn();
    const { container } = render(
      <CitationPreview runs={runs} sourceType="case.reported" onParsed={onParsed} />
    );
    fireEvent.click(within(container).getByText("Edit directly"));
    fireEvent.click(within(container).getByText("Parse citation"));

    await waitFor(() => expect(onParsed).toHaveBeenCalled());
    expect(onParsed).toHaveBeenCalledWith(
      { party1: "Mabo", party2: "Queensland [No 2]" },
      [],
      undefined,
      expect.objectContaining({ signal: "See", commentaryAfter: "(emphasis added)" })
    );
    expect(within(container).getByText("C.L.R. is the dotted form of CLR.")).toBeInTheDocument();
  });
});
