# R03: federal court DOCX corpus and OOXML analysis (OBI-R02 and OBI-R03, federal cohort)

Date: 6 October 2026. Obiter commit inspected: `69b9c40`.
Scope: High Court (HCA), Federal Court (FCA, FCAFC) and Federal Circuit and Family Court (FCFCOA). Recent original judgments only.
Inspector: `scripts/research/inspect_ooxml.py` (copied from the session scratchpad) (Python 3, standard library only; snapshot `inspect_ooxml_federal_snapshot.py`). Per-file JSON is in `scratchpad/court/out_federal/`. Samples are in `scratchpad/court/corpus/federal/` and are not committed.

Privacy: `dc:creator` and `cp:lastModifiedBy` were recorded only as present or absent. Template paths are reduced to the basename. Revision identities, counsel names and solicitor names are not recorded.

## 1. Summary

- **Corpus:** 9 original DOCX samples, all dated August to October 2026: 5 Federal Court (4 FCA single judges and 1 FCAFC bench) and 4 High Court (4 different benches). There are **0 FCFCOA samples**. FCFCOA publishes judgments only through AustLII, and AustLII's RTF and DOCX links sit behind an interactive Cloudflare human-verification challenge. I did not attempt to bypass it (see §6).
- **The two federal superior courts cite in fundamentally different places:**
  - **FCA and FCAFC put every citation in the text.** The 5 samples have 0 footnotes. Typical first cite: `Name [year] COURT n; (year) vol REPORT page`, with the neutral citation first. Pinpoints are to paragraphs: `at [n]`. Some judges add a page pinpoint, as in `at page [n]`. The judge is attributed in parentheses or with `per`. Short forms are `ShortName at [n]`.
  - **HCA puts citations in footnotes.** There are 344 footnotes across 4 samples. The form is report-only (`(year) vol CLR page at page [para]`) and the neutral citation is used only for unreported or tribunal decisions. A repeat citation restates the short name and the full report every time.
- **Neither court uses `Ibid` or `(n x)` in any sample.** Counts are 0 of 344 HCA footnotes and 0 occurrences in FCA body text (§4). The HCA cross-refers to the judgment's own **paragraph numbers** (`See above at [14]`, `See [7] above`). In one sample these are live Word `REF _Ref… \r \h` fields.
- **No third-party citation-tool markers were found:**
  - No `ADDIN`, `CITATION`, `BIBLIOGRAPHY`, `TA` or `TOA` fields.
  - No `w:sdt` citation controls.
  - No web extensions and no VBA.
  - The Word bibliography part is empty (0 sources).
  - The only vendor namespace is `http://schemas.globalmacros.com/FCA`. It is a one-element custom XML part bound to the FCA template's neutral-citation content control. It is a template-builder marker, not a citation-tool marker.
- **Both courts produce judgments from institutional Word templates:**
  - FCA uses `Judgment.dotx`, with DOCPROPERTY fields, about 40 `docVars` and a data-bound `MNC` content control.
  - HCA uses `Chambers V11.dotm`, attached by path only. No VBA is embedded in the DOCX.
  - Paragraph numbering is style-linked in both: `ParaNumbering` (FCA) and `FixListStyle` (HCA).

## 2. Corpus register

All files were retrieved 6 October 2026. "Format" is from byte sniffing. Every file is an OOXML ZIP whose magic bytes are `PK`.

| ID | Court | Doc type | Bench | Decision date | Source URL | SHA-256 (first 16) | Size |
|---|---|---|---|---|---|---|---|
| F01 2026FCA1434 | FCA | Reasons and orders (migration appeal) | Lenehan J | 6 Oct 2026 | https://www.fedcourt.gov.au/file-store/Judgments/Federal%20Court/Single%20Court/2026/2026FCA1434/2026FCA1434.docx | bed411f50db015fb | 87 KB |
| F02 2026FCA1458 | FCA | Reasons and orders (contract, initial trial) | Lee J | 6 Oct 2026 | …/Single%20Court/2026/2026FCA1458/2026FCA1458.docx | 11e08846df6420eb | 179 KB |
| F03 2026FCA1464 | FCA | Reasons and orders (interlocutory injunction) | Colvin J | 17 Sep 2026 | …/Single%20Court/2026/2026FCA1464/2026FCA1464.docx | af371e7751bd801b | 99 KB |
| F04 2026FCA1469 | FCA | Reasons and orders (extension of time) | Bromwich J | 17 Aug 2026 | …/Single%20Court/2026/2026FCA1469/2026FCA1469.docx | 320d649fa910cf37 | 91 KB |
| F05 2026FCAFC0100 | FCAFC | Reasons and orders (appeal) | Derrington, Hespe and Hill JJ | 5 Aug 2026 | …/Full%20Court/2026/2026FCAFC0100/2026FCAFC0100.docx | 73616276acc1e1ef | 116 KB |
| H01 2026HCA25 | HCA | Reasons (criminal appeal) | 5 Justices | 5 Aug 2026 | https://www.hcourt.gov.au/sites/default/files/eresources/2026-08-05/HCA/Potter%20%28A%20Pseudonym%29%20v%20The%20King%20%28A24-2025%29%20%5B2026%5D%20HCA%2025.docx | 4dc50608c9e23437 | 103 KB |
| H02 2026HCA29 | HCA | Reasons (criminal appeal) | 7 Justices | 12 Aug 2026 | …/eresources/2026-08-12/HCA/The%20King%20v%20Ko%20%28S172-2025%29%20%5B2026%5D%20HCA%2029.docx | 46b4407893df0f88 | 168 KB |
| H03 2026HCA31 | HCA | Short reasons (application dismissed) | 5 Justices | 9 Sep 2026 (from the publication path; medium confidence) | …/eresources/2026-09-09/HCA/R%20Lawyers%20v%20Mr%20Daily%20%5BNo%202%5D%20%28A8-2025%29%20%5B2026%5D%20HCA%2031.docx | 05684bc973c0f8b6 | 51 KB |
| H04 2026HCA33 | HCA | Reasons (original jurisdiction, migration) | Gordon, Steward and Gleeson JJ | 9 Sep 2026 | …/eresources/2026-09-09/HCA/EGH19%20v%20Minister%20for%20Immigration%20%26%20Citizenship%20%28S147-2025%29%20%5B2026%5D%20HCA%2033.docx | e7ca6b8c95556bf1 | 119 KB |

**Provenance notes**

- **FCA (high confidence that the files are originals).** Each judgment page labels its download "Original Word Document", for example https://www.judgments.fedcourt.gov.au/judgments/Judgments/fca/single/2025/2025fca1000 (retrieved 6 Oct 2026). The link redirects to the `fedcourt.gov.au/file-store/…` DOCX. Both hosts sit behind a Cloudflare JavaScript check. The files were fetched in an ordinary browser session that passed the check automatically, with no interaction. Benches were taken from the documents and from https://www.fedcourt.gov.au/digital-law-library/judgments/latest (retrieved 6 Oct 2026).
- **HCA (high confidence that the files are originals).** The judgment pages link both `.docx` and `.pdf`, for example https://www.hcourt.gov.au/cases-and-judgments/judgments/judgments-1998-current/king-v-ko (retrieved 6 Oct 2026). The files were downloaded directly. Dates and benches come from the case pages.
- **Orders:** no separate orders documents were found for either court. Orders appear inside the judgment DOCX: FCA styles `FCOrders`, `Order 1` etc, and HCA styles `Orders PartyName` and `Orders Centre`. **Separate orders remain a gap.**
- **Reuse:** these are Commonwealth court publications. Reuse terms were not reviewed. Treat them as research fixtures only and do not redistribute.

## 3. Per-file OOXML inventory

The raw observations are from the `out_federal/*.json` files. `Application` is `Microsoft Office Word`, `AppVersion` is `16.0000` in all 9 files.

| Item | F01 | F02 | F03 | F04 | F05 | H01 | H02 | H03 | H04 |
|---|---|---|---|---|---|---|---|---|---|
| Template (app.xml) | Judgment.dotx | Judgment.dotx | Judgment.dotx | Judgment.dotx | Judgment.dotx | Chambers V11 | Chambers V11 | Chambers V11 | Chambers V11 |
| attachedTemplate rel (external) | [path]/Judgment.dotx | same | same | same | same | [path]/Chambers%20V11.dotm | same | same | same |
| creator / lastModifiedBy present | yes / yes | yes / yes | yes / yes | yes / yes | yes / yes | no / no | no / no | no / no | no / no |
| `removePersonalInformation` setting | – | – | – | – | – | yes | yes | yes | yes |
| Custom properties | about 20 (MNC, Judge, Catchwords, Cases_Cited, Legislation…) | same plus SharePoint | same | same | same | MediaServiceImageTags | same | plus ContentTypeId | plus ContentTypeId |
| docVars | 41 | 30 | 41 | 41 | 41 | 0 | 0 | 0 | 0 |
| Styles defined / custom | 225 / many FC* | 210 | 209 | 210 | 210 | 95 | 90 | 89 | 90 |
| numbering abstractNum / num | 32/36 | 50/50 | 25/33 | 27/36 | 25/34 | 21/22 | 22/46 | 18/19 | 22/33 |
| Sections / header+footer parts | 3 / 15 | 3 / 10 | 3 / 15 | 3 / 15 | 3 / 10 | 4 / 12 | 8 / 28 | 2 / 12 | 3 / 12 |
| Footnotes / endnotes | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 86 / 0 | 181 / 0 | 4 / 0 | 73 / 0 |
| Field types | DOCPROPERTY 5, PAGE 4, REF 2, MACROBUTTON 1 | REF 56, DOCPROPERTY 5, PAGE 4 | DOCPROPERTY 5, PAGE 4, REF 1 | DOCPROPERTY 5, PAGE 4, REF 2 | DOCPROPERTY 5, PAGE 4, REF 3 | PAGE 3, `=` 1 | PAGE 11, `=` 1 | PAGE 3, `=` 1 | REF 27 (in footnotes), PAGE 3, `=` 1 |
| Bookmarks | 29 (named template slots) | 106 (91 `_Ref`) | 29 | 26 | 27 | 1 `_Hlk` | 1 `_Hlk` | 0 | 23 `_Ref` |
| Content controls (`w:sdt`) | 1: tag `MNC`, data-bound `/ns0:root/ns0:Name` | same | same | same | same | 0 | 0 | 0 | 0 |
| customXml roots | globalmacros.com/FCA; bibliography (0 sources) | plus SharePoint ×3 | as F01 | as F01 | as F01 | SharePoint ×3; bibliography (0) | same | same | same |
| Hyperlinks | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Tracked ins/del, comments | 0/0, 0 | 0/0, 0 | 0/0, 0 | 0/0, 0 | 0/0, 0 | 0/0, 0 | 0/0, 0 | 0/0, 0 | 0/0, 0 |
| Embedded objects, VBA, web extensions | none | none | none | none | none | none | none | none | none |
| Body paragraph style (numbered) | ParaNumbering | ParaNumbering (281) | ParaNumbering | ParaNumbering | ParaNumbering (71) | FixListStyle | FixListStyle (179) | FixListStyle | FixListStyle (83) |
| Footnote style | – | – | – | – | – | footnote text / reference | same | same | same |

**What the fields are (observation):**

- **FCA `DOCPROPERTY`** fields render Court, Division, Registry, Practice Area and AppealFrom on the cover sheet.
- **FCA `MACROBUTTON ClickHere`** appears once in F01. It is a leftover template prompt from the judge-line placeholder.
- **F02's 56 `REF _Ref… \h`** fields build a manual table of contents from heading bookmarks.
- **H04's 27 `REF _Ref… \r \h`** fields are inside footnotes. They render paragraph numbers such as `[7]` for cross-references.
- **The HCA `=` field** is a nested header formula, `= (PAGE + 1)/2`.

## 4. How the courts cite (body and footnote statistics)

The counts come from regular expressions over plain text, after joining runs and normalising NBSP (`out_federal/_pattern_counts.json`). The FCA cover sheet carries a "Cases cited" list, which inflates raw counts. The F02 and F05 figures below are for the reasons only, starting at "REASONS FOR JUDGMENT".

| Measure | FCA/FCAFC (5 files, body) | HCA (4 files, 344 footnotes) |
|---|---|---|
| Where citations sit | Inline in body text; 0 footnotes | Footnotes; body has only the case's own MNC |
| `Ibid` / `ibid` | 0 | 0 |
| `(n x)` / `above n` / `supra` / `Id` | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |
| MNC + parallel report (`[yyyy] CT n; (yyyy) v R p`) | F02 reasons 21 of 29 MNCs; F05 9 of 23; F03 2 of 4 | Not used (report alone) |
| Report-only citations | Older or unreported-era cases, for example `(1988) 82 ALR 499 at 504` | Dominant: 159 report hits in H02 alone |
| MNC alone | Unreported cases | Used for unreported, AATA and intermediate-court decisions (10 hits) |
| Pinpoint form | `at [n]` (F05: 64); page plus paragraph `at 384–385 [63]–[64]` (F02, often in parentheses with `per … JJ`) | `at page [para]` in 149 notes; `at page` only for older reports |
| Judge attribution | `(Rangiah J, with … agreeing)`, `(the Court)`, `per … JJ` | Rare |
| Short form after first cite | `ShortName at [n]` (for example a party-code name) | Short name plus full report repeated: `ShortName (yyyy) v CLR p at pg [n]`; 89 consecutive-note repeats where AGLC would use `Ibid` |
| Internal cross-reference | `at [48] of the Tribunal's reasons` (refers to other reasons) | `See above at [14]` (H01 6, H02 17); `See [7] above` (H04 23); live REF fields in H04 |
| Signals | `see`, `cf` inline, lower case | `See`, `See also`, `See, eg,`, `cf` (lower case, at the start of a note) |
| Statute pinpoint | `s 23(2C)` | `(Cth), s 307.1(2)`: comma after the jurisdiction in 55 notes against 1 without; capitalised `Sch 1, Pt 4, cl 4(1)` |
| Notes mixing prose and citations | n/a | Common: explanatory sentences followed by `:` and an authority; `(emphasis added)` 6 times in H02 |
| Italic runs | Case names split across runs (for example `Smith and` + `Afford`) | Same |

**Interpretation**

- **FCA.** The FCA reasons follow an in-text, paragraph-pinpoint, MNC-first convention. **High confidence for these 5 files and 5 benches.** The style varies by judge: F02 uses parenthesised `(at page [para] per …)`, while F05 uses bare `at [n] (judge)`. Obiter's FCA preset sets `parallelOrder` to the default "report-first" (`src/engine/court/presets.ts:203-212`, with the default at `:167-172`). FCA reasons consistently put the **MNC first**. That is a judgment convention. It does not settle what FCA GPN-AUTH requires of submissions.
- **HCA.** The HCA reasons use footnotes and never use ibid. Repeats restate the authority, which is consistent with Obiter's `ibidSuppression: "on"` for HCA (`presets.ts:187-196`). The HCA court short form is a short title plus a full report and pinpoint. Obiter's `formatCourtShortReference` emits the short title plus pinpoint only (`src/engine/resolver.ts:835-868`), and so does not reproduce the HCA repeat form. **High confidence** across 4 benches and 344 notes.
- **Pinpoints.** In the HCA `at page [para]`, the page is a **pinpoint page**, followed by the paragraph. AGLC4 r 2.2.5 also requires a page in report pinpoints (aglc4-rule-reference.md §2.2.5, PDF p 77). Obiter's `para-and-page` renders `«startingPage», [para]` (`src/engine/rules/v4/domestic/cases.ts:397-412`). I did not verify whether a pinpoint page can also be expressed there, for example through `subPinpoint`. **Medium confidence that this is a gap.**
- **Legislation pinpoints.** The HCA style puts a comma after the jurisdiction and capitalises designations (`Pt`, `Sch`). AGLC4 r 3.1.4 uses no comma and lower-case abbreviations (aglc4-rule-reference.md §3.1.4, PDF p 94). This is a court-judgment house style, not a submission rule. Record it only in a "judgment-drafting" document-type profile (OBI-101 and OBI-301).
- **Alternatives:**
  - Published files may be post-edited by court staff, and chambers drafts may differ (OBI-R04).
  - The regular expressions miss some citation forms. For example, `no_citation_detected` overcounts notes such as `Act, s 486A`.
  - The sample is 2 months of 2026 decisions. It is not a 24-month spread.

## 5. Third-party tool markers

| Marker searched | Found | Interpretation | Confidence |
|---|---|---|---|
| ADDIN, CITATION, BIBLIOGRAPHY, TA, TOA fields | None in body, footnotes, headers or footers (9/9) | No live citation-manager or Table of Authorities fields survive in the published files | High for the published bytes |
| Bibliography sources part | Present, 0 `b:Source` entries (9/9) | Word's default empty part; not tool evidence | High |
| Vendor customXml namespace | `schemas.globalmacros.com/FCA` (5/5 FCA); root/`Name` bound to the `MNC` content control | Consistent with the FCA template having been built with Global Macros, a North Sydney Word-template and VBA consultancy (https://www.globalmacros.com/services/, retrieved 6 Oct 2026). Alternative: the namespace string was copied or reused. It is template automation, not citation software. | Medium |
| SharePoint content-type customXml | F02, H01–H04 | Documents stored in or saved through SharePoint or OneDrive document libraries | Medium |
| VBA (`vbaProject.bin`) | None | DOCX cannot carry VBA. The HCA's attached `.dotm` may hold macros, but that cannot be inferred from the path (backlog OBI-R03) | High (absence in the DOCX) |
| docVars | FCA only (about 40 names such as `NumApps`, `Parties1`, `JudgeType`) | Data written by template macros, consistent with a VBA template wizard | Medium |
| Web extensions (Office add-ins) | None | No add-in persisted state. Absence does not prove no add-in was used. | Low (absence) |

**Conclusion:** the bytes show no evidence of any citation tool. They also cannot exclude one, because citations may be typed or flattened before publication (backlog "Evidence and limitations").

## 6. Gaps and limitations

- **FCFCOA: 0 samples.** https://www.fcfcoa.gov.au/judgment (retrieved 6 Oct 2026) links every judgment to AustLII. The AustLII page offers "RTF format" and "Signed PDF/A". Both the RTF and the DOCX URLs returned 403 to a plain request and showed an interactive human-verification checkbox in the browser. I did not proceed. The provenance of the AustLII RTF (court original or AustLII conversion) is unverified. **Next step:** retrieve manually or ask the FCFCOA for original DOCX files (OBI-R04), then rerun the inspector.
- **Separate orders documents:** none were found for any of the three courts.
- **Time spread:** the samples cover August to October 2026 only. Earlier 2024–2026 samples are needed to test template-version drift (for example `Chambers V11`).
- **FCAFC:** 1 sample only. The HCA has no single-Justice samples.
- **Working drafts versus published files:** the HCA files strip creator data (`removePersonalInformation`) and every file has revision `1` or `3`. These are finalised exports, so they say nothing about chambers' drafting tools.

## 7. Implications for Obiter (proposed; not implemented)

| Story | Proposed enhancement grounded in this corpus | Evidence |
|---|---|---|
| OBI-101 / OBI-301 | Add **document type** (judgment, submission, orders) as a profile axis, separate from court. HCA judgment house style (`(Cth), s`, `Pt`, `Sch`, short name plus full report) must not leak into HCA submissions. | §4 |
| OBI-102 | Add a court subsequent-reference mode "**repeat short title plus full report plus pinpoint**" (HCA judgment style) alongside "short title plus pinpoint". Never emit ibid or `(n x)` when the mode is on. | §4; `resolver.ts:835-868` |
| OBI-102 / OBI-204 | Support **internal paragraph cross-references** (`above at [n]`, `[n] above`) as Word `REF _Ref… \r \h` fields to bookmarked numbered paragraphs, so they update on renumbering. Use Office.js bookmark and field APIs where available, with a text fallback. | H04: 27 REF `\r` fields; H01/H02: 23 typed |
| OBI-103 | Make the FCA preset's `parallelOrder` "**mnc-first**" for the judgment document type, pending a GPN-AUTH check for submissions. Add a `page [para]` pinpoint with a pinpoint page, plus optional "at" and judge attribution (`(X J)`, `per … JJ`). | §4; `presets.ts:203-212`; `cases.ts:397-412` |
| OBI-103 | Add an **in-text citation mode** (no footnotes) for FCA-style reasons and submissions. Citations go inline with `at [n]`, and a cover "Cases cited" list is generated. | F01–F05 have 0 footnotes |
| OBI-201 | Preserve style-linked paragraph numbering (`ParaNumbering`, `FixListStyle`). Never apply direct `numPr`, and detect these styles when computing `[n]` targets. | §3 |
| OBI-203 | Citation adoption must join runs across italic splits (`Smith and` + `Afford`) and normalise NBSP. FCA bodies contain up to 304 NBSPs (F05). | §4 |
| OBI-P04 | Coexist with institutional templates. Do not touch `docVars`, DOCPROPERTY fields, the bound `MNC` content control or vendor customXml. Treat the `globalmacros.com/FCA` and SharePoint parts as read-only. | §3, §5 |
| OBI-402 | Use these 9 files, identified by hash, as private regression fixtures. Commit only the derived JSON with footnote text stripped (`--no-text`). | §2 |

## 8. Reproduce

```
python3 scratchpad/court/inspect_ooxml.py scratchpad/court/corpus/federal/*.docx --out scratchpad/court/out_federal
# add --no-text to drop extracted footnote text from the JSON
```
