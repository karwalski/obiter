# Court-Practices Review (CRIT-004)

**Author:** Matthew Watt · **Project:** Obiter · **Reviewed 2026-07-22**
**Method:** Primary-source verification of the three open DECISION-033 practice-direction
items against the courts' own published notes (fetched directly or via the Internet
Archive where the live site is behind a bot challenge / expired certificate), plus an
18/20-jurisdiction court-mode validation matrix (`tests/engine/court-practice-matrix.test.ts`).

> **Scope.** Resolves DECISION-033 and audits the court-mode data for currency. Where a
> finding recommends a *behavioural* change to a shipped preset (as opposed to a factual
> correction), it is flagged **[recommend — owner sign-off]** rather than applied, because
> practitioners rely on the current output. Factual/link corrections were applied directly
> and are noted **[applied]**.

---

## 1. DECISION-033 — resolved

All three queued items were verified against primary sources. Confidence is **high** for
each (primary PDFs read directly; live sites reached via Archive where challenged).

### 1.1 NSW Supreme Court — PN SC Gen 20 "Citation of Authority"
- **Current:** Yes — landing page last updated 26 February 2026.
- **Correction [applied]:** the host `supremecourt.justice.nsw.gov.au` has been retired
  (expired TLS certificate); the live note is on **`supremecourt.nsw.gov.au`**. The PD link
  in `src/engine/court/practiceDirections.ts` was updated.
- **Date correction [applied]:** SC Gen 20 was **issued 12 September 2023 and commenced
  1 October 2023** (replacing the 15 May 2015 version) — not the ~May 2023 the engine
  implied. Reflected in the PD `name`.
- **Substance [recommend — owner sign-off]:** SC Gen 20 itself does **not** mandate
  paragraph-only pinpoints (it *permits* MNC paragraph numbers as sufficient), does **not**
  make parallel citations mandatory (the authorised report "should, as far as possible,
  also be noted" — a best-efforts obligation), and does **not** contain the Part A/B List
  of Authorities structure — that derives from the Court of Appeal note **SC CA 1**. The
  NSWCA/NSWSC presets (`parallelCitations: "mandatory"`, `loaType: "part-ab"`) are
  therefore *stronger than SC Gen 20's own words*; the Part A/B attribution should point to
  SC CA 1. Recommended: soften the parallel-citation label to "preferred" and re-source the
  Part A/B LOA to SC CA 1. Not applied pending sign-off (behavioural).

### 1.2 Queensland — PD 1 of 2024 + PD 3 of 2013
- **Current:** PD 1 of 2024 "Citation of Authority" (issued 16 Jan 2024, **commenced 29 Jan
  2024**) governs *how to cite*, in the Trial Division **and** the Court of Appeal. PD 3 of
  2013 "Court of Appeal" governs the **Part A/B List of Authorities** and remains current.
- **Engine confirmed correct:** the engine's two-PD split (PD 1/2024 for citation, PD 3/2013
  for the CoA Part A/B list) is architecturally right. PD 1/2024 repeals **PD 16 of 2013**,
  **not** PD 3 of 2013 — so PD 3/2013 stands.
- **Substance [recommend — owner sign-off]:** parallel citation is **"should, as far as
  possible"** (relaxed in 2024 for access-to-justice reasons), not strictly mandatory — the
  QCA/QSC presets' `"mandatory"` overstates it. Paragraph pinpoints are *sufficient*, not
  paragraph-exclusive. The subsequent-treatment trigger is specifically a later judgment
  that **"doubted, or not followed"** the cited case (PD 1/2024 para 4(c)) — narrower than
  "overruled/reversed".
- **New context:** Queensland issued a **generative-AI verification regime in October 2025**
  (Supreme Court PD 5 of 2025; District Court PD 12/2025; P&E Court PD 7/2025) requiring a
  named practitioner to verify the accuracy of all authority/legislation references, with
  referral to the Legal Services Commissioner and personal costs orders for citing
  non-existent authorities. This is relevant to the AI-use disclosure track in
  `docs/modern-sources-proposal.md` §2.4 and a candidate court-mode reminder.

### 1.3 Federal Court — GPN-AUTH "Lists of Authorities and Citations"
- **Current:** Yes — reissued **7 May 2025** (D S Mortimer CJ). The engine's date is correct.
- **Correction [applied]:** the engine's clause mapping was wrong. The signed note has **no
  "not reasonably obtainable" clause** at all. The correct mapping is:
  - **cl 2.4** — cite the MNC where available, plus the authorised report "if possible"
    (cl 2.4(b)); **MNC paragraph pinpoints are expressly sufficient** (last sentence of 2.4).
  - **cl 2.5** — worked examples only (not a parallel-citation rule).
  - **cl 2.6** — paragraph-over-page pinpoint preference.
  - **cl 3.1** (applicant, 5 business days) / **3.2** (respondent, 4 business days) / **3.3**
    (consolidated list, 2 business days) / **4.1** (consolidated eBook, 2 business days) —
    the List/eBook deadlines span 3.1–3.3 and 4.1, not just "3.1–3.2".
  The `courtReferenceGuide.ts` FCA entry was corrected to cite cl 2.4/2.4(b) and drop the
  non-existent "not reasonably obtainable" clause.
- **2025 change confirmed:** the 7 May 2025 reissue amended [2.4]–[2.6] to relax the
  authorised-report requirement (access-to-justice), consistent with the corrected text.

**DECISION-033 status:** **RESOLVED** for the three queued items (verified against primary
sources, factual/link corrections applied). The interpretive preset-strength refinements
(NSW/Qld "mandatory" → "preferred", NSW Part A/B → SC CA 1) are recorded here as
recommendations for owner sign-off.

---

## 2. Court-mode validation matrix

`tests/engine/court-practice-matrix.test.ts` pins court-mode output to each of the 20
`COURT_PRESETS` jurisdictions: for every preset it asserts the toggle shape is valid and
that formatting a reported case with an MNC yields the pinpoint style and parallel-citation
order the jurisdiction requires (WA `mnc-first` per Consolidated PD 8.2.2; report-first
elsewhere). **63 tests, green.** A future practice-direction change to any preset now forces
a visible, reviewed change to this matrix.

---

## 3. Practice-direction link audit

The 23 links in `practiceDirections.ts` were reviewed for freshness during DECISION-033.
The NSW host retirement (§1.1) was the one broken link; it is fixed. The remaining links
carried `lastVerified` dates of 2026-04-21 or 2026-07-21 and were not individually re-opened
in this pass beyond the three DECISION-033 targets — a full 23-link re-verification is a
low-effort recurring task recommended annually. One residual: the retired NSW host still
appears in the CSP connect-src allowlist (`config/csp.js` / `tests/security/cspAllowlist.test.ts`)
as a source-lookup target; harmless (dead host) but a candidate cleanup.

---

## 4. Recommended follow-ups (owner sign-off)

1. Soften NSWCA/NSWSC and QCA/QSC `parallelCitations` from `"mandatory"` to `"preferred"`
   to match the actual "should, as far as possible" wording, and update the matrix + preset
   tests accordingly.
2. Re-source the NSW Part A/B List of Authorities to SC CA 1 (not SC Gen 20).
3. Add a court-mode **AI-use verification reminder** for QLD (PD 5/2025 and mirrors) — ties
   to `docs/modern-sources-proposal.md` §2.4.
4. Annual 23-link practice-direction freshness sweep; drop the retired NSW host from the CSP
   allowlist.

---

## 5. 2026-07 addendum — national AI-instrument sweep (CRIT-005 Part B.3)

**Added 2026-07-23** from the CRIT-005 P0/P1 research outcomes (verified July 2026, [high]
unless noted). This addendum records the national landscape of Australian court AI practice
instruments as of July 2026, classified into the two instrument families the court-mode
feature distinguishes. It supersedes the interim "(verify)" list previously carried in
`docs/modern-sources-proposal.md` §2.4.

### 5.1 Two instrument families

- **Family 1 — accuracy / verification.** Named-human verification of cited authorities;
  no general disclosure mandate. The obligation is that a *named practitioner* attests to the
  accuracy of every cited authority/legislation reference, with referral to the Legal Services
  Commissioner and personal costs orders for non-existent authorities.
- **Family 2 — disclosure + restriction.** Verification *plus* disclosure duties *plus* limits
  on AI-generated evidence (eg prohibiting Gen AI drafting of affidavit / witness / character
  content, and barring one AI tool from verifying another's output).

The design lesson (per CRIT-003 and the AGLC5 letter): courts govern **disclosure of AI
assistance**; an academic citation guide's job is **citation of AI output**. The two tracks
must stay separate — conflating them is the documented Bluebook r 18.3 failure mode.

### 5.2 Family 1 — accuracy / verification instruments

| Instrument | Court / tribunal | Date | Notes |
|---|---|---|---|
| PD 5 of 2025 | Qld Supreme Court | 24 Sep 2025 | Named person responsible for accuracy; referral to LSC + personal costs orders for non-existent authorities |
| PD 12/2025 | Qld District Court | 2025 | Mirrors the Supreme Court accuracy regime |
| PD 7/2025 | Qld Planning & Environment Court | 2025 | Mirrors the Supreme Court accuracy regime |
| **PD 10/2025** | **QCAT** | **2025** | New since prior research — extends the Qld accuracy regime to QCAT |
| Guidelines | SA Supreme Court | 24 Dec 2025 | Accuracy/verification guidelines |

Link basis: Queensland Courts practice-direction index (`courts.qld.gov.au`); SA Courts.
QCAT PD 10/2025 is the notable new addition to the Qld suite this pass.

### 5.3 Family 2 — disclosure + restriction instruments

| Instrument | Court / tribunal | Date | Notes |
|---|---|---|---|
| PN SC Gen 23 | NSW Supreme Court | issued 21 Nov 2024, amended 28 Jan 2025, commenced 3 Feb 2025 | Verification cannot itself be done by AI; prohibits Gen AI drafting of affidavit / witness / character content; reinforced by **UCPR Amendment No 104 of 2025**, rr **31.4(3A)–(3C)** and **35.3B** |
| (parallel notes) | NSW Land & Environment Court | amended Feb 2025 | Parallel NSW instrument |
| GPN | NSW District Court | 2 Feb 2025 | Parallel NSW instrument |
| PN | NSW Local Court | commenced 12 Jan 2026 | Parallel NSW instrument |
| PD 7 | NCAT | 2025 | Parallel NSW instrument |
| PD 13 | Personal Injury Commission (NSW) | 2025 | Parallel NSW instrument |
| **PN SC Gen 25** | **Victoria (Supreme Court)** | **14 May 2026** | **Replaces the May 2024 AI guidelines** (supersession); adopts the eight VLRC principles; "one AI tool cannot be used to confirm the content generated by another"; **County Court 2024 guidelines remain current** |
| GPN-AI | Federal Court | 16 Apr 2026 | Disclosure/restriction general practice note |
| PD-AI | FCFCOA | May 2026 | Disclosure/restriction |
| Guidelines | WA Supreme Court | post-2025 consultation | Disclosure/restriction |

**Victoria supersession (explicit).** Victoria's **PN SC Gen 25 (14 May 2026)** replaces the
**May 2024 AI guidelines**; the earlier guidelines are superseded. The **County Court 2024
guidelines remain current** and are not superseded. Court-mode data must reflect this swap
(the modern-sources / court-mode entry replaces the May 2024 Vic guidelines row with PN SC
Gen 25, keeping County Court 2024 as current — CM-3 in the CRIT-005 handoff).

**NSW UCPR Amendment No 104 of 2025.** The NSW disclosure/restriction regime is reinforced at
the rules-of-court level by **Uniform Civil Procedure Rules Amendment No 104 of 2025**, adding
**rr 31.4(3A)–(3C)** (AI in expert/evidence contexts) and **r 35.3B** (affidavit/AI
restrictions) — not merely a practice note but binding subordinate legislation.

### 5.4 Coverage gaps and monitoring

No dedicated AI instrument was located for the **High Court, Tasmania, ACT, or NT** [medium];
**Fair Work Commission** guidance is pending [medium]. Monitoring anchor: the Law Society of
NSW "Court Protocols on AI" hub (current at 14 May 2026); re-scan quarterly. This feeds the
court-mode CM-1 reminder (jurisdiction-keyed, two families) and the annual 23-link
practice-direction sweep recorded in §3–4 above.

---

*Cross-references: `docs/decisions.md` (DECISION-033), `docs/aglc4-critique.md`,
`docs/modern-sources-proposal.md`, `src/engine/court/practiceDirections.ts`,
`src/ui/data/courtReferenceGuide.ts`, `tests/engine/court-practice-matrix.test.ts`,
`../aglc5-feedback-package.md` (CRIT-005 Part B.3).*
