/**
 * @jest-environment jsdom
 *
 * ENP-010: the Quote panel — pasted passage to a formatted quotation with
 * its citation footnote and pinpoint (AGLC4 Rules 1.1.3, 1.1.6, 1.5.1, 1.7.1).
 * ENP-011: a passage loaded from a PDF's text layer (pdf.js mocked).
 */

import * as React from "react";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { axe } from "jest-axe";
import Quote from "../../src/ui/views/Quote";
import type { Citation, Pinpoint } from "../../src/types/citation";
import type { LLMConfig } from "../../src/llm/config";

const mockTriggerRefresh = jest.fn();
jest.mock("../../src/ui/context/CitationContext", () => ({
  useCitationContext: (): unknown => ({
    setSelectedCitationId: jest.fn(),
    triggerRefresh: mockTriggerRefresh,
    refreshCounter: 0,
  }),
}));

const mockInsertQuotation = jest.fn(async () => undefined);
const mockInsertPlainParagraph = jest.fn(async (_text: string) => undefined);
jest.mock("../../src/word/quotationInserter", () => ({
  insertQuotation: (...args: unknown[]): Promise<void> => mockInsertQuotation(...(args as [])),
  insertPlainParagraph: (text: string): Promise<void> => mockInsertPlainParagraph(text),
}));

// ENP-012: the LLM config and the summarise/ask calls are mocked; describeSend
// and the error helper are the real ones so the button label is genuine.
let mockLlmConfig: LLMConfig | null = null;
jest.mock("../../src/llm/config", () => ({
  loadLlmConfig: (): LLMConfig | null => mockLlmConfig,
}));
const mockSummarisePassage = jest.fn(
  async (_text: string, _config: LLMConfig, _opts?: unknown): Promise<string> => "Summary text"
);
const mockAskAboutPassage = jest.fn(
  async (_text: string, _question: string, _config: LLMConfig, _opts?: unknown): Promise<string> =>
    "Answer text [42]"
);
jest.mock("../../src/llm/summariseJudgment", () => ({
  ...jest.requireActual("../../src/llm/summariseJudgment"),
  summarisePassage: (text: string, config: LLMConfig, opts?: unknown): Promise<string> =>
    mockSummarisePassage(text, config, opts),
  askAboutPassage: (
    text: string,
    question: string,
    config: LLMConfig,
    opts?: unknown
  ): Promise<string> => mockAskAboutPassage(text, question, config, opts),
}));

const mockInsertCitationFootnote = jest.fn(async () => undefined);
// Encodes a typed pinpoint the way the real buildOccurrenceTitle does
// (pinpointToTitleString: "[42]" for paragraphs, "12" for pages, "s 5").
const mockPinpointToTitleString = (
  jest.requireActual("../../src/engine/rules/v4/general/pinpoints") as {
    pinpointToTitleString: (pinpoint: Pinpoint) => string;
  }
).pinpointToTitleString;
const mockBuildOccurrenceTitle = jest.fn((pref: string, pinpoint?: Pinpoint) =>
  pinpoint ? `Citation:${pref}:${mockPinpointToTitleString(pinpoint)}` : `Citation:${pref}`
);
jest.mock("../../src/word/footnoteManager", () => ({
  insertCitationFootnote: (...args: unknown[]): Promise<void> =>
    mockInsertCitationFootnote(...(args as [])),
  getAllCitationFootnotes: jest.fn(async () => []),
  buildOccurrenceTitle: (pref: string, pinpoint?: Pinpoint): string =>
    mockBuildOccurrenceTitle(pref, pinpoint),
}));

const mabo: Citation = {
  id: "mabo",
  aglcVersion: "4",
  sourceType: "case.reported",
  shortTitle: "Mabo",
  data: {
    party1: "Mabo",
    party2: "Queensland (No 2)",
    year: 1992,
    volume: 175,
    reportSeries: "CLR",
    startingPage: 1,
  },
  tags: [],
  createdAt: "",
  modifiedAt: "",
};
const book: Citation = {
  id: "edelman",
  aglcVersion: "4",
  sourceType: "book",
  data: {
    authors: [{ givenNames: "James", surname: "Edelman" }],
    title: "Unjust Enrichment",
    publisher: "Hart Publishing",
    year: 2016,
  },
  tags: [],
  createdAt: "",
  modifiedAt: "",
};

const mockExtractPdfPages = jest.fn(
  async (
    _data: ArrayBuffer,
    _onProgress?: (page: number, total: number) => void
  ): Promise<{ pages: string[]; pageCount: number }> => ({ pages: [], pageCount: 0 })
);
jest.mock("../../src/ui/pdfText", () => ({
  ...jest.requireActual("../../src/ui/pdfText"),
  extractPdfPages: (
    data: ArrayBuffer,
    onProgress?: (page: number, total: number) => void
  ): Promise<{ pages: string[]; pageCount: number }> => mockExtractPdfPages(data, onProgress),
}));

let mockLibraryCitations: Citation[] = [];
const mockStore = {
  getAll: (): Citation[] => mockLibraryCitations,
  getStandardId: (): "aglc4" => "aglc4",
  getCourtToggles: (): undefined => undefined,
  update: jest.fn(async () => undefined),
};
jest.mock("../../src/store/singleton", () => ({
  getSharedStore: (): Promise<unknown> => Promise.resolve(mockStore),
}));

const LONG_PASSAGE =
  "[42] The common law of Australia recognises a form of native title which, in the cases where it has not been extinguished, reflects the entitlement of the indigenous inhabitants, in accordance with their laws or customs, to their traditional lands and which is not necessarily a mere personal right. Native title has its origin in and is given its content by the traditional laws acknowledged by and the traditional customs observed by the indigenous inhabitants of a territory.";
const LONG_CLEANED = LONG_PASSAGE.replace("[42] ", "");
const SHORT_PASSAGE = "The common law of Australia recognises a form of native title.";

async function renderQuote(
  citations: Citation[],
  state?: { citationId?: string }
): Promise<HTMLElement> {
  mockLibraryCitations = citations;
  const { container } = render(
    <MemoryRouter initialEntries={[{ pathname: "/quote", state }]}>
      <Quote />
    </MemoryRouter>
  );
  await waitFor(() => expect(screen.queryByText("Loading citations...")).toBeNull());
  return container;
}

describe("Quote panel (ENP-010)", () => {
  beforeEach(() => {
    mockTriggerRefresh.mockClear();
    mockInsertQuotation.mockClear();
    mockInsertCitationFootnote.mockClear();
    mockBuildOccurrenceTitle.mockClear();
    mockStore.update.mockClear();
  });

  test("empty library points to Insert Citation", async () => {
    await renderQuote([]);
    expect(screen.getByText(/Add a citation to the library first\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to Insert Citation" })).toBeInTheDocument();
  });

  test("a long passage with a paragraph marker inserts a block quotation and a pinpointed footnote", async () => {
    await renderQuote([mabo, book], { citationId: "mabo" });
    expect(screen.getByRole("radio", { name: /Mabo v Queensland/ })).toBeChecked();

    fireEvent.change(screen.getByLabelText("Quoted text"), { target: { value: LONG_PASSAGE } });

    expect(
      screen.getByText(/Paragraph marker \[42\] found and used as the pinpoint/)
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Type")).toHaveValue("paragraph");
    expect(screen.getByLabelText("Value")).toHaveValue("42");
    expect(screen.getByText(/^Block quotation/)).toBeInTheDocument();
    expect(screen.getByTestId("quote-preview-text")).toHaveTextContent(LONG_CLEANED);
    expect(screen.getByTestId("quote-preview-text")).not.toHaveTextContent("[42]");
    expect(screen.getByTestId("quote-preview-footnote")).toHaveTextContent(
      "Mabo v Queensland (No 2) (1992) 175 CLR 1 [42] (‘Mabo’)."
    );

    fireEvent.click(screen.getByRole("button", { name: "Insert quotation and footnote" }));
    await waitFor(() => expect(mockInsertCitationFootnote).toHaveBeenCalledTimes(1));

    expect(mockInsertQuotation).toHaveBeenCalledWith({ text: LONG_CLEANED, mode: "block" });
    // The typed pinpoint goes to the title builder, which stores it bracketed
    // so the refresher decodes a paragraph pinpoint and re-renders "[42]".
    expect(mockBuildOccurrenceTitle).toHaveBeenCalledWith("auto", {
      type: "paragraph",
      value: "[42]",
    });
    const [citationId, title, runs] = mockInsertCitationFootnote.mock.calls[0] as unknown as [
      string,
      string,
      { text: string }[],
    ];
    expect(citationId).toBe("mabo");
    expect(title).toBe("Citation:auto:[42]");
    // The occurrence pinpoint is rendered on the first (full) citation and no
    // closing full stop is inserted (the refresher adds it, Rule 1.1.4).
    expect(runs.map((r) => r.text).join("")).toBe(
      "Mabo v Queensland (No 2) (1992) 175 CLR 1 [42] (‘Mabo’)"
    );
    expect(mockStore.update).toHaveBeenCalled();
    expect(mockTriggerRefresh).toHaveBeenCalled();
    expect(screen.getByText("Quotation inserted with footnote.")).toBeInTheDocument();
  });

  test("a short passage inserts inline in single quotation marks", async () => {
    await renderQuote([mabo, book]);
    fireEvent.click(screen.getByRole("radio", { name: /Mabo v Queensland/ }));
    fireEvent.change(screen.getByLabelText("Quoted text"), { target: { value: SHORT_PASSAGE } });
    fireEvent.change(screen.getByLabelText("Value"), { target: { value: "58" } });

    expect(screen.getByText(/^Inline quotation/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Insert quotation and footnote" }));
    await waitFor(() => expect(mockInsertQuotation).toHaveBeenCalledTimes(1));
    expect(mockInsertQuotation).toHaveBeenCalledWith({
      text: `‘${SHORT_PASSAGE}’`,
      mode: "inline",
    });
    await waitFor(() => expect(mockInsertCitationFootnote).toHaveBeenCalledTimes(1));
    expect(mockBuildOccurrenceTitle).toHaveBeenCalledWith("auto", {
      type: "paragraph",
      value: "[58]",
    });
  });

  test("a book defaults to a page pinpoint and an empty pinpoint blocks insertion", async () => {
    await renderQuote([mabo, book]);
    fireEvent.click(screen.getByRole("radio", { name: /Unjust Enrichment/ }));
    expect(screen.getByLabelText("Type")).toHaveValue("page");
    fireEvent.change(screen.getByLabelText("Quoted text"), { target: { value: SHORT_PASSAGE } });

    expect(
      screen.getByText("Add a pinpoint for this source type (Rule 1.7.1).")
    ).toBeInTheDocument();
    const insert = screen.getByRole("button", { name: "Insert quotation and footnote" });
    expect(insert).toBeDisabled();
    fireEvent.click(insert);
    expect(mockInsertQuotation).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Value"), { target: { value: "12" } });
    expect(insert).toBeEnabled();
    expect(screen.getByTestId("quote-preview-footnote")).toHaveTextContent(
      "James Edelman, Unjust Enrichment (Hart Publishing, 2016) 12"
    );
  });

  test("search filters the source list and a write error is reported", async () => {
    await renderQuote([mabo, book]);
    fireEvent.change(screen.getByLabelText("Search the library"), { target: { value: "edelman" } });
    expect(screen.queryByRole("radio", { name: /Mabo/ })).toBeNull();
    expect(screen.getByRole("radio", { name: /Unjust Enrichment/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /Unjust Enrichment/ }));
    fireEvent.change(screen.getByLabelText("Quoted text"), { target: { value: SHORT_PASSAGE } });
    fireEvent.change(screen.getByLabelText("Value"), { target: { value: "12" } });
    mockInsertQuotation.mockRejectedValueOnce(new Error("Word is busy"));
    fireEvent.click(screen.getByRole("button", { name: "Insert quotation and footnote" }));
    await waitFor(() => expect(screen.getByText("Word is busy")).toBeInTheDocument());
    expect(mockInsertCitationFootnote).not.toHaveBeenCalled();
  });

  test("Clear resets the passage and pinpoint", async () => {
    await renderQuote([mabo], { citationId: "mabo" });
    fireEvent.change(screen.getByLabelText("Quoted text"), { target: { value: LONG_PASSAGE } });
    expect(screen.getByLabelText("Value")).toHaveValue("42");
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByLabelText("Quoted text")).toHaveValue("");
    expect(screen.getByLabelText("Value")).toHaveValue("");
  });

  test("has no axe violations empty, populated and with a preview", async () => {
    const empty = await renderQuote([]);
    expect(await axe(empty)).toHaveNoViolations();

    const container = await renderQuote([mabo, book], { citationId: "mabo" });
    expect(await axe(container)).toHaveNoViolations();
    fireEvent.change(screen.getByLabelText("Quoted text"), { target: { value: LONG_PASSAGE } });
    expect(await axe(container)).toHaveNoViolations();
  });
});

// ─── ENP-011: passage from a PDF ─────────────────────────────────────────────

const PDF_PAGE_1 =
  "[42] The common law of Australia recognises a form of native title which reflects the entitlement of the indigenous inhabitants to their traditional lands.\n[43] Native title has its origin in the traditional laws acknowledged by the indigenous inhabitants of a territory.";
const PDF_PAGE_2 =
  "The second page carries a short passage on unjust enrichment.\nA restitutionary claim responds to the defendant's enrichment.";

function pdfFile(name = "judgment.pdf", size?: number): File {
  const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], name, {
    type: "application/pdf",
  });
  if (size !== undefined) Object.defineProperty(file, "size", { value: size });
  return file;
}

async function loadPdf(file: File = pdfFile()): Promise<void> {
  fireEvent.change(screen.getByTestId("quote-pdf-input"), { target: { files: [file] } });
  await waitFor(() => expect(mockExtractPdfPages).toHaveBeenCalled());
}

describe("Quote panel: passage from a PDF (ENP-011)", () => {
  beforeEach(() => {
    mockInsertQuotation.mockClear();
    mockExtractPdfPages.mockReset();
    mockExtractPdfPages.mockImplementation(async (_data, onProgress) => {
      onProgress?.(1, 2);
      onProgress?.(2, 2);
      return { pages: [PDF_PAGE_1, PDF_PAGE_2], pageCount: 2 };
    });
  });

  test("loading a PDF shows its pages, the page selector and the page text", async () => {
    await renderQuote([mabo, book], { citationId: "mabo" });
    expect(screen.queryByLabelText("Page")).toBeNull();
    await loadPdf();

    await waitFor(() => expect(screen.getByLabelText("Page")).toBeInTheDocument());
    expect(screen.getByText(/judgment\.pdf \(2 pages\)/)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Page 1 of 2" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Page 2 of 2" })).toBeInTheDocument();
    expect(screen.getByLabelText("Page text")).toHaveValue(PDF_PAGE_1);
    expect(screen.getByLabelText("Page text")).toHaveAttribute("readonly");
    // The passage box is untouched until the user chooses text.
    expect(screen.getByLabelText("Quoted text")).toHaveValue("");
    // The bytes were handed to the loader, and the progress region has settled.
    const [buffer] = mockExtractPdfPages.mock.calls[0];
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(buffer.byteLength).toBe(4);
    expect(screen.queryByText(/Reading page/)).toBeNull();

    fireEvent.change(screen.getByLabelText("Page"), { target: { value: "1" } });
    expect(screen.getByLabelText("Page text")).toHaveValue(PDF_PAGE_2);
  });

  test("Use selection moves the selected text into the passage and the marker gives a paragraph pinpoint", async () => {
    await renderQuote([mabo, book], { citationId: "mabo" });
    await loadPdf();
    await waitFor(() => expect(screen.getByLabelText("Page text")).toBeInTheDocument());

    const pageText = screen.getByLabelText("Page text") as HTMLTextAreaElement;
    const end = PDF_PAGE_1.indexOf("\n");
    pageText.setSelectionRange(0, end);
    fireEvent.click(screen.getByRole("button", { name: "Use selection" }));

    expect(screen.getByLabelText("Quoted text")).toHaveValue(PDF_PAGE_1.slice(0, end));
    expect(screen.getByLabelText("Type")).toHaveValue("paragraph");
    expect(screen.getByLabelText("Value")).toHaveValue("42");
    expect(screen.getByTestId("quote-preview-text")).not.toHaveTextContent("[42]");
    expect(screen.getByTestId("quote-preview-footnote")).toHaveTextContent(
      "Mabo v Queensland (No 2) (1992) 175 CLR 1 [42] (‘Mabo’)."
    );
  });

  test("with nothing selected the whole page is used and a page pinpoint is pre-filled with the offset", async () => {
    await renderQuote([mabo, book], { citationId: "edelman" });
    expect(screen.getByLabelText("Type")).toHaveValue("page");
    await loadPdf();
    await waitFor(() => expect(screen.getByLabelText("Page")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Page"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Page offset"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Use selection" }));

    expect(screen.getByLabelText("Quoted text")).toHaveValue(PDF_PAGE_2);
    expect(screen.getByLabelText("Type")).toHaveValue("page");
    expect(screen.getByLabelText("Value")).toHaveValue("12");
    expect(screen.getByTestId("quote-preview-footnote")).toHaveTextContent(
      "James Edelman, Unjust Enrichment (Hart Publishing, 2016) 12"
    );

    // A value the user already typed is never overwritten.
    fireEvent.change(screen.getByLabelText("Value"), { target: { value: "99" } });
    fireEvent.change(screen.getByLabelText("Page"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Use selection" }));
    expect(screen.getByLabelText("Value")).toHaveValue("99");
    expect(screen.getByLabelText("Quoted text")).toHaveValue(PDF_PAGE_1);
  });

  test("a PDF over 25 MB is refused before it is read", async () => {
    await renderQuote([mabo], { citationId: "mabo" });
    fireEvent.change(screen.getByTestId("quote-pdf-input"), {
      target: { files: [pdfFile("big.pdf", 25 * 1024 * 1024 + 1)] },
    });
    expect(
      await screen.findByText(
        "This PDF is larger than 25 MB. Choose a smaller file or paste the passage."
      )
    ).toBeInTheDocument();
    expect(mockExtractPdfPages).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Page")).toBeNull();
  });

  test("a loader failure is shown with its guidance and other failures plainly", async () => {
    const { PdfTextError } = jest.requireActual("../../src/ui/pdfText") as {
      PdfTextError: new (message: string) => Error;
    };
    await renderQuote([mabo], { citationId: "mabo" });
    mockExtractPdfPages.mockRejectedValueOnce(
      new PdfTextError("This PDF is password protected. Remove the password and try again.")
    );
    await loadPdf();
    expect(
      await screen.findByText("This PDF is password protected. Remove the password and try again.")
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("password protected");

    mockExtractPdfPages.mockRejectedValueOnce(new Error("worker crashed"));
    await loadPdf();
    expect(await screen.findByText("This file could not be read as a PDF.")).toBeInTheDocument();
    expect(screen.queryByText("worker crashed")).toBeNull();
  });

  test("Clear PDF drops the document and Clear leaves it in place", async () => {
    await renderQuote([mabo], { citationId: "mabo" });
    await loadPdf();
    await waitFor(() => expect(screen.getByLabelText("Page")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Use selection" }));
    expect(screen.getByLabelText("Quoted text")).toHaveValue(PDF_PAGE_1);

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByLabelText("Quoted text")).toHaveValue("");
    expect(screen.getByLabelText("Page")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear PDF" }));
    expect(screen.queryByLabelText("Page")).toBeNull();
    expect(screen.queryByLabelText("Page text")).toBeNull();
    expect(screen.queryByRole("button", { name: "Use selection" })).toBeNull();
    expect(screen.getByRole("button", { name: "Load PDF" })).toBeInTheDocument();
  });

  test("has no axe violations with a PDF loaded and after an error", async () => {
    const container = await renderQuote([mabo, book], { citationId: "mabo" });
    await loadPdf();
    await waitFor(() => expect(screen.getByLabelText("Page")).toBeInTheDocument());
    expect(await axe(container)).toHaveNoViolations();

    mockExtractPdfPages.mockRejectedValueOnce(new Error("x"));
    await loadPdf();
    await screen.findByText("This file could not be read as a PDF.");
    expect(await axe(container)).toHaveNoViolations();
  });
});

// ─── ENP-012: summarise and ask with the user's own key ──────────────────────

const anthropicConfig: LLMConfig = {
  provider: "anthropic",
  apiKey: "sk-test",
  model: "claude-sonnet-4-6",
  maxTokens: 1024,
  enabled: true,
};

const NO_PROVIDER = "Configure an LLM provider in Settings to summarise or ask about a passage.";
const words = (text: string): string => String(text.trim().split(/\s+/).length);

describe("Quote panel: summarise and ask (ENP-012)", () => {
  beforeEach(() => {
    mockLlmConfig = anthropicConfig;
    mockSummarisePassage.mockClear();
    mockAskAboutPassage.mockClear();
    mockInsertPlainParagraph.mockClear();
    mockExtractPdfPages.mockReset();
    mockExtractPdfPages.mockImplementation(async () => ({
      pages: [PDF_PAGE_1, PDF_PAGE_2],
      pageCount: 2,
    }));
  });

  afterEach(() => {
    mockLlmConfig = null;
  });

  test("the AI section is a single muted line without an enabled provider", async () => {
    mockLlmConfig = null;
    await renderQuote([mabo], { citationId: "mabo" });
    expect(screen.getByText(NO_PROVIDER)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Summarise: send/ })).toBeNull();

    mockLlmConfig = { ...anthropicConfig, enabled: false };
    await renderQuote([mabo], { citationId: "mabo" });
    expect(screen.getAllByText(NO_PROVIDER).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /^Summarise: send/ })).toBeNull();
  });

  test("Summarise names the provider and the word count, is disabled with no text, and sends exactly the passage", async () => {
    await renderQuote([mabo], { citationId: "mabo" });
    expect(screen.queryByText(NO_PROVIDER)).toBeNull();
    const idle = screen.getByRole("button", { name: "Summarise: send 0 words to Anthropic" });
    expect(idle).toBeDisabled();
    fireEvent.click(idle);
    expect(mockSummarisePassage).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Quoted text"), { target: { value: LONG_PASSAGE } });
    const button = screen.getByRole("button", {
      name: `Summarise: send ${words(LONG_PASSAGE)} words to Anthropic`,
    });
    expect(button).toBeEnabled();
    fireEvent.click(button);

    await waitFor(() => expect(mockSummarisePassage).toHaveBeenCalledTimes(1));
    const [sentText, sentConfig] = mockSummarisePassage.mock.calls[0];
    expect(sentText).toBe(LONG_PASSAGE);
    expect(sentConfig).toBe(anthropicConfig);
    expect(await screen.findByTestId("quote-ai-result")).toHaveTextContent("Summary text");
    expect(screen.getByText("Answers are drawn only from the text you loaded.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Insert as note" }));
    await waitFor(() => expect(mockInsertPlainParagraph).toHaveBeenCalledWith("Summary text"));
    expect(await screen.findByText("Note inserted.")).toBeInTheDocument();
  });

  test("with a PDF loaded, only the ticked pages are sent", async () => {
    await renderQuote([mabo], { citationId: "mabo" });
    await loadPdf();
    await waitFor(() => expect(screen.getByLabelText("Page 2")).toBeInTheDocument());
    expect(screen.getByLabelText("Page 1")).toBeChecked();
    expect(screen.getByLabelText("Page 2")).toBeChecked();
    const both = `${PDF_PAGE_1}\n\n${PDF_PAGE_2}`;
    expect(
      screen.getByRole("button", { name: `Summarise: send ${words(both)} words to Anthropic` })
    ).toBeEnabled();

    fireEvent.click(screen.getByLabelText("Page 2"));
    expect(screen.getByLabelText("Page 2")).not.toBeChecked();
    const button = screen.getByRole("button", {
      name: `Summarise: send ${words(PDF_PAGE_1)} words to Anthropic`,
    });
    fireEvent.click(button);
    await waitFor(() => expect(mockSummarisePassage).toHaveBeenCalledTimes(1));
    const [sentText] = mockSummarisePassage.mock.calls[0];
    expect(sentText).toBe(PDF_PAGE_1);
    expect(sentText).not.toContain("unjust enrichment");

    // Select none disables the send; Select all restores both pages.
    fireEvent.click(screen.getByRole("button", { name: "Select all" }));
    expect(screen.getByLabelText("Page 2")).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Select none" }));
    expect(screen.getByLabelText("Page 1")).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Summarise: send 0 words to Anthropic" })).toBeDisabled();
  });

  test("Ask sends the question with the passage and renders the answer", async () => {
    await renderQuote([mabo], { citationId: "mabo" });
    fireEvent.change(screen.getByLabelText("Quoted text"), { target: { value: SHORT_PASSAGE } });
    const ask = screen.getByRole("button", {
      name: `Ask: send ${words(SHORT_PASSAGE)} words to Anthropic`,
    });
    expect(ask).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Question"), {
      target: { value: "What does the common law recognise?" },
    });
    expect(ask).toBeEnabled();
    fireEvent.click(ask);
    await waitFor(() => expect(mockAskAboutPassage).toHaveBeenCalledTimes(1));
    const [sentText, question, sentConfig] = mockAskAboutPassage.mock.calls[0];
    expect(sentText).toBe(SHORT_PASSAGE);
    expect(question).toBe("What does the common law recognise?");
    expect(sentConfig).toBe(anthropicConfig);
    expect(await screen.findByTestId("quote-ai-result")).toHaveTextContent("Answer text [42]");
    expect(mockSummarisePassage).not.toHaveBeenCalled();
  });

  test("an authentication failure is shown with the Settings hint", async () => {
    await renderQuote([mabo], { citationId: "mabo" });
    fireEvent.change(screen.getByLabelText("Quoted text"), { target: { value: SHORT_PASSAGE } });
    mockSummarisePassage.mockRejectedValueOnce(
      new Error("anthropic API error (401): invalid x-api-key")
    );
    fireEvent.click(screen.getByRole("button", { name: /^Summarise: send/ }));
    expect(
      await screen.findByText(
        "anthropic API error (401): invalid x-api-key Check your key and model in Settings."
      )
    ).toBeInTheDocument();
    expect(screen.queryByTestId("quote-ai-result")).toBeNull();
  });

  test("has no axe violations with the AI section visible, with pages and with a result", async () => {
    const container = await renderQuote([mabo, book], { citationId: "mabo" });
    expect(await axe(container)).toHaveNoViolations();
    await loadPdf();
    await waitFor(() => expect(screen.getByLabelText("Page 2")).toBeInTheDocument());
    expect(await axe(container)).toHaveNoViolations();
    fireEvent.click(screen.getByRole("button", { name: /^Summarise: send/ }));
    await screen.findByTestId("quote-ai-result");
    expect(await axe(container)).toHaveNoViolations();
  });
});
