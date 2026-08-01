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

---

## DECISION-009: Accessibility — Focus-Ring Token and Type Floor

**Status:** RESOLVED
**Raised:** 2026-06-30 | **Resolved:** 2026-06-30
**Authority:** WCAG 2.2 — 1.4.11 Non-text Contrast (AA), 2.4.13 Focus Appearance (AAA), 1.4.4 Resize Text (AA). Style guide §2 (Colour), §3.4 (Type Scale), §5.4 (Borders & Dividers).

**Question:** The focus indicator and several UI literals fall below WCAG thresholds. (1) `*:focus-visible` used `--colour-accent` (Citation Teal `#2AA198`), which measures ~3.16:1 on Paper White — at the 3:1 floor with no margin, and the style guide's §9.1 claim of 4.6:1 is inaccurate. (2) Repeated `font-size: 10px`/`9px` literals sit below the smallest type token (`--text-xs` 11px). Fixing either touches brand tokens, which the style guide governs.

**Decision:** Introduce accessibility tokens rather than alter the brand accent. A new `--focus-ring` token maps to **Deep Teal `#238A83`** in light mode (~4.2:1 on Paper White) and **`#5ec4bc`** in dark mode (~8.9:1 on Deep Black) — both already brand colours (`--colour-accent-hover` / `--colour-accent-light`), so no new colour is introduced. Focus indicators consume `--focus-ring`, `--focus-ring-width` (2px) and `--focus-ring-offset` (2px). All sub-floor type literals route through a new `--text-min` token (= `--text-xs`, 11px); nothing renders below 11px. Target-size tokens `--target-min` (44px primary, 2.5.5 AAA) and `--target-min-aa` (24px floor, 2.5.8 AA) are added for the target-size pass.

**Rationale:**
1. Citation Teal remains the single brand accent; only the focus *ring* shifts one step to Deep Teal, which the style guide already defines for hover. No palette expansion.
2. Per-theme ring colour keeps the indicator well above 3:1 on every surface it can sit on, satisfying 2.4.13 with margin.
3. Routing literals through `--text-min` makes the 11px floor enforceable and keeps the "all CSS via tokens" rule intact.

**Non-goals (assert in review):** Do not change `--colour-accent` itself. Citation Teal as small body text on white (~3.16:1) is a separate, still-open question tracked under the website/contrast pass (A11Y-023) — flag, do not silently restyle.

**Implementation:** Tokens added to `src/ui/styles/global.css` and mirrored in the style guide §2/§12; focus-visible, skip-link, reduced-motion and forced-colors blocks updated. Stories A11Y-004, A11Y-011, A11Y-016 in `docs/progress.md`.

---

## DECISION-010: Accessibility — Named Styles with a Direct-Format Fallback (ATAG Part B)

**Status:** RESOLVED
**Raised:** 2026-06-30 | **Resolved:** 2026-06-30
**Authority:** ATAG 2.0 Part B; WCAG 1.3.1 Info and Relationships, 1.4.4 Resize Text, 1.4.12 Text Spacing.

**Question:** The block-quote ribbon action applied direct formatting (`font.size = 10; leftIndent = 36; lineSpacing = 12`) instead of the named `AGLC4 Block Quote` style that already exists. Direct formatting bakes in 10px and prevents a reader from restyling the document for readability. But the codebase deliberately layers direct formatting elsewhere (template.ts) "so it holds even if the style is missing or stripped (e.g. on Word for the web)". How should the conflict resolve?

**Decision:** Apply the named paragraph style first; keep direct formatting only as a fallback. The block-quote actions (`src/ui/App.tsx`, `src/commands/commands.ts`, `src/ui/views/Styling.tsx`) set `para.style = "AGLC4 Block Quote"` and only fall back to direct formatting when the named style cannot be applied (older API, or a runtime that strips styles). This makes the quote semantic and restylable on conformant runtimes while preserving the web-robustness the project relies on. The bibliography heading additionally carries an explicit outline level so it appears in Word's Navigation pane, and the AGLC4 template sets the document editing language to Australian English.

**Non-goals (assert in tests):** Do not remove the direct-format fallback entirely (Word for the web would lose the formatting). Do not convert bibliography entries to a Word list style (AGLC4 entries are hanging-indent paragraphs, not an enumerated list).

**Implementation:** Stories A11Y-018, A11Y-019, A11Y-020 in `docs/progress.md`; named-style-first block quote; `styles.ts` outline level on the bibliography heading (tested in `tests/word/bibliographyOutline.test.ts`); `template.ts` document language.

---

## DECISION-011: Jurisd Integration, a Source-Grounded Assistant, and a Token Portal

**Status:** OPEN — JURISD-001 review complete; recommendation below; awaiting owner go/no-go on the strategic calls.
**Raised:** 2026-06-30 | **Reviewed:** 2026-06-30
**Question:** Should Obiter integrate [jurisd](https://github.com/russellbrenner/jurisd) to offer a single source-grounded research/citation **assistant** (replacing the current discrete BYOK AI features), and — as a second, conditional step — introduce a hosted **token portal** with a free tier and a paid monthly subscription that replaces BYOK? This is a strategic shift with licensing, privacy, and funding implications, so it is logged for resolution rather than decided unilaterally.

**Context (to verify in JURISD-001):** jurisd is a local-first AU/NZ legal-research workbench — Apache-2.0 code (attribution/`NOTICE` required; one-way GPLv3-compatible), data modules CC-BY-4.0 with per-source restrictions, MCP server + DuckDB, AGLC4-aware, principle that "every claim traces back to the primary source." That principle aligns closely with Obiter's AGLC4 rigour, and the local-first design keeps research grounding on-device.

**Considerations:**
1. **Licensing** — Apache-2.0 allows both consuming jurisd via MCP and forking/porting, provided attribution and `NOTICE` are preserved and it is branded as jurisd with full credit. CC-BY-4.0 data with per-module restrictions must be honoured; restricted jurisdiction data must not be redistributed.
2. **Privacy posture** — Obiter currently advertises "no data collection; everything stays in your document," with BYOK. An LLM assistant sends queries off-device for inference; the pooled portal also introduces accounts and a backend. The assistant must be **opt-in** and disclosed, and the privacy policy + accessibility statement updated. (jurisd's local-first grounding limits, but does not remove, what leaves the device.)
3. **Funding model** — pooled subscription revenue would offset **free-tier token costs and hosting/development incidentals only** — not profit, not developer salaries. Obiter stays free and GPLv3. This non-profit framing must be transparent.
4. **Compliance** — Microsoft Commercial Marketplace policies for paid/subscription add-ins; abuse prevention and rate limiting; maintainer token-cost exposure; GPLv3 vs hosted backend (AGPL only if an integrated component requires server-source release — confirm none does).

**Review findings (JURISD-001, 2026-06-30):**

1. **Runtime mismatch is the deciding constraint.** jurisd is a **Node-only, local, stdio MCP server** (CLI; `npx -y github:russellbrenner/jurisd`), with DuckDB/parquet data modules downloaded to `~/.jurisd/modules/` from Hugging Face. **There is no HTTP server mode and no browser/WASM build.** Obiter's task pane runs in a Word **WebView** — no Node, no child process, no filesystem, no stdio. So Obiter **cannot bundle, fork, or directly talk to** jurisd in the pane. The "consume via MCP vs fork/port" question from the story is moot: neither runs in the add-in.
2. **The only viable architecture is a hosted backend.** jurisd ships Docker/k8s deploy files, so the realistic shape is: **host jurisd as a service**, wrap its MCP tools behind an HTTPS API + an LLM orchestrator, and make Obiter's pane the **chat client**. This means **JURISD-001 and JURISD-002 collapse into one initiative** — the hosted backend *is* the portal; you cannot have the assistant without the server-side infrastructure (auth, pooled tokens, hosting).
3. **MCP surface fits the assistant well** — 12 tools: live AustLII research (`search_cases`, `search_legislation`, `fetch_document_text`), AGLC4 (`format_citation`, `resolve_citation`, `cite`, `bibliography`), and offline local modules (`get_provision`, `get_act_structure`, `find_citing`, `semantic_search_local`, `list_data_modules`). A source-grounded assistant could replace Obiter's discrete classify/parse/suggest features with citation-traceable answers.
4. **Licensing — code is fine, data is the sharp edge.** Code is Apache-2.0 (host/modify/brand-as-jurisd with `NOTICE`/attribution; GPLv3-compatible one-way). Data is mixed: redistributable modules are CC-BY-4.0 (attribution at point of use), but several sources are **not redistributable** — **AustLII rows (restrictive ToS), and VIC/NT legislation (Crown copyright, no open licence)** — shipped recipe-only for the operator to build locally. **A hosted Obiter service that proxies AustLII's live-research tools at scale is a real ToS risk** and must be cleared before relying on `search_*`/`fetch_document_text`.
5. **Privacy — this fully inverts Obiter's current stance.** jurisd's local-first design does *not* help here, because Obiter can't run it locally; a hosted backend means queries (and possibly document text) leave the device for both jurisd and the LLM. Obiter currently advertises "nothing leaves your document / no collection / BYOK." The assistant must be **opt-in**, clearly disclosed, and the privacy policy + accessibility statement rewritten.
6. **AGLC4 duplication.** jurisd has its own AGLC4 formatting, but Obiter's engine is more complete. Use jurisd for **research/grounding**, keep Obiter's engine for **formatting** — don't replace it.

7. **Option C — a Microsoft 365 Copilot declarative agent (alternative to building our own assistant/portal).** As of 2026, **MCP support in M365 Copilot declarative agents is GA**; a declarative agent can call an **MCP server or a REST/OpenAPI** endpoint, **surfaces inside Word** (and Excel/Outlook/Teams), and can render interactive **MCP Apps** widgets in Copilot. Because jurisd already *is* an MCP server, an agent could call its tools natively in Word Copilot. This route **offloads the three hardest portal problems to Microsoft**: the LLM (Copilot provides it — no token pool, no BYOK), identity (Entra — solves "stay signed in"), and billing (the user's Copilot licence). The token-portal of JURISD-002 **largely evaporates** on this path.

**The document-mutation handoff exists (this resolves the earlier "who inserts the footnote?" gap).** Copilot's own agentic editing in Word (GA) covers body text, tables of contents (via heading styles), headers/footers/columns/margins, and track changes — but **not native AGLC4 footnotes**, and it would generate prose, not structured footnote objects + named styles. However, **"Combine Copilot Agents with Office Add-ins" (preview)** lets a **Word add-in be registered as a *skill*** in a Copilot agent, and *because add-ins use the Office JS Library to read/write the document, those operations become actions the agent can invoke.* So **Obiter's own "insert citation as a native footnote / update / refresh / apply AGLC4 style" operations can be exposed as Copilot-callable actions.** The full loop: **jurisd (research skill) → Copilot (orchestrator in Word, grounded by jurisd) → Obiter add-in (document-mutation skill) inserts/updates the native footnote precisely** — keeping Obiter's engine as the authority for footnote/style correctness rather than trusting the LLM to format.

**Catches:** (i) Copilot reaches a **remote** MCP/HTTP endpoint, so jurisd must still be **hosted** — the hosting cost, AustLII ToS, and VIC/NT restricted-data concerns from points 1, 4 carry over; (ii) it requires a **paid M365 Copilot licence**, so it serves only Copilot-licensed users (firms/courts/universities), **not** Obiter's free/student audience — it is an *additional* surface, not a replacement for the free experience; (iii) the add-in-as-skill bridge is **preview** (maturity/availability not guaranteed) and requires **designing/exposing** Obiter's functions as agent actions. A "complete experience" = **hosted jurisd (research) + Copilot (orchestration) + Obiter add-in registered as a Copilot skill (native-footnote/style mutation)**.

8. **Option C, recommended shape — two independent Copilot skills, clean ownership split.** Rather than Obiter building a hosted assistant/portal, split responsibilities: **(1) a jurisd Copilot skill** (built with the jurisd team's buy-in) that owns the hosted MCP server, authentication, and any token/subscription **billing** — jurisd's commercial layer; **(2) an independent Obiter Copilot skill** = the add-in registered as a Copilot skill, exposing only the document-mutation actions (insert/update/refresh native footnotes, apply AGLC4 styles) — **no backend, no accounts, no billing, Obiter stays free and document-only**; **(3) Copilot** provides the LLM, Entra identity, and orchestration. Copilot composes them: jurisd researches/grounds → Obiter inserts. **This makes JURISD-002 (Obiter's own token portal) unnecessary** — the pooling/BYOK-replacement problem becomes jurisd's, not Obiter's, and Obiter keeps its free/local/no-collection identity intact.
   - **Licensing boundary is load-bearing:** Obiter's engine is **GPLv3**; jurisd is **Apache-2.0**. *Embedding* Obiter's engine code inside the jurisd skill would make that combined distribution GPLv3 (copyleft propagates into jurisd's Apache-2.0 base). Keeping Obiter a **separate skill/endpoint that jurisd or Copilot *invokes*** is aggregation, not a derivative work — GPLv3 (unlike AGPL) does not cross a process/network boundary via invocation — so jurisd stays Apache-2.0 and Obiter stays GPLv3. **Prefer invocation over embedding** (confirm with a licence check).
   - **Dependency:** this is a **collaboration** — the jurisd skill, its MCP hosting, and its billing model are the jurisd maintainer's; align early. Still Copilot-licence-gated (an additional premium surface; free/no-Copilot users keep the plain add-in). Preview dependencies (add-in-as-skill, remote MCP) still apply.
   - **The parse/classify features are the best no-BYOK candidates, and need no jurisd.** "Help me choose" (source-type classification) and "Paste Citation" parsing are **pure LLM text transformations** — Copilot's own LLM does them, so they need no research backend/grounding. Flow: Copilot's LLM parses the description/citation into structured fields → calls the Obiter skill's action → Obiter's engine does the deterministic AGLC4 format + native-footnote insert. **This removes BYOK for those features on the Copilot path** (Copilot's licence covers the LLM). Obiter's existing AGLC4-tuned parse prompts (`classifySourceType`, `parseCitationText`) migrate into the agent instructions + the action schema (to keep extraction accurate). Because this needs no jurisd, it is a **smaller, self-contained deliverable** that can ship on the Obiter skill alone (Copilot licence + add-in; no hosted MCP, no AustLII/data concerns). **Open PoC question:** whether an Obiter action can *prefill the task-pane form* (preserving the current review-before-insert UX) or only *insert directly* (with Copilot confirmation / Word track-changes as the review) — driving the add-in's own pane UI from a skill action is not a guaranteed capability. Free/non-Copilot users keep BYOK unchanged.

**Recommendation:** The idea is strategically aligned (source-grounded = AGLC4 rigour) and **legally feasible** (Apache-2.0). The **recommended shape is Option C's two-skill split (point 8)**: it removes Obiter's need for a hosted assistant/backend/token-portal entirely (Obiter contributes only an independent document-mutation Copilot skill and stays free/local), and moves hosting/auth/billing to jurisd where it belongs. This makes **JURISD-002 largely moot** for Obiter. Remaining sign-offs are lighter but real: **(a)** confirm the licence boundary keeps Obiter's engine invoked, not embedded (GPLv3 vs Apache-2.0); **(b)** align with the **jurisd maintainer** on building/hosting/billing the jurisd skill; **(c)** accept the Copilot-licence gating (premium surface; free add-in unchanged). If "go", do a **small PoC spike**: stand up a minimal jurisd remote-MCP skill (host `legislation-cth` + 3-4 tools) and a minimal Obiter document-mutation skill (expose insert/refresh footnote actions), and prove the Copilot orchestration end-to-end (research → insert native footnote) in Word. A separate Obiter-built assistant/portal (points 2-7's A/B path) remains a *fallback* only for reaching non-Copilot users, and would reintroduce the privacy/hosting/funding sign-offs.

**Implementation:** JURISD-001 (review) is complete. **This decision stays OPEN pending owner go/no-go on (a)–(c) above.** JURISD-002 (now understood as the hosted backend + portal, inseparable from the assistant) proceeds only on a "go", and should begin with the PoC spike.

**Update (2026-07-01) — the independent Obiter document-mutation skill (point 8's skill (2)) has been built.** All eight `COPILOT` stories are now code + tested, not documentation: the skill declaration is generated from `OBITER_ACTIONS` (`buildCopilotSkillManifest`, `docs/obiter-copilot-skill.json`), the shared-runtime + skill manifest is staged in `manifest.skill.xml` (validated, not applied to the production `manifest.xml`), the review model is **direct insert**, and the no-BYOK parse/classify path reuses the BYOK prompts verbatim (`buildAgentInstructions`). The **invoked-not-embedded** GPLv3↔Apache-2.0 boundary is preserved — Obiter exposes actions a caller invokes; no jurisd/engine embedding. Still gated on the Office/Copilot **preview + a Copilot licence** to live-verify (sideload), and on sign-offs (a)–(c). This builds only Obiter's half; jurisd's hosted research skill and any billing remain the jurisd maintainer's and are unaffected.

---

## DECISION-012: Guide-Internal Contradictions — Rule Text Prevails Over Examples

**Status:** OPEN (default adopted; individual entries need researcher sign-off)
**Raised:** 2026-07-02

**Context:** Close reading of the full guide (see `docs/aglc4-parity.md` and the consolidated anomalies catalogue in the local `aglc4-rule-reference.md`) surfaced 64 internal anomalies: examples that violate their own rule (eg 9.2.7 example vs 9.2.6; 25.3.5 "NY Stat"/"c" vs the rule's "NY Laws"/"ch"), wrong cross-references (2.1.14→2.1.1 for 2.1.2; 17.2.1/17.2.2→25.1.1 for 26.1.1), example/table mismatches (2.3.1 "TASCC" vs table "TASSC"; 24.1.6 "DP" vs "DPSC"), and plain factual errors (25.1.8 "Assistant Justice"; wrong weekdays in 1.11.1/1.11.2 examples).

**Default adopted (pending sign-off):** where an AGLC4 example contradicts its own rule text or the guide's own table, the engine follows the **rule text / table**, and the anomaly is recorded. Rationale: rule text states the norm; examples are illustrations; several anomalies are self-evident misprints; the official Erratum (DATA-005) may resolve some authoritatively.

**Per-entry exceptions:** any anomaly where the example plausibly reflects the intended norm (rather than a misprint) must come back to this file as its own decision before the engine encodes the example's behaviour.

**Implementation:** PARITY epic reviews check each anomaly against the engine (did we accidentally encode a guide error learned from an example?); DATA-005 (Erratum) annotates resolved entries.

**2021-printing spot-check (2026-07-21):** Targeted pages of Matthew's 2021 printing were scanned (`aglc4-additional.pdf` / `aglc4-addition2.pdf`) and diffed against the anomalies catalogue (built from the 2020 corrected printing). Result — the "rule text/table prevails" default is vindicated:
- **24.1.6 "DP" vs "DPSC" — CORRECTED in 2021.** The example band that read 'Lord Hope DP' in the 2020 printing now reads 'Lord Hope **DPSC**' (printed p256), matching the table. The engine already emits DPSC (DECISION-012 default), so the guide has caught up to us; no change. This is the *only* substantive correction found across all sampled pages.
- **Persisting unchanged in 2021 (engine already correct/unaffected):** 2.3.1 'TASCC' worked example (printed p54, still 'TASCC' vs table 'TASSC'); 25.3.5 example 66 '1862 NY Stat 343' (printed p283, still contradicts the table's 'NY Laws'); 5.5 example 10 'Yale Journal of Law and the Humanities' (printed p93, still forces '&'→'and'); chapter-5 opener element table 'Pin-Point' (printed p91); and the 1.11.1/1.11.2 example weekday typos (printed p31). MULR's minor-corrections printings are very light — these self-evident misprints survived into 2021 — which supports treating them as durable anomalies rather than pending corrections.

---

## DECISION-013: Em-Dash Spacing — Engine Ban vs Guide's Own Usage

**Status:** RESOLVED (2026-07-03)
**Raised:** 2026-07-02 (PARITY review, review-data-styling.md)
Rule 1.6.3's text and the engine's `punctuation.ts` treat spaced em-dashes as an error, but the guide's own illustration (and its Part/heading typography, eg "Part I — General Rules") uses spaced em-dashes. Decide: keep the ban for citation text only, or allow spaced em-dashes in prose contexts. Until decided, the validator should not auto-fix prose em-dashes.
**Resolution (2026-07-03, Matthew):** Option: no validator opinion on em-dash spacing in prose; en-dash rules (1.6.3) enforced in citation elements only. The invented ban was already removed in PARITY wave 1 — no further code change.

## DECISION-014: Rule 5.5 — Ampersand in Journal Titles

**Status:** RESOLVED (2026-07-03)
**Raised:** 2026-07-02 (PARITY review, review-ch4-5.md; anomalies catalogue)
Rule 5.5 says journal titles appear "as on the title page" with two stated exceptions (leading 'The'; subtitles), yet its own example 10 silently converts '&' to 'and' and rejects the '&' form. The engine currently preserves '&' (follows the rule text per DECISION-012 default). Researchers to confirm: preserve '&', or encode the example's conversion as a third exception.
**Resolution (2026-07-03, Matthew):** Preserve '&' exactly as on the title page (rule text prevails per DECISION-012). Revisit only if the official Erratum (DATA-005) addresses example 10.

## DECISION-015: ACTR Authorised Status + Appendix-Dependent Data Rows

**Status:** RESOLVED (2026-07-20, DATA-004)
**Raised:** 2026-07-02 (PARITY review, review-data-styling.md)
The 2.2.2/2.2.3 in-chapter tables conflict on ACT Reports' status, and ~230 report-series/court-identifier rows plus several yearOrganised flags can only be authoritatively verified against Appendices A–B, which are absent from the free PDF. Resolve when the scanned appendices arrive (DATA-004); until then rows are tagged provisional and the engine keeps current behaviour. (Note: the formatter currently ranks ACTR unauthorised-generalist per the rule 2.2.2 table; researchers to confirm whether the 2.2.3 authorised listing 'ACTR (in ALR) 1973–2008' governs instead.)
**Held (2026-07-03, Matthew):** remains OPEN; interim behaviour stands pending DATA-004 / researcher pass.
**Resolution (2026-07-20, DATA-004):** The scanned `aglc4-appendix.pdf` settles it. Appendix A prints **two** ACTR rows — "Australian Capital Territory Reports **1973–2008**" with an asterisk (authorised/preferred — the authorised reports, in ALR) and "…**2009–**" with no marker. So ACT Reports are era-split: 1973–2008 authorised, 2009– unauthorised generalist. `report-series.ts` now carries both entries; the 2009– generalist entry is listed first so a year-agnostic `getByAbbreviation("ACTR")` returns the conservative generalist tier that matches rule 2.2.2's worked example, with the authorised historical series reachable for pre-2009 cases. The broader "~230 provisional rows" are addressed by importing Appendix A in full (see DATA-004): the complete ~1200-entry list lives in `appendix-a-series.ts` and is unioned into `ALL_REPORT_SERIES` for search/autocomplete/browse, while the curated `REPORT_SERIES` continues to drive the rule 2.2.2 hierarchy (DATA-004 found the scanned `*` markers under-captured, so absence of a marker was NOT used to downgrade curated authorised series).

## DECISION-016: Rule 1.8.3 — Macquarie-Dependent Latin/Foreign Terms

**Status:** OPEN
**Raised:** 2026-07-02 (PARITY wave 1, review-ch1.md HIGH-1 / review-data-styling.md A13)
Rule 1.8.3 italicises foreign words only if absent from the latest Macquarie Dictionary. `LATIN_TERMS_ITALICISED` (src/engine/data/latin-terms.ts) retains ~40 terms on neither of the rule's explicit lists (actus reus, certiorari, mens rea, mandamus, de novo, in camera, pro bono, pro rata, quasi, res judicata, sub judice, modus operandi, …), grouped and commented "provisional".
**Interim:** provisional rows kept italicised; the rule's own two lists are encoded verbatim. 'bona fides', 'dicta', 'dictum', 'obiter dicta' were placed in `LATIN_TERMS_EXCEPTIONS` by parity with the listed 'bona fide'/'obiter dictum'.
**Researchers:** verify each provisional term against the current Macquarie Dictionary; confirm the four exception-parity placements.

**Free-source proxy pass (2026-07-03, RESEARCH-009):** Macquarie online is fully paywalled (no public search teaser), so the provisional terms were assessed against free proxy sources — Merriam-Webster main dictionary (the most Macquarie-like signal), Collins, Cambridge, Dictionary.com, plus MW's legal-only dictionary and Wiktionary as auxiliaries. The proxy was **calibrated against the rule's own 36 labelled terms**: it reproduces the 29 Macquarie-listed terms at 25/29 with **zero false-italic**, but has an **irreducible false-roman floor** — `stare decisis` and `ex ante` are labelled italic (not in Macquarie) yet appear in all four general dictionaries, proving no free source can tell a legal-Latin term of art Macquarie lists from one it omits. This proxy therefore stays formally a proxy; Macquarie confirmation remains the closing step.

**Conservative application adopted (2026-07-03, Matthew):** only clear general-English borrowings with an MW main entry + strong conventional coverage + everyday non-legal currency were moved to `LATIN_TERMS_EXCEPTIONS` (10 terms): **ex officio, in situ, modus operandi, mutatis mutandis, pro bono, pro forma, pro rata, pro tempore, qua, quasi**. These are the class Macquarie (a general dictionary) is near-certain to list, and the class *least* exposed to the false-roman floor (which fell on legal terms of art). All legal-Latin terms of art were **kept italic pending Macquarie** — including ones the proxy would call roman (certiorari, mandamus, mens rea, res judicata, sub judice, corpus delicti, nolle prosequi, etc). De-italicising a term Macquarie may not list would violate the rule's default, so on a published product these stay italic until confirmed.

**Remaining for the Macquarie pass (priority order):** the 31 "Macquarie-pass priority" terms in `LATIN_TERMS_ITALICISED` group 2 (mainstream/legal-dictionary presence, kept italic) are the ones most likely to flip to roman — check these first (mens rea, actus reus, certiorari, mandamus, res judicata, sub judice, in rem, in personam, locus standi, inter vivos, in camera, in loco parentis, de novo, cy-pres … full list in code). The 14 group-3 terms (absent from free general dictionaries) are well-supported as italic and are low priority. Also confirm the 10 proxy-romanised terms are genuinely Macquarie-listed. Full per-term evidence tables: session scratchpad `research009/` (calibration.md + signals-g1..g4.md).

**Status remains OPEN** — proxy pass complete and evidence-backed, but formal closure needs the Macquarie check.

## DECISION-017: Rule 1.5.5 — Italicisation of [sic]

**Status:** RESOLVED (2026-07-03)
**Raised:** 2026-07-02 (PARITY wave 1, review-ch1.md)
AGLC4 (PDF p 44) is silent on whether 'sic' is italicised. The Styling.tsx Insert [sic] button italicises 'sic' with roman brackets.
**Interim:** italic 'sic', roman brackets.
**Researchers:** confirm against the printed guide / MULR house practice.
**Resolution (2026-07-03, Matthew):** Italic 'sic', roman brackets — matches MULR practice; current button behaviour confirmed.

## DECISION-018: Rule 1.2 — Lowercase Signals After a Colon

**Status:** RESOLVED (2026-07-03)
**Raised:** 2026-07-02 (PARITY wave 1, review-ch1.md)
Rule 1.2 shows signals lowercased when a citation follows a colon mid-sentence ('…: see generally at 198–205'). The engine always renders signals capitalised at the start of a citation.
**Interim:** capitalised signals only; the after-colon lowercase context is unsupported.
**Researchers:** confirm this is acceptable as a documented limitation, or specify the contexts in which the engine should offer a lowercase signal form.
**Resolution (2026-07-03, Matthew):** Accepted as a documented limitation: signals always render capitalised; the after-colon lowercase context is out of scope.

## DECISION-019: `book.ebook` [Platform] Format Is a Non-AGLC Extension

**Status:** RESOLVED (2026-07-03)
**Raised:** 2026-07-02 (PARITY wave 1, review-ch6-7.md)
AGLC4 rule 6.8 is Forthcoming Books; the guide has no ebook rule and the `[Platform]` bracket emitted by `book.ebook` is invented. Engine JSDoc was corrected in wave 2 to label it a non-AGLC extension; the coverage matrix mislabel is fixed by PARITY-120.
**Interim:** `book.ebook` retained as an explicitly non-AGLC convenience type.
**Researchers:** confirm keeping the extension (and its format) vs retiring the type in favour of rule 6.1–6.5 + URL.
**Resolution (2026-07-03, Matthew):** Retire the invented '[Platform]' bracket. Ebooks render as ordinary books (rules 6.1–6.5, + URL where relevant); the book.ebook type is retained as a UI convenience only. Implemented 2026-07-03.

## DECISION-020: Rule 7.10 — Example 79 Partial Date vs 'Full Date' Template

**Status:** RESOLVED (2026-07-03)
**Raised:** 2026-07-02 (PARITY wave 1, review-ch6-7.md)
The rule 7.10 template for constitutive documents requires `(at Full Date)`, but the guide's own ex 79 uses a partial date '(at September 2017)'.
**Interim:** per DECISION-012 the engine follows the template and passes the user's date string through unvalidated, so partial dates still render.
**Researchers:** confirm whether partial dates are permissible when that is all the source states.
**Resolution (2026-07-03, Matthew):** Partial dates are permitted where that is all the source states (guide's own ex 79). Engine passthrough confirmed; UI help copy notes full date preferred, partial accepted.

## DECISION-021: Rule 4.2 — Embedded Italics Inside Article Titles

**Status:** RESOLVED (2026-07-03)
**Raised:** 2026-07-02 (PARITY wave 1, review-ch4-5.md)
Rule 4.2 preserves italics inside secondary-source titles (eg a case name like *IceTV* within an article title). Titles are stored as plain strings, so embedded italics are unrepresentable end-to-end.
**Interim:** titles render entirely roman inside quotes (or entirely italic for books); embedded italics are lost.
**Researchers/design:** approve a title markup convention (and UI affordance) before the formatter layer can honour this.
**Resolution (2026-07-03, Matthew):** Title markup convention approved as a design story (PARITY-122 filed). Embedded italics remain unsupported until it lands; titles render in a single style.
**Implemented (2026-07-03, PARITY-122):** Minimal inline marker convention, parsed at format time only — no store schema change (titles remain plain strings). A pair of single asterisks marks an italic span (`Talking to *IceTV*: …`); `**` escapes a literal asterisk; unbalanced markers render the whole title exactly as typed (never crash, never eat characters). Parser: `src/engine/rules/v4/general/titleMarkup.ts`, hooked at the `formatSecondaryTitle` choke point (secondary/general.ts) and the quoted-title helper (secondary/other.ts). Marked spans render italic inside roman quoted titles (articles/chapters). Inside wholly italic titles (books) marked spans REMAIN italic: the roman-inversion variant was checked against the guide and rejected — rule 4.2 (PDF p.113) states "no part of the title should appear in roman font" where the Guide italicises the whole title, and rule 1.8.2 contains no within-italics inversion convention. Verified with exact-string tests on the guide's own ex 2 (*IceTV*, rule 5.2) and ex 26 (*Briginshaw*, rule 4.2); unmarked titles proven byte-for-byte unchanged across the full test corpus. UI editing affordance/help copy and resolver short-title (rule 4.3) support remain open — see PARITY-121/handoff.

## DECISION-022: Rule 21.1.3 — NZ Neutral-Citation Adoption Years (AGLC4 vs NZLII)

**Status:** RESOLVED (2026-07-23, CRIT-005 Part B.5)
**Raised:** 2026-07-02 (PARITY wave 1, review-data-styling.md)
`nz-court-identifiers.ts` `neutralCitationFrom` now holds the AGLC4 rule 21.1.3 years (NZSC 2005, NZCA 2007, NZHC 2012, NZEmpC 2010, NZEnvC 2010, NZFC 2012), which diverge from real-world NZLII adoption (eg NZHC 2003 on NZLII).
**Interim:** AGLC4 years govern per project policy.
**Researchers:** confirm AGLC4 years suffice, or approve a dual field (aglcFrom/nzliiFrom) for validator tolerance.
**Held (2026-07-03, Matthew):** remains OPEN; interim behaviour stands pending DATA-004 / researcher pass.
**Verified against the printed guide (2026-07-21):** rule 21.1.3 was scanned (2021 printing, printed p240). The court-identifier table reads exactly NZSC 2005–, NZCA 2007–, NZHC 2012–, NZEmpC 2010–, NZEnvC 2010–, NZFC 2012– — i.e. `nz-court-identifiers.ts` faithfully matches AGLC4. So the AGLC4-side is confirmed correct. The decision stayed OPEN only on the *design* question (whether to add an `nzliiFrom` field so the validator tolerates real-world NZLII neutral-citation years, which diverge from AGLC4); a scan of AGLC4 cannot resolve that, as the guide only ever states its own years.
**Resolution (2026-07-23, CRIT-005 Part B.5):** The real-world independent adoption years were verified to [high] confidence — NZSC 2005, NZCA 2007, NZHC 2012, NZEmpC 2010, NZEnvC 2010, NZFC 2012 (NZDC and the Māori Land/Appellate Court neutral-citation years were not established and remain flagged for narrow follow-up if ever needed). **Engine posture is unchanged:** AGLC4 rule 21.1.3's years continue to govern the validator; the real-world years are recorded as **reference metadata** (and as letter evidence of AGLC4-vs-practice divergence), not as a competing validation threshold. No dual `nzliiFrom` validation field is added — the divergence is documented, not enforced. The NZ dual-year reference table is recorded in `docs/aglc4-critique.md` §6. This closes the design question in the negative: document the divergence, do not tolerate it in the validator.

## DECISION-023: yearOrganised Flags — Series That Switched Systems (Appendix A)

**Status:** OPEN (blocked on DATA-004)
**Raised:** 2026-07-02 (PARITY wave 1, review-data-styling.md)
NSWLR and VR switched between year- and volume-organisation (both bracket forms appear in the guide's own illustrations), which a single `yearOrganised` boolean cannot represent. Tas R, ACTLR and ALJR have no in-chapter bracket evidence; the seven re-added historical series (SR (NSW), NSWR, St R Qd, SALR, Tas LR, Tas SR, VLR, WALR) are likewise provisional.
**Interim:** current single-boolean values kept, rows tagged provisional.
**Researchers:** verify against Appendix A when the scan arrives; decide whether a switch-year field is needed for NSWLR/VR.
**Held (2026-07-03, Matthew):** remains OPEN; interim behaviour stands pending DATA-004 / researcher pass.
**Update (2026-07-20, DATA-004):** The appendix scan has landed and coverage **years** are now imported (`ReportSeriesEntry.years`), which pins the switch points (eg NSWLR, VR). However Appendix A records only coverage spans, **not** whether a series is year- or volume-organised, so the core `yearOrganised` switch-year question is **not** resolved by the appendix — remains OPEN for a researcher/illustration pass. The single boolean still cannot represent series that switched systems.

## DECISION-024: Rule 3.1.4 — Plural of 'ord'

**Status:** OPEN
**Raised:** 2026-07-02 (PARITY wave 1, review-data-styling.md)
The rule 3.1.4 table gives only the singular 'ord' (order); no plural is stated anywhere in the chapter.
**Interim:** dataset uses 'ords' provisionally, by analogy with the table's other regular plurals.
**Researchers:** confirm 'ords' (or specify the correct plural) against Appendix C / MULR practice.
**Held (2026-07-03, Matthew):** remains OPEN; interim behaviour stands pending DATA-004 / researcher pass.
**Resolution (2026-07-20, DATA-004):** Appendix C (PDF p.332) prints the full row "Order | ord | Orders | ords", confirming the provisional plural **'ords'** is correct. No change to `pinpoint-abbrevs.ts` needed.

## DECISION-025: NZ Report-Series Duplicates and Typing (Appendix A)

**Status:** OPEN (blocked on DATA-004)
**Raised:** 2026-07-02 (PARITY wave 1, review-data-styling.md)
Duplicate NZAR and NZCPR rows were removed (surviving rows provisional); NZPC and NZPCC both claim 'New Zealand Privy Council Cases'; GLR's authorised typing has no in-chapter source.
**Interim:** survivors kept as-is, tagged provisional.
**Researchers:** verify survivors, resolve NZPC vs NZPCC, and source GLR's status against Appendix A / NZLSG.
**Held (2026-07-03, Matthew):** remains OPEN; interim behaviour stands pending DATA-004 / researcher pass.
**Update (2026-07-20, DATA-004):** Appendix A (which includes 37 NZ series) is now imported into `appendix-a-series.ts` and can be diffed against `nz-report-series.ts`. This narrows the question but does not fully close the NZ-specific items (NZPC vs NZPCC naming, GLR typing) — those remain for a targeted NZLSG researcher pass. Kept OPEN.

## DECISION-026: Bare 'Ex' Entry in uk-report-series.ts

**Status:** RESOLVED (2026-07-20, DATA-004)
**Raised:** 2026-07-02 (PARITY wave 1, review-data-styling.md)
A bare 'Ex' abbreviation appears in no AGLC4 table — the rule 24.1.2 forms are 'Ex D' and 'LR Ex'.
**Interim:** the row is kept but flagged likely wrong; nothing emits it on the AGLC4 path.
**Researchers:** confirm deletion (or identify the nominate series it was meant to represent).
**Held (2026-07-03, Matthew):** remains OPEN; interim behaviour stands pending DATA-004 / researcher pass.
**Resolution (2026-07-20, DATA-004):** Appendix A **does** list a bare "Ex" — "Exchequer Reports" (UK, 1847–56). So the abbreviation is a legitimate AGLC4 nominate series, not a fabrication; the `uk-report-series.ts` row is **kept** (fullName corrected to "Exchequer Reports"). The rule 24.1.2 in-chapter table simply doesn't enumerate the historical nominate reports that Appendix A does.

## DECISION-027: Rule 25.4 — US Constitution Article Numerals (Roman vs Arabic)

**Status:** RESOLVED (2026-07-03)
**Raised:** 2026-07-02 (PARITY wave 2, review-ch15-26.md)
Guide ex 75 uses Roman numerals ('art IV'); ex 77 uses Arabic ('art 1'); the rule text gives no guidance.
**Interim:** `usa.formatConstitution` passes the caller's numerals through unchanged.
**Researchers:** confirm passthrough, or state a normalisation rule.
**Resolution (2026-07-03, Matthew):** Numerals pass through unchanged; UI help copy recommends Roman numerals for US constitution articles/amendments (ex 77 treated as the anomaly).

## DECISION-028: Rule 20.1.1 — Pre-1966 MLJ Year Brackets

**Status:** RESOLVED (2026-07-03)
**Raised:** 2026-07-02 (PARITY wave 2, review-ch15-26.md)
The rule 20.1.1 note says MLJ was volume-organised until 1965 (which via 2.2.3–2.2.4 implies a round-bracket year), but the guide's own pre-1966 examples use square brackets ('[1964] 1 MLJ 399').
**Interim:** `malaysia.formatCase` follows the examples (square brackets) — a deliberate deviation from the DECISION-012 rule-text-wins default, because every illustration agrees against the note.
**Researchers:** confirm square brackets, or direct the note's round-bracket form.
**Resolution (2026-07-03, Matthew):** Square brackets confirmed for pre-1966 MLJ citations — the examples govern; the volume-organised note is in error. Existing formatter behaviour stands.

## DECISION-029: Rule 26.2 — Italics of Written-Out Foreign Report Series

**Status:** RESOLVED (2026-07-03)
**Raised:** 2026-07-02 (PARITY wave 2, review-ch15-26.md)
Rule 26.2 ex 12 italicises a written-out series title ('*Il Foro Italiano*…'), while rule 2.2.3 (the common-law limb) renders written-out series roman.
**Interim:** `formatOtherDecision` accepts `reportedIn` as `string | FormattedRun[]`, so the caller decides the styling; no default italicisation is applied.
**Researchers:** confirm which styling governs non-common-law series names, so a default can be encoded.
**Resolution (2026-07-03, Matthew):** Written-out non-common-law report series default to roman, consistent with rule 2.2.3; the FormattedRun[] caller override is retained for edge cases. Test pinned 2026-07-03.
## DECISION-030: Rule 26.4 — English Title-Casing of Non-English Titles

**Status:** RESOLVED (2026-07-21) — confirmed against the printed guide
**Raised:** 2026-07-03 (PARITY final mop-up, rule 26.4 implementation)
Rule 4.2 sends secondary-source title capitalisation to rule 1.7, whose minor-word list (articles/prepositions/conjunctions) is English. Applied to a non-English title it produces 'Der Reformvertrag Von Lissabon', but the guide's own rule 26.4 ex 21 (PDF p 321) prints '*Der Reformvertrag von Lissabon*' with the German preposition lowercase — foreign titles are evidently reproduced with their own language's capitalisation.
**Interim:** where a `translatedTitle` is stored (the signal that the title is non-English), `formatBook` renders the original title as typed (embedded-italic markers still honoured) instead of applying rule 1.7 title case; titles without a stored translation are unaffected. The newspaper and internet-material formatters never title-cased, so they need no carve-out.
**Researchers:** confirm the scope of rule 1.7 over non-English titles (reproduce-as-typed vs source-language convention vs English title case), and whether the carve-out should extend beyond the translated-title signal.
**Resolution (2026-07-21):** The rule 26.4 page was scanned from the printed guide (2021 printing, `aglc4-additional.pdf` / `aglc4-addition2.pdf`, printed p296). Example 21 reads exactly '*Der Reformvertrag von Lissabon* [The Reform Treaty of Lisbon] (Nomos, 2009) 181' — the German preposition **'von' is lowercase**, i.e. the guide reproduces the source language's own capitalisation rather than applying English (rule 1.7) title case. This confirms the interim carve-out is correct: non-English titles are rendered as typed. Behaviour is settled; the broader "scope of rule 1.7 over non-English titles" (whether to widen the carve-out beyond the translated-title signal) is left as a possible enhancement, not a blocker.

## DECISION-031: Queensland Reports — 'Qd R' vs 'QR' (2020 citation change)

**Status:** RESOLVED provisionally (2026-07-20, DATA-004) — flagged for researcher sign-off
**Raised:** 2026-07-20 (DATA-004 appendix import)
A prior PARITY correction removed a "QR" report-series entry as fabricated, on the basis that rule 2.2.3 gives the authorised Queensland series as "Qd R" (see the comment near the Qd R entry in `report-series.ts`). The AGLC4 Appendix A scan contradicts this: it prints **two** Queensland Reports rows — **"Qd R" (1958–Mar 2020)** and **"QR" (Apr 2020–)**, the latter asterisked (authorised) — recording the 2020 change of the Queensland Reports citation abbreviation.
**Resolution:** Trust the appendix (project policy: AGLC4 is the authority; Matthew's DATA-004 full-import direction). "QR" is a real authorised Queensland series from Apr 2020 and is present via `appendix-a-series.ts` (→ `ALL_REPORT_SERIES`); "Qd R" remains the authorised series for 1958–Mar 2020. The stale "QR is fabricated" comment in `report-series.ts` has been corrected and the `data-parity.test.ts` assertion updated.
**Researchers:** confirm the Apr 2020 changeover date and that both forms should be treated as authorised (this reverses the earlier call, so a sign-off is wanted). Consider whether the validator should nudge post-2020 Queensland citations toward "QR" and pre-2020 toward "Qd R".

## DECISION-032: Rule 2.3.1 — mncTo Identifier-Currency Check Not Implementable Without Guessed Data

**Status:** RESOLVED (2026-07-21, PARITY-121 A2) — check not implemented; no AGLC4-sourced data can back it under the current citation model
**Raised:** 2026-07-21 (PARITY-121 remainder, Part A2: the mncTo currency check previously BLOCKED on DATA-004)

**Field semantics (determined).** `mncTo` lives on `CourtIdentifier` (`src/engine/data/court-identifiers.ts`), not on `ReportSeriesEntry` — the PARITY-121 plan mislocated it in `report-series.ts`, whose only year field is the distinct Appendix A `years` coverage string. Per the interface doc, `mncTo` is the last year a medium neutral unique court identifier was current, where the rule 2.3.1 table (PDF pp 79-81) gives a closed range. Nothing reads it today; its sibling `mncFrom` drives `checkMncYearValidity` (validator.ts). The governing rules are 2.3.1 (identifier currency) and 2.2.2 (report-version preference) — not 2.2.3, which only tables series abbreviations.

**Why zero rows can be backfilled:**
1. **Appendix B prints no year data.** DATA-004 (2026-07-20) imported all 89 Appendix B identifiers and confirmed the appendix gives identifier + court name only (`docs/appendix-verification.md`). The original blocker ("every mncTo row is empty pending Appendix B") is resolved in the negative: the hoped-for data does not exist in the appendix.
2. **The only closed ranges in AGLC4 cannot fit the data model.** The rule 2.3.1 in-chapter table contains exactly two closed ranges, and both attach to the Full Court *usage* of an identifier whose first-instance usage is open-ended: FCA used by the Full Court 1999-2001 (FCAFC 2002-) and FamCA used by the Full Court 1998-2007 (FamCAFC 2008-). `court-identifiers.ts` models one row per code, so setting `mncTo: 2001` on FCA or `mncTo: 2007` on FamCA would falsely expire the identifier for post-boundary single-judge decisions, which continue to use FCA/FamCA. (The SASC/TASSC/WASCA "including Full Court until ..." notes are scope notes, not identifier expiries — those identifiers remain current.)
3. **The citation model carries no bench signal.** `case.unreported.mnc` citations store court code, year and judgment number only. A hypothetical `[2010] FamCA n` is indistinguishable between a valid first-instance decision and an invalid Full Court usage, so even correctly modelled ranges could not fire without guessing.
4. **Appendix A coverage years cannot substitute.** A series' `years` span is a publication window, not case-level reported status. Rule 2.2.2 prefers the authorised report only *where available*, which is a per-case fact; flagging every MNC citation inside an authorised series' coverage window would false-positive on every genuinely unreported decision. The scanned authorised markers are also under-captured (appendix-verification.md), so authorised status cannot be inferred from the appendix.

**Disposition:** no `checkMncCurrency` validator check, no backfill. The PARITY-121 mncTo item closes as *not data-backable* rather than blocked — no future AGLC4 appendix release will supply the missing values, because the guide itself contains none beyond the two Full Court ranges above.

**What would unblock a data-backed check:** (a) a per-citation bench/full-court field (UI form + store + engine data) plus usage-scoped identifier ranges transcribed from the rule 2.3.1 table (the two Full Court rows are the only mncTo values AGLC4 will ever source) — the court-identifiers restructure belongs to the series-data audit workstream; or (b) case-level reported-status lookup from an external service, which is outside AGLC4's scope and would be an enhancement-layer feature, not a rule check.

**Researchers:** none of the above turns on rule interpretation — the rule 2.3.1 table text is unambiguous. Sign-off wanted only on the product question of whether the bench-field remodel in (a) is worth pursuing for a check that could ever flag two courts.

## DECISION-033: Court PD Verification Queue (2026-07-21 refresh)

**Status:** RESOLVED (2026-07-22, CRIT-004) — three queued items verified against primary sources; factual/link corrections applied; interpretive preset refinements recorded for owner sign-off
**Raised:** 2026-07-21 (court-submission-mode data refresh against primary court sources)

**RESOLUTION (2026-07-22, CRIT-004 — see `docs/court-practices-review.md`):**
1. **NSW SC Gen 20** — current (page updated 26 Feb 2026); **issued 12 Sep 2023, commenced 1 Oct 2023** (not ~May 2023). The host `supremecourt.justice.nsw.gov.au` was retired (expired cert) → link updated to `supremecourt.nsw.gov.au` in `practiceDirections.ts` [applied]. SC Gen 20 does **not** itself mandate parallel citations or the Part A/B LOA (that is SC CA 1); it permits MNC paragraph pinpoints. Recommended (owner sign-off): soften NSWCA/NSWSC `parallelCitations` to "preferred" and re-source Part A/B to SC CA 1.
2. **Qld** — PD 1/2024 (commenced 29 Jan 2024) governs citation; PD 3/2013 governs the CoA Part A/B list and remains current. PD 1/2024 repeals **PD 16/2013**, not PD 3/2013 — the engine's two-PD split is correct. Parallel citation is "should, as far as possible" (not strictly mandatory since the 2024 relaxation); subsequent-treatment trigger is "doubted, or not followed" (para 4(c)). New: Qld PD 5/2025 AI-verification regime (Oct 2025).
3. **FCA GPN-AUTH** — reissue 7 May 2025 confirmed. Clause mapping corrected: **no "not reasonably obtainable" clause exists**; cl 2.4 = MNC + authorised report "if possible" + MNC paragraph pinpoints sufficient; cl 2.5 = examples; cl 2.6 = pinpoint preference; deadlines span cl 3.1/3.2/3.3 and 4.1. `courtReferenceGuide.ts` FCA entry corrected [applied].

The 2026-07-21 refresh updated presets, LOA structures, deadlines and reference-guide text for Vic (SC Gen 3 reissued 1 Dec 2025; SC CA 3 reissued 10 Mar 2026), FCA (GPN-AUTH reissued 7 May 2025), WA (Consolidated PDs updated 20 Jun 2025, PD 2.1 and PD 8.2.2), SA (UCR 2020 r 217.8, current to 15 Mar 2026), Tas (PD 3 of 2022), FCFCOA (FAM-APPEALS updated 10 Jun 2025), NT (PD 1 of 2025) and ACT (PD 2 of 2022). Those were verified against primary sources and their `practiceDirections.ts` entries carry `lastVerified: "2026-07-21"`. Three items could NOT be verified to the same standard and are queued here rather than guessed:

1. **NSW SC PN Gen 20 / PN CA 1 reissue currency.** Secondary sources suggest SC Gen 20 may have been touched around 1 May 2023, but only secondary sources were available — the NSW preset, guide text and `lastVerified: "2026-04-21"` are unchanged. Confirm at https://www.supremecourt.justice.nsw.gov.au/practice-and-procedure/practice-notes/practice-notes-sc-gen/sc-gen-20---citation-of-authority.html (and PN CA 1 for the NSWCA LOA deadlines).
2. **Qld CoA PD 3 of 2013 Part A/B detail.** The Part A/B LOA structure attributed to the Queensland Court of Appeal rests on a court-site search only; the QCA preset keeps `loaType: "part-ab"`. Confirm the current Court of Appeal practice direction detail at https://www.courts.qld.gov.au/court-users/practitioners/practice-directions.
3. **GPN-AUTH exact clause numbers.** The 7 May 2025 GPN-AUTH relaxations (authorised citation not required when not reasonably obtainable; MNC paragraph pinpoints sufficient) were read via a proxy fetch; the clause numbers believed to be 2.4-2.6 are not cited in code or guide text for that reason. Confirm against https://www.fedcourt.gov.au/law-and-practice/practice-documents/practice-notes/gpn-auth.

**Interim:** behaviour-affecting changes were made only where the primary source was read directly (see the change log in the 2026-07-21 commit). The three items above retain their previous behaviour and dates.

**Researchers/Matthew:** confirm the three URLs above and, if anything has moved, update `src/engine/court/practiceDirections.ts`, `src/engine/court/presets.ts` and `src/ui/data/courtReferenceGuide.ts` accordingly (each carries a PD-named comment at the relevant entry).

## DECISION-034: Australian Privacy Act (APP) Posture Review for Accounts

**Status:** OPEN — task for the user, not a resolved decision
**Raised:** 2026-07-22 (ACCT-007 — optional accounts ship holding personal information)

**Context:** The ACCT epic introduces optional user accounts that store personal information on the obiter.com.au host (`obiter.db`): email addresses, argon2id password hashes, AES-256-GCM-encrypted API keys and MFA secrets, synced settings, and an audit trail with one-way hashed IPs. This crosses a threshold that the prior BYOK-only, no-server-PII posture did not: Obiter now collects and holds personal information as an APP entity. privacy.html, terms.html, THREAT-MODEL.md and server-setup.md were updated in the same release (per the ACCT-007 guardrail), but a formal Australian Privacy Act / Australian Privacy Principles (APPs) posture review has not been done and is out of scope for an implementation story.

**Task for the user (not an engineering decision):** commission or self-conduct an APP posture review covering at least:
- **APP 1 (open and transparent management).** Is the privacy policy adequate as an APP privacy policy now that PII is collected? Is a clearly expressed, up-to-date policy published and easy to find?
- **APP 5 (notification of collection).** Are users notified, at or before collection (registration), of what is collected and why?
- **APP 6 (use or disclosure).** Confirm account data is used only for the stated purposes (auth, settings roaming, keyed relay) and not disclosed beyond the users own provider calls.
- **APP 11 (security of personal information).** Confirm the technical controls (argon2id, AES-256-GCM with out-of-band master key, hashed tokens/IPs, MFA, rate limits, lockout, audit) are reasonable steps, and that de-identified/anonymised deletion is sound.
- **APP 12 (access) and APP 13 (correction).** The self-service JSON export (access) and delete/anonymise (erasure) were shipped in ACCT-007; confirm they satisfy the access right, and decide how a correction request (e.g. email change) is handled.
- **Notifiable Data Breaches (NDB) readiness.** Determine whether the eligible-data-breach assessment and notification process is defined, given the credential database now in scope.

**Interim:** the policies and threat model are updated and accurate for the shipped feature; this entry records that a formal APP/NDB review is owed and assigns it to the user. It does not block the release under the ACCT-007 guardrails, which require accurate, re-dated policies (done) rather than a completed legal review.

## DECISION-035: Rule 14.3.2 — ECtHR reported-vs-application-number preference

**Status:** RESOLVED (2026-07-23, CRIT-005 Part B.5)
**Raised:** 2026-07-22 (CRIT-DEEP re-verification against PDF p.227)

**Context:** Rule 14.3.2 (European Court of Human Rights) sets out the reported form (report series) and the unreported form (application number), but where a decision is available in **both**, the rule states no explicit preference. Obiter defaults to the **reported form where a report series is present**, falling back to the application number otherwise.

**Decision (default):** prefer the reported form when a report series is available. This is a reasonable inference from AGLC4's general preference for authorised/reported citations (cf rule 2.2), but it is **not stated by rule 14.3.2** — the rule is silent/under-specified here.

**Researchers:** confirm whether AGLC4 intends the reported form to be preferred when both are available, or whether the choice is left to the author. If the latter, no engine change is needed; if a firm preference is intended, confirm it matches Obiter's default. Recorded in `docs/aglc4-critique.md` §6 (Ambiguities).

**Resolution (2026-07-23, CRIT-005 Part B.5):** External authority confirms Obiter's reported-preferred default. Both the ECtHR's own citation note (updated October 2022) and OSCOLA prefer the **reported form** where the case appears in the official *Reports of Judgments and Decisions* (the "ECHR" designation; the volume element was dropped from 2008), and use the **application-number-plus-date** form for unreported decisions; the application number is always carried as the stable identifier regardless. Obiter's default therefore rests on an external standard rather than on a bare inference from AGLC4's general reported-citation preference, so no engine change is needed — the reported-preferred behaviour stands and is now evidence-backed.
