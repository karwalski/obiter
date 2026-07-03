/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * AGLC4 Part V — Foreign Domestic Materials (Chapters 15–26)
 *
 * Tests key formatting rules against AGLC4 examples for:
 *   - Rule 15: Canada (cases, legislation, constitution, regulations)
 *   - Rule 16: China (cases, legislation, constitutions)
 *   - Rule 17: France (cases, individual laws, codes, constitution)
 *   - Rule 18: Germany (cases, individual laws, codes, constitution)
 *   - Rule 19: Hong Kong (cases, legislation, Basic Law)
 *   - Rule 20: Malaysia (cases, legislation, constitution)
 *   - Rule 21: New Zealand (cases, Māori Land Court, Waitangi Tribunal, legislation)
 *   - Rule 22: Singapore (cases, legislation, constitutional documents)
 *   - Rule 23: South Africa (cases, legislation, TRC reports)
 *   - Rule 24: UK (cases, judicial officers, legislation, SIs, Hansard)
 *   - Rule 25: US (cases, legislation, constitutions, CFR/Fed Reg,
 *              Congressional Record, Restatements)
 *   - Rule 26: Other foreign materials (translations, decisions, legislation)
 *
 * Full-citation assertions use the exact strings of the guide's own
 * illustrations (example numbers in test names).
 */

import { FormattedRun } from "../../src/types/formattedRun";

import * as canada from "../../src/engine/rules/v4/foreign/canada";
import * as china from "../../src/engine/rules/v4/foreign/china";
import * as france from "../../src/engine/rules/v4/foreign/france";
import * as germany from "../../src/engine/rules/v4/foreign/germany";
import * as hongKong from "../../src/engine/rules/v4/foreign/hong-kong";
import * as malaysia from "../../src/engine/rules/v4/foreign/malaysia";
import * as nz from "../../src/engine/rules/v4/foreign/new-zealand";
import * as singapore from "../../src/engine/rules/v4/foreign/singapore";
import * as southAfrica from "../../src/engine/rules/v4/foreign/south-africa";
import * as uk from "../../src/engine/rules/v4/foreign/uk";
import * as usa from "../../src/engine/rules/v4/foreign/usa";
import * as other from "../../src/engine/rules/v4/foreign/other";

/** Helper: concatenate all text runs into a flat string for full-citation assertions. */
function flatten(runs: FormattedRun[]): string {
  return runs.map((r) => r.text).join("");
}

/** Helper: extract italic text segments. */
function italicText(runs: FormattedRun[]): string {
  return runs
    .filter((r) => r.italic)
    .map((r) => r.text)
    .join("");
}

// =============================================================================
// Rule 15: Canada
// =============================================================================

describe("Rule 15 — Canada", () => {
  describe("15.1 Cases", () => {
    it("formats a Supreme Court case per AGLC4 ex 1 (rule 15.1.1)", () => {
      const runs = canada.formatCase({
        caseName: "R v Sharpe",
        year: 2001,
        reportSeries: "SCR",
        volume: 1,
        startingPage: 45,
      });
      expect(flatten(runs)).toBe("R v Sharpe [2001] 1 SCR 45");
      expect(runs[0].italic).toBe(true);
    });

    it("formats a Federal Court Reports case per AGLC4 ex 2 (rule 15.1.2)", () => {
      const runs = canada.formatCase({
        caseName: "Eli Lilly Canada Inc v Apotex Inc",
        year: 2008,
        reportSeries: "FCR",
        volume: 2,
        startingPage: 636,
      });
      expect(flatten(runs)).toBe("Eli Lilly Canada Inc v Apotex Inc [2008] 2 FCR 636");
    });

    it("formats a volume-organised series with round-bracket year per AGLC4 ex 5 (rule 15.1.2)", () => {
      const runs = canada.formatCase({
        caseName: "Bangoura v Washington Post",
        year: 2005,
        yearType: "round",
        reportSeries: "DLR (4th)",
        volume: 258,
        startingPage: 341,
        court: "Ontario Court of Appeal",
      });
      expect(flatten(runs)).toBe(
        "Bangoura v Washington Post (2005) 258 DLR (4th) 341 (Ontario Court of Appeal)"
      );
    });
  });

  describe("15.2 Legislation", () => {
    it("formats a federal statute (RSC) per the rule 15.2 header example", () => {
      const runs = canada.formatLegislation({
        title: "Copyright Act",
        year: 1985,
        jurisdiction: "RSC",
        pinpoint: "c C-42, s 25",
      });
      expect(flatten(runs)).toBe("Copyright Act, RSC 1985, c C-42, s 25");
      expect(italicText(runs)).toBe("Copyright Act");
    });

    it("formats the Criminal Code per AGLC4 ex 7 (rule 15.2.2)", () => {
      const runs = canada.formatLegislation({
        title: "Criminal Code",
        year: 1985,
        jurisdiction: "RSC",
        pinpoint: "c C-46, s 515",
      });
      expect(flatten(runs)).toBe("Criminal Code, RSC 1985, c C-46, s 515");
    });

    it("formats a sessional statute (SC)", () => {
      const runs = canada.formatLegislation({
        title: "Controlled Drugs and Substances Act",
        year: 1996,
        jurisdiction: "SC",
        pinpoint: "c 19, s 4",
      });
      expect(flatten(runs)).toBe("Controlled Drugs and Substances Act, SC 1996, c 19, s 4");
    });

    it("formats a supplement year per AGLC4 ex 11 (rule 15.2.3)", () => {
      const runs = canada.formatLegislation({
        title: "Criminal Law Amendment Act",
        year: 1985,
        jurisdiction: "RSC",
        sessionOrSupplement: "1st Supp",
        pinpoint: "c 27",
      });
      expect(flatten(runs)).toBe("Criminal Law Amendment Act, RSC 1985 (1st Supp), c 27");
    });
  });

  describe("15.3 Constitutions", () => {
    it("formats the Constitution Act 1982 fixed form (rule 15.3.1)", () => {
      const runs = canada.formatFederalConstitution({ instrument: "constitution1982" });
      expect(flatten(runs)).toBe("Canada Act 1982 (UK) c 11, sch B ('Constitution Act 1982')");
    });

    it("formats the Constitution Act 1867 fixed form (rule 15.3.1)", () => {
      const runs = canada.formatFederalConstitution({ instrument: "constitution1867" });
      expect(flatten(runs)).toBe(
        "Constitution Act 1867 (Imp), 30 & 31 Vict, c 3 ('Constitution Act 1867')"
      );
    });

    it("formats the Charter fixed form (rule 15.3.1)", () => {
      const runs = canada.formatFederalConstitution({ instrument: "charter" });
      expect(flatten(runs)).toBe(
        "Canada Act 1982 (UK) c 11, sch B pt I ('Canadian Charter of Rights and Freedoms')"
      );
    });

    it("formats a provincial constitution as ordinary legislation per AGLC4 ex 16 (rule 15.3.2)", () => {
      const runs = canada.formatLegislation({
        title: "Constitution Act",
        year: 1996,
        jurisdiction: "RSBC",
        pinpoint: "c 66",
      });
      expect(flatten(runs)).toBe("Constitution Act, RSBC 1996, c 66");
    });

    it("formats a generic constitutional citation", () => {
      const runs = canada.formatConstitution({
        title: "Constitution Act, 1982",
        pinpoint: "s 2",
      });
      expect(flatten(runs)).toBe("Constitution Act, 1982 s 2");
      expect(runs[0].italic).toBe(true);
    });
  });

  describe("15.4 Delegated Legislation (Regulations)", () => {
    it("formats a revised federal regulation per AGLC4 ex 17 (rule 15.4.1)", () => {
      const runs = canada.formatRegulation({
        title: "Maple Products Regulations",
        citation: "CRC, c 289",
        pinpoint: "s 9",
      });
      expect(flatten(runs)).toBe("Maple Products Regulations, CRC, c 289, s 9");
      expect(italicText(runs)).toBe("Maple Products Regulations");
    });

    it("formats an earlier consolidation per AGLC4 ex 18 (rule 15.4.1)", () => {
      const runs = canada.formatRegulation({
        title: "Air Transport Regulations",
        citation: "CRC, c 34",
        pinpoint: "s 23",
        consolidationYear: 1987,
      });
      expect(flatten(runs)).toBe("Air Transport Regulations, CRC, c 34, s 23 (1987)");
    });

    it("formats an unrevised federal regulation per AGLC4 ex 19 (rule 15.4.2)", () => {
      const runs = canada.formatRegulation({
        title: "Regulations Amending the Food and Drug Regulations",
        citation: "SOR/98-580",
      });
      expect(flatten(runs)).toBe("Regulations Amending the Food and Drug Regulations, SOR/98-580");
    });

    it("formats a provincial regulation per AGLC4 ex 21 (rule 15.4.3)", () => {
      const runs = canada.formatRegulation({
        title: "Elevating Devices Codes Regulation",
        citation: "Alta Reg 192/2015",
        pinpoint: "s 3",
      });
      expect(flatten(runs)).toBe("Elevating Devices Codes Regulation, Alta Reg 192/2015, s 3");
    });
  });
});

// =============================================================================
// Rule 16: China
// =============================================================================

describe("Rule 16 — China", () => {
  describe("16.1 / 16.2.1 Reported Cases", () => {
    it("formats a reported case with guillemets and translations per AGLC4 ex 3 (rule 16.2.1)", () => {
      const runs = china.formatCase({
        caseName: "兴业银行广州分行与深圳市机场股份有限公司借款合同纠纷案",
        translation:
          "Guangzhou Branch of Industrial Bank Co Ltd v Shenzhen Airport Co Ltd — Loan Contract Dispute Case",
        year: 2009,
        volume: 11,
        reportSeries: "中华人民共和国最高人民法院公报",
        seriesTranslation:
          "Gazette of the Supreme People's Court of the People's Republic of China",
        startingPage: 30,
        pinpoint: "36",
      });
      expect(flatten(runs)).toBe(
        "«兴业银行广州分行与深圳市机场股份有限公司借款合同纠纷案» [Guangzhou Branch of Industrial Bank Co Ltd v Shenzhen Airport Co Ltd — Loan Contract Dispute Case] [2009] 11 中华人民共和国最高人民法院公报 [Gazette of the Supreme People's Court of the People's Republic of China] 30, 36"
      );
      // Chinese characters are never italicised (rule 16.1)
      expect(runs[0].italic).toBeUndefined();
    });

    it("appends the court name where not apparent per AGLC4 ex 6 (rule 16.2.2)", () => {
      const runs = china.formatCase({
        caseName: "杨建立, 魏铃故意杀人案",
        translation: "Yang Jianli, Wei Ling — Intentional Homicide Case",
        year: 2002,
        volume: 4,
        reportSeries: "人民法院案例选",
        seriesTranslation: "Selected Cases of the People's Courts",
        startingPage: 7,
        court:
          "Zheng Zhou City, He Nan Province Intermediate People's Court, People's Republic of China",
      });
      expect(flatten(runs)).toBe(
        "«杨建立, 魏铃故意杀人案» [Yang Jianli, Wei Ling — Intentional Homicide Case] [2002] 4 人民法院案例选 [Selected Cases of the People's Courts] 7 (Zheng Zhou City, He Nan Province Intermediate People's Court, People's Republic of China)"
      );
    });
  });

  describe("16.2.3 Unreported Judgments", () => {
    it("formats an unreported judgment per AGLC4 ex 7 (rule 16.2.3)", () => {
      const runs = china.formatUnreportedCase({
        caseName: "焦其铸与重庆市信心农牧科技有限公司租赁合同纠纷案",
        translation:
          "Jiao Qizhu v Confidence Farming Technology Co Ltd of Chongqing Municipality — Lease Contract Dispute Case",
        court: "重庆市第五中级人民法院",
        courtTranslation:
          "Fifth Intermediate People's Court of Chongqing Municipality, People's Republic of China",
        caseNumber: "渝五中民终字第93号",
        caseNumberTranslation: "Economic Appeal No 93",
        date: "24 April 2008",
      });
      expect(flatten(runs)).toBe(
        "«焦其铸与重庆市信心农牧科技有限公司租赁合同纠纷案» [Jiao Qizhu v Confidence Farming Technology Co Ltd of Chongqing Municipality — Lease Contract Dispute Case], 重庆市第五中级人民法院 [Fifth Intermediate People's Court of Chongqing Municipality, People's Republic of China], 渝五中民终字第93号 [Economic Appeal No 93], 24 April 2008"
      );
    });
  });

  describe("16.3.1 Legislative Acts", () => {
    it("formats a legislative act per AGLC4 ex 8 (rule 16.3.1)", () => {
      const runs = china.formatLegislation({
        title: "中华人民共和国合同法",
        translation: "Contract Law of the People's Republic of China",
        jurisdiction: "People's Republic of China",
        promulgatingBody: "National People's Congress",
        instrumentNumber: "Order No 15",
        promulgationDate: "15 March 1999",
      });
      expect(flatten(runs)).toBe(
        "«中华人民共和国合同法» [Contract Law of the People's Republic of China] (People's Republic of China) National People's Congress, Order No 15, 15 March 1999"
      );
      expect(runs[0].italic).toBeUndefined();
    });

    it("formats a Republic of China act per AGLC4 ex 11 (rule 16.3.1)", () => {
      const runs = china.formatLegislation({
        title: "著作權法",
        translation: "Copyright Act",
        jurisdiction: "Republic of China",
        promulgatingBody: "Legislative Yuan",
        promulgationDate: "10 February 2010",
        pinpoint: "art 10",
      });
      expect(flatten(runs)).toBe(
        "«著作權法» [Copyright Act] (Republic of China) Legislative Yuan, 10 February 2010, art 10"
      );
    });

    it("italicises Latin-script titles (rule 16.1: guillemets replace italics for Chinese script only)", () => {
      const runs = china.formatLegislation({
        title: "Contract Law of the People's Republic of China",
        jurisdiction: "People's Republic of China",
      });
      expect(flatten(runs)).toBe(
        "Contract Law of the People's Republic of China (People's Republic of China)"
      );
      expect(runs[0].italic).toBe(true);
    });
  });

  describe("16.3.2 Constitutions", () => {
    it("formats the PRC Constitution per AGLC4 ex 13 (rule 16.3.2)", () => {
      const runs = china.formatConstitution({
        title: "中华人民共和国宪法",
        translation: "Constitution of the People's Republic of China",
        pinpoint: "art 3",
      });
      expect(flatten(runs)).toBe(
        "«中华人民共和国宪法» [Constitution of the People's Republic of China] art 3"
      );
    });
  });
});

// =============================================================================
// Rule 17: France
// =============================================================================

describe("Rule 17 — France", () => {
  describe("17.1 Cases", () => {
    it("formats a Cour de cassation decision per AGLC4 ex 1 (rule 17.1)", () => {
      const runs = france.formatCourtDecision({
        court: "Cour de cassation",
        translation: "French Court of Cassation",
        caseNumber: "06-81968",
        date: "5 December 2006",
        reportedIn: "(2006) Bull crim nº 304, 1095",
      });
      expect(flatten(runs)).toBe(
        "Cour de cassation [French Court of Cassation], 06-81968, 5 December 2006 reported in (2006) Bull crim nº 304, 1095"
      );
      // The court name is roman, not italic (rule 17.1)
      expect(runs[0].italic).toBeUndefined();
    });

    it("formats a Conseil constitutionnel decision per AGLC4 ex 2 (rule 17.1)", () => {
      const runs = france.formatCourtDecision({
        court: "Conseil constitutionnel",
        translation: "French Constitutional Court",
        caseNumber: "decision nº 2005-527 DC",
        date: "8 December 2005",
        reportedIn: "JO, 13 December 2005, 19162",
      });
      expect(flatten(runs)).toBe(
        "Conseil constitutionnel [French Constitutional Court], decision nº 2005-527 DC, 8 December 2005 reported in JO, 13 December 2005, 19162"
      );
    });

    it("formats a Conseil d'État decision with a popular case name per AGLC4 ex 3 (rule 17.1)", () => {
      const runs = france.formatCourtDecision({
        popularName: "Demoiselle X",
        court: "Conseil d'État",
        translation: "French Administrative Court",
        date: "28 May 1971",
        reportedIn: "[1971] Rec Lebon 409",
      });
      expect(flatten(runs)).toBe(
        "Demoiselle X, Conseil d'État [French Administrative Court], 28 May 1971 reported in [1971] Rec Lebon 409"
      );
      // Popular name italic, following comma roman
      expect(runs[0]).toEqual({ text: "Demoiselle X", italic: true });
      expect(runs[1].italic).toBeUndefined();
    });

    it("drops 'reported in' for unreported decisions per AGLC4 ex 4 (rule 17.1)", () => {
      const runs = france.formatCourtDecision({
        court: "Cour d'appel de Toulouse",
        translation: "Toulouse Court of Appeal",
        caseNumber: "2003/05292",
        date: "7 March 2005",
      });
      expect(flatten(runs)).toBe(
        "Cour d'appel de Toulouse [Toulouse Court of Appeal], 2003/05292, 7 March 2005"
      );
    });
  });

  describe("17.2.1 Individual Materials", () => {
    it("formats an individual law with JO reference per AGLC4 ex 5 (rule 17.2.1)", () => {
      const runs = france.formatLegislation({
        title: "Loi nº 91-662 du 13 juillet 1991",
        translation: "Law No 91-662 of 13 July 1991",
        jurisdiction: "France",
        gazetteDate: "19 July 1991",
        pinpoint: "9521",
      });
      expect(flatten(runs)).toBe(
        "Loi nº 91-662 du 13 juillet 1991 [Law No 91-662 of 13 July 1991] (France) JO, 19 July 1991, 9521"
      );
      // Only the French title is italic — the translation is roman (rule 26.1.1)
      expect(italicText(runs)).toBe("Loi nº 91-662 du 13 juillet 1991");
    });
  });

  describe("17.2.2 Codes", () => {
    it("formats a code with roman translation per AGLC4 ex 7 (rule 17.2.2)", () => {
      const runs = france.formatLegislation({
        title: "Code civil",
        translation: "Civil Code",
        jurisdiction: "France",
        pinpoint: "art 147",
      });
      expect(flatten(runs)).toBe("Code civil [Civil Code] (France) art 147");
      expect(italicText(runs)).toBe("Code civil");
    });
  });

  describe("17.2.3 Constitution", () => {
    it("formats the French Constitution per AGLC4 ex 9 (rule 17.2.3)", () => {
      const runs = france.formatConstitution({
        title: "La Constitution du 4 octobre 1958",
        translation: "French Constitution of 4 October 1958",
        pinpoint: "art 2",
      });
      expect(flatten(runs)).toBe(
        "La Constitution du 4 octobre 1958 [French Constitution of 4 October 1958] art 2"
      );
      // The translation is never italicised (rule 26.1.1)
      expect(italicText(runs)).toBe("La Constitution du 4 octobre 1958");
    });
  });
});

// =============================================================================
// Rule 18: Germany
// =============================================================================

describe("Rule 18 — Germany", () => {
  describe("18.1 Cases", () => {
    it("formats a reported BGH decision per AGLC4 ex 2 (rule 18.1)", () => {
      const runs = germany.formatCourtDecision({
        court: "Bundesgerichtshof",
        translation: "German Federal Court of Justice",
        caseNumber: "VII ZR 110/83",
        date: "19 January 1984",
        reportedIn: "(1984) 89 BGHZ 376, 378",
      });
      expect(flatten(runs)).toBe(
        "Bundesgerichtshof [German Federal Court of Justice], VII ZR 110/83, 19 January 1984 reported in (1984) 89 BGHZ 376, 378"
      );
      // The court name is roman, not italic (rule 18.1)
      expect(runs[0].italic).toBeUndefined();
    });

    it("formats an unreported decision with a popular case name per AGLC4 ex 4 (rule 18.1)", () => {
      const runs = germany.formatCourtDecision({
        popularName: "Pumuckl",
        court: "Oberlandesgericht München",
        translation: "Munich Court of Appeal",
        caseNumber: "29 U 4743/02",
        date: "4 September 2003",
      });
      expect(flatten(runs)).toBe(
        "Pumuckl, Oberlandesgericht München [Munich Court of Appeal], 29 U 4743/02, 4 September 2003"
      );
      expect(runs[0]).toEqual({ text: "Pumuckl", italic: true });
    });
  });

  describe("18.2.1 Individual Laws", () => {
    it("formats an individual law with gazette reference per AGLC4 ex 5 (rule 18.2.1)", () => {
      const runs = germany.formatLegislation({
        title: "Sozialversicherungs-Rechnungsverordnung",
        translation: "Social Security Calculation Regulation",
        jurisdiction: "Germany",
        enactmentDate: "27 April 2009",
        gazette: "BGBl I, 2009, 951",
      });
      expect(flatten(runs)).toBe(
        "Sozialversicherungs-Rechnungsverordnung [Social Security Calculation Regulation] (Germany) 27 April 2009, BGBl I, 2009, 951"
      );
      expect(italicText(runs)).toBe("Sozialversicherungs-Rechnungsverordnung");
    });
  });

  describe("18.2.2 Codes", () => {
    it("formats a code with short title per AGLC4 ex 6 (rule 18.2.2)", () => {
      const runs = germany.formatLegislation({
        title: "Bürgerliches Gesetzbuch",
        translation: "Civil Code",
        jurisdiction: "Germany",
        pinpoint: "§ 823(1)",
        shortTitle: "BGB",
      });
      expect(flatten(runs)).toBe("Bürgerliches Gesetzbuch [Civil Code] (Germany) § 823(1) ('BGB')");
      // The translation is roman; the title and short title are italic
      expect(italicText(runs)).toBe("Bürgerliches GesetzbuchBGB");
    });
  });

  describe("18.2.3 Constitution", () => {
    it("formats the Grundgesetz per AGLC4 ex 9 (rule 18.2.3)", () => {
      const runs = germany.formatConstitution({
        title: "Grundgesetz für die Bundesrepublik Deutschland",
        translation: "Basic Law for the Federal Republic of Germany",
        pinpoint: "art 8(1)",
      });
      expect(flatten(runs)).toBe(
        "Grundgesetz für die Bundesrepublik Deutschland [Basic Law for the Federal Republic of Germany] art 8(1)"
      );
      // The translation is never italicised (rule 26.1.1)
      expect(italicText(runs)).toBe("Grundgesetz für die Bundesrepublik Deutschland");
    });
  });
});

// =============================================================================
// Rule 19: Hong Kong
// =============================================================================

describe("Rule 19 — Hong Kong", () => {
  describe("19.1 Cases", () => {
    it("formats a Hong Kong case per AGLC4 ex 1 (rule 19.1)", () => {
      const runs = hongKong.formatCase({
        caseName: "Ng Ka Ling v Director of Immigration",
        year: 1999,
        reportSeries: "HKLRD",
        volume: 1,
        startingPage: 315,
      });
      expect(flatten(runs)).toBe("Ng Ka Ling v Director of Immigration [1999] 1 HKLRD 315");
    });

    it("formats a volume-organised series with court name per AGLC4 ex 2 (rule 19.1)", () => {
      const runs = hongKong.formatCase({
        caseName: "Victor Chandler (International) Ltd v Zhou Chu Jian He",
        year: 2007,
        yearType: "round",
        volume: 12,
        reportSeries: "HKPLR",
        startingPage: 595,
        pinpoint: "601 [24]",
        court: "Court of First Instance",
      });
      expect(flatten(runs)).toBe(
        "Victor Chandler (International) Ltd v Zhou Chu Jian He (2007) 12 HKPLR 595, 601 [24] (Court of First Instance)"
      );
    });
  });

  describe("19.2 Legislative Materials", () => {
    it("formats an ordinance with '(Hong Kong)' and cap number per AGLC4 ex 7 (rule 19.2.1)", () => {
      const runs = hongKong.formatLegislation({
        title: "Evidence Ordinance",
        capNumber: "8",
        pinpoint: "s 4",
      });
      expect(flatten(runs)).toBe("Evidence Ordinance (Hong Kong) cap 8, s 4");
    });

    it("formats a chapter number without pinpoint per AGLC4 ex 9 (rule 19.2.1)", () => {
      const runs = hongKong.formatLegislation({
        title: "Rules of the High Court",
        capNumber: "4A",
      });
      expect(flatten(runs)).toBe("Rules of the High Court (Hong Kong) cap 4A");
    });

    it("formats the Basic Law per AGLC4 ex 10 (rule 19.2.2)", () => {
      const runs = hongKong.formatConstitution({
        title:
          "Basic Law of the Hong Kong Special Administrative Region of the People's Republic of China",
        pinpoint: "art 4",
      });
      expect(flatten(runs)).toBe(
        "Basic Law of the Hong Kong Special Administrative Region of the People's Republic of China art 4"
      );
    });
  });
});

// =============================================================================
// Rule 20: Malaysia
// =============================================================================

describe("Rule 20 — Malaysia", () => {
  describe("20.1 Cases", () => {
    it("formats a Malaysian case per AGLC4 ex 1 (rule 20.1)", () => {
      const runs = malaysia.formatCase({
        caseName: "Ratna Ammal v Tan Chow Soo",
        year: 1964,
        reportSeries: "MLJ",
        volume: 1,
        startingPage: 399,
      });
      expect(flatten(runs)).toBe("Ratna Ammal v Tan Chow Soo [1964] 1 MLJ 399");
    });

    it("formats a pinpoint, judge and court per AGLC4 ex 3 (rule 20.1.1)", () => {
      const runs = malaysia.formatCase({
        caseName: "Polygram Records Sdn Bhd v The Search",
        year: 1994,
        volume: 3,
        reportSeries: "MLJ",
        startingPage: 127,
        pinpoint: "140 (Sinnadurai J)",
        court: "High Court of Malaya",
      });
      expect(flatten(runs)).toBe(
        "Polygram Records Sdn Bhd v The Search [1994] 3 MLJ 127, 140 (Sinnadurai J) (High Court of Malaya)"
      );
    });
  });

  describe("20.2 Legislative Materials", () => {
    it("formats a Malaysian statute per AGLC4 ex 7 (rule 20.2.1)", () => {
      const runs = malaysia.formatLegislation({
        title: "Copyright Act",
        year: 1987,
        jurisdiction: "Malaysia",
        pinpoint: "s 7",
      });
      expect(flatten(runs)).toBe("Copyright Act 1987 (Malaysia) s 7");
      expect(italicText(runs)).toBe("Copyright Act 1987");
    });

    it("formats delegated legislation per AGLC4 ex 8 (rule 20.2.1)", () => {
      const runs = malaysia.formatLegislation({
        title: "Digital Signature Regulations",
        year: 1998,
        jurisdiction: "Malaysia",
        pinpoint: "reg 58(a)",
      });
      expect(flatten(runs)).toBe("Digital Signature Regulations 1998 (Malaysia) reg 58(a)");
    });

    it("formats the Federal Constitution per AGLC4 ex 9 (rule 20.2.2)", () => {
      const runs = malaysia.formatConstitution({
        title: "Federal Constitution",
        pinpoint: "art 5",
      });
      expect(flatten(runs)).toBe("Federal Constitution (Malaysia) art 5");
    });
  });
});

// =============================================================================
// Rule 21: New Zealand
// =============================================================================

describe("Rule 21 — New Zealand", () => {
  describe("21.1.1 General Rule", () => {
    it("formats an NZLR case per AGLC4 ex 1 (rule 21.1.1)", () => {
      const runs = nz.formatCase({
        caseName: "Haylock v Patek",
        year: 2009,
        yearType: "square",
        volume: 1,
        reportSeries: "NZLR",
        startingPage: 351,
      });
      expect(flatten(runs)).toBe("Haylock v Patek [2009] 1 NZLR 351");
      expect(runs[0].italic).toBe(true);
    });

    it("omits the court when apparent from the NZAR", () => {
      const runs = nz.formatCase({
        caseName: "Buchanan v Jennings",
        year: 2000,
        yearType: "square",
        reportSeries: "NZAR",
        startingPage: 113,
      });
      expect(flatten(runs)).toBe("Buchanan v Jennings [2000] NZAR 113");
    });
  });

  describe("21.1.3 Unreported — Medium Neutral", () => {
    it("formats a medium neutral citation per AGLC4 ex 9 (rule 21.1.3)", () => {
      const runs = nz.formatCase({
        caseName: "Eight Mile Style LLC v New Zealand National Party",
        year: 2017,
        yearType: "square",
        reportSeries: "NZHC",
        startingPage: 2603,
      });
      expect(flatten(runs)).toBe(
        "Eight Mile Style LLC v New Zealand National Party [2017] NZHC 2603"
      );
    });

    it("formats an Employment Court citation (rule 21.1.3)", () => {
      const runs = nz.formatCase({
        caseName: "Underhill v Coca-Cola Amatil (NZ) Ltd",
        year: 2017,
        yearType: "square",
        reportSeries: "NZEmpC",
        startingPage: 117,
      });
      expect(flatten(runs)).toBe("Underhill v Coca-Cola Amatil (NZ) Ltd [2017] NZEmpC 117");
    });
  });

  describe("21.1.4 Māori Land Court and Māori Appellate Court", () => {
    it("formats a minute book citation with block name per AGLC4 ex 13 (rule 21.1.4)", () => {
      const runs = nz.formatMaoriLandCourt({
        parties: "O'Rorke v Hohaia",
        blockName: "Pukekohatu 7B Block",
        year: 2006,
        caseNumber: 173,
        registry: "Aotea",
        startingPage: 114,
        pinpoint: "117 [12]–[13]",
        judicialOfficer: "Judge Harvey",
      });
      expect(flatten(runs)).toBe(
        "O'Rorke v Hohaia — Pukekohatu 7B Block (2006) 173 Aotea MB 114, 117 [12]–[13] (Judge Harvey)"
      );
      // Parties and block name together form the italic case name
      expect(italicText(runs)).toBe("O'Rorke v Hohaia — Pukekohatu 7B Block");
    });

    it("omits the block name where it does not appear per AGLC4 ex 14 (rule 21.1.4)", () => {
      const runs = nz.formatMaoriLandCourt({
        parties: "Taipari v Hauraki Maori Trust Board",
        year: 2008,
        caseNumber: 114,
        registry: "Hauraki",
        startingPage: 34,
      });
      expect(flatten(runs)).toBe("Taipari v Hauraki Maori Trust Board (2008) 114 Hauraki MB 34");
    });
  });

  describe("21.1.5 Waitangi Tribunal", () => {
    it("formats a Waitangi Tribunal report per AGLC4 ex 15 (rule 21.1.5)", () => {
      const runs = nz.formatWaitangiTribunal({
        title: "Maori Electoral Option Report",
        waiNumber: "Wai 413",
        year: 1994,
        pinpoint: "37 [5.1]",
      });
      expect(flatten(runs)).toBe(
        "Waitangi Tribunal, Maori Electoral Option Report (Wai 413, 1994) 37 [5.1]"
      );
      // Title should be italicised
      expect(runs[1].italic).toBe(true);
    });

    it("formats a Waitangi Tribunal report without Wai number", () => {
      const runs = nz.formatWaitangiTribunal({
        title: "Some Report",
        year: 2000,
      });
      expect(flatten(runs)).toBe("Waitangi Tribunal, Some Report (2000)");
    });
  });

  describe("21.2.1 Statutes", () => {
    it("formats an NZ statute per AGLC4 ex 16 (rule 21.2.1)", () => {
      const runs = nz.formatLegislation({
        title: "Habeas Corpus Act",
        year: 2001,
      });
      expect(flatten(runs)).toBe("Habeas Corpus Act 2001 (NZ)");
      expect(italicText(runs)).toBe("Habeas Corpus Act 2001");
    });
  });

  describe("21.2.2 Delegated Legislation", () => {
    it("formats delegated legislation with SR number per AGLC4 ex 17 (rule 21.2.2)", () => {
      const runs = nz.formatDelegatedLegislation({
        title: "Electronic Transactions Regulations",
        year: 2003,
        srNumber: "SR 2003/288",
        pinpoint: "reg 4",
      });
      expect(flatten(runs)).toBe(
        "Electronic Transactions Regulations 2003 (NZ) SR 2003/288, reg 4"
      );
    });
  });
});

// =============================================================================
// Rule 22: Singapore
// =============================================================================

describe("Rule 22 — Singapore", () => {
  describe("22.1 Cases", () => {
    it("formats an SLR(R) case (rule 22.1.2)", () => {
      const runs = singapore.formatCase({
        caseName: "Re Econ Corp Ltd",
        year: 2004,
        yearType: "square",
        volume: 1,
        reportSeries: "SLR(R)",
        startingPage: 273,
      });
      expect(flatten(runs)).toBe("Re Econ Corp Ltd [2004] 1 SLR(R) 273");
    });

    it("formats an SLR case per AGLC4 ex 4 (rule 22.1.2)", () => {
      const runs = singapore.formatCase({
        caseName: "ACB v Thomson Medical Pte Ltd",
        year: 2017,
        yearType: "square",
        volume: 1,
        reportSeries: "SLR",
        startingPage: 918,
      });
      expect(flatten(runs)).toBe("ACB v Thomson Medical Pte Ltd [2017] 1 SLR 918");
    });
  });

  describe("22.2.1 Statutes and Subsidiary Legislation", () => {
    it("formats a chapter-numbered statute (lowercase cap / rev ed) per AGLC4 ex 9 (rule 22.2.1)", () => {
      const runs = singapore.formatLegislation({
        title: "Adoption of Children Act",
        capNumber: "cap 4",
        revisedEdition: "1985 rev ed",
        pinpoint: "s 5",
      });
      expect(flatten(runs)).toBe("Adoption of Children Act (Singapore, cap 4, 1985 rev ed) s 5");
    });

    it("formats a statute without a chapter number per AGLC4 ex 13 (rule 22.2.1)", () => {
      const runs = singapore.formatLegislation({
        title: "Land Titles Ordinance",
        year: 1956,
        pinpoint: "ss 28(2)(b)–(e)",
      });
      expect(flatten(runs)).toBe("Land Titles Ordinance 1956 (Singapore) ss 28(2)(b)–(e)");
      expect(italicText(runs)).toBe("Land Titles Ordinance 1956");
    });
  });

  describe("22.2.2 Constitutional Documents", () => {
    it("formats the Constitution with reprint information per AGLC4 ex 14 (rule 22.2.2)", () => {
      const runs = singapore.formatLegislation({
        title: "Constitution of the Republic of Singapore",
        isConstitution: true,
        reprint: "1999 reprint",
        pinpoint: "ss 9–16",
      });
      expect(flatten(runs)).toBe(
        "Constitution of the Republic of Singapore (Singapore, 1999 reprint) ss 9–16"
      );
    });

    it("formats a constitutional document with revised edition per AGLC4 ex 15 (rule 22.2.2)", () => {
      const runs = singapore.formatLegislation({
        title: "Republic of Singapore Independence Act",
        isConstitution: true,
        revisedEdition: "1985 rev ed",
        pinpoint: "s 5",
      });
      expect(flatten(runs)).toBe(
        "Republic of Singapore Independence Act (Singapore, 1985 rev ed) s 5"
      );
    });
  });
});

// =============================================================================
// Rule 23: South Africa
// =============================================================================

describe("Rule 23 — South Africa", () => {
  describe("23.1 Cases", () => {
    it("formats an SA reported case per AGLC4 ex 1 (rule 23.1.1)", () => {
      const runs = southAfrica.formatCase({
        caseName: "Christian Education South Africa v Minister of Education",
        year: 1999,
        yearType: "square",
        volume: 2,
        reportSeries: "SA",
        startingPage: 83,
        courtId: "Constitutional Court",
      });
      expect(flatten(runs)).toBe(
        "Christian Education South Africa v Minister of Education [1999] 2 SA 83 (Constitutional Court)"
      );
    });

    it("formats a short-name SA case per AGLC4 ex 6 (rule 23.1.2)", () => {
      const runs = southAfrica.formatCase({
        caseName: "S v Manamela",
        year: 2000,
        yearType: "square",
        volume: 3,
        reportSeries: "SA",
        startingPage: 1,
        courtId: "Constitutional Court",
      });
      expect(flatten(runs)).toBe("S v Manamela [2000] 3 SA 1 (Constitutional Court)");
    });
  });

  describe("23.2 Legislative Materials", () => {
    it("formats SA legislation per AGLC4 ex 7 (rule 23.2.1)", () => {
      const runs = southAfrica.formatLegislation({
        title: "Local Government Transition Act",
        year: 1993,
      });
      expect(flatten(runs)).toBe("Local Government Transition Act 1993 (South Africa)");
    });

    it("formats provincial legislation with jurisdiction abbreviation per AGLC4 ex 9 (rule 23.2.1)", () => {
      const runs = southAfrica.formatLegislation({
        title: "Land Administration Act",
        year: 2003,
        jurisdiction: "KZN",
      });
      expect(flatten(runs)).toBe("Land Administration Act 2003 (KZN)");
    });

    it("formats the SA Constitution as ordinary legislation per AGLC4 ex 10 (rule 23.2.2)", () => {
      const runs = southAfrica.formatLegislation({
        title: "Constitution of the Republic of South Africa Act",
        year: 1996,
        isConstitution: true,
        pinpoint: "ch 8",
      });
      expect(flatten(runs)).toBe(
        "Constitution of the Republic of South Africa Act 1996 (South Africa) ch 8"
      );
    });
  });

  describe("23.3 Truth and Reconciliation Commission", () => {
    it("formats a TRC report as a chapter 6 book per AGLC4 ex 11 (rule 23.3)", () => {
      const runs = southAfrica.formatTRCReport({
        title: "Report",
        years: "1998–2003",
        volume: 3,
        pinpoint: "155",
      });
      expect(flatten(runs)).toBe(
        "Truth and Reconciliation Commission of South Africa, Report (1998–2003) vol 3, 155"
      );
      // Author roman, title italic (chapter 6 book format)
      expect(runs[0].italic).toBeUndefined();
      expect(italicText(runs)).toBe("Report");
    });
  });
});

// =============================================================================
// Rule 24: United Kingdom
// =============================================================================

describe("Rule 24 — United Kingdom", () => {
  describe("24.1.1 General Rule — Modern Cases", () => {
    it("formats a modern reported case per AGLC4 ex 1 (rule 24.1.1)", () => {
      const runs = uk.formatCase({
        caseName: "CAS (Nominees) Ltd v Nottingham Forest plc",
        year: 2001,
        yearType: "square",
        volume: 1,
        reportSeries: "All ER",
        startingPage: 954,
      });
      expect(flatten(runs)).toBe("CAS (Nominees) Ltd v Nottingham Forest plc [2001] 1 All ER 954");
    });

    it("formats a Law Reports AC case", () => {
      const runs = uk.formatCase({
        caseName: "JA Pye (Oxford) Ltd v Graham",
        year: 2003,
        yearType: "square",
        volume: 1,
        reportSeries: "AC",
        startingPage: 419,
      });
      expect(flatten(runs)).toBe("JA Pye (Oxford) Ltd v Graham [2003] 1 AC 419");
    });
  });

  describe("24.1.2 Modern English Reports", () => {
    it("formats a QB case per AGLC4 ex 3 (rule 24.1.2)", () => {
      const runs = uk.formatCase({
        caseName: "Beevis v Dawson",
        year: 1957,
        yearType: "square",
        volume: 1,
        reportSeries: "QB",
        startingPage: 195,
      });
      expect(flatten(runs)).toBe("Beevis v Dawson [1957] 1 QB 195");
    });

    it("formats a volume-organised series (Ch D)", () => {
      const runs = uk.formatCase({
        caseName: "Astley v Micklethwait",
        year: 1880,
        yearType: "round",
        volume: 15,
        reportSeries: "Ch D",
        startingPage: 59,
      });
      expect(flatten(runs)).toBe("Astley v Micklethwait (1880) 15 Ch D 59");
    });

    it("places the volume inside 'LR'-prefixed abbreviations per AGLC4 ex 5 (rule 24.1.2)", () => {
      const runs = uk.formatCase({
        caseName: "Skinner v Orde",
        year: 1871,
        yearType: "round",
        volume: 4,
        reportSeries: "LR PC",
        startingPage: 60,
      });
      expect(flatten(runs)).toBe("Skinner v Orde (1871) LR 4 PC 60");
    });

    it("formats a Probate case per AGLC4 ex 6 (rule 24.1.2)", () => {
      const runs = uk.formatCase({
        caseName: "The Winkfield",
        year: 1902,
        yearType: "square",
        reportSeries: "P",
        startingPage: 42,
      });
      expect(flatten(runs)).toBe("The Winkfield [1902] P 42");
    });
  });

  describe("24.1.3 Nominate Reports", () => {
    it("appends a parallel ER citation per AGLC4 ex 8 (rule 24.1.3)", () => {
      const runs = uk.formatCase({
        caseName: "Russel v Lee",
        year: 1661,
        yearType: "round",
        volume: 1,
        reportSeries: "Lev",
        startingPage: 86,
        parallel: { volume: 83, series: "ER", page: 310 },
      });
      expect(flatten(runs)).toBe("Russel v Lee (1661) 1 Lev 86; 83 ER 310");
    });

    it("pinpoints in the ER citation per AGLC4 ex 10 (rule 24.1.3)", () => {
      const runs = uk.formatCase({
        caseName: "Peters v Fleming",
        year: 1840,
        yearType: "round",
        volume: 6,
        reportSeries: "M & W",
        startingPage: 42,
        parallel: {
          volume: 151,
          series: "ER",
          page: 314,
          pinpoint: "315 (Parke B), 316 (Alderson B), 316 (Rolfe B)",
        },
      });
      expect(flatten(runs)).toBe(
        "Peters v Fleming (1840) 6 M & W 42; 151 ER 314, 315 (Parke B), 316 (Alderson B), 316 (Rolfe B)"
      );
    });
  });

  describe("24.1.4 Scottish Reports", () => {
    it("formats a bare year for year-organised Scottish series per AGLC4 ex 11 (rule 24.1.4)", () => {
      const runs = uk.formatCase({
        caseName: "Logan v Harrower",
        year: 2008,
        yearType: "none",
        reportSeries: "SLT",
        startingPage: 1049,
      });
      expect(flatten(runs)).toBe("Logan v Harrower 2008 SLT 1049");
    });

    it("formats Session Cases (House of Lords) per AGLC4 ex 15 (rule 24.1.4)", () => {
      const runs = uk.formatCase({
        caseName: "Brown v Hamilton District Council",
        year: 1983,
        yearType: "none",
        reportSeries: "SC (HL)",
        startingPage: 1,
      });
      expect(flatten(runs)).toBe("Brown v Hamilton District Council 1983 SC (HL) 1");
    });

    it("formats West v Secretary of State for Scotland (rule 24.1.4)", () => {
      const runs = uk.formatCase({
        caseName: "West v Secretary of State for Scotland",
        year: 1992,
        yearType: "none",
        reportSeries: "SC",
        startingPage: 385,
      });
      expect(flatten(runs)).toBe("West v Secretary of State for Scotland 1992 SC 385");
    });
  });

  describe("24.1.5 Unreported — UKSC / EWCA / EWHC", () => {
    it("formats a UKSC case per AGLC4 ex 16 (rule 24.1.5)", () => {
      const runs = uk.formatCase({
        caseName: "Four Seasons Holdings Inc v Brownlie",
        year: 2017,
        yearType: "square",
        reportSeries: "UKSC",
        startingPage: 80,
        pinpoint: "[33] (Lady Hale)",
      });
      expect(flatten(runs)).toBe(
        "Four Seasons Holdings Inc v Brownlie [2017] UKSC 80, [33] (Lady Hale)"
      );
    });

    it("formats an EWCA Crim case (rule 24.1.5)", () => {
      const runs = uk.formatCase({
        caseName: "R v Taylor",
        year: 2017,
        yearType: "square",
        reportSeries: "EWCA Crim",
        startingPage: 2209,
        pinpoint: "[25] (Irwin LJ)",
      });
      expect(flatten(runs)).toBe("R v Taylor [2017] EWCA Crim 2209, [25] (Irwin LJ)");
    });

    it("places the EWHC division after the judgment number (rule 24.1.5)", () => {
      const runs = uk.formatCase({
        caseName: "R (Stewart) v Birmingham City Council",
        year: 2018,
        yearType: "square",
        reportSeries: "EWHC",
        startingPage: 61,
        ewhcDivision: "Admin",
        pinpoint: "[1] (Baker J)",
      });
      expect(flatten(runs)).toBe(
        "R (Stewart) v Birmingham City Council [2018] EWHC 61 (Admin), [1] (Baker J)"
      );
    });

    it("formats an EWHC Admiralty case per AGLC4 ex 23 (rule 24.1.5)", () => {
      const runs = uk.formatCase({
        caseName: "The Jag Pooja",
        year: 2018,
        yearType: "square",
        reportSeries: "EWHC",
        startingPage: 389,
        ewhcDivision: "Admlty",
      });
      expect(flatten(runs)).toBe("The Jag Pooja [2018] EWHC 389 (Admlty)");
    });
  });

  describe("24.1.6 Identifying Judicial Officers", () => {
    it("groups shared after-name titles with the tabulated plural (rule 24.1.6 example band)", () => {
      expect(
        uk.formatJudicialOfficers([
          { name: "James", title: "LJ" },
          { name: "Baggallay", title: "LJ" },
          { name: "Bramwell", title: "LJ" },
        ])
      ).toBe("James, Baggallay and Bramwell LJJ");
    });

    it("uses DPSC for the UKSC Deputy President per the rule 24.1.6 table (DECISION-012)", () => {
      expect(uk.formatJudicialOfficers([{ name: "Lord Hope", title: "DPSC" }])).toBe(
        "Lord Hope DPSC"
      );
    });

    it("places asterisked titles before the name (rule 24.1.6)", () => {
      expect(uk.formatJudicialOfficers([{ name: "Hale", title: "Baroness" }])).toBe(
        "Baroness Hale"
      );
    });

    it("repeats titles without a tabulated plural after each name (rule 24.1.6)", () => {
      expect(
        uk.formatJudicialOfficers([
          { name: "Lord Kerr", title: "JSC" },
          { name: "Lord Wilson", title: "JSC" },
        ])
      ).toBe("Lord Kerr JSC and Lord Wilson JSC");
    });
  });

  describe("24.2 Legislation — Modern", () => {
    it("formats a modern UK statute per AGLC4 ex 26 (rule 24.2.1)", () => {
      const runs = uk.formatLegislation({
        title: "Human Rights Act",
        year: 1998,
        pinpoint: "s 6(1)",
      });
      expect(flatten(runs)).toBe("Human Rights Act 1998 (UK) s 6(1)");
      expect(italicText(runs)).toBe("Human Rights Act 1998");
    });

    it("formats a statute without pinpoint (rule 24.2.2)", () => {
      const runs = uk.formatLegislation({
        title: "Appropriation Act",
        year: 2004,
      });
      expect(flatten(runs)).toBe("Appropriation Act 2004 (UK)");
    });

    it("formats NI legislation (rule 24.2.2)", () => {
      const runs = uk.formatLegislation({
        title: "Libraries Act (Northern Ireland)",
        year: 2008,
        jurisdiction: "NI",
      });
      expect(flatten(runs)).toBe("Libraries Act (Northern Ireland) 2008 (NI)");
    });
  });

  describe("24.2.3 Legislation — Historical with Regnal Year", () => {
    it("formats a historical statute with regnal year per AGLC4 ex 36 (rule 24.2.3)", () => {
      const runs = uk.formatLegislation({
        title: "Workmen's Compensation Act",
        year: 1906,
        regnalYear: "6 Edw 7",
        chapter: "c 58",
      });
      expect(flatten(runs)).toBe("Workmen's Compensation Act 1906, 6 Edw 7, c 58");
    });

    it("formats the Factories Act with regnal year per AGLC4 ex 30 (rule 24.2.2)", () => {
      const runs = uk.formatLegislation({
        title: "Factories Act",
        year: 1961,
        regnalYear: "9 & 10 Eliz 2",
        chapter: "c 34",
      });
      expect(flatten(runs)).toBe("Factories Act 1961, 9 & 10 Eliz 2, c 34");
    });

    it("formats an Imperial statute (rule 24.2.2)", () => {
      const runs = uk.formatLegislation({
        title: "Statute of Westminster",
        year: 1931,
        jurisdiction: "Imp",
        regnalYear: "22 & 23 Geo 5",
        chapter: "c 4",
      });
      expect(flatten(runs)).toBe("Statute of Westminster 1931 (Imp) 22 & 23 Geo 5, c 4");
    });

    it("formats the Colonial Laws Validity Act per AGLC4 ex 31 (rule 24.2.2)", () => {
      const runs = uk.formatLegislation({
        title: "Colonial Laws Validity Act",
        year: 1865,
        jurisdiction: "Imp",
        regnalYear: "28 & 29 Vict",
        chapter: "c 63",
      });
      expect(flatten(runs)).toBe("Colonial Laws Validity Act 1865 (Imp) 28 & 29 Vict, c 63");
    });

    it("formats a medieval statute per AGLC4 ex 28 (rule 24.2.1)", () => {
      const runs = uk.formatLegislation({
        title: "Staple Act",
        year: 1435,
        regnalYear: "14 Hen 6",
        chapter: "c 2",
      });
      expect(flatten(runs)).toBe("Staple Act 1435, 14 Hen 6, c 2");
    });

    it("precedes a pinpoint after regnal year and chapter with a comma (rule 24.2.4)", () => {
      const runs = uk.formatLegislation({
        title: "Artificers and Apprentices Act",
        year: 1562,
        regnalYear: "5 Eliz 1",
        chapter: "c 4",
        pinpoint: "s 3",
      });
      expect(flatten(runs)).toBe("Artificers and Apprentices Act 1562, 5 Eliz 1, c 4, s 3");
    });

    it("abbreviates monarch names per the rule 24.2.3 table ('Wm', Arabic numerals)", () => {
      expect(
        uk.formatRegnalYear({ yearsOfReign: "2 & 3", monarch: "William", regnalNumber: 4 })
      ).toBe("2 & 3 Wm 4");
      expect(uk.formatRegnalYear({ yearsOfReign: "28 & 29", monarch: "Victoria" })).toBe(
        "28 & 29 Vict"
      );
    });

    it("appends session numbers with 'sess' per AGLC4 ex 38 (rule 24.2.3)", () => {
      expect(
        uk.formatRegnalYear({ yearsOfReign: "24", monarch: "George", regnalNumber: 3, session: 2 })
      ).toBe("24 Geo 3 sess 2");
    });
  });

  describe("24.3 Delegated Legislation", () => {
    it("formats an SI per AGLC4 ex 39 (rule 24.3)", () => {
      const runs = uk.formatStatutoryInstrument({
        title: "Fertilisers (Amendment) Regulations",
        year: 1998,
        siNumber: "2024",
      });
      expect(flatten(runs)).toBe("Fertilisers (Amendment) Regulations 1998 (UK) SI 1998/2024");
    });

    it("defaults UK 1890–1947 instruments to 'SR & O' per AGLC4 ex 40 (rule 24.3)", () => {
      const runs = uk.formatStatutoryInstrument({
        title: "Aden Colony Order",
        year: 1936,
        siNumber: "1031",
      });
      expect(flatten(runs)).toBe("Aden Colony Order 1936 (UK) SR & O 1936/1031");
    });

    it("defaults Northern Ireland instruments to 'SR' per AGLC4 ex 42 (rule 24.3)", () => {
      const runs = uk.formatStatutoryInstrument({
        title: "Work at Height Regulations (Northern Ireland)",
        year: 2005,
        siNumber: "279",
        jurisdiction: "NI",
      });
      expect(flatten(runs)).toBe(
        "Work at Height Regulations (Northern Ireland) 2005 (NI) SR 2005/279"
      );
    });

    it("follows the instrument number with a comma before a pinpoint per AGLC4 ex 44 (rule 24.3)", () => {
      const runs = uk.formatStatutoryInstrument({
        title: "Magistrates' Courts (International Criminal Court) (Forms) Rules",
        year: 2001,
        siNumber: "2600",
        pinpoint: "r 4",
      });
      expect(flatten(runs)).toBe(
        "Magistrates' Courts (International Criminal Court) (Forms) Rules 2001 (UK) SI 2001/2600, r 4"
      );
    });
  });

  describe("24.4.1 Parliamentary Debates", () => {
    it("formats a Hansard citation per AGLC4 ex 45 (rule 24.4.1)", () => {
      const runs = uk.formatHansard({
        chamber: "HC",
        date: "16 February 1998",
        volume: 306,
        column: 778,
        speaker: "Jack Straw",
      });
      expect(flatten(runs)).toBe(
        "United Kingdom, Parliamentary Debates, House of Commons, 16 February 1998, vol 306, col 778 (Jack Straw)"
      );
      expect(italicText(runs)).toBe("Parliamentary Debates");
    });
  });

  describe("24.4.2 Command Papers", () => {
    it("formats a command paper per AGLC4 ex 49 (rule 24.4.2)", () => {
      const runs = uk.formatCommandPaper({
        author: "Department for Transport (UK)",
        title: "Low Carbon Transport: A Greener Future — A Carbon Reduction Strategy for Transport",
        seriesPrefix: "Cm",
        paperNumber: "7682",
        year: 2009,
        pinpoint: "18",
      });
      expect(flatten(runs)).toBe(
        "Department for Transport (UK), Low Carbon Transport: A Greener Future — A Carbon Reduction Strategy for Transport (Cm 7682, 2009) 18"
      );
    });
  });
});

// =============================================================================
// Rule 25: United States of America
// =============================================================================

describe("Rule 25 — United States of America", () => {
  describe("25.1.1 Cases — Parties' Names", () => {
    it("formats a US Supreme Court case per AGLC4 ex 1 (rule 25.1.1)", () => {
      const runs = usa.formatCase({
        caseName: "Roper v Simmons",
        volume: 543,
        reporter: "US",
        startingPage: 551,
        pinpoint: "567",
        year: 2005,
      });
      expect(flatten(runs)).toBe("Roper v Simmons, 543 US 551, 567 (2005)");
      expect(runs[0].italic).toBe(true);
    });

    it("formats Bush v Gore without pinpoint per AGLC4 ex 4 (rule 25.1.3)", () => {
      const runs = usa.formatCase({
        caseName: "Bush v Gore",
        volume: 531,
        reporter: "US",
        startingPage: 98,
        year: 2000,
      });
      expect(flatten(runs)).toBe("Bush v Gore, 531 US 98 (2000)");
    });
  });

  describe("25.1.3 Federal Reporters", () => {
    it("formats a Federal Circuit case per AGLC4 ex 5 (rule 25.1.3)", () => {
      const runs = usa.formatCase({
        caseName: "Loveladies Harbor Inc v United States",
        volume: 28,
        reporter: "F 3d",
        startingPage: 1171,
        year: 1994,
        courtId: "Fed Cir",
      });
      expect(flatten(runs)).toBe(
        "Loveladies Harbor Inc v United States, 28 F 3d 1171 (Fed Cir, 1994)"
      );
    });

    it("formats a Circuit Court case (rule 25.1.5.1)", () => {
      const runs = usa.formatCase({
        caseName: "Stevenson v Shalcross",
        volume: 205,
        reporter: "F",
        startingPage: 286,
        year: 1913,
        courtId: "3rd Cir",
      });
      expect(flatten(runs)).toBe("Stevenson v Shalcross, 205 F 286 (3rd Cir, 1913)");
    });

    it("formats a District Court case per AGLC4 ex 7 (rule 25.1.3)", () => {
      const runs = usa.formatCase({
        caseName: "Tracy v Beaufort County Board of Education",
        volume: 335,
        reporter: "F Supp 2d",
        startingPage: 675,
        year: 2004,
        courtId: "D SC",
      });
      expect(flatten(runs)).toBe(
        "Tracy v Beaufort County Board of Education, 335 F Supp 2d 675 (D SC, 2004)"
      );
    });
  });

  describe("25.1.5 State Court Cases", () => {
    it("formats a state court case per AGLC4 ex 8 (rule 25.1.3)", () => {
      const runs = usa.formatCase({
        caseName: "Freightliner LLC v Whatley Contract Carriers LLC",
        volume: 932,
        reporter: "So 2d",
        startingPage: 883,
        year: 2005,
        courtId: "Ala",
      });
      expect(flatten(runs)).toBe(
        "Freightliner LLC v Whatley Contract Carriers LLC, 932 So 2d 883 (Ala, 2005)"
      );
    });
  });

  describe("25.1.7 Unreported Cases", () => {
    it("formats an unreported case per AGLC4 ex 26 (rule 25.1.7)", () => {
      const runs = usa.formatUnreportedCase({
        caseName: "Red Hat Inc v The SCO Group Inc",
        court: "D Del",
        docketNumber: "Civ No 03-772-SLR",
        date: "6 April 2004",
      });
      expect(flatten(runs)).toBe(
        "Red Hat Inc v The SCO Group Inc (D Del, Civ No 03-772-SLR, 6 April 2004)"
      );
    });

    it("places 'slip op' before the pinpoint per AGLC4 ex 27 (rule 25.1.7)", () => {
      const runs = usa.formatUnreportedCase({
        caseName: "Torres v Oklahoma",
        court: "Okla Ct Crim App",
        docketNumber: "No PCD-04-442",
        date: "13 May 2004",
        slipOpPinpoint: "7",
      });
      expect(flatten(runs)).toBe(
        "Torres v Oklahoma (Okla Ct Crim App, No PCD-04-442, 13 May 2004) slip op 7"
      );
    });

    it("gives a starting page for continuously paginated slip opinions per AGLC4 ex 28 (rule 25.1.7)", () => {
      const runs = usa.formatUnreportedCase({
        caseName: "Charlesworth v Mack",
        court: "1st Cir",
        docketNumber: "No 90-567",
        date: "19 January 1991",
        slipOpStartingPage: 3458,
        slipOpPinpoint: "3464",
      });
      expect(flatten(runs)).toBe(
        "Charlesworth v Mack (1st Cir, No 90-567, 19 January 1991) slip op 3458, 3464"
      );
    });
  });

  describe("25.2 Legislation — Code", () => {
    it("formats a bare USC section per AGLC4 ex 32 (rule 25.2.1)", () => {
      const runs = usa.formatLegislation({
        title: "",
        uscTitle: 35,
        uscSection: "§ 102",
        supplement: "2012",
      });
      expect(flatten(runs)).toBe("35 USC § 102 (2012)");
    });

    it("formats a titled USC citation per AGLC4 ex 33 (rule 25.2.1)", () => {
      const runs = usa.formatLegislation({
        title: "Federal Deposit Insurance Act",
        uscTitle: 12,
        uscSection: "§§ 1811–35a",
        supplement: "2006",
      });
      expect(flatten(runs)).toBe("Federal Deposit Insurance Act, 12 USC §§ 1811–35a (2006)");
      expect(runs[0].italic).toBe(true);
    });
  });

  describe("25.3 Session Laws", () => {
    it("omits the year already in the title per AGLC4 ex 56 (rules 25.3.1, 25.3.7)", () => {
      const runs = usa.formatSessionLaw({
        title: "Detainee Treatment Act of 2005",
        pubLawNumber: "109-148",
        statVolume: 119,
        statPage: 2739,
        year: 2005,
      });
      expect(flatten(runs)).toBe("Detainee Treatment Act of 2005, Pub L No 109-148, 119 Stat 2739");
    });

    it("leaves 'Act of «date»' titles roman per AGLC4 ex 57 (rule 25.3.1)", () => {
      const runs = usa.formatSessionLaw({
        title: "Act of 29 January 1937",
        pubLawNumber: "75-3",
        statVolume: 50,
        statPage: 5,
        year: 1937,
      });
      expect(flatten(runs)).toBe("Act of 29 January 1937, Pub L No 75-3, 50 Stat 5");
      expect(italicText(runs)).toBe("");
    });

    it("formats a private law per AGLC4 ex 59 (rule 25.3.2)", () => {
      const runs = usa.formatSessionLaw({
        title: "Railroad Right-of-Way Conveyance Validation Act of 2004",
        pubLawNumber: "108-2",
        numberType: "private",
        statVolume: 118,
        statPage: 4025,
        year: 2004,
      });
      expect(flatten(runs)).toBe(
        "Railroad Right-of-Way Conveyance Validation Act of 2004, Priv L No 108-2, 118 Stat 4025"
      );
    });

    it("formats a state session law with year-volume per AGLC4 ex 64 (rules 25.3.4–25.3.5)", () => {
      const runs = usa.formatSessionLaw({
        title: "School Bus Enhanced Safety Inspection Act",
        pubLawNumber: "5",
        numberType: "chapter",
        statVolume: 1999,
        volumeIsYear: true,
        sessionLawsName: "NJ Laws",
        statPage: 1,
        year: 1999,
      });
      expect(flatten(runs)).toBe("School Bus Enhanced Safety Inspection Act, ch 5, 1999 NJ Laws 1");
    });

    it("includes original and session-laws pinpoints per AGLC4 ex 70 (rules 25.3.3, 25.3.6, 25.3.7)", () => {
      const runs = usa.formatSessionLaw({
        title: "Smithsonian Facilities Authorization Act",
        pubLawNumber: "108-72",
        originalPinpoint: "§§ 4–5",
        statVolume: 117,
        statPage: 888,
        statPinpoint: 889,
        year: 2003,
      });
      expect(flatten(runs)).toBe(
        "Smithsonian Facilities Authorization Act, Pub L No 108-72, §§ 4–5, 117 Stat 888, 889 (2003)"
      );
    });
  });

  describe("25.4 Constitutions", () => {
    it("formats a federal Constitution article per AGLC4 ex 75 (rule 25.4)", () => {
      const runs = usa.formatConstitution({
        article: "IV",
        section: "3",
      });
      expect(flatten(runs)).toBe("United States Constitution art IV § 3");
      expect(runs[0].italic).toBe(true);
    });

    it("formats a Constitution amendment per AGLC4 ex 76 (rule 25.4)", () => {
      const runs = usa.formatConstitution({
        amendment: "XXI",
      });
      expect(flatten(runs)).toBe("United States Constitution amend XXI");
    });

    it("formats a state constitution per AGLC4 ex 77 (rule 25.4)", () => {
      const runs = usa.formatConstitution({
        title: "Texas Constitution",
        article: "1",
        section: "8",
      });
      expect(flatten(runs)).toBe("Texas Constitution art 1 § 8");
      expect(italicText(runs)).toBe("Texas Constitution");
    });
  });

  describe("25.5.1 Delegated Legislation — Federal", () => {
    it("formats a CFR citation per AGLC4 ex 78 (rule 25.5.1)", () => {
      const runs = usa.formatRegulation({
        cfrTitle: 8,
        cfrSection: "101.1",
        year: 1986,
      });
      expect(flatten(runs)).toBe("8 CFR § 101.1 (1986)");
    });

    it("includes the optional regulation title per AGLC4 ex 79 (rule 25.5.1)", () => {
      const runs = usa.formatRegulation({
        title: "Whaling Provisions",
        cfrTitle: 50,
        cfrSection: "230",
        year: 2009,
      });
      expect(flatten(runs)).toBe("Whaling Provisions, 50 CFR § 230 (2009)");
      expect(italicText(runs)).toBe("Whaling Provisions");
    });

    it("formats a Federal Register citation per AGLC4 ex 80 (rule 25.5.1)", () => {
      const runs = usa.formatFederalRegister({
        title: "Enhancing Airline Passenger Protections",
        volume: 74,
        startingPage: 68983,
        pinpoint: "68985",
        date: "30 December 2009",
      });
      expect(flatten(runs)).toBe(
        "Enhancing Airline Passenger Protections, 74 Fed Reg 68983, 68985 (30 December 2009)"
      );
    });
  });

  describe("25.6.1 Congressional Record", () => {
    it("formats a bound-edition debate per AGLC4 ex 83 (rule 25.6.1)", () => {
      const runs = usa.formatCongressionalRecord({
        volume: 1,
        page: "10",
        year: 1874,
        speaker: "James Garfield",
        chamber: "House of Representatives",
      });
      expect(flatten(runs)).toBe(
        "1 Congressional Record 10 (James Garfield) (1874, House of Representatives)"
      );
      expect(italicText(runs)).toBe("Congressional Record");
    });

    it("formats a Daily Edition debate per AGLC4 ex 84 (rule 25.6.1)", () => {
      const runs = usa.formatCongressionalRecord({
        volume: 156,
        page: "H148",
        year: 2010,
        speaker: "Ann Kirkpatrick",
        edition: "daily",
        date: "19 January 2010",
      });
      expect(flatten(runs)).toBe(
        "156 Congressional Record H148 (Ann Kirkpatrick) (daily ed, 19 January 2010)"
      );
    });
  });

  describe("25.7 Restatements", () => {
    it("formats a Restatement per AGLC4 ex 90 (rule 25.7)", () => {
      const runs = usa.formatRestatement({
        subject: "Contracts",
        edition: "Second",
        section: "176",
        year: 1981,
      });
      expect(flatten(runs)).toBe(
        "American Law Institute, Restatement (Second) of Contracts (1981) § 176"
      );
      // Author roman, title italic (chapter 6 book format)
      expect(runs[0].italic).toBeUndefined();
      expect(italicText(runs)).toBe("Restatement (Second) of Contracts");
    });

    it("formats a comment reference per AGLC4 ex 91 (rule 25.7)", () => {
      const runs = usa.formatRestatement({
        subject: "the Foreign Relations Law of the United States",
        edition: "Third",
        section: "465",
        year: 1987,
        pinpoint: "cmt (a)",
      });
      expect(flatten(runs)).toBe(
        "American Law Institute, Restatement (Third) of the Foreign Relations Law of the United States (1987) § 465 cmt (a)"
      );
    });
  });
});

// =============================================================================
// Rule 26: Other Foreign Domestic Materials
// =============================================================================

describe("Rule 26 — Other Foreign Domestic Materials", () => {
  describe("26.1.1 Translations by the author", () => {
    it("appends '[tr author]' at the end of the citation per AGLC4 ex 1 (rule 26.1.1)", () => {
      const runs = other.formatLegislation({
        title: "Urheberrechtsgesetz",
        translatedTitle: "Copyright Law",
        jurisdiction: "Switzerland",
        otherInformation: "9 October 1992, SR 231.1",
        pinpoint: "art 29(2)(a)",
        translator: "author",
      });
      expect(flatten(runs)).toBe(
        "Urheberrechtsgesetz [Copyright Law] (Switzerland) 9 October 1992, SR 231.1, art 29(2)(a) [tr author]"
      );
      // The translated title is never italicised (rule 26.1.1)
      expect(italicText(runs)).toBe("Urheberrechtsgesetz");
    });

    it("appends '[tr Name]' for third-party translations per AGLC4 ex 2 (rule 26.1.1)", () => {
      const runs = other.formatLegislation({
        title:
          "Loi du 15 Décembre 1980 sur l'accès au Territoire, le séjour, l'établissement et l'éloignement des étrangers",
        translatedTitle:
          "Law of 15 December 1980 on the Access to the Territory, the Stay, the Establishment and the Removal of Foreigners",
        jurisdiction: "Belgium",
        pinpoint: "art 21",
        translator: "Nawaar Hassan",
      });
      expect(flatten(runs)).toBe(
        "Loi du 15 Décembre 1980 sur l'accès au Territoire, le séjour, l'établissement et l'éloignement des étrangers [Law of 15 December 1980 on the Access to the Territory, the Stay, the Establishment and the Removal of Foreigners] (Belgium) art 21 [tr Nawaar Hassan]"
      );
    });

    it("maps the legacy isAuthorTranslation flag to '[tr author]' at the end (rule 26.1.1)", () => {
      const runs = other.formatLegislation({
        title: "Minpō",
        translatedTitle: "Civil Code",
        jurisdiction: "Japan",
        isAuthorTranslation: true,
        pinpoint: "art 709",
      });
      expect(flatten(runs)).toBe("Minpō [Civil Code] (Japan) art 709 [tr author]");
    });
  });

  describe("26.2 Judicial and Administrative Decisions", () => {
    it("keeps the year when a volume is present per AGLC4 ex 8 (rule 26.2 — common law)", () => {
      const runs = other.formatCase({
        caseName: "Asuquo v State",
        year: 1967,
        yearType: "square",
        volume: 1,
        reportSeries: "All NLR",
        startingPage: 123,
        pinpoint: "126–7 (Bairamian JSC)",
        courtId: "Supreme Court of Nigeria",
      });
      expect(flatten(runs)).toBe(
        "Asuquo v State [1967] 1 All NLR 123, 126–7 (Bairamian JSC) (Supreme Court of Nigeria)"
      );
    });

    it("formats a non-common-law decision per AGLC4 ex 12 (rule 26.2)", () => {
      const runs = other.formatOtherDecision({
        court: "Corte costituzionale",
        courtTranslation: "Italian Constitutional Court",
        caseNumber: "No 239",
        date: "29 December 1982",
        reportedIn: [
          { text: "[1983] I " },
          { text: "Il Foro Italiano: Raccolta Generale di Giurisprudenza", italic: true },
          { text: " 2" },
        ],
        pinpoint: "4–5",
      });
      expect(flatten(runs)).toBe(
        "Corte costituzionale [Italian Constitutional Court], No 239, 29 December 1982 reported in [1983] I Il Foro Italiano: Raccolta Generale di Giurisprudenza 2, 4–5"
      );
      // The court name is roman (rule 26.2)
      expect(runs[0].italic).toBeUndefined();
    });

    it("renders a plain-string written-out report series roman by default (rule 26.2)", () => {
      // DECISION-029: written-out non-common-law report series default to
      // roman, consistent with rule 2.2.3; italics (as in the guide's ex 12
      // '*Il Foro Italiano*…') require an explicit FormattedRun[] override.
      const runs = other.formatOtherDecision({
        court: "Corte costituzionale",
        courtTranslation: "Italian Constitutional Court",
        caseNumber: "No 239",
        date: "29 December 1982",
        reportedIn: "[1983] I Il Foro Italiano: Raccolta Generale di Giurisprudenza 2",
        pinpoint: "4–5",
      });
      expect(flatten(runs)).toBe(
        "Corte costituzionale [Italian Constitutional Court], No 239, 29 December 1982 reported in [1983] I Il Foro Italiano: Raccolta Generale di Giurisprudenza 2, 4–5"
      );
      // No part of the citation is italicised for a plain-string series
      expect(italicText(runs)).toBe("");
    });

    it("drops 'reported in' for unreported decisions (rule 26.2)", () => {
      const runs = other.formatOtherDecision({
        court: "Hamburg Intermediate Appellate Court",
        caseNumber: "1 U 59/48",
        date: "7 December 1948",
      });
      expect(flatten(runs)).toBe(
        "Hamburg Intermediate Appellate Court, 1 U 59/48, 7 December 1948"
      );
    });
  });

  describe("26.3 Legislative Materials", () => {
    it("formats generic foreign legislation per AGLC4 ex 14 (rule 26.3)", () => {
      const runs = other.formatLegislation({
        title: "Passports Act",
        year: 1982,
        jurisdiction: "Papua New Guinea",
      });
      expect(flatten(runs)).toBe("Passports Act 1982 (Papua New Guinea)");
    });

    it("formats a code with chapter-number pinpoint per AGLC4 ex 16 (rule 26.3)", () => {
      const runs = other.formatLegislation({
        title: "Penal Code",
        jurisdiction: "Kiribati",
        pinpoint: "ch 67 s 161",
      });
      expect(flatten(runs)).toBe("Penal Code (Kiribati) ch 67 s 161");
    });

    it("includes 'other information' elements per AGLC4 ex 17 (rule 26.3)", () => {
      const runs = other.formatLegislation({
        title: "Änderung der Lebensmittelkennzeichnungsverordnung 1993",
        translatedTitle: "Amendment of the Grocery Labelling Regulation 1993",
        jurisdiction: "Austria",
        otherInformation: "9 January 2008, BGBl II, 8/2008",
      });
      expect(flatten(runs)).toBe(
        "Änderung der Lebensmittelkennzeichnungsverordnung 1993 [Amendment of the Grocery Labelling Regulation 1993] (Austria) 9 January 2008, BGBl II, 8/2008"
      );
    });

    it("formats legislation with pinpoint (rule 26.3)", () => {
      const runs = other.formatLegislation({
        title: "Sexual Offences Act",
        year: 2006,
        jurisdiction: "Kenya",
        pinpoint: "ss 3, 5(1)(a)(i)",
      });
      expect(flatten(runs)).toBe("Sexual Offences Act 2006 (Kenya) ss 3, 5(1)(a)(i)");
    });

    it("keeps translated titles roman (rules 26.1.1, 26.3)", () => {
      const runs = other.formatLegislation({
        title: "Bürgerliches Gesetzbuch",
        translatedTitle: "Civil Code",
        jurisdiction: "Germany",
        pinpoint: "§ 242",
      });
      expect(flatten(runs)).toBe("Bürgerliches Gesetzbuch [Civil Code] (Germany) § 242");
      expect(italicText(runs)).toBe("Bürgerliches Gesetzbuch");
    });
  });
});
