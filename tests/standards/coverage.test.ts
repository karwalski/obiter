/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * STD-003 coverage contract.
 *
 * Every SOURCE_DISPATCH key must be classified for OSCOLA 5 and NZLSG 3 in
 * tests/fixtures/standards/coverage.ts, and every exported formatter in
 * src/engine/rules/oscola and src/engine/rules/nzlsg must be listed as wired
 * (and proven reachable from formatCitation) or as an orphan.
 *
 * Source of truth for the key list: the SOURCE_DISPATCH, OSCOLA_DISPATCH and
 * dispatchNzlsg blocks of src/engine/engine.ts, parsed from the source text
 * (none of them is exported), cross-checked against the SourceType union in
 * src/types/citation.ts.
 *
 * Evidence that a standard handles a type natively: a formatter in that
 * standard's rule modules was invoked, or the output differs from the AGLC4
 * rendering of the same citation. Every rule module is replaced with a
 * call-recording wrapper before the engine loads so invocation is observable.
 *
 * `unsupported` rows and orphaned formatters are `test.failing`: green while
 * the fixture is right, and they flip red the day a story lands without the
 * fixture being reclassified (STD-017 wired every orphan and reclassified
 * the STD-016 secondary sources; `book.audiobook` under OSCOLA and the
 * remaining AGLC-form secondary sources stay `unsupported`).
 */
import * as fs from "fs";
import * as path from "path";
import type { Citation, SourceType } from "../../src/types/citation";
import type { FormattedRun } from "../../src/types/formattedRun";
import type { CitationContext } from "../../src/engine/engine";
import {
  FORMATTER_WIRING,
  SOURCE_TYPE_COVERAGE,
  type CoverageClass,
  type CoverageStandard,
  type WiringStandard,
} from "../fixtures/standards/coverage";

// ─── Paths and source text ───────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, "..", "..");
const RULES_DIR = path.join(ROOT, "src", "engine", "rules");
const ENGINE_SRC = fs.readFileSync(path.join(ROOT, "src", "engine", "engine.ts"), "utf8");
const CITATION_TYPES_SRC = fs.readFileSync(path.join(ROOT, "src", "types", "citation.ts"), "utf8");

const WIRING_STANDARDS: WiringStandard[] = ["oscola", "nzlsg"];
const COVERAGE_STANDARDS: CoverageStandard[] = ["oscola5", "nzlsg3"];
const RULE_STANDARD: Record<CoverageStandard, WiringStandard> = { oscola5: "oscola", nzlsg3: "nzlsg" };

/** Module basenames (no extension) under src/engine/rules/<std>/. */
function ruleModules(std: WiringStandard): string[] {
  return fs
    .readdirSync(path.join(RULES_DIR, std))
    .filter((f) => f.endsWith(".ts"))
    .map((f) => f.replace(/\.ts$/, ""))
    .sort();
}

/** Names of `export function` declarations in one rule module. */
function exportedFunctions(std: WiringStandard, mod: string): string[] {
  const src = fs.readFileSync(path.join(RULES_DIR, std, `${mod}.ts`), "utf8");
  const names: string[] = [];
  const re = /^export function (\w+)/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) names.push(m[1]);
  return names;
}

/** Keys of a `const NAME: Partial<Record<SourceType, SourceFormatter>> = { … };` block in engine.ts. */
function dispatchMapKeys(mapName: string): string[] {
  const start = ENGINE_SRC.indexOf(`const ${mapName}:`);
  if (start < 0) throw new Error(`${mapName} not found in engine.ts`);
  const end = ENGINE_SRC.indexOf("\n};", start);
  const block = ENGINE_SRC.slice(start, end);
  const keys: string[] = [];
  const re = /^\s*"?([a-z_][a-z0-9_.]*)"?:\s*dispatch/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) keys.push(m[1]);
  return keys;
}

/** Distinct source types gated inside dispatchNzlsg (`st === "…"`). */
function nzlsgGateTypes(): string[] {
  const start = ENGINE_SRC.indexOf("function dispatchNzlsg(");
  if (start < 0) throw new Error("dispatchNzlsg not found in engine.ts");
  const end = ENGINE_SRC.indexOf("\n  return null;\n}", start);
  const block = ENGINE_SRC.slice(start, end);
  const found = new Set<string>();
  const re = /st === "([a-z_][a-z0-9_.]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) found.add(m[1]);
  return Array.from(found);
}

/** Members of the SourceType string-literal union in src/types/citation.ts. */
function sourceTypeUnion(): string[] {
  const start = CITATION_TYPES_SRC.indexOf("export type SourceType =");
  const end = CITATION_TYPES_SRC.indexOf(";", start);
  const block = CITATION_TYPES_SRC.slice(start, end);
  const names: string[] = [];
  const re = /\|\s*"([a-z_][a-z0-9_.]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) names.push(m[1]);
  return names;
}

const SOURCE_DISPATCH_KEYS = dispatchMapKeys("SOURCE_DISPATCH");
const OSCOLA_DISPATCH_KEYS = dispatchMapKeys("OSCOLA_DISPATCH");
const NZLSG_GATE_TYPES = nzlsgGateTypes();

// ─── Call-recording wrappers around every rule module ────────────────────────
//
// jest.doMock is not hoisted, so the engine must be required (not imported)
// after the loop below. Each factory returns the real module with every
// exported function wrapped in jest.fn(actual).

function mockWrap(modulePath: string): Record<string, unknown> {
  const actual = jest.requireActual(modulePath) as Record<string, unknown>;
  const wrapped: Record<string, unknown> = { __esModule: true };
  for (const key of Object.keys(actual)) {
    const value = actual[key];
    wrapped[key] = typeof value === "function" ? jest.fn(value as (...a: unknown[]) => unknown) : value;
  }
  return wrapped;
}

const RULE_MODULES: Record<WiringStandard, string[]> = {
  oscola: ruleModules("oscola"),
  nzlsg: ruleModules("nzlsg"),
};

for (const std of WIRING_STANDARDS) {
  for (const mod of RULE_MODULES[std]) {
    const mockPath = `../../src/engine/rules/${std}/${mod}`;
    jest.doMock(mockPath, () => mockWrap(mockPath));
  }
}

/* eslint-disable @typescript-eslint/no-var-requires */
const engine: typeof import("../../src/engine/engine") = require("../../src/engine/engine");
const standards: typeof import("../../src/engine/standards") = require("../../src/engine/standards");
const bibliography: typeof import("../../src/engine/rules/v4/general/bibliography") = require("../../src/engine/rules/v4/general/bibliography");
/* eslint-enable @typescript-eslint/no-var-requires */

/** The mocked export of one rule module. */
function formatterMock(std: WiringStandard, mod: string, name: string): jest.Mock {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const module = require(`../../src/engine/rules/${std}/${mod}`) as Record<string, unknown>;
  const fn = module[name];
  if (!jest.isMockFunction(fn)) throw new Error(`${std}/${mod}.${name} is not a mock`);
  return fn as jest.Mock;
}

/** Names of every formatter of a standard that has been called since the last reset. */
function invokedFormatters(std: WiringStandard): string[] {
  const called: string[] = [];
  for (const mod of RULE_MODULES[std]) {
    for (const name of exportedFunctions(std, mod)) {
      if (formatterMock(std, mod, name).mock.calls.length > 0) called.push(`${mod}.${name}`);
    }
  }
  return called;
}

// ─── Citations ───────────────────────────────────────────────────────────────

function makeCitation(sourceType: string, data: Record<string, unknown>): Citation {
  return {
    id: `cit-${sourceType}`,
    aglcVersion: "4",
    sourceType: sourceType as SourceType,
    data,
    tags: [],
    createdAt: "2026-01-01T00:00:00Z",
    modifiedAt: "2026-01-01T00:00:00Z",
  };
}

const SUBSEQUENT: CitationContext = {
  footnoteNumber: 2,
  isFirstCitation: false,
  isSameAsPreceding: false,
  precedingFootnoteCitationCount: 1,
  firstFootnoteNumber: 1,
  isWithinSameFootnote: false,
  formatPreference: "auto",
};

const plain = (runs: FormattedRun[]): string => runs.map((r) => r.text).join("");

function render(citation: Citation, standardId: string, context?: CitationContext): FormattedRun[] {
  return engine.formatCitation(citation, context, standards.getStandardConfig(standardId as never));
}

/**
 * Broad data that every AGLC dispatcher tolerates, used for types the
 * standard does not handle natively. Deliberately carries none of the NZLSG
 * or OSCOLA gate flags (waiNumber, nzpd, committee, minuteBookAbbrev, …).
 */
const GENERIC: Record<string, unknown> = {
  title: "Sample Title",
  authors: [{ givenNames: "Jane", surname: "Doe" }],
  author: "Jane Doe",
  year: 2020,
  date: "1 January 2020",
  publisher: "Publisher",
  place: "Melbourne",
  url: "https://example.org",
  journal: "Journal",
  volume: 1,
  startingPage: 10,
  party1: "A",
  party2: "B",
  reportSeries: "CLR",
  court: "HCA",
  caseNumber: "1",
  jurisdiction: "Cth",
  body: "UNGA",
  documentSymbol: "A/RES/1",
  text: "Free text",
};

/** Minimal data that reaches each standard's native path for a source type. */
const NATIVE_DATA: Record<CoverageStandard, Record<string, Record<string, unknown>>> = {
  oscola5: {
    "case.reported": { party1: "R", party2: "Jogee", neutralCitationYear: 2016, neutralCitationCourt: "UKSC", neutralCitationNumber: 8, year: 2017, yearType: "square", reportSeries: "AC", startingPage: 387 },
    "case.unreported.mnc": { party1: "R", party2: "Jogee", neutralCitationYear: 2016, neutralCitationCourt: "UKSC", neutralCitationNumber: 8 },
    "legislation.statute": { title: "Human Rights Act", year: 1998, jurisdiction: "UK" },
    "legislation.delegated": { title: "Working Time Regulations", year: 1998, number: 1833 },
    hansard: { chamber: "HC", date: "3 February 1977", volume: 925, column: 1421 },
    "report.parliamentary": { committee: "Home Affairs Committee", title: "Sample Report", session: "2005-06", paperNumber: "HC 123", year: 2006 },
    "report.law_reform": { title: "Sample Report", reportNumber: 350, year: 2014 },
    treaty: { title: "Sample Convention", adoptedDate: "1 January 2000", entryIntoForceDate: "1 January 2001", treatySeries: "UNTS", seriesVolume: 1, startingPage: 3 },
    "un.document": { body: "UNGA", title: "Sample Resolution", date: "1 January 2000", documentSymbol: "A/RES/1" },
    "icj.decision": { caseName: "A v B", year: 2000, reportSeries: "ICJ Rep", page: 1 },
    "icc_tribunal.case": { caseName: "Prosecutor v X", phase: "Judgment", court: "ICC", chamber: "Trial Chamber", caseNumber: "ICC-01/04", date: "1 January 2000" },
    "wto.document": { reportType: "Panel Report", title: "Sample Dispute", documentNumber: "WT/DS1/R", date: "1 January 2000" },
    "wto.decision": { reportType: "Appellate Body Report", title: "Sample Dispute", documentNumber: "WT/DS1/AB/R", date: "1 January 2000" },
    "eu.official_journal": { instrumentType: "Regulation", number: "2016/679", title: "General Data Protection Regulation", year: 2016, ojSeries: "L119", ojPage: "1" },
    "eu.court": { caseNumber: "C-1/00", party1: "A", party2: "B", ecli: "ECLI:EU:C:2000:1", year: 2000 },
    "echr.decision": { party1: "A", party2: "United Kingdom", respondentState: "United Kingdom", applicationNumber: "1/00", date: "1 January 2000" },
    genai_output: { platform: "ChatGPT", prompt: "Sample prompt", outputDate: "1 January 2025" },
    // STD-017
    "legislation.constitution": { title: "Bunreacht na hÉireann", jurisdiction: "IE", article: "40.3.1" },
    thesis: { author: "Jane Doe", title: "Sample Thesis", thesisType: "DPhil thesis", university: "University of Oxford", year: 2020 },
    internet_material: { author: "Jane Doe", title: "Sample Page", websiteName: "Sample Site", date: "1 January 2020", url: "https://example.org" },
    social_media: { author: "Jane Doe", handle: "@jane", title: "Sample post", platform: "Twitter", date: "1 January 2020", url: "https://x.com/jane/1" },
    film_tv_media: { medium: "Podcast", episodeTitle: "Sample Episode", seriesTitle: "Sample Podcast", date: "1 January 2020", url: "https://example.org/pod" },
    "supranational.decision": { caseName: "X v United Kingdom", body: "ECommHR", applicationNumber: "7215/75", date: "12 July 1978" },
    "supranational.document": { body: "Committee of Ministers", title: "Recommendation Rec(2004)6 on the Improvement of Domestic Remedies", date: "12 May 2004" },
    // STD-016 (shared formatter; native evidence is the output differing from AGLC4)
    "journal.article": GENERIC,
    "journal.online": GENERIC,
    "journal.forthcoming": GENERIC,
    book: GENERIC,
    "book.chapter": GENERIC,
    "book.translated": GENERIC,
    "book.ebook": GENERIC,
  },
  nzlsg3: {
    "case.reported": { caseName: "Hosking v Runting", year: 2004, courtIdentifier: "NZCA", decisionNumber: 34 },
    "case.unreported.mnc": { caseName: "Hosking v Runting", year: 2004, courtIdentifier: "NZCA", decisionNumber: 34 },
    "case.quasi_judicial": { caseName: "Re Sample Block", year: 2010, blockNumber: 12, minuteBookDistrict: "Tairawhiti", minuteBookAbbrev: "Gisborne MB", page: 5 },
    "report.waitangi_tribunal": { title: "Sample Report", waiNumber: 262, year: 2011 },
    report: { title: "Sample Report", waiNumber: 262, year: 2011 },
    treaty: { title: "Sample Convention", parties: "New Zealand–Australia", signingEvent: "signed 1 January 2000", treatySeries: "NZTS 2000 No 1" },
    "legislation.statute": { title: "Crimes Act", year: 1961, jurisdiction: "NZ" },
    "legislation.delegated": { title: "Sample Regulations", year: 2010 },
    "legislation.bill": { title: "Sample Bill", billNumber: "12-1" },
    hansard: { nzpd: true, date: "1 January 2000", volume: 600, page: 100 },
    "submission.government": { submitter: "Jane Doe", committee: "Justice Committee", inquiryTitle: "Sample Bill", date: "1 January 2000" },
    "report.parliamentary": { cabinetDocument: true, title: "Sample Paper", reference: "CAB-00-MIN-0001", date: "1 January 2000" },
    book: { author: "Jane Doe", title: "Sample Book", publisher: "Publisher", place: "Wellington", year: 2020 },
    "journal.article": { author: "Jane Doe", title: "Sample Article", year: 2020, volume: 1, journal: "NZ L Rev", startingPage: 10 },
    "report.law_reform": { title: "Sample Report", reportType: "R", reportNumber: 100, year: 2010 },
    thesis: { author: "Jane Doe", title: "Sample Thesis", degree: "LLM Thesis", university: "University of Auckland", year: 2020 },
    looseleaf: { editor: "Jane Doe", title: "Sample Service", publisher: "Publisher", accessDate: "1 January 2020" },
    "un.document": { body: "UNGA", title: "Sample Resolution", documentSymbol: "A/RES/1", date: "1 January 2000" },
    "icj.decision": { caseName: "A v B", year: 2000, icjReportsPage: 1 },
    // STD-017
    internet_material: { author: "Jane Doe", title: "Sample Page", websiteName: "Sample Site", date: "1 January 2020", url: "https://example.org" },
    social_media: { author: "Jane Doe", handle: "@jane", title: "Sample post", platform: "Twitter", date: "1 January 2020", url: "https://x.com/jane/1" },
    newspaper: { author: "Jane Doe", title: "Sample Article", newspaper: "The New Zealand Herald", place: "Auckland", date: "1 January 2020", page: "3" },
    film_tv_media: { title: "Sample Programme", presenter: "Kim Hill", network: "RNZ", date: "1 January 2020" },
    // STD-016 (shared formatter; native evidence is the output differing from AGLC4)
    "journal.online": GENERIC,
    "journal.forthcoming": GENERIC,
    "book.chapter": GENERIC,
    "book.translated": GENERIC,
    "book.audiobook": GENERIC,
    "book.ebook": GENERIC,
  },
};

/**
 * Data that reaches each wired formatter (gate flags per the fixture's
 * `reason`). Orphans and unlisted names fall back to GENERIC data of the
 * `via` type.
 */
interface Reach {
  data: Record<string, unknown>;
  subsequent?: boolean;
}

const REACH: Record<WiringStandard, Record<string, Reach>> = {
  oscola: {
    formatOscolaCase: { data: NATIVE_DATA.oscola5["case.reported"] },
    formatOscolaScottishCase: { data: { ...NATIVE_DATA.oscola5["case.reported"], jurisdiction: "Scot", reportSeries: "SC" } },
    formatOscolaNICase: { data: { ...NATIVE_DATA.oscola5["case.reported"], jurisdiction: "NI", reportSeries: "NI" } },
    formatIrishCase: { data: { party1: "A", party2: "B", jurisdiction: "IE", neutralCitationYear: 2010, neutralCitationCourt: "IESC", neutralCitationNumber: 1 } },
    formatIrishAct: { data: { title: "Sample Act", year: 2010, jurisdiction: "IE" } },
    formatIrishStatutoryInstrument: { data: { title: "Sample Regulations", year: 2010, jurisdiction: "IE", siNumber: 12 } },
    formatOscolaPrimaryLegislation: { data: NATIVE_DATA.oscola5["legislation.statute"] },
    formatOscolaSecondaryLegislation: { data: NATIVE_DATA.oscola5["legislation.delegated"] },
    formatOscolaHansard: { data: NATIVE_DATA.oscola5.hansard },
    formatOscolaCommandPaper: { data: { author: "Home Office", title: "Sample Paper", seriesPrefix: "Cm", paperNumber: "1234", year: 2006 } },
    formatOscolaLawCommission: { data: NATIVE_DATA.oscola5["report.law_reform"] },
    formatOscolaParliamentaryReport: { data: NATIVE_DATA.oscola5["report.parliamentary"] },
    formatEuLegislation: { data: NATIVE_DATA.oscola5["eu.official_journal"] },
    formatCjeuCase: { data: NATIVE_DATA.oscola5["eu.court"] },
    formatEuTreaty: { data: { title: "Treaty on European Union", year: 2012, ojReference: "[2012] OJ C326/13" } },
    formatEcthrCase: { data: NATIVE_DATA.oscola5["echr.decision"] },
    formatEcthrDecision: { data: { ...NATIVE_DATA.oscola5["echr.decision"], isDecision: true } },
    formatCouncilOfEuropeTreaty: { data: { title: "Sample Convention", adoptedDate: "4 November 1950", etsNumber: "5" } },
    formatTreaty: { data: NATIVE_DATA.oscola5.treaty },
    formatUnDocument: { data: NATIVE_DATA.oscola5["un.document"] },
    formatIcjCase: { data: NATIVE_DATA.oscola5["icj.decision"] },
    formatIccCase: { data: NATIVE_DATA.oscola5["icc_tribunal.case"] },
    formatWtoReport: { data: NATIVE_DATA.oscola5["wto.document"] },
    formatGenAiCitation: { data: NATIVE_DATA.oscola5.genai_output },
    // STD-017
    formatBunreachtNaHEireann: { data: NATIVE_DATA.oscola5["legislation.constitution"] },
    formatOscolaThesis: { data: NATIVE_DATA.oscola5.thesis },
    formatOscolaWebsite: { data: NATIVE_DATA.oscola5.internet_material },
    formatOscolaBlog: { data: { ...NATIVE_DATA.oscola5.internet_material, documentType: "Blog Post" } },
    formatOscolaSocialMedia: { data: NATIVE_DATA.oscola5.social_media },
    formatOscolaPodcast: { data: NATIVE_DATA.oscola5.film_tv_media },
    formatOscolaVideo: { data: { medium: "Online Video", author: "UK Supreme Court", title: "Sample Video", platform: "YouTube", date: "1 January 2020", url: "https://youtube.com/1" } },
    formatGeneralCourtCase: { data: { ...NATIVE_DATA.oscola5["eu.court"], caseNumber: "T-344/99" } },
    formatAssimilatedEuLaw: { data: { assimilated: true, instrumentType: "Regulation (EC)", number: "No 593/2008", title: "on the law applicable to contractual obligations", amendingSi: "2019/834", amendingProvision: "reg 10" } },
    formatEcommhrDecision: { data: { ...NATIVE_DATA.oscola5["echr.decision"], commission: true } },
    formatCouncilOfEuropeDocument: { data: NATIVE_DATA.oscola5["supranational.document"] },
    formatUnResolution: { data: { body: "UNSC", resolutionNumber: "1373", date: "28 September 2001", documentSymbol: "S/RES/1373" } },
    formatItlosCase: { data: { caseName: "The M/V “Saiga” (No 2) Case", tribunal: "ITLOS", phase: "Merits", year: 1999, page: 10 } },
    generateTableOfCases: { data: NATIVE_DATA.oscola5["case.reported"] },
    generateTableOfLegislation: { data: NATIVE_DATA.oscola5["legislation.statute"] },
  },
  nzlsg: {
    formatNeutralCitation: { data: NATIVE_DATA.nzlsg3["case.reported"] },
    formatPreNeutralCase: { data: { caseName: "A v B", court: "High Court", registry: "Wellington", fileNumber: "CIV-2000-485-1", date: "1 January 2000" } },
    formatMaoriLandCourt: { data: NATIVE_DATA.nzlsg3["case.quasi_judicial"] },
    formatWaitangiTribunalReport: { data: NATIVE_DATA.nzlsg3["report.waitangi_tribunal"] },
    formatTreatyOfWaitangi: { data: { treatyOfWaitangi: true, language: "english", article: 2 } },
    formatLegislation: { data: NATIVE_DATA.nzlsg3["legislation.statute"] },
    formatDelegatedLegislation: { data: NATIVE_DATA.nzlsg3["legislation.delegated"] },
    formatBill: { data: NATIVE_DATA.nzlsg3["legislation.bill"] },
    formatNZPD: { data: NATIVE_DATA.nzlsg3.hansard },
    formatSelectCommitteeSubmission: { data: NATIVE_DATA.nzlsg3["submission.government"] },
    formatCabinetDocument: { data: NATIVE_DATA.nzlsg3["report.parliamentary"] },
    formatNZGazette: { data: { gazette: true, title: "Sample Notice", year: 2000, page: 100 } },
    formatAJHR: { data: { ajhr: true, author: "Ministry of Justice", title: "Sample Report", reference: "E.1" } },
    formatBook: { data: NATIVE_DATA.nzlsg3.book },
    formatJournalArticle: { data: NATIVE_DATA.nzlsg3["journal.article"] },
    formatLawCommission: { data: NATIVE_DATA.nzlsg3["report.law_reform"] },
    formatThesis: { data: NATIVE_DATA.nzlsg3.thesis },
    formatOnlineLooseleaf: { data: NATIVE_DATA.nzlsg3.looseleaf },
    formatTreaty: { data: NATIVE_DATA.nzlsg3.treaty },
    formatUNDocument: { data: NATIVE_DATA.nzlsg3["un.document"] },
    formatICJCase: { data: NATIVE_DATA.nzlsg3["icj.decision"] },
    // STD-017
    formatNZWebsite: { data: NATIVE_DATA.nzlsg3.internet_material },
    formatNZBlog: { data: { ...NATIVE_DATA.nzlsg3.internet_material, documentType: "Blog Post" } },
    formatNZSocialMedia: { data: NATIVE_DATA.nzlsg3.social_media },
    formatNZNewspaper: { data: NATIVE_DATA.nzlsg3.newspaper },
    formatNZBroadcast: { data: NATIVE_DATA.nzlsg3.film_tv_media },
    formatGeneralSubsequent: { data: NATIVE_DATA.nzlsg3["case.reported"], subsequent: true },
    formatCommercialSubsequent: { data: { ...NATIVE_DATA.nzlsg3["case.reported"], nzlsgStyle: "commercial" }, subsequent: true },
  },
};

// ─── Evidence helpers ────────────────────────────────────────────────────────

interface NativeEvidence {
  invoked: string[];
  differsFromAglc: boolean;
  standardText: string;
  aglcText: string;
}

/** Renders one citation under the standard and under aglc4 and reports what happened. */
function nativeEvidence(std: CoverageStandard, sourceType: string, data: Record<string, unknown>): NativeEvidence {
  const citation = makeCitation(sourceType, data);
  const aglcRuns = render(citation, "aglc4");
  jest.clearAllMocks();
  const stdRuns = render(citation, std);
  return {
    invoked: invokedFormatters(RULE_STANDARD[std]),
    differsFromAglc: JSON.stringify(stdRuns) !== JSON.stringify(aglcRuns),
    standardText: plain(stdRuns),
    aglcText: plain(aglcRuns),
  };
}

function expectNative(std: CoverageStandard, sourceType: string, data: Record<string, unknown>): void {
  const ev = nativeEvidence(std, sourceType, data);
  expect({
    sourceType,
    handledNatively: ev.invoked.length > 0 || ev.differsFromAglc,
    invoked: ev.invoked,
    standardText: ev.standardText,
    aglcText: ev.aglcText,
  }).toMatchObject({ handledNatively: true });
}

function entriesOf(std: CoverageStandard, cls: CoverageClass): string[] {
  return Object.keys(SOURCE_TYPE_COVERAGE[std]).filter((t) => SOURCE_TYPE_COVERAGE[std][t].cls === cls);
}

beforeEach(() => jest.clearAllMocks());

// ─── (a) Every dispatch type classified, no phantom types ────────────────────

describe("STD-003 coverage contract: source-type classification", () => {
  test("SOURCE_DISPATCH keys were parsed from engine.ts and agree with the SourceType union", () => {
    expect(SOURCE_DISPATCH_KEYS.length).toBeGreaterThan(50);
    expect(SOURCE_DISPATCH_KEYS.slice().sort()).toEqual(sourceTypeUnion().slice().sort());
  });

  test("OSCOLA_DISPATCH and dispatchNzlsg gates were parsed from engine.ts", () => {
    expect(OSCOLA_DISPATCH_KEYS.length).toBeGreaterThan(0);
    expect(NZLSG_GATE_TYPES.length).toBeGreaterThan(0);
  });

  describe.each(COVERAGE_STANDARDS)("%s", (std) => {
    const table = SOURCE_TYPE_COVERAGE[std];

    test("every SOURCE_DISPATCH source type has a classification", () => {
      const missing = SOURCE_DISPATCH_KEYS.filter((t) => !(t in table));
      expect(missing).toEqual([]);
    });

    test("no classification names a source type that does not exist", () => {
      const unknown = Object.keys(table).filter((t) => SOURCE_DISPATCH_KEYS.indexOf(t) < 0);
      expect(unknown).toEqual([]);
    });

    test("every fallthrough-ok and unsupported entry carries a reason, every unsupported entry a story or a review reason", () => {
      const problems: string[] = [];
      for (const t of Object.keys(table)) {
        const e = table[t];
        if (e.cls !== "native" && !e.reason) problems.push(`${t}: no reason`);
        if (e.cls === "unsupported" && !e.story) problems.push(`${t}: unsupported without story`);
      }
      expect(problems).toEqual([]);
    });

    test("the native set matches the engine's dispatch table (shared-formatter entries aside)", () => {
      const engineNative = std === "oscola5" ? OSCOLA_DISPATCH_KEYS : NZLSG_GATE_TYPES;
      const dispatched = entriesOf(std, "native").filter((t) => !table[t].shared);
      expect(dispatched.sort()).toEqual(engineNative.slice().sort());
    });

    test("every shared-formatter native entry names STD-016 and is not in the dispatch table", () => {
      const engineNative = std === "oscola5" ? OSCOLA_DISPATCH_KEYS : NZLSG_GATE_TYPES;
      const problems = entriesOf(std, "native")
        .filter((t) => table[t].shared)
        .filter((t) => !table[t].reason?.startsWith("STD-016") || engineNative.indexOf(t) >= 0);
      expect(problems).toEqual([]);
    });
  });
});

// ─── (b) native, (c) unsupported, and fall-through behaviour ─────────────────

describe.each(COVERAGE_STANDARDS)("STD-003 coverage contract: rendering under %s", (std) => {
  describe("native", () => {
    test.each(entriesOf(std, "native"))("%s is handled by the standard's own formatter", (sourceType) => {
      const data = NATIVE_DATA[std][sourceType];
      expect(data).toBeDefined(); // add NATIVE_DATA when a type becomes native
      expectNative(std, sourceType, data);
    });
  });

  describe("fallthrough-ok", () => {
    test.each(entriesOf(std, "fallthrough-ok"))("%s renders the AGLC4 form untouched", (sourceType) => {
      const ev = nativeEvidence(std, sourceType, GENERIC);
      expect({ sourceType, invoked: ev.invoked, differsFromAglc: ev.differsFromAglc, standardText: ev.standardText, aglcText: ev.aglcText }).toMatchObject({
        invoked: [],
        differsFromAglc: false,
      });
    });
  });

  describe("unsupported (test.failing: flips red when the story lands)", () => {
    test.failing.each(entriesOf(std, "unsupported"))("%s is not yet handled by the standard", (sourceType) => {
      expectNative(std, sourceType, GENERIC);
    });
  });
});

// ─── (d) Formatter wiring ────────────────────────────────────────────────────

describe.each(WIRING_STANDARDS)("STD-003 coverage contract: formatter wiring for %s", (std) => {
  const table = FORMATTER_WIRING[std];
  const coverageStd: CoverageStandard = std === "oscola" ? "oscola5" : "nzlsg3";

  test("every exported formatter is listed exactly once, under its module", () => {
    const expected: Record<string, string> = {};
    for (const mod of RULE_MODULES[std]) {
      for (const name of exportedFunctions(std, mod)) expected[name] = mod;
    }
    const listed: Record<string, string> = {};
    for (const name of Object.keys(table)) listed[name] = table[name].module;
    expect(listed).toEqual(expected);
  });

  test("every unwired formatter names a story and a reason", () => {
    const problems = Object.keys(table).filter((n) => !table[n].wired && !(table[n].story && table[n].reason));
    expect(problems).toEqual([]);
  });

  const wiredNames = Object.keys(table).filter((n) => table[n].wired);
  const orphanNames = Object.keys(table).filter((n) => !table[n].wired);

  function reach(name: string): void {
    const entry = table[name];
    const via = entry.via as string;
    const r: Reach = REACH[std][name] ?? { data: GENERIC };
    const citation = makeCitation(via, r.data);
    if (entry.module === "tables") {
      bibliography.generateOscolaBibliography([citation]);
    } else {
      render(citation, coverageStd, r.subsequent ? SUBSEQUENT : undefined);
    }
    expect(formatterMock(std, entry.module, name)).toHaveBeenCalled();
  }

  describe("wired", () => {
    test.each(wiredNames)("%s is reached from the engine via its source type", (name) => {
      expect(table[name].via).toBeDefined();
      reach(name);
    });
  });

  describe("orphans (test.failing: flips red when STD-017 wires them)", () => {
    test.failing.each(orphanNames)("%s is reached for its intended source type", (name) => {
      reach(name);
    });
  });
});

// ─── (e) Summary ─────────────────────────────────────────────────────────────

afterAll(() => {
  const pad = (s: string, n: number): string => (s.length >= n ? s : s + " ".repeat(n - s.length));
  const lines: string[] = ["STD-003 coverage summary", pad("standard", 10) + pad("native", 8) + pad("fallthrough-ok", 16) + pad("unsupported", 13) + "unclassified"];
  for (const std of COVERAGE_STANDARDS) {
    const unclassified = Object.keys(SOURCE_TYPE_COVERAGE[std]).filter((t) => SOURCE_TYPE_COVERAGE[std][t].reason === "unclassified, review").length;
    lines.push(
      pad(std, 10) +
        pad(String(entriesOf(std, "native").length), 8) +
        pad(String(entriesOf(std, "fallthrough-ok").length), 16) +
        pad(String(entriesOf(std, "unsupported").length), 13) +
        String(unclassified)
    );
  }
  lines.push("", pad("formatters", 12) + pad("wired", 8) + "orphans");
  for (const std of WIRING_STANDARDS) {
    const names = Object.keys(FORMATTER_WIRING[std]);
    const orphans = names.filter((n) => !FORMATTER_WIRING[std][n].wired);
    lines.push(pad(std, 12) + pad(String(names.length - orphans.length), 8) + `${orphans.length} (${orphans.join(", ")})`);
  }
  console.info(lines.join("\n"));
});
