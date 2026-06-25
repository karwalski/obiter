# Decisions

Decisions that required input from researchers or stakeholders. Each references the relevant AGLC4 rule or spec section.

---

## DECISION-001: Appendix A Data — Copyright Status

**Status:** RESOLVED
**Raised:** 2026-04-18 | **Resolved:** 2026-04-19
**Decision:** Option 3 — Build the abbreviation dataset independently from public domain and open-access sources.

**Rationale:**
1. Post-IceTV, the copyright position for Appendix A's alphabetical factual compilation is weak but not zero. Unnecessary risk.
2. The same factual data (report series names <> abbreviations) is freely available from multiple independent open-access sources: Cardiff Index (10,500+ titles, open access), Monash Legal Abbreviations (open access), Australian Government Style Manual (Commonwealth publication), court websites, and AustLII/LawCite.
3. Building from these sources means zero copyright dependency on MULR/MJIL, clean provenance for the GPLv3 project, and a richer dataset (Cardiff alone has 17,400+ abbreviations vs ~500 in Appendix A).
4. The dataset should include a source attribution field per entry so provenance is auditable.
5. Appendix B (court identifiers) and Appendix C (pinpoint abbreviations) should follow the same approach — these are standardised facts published on every court's own website and in government style guides.

**Implementation:** DATA-001-EXT story created to build full dataset from Cardiff Index + Monash + Style Manual + court websites, with source provenance field. Cross-validate against AGLC4 for completeness (verification, not copying).

---

## DECISION-002: AGLC5 Timing and Prioritisation

**Status:** RESOLVED
**Raised:** 2026-04-18 | **Resolved:** 2026-04-19
**Decision:** Do not pause current work. Create an AGLC5 epic on the backlog to implement the delta after the unknown release date.

**Implementation:** AGLC5 epic created with placeholder stories for delta implementation when AGLC5 is published.

---

## DECISION-003: AustLII API Access

**Status:** RESOLVED
**Raised:** 2026-04-18 | **Resolved:** 2026-04-19
**Decision:** Use AustLII's documented web development guidance at https://www.austlii.edu.au/techlib/webdev/ for integration.

**Implementation:** API-001-EXT story created to implement AustLII client using their documented guidance, replacing the stub.

---

## DECISION-004: Monetisation Model

**Status:** RESOLVED
**Raised:** 2026-04-18 | **Resolved:** 2026-04-19
**Decision:** Fully free and open source (GPLv3). Branding in the task pane panel and auto-added to the document. The branding can be removed or disabled through settings.

**Implementation:** BRAND-001 and BRAND-002 stories created for panel branding and document watermark.

---

## DECISION-005: Word for Web API Limitations

**Status:** RESOLVED
**Raised:** 2026-04-18 | **Resolved:** 2026-04-19
**Decision:** Word for Web is a SUPPORTED first-class platform, not a degraded one.

**Implementation Constraints:**
1. Use `Word.Document.customXmlParts` (WordApi 1.4), NEVER `Office.context.document.customXmlParts` (Common API). The Common API has confirmed bugs on Word for Web where custom XML parts are silently stripped.
2. Parse citation store XML client-side, not via XPath. `CustomXmlPart.query()` (XPath) is WordApiDesktop 1.3 only. Use `getXml()` + DOMParser instead.
3. One footnote operation per sync on Web. Do not batch multiple `insertFootnote()` calls without intermediate `context.sync()`.
4. Guard against footnote pane state. Catch and retry with user-friendly message if `GeneralException` thrown.

**Implementation:** INFRA-004-FIX story created to migrate store from Common API to WordApi 1.4 API.

---

## DECISION-006: GenAI Citation Source Type

**Status:** RESOLVED
**Raised:** 2026-04-18 | **Resolved:** 2026-04-19
**Decision:** Option 1 — Add a dedicated `genai_output` source type with auto-formatting per MULR interim guidance (Rule 7.12). Will be superseded by AGLC5 formal guidance when published.

**Implementation:** GENAI-001 story created to add the source type and formatter. AGLC5 epic includes a story to update/replace this when AGLC5 is published.

---

## DECISION-007: First Nations Materials — Consultation Required Before Implementation

**Status:** RESOLVED
**Raised:** 2026-04-18 | **Resolved:** 2026-04-18
**Decision:** No `indigenous.*` source types will be implemented until meaningful consultation with First Nations legal scholars and communities has taken place. Preliminary research has been completed (see `docs/research-first-nations.md`), but the source type identifiers, metadata fields, citation formats, and sensitivity handling proposed in that document are working drafts only and must not be treated as final designs.

**Rationale:**
1. Citation conventions for First Nations materials involve questions of cultural authority, community ownership, and self-determination that non-Indigenous developers are not positioned to resolve unilaterally.
2. Getting citation conventions wrong in this area risks causing real harm — misattributing communal knowledge, exposing culturally restricted materials, or imposing inappropriate Western citation frameworks on Indigenous knowledge systems.
3. Comparable projects (McGill Guide 9th ed, NZLSG for Waitangi Tribunal) developed their Indigenous citation rules in partnership with Indigenous scholars. Obiter should follow the same approach.
4. AIATSIS, Indigenous legal academics, the National Native Title Council, and NATSILS are potential consultation partners, to be approached respectfully and without assumption of participation.
5. Preliminary technical work (defining possible source types, identifying metadata fields, reviewing existing citation guidance) has been completed in RESEARCH-004 so that consultation can begin with a concrete proposal rather than a blank page.

**Implementation:** No implementation stories to be created until consultation is complete. When consultation partners are identified and engaged, a new epic will be created with stories shaped by that input.

---

## DECISION-008: Amending Legislation — Principal-Act Default vs Rule 3.8 Hybrid

**Status:** RESOLVED
**Raised:** 2026-06-25 | **Resolved:** 2026-06-25
**AGLC4 authority:** Note to Rule 3.1.2 (Year), p 68; Rule 3.8 (Legislative History: Enactments, Amendments, Repeals and Insertions), p 78.

**Question:** How should Obiter handle a provision whose history involves an amending Act — e.g. *Patents Act 1990* (Cth) s 7 and the *Intellectual Property Laws Amendment (Raising the Bar) Act 2012* (Cth)? Should the citation default to a hybrid "as amended by" / "amending" construction?

**Decision:** Single-Act citation is the default; the Rule 3.8 hybrid is a kept but opt-in exception. The author chooses the Act by the proposition the footnote supports — Obiter never auto-synthesises a hybrid.

The Note to Rule 3.1.2 is explicit: *"Citations to an Act refer to the Act as amended (and consolidated) … Generally, a principal Act rather than an amending Act should be cited (but see rule 3.8)."* Three authoring modes, selected by intent:

| Footnote's point | Citation | Mode |
|---|---|---|
| Current law (e.g. the s 7 thresholds) | `Patents Act 1990 (Cth) s 7` | (a) principal Act alone — **default** |
| The reform itself | `Intellectual Property Laws Amendment (Raising the Bar) Act 2012 (Cth)` | (b) amending Act alone |
| A provision *and* its history, in one footnote | Rule 3.8 hybrid (`… as amended by …` / `… amending …`) | (c) opt-in exception |

**Rationale:**
1. The principal Act already imports "as amended (and consolidated)", so a hybrid is redundant for mode (a) and beside the point for mode (b). For these the bare single-Act citation is correct.
2. AGLC4 nonetheless sanctions the hybrid for the narrow case where a single footnote needs a provision together with its history-source (Rule 3.8 examples, fns 61–68). That case is real, so mode (c) is retained as opt-in — not removed.
3. Modes (a) and (b) require **no new data model** — both are ordinary `legislation.statute` citations; the only "choice" is which Act the author enters. Mode (c) alone needs the `legislativeHistory` field (connector from the closed Rule 3.8 vocabulary + nested related Act).

**Non-goals (assert in tests):**
- Never auto-append "as amended by" / "amending", and never auto-promote a single-Act citation to a hybrid. The connector phrase is the author's explicit intent signal; absent it, none is synthesised.
- Rule 3.8 connectors are directional and **not interchangeable** (`as amended by`/`later amended by` ⇔ principal-lead; `amending` ⇔ amending-lead; likewise repeal/insertion).
- Parser: a known jurisdiction code anchors to the parenthetical **following the year**, not any parenthetical (amendment titles contain their own — `(Raising the Bar)`, `(No 2)`). Drop a leading "the" before a related Act title (AGLC4 examples omit it).

**Implementation:** Replace the `LEGISLATIVE_HISTORY_GUIDANCE` placeholder (`src/engine/rules/v4/domestic/legislation-supplementary.ts`) with a real `formatLegislativeHistory` for mode (c); default formatter path unchanged. Validator hint (not error) when a hybrid is used where the apparent point is current law, per the 3.1.2 Note. UI: opt-in collapsible "Legislative history (Rule 3.8)" section, off by default. Pin behaviour with engine tests keyed to AGLC4 fns 61–68 plus the worked `Patents Act` / `Raising the Bar Act` pair (single-Act default first, mode (c) second).
