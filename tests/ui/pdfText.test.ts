/**
 * @jest-environment jsdom
 *
 * ENP-011: reading a PDF's text layer for the Quote panel. pdf.js is mocked
 * (the real worker cannot run under Jest); the joiner is exercised with
 * text items shaped like pdf.js's `TextItem`, including the item stream the
 * real library produces for tests/fixtures/pdf/two-pages.pdf.
 */

import * as fs from "fs";
import * as path from "path";
import {
  extractPdfPages,
  joinPageText,
  describePdfError,
  PdfTextError,
  PDF_INVALID_MESSAGE,
  PDF_NO_TEXT_MESSAGE,
  PDF_PASSWORD_MESSAGE,
} from "../../src/ui/pdfText";

interface MockItem {
  str: string;
  hasEOL: boolean;
  transform: number[];
  width: number;
  height: number;
}

function item(str: string, x: number, y: number, hasEOL = false, width = str.length * 5): MockItem {
  return { str, hasEOL, transform: [12, 0, 0, 12, x, y], width, height: 12 };
}

/** Text items as pdf.js returns them for tests/fixtures/pdf/two-pages.pdf. */
const FIXTURE_ITEMS: MockItem[][] = [
  [
    item("[42] The common law of Australia recognises a form of native title", 72, 740, true, 347),
    item(
      "which reflects the entitlement of the indigenous inhabitants to their",
      72,
      726,
      true,
      351
    ),
    item("traditional lands.", 72, 712, true, 87),
    item(
      "[43] Native title has its origin in the traditional laws acknowledged",
      72,
      684,
      true,
      345
    ),
    item("by the indigenous inhabitants of a territory.", 72, 670, false, 226),
  ],
  [
    item("The second page carries a short passage on unjust enrichment.", 72, 740, true, 339),
    item("A restitutionary claim responds to the defendant's enrichment.", 72, 712, false, 328),
  ],
];

let mockPageItems: unknown[][] = [];
let mockLoadError: Error | null = null;
const mockDestroy = jest.fn(async () => undefined);
const mockGetDocument = jest.fn((params: { data: Uint8Array }) => ({
  promise: mockLoadError
    ? Promise.reject(mockLoadError)
    : Promise.resolve({
        numPages: mockPageItems.length,
        getPage: async (n: number) => ({
          getTextContent: async () => ({ items: mockPageItems[n - 1] }),
          cleanup: () => true,
        }),
        destroy: mockDestroy,
        byteLength: params.data.byteLength,
      }),
}));
const mockWorkerOptions = { workerSrc: "", workerPort: null };

jest.mock("pdfjs-dist/legacy/build/pdf.min.mjs", () => ({
  __esModule: true,
  getDocument: (params: { data: Uint8Array }): unknown => mockGetDocument(params),
  GlobalWorkerOptions: mockWorkerOptions,
  PasswordException: class MockPasswordException extends Error {
    name = "PasswordException";
  },
}));
jest.mock("pdfjs-dist/legacy/build/pdf.worker.min.mjs", () => ({
  __esModule: true,
  default: "pdf.worker.abcdef12.js",
}));

function pdfError(name: string): Error {
  const err = new Error(name);
  err.name = name;
  return err;
}

describe("joinPageText (ENP-011)", () => {
  test("keeps paragraphs on a vertical gap or a paragraph marker and joins visual lines with spaces", () => {
    expect(joinPageText(FIXTURE_ITEMS[0])).toBe(
      "[42] The common law of Australia recognises a form of native title which reflects the entitlement of the indigenous inhabitants to their traditional lands.\n" +
        "[43] Native title has its origin in the traditional laws acknowledged by the indigenous inhabitants of a territory."
    );
    expect(joinPageText(FIXTURE_ITEMS[1])).toBe(
      "The second page carries a short passage on unjust enrichment.\n" +
        "A restitutionary claim responds to the defendant's enrichment."
    );
  });

  test("joins kerned fragments of one word without a space and separates words across a gap", () => {
    const items = [
      item("Ma", 72, 700, false, 12),
      item("bo", 84, 700, false, 12), // touches the previous fragment
      item("v", 104, 700, false, 6), // clear gap
      item("Queensland", 118, 700, false, 60),
    ];
    expect(joinPageText(items)).toBe("Mabo v Queensland");
  });

  test("rejoins a hyphenated line end and ignores marked-content items", () => {
    const items: unknown[] = [
      { type: "beginMarkedContent", id: "p1" },
      item("The doctrine of unjust enrich-", 72, 700, true),
      item("ment is not a cause of action.", 72, 686, true),
      { type: "endMarkedContent" },
    ];
    expect(joinPageText(items)).toBe("The doctrine of unjust enrichment is not a cause of action.");
  });

  test("falls back to hasEOL and plain spaces when no geometry is present", () => {
    const items: unknown[] = [
      { str: "one", hasEOL: false },
      { str: "two", hasEOL: true },
      { str: "three", hasEOL: false },
    ];
    expect(joinPageText(items)).toBe("one two three");
    expect(joinPageText([])).toBe("");
  });
});

describe("extractPdfPages (ENP-011)", () => {
  beforeEach(() => {
    mockPageItems = [];
    mockLoadError = null;
    mockGetDocument.mockClear();
    mockDestroy.mockClear();
    mockWorkerOptions.workerSrc = "";
  });

  test("extracts every page with paragraph breaks, reports progress and releases the document", async () => {
    mockPageItems = FIXTURE_ITEMS;
    const buffer = new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer;
    const progress: [number, number][] = [];
    const result = await extractPdfPages(buffer, (page, total) => progress.push([page, total]));

    expect(result.pageCount).toBe(2);
    expect(result.pages[0]).toContain("native title which reflects");
    expect(result.pages[0].split("\n")).toHaveLength(2);
    expect(result.pages[1]).toMatch(/^The second page/);
    expect(progress).toEqual([
      [1, 2],
      [2, 2],
    ]);
    expect(mockDestroy).toHaveBeenCalledTimes(1);
    // The worker is the same-origin asset webpack emitted; no CDN, no blob:.
    expect(mockWorkerOptions.workerSrc).toBe("pdf.worker.abcdef12.js");
    // pdf.js is never allowed to eval (the CSP has no 'unsafe-eval').
    const params = mockGetDocument.mock.calls[0][0] as {
      isEvalSupported?: boolean;
      data: Uint8Array;
    };
    expect(params.isEvalSupported).toBe(false);
    expect(params.data).toBeInstanceOf(Uint8Array);
  });

  test("a password-protected PDF reports what to do", async () => {
    mockLoadError = pdfError("PasswordException");
    await expect(extractPdfPages(new ArrayBuffer(4))).rejects.toThrow(PDF_PASSWORD_MESSAGE);
    await expect(extractPdfPages(new ArrayBuffer(4))).rejects.toBeInstanceOf(PdfTextError);
  });

  test("a PDF without a text layer suggests pasting instead", async () => {
    mockPageItems = [[item("a", 72, 700)], [], [item("b c", 72, 700)]];
    await expect(extractPdfPages(new ArrayBuffer(4))).rejects.toThrow(PDF_NO_TEXT_MESSAGE);
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  test("a file that is not a PDF is reported plainly", async () => {
    mockLoadError = pdfError("InvalidPDFException");
    await expect(extractPdfPages(new ArrayBuffer(4))).rejects.toThrow(PDF_INVALID_MESSAGE);
  });

  test("describePdfError shows loader messages and hides everything else", () => {
    expect(describePdfError(new PdfTextError(PDF_PASSWORD_MESSAGE))).toBe(PDF_PASSWORD_MESSAGE);
    expect(describePdfError(new Error("TypeError: worker"))).toBe(PDF_INVALID_MESSAGE);
    expect(describePdfError("x")).toBe(PDF_INVALID_MESSAGE);
  });

  test("the two-page fixture is a well-formed PDF (real parsing is covered by the Node check, not Jest)", () => {
    const fixture = fs.readFileSync(
      path.join(__dirname, "../fixtures/pdf/two-pages.pdf"),
      "latin1"
    );
    expect(fixture.startsWith("%PDF-1.4")).toBe(true);
    expect(fixture).toContain("/Type /Pages /Kids [4 0 R 6 0 R] /Count 2");
    expect(fixture.trimEnd().endsWith("%%EOF")).toBe(true);
    const startxref = Number(/startxref\n(\d+)/.exec(fixture)?.[1]);
    expect(fixture.slice(startxref, startxref + 4)).toBe("xref");
  });
});
