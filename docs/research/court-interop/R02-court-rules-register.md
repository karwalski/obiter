# R02: Australian court citation rules register

**Track:** R2, which unlocks OBI-103, OBI-104 and OBI-301
**Register version:** 1.0, compiled 6 October 2026
**Obiter commit compared:** `69b9c40`. Source files: `src/engine/court/presets.ts`, `src/engine/court/practiceDirections.ts`, `src/engine/court/reportHierarchy.ts`, `src/ui/data/courtReferenceGuide.ts`
**Status:** research evidence only. No Obiter source code was changed.

## 1. Method and limits

- I read each instrument in its primary form: the official PDF or HTML from the court, legislation or AIJA site. Every item was retrieved on **6 October 2026**.
- The Federal Court (fedcourt.gov.au) and NT Supreme Court sites returned Cloudflare 403 challenges to automated requests. For those I used Internet Archive captures. Each capture's timestamp is shown, and a capture is a copy as at that date, not live confirmation.
- Two documents are image-only scans: ACT PD 2 of 2022 and NSW SC CCA 1. I read them by OCR (tesseract), so their wording has **medium-high** confidence.
- SHA-256 prefixes for the retrieved PDFs are listed in section 9 so the files can be re-checked. They are scratch copies and are not committed.
- If an instrument says nothing on a topic (for example ibid), I record it as "silent". That means only that this instrument does not address the topic. It does not mean the court prohibits or permits the practice.
- Rules for judgments are kept separate from rules for submissions. A court's own judgment conventions are **not** treated as rules for practitioners' documents (backlog OBI-301).
- Names of individual judicial officers, and author metadata from the PDFs, are omitted.

## 2. Evidence register (versioned)

Key to "Type": **S** = submissions and lists of authorities, **J** = judgments and reasons, **O** = orders, **T** = transcript.

| ID | Court | Instrument | Type | Effective / version | URL (retrieved 2026-10-06) | Confidence |
|---|---|---|---|---|---|---|
| HCA-1 | High Court | Practice Direction No 2 of 2024, *Joint Book of Authorities: Appeals and Other Full Court Matters* | S | Applies to matters set down after 1 Jan 2025; dated 20 Dec 2024; revokes PD 1 of 2019 | [PDF](https://www.hcourt.gov.au/sites/default/files/assets/registry/practice-directions/Practice_Direction_No_2_of_2024__Joint_Book_of_Authorities_20_December_2024.pdf) | High |
| HCA-2 | High Court | High Court Rules 2004 Pt 44; Form 27A (approved by PD 1 of 2024) | S | 2024 forms | [Form 27A](https://www.hcourt.gov.au/sites/default/files/assets/registry/Forms2024/FORM_27A_2024.pdf); [PD index](https://www.hcourt.gov.au/court-procedures/filing-documents/practice-direction) | High |
| FCA-1 | Federal Court | *Lists of Authorities and Citations Practice Note (GPN-AUTH)* | S | 7 May 2025 | [page](https://www.fedcourt.gov.au/law-and-practice/practice-documents/practice-notes/gpn-auth), via Archive capture 2025-12-05 | High (capture) |
| FCA-1h | Federal Court | GPN-AUTH, earlier version | S | Version in force at Archive capture 2022-03-04 | Archive 20220304200231 of the same URL | High (historical) |
| FCA-2 | Federal Court | *eBooks Practice Note (GPN-eBOOKS)* | S | From 11 Jun 2026 | [page](https://www.fedcourt.gov.au/law-and-practice/practice-documents/practice-notes/gpn-ebooks), via capture 2026-09-29 | High (capture) |
| FCA-3 | Federal Court | *Practice Note APP 2: Content of Appeal Books and Preparation for Hearing* | S | Reissued 1 Dec 2025 | [page](https://www.fedcourt.gov.au/law-and-practice/practice-documents/practice-notes/app2), via capture 2025-12-08 | High (capture) |
| FCA-4 | Federal Court | Judgments FAQ | J | Capture 2025-12-05 | [page](https://www.fedcourt.gov.au/digital-law-library/judgments/judgments-faq) | Medium |
| FCA-5 | Federal Court (procurement) | PA2925-06-100 Part B, Attachment B, *Transcript Style Guide and Judgment Templates* | T, J, O | PDF created 19 Sep 2019; historical (see section 4) | [PDF](https://www.fedcourt.gov.au/__data/assets/pdf_file/0011/586892/PA2925-06-100-Part-B-Attachment-B-Transcript-Style-Guide-and-Judgment-Templates.pdf), via capture 2026-05-27; SHA-256 `63a4b094…` | High (as a document); low (as current practice) |
| FCF-1 | FCFCOA | *Family Law Practice Direction: Appeals* (FAM-APPEALS) | S | Applies to proceedings from 1 Sep 2021; updated 9 Dec 2024 and 10 Jun 2025 | [page](https://www.fcfcoa.gov.au/fl/pd/fam-appeals) | High |
| NSW-1 | NSW Supreme Court (all divisions, CA, CCA) | Practice Note SC Gen 20, *Citation of Authority* | S | Issued 12 Sep 2023; commenced 1 Oct 2023; page updated 26 Feb 2026 | [page](https://supremecourt.nsw.gov.au/practice-procedure/practice-notes0/general-practice-notes/sc-gen-20.html); [PDF](https://supremecourt.nsw.gov.au/content/dam/dcj/ctsd/supreme-court/documents/Practice-and-Procedure/Practice-Notes/general/current/20230912_SC_Gen_20_Citation_of_Authority.pdf) | High |
| NSW-2 | NSW Court of Appeal | Practice Note SC CA 1, *Court of Appeal* | S | Issued 1 May 2023; commenced 8 May 2023 | [PDF](https://supremecourt.nsw.gov.au/content/dam/dcj/ctsd/supreme-court/documents/Practice-and-Procedure/Practice-Notes/court-of-appeal-practice-notes/current/2023_05_08_PN_SC_CA_1_-_Court_of_Appeal.pdf) | High |
| NSW-3 | NSW Court of Criminal Appeal | Practice Note SC CCA 1, *General* | S | Issued and commenced 22 Jul 2021 | [PDF](https://supremecourt.nsw.gov.au/content/dam/dcj/ctsd/supreme-court/documents/Practice-and-Procedure/Practice-Notes/cca-practice-notes/current/2021_07_22_SC_CCA_1_General.pdf) (scan; OCR) | Medium-high |
| NSW-4 | NSW District and Local Courts | Practice-note indexes. No citation note found. | – | Indexes checked 2026-10-06 | [District](https://districtcourt.nsw.gov.au/practice-procedures-publications/practice-and-procedure/practice-notes.html); [Local](https://localcourt.nsw.gov.au/practice-publications/practice-notes.html) | Medium (indexes only) |
| NSW-5 | NSW Court of Appeal judgments (observed) | NSW Caselaw publication conventions | J | 3 decisions, [2026] NSWCA 206–208 | [caselaw.nsw.gov.au](https://www.caselaw.nsw.gov.au) | Observed convention only |
| VIC-1 | Vic Supreme Court | Practice Note SC Gen 3, *Citation of authorities and legislation* | S, J | Issued and commenced 1 Dec 2025, replacing 30 Jan 2017 | [PDF](https://www.supremecourt.vic.gov.au/sites/default/files/2026-03/SC%20Gen%203%20-%20citation%20of%20authorities%20and%20legislation.pdf) | High |
| VIC-2 | Vic Court of Appeal | Practice Note SC CA 3, *Civil Applications and Appeals (Third revision)* | S | Reissued 10 Mar 2026, replacing 14 Apr 2025, 30 Sep 2019 and 30 Jan 2017 | [page](https://www.supremecourt.vic.gov.au/areas/legal-resources/practice-notes/sc-ca-3-civil-applications-and-appeals-third-revision); [PDF](https://www.supremecourt.vic.gov.au/sites/default/files/2026-03/CA%203%20-%20Civil%20applications%20and%20appeals.pdf) | High |
| QLD-1 | Qld Supreme Court (Trial Division and CA) | Practice Direction 1 of 2024, *Citation of Authority* | S | Dated 16 Jan 2024; commenced 29 Jan 2024; repeals PD 16 of 2013 | [PDF](https://www.courts.qld.gov.au/__data/assets/pdf_file/0007/786697/scpd-01-of-2024.pdf) | High |
| QLD-2 | Qld Court of Appeal | Practice Direction 3 of 2013, *Court of Appeal* | S | 2013 (still referenced as current) | [PDF](https://www.courts.qld.gov.au/__data/assets/pdf_file/0003/177456/sc-pd3of2013.pdf) | High |
| QLD-3 | Qld Magistrates Courts | Practice Direction 7 of 2024, *Citation of Authority* | S | Issued 7 Jun 2024 | [PDF](https://www.courts.qld.gov.au/__data/assets/pdf_file/0005/800915/mcpd-07-of-2024.pdf) | High |
| WA-1 | WA Supreme Court | Consolidated Practice Directions: PD 2.1 (outlines and lists of authorities); PD 8.2.2 (medium neutral citation); PD 9.21 (generative AI) | S, J | CPD last updated 23 Sep 2026 (PDF "as at 25 Sep 2026"). PD 2.1 last amended 14 Feb 2025 (email address) and 21 Mar 2022 (para 13). PD 9.21 added 10 Dec 2025. | [CPD page](https://www.supremecourt.wa.gov.au/C/consolidated_practice_directions.aspx) | High |
| SA-1 | SA Supreme, District and Magistrates (civil) | Uniform Civil Rules 2020, r 101.8 (submissions) and rr 217.8 / 218.8 (appeal lists of authorities), Form 91 | S | Current to 15 Mar 2026 (Amending Rules No 16) | [PDF](https://www.courts.sa.gov.au/wp-content/uploads/wp-download-manager-files/court-rules/08-uniform-civil-rules/Uniform%20Civil%20Rules%202020.pdf) | High |
| TAS-1 | Tas Supreme Court | Practice Direction No 3 of 2014, *Citation of Judgments* | S | 21 Feb 2014; replaces PD 4/2009 | [PDF](https://supremecourt.tas.gov.au/wp-content/uploads/2018/11/Practice_Direction_3_of_2014_-_Citation_of_Judgments_.pdf) | High |
| TAS-2 | Tas Supreme Court | Practice Direction No 3 of 2022, *Appeal Books, Lists of Authorities and Submissions* | S | 24 Aug 2022; replaces PDs 7/2005, 4/2014, 5/2019 and Circular 11/2017 | [PDF](https://www.supremecourt.tas.gov.au/wp-content/uploads/2022/08/3-of-2022-Practice-Direction-Appeal-Books-Lists-of-Authorities-Written-Submissions.pdf); [index](https://www.supremecourt.tas.gov.au/publications/directions/) | High |
| ACT-1 | ACT Supreme Court and Court of Appeal | Practice Direction 2 of 2022, *Citation of Authority* | S | Effective 26 May 2022 | [PDF](https://www.courts.act.gov.au/__data/assets/pdf_file/0006/2008356/2a13102c6f1ab879a79145619cec0cb3abf2241d.pdf) (scan; OCR); [index](https://www.courts.act.gov.au/supreme/about-the-courts/court-procedure/practice-notes-and-directions-and-notices-to-practitioners/practice-directions) | Medium-high |
| NT-1 | NT Supreme Court | Practice Direction No 2 of 2007, *Citation of Authorities* | S | 25 May 2007 | [PDF](https://supremecourt.nt.gov.au/_resources/documents/lawyers/practice-directions/citation-of-authorities-2-of-2007.pdf), via capture 2025-11-18 | High (capture) |
| NT-2 | NT Supreme Court | Practice Direction No 1 of 2025, *Lists of Authorities & Summaries of Submissions* | S | 1 Jan 2025; rescinds PD 4 of 2016 | [PDF](https://supremecourt.nt.gov.au/_resources/documents/lawyers/practice-directions/practice-direction1of2025-lists-authorities-summaries-submissions.pdf), via capture 2025-11-18 | High (capture) |
| AIJA-1 | National (advisory) | AIJA, *Guide to Uniform Production of Judgments* (2nd ed, 1999) | J | 1999; advisory and historical | [PDF](https://aija.org.au/wp-content/uploads/2017/10/Guide-to-Uniform-Production-of-Judgments-2nd-Ed-Olsson-1999.pdf) | High (as a document) |

## 3. Citation requirements by court (submissions and lists of authorities)

"AGLC" records whether the instrument **mandates** AGLC, **recommends** it, or is **silent**.

| Court | Preferred / authorised reports | MNC | Parallel citation and order | Pinpoint | Ibid / subsequent refs | Footnotes | List of authorities | AGLC |
|---|---|---|---|---|---|---|---|---|
| **HCA** (HCA-1, HCA-2) | JBA cases reproduced "where possible" from the authorised series in a table: CLR (ALJR if not in CLR), FCR, VR/VLR, NSWLR/SR (NSW), ACTLR, NTLR, Qd R/St R Qd, SASR/SALR, Tas R/Tas SR/TLR, WAR/WALR. Form 27A Part IV requires the authorised-report citation of the decisions below, otherwise another report, otherwise the "internet citation". | Only as the fallback for decisions below | **Silent** on parallel form in submissions | Silent | Silent | Silent | **Joint Book of Authorities in five parts:** A principal legislation; B other legislation (extracts, by jurisdiction); C CLR cases; D other report series; E other materials. Index cross-referenced to submission paragraphs, plus a legislation-version column. Counsel's certificate. Volumes of at most 500 pages. Form 27A annexure: legislation table (version, provisions, reason, applicable date). | Silent |
| **FCA** (FCA-1 to FCA-3) | Annexure lists the authorised series by court and years | "Where available" (cl 2.4(b)) | MNC **plus** authorised report "if possible"; if there is no authorised report, the other report. The cl 2.5 example is **MNC first**: *D'Arcy v Myriad Genetics Inc* [2014] FCAFC 115; (2014) 224 FCR 479. | Paragraph preferred ("at [29]"); page if no paragraphs ("at 481") (cl 2.6). MNC paragraph references are sufficient (cl 2.4). APP 2 cl 4.7 example is a page range "212-213". | Silent | Silent. APP 2 cl 4.2(d) requires italics **or underlining** for case and legislation citations. | GPN-AUTH 2025 has **no Part A/B**. The 2022 version did: Part A "read", Part B "might refer". eBooks of authorities are split into (a) authorities, (b) legislation, (c) bills and explanatory material, each alphabetical (GPN-eBOOKS 7.2). Legislation extracts state their date in force (7.4). Deadlines: 5, 4 and 2 business days (cl 3.1–3.3, 4.1). | FAQ refers users to AGLC4 for citing FCA judgments (FCA-4). The practice note is silent. |
| **FCFCOA** appeals (FCF-1) | Cite the authorised series if the case is in one; otherwise the report where available | For **unreported** judgments only, with paragraph(s) | **No parallel requirement**: report replaces MNC | Paragraphs for MNC; page or paragraph otherwise | Silent | Silent | Part 1 cited; Part 2 might be called for but not cited (cl 5.8) | Silent |
| **NSWSC / NSWCA / NSWCCA** (NSW-1) | 10 authorised series listed | "Acceptable" for any authority (cl 3) | Authorised report "should, as far as possible, also be noted" in lists and submissions (cl 4). Order not stated. | MNC paragraph numbers "sufficient and appropriate" (cl 4) | Silent | Silent | See the next rows | Silent |
| NSWCA (NSW-2) | – | – | – | Judgment below cited by paragraph; transcript by black-book page **and line** (cl 31) | Silent | Footnotes "only to be used for citing references" (cl 30) | **Four categories, not labelled Part A/B:** (1) legislation with sections and version date ("as at …"); (2) cases to be read, sub-grouped into CLR/NSWLR (max 10), up to 5 from other reports, and other; (3) cited, not read; (4) secondary sources. Word or text-searchable, with hyperlinks. Due 10.00 am, 2 business days before. | Silent |
| NSWCCA (NSW-3) | – | A Caselaw MNC is "not considered to be a reported judgment" | – | – | Silent | Silent | **Single list** of only authorities expected to be referred to orally; copies of unreported judgments attached. Due 10.00 am the working day before. | Silent |
| NSW District / Local (NSW-4) | No instrument found | – | – | – | – | – | No instrument found | Unknown |
| **VSC** (VIC-1) | "Where a case is reported, that report must be included **instead of** the unreported version"; authorised over unauthorised (cl 5.2) | Only for unreported judgments | **Not parallel**: report replaces MNC | Paragraphs, plus the commencing page if reported: "(2023) 72 VR 394, 410 [60]"; MNC "[2025] VSCA 252 [57]" (cl 5.5) | Silent | Silent | Silent | **Recommended**: "The Court uses the AGLC as the basis for citation formats in its publications and parties are invited to do the same" (cl 4.1). This also covers the Court's own judgments. |
| **VSCA** civil (VIC-2) | Authorised report "must be given"; otherwise a reported version if available (cl 14.4) | – | Not parallel | **Mandatory** pinpoints for all authorities and material (cl 14.3) | Silent | Body ≥12 pt, footnotes ≥10 pt (cl 5.4) | **Parts A (read), B (refer, not read), C (texts, articles, extrinsic)**, with "None" under any empty part (cl 14.1–14.2). An amended list marks additions underlined and deletions struck through, plus a clean copy (cl 14.6). | **Mandated**: "current edition" of AGLC (cl 14.5) |
| **QSC / QCA** (QLD-1, QLD-2) | 10 authorised series listed | "Acceptable" | Authorised report "should, as far as possible, also be noted" (cl 3) | Identify passages; MNC paragraphs "sufficient and appropriate" (cl 4(a)–(b)) | Silent. Must cite later judgments that **doubted or did not follow** the case (cl 4(c)). | Silent | QCA: **Part A** (definitely rely on) and optional **Part B** (other cases that may be referred to). Copies of Part A only. | Silent |
| Qld Magistrates (QLD-3) | Same as QLD-1 | Same | "should, as far as possible" | Same | Same (doubted or not followed) | Silent | Silent | Silent |
| **WASC / WASCA** (WA-1) | "Reported cases must be cited by reference to the relevant authorised report" (PD 2.1 cl 14) | MNC "where possible" at **first** reference; unreported cases by MNC (cl 14–15) | PD 8.2.2 cl 4: **MNC first, then report**, e.g. "Lee v The Queen [1999] WASCA 14; (1999) 18 WAR 23, 34 [15] (Smith J)" | Pages or paragraphs (PD 2.1 cl 7(a)). Hybrid page and paragraph, with judicial attribution (PD 8.2.2). | **Later references by case name only**, unless names are duplicated or popular (PD 2.1 cl 14) | Silent | **Combined outline**: submissions followed by a list of all and only the authorities in the outline. Cases alphabetical, separate from legislation (alphabetical by short title). Cases to be read marked with an **asterisk**, plus the pages or paragraphs to be read. A statement is required if none will be read (cl 11–13). | Silent |
| **SA** (SA-1) | Highest-ranking authorised series; otherwise an available published series (r 101.8(4), r 217.8(3)) | **Must** include an MNC if the case postdates 1997 and is online (r 217.8(3)(c)) | Effectively **mandatory** dual citation for post-1997 reported cases. Order not stated. | Silent | Silent | Silent | Appeals: Form 91, 2 parts (expected to be read / not expected to be read), with the hearing date and judicial officer. **Hyperlinks** required: HTML for Thomson Reuters/LexisNexis authorised reports, RTF or PDF/A for AustLII, both the authorised and the free MNC version, otherwise the words "hyperlinking unavailable" (r 217.8(4)–(10)). | Silent |
| **TASSC** (TAS-1, TAS-2) | Authorised reports preferred; then accredited reports; then unreported (PD 3/2014 cl 3) | "Should be provided" (cl 3(d)) | If an MNC is given, the authorised citation must be given too. Example is **MNC first**: "Jackson v Building Appeal Board [2010] TASSC 29; (2010) 20 Tas R 1". | Paragraphs over pages where the report has numbered paragraphs (CLR from 1998, Tas R from 1999); "Smith v Brown [1997] TASSC 161 at [15]". Appeal submissions: full citation with page **and line** at the start and end of the passage (PD 3/2022 cl 2.2.4). | Silent. Must cite later judgments that doubted or did not follow the case (cl 3(f)). | Silent | **Part 1** cited (with pinpoints); **Part 2** might be referred to; **Part 3** legislation with sections. At least 48 hours before (PD 3/2022). | Silent |
| **ACTSC / ACTCA** (ACT-1) | The authorised report citation "should be used"; otherwise other series (cl 3–4) | **Silent** | **Not required** | Silent | Silent | Silent | Silent; copies follow the cited report (cl 5) | Silent |
| **NTSC** (NT-1, NT-2) | The authorised report "is to be cited" (NTR before 1991, NTLR; CLR, FCR, State Reports); then unauthorised reports; then a copy of the judgment (PD 2/2007) | **Silent** (pre-dates general MNC practice) | **Not required** | Silent | Silent | Silent | Required whenever authorities are relied on: single judge at least 24 hours before; multi-judge per Supreme Court Rules r 82.10 (PD 1/2025). Format is in r 82.10, which I have **not read**. | Silent |

**Ibid:** none of the instruments read addresses ibid. The closest provisions are WA PD 2.1 cl 14 (later references by case name) and NSW SC CA 1 cl 30 (footnotes for references only).

## 4. Judgment, order and transcript sources

### 4.1 Federal Court "Transcript Style Guide and Judgment Templates" (FCA-5)

- **Date and status.** The 34-page PDF was created and modified on 19 September 2019 (PDF metadata). It is Attachment B to procurement PA2925-06-100, Part B. Section 13 says the provider relies on the "existing" guide, and the Court will supply updated templates as they are revised. It names the **Family Court of Australia**, the **Federal Circuit Court** and the AAT (Tasmania). Those courts were replaced by the FCFCOA on 1 Sep 2021 and the AAT by the ART in Oct 2024.
  - **Interpretation:** this is a 2019 contract specification, not a current practice direction.
  - **Confidence:** high that it is historical; low for current applicability.
  - **Alternative explanation:** the templates may have been carried forward with renamed headings. Only a current FCFCOA judgment sample (R3) could show that.
- **Transcript conventions** (relevant to OBI-302/303):
  - Footer locator: `.NSD21/2019 26.7.19 P-491 <WITNESS> XN`, using the codes XN, XXN, RXN, FXN, FXXN and FRXN.
  - Line numbers every fifth line, and sequential page numbers `P-xxx`.
  - Structured "<" markers for witness events.
  - `EXHIBIT #n` and `MFI #n`, with dates as dd/mm/yyyy.
  - Indistinct material shown as dots.
  - Times shown as `[2.59 pm]`.
  - Delivered in **Microsoft Word**, and checked with a "Transcript Checker".
  - Transcribed draft judgments carry a "DRAFT" watermark (TNR 80 pt, diagonal, Gray-40%).
- **Judgment templates** (Annexures 1–4: FCC; FamCA first instance; FamCAFC single-judge appeal; FamCAFC Full Court):
  - Named styles: Body Text 1–8 levels of outline numbering, quotation/quotation2/quotation3, Bullet, Heading 1–3, and Orders / Orders-abc / Orders-123.
  - 13 pt Times New Roman, with automatic paragraph numbering.
  - The cover page includes **"Cases cited:"** and **"Legislation:"** fields (FCC). FamCAFC adds "Lower court MNC".
  - The certification paragraph counts paragraphs in words and numerals.
  - The templates contain **no citation-format rules** and are silent on footnotes and ibid.
  - **Orders** sit in a separate section with their own numbering styles and contain no citation content.
  - **Product implication:** OBI-201 should preserve style names such as `Orders-abc` and `quotation2`, and OBI-301 should treat orders as citation-free.

### 4.2 Other judgment-side sources

- **AIJA Guide (1999) (AIJA-1).** Advisory national guidance for judgment production:
  - Citations stay **in the text** rather than in footnotes, for electronic retrieval; footnotes are "database unfriendly" (para 5.8).
  - The paragraph pinpoint form is "[1998] HCA 99 at [17]" (5.7).
  - Three subsequent-reference conventions are allowed: full every time, "supra/ibid" (then FCR, FLR, ALJR practice), or a case list (as in NSWLR, FCR).
  - The hybrid pinpoint form is "at 52 [27]".
  - Parallel citations put the **MNC first**: "[1998] HCA 25 at [27]; (1998) 152 ALR 34 at 52".
  - This is historical. It shows that judgment conventions came from a separate tradition, distinct from AGLC footnote style.
- **WA PD 8.2.2.** Governs how the WA Court's own reasons are cited (MNC, paragraph numbering, MNC-first parallel citation, judicial attribution). It also sets the sentencing-remarks identifier `[2011] WASCSR 1` (from 1 Feb 2011), which **Obiter does not recognise** (no `WASCSR` match in `src/`).
- **Vic SC Gen 3 cl 4.1.** The only instrument found that states which citation style a court uses **in its own publications**: AGLC.
- **NSW Caselaw (observed convention, 3 NSWCA decisions from 2026, low sample).**
  - Reasons use **report-first** parallel citation, eg "(2011) 246 CLR 36; [2011] HCA 53".
  - Pinpoints are "at [15]" after the MNC, often with judicial attribution.
  - Metadata fields: Medium Neutral Citation, Catchwords, Legislation Cited, Cases Cited, Category.
  - No "ibid" occurred.
  - This is labelled an observed convention under decision rule 2, not a rule. It **conflicts in order** with the WA, Tas, AIJA and FCA examples.

## 5. Comparison with Obiter's court presets

Severity: **H** = Obiter output or guidance contradicts the current instrument; **M** = overstated or unsourced; **L** = cosmetic or a link problem.

| # | Obiter claim (code) | Evidence | Mismatch | Sev | Confidence |
|---|---|---|---|---|---|
| 1 | FCA `loaType: "part-ab"` (`presets.ts:211`, doc `presets.ts:55`); guide text "Part A / Part B LOA required" (`courtReferenceGuide.ts:101`) | GPN-AUTH 7 May 2025 has no parts; the 2022 version had Part A/B (FCA-1h). GPN-eBOOKS 7.2 splits the eBook into authorities / legislation / bills. | **Stale**: Part A/B was removed in the 2025 reissue | H | High |
| 2 | FCA parallel order is report-first by default (no `parallelOrder`, `presets.ts:203-212`) | GPN-AUTH cl 2.5 example is MNC first | Order contradicts the court's own example | M | High |
| 3 | GPN-AUTH title "Citation of Authorities and Provision of Lists of Authorities" (`practiceDirections.ts:46`, `courtReferenceGuide.ts:83`) | Actual title: "Lists of Authorities and Citations Practice Note (GPN-AUTH)" | Wrong title | L | High |
| 4 | HCA `loaType: "part-ab"` (`presets.ts:195`, doc `presets.ts:55`) | PD 2/2024: a five-part JBA (A–E) by legislation and report source. The guide data already describes five parts (`courtReferenceGuide.ts` HCA entry). | Preset type contradicts both the instrument and Obiter's own guide | H | High |
| 5 | HCA "Parallel citations are mandatory: authorised report first, then MNC" (`courtReferenceGuide.ts:59`; `presets.ts:190`) | PD 2/2024 and Form 27A are silent on parallel form; Form 27A requires the authorised report for the decisions below | **Unsourced** | M | Medium (instrument silence) |
| 6 | `reportHierarchy.ts:18` cites "HCA PD 1 of 2019" | PD 1 of 2019 revoked 20 Dec 2024 (PD 2/2024 cl 2) | Stale reference | L | High |
| 7 | FCFCOA `parallelCitations: "mandatory"`, hierarchy `["FamCAFC","FLC","ALR"]` (`presets.ts:220-222`; `courtReferenceGuide.ts:123`) | FAM-APPEALS cl 5.8: the report replaces the MNC, and the MNC is for unreported cases only. `reportHierarchy.ts:68` itself says FamCAFC is an MNC identifier, not a report series, and uses `["Fam LR","FLC","ALR","MNC"]`. | Overstated parallel requirement; internal inconsistency; non-report value in the report hierarchy | H | High |
| 8 | NSWCA `loaType: "part-ab"` "(SC CA 1)" (`presets.ts:244`; `courtReferenceGuide.ts:160`) | SC CA 1 cl 37: four categories (legislation with version date; cases read, with caps; cited not read; secondary). No "Part A/B" labels. | Structural mismatch: misses the legislation version date, the read-case caps and secondary sources | M | High |
| 9 | No NSWCCA preset (`presets.ts:120-146`) | SC CCA 1 cl 27–29: a single oral-reference list; Caselaw MNC is not a reported judgment | Missing court | M | Medium-high (OCR) |
| 10 | NSW_DISTRICT_LOCAL "SC Gen 20 (applied by convention)" (`courtReferenceGuide.ts:199`); preset `presets.ts:256-265` | No citation practice note found in the District or Local Court indexes | Convention asserted without evidence. Should be labelled "no instrument found; AGLC4 fallback". | M | Medium |
| 11 | VSC `parallelCitations: "mandatory"` (`presets.ts:293`); VSCA likewise (`presets.ts:279`) | SC Gen 3 cl 5.2: the report is cited "instead of" the unreported version. SC CA 3 cl 14.4: give the authorised report. Neither requires the MNC alongside it. AGLC4 r 2.2.7 prohibits parallel citations. | **Contradicts** the court, and the court recommends or mandates AGLC | H | High |
| 12 | VSCA comment "authorised citation mandatory … AGLC compliance mandatory" (`presets.ts:268-275`) | Confirmed (SC CA 3 cl 14.4–14.5) | Consistent. Not yet modelled: "None" under empty parts, and the amended-list mark-up (cl 14.2, 14.6). | L | High |
| 13 | QLD_DISTRICT_MAG `parallelCitations: "mandatory"` (`presets.ts:339`; `courtReferenceGuide.ts:334`) | Mag PD 7/2024 cl 3: "should, as far as possible", the same as PD 1/2024, which Obiter already softened for QSC and QCA | Inconsistent with the 2026-07-23 sign-off logic | M | High |
| 14 | Qld District Court | No District Court citation PD found | Coverage gap. The preset merges District and Magistrates without a District source. | M | Medium |
| 15 | WASC preset (`presets.ts:354-364`); PD version "updated 20 Jun 2025" (`practiceDirections.ts:124`) | Substance confirmed (PD 2.1, PD 8.2.2). CPD now updated 23 Sep 2026; the citation PDs are unchanged since 2022/2025. | Stale version label only | L | High |
| 16 | WA AI guidelines "post-2025 consultation" (`practiceDirections.ts:416`, `:602`) | CPD PD 9.21 *Guidelines for the use of generative AI*, inserted 10 Dec 2025 | Stale; should cite PD 9.21 | L | High |
| 17 | WA subsequent references: `ibidSuppression: "on"` only | PD 2.1 cl 14: later references by case name only | A positive rule exists but is not modelled (short form = case name) | M | High |
| 18 | SASC `parallelCitations: "preferred"` (`presets.ts:372`) | r 217.8(3) and r 101.8(4): highest authorised report **and** MNC (post-1997) "must" be included | **Understated** | H | High |
| 19 | SA hyperlink rules | r 217.8(4)–(10) | Not modelled (no hyperlink or "hyperlinking unavailable" output) | M | High |
| 20 | SA District and Magistrates (civil) | The Uniform Civil Rules apply across SA civil courts | Missing courts | M | High |
| 21 | TASSC report-first default (`presets.ts:384-393`) | PD 3/2014 cl 3(a) example is MNC first; "at [15]" form | Order mismatch | M | High |
| 22 | TASSC `unreportedGate: "warn"` | PD 3/2014 cl 5 ("should not usually be cited unless …") | Consistent | – | High |
| 23 | ACTSC `parallelCitations: "preferred"` (`presets.ts:402`) | PD 2/2022: use the authorised report; silent on MNC | Overstated; the evidence supports "off" (report only) | M | Medium-high (OCR) |
| 24 | NTSC `parallelCitations: "preferred"` (`presets.ts:416`); PD title "Citation of Unreported Cases" (`practiceDirections.ts:162`, `courtReferenceGuide.ts:448`) | PD 2/2007 is titled "Citation of Authorities": the authorised report is to be cited, and MNC is not mentioned | Wrong title; overstated parallel | M | High |
| 25 | `ibidSuppression: "on"` for every court (`presets.ts` all entries); "Ibid and (n X) are not used" (`courtReferenceGuide.ts:62` and others) | No instrument read in section 2 mentions ibid. The AIJA guide lists supra/ibid as one acceptable judgment convention. | **Unsourced** across the board. Per backlog OBI-102 it should be marked a user preference or observed convention. | M | Medium |
| 26 | Qld subsequent treatment options include "overruled" and "distinguished" (`presets.ts:89-109`) | PD 1/2024 cl 4(c) and Tas PD 3/2014 cl 3(f): "doubted, or not followed" | Wider than the trigger (already noted in CRIT-004). The Tas equivalent is not modelled (`QLD_JURISDICTIONS`, `presets.ts:469`). | L | High |
| 27 | Jurisdiction keys `QLD_DIST_MAG` (`practiceDirections.ts:115`) and `NSW_DIST_LOCAL` (`courtReferenceGuide.ts:195`) vs preset IDs `QLD_DISTRICT_MAG` / `NSW_DISTRICT_LOCAL` (`presets.ts:128,136`) | Acknowledged in a test comment (`tests/engine/court-integration.test.ts:321`) | A lookup by preset ID misses these links | L | High |
| 28 | Legislation version/date | Required by HCA Form 27A annexure, NSW SC CA 1 cl 37(1), FCA GPN-AUTH cl 2.3 and GPN-eBOOKS 7.4 | Not modelled in court mode | M | High |
| 29 | Transcript and appeal-book locators | NSW SC CA 1 cl 31 (black-book page and line); Tas PD 3/2022 cl 2.2.4 (page and line); FCA APP 2 cl 4.6 ("Pt A tab 10, 10 – 15.2"; "Pt A p 354") | Not modelled. See OBI-303 and R07. | M | High |

### Stale or broken links in `practiceDirections.ts` (checked 2026-10-06)

| Line | URL | Result | Replacement |
|---|---|---|---|
| 41 | hcourt.gov.au/registry/practice-directions | 404 | https://www.hcourt.gov.au/court-procedures/filing-documents/practice-direction |
| 71 | …/court-of-appeal-practice-notes/sc-ca-1.html | NSW 404 page | the SC CA 1 PDF in NSW-2 |
| 105, 111, 117, 311, 319, 325, 437, 447, 459, 465 | courts.qld.gov.au/court-users/practitioners/practice-directions/… | 404 | the PDF URLs in QLD-1 and QLD-3; [Supreme Court PD index](https://www.courts.qld.gov.au/courts/supreme-court/practice-directions) |
| 125, 417, 603 | supremecourt.wa.gov.au/P/practice_directions.aspx | "Page Not Found" | /C/consolidated_practice_directions.aspx |
| 133, 338, 480 | courts.sa.gov.au/rules-and-practice-directions/ | 404 | the Uniform Civil Rules PDF in SA-1 |
| 140, 147 | supremecourt.tas.gov.au/practice_directions/ | 404 | /publications/directions/ |
| 155 | courts.act.gov.au/supreme/practice-and-procedure/practice-directions | 404 | the index in ACT-1 |
| 163, 170 | www.supremecourt.nt.gov.au/practice-directions | TLS name mismatch on `www` | supremecourt.nt.gov.au/lawyers/practice-directions (bot challenge) |
| 53, 393, 593 | fcfcoa.gov.au/practice-directions | 404 | /resources/practice-directions; /fl/pd/fam-appeals; /pd/pd-ai |
| 184 | fwc.gov.au/…/practice-notes | 404 | not located in this pass |
| 331, 470 | qcat.qld.gov.au/practice-directions | 404 | not located in this pass |
| 345, 351, 505, 519 | …/general-practice-notes/sc-gen-23.html | NSW 404 page | supremecourt.nsw.gov.au/practice-procedure/generative-artificial-intelligence.html |
| 357, 530, 535 | districtcourt / localcourt …/practice-and-procedure/practice-notes.html | 404 | the indexes in NSW-4 |
| 540 | ncat.nsw.gov.au/…/practice-directions.html | NSW 404 page | not located in this pass |

Still working: Vic SC Gen 3 PDF, Vic practice-notes index, County Court index, ART page, NSW SC Gen 20 page. Of the 23 core links, 9 were last verified on 2026-07-21; the `lastVerified` values are therefore no longer accurate.

## 6. Missing courts (no preset, but rules exist or are likely)

- **NSWCCA**: own LOA rule (NSW-3).
- **SA District and Magistrates (civil)**: the Uniform Civil Rules apply.
- **Qld District Court**: separate from Magistrates; no instrument found.
- **Federal Circuit and Family Court Div 2 / general federal law**: FAM-APPEALS covers family appeals only.
- **NSW Land and Environment Court**, **Qld Planning and Environment Court**, **WA District Court**, and **Tas, ACT and NT magistrates and local courts**: not researched in this pass.

## 7. Proposed enhancements (for refinement; no code changed)

| Story | Proposal | Evidence | Unlocks |
|---|---|---|---|
| R2-E1 | **Correct preset data (sign-off needed):** FCA LOA to an eBook three-section list; HCA LOA to a new `jba-five-part`; FCFCOA, VSC, VSCA, ACT and NT parallel to `off` (report replaces MNC); SA to `mandatory`; QLD_DISTRICT_MAG to `preferred`; FCA and TAS to `parallelOrder: "mnc-first"`; FCFCOA hierarchy without FamCAFC. Update `court-practice-matrix.test.ts`. | Section 5, rows 1, 2, 4, 7, 11, 13, 18, 21, 23, 24 | OBI-103 |
| R2-E2 | **Provenance on every toggle:** each preset field carries `{value, source: instrumentId, clause, kind: "official" \| "observed" \| "preference" \| "unsourced", checked: date}`. Unsourced values (ibid suppression, HCA parallel) show as "not specified by the court". | Rows 5, 10, 25; backlog OBI-101/104 | OBI-101, OBI-104 |
| R2-E3 | **New LOA layouts:** `jba-five-part` (HCA); `nsw-ca-four-category` (legislation with version date, read-cases sub-groups with caps, cited, secondary); `vsca-abc` with "None" rows and an amended-list redline/clean pair; `wa-outline-asterisk` (cases read marked *, read pages, "no cases will be read" statement); `single-oral` (NSWCCA); `sa-form-91` with hyperlink column and "hyperlinking unavailable". | Section 3 | OBI-204, OBI-301 |
| R2-E4 | **Legislation version field:** store point-in-time or as-enacted dates and a "reason for version" note. Emit them in the HCA Form 27A annexure table, NSW CA list item (1) and FCA eBook legislation extracts. | HCA-2, NSW-2 cl 37(1), FCA-1 cl 2.3, FCA-2 cl 7.4 | OBI-103 |
| R2-E5 | **Short-form rule per profile:** WA uses the case name only after the first full citation. Allow `ibidSuppression` alternatives (`case-name`, `full-repeat`, `aglc`) rather than a single on/off switch. | WA-1 PD 2.1 cl 14; AIJA-1 | OBI-102 |
| R2-E6 | **Document-type split:** `submissions` profiles (sections 3 and 5) vs `reasons` profiles (AIJA, WA PD 8.2.2, Vic SC Gen 3 cl 4.1, observed NSW Caselaw) vs `orders` (citation-free per FCA-5 templates). Do not apply submission LOA rules to reasons. | Section 4 | OBI-301 |
| R2-E7 | **Locator types for appeal books and transcripts:** "Pt A tab 10, 10 – 15.2", "Black 62", "T 45.12–46.3", plus the FCA transcript footer schema. Coordinate with R07. | FCA-3 cl 4.6, NSW-2 cl 31/33, TAS-2 cl 2.2.4, FCA-5 s 4 | OBI-303 |
| R2-E8 | **Treatment flag for Tas:** extend the "doubted or not followed" prompt to TASSC. Narrow the Qld options to the PD wording. | TAS-1 cl 3(f), QLD-1 cl 4(c) | OBI-103 |
| R2-E9 | **Link and version hygiene:** replace the 404 links (section 5 table); unify jurisdiction keys; add a scheduled checker that runs HTTP status plus a version string match (eg the WA "Last updated" date) and fails CI when a source changes. | Section 5 link table | OBI-104 |
| R2-E10 | **Recognise `WASCSR`** (WA sentencing remarks MNC) and pre-2011 SR form. | WA-1 PD 8.2.2 cl 5–6 | OBI-103 |
| R2-E11 | **Template style map fixture:** the FCA-5 style names (Body Text 1–8, quotation 1–3, Orders / Orders-abc / Orders-123, "Cases cited:" cover field) as an OBI-201 style-mapping fixture. Labelled *historical 2019 template*. | FCA-5 | OBI-201, OBI-402 |

## 8. Gaps and open questions (candidates for `docs/decisions.md`)

1. **Parallel citation order:** WA (rule), Tas and FCA (examples) and AIJA say MNC first. NSW Caselaw reasons and Obiter's default put the report first. AGLC4 r 2.2.7 prohibits parallel citation entirely. Decide whether a profile with no stated order defaults to (a) the court's example, (b) report-first, or (c) the user's choice.
2. **Ibid in court documents:** no official instrument found. Decide whether to keep suppression as a labelled Obiter preference.
3. **The NT Supreme Court Rules r 82.10 list format** was not read. The Qld District Court, NSW District and Local Courts, Vic County and Magistrates Courts, and the WA District Court were not found or not researched.
4. **Judgment style guides** for the HCA, FCA, FCFCOA and state courts are not public apart from AIJA 1999, WA PD 8.2.2 and Vic SC Gen 3 cl 4.1. Reasons profiles need R3 corpus evidence (observed conventions only) and R9 validation.
5. **Federal Court documents** came from Archive captures (Dec 2025 – Sep 2026) because the live site blocks automated access. Confirm by hand that GPN-AUTH has not been reissued after 7 May 2025.
6. **OCR confidence** for ACT PD 2/2022 and NSW SC CCA 1: check by eye before encoding.
7. **FCA-5 current status:** ask through R9 whether FCFCOA has updated templates.

## 9. Retrieved-file fingerprints (SHA-256, first 16 hex)

HCA PD 2/2024 `7a46707a3ba29b15`; HCA Form 27A `43b98f09b4209512`; NSW SC Gen 20 `daa4af81f90aa79c`; NSW SC CA 1 `c375a58f7841a125`; NSW SC CCA 1 `8c89c501348ad7c6`; Vic SC Gen 3 `23325c2fd777bc36`; Vic SC CA 3 `855273ca396dd307`; Qld PD 1/2024 `8602833c371a359b`; Qld PD 3/2013 `1c84325f3ca20001`; Qld MC PD 7/2024 `bce4cb8530a334f8`; WA CPD (25 Sep 2026) `f3d2a754d5cc15b1`; SA UCR (to 15 Mar 2026) `52d665d13461302f`; Tas PD 3/2014 `c66f0639ad7b497d`; Tas PD 3/2022 `c19258cd9ad7721e`; ACT PD 2/2022 `b08057acf98cebab`; NT PD 2/2007 `1885c5ea02c2a743`; NT PD 1/2025 `7bea6283805eed1a`; AIJA Guide `a97713f55d16a395`; FCA-5 `63a4b09466c26de4`.
