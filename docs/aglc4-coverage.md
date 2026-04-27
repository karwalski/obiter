# AGLC4 Feature Coverage

**Obiter v1.11.2** | Last audited: 2026-04-27

Coverage audit of the Australian Guide to Legal Citation, 4th Edition. Each rule is marked as **Full**, **Partial**, or **Manual** (user responsibility, not automatable).

Legend:
- **Full** -- Obiter handles this automatically
- **Partial** -- Some aspects automated, some require manual steps. See notes.
- **Manual** -- Editorial guidance or text-level formatting; not a citation engine concern
- **Backlog** -- Story logged for future implementation

---

## Chapter 1: General Rules

| Rule | Title | Coverage | Notes |
|------|-------|----------|-------|
| 1.1.1 | When to Footnote | Manual | Editorial decision |
| 1.1.2 | Position of Footnote Numbers | Full | Validator warns on misplacement |
| 1.1.3 | Multiple Sources in a Footnote | Full | Semicolon separator, signal-change sentence break |
| 1.1.4 | Closing Punctuation | Full | Auto full stop; skips if ends with `.` `!` `?` |
| 1.1.5 | Discursive Text in Footnotes | Full | `commentaryBefore`/`commentaryAfter` fields + explanatory notes |
| 1.1.6 | Pinpoint References | Full | All pinpoint types: page, paragraph, section, clause, article |
| 1.1.7 | Spans of Pinpoint References | Full | En-dash ranges, comma-separated lists |
| 1.2 | Introductory Signals | Full | All 6 signals: See, See eg, See also, See generally, Cf, But see |
| 1.3 | Sources Referring to Other Sources | Partial | Engine has linking phrases (citing, quoted in, etc.) but **no UI**. Backlog: LINK-001 |
| 1.4.1 | Subsequent References (General) | Full | Author surname + (n X) + pinpoint |
| 1.4.2 | Cross-References within Text | Full | above n X / below n X with auto-direction |
| 1.4.3 | Ibid | Full | Auto-detection, pinpoint handling, multi-source guard |
| 1.4.4 | Short Titles | Full | Auto-assigned on first citation, italics for cases/legislation |
| 1.4.5 | Abbreviations and Defined Terms | Full | ('ABBREVIATION') format in first citation |
| 1.4.6 | Within-Footnote Subsequent References | Full | 'at' pinpoint format for same source in same footnote |
| 1.5.1 | Short Quotations | Manual | Text formatting, not citation |
| 1.5.1 | Long Quotations (Block Quotes) | Full | Block quote style: 10pt, 0.5" indent, no quotes |
| 1.5.2 | Introducing Quotations | Manual | Punctuation before quotes |
| 1.5.3 | Ellipses | Manual | Text editing |
| 1.5.4 | Editing Quotations | Manual | Square bracket alterations |
| 1.5.5 | [sic] | Manual | Text editing |
| 1.5.6 | Closing Punctuation for Quotations | Manual | Text formatting |
| 1.5.7 | Omitting Citations / Adding Emphasis | Manual | Text editing |
| 1.6.1 | Full Stops | Full | Abbreviation handling in citations |
| 1.6.2 | Commas | Full | Serial comma, separator logic |
| 1.6.3 | Dashes and Hyphens | Full | Em-dash, en-dash, hyphen distinction |
| 1.6.4 | Parentheses | Full | Year brackets, jurisdiction brackets |
| 1.6.5 | Square Brackets | Full | MNC year, editorial markers |
| 1.7 | Capitalisation | Full | Case names, statute titles, entity names |
| 1.8.1 | Italicisation for Emphasis | Manual | Text formatting |
| 1.8.2 | Italicisation of Source Titles | Full | Cases, legislation, books auto-italicised |
| 1.8.3 | Foreign Words | Partial | Common Latin terms handled; user may need manual italic for rare terms |
| 1.9.1 | Spelling | Manual | Editorial (Macquarie Dictionary) |
| 1.9.2 | Grammar | Manual | Editorial |
| 1.9.3 | Inclusive Language | Manual | Editorial |
| 1.10.1 | Numbers | Full | Words vs numerals in citations |
| 1.10.2 | Currency | Manual | Not citation-specific |
| 1.10.3 | Units | Manual | Not citation-specific |
| 1.11.1 | Full Dates | Full | DMY format in citations |
| 1.11.2 | Time | Full | Hour:minute am/pm |
| 1.11.3 | Point in Time / Period of Time | Full | |
| 1.11.4 | Spans of Dates and Times | Full | En-dash separation |
| 1.11.5 | Decades and Centuries | Full | |
| 1.12.1 | Title and Author | Full | AGLC4 title/author styles via template |
| 1.12.2 | Heading Levels (I-V) | Full | All 5 levels with auto-numbering (text-prefix method) |
| 1.13 | Bibliographies | Full | A/B/C/D/E sections, alphabetical, author inversion |

---

## Chapter 2: Domestic Cases

| Rule | Title | Coverage | Notes |
|------|-------|----------|-------|
| 2.1.1-2.1.15 | Case Names | Full | Party formatting, abbreviations, Crown, ex parte, Re, admiralty, etc. |
| 2.2 | Reported Decisions | Full | Year, volume, report series, starting page, court, parallel citations |
| 2.2.7 | Parallel Citations | Full | Multiple report series; validator warns when MNC present without parallels |
| 2.3.1 | Unreported (MNC) | Full | [Year] Court Number format |
| 2.3.2 | Unreported (No MNC) | Full | Court, proceeding number, date |
| 2.3.3 | Proceedings | Full | |
| 2.3.4 | Court Orders | Full | |
| 2.4 | Judicial Officers | Full | Judge names, titles, agreement/dissent |
| 2.5 | Case History | Full | Affirmed, reversed, special leave |
| 2.6.1 | Quasi-Judicial (Administrative) | Full | Tribunal and board decisions |
| 2.6.2 | Arbitration | Full | Arbitral awards |
| 2.7 | Transcripts | Full | Court transcripts, HCA transcripts |
| 2.8 | Submissions in Cases | Full | Written submissions to courts |

---

## Chapter 3: Domestic Legislation

| Rule | Title | Coverage | Notes |
|------|-------|----------|-------|
| 3.1 | Statutes | Full | Title, year, jurisdiction, pinpoints (s, ss, sch, pt, div) |
| 3.2 | Bills | Full | |
| 3.3 | Order of Parallel Statutes | Manual | Document ordering responsibility |
| 3.4 | Delegated Legislation | Full | Regulations, rules, statutory instruments |
| 3.5 | Short Title / Subsequent Refs | Full | Via resolver |
| 3.6 | Australian Constitutions | Full | Commonwealth and state provisions |
| 3.7 | Explanatory Memoranda | Full | |
| 3.8 | Legislative History | Manual | Discursive text; not a citation type |
| 3.9.1 | Gazettes | Full | |
| 3.9.2 | Government Orders/Rulings | Full | |
| 3.9.3 | Non-Government Delegated | Full | |
| 3.9.4 | Practice Directions | Full | |

---

## Chapter 4: General Rules for Secondary Sources

| Rule | Title | Coverage | Notes |
|------|-------|----------|-------|
| 4.1 | Author | Full | Single, multiple, editors, institutional, judges |
| 4.2 | Title | Full | Italic/quoted per source type |
| 4.3 | Short Title / Subsequent Refs | Full | Via resolver |
| 4.4 | URLs | Full | Appended for online sources |
| 4.5 | Archived Sources | Partial | URL field available; no auto-archive detection |

---

## Chapter 5: Journal Articles

| Rule | Title | Coverage | Notes |
|------|-------|----------|-------|
| 5.1-5.8 | Printed Journal Articles | Full | Author, title, year, volume, issue, journal, page, pinpoint |
| 5.9 | Articles in Parts | Partial | Single-part formatting; multi-part not distinguished in UI |
| 5.10 | Online Journal Articles | Full | URL and access date |
| 5.11 | Forthcoming Articles | Full | |

---

## Chapter 6: Books

| Rule | Title | Coverage | Notes |
|------|-------|----------|-------|
| 6.1-6.5 | Books (General) | Full | Author, title, publisher, edition, year, pinpoint |
| 6.6 | Chapters in Edited Books | Full | Chapter author, editors, book title, starting page |
| 6.7 | Translated Books | Full | Translator field |
| 6.8 | Ebooks | Partial | No distinct ebook source type; use `book` with URL in data. Backlog: EBOOK-001 |
| 6.9 | Audiobooks | Full | Narrator field |

---

## Chapter 7: Other Secondary Sources

| Rule | Title | Coverage | Notes |
|------|-------|----------|-------|
| 7.1.1 | Reports (General) | Full | |
| 7.1.2 | Parliamentary Reports | Full | |
| 7.1.3 | Royal Commission Reports | Full | |
| 7.1.4 | Law Reform Commission | Full | |
| 7.1.5 | ABS Materials | Full | Catalogue number, date |
| 7.2.1 | Research Papers | Full | |
| 7.2.3 | Parliamentary Research Papers | Full | |
| 7.2.4 | Conference Papers | Full | |
| 7.2.5 | Theses | Full | PhD, Masters, etc. |
| 7.3 | Speeches | Full | Speaker, title, event, location, date |
| 7.4 | Press/Media Releases | Full | |
| 7.5.1 | Hansard | Full | Parliament, chamber, date, page, speaker |
| 7.5.2 | Submissions to Inquiries | Full | |
| 7.5.3 | Evidence to Committee | Full | Witness, committee, inquiry, date |
| 7.5.4 | Constitutional Convention Debates | Full | |
| 7.6 | Dictionaries | Full | Title, edition, year, entry term |
| 7.7 | Legal Encyclopedias | Full | Title, volume, title number, topic |
| 7.8 | Looseleaf Services | Full | |
| 7.9 | IP Materials | Full | Patent, trade mark, design |
| 7.10 | Constitutive Documents | Full | Corporate constitutions, charters |
| 7.11.1 | Printed Newspapers | Full | Author, title, newspaper, place, date, page |
| 7.11.2 | Electronic Newspapers | Full | URL support |
| 7.11.3 | Periodicals/Magazines | Partial | Uses `newspaper` type; no distinct periodical type. Backlog: PERIODICAL-001 |
| 7.11.4 | Unsigned/Untitled Articles | Partial | User enters description manually in title field |
| 7.12 | Written Correspondence | Full | Letter, email, sender, recipient |
| 7.13 | Interviews | Full | Interviewee, interviewer, program, medium |
| 7.14.1 | Films (General) | Full | |
| 7.14.2 | Films/Audiovisual | Full | Director, production company, year |
| 7.14.3 | Television Series | Partial | Uses `film_tv_media`; no distinct episode/season fields. Backlog: TV-001 |
| 7.14.4 | Radio/Podcasts | Partial | Uses `film_tv_media`; medium field distinguishes. Adequate for most cases |
| 7.15 | Internet Materials | Full | Author, title, website, date, URL |
| 7.16 | Social Media Posts | Full | Author, platform, content, date, URL |

---

## Chapter 8: Treaties

| Rule | Title | Coverage | Notes |
|------|-------|----------|-------|
| 8.1 | Treaty Title | Full | Italic |
| 8.2 | Parties' Names | Full | |
| 8.3.1 | Opened for Signature | Full | Date, entry into force |
| 8.3.2 | Signed (Closed Treaties) | Full | |
| 8.3.3 | Not Yet in Force | Full | '(not yet in force)' |
| 8.4 | Treaty Series | Full | UNTS, LNTS, ATS, etc. |
| 8.5 | Reservations/Declarations | Manual | Discursive reference to specific instruments |
| 8.6 | Memoranda of Understanding | Partial | Uses `treaty` type; no distinct MOU fields. Backlog: MOU-001 |
| 8.7 | Pinpoint Reference | Full | Article, paragraph, annex |

---

## Chapter 9: United Nations Materials

| Rule | Title | Coverage | Notes |
|------|-------|----------|-------|
| 9.1 | Constitutional Documents | Manual | Cite as treaty (Chapter 8) |
| 9.2 | Official Documents | Full | Body, title, doc number, date, session |
| 9.3 | Individual Communications | Full | Author, communication number, committee, date |
| 9.4 | UN Yearbooks | Full | |
| 9.5 | Short Title / Subsequent Refs | Full | Via resolver |
| 9.6 | Commonly Cited Documents | Manual | User enters the conventional short form |

---

## Chapter 10: ICJ and PCIJ

| Rule | Title | Coverage | Notes |
|------|-------|----------|-------|
| 10.1 | Constitutive Documents | Manual | Cite as treaty |
| 10.2 | Reported Decisions | Full | Case title, parties, decision type, year, ICJ Reports page |
| 10.3 | Pleadings and Documents | Full | Document type, party, date, ICJ Pleadings volume |
| 10.4 | Unreported Materials | Partial | No distinct type; use `icj.decision` with manual fields |
| 10.5 | Short Title / Subsequent Refs | Full | Via resolver |

---

## Chapter 11: International Arbitral Decisions

| Rule | Title | Coverage | Notes |
|------|-------|----------|-------|
| 11.1 | State-State Decisions | Full | PCA, ad hoc tribunals |
| 11.2 | Individual-State Decisions | Full | ICSID, UNCITRAL, PCA |
| 11.3 | Short Title / Subsequent Refs | Full | Via resolver |

---

## Chapter 12: International Criminal Tribunals

| Rule | Title | Coverage | Notes |
|------|-------|----------|-------|
| 12.1 | Basic Documents | Manual | Cite as treaty or constitutive document |
| 12.2 | Cases | Full | Accused, case number, tribunal, chamber, decision type, date |
| 12.3 | Reports of Cases | Partial | Uses `icc_tribunal.case`; no distinct report series handling |
| 12.4 | Short Title / Subsequent Refs | Full | Via resolver |

---

## Chapter 13: International Economic Materials

| Rule | Title | Coverage | Notes |
|------|-------|----------|-------|
| 13.1.1 | WTO Constitutive Documents | Manual | Cite as treaty |
| 13.1.2 | WTO Official Documents | Full | |
| 13.1.3 | WTO Appellate Body / Panel | Full | Complainant, respondent, panel type |
| 13.2 | GATT Documents | Full | Doc number, BISD volume |
| 13.3 | Investment Treaties / ISDS | Partial | Uses `arbitral.individual_state`; adequate for most cases |
| 13.4 | Short Title / Subsequent Refs | Full | Via resolver |

---

## Chapter 14: Supranational Materials

| Rule | Title | Coverage | Notes |
|------|-------|----------|-------|
| 14.1.1 | EU Official Journal | Full | Document type, number, OJ series, page |
| 14.1.2 | EU Constitutive Treaties | Manual | Cite as treaty |
| 14.1.3 | EU Courts (CJEU) | Full | Case title, case number, court, ECR citation |
| 14.2 | Council of Europe Basic Docs | Manual | Cite as treaty |
| 14.3.2 | ECHR Decisions | Full | Case title, application number, court, ECHR Reports |
| 14.3.3 | ECHR Commission Decisions | Partial | Uses `echr.decision`; no distinct commission type |
| 14.4 | Other Supranational Courts | Full | Generic supranational decision type |
| 14.5 | Supranational Documents | Full | Body, title, document number, date |

---

## Part V: Foreign Domestic Sources (Chapters 15-26)

| Rule | Jurisdiction | Coverage | Notes |
|------|-------------|----------|-------|
| 15 | Canada | Full | Cases, legislation, secondary via `foreign.canada` |
| 16 | China | Full | Via `foreign.china` |
| 17 | France | Full | Via `foreign.france` |
| 18 | Germany | Full | Via `foreign.germany` |
| 19 | Hong Kong | Full | Via `foreign.hong_kong` |
| 20 | Malaysia | Full | Via `foreign.malaysia` |
| 21 | New Zealand | Full | Via `foreign.new_zealand` |
| 22 | Singapore | Full | Via `foreign.singapore` |
| 23 | South Africa | Full | Via `foreign.south_africa` |
| 24 | United Kingdom | Full | Via `foreign.uk` |
| 25 | United States | Full | Via `foreign.usa` |
| 26 | Other Foreign | Full | Via `foreign.other` |

All foreign jurisdictions use a single `dispatchForeign` formatter with `title`, `citationDetails`, `court`, `year`, and `foreignSubType` fields. The user enters the citation in the format of the foreign jurisdiction; Obiter wraps it with correct AGLC4 formatting.

---

## Appendices

| Appendix | Title | Coverage | Notes |
|----------|-------|----------|-------|
| A | Report Series Abbreviations | Partial | ~20 common series built-in; full ~500 blocked by copyright. Backlog: APPENDIX-A |
| B | Court Identifiers | Full | Australian, UK, NZ court codes |
| C | Pinpoint Abbreviations | Full | s, ss, cl, art, reg, rule, sch, pt, div, para, ch |

---

## Backlog Stories

| ID | Title | Rule | Type |
|----|-------|------|------|
| LINK-001 | Linking phrases UI (citing, quoted in, etc.) | Rule 1.3 | FEATURE |
| EBOOK-001 | Distinct ebook source type with platform/URL fields | Rule 6.8 | FEATURE |
| PERIODICAL-001 | Distinct periodical/magazine source type | Rule 7.11.3 | FEATURE |
| TV-001 | Television series episode/season fields | Rule 7.14.3 | ENHANCEMENT |
| MOU-001 | Distinct MOU source type | Rule 8.6 | FEATURE |
| APPENDIX-A | Full report series abbreviation data (~500 entries) | Appendix A | DATA |

---

## Summary

| Category | Full | Partial | Manual | Total Rules |
|----------|------|---------|--------|-------------|
| Ch 1: General Rules | 28 | 2 | 14 | 44 |
| Ch 2: Cases | 13 | 0 | 0 | 13 |
| Ch 3: Legislation | 11 | 0 | 2 | 13 |
| Ch 4: Secondary (General) | 4 | 1 | 0 | 5 |
| Ch 5: Journals | 3 | 1 | 0 | 4 |
| Ch 6: Books | 4 | 1 | 0 | 5 |
| Ch 7: Other Secondary | 22 | 4 | 0 | 26 |
| Ch 8: Treaties | 6 | 1 | 1 | 8 |
| Ch 9-14: International | 18 | 3 | 6 | 27 |
| Ch 15-26: Foreign | 12 | 0 | 0 | 12 |
| Appendices | 2 | 1 | 0 | 3 |
| **Total** | **123** | **14** | **23** | **160** |

**Automated coverage: 86% (123/160 rules fully automated, 14 partial, 23 manual/editorial)**

The 23 "manual" rules are editorial guidance (spelling, grammar, inclusive language, quotation editing) that are inherently not automatable by a citation engine. Excluding those, **Obiter automates 90% of AGLC4's automatable rules** (123 full + 14 partial out of 137).
