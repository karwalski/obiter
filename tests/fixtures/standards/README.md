# Standards fixtures and expectation tables (STD-002)

These files are the specification for the OSCOLA 5, OSCOLA 4, NZLSG 3 and
court-mode work in the STD epic. They are reviewable without reading test
code: a row says what a fixture must render as, under which rule, and where
that rendering was confirmed.

## Files

| File | What it holds |
| --- | --- |
| `types.ts` | `ExpectationRow` — the row shape (kept identical to `tests/standards/runner.ts`). |
| `citations.ts` | The named `Citation` fixtures (`fx-…`), in the field shape the engine dispatchers read today, with a comment on every fixture whose form writes different keys (STD-021). |
| `aglc4.ts` | Current AGLC4 output for every fixture — the byte-identical guard. |
| `oscola5.ts` | Correct OSCOLA 5 renderings (`expected`) with the engine's current delta in `note`. |
| `oscola4.ts` | Where OSCOLA 4 differs from OSCOLA 5 (lower-case `ibid`, unquoted short forms, quoted theses, ECR/EHRR forms, access dates). |
| `nzlsg3.ts` | Correct NZLSG 3 renderings (general style) with the current delta in `note`. |
| `aglc4-court.ts` | Court-submission-mode output for the HCA, NSWCA, WASC, QSC and STATE_TRIBUNAL presets applied to Mabo (report + MNC, and MNC only). |

## How to read a row

```ts
{
  fixture: "fx-uk-corr",                       // id from citations.ts
  scenario: "first+paragraph",                 // see the scenario list below
  expected: "Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884 [42]",
  rule: "2.1.6: '[2001] 1 WLR 2112 [42], [45]' — no comma before a paragraph pinpoint",
  source: "OSCOLA 5 §2.1.6 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  note: "currently renders: Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884, [42] (‘Corr’)",
}
```

- `expected` is the plain text of the rendered runs (the runs' `text` joined).
  Italics are not asserted here; the rule note says where they apply.
- `rule` gives the standard's own section number(s) and a paraphrase. No
  guide text is transcribed anywhere in these files.
- `source` names where the value was confirmed: the standard's section as
  recorded in `docs/standards-rule-notes.md` ("OSCOLA 5 §2.1.6", "NZLSG 3
  §2.2 (notes)"), the AGLC engine capture, or the court presets and reviews.
- `note` (non-AGLC tables) starts with `currently renders:` when the engine
  output on 2026-09-22 differed from `expected`. It is the delta the Wave 2
  and 3 fixes must close. The AGLC table uses `note` only to flag
  pre-existing AGLC quirks that are recorded, not endorsed.
- `pending` — see below.

## Scenarios

The runner (`tests/standards/runner.ts`) builds these contexts:

| Scenario | Context |
| --- | --- |
| `first` | Full first citation in footnote 1, no pinpoint. |
| `first+page` / `first+paragraph` / `first+section` / `first+article` / `first+regulation` | First citation with an occurrence pinpoint of that type (`42`, `[42]`, `6`, `7`, `3`). |
| `parallel` | First citation of a case stored with both a report and an MNC. AGLC (academic) never emits the parallel; OSCOLA and NZLSG require MNC + best report; court mode composes both in the preset's order. |
| `subsequent-short` | Later footnote (3), a different source cited in between, `formatPreference: "auto"`. |
| `subsequent-short+<pinpoint>` | As above with an occurrence pinpoint. |
| `subsequent-ibid` / `subsequent-ibid+<pinpoint>` | Footnote 2, immediately after the full citation, preceding footnote had one citation. AGLC and OSCOLA 4 render ibid; OSCOLA 5 repeats the `(n X)` short form; NZLSG renders the capitalised pinpoint alone (`At 42`); court mode repeats the short title. |
| `bibliography-entry` | The entry text from `generateBibliographyForStandard([fixture], config.bibliographyStructure)`. The section it belongs in is described in `rule`. |
| `<PRESET>:<scenario>` | Court table only: the scenario under `buildCourtConfig({...aglc4, writingMode: "court"}, presetToggles)`. |

## Sources

- OSCOLA 5 (Oxford, 2026): the PDF, quick reference guide and key-changes
  document linked from https://www.law.ox.ac.uk/oscola. The PDF text was
  extracted locally and italics were checked from the PDF font runs, so the
  rows can say whether a `v` or a treaty title is italic.
- OSCOLA 4 (2012) with the 2006 international-law supplement, from the same
  page.
- New Zealand Law Style Guide, 3rd ed (2019), the online chapters at
  https://www.lawfoundation.org.nz/style-guide2019/ (chapters 1–10 and
  Appendix 7 as listed in `docs/standards-rule-notes.md`).
- `docs/standards-rule-notes.md` — the derived, paraphrased rule notes the
  `source` column cites by section.
- In-repo: JSDoc rule quotes in `src/engine/rules/oscola/*` and
  `src/engine/rules/nzlsg/*`, `../obiter-multi-standard-backlog.md`
  (OSC-001…014, MULTI-001…014), `src/ui/data/referenceGuide.ts`,
  `src/engine/court/presets.ts`, `docs/court-practices-review.md` and the
  existing court suites.

Three findings from the verification that the repo's own notes did not have:
OSCOLA italicises the whole case name including `v` (the repo formatters
render `v` roman); OSCOLA 5 sets thesis titles in italics (§3.7.6, changed
from OSCOLA 4's single quotes); OSCOLA 5 cites CJEU cases by ECLI without the
`ECLI:` prefix (§4.4.2) and ECtHR cases as `(Judgment) ECtHR App No … (date)`
(§4.4.4). The Corr example is `[2008] UKHL 13` in both editions, not `15`.

## The pending convention

Rule 1 of the project applies: nothing here is guessed. When a rendering
could not be confirmed from the sources above, the row keeps the best
available reading in `expected` and carries

```ts
pending: "DECISION-040: <one-line question>"
```

The runner reports pending rows as "pending decision" and never fails on
them. Every pending question is collected in DECISION-040 (STD-023); the
14 "Unresolved" items at the end of `docs/standards-rule-notes.md` are the
same questions, and rows reuse that wording where one applies. When a
question is answered, update `expected` if needed and delete `pending`.

## Regenerating the AGLC and court tables

The AGLC and court rows are engine captures. If AGLC output changes on
purpose, re-capture with a scratch test that renders every fixture with the
contexts above (the STD-002 capture script rendered
`formatCitation(fixture, context, config)` for each scenario) and replace the
`expected` strings — never edit them to match a hoped-for value.
