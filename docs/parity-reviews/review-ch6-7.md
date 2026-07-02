# Parity review — AGLC4 Chapters 6 (Books) and 7 (Other Sources)

Reference: `/Users/matthew.watt/aglc/aglc4-rule-reference.md` (`## 6 Books` at line 2685, `## 7 Other Sources` at line 2924, consolidated anomalies at line 7492).
Engine: `/Users/matthew.watt/aglc/obiter/src/engine/rules/v4/secondary/{books,other,other-media,authors,general}.ts`, dispatch in `/Users/matthew.watt/aglc/obiter/src/engine/engine.ts`.
Tests: `/Users/matthew.watt/aglc/obiter/tests/engine/chapter4-6.test.ts`, `chapter7.test.ts`.

Prior-audit reliability note: `docs/aglc4-audit.md` marks every CH6 row and nearly every CH7 row PASS, and `docs/aglc4-coverage.md` marks nearly everything "Full". Both are substantially overstated — see the MISMATCH findings below, several of which are enshrined by the project's own tests. `aglc4-coverage.md` also mislabels rule 6.8 as "Ebooks" (AGLC4 6.8 is Forthcoming Books; AGLC4 ch 6 has no ebook rule), and `aglc4-audit.md` swaps the labels of 7.11.3/7.11.4.

## Summary table

| Rule | Subject | Verdict | Severity |
|---|---|---|---|
| 6.1 | Book author (via 4.1) | MATCH | — |
| 6.2 | Book title italic | MATCH | — |
| 6.3.1 | Publisher normalisation / omission | GAP | Medium |
| 6.3.2 | Edition number | MISMATCH (superscript ordinal) | Medium |
| 6.3.3 | Revised editions ('rev ed') | GAP | Medium |
| 6.3.4 | Publication year (spans, en-dash) | GAP | Medium |
| 6.4 | Book pinpoints (no comma, ch/pt) | MATCH | — |
| 6.5 | Multi-volume books | GAP (formatter exists, not dispatchable; no 'bk') | High |
| 6.6.1 | Chapters in edited books | MATCH | — |
| 6.6.2 | Book with author and editor | GAP | Medium |
| 6.7 | Translated books | MISMATCH | High |
| 6.8 | Forthcoming books | GAP (formatter unreachable) + ANOMALY-RISK (invented `book.ebook` rule) | Medium |
| 6.9 | Audiobooks | MISMATCH | High |
| 7.1.1 | Reports — general | MATCH | — |
| 7.1.2 | Parliamentary papers/committee reports | MISMATCH (element order) | High |
| 7.1.3 | Royal commission reports | MISMATCH | High |
| 7.1.4 | Law reform commission publications | MATCH | — |
| 7.1.5 | ABS materials | MATCH | — |
| 7.2.1–7.2.2 | Research/working papers | MISMATCH (year-only date; number forced) | Medium |
| 7.2.3 | Parliamentary research papers | MISMATCH | High |
| 7.2.4 | Conference papers | GAP (type hard-coded 'Conference Paper') | Low |
| 7.2.5 | Theses | MISMATCH (italic title, should be quoted) | High |
| 7.3 | Speeches | GAP (named lecture cannot replace 'Speech') | Medium |
| 7.4 | Press/media releases | GAP (type hard-coded; no doc number; no body slot) | Medium |
| 7.5.1 | Parliamentary debates (Hansard) | MATCH | — |
| 7.5.2 | Submissions to inquiries | MISMATCH (inquiry not italic; trailing-comma bug when inquiry omitted; no pinpoint) | Medium |
| 7.5.3 | Evidence to parliamentary committees | ANOMALY-RISK (field named `jurisdiction` holds Location) | Low |
| 7.5.4 | Constitutional convention debates | MISMATCH (title not italic; no speaker parenthetical) | Medium |
| 7.6 | Dictionaries | GAP (publisher wrongly includable; no online form; no superscript entry marker) | Medium |
| 7.7 | Legal encyclopedias | MISMATCH | High |
| 7.8 | Looseleaf services | MISMATCH | High |
| 7.9 | IP materials | MISMATCH | High |
| 7.10 | Constitutive documents | MISMATCH | High |
| 7.11.1 | Printed newspapers | MATCH (sections/editions manual) | — |
| 7.11.2 | Electronic newspapers | MATCH | — |
| 7.11.3 | Periodicals/newsletters/magazines | MISMATCH (date parenthetical after periodical, should precede) | Medium |
| 7.11.4 | Unsigned/untitled/editorials | MISMATCH ('Editorial' treated as title fallback, not author replacement) | Medium |
| 7.12 | Written correspondence | MATCH (archive/'reproduced in' segments manual) | — |
| 7.13 | Interviews | MATCH ('Interview' hard-coded; 'Conversation' not selectable — low gap) | — |
| 7.14.1–7.14.2 | Film general/audiovisual | MISMATCH ('Directed by' invented; AGLC wants studio/production company) | High |
| 7.14.3 | Television series | MISMATCH (season/episode in wrong slot; trailing ", )" bug) | Medium |
| 7.14.4 | Radio segments and podcasts | GAP (`formatPodcast` exists but is never dispatched) | High |
| 7.15 | Internet materials | ANOMALY-RISK (no document-type field; smuggled via `date`) | Medium |
| 7.16 | Social media posts | MATCH (video time-pinpoint slot missing — low gap) | — |

Verdict counts: MATCH 12 · MISMATCH 17 · GAP 8 · ANOMALY-RISK 2 (plus risk flags on two other rows) · MANUAL-OK 0 (manual aspects noted inline) · UNVERIFIED 0 — all 39 rule rows above were checked against code; UI-form field coverage was NOT verified (engine/dispatch level only).

---

## Detail blocks

### 6.3.1 Publisher — GAP (Medium)
**Status:** FIXED (src/engine/rules/v4/secondary/books.ts — publisher optional/skipped when empty, omitted when identical to the author (ex 12), normalised: leading 'The' + corporate designators dropped (ex 7))
- **Rule (PDF p.124–125):** Publisher omitted where publisher = author (ex 12: `Law Institute of Victoria, *Legal Directory 2006* (2005)`), 'The'/corporate-status/geographic designations dropped, first-listed of multiple publishers only.
- **Engine:** `formatBook` (`books.ts:130`) unconditionally puts `data.publisher` first in the parenthetical. With no publisher the output is `(, 2005)` — there is no omit path, and no normalisation ('The Federation Press' passes through unchanged).
- **Fix:** make `publisher` optional and skip empty; add a light normaliser (leading 'The', Pty/Ltd/Co suffixes) or a validator warning.
- **Severity:** Medium (normalisation itself can be MANUAL-OK, but the empty-publisher `(, year)` output is a real bug for self-published works).

### 6.3.2 Edition number — MISMATCH (Medium)
**Status:** FIXED (src/engine/rules/v4/secondary/books.ts — new `formatEditionRuns` emits the ordinal indicator as a superscript run; string `formatEdition` kept for OSCOLA)
- **Rule (PDF p.125):** "The ordinal indicator ('th', 'nd', etc) is superscript."
- **Engine:** `formatEdition` (`books.ts:59–71`) returns a plain string `"7th ed"`; it is embedded into a single text run (`books.ts:137`). `FormattedRun` supports `superscript?: boolean` (`src/types/formattedRun.ts`) but it is never used here.
- **Fix:** have `formatEdition` return runs, emitting the ordinal suffix as `{ text: "th", superscript: true }`.
- **Severity:** Medium — affects every edition-bearing book citation visually.

### 6.3.3 Revised editions — GAP (Medium)
**Status:** FIXED (src/engine/rules/v4/secondary/books.ts — bare 'rev ed' for unnumbered revisions (ex 17), `revised` flag on book data) · dispatch passthrough HANDOFF (handoff/secondary.md §7)
- **Rule (PDF p.126):** 'rev ed' with no edition number follows the publisher (ex 17: `(Oxford University Press, rev ed, 2012)`); with a number, `3rd rev ed`.
- **Engine:** `formatEdition(edition, revised)` supports `revised` only when `edition > 1` (`books.ts:64` returns `""` for `edition <= 1`), and `formatBook`/`dispatchBook` hard-code `revised = false` (`books.ts:133`, engine.ts `dispatchBook` has no revised field). A bare 'rev ed' is unproducible; even numbered rev eds are unreachable from the engine dispatch.
- **Fix:** add `revised?: boolean` to book data + dispatch; emit `"rev ed"` when revised && no edition number.

### 6.3.4 Publication year — GAP (Medium)
**Status:** FIXED (src/engine/rules/v4/secondary/books.ts — `year: number | string` (spans '1984–88', '1975–'); 0/empty year omitted, fixing '(Publisher, 0)') · dispatch passthrough HANDOFF (handoff/secondary.md §7)
- **Rule (PDF p.126):** Multi-volume works take a year span (`1984–88`) or open span (`1975–`).
- **Engine:** `year: number` throughout (`books.ts:109`, `engine.ts:490` `toNumber(d.year, 0)`); spans impossible, and a missing year renders `(Publisher, 0)`.
- **Fix:** accept `year: number | string` (or a `yearText` override).

### 6.5 Multi-volume books — GAP (High)
**Status:** FIXED (src/engine/rules/v4/secondary/books.ts — `volumeLabel: "vol" | "bk"` (ex 27), string volumes, span years; exact-match tests exx 26, 27) · dispatch routing HANDOFF (handoff/secondary.md §7)
- **Rule (PDF p.127):** `... (Publisher, 1984–88) vol 4, 45`; 'bk' where the source styles volumes as books; Arabic numerals.
- **Engine:** `formatMultiVolumeBook` (`books.ts:164–204`) is implemented and unit-tested (chapter4-6.test.ts:792–819) but is **not imported by engine.ts and has no SourceType** — `SOURCE_DISPATCH` (engine.ts:1971–1975) maps only `book`, `book.chapter`, `book.translated`, `book.audiobook`, `book.ebook`, and `dispatchBook` (engine.ts:482) silently drops any `d.volume`. 'bk' is unsupported.
- **Fix:** read `d.volume` in `dispatchBook` and route to `formatMultiVolumeBook` (plus a `volumeLabel: "vol" | "bk"` option).
- **Severity:** High — a tested formatter that end users can never reach; volumes are silently discarded.

### 6.6.2 Books with an author and editor — GAP (Medium)
**Status:** FIXED (src/engine/rules/v4/secondary/books.ts — `editors` field emits ', ed «names»' after the title, never 'eds'; exact-match tests exx 34, 35) · dispatch/UI HANDOFF (handoff/secondary.md §7)
- **Rule (PDF p.129):** `JS Mill, *Utilitarianism*, ed Roger Crisp (Oxford University Press, 1998)` — 'ed' after the title, never 'eds'.
- **Engine:** No formatter, no source type, no field. `formatBookChapter` handles editor-only books; author+editor combination unrepresentable.
- **Fix:** add optional `editors` to book data; emit `, ed «names»` after the title before the parenthetical.

### 6.7 Translated books — MISMATCH (High)
**Status:** FIXED (src/engine/rules/v4/secondary/books.ts — ', tr «Translator»' after the title outside the parenthetical, optional '[trans of: …]' segment; wrong test rewritten to exx 36/39)
- **Rule (PDF p.129):** Template `«Author», «Translation Title», tr «Translator» («Publication Details»)` — the translator segment sits **after the title, outside the parentheses** (ex 36: `Sigmund Freud, *Civilization and its Discontents*, tr Joan Riviere (Hogarth Press, 1930)`). Optional trailing `[trans of: ...]`.
- **Engine:** `formatTranslatedBook` (`books.ts:306`) puts the translator **inside** the parenthetical, first: `(tr ${translator}, ${publisher}, ...)`. Test chapter4-6.test.ts:910 asserts the wrong form `"(tr Jane Smith, Publisher, 2020)"`.
- **Fix:** emit `, tr «Translator» ` after the title runs and remove it from `pubParts`; update the test; optionally support `[trans of: *Original* (Year)]` after pinpoint.
- **Severity:** High — every translated-book citation is malformed.

### 6.8 Forthcoming books — GAP + ANOMALY-RISK (Medium)
**Status:** FIXED (src/engine/rules/v4/secondary/books.ts — formatter verified, exact-match test ex 40) · reachability + `book.ebook` mislabel/decisions.md entry HANDOFF (handoff/secondary.md §7)
- **Rule (PDF p.130):** `(Miegunyah Press, forthcoming)`.
- **Engine:** `formatForthcomingBook` (`books.ts:338`) exists but is **unreachable** — no `book.forthcoming` SourceType, no dispatcher, and `dispatchBook` coerces year to a number so 'forthcoming' cannot be smuggled in. Meanwhile `book.ebook` / `dispatchBookEbook` (engine.ts:1001) carries the JSDoc "Rule 6.8: Ebooks are cited like printed books but with the ebook platform ... in square brackets" — **AGLC4 rule 6.8 is Forthcoming Books; no such ebook rule exists in the guide** (`docs/aglc4-coverage.md` repeats the error). The `[Platform]` bracket format is invented.
- **Fix:** add a `book.forthcoming` type (or `forthcoming: true` flag on `book`); re-source or clearly mark `book.ebook` as a non-AGLC extension and log it in `docs/decisions.md`.

### 6.9 Audiobooks — MISMATCH (High)
**Status:** FIXED (src/engine/rules/v4/secondary/books.ts — single '(Audiobook, Publisher, Year)' parenthetical, narrator deprecated/ignored, 'audiobook(s)' dropped from publisher names; exact-match tests exx 41, 42)
- **Rule (PDF p.130):** Template `«Author», «Title» (Audiobook, «Publisher», «Publication Year») «Time Pinpoint»` — capitalised 'Audiobook' **opens the single parenthetical**; there is no narrator element; 'audiobook' is dropped from the publisher's name if part of it.
- **Engine:** `formatAudiobook` (`books.ts:374–414`) outputs `(Publisher, Year) (audiobook, narrated by Narrator)` — a second parenthetical, lowercase, with an invented 'narrated by' element. The JSDoc misquotes the rule. Test chapter4-6.test.ts:940 asserts the wrong form.
- **Fix:** emit `(Audiobook, ${publisher}, ${year})`, drop the narrator element (or keep as opt-in non-AGLC extra), update test.

### 7.1.2 Parliamentary papers / committee reports — MISMATCH (High)
**Status:** FIXED (src/engine/rules/v4/secondary/other.ts — committee now precedes the legislature; `legislature` field + pinpoint added; exact-match tests exx 8, 12) · dispatch passthrough HANDOFF (handoff/secondary.md §9)
- **Rule (PDF p.132–133):** Author slot is `«Committee», «Legislature»` — ex 8: `Senate Standing Committee for the Scrutiny of Bills, Parliament of Australia, *Alert Digest* (Digest No 9 of 2007, 13 August 2007)`.
- **Engine:** `formatParliamentaryReport` (`other.ts:219`) emits `${jurisdiction}, ${committee}, ` — the two elements are **reversed** (legislature/jurisdiction first). No test covers this rule.
- **Fix:** swap to `${committee}, ${legislature}, `; rename `jurisdiction` → `legislature` for clarity. ('No 9 of 2007' works today by passing `number: "9 of 2007"` — acceptable.)

### 7.1.3 Royal commission reports — MISMATCH (High)
**Status:** FIXED (src/engine/rules/v4/secondary/other.ts — authorless, '(Document Type, Full Date)' parenthetical, string dates, vol + pinpoint; exact-match tests exx 13, 15) · dispatch/UI HANDOFF (handoff/secondary.md §10)
- **Rule (PDF p.133):** Cited **with no author**; ex 13: `*Royal Commission into Trade Union Governance and Corruption* (Final Report, December 2015) vol 2.` [Not: JD Heydon, ...]. Parenthetical is (Document Type, Full Date).
- **Engine:** `formatRoyalCommissionReport` (`other.ts:251–269`) emits `${commissionName}, *Title* (${year}) vol N` — it (a) prepends the commission as an author, (b) has no document-type slot, (c) takes a bare numeric year instead of a full date ('December 2015' impossible).
- **Fix:** drop the author element (commission name is normally the italic title itself); reuse `formatReport` with `authors`/`body` empty, `reportType`, and a string date; keep `vol` support.

### 7.2.1–7.2.2 Research/working papers — MISMATCH (Medium)
**Status:** FIXED (src/engine/rules/v4/secondary/other.ts — number optional (no 'No ' for unnumbered papers), full-date support, pinpoint + URL; exact-match tests exx 28, 30) · dispatch passthrough HANDOFF (handoff/secondary.md §11)
- **Rule (PDF p.135–136):** `(«Document Type» No «Number», «Institution», «Full Date»)` — full date (ex 28: 'January 2017', ex 30: 'December 2006'); document number only if prominently indicated.
- **Engine:** `formatResearchPaper` (`other.ts:351–353`) hard-emits `${documentType} No ${number}, ${institution}, ${year}` with `year: number` — (a) month-level dates impossible; (b) `number` is required, so unnumbered papers render `Working Paper No , ...`.
- **Fix:** make `number` optional (omit `No` when absent); accept a string date.

### 7.2.3 Parliamentary research papers — MISMATCH (High)
**Status:** FIXED (src/engine/rules/v4/secondary/other.ts — individual author leads; provider + legislature + full date inside the parenthetical; exact-match tests exx 33, 36) · dispatch passthrough HANDOFF (handoff/secondary.md §11)
- **Rule (PDF p.136–137):** ex 33: `Amanda Biggs, 'Medicare: A Quick Guide' (Research Paper, Parliamentary Library, Parliament of Australia, 12 July 2016)` — the **individual author leads**; 'Parliamentary Library, «Legislature»' fills the institution/forum slot inside the parenthetical.
- **Engine:** `formatParliamentaryResearchPaper` (`other.ts:372–393`) puts the library/body **as the author** and emits `(DocType No Number, Year)` — no individual-author slot, no legislature in the parenthetical, year-only date, `No` forced. Example 33 is unproducible.
- **Fix:** structure as `authors`, quoted title, `(docType[ No n], provider, legislature, date)`.

### 7.2.4 Conference papers — GAP (Low)
**Status:** FIXED (src/engine/rules/v4/secondary/other.ts — `documentType` reproduced from the source, defaulting to 'Conference Paper'; exact-match tests exx 37, 38)
- **Rule (PDF p.137):** Document type reproduced from the source — ex 38 uses 'Seminar Paper'.
- **Engine:** `formatConferencePaper` (`other.ts:419`) hard-codes `Conference Paper`.
- **Fix:** add optional `documentType` defaulting to 'Conference Paper'.

### 7.2.5 Theses — MISMATCH (High)
**Status:** FIXED (src/engine/rules/v4/secondary/other.ts — thesis titles now in single quotation marks (roman), full-date support; exact-match test ex 39)
- **Rule (PDF p.135, 137–138):** Theses use the 7.2.1 template — title in **single quotation marks**, not italics (ex 39: `Antonio Kurt Esposito, 'The History of the Torrens System ...' (LLM Thesis, The University of Adelaide, 2000)`).
- **Engine:** `formatThesis` (`other.ts:445`) calls `formatItalicTitle` — thesis titles are italicised. Also year-only date.
- **Fix:** switch to `formatQuotedTitle`; accept string date.

### 7.3 Speeches — GAP (Medium)
**Status:** FIXED (src/engine/rules/v4/secondary/other.ts — `speechType` replaces 'Speech' with a leading 'The' stripped; exact-match tests exx 42, 43) · dispatch/UI HANDOFF (handoff/secondary.md §12)
- **Rule (PDF p.138):** A named lecture's name **replaces** 'Speech' (ex 42: `(Lucinda Lecture, Monash University, 24 October 2013)`); leading 'The' and series ordinals dropped; city used only when no forum.
- **Engine:** `formatSpeech` (`other.ts:476`) hard-codes `(Speech, ${event}, ${date})`. Named lectures can only be produced by misusing the `event` field, which then double-emits 'Speech, Lucinda Lecture, ...'.
- **Fix:** add optional `speechType` (default 'Speech'); strip leading 'The' from it.

### 7.4 Press and media releases — GAP (Medium)
**Status:** FIXED (src/engine/rules/v4/secondary/other.ts — `releaseType`, `documentNumber` (ex 45), in-parenthetical `issuingBody` dropped when equal to the author, pinpoint; exact-match tests exx 45, 46) · dispatch passthrough HANDOFF (handoff/secondary.md §13)
- **Rule (PDF p.139):** `(«Release Type» «Document Number», «Body», «Full Date»)` — type taken from the source ('Press Release', 'Press Statement'); document number where printed (ex 45: `(Media Release MSPA 172/09, 22 May 2009)`); body element dropped only when identical to author.
- **Engine:** `formatPressRelease` (`other.ts:509`) hard-codes `(Media Release, ${date})` — no release-type override, no document number, no body-inside-parenthetical slot (the `body` field is used as the *author*).
- **Fix:** add `releaseType` (default 'Media Release'), `documentNumber`, and an optional in-parenthetical `issuingBody`.

### 7.5.2 Submissions to inquiries — MISMATCH (Medium)
**Status:** FIXED (src/engine/rules/v4/secondary/other.ts — inquiry italic and omitted when unstated (stray-comma bug gone, ex 54), pinpoint added; exact-match tests exx 49, 54) · dispatch pinpoint passthrough HANDOFF (handoff/secondary.md §14)
- **Rule (PDF p.140–141):** Inquiry name is **italicised** (`«*Name of Inquiry*»`, ex 49); inquiry omitted where unstated or for royal commissions; pinpoints allowed.
- **Engine:** `formatSubmissionToInquiry` (`other.ts:578`) emits the inquiry as plain text in the same run as the committee; when `inquiry` is empty the output ends `... to Royal Commission into Family Violence, (29 May 2015)` — stray `, ` before the date. No pinpoint parameter.
- **Fix:** italic run for inquiry; skip the comma+inquiry when absent; add pinpoint.

### 7.5.3 Evidence to parliamentary committees — ANOMALY-RISK (Low)
**Status:** FIXED (src/engine/rules/v4/secondary/other-media.ts — `location` field added; `jurisdiction` kept as deprecated alias; exact-match tests exx 55, 56) · dispatch/UI relabel HANDOFF (handoff/secondary.md §15)
- **Rule (PDF p.142):** `Evidence to «Committee», «Legislature», «Location», «Full Date», «Pinpoint» («Speaker»)`.
- **Engine:** `formatParliamentaryEvidence` (`other-media.ts:185`) emits `Evidence to committee, parliament, jurisdiction, date, page (witness)` — output order matches **only if** callers put the hearing city in the field named `jurisdiction`. Any caller feeding an actual jurisdiction ('Commonwealth') produces a wrong citation with no warning.
- **Fix:** rename the field to `location`.

### 7.5.4 Constitutional convention debates — MISMATCH (Medium)
**Status:** FIXED (src/engine/rules/v4/secondary/other-media.ts — title italic, `(speaker)` suffix, non-AGLC vol slot no longer emitted; exact-match tests exx 57, 58) · dispatch passthrough HANDOFF (handoff/secondary.md §16)
- **Rule (PDF p.142–143):** `«*Title*», Location, Date, Page («Speaker»)` — title italic; speaker in trailing parentheses (ex 57).
- **Engine:** `formatConstitutionalConvention` (`other-media.ts:223–235`) joins everything as one plain-text run — convention title not italic — and has **no speaker element** (also inserts a non-AGLC `vol` slot).
- **Fix:** italicise `conventionName`; add `(speaker)` suffix.

### 7.6 Dictionaries — GAP (Medium)
**Status:** FIXED (src/engine/rules/v4/secondary/other-media.ts — publisher no longer emitted, online '(online at …)' form, homograph `entryType` marker; exact-match tests exx 59, 61, 62) · dispatch/UI HANDOFF (handoff/secondary.md §17)
- **Rule (PDF p.143–144):** Hard copy `«*Title*» («Edition» ed, «Year») 'entry' (def n)` — **no publisher element**; online form `(online at «Retrieval Date»)`; homograph markers with superscript numbers (`v²`).
- **Engine:** `formatDictionary` (`other-media.ts:250`) optionally injects `publisher` into the parenthetical (would be wrong whenever supplied) and has no online form and no superscript support for entry markers.
- **Fix:** remove publisher from the AGLC4 path (keep for OSCOLA if needed); add `online + retrievedDate` variant emitting `(online at ...)`.

### 7.7 Legal encyclopedias — MISMATCH (High)
**Status:** FIXED (src/engine/rules/v4/secondary/other-media.ts — publisher leads, vol before '(at …)', title number/name, online form, bracketed paragraphs; exact-match tests exx 64, 65) · dispatch passthrough HANDOFF (handoff/secondary.md §18)
- **Rule (PDF p.144):** `«Publisher», «*Title*», vol «N» (at «Date») «Title No» «Title Name», '«Ch No» «Ch Name»' [«Para»]` (ex 64: `LexisNexis, *Halsbury's Laws of Australia*, vol 15 (at 25 May 2009) 235 Insurance, '2 General Principles' [235-270]`); online form `(online at «Retrieval Date»)`.
- **Engine:** `formatLegalEncyclopedia` (`other-media.ts:286–304`) emits `*Title* (at Date) vol N, TitleNo 'Topic' [para]` — **publisher missing entirely**, volume placed after the date parenthetical instead of before it, no online variant.
- **Fix:** add `publisher` first; move `vol` before `(at ...)`; add online form.

### 7.8 Looseleaf services — MISMATCH (High)
**Status:** FIXED (src/engine/rules/v4/secondary/other-media.ts — 'Author, Publisher, *Title*, vol N (at Service/Date) [para]' order, online form, ¶ passthrough; exact-match tests exx 67, 70) · dispatch passthrough HANDOFF (handoff/secondary.md §18)
- **Rule (PDF p.145):** Print `«Publisher», «*Title*», vol «N» (at «Service No or Date») «[para]»` (ex 67: `Neil J Williams, LexisNexis Butterworths, *Civil Procedure: Victoria*, vol 1 (at Service 299) [21.01.1]`); online `(online at «Retrieval Date»)`; ¶ symbol passthrough without brackets.
- **Engine:** `formatLooseleaf` (`other-media.ts:318–341`) emits `Author, *Title* (Publisher, Date) vol N, para` — publisher inside the parenthetical alongside the date (AGLC puts it before the title), volume after the parenthetical (AGLC before), no `at`/Service semantics, no online form.
- **Fix:** reorder to `authors?, publisher, *title*, vol N (at ...) para`.

### 7.9 IP materials — MISMATCH (High)
**Status:** FIXED (src/engine/rules/v4/secondary/other-media.ts — italic identifier segment, 'filed/lodged on', status parenthetical; invented Title/Applicant deprecated; exact-match tests exx 71, 76) · dispatch/UI rebuild HANDOFF (handoff/secondary.md §19)
- **Rule (PDF p.146–147):** Whole citation **italicised**: `*US Trademark Registration No 4938522*, filed on 6 December 2013 (Registered on 12 April 2016)` — jurisdiction code + IP type + qualifying word + No + number, then `filed/lodged on «Date»`, then a status-change parenthetical.
- **Engine:** `formatIpMaterial` (`other-media.ts:355–371`) emits plain text `IPType No Number, Title, Applicant, Date` — no italics anywhere, no 'filed on', no status parenthetical, and invented Title/Applicant elements that appear in no AGLC template.
- **Fix:** rebuild: italic run `«Jurisdiction» «Type» «Qualifier» No «Number»`, plain `, filed on «date»`, optional `(«Status» on «date»)`.

### 7.10 Constitutive documents — MISMATCH (High)
**Status:** FIXED (src/engine/rules/v4/secondary/other-media.ts — '*DocType*, Company (at Date) pinpoint', company designators stripped; exact-match test ex 78) · dispatch date passthrough HANDOFF (handoff/secondary.md §20)
- **Rule (PDF p.147):** `«*Document Type*», Company Name (at «Full Date») «Pinpoint»` (ex 78: `*Constitution*, ASX (at 5 October 2012) cl 1.1`) — document type italic and first; date mandatory (last update or retrieval); pinpoints per 3.1.4, never pages.
- **Engine:** `formatConstitutiveDocument` (`other-media.ts:385–393`) emits `CompanyName, DocumentType, pinpoint` — order inverted, no italics, **no date element at all**, page pinpoints not rejected.
- **Fix:** italic docType first, then company, then `(at date)` (new required field), then pinpoint.

### 7.11.3 Periodicals/newsletters/magazines — MISMATCH (Medium)
**Status:** HANDOFF (engine wiring — `dispatchPeriodical` lives in engine.ts, outside this agent's scope; handoff/secondary.md §21)
- **Rule (PDF p.149):** `«Author», '«Title»' («Date/Month/Season») «*Periodical*» «Pinpoint»` — the date parenthetical comes **before** the periodical name (ex 89: `Jill Lepore, 'The History Test' (27 March 2017) *The New Yorker* 66`).
- **Engine:** `dispatchPeriodical` (`engine.ts:1245–1292`) emits `'Title' [vol(issue)] *Periodical* (Date) Page` — parenthetical after the name, plus volume/issue elements that don't belong in this rule (vol/issue periodicals must be cited under ch 5).
- **Fix:** move `(datePeriod)` before the italic name; drop vol/issue from this path (route them to `journal.article`).

### 7.11.4 Unsigned/untitled articles and editorials — MISMATCH (Medium)
**Status:** FIXED (src/engine/rules/v4/secondary/other-media.ts — 'Editorial, ' always leads with the quoted title kept (ex 91); `titleIsDescription` unquoted descriptions (ex 92); masking substring tests replaced) · dispatch route for formatEditorial HANDOFF (handoff/secondary.md §22)
- **Rule (PDF p.150):** 'Editorial' replaces the **author** while the quoted title is kept (ex 91: `Editorial, 'Medicare by Name, No Longer by Nature', ...`); untitled pieces take an unquoted description ('Letter to the Editor', ex 92).
- **Engine:** `formatEditorial` (`other-media.ts:455–461`) prints 'Editorial' only **when there is no title**; with a title, the leading `Editorial, ` is never emitted (test chapter7.test.ts:285–299 only checks substrings, masking this). Unquoted descriptions are impossible — `formatNewspaper` always wraps `title` in quotes.
- **Fix:** in `formatEditorial`, always lead with `Editorial, ` then the quoted title if present; add a `descriptionInsteadOfTitle` flag to `formatNewspaper` for ex 90/92-style pieces.

### 7.14.1–7.14.2 Film and audiovisual — MISMATCH (High)
**Status:** FIXED (src/engine/rules/v4/secondary/other-media.ts — 'Directed by' removed; production company + version details + time pinpoint; exact-match tests exx 99, 100) · dispatch rework HANDOFF (handoff/secondary.md §23)
- **Rule (PDF p.152–153):** `«*Title*» («Version Details», «Studio/Production Company», «Year»)` — ex 100: `*The Dark Knight* (Warner Brothers Pictures, 2008) 0:54:58–0:55:11`. No director element exists in AGLC4.
- **Engine:** `formatFilm` (`other-media.ts:554–561`) emits `*Title* (Directed by «director», «year»)` — 'Directed by' is invented; `dispatchFilmTvMedia` (`engine.ts:1363–1368`) even falls back to `director` from `author`/`producer`. No version-details slot, no time pinpoint.
- **Fix:** replace director with `studio/productionCompany` (first-listed only), optional leading `versionDetails`, optional time pinpoint.

### 7.14.3 Television series — MISMATCH (Medium)
**Status:** FIXED (src/engine/rules/v4/secondary/other-media.ts — 'Season X, Episode Y' built in the episode-title slot, empty parts filtered (dangling ', )' gone), time pinpoint + URL; exact-match tests exx 101, 103, 105) · dispatch rework HANDOFF (handoff/secondary.md §23)
- **Rule (PDF p.153):** Untitled episodes are identified **in the episode-title slot**: `'Season 9, Episode 10', *Gruen* (Australian Broadcasting Corporation, 2017)`.
- **Engine:** `dispatchFilmTvMedia` (`engine.ts:1342–1360`) pushes `Season X`/`Episode Y` into the production parenthetical (`(Season 9, Episode 10, ABC, 2017)`) instead of the quoted title. Additionally it calls `formatTvSeries` with `date: ""`, and `formatTvSeries` (`other-media.ts:578`) concatenates `" (" + network + ", " + date + ")"` — producing a dangling `", )"`, e.g. `(Australian Broadcasting Corporation, 2017, )`.
- **Fix:** build `'Season X, Episode Y'` as the quoted episode title when no title exists; filter empty parts before joining the parenthetical.

### 7.14.4 Radio segments and podcasts — GAP (High)
**Status:** FIXED (src/engine/rules/v4/secondary/other-media.ts — producer element (omitted when equal to series title), time pinpoint; exact-match tests exx 106, 108, 109) · dispatch route (formatPodcast is still unreachable) HANDOFF (handoff/secondary.md §23)
- **Rule (PDF p.154):** `'«Episode»', «*Series*» («Producer», «Full Date») «Pinpoint» <URL>` (ex 108).
- **Engine:** `formatPodcast` (`other-media.ts:593–616`) implements roughly the right shape but is **dead code for AGLC4** — it is not imported by `engine.ts` and no SourceType maps to it (grep: only `other-media.ts` itself and OSCOLA/NZLSG-adjacent files reference it). Podcasts entered as `film_tv_media` fall through to `formatFilm` and render `*Serial* (Directed by This American Life, ...)`.
- **Fix:** add a `podcast`/`radio` medium branch in `dispatchFilmTvMedia` (or a distinct SourceType) routing to `formatPodcast`.

### 7.15 Internet materials — ANOMALY-RISK (Medium)
**Status:** FIXED (src/engine/rules/v4/secondary/other-media.ts — `documentType` field ('(Type, Date)' / '(Type)'), author omitted when identical to the website; smuggled-date tests rewritten to exx 112, 113) · dispatch/UI HANDOFF (handoff/secondary.md §24)
- **Rule (PDF p.155):** Parenthetical is `(«Document Type», «Full Date»)` with a date cascade (last update → creation → partial → omit); `(Web Page)` alone when no date (ex 112).
- **Engine:** `formatInternetMaterial` (`other-media.ts:630–654`) has **no documentType field** — the parenthetical prints whatever is in `date`. Tests pass `date: "Web Page"` and `date: "Blog Post, 18 October 2017"` (chapter7.test.ts:369, 393). Output can be made correct, but only by smuggling the type into the date field; any caller/UI that stores a real date yields `(18 October 2017)` with the mandatory document type missing. The author-identical-to-website omission (ex 112) is also fully manual.
- **Fix:** add `documentType` (default 'Web Page'), render `(${type})` or `(${type}, ${date})`; auto-omit author when it equals the website title.

---

## Cross-cutting notes

- Guide-internal anomalies for these chapters (6.4 ex 25 punctuation, 6.6.2 'multiples' typo, 6.7 ex 39 'Barns'/missing stop, 7.7 ex 64 hyphen span, 7.10 ex 79 partial date, 7.12 'phase' typo, 7.15 'Example' label) are documentation quirks in AGLC4 itself — none require engine behaviour; the 7.10 partial-date anomaly is worth a `decisions.md` entry if a date field is added there (rule says Full Date, guide's own example uses month–year).
- Tests enshrine the wrong behaviour for 6.7 (chapter4-6.test.ts:910) and 6.9 (chapter4-6.test.ts:940); the 7.11.4 test masks the missing `Editorial,` prefix by substring-only assertions. Fixes to those rules must update the tests in the same change.
- `docs/aglc4-audit.md` (CH6 all PASS; CH7 PASS except three rows) and `docs/aglc4-coverage.md` ("Full" nearly everywhere) should be corrected — both misstate 6.8 (ebooks vs forthcoming) and neither caught the 7.1.2 order inversion, 7.2.5 italic thesis title, 7.7/7.8 missing publisher, 7.9/7.10 wrong structure, or the unreachable multi-volume/forthcoming/podcast formatters.

## Wave-1 fix addendum (secondary-sources agent)

- The low gaps noted inline on MATCH rows were also fixed in `src/engine/rules/v4/secondary/other-media.ts`: 7.13 `interviewType` ('Conversation', ex 96) and 7.16 `timePinpoint` for videos (ex 114), each with exact-match tests in `tests/engine/chapter7.test.ts`.
- Guide-example capitalisation anomalies surfaced while writing exact-match tests (rule 1.7 text implemented per DECISION-012): ex 2 (rule 7.1.1) prints 'Out' where rule 1.7 lowercases the preposition; ex 42 (rule 6.9) prints 'Without'/'In'. Test comments record each.
- All dispatch/UI wiring items are specified in the wave-1 handoff file (`handoff/secondary.md`).
