/**
 * ENP-010: quotation insertion against a minimal fake Word (no Office.js).
 * Verifies the block path inserts one styled paragraph per line and leaves
 * the selection at the end of the last one (so the footnote lands after the
 * quotation, Rule 1.1.3), the direct-formatting fallback when the AGLC4 style
 * is absent, and the inline path.
 */

import { insertPlainParagraph, insertQuotation } from "../../src/word/quotationInserter";

interface FakeRange {
  selected: boolean;
  getRange(location: string): FakeRange;
  select(): void;
}

function makeRange(): FakeRange {
  const range: FakeRange = {
    selected: false,
    getRange: () => range,
    select: () => {
      range.selected = true;
    },
  };
  return range;
}

class FakeParagraph {
  style = "";
  styleBuiltIn?: string;
  font: { size?: number } = {};
  leftIndent?: number;
  lineSpacing?: number;
  end = makeRange();
  constructor(
    public readonly text: string,
    private readonly doc: FakeDoc
  ) {}
  insertParagraph(text: string, _location: string): FakeParagraph {
    return this.doc.addParagraph(text);
  }
  getRange(_location: string): FakeRange {
    return this.end;
  }
}

class FakeDoc {
  paragraphs: FakeParagraph[] = [];
  insertedText: string[] = [];
  lastInsertedRange = makeRange();
  constructor(public readonly installedStyles: string[]) {}
  addParagraph(text: string): FakeParagraph {
    const p = new FakeParagraph(text, this);
    this.paragraphs.push(p);
    return p;
  }
}

function installFakeWord(doc: FakeDoc): void {
  const selection = {
    insertParagraph: (text: string, _location: string): FakeParagraph => doc.addParagraph(text),
    insertText: (text: string, _location: string): FakeRange => {
      doc.insertedText.push(text);
      return doc.lastInsertedRange;
    },
  };
  const context = {
    document: { getSelection: () => selection },
    sync: async (): Promise<void> => {
      // Word rejects an unknown style name at sync time.
      for (const p of doc.paragraphs) {
        if (p.style && !doc.installedStyles.includes(p.style)) {
          p.style = "";
          throw new Error("InvalidArgument");
        }
      }
    },
  };
  (global as Record<string, unknown>).Word = {
    run: async <T>(callback: (ctx: typeof context) => Promise<T>): Promise<T> => callback(context),
  };
}

describe("insertQuotation", () => {
  it("block: one styled paragraph per line, selection at the end of the last", async () => {
    const doc = new FakeDoc(["AGLC4 Block Quote"]);
    installFakeWord(doc);
    await insertQuotation({ text: "First paragraph.\nSecond paragraph.", mode: "block" });
    expect(doc.paragraphs.map((p) => p.text)).toEqual(["First paragraph.", "Second paragraph."]);
    expect(doc.paragraphs.every((p) => p.style === "AGLC4 Block Quote")).toBe(true);
    expect(doc.paragraphs[0].end.selected).toBe(false);
    expect(doc.paragraphs[1].end.selected).toBe(true);
    expect(doc.insertedText).toEqual([]);
  });

  it("block: falls back to direct formatting when the style is missing", async () => {
    const doc = new FakeDoc([]);
    installFakeWord(doc);
    await insertQuotation({ text: "Only paragraph.", mode: "block" });
    const [p] = doc.paragraphs;
    expect(p.style).toBe("");
    expect(p.font.size).toBe(10);
    expect(p.leftIndent).toBe(36);
    expect(p.lineSpacing).toBe(12);
    expect(p.end.selected).toBe(true);
  });

  it("inline: replaces the selection and selects the end of the inserted range", async () => {
    const doc = new FakeDoc(["AGLC4 Block Quote"]);
    installFakeWord(doc);
    await insertQuotation({ text: "‘Short.’", mode: "inline" });
    expect(doc.insertedText).toEqual(["‘Short.’"]);
    expect(doc.lastInsertedRange.selected).toBe(true);
    expect(doc.paragraphs).toEqual([]);
  });

  it("propagates Word errors", async () => {
    (global as Record<string, unknown>).Word = {
      run: async (): Promise<never> => {
        throw new Error("NotAllowed");
      },
    };
    await expect(insertQuotation({ text: "x", mode: "inline" })).rejects.toThrow("NotAllowed");
  });
});

// ─── ENP-012: plain paragraphs for "Insert as note" ──────────────────────────

describe("insertPlainParagraph", () => {
  it("inserts one Normal paragraph per line, no quotation style, selection at the end", async () => {
    const doc = new FakeDoc(["AGLC4 Block Quote"]);
    installFakeWord(doc);
    await insertPlainParagraph("Facts\nThe appellant sued.\n\nOrders\nAppeal dismissed [42].");
    expect(doc.paragraphs.map((p) => p.text)).toEqual([
      "Facts",
      "The appellant sued.",
      "Orders",
      "Appeal dismissed [42].",
    ]);
    expect(doc.paragraphs.every((p) => p.style === "")).toBe(true);
    expect(doc.paragraphs.every((p) => p.styleBuiltIn === "Normal")).toBe(true);
    expect(doc.paragraphs[0].end.selected).toBe(false);
    expect(doc.paragraphs[3].end.selected).toBe(true);
    expect(doc.insertedText).toEqual([]);
  });

  it("propagates Word errors", async () => {
    (global as Record<string, unknown>).Word = {
      run: async (): Promise<never> => {
        throw new Error("NotAllowed");
      },
    };
    await expect(insertPlainParagraph("x")).rejects.toThrow("NotAllowed");
  });
});
