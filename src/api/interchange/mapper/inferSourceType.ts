/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * inferSourceType.ts — chooses an Obiter source type for an interchange
 * record from its provenance, its kind and its fields.
 *
 * Order of precedence: an Obiter type carried through a round trip; a UTS
 * or EndNote reference-type name that maps one-to-one; then content rules
 * for legal kinds (reporter present, medium neutral citation, court and
 * date); title re-classification for legislation (Bill, Regulations,
 * Constitution, Explanatory Memorandum); body rules for reports; and a
 * direct table for the secondary kinds. Records with no AGLC4 home go to
 * `custom` rather than being forced into a form they do not fit.
 */

import type { SourceType } from "../../../types/citation";
import type { InterchangeIssue, InterchangeKind, InterchangeRecord } from "../model";
import { issue } from "../model";
import { normaliseEndnoteTypeName } from "./kinds";
import {
  isAustralianJurisdiction,
  normaliseJurisdiction,
  parseMnc,
  parseReportCitation,
  parseStatuteTitle,
  resolveCourt,
  resolveSeries,
} from "./legal";

export interface SourceTypeInference {
  sourceType: SourceType;
  confidence: number;
  reasons: string[];
  issues: InterchangeIssue[];
}

/** The full set of Obiter source types, for validating round-trip values. */
const KNOWN_SOURCE_TYPES = new Set<string>([
  "case.reported",
  "case.unreported.mnc",
  "case.unreported.no_mnc",
  "case.proceeding",
  "case.court_order",
  "case.quasi_judicial",
  "case.arbitration",
  "case.transcript",
  "case.submission",
  "legislation.statute",
  "legislation.bill",
  "legislation.delegated",
  "legislation.constitution",
  "legislation.explanatory",
  "legislation.quasi",
  "journal.article",
  "journal.online",
  "journal.forthcoming",
  "book",
  "book.chapter",
  "book.translated",
  "book.audiobook",
  "book.ebook",
  "report",
  "report.parliamentary",
  "report.royal_commission",
  "report.law_reform",
  "report.waitangi_tribunal",
  "report.abs",
  "research_paper",
  "research_paper.parliamentary",
  "conference_paper",
  "thesis",
  "speech",
  "press_release",
  "hansard",
  "submission.government",
  "evidence.parliamentary",
  "constitutional_convention",
  "dictionary",
  "legal_encyclopedia",
  "looseleaf",
  "ip_material",
  "constitutive_document",
  "periodical",
  "newspaper",
  "correspondence",
  "interview",
  "film_tv_media",
  "internet_material",
  "social_media",
  "genai_output",
  "dataset",
  "software",
  "treaty",
  "treaty.mou",
  "un.charter",
  "un.document",
  "un.communication",
  "un.yearbook",
  "icj.decision",
  "icj.pleading",
  "arbitral.state_state",
  "arbitral.individual_state",
  "icc_tribunal.case",
  "wto.document",
  "wto.decision",
  "gatt.document",
  "eu.official_journal",
  "eu.court",
  "echr.decision",
  "supranational.decision",
  "supranational.document",
  "foreign.canada",
  "foreign.china",
  "foreign.france",
  "foreign.germany",
  "foreign.hong_kong",
  "foreign.malaysia",
  "foreign.new_zealand",
  "foreign.singapore",
  "foreign.south_africa",
  "foreign.uk",
  "foreign.usa",
  "foreign.other",
  "custom",
  "explanatory_note",
]);

export function isKnownSourceType(value: string | undefined): value is SourceType {
  return value !== undefined && KNOWN_SOURCE_TYPES.has(value);
}

/** UTS AGLC4 and EndNote default type names that map one-to-one. */
const ENDNOTE_NAME_TO_SOURCE_TYPE: Readonly<Record<string, SourceType>> = {
  "case (reported)": "case.reported",
  "case (reported, without short title)": "case.reported",
  "case (medium neutral)": "case.unreported.mnc",
  "case (unreported no medium neutral)": "case.unreported.no_mnc",
  "case transcript": "case.transcript",
  "case submission": "case.submission",
  "case (arbitral)": "case.arbitration",
  statute: "legislation.statute",
  "statute without short title": "legislation.statute",
  bill: "legislation.bill",
  "parl. debate": "hansard",
  "parl. paper or committee report": "report.parliamentary",
  "royal or law reform commission": "report.law_reform",
  "research or working paper": "research_paper",
  "unpublished work": "research_paper",
  "bills digest or alert digest": "research_paper.parliamentary",
  speech: "speech",
  "written correspondence": "correspondence",
  interview: "interview",
  "internet material with author": "internet_material",
  "internet material without author": "internet_material",
  "blog post": "internet_material",
  "social media post": "social_media",
  dictionary: "dictionary",
  "looseleaf service": "looseleaf",
  treaty: "treaty",
  "memorandum of understanding": "treaty.mou",
  "united nations document": "un.document",
  "wto or gatt document": "wto.document",
  "wto or gatt panel, appellate, arbitral decisions": "wto.decision",
  "internatl courts of justice": "icj.decision",
  "internatl criminal tribunals, courts": "icc_tribunal.case",
  "internatl arbitral, tribunal decisions": "arbitral.state_state",
  "internatl unreported": "arbitral.individual_state",
  pleadings: "icj.pleading",
  "statute (united kingdom)": "foreign.uk",
  "statute (canada)": "foreign.canada",
  "statute (united states code)": "foreign.usa",
  "statute (united states session)": "foreign.usa",
  "bill or resolution (us)": "foreign.usa",
  gazette: "legislation.quasi",
  film: "film_tv_media",
  "television, radio & audiovisual": "film_tv_media",
  podcast: "film_tv_media",
  "magazine article": "periodical",
  "newspaper article": "newspaper",
  "electronic article": "journal.online",
  "journal article": "journal.article",
  book: "book",
  "edited book": "book",
  "book chapter": "book.chapter",
  "book section": "book.chapter",
  "conference paper": "conference_paper",
  thesis: "thesis",
  "web page": "internet_material",
  "personal communication": "correspondence",
  "press release": "press_release",
  hearing: "evidence.parliamentary",
  "legal rule or regulation": "legislation.delegated",
  "government document": "report",
  report: "report",
  encyclopedia: "legal_encyclopedia",
  dataset: "dataset",
  "computer program": "software",
};

const SECONDARY_BY_KIND: Readonly<Partial<Record<InterchangeKind, SourceType>>> = {
  "case-transcript": "case.transcript",
  "case-submission": "case.submission",
  "explanatory-memorandum": "legislation.explanatory",
  gazette: "legislation.quasi",
  hansard: "hansard",
  hearing: "evidence.parliamentary",
  submission: "submission.government",
  treaty: "treaty",
  mou: "treaty.mou",
  "un-document": "un.document",
  chapter: "book.chapter",
  thesis: "thesis",
  conference: "conference_paper",
  speech: "speech",
  "press-release": "press_release",
  newspaper: "newspaper",
  periodical: "periodical",
  web: "internet_material",
  blog: "internet_material",
  social: "social_media",
  correspondence: "correspondence",
  interview: "interview",
  broadcast: "film_tv_media",
  film: "film_tv_media",
  podcast: "film_tv_media",
  dictionary: "dictionary",
  encyclopedia: "legal_encyclopedia",
  looseleaf: "looseleaf",
  dataset: "dataset",
  software: "software",
  genai: "genai_output",
};

function text(record: InterchangeRecord, ...values: Array<string | undefined>): string {
  return [record.title, ...values, ...record.notes].filter(Boolean).join(" ‖ ");
}

function foreignFromJurisdiction(code: string | undefined): SourceType | undefined {
  switch (code) {
    case "UK":
      return "foreign.uk";
    case "NZ":
      return "foreign.new_zealand";
    case "US":
      return "foreign.usa";
    case "Canada":
      return "foreign.canada";
    default:
      return undefined;
  }
}

function inferCase(
  record: InterchangeRecord,
  reasons: string[],
  issues: InterchangeIssue[]
): SourceType {
  const legal = record.legal ?? {};
  const haystack = text(
    record,
    legal.caseName,
    record.passthrough.citation as string | undefined,
    record.containerTitle
  );

  const series = resolveSeries(legal.reporter ?? record.containerTitle);
  const court = resolveCourt(legal.courtCode ?? legal.courtName);
  const foreignHint =
    series?.foreign ??
    court?.foreign ??
    foreignFromJurisdiction(normaliseJurisdiction(legal.jurisdiction));
  if (foreignHint) {
    reasons.push(`Reporter or court belongs to ${foreignHint}`);
    issues.push(
      issue(
        "info",
        "foreign-routed",
        `Routed to a foreign case form because the reporter or court is from ${foreignHint}.`
      )
    );
    return series?.foreign === "UK" || court?.foreign === "UK" || foreignHint === "UK"
      ? "foreign.uk"
      : series?.foreign === "NZ" || court?.foreign === "NZ" || foreignHint === "NZ"
        ? "foreign.new_zealand"
        : (foreignFromJurisdiction(normaliseJurisdiction(legal.jurisdiction)) ?? "foreign.other");
  }

  const hasReporter = series !== undefined && !series.isCourtCode;
  const hasPage = Boolean(legal.firstPage ?? record.pageFirst);
  const embedded = parseReportCitation(haystack);
  if ((hasReporter && (hasPage || legal.reporterVolume)) || embedded) {
    reasons.push(
      embedded
        ? `Report citation found: ${embedded.raw}`
        : `Reporter ${series?.abbreviation} with page`
    );
    if (series && !series.known) {
      issues.push(
        issue(
          "warning",
          "unknown-report-series",
          `The report series "${series.abbreviation}" is not in Obiter's tables. Check the abbreviation.`
        )
      );
    }
    return "case.reported";
  }

  const mnc = legal.mnc ?? parseMnc(haystack) ?? parseMnc(legal.docket);
  const courtCodeFromReporter = series?.isCourtCode ? series.abbreviation : undefined;
  if (
    mnc ||
    (courtCodeFromReporter && legal.docket) ||
    (court?.code && /^\d+$/.test(legal.docket ?? "") && !hasReporter)
  ) {
    reasons.push(
      mnc ? `Medium neutral citation ${mnc.raw}` : "Court identifier with a judgment number"
    );
    return "case.unreported.mnc";
  }

  if (legal.decidedDate ?? record.issued) {
    reasons.push("No reporter or medium neutral citation; court and date present");
    return "case.unreported.no_mnc";
  }
  if (legal.proceedingNumber ?? legal.docket) {
    reasons.push("Proceeding number without a decision date");
    return "case.proceeding";
  }
  reasons.push("No reporter, medium neutral citation or date; defaulted to unreported");
  return "case.unreported.no_mnc";
}

function inferLegislation(
  record: InterchangeRecord,
  kind: InterchangeKind,
  reasons: string[],
  issues: InterchangeIssue[]
): SourceType {
  const legal = record.legal ?? {};
  const parsed = parseStatuteTitle(record.title);
  const jurisdiction = normaliseJurisdiction(legal.jurisdiction) ?? parsed?.jurisdiction;
  const foreign = foreignFromJurisdiction(jurisdiction);
  if (foreign && !isAustralianJurisdiction(jurisdiction)) {
    reasons.push(`Jurisdiction ${jurisdiction} is outside chapter 3`);
    issues.push(
      issue(
        "info",
        "foreign-routed",
        `Routed to a foreign legislation form because the jurisdiction is ${jurisdiction}.`
      )
    );
    return foreign;
  }
  if (/^(Revised\s+)?Explanatory (Memorandum|Statement|Notes?)/i.test(record.title ?? "")) {
    reasons.push("Title begins with Explanatory Memorandum");
    return "legislation.explanatory";
  }
  const form =
    kind === "bill"
      ? "bill"
      : kind === "regulation"
        ? "delegated"
        : kind === "constitution"
          ? "constitution"
          : parsed?.form;
  switch (form) {
    case "bill":
      reasons.push("Bill");
      return "legislation.bill";
    case "constitution":
      reasons.push("Constitution");
      return "legislation.constitution";
    case "delegated":
      reasons.push("Delegated legislation by title");
      return "legislation.delegated";
    default:
      reasons.push("Statute");
      return "legislation.statute";
  }
}

function inferReport(record: InterchangeRecord, reasons: string[]): SourceType {
  const body = [
    ...record.creators.filter((c) => c.literal).map((c) => c.literal ?? ""),
    record.institution ?? "",
    record.publisher ?? "",
    record.genre ?? "",
    record.passthrough.commission as string | undefined,
  ]
    .filter(Boolean)
    .join(" ");
  const haystack = `${record.title ?? ""} ${body}`;
  if (/law reform|\b(ALRC|NSWLRC|VLRC|QLRC|WALRC|TLRI)\b|law commission/i.test(haystack)) {
    reasons.push("Law reform commission");
    return "report.law_reform";
  }
  if (/royal commission|board of inquiry/i.test(haystack)) {
    reasons.push("Royal Commission");
    return "report.royal_commission";
  }
  if (
    record.legal?.legislature ||
    /committee|senate|house of representatives|legislative (council|assembly)|parliamentary paper/i.test(
      haystack
    )
  ) {
    reasons.push("Parliamentary committee or paper");
    return "report.parliamentary";
  }
  if (/australian bureau of statistics|\bABS\b/i.test(body)) {
    reasons.push("Australian Bureau of Statistics");
    return "report.abs";
  }
  if (/waitangi tribunal/i.test(haystack)) {
    reasons.push("Waitangi Tribunal");
    return "report.waitangi_tribunal";
  }
  reasons.push("Report");
  return "report";
}

function inferGeneric(
  record: InterchangeRecord,
  reasons: string[],
  issues: InterchangeIssue[]
): SourceType {
  const haystack = text(record, record.legal?.caseName, record.containerTitle);
  if (
    parseMnc(haystack) ||
    parseReportCitation(haystack) ||
    (/\sv\s/.test(record.title ?? "") && record.legal?.reporter)
  ) {
    reasons.push("Case citation found in a generic record");
    record.kind = "case";
    return inferCase(record, reasons, issues);
  }
  const statute = parseStatuteTitle(record.title);
  if (
    statute?.year &&
    statute.jurisdiction &&
    /\b(Act|Regulations?|Rules|Bill|Ordinance|Constitution)\b/.test(statute.title)
  ) {
    reasons.push("Statute title found in a generic record");
    record.kind = statute.form === "bill" ? "bill" : "legislation";
    return inferLegislation(record, record.kind, reasons, issues);
  }
  if (record.identifiers.url && !record.publisher) {
    reasons.push("URL without a publisher");
    return "internet_material";
  }
  issues.push(
    issue(
      "warning",
      "type-fallback-custom",
      `No AGLC4 form matches the ${record.provenance.rawType || "generic"} record type. It was imported as a custom citation; choose a source type in the preview if one fits.`
    )
  );
  reasons.push("No AGLC4 form matched");
  return "custom";
}

/** Chooses an Obiter source type for a record. */
export function inferSourceType(record: InterchangeRecord): SourceTypeInference {
  const reasons: string[] = [];
  const issues: InterchangeIssue[] = [];

  if (isKnownSourceType(record.provenance.obiterSourceType)) {
    reasons.push("Obiter source type carried from an earlier export");
    return { sourceType: record.provenance.obiterSourceType, confidence: 1, reasons, issues };
  }

  if (record.provenance.format === "endnote-xml") {
    const mapped = ENDNOTE_NAME_TO_SOURCE_TYPE[normaliseEndnoteTypeName(record.provenance.rawType)];
    if (mapped) {
      reasons.push(`EndNote reference type "${record.provenance.rawType}"`);
      if (
        mapped === "report.law_reform" &&
        !/law reform|law commission/i.test(
          text(record, record.passthrough.commission as string | undefined)
        )
      ) {
        return {
          sourceType: "report.royal_commission",
          confidence: 0.9,
          reasons: [...reasons, "No commission named; Royal Commission form"],
          issues,
        };
      }
      if (mapped === "legislation.statute" || mapped === "legislation.bill") {
        return {
          sourceType: inferLegislation(record, record.kind, reasons, issues),
          confidence: 0.95,
          reasons,
          issues,
        };
      }
      return { sourceType: mapped, confidence: 0.95, reasons, issues };
    }
  }

  let sourceType: SourceType;
  let confidence = 0.8;
  switch (record.kind) {
    case "case":
    case "foreign-case":
      sourceType =
        record.kind === "foreign-case"
          ? inferForeignCase(record, reasons)
          : inferCase(record, reasons, issues);
      break;
    case "legislation":
    case "bill":
    case "regulation":
    case "constitution":
      sourceType = inferLegislation(record, record.kind, reasons, issues);
      break;
    case "report":
      sourceType = inferReport(record, reasons);
      break;
    case "research-paper":
      sourceType = /parliamentary library|department of parliamentary services/i.test(
        record.institution ?? record.publisher ?? ""
      )
        ? "research_paper.parliamentary"
        : "research_paper";
      reasons.push(
        sourceType === "research_paper"
          ? "Research or working paper"
          : "Parliamentary research paper"
      );
      break;
    case "article":
      if (/forthcoming/i.test(record.genre ?? record.notes.join(" ")))
        sourceType = "journal.forthcoming";
      else if (
        !record.pageFirst &&
        !record.legal?.firstPage &&
        (record.identifiers.url || record.passthrough["article-number"])
      )
        sourceType = "journal.online";
      else sourceType = "journal.article";
      reasons.push("Journal article");
      break;
    case "book":
      if (record.creators.some((c) => c.role === "translator")) sourceType = "book.translated";
      else if (/e-?book|kindle|epub/i.test(record.medium ?? record.genre ?? ""))
        sourceType = "book.ebook";
      else if (/audio/i.test(record.medium ?? record.genre ?? "")) sourceType = "book.audiobook";
      else sourceType = "book";
      reasons.push("Book");
      break;
    case "hearing":
      if (
        /parliamentary debates|hansard/i.test(
          `${record.title ?? ""} ${record.containerTitle ?? ""}`
        )
      ) {
        sourceType = "hansard";
        reasons.push("Parliamentary Debates");
      } else {
        sourceType = "evidence.parliamentary";
        reasons.push("Committee evidence");
      }
      break;
    case "generic":
      sourceType = inferGeneric(record, reasons, issues);
      confidence = 0.5;
      break;
    default: {
      const direct = SECONDARY_BY_KIND[record.kind];
      if (direct) {
        sourceType = direct;
        reasons.push(`Kind ${record.kind}`);
      } else {
        sourceType = inferGeneric(record, reasons, issues);
        confidence = 0.5;
      }
    }
  }
  return { sourceType, confidence, reasons, issues };
}

function inferForeignCase(record: InterchangeRecord, reasons: string[]): SourceType {
  const legal = record.legal ?? {};
  const forum =
    `${legal.courtName ?? ""} ${legal.reporter ?? ""} ${record.provenance.rawType}`.toLowerCase();
  if (/international court of justice|icj/.test(forum)) {
    reasons.push("International Court of Justice");
    return /pleading/.test(forum) ? "icj.pleading" : "icj.decision";
  }
  if (/criminal|icc|icty|ictr/.test(forum)) {
    reasons.push("International criminal tribunal");
    return "icc_tribunal.case";
  }
  if (/wto|gatt|panel|appellate body/.test(forum)) {
    reasons.push("WTO or GATT decision");
    return "wto.decision";
  }
  if (/echr|european court of human rights|ehrr/.test(forum)) {
    reasons.push("European Court of Human Rights");
    return "echr.decision";
  }
  if (/court of justice of the european union|ecj|cjeu|ecr/.test(forum)) {
    reasons.push("Court of Justice of the European Union");
    return "eu.court";
  }
  if (/arbitr/.test(forum)) {
    reasons.push("Arbitral tribunal");
    return legal.parties && legal.parties.length > 0
      ? "arbitral.state_state"
      : "arbitral.individual_state";
  }
  const byJurisdiction = foreignFromJurisdiction(normaliseJurisdiction(legal.jurisdiction));
  if (byJurisdiction) {
    reasons.push(`Foreign jurisdiction ${legal.jurisdiction}`);
    return byJurisdiction;
  }
  reasons.push("International decision of an unidentified forum");
  return "arbitral.individual_state";
}
