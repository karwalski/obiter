/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * STD-003 coverage contract — the declared support level of every engine
 * source type under OSCOLA 5 and NZLSG 3, and the wiring status of every
 * exported formatter in `src/engine/rules/oscola/*` and `src/engine/rules/nzlsg/*`.
 *
 * `tests/standards/coverage.test.ts` checks these tables against the engine:
 * the source-type keys are read from `SOURCE_DISPATCH` in `src/engine/engine.ts`
 * (parsed from the source text — the map is not exported) and the formatter
 * names from the rule modules' `export function` declarations, so a new
 * source type or formatter with no entry here fails the suite.
 *
 * Classes:
 * - `native`         — the standard has its own dispatch path for the type
 *                      (OSCOLA_DISPATCH entry / dispatchNzlsg gate). Where the
 *                      gate needs a data flag, `reason` names it. A native
 *                      entry with `shared: true` is rendered per the standard
 *                      by the shared AGLC formatter from the config (STD-016)
 *                      rather than by a dispatch entry; the suite proves it by
 *                      the output differing from the AGLC4 rendering.
 * - `fallthrough-ok` — the AGLC4 rendering is acceptable under the standard
 *                      (Australian-only forms, jurisdiction-specific foreign
 *                      forms, standard-neutral free text). `reason` says why.
 *                      "unclassified, review" marks a type whose treatment
 *                      under the standard was not settled from the rule
 *                      authority (Rule 1: never guess) — DECISION-040.
 * - `unsupported`    — the standard has its own form but Obiter renders the
 *                      AGLC4 one. `story` names the fix (STD-016 secondary
 *                      sources; the STD-017 orphaned formatters are now all
 *                      wired). When the story lands the entry must move to
 *                      `native`, or the `test.failing` guard in the suite
 *                      flips red.
 */

export type CoverageClass = "native" | "fallthrough-ok" | "unsupported";

export interface CoverageEntry {
  cls: CoverageClass;
  reason?: string;
  story?: string;
  /** Native through the config-aware shared formatter (STD-016), not a dispatch entry. */
  shared?: boolean;
}

export type CoverageStandard = "oscola5" | "nzlsg3";

// ─── Shared reasons ──────────────────────────────────────────────────────────

const AU_ONLY = "Australian-only AGLC4 form; no counterpart in the standard";
const FOREIGN = "jurisdiction-specific AGLC4 Part V form; AGLC rendering acceptable";
const FREE_TEXT = "standard-neutral free text";
const EXPERIMENTAL = "experimental AGLC5-pending form; the standard has no rule for it";
const REVIEW = "unclassified, review";

const native = (reason?: string): CoverageEntry => (reason ? { cls: "native", reason } : { cls: "native" });
/** STD-016: the shared AGLC formatter renders the standard's form from the config. */
const shared = (reason: string): CoverageEntry => ({ cls: "native", reason, shared: true });
const ok = (reason: string): CoverageEntry => ({ cls: "fallthrough-ok", reason });
const secondary = (reason: string): CoverageEntry => ({ cls: "unsupported", story: "STD-016", reason });

// ─── Foreign domestic sources (identical under both standards) ───────────────

const FOREIGN_TYPES: Record<string, CoverageEntry> = {
  "foreign.canada": ok(FOREIGN),
  "foreign.china": ok(FOREIGN),
  "foreign.france": ok(FOREIGN),
  "foreign.germany": ok(FOREIGN),
  "foreign.hong_kong": ok(FOREIGN),
  "foreign.malaysia": ok(FOREIGN),
  "foreign.new_zealand": ok(FOREIGN),
  "foreign.singapore": ok(FOREIGN),
  "foreign.south_africa": ok(FOREIGN),
  "foreign.uk": ok(FOREIGN),
  "foreign.usa": ok(FOREIGN),
  "foreign.other": ok(FOREIGN),
};

// ─── Source-type coverage ────────────────────────────────────────────────────

export const SOURCE_TYPE_COVERAGE: Record<CoverageStandard, Record<string, CoverageEntry>> = {
  oscola5: {
    // Domestic cases
    "case.reported": native("OSCOLA_DISPATCH → UK / Scottish / NI / Irish case formatters by courtId or jurisdiction"),
    "case.unreported.mnc": native("OSCOLA_DISPATCH → formatOscolaCase (neutral citation)"),
    "case.unreported.no_mnc": ok(REVIEW),
    "case.proceeding": ok(AU_ONLY),
    "case.court_order": ok(AU_ONLY),
    "case.quasi_judicial": ok("Australian tribunal form (AGLC 2.6)"),
    "case.arbitration": ok(REVIEW),
    "case.transcript": ok("Australian transcript form (AGLC 2.7)"),
    "case.submission": ok(AU_ONLY),

    // Domestic legislation
    "legislation.statute": native("OSCOLA_DISPATCH → primary / secondary / Irish legislation formatters"),
    "legislation.bill": ok(REVIEW),
    "legislation.delegated": native("OSCOLA_DISPATCH → formatOscolaSecondaryLegislation"),
    "legislation.constitution": native("OSCOLA_DISPATCH → formatBunreachtNaHEireann when jurisdiction is IE (or the title is Bunreacht na hÉireann); other constitutions keep the AGLC 3.6 form"),
    "legislation.explanatory": ok(REVIEW),
    "legislation.quasi": ok(AU_ONLY),

    // Secondary sources
    "journal.article": shared("STD-016: formatJournalArticle renders OSCOLA 5 §3.3 from the config"),
    "journal.online": shared("STD-016: formatJournalArticle renders OSCOLA 5 §3.3 from the config"),
    "journal.forthcoming": shared("STD-016: formatJournalArticle renders OSCOLA 5 §3.3 from the config"),
    book: shared("STD-016: formatBook renders OSCOLA 5 §3.2.1 from the config"),
    "book.chapter": shared("STD-016: formatBookChapter renders OSCOLA 5 §3.2.4 from the config"),
    "book.translated": shared("STD-016: formatBook renders OSCOLA 5 §3.2.1 from the config"),
    "book.audiobook": secondary("renders AGLC 6.9 form"),
    "book.ebook": shared("STD-016: formatBook renders OSCOLA 5 §3.2.1 from the config"),
    report: secondary("renders AGLC 7.1 form"),
    "report.parliamentary": native("OSCOLA_DISPATCH → command paper / Law Commission / select committee formatters"),
    "report.royal_commission": ok(REVIEW),
    "report.law_reform": native("OSCOLA_DISPATCH → formatOscolaLawCommission when reportNumber is set, else formatOscolaParliamentaryReport"),
    "report.waitangi_tribunal": ok("NZ-only body; AGLC report form acceptable under OSCOLA"),
    "report.abs": ok(AU_ONLY),
    research_paper: secondary("renders AGLC 7.2 form"),
    "research_paper.parliamentary": secondary("renders AGLC 7.2.3 form"),
    conference_paper: secondary("renders AGLC 7.2.4 form"),
    thesis: native("OSCOLA_DISPATCH → formatOscolaThesis (OSCOLA 5 §3.7.6 italic; OSCOLA 4 §3.4.7 quoted via thesisTitleStyle)"),
    speech: secondary("renders AGLC 7.3 form"),
    press_release: secondary("renders AGLC 7.4 form"),
    hansard: native("OSCOLA_DISPATCH → formatOscolaHansard"),
    "submission.government": ok(AU_ONLY),
    "evidence.parliamentary": ok(AU_ONLY),
    constitutional_convention: ok(AU_ONLY),
    dictionary: secondary("renders AGLC 7.6 form"),
    legal_encyclopedia: secondary("renders AGLC 7.7 form"),
    looseleaf: secondary("renders AGLC 7.8 form"),
    ip_material: ok(REVIEW),
    constitutive_document: ok(REVIEW),
    periodical: secondary("renders AGLC 7.11.3 form"),
    newspaper: secondary("renders AGLC 7.11 form"),
    correspondence: secondary("renders AGLC 7.12 form"),
    interview: secondary("renders AGLC 7.13 form"),
    film_tv_media: native("OSCOLA_DISPATCH → formatOscolaPodcast (medium Podcast or Radio) or formatOscolaVideo (medium Video); films and television keep the AGLC 7.14 form"),
    internet_material: native("OSCOLA_DISPATCH → formatOscolaBlog (documentType Blog Post, blogName or isBlog) or formatOscolaWebsite"),
    social_media: native("OSCOLA_DISPATCH → formatOscolaSocialMedia"),
    genai_output: native("OSCOLA_DISPATCH → formatGenAiCitation"),
    dataset: ok(EXPERIMENTAL),
    software: ok(EXPERIMENTAL),

    // International materials
    treaty: native("OSCOLA_DISPATCH → treaty / Council of Europe treaty / EU treaty formatters by data"),
    "treaty.mou": ok(REVIEW),
    "un.charter": ok(REVIEW),
    "un.document": native("OSCOLA_DISPATCH → formatUnResolution for a numbered resolution without a title (or documentType resolution), else formatUnDocument"),
    "un.communication": ok(REVIEW),
    "un.yearbook": ok(REVIEW),
    "icj.decision": native("OSCOLA_DISPATCH → formatItlosCase when tribunal or court is ITLOS, else formatIcjCase"),
    "icj.pleading": ok(REVIEW),
    "arbitral.state_state": ok(REVIEW),
    "arbitral.individual_state": ok(REVIEW),
    "icc_tribunal.case": native("OSCOLA_DISPATCH → formatIccCase"),
    "wto.document": native("OSCOLA_DISPATCH → formatWtoReport"),
    "wto.decision": native("OSCOLA_DISPATCH → formatWtoReport"),
    "gatt.document": ok(REVIEW),
    "eu.official_journal": native("OSCOLA_DISPATCH → formatAssimilatedEuLaw when assimilated is set, else formatEuLegislation"),
    "eu.court": native("OSCOLA_DISPATCH → formatGeneralCourtCase for a T- case number or court General Court, else formatCjeuCase"),
    "echr.decision": native("OSCOLA_DISPATCH → formatEcommhrDecision when commission is set or the body is ECommHR; formatEcthrCase / formatEcthrDecision by isDecision"),
    "supranational.decision": native("OSCOLA_DISPATCH → formatEcommhrDecision when the body is ECommHR (or commission is set); other bodies keep the AGLC 14.4 form"),
    "supranational.document": native("OSCOLA_DISPATCH → formatCouncilOfEuropeDocument when the body is the Council of Europe, its Committee of Ministers or Parliamentary Assembly (or councilOfEurope is set); other bodies keep the AGLC 14.5 form"),

    // Foreign domestic sources
    ...FOREIGN_TYPES,

    // Custom / manual
    custom: ok(FREE_TEXT),
    explanatory_note: ok(FREE_TEXT),
  },

  nzlsg3: {
    // Domestic cases
    "case.reported": native("dispatchNzlsg → formatNeutralCitation, or formatPreNeutralCase when fileNumber is set"),
    "case.unreported.mnc": native("dispatchNzlsg → formatNeutralCitation, or formatPreNeutralCase when fileNumber is set"),
    "case.unreported.no_mnc": ok(REVIEW),
    "case.proceeding": ok(AU_ONLY),
    "case.court_order": ok(AU_ONLY),
    "case.quasi_judicial": native("dispatchNzlsg → formatMaoriLandCourt when minuteBookAbbrev is set; other tribunals fall through to AGLC 2.6"),
    "case.arbitration": ok(AU_ONLY),
    "case.transcript": ok("Australian transcript form (AGLC 2.7)"),
    "case.submission": ok(AU_ONLY),

    // Domestic legislation
    "legislation.statute": native("dispatchNzlsg → formatLegislation"),
    "legislation.bill": native("dispatchNzlsg → formatBill"),
    "legislation.delegated": native("dispatchNzlsg → formatDelegatedLegislation"),
    "legislation.constitution": ok("NZ has no single constitutional instrument; the Constitution Act 1986 is cited as legislation.statute"),
    "legislation.explanatory": ok(REVIEW),
    "legislation.quasi": ok(AU_ONLY),

    // Secondary sources
    "journal.article": native("dispatchNzlsg → formatJournalArticle"),
    "journal.online": shared("STD-016: formatJournalArticle renders NZLSG 3 §6.4 from the config"),
    "journal.forthcoming": shared("STD-016: formatJournalArticle renders NZLSG 3 §6.4 from the config"),
    book: native("dispatchNzlsg → formatBook"),
    "book.chapter": shared("STD-016: formatBookChapter renders NZLSG 3 §6.2 from the config"),
    "book.translated": shared("STD-016: formatBook renders NZLSG 3 §6.1.1 from the config"),
    "book.audiobook": shared("STD-016: formatBook renders NZLSG 3 §6.1.1 from the config"),
    "book.ebook": shared("STD-016: formatBook renders NZLSG 3 §6.1.1 from the config"),
    report: native("dispatchNzlsg → formatWaitangiTribunalReport when waiNumber is set; other reports render the AGLC 7.1 form"),
    "report.parliamentary": native("dispatchNzlsg → cabinet document / Gazette / AJHR formatters by cabinetDocument, gazette or ajhr flag; otherwise AGLC 7.1.2"),
    "report.royal_commission": ok(REVIEW),
    "report.law_reform": native("dispatchNzlsg → formatLawCommission when reportType is set"),
    "report.waitangi_tribunal": native("dispatchNzlsg → formatWaitangiTribunalReport"),
    "report.abs": ok(AU_ONLY),
    research_paper: secondary("renders AGLC 7.2 form"),
    "research_paper.parliamentary": secondary("renders AGLC 7.2.3 form"),
    conference_paper: secondary("renders AGLC 7.2.4 form"),
    thesis: native("dispatchNzlsg → formatThesis"),
    speech: secondary("renders AGLC 7.3 form"),
    press_release: secondary("renders AGLC 7.4 form"),
    hansard: native("dispatchNzlsg → formatNZPD when nzpd is set; otherwise AGLC 7.5.1"),
    "submission.government": native("dispatchNzlsg → formatSelectCommitteeSubmission when committee is set; otherwise AGLC 7.5.2"),
    "evidence.parliamentary": ok(AU_ONLY),
    constitutional_convention: ok(AU_ONLY),
    dictionary: secondary("renders AGLC 7.6 form"),
    legal_encyclopedia: secondary("renders AGLC 7.7 form"),
    looseleaf: native("dispatchNzlsg → formatOnlineLooseleaf"),
    ip_material: ok(REVIEW),
    constitutive_document: ok(REVIEW),
    periodical: secondary("renders AGLC 7.11.3 form"),
    newspaper: native("dispatchNzlsg → formatNZNewspaper"),
    correspondence: secondary("renders AGLC 7.12 form"),
    interview: secondary("renders AGLC 7.13 form"),
    film_tv_media: native("dispatchNzlsg → formatNZBroadcast"),
    internet_material: native("dispatchNzlsg → formatNZBlog (documentType Blog Post, blogName or isBlog, with an author and date) or formatNZWebsite"),
    social_media: native("dispatchNzlsg → formatNZSocialMedia"),
    genai_output: ok(EXPERIMENTAL),
    dataset: ok(EXPERIMENTAL),
    software: ok(EXPERIMENTAL),

    // International materials
    treaty: native("dispatchNzlsg → formatTreatyOfWaitangi when treatyOfWaitangi is set; otherwise formatTreaty"),
    "treaty.mou": ok(REVIEW),
    "un.charter": ok(REVIEW),
    "un.document": native("dispatchNzlsg → formatUNDocument"),
    "un.communication": ok(REVIEW),
    "un.yearbook": ok(REVIEW),
    "icj.decision": native("dispatchNzlsg → formatICJCase"),
    "icj.pleading": ok(REVIEW),
    "arbitral.state_state": ok(REVIEW),
    "arbitral.individual_state": ok(REVIEW),
    "icc_tribunal.case": ok(REVIEW),
    "wto.document": ok(REVIEW),
    "wto.decision": ok(REVIEW),
    "gatt.document": ok(REVIEW),
    "eu.official_journal": ok(REVIEW),
    "eu.court": ok(REVIEW),
    "echr.decision": ok(REVIEW),
    "supranational.decision": ok(REVIEW),
    "supranational.document": ok(REVIEW),

    // Foreign domestic sources
    ...FOREIGN_TYPES,

    // Custom / manual
    custom: ok(FREE_TEXT),
    explanatory_note: ok(FREE_TEXT),
  },
};

// ─── Formatter wiring ────────────────────────────────────────────────────────

export interface FormatterWiring {
  /** Module basename under src/engine/rules/<standard>/ (no extension). */
  module: string;
  wired: boolean;
  /** Source type that reaches the formatter (or, for an orphan, the type it is intended for). */
  via?: string;
  story?: string;
  reason?: string;
}

export type WiringStandard = "oscola" | "nzlsg";

const wired = (module: string, via: string, reason?: string): FormatterWiring =>
  reason ? { module, wired: true, via, reason } : { module, wired: true, via };

export const FORMATTER_WIRING: Record<WiringStandard, Record<string, FormatterWiring>> = {
  oscola: {
    // cases.ts / cases-scotland.ts / cases-ni.ts / ireland.ts
    formatOscolaCase: wired("cases", "case.reported"),
    formatOscolaScottishCase: wired("cases-scotland", "case.reported", "Scottish courtId or jurisdiction Scot"),
    formatOscolaNICase: wired("cases-ni", "case.reported", "NI courtId or jurisdiction NI"),
    formatIrishCase: wired("ireland", "case.reported", "Irish courtId or jurisdiction IE"),
    formatIrishAct: wired("ireland", "legislation.statute", "jurisdiction IE"),
    formatIrishStatutoryInstrument: wired("ireland", "legislation.statute", "jurisdiction IE with siNumber"),
    formatBunreachtNaHEireann: wired("ireland", "legislation.constitution", "jurisdiction IE"),

    // legislation.ts
    formatOscolaPrimaryLegislation: wired("legislation", "legislation.statute"),
    formatOscolaSecondaryLegislation: wired("legislation", "legislation.delegated"),

    // parliamentary.ts
    formatOscolaHansard: wired("parliamentary", "hansard"),
    formatOscolaCommandPaper: wired("parliamentary", "report.parliamentary", "reportType command_paper or seriesPrefix"),
    formatOscolaLawCommission: wired("parliamentary", "report.law_reform", "reportNumber set"),
    formatOscolaParliamentaryReport: wired("parliamentary", "report.parliamentary"),

    // secondary.ts
    formatOscolaThesis: wired("secondary", "thesis"),

    // digital.ts
    formatOscolaWebsite: wired("digital", "internet_material"),
    formatOscolaBlog: wired("digital", "internet_material", "documentType Blog Post, blogName or isBlog"),
    formatOscolaSocialMedia: wired("digital", "social_media"),
    formatOscolaPodcast: wired("digital", "film_tv_media", "medium Podcast or Radio"),
    formatOscolaVideo: wired("digital", "film_tv_media", "medium Video / Online Video"),

    // eu.ts
    formatEuLegislation: wired("eu", "eu.official_journal"),
    formatCjeuCase: wired("eu", "eu.court"),
    formatGeneralCourtCase: wired("eu", "eu.court", "caseNumber T-… or court General Court"),
    formatAssimilatedEuLaw: wired("eu", "eu.official_journal", "assimilated set"),
    formatEuTreaty: wired("eu", "treaty", "ojReference set"),

    // echr.ts
    formatEcthrCase: wired("echr", "echr.decision"),
    formatEcthrDecision: wired("echr", "echr.decision", "isDecision set"),
    formatEcommhrDecision: wired("echr", "echr.decision", "commission set or body ECommHR (also supranational.decision with body ECommHR)"),
    formatCouncilOfEuropeTreaty: wired("echr", "treaty", "etsNumber or shortTitle set"),
    formatCouncilOfEuropeDocument: wired("echr", "supranational.document", "body Council of Europe / Committee of Ministers / Parliamentary Assembly, or councilOfEurope set"),

    // international.ts
    formatTreaty: wired("international", "treaty"),
    formatUnDocument: wired("international", "un.document"),
    formatUnResolution: wired("international", "un.document", "resolutionNumber without a title, or documentType resolution"),
    formatIcjCase: wired("international", "icj.decision"),
    formatItlosCase: wired("international", "icj.decision", "tribunal or court ITLOS (kept as an icj.decision sibling: the '(year) ITLOS Reports page' form parallels '[year] ICJ Rep page')"),
    formatIccCase: wired("international", "icc_tribunal.case"),
    formatWtoReport: wired("international", "wto.document"),

    // genai.ts
    formatGenAiCitation: wired("genai", "genai_output"),

    // tables.ts — bibliography generators, reached through generateOscolaBibliography, not formatCitation
    generateTableOfCases: wired("tables", "case.reported", "bibliography: generateOscolaBibliography"),
    generateTableOfLegislation: wired("tables", "legislation.statute", "bibliography: generateOscolaBibliography"),
  },

  nzlsg: {
    // cases.ts
    formatNeutralCitation: wired("cases", "case.reported"),
    formatPreNeutralCase: wired("cases", "case.reported", "fileNumber set"),

    // maori-land-court.ts / waitangi.ts / treaty-of-waitangi.ts
    formatMaoriLandCourt: wired("maori-land-court", "case.quasi_judicial", "minuteBookAbbrev set"),
    formatWaitangiTribunalReport: wired("waitangi", "report.waitangi_tribunal"),
    formatTreatyOfWaitangi: wired("treaty-of-waitangi", "treaty", "treatyOfWaitangi set"),

    // legislation.ts
    formatLegislation: wired("legislation", "legislation.statute"),
    formatDelegatedLegislation: wired("legislation", "legislation.delegated"),
    formatBill: wired("legislation", "legislation.bill"),

    // parliamentary.ts
    formatNZPD: wired("parliamentary", "hansard", "nzpd set"),
    formatSelectCommitteeSubmission: wired("parliamentary", "submission.government", "committee set"),
    formatCabinetDocument: wired("parliamentary", "report.parliamentary", "cabinetDocument set"),
    formatNZGazette: wired("parliamentary", "report.parliamentary", "gazette set"),
    formatAJHR: wired("parliamentary", "report.parliamentary", "ajhr set"),

    // secondary.ts
    formatBook: wired("secondary", "book"),
    formatJournalArticle: wired("secondary", "journal.article"),
    formatLawCommission: wired("secondary", "report.law_reform", "reportType set"),
    formatThesis: wired("secondary", "thesis"),
    formatOnlineLooseleaf: wired("secondary", "looseleaf"),

    // digital.ts
    formatNZWebsite: wired("digital", "internet_material"),
    formatNZBlog: wired("digital", "internet_material", "documentType Blog Post, blogName or isBlog, with an author and date"),
    formatNZSocialMedia: wired("digital", "social_media"),
    formatNZNewspaper: wired("digital", "newspaper"),
    formatNZBroadcast: wired("digital", "film_tv_media"),

    // international.ts
    formatTreaty: wired("international", "treaty"),
    formatUNDocument: wired("international", "un.document"),
    formatICJCase: wired("international", "icj.decision"),

    // styles.ts — subsequent-reference formatters, reached through resolveNzlsgSubsequent
    formatGeneralSubsequent: wired("styles", "case.reported", "subsequent reference, general style"),
    formatCommercialSubsequent: wired("styles", "case.reported", "subsequent reference, nzlsgStyle commercial"),
  },
};
