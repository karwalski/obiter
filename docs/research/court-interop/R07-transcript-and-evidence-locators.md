# R07: transcript and evidence locators

Track R7 (OBI-302, OBI-303, OBI-P02). Prepared 6 October 2026. Repository pinned at commit `69b9c40`.
Status: research output only. No Obiter source code was changed.

Privacy: none of the documents examined are identified here by author, file path, username or revision identity. Judgments are identified by neutral citation only, and submissions by proceeding number only. Where personal names appeared in quoted locator strings, they have been left out.

## 1. Summary

- AGLC4 r 2.7 and r 2.8 cover citing a **transcript or submission as a source**, usually in scholarship. Courts and practitioners citing the **record of their own proceeding** use a different family of short locators, set by practice notes. Examples: `T4.1 – T5.4`, `Black 62`, `Red 40[L–P]`, `CB 4/5391`, `Ex 4`, `MFI P4`, `Part B CRI Tab 10, 10 – 15.2`. In 206 NSW judgments and 9 NSWCA submissions sampled, nobody used the AGLC "Transcript of Proceedings" form for the record of their own case.
- Obiter already formats AGLC r 2.7.1, r 2.7.2 and r 2.8 (`src/engine/rules/v4/domestic/cases-supplementary.ts:428-579`). It has **no** model for record locators: transcript page.line, hearing day, appeal book or court book, exhibit or MFI, or tab. Two confirmed r 2.8 defects and one r 2.7 validation gap need fixing.
- The **official, citable** conventions are page plus line, with the hearing date where there are several days (VSCA SC CA 3 Annexure B). Appeal-book references follow each court's own scheme: NSWCA colour books, FCA tab and page (Format 1) or PDF display number (Format 2), QCA appeal record book page. Exhibits use the number assigned at the hearing. MFIs are a separate series.
- **Recording timestamps** (eg FTR) are **not** used as citation locators in any sampled judgment or submission. Treat them as provenance metadata only.
- Vendor routes (FTR, Epiq, VIQ/Auscript, CAT/PTX) stay **placeholders**. The evidence covers export formats only. It does not show any licensed API or stable locator feed suitable for Obiter.

## 2. Sources examined

| ID | Source | Retrieved | Notes |
|---|---|---|---|
| S1 | AGLC4 derived reference, `aglc4-rule-reference.md` §2.7–2.8 (AGLC4 printed pp 65–6) | local | Derived restatement only |
| S2 | [FCA Transcript Style Guide and Judgment Templates, Att B](https://www.fedcourt.gov.au/__data/assets/pdf_file/0011/586892/PA2925-06-100-Part-B-Attachment-B-Transcript-Style-Guide-and-Judgment-Templates.pdf) | copy fetched by R2 track, 6 Oct 2026; sha256 `63a4b094…ff51`; PDF created 19 Sep 2019 | Procurement attachment that names former courts. Its current status is **unconfirmed** |
| S3 | [NSWSC Practice Note SC CA 1 (issued 1 May 2023, commenced 8 May 2023)](http://www.agd.nsw.gov.au/practice_notes/nswsc_pc.nsf/a15f50afb1aa22a9ca2570ed000a2b08/91ea4e6fd92883b3ca2589a8007cbdae/$FILE/2023_05_01_Practice%20Note%20SC%20CA%201%20-%20Court%20of%20Appeal.pdf) | 6 Oct 2026; sha256 `c2bc1a84…2125` | The court's HTML page returned 404 on 6 Oct 2026 |
| S4 | [VSC Practice Note SC CA 3 (version reissued 14 Apr 2025)](https://www.supremecourt.vic.gov.au/sites/default/files/2025-04/SC%20CA%203%20-%20Civil%20applications%20and%20appeals.pdf) | 6 Oct 2026; sha256 `c78683fb…f78e` | A [10 Mar 2026 reissue](https://www.supremecourt.vic.gov.au/areas/legal-resources/practice-notes/sc-ca-3-civil-applications-and-appeals-third-revision) exists. Obiter already cites it at `practiceDirections.ts:90`. The paragraphs below come from the 2025 text and need rechecking against 2026 |
| S5 | [QSC Practice Direction 3 of 2013 (Court of Appeal)](https://www.courts.qld.gov.au/__data/assets/pdf_file/0003/177456/sc-pd3of2013.pdf) | 6 Oct 2026; sha256 `1c84325f…e0f1` | |
| S6 | FCA Practice Note APP 2 ([court page](https://www.fedcourt.gov.au/law-and-practice/practice-documents/practice-notes/app2)) | 6 Oct 2026, **HTTP 403** | Content taken from secondary sources S6a and S6b only. **Medium** confidence |
| S6a | [QLS Proctor, Dec 2025: APP 2 / GPN-EBOOKS changes from 1 Dec 2025](https://www.qlsproctor.com.au/2025/12/federal-court-ebooks-practice-note/) | 6 Oct 2026 | Secondary |
| S6b | [P A Clarke summary of 2013 APP 2](https://www.peteraclarke.com.au/2013/11/25/new-practice-note-from-the-federal-court-on-the-content-of-appeal-books-and-preparation-for-hearing/) | 6 Oct 2026 | Secondary, historical version |
| S7 | [NSWCA published submissions](https://supremecourt.nsw.gov.au/practice-procedure/nswca/submissions.html): 14 PDFs from proceedings 2025/00481546, 2026/00005236 and 2026/00009770 | 6 Oct 2026 | 9 had a text layer and 5 were image-only or empty. |
| S8 | R2 track corpus of 206 NSW Caselaw DOCX judgments (NSWSC 76, NSWLEC 41, NSWCATAD 20, NSWCATAP 15, NSWDC 14, NSWIRComm 9, NSWCA 6, NSWCCA 6, NSWCATOD 6, NSWIC 5, NSWCATEN 3) | from session scratch, 6 Oct 2026 | Analysed with regexes over `document.xml` and `footnotes.xml` |
| S9 | [HCA: Transcripts](https://www.hcourt.gov.au/cases-and-judgments/hearings/transcripts); [HCA AV recording page, 18 Mar 2026](https://www.hcourt.gov.au/cases-and-judgments/hearings/av-recording/2026-03-18) | 6 Oct 2026 | AustLII HCATrans pages were blocked by Cloudflare (403), so HCA transcript **internal layout was not inspected** |
| S10 | Vendor material: [FTR Log Notes export](https://ftr.elevio.help/en/articles/234-how-can-i-export-recording-audio-and-log-notes), [FTR history](https://fortherecord.com/our-company/history/), [Epiq AU transcription](https://www.epiqglobal.com/en-au/services/court-reporting/transcription-services), [Epiq–Qld Courts](https://www.epiqglobal.com/en-us/resource-center/news/epiq-commences-transcription-services-queensland), [RealLegal E-Transcript Manager guide](https://www.thomsonreuters.com/content/dam/helpandsupp/en-us/Topics/reallegal/files/etm-user-guide.pdf), [Stenograph ASCII export](https://solutioncenter.stenograph.com/export/exportascii), [ABC 29 Nov 2025 on VIQ / FCFCOA transcripts](https://www.abc.net.au/news/2025-11-29/family-court-transcripts-viq-solutions/105904558) | 6 Oct 2026 | Mostly search-result summaries. **Low to medium** confidence |

## 3. Findings

### 3.1 AGLC4 rules (S1)

| Rule | Template (derived) | Locator semantics |
|---|---|---|
| 2.7.1 | `Transcript of Proceedings, «Case» («Court», «Proceeding No», «Judicial Officer(s)», «Full Date») «Pinpoint»` | Proceeding number only if it appears on the transcript. Name all judicial officers. Pinpoint to page, or to line only where line numbering runs continuously. An optional speaker (r 2.4) follows the pinpoint. **'(during argument)' is not permitted.** |
| 2.7.2 | `Transcript of Proceedings, «Case» [«Year»] HCATrans «Number», «Pinpoint»` | Only where the HCATrans number appears on the transcript (from July 2003). Pinpoints to **line** numbers, eg `2499–517 (Callinan J and JBR Beach QC), 2589–93 (McHugh J)`. A different speaker can follow each pinpoint |
| 2.8 | `«Party», '«Title»', Submission in «Case», «Proceeding No», «Full Date», «Pinpoint»` | Title and proceeding number **each only if they appear** on the submission. Pinpoint by page, paragraph or both (rr 1.1.6–1.1.7) |

AGLC4 has **no** rule for appeal-book, court-book, exhibit or MFI locators. These are practice-note conventions, so Obiter must treat them as a court-profile layer and not as AGLC rules. AGLC5 status is outside this track.

### 3.2 FCA Transcript Style Guide (S2)

Raw observations, with page references to the S2 text:

- **Cover page** (§1): provider order number, court, registry, judicial officer(s), file number and year, parties, extract type (eg `EXTRACT OF PROCEEDINGS`, `EX TEMPORE JUDGMENT (COURT ONLY)`), place, start time, day and date, "date continued from", **day of hearing (eg `DAY THREE`)**, appearances, confidentiality notice and copyright notice.
- **Numbering** (§3): line numbers are printed **every fifth line** on the left. Page numbers are **strictly sequential throughout the proceeding for all transcript produced**, so pages do not restart each day. Each new witness's examination starts on a new page.
- **Footer** (§4): `.«MatterNo» «dd.mm.yy»   P-«page»   «WITNESS» «exam code»`, plus examining counsel in multi-party cases. Exam codes are `XN`, `XXN`, `RXN`, `FXN`, `FXXN` and `FRXN`. The footer names the first witness or examination on the page.
- **Speaker labels** (§5): `HIS/HER HONOUR`, `J. REGISTRAR`, `REGISTRAR`, and counsel as `MR|MS «SURNAME»` in upper case.
- **Structured events** (§6): `<` flag, then witness `BEGIN` (eg `«NAME», SWORN|AFFIRMED|RECALLED…`), `BODY` (`EXAMINATION-IN-CHIEF BY …`, `CROSS-EXAMINATION BY …`, `ON VOIR DIRE BY`) and `END` (`THE WITNESS WITHDREW`). Exhibits are recorded as `EXHIBIT #«n» «DESCRIPTION»` with dates as dd/mm/yyyy. MFIs are recorded as `MFI #«n»`, and a converted MFI as `EXHIBIT #16 - FORMERLY MFI F3`. **Times are recorded `[2.59 pm]`** at witness events, adjournments, resumptions, the start and the end.
- **Indexes** (§8): a witness index and an exhibit/MFI index are produced each day. A running index is the Court's job, using a "Transcript Analysis Application".
- **Formats and status** (§9–11): Microsoft Word. The electronic transcript in this format is the **official transcript**, and only the official transcript is used for appeal purposes and appeal books. Real-time service produces two versions, the in-court **real-time** transcript and the **final** transcript. Transcribed judgments are returned with a `DRAFT` watermark.

Interpretation (medium confidence): pages run continuously, lines are printed every five, and the hearing date is tied to each page through the footer. A page.line locator is therefore unique without the date, but adding the date helps readers. The structured `<` markup and footer codes are machine-parseable, which is relevant to OBI-302 (keeping transcript structure) and P02 (import). Alternative explanation: this is a 2019 procurement specification for the former FCoA and FCC. Current FCA and FCFCOA transcripts from VIQ (S10) may differ. **Do not ship this as a normative profile** until a current sanitised transcript is checked.

### 3.3 Practice notes: how submissions must cite the record

| Court | Requirement (paraphrased) | Evidence | Confidence |
|---|---|---|---|
| NSWCA | References to the judgment below use **paragraph numbers**, optionally with the red book page. Transcript references give the **black book page and the line number** (para 31). Chronologies cite `Black 62`, `Blue 15 (Exhibit 5)` (para 33). Separate PDFs for the red, orange, black and blue books (para 23) | S3, sha256 above | High for the text. Which material goes in which colour book is not stated in this PN (see search summary): **medium** |
| VSCA (civil) | Written case must identify transcript by **precise page and line numbers** (13.3(i)). Documents are identified by the **exhibit number allocated at the hearing**, or by affidavit, exhibit mark and page within the exhibit (13.3(j)). The **agreed list of transcript references** (s 16, Annexure B) shows `«date», T 4.1 – T 5.4` for each ground and each party | S4 (2025 text) | High for 2025 and **unverified for the 2026 reissue** |
| QCA | Criminal outlines must give **appeal record book page references** for rulings, the summing-up and evidence (PD 3/2013 para 34(1)). The record book includes trial transcript and exhibits | S5 | High |
| FCA (Full Court) | Before the appeal book exists, oral evidence is cited by transcript **page and line**. In Format 1, references use **tab and internal page and part of page** (eg `Pt A Tab 10, 10 – 15.2`; `Part B CRI Tab 10, 10 – 15.2`, where `.2` is the part of the page). From 1 Dec 2025, outlines cite evidence through the **Comprehensive Reference Index**, and Format 2 references use the **PDF display number** | S6a, S6b (court page returned 403) | **Medium.** Check the current APP 2 text before relying on it |
| HCA | Transcripts are prepared by the Court's own reporting service, include "full text citations referred to by counsel", and are published on AustLII and Jade (S9). The AV recording page links to `au/cases/cth/HCATrans/2026/15` on AustLII, which is a **new database path** (AGLC era: `au/other/HCATrans`) | S9 | High for availability. Line layout **not inspected** |

### 3.4 Observed practice

**NSWCA published submissions (S7, 9 text-layer PDFs):**

| Pattern | Docs | Example (normalised) | Meaning |
|---|---|---|---|
| `T«p».«l»[–«l»]` | 4 | `T157.5-15`, `T4.37–T5.5` | transcript page.line |
| `T «p»:«l»-«l»` | 1 | `T 426:11-19` | the same thing, with a colon separator |
| `T«p» L«l»–T«p» L«l»` | 1 | `T143 L13–T145 L43` | spelled-out line, spanning pages |
| `Red «p»[«A–X»]` | 1 | `Red 40[L–P]`, `Red 83[I]-84[R]` | **lettered margin** locators in the appeal book |
| `[«book» Tab «n»]` | 3 | `[WF Tab 17]` | tabbed folder or bundle |
| `TJ [«para»]` | 1 | `TJ [180]` | trial judgment paragraph |

**NSW judgments (S8, 206 DOCX):**

| Pattern | Docs (body / footnotes) | Courts | Example |
|---|---|---|---|
| Transcript page.line `T«p».«l»` | 7 / 2 | NSWSC, NSWDC, NSWCA | `(T88.37)`, `T93.4 – T93.12` |
| Transcript page only `(T«p»)` | 7 / 1 | NSWSC, NSWDC, NSWLEC | `(T 17)`, `T19–20` |
| Dated transcript | 5 | NSWSC, NSWDC, NSWLEC, NSWCATAD | `Transcript, 11 March 2026`, `T4/9/26` |
| Court book | 5 / 3 | NSWSC only | `CB 41`, `CB4/7131-7132` (volume/page) |
| Exhibit | 28 / 3 | 8 cohorts | `Ex 4`, `Ex P7`, `Exhibit 1`, `Exhibit MR1` |
| MFI | 3 / 0 | NSWSC, NSWCA, NSWCATOD | `MFI 10`, `MFI P4` |
| `Tab «n»` | 12 | various | `Tab 5` |
| AB / colour book | 1 each | | `AB 84`, `Orange 39` |
| `Transcript of Proceedings` (AGLC 2.7.1) | 0 | | |
| `HCATrans` | 0 / 1 | | |
| `during argument` | 0 | | |

Representative judgments (neutral citation only): page.line in [2026] NSWDC 346, [2026] NSWDC 348 and [2026] NSWSC 731; court book in [2026] NSWSC 1183, [2026] NSWSC 1186 and [2026] NSWSC 1188; MFI in [2026] NSWCA 207; dated transcript in [2026] NSWDC 350 and [2026] NSWLEC 126.

Interpretation:
- Record locators sit mostly **inline in the body**, not in footnotes (high confidence, NSW only). Obiter's footnote-centred insertion model fits judgment-writing less well than an inline "evidence reference" would.
- Notation **varies** between `.`, `:`, `L` and spaces even within one court. Obiter should store structured parts and render them through a profile. It should not normalise users' existing text.
- Timestamps (`11:27:10am`) appear only as **facts about events**. None was a recording locator (high confidence for this sample). "No marker" here does not mean other courts never use them.
- Limits: NSW only, one 2026 snapshot, about 5% of judgments with any transcript reference, regex-detected (some false positives in the "T page" class are possible). No FCA, VSC or QSC judgments were sampled.

### 3.5 Vendor and export landscape (OBI-P02 placeholder evidence)

| System | Observed export / locator facts | Evidence | Obiter implication |
|---|---|---|---|
| FTR (For The Record) Gold / Log Notes / Justice Cloud | Log notes have Time, Speaker and Note columns. They can be exported as **TXT, CSV, XML or HTML**, and each time is a hyperlink into the recording. Vendor says FTR is used in Queensland courts since 1995 and in federal and state courts | S10 (vendor and help pages) | Timestamps are **recording offsets**, not transcript page/line. A possible future CSV/XML import of a time plus speaker, as *provenance only*. Do not treat a timestamp as a citation pinpoint |
| Epiq Australia | Preferred civil transcript supplier for the Supreme Court of Victoria (from 1 Jul 2021), Qld Courts, ACT Magistrates. EpiqFAST exports **Word/PDF**. Offers speaker identification and timestamping | S10 | Word/PDF transcripts can be parsed for page/line *only if* line numbers survive as text. Not verified |
| VIQ Solutions (incl. Auscript) | FCA/FCFCOA provider. Transcripts are delivered as **editable Word**. Audio is restricted. There are public quality concerns (missing passages, wrong attributions) | S10 (ABC) | Supports keeping draft and final versions plus a correction trail (OBI-302) |
| CAT (Case CATalyst, Eclipse) / RealLegal E-Transcript | `.ptx` E-Transcript, plus ASCII export with page and line numbers in fixed columns (page number ending col 73, line number ending col 11 in one specification) | S10 | A documented text format. This is the most plausible **lawful import** route if a reporter supplies ASCII. **US-centric evidence. AU use is unverified** |

A DOCX or PDF transcript export is **not** evidence of a live-feed API or of any integration route (backlog OBI-P02).

## 4. Obiter today (code audit)

| Area | Status | Evidence |
|---|---|---|
| r 2.7.1 general transcript | **Supported.** Omits empty parenthetical elements | `src/engine/rules/v4/domestic/cases-supplementary.ts:465-509` |
| r 2.7.2 HCATrans | **Supported**, with multiple pinpoint and speaker pairs | `cases-supplementary.ts:526-544`; routed when `hcaTranscript` or `court === "HCATrans"` at `src/engine/engine.ts:888` |
| Pinpoint plus speaker pairs | Supported as a `{value, speaker}` array. The UI has only **one** pinpoint and **one** speaker field | `cases-supplementary.ts:435-448`; `engine.ts:877-885`; `src/ui/views/InsertCitation.tsx:6221-6236` |
| r 2.8 submission | **Partial, with defects** (see below) | `cases-supplementary.ts:559-579`; `engine.ts:913-928` |
| Pinpoint types | Generic `line` type renders `line N`. There is no transcript page.line, day, volume, tab, exhibit or MFI type | `src/types/citation.ts:18-45`; `src/engine/rules/v4/general/pinpoints.ts:15-26` |
| Source types | `case.transcript` and `case.submission` only | `src/types/citation.ts:138-139`; dispatch `engine.ts:3325-3326` |
| Exhibit / court book / appeal book | **Absent.** `grep -ri "exhibit\|court book\|appeal book" src` finds no locator code | grep at `69b9c40` |
| Practice-note reminders | Links exist for NSWCA SC CA 1 and VSCA SC CA 3, but only about authorities | `src/engine/court/practiceDirections.ts:70,90` |
| Interchange | Maps `case.transcript` to `case-transcript` / CSL `legal_case` | `src/api/interchange/mapper/kinds.ts:74,169,529` |
| OSCOLA / NZLSG | No transcript formatter (only `rules/v4` matched) | grep of `src/engine/rules` |

**Defects confirmed by running the formatters (scratch probe, no source changed):**

1. **r 2.8 empty proceeding number and title.** `formatSubmission` always emits both. With no title and no proceeding number it renders `Attorney-General (Cth), ‘’, Submission in A v B, , 25 January 2005`. AGLC r 2.8 says to include each "only if it appears". The cause is `cases-supplementary.ts:569-571`. This is the same defect class as WEB-007a, which was already fixed for r 2.7.1 at `:483-500`. Confidence: high.
2. **r 2.7 '(during argument)' not guarded.** A speaker of `Smith (during argument)` renders `… T12.5–20 (Smith (during argument))`, but r 2.7.1 and r 2.7.2 prohibit it. There is no validator rule for it (`grep "during argument" src/engine/validator.ts` finds nothing). Confidence: high.
3. **HCATrans number 0.** Missing data renders `[2024] HCATrans 0` (`engine.ts:889-894`, `toNumber(..., 0)`). Confidence: high.
4. *Possible:* `normalisePinpoint` drops an object pinpoint whose `value` is not a string (`engine.ts:317-334`). Under the known XML numeric round-trip hazard, a stored `{value:"31"}` may come back as `31` and vanish. **Not reproduced.** Confidence: low.

## 5. Proposed locator data model (OBI-303)

Design rules: keep each locator **separate from the authority citation**. Store the structured parts and render them through a profile. Keep the user's original text as entered. Obiter checks the shape of a reference against the identifiers the user has registered. It does not check that the evidence says what the user claims.

```ts
// Sketch only. Not implemented.
type RecordLocator =
  | TranscriptLocator | BookLocator | ExhibitLocator | JudgmentBelowLocator;

interface TranscriptLocator {
  kind: "transcript";
  recordId: string;            // links to a RecordSource (below)
  hearingDate?: string;        // ISO; VSCA Annexure B pairs date + T ref
  day?: number;                // "DAY THREE" (S2 §1)
  volume?: string;             // multi-volume transcripts
  start: { page: string; line?: string; marginLetter?: string };
  end?:   { page?: string; line?: string; marginLetter?: string }; // cross-page spans (T4.37–T5.5)
  speaker?: string;            // r 2.4 form; validator forbids "(during argument)"
  witness?: { name: string; stage?: "XN"|"XXN"|"RXN"|"FXN"|"FXXN"|"FRXN" }; // S2 §4
  timestamp?: string;          // recording offset, PROVENANCE ONLY, never rendered by default
  version: "realtime" | "draft" | "final" | "corrected" | "unknown";
  sourceText?: string;         // the user's original text, kept as entered
}

interface BookLocator {
  kind: "book";
  book: "AB"|"CB"|"ARB"|"red"|"orange"|"black"|"blue"|"tab-folder"|string;
  part?: string;               // FCA Part A / Part B (CRI)
  volume?: string;             // CB4/7131
  tab?: string;
  page: string; endPage?: string;
  pagePart?: string;           // FCA ".2" = part of page
  marginLetters?: string;      // NSW "L–P"
  pdfDisplayPage?: string;     // FCA Format 2
  underlying?: RecordLocator;  // eg the transcript ref reproduced at Black 62
}

interface ExhibitLocator {
  kind: "exhibit";
  series: "exhibit" | "mfi" | "affidavit-annexure";
  id: string;                  // "4", "P7", "MR1"; affidavit mark for annexures
  formerly?: string;           // "FORMERLY MFI F3" (S2 §5)
  description?: string; date?: string; pageWithin?: string;
}

interface JudgmentBelowLocator { kind: "judgment-below"; paragraph: string; bookPage?: string; } // TJ [180]; NSWCA para 31

interface RecordSource {        // one per proceeding/hearing set, document-level
  id: string; court: string; proceedingNumber?: string;
  hearingDates: string[]; transcriptPagination: "continuous"|"per-day"|"unknown";
  lineInterval?: number;        // 5 per S2 §3
  books: { code: string; label: string }[];
  exhibits: { series: string; id: string; description?: string }[]; // optional register
  provenance?: { provider?: string; format?: "docx"|"pdf"|"ascii"|"ptx"|"ftr-csv"; receivedAt?: string };
}
```

Rendering profiles. These are illustrative only and must be validated against each court's current text:

| Profile | Transcript | Book | Exhibit |
|---|---|---|---|
| AGLC 2.7.1 (scholarly) | `… (Court, No, Judge, Date) 31 (Speaker)` | n/a | n/a |
| NSWCA submissions | `Black «p».«l»` | `Red «p»`, `Blue «p»` | `(Exhibit «n»)` |
| VSCA written case | `«date», T «p».«l» – T «p».«l»` | per Registrar's note (not inspected) | `Exhibit «n»` / affidavit mark + page |
| FCA appeal | `T«p».«l»` before AB; `Part B CRI Tab «n», «p» – «p».«part»` after (Format 1) or PDF display no (Format 2) | | |
| Judgment (NSW observed) | `(T«p».«l»)` inline | `CB «v»/«p»` | `Ex «n»`, `MFI «n»` |

## 6. Implement now vs needs vendors

| Item | Kind | Can do now? |
|---|---|---|
| Fix the r 2.8 conditional title and number, the r 2.7 '(during argument)' validator, and the HCATrans-number guard | engine bug fix | **Yes** |
| Multiple pinpoint and speaker rows in the transcript form (r 2.7.2 ex 119) | UI | **Yes** |
| `RecordSource` per document, plus `TranscriptLocator`, `BookLocator`, `ExhibitLocator` and `JudgmentBelowLocator` stored as Obiter metadata separate from citations | data model | **Yes**, reusing existing persistence (needs R01 audit) |
| Profile renderers (AGLC scholarly, NSWCA, VSCA, FCA, judgment-inline) | pure formatting | **Yes, behind "research-gated" flags.** NSWCA and VSCA have primary evidence. FCA needs the APP 2 text |
| Inline (non-footnote) insertion of record locators | Word/UI | Yes. Uses the same content-control path as citations (confirm in R01) |
| Validation that refs resolve to registered pages, books or exhibits, and flags for exhibit → MFI changes and draft-only transcript refs | engine | **Yes**, structural only |
| Recognise existing text (`T157.5-15`, `Black 62`, `CB4/7131`) and offer reversible conversion | parser | Yes, for **opt-in** conversion (ties to OBI-203) |
| Import page/line from a supplied Word transcript (OBI-302) | parser | **Research-gated.** Needs a sanitised current transcript to confirm line numbers survive as text |
| FTR log-note CSV/XML timestamp import | vendor | **Placeholder.** Format documented. Licence and AU export usage unverified |
| Epiq / VIQ portal or API | vendor | **Placeholder.** No public API evidence |
| CAT ASCII/PTX import | vendor | **Placeholder.** Spec evidence is US-centric |

## 7. Story refinements

**OBI-303: support transcript and evidentiary pinpoints** (P1). Split into:
- **303a (ready):** fix r 2.8 empty title and number, the r 2.7 '(during argument)' validator, and the HCATrans `0` guard. Add regression tests to `tests/engine/chapter2.test.ts`.
- **303b (ready):** a multi-row pinpoint and speaker editor for `case.transcript`.
- **303c (refinement):** a `RecordSource` and locator model (§5), stored separately from citations, with `version` and `sourceText`.
- **303d (research-gated):** profile renderers for NSWCA (SC CA 1 paras 31 and 33) and VSCA (SC CA 3 13.3(i)–(j) and Annexure B), after re-reading the 2026 VSCA reissue. FCA waits on the APP 2 primary text. QCA should be limited to "appeal record book page" until the record-book guidelines are retrieved.
- **303e (refinement):** reminders in `practiceDirections.ts` for evidence references, for example "transcript refs: black book page + line".
- Acceptance: Obiter never claims to verify evidence. Timestamps are not rendered unless a profile requires them, and no profile observed so far does.

**OBI-302: keep provenance when converting transcript-derived reasons** (P1, research-gated):
- Model `version` (realtime, draft, final, corrected) and keep `DRAFT` watermarks and labels (S2 §11–12).
- Fixtures: a sanitised synthetic transcript built to the S2 layout (cover page, footer, `<` events, exhibit lines). Do not use real transcripts, because transcript copyright belongs to the Commonwealth (S2 §1).
- Gate: one current FCA/FCFCOA or state transcript sample, obtained lawfully, to confirm the layout.

**OBI-P02: transcript platform reference import** (P2, placeholder). Keep it a placeholder. Promotion evidence so far:
- FTR log-note exports (TXT/CSV/XML/HTML) give time and speaker only.
- CAT ASCII has fixed-column page and line.
- No AU vendor API was found.

Next research step: ask an Epiq or VIQ contact for documented export formats and licence terms.

## 8. Gaps and alternative explanations

- HCA transcript internal layout was not inspected, because AustLII was blocked (403). Whether line numbering runs continuously across sitting days rests on the AGLC illustration only. The AustLII database path has changed to `au/cases/cth/HCATrans`.
- The current FCA APP 2 text was not retrieved (403). The FCA Transcript Style Guide is a 2019 procurement attachment, so its current applicability is unknown.
- The VSCA SC CA 3 paragraphs come from the 2025 version. The 2026 reissue was not compared.
- QCA record-book guidelines returned HTML, not a PDF. Their page-referencing detail was not obtained.
- No FCA, VSC, QSC, WA, SA, Tas, ACT or NT judgments were sampled for record-locator notation. All judgment evidence is NSW 2026.
- 5 of the 14 NSWCA submission PDFs had no extractable text. The patterns therefore over-represent two proceedings.
- Practitioner shorthand such as `Tp 45 L 10` (from the brief) was **not observed**. Its absence is unknown, not disproved.
- The vendor findings rely on vendor marketing and search summaries. Nothing here shows which product any court currently uses in-house.
