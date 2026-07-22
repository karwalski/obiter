# AGLC4 Chapter-by-Chapter Audit & Implementation

**Created:** 2026-04-19
**Rebased 2026-07-02 against aglc4-rule-reference.md + PARITY wave fixes; see docs/parity-reviews/**
**Purpose:** Systematic audit of Obiter's implementation against every AGLC4 rule section. Each story reviews the current implementation, tests against AGLC4 prescriptions using the guide's own examples, and implements missing features.

**Status key:** AUDIT = needs review | PASS = matches AGLC4 | FIX = discrepancy found and fixed | IMPL = newly implemented | BLOCKED = needs decision | RE-AUDIT = prior status unverifiable or a known residual gap; re-verify against the reference

**Rebase note:** the April 2026 statuses below were contradicted on dozens of rows by the 2026-07-02 parity reviews (`docs/parity-reviews/review-*.md`). Rows changed in the rebase carry a `(PARITY)` note; the per-finding evidence and fix locations live in the review docs' Status lines. Data rows only verifiable against Appendices A–C stay provisional (DECISION-015, DATA-004).

---

## Chapter 1 — General Rules

| ID | Section | Title | Status | Notes |
|----|---------|-------|--------|-------|
| CH1-001 | 1.1.1 | Footnotes — when to use | PASS | Advisory rule; no formatting logic required |
| CH1-002 | 1.1.2 | Footnote number positioning | PASS | Handled by Word/UI layer |
| CH1-003 | 1.1.3 | Multiple sources in one footnote | PASS | `joinMultipleCitations` uses semicolons; new sentence on signal change |
| CH1-004 | 1.1.4 | Closing punctuation | FIX | (PARITY) validator now accepts `?`/`!` footnote endings |
| CH1-005 | 1.1.5 | Discursive footnotes | PASS | Structural rule; `at` references via Rule 1.4.6 |
| CH1-006 | 1.1.6 | Pinpoint references | PASS | No `p`/`para` prefixes; square brackets for paragraphs |
| CH1-007 | 1.1.7 | Spans and multiple pinpoints | FIX | (PARITY) `nn` plural for footnote spans now emitted; `formatNumberSpan` helper added |
| CH1-008 | 1.2 | Introductory signals | FIX | Signal set complete (7 incl `See especially`); lowercase-after-colon form unsupported (DECISION-018) |
| CH1-009 | 1.3 | Sources referring to other sources | PASS | `formatLinkingPhrase` and `joinLinkedSources` correct |
| CH1-010 | 1.4.1 | Subsequent references — general | FIX | (PARITY) disambiguation/short-title styling per source type (exs 55/61/62); full-name disambiguation for shared surnames still open (low) |
| CH1-011 | 1.4.2 | Subsequent references — same source | PASS | `above`/`below` are advisory text patterns |
| CH1-012 | 1.4.3 | Ibid | FIX | (PARITY wave 2) signals no longer dropped on ibid/short refs; 'See ibid' lowercased per ex 69 |
| CH1-013 | 1.4.4 | Short titles | FIX | (PARITY wave 2) substring-suppression of the `('…')` introduction removed; only strict equality suppresses |
| CH1-014 | 1.4.5 | Abbreviations and defined terms | PASS | `formatAbbreviationDefinition` correct |
| CH1-015 | 1.4.6 | Within-footnote subsequent references | FIX | (PARITY) `at` restricted to the immediately preceding source; identical-pinpoint `at` retained (permissive rule wording) |
| CH1-016 | 1.5.1 | Quotations — short and long | FIX | (PARITY) threshold/JSDoc corrected to four+ lines |
| CH1-017 | 1.5.2 | Introducing quotations | PASS | Structural/editorial rule |
| CH1-018 | 1.5.3 | Ellipses | FIX | (PARITY) form was inverted — canonical is spaced `…`; `. . .`/`...` now flagged |
| CH1-019 | 1.5.4 | Editing quotations | PASS | Structural/editorial rule |
| CH1-020 | 1.5.5 | Sic | BLOCKED | Italicisation of 'sic' undecided — guide silent (DECISION-017) |
| CH1-021 | 1.5.6 | Quotation closing punctuation | PASS | Structural/editorial rule |
| CH1-022 | 1.5.7 | Omitting citations / emphasis | FIX | (PARITY) dropdown/validator use the rule's closed five-clause table |
| CH1-023 | 1.6.1 | Full stops in abbreviations | PASS | `checkAbbreviationFullStops` and `fixAbbreviationFullStops` correct |
| CH1-024 | 1.6.2 | Commas | PASS | Advisory rule |
| CH1-025 | 1.6.3 | Dashes and hyphens | FIX | (PARITY) hyphen→en-dash fix scoped by `isPlausibleNumberSpan`; prose em-dash ban removed (DECISION-013) |
| CH1-026 | 1.6.4 | Parentheses | PASS | Structural rule |
| CH1-027 | 1.6.5 | Square brackets | PASS | Structural rule |
| CH1-028 | 1.7 | Capitalisation | FIX | (PARITY) full preposition list, last-word rule removed, hyphen/subtitle capitalisation added; fixed vocab lists remain manual |
| CH1-029 | 1.8.1 | Italicisation for emphasis | PASS | Advisory/editorial rule |
| CH1-030 | 1.8.2 | Italicisation of titles | FIX | (PARITY) titles italicised inside quotations too (quote-skip limited to Latin-terms pass) |
| CH1-031 | 1.8.3 | Italicisation of foreign words | FIX | (PARITY) both rule lists encoded verbatim; ~40 Macquarie-dependent terms provisional (DECISION-016) |
| CH1-032 | 1.9.1 | Spelling | PASS | Advisory rule (Macquarie Dictionary) |
| CH1-033 | 1.9.2 | Grammar | PASS | Advisory rule |
| CH1-034 | 1.9.3 | Inclusive language | PASS | Advisory rule |
| CH1-035 | 1.10.1 | Numbers | FIX | (PARITY) comma rule was inverted — 4+ digit numbers require commas, with year/page/para/ID exceptions |
| CH1-036 | 1.10.2 | Currency | PASS | Advisory rule; no engine formatting needed yet |
| CH1-037 | 1.10.3 | Units | PASS | Advisory rule; no engine formatting needed yet |
| CH1-038 | 1.11.1 | Full date | PASS | Day Month Year, no commas/ordinals/abbreviations |
| CH1-039 | 1.11.2 | Time | PASS | Advisory rule; no engine formatting needed yet |
| CH1-040 | 1.11.3 | Point in time | FIX | (PARITY) rule labels renumbered; h:mm:ss formatting remains manual |
| CH1-041 | 1.11.4 | Date and time spans | FIX | (PARITY) `checkDateSpans` wired into `validateDocument` |
| CH1-042 | 1.11.5 | Decades and centuries | PASS | Decade lint added; otherwise advisory |
| CH1-043 | 1.12.1 | Title and author formatting | PASS | AGLC4 Title and Author Word styles correct |
| CH1-044 | 1.12.2 | Heading levels | PASS | Roman/letter/arabic/paren numbering correct at all 5 levels |
| CH1-045 | 1.13 | Bibliography | FIX | (PARITY) six-step alphabetical tie-break cascade implemented (`compareBibliographyOrder`) |

## Chapter 2 — Cases

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH2-001 | 2.1.1 | Case names — general | FIX — (PARITY) single party names no longer split on " and "/"&"; multi-party vs compound-name distinction |
| CH2-002 | 2.1.2 | Abbreviations in case names | FIX — (PARITY) abbreviation set exactly per the rule's table; invented forms removed |
| CH2-003 | 2.1.3 | Commonwealth/State/Territory | PASS |
| CH2-004 | 2.1.4 | The Crown | FIX — (PARITY) low-severity correction |
| CH2-005 | 2.1.5 | Government entities | PASS |
| CH2-006 | 2.1.6 | Ministers | FIX — (PARITY) low-severity correction |
| CH2-007 | 2.1.7 | Attorneys-General and DPP | PASS |
| CH2-008 | 2.1.8 | Re | PASS |
| CH2-009 | 2.1.9 | Ex parte | PASS |
| CH2-010 | 2.1.10 | ex rel | PASS |
| CH2-011 | 2.1.11 | v separator | FIX — (PARITY) the April "v italic" claim was false; *v* is now actually italic and tests assert it |
| CH2-012 | 2.1.12 | Admiralty cases | FIX — (PARITY) JSDoc corrected |
| CH2-013 | 2.1.13 | Multiple proceedings | PASS |
| CH2-014 | 2.1.14 | Shortened and popular names | FIX — (PARITY wave 2) short-title introduction suppression removed |
| CH2-015 | 2.1.15 | Omitting the case name | PASS — (RE-AUDIT closure) `formatCaseWithoutName` matches exs 47/49 (chapter2 tests); the rule's exception verified — resolver always retains the (short) case name in subsequent refs (ex 51, re-audit test) |
| CH2-016 | 2.2.1 | Year and volume | PASS |
| CH2-017 | 2.2.2 | Report series | FIX — (PARITY) preference tiers corrected (FLR generalist, IR subject, identifiers ranked with MNC, `mediumNeutral` flag); appendix-dependent rows provisional (DECISION-015) |
| CH2-018 | 2.2.3 | Preference of reports | FIX — (PARITY) "QR" fabrication removed → "Qd R"; ACTR tier interim per 2.2.2 table (DECISION-015) |
| CH2-019 | 2.2.4 | Starting page | FIX — (PARITY) non-numeric starting pages supported |
| CH2-020 | 2.2.5 | Pinpoints | PASS |
| CH2-021 | 2.2.6 | Identifying the court | FIX — (PARITY) court names spelt out with jurisdiction-suppression; element order vs judges fixed |
| CH2-022 | 2.2.7 | Parallel citations | FIX — (PARITY) validator was inverted; AGLC mode now flags parallels for removal, court mode unchanged |
| CH2-023 | 2.3.1 | Unreported — MNC | FIX — (PARITY) HCASL/FamCA/FamCAFC/NTCCA/TASCCA added; bogus TASCSC→TASSC; MNC allocation-year validation (`mncFrom`) |
| CH2-024 | 2.3.2 | Unreported — no MNC | FIX — (PARITY) mandatory Judge(s) element restored (UI fields wave 3) |
| CH2-025 | 2.3.3 | Proceedings | PASS |
| CH2-026 | 2.3.4 | Court orders | FIX — (PARITY) "Order of «Judge» in" + proceeding number (UI fields wave 3) |
| CH2-027 | 2.4.1 | Judicial officers — general | FIX — (PARITY) new judicial-titles dataset (all 30 table rows); pre-name titles ("Commissioner Buss") supported |
| CH2-028 | 2.4.2 | Multiple officers | FIX — (PARITY) April PASS was stale; corrected with guide-example tests |
| CH2-029 | 2.4.3 | Agreement/dissent | FIX — (PARITY) April PASS was stale; corrected (UI fields wave 3) |
| CH2-030 | 2.4.4 | Joint judgments | FIX — (PARITY) AGLC joining form replaces "; " |
| CH2-031 | 2.4.5 | During argument | FIX — (PARITY) plural map completed (AJ→AJJ, SJ→SJJ) |
| CH2-032 | 2.5 | Case history | PASS |
| CH2-033 | 2.6.1 | Quasi-judicial decisions | FIX — (PARITY) low-severity correction |
| CH2-034 | 2.6.2 | Arbitration | FIX — (PARITY) wired wave 2; UI fields wave 3 |
| CH2-035 | 2.7.1 | Transcripts — general | FIX — (PARITY) judge element added; wired wave 2 |
| CH2-036 | 2.7.2 | Transcripts — HCA | PASS |
| CH2-037 | 2.8 | Submissions | PASS |

## Chapter 3 — Legislation

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH3-001 | 3.1.1 | Short title | PASS |
| CH3-002 | 3.1.2 | Year | PASS |
| CH3-003 | 3.1.3 | Jurisdiction | PASS |
| CH3-004 | 3.1.4 | Pinpoints — sections | FIX — (PARITY) full table incl sub-s/sub-para/sub-div/sub-cl/app/ord ('ords' plural provisional, DECISION-024) |
| CH3-005 | 3.1.5 | Pinpoints — other | FIX |
| CH3-006 | 3.1.6 | Definitions | FIX — (PARITY) definition formatter wired (dispatch wave 2; UI inputs wave 3) |
| CH3-007 | 3.1.7 | Citing parts | PASS |
| CH3-008 | 3.2 | Bills | FIX |
| CH3-009 | 3.3 | Order of parallel statutes | PASS |
| CH3-010 | 3.4 | Delegated legislation | PASS |
| CH3-011 | 3.5 | Short titles for legislation | FIX — (PARITY wave 2) substring suppression removed; bill short titles roman |
| CH3-012 | 3.6 | Constitutions | FIX — (PARITY wave 2) constitution dispatch no longer discards self-government Act titles |
| CH3-013 | 3.7 | Explanatory memoranda | FIX — (PARITY) EM bill titles roman per rule 3.2 |
| CH3-014 | 3.8 | Legislative history | FIX — (PARITY wave 2) `formatLegislativeHistory` wired end-to-end (DECISION-008 mode (c)); UI opt-in section wave 3 |
| CH3-015 | 3.9.1 | Gazettes | FIX — (PARITY) individual-notice form added and dispatched |
| CH3-016 | 3.9.2 | ASIC class orders | FIX — (PARITY) element order corrected; numbered-form validator hint optional (wave 3) |
| CH3-017 | 3.9.3 | Taxation rulings | FIX — (PARITY) `(at Date)` quasi-legislative form added |
| CH3-018 | 3.9.4 | Practice directions | FIX — (PARITY) `formatPracticeDirection` built and routed |

## Chapter 4 — Secondary Sources General

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH4-001 | 4.1.1 | Author names | FIX — (PARITY) title-stripping completed (Associate Professor/Ms/Mr; multi-layer) |
| CH4-002 | 4.1.2 | Multiple authors | PASS |
| CH4-003 | 4.1.3 | Editors | PASS |
| CH4-004 | 4.1.4 | Body authors | FIX — (PARITY) gap closed |
| CH4-005 | 4.1.5 | Judicial authors | FIX — (PARITY) title included only as printed on the source; UI copy wave 3 |
| CH4-006 | 4.2 | Titles | FIX — embedded italics inside titles remain unrepresentable (DECISION-021) |
| CH4-007 | 4.3 | Short titles | FIX — (PARITY) short-title introductions keep source-type italics (`formatSecondaryShortTitle`) |
| CH4-008 | 4.4 | URLs | PASS |
| CH4-009 | 4.5 | Archived sources | PASS |

## Chapter 5 — Journal Articles

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH5-001 | 5.1 | Author | PASS |
| CH5-002 | 5.2 | Title | PASS |
| CH5-003 | 5.3 | Year | FIX — (PARITY) year-organised journals (`[1995]`) producible; string year spans pass through (dispatch wave 2) |
| CH5-004 | 5.4 | Volume | FIX — (PARITY) volume/issue corrections |
| CH5-005 | 5.5 | Issue | FIX — (PARITY) journal-title '&' preserved per rule text (DECISION-014); non-numeric issue spacing |
| CH5-006 | 5.6 | Journal name | PASS |
| CH5-007 | 5.7 | Starting page | PASS |
| CH5-008 | 5.8 | Articles in parts | FIX — (PARITY) `(Pt N)` formatter reachable (dispatch wave 2; UI field wave 3) |
| CH5-009 | 5.9 | Symposia | FIX — (PARITY) invented symposium formatter deleted; cite as journal.article with author 'Symposium' |
| CH5-010 | 5.10 | Online journals | FIX — (PARITY) pinpoints/startingPage supported; URL no longer wrongly mandatory |
| CH5-011 | 5.11 | Forthcoming | FIX — (PARITY) year/volume/issue kept; `(advance)` supported (UI fields wave 3) |

## Chapter 6 — Books

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH6-001 | 6.1 | Author | PASS |
| CH6-002 | 6.2 | Title | PASS |
| CH6-003 | 6.3.1 | Publisher | FIX — (PARITY) publisher omitted when empty/equal to author; no more `(, 2005)` |
| CH6-004 | 6.3.2 | Edition | FIX — (PARITY) ordinal superscript runs; bare `rev ed` (6.3.3) supported |
| CH6-005 | 6.4 | Year | FIX — (PARITY) text year spans (`1984–88`, `1975–`) supported |
| CH6-006 | 6.5 | Multi-volume | FIX — (PARITY) `formatMultiVolumeBook` wired (was dead code); vol/bk label (UI wave 3) |
| CH6-007 | 6.6 | Chapters in edited books | FIX — (PARITY) author+editor books (`, ed X and Y`, 6.6.2) supported |
| CH6-008 | 6.7 | Translated books | FIX — (PARITY) `tr` placement after title, outside parenthetical |
| CH6-009 | 6.8 | Forthcoming books | FIX — (PARITY) forthcoming reachable; `book.ebook` `[Platform]` is a non-AGLC extension (DECISION-019) |
| CH6-010 | 6.9 | Audiobooks | FIX — (PARITY) `(Audiobook, Publisher, Year)`; narrator ignored (not an AGLC element) |

## Chapter 7 — Other Secondary Sources

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH7-001 | 7.1.1 | Reports — general | PASS |
| CH7-002 | 7.1.2 | Parliamentary reports | FIX — (PARITY) Committee before Legislature; wired wave 2 (UI relabel wave 3) |
| CH7-003 | 7.1.3 | Royal Commissions | FIX — (PARITY) authorless; title IS the commission name; documentType + full date |
| CH7-004 | 7.1.4 | Law Reform Commissions | PASS |
| CH7-005 | 7.1.5 | ABS materials | PASS |
| CH7-006 | 7.2.1 | Research papers | FIX — (PARITY) number optional (no `No ,`); date/pinpoint/url |
| CH7-007 | 7.2.2 | Working papers | FIX — (PARITY) as 7.2.1 |
| CH7-008 | 7.2.3 | Parliamentary research | FIX — (PARITY) authors lead; legislature element (ex 33 producible) |
| CH7-009 | 7.2.4 | Conference papers | FIX — (PARITY) documentType |
| CH7-010 | 7.2.5 | Theses | FIX — (PARITY) titles quoted roman (were italic) |
| CH7-011 | 7.3 | Speeches | FIX — (PARITY) named lectures replace 'Speech' (ex 42) |
| CH7-012 | 7.4 | Press releases | FIX — (PARITY) releaseType/documentNumber/issuingBody |
| CH7-013 | 7.5.1 | Hansard | PASS |
| CH7-014 | 7.5.2 | Submissions to inquiries | FIX — (PARITY) inquiry italic + optional (ex 54) |
| CH7-015 | 7.5.3 | Evidence to committees | FIX — (PARITY) location element (was mislabelled jurisdiction) |
| CH7-016 | 7.5.4 | Constitutional conventions | FIX — (PARITY) title italic; speaker; volume no longer emitted |
| CH7-017 | 7.6 | Dictionaries | FIX — (PARITY) publisher not emitted; online form; homograph entry markers |
| CH7-018 | 7.7 | Legal encyclopedias | FIX — (PARITY) publisher leads; volume before `(at Date)`; online form |
| CH7-019 | 7.8 | Looseleaf services | FIX — (PARITY) publisher before italic title; ¶ pinpoints pass through |
| CH7-020 | 7.9 | Intellectual property | FIX — (PARITY) italic identifier through number; filed/lodged + status (UI rebuild wave 3) |
| CH7-021 | 7.10 | Constitutive documents | FIX — (PARITY) `*Type*, Company (at Date)`; ex 79 partial date open (DECISION-020) |
| CH7-022 | 7.11.1 | Newspapers — printed | PASS |
| CH7-023 | 7.11.2 | Newspapers — electronic | FIX |
| CH7-024 | 7.11.3 | Periodicals | FIX — (PARITY) date parenthetical before italic periodical name (ex 89); vol/issue periodicals route to ch 5 (label was swapped with 7.11.4 in the April audit) |
| CH7-025 | 7.11.4 | Unsigned/editorial | FIX — (PARITY) `Editorial,` lead wired; unquoted title descriptions (ex 92) |
| CH7-026 | 7.12 | Written correspondence | PASS |
| CH7-027 | 7.13 | Interviews | FIX — (PARITY) interviewType supported |
| CH7-028 | 7.14.1 | Film | FIX — (PARITY) no 'Directed by'; production company + version details |
| CH7-029 | 7.14.2 | Audiovisual | FIX — (PARITY) time pinpoints |
| CH7-030 | 7.14.3 | TV/radio | FIX — (PARITY) season/episode; dangling `, )` bug gone |
| CH7-031 | 7.14.4 | Podcasts | FIX — (PARITY) `formatPodcast` wired (was dead code) |
| CH7-032 | 7.15 | Internet materials | FIX — (PARITY) Document Type element; author auto-omitted when = website |
| CH7-033 | 7.16 | Social media | FIX — (PARITY) time pinpoint after parenthetical (ex 114) |

## Chapter 8 — Treaties

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH8-001 | 8.1 | Title | PASS |
| CH8-002 | 8.2 | Parties | PASS |
| CH8-003 | 8.3 | Date of signing/opening | FIX — (PARITY) same-date `signed` form (8.3.2) added |
| CH8-004 | 8.4 | Treaty series | FIX — (RE-AUDIT closure) year-organised (`[2015] OJ L 328/3`, ex 13) and sequential (`ETS No 185`, ex 12) forms native; rule-table series abbreviations encoded (`abbreviateTreatySeries`); non-numeric starting pages |
| CH8-005 | 8.5 | Reservations/declarations | PASS — manual/discursive |
| CH8-006 | 8.6 | MoUs | FIX — (PARITY) party joining/en-dash/pinpoints |
| CH8-007 | 8.7 | Entry into force | PASS |
| CH8-008 | 8.8 | Pinpoints and short titles | PASS — (RE-AUDIT closure) italic short-title introduction (ex 20) and portion short refs with designator pinpoints (ex 25) verified in re-audit.test.ts; ibid per rule 1.4.3 resolver |

## Chapter 9 — UN Materials

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH9-001 | 9.1 | UN Charter | FIX — (PARITY) article optional; dedicated `un.charter` SourceType deferred to wave 3 |
| CH9-002 | 9.2 | UN official documents | FIX — (PARITY) resolution numbers/UN GAOR roman (9.2.2); pinpoint comma-after-date (9.2.13); 9.2.5/9.2.8/9.2.12 fixed; (RE-AUDIT closure) 9.2.14 parallel Official Records + `UN Docs` (ex 37; dispatch wired + dispatch test, final mop-up 2026-07-03) |
| CH9-003 | 9.3 | UN committee communications | FIX — (PARITY) session element + submissions form (UI fields wave 3) |
| CH9-004 | 9.4 | UN Yearbooks | FIX |
| CH9-005 | 9.5 | Short title and subsequent references | FIX — (RE-AUDIT closure) subsequent refs now `«Short Title», UN Doc «n» (n X)` with italic short title (ex 48; was author-surname/quoted-roman); yearbook material keeps the quoted title (ex 51) |

## Chapter 10 — ICJ and PCIJ

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH10-001 | 10.1 | Constitutive and basic documents | PASS — manual (cite as treaty) |
| CH10-002 | 10.2.1 | Case name | FIX |
| CH10-003 | 10.2.2 | Parties' names or advisory opinion | FIX |
| CH10-004 | 10.2.3 | Phase | FIX |
| CH10-005 | 10.2.4 | Year | PASS |
| CH10-006 | 10.2.5 | Report series and series letter | FIX — (PARITY wave 2) default series now 'ICJ Rep' |
| CH10-007 | 10.2.6 | Starting page and case number | FIX |
| CH10-008 | 10.2.7 | Pinpoint references | FIX |
| CH10-009 | 10.2.8 | Identifying judges | FIX |
| CH10-010 | 10.3 | Reported pleadings | FIX — (RE-AUDIT closure) PCIJ `(ser C) No «n» pt «pt», «page»` form added to `formatIcjPleading` (ex 28; dispatch wired + dispatch test, final mop-up 2026-07-03) |
| CH10-011 | 10.4 | Unreported materials | FIX — (PARITY) General List No form supported (UI field wave 3) |
| CH10-012 | 10.5 | Short title and subsequent references | FIX — (RE-AUDIT closure) decision short titles were quoted-roman via the secondary path; now italic per rule 2.1.14 (ex 41) with `('…')` intro italic (ex 36); pleadings shorten to the quoted document title (ex 42) |

## Chapter 11 — International Arbitral Decisions

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH11-001 | 11.1.1 | State-state reported decisions | FIX |
| CH11-002 | 11.1.2 | State-state unreported decisions | FIX |
| CH11-003 | 11.2.1 | Individual-state reported decisions | FIX — (PARITY wave 2) `formatStateArbitration` wired; ICSID mislabel gone (UI fields wave 3) |
| CH11-004 | 11.2.2 | Individual-state unreported decisions | FIX — (PARITY) April PASS was stale |
| CH11-005 | 11.3 | Short title and subsequent references | FIX — (RE-AUDIT closure) arbitral short titles (incl phase-bearing, ex 19) now italic; case-name fallback via `caseTitle`/`caseName`/`parties` |

## Chapter 12 — International Criminal Tribunals

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH12-001 | 12.1.1 | Constitutive documents | PASS — manual (cite as treaty/constitutive document) |
| CH12-002 | 12.1.2 | Rules | FIX — (RE-AUDIT closure) `formatTribunalRules` built — `«Tribunal», *Title*, Doc No «n» (adopted «date»)` (exs 6/8; dispatch wired — adopted-date/documentType signals — + dispatch tests, final mop-up 2026-07-03) |
| CH12-003 | 12.2.1 | Parties' names | PASS |
| CH12-004 | 12.2.2 | Phase | FIX |
| CH12-005 | 12.2.3 | Court | PASS |
| CH12-006 | 12.2.4 | Chamber | PASS |
| CH12-007 | 12.2.5 | Case number | FIX — (PARITY) |
| CH12-008 | 12.2.6 | Full date | PASS |
| CH12-009 | 12.2.7 | Pinpoint references | PASS |
| CH12-010 | 12.2.8 | Identifying judges | FIX — (PARITY) |
| CH12-011 | 12.3 | Reports of cases | FIX — (PARITY) report-series form added (UI fields wave 3) |
| CH12-012 | 12.4 | Short title and subsequent references | FIX — (RE-AUDIT closure) tribunal decision/rules short titles now italic (exs 28/32); ibid with paragraph pinpoints per ex 30 |

## Chapter 13 — International Economic Materials

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH13-001 | 13.1.1 | WTO constitutive documents | PASS — manual (cite as treaty) |
| CH13-002 | 13.1.2 | Official WTO documents | FIX — (PARITY) document description/pinpoints |
| CH13-003 | 13.1.3 | WTO panel/AB/arbitrator decisions | FIX — (PARITY) DSR reference (UI field wave 3) |
| CH13-004 | 13.2.1 | Official GATT documents | FIX — (PARITY) BISD reference + document description |
| CH13-005 | 13.2.2 | GATT panel reports | FIX |
| CH13-006 | 13.3 | Investment/trade treaties and investor-state | PASS — (RE-AUDIT closure) pure referral rule (ch 8 treaties, ch 11 arbitrations); both underlying paths fixed in PARITY wave 2 (CH8-x, CH11-003/004) |
| CH13-007 | 13.4 | Short title and subsequent references | FIX — (RE-AUDIT closure) subsequent refs now `[«Reporting Body», ]«Short Title», WTO/GATT Doc «n» (n X)` with italic short title (ex 33); annexed agreements shorten as treaties (ex 25) |

## Chapter 14 — Supranational Materials

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH14-001 | 14.1 | Constitutive documents | PASS |
| CH14-002 | 14.2.1 | EU Official Journal | FIX — (PARITY) bogus instrument-type prefix removed; pinpoints supported |
| CH14-003 | 14.2.2 | EU constitutive treaties | PASS |
| CH14-004 | 14.2.3 | Courts of the EU (CJEU) | FIX — (PARITY) unreported form; case-prefix data C-/T-/F- corrected (ECLI UI field wave 3) |
| CH14-005 | 14.3.1 | Council of Europe basic documents | PASS — manual (cite as treaty) |
| CH14-006 | 14.3.2 | European Court of Human Rights | FIX — (PARITY) reported ECtHR formatter wired (bogus unreported hybrid gone); Eur Comm HR year brackets (14.3.3) fixed |
| CH14-007 | 14.4 | Other supranational decisions | FIX — (RE-AUDIT closure) 14.4.1/14.4.2 already MATCH; `formatSupranationalRules` (exs 41–2) and `formatSupranationalPleading` (ex 43, template comma per DECISION-012) built; dispatch wired + dispatch tests (final mop-up 2026-07-03) |
| CH14-008 | 14.5 | Other supranational documents | FIX — (PARITY) date/session/pinpoint (session UI field wave 3) |
| CH14-009 | 14.6 | Short title and subsequent references | FIX — (RE-AUDIT closure) EU/supranational document and decision short titles now italic and title-led even for body-authored documents (exs 55/58; was author-led/quoted-roman) |

## Chapter 15 — Canada

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH15-001 | 15.1.1 | Cases — general rule | PASS — neutral citations must not gain `[year]` brackets (formatter fix landed wave 2) |
| CH15-002 | 15.1.2 | Official and unofficial report series | FIX — (PARITY) `yearType` round/square; DLR-style `(2005) 258 DLR (4th) 341` |
| CH15-003 | 15.2.1 | Legislation — title | PASS |
| CH15-004 | 15.2.2 | Statute volume and jurisdiction | PASS |
| CH15-005 | 15.2.3 | Year | FIX — (PARITY) `sessionOrSupplement` (`RSC 1985 (1st Supp), c 27`); jurisdiction without year |
| CH15-006 | 15.2.4 | Chapter | PASS |
| CH15-007 | 15.2.5 | Pinpoint references | PASS |
| CH15-008 | 15.3.1 | Constitution — federal | FIX — (PARITY) `formatFederalConstitution` built; dispatch registration wave 3 |
| CH15-009 | 15.3.2 | Constitution — provincial/territorial | PASS |
| CH15-010 | 15.4 | Delegated legislation | FIX — (PARITY) `formatRegulation` (CRC/SOR/provincial) built; dispatch registration wave 3 |
| CH15-011 | 15.5 | Other | PASS — (RE-AUDIT closure) referral rule (defer to the *Canadian Guide to Uniform Legal Citation*); no engine logic required |

## Chapter 16 — China

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH16-001 | 16.1 | Cases | FIX — (PARITY) guillemets for Chinese-script names (roman), `[year]`, translations; April PASS was stale |
| CH16-002 | 16.2 | Legislative materials | FIX — (PARITY) 16.2.1 fixed; 16.2.3 unreported-judgment formatter built (dispatch wave 3); 16.2.2 series preference stays manual |
| CH16-003 | 16.3 | Chinese language materials | FIX — (PARITY) 16.3.1 body/order-no/full-date/gazette form; 16.3.2 constitutions (dispatch wave 3) |
| CH16-004 | 16.4 | Author names and subsequent references | FIX — (RE-AUDIT closure) 16.4.2: resolver keeps the full name (characters + pinyin) for Chinese-script authors in subsequent refs; 16.4.1 script/translation content stays manual (pinyin-only names undetectable without a language flag) |

## Chapter 17 — France

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH17-001 | 17.1 | Cases | FIX — (PARITY) court-first `formatCourtDecision` built (legacy shape deprecated); dispatch registration wave 3 |
| CH17-002 | 17.2.1 | Legislation — individual materials | FIX — (PARITY) gazette form corrected |
| CH17-003 | 17.2.2 | Codes | PASS |
| CH17-004 | 17.2.3 | Constitution | FIX — (PARITY) italics corrected |

## Chapter 18 — Germany

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH18-001 | 18.1 | Cases | FIX — (PARITY) court-first `formatCourtDecision` built (legacy shape deprecated); dispatch registration wave 3 |
| CH18-002 | 18.2.1 | Individual laws | FIX — (PARITY) gazette form corrected |
| CH18-003 | 18.2.2 | Codes | PASS |
| CH18-004 | 18.2.3 | Constitution (Grundgesetz) | FIX — (PARITY) |

## Chapter 19 — Hong Kong

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH19-001 | 19.1 | Cases | FIX — (PARITY) series-implying-court set corrected to {HKCFAR, HKCFA, HKCA}; yearType/pinpoint |
| CH19-002 | 19.2.1 | Principal and delegated legislation | FIX — (PARITY) `(Hong Kong)` default (not `(HK)`); `cap` number |
| CH19-003 | 19.2.2 | Constitution (Basic Law) | PASS |

## Chapter 20 — Malaysia

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH20-001 | 20.1 | Cases | PASS — pinpoint support added |
| CH20-002 | 20.1.1 | Report series | PASS — pre-1966 MLJ square brackets per the guide's examples (DECISION-028 OPEN) |
| CH20-003 | 20.2.1 | Statutes and delegated legislation | PASS |
| CH20-004 | 20.2.2 | Constitution | PASS |

## Chapter 21 — New Zealand

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH21-001 | 21.1.1 | Cases — general rule | PASS |
| CH21-002 | 21.1.2 | Official and unofficial report series | FIX — (PARITY) NZAR/NZCPR duplicates removed; survivors provisional (DECISION-025) |
| CH21-003 | 21.1.3 | Unreported cases (medium neutral) | FIX — (PARITY) all six adoption years corrected to the rule's table (DECISION-022) |
| CH21-004 | 21.1.4 | Maori Land Court and Maori Appellate Court | IMPL — (PARITY) `formatMaoriLandCourt` built (MB/ACMB/CJMB, registries in full); dispatch registration wave 3 |
| CH21-005 | 21.1.5 | Waitangi Tribunal | IMPL |
| CH21-006 | 21.2.1 | Statutes | PASS |
| CH21-007 | 21.2.2 | Delegated legislation | IMPL |
| CH21-008 | 21.3 | Other | PASS — (RE-AUDIT closure) referral rule (defer to the *New Zealand Law Style Guide*); no engine logic required (a full NZLSG mode exists separately) |

## Chapter 22 — Singapore

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH22-001 | 22.1.1 | Cases — general rule | PASS |
| CH22-002 | 22.1.2 | Report series (SLR, SLR(R)) | PASS — series preference unenforced (manual) |
| CH22-003 | 22.1.3 | Unreported cases | PASS |
| CH22-004 | 22.2.1 | Statutes and subsidiary legislation | FIX — (PARITY) lowercase `cap`/`rev ed`; reprint parenthetical |
| CH22-005 | 22.2.2 | Constitutional documents | FIX — (PARITY) constitutions now emit `(Singapore[, rev ed])` |

## Chapter 23 — South Africa

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH23-001 | 23.1.1 | Cases — general rule | FIX — (PARITY) geographic division codes banned (deprecated `division`); table court names via `courtId` |
| CH23-002 | 23.1.2 | Report series | PASS |
| CH23-003 | 23.2.1 | Statutes and delegated legislation | FIX — (PARITY) `actNumber` no longer emitted — ch 3 title-year form |
| CH23-004 | 23.2.2 | Constitution | FIX |
| CH23-005 | 23.3 | Truth and Reconciliation Commission | FIX — (PARITY) `formatTRCReport` (ch 6 book form, roman author); dispatch registration wave 3 |

## Chapter 24 — United Kingdom

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH24-001 | 24.1.1 | Cases — general rule | PASS |
| CH24-002 | 24.1.2 | Modern English reports | FIX — (PARITY) full Law Reports family in data; 'LR «vol» QB' volume placement automatic |
| CH24-003 | 24.1.3 | Nominate reports | FIX — (PARITY) parallel ER/RR citation (`; 83 ER 310, 315`); April PASS was stale |
| CH24-004 | 24.1.4 | Scottish reports | FIX — (PARITY) bare-year form (`Logan v Harrower 2008 SLT 1049`); April PASS was stale |
| CH24-005 | 24.1.5 | Unreported cases (UKSC, EWCA, EWHC) | FIX — (PARITY) HCJT + unparenthesised 'EWHC Admin' (2001–02) in data; HCJ marked non-AGLC |
| CH24-006 | 24.1.6 | Identifying judicial officers | FIX — (PARITY) UK judicial-titles table (21 rows) + `formatJudicialOfficers`; DPSC per DECISION-012 |
| CH24-007 | 24.2.1 | Legislation — title and year | PASS |
| CH24-008 | 24.2.2 | Jurisdiction | FIX |
| CH24-009 | 24.2.3 | Regnal year and chapter | FIX — (PARITY) `formatRegnalYear` + monarch abbreviation table ('2 & 3 Wm 4', Arabic numerals) |
| CH24-010 | 24.2.4 | Pinpoint references | FIX |
| CH24-011 | 24.3 | Delegated legislation (SIs) | FIX — (PARITY) instrumentType SI/SR/SR & O by jurisdiction+year; comma before pinpoint (`SI 2001/2600, r 4`) |
| CH24-012 | 24.4.1 | Parliamentary debates (Hansard) | FIX — (PARITY) `*Parliamentary Debates*` italic; Cobbett's-era form residual low gap |
| CH24-013 | 24.4.2 | Command papers | PASS |
| CH24-014 | 24.4.3 | Parliamentary papers | FIX — (RE-AUDIT closure) `formatParliamentaryPaper` built — both-Houses paper numbers comma-joined (exs 50–1; dispatch wired via foreign.uk secondary branch + UI fields + dispatch tests, final mop-up 2026-07-03) |

## Chapter 25 — United States

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH25-001 | 25.1.1 | Cases — parties' names | PASS |
| CH25-002 | 25.1.2 | Volume | PASS |
| CH25-003 | 25.1.3 | Report series and series number | PASS |
| CH25-004 | 25.1.4 | Starting page and pinpoint references | PASS |
| CH25-005 | 25.1.5 | Jurisdiction and court name | PASS |
| CH25-006 | 25.1.6 | Year | PASS |
| CH25-007 | 25.1.7 | Unreported cases | FIX — (PARITY) `formatUnreportedCase` (docket/slip op) built; dispatch registration wave 3 |
| CH25-008 | 25.1.8 | Identifying judges | FIX — (RE-AUDIT closure) `judge` element after the pinpoint in reported/unreported formatters (exs 29–31); `abbreviateUsJudicialTitle` (J/PJ/JAD; 'Assistant Justice' misprint aliased to Associate Justice, never emitted); dispatch wired + UI judge field + dispatch tests (final mop-up 2026-07-03) |
| CH25-009 | 25.2 | Legislation — USC codes | PASS |
| CH25-010 | 25.3 | Session laws | FIX — (PARITY) `(year)` omitted when in title (25.3.7); Pub L/Priv L/ch; 'Act of «date»' roman; April PASS was stale |
| CH25-011 | 25.4 | Constitution | FIX — (PARITY) state constitutions; article numerals passthrough (DECISION-027) |
| CH25-012 | 25.5 | Delegated legislation (CFR) | FIX — (PARITY) Fed Reg form (25.5.1); 25.5.2 state delegated legislation residual gap |
| CH25-013 | 25.6 | Congressional materials | FIX — (PARITY) Congressional Record italic, speaker before date parens, daily ed (25.6.1); 25.6.2 bills/resolutions residual gap |
| CH25-014 | 25.7 | Restatements | FIX — (PARITY) mandatory 'American Law Institute' author; `(year) § section` order; April PASS was stale |

## Chapter 26 — Other Foreign Materials

| ID | Section | Title | Status |
|----|---------|-------|--------|
| CH26-001 | 26.1.1 | Non-English materials translated by author | FIX — (PARITY) `[tr author]` / `[tr …]` as the FINAL run; April PASS was stale |
| CH26-002 | 26.1.2 | Published translations | FIX — (RE-AUDIT closure) `publishedTranslation` element (`[tr «Translation Citation»]` final, exs 4/7) on case/decision/legislation formatters; dispatch wired + UI field + dispatch tests (final mop-up 2026-07-03) |
| CH26-003 | 26.2 | Judicial and administrative decisions | FIX — (PARITY) year-overwrite bug fixed (`[1967] 1 All NLR 123`); `formatOtherDecision` built (series italics open — DECISION-029) |
| CH26-004 | 26.3 | Legislative materials | FIX — (PARITY) `otherInformation` elements; translation marker placement |
| CH26-005 | 26.4 | Other non-English language materials | FIX — (final mop-up 2026-07-03) `translatedTitle` on `formatBook`/`formatInternetMaterial`/`formatNewspaper` (+ `translatedWebsiteName` for ex 22's website element), emitted as roman ` [«translation»]` after the styled element per rule 26.1.1; dispatch + Insert/Edit UI fields wired; exact-string tests for exs 21–2. Non-English book titles with a stored translation are reproduced as typed rather than English-title-cased (ex 21 'von Lissabon'; DECISION-030 OPEN) |

---

**Total audit items: 302** (the previous "271" undercounted the table rows; corrected in the 2026-07-02 rebase)

---

## Related: consolidated AGLC4 critique (CRIT epic, 2026-07-22)

This audit tracks Obiter's *engine conformance* to AGLC4. The complementary **critique** of
AGLC4 itself — every contradiction, confirmed error, impossibility, and ambiguity the guide
contains, classified with pinpoint page refs and proposed AGLC5 fixes — lives in
[`aglc4-critique.md`](aglc4-critique.md) (CRIT-001), with the extensions register
([`obiter-extensions.md`](obiter-extensions.md)), modern-sources proposal
([`modern-sources-proposal.md`](modern-sources-proposal.md)), AGLC5/peer-standards research
([`aglc5-and-peer-standards-research.md`](aglc5-and-peer-standards-research.md)), and
court-practices review ([`court-practices-review.md`](court-practices-review.md)). The
one-page executive summary in `aglc4-critique.md` §2 is the AGLC5 open-letter / MULR input
and feeds `website/aglc5.html`.
