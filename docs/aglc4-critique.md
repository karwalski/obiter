# AGLC4 — A Consolidated Critique (CRIT-001)

**Author:** Matthew Watt · **Project:** Obiter (AGLC4 Word add-in) · **Status:** Living document, first consolidation 2026-07-22

> **Purpose.** Obiter implements the *Australian Guide to Legal Citation*, 4th ed
> (AGLC4) end to end. Building a mechanical implementation surfaced every place the
> guide contradicts itself, is confirmably wrong, cannot be applied mechanically as
> written, or is silent and forced an implementation choice. This document
> consolidates that evidence — previously scattered across `docs/decisions.md`,
> `docs/parity-reviews/`, `docs/erratum-audit.md`, `docs/appendix-verification.md`,
> the anomalies catalogue in `../aglc4-rule-reference.md`, and engine annotations —
> into a single, pinpoint-cited critique intended as input to the AGLC5 revision and
> to correspondence with the Melbourne University Law Review (MULR).

> **Copyright / transcription note.** AGLC4 is copyright MULR and the source PDF
> carries a no-copy flag. Every defect below is stated in **derived, paraphrased
> form with a pinpoint page reference**; no rule prose is reproduced verbatim.
> Appendix abbreviation *data* (report-series abbreviations, court identifiers,
> pinpoint abbreviations) is factual and is treated as data, not expression.

> **Page references.** The anomalies catalogue uses **PDF page numbers**; the
> printed page ≈ PDF page − 25. Where both are useful the form is `PDF p.X
> (printed p.Y)`.

---

## 1. Taxonomy and method

Each finding is classified into exactly one category:

- **Contradiction** — the guide disagrees with itself: rule vs rule, rule vs its own
  worked example, or rule vs appendix.
- **Error** — the guide is confirmably wrong against the corrected printings (a factual
  mistake, typo, or cross-reference error), independent of any competing reading.
- **Impossibility** — the rule is *underdetermined*: it cannot be applied mechanically
  as written because a determinant it depends on is unavailable, proprietary, or
  unrepresentable. The critique states the missing determinant.
- **Ambiguity** — the text admits multiple defensible readings, or is silent where an
  implementer must nonetheless act. The critique notes the reading Obiter adopted and
  the governing `DECISION-###`.

The evidence base is the **2020 corrected printing** (the source PDF's imprint reads
"2018, 2019 (with minor corrections), 2020 (with minor corrections)"), so the 2019
erratum is already incorporated. A targeted scan of a **2021 printing** found the
"minor corrections" printings to be very light: exactly **one** substantive
2020→2021 fix (rule 24.1.6, below); the durable misprints listed here persist. See
`docs/erratum-audit.md`.

The operative default throughout Obiter, adopted under **DECISION-012**, is
**rule text (and tables) prevail over worked examples** — because examples are the
most error-prone surface of the guide. This critique documents where that default
bites, and the rare cases (e.g. rule 20.1.1) where the examples are so uniform that
they were followed against the rule note instead.

---

## 2. Executive summary (one page — for the AGLC5 letter / MULR)

AGLC4 is a mature and widely adopted standard, but a complete mechanical
implementation exposes a substantial defect surface that a fifth edition should
address systematically rather than piecemeal:

1. **The worked examples are the weakest surface.** Roughly **78 catalogued
   anomalies** cluster in the example bands: examples that contradict their own rule
   or table (rule-vs-example), examples with factual errors (wrong weekdays, wrong
   names, duplicated proceeding numbers, a 1949–1949 span), inconsistent punctuation,
   and cross-references pointing at the wrong rule. Most are cosmetic; a material
   minority change machine output. **AGLC5 should ship with an authoritative erratum
   and reconcile every example against its rule and table.**

2. **Several rules cannot be applied mechanically as written.** The italicisation
   test in rule 1.8.3 depends on membership of the *proprietary, paywalled* Macquarie
   Dictionary with no edition named (**Impossibility**); rule 4.2 requires italics
   *inside* title strings that no plain citation model can represent; the currency
   check implied by rule 2.3.1 needs a per-citation bench/full-court signal the
   citation form does not carry; and report-series organisation (rule 2.2.2) cannot be
   captured by a single boolean for series that switched systems. **AGLC5 should name
   a publicly available reference (or publish the word list), define a data-exchange
   syntax for embedded emphasis, and model series/court metadata explicitly.**

3. **The internal tables and Appendix A disagree.** Authorised-report markers in
   Appendix A conflict with rule-chapter tables and with real-world status (US
   regional reporters marked authorised; ACTR marked authorised where practice treats
   it otherwise), single abbreviations mask three distinct series (SCR, FC, IR),
   marker semantics (`*`/`†`/`‡`) are undefined, and a 2020 abbreviation change
   (Queensland Reports "Qd R" → "QR") is recorded in the appendix but not in the rule
   chapter. **AGLC5 should make the appendices the single source of truth, define the
   marker legend, and add explicit coverage-year and authorised-tier fields.**

4. **The guide has no rule for generative-AI output, and its internet-materials rules
   trail practice.** AGLC4 predates ChatGPT; Australian law schools improvised interim
   guidance by analogy to rule 7.12 (written correspondence). New institutions
   post-dating 2018 (FCFCOA 2021, the Administrative Review Tribunal 2024, the National
   Anti-Corruption Commission) and platform renames are unaddressed. **AGLC5 should add
   first-class rules for AI-generated content, datasets/software, and modern web
   sources** (see the companion `docs/modern-sources-proposal.md`).

5. **Under-specification forces silent implementation choices.** At least **19 rules**
   are example-driven or rely on undefined categories ("non-numeric issue", "named
   lecture", "revised edition", "published in parts"), or bury a rule in a prose note
   (6.6.2). Each forced a documented judgment call. **AGLC5 should state each rule
   explicitly rather than leaving it to be inferred from a single illustration.**

Net: the defects are not fatal, but they are numerous, and their *shape* (examples
that contradict rules, proprietary dependencies, table/appendix disagreement, silence
on modern sources) is systematic. Obiter is offered as a reference implementation and
as a standing regression test of any AGLC5 draft.

---

## 3. Errors (confirmably wrong)

Factual mistakes, typographical errors, and wrong cross-references. Cosmetic entries
do not change machine output but evidence the quality-control gap; engine-relevant
entries do.

| Rule / Ex | PDF p. (printed) | Defect (paraphrased) | Printing status | Engine-relevant | Ref |
|---|---|---|---|---|---|
| 1.11.1 | 56 (31) | Worked example names the wrong weekday (6 March 1987 was a Friday) | 2020 & 2021 both wrong | No | anomalies |
| 1.11.2 | 56 (31) | Worked example names the wrong weekday (22 December 2012 was a Saturday) | 2020 & 2021 both wrong | No | anomalies |
| 1.6.3 | 48 (23) | Rule inconsistently hyphenates its own term ("en-dash" vs "en dash") | unchanged | No | anomalies |
| 2.1.14 | 72 (47) | Bullet cross-references rule 2.1.1 for corporate-status indicators prescribed by rule 2.1.2 | unchanged | Yes | anomalies |
| 2.3.1 | 79 (54) | Worked example prints court code "TASCC" where the table gives "TASSC" | 2020 & 2021 both wrong | Yes | anomalies, un-annot |
| 2.3.4 | 83 (58) | Two unrelated examples reuse the identical proceeding number NSD1519/2004 | unchanged | Yes | anomalies |
| 3.1.7 | 98 (73) | Footnote back-references cite notes that concern unrelated sources | unchanged | Yes | anomalies |
| 6.6.2 | 129 (104) | Rule prose typo: "multiples editors" | unchanged | No | anomalies |
| 6.7 | 129 (104) | Example misspells the translator's surname ("Barns" for "Barnes") | unchanged | No | anomalies |
| 7.12 | 150 (125) | Rule prose typo: "phase" for "phrase" | unchanged | No | anomalies |
| 9.2.10 | 173 (148) | Example uses singular "UN Doc" where the rule prescribes the plural | unchanged | Yes | un.ts:76 |
| 9.6 | 183 (158) | Row label misnames the organ ("Committee" for "Council") | unchanged | No | anomalies |
| 10.4.2 | 193 (168) | Rule fixes list numbering with wording carried over from 10.4.1 (judgments), though 10.4.2 concerns pleadings | unchanged | Yes | anomalies |
| 12.2.2 | 204/207 | Defendant's name spelled two ways across examples (Blaškič / Blaškić) | unchanged | Yes | anomalies |
| 13.2.1 | 214–5 | Example omits the comma before a pinpoint that the rule requires (GATT BISD) | unchanged | Yes | economic.ts:139 |
| 14.2.2 | 222 (197) | Short-title table lacks the row for a short title the example uses ("EEC Treaty") | unchanged | Yes | anomalies |
| 14.4.4 | 233 (208) | Example omits the comma between case number and date the template requires | unchanged | Yes | supranational.ts:510 |
| 16.2.1 | 246–7 | Two pinyin transliteration errors ("Zhengrong"/"Cheng") | unchanged | Yes | anomalies |
| 16.3.1 | 249 (224) | Example self-contradicts on instrument number (225 vs 223) and mistranslates "Part 1" as "Part 2" | unchanged | Yes | anomalies |
| 17.2.1 / 17.2.2 | 255 (230) | Cross-reference to "rule 25.1.1" is a misprint for 26.1.1 (wrong Part) | unchanged | Yes | anomalies |
| 17 (header) | 255 (230) | Running header prints "Part IV" on a Part V chapter | unchanged | No | anomalies |
| 19.1 | 259 (234) | Rule prose drops a word ("cited accordance with") | unchanged | No | anomalies |
| 20.1.1 | 261–2 | Rule note says MLJ was volume-organised pre-1966, but every pre-1966 example uses square brackets (**followed the examples** — DECISION-028) | unchanged | Yes | DECISION-028 |
| 23.1.1 | 272 (247) | Representative-capacity post-nominal lower-cased ("No") where the style prints "NO" | unchanged | Yes | anomalies |
| 24.1.6 | 281 (256) | Example band printed "Lord Hope DP"; the table prescribes "DPSC" | **CORRECTED in 2021 → DPSC**; engine already emitted DPSC | Yes | DECISION-012, judicial-titles.ts:15 |
| 25.1.8 | 296 (271) | Rule lists "Assistant Justice" — a US federal title that does not exist (should be "Associate Justice") | unchanged | Yes | usa.ts:59 |
| 25.3.5 | 308 (283) | Example prints "NY Stat" where the rule table gives "NY Laws"; also "c" for the prescribed "ch" | 2020 & 2021 both wrong | Yes | anomalies |
| 25.3.8 | 310 (285) | Example drops the "No" the rule prescribes ("Pub L 108-201") | unchanged | Yes | anomalies |
| 26.1.1 (Fr) | 317 (292) | Cross-reference misprint "25.1.1" for 26.1.1 | unchanged | Yes | france.ts:171 |
| 26.2 | 319 (294) | Example prints a year span with identical endpoints ("1949–1949") | unchanged | No | anomalies |

*Column "Ref": `anomalies` = catalogue in `../aglc4-rule-reference.md`; `*.ts:NN` = engine annotation; `DECISION-###` = decision record; `un-annot` = both.*

---

## 4. Contradictions (the guide disagrees with itself)

Rule-vs-example and rule-vs-rule conflicts. Under DECISION-012 the rule/table side is
followed unless the examples are uniform and the note is the outlier (20.1.1).

| Rule / Ex | PDF p. (printed) | Contradiction (paraphrased) | Obiter's resolution | Ref |
|---|---|---|---|---|
| 1.5.2 | 42 (17) | Colon-introduced quotation example is not capitalised as the rule directs | Follow rule | anomalies |
| 1.10.1 | 55 (30) | Example pinpoints a page with a comma ("65,131") against the no-comma reading long assumed by the engine | **Under CRIT-DEEP re-check** — rule band may actually *require* the comma | parity, CRIT-DEEP |
| 2.1.11 | 70 (45) | Corrective-bracket punctuation differs across examples (`].` vs `]`) | Follow rule | anomalies |
| 2.1.14 / 3.5 | 71 / 100 | Every example introduces a short title even when it is a substring of the full name, though a plausible reading would suppress it | Show the introduction (per examples) | parity, CRIT-DEEP |
| 5.5 | 118 (93) | Example converts "&" to "and" in a journal title though the rule says reproduce the title page and lists no such exception | Preserve "&" (DECISION-014) | DECISION-014, CRIT-DEEP |
| 6.4 | 127 (102) | Counter-example uses an unshortened span ("147–183") against the shortening rule | Follow rule | anomalies |
| 6.7 | 129 (104) | Template/prose place the translator outside the parentheses; older engine placed it inside | Translator outside (fixed) | parity |
| 7.7 | 144 (119) | Example uses a hyphen in a paragraph span against rule 1.1.7's en-dash | Follow rule | anomalies |
| 7.10 | 147 (122) | Example gives only a month-year ("at September 2017") against the "Full Date" template | Accept partial dates where that is all the source states (DECISION-020) | DECISION-020 |
| 7.11.3 | 149 (124) | Date parenthetical precedes the periodical in the template/example; older engine placed it after | Date before periodical (fixed) | parity |
| 9.2.5 | 170 (145) | Example omits the comma the rule requires and lower-cases "items" | Follow rule | anomalies |
| 9.2.6 vs 9.2.7 | 171 (146) | Rule 9.2.6 forbids a session number on SC resolutions; example 15 under 9.2.7 prints one | Suppress the session (rule side) | un.ts:65, DECISION-012, CRIT-DEEP |
| 9.2.10 | 173 (148) | Example omits the year the rule requires on an SC resolution | Follow rule | anomalies |
| 11.1.1 | 195–6 | Two abbreviations for one series within one rule ("Hag Crt Rep 2d" vs "Hague Ct Rep 2d") | Follow table | anomalies |
| 11.2.1 | 198 (173) | Examples retain a full date inside a phase where rule 10.2.3 (incorporated) omits it | Follow rule | anomalies |
| 12.2 | 203 (178) | "Judgement" (table) vs "Judgment" (note) | Follow note spelling | anomalies |
| 13.1.3 | 212 (187) | Two subtitle examples styled inconsistently (roman vs italic) | Follow dominant form | anomalies |
| 14.2.3 | 225 (200) | Examples include a volume element the rule's diagram/text do not define | Follow rule diagram | anomalies |
| 14.5 | 234 (209) | One example spells out "43rd regular session" where siblings/table abbreviate | Follow table | anomalies |
| 20.1.1 | 261–2 | Rule note (volume-organised pre-1966) vs every pre-1966 example (square brackets) | **Follow the examples** (DECISION-028) | DECISION-028 |
| 24.4.1 | 286 (261) | Historical template omits, but the example includes, the comma before a column pinpoint | Follow modern template (comma) | anomalies |
| 25.2.2 | 298/300 | "Pa Con Stat" (example) vs "Pa Cons Stat" (table) | Follow table | anomalies |
| 25.2.3 | 301 (276) | One example uniquely omits the parenthesised code year with no rule basis | Follow rule (include year) | anomalies |
| 25.3.5 | 308 (283) | "c" vs prescribed "ch" for chapter | Follow rule ("ch") | anomalies |
| 25.4 | 310 (285) | US Constitution article numerals differ (Roman "art IV" vs Arabic "art 1") with no normalising rule | Pass through as entered (DECISION-027) | DECISION-027 |
| 26.1.2 | 317 (292) | Example omits the "tr" marker and comma the rule requires | Follow rule | anomalies |
| 26.2 | 319 (294) | Example abbreviates a series where the rule requires writing it out unless in Appendix A | Verify against Appendix A; follow rule | anomalies |
| 26.3 | 320 (295) | Foreign statute title set in roman against the rule's italicisation requirement | Follow rule (italic) | anomalies |
| 29.x data | Appendix A vs chapter tables | Authorised-report markers conflict (see §6) | Curated tier drives rule 2.2.2 | appendix |

---

## 5. Impossibilities (cannot be applied mechanically as written)

These rules depend on a determinant that is proprietary, absent, or unrepresentable.
The missing determinant is stated explicitly.

| Rule | PDF p. | Missing determinant | Obiter's handling | Ref |
|---|---|---|---|---|
| **1.8.3** | 52 (27) | Italicise a foreign term only if absent from the *latest Macquarie Dictionary* — but Macquarie is proprietary and paywalled and **no edition/year is named**, so membership cannot be authoritatively determined; ~40 terms remain provisional. The rule's own do-not-italicise list is also internally inconsistent. | Free-source proxy (Merriam-Webster etc.) calibrated to the rule's 36 labelled terms; ~40 kept italic provisionally; conservative roman for ~10 | DECISION-016, parity, CRIT-DEEP |
| **2.2.2 / 2.2.3 (ACTR)** | 74–79 | Whether ACT Reports are authorised is decided by in-chapter tables that conflict, and ~230 report-series rows could not be verified without the (originally absent) appendices | ACTR split 1973–2008 authorised / 2009– unauthorised; full Appendix A imported (DATA-004) | DECISION-015 |
| **2.2.2 (yearOrganised)** | 74 + App A | Some series (NSWLR, VR) switched between year- and volume-organisation; a single boolean cannot encode the switch year, and the appendix records coverage spans, not the organisation system | Provisional boolean; coverage years imported; flagged for a researcher pass | DECISION-023 |
| **2.3.1 (mncTo currency)** | 79–80 | The check needs a per-citation bench / full-court signal to tell full-court from first-instance uses of one court code; the citation model carries no such field and the appendix supplies no year data | No `checkMncCurrency` validator; `mncTo` left unfilled | DECISION-032 |
| **3.1.4 (plural of "ord")** | 96 (71) | Chapter 3 gives only the singular "ord"; the plural is stated nowhere | Used "ords"; **later confirmed correct** by Appendix C | DECISION-024 (resolved) |
| **4.2 (embedded italics)** | 113 (88) | Italics must be preserved *inside* a title (e.g. a case name within an article title), but the citation model stores titles as plain strings — representationally impossible | Minimal inline `*asterisk*` marker convention; no schema change | DECISION-021 |
| **24.1.2 (bare "Ex")** | 275 (250) | Abbreviation appeared to be fabricated | **Confirmed legitimate** ("Exchequer Reports") via Appendix A | DECISION-026 (resolved) |
| **Appendix A (SCR/FC/IR)** | App A | One abbreviation masks three distinct series (SCR = Canada / India / …; FC = Faculty Collection / Federal Court; IR = Irish / Industrial), so disambiguation is impossible from the abbreviation alone | Curated entries disambiguate; appendix rows appended for search | appendix |

---

## 6. Ambiguities and under-specifications (silence forcing a choice)

The guide is silent, example-driven, or relies on an undefined category. Each forced a
documented judgment call. The following are the load-bearing ones; the full parity set
lists ~19.

| Rule | PDF p. | Under-specification | Obiter's choice | Ref |
|---|---|---|---|---|
| 1.2 | ~34 | Signal capitalisation after a mid-sentence colon is shown but not stated | Signals always capitalised (limitation accepted) | DECISION-018 |
| 1.5.5 | 44 (19) | Silent on whether "sic" is italicised | Italic "sic", roman brackets (MULR house practice) | DECISION-017 |
| 1.6.3 | 48 (23) | Em-dash ban stated for citations but the guide's own Part headings use spaced em-dashes | Ban enforced only in citation elements | DECISION-013 |
| 1.7 | 50 (25) | "Lowercase prepositions" with no list and no length limit; examples lowercase 6-letter words | (Engine defect: hard-coded ≤4-letter list) — guide defect is vagueness | parity |
| 1.13 | 60–62 | Bibliography tiebreak cascade silent on how co-author counts break ties | First-author surname; fall through to insertion order | parity |
| 3.1.2 / 3.8 | ~95/104 | Principal-Act default vs rule 3.8 hybrid — which is the default is unstated | Single-Act default; hybrid opt-in | DECISION-008 |
| 5.4 | 117–8 | "Non-numeric issue" (spacing rule) is undefined | (Engine defect) — guide leaves the category to common sense | parity |
| 5.8 | 119–20 | "Published in parts" undefined; part-numbering convention unstated | — | parity |
| 6.3.3 | 126 (101) | "Revised edition" vs "reprint" undefined | `revised` flag; user-detected | parity |
| 7.2.1 / 7.2.5 | 135–8 | Date granularity ("full date") and thesis title styling (quoted vs italic) shown only in examples | Full dates; quoted roman thesis titles | parity |
| 7.3 / 7.6 / 7.7 / 7.10 / 7.15 | 138–155 | "Named lecture", online-dictionary form, publisher placement, mandatory constitutive-document date, and internet document-type category all shown only in examples | Inferred from examples | parity |
| 21.1.3 | 240 (215) | AGLC4's NZ neutral-citation adoption years diverge from real-world NZLII; unclear if AGLC4 years govern a validator | AGLC4 years govern; no dual-year field | DECISION-022 |
| 25.4 | 310 (285) | US Constitution article numeral style unstated | Pass through as entered | DECISION-027 |
| 26.4 / 1.7 | 328 (303) | Title-case scope on non-English titles vs source-language capitalisation | Reproduce source-language capitalisation | DECISION-030 |
| 2.2.3 / 26.2 | 74 / 319 | Whether written-out non-common-law series are roman or italic | Default roman (per 2.2.3); caller override retained | DECISION-029 |

---

## 7. Appendix A/B/C defects

Forty-five distinct inconsistencies were catalogued in `docs/appendix-verification.md`.
They fall into four groups; representative entries only:

- **Authorised-marker conflicts (≈12).** Appendix A marks several US regional reporters
  (NE 2d, NW 2d, P 2d/3d, SE 2d, SW 3d, So 2d) and ACTR as authorised (`*`), conflicting
  with rule-chapter treatment and real-world status. Conversely CLR/ER/FCR are authorised
  but scanned as unmarked (marker under-capture). *Obiter: the curated tier drives rule
  2.2.2; absence of a scanned marker is never used to downgrade.*
- **Full-name conflicts (≈25).** The same abbreviation expands differently between the
  appendix and rule usage (e.g. AC, Ch, KB, QB "Law Reports, X Division" vs bare "X";
  RPC "Reports of Patent Cases" vs "…Patent, Design and Trade Mark Cases"; TCLR
  "Commerce" vs "Competition"; LGERA "Environment" vs "Environmental"), and three
  abbreviations (SCR, FC, IR) each mask multiple distinct series.
- **Era-splits (2).** ACTR (1973–2008 vs 2009–) and Queensland Reports ("Qd R" pre-Apr
  2020 → "QR" from Apr 2020, recorded in the appendix but not the rule chapter —
  DECISION-031).
- **Marker semantics + coverage (≈6).** The `*`/`†`/`‡` legend is undefined; Appendix A
  holds 1,202 rows vs 193 curated (1,047 not previously covered, imported via DATA-004;
  88 curated rows absent from the appendix); Appendix B court identifiers carry no
  era-of-operation; Appendix C pinpoint abbreviations gained jurisdiction-scoped variants
  needing worked examples.

**Proposed AGLC5 direction:** make the appendices the single source of truth for series
data, publish the marker legend, and add explicit `authorised_tier`, `years`, and
`jurisdiction` fields so a single abbreviation can no longer mask multiple series.

---

## 8. The four "wave-1 inverted" rules (with printing evidence)

These four were the highest-severity findings of the first parity wave. Two are
primarily *engine* inversions the guide made easy to get wrong; two overlap a genuine
guide contradiction. All are stated with current engine state, as the AC requires.

| Rule | PDF p. | Nature | Guide contribution | Current engine state |
|---|---|---|---|---|
| **1.8.3** Latin italics | 52 (27) | The do-not-italicise list was encoded inverted | The list is itself internally inconsistent and depends on Macquarie (see §5) | Under CRIT-DEEP re-check against the PDF; Macquarie dependency unresolved |
| **1.10.1** Number commas | 55 (30) | Engine stripped/flagged commas the rule may in fact require | Rule band ("4,150") vs prior assumption; example fn prints "65,131" | Under CRIT-DEEP re-check — the *rule*, not the engine, may be right |
| **1.5.3** Ellipsis form | 43 (18) | Engine mandated Bluebook `. . .` and flagged the correct `…` | None — the rule is clear; this was a pure engine defect | Fixed (PARITY-121): `…` accepted |
| **2.2.7** Parallel citations | 79 (54) | Validator warned when Australian-case parallels were *absent* (inverted) | None — the prohibition is unambiguous | Fixed in wave 2: no parallels emitted in academic AGLC mode |

Printing evidence: none of these four were touched by the 2019/2020/2021 corrections;
the only substantive 2020→2021 example fix in the entire scan was rule 24.1.6
(DP → DPSC), which *vindicated* the engine (§3).

---

## 9. Decision register — full classification (AC coverage)

Every `DECISION-001..034` is classified here or explicitly excluded. Excluded entries
are Obiter product/infrastructure/legal decisions, not AGLC4-guide defects.

| Decision | Status | Class | Rule(s) | One-line |
|---|---|---|---|---|
| 001 | Resolved | Excluded | — | Appendix data sourcing (product) |
| 002 | Resolved | Excluded | — | AGLC5 roadmap timing (product) |
| 003 | Resolved | Excluded | — | AustLII API access (infra) |
| 004 | Resolved | Excluded | — | Monetisation model (product) |
| 005 | Resolved | Excluded | — | Word-for-Web API limits (platform) |
| 006 | Resolved | Excluded* | 7.12 (analogy) | GenAI source type — *guide silence; see CRIT-002* |
| 007 | Resolved | Excluded | — | First Nations consultation (ethics/process) |
| 008 | Resolved | Ambiguity | 3.1.2, 3.8 | Principal-Act default vs hybrid |
| 009 | Resolved | Excluded | — | Accessibility tokens (product) |
| 010 | Resolved | Excluded | — | Named styles / ATAG (product) |
| 011 | Open | Excluded | — | Jurisd/token-portal strategy (product) |
| 012 | Open | **Error (umbrella)** | many | Rule-text-prevails default; 64 internal anomalies |
| 013 | Resolved | Ambiguity | 1.6.3 | Em-dash scope |
| 014 | Resolved | Ambiguity/Contradiction | 5.5 | "&" vs "and" in journal titles |
| 015 | Resolved | Impossibility | 2.2.2/2.2.3 | ACTR authorised status |
| 016 | Open | Impossibility | 1.8.3 | Macquarie dependency |
| 017 | Resolved | Ambiguity | 1.5.5 | "sic" italicisation |
| 018 | Resolved | Ambiguity | 1.2 | Signal caps after colon |
| 019 | Resolved | Excluded | 6.x | Invented ebook "[Platform]" (Obiter extension) |
| 020 | Resolved | Contradiction | 7.10 | Partial dates vs "Full Date" |
| 021 | Resolved | Impossibility | 4.2 | Embedded italics |
| 022 | Open | Ambiguity | 21.1.3 | NZ neutral-citation years |
| 023 | Open | Impossibility | 2.2.2 | yearOrganised switch |
| 024 | Resolved | Impossibility→ok | 3.1.4 | Plural "ords" (confirmed) |
| 025 | Open | Impossibility | 2.2.2/2.2.3 | NZ series duplicates/typing |
| 026 | Resolved | Impossibility→ok | 24.1.2 | "Ex" confirmed legitimate |
| 027 | Resolved | Ambiguity | 25.4 | US Constitution numerals |
| 028 | Resolved | Contradiction | 20.1.1 | Pre-1966 MLJ brackets (followed examples) |
| 029 | Resolved | Ambiguity | 2.2.3/26.2 | Foreign series italics |
| 030 | Resolved | Error | 1.7/26.4 | Non-English title casing |
| 031 | Resolved | Error/Contradiction | 2.2.3 + App A | Qd R → QR (2020) |
| 032 | Resolved | Impossibility | 2.3.1 | mncTo bench signal |
| 033 | Open | (Court practice, not guide) | PDs | Court PD verification queue → CRIT-004 |
| 034 | Open | Excluded | — | Privacy Act posture (legal) |

\* DECISION-006 is excluded as a *guide defect* (it is an Obiter extension) but the
underlying **silence on generative AI** is a genuine AGLC4 gap, carried forward in the
modern-sources proposal.

---

## 10. Consolidated AGLC5 recommendations

1. **Publish an authoritative erratum** reconciling every worked example against its
   rule and table; the example bands are the primary defect surface.
2. **Remove proprietary/unrepresentable dependencies:** name a publicly available
   reference dictionary (or publish the 1.8.3 word list); define a data-exchange syntax
   for emphasis inside titles (rule 4.2); add the metadata (bench/full-court, series
   organisation switch-years) that currency and organisation rules silently require.
3. **Make the appendices authoritative and self-consistent:** define the `*`/`†`/`‡`
   legend; add `authorised_tier`, coverage `years`, and `jurisdiction` fields;
   disambiguate abbreviations that mask multiple series (SCR, FC, IR); reconcile
   appendix expansions with rule-chapter usage.
4. **Add first-class rules for modern sources:** generative-AI output, datasets and
   software, and current internet forms; refresh institutional lists (FCFCOA, ART,
   NACC) and report-series changes (QR). See `docs/modern-sources-proposal.md`.
5. **State each rule explicitly** rather than by a single illustration: define
   "non-numeric issue", "named lecture", "revised edition", "published in parts";
   promote buried notes (6.6.2) to full rule sections; give the bibliography tiebreak
   cascade a complete specification.
6. **Adopt Obiter as a conformance harness:** its ~3,300 rule-pinned tests can serve as
   a standing regression suite against any AGLC5 draft.

---

## 11. CRIT-DEEP re-verification results (against the PDF)

Eight findings flagged by the parity extraction were re-read against the source PDF on
2026-07-22. The key outcome: the parity reviews were **pre-fix audits** — every one of
the eight is **ENGINE-CORRECT in the current code**; no engine change is warranted. The
*guide* defects nonetheless stand for this critique.

| Finding | PDF p. | Verdict | Note |
|---|---|---|---|
| 1.8.3 Latin italics | 52 | **Engine-correct** | The engine's `LATIN_TERMS_EXCEPTIONS` already excludes *prima facie*, *ab initio*, *per se* etc. The guide defect that remains is the **proprietary, un-editioned Macquarie dependency** (DECISION-016, still open) — the rule's own do-not-italicise list is internally consistent. |
| 1.10.1 number commas | 54–55 | **Engine-correct** | `numbers.ts` inserts the thousands comma per the rule (16 tests pass) and omits it for page/paragraph/identification numbers. The guide's own "65,131" **page** pinpoint (with a comma) contradicts its page-number carve-out — a guide inconsistency, noted in §4. |
| 1.6.3 en-dash spans | 48 | **Engine-correct** | Conversion is span-scoped (skips digits/commas/hyphens/identifiers), so CCH `¶82-091` / `Pub L No 108-201` are preserved. The earlier "impossibility" framing was overstated — downgraded. |
| 2.1.14/3.5 short-title intro | 71–72 | **Engine-correct** | The *McGinty* example shows the `('McGinty')` introduction even though it is a substring; the engine now emits it (`formatShortTitleIntroduction`). |
| 2.3.1 MNC year thresholds | 79–80 | **Engine-correct** | The table's year ranges are genuine validity thresholds; the validator treats them as such. |
| 14.3.2 ECtHR preference | 227 | **New decision** | The rule is silent on reported-vs-application preference; Obiter's reported-preferred default is an inference → **DECISION-035** (open). |
| 9.2.6 vs 9.2.7 SC session | 171 | **Guide defect confirmed** | Real contradiction; the engine follows the rule text (omit the session). §4. |
| 5.5 "&" vs "and" | 118 | **Guide defect confirmed** | Real contradiction; the engine preserves "&" (DECISION-014). §4. |

Court practice-direction verification (DECISION-033) is resolved in
`docs/court-practices-review.md` (CRIT-004): the three queued items were confirmed against
primary sources, with link/date/clause corrections applied and interpretive preset
refinements recorded for sign-off.

---

*Cross-references: `docs/aglc4-audit.md`, `docs/decisions.md`,
`docs/appendix-verification.md`, `docs/erratum-audit.md`,
`docs/parity-reviews/`, `docs/modern-sources-proposal.md`,
`docs/court-practices-review.md`, `website/aglc5.html` (LETTER epic).*
