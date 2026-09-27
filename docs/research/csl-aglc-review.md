# CSL AGLC4 style review (upstream contribution prep)

Date: 27 September 2026. Target: `australian-guide-to-legal-citation.csl` in citation-style-language/styles (master at 2e93558). Authority: core AGLC4 only.

Scratch clone: `/private/tmp/claude-502/-Users-matthew-watt-aglc/51d93f6b-d44e-4fa2-a5fe-04e42399f76b/scratchpad/csl/styles`. Branch: `aglc4-pinpoint-labels`, not committed or pushed.

## Summary

- Pinpoints print as bare numbers for every locator type. This is fixed for first citations and "Ibid" citations. Subsequent `(n x)` citations are left alone because PR #8140 rewrites that branch.
- The en-GB locale's "edn" was printing where AGLC4 uses "ed". Fixed.
- The superscript ordinal candidate was wrong. AGLC4 r 6.3.2 requires superscript, so the current style is correct. PR #8140 removes the superscript, which conflicts with r 6.3.2.
- `[1990] 1 AC` style years and a treaty branch were not implemented. See below.

## #8140 overlap map

PR #8140 (aarontimo) touches:

- info: authors, contributors, `<updated>`
- locale: removes the superscript ordinal terms
- macros: `author-note` (substitute), `title`, `title-short-flag`, `title-short`, `date-parenthesis` (removes the encyclopedia and dictionary branches and a comment), `publisher` (paper-conference, newspaper), `volume-book`, `article-case-info` (case container-title form)
- removes the `title-dictionary`, `titles-encyclopedia` and `archive` macros; changes the `URL` macro
- citation: the whole `position="subsequent"` branch, the archive group, and `title-short-flag` in the full cite
- bibliography: removes the dictionary and encyclopedia calls; adds `title-short-flag`

Our change touches: `<contributor>`, `<updated>`, new terms at the top of `<terms>`, a new `pinpoint` macro placed before `book-container`, and the locator line in `ibid-with-locator` and in the full citation.

Checked with `git merge-file` against master with #8140 applied. The only conflicts are the two metadata lines (the contributor insertion point and `<updated>`), which are unavoidable and trivial. The merged file validates, and its output matches the samples below.

## Findings

| # | Rule (PDF p) | Current | Expected | CSL 1.0.2? | Overlaps #8140? | Status |
|---|---|---|---|---|---|---|
| a1 | 3.1.4 (p 94); 3.4 (p 100) | `(NSW) 5(2)`, `Ibid 5–6`, `3` (part) | `s 5(2)`, `ss 5–6`, `pt 3`, `ch 2`, `app 1`, `r 8.01` | yes (short locator terms and a label) | no (first cite and ibid only) | Implemented |
| a2 | 1.1.6 (pp 29–31) | `FCA 358, 90` | `FCA 358, [90]` | yes | no | Implemented |
| a3 | 3.1.4 (p 94); 8.7 (p 165) | legislation `4` | `para 4` for bill, legislation, regulation and treaty | yes | no | Implemented |
| a4 | 6.4 (p 127) | book `(Hart Publishing, 2011) 5` | `… 2011) ch 5` | yes | no | Implemented |
| a5 | 8.7 (p 165) | treaty `14` | `art 14` | yes (`article-locator` term) | no | Implemented, label only |
| a6 | 1.1.6 | `Ibid 6` for a note locator | `Ibid n 6` | yes | no | Implemented |
| a7 | 1.4.3 / 1.1.6 in subsequent refs | `(n 4) 7` | `(n 4) s 7` | yes | **yes**, #8140 rewrites the subsequent branch | Deferred: a one-line follow-up after #8140 (use `<text macro="pinpoint"/>`) |
| a8 | 3.2 (p 99) `cl`; 3.1.4 `div`, `sch`, `sub-s` | not selectable | `cl 83`, etc | **no**: there are no CSL or Zotero locator types for clause, division or schedule | no | Not expressible |
| a9 | 1.1.7 (p 31) paragraph spans | `[90–97]` after the fix | `[90]–[97]` | **no**: CSL cannot split a locator range | no | Limitation, noted |
| e | 6.3.2 (p 125) | `15th edn` (en-GB locale term) | `15th ed` | yes (term override) | no | Implemented |
| d | 6.3.2 (p 125, checked on the PDF) | superscript `15ᵗʰ` | superscript: "The ordinal indicator … should appear in superscript" | n/a | yes (#8140 removes it) | Current is correct. No change. #8140's removal conflicts with r 6.3.2. |
| b | 2.2.1 (p 74) | `(1990) 1 AC` for year-organised series that have a volume | `[1990] 1 AC` | **no** without a series lookup or fragile heuristic; the item data cannot show whether a series is organised by year | yes (#8140 edits the same `date-parenthesis` block) | Not implemented |
| c | ch 8 (pp 158–165) | no treaty branch; Zotero has no treaty type (the style uses `manuscript` as a stand-in) | full treaty form | partly (CSL has `treaty`, but Zotero never emits it) | no | Needs decision / out of scope; too large for a minimal PR |

Needs decision: none on the AGLC4 side. Whether to add a full treaty branch is an upstream scope question, not a rule question.

## Implemented diff (summary)

- New terms at the top of `<terms>`: edition (short) `ed`; section `s/ss`; chapter `ch/chs`; part `pt/pts`; paragraph `para/paras`; article-locator `art/arts`; appendix `app/apps`; rule `r/rr`; note `n/nn`. These use no `xml:lang`, so they apply in any UI locale; verified with both en-GB and en-US.
- New `pinpoint` macro:
  - a page locator prints as a bare number
  - a paragraph locator prints as `[n]`, or as `para n` for bill, legislation, regulation and treaty
  - any other locator prints its short label with periods stripped (r 1.6.1)
- `ibid-with-locator` and the full citation use `pinpoint`.
- Adds `<contributor>` Matthew Watt; `<updated>` 2026-09-27.

## Validation performed

- CSL 1.0.2 schema: `jing -c csl.rnc` from citation-style-language/schema, tag v1.0.2. Passes before and after (exit 0).
- `xmllint --noout`: well-formed.
- The repo's rspec suite was **not run**. It needs Ruby 3.3.6; this machine has only system Ruby 2.6, and gem native builds failed. Instead a script re-checked the spec rules that matter here: no undefined or unused macros, the license text is exact, and indentation is 2-space with no tabs. The upstream CI bot will run the full suite.
- Merge simulation with #8140: only the metadata conflicts noted above.

## Before / after (citeproc-js 2.4.x, en-GB)

| Case | Before | After |
|---|---|---|
| Case, page | *Mabo v Queensland [No 2]* (1992) 175 CLR 1, 30 | unchanged |
| Case MNC, para | … [2018] FCA 358, 90 | … [2018] FCA 358, [90] |
| Ibid, para range | Ibid 90–97 | Ibid [90–97] |
| Act, section | *Crimes Act* *1900* (NSW) 5(2) | … (NSW) s 5(2) |
| Ibid, sections | Ibid 5–6 | Ibid ss 5–6 |
| Act, part / chapter / para | 3 / Ibid 2 / Ibid 4 | pt 3 / Ibid ch 2 / Ibid para 4 |
| Book, edition | (LexisNexis Butterworths, 15ᵗʰ edn, 2013) 25 | (…, 15ᵗʰ ed, 2013) 25 |
| Book, chapter | (Hart Publishing, 2011) 5 | (Hart Publishing, 2011) ch 5 |
| Journal, page | … 35(1) *MULR* 1, 5 | unchanged |
| Ibid, note | Ibid 6 | Ibid n 6 |
| Treaty type, article | ‘ICCPR’ 171, 14 | ‘ICCPR’ 171, art 14 (rest of the treaty form still generic, see c) |
| Subsequent | *Crimes Act* (n 4) 7 | unchanged (deferred, a7) |

## Second review (27 Sep 2026)

An independent review re-checked every rule citation, abbreviation, schema result and the non-overlap with #8140, and all of those passed. It required the following changes, all now applied:

- Line locators stay bare (r 2.7). They previously fell through to the else branch and printed `l 12`.
- A sub verbo locator prints in quotes (r 7.6). It previously printed `sv legal`.
- PR body: the wording is corrected, and the known limits now include paragraph lists (`[90, 92]`), the bare locator in `(n X)` references until the #8140 follow-up, and the comma before treaty pinpoints. It also notes that #8140 removes the superscript ordinals, which r 6.3.2 requires.

After the fixes, the style re-validates against CSL 1.0.2, and the samples render `…, 2499–2517`, `…, 'demise'`, `[90]`, `s 5(2)` and `para 4`.

**PR opened 27 Sep 2026:** https://github.com/citation-style-language/styles/pull/8344, from the `karwalski:aglc4-pinpoint-labels` branch. It's authored under the GitHub noreply address.
