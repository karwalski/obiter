# Phase 2 — In-Depth Web Test Plan (Obiter v1.14.1, Word on the web)

Executed by the agent over a headed Playwright/CDP session against the M365 trial tenant,
with Obiter v1.14.1 loaded from the beta slot. Companion to `release-testing-1.14.md`
(Phase 1 desktop pass); this plan goes deeper and covers every feature area.

## Harness and conventions

- Driving: Playwright attached over CDP (:9222); the agent drives both the document canvas
  and the task-pane iframe. Evidence per failure: screenshot + extracted document text +
  status-log copy.
- Documents: the agent may create, duplicate, and modify documents freely. **Lane
  Filterings.docx is duplicated first and all destructive scenarios run on copies** —
  the original stays untouched as the known-good baseline.
- Every failure is filed as a story (`WEB-0xx` series) in `footnote-backlog.md` with repro
  steps, expected vs actual, and a severity call (release-blocker vs post-release patch).
- Formatting checks are **exact-string** (including punctuation and italics), traced to
  AGLC4 rule numbers per project policy. Ambiguities go to `docs/decisions.md`, never guessed.
- Word-online-specific risk areas to watch throughout: content-control behaviour differences
  from desktop, XML-part persistence over the web session, MemoryRouter navigation, focus
  handling in the pane iframe, co-authoring autosave timing.

## 1. Session and environment

1.1 Pane loads clean (no console errors in the add-in iframe), footer shows v1.14.1.
1.2 Reload the browser tab → pane reloads, library intact, no duplicate XML parts created.
1.3 Close and reopen the pane from the ribbon → MemoryRouter returns to a sane default view;
    no blank-pane state.
1.4 Two documents open in two tabs → each pane instance sees only its own document's library.

## 2. Document lifecycle and store persistence (BUG-003 regression territory)

2.1 New blank document → open pane → empty library presented with the "new store" state
    (not a diagnostic banner); insert one citation; store part created once.
2.2 Duplicate Lane Filterings (SharePoint copy) → open copy → full library loads; counts match
    the original; citations still linked (click a footnote citation → Edit opens populated).
2.3 Repeated open/close/reload cycles (×5) on the copy → library count never changes;
    no silent empty-library state at any point.
2.4 Copy a footnoted section from the copy into a brand-new document → new doc's pane shows
    the empty-library-with-markers diagnostic and offers Scan & Repair (feeds §8).
2.5 Autosave interplay: insert a citation, immediately reload the tab → citation and store
    entry both survive (no race between persist and web autosave).

## 3. Insert Citation — source-type depth

Representative exact-string checks across the chapters, in real footnotes. For each:
insert → verify footnote text and italics → verify library entry → verify bibliography entry.

3.1 Ch 2 cases: reported (`Smith v Land & House Property Corporation (1884) 28 Ch D 7` —
    BUG-001 string), medium-neutral, unreported (no MNC — party/judges/fullDate fields per
    BUG-005(d)), popular case name, pinpoint variants.
3.2 Ch 3 legislation: Act with year italicised correctly per 3.1.1, delegated legislation,
    gazette, bill, explanatory memorandum.
3.3 Ch 4–5 secondary: journal article (incl. online-only), book (edition, editors, chapter-in-book),
    ebook (renders as book + URL, no Platform field — DECISION-019).
3.4 Ch 6–7: reports, working papers, theses, speeches, press releases.
3.5 Ch 7A/AI: GenAI citation type (present in Recents) — output format + subsequent refs.
3.6 Ch 8–14 other domestic: hansard (`[Year] Court No` recognition), government documents,
    treaty-adjacent domestic instruments.
3.7 Ch 15–20 foreign: UK (parliamentary paper, historical LR-descendant series), US (case,
    CFR, Federal Register, US Constitution with Roman-numeral guidance — DECISION-027,
    US judge title), NZ, Canada, other (published translation, ch-26 translated title).
3.8 Ch 21–26 international: treaty, UN doc, ICJ case, PCIJ pleading, ICC/tribunal, WTO,
    supranational (EU) — each cited twice to exercise the new international subsequent-
    reference module (§5).
3.9 Embedded-title italics (PARITY-122): book title containing `*Mabo*` markup → italic span
    inside the title; unmarked titles byte-identical.
3.10 Field UX: typeahead on author/case/journal fields (CitationFinder), field help,
    partial-date help copy (DECISION-020), required-field behaviour on incomplete input
    (BUG-005(c) — expect warn/refuse, currently an open AC: record actual behaviour).
3.11 Paste Citation (BUG-002): paste with Word line breaks and nbsp; `&`/`and` parties;
    parse-failure path always offers "Insert as manual citation" with non-blocking warnings.
3.12 Help me choose (LLM identify): with no API key → graceful, actionable message;
    with a key (if provided) → correct source-type routing; verify nothing is sent when
    the feature is not invoked.
3.13 Recents: re-insert (full and dropdown variants) from the Recent list.

## 4. Footnote mechanics (heavy document mutation)

4.1 Insert citation with cursor in body → footnote created at the right reference point.
4.2 Insert with cursor already inside an existing footnote → citation lands in that footnote,
    no new footnote created.
4.3 Add Note button → empty footnote created and focused.
4.4 Insert a NEW footnote between two existing citation footnotes (Word References → Insert
    Footnote), cite the same source as the one above → Refresh All recalculates: new note's
    format correct, downstream ibid/(n X) chain updated to new numbering.
4.5 Delete a footnote that is the TARGET of later `(n X)` references → Refresh All: subsequent
    refs repair (first remaining occurrence promoted to full citation; n-numbers correct).
4.6 Cut a footnoted paragraph and paste it earlier in the document → cross-reference fields
    renumber; ibid chains re-derive from new order.
4.7 Multi-citation footnote: two sources + linking phrase (quoting / cited in) — Rule 1.3
    output; refresh preserves both.
4.8 Manually type inside a managed citation's text in the footnote → Refresh All: engine
    re-render restores canonical text (or flags — record actual contract).
4.9 Long document behaviour: on the 100+ footnote copy, Refresh All completes and the UI
    stays responsive (record duration).

## 5. Subsequent references, ibid, short titles

5.1 Same source consecutive notes → `Ibid`; with different pinpoint → `Ibid [pin]` per 1.4.3.
5.2 Same source non-consecutive → short title + `(n X)`; short title assigned on first use
    (`('Smith')` introduction).
5.3 Three-source rotation across six notes → every note's form re-derived correctly after
    one Refresh All.
5.4 International short forms (treaty/UN/ICJ/ICC/WTO/EU) — second cites use the new module's
    forms, not full repeats.
5.5 Short-title embedded italics follow PARITY-122 markup in subsequent refs.

## 6. Edit Citation

6.1 Round-trip: insert reported case → click the citation in the footnote (selection handler)
    → Edit opens with BOTH parties populated (BUG-005(a)) → save unchanged → footnote text
    byte-identical.
6.2 Edit parties → footnote re-renders; no `(0)`/`0` placeholders ever (BUG-005(b)).
6.3 Edit pinpoint only → subsequent refs keep integrity.
6.4 `case.unreported.no_mnc` edit fields match engine contract (party1/party2/judges/fullDate)
    — BUG-005(d) audit item; record actual field defs for every source type spot-checked in §3.
6.5 Edit directly (free text) on an existing citation → BUG-002 parser paths + manual override.
6.6 Change source type of an existing entry (if offered) or delete + re-add → library and
    occurrences stay consistent.

## 7. Citation Library

7.1 List reflects every §3 insert immediately (BUG-003 refresh fix).
7.2 Entry actions: re-insert, edit, delete — deleting a cited source: record the contract
    (occurrences orphaned? warned?).
7.3 Diagnostics: banners only when warranted; Copy-details affordance works.
7.4 Import from Word (Source Manager XML) on a doc with Word-native sources.
7.5 BibTeX import: paste/upload a small .bib set → correct source-type mapping.
7.6 Library on the never-Obiter copy → empty-with-markers hint routes to Scan & Repair.

## 8. Scan & Repair (BUG-004 — first live verification on web)

8.1 Never-Obiter document (copy §2.4): scan classifies adopt vs verbatim; preview table counts
    correct; NOTHING modified before confirm; apply converts checked items only; italics
    restored on structured adoptions; formatting preserved on verbatim in-place wraps.
8.2 Lost-store simulation: on a copy, quarantine path — orphaned content controls → rebuild
    items reconstruct store entries; existing occurrences relink (tag preserved as id).
8.3 Healthy document → scan is a strict no-op offer (all linked; apply changes nothing).
8.4 Endnote handling: in-place wrap only; refresher leaves endnotes alone.
8.5 >250-char footnote citation → library-only adoption (Word search limit) — recorded, not lost.
8.6 Post-apply: ibid/short-title chains re-validated; debug log gains scanRepair lines.
8.7 Performance: scan of the 100+ footnote copy completes with 2 syncs capture / 3 apply
    (observe: fast, no per-note stalls).

## 9. Validation

9.1 Clean baseline doc validates clean.
9.2 Seeded defects each flagged: superscript footnote number before punctuation; heading-order
    violation (accessibility check, A11Y-028); faux footnotes; language issues.
9.3 Fix a flagged item → re-validate clears exactly that finding.

## 10. Bibliography

10.1 Generate on the main copy → grouped per AGLC4 Part; ordering rules correct; legislation
     year italic (1.13.18 regression); no separator/closing-punct leakage.
10.2 Insert two more sources → regenerate → updates in place (no duplicate bibliography).
10.3 Bibliography outline/heading structure (bibliographyOutline) correct in Word online.

## 11. Styling and document setup

11.1 Set Up Document on a new doc: template applies; Title capitalised; Author small caps with
     large initial; cursor advances (1.13.15–.17 regressions).
11.2 Headings I–V: apply each level → numbering prefixes (I / A / 1 / (a) / (i)), small caps
     level I, italics II+, centring I–II, indents IV–V per 1.12.2; renumbering after inserting
     a heading above.
11.3 **BUG-006 (v1.14.1 fix, first live verify): select a single line with the anchor at the
     end of the previous paragraph → apply Level 1 → ONLY the target line styles.** Repeat:
     cursor-only; full-line selection including trailing ¶ (paragraph below untouched);
     genuine multi-paragraph selection styles all selected.
11.4 Block quote styling: same boundary matrix as 11.3.
11.5 Heading changes reflected in Validation's heading-order check.

## 12. Multi-standard (AGLC4 / OSCOLA / NZLSG)

12.1 Switch standard in Settings → confirmation/behaviour recorded; same library re-renders
     per the new standard on refresh (spot-check a case, a statute, a journal article in each).
12.2 OSCOLA legislation + NZLSG Waitangi/secondary sources format per their modules.
12.3 Standard choice persists in the document (reopen → same standard); a different document
     stays on its own standard.
12.4 Guide content follows the active standard.

## 13. Modes

13.1 Manual Citations Mode: enter → engine stops re-rendering (manual text preserved on
     Refresh All); leave → confirmation dialog (Settings.tsx guard) → auto resumes.
13.2 Writing-mode options in Settings (WritingMode) — exercise each; record formatting deltas.

## 14. Guide / Reference

14.1 Reference Guide shows all rules; abbreviation lookup returns correct entries
     (e.g. journal abbreviations, court abbreviations).
14.2 Deep links/navigation inside the guide work under MemoryRouter on web.

## 15. Settings

15.1 LLM: provider list renders; key save/clear; key stored per device (not in the document);
     invalid key → clean error on use.
15.2 Corpus: download (IndexedDB) → entry count + version shown; adapters use it offline;
     delete + skip + clear-skip flows.
15.3 Device prefs (comfort mode, corpusEnabled, etc.) persist across pane reloads in the
     web webview.

## 16. Lookup integrations (network-dependent — note flakiness, don't block release on
      third-party outages)

16.1 Typeahead sources: AustLII/Jade links, Crossref/DOAJ/OpenAlex article lookup, FRL/
     hansard adapters — one happy-path each; offline/failing adapter degrades silently to
     manual entry.
16.2 Check Reference (citation verifier) on a known-good and a known-bad citation.
16.3 Audit log records lookups (privacy contract).

## 17. Command palette, shortcuts, status log

17.1 Palette opens (shortcut + any UI affordance), lists commands incl. "Scan and repair
     citations"; executing navigates correctly.
17.2 ShortcutsHelp overlay matches actual bindings; shortcuts work with focus in the pane
     (Word online steals many keys — record conflicts).
17.3 StatusLog captures operations; ErrorReporter path (force one benign error) produces a
     usable report.

## 18. Accessibility (web pane)

18.1 Keyboard-only pass: Insert → Edit → Library → Scan & Repair; no traps; visible focus
     (≥3:1 ring); logical order.
18.2 Landmarks/labels: form fields labelled; banners announced (aria-live) — inspect DOM.
18.3 Comfort mode / reduced motion honoured; contrast spot-checks against tokens.

## 19. Resilience and web-specific behaviour

19.1 Pane reload mid-flow (during a long Refresh All) → no store corruption (library intact,
     diagnostics clean afterwards).
19.2 Word online session refresh (F5 the whole tab) mid-edit → document + store consistent.
19.3 Slow network simulation on one insert (CDP throttling) → UI stays coherent, no double
     insert on retry.
19.4 The literal `[^1]`-style markers observed in the baseline doc body: determine origin
     (pre-existing content vs artifact of an Obiter operation) — file a story if Obiter-caused.

## Exit criteria

- Every section executed on the web build; every failure filed as a `WEB-0xx` story with
  severity; release-blockers fixed (patch release) or explicitly accepted before the
  AppSource submission proceeds; Phase 3 (Copilot package) starts only after this pass.
