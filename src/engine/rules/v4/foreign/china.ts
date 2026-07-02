/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * AGLC4 Part V — Foreign Domestic Materials: China (Rules 16.1–16.3)
 *
 * Pure formatting functions for Chinese-language cases and legislative
 * materials. Rule 16.1 script conventions apply throughout: Chinese
 * characters are never italicised — where an element would ordinarily
 * be italicised, Chinese characters appear between guillemets (« »)
 * instead — and each Chinese element takes a square-bracketed English
 * translation per rule 26.1.1 (translations are roman).
 */

import { FormattedRun } from "../../../../types/formattedRun";

// ─── Rule 16.1 script helpers ────────────────────────────────────────────────

/** Matches CJK ideographs (simplified and traditional Chinese characters). */
const CJK_PATTERN = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;

/**
 * True when the text contains Chinese characters, which per rule 16.1
 * must never be italicised (guillemets replace italics).
 */
function isChineseScript(text: string): boolean {
  return CJK_PATTERN.test(text);
}

/**
 * Renders a title-like element per rule 16.1: Chinese-script text
 * between guillemets in roman type; Latin-script (pinyin or English)
 * text italicised as the underlying rule would ordinarily require.
 */
function titleRun(text: string): FormattedRun {
  if (isChineseScript(text)) {
    return { text: `«${text}»` };
  }
  return { text, italic: true };
}

// ─── FRGN-002: Reported Chinese Cases (Rule 16.2.1) ─────────────────────────

/**
 * Formats a reported Chinese case per AGLC4 Rule 16.2.1.
 *
 * AGLC4 Rule 16.2.1 template: «Case Name» [Year of Decision]
 * Issue Number Official Gazette or Report Series Starting Page,
 * Pinpoint. Include only elements that appear in the report. The case
 * name takes an English translation where possible (natural persons
 * transliterated into pinyin); the report series title is translated
 * into English where possible. Per the rule 16.2.1 note (rule 2.2.6),
 * the court's name may be appended in parentheses where not apparent.
 *
 * @example
 *   // «兴业银行广州分行与深圳市机场股份有限公司借款合同纠纷案»
 *   //   [Guangzhou Branch of Industrial Bank Co Ltd v Shenzhen Airport
 *   //   Co Ltd — Loan Contract Dispute Case] [2009] 11
 *   //   中华人民共和国最高人民法院公报 [Gazette of the Supreme People's
 *   //   Court of the People's Republic of China] 30, 36  — AGLC4 ex 3
 *   formatCase({
 *     caseName: "兴业银行广州分行与深圳市机场股份有限公司借款合同纠纷案",
 *     translation: "Guangzhou Branch of Industrial Bank Co Ltd v Shenzhen Airport Co Ltd — Loan Contract Dispute Case",
 *     year: 2009, volume: 11,
 *     reportSeries: "中华人民共和国最高人民法院公报",
 *     seriesTranslation: "Gazette of the Supreme People's Court of the People's Republic of China",
 *     startingPage: 30, pinpoint: "36",
 *   })
 */
export function formatCase(data: {
  caseName: string;
  year: number;
  reportSeries: string;
  volume?: number;
  startingPage: number;
  court?: string;
  /** English translation of the case name (rule 16.2.1), in roman type. */
  translation?: string;
  /** English translation of the report series title (rule 16.2.1). */
  seriesTranslation?: string;
  /** Pinpoint reference (follows the starting page after a comma). */
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name — guillemets for Chinese script, italics otherwise (rule 16.1)
  runs.push(titleRun(data.caseName));

  // Translation of the case name (roman — rule 26.1.1)
  if (data.translation) {
    runs.push({ text: ` [${data.translation}]` });
  }

  // Year of decision in square brackets (rule 16.2.1)
  runs.push({ text: ` [${data.year}]` });

  // Issue number
  if (data.volume !== undefined) {
    runs.push({ text: ` ${data.volume}` });
  }

  // Report series (roman — series names are not italicised) with translation
  runs.push({ text: ` ${data.reportSeries}` });
  if (data.seriesTranslation) {
    runs.push({ text: ` [${data.seriesTranslation}]` });
  }

  // Starting page (Chinese case numbers may serve as the identifier instead)
  if (data.startingPage > 0) {
    runs.push({ text: ` ${data.startingPage}` });
  }

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  // Court name in parentheses where not otherwise apparent (rule 2.2.6)
  if (data.court) {
    runs.push({ text: ` (${data.court})` });
  }

  return runs;
}

// ─── FRGN-002: Unreported Chinese Judgments (Rule 16.2.3) ───────────────────

/**
 * Formats an unreported Chinese judgment per AGLC4 Rule 16.2.3.
 *
 * AGLC4 Rule 16.2.3 template: «Case Name», Court Name, Case Number,
 * Full Date, Pinpoint. The case name adheres to rule 16.2.1;
 * 'People's Republic of China', 'Republic of China' or 'Macau' is
 * included in the court-name translation where the court is not
 * otherwise apparently Chinese.
 *
 * @example
 *   // «焦其铸与重庆市信心农牧科技有限公司租赁合同纠纷案» [Jiao Qizhu v
 *   //   Confidence Farming Technology Co Ltd of Chongqing Municipality
 *   //   — Lease Contract Dispute Case], 重庆市第五中级人民法院 [Fifth
 *   //   Intermediate People's Court of Chongqing Municipality, People's
 *   //   Republic of China], 渝五中民终字第93号 [Economic Appeal No 93],
 *   //   24 April 2008  — AGLC4 ex 7
 *   formatUnreportedCase({ caseName: "焦其铸…案", translation: "…",
 *     court: "重庆市第五中级人民法院", courtTranslation: "…",
 *     caseNumber: "渝五中民终字第93号", caseNumberTranslation: "Economic Appeal No 93",
 *     date: "24 April 2008" })
 */
export function formatUnreportedCase(data: {
  caseName: string;
  /** English translation of the case name (rule 16.2.1). */
  translation?: string;
  /** Court name as it appears in the source (Chinese script or pinyin). */
  court: string;
  /** English translation of the court name. */
  courtTranslation?: string;
  /** Case number as it appears on the judgment. */
  caseNumber?: string;
  /** English translation of the case number. */
  caseNumberTranslation?: string;
  /** Full date of the judgment (e.g. '24 April 2008'). */
  date: string;
  /** Pinpoint reference. */
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  runs.push(titleRun(data.caseName));
  if (data.translation) {
    runs.push({ text: ` [${data.translation}]` });
  }

  runs.push({ text: `, ${data.court}` });
  if (data.courtTranslation) {
    runs.push({ text: ` [${data.courtTranslation}]` });
  }

  if (data.caseNumber) {
    runs.push({ text: `, ${data.caseNumber}` });
    if (data.caseNumberTranslation) {
      runs.push({ text: ` [${data.caseNumberTranslation}]` });
    }
  }

  runs.push({ text: `, ${data.date}` });

  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  return runs;
}

// ─── FRGN-002: Chinese Legislative Acts (Rule 16.3.1) ───────────────────────

/**
 * Formats a Chinese legislative act per AGLC4 Rule 16.3.1.
 *
 * AGLC4 Rule 16.3.1 template: «Title of Law» [Translation]
 * (Jurisdiction) Promulgating Body, Order/Decree/Opinion No Number,
 * Full Date of Promulgation, Pinpoint. Include only elements that
 * appear on the source; the jurisdiction is 'People's Republic of
 * China', 'Republic of China' or 'Macau'. An official gazette citation
 * may be added after the promulgation date to aid retrieval.
 *
 * @example
 *   // «中华人民共和国合同法» [Contract Law of the People's Republic of
 *   //   China] (People's Republic of China) National People's Congress,
 *   //   Order No 15, 15 March 1999  — AGLC4 ex 8
 *   formatLegislation({
 *     title: "中华人民共和国合同法",
 *     translation: "Contract Law of the People's Republic of China",
 *     jurisdiction: "People's Republic of China",
 *     promulgatingBody: "National People's Congress",
 *     instrumentNumber: "Order No 15",
 *     promulgationDate: "15 March 1999",
 *   })
 */
export function formatLegislation(data: {
  title: string;
  /**
   * @deprecated Rule 16.3.1 has no bare-year element — the full date of
   * promulgation (`promulgationDate`) identifies the act. Ignored.
   */
  year?: number;
  jurisdiction?: string;
  pinpoint?: string;
  /** English translation of the title (rule 16.1), in roman type. */
  translation?: string;
  /** Promulgating body (e.g. 'National People's Congress'). */
  promulgatingBody?: string;
  /** Order, decree or opinion number (e.g. 'Order No 15'). */
  instrumentNumber?: string;
  /** Full date of promulgation (e.g. '15 March 1999'). */
  promulgationDate?: string;
  /** Official gazette or publication citation, to aid retrieval. */
  gazette?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title — guillemets for Chinese script, italics otherwise (rule 16.1)
  runs.push(titleRun(data.title));

  // Translation of the title (roman — rule 26.1.1)
  if (data.translation) {
    runs.push({ text: ` [${data.translation}]` });
  }

  // Jurisdiction in parentheses
  if (data.jurisdiction) {
    runs.push({ text: ` (${data.jurisdiction})` });
  }

  // Promulgating body, instrument number, date and gazette, comma-separated
  const tail: string[] = [];
  if (data.promulgatingBody) {
    tail.push(data.promulgatingBody);
  }
  if (data.instrumentNumber) {
    tail.push(data.instrumentNumber);
  }
  if (data.promulgationDate) {
    tail.push(data.promulgationDate);
  }
  if (data.gazette) {
    tail.push(data.gazette);
  }
  if (tail.length > 0) {
    runs.push({ text: ` ${tail.join(", ")}` });
  }

  // Pinpoint (comma-separated when promulgation elements precede it)
  if (data.pinpoint) {
    runs.push({ text: tail.length > 0 ? `, ${data.pinpoint}` : ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── FRGN-002: Chinese Constitutions (Rule 16.3.2) ──────────────────────────

/**
 * Formats a Chinese constitutional citation per AGLC4 Rule 16.3.2.
 *
 * AGLC4 Rule 16.3.2 fixed forms: «中华人民共和国宪法» [Constitution of
 * the People's Republic of China] Pinpoint (and equivalents for the
 * Republic of China and Macau). Where more information (a date of
 * adoption or promulgating body) is relevant, cite under rule 16.3.1
 * via {@link formatLegislation} instead.
 *
 * @example
 *   // «中华人民共和国宪法» [Constitution of the People's Republic of
 *   //   China] art 3  — AGLC4 ex 13
 *   formatConstitution({
 *     title: "中华人民共和国宪法",
 *     translation: "Constitution of the People's Republic of China",
 *     pinpoint: "art 3",
 *   })
 */
export function formatConstitution(data: {
  title: string;
  /** English translation of the title, in roman type. */
  translation?: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  runs.push(titleRun(data.title));
  if (data.translation) {
    runs.push({ text: ` [${data.translation}]` });
  }
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}
