/**
 * Judicial office/title abbreviation datasets.
 *
 * AU_JUDICIAL_TITLES encodes the AGLC4 rule 2.4.1 table (PDF pp.83–5):
 * abbreviations follow the officer's name in text and citations, except
 * offices marked with an asterisk in the table (Commissioner, Judge,
 * Magistrate, Master), which always appear in full *before* the name
 * (`titleBeforeName: true`; illustration 93: '(Commissioner Buss)').
 * Plural abbreviations (rule 2.4.5) are carried on the singular entry
 * where the table gives one (eg J→JJ, AJ→AJJ, SJ→SJJ).
 *
 * UK_JUDICIAL_TITLES encodes the AGLC4 rule 24.1.6 table (PDF pp.281–2),
 * used in addition to (or instead of) the rule 2.4.1 abbreviations for UK
 * decisions. Asterisked titles precede the name (eg 'Lord Diplock',
 * 'Baroness Hale'). Note: the guide's own example band at 24.1.6 misprints
 * 'Lord Hope DP'; the table prescribes 'DPSC' for the Deputy President of
 * the UK Supreme Court, and the table governs (DECISION-012).
 *
 * Pure data — no side effects. Consumers: rule 2.4.x formatting
 * (cases-supplementary.ts) and rule 24.1.6 (uk.ts) via wave-2 wiring.
 */

export interface JudicialTitle {
  /** The judicial office as named in the AGLC4 table (eg "Chief Justice"). */
  office: string;
  /** Plural office name, where the table gives one (eg "Justices"). */
  officePlural?: string;
  /**
   * The abbreviation/title used in citations. For `titleBeforeName`
   * entries this is the full title itself (the table gives no shortening).
   */
  abbreviation: string;
  /**
   * Plural abbreviation for a joint judgment (rule 2.4.5), where the table
   * gives one (eg "JJ", "AJJ", "SJJ", "JJA", "AJJA"; UK "LJJ" per the
   * 24.1.6 illustration band).
   */
  abbreviationPlural?: string;
  /**
   * True for offices the table marks with an asterisk: the title always
   * appears in full before the officer's name ('Commissioner Buss'), never
   * after it ('Buss Commissioner' is wrong).
   */
  titleBeforeName: boolean;
}

/**
 * AGLC4 rule 2.4.1 table (PDF pp.83–5) — Australian judicial offices.
 * All 30 table rows are represented (plural rows merged onto their
 * singular entry).
 */
export const AU_JUDICIAL_TITLES: readonly JudicialTitle[] = [
  { office: "Acting Chief Justice", abbreviation: "ACJ", titleBeforeName: false },
  {
    office: "Acting Justice of Appeal",
    officePlural: "Acting Justices of Appeal",
    abbreviation: "AJA",
    abbreviationPlural: "AJJA",
    titleBeforeName: false,
  },
  {
    office: "Acting Justice",
    officePlural: "Acting Justices",
    abbreviation: "AJ",
    abbreviationPlural: "AJJ",
    titleBeforeName: false,
  },
  { office: "Acting President", abbreviation: "AP", titleBeforeName: false },
  { office: "Associate Justice", abbreviation: "AsJ", titleBeforeName: false },
  { office: "Auxiliary Judge", abbreviation: "AUJ", titleBeforeName: false },
  { office: "Chief Judge Administrator", abbreviation: "CJA", titleBeforeName: false },
  { office: "Chief Judge at Common Law", abbreviation: "CJ at CL", titleBeforeName: false },
  { office: "Chief Judge in Equity", abbreviation: "CJ in Eq", titleBeforeName: false },
  {
    office: "Chief Judge of the Commercial Division",
    abbreviation: "CJ Comm D",
    titleBeforeName: false,
  },
  { office: "Chief Justice", abbreviation: "CJ", titleBeforeName: false },
  // Asterisked in the table: always in full before the name (ex 93).
  { office: "Commissioner", abbreviation: "Commissioner", titleBeforeName: true },
  {
    office: "Deputy Chief Justice/District Court Judge",
    abbreviation: "DCJ",
    titleBeforeName: false,
  },
  { office: "Federal Magistrate", abbreviation: "FM", titleBeforeName: false },
  // Asterisked in the table.
  { office: "Judge", abbreviation: "Judge", titleBeforeName: true },
  { office: "Judicial Registrar", abbreviation: "JR", titleBeforeName: false },
  {
    office: "Justice of Appeal",
    officePlural: "Justices of Appeal",
    abbreviation: "JA",
    abbreviationPlural: "JJA",
    titleBeforeName: false,
  },
  {
    office: "Justice",
    officePlural: "Justices",
    abbreviation: "J",
    abbreviationPlural: "JJ",
    titleBeforeName: false,
  },
  // Asterisked in the table.
  { office: "Magistrate", abbreviation: "Magistrate", titleBeforeName: true },
  // Asterisked in the table.
  { office: "Master", abbreviation: "Master", titleBeforeName: true },
  { office: "President", abbreviation: "P", titleBeforeName: false },
  { office: "Senior Judge Administrator", abbreviation: "SJA", titleBeforeName: false },
  {
    office: "Senior Judge",
    officePlural: "Senior Judges",
    abbreviation: "SJ",
    abbreviationPlural: "SJJ",
    titleBeforeName: false,
  },
  { office: "Senior Puisne Judge", abbreviation: "SPJ", titleBeforeName: false },
  { office: "Vice-President", abbreviation: "V-P", titleBeforeName: false },
];

/**
 * AGLC4 rule 24.1.6 table (PDF pp.281–2) — UK judicial titles, 21 rows.
 * Used in addition to, or instead of, the rule 2.4.1 abbreviations.
 */
export const UK_JUDICIAL_TITLES: readonly JudicialTitle[] = [
  { office: "Baron of the Exchequer", abbreviation: "B", titleBeforeName: false },
  // Asterisked: precedes the name ('Baroness Hale').
  { office: "Baroness", abbreviation: "Baroness", titleBeforeName: true },
  { office: "Chancellor", abbreviation: "C", titleBeforeName: false },
  { office: "Chief Baron", abbreviation: "CB", titleBeforeName: false },
  // Asterisked: precedes the name.
  { office: "Circuit Judge", abbreviation: "Judge", titleBeforeName: true },
  { office: "District Judge", abbreviation: "DJ", titleBeforeName: false },
  {
    // The table prescribes 'DPSC'; the guide's example band misprint
    // 'Lord Hope DP' is not followed (DECISION-012).
    office: "Deputy President of the Supreme Court of the United Kingdom",
    abbreviation: "DPSC",
    titleBeforeName: false,
  },
  { office: "Justice of the High Court", abbreviation: "J", titleBeforeName: false },
  { office: "Lord Chancellor", abbreviation: "LC", titleBeforeName: false },
  {
    office:
      "Lord Chief Justice, Chief Justice of the Common Pleas, Chief Justice of the King's Bench, Chief Justice of the Queen's Bench",
    abbreviation: "CJ",
    titleBeforeName: false,
  },
  // Asterisked: precedes the name.
  { office: "Lord Commissioner", abbreviation: "Lord Commissioner", titleBeforeName: true },
  // Asterisked: precedes the name ('Lord Diplock').
  { office: "Lord of Appeal", abbreviation: "Lord", titleBeforeName: true },
  {
    // Plural per the 24.1.6 illustration band:
    // 'James, Baggallay and Bramwell LJJ'.
    office: "Lord/Lady Justice of Appeal",
    abbreviation: "LJ",
    abbreviationPlural: "LJJ",
    titleBeforeName: false,
  },
  // Asterisked: precedes the name.
  { office: "Master", abbreviation: "Master", titleBeforeName: true },
  { office: "Master of the Rolls", abbreviation: "MR", titleBeforeName: false },
  {
    office: "President of the Family Division of the High Court",
    abbreviation: "P",
    titleBeforeName: false,
  },
  {
    office: "President of the Supreme Court of the United Kingdom",
    abbreviation: "PSC",
    titleBeforeName: false,
  },
  // Asterisked: precedes the name.
  { office: "Recorder", abbreviation: "Recorder", titleBeforeName: true },
  // Asterisked: precedes the name.
  { office: "Registrar", abbreviation: "Registrar", titleBeforeName: true },
  {
    office: "Justice of the Supreme Court of the United Kingdom",
    abbreviation: "JSC",
    titleBeforeName: false,
  },
  { office: "Vice-Chancellor", abbreviation: "V-C", titleBeforeName: false },
];

export type JudicialTitleJurisdiction = "AU" | "UK";

/**
 * Look up a judicial title by its exact abbreviation/title (case-sensitive,
 * per rule 2.4.1 — eg 'AsJ' is valid but 'ASJ' is not, 'V-P' not 'VP').
 *
 * Some abbreviations exist in both tables ('J', 'CJ', 'P', 'Judge',
 * 'Master') with different offices; pass the jurisdiction of the deciding
 * court (default "AU").
 */
export function getJudicialTitle(
  abbreviation: string,
  jurisdiction: JudicialTitleJurisdiction = "AU"
): JudicialTitle | undefined {
  const table = jurisdiction === "UK" ? UK_JUDICIAL_TITLES : AU_JUDICIAL_TITLES;
  return table.find((t) => t.abbreviation === abbreviation);
}

/**
 * Plural abbreviation for two or more officers sharing a joint judgment
 * (rule 2.4.5). Returns undefined where the tables give no plural — the
 * singular is then repeated after each name (separate judgments always
 * keep the singular regardless).
 */
export function getJudicialTitlePlural(
  abbreviation: string,
  jurisdiction: JudicialTitleJurisdiction = "AU"
): string | undefined {
  return getJudicialTitle(abbreviation, jurisdiction)?.abbreviationPlural;
}

/**
 * True where rule 2.4.1/24.1.6 requires the title in full before the
 * officer's name (asterisked table rows, eg '(Commissioner Buss)',
 * 'Lord Diplock').
 */
export function isTitleBeforeName(
  abbreviation: string,
  jurisdiction: JudicialTitleJurisdiction = "AU"
): boolean {
  return getJudicialTitle(abbreviation, jurisdiction)?.titleBeforeName === true;
}
