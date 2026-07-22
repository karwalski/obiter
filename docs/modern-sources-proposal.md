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
> `docs/aglc5-and-peer-standards-research.md` (CRIT-003); any item still awaiting that
> confirmation is marked *(verify: CRIT-003)*.

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
- **Elements:** Tool/platform name · model name and version · nature of interaction
  (prompt/conversation) · date of output · custodian of the transcript (usually "the
  author") · optional archived-transcript URL/identifier.
- **Worked example:** `Conversation with ChatGPT (GPT-5, OpenAI), 7 July 2026 (transcript
  held by the author)`.
- **Recommendation:** **Interim-support (shipped).** Keep the rule-7.12 analogy but add
  model-version and transcript-custody elements; migrate to the AGLC5 rule when
  published.

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
- **Note (not a citation type):** several Australian courts issued practice notes on AI
  use in litigation (2023–2025) *(verify current list: CRIT-003 §2)*. This belongs in
  **court mode** as a disclosure reminder, not the academic citation engine — link from
  `docs/court-practices-review.md`.
- **Recommendation:** **Interim-support** as a court-mode reminder once the practice-note
  list is confirmed by CRIT-003 / CRIT-004.

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
dates below are matters of public record; each should carry an official citation (to the
enabling Act or the court/tribunal's own site) before this document is published.

| Institution | Change | Citation impact | Status |
|---|---|---|---|
| **Federal Circuit and Family Court of Australia (FCFCOA)** | Commenced 1 September 2021 (merged the Federal Circuit Court and Family Court of Australia) | New court identifiers; legacy FamCA/FCCA citations remain for pre-2021 matters | Public record; cite enabling Act |
| **Administrative Review Tribunal (ART)** | Commenced 14 October 2024, replacing the Administrative Appeals Tribunal (AAT) | New identifier; guidance needed on citing legacy AAT decisions going forward | Public record; cite enabling Act |
| **National Anti-Corruption Commission (NACC)** | Commenced 1 July 2023 | New institutional author for reports/findings | Public record; cite enabling Act |
| **Queensland Reports abbreviation change** | "Qd R" → "QR" from April 2020 | Report-series abbreviation split by date (already handled — DECISION-031) | Confirmed (Appendix A) |
| **State/territory tribunal renamings/reconstitutions** | Various since 2018 | Identifier-list refresh | Needs a dated sweep before publication |

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
