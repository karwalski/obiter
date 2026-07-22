# Obiter Extensions Register (CRIT-002, Part 1)

**Author:** Matthew Watt · **Project:** Obiter (AGLC4 Word add-in) · **First consolidation 2026-07-22**

> **Purpose.** An honest register of everything Obiter provides that AGLC4 does not
> specify: invented source types, fields the guide never defines, formatting decisions
> made where the guide is silent, and court-mode behaviours that deliberately depart
> from academic AGLC4. Every extension is marked **pending AGLC5** so users and
> reviewers can distinguish guide-mandated output from Obiter judgment calls.
>
> Companion documents: `docs/aglc4-critique.md` (CRIT-001, the defect catalogue) and
> `docs/modern-sources-proposal.md` (CRIT-002 Part 2, proposed new source types).

> **Transcription note.** AGLC4 rule prose is paraphrased, never reproduced verbatim;
> pinpoints are given by rule number. Source-type ids and field names are Obiter's own
> data-model identifiers.

---

## 1. Summary

Obiter supports **77 source types**. Of these:

| Provenance | Count | Meaning |
|---|---|---|
| **Guide-mandated** | 74 | Maps to a specific AGLC4 rule (Rules 2.2–7.16, 8–26) |
| **Guide-silent judgment** | 1 | `genai_output` — AGLC4 has no rule; Obiter follows MULR interim guidance by analogy to rule 7.12 |
| **Non-AGLC standard** | 1 | `report.waitangi_tribunal` — from the New Zealand Law Style Guide (NZLSG), not AGLC4 |
| **Obiter extension** | 3 | `book.ebook`, `custom`, `explanatory_note` — no AGLC4 rule |

Plus **17 field-level extensions** (fields the forms collect that AGLC4 never defines),
**7 documented silent-rule formatting decisions**, and **3 court-mode departures** sourced
from practice directions rather than the guide.

Everything in §§3–6 is an **Obiter extension pending AGLC5**.

---

## 2. Guide-mandated types (for completeness — NOT extensions)

The 74 guide-mandated types are catalogued in `SOURCE_TYPE_METADATA`
(`src/engine/ruleExporter.ts`) with their AGLC4 rule mappings, spanning domestic cases
(rule 2.2–2.8), legislation (3.1–3.9), journals (5), books (6), reports and other
secondary sources (7.1–7.16), international materials (8–14), and the eleven foreign
jurisdictions (15–26). These are reproduced faithfully from the guide and are **not**
extensions; they are listed here only so the register is exhaustive. The remainder of
this document covers only the material where Obiter goes beyond AGLC4.

---

## 3. Invented source types (no AGLC4 rule)

| Type id | Status | What it is | Why it exists / how it renders | Ref |
|---|---|---|---|---|
| `book.ebook` | **Obiter extension pending AGLC5** | An ebook entry | AGLC4 has no ebook rule. Renders as an ordinary book (rules 6.1–6.5) plus a URL. An invented `[Platform]` bracket was **retired** — ebooks now format identically to print books. A UI convenience only. | DECISION-019 |
| `custom` | **Obiter extension** | Free-text citation | Verbatim escape hatch: the user's text is inserted as-is in roman type; excluded from ibid, short-reference resolution, and the bibliography. The "force an override" mechanism for anything the engine cannot model. | — |
| `explanatory_note` | **Obiter extension** | Free-text footnote | A substantive footnote that is not a citation; inserted verbatim and excluded from ibid, short references, and the bibliography. | — |
| `genai_output` | **Guide silence — interim judgment** | Generative-AI output (ChatGPT etc.) | AGLC4 predates generative AI and has no rule. Obiter follows the interim guidance circulated by Australian law libraries and MULR: cite by analogy to rule 7.12 (written correspondence) — "Correspondence from [Platform] ([Model]) to the author, [Date]". **Will be replaced by the AGLC5 rule.** See `docs/modern-sources-proposal.md`. | DECISION-006 |
| `report.waitangi_tribunal` | **Non-AGLC (NZLSG)** | Waitangi Tribunal report | Not in AGLC4; taken from the New Zealand Law Style Guide. Rendered in the NZLSG output path / bibliography section, not the AGLC4 path. Present because Obiter also implements NZLSG. | — |

---

## 4. Field-level extensions (fields AGLC4 never defines)

Seventeen optional fields the forms collect that have no AGLC4 definition. Most exist to
support court mode (§6), enhanced metadata, or Obiter's escape hatches.

| Field | Attached to | Purpose | Pending-AGLC5 note |
|---|---|---|---|
| `parallelCitations` | `case.reported` | Structured parallel report series | Emitted in court mode only; academic AGLC4 (rule 2.2.7) forbids parallels for Australian cases |
| `mnc` | `case.reported` | Medium-neutral-citation display marker | Court-mode display aid |
| `reportedIn` | `case.arbitration` | Where an award was later reported | Not defined in rule 2.6.2 |
| `foreignSubType` | `foreign.*` | Router: case / legislation / secondary | Guide is silent on sub-type naming; Obiter's own routing field |
| `legislativeHistory` | `legislation.statute` | Opt-in rule 3.8 "as amended by" / "amending" data | Single-Act default; hybrid is opt-in (DECISION-008) |
| `loaPart` | any (court mode) | List-of-Authorities part A/B | From court practice directions, not AGLC4 |
| `isKeyAuthority` | any (court mode) | NSWCA key-authority marker (max 5) | From NSWCA practice note |
| `signal` | any | Introductory signal | Supports rule 1.2 but stored as structured data |
| `commentaryBefore` / `commentaryAfter` | any | Free-text annotations wrapping a citation | Obiter authoring convenience |
| `linkingPhrase` / `linkedCitationId` | any | Linked-citation pairs (rule 1.3) | Structured support for a manual rule |
| `overrideText` | any | Render this string verbatim instead of the structured format | Escape hatch |
| `yearType` | `case.reported` (court mode) | round vs square bracket control | Court-mode parallel-citation control |
| `titleMarkup` | any title | Inline `*asterisk*` = italic span | Represents rule 4.2 embedded italics without a schema change (DECISION-021) |
| `translatedTitle` / `translatedCaseName` | foreign/secondary | Bracketed English translation | Supports rules 26.1/26.4 as structured data |

---

## 5. Formatting decisions where AGLC4 is silent or self-contradictory

Seven judgment calls, each recorded in `docs/decisions.md` and each an **Obiter
extension pending AGLC5** in the sense that AGLC5 could overturn them:

1. **DECISION-008 — amending legislation.** Rule 3.1.2's note ("generally a principal
   Act") vs rule 3.8's hybrid form is under-specified. Obiter defaults to a single-Act
   citation and treats the rule 3.8 hybrid as opt-in via `legislativeHistory`.
2. **DECISION-013 — em-dash spacing.** The guide bans spaced em-dashes in citations but
   uses them in its own Part headings. Obiter enforces the ban only inside citation
   elements, leaving prose alone.
3. **DECISION-014 — ampersand in journal titles.** Rule 5.5 says reproduce the title
   page; example 10 silently converts "&" to "and". Obiter preserves "&" (rule text
   wins, per the DECISION-012 default).
4. **DECISION-019 — ebook format.** AGLC4 is silent; Obiter retired its invented
   `[Platform]` bracket and now renders ebooks as book + URL.
5. **DECISION-020 — partial dates.** Rule 7.10's template says "Full Date"; example 79
   uses a partial date. Obiter accepts partial dates where that is all the source
   states.
6. **DECISION-021 — embedded italics.** Rule 4.2 requires italics inside a title, which
   a plain-string model cannot hold; Obiter uses the `*asterisk*` inline marker.
7. **DECISION-027 — US Constitution numerals.** Rule 25.4 is silent on Roman vs Arabic;
   Obiter passes the numerals through as entered.

(These are the guide *defects* from CRIT-001 viewed from the implementation side: each
defect forced an extension.)

---

## 6. Court-mode departures from academic AGLC4

Court submission mode is a behavioural overlay sourced from **court practice directions**,
not from AGLC4. It deliberately departs from academic AGLC4 in three ways; each is
mapped to its practice-direction source and verified in `docs/court-practices-review.md`
(CRIT-004):

1. **Parallel citations emitted** (academic AGLC4 rule 2.2.7 forbids them for Australian
   cases) — required or preferred by HCA/FCA/NSWCA/VSCA/QCA/WASC directions.
2. **List of Authorities structure** (`loaPart` A/B, `isKeyAuthority`) — AGLC4 has no LOA
   chapter; the structures come from HCA, FCA, NSWCA, VSCA, QCA and other directions.
3. **Unreported-judgment gate** — court rules in NSW/Qld/Tas restrict reliance on
   unreported judgments; court mode warns where academic mode is silent.

These are correct *for practitioners* precisely because they follow the court's own
rules rather than the academic guide. They are labelled in the UI as court-mode
behaviour.

---

## 7. What this register implies for AGLC5

Every row above is a place where AGLC4 left a gap that a real tool had to fill. The
cleanest AGLC5 outcome would absorb the well-founded ones as first-class rules —
generative-AI output, ebooks, embedded-emphasis syntax, and an acknowledgement of
court-practitioner citation (parallel citations, lists of authorities) as a recognised
register distinct from academic citation — and explicitly bless or reject Obiter's
silent-rule choices (§5). The proposed new types are specified in
`docs/modern-sources-proposal.md`.
