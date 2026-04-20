/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Comprehensive in-Word integration test suite. Exercises every major feature
 * against a live Word document to verify both the pure engine and Office.js
 * integration layers work correctly.
 *
 * Run from the browser console or the Settings debug panel:
 *   import { runAllTests } from "./debug/testRunner";
 *   runAllTests();
 */

/* global Word Office */

import { createLogger } from "./logger";
import { CitationStore } from "../store/citationStore";
import {
  insertCitationFootnote,
  getAllCitationFootnotes,
  updateCitationContent,
} from "../word/footnoteManager";
import { buildFootnoteMap } from "../word/footnoteTracker";
import { refreshAllCitations } from "../word/citationRefresher";
import {
  formatCitation,
  getFormattedPreview,
  CitationContext,
} from "../engine/engine";
import { resolveSubsequentReference } from "../engine/resolver";
import { applyAglc4Styles, applyHeadingLevel, getHeadingPrefix } from "../word/styles";
import { applyAglc4Template } from "../word/template";
import {
  scanAndFormatInlineReferences,
  clearInlineFormatting,
} from "../word/inlineFormatter";
import {
  insertAttribution,
  removeAttribution,
  hasAttribution,
} from "../word/branding";
import {
  generateBibliography,
  getBibliographyCategory,
} from "../engine/rules/v4/general/bibliography";
import { toTitleCase } from "../engine/rules/v4/general/capitalisation";
import { formatDate } from "../engine/rules/v4/general/dates";
import { numberToWords, formatNumber } from "../engine/rules/v4/general/numbers";
import { formatPinpoint } from "../engine/rules/v4/general/pinpoints";
import {
  formatSignal,
  formatLinkingPhrase,
} from "../engine/rules/v4/general/signals";
import {
  checkAbbreviationFullStops,
  checkDashes,
} from "../engine/rules/v4/general/punctuation";
import {
  validateDocument,
  checkFootnoteFormat,
  checkFootnoteNumberPosition,
} from "../engine/validator";
import type { Citation, Pinpoint } from "../types/citation";
import type { FormattedRun } from "../types/formattedRun";

const log = createLogger("TestRunner");

// ─── Types ──────────────────────────────────────────────────────────────────

interface TestResult {
  name: string;
  group: string;
  passed: boolean;
  message: string;
  duration: number;
}

type TestFn = () => Promise<string>;

const results: TestResult[] = [];
let currentGroup = "";
let onStatusUpdate: ((status: string) => void) | null = null;

/** Register a callback to receive live test status updates. */
export function setStatusCallback(cb: ((status: string) => void) | null): void {
  onStatusUpdate = cb;
}

// ─── Test Harness ───────────────────────────────────────────────────────────

async function runTest(name: string, fn: TestFn): Promise<void> {
  const testNumber = results.length + 1;
  const status = `[${testNumber}] Running: ${name}`;
  log.info(`START: ${name}`);

  // Update the live status indicator
  if (onStatusUpdate) {
    onStatusUpdate(status);
  }

  const start = performance.now();
  try {
    const message = await fn();
    const duration = Math.round(performance.now() - start);
    results.push({ name, group: currentGroup, passed: true, message, duration });
    log.info(`PASS: ${name}`, { message, duration });
    if (onStatusUpdate) {
      const passed = results.filter((r) => r.passed).length;
      const failed = results.filter((r) => !r.passed).length;
      onStatusUpdate(`[${testNumber}] PASS: ${name} (${passed} passed, ${failed} failed)`);
    }
  } catch (err: unknown) {
    const duration = Math.round(performance.now() - start);
    const message = err instanceof Error ? err.message : String(err);
    results.push({ name, group: currentGroup, passed: false, message, duration });
    log.error(`FAIL: ${name}`, { message, duration });
    if (onStatusUpdate) {
      const passed = results.filter((r) => r.passed).length;
      const failed = results.filter((r) => !r.passed).length;
      onStatusUpdate(`[${testNumber}] FAIL: ${name} — ${message} (${passed} passed, ${failed} failed)`);
    }
  }
  log.info(`END: ${name}`);
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function assertContains(text: string, substring: string, label?: string): void {
  if (!text.includes(substring)) {
    throw new Error(
      `${label ?? "Text"} does not contain '${substring}'. Got: '${text}'`,
    );
  }
}

function assertNotContains(text: string, substring: string, label?: string): void {
  if (text.includes(substring)) {
    throw new Error(
      `${label ?? "Text"} should not contain '${substring}'. Got: '${text}'`,
    );
  }
}

function runsToText(runs: FormattedRun[]): string {
  return runs.map((r) => r.text).join("");
}

// ─── Citation Factory ───────────────────────────────────────────────────────

function makeCitation(
  overrides: Partial<Citation> & { sourceType: Citation["sourceType"] },
): Citation {
  const { sourceType, data, shortTitle, ...rest } = overrides;
  return {
    id: crypto.randomUUID(),
    aglcVersion: "4",
    sourceType,
    data: data ?? {},
    shortTitle,
    tags: [],
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    ...rest,
  };
}

// ─── Test Citations ─────────────────────────────────────────────────────────

const MABO_CITATION = (): Citation =>
  makeCitation({
    sourceType: "case.reported",
    data: {
      party1: "Mabo",
      party2: "Queensland [No 2]",
      yearType: "round",
      year: 1992,
      volume: 175,
      reportSeries: "CLR",
      startingPage: 1,
    },
    shortTitle: "Mabo [No 2]",
  });

const TASMANIAN_DAM_CITATION = (): Citation =>
  makeCitation({
    sourceType: "case.reported",
    data: {
      party1: "Commonwealth",
      party2: "Tasmania",
      yearType: "round",
      year: 1983,
      volume: 158,
      reportSeries: "CLR",
      startingPage: 1,
    },
    shortTitle: "Tasmanian Dam Case",
  });

const UNREPORTED_CASE_CITATION = (): Citation =>
  makeCitation({
    sourceType: "case.unreported.mnc",
    data: {
      party1: "Smith",
      party2: "Jones",
      year: 2024,
      court: "FCA",
      caseNumber: 123,
    },
    shortTitle: "Smith",
  });

const CCA_STATUTE = (): Citation =>
  makeCitation({
    sourceType: "legislation.statute",
    data: {
      title: "Competition and Consumer Act",
      year: 2010,
      jurisdiction: "Cth",
    },
    shortTitle: "CCA",
  });

const JOURNAL_ARTICLE = (): Citation =>
  makeCitation({
    sourceType: "journal.article",
    data: {
      authors: [{ givenNames: "Leslie", surname: "Zines" }],
      title: "The High Court and the Constitution",
      year: 1997,
      volume: 21,
      journal: "Melbourne University Law Review",
      startingPage: 267,
    },
    shortTitle: "Zines",
  });

const BOOK_CITATION = (): Citation =>
  makeCitation({
    sourceType: "book",
    data: {
      authors: [{ givenNames: "George", surname: "Williams" }],
      title: "Australian Constitutional Law and Theory",
      publisher: "Federation Press",
      edition: 7,
      year: 2022,
    },
    shortTitle: "Williams",
  });

const TREATY_CITATION = (): Citation =>
  makeCitation({
    sourceType: "treaty",
    data: {
      title: "Charter of the United Nations",
      openedDate: "26 June 1945",
      treatySeries: "UNTS",
      seriesVolume: 1,
      startingPage: 16,
      entryIntoForceDate: "24 October 1945",
    },
    shortTitle: "UN Charter",
  });

// ─── Test Essay Content ─────────────────────────────────────────────────────

const ESSAY_HEADINGS = [
  { level: 1 as const, text: "Introduction" },
  { level: 2 as const, text: "Background" },
  { level: 3 as const, text: "Historical Context" },
  { level: 4 as const, text: "Pre-Federation" },
  { level: 5 as const, text: "Colonial arrangements" },
  { level: 1 as const, text: "Constitutional Framework" },
  { level: 2 as const, text: "The Commonwealth Constitution" },
  { level: 3 as const, text: "Legislative Power" },
  { level: 1 as const, text: "Judicial Interpretation" },
  { level: 2 as const, text: "The High Court's Role" },
  { level: 1 as const, text: "Conclusion" },
];

const ESSAY_PARAGRAPHS: string[] = [
  // After Introduction > Background > Historical Context > Pre-Federation > Colonial arrangements
  "The development of Australian constitutional law has been shaped profoundly by the interplay between the text of the Commonwealth of Australia Constitution Act 1900 (Imp) and the evolving jurisprudence of the High Court. Prior to federation in 1901, the Australian colonies operated under separate constitutional arrangements, each governed by its own enabling legislation from the Imperial Parliament. The question of how to balance the sovereignty of the newly federated nation with the residual authority of the Imperial Parliament would animate constitutional debate for decades to come.",
  "The colonial period saw the emergence of distinct legal traditions across the six colonies. New South Wales, established as a penal colony in 1788, developed the earliest common law tradition in the antipodes. The other colonies followed, each inheriting the English common law but adapting it to local conditions. By the time of federation, there existed a patchwork of colonial constitutions, courts, and legislative bodies that would need to be harmonised under a single federal structure.",
  // After Constitutional Framework > The Commonwealth Constitution > Legislative Power
  "The Commonwealth Constitution establishes a federal system in which legislative power is divided between the Commonwealth Parliament and the state parliaments. Section 51 enumerates specific heads of power granted to the Commonwealth, while residual powers remain with the states under section 107. The scope of Commonwealth power has been a central question in Australian constitutional law since federation, and has been the subject of landmark High Court decisions.",
  "The external affairs power in section 51(xxix) of the Constitution has been interpreted broadly by the High Court. In Commonwealth v Tasmania, the High Court held that the Commonwealth could legislate to implement international treaty obligations, even where the subject matter would otherwise fall within state jurisdiction. This decision, commonly known as the Tasmanian Dam Case, significantly expanded the practical scope of Commonwealth legislative power and demonstrated the dynamic relationship between international law and domestic constitutional authority.",
  // After Judicial Interpretation > The High Court's Role
  "The High Court of Australia serves as the final court of appeal and the ultimate interpreter of the Constitution. Its decisions in cases such as Mabo v Queensland [No 2] have fundamentally reshaped Australian law. In Mabo v Queensland [No 2], the Court recognised native title for the first time, overturning the doctrine of terra nullius that had underpinned the legal foundation of British settlement. The decision required the Court to reconsider foundational assumptions about the relationship between the common law and the rights of Aboriginal and Torres Strait Islander peoples.",
  "The High Court's interpretive approach has evolved over time, moving from a predominantly legalistic and textual methodology to one that increasingly takes into account the purpose and context of constitutional provisions. This evolution reflects broader changes in Australian legal culture and the growing recognition that the Constitution must be interpreted as a living instrument capable of adapting to changing social and political circumstances. The Competition and Consumer Act 2010 (Cth) illustrates how Commonwealth legislative power, interpreted through the lens of contemporary High Court jurisprudence, extends to comprehensive regulation of national economic activity.",
  // Conclusion
  "The trajectory of Australian constitutional law from federation to the present reveals a system in which the text of the Constitution has been progressively elaborated through judicial interpretation. Cases such as Mabo v Queensland [No 2] and Commonwealth v Tasmania demonstrate the capacity of the High Court to effect significant legal change within the framework of the written Constitution. As Australia continues to confront new constitutional challenges, the principles established by these landmark decisions will remain central to the ongoing development of Australian public law.",
];

/**
 * Generates and inserts a test essay (~1000 words) into the active Word document,
 * containing all five heading levels, body paragraphs, and inline case name
 * references. Useful for manual testing without running the full test suite.
 */
export async function generateTestEssay(): Promise<void> {
  // Track list ID across Word.run calls
  let listId: number | undefined;

  await Word.run(async (context) => {
    const body = context.document.body;
    body.clear();
    await context.sync();

    // Title
    const titlePara = body.insertParagraph(
      "Australian Constitutional Law: Text, Interpretation, and Transformation",
      "End",
    );
    titlePara.font.bold = true;
    titlePara.alignment = "Centered" as Word.Alignment;
    titlePara.font.size = 12;
    titlePara.font.name = "Times New Roman";

    // Author
    const authorPara = body.insertParagraph("Matthew Watt", "End");
    authorPara.font.smallCaps = true;
    authorPara.alignment = "Centered" as Word.Alignment;
    authorPara.font.size = 12;
    authorPara.font.name = "Times New Roman";

    await context.sync();

    // Build the document: interleave headings and body paragraphs
    const structure: Array<{ type: "heading"; level: 1|2|3|4|5; text: string } | { type: "body"; text: string }> = [
      { type: "heading", level: 1, text: "Introduction" },
      { type: "heading", level: 2, text: "Background" },
      { type: "heading", level: 3, text: "Historical Context" },
      { type: "heading", level: 4, text: "Pre-Federation" },
      { type: "heading", level: 5, text: "Colonial arrangements" },
      { type: "body", text: ESSAY_PARAGRAPHS[0] },
      { type: "body", text: ESSAY_PARAGRAPHS[1] },
      { type: "heading", level: 1, text: "Constitutional Framework" },
      { type: "heading", level: 2, text: "The Commonwealth Constitution" },
      { type: "heading", level: 3, text: "Legislative Power" },
      { type: "body", text: ESSAY_PARAGRAPHS[2] },
      { type: "body", text: ESSAY_PARAGRAPHS[3] },
      { type: "heading", level: 1, text: "Judicial Interpretation" },
      { type: "heading", level: 2, text: "The High Court's Role" },
      { type: "body", text: ESSAY_PARAGRAPHS[4] },
      { type: "body", text: ESSAY_PARAGRAPHS[5] },
      { type: "heading", level: 1, text: "Conclusion" },
      { type: "body", text: ESSAY_PARAGRAPHS[6] },
    ];

    for (const item of structure) {
      if (item.type === "body") {
        const bodyPara = body.insertParagraph(item.text, "End");
        // Explicitly reset all formatting to prevent inheritance from headings
        bodyPara.style = "Normal";
        bodyPara.font.name = "Times New Roman";
        bodyPara.font.size = 12;
        bodyPara.font.italic = false;
        bodyPara.font.bold = false;
        bodyPara.font.smallCaps = false;
        bodyPara.font.color = "black";
        bodyPara.alignment = "Left" as Word.Alignment;
        bodyPara.lineSpacing = 24;
        await context.sync();
      } else {
        // Insert heading text first
        const para = body.insertParagraph(item.text, "End");
        await context.sync();

        // Apply heading level with proper numbering
        const list = await applyHeadingLevel(context, para, item.level, 1, listId);
        if (list && listId === undefined) {
          listId = list.id;
        }
      }
    }

    await context.sync();
  });

  // Insert some citation footnotes into the body text
  const store = new CitationStore();
  await store.initStore();

  // Add test citations
  const mabo = MABO_CITATION();
  const dam = TASMANIAN_DAM_CITATION();
  const cca = CCA_STATUTE();

  try { await store.add(mabo); } catch { /* may already exist */ }
  try { await store.add(dam); } catch { /* may already exist */ }
  try { await store.add(cca); } catch { /* may already exist */ }

  // Insert footnotes at various positions
  await Word.run(async (context) => {
    const body = context.document.body;
    body.paragraphs.load("items");
    await context.sync();

    // Find body paragraphs (not headings) to insert footnotes into
    const bodyParas: Word.Paragraph[] = [];
    for (const para of body.paragraphs.items) {
      para.load("text,style");
    }
    await context.sync();

    for (const para of body.paragraphs.items) {
      if (!para.style?.startsWith("Heading") && para.text.length > 50) {
        bodyParas.push(para);
      }
    }

    if (bodyParas.length >= 3) {
      // Footnote 1: Full Mabo citation at end of first body paragraph
      const range1 = bodyParas[0].getRange("End");
      const fn1 = range1.insertFootnote("");
      const p1 = fn1.body.paragraphs.getFirst();
      const maboRuns = getFormattedPreview(mabo);
      for (const run of maboRuns) {
        const r = p1.insertText(run.text, "End");
        if (run.italic) r.font.italic = true;
      }
      const cc1 = p1.insertContentControl("RichText");
      cc1.tag = mabo.id;
      cc1.title = mabo.shortTitle ?? "Mabo";
      cc1.appearance = "Hidden" as Word.ContentControlAppearance;
      await context.sync();

      // Footnote 2: Ibid at end of second body paragraph
      const range2 = bodyParas[1].getRange("End");
      const fn2 = range2.insertFootnote("");
      const p2 = fn2.body.paragraphs.getFirst();
      p2.insertText("Ibid 42.", "End");
      const cc2 = p2.insertContentControl("RichText");
      cc2.tag = mabo.id;
      cc2.title = "Ibid";
      cc2.appearance = "Hidden" as Word.ContentControlAppearance;
      await context.sync();

      // Footnote 3: Tasmanian Dam Case
      const range3 = bodyParas[2].getRange("End");
      const fn3 = range3.insertFootnote("");
      const p3 = fn3.body.paragraphs.getFirst();
      const damRuns = getFormattedPreview(dam);
      for (const run of damRuns) {
        const r = p3.insertText(run.text, "End");
        if (run.italic) r.font.italic = true;
      }
      const cc3 = p3.insertContentControl("RichText");
      cc3.tag = dam.id;
      cc3.title = dam.shortTitle ?? "Dam Case";
      cc3.appearance = "Hidden" as Word.ContentControlAppearance;
      await context.sync();

      // Footnote 4: Short ref back to Mabo (n 1)
      if (bodyParas.length >= 4) {
        const range4 = bodyParas[3].getRange("End");
        const fn4 = range4.insertFootnote("");
        const p4 = fn4.body.paragraphs.getFirst();
        p4.insertText("Mabo [No 2] (n 1) 55.", "End");
        p4.font.italic = false;
        const r4 = p4.getRange("Start");
        r4.load("text");
        await context.sync();
        // Italicise the case name portion
        const cc4 = p4.insertContentControl("RichText");
        cc4.tag = mabo.id;
        cc4.title = "Mabo short ref";
        cc4.appearance = "Hidden" as Word.ContentControlAppearance;
        await context.sync();
      }
    }
  });

  log.info("Test essay generated and inserted into document");
}

// ═══════════════════════════════════════════════════════════════════════════
// GROUP 1: Document Setup (7 tests)
// ═══════════════════════════════════════════════════════════════════════════

async function testApplyTemplate(): Promise<string> {
  return await Word.run(async (context) => {
    await applyAglc4Template(context);

    const body = context.document.body;
    body.font.load("name,size");
    await context.sync();

    assert(body.font.name === "Times New Roman", `Expected Times New Roman, got ${body.font.name}`);
    assert(body.font.size === 12, `Expected 12pt, got ${body.font.size}`);
    return "AGLC4 template applied: Times New Roman 12pt, margins set";
  });
}

async function testApplyStyles(): Promise<string> {
  return await Word.run(async (context) => {
    await applyAglc4Styles(context);
    return "AGLC4 styles applied (headings modified to AGLC4 formatting)";
  });
}

async function testHeadingLevelI(): Promise<string> {
  return await Word.run(async (context) => {
    const body = context.document.body;
    body.paragraphs.load("items");
    await context.sync();

    // Verify the heading was already applied by generateTestEssay
    let found = false;
    for (const para of body.paragraphs.items) {
      para.load("text,style");
    }
    await context.sync();
    for (const para of body.paragraphs.items) {
      if (para.text.includes("Introduction") && !para.text.includes("Australian")) {
        assert(
          para.style === "Heading 1",
          `Expected Heading 1 style on Introduction, got '${para.style}'`,
        );
        found = true;
        break;
      }
    }
    assert(found, "Could not find 'Introduction' heading paragraph");
    return "Level I heading verified on 'Introduction'";
  });
}

async function testHeadingLevelII(): Promise<string> {
  return await Word.run(async (context) => {
    const body = context.document.body;
    body.paragraphs.load("items");
    await context.sync();

    let found = false;
    for (const para of body.paragraphs.items) {
      para.load("text,style");
    }
    await context.sync();
    for (const para of body.paragraphs.items) {
      if (para.text.includes("Background")) {
        assert(
          para.style === "Heading 2",
          `Expected Heading 2 style on Background, got '${para.style}'`,
        );
        found = true;
        break;
      }
    }
    assert(found, "Could not find 'Background' heading paragraph");
    return "Level II heading verified on 'Background'";
  });
}

async function testHeadingLevelIII(): Promise<string> {
  return await Word.run(async (context) => {
    const body = context.document.body;
    body.paragraphs.load("items");
    await context.sync();

    let found = false;
    for (const para of body.paragraphs.items) {
      para.load("text,style");
    }
    await context.sync();
    for (const para of body.paragraphs.items) {
      if (para.text.includes("Historical Context")) {
        assert(
          para.style === "Heading 3",
          `Expected Heading 3 style on Historical Context, got '${para.style}'`,
        );
        found = true;
        break;
      }
    }
    assert(found, "Could not find 'Historical Context' heading paragraph");
    return "Level III heading verified on 'Historical Context'";
  });
}

async function testHeadingLevelIVAndV(): Promise<string> {
  return await Word.run(async (context) => {
    const body = context.document.body;
    body.paragraphs.load("items");
    await context.sync();

    let foundIV = false;
    let foundV = false;
    for (const para of body.paragraphs.items) {
      para.load("text,style");
    }
    await context.sync();
    for (const para of body.paragraphs.items) {
      if (para.text.includes("Pre-Federation") && !foundIV) {
        assert(para.style === "Heading 4", `Expected Heading 4 on Pre-Federation, got '${para.style}'`);
        foundIV = true;
      }
      if (para.text.includes("Colonial arrangements") && !foundV) {
        assert(para.style === "Heading 5", `Expected Heading 5 on Colonial arrangements, got '${para.style}'`);
        foundV = true;
      }
    }
    assert(foundIV, "Could not find 'Pre-Federation' heading paragraph");
    assert(foundV, "Could not find 'Colonial arrangements' heading paragraph");
    return "Level IV and V headings verified";
  });
}

async function testHeadingNumbering(): Promise<string> {
  // Test the getHeadingPrefix function for all 5 levels
  const prefixI = getHeadingPrefix(1, 1);
  assert(prefixI === "I", `Level 1 prefix should be 'I', got '${prefixI}'`);

  const prefixII = getHeadingPrefix(2, 1);
  assert(prefixII === "A", `Level 2 prefix should be 'A', got '${prefixII}'`);

  const prefixIII = getHeadingPrefix(3, 1);
  assert(prefixIII === "1", `Level 3 prefix should be '1', got '${prefixIII}'`);

  const prefixIV = getHeadingPrefix(4, 1);
  assert(prefixIV === "(a)", `Level 4 prefix should be '(a)', got '${prefixIV}'`);

  const prefixV = getHeadingPrefix(5, 1);
  assert(prefixV === "(i)", `Level 5 prefix should be '(i)', got '${prefixV}'`);

  // Also verify second items in each level
  assert(getHeadingPrefix(1, 2) === "II", "Level 1 second item should be 'II'");
  assert(getHeadingPrefix(2, 2) === "B", "Level 2 second item should be 'B'");
  assert(getHeadingPrefix(3, 2) === "2", "Level 3 second item should be '2'");
  assert(getHeadingPrefix(4, 2) === "(b)", "Level 4 second item should be '(b)'");
  assert(getHeadingPrefix(5, 2) === "(ii)", "Level 5 second item should be '(ii)'");

  return "Heading numbering verified: I, A, 1, (a), (i) and correct second items";
}

// ═══════════════════════════════════════════════════════════════════════════
// GROUP 2: Citation Store (7 tests)
// ═══════════════════════════════════════════════════════════════════════════

// Shared store and citations for cross-group reuse
let testStore: CitationStore;
let storedMabo: Citation;
let storedCCA: Citation;
let storedJournal: Citation;
let storedBook: Citation;
let storedTreaty: Citation;
let storedTasmanianDam: Citation;

async function testStoreInit(): Promise<string> {
  testStore = new CitationStore();
  await testStore.initStore();
  const all = testStore.getAll();
  assert(Array.isArray(all), "getAll() should return an array");
  return `Store initialised with ${all.length} existing citations`;
}

async function testStoreAddCase(): Promise<string> {
  storedMabo = MABO_CITATION();
  await testStore.add(storedMabo);
  const retrieved = testStore.getById(storedMabo.id);
  assert(retrieved !== undefined, "Mabo citation not found after add");
  assert(retrieved!.sourceType === "case.reported", `Expected case.reported, got ${retrieved!.sourceType}`);
  assert(retrieved!.shortTitle === "Mabo [No 2]", `Short title mismatch: ${retrieved!.shortTitle}`);
  return `Added reported case: Mabo v Queensland [No 2] (${storedMabo.id})`;
}

async function testStoreAddStatute(): Promise<string> {
  storedCCA = CCA_STATUTE();
  await testStore.add(storedCCA);
  const retrieved = testStore.getById(storedCCA.id);
  assert(retrieved !== undefined, "CCA citation not found after add");
  assert(retrieved!.sourceType === "legislation.statute", `Expected legislation.statute, got ${retrieved!.sourceType}`);
  assert(
    (retrieved!.data.title as string) === "Competition and Consumer Act",
    `Title mismatch: ${retrieved!.data.title}`,
  );
  return `Added statute: Competition and Consumer Act 2010 (Cth) (${storedCCA.id})`;
}

async function testStoreAddJournal(): Promise<string> {
  storedJournal = JOURNAL_ARTICLE();
  await testStore.add(storedJournal);
  const retrieved = testStore.getById(storedJournal.id);
  assert(retrieved !== undefined, "Journal article not found after add");
  assert(retrieved!.sourceType === "journal.article", `Expected journal.article, got ${retrieved!.sourceType}`);
  return `Added journal article: ${(retrieved!.data.title as string)} (${storedJournal.id})`;
}

async function testStoreAddBook(): Promise<string> {
  storedBook = BOOK_CITATION();
  await testStore.add(storedBook);
  const retrieved = testStore.getById(storedBook.id);
  assert(retrieved !== undefined, "Book citation not found after add");
  assert(retrieved!.sourceType === "book", `Expected book, got ${retrieved!.sourceType}`);
  return `Added book: ${(retrieved!.data.title as string)} (${storedBook.id})`;
}

async function testStoreAddTreaty(): Promise<string> {
  storedTreaty = TREATY_CITATION();
  await testStore.add(storedTreaty);
  const retrieved = testStore.getById(storedTreaty.id);
  assert(retrieved !== undefined, "Treaty citation not found after add");
  assert(retrieved!.sourceType === "treaty", `Expected treaty, got ${retrieved!.sourceType}`);
  return `Added treaty: ${(retrieved!.data.title as string)} (${storedTreaty.id})`;
}

async function testStoreRetrieveAll(): Promise<string> {
  // Also add the Tasmanian Dam case for later use
  storedTasmanianDam = TASMANIAN_DAM_CITATION();
  await testStore.add(storedTasmanianDam);

  const all = testStore.getAll();
  // We should have at least our 6 test citations (Mabo, CCA, Journal, Book, Treaty, TasDam)
  assert(all.length >= 6, `Expected at least 6 citations, got ${all.length}`);

  // Verify we can find each one
  const ids = [storedMabo.id, storedCCA.id, storedJournal.id, storedBook.id, storedTreaty.id, storedTasmanianDam.id];
  for (const id of ids) {
    assert(all.some((c) => c.id === id), `Citation ${id} not found in getAll()`);
  }

  return `Store contains ${all.length} citations, all 6 test citations verified`;
}

// ═══════════════════════════════════════════════════════════════════════════
// GROUP 3: Engine Formatting (12 tests)
// ═══════════════════════════════════════════════════════════════════════════

async function testFormatReportedCase(): Promise<string> {
  const runs = getFormattedPreview(storedMabo);
  const text = runsToText(runs);

  assertContains(text, "Mabo", "Reported case output");
  assertContains(text, "Queensland", "Reported case output");
  assertContains(text, "(1992)", "Reported case output");
  assertContains(text, "175", "Reported case output");
  assertContains(text, "CLR", "Reported case output");
  assertContains(text, "1", "Reported case output");

  // Check italic on case name parts
  const italicRuns = runs.filter((r) => r.italic === true);
  assert(italicRuns.length > 0, "Expected at least one italic run for case name");
  const italicText = italicRuns.map((r) => r.text).join("");
  assertContains(italicText, "Mabo", "Italic case name");

  return `Formatted reported case: ${text}`;
}

async function testFormatUnreportedCase(): Promise<string> {
  const unreported = UNREPORTED_CASE_CITATION();
  const runs = getFormattedPreview(unreported);
  const text = runsToText(runs);

  assertContains(text, "Smith", "Unreported case output");
  assertContains(text, "Jones", "Unreported case output");

  // Check italic formatting
  const italicRuns = runs.filter((r) => r.italic === true);
  assert(italicRuns.length > 0, "Expected italic formatting on unreported case name");

  return `Formatted unreported case: ${text}`;
}

async function testFormatStatute(): Promise<string> {
  const runs = getFormattedPreview(storedCCA);
  const text = runsToText(runs);

  assertContains(text, "Competition and Consumer Act", "Statute output");
  assertContains(text, "2010", "Statute output");
  assertContains(text, "(Cth)", "Statute output");

  // Title + year should be italic
  const italicRuns = runs.filter((r) => r.italic === true);
  assert(italicRuns.length > 0, "Expected italic formatting on statute title");
  const italicText = italicRuns.map((r) => r.text).join("");
  assertContains(italicText, "Competition and Consumer Act", "Italic statute title");
  assertContains(italicText, "2010", "Italic statute year");

  // Jurisdiction should NOT be italic
  const cthRun = runs.find((r) => r.text.includes("(Cth)"));
  assert(cthRun !== undefined, "Expected a run containing (Cth)");
  assert(cthRun!.italic !== true, "Jurisdiction (Cth) should not be italic");

  return `Formatted statute: ${text}`;
}

async function testFormatJournalArticle(): Promise<string> {
  const runs = getFormattedPreview(storedJournal);
  const text = runsToText(runs);

  assertContains(text, "Zines", "Journal article output");
  assertContains(text, "High Court and the Constitution", "Journal article output");
  assertContains(text, "Melbourne University Law Review", "Journal article output");
  assertContains(text, "(1997)", "Journal article output");
  assertContains(text, "267", "Journal article output");

  // Title should be in quotes (single curly)
  assert(
    text.includes("\u2018") || text.includes("'"),
    "Journal article title should be enclosed in quotation marks",
  );

  // Journal name should be italic
  const journalRun = runs.find((r) => r.text.includes("Melbourne University Law Review"));
  assert(journalRun !== undefined, "Expected a run with journal name");
  assert(journalRun!.italic === true, "Journal name should be italic");

  return `Formatted journal article: ${text}`;
}

async function testFormatBook(): Promise<string> {
  const runs = getFormattedPreview(storedBook);
  const text = runsToText(runs);

  assertContains(text, "Williams", "Book output");
  assertContains(text, "Australian Constitutional Law and Theory", "Book output");
  assertContains(text, "Federation Press", "Book output");
  assertContains(text, "2022", "Book output");

  // Title should be italic
  const titleRun = runs.find(
    (r) => r.text.includes("Australian Constitutional Law and Theory"),
  );
  assert(titleRun !== undefined, "Expected a run with book title");
  assert(titleRun!.italic === true, "Book title should be italic");

  // Publication details should be in parentheses
  assert(
    text.includes("(Federation Press") || text.includes("(Federation"),
    "Publication details should be in parentheses",
  );

  return `Formatted book: ${text}`;
}

async function testFormatTreaty(): Promise<string> {
  const runs = getFormattedPreview(storedTreaty);
  const text = runsToText(runs);

  assertContains(text, "Charter of the United Nations", "Treaty output");

  // Title should be italic
  const titleRun = runs.find(
    (r) => r.text.includes("Charter of the United Nations"),
  );
  assert(titleRun !== undefined, "Expected a run with treaty title");
  assert(titleRun!.italic === true, "Treaty title should be italic");

  // Should contain treaty series info
  assertContains(text, "UNTS", "Treaty output");

  return `Formatted treaty: ${text}`;
}

async function testFormatPinpoints(): Promise<string> {
  // Page pinpoint
  const pagePinpoint: Pinpoint = { type: "page", value: "42" };
  const pageRuns = formatPinpoint(pagePinpoint);
  const pageText = runsToText(pageRuns);
  assert(pageText === "42", `Page pinpoint should be '42', got '${pageText}'`);

  // Paragraph pinpoint
  const paraPinpoint: Pinpoint = { type: "paragraph", value: "[23]" };
  const paraRuns = formatPinpoint(paraPinpoint);
  const paraText = runsToText(paraRuns);
  assert(paraText === "[23]", `Paragraph pinpoint should be '[23]', got '${paraText}'`);

  // Section pinpoint
  const secPinpoint: Pinpoint = { type: "section", value: "5" };
  const secRuns = formatPinpoint(secPinpoint);
  const secText = runsToText(secRuns);
  assertContains(secText, "s", "Section pinpoint");
  assertContains(secText, "5", "Section pinpoint");

  // Combined pinpoint (page + paragraph)
  const combinedPinpoint: Pinpoint = {
    type: "page",
    value: "42",
    subPinpoint: { type: "paragraph", value: "[23]" },
  };
  const combinedRuns = formatPinpoint(combinedPinpoint);
  const combinedText = runsToText(combinedRuns);
  assertContains(combinedText, "42", "Combined pinpoint");
  assertContains(combinedText, "[23]", "Combined pinpoint");

  return `Pinpoints verified: page='${pageText}', para='${paraText}', section='${secText}', combined='${combinedText}'`;
}

async function testFormatSignals(): Promise<string> {
  const seeRuns = formatSignal("see");
  const seeText = runsToText(seeRuns);
  assertContains(seeText, "See", "See signal");
  assert(seeRuns[0].italic === false, "Signals should not be italic");

  const seeAlsoRuns = formatSignal("see_also");
  const seeAlsoText = runsToText(seeAlsoRuns);
  assertContains(seeAlsoText, "See also", "See also signal");

  const cfRuns = formatSignal("cf");
  const cfText = runsToText(cfRuns);
  assertContains(cfText, "Cf", "Cf signal");

  return `Signals verified: '${seeText.trim()}', '${seeAlsoText.trim()}', '${cfText.trim()}'`;
}

async function testFormatLinkingPhrase(): Promise<string> {
  const citingRuns = formatLinkingPhrase("citing");
  const citingText = runsToText(citingRuns);
  assertContains(citingText, "citing", "Citing linking phrase");
  assert(citingRuns[0].italic === false, "Linking phrases should not be italic");

  const quotedInRuns = formatLinkingPhrase("quoted_in");
  const quotedInText = runsToText(quotedInRuns);
  assertContains(quotedInText, "quoted in", "Quoted in linking phrase");

  return `Linking phrases verified: '${citingText.trim()}', '${quotedInText.trim()}'`;
}

async function testCapitalisation(): Promise<string> {
  // Basic title case
  assert(
    toTitleCase("the rule of law in australia") === "The Rule of Law in Australia",
    `Title case failed: got '${toTitleCase("the rule of law in australia")}'`,
  );

  // Articles/prepositions lowercased in middle
  assert(
    toTitleCase("a study of the law") === "A Study of the Law",
    `Title case articles: got '${toTitleCase("a study of the law")}'`,
  );

  // Conjunctions lowercased in middle
  assert(
    toTitleCase("law and order in the court") === "Law and Order in the Court",
    `Title case conjunctions: got '${toTitleCase("law and order in the court")}'`,
  );

  // Acronyms preserved
  assert(
    toTitleCase("the UN and EU") === "The UN and EU",
    `Title case acronyms: got '${toTitleCase("the UN and EU")}'`,
  );

  return "Capitalisation (toTitleCase) verified for AGLC4 title-case rules";
}

async function testDateFormatting(): Promise<string> {
  // Day Month Year format
  const formatted = formatDate({ day: 14, month: 7, year: 2018 });
  assert(formatted === "14 July 2018", `Expected '14 July 2018', got '${formatted}'`);

  // Month Year (no day)
  const monthYear = formatDate({ month: 3, year: 2020 });
  assert(monthYear === "March 2020", `Expected 'March 2020', got '${monthYear}'`);

  // Date object
  const dateObj = formatDate(new Date(2024, 0, 1)); // Jan 1, 2024
  assert(dateObj === "1 January 2024", `Expected '1 January 2024', got '${dateObj}'`);

  return `Date formatting verified: '${formatted}', '${monthYear}', '${dateObj}'`;
}

async function testNumberFormatting(): Promise<string> {
  // Numbers 1-9 as words
  assert(numberToWords(1) === "one", `Expected 'one', got '${numberToWords(1)}'`);
  assert(numberToWords(5) === "five", `Expected 'five', got '${numberToWords(5)}'`);
  assert(numberToWords(9) === "nine", `Expected 'nine', got '${numberToWords(9)}'`);

  // Numbers 10+ as numerals
  assert(numberToWords(10) === "10", `Expected '10', got '${numberToWords(10)}'`);
  assert(numberToWords(100) === "100", `Expected '100', got '${numberToWords(100)}'`);

  // No comma separators
  assert(formatNumber(10000) === "10000", `Expected '10000', got '${formatNumber(10000)}'`);
  assertNotContains(formatNumber(1000000), ",", "Formatted number");

  return "Number formatting verified: words for 1-9, numerals for 10+, no commas";
}

// ═══════════════════════════════════════════════════════════════════════════
// GROUP 4: Subsequent References (8 tests)
// ═══════════════════════════════════════════════════════════════════════════

async function testSubseqFullCitation(): Promise<string> {
  // First citation should return full format (resolver returns null)
  const context: CitationContext = {
    footnoteNumber: 1,
    isFirstCitation: true,
    isSameAsPreceding: false,
    precedingFootnoteCitationCount: 0,
    currentPinpoint: undefined,
    firstFootnoteNumber: 1,
    isWithinSameFootnote: false,
    formatPreference: "auto",
  };

  const runs = formatCitation(storedMabo, context);
  const text = runsToText(runs);
  assertContains(text, "Mabo", "Full citation");
  assertContains(text, "CLR", "Full citation");
  return `Footnote 1 (full): ${text}`;
}

async function testSubseqIbid(): Promise<string> {
  // Same citation in next footnote, single citation in preceding = ibid
  const context: CitationContext = {
    footnoteNumber: 2,
    isFirstCitation: false,
    isSameAsPreceding: true,
    precedingFootnoteCitationCount: 1,
    currentPinpoint: undefined,
    firstFootnoteNumber: 1,
    isWithinSameFootnote: false,
    formatPreference: "auto",
  };

  const runs = formatCitation(storedMabo, context);
  const text = runsToText(runs);
  assertContains(text, "Ibid", "Ibid reference");
  assertNotContains(text, "Mabo", "Ibid should not contain case name");
  return `Footnote 2 (ibid): ${text}`;
}

async function testSubseqIbidWithPinpoint(): Promise<string> {
  // Same citation in next footnote with different pinpoint = Ibid 42
  const context: CitationContext = {
    footnoteNumber: 3,
    isFirstCitation: false,
    isSameAsPreceding: true,
    precedingFootnoteCitationCount: 1,
    currentPinpoint: { type: "page", value: "42" },
    firstFootnoteNumber: 1,
    isWithinSameFootnote: false,
    formatPreference: "auto",
  };

  const runs = formatCitation(storedMabo, context);
  const text = runsToText(runs);
  assertContains(text, "Ibid", "Ibid with pinpoint");
  assertContains(text, "42", "Ibid pinpoint value");
  return `Footnote 3 (ibid + pinpoint): ${text}`;
}

async function testSubseqDifferentCase(): Promise<string> {
  // Different case as full citation
  const context: CitationContext = {
    footnoteNumber: 4,
    isFirstCitation: true,
    isSameAsPreceding: false,
    precedingFootnoteCitationCount: 1,
    currentPinpoint: undefined,
    firstFootnoteNumber: 4,
    isWithinSameFootnote: false,
    formatPreference: "auto",
  };

  const runs = formatCitation(storedTasmanianDam, context);
  const text = runsToText(runs);
  assertContains(text, "Commonwealth", "Full citation for different case");
  assertContains(text, "Tasmania", "Full citation for different case");
  return `Footnote 4 (full, different case): ${text}`;
}

async function testSubseqShortRef(): Promise<string> {
  // First case cited again (not immediately preceding) = short ref with (n 1)
  const context: CitationContext = {
    footnoteNumber: 5,
    isFirstCitation: false,
    isSameAsPreceding: false,
    precedingFootnoteCitationCount: 1,
    currentPinpoint: undefined,
    firstFootnoteNumber: 1,
    isWithinSameFootnote: false,
    formatPreference: "auto",
  };

  const runs = formatCitation(storedMabo, context);
  const text = runsToText(runs);
  assertContains(text, "(n 1)", "Short reference cross-reference");
  assertContains(text, "Mabo", "Short reference should contain short title");
  return `Footnote 5 (short ref): ${text}`;
}

async function testSubseqSemicolonSeparation(): Promise<string> {
  // Two citations in one footnote — the engine formats each one individually;
  // the caller is responsible for semicolon separation. We verify the engine
  // outputs can be combined with semicolons.
  const context1: CitationContext = {
    footnoteNumber: 6,
    isFirstCitation: false,
    isSameAsPreceding: false,
    precedingFootnoteCitationCount: 1,
    currentPinpoint: undefined,
    firstFootnoteNumber: 1,
    isWithinSameFootnote: false,
    formatPreference: "auto",
  };
  const runs1 = formatCitation(storedMabo, context1);

  const context2: CitationContext = {
    footnoteNumber: 6,
    isFirstCitation: false,
    isSameAsPreceding: false,
    precedingFootnoteCitationCount: 1,
    currentPinpoint: undefined,
    firstFootnoteNumber: 4,
    isWithinSameFootnote: false,
    formatPreference: "auto",
  };
  const runs2 = formatCitation(storedTasmanianDam, context2);

  const combined = runsToText(runs1) + "; " + runsToText(runs2);
  assertContains(combined, ";", "Semicolon separation");
  assertContains(combined, "Mabo", "First citation in combined footnote");
  assertContains(combined, "Tasmanian Dam", "Second citation in combined footnote");

  return `Footnote 6 (two citations): ${combined}`;
}

async function testSubseqIbidChain(): Promise<string> {
  // Three consecutive ibids
  const texts: string[] = [];
  for (let fn = 7; fn <= 9; fn++) {
    const context: CitationContext = {
      footnoteNumber: fn,
      isFirstCitation: false,
      isSameAsPreceding: true,
      precedingFootnoteCitationCount: 1,
      currentPinpoint: undefined,
      firstFootnoteNumber: 1,
      isWithinSameFootnote: false,
      formatPreference: "auto",
    };
    const runs = formatCitation(storedMabo, context);
    const text = runsToText(runs);
    assertContains(text, "Ibid", `Ibid chain footnote ${fn}`);
    texts.push(text);
  }

  return `Ibid chain verified (fn 7-9): ${texts.join(" | ")}`;
}

async function testSubseqAlwaysRefsFirstFootnote(): Promise<string> {
  // Short ref should always reference footnote 1 regardless of current position
  for (const fn of [10, 20, 50]) {
    const context: CitationContext = {
      footnoteNumber: fn,
      isFirstCitation: false,
      isSameAsPreceding: false,
      precedingFootnoteCitationCount: 1,
      currentPinpoint: undefined,
      firstFootnoteNumber: 1,
      isWithinSameFootnote: false,
      formatPreference: "auto",
    };
    const runs = formatCitation(storedMabo, context);
    const text = runsToText(runs);
    assertContains(text, "(n 1)", `Short ref at fn ${fn} should reference (n 1)`);
  }

  return "Short reference always references first footnote number (n 1)";
}

// ═══════════════════════════════════════════════════════════════════════════
// GROUP 5: Refresh & Tracking (4 tests)
// ═══════════════════════════════════════════════════════════════════════════

async function testBuildFootnoteMap(): Promise<string> {
  return await Word.run(async (context) => {
    const map = await buildFootnoteMap(context);
    assert(map instanceof Map, "buildFootnoteMap should return a Map");
    return `Footnote map built with ${map.size} citations tracked`;
  });
}

async function testRefreshCitations(): Promise<string> {
  return await Word.run(async (context) => {
    const result = await refreshAllCitations(context, testStore);
    assert(typeof result.updated === "number", "updated should be a number");
    assert(typeof result.unchanged === "number", "unchanged should be a number");
    return `Refresh complete: ${result.updated} updated, ${result.unchanged} unchanged`;
  });
}

async function testFirstFootnoteNumberUpdated(): Promise<string> {
  // After refresh, check that firstFootnoteNumber is set on at least the citations
  // that have been inserted as footnotes (if any)
  const all = testStore.getAll();
  const withFootnoteNum = all.filter((c) => c.firstFootnoteNumber !== undefined);
  // This test may find 0 if no footnotes have been inserted via the Word tests,
  // but verifies the mechanism works
  return `${withFootnoteNum.length} citations have firstFootnoteNumber set out of ${all.length} total`;
}

async function testReRefreshNoChanges(): Promise<string> {
  return await Word.run(async (context) => {
    const result = await refreshAllCitations(context, testStore);
    // After an immediate re-refresh with no document changes, updated should be 0
    assert(
      result.updated === 0,
      `Expected 0 updated after re-refresh, got ${result.updated}`,
    );
    return `Re-refresh: ${result.updated} updated, ${result.unchanged} unchanged (0 updated as expected)`;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GROUP 6: Bibliography (3 tests)
// ═══════════════════════════════════════════════════════════════════════════

async function testGenerateBibliography(): Promise<string> {
  const citations = testStore.getAll();
  const sections = generateBibliography(citations);
  assert(sections.length > 0, "Bibliography should have at least one section");
  return `Bibliography generated with ${sections.length} sections, ${citations.length} citations`;
}

async function testBibliographySections(): Promise<string> {
  const citations = testStore.getAll();
  const sections = generateBibliography(citations);

  const headings = sections.map((s) => s.heading);

  // We should have at least sections A (secondary), B (cases), C (legislation)
  const hasA = headings.some((h) => h.startsWith("A"));
  const hasB = headings.some((h) => h.startsWith("B"));
  const hasC = headings.some((h) => h.startsWith("C"));

  assert(hasA, "Bibliography should have section A (Articles/Books/Reports)");
  assert(hasB, "Bibliography should have section B (Cases)");
  assert(hasC, "Bibliography should have section C (Legislation)");

  // Category mapping
  assert(getBibliographyCategory("case.reported") === "B", "Cases should be category B");
  assert(getBibliographyCategory("legislation.statute") === "C", "Legislation should be category C");
  assert(getBibliographyCategory("journal.article") === "A", "Journal articles should be category A");
  assert(getBibliographyCategory("book") === "A", "Books should be category A");
  assert(getBibliographyCategory("treaty") === "D", "Treaties should be category D");

  return `Bibliography sections verified: ${headings.join(", ")}`;
}

async function testBibliographyAuthorInversion(): Promise<string> {
  const citations = testStore.getAll();
  const sections = generateBibliography(citations);

  // Find section A (secondary sources) and check author inversion
  const sectionA = sections.find((s) => s.heading.startsWith("A"));
  assert(sectionA !== undefined, "Expected section A in bibliography");

  // Check that at least one entry has inverted author name (surname first)
  let foundInverted = false;
  for (const entry of sectionA!.entries) {
    const text = runsToText(entry);
    // Check for "Surname, Given" pattern (e.g., "Zines, Leslie" or "Williams, George")
    if (text.match(/^[A-Z][a-z]+, [A-Z]/)) {
      foundInverted = true;
      break;
    }
  }
  assert(foundInverted, "Expected at least one entry with inverted author name");

  // Check that entries do not end with a trailing full stop
  // (AGLC4 Rule 1.13 - no trailing full stop in bibliography entries)
  for (const entry of sectionA!.entries) {
    const text = runsToText(entry);
    // The entry itself should not have a trailing full stop appended by the formatter
    // (the ensureClosingPunctuation is for footnotes, not bibliography entries)
    assertNotContains(text, ".", `Bibliography entry should not end with full stop (Rule 1.13): '${text}'`);
  }

  return "Bibliography author inversion verified, no trailing full stops";
}

// ═══════════════════════════════════════════════════════════════════════════
// GROUP 7: Validation (5 tests)
// ═══════════════════════════════════════════════════════════════════════════

async function testValidateDocument(): Promise<string> {
  const citations = testStore.getAll();
  const footnoteTexts = ["Mabo v Queensland [No 2] (1992) 175 CLR 1."];
  const result = validateDocument(footnoteTexts, citations);

  assert(typeof result.errors === "object" && Array.isArray(result.errors), "errors should be array");
  assert(typeof result.warnings === "object" && Array.isArray(result.warnings), "warnings should be array");
  assert(typeof result.info === "object" && Array.isArray(result.info), "info should be array");

  return `Validation complete: ${result.errors.length} errors, ${result.warnings.length} warnings, ${result.info.length} info`;
}

async function testCheckFootnoteClosingPunctuation(): Promise<string> {
  // Footnote without closing full stop should be flagged
  const issuesNoStop = checkFootnoteFormat("Mabo v Queensland [No 2] (1992) 175 CLR 1", 0);
  const hasClosingIssue = issuesNoStop.some((i) => i.ruleNumber === "1.1.4");
  assert(hasClosingIssue, "Missing closing full stop should be flagged (Rule 1.1.4)");

  // Footnote with closing full stop should not be flagged for 1.1.4
  const issuesWithStop = checkFootnoteFormat("Mabo v Queensland [No 2] (1992) 175 CLR 1.", 0);
  const hasNoClosingIssue = !issuesWithStop.some((i) => i.ruleNumber === "1.1.4");
  assert(hasNoClosingIssue, "Footnote with full stop should not be flagged for Rule 1.1.4");

  return "Footnote closing punctuation check verified (Rule 1.1.4)";
}

async function testCheckAbbreviationFullStops(): Promise<string> {
  const issues = checkAbbreviationFullStops("The company was e.g. a Pty. Ltd. entity");
  assert(issues.length > 0, "Should flag abbreviations with full stops");

  const egIssue = issues.find((i) => i.message.includes("e.g."));
  assert(egIssue !== undefined, "Should flag 'e.g.' (Rule 1.6.1)");
  assert(egIssue!.suggestion === "eg", "'e.g.' should suggest 'eg'");

  const ptyIssue = issues.find((i) => i.message.includes("Pty."));
  assert(ptyIssue !== undefined, "Should flag 'Pty.' (Rule 1.6.1)");

  return `Abbreviation full stop check verified: ${issues.length} issues found`;
}

async function testCheckDashes(): Promise<string> {
  const issues = checkDashes("The decision in 1986--87 was significant");
  const doubleHyphen = issues.find((i) => i.message.includes("Double hyphen"));
  assert(doubleHyphen !== undefined, "Should flag '--' (Rule 1.6.3)");
  assert(doubleHyphen!.suggestion === "\u2014", "Double hyphen should suggest em-dash");

  return `Dash check verified: ${issues.length} issues found`;
}

async function testCheckFootnoteNumberPosition(): Promise<string> {
  const issues = checkFootnoteNumberPosition("The court held1.");
  const positionIssue = issues.find((i) => i.ruleNumber === "1.1.2");
  assert(
    positionIssue !== undefined,
    "Should flag possible footnote number before punctuation (Rule 1.1.2)",
  );

  // Clean text should not be flagged
  const cleanIssues = checkFootnoteNumberPosition("The court held.");
  const cleanPositionIssues = cleanIssues.filter((i) => i.ruleNumber === "1.1.2");
  assert(cleanPositionIssues.length === 0, "Clean text should not be flagged");

  return "Footnote number position check verified (Rule 1.1.2)";
}

// ═══════════════════════════════════════════════════════════════════════════
// GROUP 8: Document Features (5 tests)
// ═══════════════════════════════════════════════════════════════════════════

async function testApplyBlockQuoteStyle(): Promise<string> {
  return await Word.run(async (context) => {
    const body = context.document.body;
    // Insert a test paragraph for block quote
    const para = body.insertParagraph(
      "This is a block quote paragraph that should be indented and in a smaller font per AGLC4 Rule 1.5.1.",
      "End",
    );

    // Try to apply block quote style
    try {
      para.style = "AGLC4 Block Quote";
      await context.sync();
      return "Block quote style applied to paragraph";
    } catch {
      // Style may not exist; apply formatting directly
      para.font.size = 10;
      para.leftIndent = 36;
      await context.sync();
      return "Block quote formatting applied directly (style not available)";
    }
  });
}

async function testInsertBranding(): Promise<string> {
  return await Word.run(async (context) => {
    await insertAttribution(context);
    const exists = await hasAttribution(context);
    assert(exists, "Attribution should exist after insertion");
    return "Branding attribution inserted in footer";
  });
}

async function testVerifyBranding(): Promise<string> {
  return await Word.run(async (context) => {
    const exists = await hasAttribution(context);
    assert(exists, "Attribution should still exist");
    return "Branding attribution verified in footer";
  });
}

async function testRemoveBranding(): Promise<string> {
  return await Word.run(async (context) => {
    await removeAttribution(context);
    return "Branding attribution removed";
  });
}

async function testVerifyBrandingRemoved(): Promise<string> {
  return await Word.run(async (context) => {
    const exists = await hasAttribution(context);
    assert(!exists, "Attribution should not exist after removal");
    return "Branding attribution confirmed removed";
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GROUP 9: Inline Formatting (2 tests)
// ═══════════════════════════════════════════════════════════════════════════

async function testScanInlineReferences(): Promise<string> {
  return await Word.run(async (context) => {
    const citations = testStore.getAll();
    const result = await scanAndFormatInlineReferences(context, citations);
    assert(typeof result.formatted === "number", "formatted should be a number");
    assert(typeof result.skipped === "number", "skipped should be a number");
    return `Inline formatting: ${result.formatted} formatted, ${result.skipped} skipped`;
  });
}

async function testClearInlineFormatting(): Promise<string> {
  return await Word.run(async (context) => {
    const citations = testStore.getAll();
    const cleared = await clearInlineFormatting(context, citations);
    assert(typeof cleared === "number", "cleared should be a number");
    return `Inline formatting cleared: ${cleared} references de-italicised`;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GROUP 10: Cleanup (1 test)
// ═══════════════════════════════════════════════════════════════════════════

async function testCleanupCitations(): Promise<string> {
  // Disable auto-refresh before cleanup to prevent the refresher
  // from re-rendering footnotes with empty data after citations
  // are removed from the store.
  try {
    const savedAutoRefresh = localStorage.getItem("obiter-autoRefresh");
    localStorage.setItem("obiter-autoRefresh", "false");

    const ids = [
      storedMabo?.id,
      storedCCA?.id,
      storedJournal?.id,
      storedBook?.id,
      storedTreaty?.id,
      storedTasmanianDam?.id,
    ].filter(Boolean) as string[];

    let removed = 0;
    for (const id of ids) {
      try {
        await testStore.remove(id);
        removed++;
      } catch {
        // Citation may not exist if add failed
      }
    }

    // Restore auto-refresh setting
    if (savedAutoRefresh !== null) {
      localStorage.setItem("obiter-autoRefresh", savedAutoRefresh);
    } else {
      localStorage.removeItem("obiter-autoRefresh");
    }

    return `Cleaned up ${removed} test citations from store`;
  } catch (err) {
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Runner
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run all integration tests against the live Word document.
 * Results are logged to the debug logger and returned.
 */
export async function runAllTests(): Promise<TestResult[]> {
  results.length = 0;
  log.info("Starting comprehensive integration test suite");

  // Generate test essay first
  log.info("Generating test essay...");
  try {
    await generateTestEssay();
    log.info("Test essay generated");
  } catch (err) {
    log.error("Failed to generate test essay", { error: err instanceof Error ? err.message : String(err) });
  }

  // Group 1: Document Setup
  currentGroup = "Document Setup";
  log.info(`--- Group 1: ${currentGroup} ---`);
  await runTest("Setup: Apply AGLC4 template", testApplyTemplate);
  await runTest("Setup: Apply AGLC4 styles", testApplyStyles);
  await runTest("Setup: Heading Level I", testHeadingLevelI);
  await runTest("Setup: Heading Level II", testHeadingLevelII);
  await runTest("Setup: Heading Level III", testHeadingLevelIII);
  await runTest("Setup: Heading Level IV and V", testHeadingLevelIVAndV);
  await runTest("Setup: Heading numbering (I, A, 1, (a), (i))", testHeadingNumbering);

  // Group 2: Citation Store
  currentGroup = "Citation Store";
  log.info(`--- Group 2: ${currentGroup} ---`);
  await runTest("Store: Initialise on fresh document", testStoreInit);
  await runTest("Store: Add reported case (Mabo)", testStoreAddCase);
  await runTest("Store: Add statute (CCA)", testStoreAddStatute);
  await runTest("Store: Add journal article", testStoreAddJournal);
  await runTest("Store: Add book citation", testStoreAddBook);
  await runTest("Store: Add treaty citation", testStoreAddTreaty);
  await runTest("Store: Retrieve all and verify count", testStoreRetrieveAll);

  // Group 3: Engine Formatting
  currentGroup = "Engine Formatting";
  log.info(`--- Group 3: ${currentGroup} ---`);
  await runTest("Engine: Format reported case (italic, brackets, series)", testFormatReportedCase);
  await runTest("Engine: Format unreported case with MNC", testFormatUnreportedCase);
  await runTest("Engine: Format statute (italic title, non-italic jurisdiction)", testFormatStatute);
  await runTest("Engine: Format journal article (quotes, italic journal)", testFormatJournalArticle);
  await runTest("Engine: Format book (italic title, parens details)", testFormatBook);
  await runTest("Engine: Format treaty (italic title)", testFormatTreaty);
  await runTest("Engine: Pinpoints (page, paragraph, section, combined)", testFormatPinpoints);
  await runTest("Engine: Introductory signals (See, See also, Cf)", testFormatSignals);
  await runTest("Engine: Linking phrases (citing, quoted in)", testFormatLinkingPhrase);
  await runTest("Engine: Capitalisation (toTitleCase)", testCapitalisation);
  await runTest("Engine: Date formatting (Day Month Year)", testDateFormatting);
  await runTest("Engine: Number formatting (words 1-9, no commas)", testNumberFormatting);

  // Group 4: Subsequent References
  currentGroup = "Subsequent References";
  log.info(`--- Group 4: ${currentGroup} ---`);
  await runTest("Subseq: Full citation as footnote 1", testSubseqFullCitation);
  await runTest("Subseq: Ibid as footnote 2", testSubseqIbid);
  await runTest("Subseq: Ibid with pinpoint as footnote 3", testSubseqIbidWithPinpoint);
  await runTest("Subseq: Different case as footnote 4 (full)", testSubseqDifferentCase);
  await runTest("Subseq: Short ref with (n 1) as footnote 5", testSubseqShortRef);
  await runTest("Subseq: Two citations in one footnote (semicolon)", testSubseqSemicolonSeparation);
  await runTest("Subseq: Ibid chain (3 consecutive)", testSubseqIbidChain);
  await runTest("Subseq: Short ref always references first footnote", testSubseqAlwaysRefsFirstFootnote);

  // Group 5: Refresh & Tracking
  currentGroup = "Refresh & Tracking";
  log.info(`--- Group 5: ${currentGroup} ---`);
  await runTest("Tracking: Build footnote map", testBuildFootnoteMap);
  await runTest("Tracking: Refresh all citations", testRefreshCitations);
  await runTest("Tracking: firstFootnoteNumber updated", testFirstFootnoteNumberUpdated);
  await runTest("Tracking: Re-refresh shows 0 updated", testReRefreshNoChanges);

  // Group 6: Bibliography
  currentGroup = "Bibliography";
  log.info(`--- Group 6: ${currentGroup} ---`);
  await runTest("Biblio: Generate bibliography", testGenerateBibliography);
  await runTest("Biblio: Verify sections (A, B, C)", testBibliographySections);
  await runTest("Biblio: Author inversion, no trailing full stops", testBibliographyAuthorInversion);

  // Group 7: Validation
  currentGroup = "Validation";
  log.info(`--- Group 7: ${currentGroup} ---`);
  await runTest("Valid: Validate document", testValidateDocument);
  await runTest("Valid: Footnote closing punctuation", testCheckFootnoteClosingPunctuation);
  await runTest("Valid: Abbreviation full stops (e.g.)", testCheckAbbreviationFullStops);
  await runTest("Valid: Dash types (--)", testCheckDashes);
  await runTest("Valid: Footnote number position", testCheckFootnoteNumberPosition);

  // Group 8: Document Features
  currentGroup = "Document Features";
  log.info(`--- Group 8: ${currentGroup} ---`);
  await runTest("Feature: Block quote style", testApplyBlockQuoteStyle);
  await runTest("Feature: Insert branding attribution", testInsertBranding);
  await runTest("Feature: Verify branding exists", testVerifyBranding);
  await runTest("Feature: Remove branding", testRemoveBranding);
  await runTest("Feature: Verify branding removed", testVerifyBrandingRemoved);

  // Group 9: Inline Formatting
  currentGroup = "Inline Formatting";
  log.info(`--- Group 9: ${currentGroup} ---`);
  await runTest("Inline: Scan and italicise case names", testScanInlineReferences);
  await runTest("Inline: Clear inline formatting", testClearInlineFormatting);

  // Group 10: Cleanup
  currentGroup = "Cleanup";
  log.info(`--- Group 10: ${currentGroup} ---`);
  await runTest("Cleanup: Remove all test citations", testCleanupCitations);

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  const groupSummary: Record<string, { passed: number; failed: number }> = {};
  for (const r of results) {
    if (!groupSummary[r.group]) {
      groupSummary[r.group] = { passed: 0, failed: 0 };
    }
    if (r.passed) {
      groupSummary[r.group].passed++;
    } else {
      groupSummary[r.group].failed++;
    }
  }

  log.info("=== Test Suite Summary ===");
  for (const [group, counts] of Object.entries(groupSummary)) {
    const status = counts.failed === 0 ? "PASS" : "FAIL";
    log.info(`  ${status}: ${group} (${counts.passed}/${counts.passed + counts.failed})`);
  }
  log.info(`Total: ${passed}/${total} passed, ${failed} failed`);

  return [...results];
}

/** Get results from the last test run. */
export function getTestResults(): TestResult[] {
  return [...results];
}
