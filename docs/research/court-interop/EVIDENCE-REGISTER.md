# Court interoperability: evidence register

- **Version:** 1.0, compiled 6 October 2026 (synthesis of R01, R02, R03 federal, R03 state, R07, R08)
- **Obiter commit:** `69b9c40` (v1.17.7). No source code was changed.
- **Backlog:** `../obiter_court_interoperability_backlog.md (outside the repo)` (4 Oct 2026)
- **Companion:** `STORY-PLAN.md` (this folder)
- **Privacy:** no personal author names, usernames, internal paths or revision identities are recorded. Judicial officers are not named; samples are identified by neutral citation (MNC), proceeding number or decision id. Redactions appear as [author], [path], [internal-host].

## 1. How to read this register

### 1.1 Confidence

| Level | Meaning |
|---|---|
| High | Primary text read, or bytes inspected, or code read at a cited line, and (where marked ✔) re-checked in synthesis |
| Medium | Archive capture, OCR, secondary summary, small sample, or code path clear but not run |
| Low | Vendor marketing, search summaries, or inference from absence |

### 1.2 Backlog decision rules, as applied

| Rule | Backlog text (paraphrased) | How this register uses it |
|---|---|---|
| DR1 | Documented rule plus representative current examples can support a court profile | Marked **DR1-rule** where the instrument is read. A profile is only "verified" when DR1-rule *and* current examples of the same document type exist. **No profile meets DR1 in full yet** (no sampled submissions except 9 NSWCA PDFs). Instrument-backed values may still correct a preset that contradicts the instrument, but the profile stays "experimental". |
| DR2 | Repeated formatting without a rule is an observed convention | Marked **DR2-observed**. May only be shipped as an opt-in, labelled "observed convention" for the observed *document type* (judgments), never for submissions. |
| DR3 | A recognised field or namespace supports a document-level tool marker, subject to false-positive checks | Marked **DR3-marker**. Scoped to the sample document. |
| DR4 | A named application property supports a saving-application observation only | Marked **DR4-saving-app**. Never used to attribute drafting tools. |
| DR5 | No marker means unknown, not absence | Marked **DR5-unknown**. |
| DR6 | Without a supported integration, preserve the other tool's content and import reviewed plain data | Applied to all vendor and template findings. |

### 1.3 Synthesis spot-checks (6 Oct 2026)

| Claim | Check | Result |
|---|---|---|
| Vic SC Gen 3 "instead of" rule, AGLC basis, example `394, 410 [60]` | Re-downloaded PDF; SHA-256 `23325c2fd777bc36…` matches R02; text lines found | ✔ confirmed |
| HCA PD 2/2024 five-part JBA (Parts A–E) | Re-downloaded PDF; SHA-256 `7a46707a3ba29b15…` matches R02; Parts A–E present | ✔ confirmed |
| FCA GPN-AUTH 7 May 2025 has no Part A/B; cl 2.5 example is MNC first | Internet Archive capture of the gpn-auth page (2025) | ✔ confirmed: "Part A" / "Part B" absent; `D'Arcy v Myriad Genetics Inc [2014] FCAFC 115; (2014) 224 FCR 479` |
| Practice-direction link rot | `curl` status: HCA registry link 404; Tas `/practice_directions/` 404; Qld MC PD 7/2024 PDF 200 | ✔ consistent with R02 |
| Heading 1–5 restyled on pane open | `src/taskpane/taskpane.ts:52-58,101`; `src/word/styles.ts:138,268-285` | ✔ confirmed |
| Hard-coded personal name in `Obiter.Author` | `src/word/documentMeta.ts:31` writes a literal personal name ([author]) | ✔ confirmed |
| `(n X)` always dropped in court mode | `src/engine/resolver.ts:494-497` | ✔ confirmed |
| Toggle change does not refresh | `src/ui/views/Settings.tsx:944-962` (no `triggerRefresh`) vs `:867`, `:937` | ✔ confirmed |
| `para-only` drops starting page | `src/engine/rules/v4/domestic/cases.ts:375-392`; test `tests/engine/court-mode.test.ts:436` expects `CLR [45]` | ✔ confirmed |
| `para-and-page` has no pinpoint-page slot for paragraph pinpoints | `cases.ts:395-412` renders `«start», [para]`; only a `page` pinpoint with a `subPinpoint` reaches `«start», «page» [para]` | ✔ confirmed (workaround exists, default path wrong) |
| Commentary repeats on re-cite | Library re-cite reuses `citation.id` (`src/ui/views/CitationLibrary.tsx:619-624`); `applySignalAndCommentary` reads commentary from the record (`src/engine/engine.ts:5315-5345`) | ✔ code path confirmed; not run in Word (medium) |
| r 2.8 empty title and number | `src/engine/rules/v4/domestic/cases-supplementary.ts:569-571` | ✔ confirmed |
| HCATrans number defaults to 0 | `src/engine/engine.ts:889-894` (`toNumber(..., 0)`) | ✔ confirmed |
| Guards set too high | `styles.ts:138` (1.6), `src/word/documentProperties.ts:29-33` (1.6), `src/word/apiCompat.ts` flags | ✔ confirmed |
| LOA and quotations forced to Normal | `src/ui/views/Bibliography.tsx:107`; `src/word/quotationInserter.ts:105` | ✔ confirmed |
| No ZIP library for an OOXML copy transform | `package.json:47-54` (dependencies) | ✔ none present |

### 1.4 Discrepancies between research reports

| Item | R-report A | R-report B | Resolution |
|---|---|---|---|
| NSW SC CA 1 file | R02: supremecourt.nsw.gov.au PDF, commenced 8 May 2023, SHA `c375a58f…` | R07: agd.nsw.gov.au PDF dated 1 May 2023, SHA `c2bc1a84…` | Same instrument (issued 1 May, commenced 8 May), two hosted files. Treat R02's court-hosted PDF as canonical; re-check paragraph numbering (cl 30, 31, 33, 37) against it before encoding. |
| VSCA SC CA 3 | R02 read the 10 Mar 2026 reissue (cl 14) | R07 read the 14 Apr 2025 text (13.3, s 16, Annexure B) | Record-locator rules must be re-read in the 2026 text before shipping (open question Q9). |
| NSW corpus size | R03 state: 203 probe exports | R07: 206 judgments | Different pulls from the same platform; counts are indicative only. |

## 2. Official sources (rules and practice directions)

All retrieved **6 October 2026**. "Capture" means an Internet Archive copy because the live site returned a Cloudflare 403.

| ID | Court | Instrument | Doc type | Effective / version | URL | SHA-256 (16) | Conf. | Class |
|---|---|---|---|---|---|---|---|---|
| HCA-1 | High Court | PD No 2 of 2024, Joint Book of Authorities | Submissions/LOA | Dated 20 Dec 2024; matters set down after 1 Jan 2025; revokes PD 1 of 2019 | https://www.hcourt.gov.au/sites/default/files/assets/registry/practice-directions/Practice_Direction_No_2_of_2024__Joint_Book_of_Authorities_20_December_2024.pdf | `7a46707a3ba29b15` ✔ | High | DR1-rule |
| HCA-2 | High Court | Form 27A (2024) and PD index | Submissions | 2024 forms | https://www.hcourt.gov.au/sites/default/files/assets/registry/Forms2024/FORM_27A_2024.pdf ; https://www.hcourt.gov.au/court-procedures/filing-documents/practice-direction | `43b98f09b4209512` | High | DR1-rule |
| FCA-1 | Federal Court | GPN-AUTH, Lists of Authorities and Citations | Submissions/LOA | 7 May 2025 | https://www.fedcourt.gov.au/law-and-practice/practice-documents/practice-notes/gpn-auth (capture 2025-12-05) | page | High (capture) ✔ | DR1-rule |
| FCA-1h | Federal Court | GPN-AUTH, earlier version (Part A/B) | Submissions/LOA | In force at capture 2022-03-04; superseded | same URL, capture 20220304200231 | page | High (historical) | superseded |
| FCA-2 | Federal Court | GPN-eBOOKS | Submissions/LOA | From 11 Jun 2026 | https://www.fedcourt.gov.au/law-and-practice/practice-documents/practice-notes/gpn-ebooks (capture 2026-09-29) | page | High (capture) | DR1-rule |
| FCA-3 | Federal Court | APP 2, Content of Appeal Books | Submissions/record | Reissued 1 Dec 2025 | https://www.fedcourt.gov.au/law-and-practice/practice-documents/practice-notes/app2 (capture 2025-12-08; live 403); secondary: https://www.qlsproctor.com.au/2025/12/federal-court-ebooks-practice-note/ | page | Medium | DR1-rule (needs primary re-read) |
| FCA-4 | Federal Court | Judgments FAQ | Judgments | Capture 2025-12-05 | https://www.fedcourt.gov.au/digital-law-library/judgments/judgments-faq | page | Medium | guidance |
| FCF-1 | FCFCOA | FAM-APPEALS practice direction | Submissions/LOA | From 1 Sep 2021; updated 9 Dec 2024 and 10 Jun 2025 | https://www.fcfcoa.gov.au/fl/pd/fam-appeals | page | High | DR1-rule |
| NSW-1 | NSW Supreme Court | SC Gen 20, Citation of Authority | Submissions | Commenced 1 Oct 2023 | https://supremecourt.nsw.gov.au/content/dam/dcj/ctsd/supreme-court/documents/Practice-and-Procedure/Practice-Notes/general/current/20230912_SC_Gen_20_Citation_of_Authority.pdf | `daa4af81f90aa79c` | High | DR1-rule |
| NSW-2 | NSW Court of Appeal | SC CA 1 | Submissions/LOA/record | Issued 1 May 2023; commenced 8 May 2023 | https://supremecourt.nsw.gov.au/content/dam/dcj/ctsd/supreme-court/documents/Practice-and-Procedure/Practice-Notes/court-of-appeal-practice-notes/current/2023_05_08_PN_SC_CA_1_-_Court_of_Appeal.pdf | `c375a58f7841a125` | High | DR1-rule |
| NSW-3 | NSW Court of Criminal Appeal | SC CCA 1 | Submissions/LOA | 22 Jul 2021 | https://supremecourt.nsw.gov.au/content/dam/dcj/ctsd/supreme-court/documents/Practice-and-Procedure/Practice-Notes/cca-practice-notes/current/2021_07_22_SC_CCA_1_General.pdf | `8c89c501348ad7c6` | Medium-high (OCR) | DR1-rule |
| NSW-4 | NSW District, Local | Practice-note indexes; **no citation instrument found** | – | Checked 2026-10-06 | https://districtcourt.nsw.gov.au/practice-procedures-publications/practice-and-procedure/practice-notes.html ; https://localcourt.nsw.gov.au/practice-publications/practice-notes.html | – | Medium | DR5-unknown |
| VIC-1 | Vic Supreme Court | SC Gen 3, Citation of authorities and legislation | Submissions and Court publications | 1 Dec 2025 | https://www.supremecourt.vic.gov.au/sites/default/files/2026-03/SC%20Gen%203%20-%20citation%20of%20authorities%20and%20legislation.pdf | `23325c2fd777bc36` ✔ | High | DR1-rule |
| VIC-2 | Vic Court of Appeal | SC CA 3 (third revision) | Submissions/LOA/record | 10 Mar 2026 | https://www.supremecourt.vic.gov.au/sites/default/files/2026-03/CA%203%20-%20Civil%20applications%20and%20appeals.pdf | `855273ca396dd307` | High | DR1-rule |
| VIC-2h | Vic Court of Appeal | SC CA 3 (2025 text; used by R07 for record locators) | Record | 14 Apr 2025; superseded | https://www.supremecourt.vic.gov.au/sites/default/files/2025-04/SC%20CA%203%20-%20Civil%20applications%20and%20appeals.pdf | `c78683fb…` | High (historical) | superseded |
| QLD-1 | Qld Supreme Court | PD 1 of 2024, Citation of Authority | Submissions | Commenced 29 Jan 2024 | https://www.courts.qld.gov.au/__data/assets/pdf_file/0007/786697/scpd-01-of-2024.pdf | `8602833c371a359b` | High | DR1-rule |
| QLD-2 | Qld Court of Appeal | PD 3 of 2013 | Submissions/record | 2013 | https://www.courts.qld.gov.au/__data/assets/pdf_file/0003/177456/sc-pd3of2013.pdf | `1c84325f3ca20001` | High | DR1-rule |
| QLD-3 | Qld Magistrates | PD 7 of 2024, Citation of Authority | Submissions | 7 Jun 2024 | https://www.courts.qld.gov.au/__data/assets/pdf_file/0005/800915/mcpd-07-of-2024.pdf | `bce4cb8530a334f8` | High ✔ (200) | DR1-rule |
| WA-1 | WA Supreme Court | Consolidated PDs: 2.1, 8.2.2, 9.21 | Submissions; Court's own judgments (8.2.2) | CPD updated 23 Sep 2026 | https://www.supremecourt.wa.gov.au/C/consolidated_practice_directions.aspx | `f3d2a754d5cc15b1` | High | DR1-rule |
| SA-1 | SA Supreme, District, Magistrates (civil) | Uniform Civil Rules 2020 rr 101.8, 217.8, 218.8; Form 91 | Submissions/LOA | Current to 15 Mar 2026 | https://www.courts.sa.gov.au/wp-content/uploads/wp-download-manager-files/court-rules/08-uniform-civil-rules/Uniform%20Civil%20Rules%202020.pdf | `52d665d13461302f` | High | DR1-rule |
| TAS-1 | Tas Supreme Court | PD 3 of 2014, Citation of Judgments | Submissions | 21 Feb 2014 | https://supremecourt.tas.gov.au/wp-content/uploads/2018/11/Practice_Direction_3_of_2014_-_Citation_of_Judgments_.pdf | `c66f0639ad7b497d` | High | DR1-rule |
| TAS-2 | Tas Supreme Court | PD 3 of 2022, Appeal Books, Lists of Authorities, Submissions | Submissions/LOA/record | 24 Aug 2022 | https://www.supremecourt.tas.gov.au/wp-content/uploads/2022/08/3-of-2022-Practice-Direction-Appeal-Books-Lists-of-Authorities-Written-Submissions.pdf | `c19258cd9ad7721e` | High | DR1-rule |
| ACT-1 | ACT Supreme Court and CA | PD 2 of 2022, Citation of Authority | Submissions | 26 May 2022 | https://www.courts.act.gov.au/__data/assets/pdf_file/0006/2008356/2a13102c6f1ab879a79145619cec0cb3abf2241d.pdf | `b08057acf98cebab` | Medium-high (OCR) | DR1-rule |
| NT-1 | NT Supreme Court | PD 2 of 2007, Citation of Authorities | Submissions | 25 May 2007 | https://supremecourt.nt.gov.au/_resources/documents/lawyers/practice-directions/citation-of-authorities-2-of-2007.pdf (capture 2025-11-18) | `1885c5ea02c2a743` | High (capture) | DR1-rule |
| NT-2 | NT Supreme Court | PD 1 of 2025, Lists of Authorities | Submissions/LOA | 1 Jan 2025 (format in r 82.10, **not read**) | https://supremecourt.nt.gov.au/_resources/documents/lawyers/practice-directions/practice-direction1of2025-lists-authorities-summaries-submissions.pdf (capture 2025-11-18) | `7bea6283805eed1a` | High (capture) | DR1-rule (partial) |

### 2.1 Advisory and historical sources

| ID | Source | Status | URL (retrieved 2026-10-06) | SHA-256 (16) | Use |
|---|---|---|---|---|---|
| AIJA-1 | AIJA, Guide to Uniform Production of Judgments (2nd ed, 1999) | Advisory, historical | https://aija.org.au/wp-content/uploads/2017/10/Guide-to-Uniform-Production-of-Judgments-2nd-Ed-Olsson-1999.pdf | `a97713f55d16a395` | Background for judgment conventions (in-text citations, MNC-first parallels). Not a profile source. |
| FCA-5 | Federal Court procurement PA2925-06-100 Part B Att B, Transcript Style Guide and Judgment Templates | **Historical 2019 contract specification**; names former courts (FamCA, FCC, AAT) | https://www.fedcourt.gov.au/__data/assets/pdf_file/0011/586892/PA2925-06-100-Part-B-Attachment-B-Transcript-Style-Guide-and-Judgment-Templates.pdf (capture 2026-05-27) | `63a4b09466c26de4` | Design reference and synthetic-fixture model only (transcript layout, template style names). Not normative. |

### 2.2 Platform sources (Microsoft Learn; retrieved 2026-10-06)

| ID | Source | Use |
|---|---|---|
| MS-1 | https://learn.microsoft.com/en-us/javascript/api/requirement-sets/word/word-api-requirement-sets (ms.date 10 Sep 2026) | Platform availability per set (incl. LTSC 2024 lacks 1.9; iPad lacks Desktop 1.3+) |
| MS-2 | https://learn.microsoft.com/en-us/javascript/api/requirement-sets/word/word-api-1-4-requirement-set (and -1-5-, -1-6-) | changeTrackingMode, comments, bookmarks (1.4); getStyles/addStyle, CC events (1.5); tracked-change read/accept (1.6) |
| MS-3 | https://learn.microsoft.com/en-us/javascript/api/requirement-sets/word/word-api-desktop-1-4-requirement-set | Native TOA object model, `Field.unlink`, `removeDocumentInformation`: Windows/Mac only |
| MS-4 | https://learn.microsoft.com/en-us/javascript/api/word/word.range ; https://learn.microsoft.com/en-us/office/dev/add-ins/word/fields-guidance | Field writes are Windows/Mac; "In Word on the web, fields are mainly read-only" |
| MS-5 | https://learn.microsoft.com/en-us/javascript/api/requirement-sets/common/office-add-in-requirement-sets | `getFileAsync(Compressed)` route to a separate copy |
| MS-6 | https://learn.microsoft.com/en-us/javascript/api/requirement-sets/word/word-preview-apis | PDF export (`exportAsFixedFormat`) is preview only |

R08 verified set numbers against the raw docs repository (OfficeDev/office-js-docs-reference commit `b10ec28`) because WebFetch summaries were wrong. Use only raw-table values for future updates.

## 3. Corpus samples

Retrieved 6 October 2026. Bytes are held uncommitted in the session scratchpad (`scratchpad/court/corpus/`). Reuse terms were **not** reviewed: treat as private research fixtures and never commit them (open question Q11).

### 3.1 Federal: court-published original DOCX (provenance: high)

| ID | MNC | Court | Doc type | Bench size | Decision date | Format | SHA-256 (16) | Source |
|---|---|---|---|---|---|---|---|---|
| F01 | [2026] FCA 1434 | FCA | Reasons + orders | 1 | 6 Oct 2026 | DOCX (OOXML) | `bed411f50db015fb` | https://www.fedcourt.gov.au/file-store/Judgments/Federal%20Court/Single%20Court/2026/2026FCA1434/2026FCA1434.docx |
| F02 | [2026] FCA 1458 | FCA | Reasons + orders | 1 | 6 Oct 2026 | DOCX | `11e08846df6420eb` | …/Single%20Court/2026/2026FCA1458/2026FCA1458.docx |
| F03 | [2026] FCA 1464 | FCA | Reasons + orders | 1 | 17 Sep 2026 | DOCX | `af371e7751bd801b` | …/Single%20Court/2026/2026FCA1464/2026FCA1464.docx |
| F04 | [2026] FCA 1469 | FCA | Reasons + orders | 1 | 17 Aug 2026 | DOCX | `320d649fa910cf37` | …/Single%20Court/2026/2026FCA1469/2026FCA1469.docx |
| F05 | [2026] FCAFC 100 | FCAFC | Reasons + orders | 3 | 5 Aug 2026 | DOCX | `73616276acc1e1ef` | …/Full%20Court/2026/2026FCAFC0100/2026FCAFC0100.docx |
| H01 | [2026] HCA 25 | HCA | Reasons | 5 | 5 Aug 2026 | DOCX | `4dc50608c9e23437` | hcourt.gov.au `/sites/default/files/eresources/2026-08-05/HCA/…` (full URL in R03 federal §2) |
| H02 | [2026] HCA 29 | HCA | Reasons | 7 | 12 Aug 2026 | DOCX | `46b4407893df0f88` | …/eresources/2026-08-12/HCA/… |
| H03 | [2026] HCA 31 | HCA | Short reasons | 5 | 9 Sep 2026 (medium) | DOCX | `05684bc973c0f8b6` | …/eresources/2026-09-09/HCA/… |
| H04 | [2026] HCA 33 | HCA | Reasons (original jurisdiction) | 3 | 9 Sep 2026 | DOCX | `e7ca6b8c95556bf1` | …/eresources/2026-09-09/HCA/… |

FCFCOA: **0 samples** (AustLII human-verification challenge, not bypassed). No separate orders documents for any federal court.

### 3.2 NSW: platform-generated DOCX exports (provenance: not chambers originals)

25 listed samples (NSW-01 to NSW-25; R03 state §4.1 has full URLs and hashes) and a 203-document cohort probe, all from `https://www.caselaw.nsw.gov.au/decision/{id}/export.docx`, decisions Nov 2025 to Oct 2026. Cohorts: NSWCA 5, NSWCCA 6, NSWSC 76, NSWDC 14, NSWLC 3, NSWLEC 41, NCAT 44, IC/IRC 14.

Selected rows (others in R03 state):

| ID | MNC | Doc type | Footnotes | SHA-256 (16) |
|---|---|---|---|---|
| NSW-02 | [2026] NSWCA 206 | Reasons | 0 | `3b82dcaecc085d79` |
| NSW-07 | [2026] NSWCCA 148 | Reasons | 0 | `9e0ac565399d88fb` |
| NSW-13 | [2026] NSWIC 55 | Reasons | 48 | `482bf89af7beb8aa` |
| NSW-18 | [2026] NSWLEC 125 | Reasons | 30 | `42287f36e733dd4c` |
| NSW-21 | [2026] NSWSC 1188 | Reasons | 724 | `28c7343752b6ef48` |
| NSW-22 | [2026] NSWSC 1225 | Reasons | 214 | `f6635bdb22937fc8` |

**Use limit:** valid for citation-text conventions (footnotes survive as real Word footnotes); invalid for templates, fields or tooling (all fields flattened; fixed 2014–15 base template).

### 3.3 ACT: court-published DOCX (provenance: publication saves)

10 samples, [2026] ACTSC 352, 357, 358, 360, 361, 362, 363, 367, 369, 373 (decided 15–28 Sep 2026; 3 judicial officers). Hashes: `76c2fbfb…`, `7660db47…`, `7fd79754…`, `5d8e3ed1…`, `e3eddaa2…`, `359a1d22…`, `125509dd…`, `0c2e50af…`, `a6ef5344…`, `87efa96b…` (same order). Source index: https://www.courts.act.gov.au/supreme/law-and-practice/judgments-and-sentences/search-for-an-act-supreme-court-judgment-or-sentence (file URLs in R03 state §4.2; party-name slugs not repeated here).

### 3.4 Other material

| Set | Detail | Use |
|---|---|---|
| QLD PDFs (6) | QSC 2026/205, 210; QCA 2026/130, 140, 150; QDC 2026/150; TCPDF re-renders from https://www.queenslandjudgments.com.au/caselaw/{court}/{year}/{n}/pdf | Reference only; no Word evidence |
| NSWCA submissions (9 text-layer PDFs of 14) | Proceedings 2025/00481546, 2026/00009770 (and 2026/00005236, image-only) from https://supremecourt.nsw.gov.au/practice-procedure/nswca/submissions.html | Record-locator conventions in submissions |

### 3.5 Coverage gaps (record, do not fill)

| Court | Status | Reason |
|---|---|---|
| FCFCOA, VIC, SA, TAS | 0 originals | AustLII Cloudflare challenge (not bypassed) |
| NT | 0 | Site Cloudflare challenge |
| WA | 0 | eCourts conditions of use need user permission |
| QLD | 0 originals | PDF only |
| Orders (separate documents) | 0 for any court | Orders are embedded in judgment DOCX |
| Submissions | 9 NSWCA only | Not published elsewhere in the sources searched |
| Time spread | Aug–Oct 2026 federal; Nov 2025–Oct 2026 NSW/ACT | Not 24 months; template drift untested |

## 4. Observations

### 4.1 Rules and requirements (from §2 instruments)

| ID | Observation (raw) | Interpretation | Class | Conf. | Alternatives | Stories |
|---|---|---|---|---|---|---|
| O-R1 | GPN-AUTH (7 May 2025) has no Part A/B list; the 2022 version had one. GPN-eBOOKS 7.2 splits eBooks into authorities / legislation / bills | Obiter FCA `loaType: "part-ab"` (`src/engine/court/presets.ts:211`) is stale | DR1-rule | High ✔ | A later reissue after the capture date (manual check, Q10) | OBI-103, 204 |
| O-R2 | GPN-AUTH cl 2.5 example: MNC; report. Cl 2.6 pinpoint "at [29]" / "at 481" | FCA submissions: MNC-first and an "at" connector are instrument-backed | DR1-rule | High ✔ | Example, not mandatory order | OBI-103 |
| O-R3 | HCA PD 2/2024: five-part JBA (A principal legislation; B other legislation; C CLR cases; D other reports; E other materials), legislation-version column; Form 27A annexure | Obiter HCA `loaType: "part-ab"` (`presets.ts:195`) contradicts the PD and Obiter's own guide (`src/ui/data/courtReferenceGuide.ts:65`); `reportHierarchy.ts:18` cites revoked PD 1/2019 | DR1-rule | High ✔ | – | OBI-103, 204 |
| O-R4 | HCA instruments silent on parallel form; Form 27A wants the authorised report | Obiter HCA `parallelCitations: "mandatory"` (`presets.ts:190`) is unsourced | DR5-unknown | Medium | Court may expect parallels in practice | OBI-103, 104 |
| O-R5 | Vic SC Gen 3 cl 5.2: report "instead of" unreported version; cl 5.5 example `(2023) 72 VR 394, 410 [60]`; cl 4.1 AGLC basis. SC CA 3 cl 14.4–14.5: authorised report; current AGLC edition mandated | Obiter VSC/VSCA `parallelCitations: "mandatory"` (`presets.ts:279,293`) contradicts the courts and AGLC4 r 2.2.7 | DR1-rule | High ✔ | – | OBI-103 |
| O-R6 | FAM-APPEALS cl 5.8: cite the report; MNC only for unreported | Obiter FCFCOA `mandatory` and hierarchy `["FamCAFC", …]` (`presets.ts:220-222`) wrong; FamCAFC is an MNC identifier (`reportHierarchy.ts:68-72`) | DR1-rule | High | – | OBI-103 |
| O-R7 | SA UCR r 101.8(4), r 217.8(3): highest authorised report **and** MNC (post-1997) "must"; r 217.8(4)–(10) hyperlink rules | Obiter SASC `preferred` (`presets.ts:372`) understated; SA District/Magistrates (civil) have no preset | DR1-rule | High | – | OBI-103, 204 |
| O-R8 | Tas PD 3/2014 cl 3(a) example MNC first; "at [15]"; cl 3(f) doubted/not followed | Obiter TASSC report-first default (`presets.ts:384-393`) mismatches; Tas treatment prompt absent | DR1-rule | High | Example, not rule | OBI-103 |
| O-R9 | WA PD 8.2.2 cl 4: MNC first (rule). PD 2.1 cl 14: later references by case name only | Obiter WA order correct; positive short-form rule not modelled | DR1-rule | High | – | OBI-102, 103 |
| O-R10 | ACT PD 2/2022 and NT PD 2/2007: authorised report; silent on MNC | Obiter ACTSC/NTSC `preferred` (`presets.ts:402,416`) overstated; NT PD title wrong (`src/engine/court/practiceDirections.ts:162`) | DR1-rule | Medium-high (ACT OCR) | – | OBI-103, 104 |
| O-R11 | Qld MC PD 7/2024 uses "should, as far as possible" | `QLD_DISTRICT_MAG` `mandatory` (`presets.ts:339`) inconsistent with Obiter's own QSC softening | DR1-rule | High | – | OBI-103 |
| O-R12 | NSW SC CA 1 cl 37: four-category list (legislation with version date; cases read with caps; cited not read; secondary). SC CCA 1: single oral-reference list | NSWCA `part-ab` (`presets.ts:244`) structurally wrong; no NSWCCA preset | DR1-rule | High / medium-high (OCR) | – | OBI-204, 301 |
| O-R13 | VSCA SC CA 3 cl 14.1–14.2, 14.6: Parts A/B/C, "None" under empty part, amended list redline + clean copy | `part-abc` exists; "None" rows and amended-list output absent | DR1-rule | High | – | OBI-204 |
| O-R14 | No instrument read mentions ibid | Obiter's blanket `ibidSuppression: "on"` and "ibid not used" guidance (`courtReferenceGuide.ts:62`) have no official source; must be labelled an Obiter preference | DR5-unknown | Medium | Unread instruments may cover it | OBI-102, 104 |
| O-R15 | Legislation version dates required: HCA Form 27A; NSW SC CA 1 cl 37(1); GPN-AUTH cl 2.3; GPN-eBOOKS 7.4 | No version field in court mode | DR1-rule | High | – | OBI-103 |
| O-R16 | Record locators: NSW SC CA 1 cl 31, 33 (black book page and line; Black/Blue/Red); VSCA 13.3(i)–(j), Annexure B (2025 text); QCA PD 3/2013 para 34; Tas PD 3/2022 cl 2.2.4; FCA APP 2 (secondary) | AGLC4 has no rule for record locators; this is a court-profile layer | DR1-rule (NSWCA, QCA, Tas); medium (VSCA 2026, FCA) | High/Medium | – | OBI-303 |
| O-R17 | About 30 practice-direction URLs in `practiceDirections.ts` return 404 or wrong host; stale labels (WA CPD date, WA AI PD 9.21, GPN-AUTH title); key mismatches `QLD_DIST_MAG`, `NSW_DIST_LOCAL` | Register hygiene defect | observation | High ✔ (sample) | – | OBI-104 |
| O-R18 | NSW District/Local, Qld District: no citation instrument found | Presets asserting "SC Gen 20 by convention" are unsupported; label "no instrument found; AGLC4 fallback" | DR5-unknown | Medium | Instrument exists outside indexes | OBI-103, 104 |
| O-R19 | WA PD 8.2.2 sets `[yyyy] WASCSR n` for sentencing remarks | Not recognised in `src/` | DR1-rule | High | – | OBI-103 |

### 4.2 Corpus observations (judgments; DR2 unless stated)

| ID | Observation (raw) | Interpretation | Class | Conf. | Alternatives | Stories |
|---|---|---|---|---|---|---|
| O-C1 | FCA/FCAFC: 0 footnotes in 5 files; citations inline; MNC; report; `at [n]`; judge attribution; `Short at [n]` | FCA reasons are in-text, MNC-first | DR2-observed (reasons) | High (5 benches) | Published files post-edited | OBI-101, 103, 301 |
| O-C2 | HCA: 344 footnotes in 4 files; report-only; `at page [para]` in 149 notes; repeats restate short name + full report (89 consecutive repeats); 0 ibid, 0 `(n x)` | HCA reasons use a "repeat full" short form | DR2-observed (reasons) | High (4 benches) | – | OBI-102, 103 |
| O-C3 | HCA cross-refers to own paragraphs (`See above at [n]`, `[n] above`); H04 has 27 `REF _Ref… \r \h` fields in footnotes with 23 `_Ref` bookmarks | Live Word cross-reference fields occur inside footnotes of court documents | DR2-observed | High | – | OBI-204, 201, 205 |
| O-C4 | HCA statute style `(Cth), s 307.1(2)` (55 vs 1), `Pt`, `Sch` | Judgment house style departs from AGLC4 r 3.1.4; reasons-only | DR2-observed | High | – | OBI-301 |
| O-C5 | NSW + ACT (213 docs): `(n N)` = 0; ibid in 4/203 NSW (2 officers); `at` before pinpoints ~99%; NSW parallel report-first; ACT MNC-first without report year; short titles unquoted or double-quoted | State judgments follow house styles, not AGLC4 rr 1.1.6, 1.4.1, 1.4.4, 2.2.7 | DR2-observed (reasons) | High (frequencies); medium (house style) | Submissions may differ | OBI-102, 103 |
| O-C6 | Only 19/203 NSW exports have footnotes; 0/10 ACT; footnotes dominated by record refs (356 `T p.l` in NSWSC) and prose (NSW-21: 60 prose-only, 34 mixed) | Most state reasons cite in body; footnote content is mostly record and commentary | DR2-observed | High | – | OBI-102, 202, 303 |
| O-C7 | 45/203 NSW exports have dangling `#_Ref` links (826); 3 have `#_Toc` | Source drafts used Word REF/TOC fields, flattened on publication | DR2-observed | Medium | Copied links | OBI-204, 205 |
| O-C8 | Record locators observed: `T157.5-15`, `T 426:11-19`, `T143 L13–T145 L43`, `Red 40[L–P]`, `CB4/7131`, `Ex P7`, `MFI P4`, `Tab 5`, `TJ [180]`; none use AGLC "Transcript of Proceedings"; no recording timestamps as locators | Notation varies within one court; store structure, render by profile; timestamps are provenance | DR2-observed | High (NSW only) | Other states differ | OBI-303, P02 |
| O-C9 | Case-name italics split across runs; up to 304 NBSPs per FCA body | Adoption must join runs and normalise NBSP | observation | High | – | OBI-203 |

### 4.3 Forensic and tool-marker observations

| ID | Observation (raw) | Interpretation | Class | Conf. | Alternatives | Stories |
|---|---|---|---|---|---|---|
| O-F1 | All 9 federal files: `Application` "Microsoft Office Word", AppVersion 16.0000 | Saved by Word 16 | DR4-saving-app | High | Says nothing about drafting tools | OBI-R03 |
| O-F2 | FCA: `Judgment.dotx` (attached by [path]), ~40 docVars, DOCPROPERTY cover fields, MACROBUTTON remnant, `ParaNumbering` style, one CC tag `MNC` bound to `schemas.globalmacros.com/FCA` | Institutional template with automation; namespace consistent with a template-builder consultancy (https://www.globalmacros.com/services/, retrieved 2026-10-06) | DR3-marker (template automation, **not** citation tool) | Medium | Namespace copied/reused | OBI-201, P04 |
| O-F3 | HCA: `Chambers V11.dotm` attached by path only; `removePersonalInformation` on; `FixListStyle` numbering; no VBA in DOCX | Macro-enabled template may exist; contents unknowable from DOCX | DR5-unknown (macros) | High (bytes) | – | OBI-P04 |
| O-F4 | No ADDIN, CITATION, BIBLIOGRAPHY, TA, TOA fields; no web extensions; bibliography part 0 sources — in all 222 inspected DOCX | No citation-tool markers survive in published files | DR5-unknown (tool use) | High (absence of markers) | Flattening; clean saves; typing | OBI-P01 |
| O-F5 | NSW exports: identical 2014–15 docProps, 198 rsids, ZIP timestamps = publication date, 0 fields | Server-generated; cannot inform tooling | DR4-saving-app | High | Platform re-wraps uploaded original | OBI-R02, R03 |
| O-F6 | ACT: revision 1, Normal template, created within days of decision; two style families | Publication saves; more than one house template | DR4-saving-app | High / Medium | Family B is stripped Family A | OBI-201 |
| O-F7 | ACT: `dgnword-*` docVars in 7/10 (one chambers) | Dragon dictation add-in was loaded at some point (dictation, not citation) | DR3-marker (dictation) | Medium | Inherited from a copied file | OBI-R03, 302 |
| O-F8 | SharePoint content-type customXml in F02, H01–H04 | Stored in SharePoint/OneDrive libraries | DR3-marker | Medium | – | OBI-205 |
| O-F9 | Obiter's own markers: namespace `urn:obiter:aglc`, CC tag `obiter-fn`, `Obiter.*` custom properties | Signature catalogue entry for false-positive checks | DR3-marker (own) | High | – | OBI-R03, 206 |

### 4.4 Obiter code observations (commit `69b9c40`)

| ID | Observation | Evidence | Conf. | Stories |
|---|---|---|---|---|
| O-K1 | Task-pane open restyles built-in Heading 1–5 (size, colour, alignment, indent, spacing) on WordApi 1.6+ unless a hidden localStorage key is set | `src/taskpane/taskpane.ts:39-61,101`; `src/word/styles.ts:138,268-285` ✔ | High (code) / medium (visible effect) | OBI-201, P04 |
| O-K2 | Every open writes six `Obiter.*` properties, including a hard-coded personal name, `CitationStyle` always "AGLC4", `CreatedDate` overwritten | `src/word/documentMeta.ts:21-37`; `taskpane.ts:116` ✔ | High | OBI-206, 205 |
| O-K3 | Refresh rebuilds the whole managed footnote (parent CC) when any citation changes; user-edited footnotes skipped; snapshot before rebuild | `src/word/citationRefresher.ts:602-614,740-797,871-904,1128-1179` | High | OBI-202 |
| O-K4 | Commentary and signal live on the citation record; library re-cite reuses the record id | `src/types/citation.ts:264-270`; `src/engine/engine.ts:5315-5345`; `src/ui/views/CitationLibrary.tsx:619-624` ✔ | Medium-high | OBI-202 |
| O-K5 | `(n X)` dropped whenever writing mode is court; toggle labelled "Ibid / (n X)"; court mode without jurisdiction keeps ibid but help text says "no ibid" | `src/engine/resolver.ts:494-497,1237`; `src/ui/views/Settings.tsx:1291` ✔ | High | OBI-101, 102 |
| O-K6 | Toggle override persists but does not refresh | `Settings.tsx:944-962` ✔ | High (code) | OBI-101 |
| O-K7 | Report hierarchy has no runtime caller; comes from live preset, not the document | `src/engine/rules/v4/domestic/cases.ts:250`; `src/engine/standards/index.ts:191-197` | High | OBI-101, 103 |
| O-K8 | `para-only` drops the starting page (`… CLR [45]`), contrary to AGLC4 r 2.2.4–2.2.5 (derived reference §2.2.5, PDF p 77: a page must always appear); `para-and-page` gives `«start», [para]` without a pinpoint page | `cases.ts:375-412`; `tests/engine/court-mode.test.ts:436,485-486` ✔ | High | OBI-103 |
| O-K9 | `loaPart`/`isKeyAuthority` serialised and used, but no UI sets them; LOA entries forced to `Normal`; LOA strips pinpoints | `src/store/xmlSerializer.ts:117-118`; `bibliography.ts:404-412,1540-1549`; `Bibliography.tsx:107` ✔ | High | OBI-204, 201 |
| O-K10 | Scan & Repair adopts whole notes as one candidate and deletes original text without snapshot | `src/word/scanRepair.ts:416-466`; `src/word/documentScanner.ts:296-322` | High | OBI-203 |
| O-K11 | `apiCompat.ts` flags wrong (comments 1.8→1.4; tracked changes 1.8→1.6; addStyle 1.6→1.5) and unused; custom-properties guard 1.6 (API is 1.3) | `src/word/apiCompat.ts:38-74,121-127`; `documentProperties.ts:29-33` ✔ | High | OBI-401 |
| O-K12 | No use of fields, bookmarks, tracked changes, comments, `changeTrackingMode`, `getFileAsync`, CC events | grep of `src/` (R08 §4.2) | High | OBI-204, 205, 206 |
| O-K13 | Only `academic`/`court` writing modes; citations only in footnotes; r 2.7/2.8 only for transcripts and submissions | `src/engine/standards/types.ts:19`; `src/ui/views/InsertCitation.tsx:935`; `src/types/citation.ts:130-145` | High | OBI-301, 303 |
| O-K14 | r 2.8 renders empty title and proceeding number; no "(during argument)" guard; HCATrans number 0 | `cases-supplementary.ts:569-571`; `engine.ts:889-894`; no match in `src/engine/validator.ts` ✔ | High | OBI-303 |
| O-K15 | No `.docx`/OOXML fixtures; tests/fixtures holds interchange, pdf, standards only | `tests/fixtures/` listing ✔ | High | OBI-402 |
| O-K16 | Quotation insert resets paragraphs to `Normal` | `src/word/quotationInserter.ts:105` ✔ | High | OBI-201 |

### 4.5 Platform observations (R08)

| ID | Observation | Source | Conf. | Stories |
|---|---|---|---|---|
| O-P1 | Within WordApi 1.5 on all platforms: footnotes, nested CCs and events, custom XML, bookmarks (1.4), field **reading**, comments (1.4), `changeTrackingMode` (1.4), `getReviewedText`, `getByChangeTrackingStates` (1.5), `getStyles`/`addStyle` (1.5), list reading (1.3), OOXML read, `getFileAsync(Compressed)` | MS-1, MS-2, MS-5 | High | 201, 204, 205, 206, 401 |
| O-P2 | Field writes (REF, NOTEREF, TA, TOA) work on Windows/Mac only; web reports 1.5 but fields are "mainly read-only" | MS-4 | High | 204, 401 |
| O-P3 | Native TOA object model: WordApiDesktop 1.4 (Windows, Mac), not web or iPad | MS-3 | High | 204 |
| O-P4 | Tracked-change read/accept/reject: WordApi 1.6 | MS-2 | High | 205 |
| O-P5 | PDF export preview-only; no save-as of current file; no save/close events; no footnote numbering API; no VBA access | MS-5, MS-6; absence in tables | High / medium (absence) | 206, P04 |
| O-P6 | Windows LTSC 2024: up to WordApi 1.8, Desktop 1.1. iPad: no Desktop 1.3+ | MS-1 | High | 401 |

### 4.6 Vendor observations (placeholders only)

| ID | Observation | Source (retrieved 2026-10-06) | Conf. | Class |
|---|---|---|---|---|
| O-V1 | FTR log notes export TXT/CSV/XML/HTML with time + speaker | https://ftr.elevio.help/en/articles/234-how-can-i-export-recording-audio-and-log-notes | Low-medium | Format only |
| O-V2 | Epiq supplies Word/PDF transcripts (Vic SC civil, Qld, ACT Magistrates) | https://www.epiqglobal.com/en-au/services/court-reporting/transcription-services | Low | Format only |
| O-V3 | VIQ supplies FCA/FCFCOA transcripts as editable Word; public quality concerns | https://www.abc.net.au/news/2025-11-29/family-court-transcripts-viq-solutions/105904558 | Low-medium | Format only |
| O-V4 | CAT ASCII/PTX formats have fixed-column page/line (US evidence) | https://www.thomsonreuters.com/content/dam/helpandsupp/en-us/Topics/reallegal/files/etm-user-guide.pdf | Low | Format only |
| O-V5 | No AU vendor API, licence or stable locator feed found | absence | Low | DR5-unknown |

## 5. What the evidence does and does not support

| Supports (now) | Does not support |
|---|---|
| Correcting presets where Obiter contradicts a current instrument (O-R1 to O-R13, O-R19) | Labelling any court profile "verified" (DR1 needs current submissions examples) |
| Template-safety and privacy fixes (O-K1, O-K2, O-K16) | Any claim that a court uses a particular citation tool (O-F4: DR5) |
| Labelling ibid suppression as an Obiter preference (O-R14) | Shipping judgment conventions (O-C1 to O-C5) as submission rules |
| Opt-in judgment conventions labelled "observed" for a reasons document type (DR2) | FCA-5 as a current FCA/FCFCOA profile |
| A structured record-locator model; NSWCA and QCA renderers from primary text | Recording timestamps as citation locators |
| Capability matrix and runtime capability checks (O-P1 to O-P6) | Native TOA/REF authoring on web or iPad; PDF export from the add-in |
| Read-only detection and preservation of foreign fields, docVars and custom XML (DR6) | Vendor integrations (FTR, Epiq, VIQ, CAT, JusticeLink, RedCrest) |

## 6. Review process

- Re-check every DR1-rule source quarterly and on any `lastVerified` older than 90 days; record new SHA-256 values here.
- Re-run the OOXML inspector on new samples; append rows, never overwrite.
- Any new court profile must cite register IDs for each toggle value (see STORY-PLAN COURT-106, COURT-116).
