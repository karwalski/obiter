# Synthetic OOXML fixtures (COURT-105)

Flat OPC documents (`<pkg:package>`, one `<pkg:part>` per package part) that
model the structures R03 observed in court Word files. Word opens each `.xml`
file directly.

All content is synthetic. There are no court bytes, no court text, no real
parties and no personal names. Revision and comment authors are the role
"Reviewer". Real corpus files stay out of the repository.

| Fixture | Modelled on | Structures |
|---|---|---|
| `hca-footnotes.xml` | R03 federal §3, O-C3, O-C9 | Citations in footnotes; style-linked numbering; `REF _Ref \r \h` fields in footnotes pointing at `_Ref` bookmarks; a TOC field; split italic runs; NBSPs; a tracked insertion and deletion; a comment |
| `fca-template.xml` | R03 federal §3, O-F2 | `ParaNumbering`-like and orders styles with style-linked lists; a `quotation2`-like style; docVars; DOCPROPERTY and MACROBUTTON fields; a control bound to a vendor-like custom XML part (synthetic namespace); an `ADDIN` field; citations in the body, neutral citation first |
| `nsw-export.xml` | R03 state §4.1, O-C6, O-C7 | One platform style family; no live fields; flattened `_Ref` and `_Toc` hyperlinks with no bookmarks; record, prose and report-first footnotes |
| `act-house-template.xml` | R03 state §4.2, O-F6 | Coversheet content controls; house styles; third-party docVars; a PAGE field; an empty bibliography part; no footnotes |
| `obiter-managed.xml` | O-F9 plus the above | Obiter-managed footnotes next to a REF field, a pending revision and another tool's control; unmanaged notes; the `urn:obiter:aglc` store part; `Obiter.*` properties including the legacy `Obiter.Author` and `Obiter.Website` |

- `ooxmlInventory.ts` reads a fixture at package level (no Word) into a
  semantic inventory. rsids and timestamps are never part of it.
  `compareInventories` lists what changed. `outsideManagedRanges` and
  `applyManagedRebuild` check that a refresh changed nothing outside a
  rebuilt managed control.
- `golden/<fixture>.json` holds each fixture's expected inventory. When you
  change a fixture on purpose, regenerate the golden files with
  `UPDATE_OOXML_GOLDEN=1 npx jest tests/word/court105OoxmlFixtures.test.ts`
  and review the diff.
- `scripts/research/build_ooxml_fixtures.py` packs the fixtures into `.docx`
  files (standard library only) for device tests and for
  `scripts/research/inspect_ooxml.py`. That inspector leaves footnote text out
  of its output by default (`--no-text`).

Tests: `tests/word/court105OoxmlFixtures.test.ts` and
`tests/engine/court105GoldenExamples.test.ts`, which holds the golden citation
strings from FCA-1, VIC-1, WA-1 and TAS-1.
