# AGLC4 Feature Coverage

**Obiter v1.14.x (fix/parity-epic)** | Last audited: 2026-07-02
**Rebased 2026-07-02 against aglc4-rule-reference.md + PARITY wave fixes; see docs/parity-reviews/**

Coverage audit of the Australian Guide to Legal Citation, 4th Edition. Each rule is marked as **Full**, **Partial**, or **Manual** (user responsibility, not automatable).

Legend:
- **Full** -- Obiter handles this automatically
- **Partial** -- Some aspects automated, some require manual steps (most commonly: the engine formats the rule but a UI form field is still pending — wave 3). See notes.
- **Manual** -- Editorial guidance or text-level formatting; not a citation engine concern
- **RE-AUDIT** -- Prior claim unverifiable; re-verify against the reference

Open researcher questions are tracked as DECISION-013..029 in `docs/decisions.md`; data rows only verifiable against the missing Appendices A–C stay provisional (DECISION-015, DATA-004).

---

## Chapter 1: General Rules

| Rule | Title | Coverage | Notes |
|------|-------|----------|-------|
| 1.1.1 | When to Footnote | Manual | Editorial decision |
| 1.1.2 | Position of Footnote Numbers | Full | Validator warns on misplacement |
| 1.1.3 | Multiple Sources in a Footnote | Full | Semicolon separator, signal-change sentence break |
| 1.1.4 | Closing Punctuation | Full | Auto full stop; accepts `.` `!` `?` endings |
| 1.1.5 | Discursive Text in Footnotes | Full | `commentaryBefore`/`commentaryAfter` fields + explanatory notes |
| 1.1.6 | Pinpoint References | Full | All pinpoint types: page, paragraph, section, clause, article |
| 1.1.7 | Spans of Pinpoint References | Full | En-dash ranges, comma-separated lists, `nn` plural for footnote spans |
| 1.2 | Introductory Signals | Full | All 7 signals incl `See especially`; lowercase after-colon form unsupported (DECISION-018) |
| 1.3 | Sources Referring to Other Sources | Full | Linking phrases UI (LINK-001): quoting, cited in, affirmed by, etc. with citation picker |
| 1.4.1 | Subsequent References (General) | Full | Author surname + (n X) + pinpoint; disambiguation titles styled per source type |
| 1.4.2 | Cross-References within Text | Full | above n X / below n X with auto-direction |
| 1.4.3 | Ibid | Full | Auto-detection, pinpoint handling, multi-source guard; signals preserved ('See ibid') |
| 1.4.4 | Short Titles | Full | `('…')` introduction no longer suppressed on containment; italics for cases/legislation |
| 1.4.5 | Abbreviations and Defined Terms | Full | ('ABBREVIATION') format in first citation |
| 1.4.6 | Within-Footnote Subsequent References | Full | 'at' only for the immediately preceding source |
| 1.5.1 | Short Quotations | Full | QUOTE-001: Format Quotation button — single quotes (short) or block quote style (4+ lines) |
| 1.5.1 | Long Quotations (Block Quotes) | Full | Block quote style: 10pt, 0.5" indent, no quotes. Available in Styling view and ribbon |
| 1.5.2 | Introducing Quotations | Manual | Punctuation before quotes is editorial |
| 1.5.3 | Ellipses | Full | QUOTE-002: Insert Ellipsis button — spaced `…` (the `. . .` form was inverted; fixed 2026-07-02) |
| 1.5.4 | Editing Quotations | Full | QUOTE-003: Editorial [Brackets] button — wraps selection in square brackets |
| 1.5.5 | [sic] | Full | QUOTE-004: Insert [sic] button; italicisation of 'sic' pending researcher confirmation (DECISION-017) |
| 1.5.6 | Closing Punctuation for Quotations | Manual | Punctuation placement relative to quote marks is editorial |
| 1.5.7 | Omitting Citations / Adding Emphasis | Full | Insert Annotation dropdown uses the rule's closed five-clause table |
| 1.6.1 | Full Stops | Full | Abbreviation handling in citations |
| 1.6.2 | Commas | Full | Serial comma, separator logic |
| 1.6.3 | Dashes and Hyphens | Full | En-dash span fixes scoped to plausible number spans; prose em-dash spacing left alone (DECISION-013) |
| 1.6.4 | Parentheses | Full | Year brackets, jurisdiction brackets |
| 1.6.5 | Square Brackets | Full | MNC year, editorial markers |
| 1.7 | Capitalisation | Full | Full preposition list, subtitle/hyphen capitalisation; fixed vocabulary lists remain editorial |
| 1.8.1 | Italicisation for Emphasis | Full | STYLE-001: Add Emphasis button — italicises selection + appends "(emphasis added)" |
| 1.8.2 | Italicisation of Source Titles | Full | Auto-italicised in citations and inline body text, including inside quotations |
| 1.8.3 | Foreign Words | Full | Rule's italicise/exception lists encoded verbatim; ~40 Macquarie-dependent terms provisional (DECISION-016) |
| 1.9.1 | Spelling | Manual | Editorial (Macquarie Dictionary) |
| 1.9.2 | Grammar | Manual | Editorial |
| 1.9.3 | Inclusive Language | Manual | Editorial |
| 1.10.1 | Numbers | Full | Commas REQUIRED in 4+ digit numbers (rule was previously encoded inverted); year/page/para/ID exceptions |
| 1.10.2 | Currency | Manual | Not citation-specific |
| 1.10.3 | Units | Manual | Not citation-specific |
| 1.11.1 | Full Dates | Full | DMY format in citations |
| 1.11.2 | Time | Full | Hour:minute am/pm |
| 1.11.3 | Point in Time / Period of Time | Full | |
| 1.11.4 | Spans of Dates and Times | Full | En-dash separation; `checkDateSpans` wired into document validation |
| 1.11.5 | Decades and Centuries | Full | Decade lint |
| 1.12.1 | Title and Author | Full | AGLC4 title/author styles via template |
| 1.12.2 | Heading Levels (I-V) | Full | All 5 levels with auto-numbering (text-prefix method) |
| 1.13 | Bibliographies | Full | A/B/C/D/E sections; six-step alphabetical tie-break cascade; author inversion |

---

## Chapter 2: Domestic Cases

| Rule | Title | Coverage | Notes |
|------|-------|----------|-------|
| 2.1.1-2.1.15 | Case Names | Full | Party boundaries (no splitting compound names), italic *v*, rule-table abbreviations; 2.1.15 RE-AUDIT |
| 2.2 | Reported Decisions | Full | Year, volume, report series, starting page, court names spelt out; series tiers per 2.2.2/2.2.3 (provisional rows: DECISION-015) |
| 2.2.7 | Parallel Citations | Full | AGLC mode flags parallel citations for REMOVAL (rule prohibits them for Australian cases); court mode ranks hierarchy unchanged |
| 2.3.1 | Unreported (MNC) | Full | [Year] Court Number; complete identifier table (HCASL, FamCA(FC), NTCCA, TASCCA/TASSC); MNC allocation-year validation |
| 2.3.2 | Unreported (No MNC) | Partial | Mandatory Judge(s) element formats; UI fields pending (wave 3) |
| 2.3.3 | Proceedings | Full | |
| 2.3.4 | Court Orders | Partial | "Order of «Judge» in" + proceeding number format; UI fields pending (wave 3) |
| 2.4 | Judicial Officers | Partial | Full judicial-titles dataset (30 rows, pre-name titles, plurals); extended officer UI fields pending (wave 3) |
| 2.5 | Case History | Full | Affirmed, reversed, special leave |
| 2.6.1 | Quasi-Judicial (Administrative) | Partial | Tribunal and board decisions; pinpoint/separator UI fields pending |
| 2.6.2 | Arbitration | Partial | Arbitral awards; award/forum/case-number UI fields pending |
| 2.7 | Transcripts | Partial | Judge element + pinpoint/speaker pairs format; UI fields pending |
| 2.8 | Submissions in Cases | Full | Written submissions to courts |

---

## Chapter 3: Domestic Legislation

| Rule | Title | Coverage | Notes |
|------|-------|----------|-------|
| 3.1 | Statutes | Partial | Title, year, jurisdiction, full pinpoint table (incl sub-s/sub-para/app/ord); 3.1.6 definition UI fields pending |
| 3.2 | Bills | Full | Roman (non-italic) titles |
| 3.3 | Order of Parallel Statutes | Manual | Document ordering responsibility |
| 3.4 | Delegated Legislation | Full | Regulations, rules, statutory instruments |
| 3.5 | Short Title / Subsequent Refs | Full | Via resolver; introduction no longer suppressed on containment |
| 3.6 | Australian Constitutions | Full | Commonwealth and state provisions; self-government Act titles preserved |
| 3.7 | Explanatory Memoranda | Full | Bill titles roman per rule 3.2 |
| 3.8 | Legislative History | Partial | Rule 3.8 hybrid (DECISION-008 mode (c)) wired end-to-end in the engine; opt-in UI section pending (wave 3) |
| 3.9.1 | Gazettes | Full | Individual-notice form supported |
| 3.9.2 | Government Orders/Rulings | Full | Element order corrected |
| 3.9.3 | Non-Government Delegated | Full | `(at Date)` form supported |
| 3.9.4 | Practice Directions | Full | Dedicated formatter |

---

## Chapter 4: General Rules for Secondary Sources

| Rule | Title | Coverage | Notes |
|------|-------|----------|-------|
| 4.1 | Author | Full | Single, multiple, editors, institutional; judicial titles only as printed on the source |
| 4.2 | Title | Partial | Italic/quoted per source type; embedded italics inside titles unrepresentable (DECISION-021) |
| 4.3 | Short Title / Subsequent Refs | Full | Via resolver; short-title introductions keep source-type italics |
| 4.4 | URLs | Full | Appended for online sources (no access dates — rule prohibits them) |
| 4.5 | Archived Sources | Partial | URL field available; no auto-archive detection |

---

## Chapter 5: Journal Articles

| Rule | Title | Coverage | Notes |
|------|-------|----------|-------|
| 5.1-5.7 | Printed Journal Articles | Full | Author, title, year, volume, issue, journal, page, pinpoint; year-organised `[Year]` form auto when volume empty; journal '&' preserved (DECISION-014) |
| 5.8 | Articles in Parts | Partial | `(Pt N)` formatter wired; partNumber UI field pending |
| 5.9 | Symposia | Manual | Cite as journal article with author 'Symposium' (the previous dedicated format was invented and removed) |
| 5.10 | Online Journal Articles | Partial | Pinpoints/starting page supported, URL optional; pinpoint UI field pending |
| 5.11 | Forthcoming Articles | Partial | Year/volume/issue + `(advance)` supported; UI fields pending |

---

## Chapter 6: Books

| Rule | Title | Coverage | Notes |
|------|-------|----------|-------|
| 6.1-6.5 | Books (General) | Partial | Author, title, publisher (omitted when = author), superscript edition ordinals, `rev ed`, year spans, multi-volume; revised/volume/year-span UI fields pending |
| 6.6 | Chapters in Edited Books | Partial | Chapter author, editors, book title, starting page; author+editor (`, ed X and Y`) UI field pending |
| 6.7 | Translated Books | Full | `tr` after title, outside the parenthetical |
| 6.8 | Forthcoming Books | Partial | `(Publisher, forthcoming)` supported; UI checkbox pending. NB `book.ebook` is a UI convenience type only — AGLC4 has no ebook rule; it renders as an ordinary rule 6.1–6.5 book, appending `<URL>` where provided (DECISION-019; invented `[Platform]` bracket retired) |
| 6.9 | Audiobooks | Full | `(Audiobook, Publisher, Year)`; narrator not emitted (not an AGLC element) |

---

## Chapter 7: Other Secondary Sources

| Rule | Title | Coverage | Notes |
|------|-------|----------|-------|
| 7.1.1 | Reports (General) | Full | |
| 7.1.2 | Parliamentary Reports | Partial | Committee before Legislature; "Legislature" UI relabel pending |
| 7.1.3 | Royal Commission Reports | Partial | Authorless; title IS the commission name; documentType/full-date UI fields pending |
| 7.1.4 | Law Reform Commission | Full | |
| 7.1.5 | ABS Materials | Full | Catalogue number, date |
| 7.2.1 | Research Papers | Partial | Optional number (no `No ,`), date/pinpoint/URL; full-date UI field pending |
| 7.2.3 | Parliamentary Research Papers | Partial | Authors lead + legislature element (ex 33); UI fields pending |
| 7.2.4 | Conference Papers | Full | Document type supported |
| 7.2.5 | Theses | Full | Titles quoted roman (were wrongly italic) |
| 7.3 | Speeches | Partial | Named lectures replace 'Speech' (ex 42); lecture-name UI field pending |
| 7.4 | Press/Media Releases | Partial | Release type/document number/issuing body; UI fields pending |
| 7.5.1 | Hansard | Full | Parliament, chamber, date, page, speaker |
| 7.5.2 | Submissions to Inquiries | Full | Inquiry italic and optional (ex 54) |
| 7.5.3 | Evidence to Committee | Partial | Location element (not jurisdiction); UI relabel pending |
| 7.5.4 | Constitutional Convention Debates | Partial | Italic title + speaker; volume not emitted; Speaker UI field pending |
| 7.6 | Dictionaries | Partial | Publisher not emitted; online `(online at …)` form; homograph markers; UI fields pending |
| 7.7 | Legal Encyclopedias | Partial | Publisher leads; volume before `(at Date)`; online form; UI fields pending |
| 7.8 | Looseleaf Services | Partial | Publisher before italic title; ¶ pinpoints; service-number relabel + Retrieved UI fields pending |
| 7.9 | IP Materials | Partial | Italic identifier through number, filed/lodged + status; form rebuild pending (wave 3) |
| 7.10 | Constitutive Documents | Partial | `*Type*, Company (at Date)`; required at-date UI field pending; ex 79 partial date open (DECISION-020) |
| 7.11.1 | Printed Newspapers | Full | Author, title, newspaper, place, date, page |
| 7.11.2 | Electronic Newspapers | Full | URL support |
| 7.11.3 | Periodicals/Magazines | Full | Date parenthetical before the italic periodical name (ex 89); vol/issue periodicals route to ch 5 |
| 7.11.4 | Unsigned/Editorial Articles | Partial | `Editorial,` lead + unquoted descriptions (ex 92); UI checkboxes pending |
| 7.12 | Written Correspondence | Full | Letter, email, sender, recipient |
| 7.13 | Interviews | Full | Interviewee, interviewer, program, medium |
| 7.14.1 | Films (General) | Partial | No 'Directed by' — production company + version details; UI fields pending |
| 7.14.2 | Films/Audiovisual | Partial | Time pinpoints; UI fields pending |
| 7.14.3 | Television Series | Partial | Season/episode elements; UI fields pending |
| 7.14.4 | Radio/Podcasts | Partial | Dedicated podcast formatter wired; Podcast medium option + Producer UI field pending |
| 7.15 | Internet Materials | Partial | Document Type element; author auto-omitted when = website; Document-type UI select pending |
| 7.16 | Social Media Posts | Partial | Time pinpoint after parenthetical (ex 114); UI field pending |

---

## Chapter 8: Treaties

| Rule | Title | Coverage | Notes |
|------|-------|----------|-------|
| 8.1 | Treaty Title | Full | Italic |
| 8.2 | Parties' Names | Full | |
| 8.3.1 | Opened for Signature | Full | Date, entry into force |
| 8.3.2 | Signed (Closed Treaties) | Full | Same-date `signed` form supported |
| 8.3.3 | Not Yet in Force | Full | '(not yet in force)' |
| 8.4 | Treaty Series | Partial | UNTS, LNTS, ATS, etc.; residual low gap noted in parity review (RE-AUDIT) |
| 8.5 | Reservations/Declarations | Manual | Discursive reference to specific instruments |
| 8.6 | Memoranda of Understanding | Full | Party joining/en-dash/pinpoints corrected |
| 8.7 | Pinpoint Reference | Full | Article, paragraph, annex |
| 8.8 | Short Titles / Subsequent Refs | RE-AUDIT | Resolver-routed; not yet examined by the parity review |

---

## Chapter 9: United Nations Materials

| Rule | Title | Coverage | Notes |
|------|-------|----------|-------|
| 9.1 | Constitutional Documents | Partial | Charter formats (article optional); dedicated `un.charter` SourceType pending (wave 3) |
| 9.2 | Official Documents | Full | Resolution numbers and 'UN GAOR' roman (were wrongly italic); pinpoint comma-after-date; 9.2.14 residual low gap |
| 9.3 | Individual Communications | Partial | Session element + submission variant; UI fields pending |
| 9.4 | UN Yearbooks | Full | |
| 9.5 | Short Title / Subsequent Refs | RE-AUDIT | Resolver-routed; not yet examined |
| 9.6 | Commonly Cited Documents | Manual | User enters the conventional short form |

---

## Chapter 10: ICJ and PCIJ

| Rule | Title | Coverage | Notes |
|------|-------|----------|-------|
| 10.1 | Constitutive Documents | Manual | Cite as treaty |
| 10.2 | Reported Decisions | Full | Case title, parties, decision type, year; default series 'ICJ Rep' |
| 10.3 | Pleadings and Documents | Partial | Document type, party, date, ICJ Pleadings volume; residual low gap (RE-AUDIT) |
| 10.4 | Unreported Materials | Partial | General List No form supported; UI field pending |
| 10.5 | Short Title / Subsequent Refs | RE-AUDIT | Resolver-routed; not yet examined |

---

## Chapter 11: International Arbitral Decisions

| Rule | Title | Coverage | Notes |
|------|-------|----------|-------|
| 11.1 | State-State Decisions | Full | PCA, ad hoc tribunals |
| 11.2 | Individual-State Decisions | Partial | Correct `formatStateArbitration` wired (ICSID mislabel gone); reported-branch UI fields pending |
| 11.3 | Short Title / Subsequent Refs | RE-AUDIT | Resolver-routed; not yet examined |

---

## Chapter 12: International Criminal Tribunals

| Rule | Title | Coverage | Notes |
|------|-------|----------|-------|
| 12.1 | Basic Documents | Manual | Cite as treaty or constitutive document; 12.1.2 (rules) residual gap (RE-AUDIT) |
| 12.2 | Cases | Full | Accused, case number, tribunal, chamber, decision type, date, judges |
| 12.3 | Reports of Cases | Partial | Report-series form added; UI fields pending |
| 12.4 | Short Title / Subsequent Refs | RE-AUDIT | Resolver-routed; not yet examined |

---

## Chapter 13: International Economic Materials

| Rule | Title | Coverage | Notes |
|------|-------|----------|-------|
| 13.1.1 | WTO Constitutive Documents | Manual | Cite as treaty |
| 13.1.2 | WTO Official Documents | Full | Document description + pinpoints |
| 13.1.3 | WTO Appellate Body / Panel | Partial | DSR reference supported; UI field pending |
| 13.2 | GATT Documents | Partial | BISD reference on documents and panel reports; UI fields pending |
| 13.3 | Investment Treaties / ISDS | Partial | Uses `arbitral.individual_state`; adequate for most cases |
| 13.4 | Short Title / Subsequent Refs | RE-AUDIT | Resolver-routed; not yet examined |

---

## Chapter 14: Supranational Materials

| Rule | Title | Coverage | Notes |
|------|-------|----------|-------|
| 14.1 | Constitutive Documents | Full | |
| 14.2.1 | EU Official Journal | Full | Bogus instrument-type prefix removed; pinpoints supported |
| 14.2.2 | EU Constitutive Treaties | Manual | Cite as treaty |
| 14.2.3 | EU Courts (CJEU) | Partial | Unreported form; case prefixes C-/T-/F- only; ECLI UI field pending |
| 14.3.1 | Council of Europe Basic Docs | Manual | Cite as treaty |
| 14.3.2 | ECHR Decisions | Partial | Reported ECtHR formatter wired (bogus unreported hybrid gone); reported-series UI fields pending |
| 14.3.3 | ECHR Commission Decisions | Full | Year brackets corrected |
| 14.4 | Other Supranational Courts | Partial | Generic supranational decision type; 14.4.3/14.4.4 residual gaps (RE-AUDIT) |
| 14.5 | Supranational Documents | Partial | Date/session/pinpoint; session UI field pending |
| 14.6 | Short Title / Subsequent Refs | RE-AUDIT | Resolver-routed; not yet examined |

---

## Part V: Foreign Domestic Sources (Chapters 15-26)

Per-country dispatch is live (PARITY-114 wave 2, mop-up wave 3): `dispatchForeign` routes `foreignSubType` case/legislation/secondary data to the `rules/v4/foreign/*` modules — including the specialised formatters (court decisions, constitutions, regulations, Fed Reg, TRC reports, Māori Land Court, regnal years, judicial officers) registered in the wave-3 mop-up — with a generic fallback (italic case/legislation titles, space-joined pinpoints) for unstructured `citationDetails`. The module fixes (PARITY-115/116) are covered by exact-string tests in `tests/engine/chapter15-26.test.ts` (green). "Partial" below means the engine path is wired but structured UI fields are still pending (the forms fall back to `citationDetails` parsing — see PARITY-121 leftovers) or acknowledged rule gaps remain.

| Rule | Jurisdiction | Coverage | Notes |
|------|-------------|----------|-------|
| 15 | Canada | Partial | Cases (round/square years, no brackets on neutral citations), legislation (supplements); `formatRegulation`/`formatFederalConstitution` dispatched (wave 3); structured UI fields pending |
| 16 | China | Partial | 16.1/16.2.1 wired (guillemets, roman, `[year]`); unreported judgments + constitutions dispatched (wave 3); 16.4 secondary sources remain a gap |
| 17 | France | Partial | 17.2.x wired; rule-17.1 `formatCourtDecision` dispatched (wave 3); structured UI fields pending |
| 18 | Germany | Partial | 18.2.x wired; rule-18.1 `formatCourtDecision` dispatched (wave 3); structured UI fields pending |
| 19 | Hong Kong | Full | `(Hong Kong)` default, `cap` numbers, corrected series-implies-court set |
| 20 | Malaysia | Full | Pre-1966 MLJ square brackets per the guide's examples (DECISION-028) |
| 21 | New Zealand | Partial | Rule 21.1.3 adoption years corrected; `formatMaoriLandCourt` dispatched (wave 3); structured UI fields pending |
| 22 | Singapore | Full | Lowercase `cap`/`rev ed`, reprint parenthetical, constitutions get `(Singapore)` |
| 23 | South Africa | Partial | Division codes banned, title-year legislation; `formatTRCReport` dispatched (wave 3); structured UI fields pending |
| 24 | United Kingdom | Partial | Scottish bare year, ER/RR parallels, LR volume placement, SI/SR/SR & O; judicial-titles + regnal-year formatters wired (wave 3); structured UI fields pending |
| 25 | United States | Partial | Session laws, state constitutions, Congressional Record, Restatements fixed; unreported/Fed Reg formatters dispatched (wave 3); 25.1.8/25.5.2/25.6.2 residual gaps |
| 26 | Other Foreign | Partial | 26.1.1 `[tr …]` placement + 26.2 year bug fixed; `formatOtherDecision` dispatched (wave 3); 26.1.2/26.4 residual gaps |

---

## Appendices

| Appendix | Title | Coverage | Notes |
|----------|-------|----------|-------|
| A | Report Series Abbreviations | Partial | 150+ entries; tiers per the in-chapter 2.2.2/2.2.3 tables; appendix-dependent rows provisional pending DATA-004 (DECISION-015, 023, 025, 026) |
| B | Court Identifiers | Full | Complete rule 2.3.1 table incl HCASL/FamCA(FC)/NTCCA/TASCCA + `mncFrom` years; UK/NZ identifiers per 24.1.5/21.1.3 |
| C | Pinpoint Abbreviations | Full | Full rule 3.1.4 table incl sub-s, sub-para, sub-div, sub-cl, app, ord ('ords' plural provisional — DECISION-024) |

---

## Summary

| Category | Full | Partial | Manual | RE-AUDIT | Total rows |
|----------|------|---------|--------|----------|------------|
| Ch 1: General Rules | 38 | 0 | 8 | 0 | 46 |
| Ch 2: Cases | 7 | 6 | 0 | 0 | 13 |
| Ch 3: Legislation | 9 | 2 | 1 | 0 | 12 |
| Ch 4: Secondary (General) | 3 | 2 | 0 | 0 | 5 |
| Ch 5: Journals | 1 | 3 | 1 | 0 | 5 |
| Ch 6: Books | 2 | 3 | 0 | 0 | 5 |
| Ch 7: Other Secondary | 12 | 20 | 0 | 0 | 32 |
| Ch 8: Treaties | 7 | 1 | 1 | 1 | 10 |
| Ch 9-14: International | 9 | 13 | 6 | 6 | 34 |
| Ch 15-26: Foreign | 3 | 9 | 0 | 0 | 12 |
| Appendices | 2 | 1 | 0 | 0 | 3 |
| **Total** | **93** | **60** | **17** | **7** | **177** |

Of the 160 automatable rows (177 − 17 manual), **93 are Full end-to-end**; of the 60 Partial rows, the large majority are **engine-complete** — the format is implemented and tested against the guide's own examples, and only a UI form field is pending (foreign-formatter dispatch registration completed in the wave-3 mop-up). Seven RE-AUDIT rows have never been verified against the reference. The previous "96% Full" claim (June 2026) predated the parity reviews and was overstated — dozens of "Full" rows covered dead code paths or inverted rules; see `docs/parity-reviews/`.
