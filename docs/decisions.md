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
