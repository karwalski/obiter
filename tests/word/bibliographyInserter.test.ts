/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * COURT-116: List of Authorities and bibliography insertion against a
 * minimal fake Word (no Office.js). Entries take the style of the paragraph
 * at the cursor when asked (register O-K9: entries were forced to Normal);
 * the default stays Normal; a section with no heading (WA PD 2.1 cl 13
 * closing statement) inserts no heading paragraph; syncs do not grow with
 * the number of entries (perf rule).
 */

import { insertBibliographyIntoDocument } from "../../src/word/bibliographyInserter";
import type { BibliographySection } from "../../src/engine/rules/v4/general/bibliography";

class FakeParagraph {
  style = "";
  alignment = "";
  spaceBefore = 0;
  spaceAfter = 0;
  font: { italic?: boolean } = {};
  html = "";
  constructor(
    public readonly text: string,
    private readonly doc: FakeDoc
  ) {}
  insertParagraph(text: string, _location: string): FakeParagraph {
    return this.doc.add(text);
  }
  insertHtml(html: string, _location: string): void {
    this.html = html;
  }
}

class FakeDoc {
  paragraphs: FakeParagraph[] = [];
  syncs = 0;
  constructor(
    public readonly cursorStyle: string,
    public readonly cursorAlignment: string,
    public readonly cursorStyleBuiltIn = "Other"
  ) {}
  add(text: string): FakeParagraph {
    const p = new FakeParagraph(text, this);
    this.paragraphs.push(p);
    return p;
  }
}

function installFakeWord(doc: FakeDoc): void {
  const cursorParagraph = {
    style: doc.cursorStyle,
    styleBuiltIn: doc.cursorStyleBuiltIn,
    alignment: doc.cursorAlignment,
    load: jest.fn(),
  };
  const selection = {
    paragraphs: { getFirst: () => cursorParagraph },
    insertParagraph: (text: string, _location: string): FakeParagraph => doc.add(text),
  };
  const context = {
    document: { getSelection: () => selection },
    sync: async (): Promise<void> => {
      doc.syncs += 1;
    },
  };
  (global as Record<string, unknown>).Word = {
    run: async <T>(callback: (ctx: typeof context) => Promise<T>): Promise<T> => callback(context),
    InsertLocation: { after: "After", replace: "Replace" },
    Alignment: { centered: "Centered", left: "Left" },
  };
}

const run = (text: string) => [{ text }];

const SECTIONS: BibliographySection[] = [
  {
    heading: "Cases",
    entries: [
      run("Pape v Commissioner of Taxation (2009) 238 CLR 1"),
      run("Roach v Electoral Commissioner (2007) 233 CLR 162"),
    ],
  },
  { heading: "Legislation", entries: [run("Competition and Consumer Act 2010 (Cth)")] },
];

describe("COURT-116: insertBibliographyIntoDocument entry style", () => {
  it("'inherit': entries take the style and alignment of the paragraph at the cursor", async () => {
    const doc = new FakeDoc("Submissions Body", "Justified");
    installFakeWord(doc);
    await insertBibliographyIntoDocument(SECTIONS, "inherit");
    const entries = doc.paragraphs.filter((p) => p.text === "");
    expect(entries).toHaveLength(3);
    expect(entries.every((p) => p.style === "Submissions Body")).toBe(true);
    expect(entries.every((p) => p.alignment === "Justified")).toBe(true);
    // Headings keep the AGLC4 r 1.13 direct formatting.
    const headings = doc.paragraphs.filter((p) => p.text !== "");
    expect(headings.map((p) => p.text)).toEqual(["Cases", "Legislation"]);
    expect(headings.every((p) => p.alignment === "Centered" && p.font.italic)).toBe(true);
  });

  it("'inherit' with a mixed alignment falls back to left", async () => {
    const doc = new FakeDoc("Body", "Mixed");
    installFakeWord(doc);
    await insertBibliographyIntoDocument(SECTIONS, "inherit");
    expect(doc.paragraphs.filter((p) => p.text === "").every((p) => p.alignment === "Left")).toBe(
      true
    );
  });

  it("'inherit' with the cursor in a heading falls back to Normal", async () => {
    const doc = new FakeDoc("Heading 1", "Centered", "Heading1");
    installFakeWord(doc);
    await insertBibliographyIntoDocument(SECTIONS, "inherit");
    const entries = doc.paragraphs.filter((p) => p.text === "");
    expect(entries.every((p) => p.style === "Normal" && p.alignment === "Left")).toBe(true);
  });

  it("default: entries are Normal and left-aligned, as before", async () => {
    const doc = new FakeDoc("Submissions Body", "Justified");
    installFakeWord(doc);
    await insertBibliographyIntoDocument(SECTIONS);
    const entries = doc.paragraphs.filter((p) => p.text === "");
    expect(entries.every((p) => p.style === "Normal" && p.alignment === "Left")).toBe(true);
  });

  it("a section with no heading (WA PD 2.1 cl 13 statement) inserts no heading paragraph", async () => {
    const doc = new FakeDoc("Body", "Left");
    installFakeWord(doc);
    await insertBibliographyIntoDocument(
      [
        { heading: "Cases", entries: [run("Pape v Commissioner of Taxation (2009) 238 CLR 1")] },
        {
          heading: "",
          entries: [run("Counsel do not intend to read from any of the cases listed.")],
        },
      ],
      "inherit"
    );
    expect(doc.paragraphs.map((p) => p.text)).toEqual(["Cases", "", ""]);
    expect(doc.paragraphs[2].html).toContain("Counsel do not intend");
  });

  it("the number of syncs does not depend on the number of entries", async () => {
    const small = new FakeDoc("Body", "Left");
    installFakeWord(small);
    await insertBibliographyIntoDocument(SECTIONS, "inherit");
    const large = new FakeDoc("Body", "Left");
    installFakeWord(large);
    const many: BibliographySection[] = [
      { heading: "Cases", entries: Array.from({ length: 40 }, (_, i) => run(`Case ${i}`)) },
    ];
    await insertBibliographyIntoDocument(many, "inherit");
    expect(large.syncs).toBe(small.syncs);
  });
});
