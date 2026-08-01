# Modern Sources Proposal (CRIT-002, Part 2)

**Author:** Matthew Watt · **Project:** Obiter (AGLC4 Word add-in) · **First draft 2026-07-22**

> **Purpose.** A gap analysis and proposed set of new citation types for sources and
> institutions that post-date AGLC4 (2018). Each proposal gives a proposed element
> structure, one worked example, and a recommendation on whether Obiter should support
> it now (interim) or wait for AGLC5. Framed as input to the AGLC5 revision (feeds
> `website/aglc5.html`, the LETTER epic) and as candidate future Obiter stories.
>
> Companions: `docs/obiter-extensions.md` (what Obiter already extends) and
> `docs/aglc4-critique.md` (the AGLC4 defect catalogue).

> **Transcription / accuracy note.** No verbatim AGLC4 text. Institutional dates and
> external facts in §5 are cross-checked against the deep-research report
> `docs/aglc5-and-peer-standards-research.md` (CRIT-003) and the CRIT-005 P0/P1 research
> outcomes (`../aglc5-feedback-package.md` Parts B.2/B.3, verified July 2026), which now
> supply official citations for every §5 institution and the national court AI-instrument
> list; the earlier *(verify: CRIT-003)* placeholders have been satisfied and removed.

---

## 1. Why AGLC4 needs modern source types

AGLC4 was finalised in 2018. Since then: generative AI became a routine research and
drafting tool with no citation rule; datasets, model cards and versioned code became
citable scholarly objects; platforms were renamed or died (Twitter → X); and several
Australian courts and integrity bodies were created or reconstituted. AGLC4 addresses
none of these, so implementers and students improvise. This document proposes concrete
structures so AGLC5 (and Obiter in the interim) can cover them consistently.

Each proposal uses this shape: **Elements → Worked example → Recommendation
(interim-support | wait-for-AGLC5)**.

---

## 2. AI and generated content

The highest-priority gap. Obiter already ships an interim `genai_output` type (analogy
to rule 7.12 written correspondence, per MULR/library guidance — see
`docs/obiter-extensions.md` and CRIT-003 §2 for the interim-guidance ecosystem).

### 2.1 Generative-AI output (chat/completion)
- **EXP-1 element set (`genai_output` v2).** The confirmed OSCOLA 5 r 3.7.13 precedent
  (CRIT-005 Part B.4) and the MULR LibGuide rule-7.12 analogy fix the element list as:
  1. **Tool / platform name** (eg ChatGPT, Claude, Gemini)
  2. **Developer** (the developing organisation, eg OpenAI, Anthropic, Google)
  3. **Model name + version** (eg GPT-5, Claude Opus 4.8)
  4. **Generation date** (date of output)
  5. **Transcript custody** statement (custodian of the transcript — usually "the author")
  6. **Optional archived-transcript URL / identifier** (where the transcript is preserved)

  This keeps the rule-7.12 written-correspondence *shape* while adding the model-version,
  transcript-custody, and optional-archive elements OSCOLA 5 r 3.7.13 introduced.
- **Worked example:** `Conversation with ChatGPT (GPT-5, OpenAI), 7 July 2026 (transcript
  held by the author)`.
- **Recommendation:** **Interim-support (shipped; EXP-1, P0).** Keep the rule-7.12 analogy
  but add the model-version, transcript-custody, and optional archived-transcript elements
  above; badge as "Experimental · pending AGLC5 (not an official AGLC4 form)"; migrate to the
  AGLC5 rule when published. Registered per the D.1 labelling policy in
  `docs/obiter-extensions.md`.

### 2.2 AI-generated summaries / translations layered over a primary source
- **Elements:** underlying primary source (cited normally) · a bracketed tag noting AI
  generation, tool, model, date — analogous to the `[tr author]` translator marker
  (rule 26.1) but for machine generation.
- **Worked example:** `Evidence Act 1995 (NSW) [AI-generated plain-language summary,
  ChatGPT (GPT-5), 7 July 2026]`.
- **Recommendation:** **Wait-for-AGLC5** on the exact marker; interim, use `overrideText`
  or a commentary field. Flag prominently because the AI layer is not authoritative.

### 2.3 Prompts as quoted material
- **Elements:** quote the prompt text · attribute to the author · tool/model/date of the
  session it was used in.
- **Recommendation:** **Wait-for-AGLC5.** Treat as a quotation (rule 1.5) of the author's
  own words with a session note; no new type needed short-term.

### 2.4 AI-use disclosure in filed documents
- **Note (not a citation type):** many Australian courts have issued practice instruments on
  AI use in litigation (late 2024 – mid 2026). The national list is now **confirmed** and
  classified into two instrument families in `docs/court-practices-review.md` §5 (CRIT-005
  Part B.3): **Family 1 (accuracy/verification)** — Qld SC PD 5/2025, District Court PD
  12/2025, P&E Court PD 7/2025, QCAT PD 10/2025, SA SC guidelines; **Family 2 (disclosure +
  restriction)** — NSW PN SC Gen 23 (+ UCPR Amendment No 104 of 2025), Vic PN SC Gen 25
  (14 May 2026, superseding the May 2024 guidelines; County Court 2024 still current), FCA
  GPN-AI, FCFCOA PD-AI, WA SC guidelines. This belongs in **court mode** as a disclosure /
  verification reminder, not the academic citation engine.
- **Recommendation:** **Interim-support** — implemented as the court-mode **CM-1** reminder
  (jurisdiction-keyed, two families per the confirmed list above). Status: **confirmed list**;
  see `docs/court-practices-review.md` §5.

---

## 3. Datasets and computational sources

### 3.1 Published dataset
- **Elements:** author/creator · title (italic) · version · repository/publisher · year ·
  DOI or persistent identifier · access date if no DOI.
- **Worked example:** `Australian Bureau of Statistics, *Census of Population and Housing*
  (Dataset, 2021) <doi:10.xxxx/xxxx>`.
- **Recommendation:** **Wait-for-AGLC5** for the canonical form; interim, cite by analogy
  to rule 7.1.5 (ABS) or 7.15 (internet material) with a version and DOI.

### 3.2 Software / code repository (versioned)
- **Elements:** author/organisation · title · version or commit hash · "software" or
  "source code" designation · host (e.g. GitHub) · year · URL.
- **Worked example:** `Matthew Watt, *Obiter* (Software, v1.16.0, 2026) <github.com/…>`.
- **Recommendation:** **Wait-for-AGLC5**; interim via `internet_material` + version.

### 3.3 Model weights / model card
- **Elements:** developer · model name and version · "model card" or "model weights"
  designation · release date · repository/URL.
- **Recommendation:** **Wait-for-AGLC5**; low frequency in legal writing today.

---

## 4. Platform changes and evolving web media

- **Renamed/successor platforms (Twitter → X).** Rule 7.16 (social media) names specific
  platforms; the guide should cite by the platform name **at the date of the post**, with
  the successor name noted. *Interim:* Obiter's `social_media` type takes a free platform
  field, so this works today; recommend an AGLC5 note on renamed platforms.
- **Ephemeral / streaming content** (livestreams, stories): add a mandatory archived-copy
  or retrieval element because the source is non-persistent. **Wait-for-AGLC5** on the
  rule; interim, require an access date.
- **Podcasts / newsletters** matured since 2018. Rule 7.14 (film/TV/podcast) partly
  covers podcasts; newsletters fall between 7.11 (periodical) and 7.15 (internet). Recommend
  AGLC5 clarify newsletter/substack-style periodicals explicitly.

---

## 5. New institutions since 2018

These change court-identifier lists, report series, and citation forms. The commencement
dates and enabling instruments below are now **confirmed** against official sources
(CRIT-005 Part B.2, verified July 2026, [high] unless noted); each row carries its enabling
Act citation.

| Institution | Commenced | Enabling instrument | Citation impact |
|---|---|---|---|
| **Federal Circuit and Family Court of Australia (FCFCOA)** (two divisions; Div 1 continues the Family Court, Div 2 the Federal Circuit Court) | 1 September 2021 | *Federal Circuit and Family Court of Australia Act 2021* (Cth), No 12 of 2021 | New court identifiers; legacy FamCA/FCCA citations remain for pre-2021 matters |
| **Administrative Review Tribunal (ART)** (replaces AAT) | 14 October 2024 | *Administrative Review Tribunal Act 2024* (Cth), No 40 of 2024 (transitional: No 38, No 39 of 2024; AAT Act 1975 repealed) | New identifier (ARTA); legacy AATA identifiers persist for pre-commencement decisions [medium on identifier mechanics] |
| **National Anti-Corruption Commission (NACC)** (replaces ACLEI) | 1 July 2023 | *National Anti-Corruption Commission Act 2022* (Cth), No 88 of 2022 (+ No 89 of 2022) | New institutional author for reports/findings |
| **Personal Injury Commission (PIC)** (NSW; absorbs the Workers Compensation Commission + motor-accident dispute functions) | 1 March 2021 | *Personal Injury Commission Act 2020* (NSW), No 18 of 2020 | New NSW institutional author/identifier |
| **TASCAT** (consolidates nine Tasmanian tribunals) | 5 November 2021 | *Tasmanian Civil and Administrative Tribunal Act 2020* (Tas), No 24 of 2020 (establishment day deferred by proclamation; corroborated by TASCAT Annual Report 2021–22) | New Tas tribunal identifier; nine legacy tribunal identifiers end-dated |
| **VOCAT → Financial Assistance Scheme** (Vic; administrative scheme — VOCAT ceases as institutional author) | 18 November 2024 | *Victims of Crime (Financial Assistance Scheme) Act 2022* (Vic), No 21 of 2022 | VOCAT authorship end-dated 18 Nov 2024; the Scheme is administrative, not a tribunal |
| **Queensland Reports abbreviation change** | From 27 March 2020 | New series abbreviation **QR** (ICLRQ), round-bracket year of judgment delivery | Report-series abbreviation split by date (already handled — DECISION-031); confirmed against Appendix A |

Rule-outs (no change since 2018): SAET/SAEC changes pre-date 2018 (SAEC from 1 July 2017);
WA SAT, QCAT, ACAT, NTCAT unchanged in name/code ([medium], absence-of-evidence).

- **Recommendation:** **Interim-support** — refresh Obiter's court-identifier and
  institutional-author lists now (data-only changes, low risk), and propose AGLC5 add a
  dated institutional-succession appendix so legacy citations remain unambiguous. A dated,
  officially-cited sweep of these identifiers (and the state-tribunal renamings) is a
  candidate follow-up story; where confirmed, changes land in
  `src/engine/data/court-identifiers.ts`.

---

## 6. Archived / preserved web sources

- **Elements:** original source (cited normally) · archive service (e.g. Internet Archive
  / Pandora / Trove web archive) · archived-copy URL · archive date.
- **Worked example:** `Department of X, 'Policy Statement' (Web Page, 3 June 2019, archived
  at Pandora 5 July 2026) <archive-url>`.
- **Recommendation:** **Wait-for-AGLC5** for the canonical form, but AGLC5 should treat a
  persistent archive URL as the **preferred** citation target for ephemeral web sources,
  given link rot. Interim: Obiter's `internet_material` supports an archive URL in the URL
  field.

---

## 7. Prioritised recommendation summary

| Priority | Item | Action |
|---|---|---|
| P0 | Generative-AI output (§2.1) | Interim shipped; refine elements; migrate on AGLC5 |
| P0 | New-institution data refresh (§5) | Interim data-only update now |
| P1 | AI-use court disclosure (§2.4) | Court-mode reminder (CRIT-004) once PD list confirmed |
| P1 | Datasets / software (§3.1–3.2) | Interim by analogy; propose AGLC5 types |
| P2 | Archived web as preferred target (§6) | Propose to AGLC5; interim via URL field |
| P2 | AI summaries/translations, prompts (§2.2–2.3) | Wait-for-AGLC5; interim via override/commentary |
| P3 | Model cards, ephemeral/streaming (§3.3, §4) | Wait-for-AGLC5; low current frequency |

Each P0/P1 item is a candidate Obiter backlog story; each maps to an AGLC5 recommendation
in `docs/aglc4-critique.md` §10.
