# AGLC4 Chapter-by-Chapter Audit & Implementation

**Created:** 2026-04-19
**Purpose:** Systematic audit of Obiter's implementation against every AGLC4 rule section. Each story reviews the current implementation, tests against AGLC4 prescriptions using the guide's own examples, and implements missing features.

**Status key:** AUDIT = needs review | PASS = matches AGLC4 | FIX = discrepancy found and fixed | IMPL = newly implemented | BLOCKED = needs decision

---

## Chapter 1 — General Rules

| ID | Section | Title | Status | Notes |
|----|---------|-------|--------|-------|
| CH1-001 | 1.1.1 | Footnotes — when to use | PASS | Advisory rule; no formatting logic required |
| CH1-002 | 1.1.2 | Footnote number positioning | PASS | Handled by Word/UI layer |
| CH1-003 | 1.1.3 | Multiple sources in one footnote | PASS | `joinMultipleCitations` uses semicolons; new sentence on signal change |
| CH1-004 | 1.1.4 | Closing punctuation | PASS | `ensureClosingPunctuation` adds `.` if missing; preserves `?`/`!` |
| CH1-005 | 1.1.5 | Discursive footnotes | PASS | Structural rule; `at` references via Rule 1.4.6 |
| CH1-006 | 1.1.6 | Pinpoint references | PASS | No `p`/`para` prefixes; square brackets for paragraphs |
| CH1-007 | 1.1.7 | Spans and multiple pinpoints | PASS | En-dashes in value field. Note: `nn` plural for footnote spans not yet modelled |
| CH1-008 | 1.2 | Introductory signals | FIX | Added missing `See especially`; fixed `See, eg,` (was `See eg`); removed non-AGLC4 `But cf` |
| CH1-009 | 1.3 | Sources referring to other sources | PASS | `formatLinkingPhrase` and `joinLinkedSources` correct |
| CH1-010 | 1.4.1 | Subsequent references — general | PASS | Surname (n X) for secondary; short title (n X) for cases/legislation |
| CH1-011 | 1.4.2 | Subsequent references — same source | PASS | `above`/`below` are advisory text patterns |
| CH1-012 | 1.4.3 | Ibid | PASS | Guards for multi-source footnotes and missing pinpoints correct |
| CH1-013 | 1.4.4 | Short titles | PASS | Cases/legislation italic in `('...')`; secondary non-italic |
| CH1-014 | 1.4.5 | Abbreviations and defined terms | PASS | `formatAbbreviationDefinition` correct |
| CH1-015 | 1.4.6 | Within-footnote subsequent references | PASS | `at` format with pinpoint |
| CH1-016 | 1.5.1 | Quotations — short and long | PASS | Block quote style exists; structural rule |
| CH1-017 | 1.5.2 | Introducing quotations | PASS | Structural/editorial rule |
| CH1-018 | 1.5.3 | Ellipses | PASS | Structural/editorial rule |
| CH1-019 | 1.5.4 | Editing quotations | PASS | Structural/editorial rule |
| CH1-020 | 1.5.5 | Sic | PASS | Structural/editorial rule |
| CH1-021 | 1.5.6 | Quotation closing punctuation | PASS | Structural/editorial rule |
| CH1-022 | 1.5.7 | Omitting citations / emphasis | PASS | Structural/editorial rule |
| CH1-023 | 1.6.1 | Full stops in abbreviations | PASS | `checkAbbreviationFullStops` and `fixAbbreviationFullStops` correct |
| CH1-024 | 1.6.2 | Commas | PASS | Advisory rule |
| CH1-025 | 1.6.3 | Dashes and hyphens | PASS | `checkDashes` and `fixDashes` handle `--`, spaced em-dashes, number spans |
| CH1-026 | 1.6.4 | Parentheses | PASS | Structural rule |
| CH1-027 | 1.6.5 | Square brackets | PASS | Structural rule |
| CH1-028 | 1.7 | Capitalisation | PASS | `toTitleCase` correct. Note: acronym preservation (eg UN, HLA) not handled |
| CH1-029 | 1.8.1 | Italicisation for emphasis | PASS | Advisory/editorial rule |
| CH1-030 | 1.8.2 | Italicisation of titles | PASS | Correct source type mapping; quotes for articles/chapters |
| CH1-031 | 1.8.3 | Italicisation of foreign words | PASS | Advisory/editorial rule |
| CH1-032 | 1.9.1 | Spelling | PASS | Advisory rule (Macquarie Dictionary) |
| CH1-033 | 1.9.2 | Grammar | PASS | Advisory rule |
| CH1-034 | 1.9.3 | Inclusive language | PASS | Advisory rule |
| CH1-035 | 1.10.1 | Numbers | PASS | Words for 1-9, numerals for 10+, no commas |
| CH1-036 | 1.10.2 | Currency | PASS | Advisory rule; no engine formatting needed yet |
| CH1-037 | 1.10.3 | Units | PASS | Advisory rule; no engine formatting needed yet |
| CH1-038 | 1.11.1 | Full date | PASS | Day Month Year, no commas/ordinals/abbreviations |
| CH1-039 | 1.11.2 | Time | PASS | Advisory rule; no engine formatting needed yet |
| CH1-040 | 1.11.3 | Point in time | PASS | En-dashes for year spans, century-aware abbreviation |
| CH1-041 | 1.11.4 | Date and time spans | PASS | Same-month, cross-month, cross-year spans correct |
| CH1-042 | 1.11.5 | Decades and centuries | PASS | Advisory rule; no engine formatting needed yet |
| CH1-043 | 1.12.1 | Title and author formatting | PASS | AGLC4 Title and Author Word styles correct |
| CH1-044 | 1.12.2 | Heading levels | PASS | Roman/letter/arabic/paren numbering correct at all 5 levels |
| CH1-045 | 1.13 | Bibliography | PASS | Sections A-E, alphabetical sort, author inversion correct |

## Chapter 2 — Cases

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH2-001 | 2.1.1 | Case names — general | FIX — added state/territory names to non-individual party indicators; fixed v italicisation |
| CH2-002 | 2.1.2 | Abbreviations in case names | FIX — added (in liq), (in prov liq), (admin apptd), (mgr apptd), (rec apptd) |
| CH2-003 | 2.1.3 | Commonwealth/State/Territory | PASS |
| CH2-004 | 2.1.4 | The Crown | PASS |
| CH2-005 | 2.1.5 | Government entities | PASS |
| CH2-006 | 2.1.6 | Ministers | PASS |
| CH2-007 | 2.1.7 | Attorneys-General and DPP | PASS |
| CH2-008 | 2.1.8 | Re | PASS |
| CH2-009 | 2.1.9 | Ex parte | PASS |
| CH2-010 | 2.1.10 | ex rel | PASS |
| CH2-011 | 2.1.11 | v separator | FIX — v now rendered italic per AGLC4 |
| CH2-012 | 2.1.12 | Admiralty cases | PASS |
| CH2-013 | 2.1.13 | Multiple proceedings | PASS |
| CH2-014 | 2.1.14 | Shortened and popular names | PASS |
| CH2-015 | 2.1.15 | Omitting the case name | PASS |
| CH2-016 | 2.2.1 | Year and volume | PASS |
| CH2-017 | 2.2.2 | Report series | PASS |
| CH2-018 | 2.2.3 | Preference of reports | PASS |
| CH2-019 | 2.2.4 | Starting page | PASS |
| CH2-020 | 2.2.5 | Pinpoints | PASS |
| CH2-021 | 2.2.6 | Identifying the court | PASS |
| CH2-022 | 2.2.7 | Parallel citations | PASS |
| CH2-023 | 2.3.1 | Unreported — MNC | PASS |
| CH2-024 | 2.3.2 | Unreported — no MNC | PASS |
| CH2-025 | 2.3.3 | Proceedings | PASS |
| CH2-026 | 2.3.4 | Court orders | PASS |
| CH2-027 | 2.4.1 | Judicial officers — general | PASS |
| CH2-028 | 2.4.2 | Multiple officers | PASS |
| CH2-029 | 2.4.3 | Agreement/dissent | PASS |
| CH2-030 | 2.4.4 | Joint judgments | PASS |
| CH2-031 | 2.4.5 | During argument | FIX — changed from arguendo to during argument in separate parentheses per Rule 2.4.4 |
| CH2-032 | 2.5 | Case history | PASS |
| CH2-033 | 2.6.1 | Quasi-judicial decisions | PASS |
| CH2-034 | 2.6.2 | Arbitration | PASS |
| CH2-035 | 2.7.1 | Transcripts — general | PASS |
| CH2-036 | 2.7.2 | Transcripts — HCA | PASS |
| CH2-037 | 2.8 | Submissions | PASS |

## Chapter 3 — Legislation

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH3-001 | 3.1.1 | Short title | PASS |
| CH3-002 | 3.1.2 | Year | PASS |
| CH3-003 | 3.1.3 | Jurisdiction | PASS |
| CH3-004 | 3.1.4 | Pinpoints — sections | FIX |
| CH3-005 | 3.1.5 | Pinpoints — other | FIX |
| CH3-006 | 3.1.6 | Definitions | PASS |
| CH3-007 | 3.1.7 | Citing parts | PASS |
| CH3-008 | 3.2 | Bills | FIX |
| CH3-009 | 3.3 | Order of parallel statutes | PASS |
| CH3-010 | 3.4 | Delegated legislation | PASS |
| CH3-011 | 3.5 | Short titles for legislation | PASS |
| CH3-012 | 3.6 | Constitutions | FIX |
| CH3-013 | 3.7 | Explanatory memoranda | PASS |
| CH3-014 | 3.8 | Legislative history | PASS |
| CH3-015 | 3.9.1 | Gazettes | PASS |
| CH3-016 | 3.9.2 | ASIC class orders | PASS |
| CH3-017 | 3.9.3 | Taxation rulings | PASS |
| CH3-018 | 3.9.4 | Practice directions | PASS |

## Chapter 4 — Secondary Sources General

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH4-001 | 4.1.1 | Author names | FIX |
| CH4-002 | 4.1.2 | Multiple authors | PASS |
| CH4-003 | 4.1.3 | Editors | PASS |
| CH4-004 | 4.1.4 | Body authors | PASS |
| CH4-005 | 4.1.5 | Judicial authors | PASS |
| CH4-006 | 4.2 | Titles | FIX |
| CH4-007 | 4.3 | Short titles | PASS |
| CH4-008 | 4.4 | URLs | PASS |
| CH4-009 | 4.5 | Archived sources | PASS |

## Chapter 5 — Journal Articles

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH5-001 | 5.1 | Author | PASS |
| CH5-002 | 5.2 | Title | PASS |
| CH5-003 | 5.3 | Year | PASS |
| CH5-004 | 5.4 | Volume | PASS |
| CH5-005 | 5.5 | Issue | PASS |
| CH5-006 | 5.6 | Journal name | PASS |
| CH5-007 | 5.7 | Starting page | PASS |
| CH5-008 | 5.8 | Articles in parts | PASS |
| CH5-009 | 5.9 | Symposia | PASS |
| CH5-010 | 5.10 | Online journals | PASS |
| CH5-011 | 5.11 | Forthcoming | PASS |

## Chapter 6 — Books

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH6-001 | 6.1 | Author | PASS |
| CH6-002 | 6.2 | Title | PASS |
| CH6-003 | 6.3.1 | Publisher | PASS |
| CH6-004 | 6.3.2 | Edition | PASS |
| CH6-005 | 6.4 | Year | PASS |
| CH6-006 | 6.5 | Multi-volume | PASS |
| CH6-007 | 6.6 | Chapters in edited books | PASS |
| CH6-008 | 6.7 | Translated books | PASS |
| CH6-009 | 6.8 | Forthcoming books | PASS |
| CH6-010 | 6.9 | Audiobooks | PASS |

## Chapter 7 — Other Secondary Sources

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH7-001 | 7.1.1 | Reports — general | PASS |
| CH7-002 | 7.1.2 | Parliamentary reports | PASS |
| CH7-003 | 7.1.3 | Royal Commissions | PASS |
| CH7-004 | 7.1.4 | Law Reform Commissions | PASS |
| CH7-005 | 7.1.5 | ABS materials | PASS |
| CH7-006 | 7.2.1 | Research papers | PASS |
| CH7-007 | 7.2.2 | Working papers | PASS |
| CH7-008 | 7.2.3 | Parliamentary research | PASS |
| CH7-009 | 7.2.4 | Conference papers | PASS |
| CH7-010 | 7.2.5 | Theses | PASS |
| CH7-011 | 7.3 | Speeches | PASS |
| CH7-012 | 7.4 | Press releases | PASS |
| CH7-013 | 7.5.1 | Hansard | PASS |
| CH7-014 | 7.5.2 | Submissions to inquiries | PASS |
| CH7-015 | 7.5.3 | Evidence to committees | PASS |
| CH7-016 | 7.5.4 | Constitutional conventions | PASS |
| CH7-017 | 7.6 | Dictionaries | PASS |
| CH7-018 | 7.7 | Legal encyclopedias | PASS |
| CH7-019 | 7.8 | Looseleaf services | PASS |
| CH7-020 | 7.9 | Intellectual property | PASS |
| CH7-021 | 7.10 | Constitutive documents | PASS |
| CH7-022 | 7.11.1 | Newspapers — printed | PASS |
| CH7-023 | 7.11.2 | Newspapers — electronic | FIX |
| CH7-024 | 7.11.3 | Unsigned/editorial | FIX |
| CH7-025 | 7.11.4 | Periodicals | AUDIT |
| CH7-026 | 7.12 | Written correspondence | PASS |
| CH7-027 | 7.13 | Interviews | PASS |
| CH7-028 | 7.14.1 | Film | PASS |
| CH7-029 | 7.14.2 | Audiovisual | PASS |
| CH7-030 | 7.14.3 | TV/radio | PASS |
| CH7-031 | 7.14.4 | Podcasts | PASS |
| CH7-032 | 7.15 | Internet materials | PASS |
| CH7-033 | 7.16 | Social media | FIX |

## Chapter 8 — Treaties

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH8-001 | 8.1 | Title | PASS |
| CH8-002 | 8.2 | Parties | PASS |
| CH8-003 | 8.3 | Date of signing/opening | PASS |
| CH8-004 | 8.4 | Treaty series | PASS |
| CH8-005 | 8.5 | Reservations/declarations | AUDIT |
| CH8-006 | 8.6 | MoUs | AUDIT |
| CH8-007 | 8.7 | Entry into force | PASS |
| CH8-008 | 8.8 | Pinpoints and short titles | PASS |

## Chapter 9 — UN Materials

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH9-001 | 9.1 | UN Charter | PASS |
| CH9-002 | 9.2 | UN official documents | PASS |
| CH9-003 | 9.3 | UN committee communications | PASS |
| CH9-004 | 9.4 | UN Yearbooks | FIX |
| CH9-005 | 9.5 | Short title and subsequent references | AUDIT |

## Chapter 10 — ICJ and PCIJ

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH10-001 | 10.1 | Constitutive and basic documents | AUDIT |
| CH10-002 | 10.2.1 | Case name | FIX |
| CH10-003 | 10.2.2 | Parties' names or advisory opinion | FIX |
| CH10-004 | 10.2.3 | Phase | FIX |
| CH10-005 | 10.2.4 | Year | PASS |
| CH10-006 | 10.2.5 | Report series and series letter | FIX |
| CH10-007 | 10.2.6 | Starting page and case number | FIX |
| CH10-008 | 10.2.7 | Pinpoint references | FIX |
| CH10-009 | 10.2.8 | Identifying judges | FIX |
| CH10-010 | 10.3 | Reported pleadings | FIX |
| CH10-011 | 10.4 | Unreported materials | AUDIT |
| CH10-012 | 10.5 | Short title and subsequent references | AUDIT |

## Chapter 11 — International Arbitral Decisions

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH11-001 | 11.1.1 | State-state reported decisions | FIX |
| CH11-002 | 11.1.2 | State-state unreported decisions | FIX |
| CH11-003 | 11.2.1 | Individual-state reported decisions | AUDIT |
| CH11-004 | 11.2.2 | Individual-state unreported decisions | PASS |
| CH11-005 | 11.3 | Short title and subsequent references | AUDIT |

## Chapter 12 — International Criminal Tribunals

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH12-001 | 12.1.1 | Constitutive documents | AUDIT |
| CH12-002 | 12.1.2 | Rules | AUDIT |
| CH12-003 | 12.2.1 | Parties' names | PASS |
| CH12-004 | 12.2.2 | Phase | FIX |
| CH12-005 | 12.2.3 | Court | PASS |
| CH12-006 | 12.2.4 | Chamber | PASS |
| CH12-007 | 12.2.5 | Case number | PASS |
| CH12-008 | 12.2.6 | Full date | PASS |
| CH12-009 | 12.2.7 | Pinpoint references | PASS |
| CH12-010 | 12.2.8 | Identifying judges | AUDIT |
| CH12-011 | 12.3 | Reports of cases | AUDIT |
| CH12-012 | 12.4 | Short title and subsequent references | AUDIT |

## Chapter 13 — International Economic Materials

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH13-001 | 13.1.1 | WTO constitutive documents | AUDIT |
| CH13-002 | 13.1.2 | Official WTO documents | PASS |
| CH13-003 | 13.1.3 | WTO panel/AB/arbitrator decisions | FIX |
| CH13-004 | 13.2.1 | Official GATT documents | PASS |
| CH13-005 | 13.2.2 | GATT panel reports | FIX |
| CH13-006 | 13.3 | Investment/trade treaties and investor-state | AUDIT |
| CH13-007 | 13.4 | Short title and subsequent references | AUDIT |

## Chapter 14 — Supranational Materials

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH14-001 | 14.1 | Constitutive documents | PASS |
| CH14-002 | 14.2.1 | EU Official Journal | PASS |
| CH14-003 | 14.2.2 | EU constitutive treaties | PASS |
| CH14-004 | 14.2.3 | Courts of the EU (CJEU) | PASS |
| CH14-005 | 14.3.1 | Council of Europe basic documents | AUDIT |
| CH14-006 | 14.3.2 | European Court of Human Rights | FIX |
| CH14-007 | 14.4 | Other supranational decisions | PASS |
| CH14-008 | 14.5 | Other supranational documents | PASS |
| CH14-009 | 14.6 | Short title and subsequent references | AUDIT |

## Chapter 15 — Canada

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH15-001 | 15.1.1 | Cases — general rule | PASS |
| CH15-002 | 15.1.2 | Official and unofficial report series | PASS |
| CH15-003 | 15.2.1 | Legislation — title | PASS |
| CH15-004 | 15.2.2 | Statute volume and jurisdiction | PASS |
| CH15-005 | 15.2.3 | Year | PASS |
| CH15-006 | 15.2.4 | Chapter | PASS |
| CH15-007 | 15.2.5 | Pinpoint references | PASS |
| CH15-008 | 15.3.1 | Constitution — federal | PASS |
| CH15-009 | 15.3.2 | Constitution — provincial/territorial | PASS |
| CH15-010 | 15.4 | Delegated legislation | AUDIT |
| CH15-011 | 15.5 | Other | AUDIT |

## Chapter 16 — China

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH16-001 | 16.1 | Cases | PASS |
| CH16-002 | 16.2 | Legislative materials | PASS |
| CH16-003 | 16.3 | Chinese language materials | AUDIT |
| CH16-004 | 16.4 | Author names and subsequent references | AUDIT |

## Chapter 17 — France

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH17-001 | 17.1 | Cases | PASS |
| CH17-002 | 17.2.1 | Legislation — individual materials | PASS |
| CH17-003 | 17.2.2 | Codes | PASS |
| CH17-004 | 17.2.3 | Constitution | PASS |

## Chapter 18 — Germany

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH18-001 | 18.1 | Cases | PASS |
| CH18-002 | 18.2.1 | Individual laws | PASS |
| CH18-003 | 18.2.2 | Codes | PASS |
| CH18-004 | 18.2.3 | Constitution (Grundgesetz) | PASS |

## Chapter 19 — Hong Kong

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH19-001 | 19.1 | Cases | PASS |
| CH19-002 | 19.2.1 | Principal and delegated legislation | PASS |
| CH19-003 | 19.2.2 | Constitution (Basic Law) | PASS |

## Chapter 20 — Malaysia

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH20-001 | 20.1 | Cases | PASS |
| CH20-002 | 20.1.1 | Report series | PASS |
| CH20-003 | 20.2.1 | Statutes and delegated legislation | PASS |
| CH20-004 | 20.2.2 | Constitution | PASS |

## Chapter 21 — New Zealand

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH21-001 | 21.1.1 | Cases — general rule | PASS |
| CH21-002 | 21.1.2 | Official and unofficial report series | PASS |
| CH21-003 | 21.1.3 | Unreported cases (medium neutral) | PASS |
| CH21-004 | 21.1.4 | Maori Land Court and Maori Appellate Court | AUDIT |
| CH21-005 | 21.1.5 | Waitangi Tribunal | IMPL |
| CH21-006 | 21.2.1 | Statutes | PASS |
| CH21-007 | 21.2.2 | Delegated legislation | IMPL |
| CH21-008 | 21.3 | Other | AUDIT |

## Chapter 22 — Singapore

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH22-001 | 22.1.1 | Cases — general rule | PASS |
| CH22-002 | 22.1.2 | Report series (SLR, SLR(R)) | PASS |
| CH22-003 | 22.1.3 | Unreported cases | PASS |
| CH22-004 | 22.2.1 | Statutes and subsidiary legislation | PASS |
| CH22-005 | 22.2.2 | Constitutional documents | PASS |

## Chapter 23 — South Africa

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH23-001 | 23.1.1 | Cases — general rule | FIX |
| CH23-002 | 23.1.2 | Report series | PASS |
| CH23-003 | 23.2.1 | Statutes and delegated legislation | FIX |
| CH23-004 | 23.2.2 | Constitution | FIX |
| CH23-005 | 23.3 | Truth and Reconciliation Commission | AUDIT |

## Chapter 24 — United Kingdom

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH24-001 | 24.1.1 | Cases — general rule | PASS |
| CH24-002 | 24.1.2 | Modern English reports | PASS |
| CH24-003 | 24.1.3 | Nominate reports | PASS |
| CH24-004 | 24.1.4 | Scottish reports | PASS |
| CH24-005 | 24.1.5 | Unreported cases (UKSC, EWCA, EWHC) | FIX |
| CH24-006 | 24.1.6 | Identifying judicial officers | AUDIT |
| CH24-007 | 24.2.1 | Legislation — title and year | PASS |
| CH24-008 | 24.2.2 | Jurisdiction | FIX |
| CH24-009 | 24.2.3 | Regnal year and chapter | FIX |
| CH24-010 | 24.2.4 | Pinpoint references | FIX |
| CH24-011 | 24.3 | Delegated legislation (SIs) | PASS |
| CH24-012 | 24.4.1 | Parliamentary debates (Hansard) | PASS |
| CH24-013 | 24.4.2 | Command papers | PASS |
| CH24-014 | 24.4.3 | Parliamentary papers | AUDIT |

## Chapter 25 — United States

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH25-001 | 25.1.1 | Cases — parties' names | PASS |
| CH25-002 | 25.1.2 | Volume | PASS |
| CH25-003 | 25.1.3 | Report series and series number | PASS |
| CH25-004 | 25.1.4 | Starting page and pinpoint references | PASS |
| CH25-005 | 25.1.5 | Jurisdiction and court name | PASS |
| CH25-006 | 25.1.6 | Year | PASS |
| CH25-007 | 25.1.7 | Unreported cases | AUDIT |
| CH25-008 | 25.1.8 | Identifying judges | AUDIT |
| CH25-009 | 25.2 | Legislation — USC codes | PASS |
| CH25-010 | 25.3 | Session laws | PASS |
| CH25-011 | 25.4 | Constitution | FIX |
| CH25-012 | 25.5 | Delegated legislation (CFR) | PASS |
| CH25-013 | 25.6 | Congressional materials | AUDIT |
| CH25-014 | 25.7 | Restatements | PASS |

## Chapter 26 — Other Foreign Materials

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH26-001 | 26.1.1 | Non-English materials translated by author | PASS |
| CH26-002 | 26.1.2 | Published translations | AUDIT |
| CH26-003 | 26.2 | Judicial and administrative decisions | PASS |
| CH26-004 | 26.3 | Legislative materials | PASS |
| CH26-005 | 26.4 | Other non-English language materials | AUDIT |

---

**Total audit items: 271**
