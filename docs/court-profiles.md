# Court profiles

<!-- Generated from src/engine/court/presets.ts and src/engine/court/provenance.ts by scripts/generate-court-profiles.ts. Do not edit by hand. -->

Every court profile in Obiter is **experimental**. A profile is checked against the court's own instruments where they were found, but no court has endorsed it, and no profile yet meets the evidence rule for a verified profile (a documented rule plus representative current examples of the same document type).

## How profiles reach a document

- When a court is selected, the document stores the full set of values, the profile version and which values the user changes (COURT-106). The engine reads the document, not the live profile.
- When a profile changes, existing documents keep their values. Settings offers "Update court profile" and lists each change; nothing changes until the user applies it (DECISION-043 item 4).
- Settings shows, for each value, whether it comes from the profile or was changed for the document, the kind of source, and a link to it (COURT-115).

## Kinds of source

| Kind | Meaning |
|---|---|
| Court instrument | A court instrument states the value or gives it as its example. |
| Observed practice | Repeated practice in published court documents; not a rule for submissions. |
| Obiter default | Obiter's default where the instrument is silent, including the AGLC4 form. |
| No supporting source | No instrument supports the value, or the instrument contradicts it. The note names the correcting story. |

## Review process

- Every profile is re-checked against its instruments each quarter, and whenever the practice-direction link checker (COURT-114) reports a changed or moved instrument.
- A change to any value updates its provenance in `src/engine/court/provenance.ts`, bumps that profile's version, and regenerates this file. Existing documents are then offered the update.
- A value is marked as checked only when it was compared with the instrument on that date.

## Coverage

| Court | Profile version | Checked against | Last review |
|---|---|---|---|
| High Court of Australia (`HCA`) | 2026-10-06 | HCA-1, HCA-2 | 6 Oct 2026 |
| Federal Court of Australia (`FCA`) | 2026-10-06.2 | FCA-1 | 6 Oct 2026 |
| Federal Circuit and Family Court (`FCFCOA`) | 2026-10-06.2 | FCF-1 | 6 Oct 2026 |
| NSW Court of Appeal (`NSWCA`) | 2026-10-06 | NSW-1, NSW-2 | 6 Oct 2026 |
| NSW Court of Criminal Appeal (`NSWCCA`) | 2026-10-06.2 | NSW-1, NSW-3 | 6 Oct 2026 |
| NSW Supreme Court (`NSWSC`) | 2026-10-06 | NSW-1 | 6 Oct 2026 |
| NSW District / Local Court (`NSW_DISTRICT_LOCAL`) | 2026-10-06 | No instrument found | 6 Oct 2026 |
| Vic Court of Appeal (`VSCA`) | 2026-10-06.2 | VIC-1, VIC-2 | 6 Oct 2026 |
| Vic Supreme Court (`VSC`) | 2026-10-06.2 | VIC-1 | 6 Oct 2026 |
| Vic County / Magistrates' Court (`VIC_COUNTY_MAG`) | 2026-10-06 | No instrument found | Not reviewed |
| Qld Court of Appeal (`QCA`) | 2026-10-06 | QLD-1, QLD-2 | 6 Oct 2026 |
| Qld Supreme Court (`QSC`) | 2026-10-06 | QLD-1 | 6 Oct 2026 |
| Qld District / Magistrates Court (`QLD_DISTRICT_MAG`) | 2026-10-06.2 | QLD-3 | 6 Oct 2026 |
| WA Supreme Court (`WASC`) | 2026-10-06 | WA-1 | 6 Oct 2026 |
| SA Supreme Court (`SASC`) | 2026-10-06.2 | SA-1 | 6 Oct 2026 |
| SA District / Magistrates Court (civil) (`SA_DISTRICT_MAG_CIVIL`) | 2026-10-06.2 | SA-1 | 6 Oct 2026 |
| Tas Supreme Court (`TASSC`) | 2026-10-06.2 | TAS-1, TAS-2 | 6 Oct 2026 |
| ACT Supreme Court (`ACTSC`) | 2026-10-06.2 | ACT-1 | 6 Oct 2026 |
| NT Supreme Court (`NTSC`) | 2026-10-06.2 | NT-1, NT-2 | 6 Oct 2026 |
| Administrative Review Tribunal (`ART`) | 2026-10-06 | No instrument found | Not reviewed |
| Fair Work Commission (`FWC`) | 2026-10-06 | No instrument found | Not reviewed |
| State/Territory Tribunal (NCAT/VCAT/QCAT/SAT/other) (`STATE_TRIBUNAL`) | 2026-10-06 | No instrument found | Not reviewed |

## Profiles

### Federal

#### High Court of Australia (`HCA`)

Experimental: checked against HCA Practice Direction No 2 of 2024 (Joint Book of Authorities) (20 Dec 2024); HCA Form 27A (2024) on 6 Oct 2026; not endorsed by the court.

| Setting | Value | Kind | Source | Checked | Note |
|---|---|---|---|---|---|
| Parallel citations | Mandatory | No supporting source | HCA-1 (HCA Practice Direction No 2 of 2024 (Joint Book of Authorities)); HCA-2 (HCA Form 27A) | 6 Oct 2026 | HCA instruments are silent on parallel citation (register O-R4); value under review (open question Q3). |
| Parallel citation order | Authorised report first | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 3 | 6 Oct 2026 | Instrument silent on order; report first by default (DECISION-043 item 3). |
| MNC of a reported case | Given with the report | Obiter default | None | No | Obiter default: the MNC is given with the report (court-mode behaviour before COURT-111). |
| Pinpoint style | Paragraph and page | No supporting source | None | No | Not checked against a court instrument. |
| Pinpoint connector | AGLC punctuation | Obiter default | AGLC4 (Australian Guide to Legal Citation (4th ed, 2018)) r 2.2.5 | 6 Oct 2026 | Instrument shows no pinpoint connector; Obiter uses the AGLC4 form. |
| Authorised-report hierarchy | CLR | Court instrument | HCA-1 (HCA Practice Direction No 2 of 2024 (Joint Book of Authorities)) JBA Part C; Form 27A Part IV; HCA-2 (HCA Form 27A) | 6 Oct 2026 |  |
| Unreported-judgment gate | Off | No supporting source | None | No | Not checked against a court instrument. |
| Ibid / (n X) suppression | On | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 2 | 6 Oct 2026 | No court instrument read mentions ibid (register O-R14); Obiter default kept by DECISION-043 item 2. |
| List of Authorities | Part A / Part B | No supporting source | HCA-1 (HCA Practice Direction No 2 of 2024 (Joint Book of Authorities)) | 6 Oct 2026 | PD 2 of 2024 requires a five-part Joint Book of Authorities (Parts A to E), not Part A / Part B (register O-R3; COURT-117). |

Known exceptions:

- Joint Book of Authorities Parts A to E and the legislation-version column are not modelled (COURT-117, COURT-118).

#### Federal Court of Australia (`FCA`)

Experimental: checked against FCA Lists of Authorities and Citations Practice Note (GPN-AUTH) (7 May 2025) on 6 Oct 2026; not endorsed by the court.

| Setting | Value | Kind | Source | Checked | Note |
|---|---|---|---|---|---|
| Parallel citations | Mandatory | Court instrument | FCA-1 (FCA Lists of Authorities and Citations Practice Note (GPN-AUTH)) cl 2.4–2.5 | 6 Oct 2026 |  |
| Parallel citation order | Medium neutral citation first | Court instrument | FCA-1 (FCA Lists of Authorities and Citations Practice Note (GPN-AUTH)) cl 2.5; DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) | 6 Oct 2026 | Instrument example: “D'Arcy v Myriad Genetics Inc [2014] FCAFC 115; (2014) 224 FCR 479” (register O-R2; DECISION-043 item 3). |
| MNC of a reported case | Given with the report | Obiter default | None | No | Obiter default: the MNC is given with the report (court-mode behaviour before COURT-111). |
| Pinpoint style | Paragraph and page | Court instrument | FCA-1 (FCA Lists of Authorities and Citations Practice Note (GPN-AUTH)) cl 2.4, 2.6 | 6 Oct 2026 |  |
| Pinpoint connector | “at” before the pinpoint | Court instrument | FCA-1 (FCA Lists of Authorities and Citations Practice Note (GPN-AUTH)) cl 2.6 | 6 Oct 2026 | Instrument example: “at [29]”, “at 481”. |
| Authorised-report hierarchy | FCR → CLR → ALR | Court instrument | FCA-1 (FCA Lists of Authorities and Citations Practice Note (GPN-AUTH)) Annexure | 6 Oct 2026 |  |
| Unreported-judgment gate | Off | No supporting source | None | No | Not checked against a court instrument. |
| Ibid / (n X) suppression | On | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 2 | 6 Oct 2026 | No court instrument read mentions ibid (register O-R14); Obiter default kept by DECISION-043 item 2. |
| List of Authorities | Simple | Obiter default | FCA-1 (FCA Lists of Authorities and Citations Practice Note (GPN-AUTH)) GPN-eBOOKS cl 7.2; FCA-2 (FCA eBooks Practice Note (GPN-eBOOKS)) | 6 Oct 2026 | GPN-AUTH (7 May 2025) has no Part A / Part B list (register O-R1); a simple list until the GPN-eBOOKS layout (authorities, legislation, bills) is added (COURT-117). |

Known exceptions:

- GPN-AUTH not re-checked live since the 5 Dec 2025 capture (open question 10).
- GPN-eBOOKS eBook layout not modelled (COURT-117).

#### Federal Circuit and Family Court (`FCFCOA`)

Experimental: checked against FCFCOA FAM-APPEALS Practice Direction (updated 10 Jun 2025) on 6 Oct 2026; not endorsed by the court.

| Setting | Value | Kind | Source | Checked | Note |
|---|---|---|---|---|---|
| Parallel citations | Off | Court instrument | FCF-1 (FCFCOA FAM-APPEALS Practice Direction) cl 5.8 | 6 Oct 2026 | The report replaces the MNC; the MNC is for unreported judgments only (register O-R6). |
| Parallel citation order | Authorised report first | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 3 | 6 Oct 2026 | No parallel citation is given, so the order has no effect; report first by default (DECISION-043 item 3). |
| MNC of a reported case | Omitted (the report replaces it) | Court instrument | FCF-1 (FCFCOA FAM-APPEALS Practice Direction) cl 5.8 | 6 Oct 2026 | The report replaces the MNC; the MNC is cited only for an unreported judgment (also AGLC4 r 2.2.7). |
| Pinpoint style | Paragraph and page | Court instrument | FCF-1 (FCFCOA FAM-APPEALS Practice Direction) cl 5.8 | 6 Oct 2026 |  |
| Pinpoint connector | AGLC punctuation | Obiter default | AGLC4 (Australian Guide to Legal Citation (4th ed, 2018)) r 2.2.5 | 6 Oct 2026 | Instrument shows no pinpoint connector; Obiter uses the AGLC4 form. |
| Authorised-report hierarchy | FLC → ALR | No supporting source | FCF-1 (FCFCOA FAM-APPEALS Practice Direction) | 6 Oct 2026 | FamCAFC removed: it is an MNC identifier, not a report series (register O-R6). The order of the remaining series is not checked against FAM-APPEALS. |
| Unreported-judgment gate | Off | No supporting source | None | No | Not checked against a court instrument. |
| Ibid / (n X) suppression | On | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 2 | 6 Oct 2026 | No court instrument read mentions ibid (register O-R14); Obiter default kept by DECISION-043 item 2. |
| List of Authorities | Two parts (read / not read) | Court instrument | FCF-1 (FCFCOA FAM-APPEALS Practice Direction) cl 5.8 | 6 Oct 2026 |  |

Known exceptions:

- No FCFCOA documents were sampled (AustLII challenge not bypassed).

### New South Wales

#### NSW Court of Appeal (`NSWCA`)

Experimental: checked against NSW SC Practice Note SC Gen 20 (Citation of Authority) (1 Oct 2023); NSW Court of Appeal Practice Note SC CA 1 (8 May 2023) on 6 Oct 2026; not endorsed by the court.

| Setting | Value | Kind | Source | Checked | Note |
|---|---|---|---|---|---|
| Parallel citations | Preferred | Court instrument | NSW-1 (NSW SC Practice Note SC Gen 20 (Citation of Authority)) cl 4 | 6 Oct 2026 | “should, as far as possible, also be noted”. |
| Parallel citation order | Authorised report first | Observed practice | O-C5 (Observed practice in published NSW and ACT judgments (evidence register O-C5)); DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) | 6 Oct 2026 | Observed in published NSW judgments (register O-C5); adopted by DECISION-043 item 3. |
| MNC of a reported case | Given with the report | Obiter default | None | No | Obiter default: the MNC is given with the report (court-mode behaviour before COURT-111). |
| Pinpoint style | Paragraph only | Court instrument | NSW-1 (NSW SC Practice Note SC Gen 20 (Citation of Authority)) cl 4 | 6 Oct 2026 |  |
| Pinpoint connector | AGLC punctuation | Obiter default | AGLC4 (Australian Guide to Legal Citation (4th ed, 2018)) r 2.2.5 | 6 Oct 2026 | Instrument shows no pinpoint connector; Obiter uses the AGLC4 form. |
| Authorised-report hierarchy | NSWLR → CLR → ALR | Court instrument | NSW-1 (NSW SC Practice Note SC Gen 20 (Citation of Authority)) cl 3 | 6 Oct 2026 |  |
| Unreported-judgment gate | Warn | No supporting source | None | No | Not checked against a court instrument. |
| Ibid / (n X) suppression | On | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 2 | 6 Oct 2026 | No court instrument read mentions ibid (register O-R14); Obiter default kept by DECISION-043 item 2. |
| List of Authorities | Part A / Part B | No supporting source | NSW-2 (NSW Court of Appeal Practice Note SC CA 1) cl 37 | 6 Oct 2026 | SC CA 1 cl 37 sets four categories (legislation with version date; cases read; cited not read; secondary), not Part A / Part B (register O-R12; COURT-117). |

Known exceptions:

- Report-plus-paragraph pinpoint form is open (DECISION-043 item 5).
- Record locators (SC CA 1 cl 31) are not modelled (COURT-129).

#### NSW Court of Criminal Appeal (`NSWCCA`)

Experimental: checked against NSW SC Practice Note SC Gen 20 (Citation of Authority) (1 Oct 2023); NSW Court of Criminal Appeal Practice Note SC CCA 1 (General) (22 Jul 2021) on 6 Oct 2026; not endorsed by the court.

| Setting | Value | Kind | Source | Checked | Note |
|---|---|---|---|---|---|
| Parallel citations | Preferred | Court instrument | NSW-1 (NSW SC Practice Note SC Gen 20 (Citation of Authority)) cl 4 | 6 Oct 2026 | “should, as far as possible, also be noted”. |
| Parallel citation order | Authorised report first | Observed practice | O-C5 (Observed practice in published NSW and ACT judgments (evidence register O-C5)); DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) | 6 Oct 2026 | Observed in published NSW judgments (register O-C5); adopted by DECISION-043 item 3. |
| MNC of a reported case | Given with the report | Obiter default | None | No | Obiter default: the MNC is given with the report (court-mode behaviour before COURT-111). |
| Pinpoint style | Paragraph only | Court instrument | NSW-1 (NSW SC Practice Note SC Gen 20 (Citation of Authority)) cl 4 | 6 Oct 2026 |  |
| Pinpoint connector | AGLC punctuation | Obiter default | AGLC4 (Australian Guide to Legal Citation (4th ed, 2018)) r 2.2.5 | 6 Oct 2026 | Instrument shows no pinpoint connector; Obiter uses the AGLC4 form. |
| Authorised-report hierarchy | NSWLR → CLR → ALR | Court instrument | NSW-1 (NSW SC Practice Note SC Gen 20 (Citation of Authority)) cl 3 | 6 Oct 2026 |  |
| Unreported-judgment gate | Warn | No supporting source | NSW-3 (NSW Court of Criminal Appeal Practice Note SC CCA 1 (General)) cl 28 | 6 Oct 2026 | The warning follows the NSW Supreme Court preset. SC CCA 1 cl 28 treats an authority on Caselaw with an MNC as unreported and asks for a copy, but sets no test for citing it. |
| Ibid / (n X) suppression | On | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 2 | 6 Oct 2026 | No court instrument read mentions ibid (register O-R14); Obiter default kept by DECISION-043 item 2. |
| List of Authorities | Simple | Obiter default | NSW-3 (NSW Court of Criminal Appeal Practice Note SC CCA 1 (General)) cl 27 | 6 Oct 2026 | A single list of only the authorities expected to be referred to in oral argument; a simple list until its layout is added (COURT-117). |

Known exceptions:

- SC CCA 1 cl 21(f) cites “Betts v The Queen [2016] HCA 25; 258 CLR 420 at [2]” (MNC first, “at”); the NSW order stays report first under DECISION-043 item 3 pending an owner decision.
- Report-plus-paragraph pinpoint form is open (DECISION-043 item 5).
- SC CCA 1 is a scan; it was re-read against the court's PDF on 6 Oct 2026. The owner's eye check (open question 12) is still pending.

#### NSW Supreme Court (`NSWSC`)

Experimental: checked against NSW SC Practice Note SC Gen 20 (Citation of Authority) (1 Oct 2023) on 6 Oct 2026; not endorsed by the court.

| Setting | Value | Kind | Source | Checked | Note |
|---|---|---|---|---|---|
| Parallel citations | Preferred | Court instrument | NSW-1 (NSW SC Practice Note SC Gen 20 (Citation of Authority)) cl 4 | 6 Oct 2026 | “should, as far as possible, also be noted”. |
| Parallel citation order | Authorised report first | Observed practice | O-C5 (Observed practice in published NSW and ACT judgments (evidence register O-C5)); DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) | 6 Oct 2026 | Observed in published NSW judgments (register O-C5); adopted by DECISION-043 item 3. |
| MNC of a reported case | Given with the report | Obiter default | None | No | Obiter default: the MNC is given with the report (court-mode behaviour before COURT-111). |
| Pinpoint style | Paragraph only | Court instrument | NSW-1 (NSW SC Practice Note SC Gen 20 (Citation of Authority)) cl 4 | 6 Oct 2026 |  |
| Pinpoint connector | AGLC punctuation | Obiter default | AGLC4 (Australian Guide to Legal Citation (4th ed, 2018)) r 2.2.5 | 6 Oct 2026 | Instrument shows no pinpoint connector; Obiter uses the AGLC4 form. |
| Authorised-report hierarchy | NSWLR → CLR → ALR | Court instrument | NSW-1 (NSW SC Practice Note SC Gen 20 (Citation of Authority)) cl 3 | 6 Oct 2026 |  |
| Unreported-judgment gate | Warn | No supporting source | None | No | Not checked against a court instrument. |
| Ibid / (n X) suppression | On | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 2 | 6 Oct 2026 | No court instrument read mentions ibid (register O-R14); Obiter default kept by DECISION-043 item 2. |
| List of Authorities | Simple | No supporting source | None | No | Not checked against a court instrument. |

Known exceptions:

- Report-plus-paragraph pinpoint form is open (DECISION-043 item 5).

#### NSW District / Local Court (`NSW_DISTRICT_LOCAL`)

Experimental: not checked against a court instrument (none found); not endorsed by the court.

| Setting | Value | Kind | Source | Checked | Note |
|---|---|---|---|---|---|
| Parallel citations | Preferred | No supporting source | NSW-4 (NSW District and Local Court practice-note indexes (no citation instrument found)) | 6 Oct 2026 | No instrument found; AGLC4 fallback. No District or Local Court citation instrument was found (register O-R18); the value follows the NSW Supreme Court preset. |
| Parallel citation order | Authorised report first | Observed practice | O-C5 (Observed practice in published NSW and ACT judgments (evidence register O-C5)); DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) | 6 Oct 2026 | Observed in published NSW judgments (register O-C5); adopted by DECISION-043 item 3. |
| MNC of a reported case | Given with the report | Obiter default | None | No | Obiter default: the MNC is given with the report (court-mode behaviour before COURT-111). |
| Pinpoint style | Paragraph only | No supporting source | NSW-4 (NSW District and Local Court practice-note indexes (no citation instrument found)) | 6 Oct 2026 | No instrument found; AGLC4 fallback (register O-R18). |
| Pinpoint connector | AGLC punctuation | Obiter default | AGLC4 (Australian Guide to Legal Citation (4th ed, 2018)) r 2.2.5 | 6 Oct 2026 | Instrument shows no pinpoint connector; Obiter uses the AGLC4 form. |
| Authorised-report hierarchy | NSWLR → CLR → ALR | No supporting source | NSW-4 (NSW District and Local Court practice-note indexes (no citation instrument found)) | 6 Oct 2026 | No instrument found; AGLC4 fallback (register O-R18). |
| Unreported-judgment gate | Warn | No supporting source | NSW-4 (NSW District and Local Court practice-note indexes (no citation instrument found)) | 6 Oct 2026 | No instrument found; AGLC4 fallback (register O-R18). |
| Ibid / (n X) suppression | On | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 2 | 6 Oct 2026 | No court instrument read mentions ibid (register O-R14); Obiter default kept by DECISION-043 item 2. |
| List of Authorities | Off | No supporting source | NSW-4 (NSW District and Local Court practice-note indexes (no citation instrument found)) | 6 Oct 2026 | No instrument found; AGLC4 fallback (register O-R18). |

Known exceptions:

- No instrument found; AGLC4 fallback. No citation instrument was found for the District or Local Court (register NSW-4).

### Victoria

#### Vic Court of Appeal (`VSCA`)

Experimental: checked against Vic SC Practice Note SC Gen 3 (Citation of authorities and legislation) (1 Dec 2025); Vic Court of Appeal Practice Note SC CA 3 (10 Mar 2026) on 6 Oct 2026; not endorsed by the court.

| Setting | Value | Kind | Source | Checked | Note |
|---|---|---|---|---|---|
| Parallel citations | Off | Court instrument | VIC-1 (Vic SC Practice Note SC Gen 3 (Citation of authorities and legislation)) cl 5.2; VIC-2 (Vic Court of Appeal Practice Note SC CA 3) | 6 Oct 2026 | SC Gen 3 cl 5.2 and SC CA 3 cl 14.4: the report is cited instead of the unreported version (register O-R5). |
| Parallel citation order | Authorised report first | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 3 | 6 Oct 2026 | No parallel citation is given, so the order has no effect; report first by default (DECISION-043 item 3). |
| MNC of a reported case | Omitted (the report replaces it) | Court instrument | VIC-1 (Vic SC Practice Note SC Gen 3 (Citation of authorities and legislation)) cl 5.2; VIC-2 (Vic Court of Appeal Practice Note SC CA 3) | 6 Oct 2026 | The report replaces the MNC; the MNC is cited only for an unreported judgment (also AGLC4 r 2.2.7). |
| Pinpoint style | Paragraph and page | Court instrument | VIC-1 (Vic SC Practice Note SC Gen 3 (Citation of authorities and legislation)) cl 5.5 | 6 Oct 2026 | Example: “(2023) 72 VR 394, 410 [60]”. |
| Pinpoint connector | AGLC punctuation | Obiter default | AGLC4 (Australian Guide to Legal Citation (4th ed, 2018)) r 2.2.5 | 6 Oct 2026 | Instrument shows no pinpoint connector; Obiter uses the AGLC4 form. |
| Authorised-report hierarchy | VR → CLR → ALR | Court instrument | VIC-1 (Vic SC Practice Note SC Gen 3 (Citation of authorities and legislation)) cl 5.2 | 6 Oct 2026 |  |
| Unreported-judgment gate | Off | No supporting source | None | No | Not checked against a court instrument. |
| Ibid / (n X) suppression | On | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 2 | 6 Oct 2026 | No court instrument read mentions ibid (register O-R14); Obiter default kept by DECISION-043 item 2. |
| List of Authorities | Part A / B / C | Court instrument | VIC-2 (Vic Court of Appeal Practice Note SC CA 3) cl 14.1–14.2 | 6 Oct 2026 |  |

Known exceptions:

- “None” under an empty part and the amended-list mark-up (cl 14.2, 14.6) are not modelled.
- Record-locator wording in the 2026 reissue not yet re-read (open question 9).

#### Vic Supreme Court (`VSC`)

Experimental: checked against Vic SC Practice Note SC Gen 3 (Citation of authorities and legislation) (1 Dec 2025) on 6 Oct 2026; not endorsed by the court.

| Setting | Value | Kind | Source | Checked | Note |
|---|---|---|---|---|---|
| Parallel citations | Off | Court instrument | VIC-1 (Vic SC Practice Note SC Gen 3 (Citation of authorities and legislation)) cl 5.2 | 6 Oct 2026 | “that report must be included instead of the unreported version” (register O-R5). |
| Parallel citation order | Authorised report first | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 3 | 6 Oct 2026 | No parallel citation is given, so the order has no effect; report first by default (DECISION-043 item 3). |
| MNC of a reported case | Omitted (the report replaces it) | Court instrument | VIC-1 (Vic SC Practice Note SC Gen 3 (Citation of authorities and legislation)) cl 5.2 | 6 Oct 2026 | The report replaces the MNC; the MNC is cited only for an unreported judgment (also AGLC4 r 2.2.7). |
| Pinpoint style | Paragraph and page | Court instrument | VIC-1 (Vic SC Practice Note SC Gen 3 (Citation of authorities and legislation)) cl 5.5 | 6 Oct 2026 | Example: “(2023) 72 VR 394, 410 [60]”. |
| Pinpoint connector | AGLC punctuation | Obiter default | AGLC4 (Australian Guide to Legal Citation (4th ed, 2018)) r 2.2.5 | 6 Oct 2026 | Instrument shows no pinpoint connector; Obiter uses the AGLC4 form. |
| Authorised-report hierarchy | VR → CLR → ALR | Court instrument | VIC-1 (Vic SC Practice Note SC Gen 3 (Citation of authorities and legislation)) cl 5.2 | 6 Oct 2026 |  |
| Unreported-judgment gate | Off | No supporting source | None | No | Not checked against a court instrument. |
| Ibid / (n X) suppression | On | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 2 | 6 Oct 2026 | No court instrument read mentions ibid (register O-R14); Obiter default kept by DECISION-043 item 2. |
| List of Authorities | Simple | No supporting source | None | No | Not checked against a court instrument. |

#### Vic County / Magistrates' Court (`VIC_COUNTY_MAG`)

Experimental: not checked against a court instrument (none found); not endorsed by the court.

| Setting | Value | Kind | Source | Checked | Note |
|---|---|---|---|---|---|
| Parallel citations | Preferred | No supporting source | None | No | Not checked against a court instrument. |
| Parallel citation order | Authorised report first | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 3 | 6 Oct 2026 | Instrument silent on order; report first by default (DECISION-043 item 3). |
| MNC of a reported case | Given with the report | Obiter default | None | No | Obiter default: the MNC is given with the report (court-mode behaviour before COURT-111). |
| Pinpoint style | Paragraph and page | No supporting source | None | No | Not checked against a court instrument. |
| Pinpoint connector | AGLC punctuation | Obiter default | AGLC4 (Australian Guide to Legal Citation (4th ed, 2018)) r 2.2.5 | 6 Oct 2026 | Instrument shows no pinpoint connector; Obiter uses the AGLC4 form. |
| Authorised-report hierarchy | VR → CLR → ALR | No supporting source | None | No | Not checked against a court instrument. |
| Unreported-judgment gate | Off | No supporting source | None | No | Not checked against a court instrument. |
| Ibid / (n X) suppression | On | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 2 | 6 Oct 2026 | No court instrument read mentions ibid (register O-R14); Obiter default kept by DECISION-043 item 2. |
| List of Authorities | Off | No supporting source | None | No | Not checked against a court instrument. |

Known exceptions:

- No County or Magistrates' Court instrument is in the evidence register.

### Queensland

#### Qld Court of Appeal (`QCA`)

Experimental: checked against Qld SC Practice Direction 1 of 2024 (Citation of Authority) (29 Jan 2024); Qld SC Practice Direction 3 of 2013 (Court of Appeal) (2013) on 6 Oct 2026; not endorsed by the court.

| Setting | Value | Kind | Source | Checked | Note |
|---|---|---|---|---|---|
| Parallel citations | Preferred | Court instrument | QLD-1 (Qld SC Practice Direction 1 of 2024 (Citation of Authority)) cl 3 | 6 Oct 2026 | “should, as far as possible, also be noted”. |
| Parallel citation order | Authorised report first | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 3 | 6 Oct 2026 | Instrument silent on order; report first by default (DECISION-043 item 3). |
| MNC of a reported case | Given with the report | Obiter default | None | No | Obiter default: the MNC is given with the report (court-mode behaviour before COURT-111). |
| Pinpoint style | Paragraph only | Court instrument | QLD-1 (Qld SC Practice Direction 1 of 2024 (Citation of Authority)) cl 4(a)–(b) | 6 Oct 2026 |  |
| Pinpoint connector | AGLC punctuation | Obiter default | AGLC4 (Australian Guide to Legal Citation (4th ed, 2018)) r 2.2.5 | 6 Oct 2026 | Instrument shows no pinpoint connector; Obiter uses the AGLC4 form. |
| Authorised-report hierarchy | Qd R → CLR → ALR | Court instrument | QLD-1 (Qld SC Practice Direction 1 of 2024 (Citation of Authority)) cl 3 | 6 Oct 2026 |  |
| Unreported-judgment gate | Warn | No supporting source | None | No | Not checked against a court instrument. |
| Ibid / (n X) suppression | On | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 2 | 6 Oct 2026 | No court instrument read mentions ibid (register O-R14); Obiter default kept by DECISION-043 item 2. |
| List of Authorities | Part A / Part B | Court instrument | QLD-2 (Qld SC Practice Direction 3 of 2013 (Court of Appeal)) | 6 Oct 2026 | Part A (relied on) and optional Part B. |

Known exceptions:

- Report-plus-paragraph pinpoint form is open (DECISION-043 item 5).

#### Qld Supreme Court (`QSC`)

Experimental: checked against Qld SC Practice Direction 1 of 2024 (Citation of Authority) (29 Jan 2024) on 6 Oct 2026; not endorsed by the court.

| Setting | Value | Kind | Source | Checked | Note |
|---|---|---|---|---|---|
| Parallel citations | Preferred | Court instrument | QLD-1 (Qld SC Practice Direction 1 of 2024 (Citation of Authority)) cl 3 | 6 Oct 2026 | “should, as far as possible, also be noted”. |
| Parallel citation order | Authorised report first | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 3 | 6 Oct 2026 | Instrument silent on order; report first by default (DECISION-043 item 3). |
| MNC of a reported case | Given with the report | Obiter default | None | No | Obiter default: the MNC is given with the report (court-mode behaviour before COURT-111). |
| Pinpoint style | Paragraph only | Court instrument | QLD-1 (Qld SC Practice Direction 1 of 2024 (Citation of Authority)) cl 4(a)–(b) | 6 Oct 2026 |  |
| Pinpoint connector | AGLC punctuation | Obiter default | AGLC4 (Australian Guide to Legal Citation (4th ed, 2018)) r 2.2.5 | 6 Oct 2026 | Instrument shows no pinpoint connector; Obiter uses the AGLC4 form. |
| Authorised-report hierarchy | Qd R → CLR → ALR | Court instrument | QLD-1 (Qld SC Practice Direction 1 of 2024 (Citation of Authority)) cl 3 | 6 Oct 2026 |  |
| Unreported-judgment gate | Warn | No supporting source | None | No | Not checked against a court instrument. |
| Ibid / (n X) suppression | On | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 2 | 6 Oct 2026 | No court instrument read mentions ibid (register O-R14); Obiter default kept by DECISION-043 item 2. |
| List of Authorities | Simple | No supporting source | None | No | Not checked against a court instrument. |

Known exceptions:

- Report-plus-paragraph pinpoint form is open (DECISION-043 item 5).

#### Qld District / Magistrates Court (`QLD_DISTRICT_MAG`)

Experimental: checked against Qld Magistrates Court Practice Direction 7 of 2024 (Citation of Authority) (7 Jun 2024) on 6 Oct 2026; not endorsed by the court.

| Setting | Value | Kind | Source | Checked | Note |
|---|---|---|---|---|---|
| Parallel citations | Preferred | Court instrument | QLD-3 (Qld Magistrates Court Practice Direction 7 of 2024 (Citation of Authority)) cl 3 | 6 Oct 2026 | “should, as far as possible, also be noted” (register O-R11). Magistrates Court only. |
| Parallel citation order | Authorised report first | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 3 | 6 Oct 2026 | Instrument silent on order; report first by default (DECISION-043 item 3). |
| MNC of a reported case | Given with the report | Obiter default | None | No | Obiter default: the MNC is given with the report (court-mode behaviour before COURT-111). |
| Pinpoint style | Paragraph only | Court instrument | QLD-3 (Qld Magistrates Court Practice Direction 7 of 2024 (Citation of Authority)) | 6 Oct 2026 |  |
| Pinpoint connector | AGLC punctuation | Obiter default | AGLC4 (Australian Guide to Legal Citation (4th ed, 2018)) r 2.2.5 | 6 Oct 2026 | Instrument shows no pinpoint connector; Obiter uses the AGLC4 form. |
| Authorised-report hierarchy | Qd R → CLR → ALR | Court instrument | QLD-3 (Qld Magistrates Court Practice Direction 7 of 2024 (Citation of Authority)) | 6 Oct 2026 |  |
| Unreported-judgment gate | Warn | No supporting source | None | No | Not checked against a court instrument. |
| Ibid / (n X) suppression | On | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 2 | 6 Oct 2026 | No court instrument read mentions ibid (register O-R14); Obiter default kept by DECISION-043 item 2. |
| List of Authorities | Simple | No supporting source | None | No | Not checked against a court instrument. |

Known exceptions:

- District Court: no instrument found; AGLC4 fallback. The values come from the Magistrates Court direction (register O-R18).

### Other States/Territories

#### WA Supreme Court (`WASC`)

Experimental: checked against WA SC Consolidated Practice Directions (PD 2.1, PD 8.2.2) (updated 23 Sep 2026) on 6 Oct 2026; not endorsed by the court.

| Setting | Value | Kind | Source | Checked | Note |
|---|---|---|---|---|---|
| Parallel citations | Mandatory | Court instrument | WA-1 (WA SC Consolidated Practice Directions (PD 2.1, PD 8.2.2)) PD 2.1 cl 14; PD 8.2.2 | 6 Oct 2026 |  |
| Parallel citation order | Medium neutral citation first | Court instrument | WA-1 (WA SC Consolidated Practice Directions (PD 2.1, PD 8.2.2)) PD 8.2.2 cl 4 | 6 Oct 2026 | Example: “Lee v The Queen [1999] WASCA 14; (1999) 18 WAR 23, 34 [15]”. |
| MNC of a reported case | Given with the report | Obiter default | None | No | Obiter default: the MNC is given with the report (court-mode behaviour before COURT-111). |
| Pinpoint style | Paragraph and page | Court instrument | WA-1 (WA SC Consolidated Practice Directions (PD 2.1, PD 8.2.2)) PD 2.1 cl 7(a); PD 8.2.2 | 6 Oct 2026 |  |
| Pinpoint connector | AGLC punctuation | Obiter default | AGLC4 (Australian Guide to Legal Citation (4th ed, 2018)) r 2.2.5 | 6 Oct 2026 | Instrument shows no pinpoint connector; Obiter uses the AGLC4 form. |
| Authorised-report hierarchy | WAR → CLR → ALR | Court instrument | WA-1 (WA SC Consolidated Practice Directions (PD 2.1, PD 8.2.2)) PD 2.1 cl 14 | 6 Oct 2026 |  |
| Unreported-judgment gate | Off | No supporting source | None | No | Not checked against a court instrument. |
| Ibid / (n X) suppression | On | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 2 | 6 Oct 2026 | No court instrument read mentions ibid (register O-R14); Obiter default kept by DECISION-043 item 2. |
| List of Authorities | Simple | Court instrument | WA-1 (WA SC Consolidated Practice Directions (PD 2.1, PD 8.2.2)) PD 2.1 cl 11–13 | 6 Oct 2026 | A simple list approximates the combined outline; cases to be read are marked as key authorities. |

Known exceptions:

- Later references by case name only (PD 2.1 cl 14) are not modelled (COURT-113).

#### SA Supreme Court (`SASC`)

Experimental: checked against SA Uniform Civil Rules 2020 (rr 101.8, 217.8; Form 91) (current to 15 Mar 2026) on 6 Oct 2026; not endorsed by the court.

| Setting | Value | Kind | Source | Checked | Note |
|---|---|---|---|---|---|
| Parallel citations | Mandatory | Court instrument | SA-1 (SA Uniform Civil Rules 2020 (rr 101.8, 217.8; Form 91)) r 217.8(3) | 6 Oct 2026 | r 217.8(3) and r 101.8(4): the authorised report and the MNC (for a decision after 1997 available online) must both be given (register O-R7). |
| Parallel citation order | Authorised report first | Obiter default | SA-1 (SA Uniform Civil Rules 2020 (rr 101.8, 217.8; Form 91)); DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) | 6 Oct 2026 | Instrument requires both but states no order; report first by default (DECISION-043 item 3). |
| MNC of a reported case | Given with the report | Obiter default | None | No | Obiter default: the MNC is given with the report (court-mode behaviour before COURT-111). |
| Pinpoint style | Paragraph and page | No supporting source | None | No | Not checked against a court instrument. |
| Pinpoint connector | AGLC punctuation | Obiter default | AGLC4 (Australian Guide to Legal Citation (4th ed, 2018)) r 2.2.5 | 6 Oct 2026 | Instrument shows no pinpoint connector; Obiter uses the AGLC4 form. |
| Authorised-report hierarchy | SASR → CLR → ALR | Court instrument | SA-1 (SA Uniform Civil Rules 2020 (rr 101.8, 217.8; Form 91)) r 101.8(4) | 6 Oct 2026 |  |
| Unreported-judgment gate | Off | No supporting source | None | No | Not checked against a court instrument. |
| Ibid / (n X) suppression | On | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 2 | 6 Oct 2026 | No court instrument read mentions ibid (register O-R14); Obiter default kept by DECISION-043 item 2. |
| List of Authorities | Two parts (read / not read) | Court instrument | SA-1 (SA Uniform Civil Rules 2020 (rr 101.8, 217.8; Form 91)) r 217.8; Form 91 | 6 Oct 2026 |  |

Known exceptions:

- Hyperlink rules (r 217.8(4)–(10)) are not modelled (COURT-136).
- The MNC is required only for decisions after 1997; the validator does not yet check the year.

#### SA District / Magistrates Court (civil) (`SA_DISTRICT_MAG_CIVIL`)

Experimental: checked against SA Uniform Civil Rules 2020 (rr 101.8, 217.8; Form 91) (current to 15 Mar 2026) on 6 Oct 2026; not endorsed by the court.

| Setting | Value | Kind | Source | Checked | Note |
|---|---|---|---|---|---|
| Parallel citations | Mandatory | Court instrument | SA-1 (SA Uniform Civil Rules 2020 (rr 101.8, 217.8; Form 91)) r 101.8(4) | 6 Oct 2026 | The Uniform Civil Rules apply across the SA civil courts: the authorised report and the MNC (after 1997) must both be given (register O-R7). |
| Parallel citation order | Authorised report first | Obiter default | SA-1 (SA Uniform Civil Rules 2020 (rr 101.8, 217.8; Form 91)); DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) | 6 Oct 2026 | Instrument requires both but states no order; report first by default (DECISION-043 item 3). |
| MNC of a reported case | Given with the report | Obiter default | None | No | Obiter default: the MNC is given with the report (court-mode behaviour before COURT-111). |
| Pinpoint style | Paragraph and page | No supporting source | None | No | Not checked against a court instrument. |
| Pinpoint connector | AGLC punctuation | Obiter default | AGLC4 (Australian Guide to Legal Citation (4th ed, 2018)) r 2.2.5 | 6 Oct 2026 | Instrument shows no pinpoint connector; Obiter uses the AGLC4 form. |
| Authorised-report hierarchy | SASR → CLR → ALR | Court instrument | SA-1 (SA Uniform Civil Rules 2020 (rr 101.8, 217.8; Form 91)) r 101.8(4) | 6 Oct 2026 |  |
| Unreported-judgment gate | Off | No supporting source | None | No | Not checked against a court instrument. |
| Ibid / (n X) suppression | On | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 2 | 6 Oct 2026 | No court instrument read mentions ibid (register O-R14); Obiter default kept by DECISION-043 item 2. |
| List of Authorities | Two parts (read / not read) | Court instrument | SA-1 (SA Uniform Civil Rules 2020 (rr 101.8, 217.8; Form 91)) r 217.8; Form 91 | 6 Oct 2026 | Form 91 is the appeal list of authorities. |

Known exceptions:

- Hyperlink rules (r 217.8(4)–(10)) are not modelled (COURT-136).
- Criminal proceedings are outside the Uniform Civil Rules and are not covered.

#### Tas Supreme Court (`TASSC`)

Experimental: checked against Tas SC Practice Direction 3 of 2014 (Citation of Judgments) (21 Feb 2014); Tas SC Practice Direction 3 of 2022 (Appeal Books, Lists of Authorities, Submissions) (24 Aug 2022) on 6 Oct 2026; not endorsed by the court.

| Setting | Value | Kind | Source | Checked | Note |
|---|---|---|---|---|---|
| Parallel citations | Preferred | Court instrument | TAS-1 (Tas SC Practice Direction 3 of 2014 (Citation of Judgments)) cl 3(a), 3(d) | 6 Oct 2026 |  |
| Parallel citation order | Medium neutral citation first | Court instrument | TAS-1 (Tas SC Practice Direction 3 of 2014 (Citation of Judgments)) cl 3(a); DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) | 6 Oct 2026 | Instrument example: “Jackson v Building Appeal Board [2010] TASSC 29; (2010) 20 Tas R 1” (register O-R8; DECISION-043 item 3). |
| MNC of a reported case | Given with the report | Obiter default | None | No | Obiter default: the MNC is given with the report (court-mode behaviour before COURT-111). |
| Pinpoint style | Paragraph and page | Court instrument | TAS-1 (Tas SC Practice Direction 3 of 2014 (Citation of Judgments)) cl 3 | 6 Oct 2026 |  |
| Pinpoint connector | “at” before the pinpoint | Court instrument | TAS-1 (Tas SC Practice Direction 3 of 2014 (Citation of Judgments)) cl 3 | 6 Oct 2026 | Instrument example: “[1997] TASSC 161 at [15]”. |
| Authorised-report hierarchy | Tas R → CLR → ALR | Court instrument | TAS-1 (Tas SC Practice Direction 3 of 2014 (Citation of Judgments)) cl 3 | 6 Oct 2026 |  |
| Unreported-judgment gate | Warn | Court instrument | TAS-1 (Tas SC Practice Direction 3 of 2014 (Citation of Judgments)) cl 5 | 6 Oct 2026 |  |
| Ibid / (n X) suppression | On | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 2 | 6 Oct 2026 | No court instrument read mentions ibid (register O-R14); Obiter default kept by DECISION-043 item 2. |
| List of Authorities | Three parts (Tas) | Court instrument | TAS-2 (Tas SC Practice Direction 3 of 2022 (Appeal Books, Lists of Authorities, Submissions)) | 6 Oct 2026 |  |

Known exceptions:

- Paragraph pinpoints for reports with numbered paragraphs (cl 3) and page-and-line references in appeal submissions (PD 3 of 2022 cl 2.2.4) are not modelled.

#### ACT Supreme Court (`ACTSC`)

Experimental: checked against ACT SC Practice Direction 2 of 2022 (Citation of Authority) (26 May 2022) on 6 Oct 2026; not endorsed by the court.

| Setting | Value | Kind | Source | Checked | Note |
|---|---|---|---|---|---|
| Parallel citations | Off | Court instrument | ACT-1 (ACT SC Practice Direction 2 of 2022 (Citation of Authority)) cl 3–4 | 6 Oct 2026 | The authorised report “should be used”; the direction is silent on the MNC (register O-R10). |
| Parallel citation order | Authorised report first | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 3 | 6 Oct 2026 | No parallel citation is given, so the order has no effect; report first by default (DECISION-043 item 3). |
| MNC of a reported case | Omitted (the report replaces it) | Court instrument | ACT-1 (ACT SC Practice Direction 2 of 2022 (Citation of Authority)) cl 3–4 | 6 Oct 2026 | The report replaces the MNC; the MNC is cited only for an unreported judgment (also AGLC4 r 2.2.7). |
| Pinpoint style | Paragraph and page | No supporting source | None | No | Not checked against a court instrument. |
| Pinpoint connector | AGLC punctuation | Obiter default | AGLC4 (Australian Guide to Legal Citation (4th ed, 2018)) r 2.2.5 | 6 Oct 2026 | Instrument shows no pinpoint connector; Obiter uses the AGLC4 form. |
| Authorised-report hierarchy | ACTLR → CLR → ALR | Court instrument | ACT-1 (ACT SC Practice Direction 2 of 2022 (Citation of Authority)) cl 3–4 | 6 Oct 2026 |  |
| Unreported-judgment gate | Off | No supporting source | None | No | Not checked against a court instrument. |
| Ibid / (n X) suppression | On | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 2 | 6 Oct 2026 | No court instrument read mentions ibid (register O-R14); Obiter default kept by DECISION-043 item 2. |
| List of Authorities | Simple | No supporting source | None | No | Not checked against a court instrument. |

Known exceptions:

- PD 2 of 2022 is a scan; clauses 3 to 5 were re-read against the court's PDF on 6 Oct 2026. The owner's eye check (open question 12) is still pending.

#### NT Supreme Court (`NTSC`)

Experimental: checked against NT SC Practice Direction 2 of 2007 (Citation of Authorities) (25 May 2007); NT SC Practice Direction 1 of 2025 (Lists of Authorities) (1 Jan 2025) on 6 Oct 2026; not endorsed by the court.

| Setting | Value | Kind | Source | Checked | Note |
|---|---|---|---|---|---|
| Parallel citations | Off | Court instrument | NT-1 (NT SC Practice Direction 2 of 2007 (Citation of Authorities)) | 6 Oct 2026 | The authorised report “is to be cited”; the direction does not mention the MNC (register O-R10). |
| Parallel citation order | Authorised report first | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 3 | 6 Oct 2026 | No parallel citation is given, so the order has no effect; report first by default (DECISION-043 item 3). |
| MNC of a reported case | Omitted (the report replaces it) | Court instrument | NT-1 (NT SC Practice Direction 2 of 2007 (Citation of Authorities)) | 6 Oct 2026 | The report replaces the MNC; the MNC is cited only for an unreported judgment (also AGLC4 r 2.2.7). |
| Pinpoint style | Paragraph and page | No supporting source | None | No | Not checked against a court instrument. |
| Pinpoint connector | AGLC punctuation | Obiter default | AGLC4 (Australian Guide to Legal Citation (4th ed, 2018)) r 2.2.5 | 6 Oct 2026 | Instrument shows no pinpoint connector; Obiter uses the AGLC4 form. |
| Authorised-report hierarchy | NTLR → CLR → ALR | Court instrument | NT-1 (NT SC Practice Direction 2 of 2007 (Citation of Authorities)) | 6 Oct 2026 |  |
| Unreported-judgment gate | Off | No supporting source | None | No | Not checked against a court instrument. |
| Ibid / (n X) suppression | On | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 2 | 6 Oct 2026 | No court instrument read mentions ibid (register O-R14); Obiter default kept by DECISION-043 item 2. |
| List of Authorities | Simple | No supporting source | NT-2 (NT SC Practice Direction 1 of 2025 (Lists of Authorities)) | 6 Oct 2026 | The list format is in Supreme Court Rules r 82.10, which was not read. |

Known exceptions:

- List of Authorities format (r 82.10) not read (COURT-136).

### Tribunals

#### Administrative Review Tribunal (`ART`)

Experimental: not checked against a court instrument (none found); not endorsed by the court.

| Setting | Value | Kind | Source | Checked | Note |
|---|---|---|---|---|---|
| Parallel citations | Off | No supporting source | None | No | Not checked against a court instrument. |
| Parallel citation order | Authorised report first | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 3 | 6 Oct 2026 | Instrument silent on order; report first by default (DECISION-043 item 3). |
| MNC of a reported case | Given with the report | Obiter default | None | No | Obiter default: the MNC is given with the report (court-mode behaviour before COURT-111). |
| Pinpoint style | Paragraph only | No supporting source | None | No | Not checked against a court instrument. |
| Pinpoint connector | AGLC punctuation | Obiter default | AGLC4 (Australian Guide to Legal Citation (4th ed, 2018)) r 2.2.5 | 6 Oct 2026 | Instrument shows no pinpoint connector; Obiter uses the AGLC4 form. |
| Authorised-report hierarchy | None | No supporting source | None | No | Not checked against a court instrument. |
| Unreported-judgment gate | Off | No supporting source | None | No | Not checked against a court instrument. |
| Ibid / (n X) suppression | On | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 2 | 6 Oct 2026 | No court instrument read mentions ibid (register O-R14); Obiter default kept by DECISION-043 item 2. |
| List of Authorities | Off | No supporting source | None | No | Not checked against a court instrument. |

Known exceptions:

- No tribunal instrument is in the evidence register.

#### Fair Work Commission (`FWC`)

Experimental: not checked against a court instrument (none found); not endorsed by the court.

| Setting | Value | Kind | Source | Checked | Note |
|---|---|---|---|---|---|
| Parallel citations | Off | No supporting source | None | No | Not checked against a court instrument. |
| Parallel citation order | Authorised report first | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 3 | 6 Oct 2026 | Instrument silent on order; report first by default (DECISION-043 item 3). |
| MNC of a reported case | Given with the report | Obiter default | None | No | Obiter default: the MNC is given with the report (court-mode behaviour before COURT-111). |
| Pinpoint style | Paragraph only | No supporting source | None | No | Not checked against a court instrument. |
| Pinpoint connector | AGLC punctuation | Obiter default | AGLC4 (Australian Guide to Legal Citation (4th ed, 2018)) r 2.2.5 | 6 Oct 2026 | Instrument shows no pinpoint connector; Obiter uses the AGLC4 form. |
| Authorised-report hierarchy | None | No supporting source | None | No | Not checked against a court instrument. |
| Unreported-judgment gate | Off | No supporting source | None | No | Not checked against a court instrument. |
| Ibid / (n X) suppression | On | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 2 | 6 Oct 2026 | No court instrument read mentions ibid (register O-R14); Obiter default kept by DECISION-043 item 2. |
| List of Authorities | Off | No supporting source | None | No | Not checked against a court instrument. |

Known exceptions:

- No tribunal instrument is in the evidence register.

#### State/Territory Tribunal (NCAT/VCAT/QCAT/SAT/other) (`STATE_TRIBUNAL`)

Experimental: not checked against a court instrument (none found); not endorsed by the court.

| Setting | Value | Kind | Source | Checked | Note |
|---|---|---|---|---|---|
| Parallel citations | Off | No supporting source | None | No | Not checked against a court instrument. |
| Parallel citation order | Authorised report first | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 3 | 6 Oct 2026 | Instrument silent on order; report first by default (DECISION-043 item 3). |
| MNC of a reported case | Given with the report | Obiter default | None | No | Obiter default: the MNC is given with the report (court-mode behaviour before COURT-111). |
| Pinpoint style | Paragraph only | No supporting source | None | No | Not checked against a court instrument. |
| Pinpoint connector | AGLC punctuation | Obiter default | AGLC4 (Australian Guide to Legal Citation (4th ed, 2018)) r 2.2.5 | 6 Oct 2026 | Instrument shows no pinpoint connector; Obiter uses the AGLC4 form. |
| Authorised-report hierarchy | None | No supporting source | None | No | Not checked against a court instrument. |
| Unreported-judgment gate | Off | No supporting source | None | No | Not checked against a court instrument. |
| Ibid / (n X) suppression | On | Obiter default | DECISION-043 (Obiter DECISION-043 (owner decision, court interoperability)) item 2 | 6 Oct 2026 | No court instrument read mentions ibid (register O-R14); Obiter default kept by DECISION-043 item 2. |
| List of Authorities | Off | No supporting source | None | No | Not checked against a court instrument. |

Known exceptions:

- No tribunal instrument is in the evidence register.

## Sources

| Id | Instrument | Effective | Link |
|---|---|---|---|
| HCA-1 | HCA Practice Direction No 2 of 2024 (Joint Book of Authorities) | 20 Dec 2024 | https://www.hcourt.gov.au/sites/default/files/assets/registry/practice-directions/Practice_Direction_No_2_of_2024__Joint_Book_of_Authorities_20_December_2024.pdf |
| HCA-2 | HCA Form 27A | 2024 | https://www.hcourt.gov.au/sites/default/files/assets/registry/Forms2024/FORM_27A_2024.pdf |
| FCA-1 | FCA Lists of Authorities and Citations Practice Note (GPN-AUTH) | 7 May 2025 | https://www.fedcourt.gov.au/law-and-practice/practice-documents/practice-notes/gpn-auth |
| FCA-2 | FCA eBooks Practice Note (GPN-eBOOKS) | 11 Jun 2026 | https://www.fedcourt.gov.au/law-and-practice/practice-documents/practice-notes/gpn-ebooks |
| FCF-1 | FCFCOA FAM-APPEALS Practice Direction | updated 10 Jun 2025 | https://www.fcfcoa.gov.au/fl/pd/fam-appeals |
| NSW-1 | NSW SC Practice Note SC Gen 20 (Citation of Authority) | 1 Oct 2023 | https://supremecourt.nsw.gov.au/content/dam/dcj/ctsd/supreme-court/documents/Practice-and-Procedure/Practice-Notes/general/current/20230912_SC_Gen_20_Citation_of_Authority.pdf |
| NSW-2 | NSW Court of Appeal Practice Note SC CA 1 | 8 May 2023 | https://supremecourt.nsw.gov.au/content/dam/dcj/ctsd/supreme-court/documents/Practice-and-Procedure/Practice-Notes/court-of-appeal-practice-notes/current/2023_05_08_PN_SC_CA_1_-_Court_of_Appeal.pdf |
| NSW-3 | NSW Court of Criminal Appeal Practice Note SC CCA 1 (General) | 22 Jul 2021 | https://supremecourt.nsw.gov.au/documents/Practice-and-Procedure/Practice-Notes/cca-practice-notes/current/2021_07_22_SC_CCA_1_General.pdf |
| NSW-4 | NSW District and Local Court practice-note indexes (no citation instrument found) | checked 6 Oct 2026 | https://districtcourt.nsw.gov.au/practice-procedures-publications/practice-and-procedure/practice-notes.html |
| VIC-1 | Vic SC Practice Note SC Gen 3 (Citation of authorities and legislation) | 1 Dec 2025 | https://www.supremecourt.vic.gov.au/sites/default/files/2026-03/SC%20Gen%203%20-%20citation%20of%20authorities%20and%20legislation.pdf |
| VIC-2 | Vic Court of Appeal Practice Note SC CA 3 | 10 Mar 2026 | https://www.supremecourt.vic.gov.au/sites/default/files/2026-03/CA%203%20-%20Civil%20applications%20and%20appeals.pdf |
| QLD-1 | Qld SC Practice Direction 1 of 2024 (Citation of Authority) | 29 Jan 2024 | https://www.courts.qld.gov.au/__data/assets/pdf_file/0007/786697/scpd-01-of-2024.pdf |
| QLD-2 | Qld SC Practice Direction 3 of 2013 (Court of Appeal) | 2013 | https://www.courts.qld.gov.au/__data/assets/pdf_file/0003/177456/sc-pd3of2013.pdf |
| QLD-3 | Qld Magistrates Court Practice Direction 7 of 2024 (Citation of Authority) | 7 Jun 2024 | https://www.courts.qld.gov.au/__data/assets/pdf_file/0005/800915/mcpd-07-of-2024.pdf |
| WA-1 | WA SC Consolidated Practice Directions (PD 2.1, PD 8.2.2) | updated 23 Sep 2026 | https://www.supremecourt.wa.gov.au/C/consolidated_practice_directions.aspx |
| SA-1 | SA Uniform Civil Rules 2020 (rr 101.8, 217.8; Form 91) | current to 15 Mar 2026 | https://www.courts.sa.gov.au/wp-content/uploads/wp-download-manager-files/court-rules/08-uniform-civil-rules/Uniform%20Civil%20Rules%202020.pdf |
| TAS-1 | Tas SC Practice Direction 3 of 2014 (Citation of Judgments) | 21 Feb 2014 | https://supremecourt.tas.gov.au/wp-content/uploads/2018/11/Practice_Direction_3_of_2014_-_Citation_of_Judgments_.pdf |
| TAS-2 | Tas SC Practice Direction 3 of 2022 (Appeal Books, Lists of Authorities, Submissions) | 24 Aug 2022 | https://www.supremecourt.tas.gov.au/wp-content/uploads/2022/08/3-of-2022-Practice-Direction-Appeal-Books-Lists-of-Authorities-Written-Submissions.pdf |
| ACT-1 | ACT SC Practice Direction 2 of 2022 (Citation of Authority) | 26 May 2022 | https://www.courts.act.gov.au/__data/assets/pdf_file/0006/2008356/2a13102c6f1ab879a79145619cec0cb3abf2241d.pdf |
| NT-1 | NT SC Practice Direction 2 of 2007 (Citation of Authorities) | 25 May 2007 | https://supremecourt.nt.gov.au/_resources/documents/lawyers/practice-directions/citation-of-authorities-2-of-2007.pdf |
| NT-2 | NT SC Practice Direction 1 of 2025 (Lists of Authorities) | 1 Jan 2025 | https://supremecourt.nt.gov.au/_resources/documents/lawyers/practice-directions/practice-direction1of2025-lists-authorities-summaries-submissions.pdf |
| O-C5 | Observed practice in published NSW and ACT judgments (evidence register O-C5) | Nov 2025 to Oct 2026 sample |  |
| DECISION-043 | Obiter DECISION-043 (owner decision, court interoperability) | 6 Oct 2026 |  |
| AGLC4 | Australian Guide to Legal Citation (4th ed, 2018) | 2018 |  |

Source ids are those of the court-interop evidence register (`docs/research/court-interop/EVIDENCE-REGISTER.md`), retrieved 6 October 2026.
