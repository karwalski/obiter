/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  referenceGuideEntries,
  ReferenceGuideEntry,
} from "../data/referenceGuide";
import {
  REPORT_SERIES,
  ReportSeriesEntry,
} from "../../engine/data/report-series";
import {
  COURT_IDENTIFIERS,
  CourtIdentifier,
} from "../../engine/data/court-identifiers";
import {
  PINPOINT_ABBREVIATIONS,
  PinpointAbbreviation,
} from "../../engine/data/pinpoint-abbrevs";
import {
  COURT_GUIDE_GROUPS,
  searchCourtGuide,
  type CourtGuideEntry,
} from "../data/courtReferenceGuide";
import {
  getPracticeDirectionsForJurisdiction,
  getAllPracticeDirections,
} from "../../engine/court/practiceDirections";
import { getSharedStore } from "../../store/singleton";
import { getStandardConfig } from "../../engine/standards";
import type { CitationStandardId } from "../../engine/standards/types";

// ─── Guide Tab Type ───────────────────────────────────────────────────────────

type GuideTab = "rules" | "abbreviations" | "sourceTypes";

const GUIDE_TABS: { key: GuideTab; label: string }[] = [
  { key: "rules", label: "Rules" },
  { key: "abbreviations", label: "Abbreviations" },
  { key: "sourceTypes", label: "Source Types" },
];

// ─── Rules Tab Helpers ────────────────────────────────────────────────────────

function chapterPrefix(ruleNumber: string): string {
  const dot = ruleNumber.indexOf(".");
  return dot === -1 ? ruleNumber : ruleNumber.slice(0, dot);
}

const CHAPTER_LABELS: Record<string, string> = {
  "1": "Chapter 1 \u2014 General Rules",
  "2": "Chapter 2 \u2014 Cases",
  "3": "Chapter 3 \u2014 Legislation",
  "4": "Chapter 4 \u2014 Journal Articles",
  "5": "Chapter 5 \u2014 Other Sources",
  "6": "Chapter 6 \u2014 International Materials",
  "7": "Chapter 7 \u2014 Secondary Sources",
};

function chapterLabel(prefix: string): string {
  return CHAPTER_LABELS[prefix] ?? `Chapter ${prefix}`;
}

interface GroupedEntries {
  chapter: string;
  label: string;
  entries: ReferenceGuideEntry[];
}

function groupByChapter(entries: ReferenceGuideEntry[]): GroupedEntries[] {
  const map = new Map<string, ReferenceGuideEntry[]>();
  for (const entry of entries) {
    const ch = chapterPrefix(entry.ruleNumber);
    const list = map.get(ch);
    if (list) {
      list.push(entry);
    } else {
      map.set(ch, [entry]);
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([ch, items]) => ({
      chapter: ch,
      label: chapterLabel(ch),
      entries: items,
    }));
}

function matchesRuleQuery(
  entry: ReferenceGuideEntry,
  query: string,
): boolean {
  const q = query.toLowerCase();
  return (
    entry.ruleNumber.toLowerCase().includes(q) ||
    entry.title.toLowerCase().includes(q) ||
    entry.summary.toLowerCase().includes(q)
  );
}

// ─── Standard Filtering Helpers (SWITCH-001) ─────────────────────────────────

function filterEntriesByStandard(
  entries: ReferenceGuideEntry[],
  standardId: CitationStandardId,
): ReferenceGuideEntry[] {
  if (standardId.startsWith("oscola")) {
    return entries.filter((e) => e.id.startsWith("OSC-REF"));
  }
  if (standardId.startsWith("nzlsg")) {
    return entries.filter((e) => e.id.startsWith("NZLSG-REF"));
  }
  // AGLC (default): exclude OSCOLA and NZLSG entries
  return entries.filter(
    (e) => !e.id.startsWith("OSC-REF") && !e.id.startsWith("NZLSG-REF"),
  );
}

// ─── Abbreviation Tab Helpers ─────────────────────────────────────────────────

interface AbbrevSearchResults {
  reportSeries: ReportSeriesEntry[];
  courts: CourtIdentifier[];
  pinpoints: PinpointAbbreviation[];
}

function searchAbbreviations(query: string): AbbrevSearchResults {
  if (query.trim() === "") {
    return {
      reportSeries: REPORT_SERIES,
      courts: COURT_IDENTIFIERS,
      pinpoints: PINPOINT_ABBREVIATIONS,
    };
  }
  const q = query.toLowerCase();
  return {
    reportSeries: REPORT_SERIES.filter(
      (e) =>
        e.abbreviation.toLowerCase().includes(q) ||
        e.fullName.toLowerCase().includes(q) ||
        e.jurisdiction.toLowerCase().includes(q),
    ),
    courts: COURT_IDENTIFIERS.filter(
      (e) =>
        e.code.toLowerCase().includes(q) ||
        e.fullName.toLowerCase().includes(q) ||
        e.jurisdiction.toLowerCase().includes(q),
    ),
    pinpoints: PINPOINT_ABBREVIATIONS.filter(
      (e) =>
        e.type.toLowerCase().includes(q) ||
        e.singular.toLowerCase().includes(q) ||
        e.plural.toLowerCase().includes(q),
    ),
  };
}

function reportTypeLabel(
  type: "authorised" | "unauthorised_generalist" | "unauthorised_subject",
): string {
  switch (type) {
    case "authorised":
      return "Authorised";
    case "unauthorised_generalist":
      return "Generalist";
    case "unauthorised_subject":
      return "Subject";
  }
}

// ─── Source Types Data ────────────────────────────────────────────────────────

interface SourceTypeInfo {
  key: string;
  label: string;
  rule: string;
  description: string;
}

const SOURCE_TYPES: SourceTypeInfo[] = [
  // Part II — Domestic Sources
  { key: "case.reported", label: "Reported Case", rule: "2.2", description: "Decisions published in authorised or unauthorised law reports with volume and page numbers." },
  { key: "case.unreported.mnc", label: "Unreported Case (MNC)", rule: "2.3.1", description: "Unreported decisions with a medium neutral citation assigned by the court." },
  { key: "case.unreported.no_mnc", label: "Unreported Case (No MNC)", rule: "2.3.2", description: "Unreported decisions without a medium neutral citation, cited by party names and full date." },
  { key: "case.proceeding", label: "Court Proceeding", rule: "2.3.3", description: "Ongoing proceedings that have not yet resulted in a published judgment." },
  { key: "case.court_order", label: "Court Order", rule: "2.3.4", description: "Specific orders made by a court, distinct from the judgment itself." },
  { key: "case.quasi_judicial", label: "Quasi-Judicial Decision", rule: "2.6", description: "Decisions of tribunals and quasi-judicial bodies (e.g. AAT, VCAT)." },
  { key: "case.arbitration", label: "Arbitration Decision", rule: "2.6.2", description: "Awards and decisions from domestic arbitration proceedings." },
  { key: "case.transcript", label: "Transcript of Proceedings", rule: "2.7", description: "Official transcripts of court or tribunal hearings." },
  { key: "case.submission", label: "Court Submission", rule: "2.8", description: "Written submissions filed by parties in court proceedings." },
  { key: "legislation.statute", label: "Statute / Act", rule: "3.1", description: "Primary legislation enacted by a parliament (e.g. Acts of Parliament)." },
  { key: "legislation.bill", label: "Bill", rule: "3.2", description: "Proposed legislation introduced but not yet enacted by parliament." },
  { key: "legislation.delegated", label: "Delegated Legislation", rule: "3.4", description: "Regulations, rules, and orders made under authority of an Act." },
  { key: "legislation.constitution", label: "Constitution", rule: "3.6", description: "Constitutional instruments (Australian Constitution, state constitutions)." },
  { key: "legislation.explanatory", label: "Explanatory Memorandum", rule: "3.7", description: "Explanatory memoranda and statements of compatibility accompanying bills." },
  { key: "legislation.quasi", label: "Quasi-Legislative Material", rule: "3.9", description: "Practice directions, court rules, and similar quasi-legislative instruments." },

  // Part III — Secondary Sources
  { key: "journal.article", label: "Journal Article", rule: "5", description: "Articles published in legal journals with volume and page numbers." },
  { key: "journal.online", label: "Online Journal Article", rule: "5.10", description: "Articles from journals published exclusively online, often with document identifiers." },
  { key: "journal.forthcoming", label: "Forthcoming Article", rule: "5.11", description: "Articles accepted for publication but not yet published." },
  { key: "book", label: "Book", rule: "6", description: "Standalone published books, monographs, and treatises." },
  { key: "book.chapter", label: "Book Chapter", rule: "6.6.1", description: "A chapter or essay within an edited collection." },
  { key: "book.translated", label: "Translated Book", rule: "6.7", description: "Books translated from another language, citing the translator." },
  { key: "book.audiobook", label: "Audiobook", rule: "6.9", description: "Audio versions of published books." },
  { key: "report", label: "Report", rule: "7.1", description: "General government or institutional reports." },
  { key: "report.parliamentary", label: "Parliamentary Report", rule: "7.1.2", description: "Reports produced by or for parliament (committee reports, etc.)." },
  { key: "report.royal_commission", label: "Royal Commission Report", rule: "7.1.3", description: "Reports from royal commissions and commissions of inquiry." },
  { key: "report.law_reform", label: "Law Reform Commission Report", rule: "7.1.4", description: "Reports from law reform commissions (ALRC, state LRCs)." },
  { key: "report.abs", label: "ABS Publication", rule: "7.1.5", description: "Publications from the Australian Bureau of Statistics." },
  { key: "research_paper", label: "Research / Working Paper", rule: "7.2", description: "Working papers, research papers, and discussion papers in a series." },
  { key: "research_paper.parliamentary", label: "Parliamentary Research Paper", rule: "7.2.3", description: "Research papers produced by parliamentary research services." },
  { key: "conference_paper", label: "Conference Paper", rule: "7.2.4", description: "Papers presented at academic or professional conferences." },
  { key: "thesis", label: "Thesis / Dissertation", rule: "7.2.5", description: "University theses and dissertations (honours, masters, doctoral)." },
  { key: "speech", label: "Speech", rule: "7.3", description: "Published speeches, lectures, and addresses." },
  { key: "press_release", label: "Press Release", rule: "7.4", description: "Official press releases from governments, organisations, or individuals." },
  { key: "hansard", label: "Hansard / Parliamentary Debates", rule: "7.5.1", description: "Official records of parliamentary debates." },
  { key: "submission.government", label: "Government Submission", rule: "7.5.2", description: "Submissions to parliamentary inquiries and government consultations." },
  { key: "evidence.parliamentary", label: "Parliamentary Evidence", rule: "7.5.3", description: "Evidence given before parliamentary committees." },
  { key: "constitutional_convention", label: "Constitutional Convention Debates", rule: "7.5.4", description: "Records of constitutional convention debates." },
  { key: "dictionary", label: "Dictionary", rule: "7.6", description: "Legal and general dictionaries, including online editions." },
  { key: "legal_encyclopedia", label: "Legal Encyclopedia", rule: "7.7", description: "Entries in legal encyclopedias (e.g. Halsbury's, Laws of Australia)." },
  { key: "looseleaf", label: "Looseleaf Service", rule: "7.8", description: "Looseleaf legal services and regularly updated reference works." },
  { key: "ip_material", label: "Intellectual Property Material", rule: "7.9", description: "Patents, trademarks, designs, and related IP documents." },
  { key: "constitutive_document", label: "Constitutive Document", rule: "7.10", description: "Constitutions of organisations, memoranda of association, etc." },
  { key: "newspaper", label: "Newspaper Article", rule: "7.11", description: "Articles from newspapers, in print or online editions." },
  { key: "correspondence", label: "Written Correspondence", rule: "7.12", description: "Letters, emails, and memoranda." },
  { key: "interview", label: "Interview", rule: "7.13", description: "Published or unpublished interviews." },
  { key: "film_tv_media", label: "Film / TV / Media", rule: "7.14", description: "Films, television programs, podcasts, and other audiovisual media." },
  { key: "internet_material", label: "Internet Material", rule: "7.15", description: "Web pages and online content not fitting another source type." },
  { key: "social_media", label: "Social Media Post", rule: "7.16", description: "Posts on social media platforms (Twitter/X, Facebook, etc.)." },
  { key: "genai_output", label: "AI-Generated Content", rule: "7.12 (interim)", description: "Output from AI platforms (ChatGPT, Claude, etc.), cited as correspondence." },

  // Part IV — International Materials
  { key: "treaty", label: "Treaty", rule: "8", description: "Bilateral and multilateral treaties, conventions, and agreements." },
  { key: "un.document", label: "UN Document", rule: "9.2", description: "Official United Nations documents, resolutions, and reports." },
  { key: "un.communication", label: "UN Communication", rule: "9.3", description: "Communications from UN treaty bodies and committees." },
  { key: "un.yearbook", label: "UN Yearbook", rule: "9.4", description: "Material from UN yearbooks (e.g. Yearbook of the ILC)." },
  { key: "icj.decision", label: "ICJ Decision", rule: "10.2", description: "Judgments, advisory opinions, and orders of the International Court of Justice." },
  { key: "icj.pleading", label: "ICJ Pleading", rule: "10.3", description: "Pleadings, memorials, and other documents filed before the ICJ." },
  { key: "arbitral.state_state", label: "State-State Arbitration", rule: "11.1", description: "International arbitral awards between states." },
  { key: "arbitral.individual_state", label: "Investor-State Arbitration", rule: "11.2", description: "Investment treaty arbitration awards (ICSID, UNCITRAL, etc.)." },
  { key: "icc_tribunal.case", label: "ICC / Tribunal Case", rule: "12.2", description: "Decisions of international criminal tribunals (ICC, ICTY, ICTR)." },
  { key: "wto.document", label: "WTO Document", rule: "13.1.2", description: "Official World Trade Organization documents." },
  { key: "wto.decision", label: "WTO Decision", rule: "13.1.3", description: "Panel and Appellate Body reports and decisions of the WTO." },
  { key: "gatt.document", label: "GATT Document", rule: "13.2", description: "Documents from the General Agreement on Tariffs and Trade." },
  { key: "eu.official_journal", label: "EU Official Journal", rule: "14.2.1", description: "Legislation and documents published in the EU Official Journal." },
  { key: "eu.court", label: "EU Court Decision", rule: "14.2.3", description: "Decisions of the Court of Justice of the European Union." },
  { key: "echr.decision", label: "ECHR Decision", rule: "14.3.2", description: "Judgments and decisions of the European Court of Human Rights." },
  { key: "supranational.decision", label: "Supranational Decision", rule: "14.4", description: "Decisions of other supranational courts and bodies." },
  { key: "supranational.document", label: "Supranational Document", rule: "14.5", description: "Documents of supranational organisations not covered elsewhere." },

  // Part V — Foreign Domestic Sources
  { key: "foreign.canada", label: "Canadian Source", rule: "15", description: "Cases, legislation, and secondary sources from Canada." },
  { key: "foreign.china", label: "Chinese Source", rule: "16", description: "Cases, legislation, and secondary sources from China." },
  { key: "foreign.france", label: "French Source", rule: "17", description: "Cases, legislation, and secondary sources from France." },
  { key: "foreign.germany", label: "German Source", rule: "18", description: "Cases, legislation, and secondary sources from Germany." },
  { key: "foreign.hong_kong", label: "Hong Kong Source", rule: "19", description: "Cases, legislation, and secondary sources from Hong Kong." },
  { key: "foreign.malaysia", label: "Malaysian Source", rule: "20", description: "Cases, legislation, and secondary sources from Malaysia." },
  { key: "foreign.new_zealand", label: "New Zealand Source", rule: "21", description: "Cases, legislation, and secondary sources from New Zealand." },
  { key: "foreign.singapore", label: "Singaporean Source", rule: "22", description: "Cases, legislation, and secondary sources from Singapore." },
  { key: "foreign.south_africa", label: "South African Source", rule: "23", description: "Cases, legislation, and secondary sources from South Africa." },
  { key: "foreign.uk", label: "United Kingdom Source", rule: "24", description: "Cases, legislation, and secondary sources from the United Kingdom." },
  { key: "foreign.usa", label: "United States Source", rule: "25", description: "Cases, legislation, and secondary sources from the United States." },
  { key: "foreign.other", label: "Other Foreign Source", rule: "26", description: "Sources from jurisdictions not specifically covered in AGLC4." },
];

// ─── Subcomponents ────────────────────────────────────────────────────────────

function EntryCard({
  entry,
  defaultOpen,
}: {
  entry: ReferenceGuideEntry;
  defaultOpen: boolean;
}): JSX.Element {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="guide-card">
      <button
        className="guide-card-header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="guide-card-rule">Rule {entry.ruleNumber}</span>
        <span className="guide-card-title">{entry.title}</span>
        <span className="guide-card-chevron" aria-hidden="true">
          {open ? "\u25B4" : "\u25BE"}
        </span>
      </button>
      {open && (
        <div className="guide-card-body">
          <p className="guide-card-summary">{entry.summary}</p>

          {entry.examples.length > 0 && (
            <div className="guide-card-section">
              <h4>Examples</h4>
              <ul>
                {entry.examples.map((ex, i) => (
                  <li key={i}>{ex}</li>
                ))}
              </ul>
            </div>
          )}

          {entry.tips.length > 0 && (
            <div className="guide-card-section">
              <h4>Tips</h4>
              <ul>
                {entry.tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Rules Tab ────────────────────────────────────────────────────────────────

function RulesTab({
  entries,
}: {
  entries: ReferenceGuideEntry[];
}): JSX.Element {
  const [searchParams] = useSearchParams();
  const ruleParam = searchParams.get("rule") ?? "";
  const [query, setQuery] = useState(ruleParam);

  const filtered = useMemo(
    () =>
      query.trim() === ""
        ? entries
        : entries.filter((e) => matchesRuleQuery(e, query.trim())),
    [query, entries],
  );

  const groups = useMemo(() => groupByChapter(filtered), [filtered]);
  const hasFilter = query.trim() !== "";

  return (
    <>
      <input
        className="guide-search"
        type="search"
        placeholder="Search by rule number, title, or keyword\u2026"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search reference guide"
      />

      {groups.length === 0 && (
        <p className="guide-empty">No entries match your search.</p>
      )}

      {groups.map((group) => (
        <div key={group.chapter} className="guide-chapter">
          <h3 className="guide-chapter-title">{group.label}</h3>
          {group.entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} defaultOpen={hasFilter} />
          ))}
        </div>
      ))}
    </>
  );
}

// ─── Abbreviations Tab ────────────────────────────────────────────────────────

function AbbreviationsTab(): JSX.Element {
  const [query, setQuery] = useState("");

  const results = useMemo(() => searchAbbreviations(query), [query]);
  const hasResults =
    results.reportSeries.length > 0 ||
    results.courts.length > 0 ||
    results.pinpoints.length > 0;

  return (
    <>
      <input
        className="guide-search"
        type="search"
        placeholder="Search abbreviations, courts, pinpoints\u2026"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search abbreviations"
      />

      {!hasResults && (
        <p className="guide-empty">No abbreviations match your search.</p>
      )}

      {results.reportSeries.length > 0 && (
        <div className="guide-chapter">
          <h3 className="guide-chapter-title">
            Report Series ({results.reportSeries.length})
          </h3>
          <table className="guide-abbrev-table">
            <thead>
              <tr>
                <th>Abbrev</th>
                <th>Full Name</th>
                <th>Jur</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {results.reportSeries.map((rs, i) => (
                <tr key={i}>
                  <td className="guide-abbrev-code">{rs.abbreviation}</td>
                  <td>{rs.fullName}</td>
                  <td>{rs.jurisdiction}</td>
                  <td>{reportTypeLabel(rs.type)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {results.courts.length > 0 && (
        <div className="guide-chapter">
          <h3 className="guide-chapter-title">
            Courts ({results.courts.length})
          </h3>
          <table className="guide-abbrev-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Full Name</th>
                <th>Jur</th>
              </tr>
            </thead>
            <tbody>
              {results.courts.map((ct, i) => (
                <tr key={i}>
                  <td className="guide-abbrev-code">{ct.code}</td>
                  <td>{ct.fullName}</td>
                  <td>{ct.jurisdiction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {results.pinpoints.length > 0 && (
        <div className="guide-chapter">
          <h3 className="guide-chapter-title">
            Pinpoint Abbreviations ({results.pinpoints.length})
          </h3>
          <table className="guide-abbrev-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Singular</th>
                <th>Plural</th>
              </tr>
            </thead>
            <tbody>
              {results.pinpoints.map((pp, i) => (
                <tr key={i}>
                  <td>{pp.type}</td>
                  <td className="guide-abbrev-code">{pp.singular}</td>
                  <td className="guide-abbrev-code">{pp.plural}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ─── Source Types Tab ─────────────────────────────────────────────────────────

function SourceTypesTab(): JSX.Element {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (query.trim() === "") return SOURCE_TYPES;
    const q = query.toLowerCase();
    return SOURCE_TYPES.filter(
      (st) =>
        st.label.toLowerCase().includes(q) ||
        st.rule.toLowerCase().includes(q) ||
        st.description.toLowerCase().includes(q) ||
        st.key.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <>
      <input
        className="guide-search"
        type="search"
        placeholder="Search source types\u2026"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search source types"
      />

      {filtered.length === 0 && (
        <p className="guide-empty">No source types match your search.</p>
      )}

      {filtered.map((st) => (
        <div key={st.key} className="guide-source-type-row">
          <div className="guide-source-type-header">
            <span className="guide-card-rule">Rule {st.rule}</span>
            <span className="guide-source-type-label">{st.label}</span>
          </div>
          <p className="guide-source-type-desc">{st.description}</p>
        </div>
      ))}
    </>
  );
}

// ─── Court Guide Tab (COURT-GUIDE-001) ───────────────────────────────────────

function CourtGuideCard({
  entry,
  defaultOpen,
}: {
  entry: CourtGuideEntry;
  defaultOpen: boolean;
}): JSX.Element {
  const [open, setOpen] = useState(defaultOpen);
  const pdLinks = useMemo(
    () => getPracticeDirectionsForJurisdiction(entry.jurisdiction),
    [entry.jurisdiction],
  );

  return (
    <div className="guide-card">
      <button
        className="guide-card-header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="guide-card-rule">{entry.practiceDirection.number}</span>
        <span className="guide-card-title">{entry.courtName}</span>
        <span className="guide-card-chevron" aria-hidden="true">
          {open ? "\u25B4" : "\u25BE"}
        </span>
      </button>
      {open && (
        <div className="guide-card-body">
          <p className="guide-card-summary">
            {entry.practiceDirection.name} ({entry.practiceDirection.date})
          </p>

          {pdLinks.length > 0 && (
            <div className="guide-card-section">
              <h4>Practice Direction Links</h4>
              <ul>
                {pdLinks.map((link, i) => (
                  <li key={i}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="guide-pd-link"
                    >
                      {link.name}
                    </a>
                    <span className="guide-pd-verified">
                      {" "}(verified {link.lastVerified})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {entry.citationRequirements.length > 0 && (
            <div className="guide-card-section">
              <h4>Citation Requirements</h4>
              <ul>
                {entry.citationRequirements.map((req, i) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>
            </div>
          )}

          {entry.loaRequirements.length > 0 && (
            <div className="guide-card-section">
              <h4>LOA Format</h4>
              <ul>
                {entry.loaRequirements.map((req, i) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>
            </div>
          )}

          {entry.filingProcedures.length > 0 && (
            <div className="guide-card-section">
              <h4>Filing Deadlines and Procedures</h4>
              <ul>
                {entry.filingProcedures.map((proc, i) => (
                  <li key={i}>{proc}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CourtGuideTab({
  activeJurisdiction,
}: {
  activeJurisdiction: string | undefined;
}): JSX.Element {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    let entries = searchCourtGuide(query);
    // When a jurisdiction is active and no search query, show that jurisdiction first
    if (query.trim() === "" && activeJurisdiction) {
      const active = entries.filter((e) => e.jurisdiction === activeJurisdiction);
      const rest = entries.filter((e) => e.jurisdiction !== activeJurisdiction);
      entries = [...active, ...rest];
    }
    return entries;
  }, [query, activeJurisdiction]);

  const groups = useMemo(() => {
    const map = new Map<string, CourtGuideEntry[]>();
    for (const entry of filtered) {
      const list = map.get(entry.group);
      if (list) {
        list.push(entry);
      } else {
        map.set(entry.group, [entry]);
      }
    }
    return COURT_GUIDE_GROUPS.filter((g) => map.has(g)).map((g) => ({
      group: g,
      entries: map.get(g)!,
    }));
  }, [filtered]);

  const hasFilter = query.trim() !== "";

  return (
    <>
      <input
        className="guide-search"
        type="search"
        placeholder="Search by court, jurisdiction, or topic\u2026"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search court guide"
      />

      {groups.length === 0 && (
        <p className="guide-empty">No court entries match your search.</p>
      )}

      {groups.map(({ group, entries }) => (
        <div key={group} className="guide-chapter">
          <h3 className="guide-chapter-title">{group}</h3>
          {entries.map((entry) => (
            <CourtGuideCard
              key={entry.jurisdiction}
              entry={entry}
              defaultOpen={
                hasFilter || entry.jurisdiction === activeJurisdiction
              }
            />
          ))}
        </div>
      ))}
    </>
  );
}

// ─── Practice Directions Tab (COURT-GUIDE-002) ──────────────────────────────

function PracticeDirectionsTab(): JSX.Element {
  const [query, setQuery] = useState("");
  const allLinks = useMemo(() => getAllPracticeDirections(), []);

  const filtered = useMemo(() => {
    if (query.trim() === "") return allLinks;
    const q = query.toLowerCase();
    return allLinks.filter(
      (link) =>
        link.jurisdiction.toLowerCase().includes(q) ||
        link.name.toLowerCase().includes(q) ||
        link.url.toLowerCase().includes(q),
    );
  }, [query, allLinks]);

  return (
    <>
      <input
        className="guide-search"
        type="search"
        placeholder="Search practice directions\u2026"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search practice directions"
      />

      {filtered.length === 0 && (
        <p className="guide-empty">No practice directions match your search.</p>
      )}

      {filtered.length > 0 && (
        <div className="guide-chapter">
          <h3 className="guide-chapter-title">
            Practice Directions ({filtered.length})
          </h3>
          <table className="guide-abbrev-table">
            <thead>
              <tr>
                <th>Court</th>
                <th>Practice Direction</th>
                <th>Verified</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((link, i) => (
                <tr key={i}>
                  <td className="guide-abbrev-code">{link.jurisdiction}</td>
                  <td>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="guide-pd-link"
                    >
                      {link.name}
                    </a>
                  </td>
                  <td>{link.lastVerified}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type CourtGuideTabKey = "courtGuide" | "practiceDirections";

const COURT_GUIDE_TAB_ITEMS: { key: CourtGuideTabKey; label: string }[] = [
  { key: "courtGuide", label: "Court Guide" },
  { key: "practiceDirections", label: "Practice Directions" },
];

export default function AbbreviationLookup(): JSX.Element {
  const [activeTab, setActiveTab] = useState<GuideTab>("rules");
  const [courtTab, setCourtTab] = useState<CourtGuideTabKey>("courtGuide");
  const [writingMode, setWritingMode] = useState<"academic" | "court">("academic");
  const [courtJurisdiction, setCourtJurisdiction] = useState<string | undefined>(undefined);
  const [standardId, setStandardId] = useState<CitationStandardId>("aglc4");

  // Load writing mode, jurisdiction, and standard from the citation store
  useEffect(() => {
    void (async () => {
      try {
        const store = await getSharedStore();
        setWritingMode(store.getWritingMode());
        setCourtJurisdiction(store.getCourtJurisdiction());
        setStandardId(store.getStandardId());
      } catch {
        // Default to academic mode / aglc4
      }
    })();
  }, []);

  const standardLabel = useMemo(
    () => getStandardConfig(standardId).standardLabel,
    [standardId],
  );

  const filteredGuideEntries = useMemo(
    () => filterEntriesByStandard(referenceGuideEntries, standardId),
    [standardId],
  );

  const isCourtMode = writingMode === "court";

  return (
    <div className="guide-panel">
      <h2>{isCourtMode ? "Court Reference Guide" : `${standardLabel} Reference Guide`}</h2>

      {isCourtMode ? (
        <>
          <div className="guide-tab-bar" role="tablist">
            {COURT_GUIDE_TAB_ITEMS.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={courtTab === tab.key}
                className={`guide-tab${courtTab === tab.key ? " guide-tab--active" : ""}`}
                onClick={() => setCourtTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div role="tabpanel">
            {courtTab === "courtGuide" && (
              <CourtGuideTab activeJurisdiction={courtJurisdiction} />
            )}
            {courtTab === "practiceDirections" && <PracticeDirectionsTab />}
          </div>
        </>
      ) : (
        <>
          <div className="guide-tab-bar" role="tablist">
            {GUIDE_TABS.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={activeTab === tab.key}
                className={`guide-tab${activeTab === tab.key ? " guide-tab--active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div role="tabpanel">
            {activeTab === "rules" && <RulesTab entries={filteredGuideEntries} />}
            {activeTab === "abbreviations" && <AbbreviationsTab />}
            {activeTab === "sourceTypes" && <SourceTypesTab />}
          </div>
        </>
      )}
    </div>
  );
}
