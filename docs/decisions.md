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

---

## DECISION-036: Experimental-labelling policy for beyond-AGLC4 source types and fields

**Status:** RESOLVED (2026-08-01, AGLC5X / A5-LABEL — feedback package Part D.1)
**Raised:** 2026-08-01 (AGLC5X epic — hard prerequisite of every EXP-* story)

**Context:** The AGLC5X epic ships source types and fields that go **beyond official AGLC4** (generative-AI output, datasets, software/code, archived-web fields, an AI-layer marker). AGLC4 contains no rule for any of these; Obiter renders them on an interim basis by analogy or peer-standard precedent (MULR LibGuide, OSCOLA 5, APA/Chicago/AMS). The user's non-negotiable requirement is that every such item is **unmistakably** labelled as not an official AGLC4 form, and never counted as AGLC4 output.

**Decision:**

1. **Badge copy (exact, canonical).** Every experimental item carries the text
   **"Experimental · pending AGLC5 (not an official AGLC4 form)"** (exported as `EXPERIMENTAL_BADGE` from `src/engine/ruleExporter.ts`). No emoji, no exclamation marks (Obiter style guide). Each type also carries a short **interim-basis note** (`provenanceNote` on `SourceTypeMeta`) shown as the badge tooltip — eg genai_output: "MULR interim guidance by analogy to rule 7.12; OSCOLA 5 r 3.7.13 precedent".

2. **Machine value.** Source-type metadata carries `provenance: 'aglc4' | 'experimental_pending_aglc5'` (absent ⇒ `'aglc4'`/official). The badge is **data-driven** off this flag via `isExperimentalSourceType(sourceType)` — no per-type hardcoding in the UI. Rendered in the Insert type picker/form header and the Edit header; per-field experimental notes are shown for archive fields on the otherwise-AGLC4 `internet_material` and for the AI-layer marker preset.

3. **Conformance exclusion.** Experimental types are excluded from the AGLC4-conformance set via `getAglc4ConformanceSourceTypes()` (returns all metadata types minus the experimental ones), and therefore from the 302-item conformance count (A5-DOC-2) and any "AGLC4 output" website claim (A5-WEB-2). Enforced by `tests/engine/rule-exporter.test.ts`.

4. **Current experimental set.** `genai_output` (A5-EXP-1), `dataset` (A5-EXP-2), `software` (A5-EXP-3) as whole types; the archive fields on `internet_material` (A5-EXP-4) and the AI-layer marker over the commentary field (A5-EXP-5) as field-level extensions. All registered in `docs/obiter-extensions.md` §3/§4.

5. **Migration commitment (WS-1).** On AGLC5 publication each experimental item is **re-mapped to the AGLC5 rule or retired** per the WS-1 publication-day runbook, so existing user documents keep rendering (no stranding). The `provenance` flag is the switch: an item flipped to `'aglc4'` (or re-pointed at a v5 rule) leaves the badge and conformance exclusion behind automatically.

**Researchers:** none required — this is an Obiter product-labelling policy, not an AGLC4 interpretation. It will be revisited only when AGLC5 publishes rules for these sources.

---

## DECISION-037: Subsequent references to interviews, correspondence, speeches and free-text authors

**Status:** IMPLEMENTED AS DEFAULT (2026-09-07) — pending researcher confirmation
**Raised:** 2026-09-07 (field report: multi-author books shortened to the first surname only)

**Context:** Rule 1.4.1 gives the subsequent-reference form for authored secondary sources ('Author Surname (n X)') and for authorless sources ('Short Title (n X)'). Chapter 7 has no 'Short Title and Subsequent References' section (unlike chapters 3, 4 and 8–14), and the MULR *Summary of Changes* says only that rule 1.4.1 was broadened to apply to all source types. Interviews (rule 7.13, 'Interview with Name (Interviewer, Forum, Date)') and written correspondence (rule 7.12, 'Email from A to B, Date') have neither an author element nor a title element, so neither branch of rule 1.4.1 fits. Speeches (rule 7.3) place the speaker in the author position. Several chapter 7 forms capture the author as one free-text string, which the engine previously reproduced whole in the short form ('Jane Smith (n 3)').

**Research (deep-research run, 2026-09-07):** no official MULR/AGLC commentary, FAQ or errata addresses the point; nine university library guides restate rule 1.4.1 without an example. Edited practice was found in one journal: the UNSW Law Journal editing materials (as at 5 June 2023) prescribe r 7.13.1 'Interview with Last Name of Interviewee/s (n X) pinpoint' (example 'Interview with Petschler and Gergis (n 109) 5'), applied about sixty times in Freeburn and Ramsay (2021) 44(3) UNSWLJ 1142 ('Interview with O'Brien (n 109) 5–7', 'Interview with van de Pol (n 114) 2', 'Written Response from Sidhu (n 119) 2') and over eighty times in Schofield-Georgeson (2020) 43(4) UNSWLJ 1405 ('Interview with Anonymous 10 (n 56)'). Zheng (2023) 46(1) UNSWLJ keeps the sender's full name through a defined short title ('Email from Tim Soutphommasane (n 114)'). The community CSL AGLC4 style renders 'Interview with John Roberts (n 96)' (full name) and 'Email from Li to Jones (n X)'. No source repeats the full citation and none reduces an interview or email to a bare surname. Multi-author forms are confirmed by the guide itself (rule 4.1.2: 'Edelman and Bant (n 2) 260', 'Rishworth et al (n 3)'; rule 4.1.3: 'Birks (ed) (n 6)').

**Decision (default):**

1. **Interviews:** '«Interview|Conversation» with «Surname(s)» (n X) pinpoint'; several interviewees joined per rule 4.1.2; pseudonymous or organisational interviewees kept verbatim; positions and honorifics dropped.
2. **Correspondence:** '«Type» from «Sender surname» to «Recipient surname» (n X)'; date and positions dropped. The recipient is retained because it mirrors the rule 7.12 template and disambiguates a sender who wrote to several people. Dropping the recipient (both UNSWLJ articles) is an attested variant available through a user short title.
3. **Speeches:** speaker surname per rule 1.4.1 ('Heydon (n 41)').
4. **Free-text author fields:** personal names reduce to surnames and join per rule 4.1.2; body authors (rule 4.1.4) and anything that does not parse as a personal name stay verbatim. The same parser inverts the first author in the bibliography (rule 1.13).
5. A user-assigned short title (rule 1.4.4) replaces the generated lead for interviews and correspondence, rendered roman.

**Researchers:** confirm (a) the recipient is retained in correspondence short forms; (b) whether an honorific or judicial title survives in an interview lead ('Conversation with Chief Justice Roberts' versus 'Conversation with Roberts'); (c) whether MULR, MJIL or Sydney Law Review house practice differs from UNSWLJ; (d) whether AGLC5 adds a chapter 7 subsequent-reference section. The engine default is UNSWLJ practice generalised, not a demonstrated cross-journal consensus.

---

## DECISION-038: Bibliographic interchange (RIS, EndNote XML, BibTeX, CSL-JSON, Word Source Manager)

**Status:** RESOLVED (2026-09-12, INTEROP epic) — product decisions; no AGLC4 interpretation is at stake except item 5
**Raised:** 2026-09-12 (EndNote and library-catalogue users asked for RIS and EndNote import; export did not exist)

**Context:** Reference managers and library catalogues exchange RIS, EndNote XML, BibTeX and CSL-JSON. None of them models AGLC4's primary sources cleanly (a reporter is a "container title", a medium neutral citation has no slot), and all of them carry metadata AGLC4 never cites (DOI, ISBN, keywords, abstracts, attachment paths). Obiter previously read only BibTeX and Word's Source Manager and wrote nothing.

**Decisions:**

1. **One canonical record, one mapper.** Every format is a codec to and from `InterchangeRecord` (`src/api/interchange/model.ts`); a single mapper writes only the dispatch contract's primary keys so imported citations render and edit exactly like ones typed in. Records with no AGLC4 home become `custom` citations with a warning, never a fabricated web page.
2. **Passthrough bag.** Metadata Obiter does not cite is kept hidden under `data.interchange` so exports round-trip without loss. Attachment and local file paths are dropped; abstract and notes are capped at 8 KB per record with a preview warning. The bag is never read by the engine, the Edit form or the required-field check.
3. **Provenance travels with the record.** Exports carry the Obiter id and source type (RIS `AN`/`C8`, EndNote `accession-num`/`custom8`, CSL and BibTeX note lines) so a re-import recognises a round trip and offers Update existing instead of a duplicate. Duplicate detection otherwise uses DOI, ISBN, cite key, a legal signature (medium neutral citation, report citation, statute title with year and jurisdiction) and finally title, year and first surname.
4. **Formatted citation as a note.** Every exported record carries the AGLC-formatted full citation (`AGLC4 footnote: …`) so EndNote, Zotero and Mendeley users see the correct form even where their tool cannot rebuild it. AGLC-only fields (pinpoint, year bracket type, court identifier, judicial officers, parallel citations) are written as `obiter-<key>:` note lines and restored on a same-tool round trip.
5. **Formatted-text export order and pinpoints (AGLC4 rule 1.13 note).** The plain-text export lists full first-reference forms in the library's current sort, without pinpoints, because pinpoints belong to occurrences, not sources. Rule 1.13 bibliography ordering is the Bibliography view's job, not the export's. Researchers need not review this; it is a product boundary.
6. **EndNote XML writes the UTS AGLC4 reference-type names by default** (Case (Reported), Case (Medium Neutral), Statute, Parl. Debate and the rest of the 54-type table the UTS Library distributes), with a profile toggle for EndNote's generic names. The UTS names are what Australian law EndNote libraries actually contain.
7. **BibLaTeX convention for legal records.** Cases export as `@jurisdiction` (reporter in `journaltitle`, volume, pages, `court`), statutes as `@legislation` (`location` = jurisdiction), because BibTeX has no legal model of its own; Zotero's `@misc` with a citation in the note is recognised on import.
8. **Import is preview-first.** Detection, mapping, completeness and duplicate status are shown per row with a type override before anything is written; the commit is one persist. The BibTeX importer and Word Source Manager importer are shims over the same pipeline.

**Follow-ups recorded, not decided:** Word Source Manager export (writing back into Word's bibliography part); Zotero RDF; direct Zotero or Mendeley API integrations; a "Delete selected" bulk action on the library selection.


## DECISION-039: EndNote parity features: source access and AI disclosure

**Status:** RESOLVED (2026-09-13, ENP epic) — engineering and product decisions; researcher review is requested only for item 1's LawCite wording
**Raised:** 2026-09-13 (EndNote 2025 parity review identified seven features a task pane can match: tags, a duplicate sweep, a record details panel, update from source, cited-by, quoting from a PDF or judgment, and AI summarisation)

**Context:** Four of the seven features touch external sources or an LLM. AustLII's usage policy and Jade's terms prohibit automated access (DECISION-003, DECISION-011, and the legal headers on the link-only adapters), AustLII sits behind Cloudflare bot protection, and Obiter's privacy page promises that only text the user explicitly selects and submits is ever sent to an LLM. The stories must add the features without crossing those lines.

**Decisions:**

1. **AustLII and Jade remain link-only.** No Obiter code, in the pane or on the server, fetches a judgment or a citator page from either service. Cited-by for cases is a link to LawCite (`https://www.austlii.edu.au/cgi-bin/LawCite?cit=…`) and to Jade, opened in the user's browser. Researchers: confirm that a deep link into LawCite is within AustLII's stated usage policy for third-party tools; if not, the LawCite button is dropped and Jade alone remains.
2. **Quoting a judgment means pasting it.** The Quote panel accepts text the user copied from their browser (or extracted from a PDF they picked) and derives the pinpoint from paragraph markers in the passage. Obiter never retrieves the passage on the user's behalf. The unused server relay that fetched AustLII pages is removed or hardened (ENP-013).
3. **PDF text is extracted locally.** A bundled copy of pdf.js runs in the pane with its worker served from the app origin, satisfying the existing CSP (`worker-src 'self'`, no `blob:`, no CDN scripts). Text content only; no rendering, no upload, nothing stored in the document except the quoted text and pinpoint.
4. **AI summarisation stays inside the privacy promise.** Only text the user has loaded into the Quote panel and can see is sent, and only after a button that names the provider and the size of the payload. The privacy page and the Settings AI Assistant disclosure gain a matching bullet before the feature is enabled. The LLM proxy's body limit is raised for that route only; the promise that nothing is logged or retained is unchanged.
5. **Journal cited-by uses OpenAlex and Crossref.** Both are open data, already allowlisted, and already queried by existing adapters; the stories add fields the adapters currently drop. Attribution ("Data from OpenAlex (CC0)") is shown at the point of use.
6. **Provenance lives in the interchange bag.** A typeahead selection stamps `data.interchange.provenance` with the adapter id, source id, source URL and retrieval time (DECISION-038 item 3 extended). No new top-level citation fields; older documents show "no source on record" and derive links from the citation itself.
7. **Duplicate merging is field-level and reversible.** The sweep merges into a survivor the user chooses, field by field, after one store snapshot, and a "Not a duplicate" choice is remembered as a system tag so the pair is not offered again.

**Follow-ups recorded, not decided:** a corpus-derived citation graph for cases if the Open Australian Legal Corpus ever publishes one; the jurisd `find_citing` tool if that collaboration proceeds (DECISION-011 finding 3); streaming responses in the LLM client; Word Source Manager export.

**Implementation notes (2026-09-14, v1.17.0):** (a) The engine now honours `context.currentPinpoint` on a first occurrence and the occurrence title round-trips the pinpoint type (`[42]` paragraph, `s 5` section, bare number page), so a pinpoint typed in the library or the Quote panel survives Refresh All; legacy bare titles decode as pages. (b) A citing work added from the Cited by panel is linked with the phrase "citing", not "cited in": the engine renders `[this record], [phrase] [linked record]`, so "X, citing P" is the correct direction under Rule 1.3. (c) PDF text extraction uses pdf.js 4.10 bundled with the worker emitted from the app origin; the CSP is unchanged. (d) The LLM proxy accepts bodies up to 2 MB on that route only.

---

## DECISION-040: OSCOLA 5, NZLSG 3 and court mode: rule questions from the STD review

**Status:** OPEN — part (a) resolved from the guide texts and implemented; part (b) awaits researchers
**Raised:** 2026-09-22 (STD epic: Standards and Court Mode Review; the feature-matrix suite is the specification and every expectation it could not confirm is listed here)

**Sources consulted (all fetched 22 September 2026):**

- OSCOLA 5th edition (Faculty of Law, University of Oxford, 2026): https://www.law.ox.ac.uk/sites/default/files/2026-03/OSCOLA%205.pdf
- OSCOLA 5 Quick Reference Guide: https://www.law.ox.ac.uk/sites/default/files/2026-03/OSCOLA%205th%20Edition%20-%20Quick%20Reference%20Guide.pdf
- OSCOLA key changes, 4th to 5th edition: https://www.law.ox.ac.uk/sites/default/files/2026-04/OSCOLA%20key%20changes.pdf
- OSCOLA 4th edition (2012) with the 2006 international law supplement: https://www.law.ox.ac.uk/sites/default/files/2026-04/OSCOLA_4_IntLaw2006.pdf
- New Zealand Law Style Guide, 3rd edition (Law Foundation, 2019), HTML chapters 1–10 and Appendix 7: https://www.lawfoundation.org.nz/style-guide2019/
- AGLC4 (`../AGLC4-with-Bookmarks-1.pdf`) rule 1.5.1 for the quotation threshold and nesting.
- In repo: `docs/standards-rule-notes.md` (the derived notes and its "Unresolved" list), `tests/fixtures/standards/{oscola5,oscola4,nzlsg3}.ts` (`pending` rows), `tests/fixtures/standards/coverage.ts` ("unclassified, review" entries), the `test.todo("DECISION-040: …")` entries under `tests/standards` and `tests/ui/standards`, `src/engine/court/presets.ts`, `../obiter-multi-standard-backlog.md` (NZLSG-008), DECISION-022 and DECISION-025.

Nothing below transcribes guide text; section numbers are the guides' own. Fixture rows are cited as `fixture / scenario` from `tests/fixtures/standards/<table>.ts`.

### (a) Resolved in this epic from the guide texts

Each point was confirmed in the guide and is now what the engine does. No researcher action is needed unless a point is contested.

1. **AGLC4 r 1.5.1: block quotations begin at four lines; inner marks alternate.** A quotation of three lines or fewer stays inline in single marks with double marks for a quotation within it; from four lines it is set as a block with no outer marks and single marks inside. The quotation tools previously switched to the block form at three lines and did not alternate the inner marks. `src/engine/quotations/format.ts` now takes the document config (`blockQuoteThreshold`, `quotationMarkStyle`); `tests/engine/quotations/format.test.ts`.
2. **OSCOLA 5 removes `ibid` (§1.2.1, §1.2.3).** A later reference is the short identifier plus `(n X)` and the pinpoint, including in the footnote immediately following. `ibidEnabled: false` on the `oscola5` profile; OSCOLA 4 keeps lower-case `ibid` (§1.2.1 of the 4th edition).
3. **OSCOLA 5 paragraph pinpoints take no comma after a neutral citation (§2.1.6).** `[2008] UKHL 13, [2008] 1 AC 884 [42]`, not `…, [42]`. `src/engine/standards/pinpoints.ts`.
4. **OSCOLA 5 case names are italic including the `v` (§2.1.1).** The repo formatters had rendered a roman `v`. Confirmed from the PDF font runs.
5. **OSCOLA uses single quotation marks, double within (§1.5).** Both editions. `quotationMarkStyle: "single"`.
6. **NZLSG 3: block quotations at 30 words; double quotation marks, single within (§1.2.2(a)–(b)).** `blockQuoteThreshold: { words: 30 }`, `quotationMarkStyle: "double"`.
7. **NZLSG 3 general-style subsequent references (§2.3.1(a)).** Rule 1: when the source is obvious from context the footnote is the pinpoint alone, capitalised (`At 535.`; legislation `Section 8.`). Rule 2: identifier, `, above n X,` then the pinpoint (`R v Wang, above n 49, at 533.`; texts by surname `Spiller, above n 21, at 70.`); legislation by short title alone (`Securities Act, s 63.`). No `ibid`. `formatAboveNReference` in `src/engine/resolver.ts` is the single path.
8. **NZLSG 3 bibliography names are not inverted (Appendix 7 §V).** Entries follow the footnote form minus pinpoints, end with a full stop, and are ordered by the first author's surname while printing the name as written.
9. **Court mode applies to AGLC standards only (engine invariant).** `buildCourtConfig` ignores the court toggles unless the standard id starts with `aglc`; the Settings view shows the Writing mode control only under an AGLC standard and resets a document to academic mode when it switches to OSCOLA or NZLSG. This is a product boundary, not a rule reading: neither OSCOLA nor NZLSG has a court-submission variant and the presets cite Australian practice directions.

### (b) Pending for researchers

Each item is one distinct question. "Meanwhile" is what the engine renders today; a pending fixture row keeps that reading in `expected` and the runner reports it without failing. When an item is answered, update the row (or the test) and delete its `pending` or `test.todo`.

#### OSCOLA 5

0. **Generative AI, r 3.7.13 (resolved 2026-09-24, A5-EXP-13).** The engine now renders `AI, response to ‘prompt’, Developer (Date)` (pp 43–44). There is no URL and no model version, and ISO dates are converted. Three points remain judgement calls:
   - With no prompt, the rule's conditional element is dropped, giving `ChatGPT, OpenAI (16 July 2023)`. The rule does not show this form.
   - A later reference is the AI name plus `(n X)` (§1.2.1).
   - The bibliography entry repeats the footnote form under §1.7. The rule says nothing specific about either.

1. **Retrospective (pre-2001) neutral citations for foreign cases.** §1.1.1 and §2.1.3 bar retrospectively created MNCs for UK cases. §2.6.1 cites other jurisdictions "as at home" (no full stops). Does the bar reach an AustLII MNC such as `[1992] HCA 23`? Surfaces: `oscola5` `fx-mabo-reported / parallel`, `fx-mabo-mnc / first`, `first+paragraph`, `bibliography-entry`. Meanwhile: the stored MNC is rendered as in its home jurisdiction (`Mabo v Queensland [1992] HCA 23`). Reading: OSCOLA 5 §1.1.1, §2.1.3, §2.6.1; AGLC4 r 2.3.1. See NZLSG item 26 for the same question under NZLSG.
2. **Page pinpoint after an MNC and report with no bracketed court identifier** (rule notes Unresolved 1). §2.1.6 states the no-comma rule only for citations ending in a bracketed court identifier; OSCOLA 4 §2.1.6 put a comma before a page pinpoint that follows a report page. Did the 5th edition keep or drop that comma? Surfaces: `oscola5` `fx-uk-corr`, `fx-scot-axa`, `fx-ni-wilson` / `first+page`. Meanwhile: the OSCOLA 4 comma (`[2008] 1 AC 884, 42`). Reading: OSCOLA 5 §2.1.6 and §2.2.1; OSCOLA 4 §2.1.6.
3. **Irish paragraph pinpoints under §2.6.1.** Whether an Irish case takes `[2024] IESC 1 [42]` (E&W model) or `, para 42`. Surfaces: `oscola5` `fx-ie-langan / first+paragraph`. Meanwhile: `[42]` with no comma. Reading: OSCOLA 5 §2.6.1; the Irish courts' own practice direction on neutral citations; repo notes OSC-014.
4. **Waitangi Tribunal reports under OSCOLA.** OSCOLA has no form; the fixture applies §3.7.10 (other official documents by general principles). Is `Waitangi Tribunal, Ko Aotearoa Tēnei (Wai 262, 2011)` and the short form `Waitangi Tribunal (n 1)` right? Surfaces: `oscola5` `fx-wai-262 / first`, `first+page`, `subsequent-short`, `bibliography-entry`. Meanwhile: those forms. Reading: OSCOLA 5 §3.7.10, §3.1.1 (organisational authors), §1.2.1.
5. **Legislation short form with a page pinpoint.** §1.2.1 shows declared short forms only with a section (`SARAH, s 2`). Does a page pinpoint take the same comma (`HRA 1998, 42`)? Surfaces: `oscola5` `fx-uk-hra / subsequent-ibid+page`. Meanwhile: `HRA 1998, 42`. Reading: OSCOLA 5 §1.2.1, §2.4.2.
6. **Legislation with no declared short form** (Unresolved 2). §1.2.1 shows only the declared route. Is an undeclared Act repeated in full (OSCOLA 4 §1.2.1) or short-formed with `(n X)`? Surfaces: `tests/engine/standards-subsequent.test.ts` "legislation with no declared short form repeats the full citation"; `resolveOscolaSubsequent` in `src/engine/resolver.ts`. Meanwhile: the full citation is repeated (`Human Rights Act 1998, s 6`). Reading: OSCOLA 5 §1.2.1; OSCOLA 4 §1.2.1.
7. **Foreign Act: order of the jurisdiction bracket and the provision.** §2.6.2 shows a foreign Act with its jurisdiction but no section. Is it `Privacy Act 2020 (NZ) s 6` or `Privacy Act 2020, s 6 (NZ)`, and does the AGLC-style comma before `s` survive? Surfaces: `oscola5` `fx-nz-privacy-act / first+section`, `fx-nz-costs-regs / first+regulation`, `fx-cth-nta / first+section`. Meanwhile: jurisdiction, declared short form, then the provision with no comma (`Native Title Act 1993 (Cth) (‘Native Title Act’) s 6`). Reading: OSCOLA 5 §2.6.2, §2.4.2, §4.1.1 (no comma after a closing bracket).
8. **Bibliography entries for chapters: are editors' names inverted?** §1.7 inverts the author (`Gardner J, …`); the example set has no chapter. Surfaces: `oscola5` `fx-chapter-gardner / bibliography-entry`. Meanwhile: author inverted, editors as printed. Reading: OSCOLA 5 §1.7, §3.2.4.
9. **Hansard short form.** §1.2.1 offers no short form for Hansard. Does a later footnote repeat the full citation or use `(n X)`? Surfaces: `oscola5` `fx-hansard-uk-hc / subsequent-short`. Meanwhile: the full citation is repeated. Reading: OSCOLA 5 §1.2.1, §3.7.8.
10. **Pinpoint to an operative paragraph of a UN resolution.** §4.2.2 shows none. Is it `para 2` after the declared short form? Surfaces: `oscola5` `fx-un-res-1373 / first+paragraph`. Meanwhile: `(‘SC Res 1373’) para 2`. Reading: OSCOLA 5 §4.2.2, §3.1.3.
11. **Australian Law Reform Commission reports.** §3.7.11 covers the UK, Scottish and NI commissions only. Form, official-citation element and short form for an ALRC report under OSCOLA (`Australian Law Reform Commission, Title (ALRC Report 99, 2004)`; `Australian Law Reform Commission (n 1)`). Surfaces: `oscola5` `fx-alrc-99 / first`, `subsequent-short`, `bibliography-entry`. Meanwhile: those forms. Reading: OSCOLA 5 §3.7.11, §3.7.10, §2.6; AGLC4 r 7.1. See NZLSG item 33 for the NZLSG side.
12. **NZ Law Commission reports.** Does an NZ report keep its home form (`Law Commission Title (NZLC R123, 2011)`) or take `Law Commission (NZ), Title (NZLC R123, 2011)`? Surfaces: `oscola5` `fx-nzlc-r123 / first`, `first+page`, `bibliography-entry`. Meanwhile: the `(NZ)` form. Reading: OSCOLA 5 §3.7.11, §2.6.
13. **Styling of a bare party short form** (Unresolved 3). `Phelps (n 14)` and `Austin (n 1) [34]` appear italic in the PDF layout but the text extraction discards styling. Is a single-party short form italic? Surfaces: no fixture row asserts italics (`tests/fixtures/standards/README.md`); `resolveOscolaSubsequent`. Meanwhile: the case-name element of a short form is italic. Reading: OSCOLA 5 §2.1.2, §1.2.1; the quick reference guide.
14. **Hansard written answers and `PBC Deb (Bill n)`** (Unresolved 4). OSCOLA 4 §3.4.2 gave `col 505W`, `col WA261` and the Public Bill Committee alternative; §3.7.8 of the 5th edition omits them without withdrawing them. Surfaces: no fixture (the Hansard fixture is a debate); `formatOscolaHansard`. Meanwhile: the 5th-edition forms only. Reading: OSCOLA 5 §3.7.8; OSCOLA 4 §3.4.2.
15. **Session ranges in select committee citations** (Unresolved 5). §3.7.8 shows `(HC 2008–2009, 151–I)` while §1.3.2 prescribes `1925–27`-style ranges and the joint committee example uses `(2009–10, …)`. Surfaces: no fixture yet; `formatOscolaParliamentaryReport`. Meanwhile: the session is printed as entered. Reading: OSCOLA 5 §1.3.2, §3.7.8.
16. **Platform name for X** (Unresolved 6). §3.7.1 labels an X post `(Twitter, …)` and refers to "X (previously known as Twitter)". Should posts after the rename carry `X`? Surfaces: no fixture; `formatOscolaSocialMedia`. Meanwhile: the platform name is printed as entered. Reading: OSCOLA 5 §3.7.1.
17. **Appendix abbreviations (§5.2) not extracted** (Unresolved 7). Journal, report and case-name abbreviation lists were not fetched; fixtures use abbreviations from the body examples only. Surfaces: none; `src/engine/data/uk-report-series.ts` and the journal abbreviation table. Meanwhile: the existing AGLC and repo tables. Reading: OSCOLA 5 §5.2 (all lists).
18. **Second reference to one source within one footnote.** `Corr (n 1) [50]` or a combined list `Corr (n 1) [42], [50]`? Surfaces: `tests/standards/refresh.test.ts` todo. Meanwhile: the `(n X)` form is repeated with the current pinpoint. Reading: OSCOLA 5 §1.2.1, §1.1.4.
19. **Validator: neutral citation without the best report.** §2.1.3 requires the best report after an MNC where the case has been reported. What data would let the validator know that an MNC-only record has been reported? Surfaces: `tests/standards/validator.test.ts` todo (line 480). Meanwhile: no "missing report" warning. Reading: OSCOLA 5 §2.1.3, §2.1.4.
20. **Validator: MNC adoption year for the High Court.** §2.1.3 dates MNCs to 2001 for HL, PC, CA and the Administrative Court and 2002 for the other High Court divisions. Should a `[2001] EWHC (Ch)` citation be flagged? Surfaces: `tests/standards/validator.test.ts` todo (line 614). Meanwhile: a single 2001 threshold. Reading: OSCOLA 5 §2.1.3, §5.1.
21. **Export note for a case: Table of Cases form or footnote form.** The interchange export writes the formatted citation as a note; under OSCOLA a case has two forms (§1.6.2 table entry, roman; §2.1 footnote form). Surfaces: `tests/integration/interchange-standards.test.ts` todo (line 411). Meanwhile: the footnote form. Reading: OSCOLA 5 §1.6.2, §2.1.1; DECISION-038 item 4.

#### OSCOLA 4

22. **Cases from other jurisdictions (§2.8) not extracted.** The OSCOLA 4 foreign-case and Irish forms are taken from OSCOLA 5 §2.6.1 and the repo OSC-014 notes. Surfaces: `oscola4` `fx-ie-langan / first`, `fx-mabo-reported / first`. Meanwhile: the OSCOLA 5 forms. Reading: OSCOLA 4 §2.8.
23. **Access date when none is stored.** §3.4.8 requires `accessed <date>` after a URL; the fixture carries a persistent link and no access date (the OSCOLA 5 rule makes one unnecessary). What should the OSCOLA 4 profile render: nothing, the current date, or a validation warning? Surfaces: `oscola4` `fx-web-cyclefree / first`; `src/engine/rules/v4/secondary/other-media.ts` (STD-016 note). Meanwhile: the fixture expects `accessed <today>`; the engine emits no access date. Reading: OSCOLA 4 §3.4.8; OSCOLA 5 §3.7.1.
24. **Treaty article pinpoint with no declared short form.** The 2006 supplement §1 shows article pinpoints only after a bracketed short title. Is a comma required before `art` when no short form precedes it? Surfaces: `oscola4` `fx-treaty-rome / first+article`. Meanwhile: `(Rome Statute) art 7` (no comma after the bracket). Reading: OSCOLA 4 international law supplement §1.
25. **CJEU case with only an ECLI stored.** §2.6.2 cites the ECR (or the OJ notice, or court and date when unreported); the ECLI form is OSCOLA 5's. Surfaces: `oscola4` `fx-cjeu-hellenic / first`. Meanwhile: the fixture's `[2018] ECR I-0` placeholder marks the gap; the engine renders the OSCOLA 5 ECLI form. Reading: OSCOLA 4 §2.6.2; OSCOLA 5 §4.4.2.

#### NZLSG 3

26. **AustLII retrospective neutral citations.** §8.2.3 says retrospective AustLII neutral citations should not be used. For an MNC-only record of a 1992 High Court case, should the engine render the stored MNC, fall back to the report, or raise a validation warning? Surfaces: `nzlsg3` `fx-mabo-mnc / first`, `first+paragraph`. Meanwhile: the stored MNC (`Mabo v Queensland [1992] HCA 23 at [42]`). Reading: NZLSG 3 §8.2.3, §3.2.2; pairs with OSCOLA item 1.
27. **Bibliography placement of Waitangi Tribunal reports and Māori Land Court decisions** (Unresolved 9). Appendix 7 does not say whether they go under Cases or Reports, and the lettered headings (`A Cases`, `B Legislation`, `C Books and Chapters in Books`, `D Journal Articles`) depend on the answer. Surfaces: `nzlsg3` `fx-mlc-pacey / bibliography-entry`, `fx-wai-262 / bibliography-entry`; `tests/standards/bibliography.test.ts` (lettered headings, `test.failing`); `tests/integration/interchange-standards.test.ts` todo (line 408). Meanwhile: Waitangi Tribunal material sits in its own group after Legislation; Māori Land Court decisions sit under Cases; headings are unlettered. Reading: NZLSG 3 Appendix 7 §V, §3.5, §3.6.
28. **Institutional author as the subsequent-reference identifier.** §2.3.1(a)(iii) short-forms texts by author surname; whether an institutional author (`Waitangi Tribunal`, `Law Commission`) or the report title is the identifier is not exemplified. Surfaces: `nzlsg3` `fx-wai-262 / subsequent-short+page`, `fx-nzlc-r123 / subsequent-short+page`. Meanwhile: the institution (`Law Commission, above n 1, at 42`). Reading: NZLSG 3 §2.3.1(a)(iii), §5.2.3, §3.6.
29. **UK statutory instruments** (Unresolved 12). §9.4 (foreign legislation) was not read; whether `(UK)` is appended and the SI number given is unconfirmed. Surfaces: `nzlsg3` `fx-uk-si-russia / first`. Meanwhile: title, year, `(UK)`, no SI number. Reading: NZLSG 3 §9.4, §4.1.1(a)–(c).
30. **Thesis type capitalisation.** §6.7.1 exemplifies only `LLB (Hons) Dissertation`; `DPhil Thesis` versus `DPhil thesis` is unconfirmed. Surfaces: `nzlsg3` `fx-thesis-herberg / first`, `bibliography-entry`. Meanwhile: `(DPhil Thesis, University of Oxford, 1989)`. Reading: NZLSG 3 §6.7.1.
31. **Australian Hansard.** §5.1.1 gives NZPD and UK (GBPD) forms only. Surfaces: `nzlsg3` `fx-hansard-cth / first`. Meanwhile: the NZPD pattern applied to the Australian chamber (`(12 March 2020) Commonwealth Parliamentary Debates House of Representatives 2345`). Reading: NZLSG 3 §5.1.1, §9.
32. **Subsequent references to treaties and UN materials.** §2.3.1 has no example for either. Is `Rome Statute, above n 1, art 7` and `SC Res 1373, above n 1` right, or is the full citation repeated? Surfaces: `nzlsg3` `fx-treaty-rome / subsequent-short+article`, `fx-un-res-1373 / subsequent-short`. Meanwhile: the `above n` form with the declared short title. Reading: NZLSG 3 §2.3.1, §10.1.1, §10.4.
33. **ALRC report official citation.** §5.4 exemplifies NZ and UK reports only; `(ALRC R99, 2004)` versus `(Report 99, 2004)`. Surfaces: `nzlsg3` `fx-alrc-99 / first`. Meanwhile: `(ALRC R99, 2004)`. Reading: NZLSG 3 §5.4, §5.2.3; pairs with OSCOLA item 11.
34. **Commercial style: NZLSG-008 versus §2.3.1(b).** The backlog story NZLSG-008 (and the shipped `Citation style` control) describes commercial style as the short form only (author or short title plus pinpoint, no `above n`, no ibid) with a validator warning for `(n X)` in that style. The online 3rd edition §2.3.1(b) describes commercial style as the full citation on every reference for cases and legislation, with other sources in the general style. Which is right, where does the NZLSG-008 reading come from, and should the `(n X)` check be conditioned on the style at all? Surfaces: `formatNzlsgCommercialReference` in `src/engine/resolver.ts`; `tests/standards/validator.test.ts` todo (line 717); Settings "Citation style". Meanwhile: the NZLSG-008 short form (`Butler and Butler at 134`; `Securities Act, s 63`), stored per document as `nzlsgStyle`. Reading: NZLSG 3 §2.3.1(b), §2.1.1; the NZ commercial publishers' house styles the guide refers to.
35. **Commercial-style pinpoints in repeated full citations** (Unresolved 11). If §2.3.1(b) is confirmed (item 34), does the current footnote's `at` pinpoint replace or follow the first citation's pinpoint? Surfaces: no row until item 34 is settled. Meanwhile: not rendered. Reading: NZLSG 3 §2.3.1(b), §3.2.8.
36. **Page pinpoint with a paragraph sub-pinpoint.** §3.2.8 gives no form for `at 6 [23]`. Surfaces: `tests/standards/pinpoints.test.ts` todo (line 196). Meanwhile: `at 6 [23]`. Reading: NZLSG 3 §3.2.8, §6.1.8.
37. **Second reference to one source within one footnote.** Repeat `, above n 1, at [50]` (rule 2) or the rule 1 pinpoint-only form? Surfaces: `tests/standards/refresh.test.ts` todo (line 444); `resolveNzlsgSubsequent`. Meanwhile: rule 2. Reading: NZLSG 3 §2.3.1(a), §2.2.4(a).
38. **Long quotation starting at a numbered paragraph.** §1.2.2(a)(ii): the quotation keeps its `[41]` and the footnote omits the pinpoint. The Quote panel strips the marker and pinpoints instead. Surfaces: `tests/ui/standards/Quote.standards.test.tsx` todo. Meanwhile: marker stripped, pinpoint in the footnote. Reading: NZLSG 3 §1.2.2(a)(ii).
39. **Long quotation: introducing colon and footnote-marker position.** §1.2.2(a)(ii) and §2.2.2 introduce a long quotation with a colon and put the marker directly after it; the panel places the footnote after the quotation. Should the engine or the inserter supply the colon and move the marker? Surfaces: `tests/ui/standards/Quote.standards.test.tsx` todo; `tests/standards/quotations.test.ts` todo (line 257). Meanwhile: footnote after the quotation. Reading: NZLSG 3 §1.2.2(a)(ii), §2.2.2.
40. **Short quotation: marker after the closing mark and punctuation.** OSCOLA 5 §1.5 and NZLSG 3 §1.2.2(a)(i) both place the footnote marker last; whether the inserter's cursor placement satisfies this needs a Word-side check on Windows and web. Surfaces: `tests/ui/standards/Quote.standards.test.tsx` todo. Meanwhile: the marker is inserted at the cursor after the inserted text. Reading: OSCOLA 5 §1.5; NZLSG 3 §1.2.2(a)(i), §2.2.2.
41. **Validator rule id for double quotation marks.** The validator reports the NZLSG double-marks check as `NZLSG 1.1.2` (punctuation); the rule notes place the quotation-marks rule at §1.2.2(a)(i). Two tests contradict; the id is left as it was until the spec settles it. Surfaces: `tests/standards/validator.test.ts` `test.failing` (line 1116). Meanwhile: `NZLSG 1.1.2`. Reading: NZLSG 3 §1.1.2, §1.2.2(a)(i).
42. **Online video and non-Twitter social media** (Unresolved 8). §7.1.8 covers podcasts (including video podcasts) and §7.1.10 covers Twitter only. Surfaces: no fixture; `formatNZBroadcast`, `formatNZSocialMedia`. Meanwhile: the general §7.1.1 internet form. Reading: NZLSG 3 §7.1.1, §7.1.8, §7.1.10.
43. **Institutional authors beginning with "New Zealand" in the bibliography** (Unresolved 10). Appendix 7 drops "the" from an institution's name; ordering of names beginning "New Zealand" was not exemplified. Surfaces: no fixture; `generateNzlsgBibliography`. Meanwhile: sorted on the full name. Reading: NZLSG 3 Appendix 7 §V.
44. **Quotation marks inside titles** (Unresolved 14). §6.4.3 and §7.1.3 make marks within a quoted title single; whether a title quoted inside an italic book title (no outer marks) keeps double marks is not addressed. Surfaces: no fixture; `wrapTitle` (STD-016). Meanwhile: single marks inside any title. Reading: NZLSG 3 §6.1.3, §6.4.3, §7.1.3.
45. **Chapters not read in full** (Unresolved 13). NZLSG 3 §6.3, §6.5, §6.6 (online commentaries, looseleafs, encyclopaedias), §8 and §9 (foreign cases and legislation, beyond the incidental examples); OSCOLA 5 §4.2.4–4.2.6, §4.3.2–4.3.4, §4.3.6, §4.5. No fixture asserts a form for those source types until they are read. Surfaces: coverage entries in item 46. Reading: those sections.

#### Coverage: source types left on the AGLC4 form

46. **"unclassified, review" source types** (`tests/fixtures/standards/coverage.ts`; rendered in `docs/standards-coverage.md`). Each renders the AGLC4 form because the guide text does not settle its treatment. For each, researchers are asked whether the standard has a form (then a formatter is written and the entry becomes `native`) or the AGLC4 form is acceptable (then the entry becomes `fallthrough-ok` with the reason).
    - OSCOLA 5 (15): `case.unreported.no_mnc`, `case.arbitration`, `legislation.bill`, `legislation.explanatory`, `report.royal_commission`, `ip_material`, `constitutive_document`, `treaty.mou`, `un.charter`, `un.communication`, `un.yearbook`, `icj.pleading`, `arbitral.state_state`, `arbitral.individual_state`, `gatt.document`. Reading: OSCOLA 5 §2.1.4 (unreported without MNC), §2.4.4–2.4.5 (explanatory notes, bills), §3.7.10, §4.1–4.3.
    - NZLSG 3 (21): `case.unreported.no_mnc`, `legislation.explanatory`, `report.royal_commission`, `ip_material`, `constitutive_document`, `treaty.mou`, `un.charter`, `un.communication`, `un.yearbook`, `icj.pleading`, `arbitral.state_state`, `arbitral.individual_state`, `icc_tribunal.case`, `wto.document`, `wto.decision`, `gatt.document`, `eu.official_journal`, `eu.court`, `echr.decision`, `supranational.decision`, `supranational.document`. Reading: NZLSG 3 §3.4 (unreported), §4.2.2 (explanatory notes), §5.4, §10.2–10.5 (the EU, ECtHR and ICTY forms in the rule notes were read but no NZLSG formatter exists yet; confirm the forms before wiring).

#### Court mode and product questions (no rule authority; owner's call)

47. **Authorised-report hierarchy for tribunals.** The read-only field shows the preset's series in order; the three tribunal presets have no series and the field is empty. Should it show the "MNC only" fallback the field already defines? Surfaces: `tests/ui/standards/Settings.standards.test.tsx` todo (line 500). Meanwhile: empty.
48. **Insert menu and ibid suppression.** Whether the Insert as menu in the library should hide Ibid when the preset's `ibidSuppression` is on (every preset today). Surfaces: `tests/ui/standards/CitationLibrary.standards.test.tsx` todo (line 304). Meanwhile: Ibid is offered and the refresher renders the short form.
49. **Synced standard on sign-in.** Should a synced `standardId` seed the device default (and so a document with no explicit standard), or stay per device? The plan (STD-011, STD-022) specifies the push only. Surfaces: `tests/ui/standards/SettingsSync.standards.test.tsx` todo (line 540). Meanwhile: pulled, never written to the open document.
50. **Synced court toggles on sign-in.** Should synced `courtToggles` and `courtJurisdiction` ever apply to the open document, or only to the next document that enters court mode? Surfaces: `SettingsSync.standards.test.tsx` todo (line 543). Meanwhile: only the LLM configuration is applied on pull.
51. **Previous-version rows in the active standard.** Should a previous-version row in Record details show that version's rendering in the active standard (it lists changed fields only)? Surfaces: `tests/ui/standards/RecordDetails.standards.test.tsx` todo (line 241). Meanwhile: changed fields only.

**Related:** DECISION-022 and DECISION-025 (NZ neutral-citation adoption years and report-series typing) are unchanged by the online text: §3.3 lists the adoption years the engine already uses and Appendix 7 does not type report series.

---

## DECISION-041: Generative AI developer, recipient and prompt note; September 2026 watch corrections

**Status:** DECIDED. Researcher items (a)–(c) were resolved on 24 September 2026 (see "Resolution" at the end of this entry). Revisit when MULR publishes its own text or AGLC5 publishes a rule.
**Raised:** 2026-09-24 (A5-EXP-6, A5-EXP-7, A5-EXP-8, A5-CM-4, A5-WS-2; evidence in `docs/aglc5-watch-2026-09.md`)

**Context:** AGLC4 has no generative AI rule. Obiter's `genai_output` (A5-EXP-1) cites AI output by analogy to rule 7.12 (written correspondence). Rule 7.12 lets a correspondent's position follow their name (derived notes, `../aglc4-rule-reference.md` §7.12, PDF p 150) but says nothing about software or vendors. The September 2026 watch found two interim sources that go further than Obiter did:

- UQ Library's AGLC4 guide (page updated 14 July 2026) gives the template "Output from [program], [creator] to [recipient], [full date]", with examples naming both the vendor and a person as recipient. It also recommends recording the prompt in the footnote or an appendix.
- OSCOLA 5 r 3.7.13 names the developing organisation and puts the prompt in quotation marks.

**Decision:**

1. **Developer (A5-EXP-6).** Optional. It follows the platform and model and precedes the recipient, with a comma before it and none after, matching the UQ template: `Correspondence from ChatGPT (GPT-5), OpenAI to the author, 7 July 2026`. Obiter keeps "Correspondence" as the type rather than UQ's "Output", so citations already in documents are unchanged. Under OSCOLA the field fills the formatter's existing provider slot.
2. **Recipient (A5-EXP-7).** Optional. When blank it renders "the author", which was the only form before.
3. **Prompt note (A5-EXP-8).** Opt-in (`includePrompt`) and off by default. The note follows the citation, any URL and the archive note: `… 7 July 2026. The output was generated in response to the prompt ‘…’`. It appears in the first citation only and never in a subsequent reference or the bibliography, because it is commentary rather than an element of the source. Obiter does not convert quotation marks inside the prompt; the user edits the prompt text if rule 1.5.1 nesting is needed.
4. **Labelling.** All three fields sit on the experimental `genai_output` type (DECISION-036). The badge, the conformance exclusion and the WS-1 migration commitment apply unchanged.

**Corrections and contradictions recorded by the watch (2026-09-24):**

- **The Committee's aims are no longer published.** The live AGLC5 page (meta last-modified 12 May 2026) now speaks of "consultations for a prospective new edition". The `aglc-5@unimelb.edu.au` address and the list of aims have been removed. The last capture showing them is the Wayback Machine's of 24 March 2025, which lists **seven** aims; the commonly cited six omit a practice-oriented aim to encourage use by practitioners. The rewrite cannot be dated, so it must not be described as post-July 2026 news, and it must not be read as abandonment. Cite the aims to the dated capture as withdrawn from the live page.
- **The open letter's correspondence channel.** The Committee lists no contact and says it is not accepting feedback, so the runbook's statement that the correspondence window remains open is withdrawn.
- **OSCOLA licensing.** The claim that OSCOLA is published under a Creative Commons licence was refuted (1–2), and the 85-page PDF has no licence statement. OSCOLA supports an open-access argument (a free full text alongside the Hart print edition), not a permissive-reuse argument.
- **The Federal Court's GPN-AI citation.** The source is `…/practice-notes/gpn-ai`, not the notice-to-profession page. GPN-AI (16 April 2026) and NSW SC Gen 23 (January 2025) have not changed and are not new.
- **Court instruments are not citation rules.** The FCA, NSW and ART instruments impose verification and disclosure duties on the responsible person and prescribe no citation form. They stay in court mode (A5-CM-1, A5-CM-4) and are not AGLC4 defects.
- **Refuted claims not to reuse:** a source-traceability rule in the ART practice direction; a metadata model for expert AI use in NSW SC Gen 23; the UQ page as "confirming" the analogy in the wording tested.

**Researchers:**

- (a) Does rule 7.12's allowance for a position after a name support a vendor in that slot, and should a comma follow it?
- (b) Should the AGLC form adopt UQ's "Output from" type in place of "Correspondence from"?
- (c) The OSCOLA 5 formatter (`src/engine/rules/oscola/genai.ts`) renders `ChatGPT (OpenAI), ‘prompt’ (response generated date)`. The r 3.7.13 example in `docs/standards-rule-notes.md` §3.7.13 orders the elements as tool, `response to ‘prompt’`, developer, then the date in brackets. This belongs with DECISION-040 and is unchanged here.

**Resolution (2026-09-24; deep-research run `wf_1081fbee-c21`: 18 sources fetched, 25 claims checked, 24 confirmed, 1 refuted):**

Library guides checked live on 24 September 2026. They copy the UQ template, so they show one convention repeated, not independent authorities:

| Guide | Template or example (short) | Updated |
|---|---|---|
| UQ Library, https://guides.library.uq.edu.au/referencing/AGLC4/artificial-intelligence | Output from [program], [creator] to [recipient], [full date] | 14 Jul 2026 (not re-verified in this run) |
| Macquarie, https://libguides.mq.edu.au/AGLC4_referencing/acknowledge_ref_AI | Output from ChatGPT, OpenAI to Fred Jones, … | 29 Jul 2026 |
| UWA, https://guides.library.uwa.edu.au/AGLC4/Gen_AI | Output from ChatGPT, OpenAI to Jane Smith, …; optional URL; credits MULR editors | 26 Aug 2026 |
| Adelaide University, https://au.libguides.com/referencing/ai | Output from ChatGPT, OpenAI to Jane Smith, … | 21 Sep 2026 |
| Southern Cross, https://libguides.scu.edu.au/aglc/AITools | Output from Copilot, Microsoft to John Smith, …; footnote only | 24 Sep 2026 |
| Deakin, https://deakin.libguides.com/legal-referencing/citing-generative-AI | Output from ChatGPT, OpenAI to John Smith, … | 3 Feb 2026 |
| Murdoch, https://libguides.murdoch.edu.au/AGLC/generativeAI | Output from *Copilot*, Microsoft to Fred Jones, …; credits MULR and MJIL, "not official AGLC policy" | 28 Aug 2026 |

- **(a) Punctuation. Decided: library practice.** The developer follows the program after a comma, and no comma comes before "to". Every template above does this. AGLC4 r 7.12 (p 125) gives no punctuation for a position after a name. The only descriptor example, ex 95 (p 126), inserts a place with commas on both sides. It is recorded here as a counter-analogy and not followed (owner decision).
- **(b) Wording. Decided: "Output from" (A5-EXP-9).** Every guide uses it. None uses "Correspondence from". **Correction (25 Sep 2026, run `wf_569120e9-30f`, 3–0):** the University of Melbourne Re:cite AGLC page *does* give the same template, "Output from [program], [creator] to [recipient], [full date]". Its bibliography example is "OpenAI, ChatGPT to John Smith, Output, 23 February 2023". This was read from the Wayback capture of 1 June 2026, because the live page returns 403. The earlier statement that it gives no template was wrong. The earlier claim that it supports the "correspondence" wording stays refuted. MULR's own text was still not found. The owner chose a document setting (`genaiWording`) that keeps "Correspondence from" for documents that need it. Stored citations are unchanged.
- **(c) OSCOLA. Decided: r 3.7.13 as printed (A5-EXP-13).** The form is `ChatGPT, response to ‘…’, OpenAI (16 July 2023)` (pp 43–44). There is no URL and no model version. See DECISION-040.
- **Follow-ups decided with the owner:**
  - Short form (A5-EXP-10): `Output from ChatGPT (n 1)`, extending item 2 of DECISION-037. A recipient's surname is added only when a recipient is named.
  - Bibliography (A5-EXP-11): listed under Other in the four-guide form, `OpenAI, ChatGPT (GPT-5) to the author, Output, 7 July 2026`. Southern Cross's footnote-only rule was not followed.
  - Prompt note (A5-EXP-12): takes the comma the guides use, "…to the prompt, ‘…’".
- **Minority practices not adopted:**
  - Murdoch italicises the program name, and uses "Report from" for report-type output (for example Scopus AI).
  - Southern Cross puts the tool version in an appendix.
- **Gap-closing run (25 Sep 2026, `wf_569120e9-30f`):**
  - **More guides follow the footnote form.**
    - UQ (re-verified, updated 25 Sep 2026): `Output from ChatGPT, OpenAI to Fred Jones, 24 February 2025`.
    - QUT CiteWrite, https://www.citewrite.qut.edu.au/cite/examples/legal/legal_internet_ai.html (undated): same form. Its short form is `Output from ChatGPT (n 208)`, which matches A5-EXP-10.
    - Griffith (Wayback, Jan 2026): same form.
    - ANU, https://libguides.anu.edu.au/c.php?g=960102&p=6969607 (updated 25 Sep 2026): same form.
    - None of their examples includes a model. Obiter already renders the model only when one is recorded.
  - **One outlier.** Canberra, https://canberra.libguides.com/c.php?g=599301&p=6951694 (2 Sep 2026), uses a request-type, site and time form with no developer. It is not adopted.
  - **Bibliography practice varies.**
    - UQ, ANU and Re:cite match A5-EXP-11 (`Microsoft, Copilot to Fred Jones, Output, 24 February 2025`).
    - QUT writes `Open AI, Output from ChatGPT to John Smith, …`.
    - Griffith says no entry is needed.
    - A5-EXP-11 is kept: it is the majority form.
  - **MULR's own text:** not found. Every trace is a library paraphrase. Re:cite even misnames the journal. Credit the form as library guidance relaying MULR editors' interim advice, never as an MULR or AGLC rule.
  - **Journals:** no Australian law journal footnote citing a specific AI output was found.
    - Hargreaves [2025] LER 4 cites ChatGPT only as a product.
    - The Legal Education Review AI policy (endorsed by the Australasian Law Academics Association (ALAA), 28 Apr 2025) requires disclosure in the first footnote but gives no citation form.
  - **New Zealand:**
    - Auckland, https://auckland.libguides.com/nzlsg/generative-ai (14 Jul 2026): NZLSG 3 gives no AI guidance.
    - Canterbury, https://canterbury.libguides.com/laws/referencing (21 Sep 2026): adapts NZLSG r 7.6, e.g. `Output from ChatGPT (artificial intelligence chatbot by OpenAI) to Name in response to the prompt … (Date)`. This is a candidate NZLSG form (A5-EXP-16, owner decision).
  - **Not verified:**
    - 21 Australian guides: Monash, UNSW, Sydney, RMIT, UTS, La Trobe and others.
    - VUW, Otago, Waikato and AUT.
    - The NZ Law Foundation.

## DECISION-042: Publisher words, organisation as web page author, and ibid after another citation (LCT review)

**Status:** OPEN (awaits researchers)
**Raised:** 2026-09-27 (LCT-011; evidence in `docs/research/legal-citation-tool-review.md` §2.6 and §3 row 11)

These three points came up when comparing legal-citation-tool's normalisation rules with Obiter's. In each case the derived rule reference (`../aglc4-rule-reference.md`) doesn't settle the point, so Obiter doesn't change its behaviour until a researcher decides. Nothing below transcribes the guide.

**(a) Publisher names, r 6.3.1.**
- **What the rule says (derived notes):** drop corporate-status abbreviations ("Pty", "Ltd", "Co", etc) from publisher names, and *generally* drop geographic designations such as "Australia".
- **What Obiter does:** drops `Pty`, `Ltd`, `Co`, `Inc` and a leading `The` (`src/engine/rules/v4/secondary/authors.ts`, `books.ts`). It keeps spelled-out `Limited` and `Company`, and keeps `Australia`.
- **Question:**
  - Does the "abbreviations … etc" wording cover the spelled-out words?
  - How strictly does "generally" apply to geographic designations?

**(b) An organisation as the author of a web page, r 7.15.**
- **What the rule says (derived notes):** give an author only when the page itself indicates one. One of the guide's examples puts a body in the title position rather than as author.
- **What Obiter does:** renders whatever the user enters as author (`High Court of Australia, 'Current Justices' (Web Page) <…>`).
- **Question:** should Obiter warn when a body is entered as the author of a web page, or leave the choice with the user? A keyword heuristic like the other tool's was judged too guessy to adopt.

**(c) Ibid after another citation in the same footnote, r 1.4.3.**
- **What the rule says (derived notes):** ibid is capitalised only when it opens a footnote. The notes don't say whether ibid may refer back to the last source of the *previous* footnote when another citation comes before it in the current footnote (`Smith (n 1); ibid`).
- **What Obiter does:** Obiter emits the ibid. LCT-003 will lower-case it mid-footnote either way.
- **Question:** is ibid permitted in that position, or must a short reference be used instead?

**(d) A particle in a phrasal verb in a title, r 1.7.** (Added 2026-09-27 from a user test.)
- **What the rule says (derived notes):** capitalise every word of a title except articles, conjunctions and prepositions. "In" is one of the rule's examples of a preposition.
- **What Obiter does:** Obiter lowercases every listed word. So *Getting to Yes: Negotiating Agreement without Giving in* comes out with a lower-case "in". Here "in" belongs to the verb "give in", not a preposition.
- **Question:** should a particle that is part of a phrasal verb keep its capital ("Giving In")? Or does the word list apply regardless of grammar? A lower-case "without" is correct under the rule, even though the book's cover capitalises it.

## DECISION-043: Court interoperability (COURT epic, October 2026 research)

**Status:** PARTLY DECIDED (owner, 6 and 7 Oct 2026). Items 1–4 and 8 are decided, with owner follow-ups of 7 Oct 2026; items 5–7 and 9–14 are open.
**Raised:** 2026-10-06. The evidence is in `docs/research/court-interop/` (EVIDENCE-REGISTER.md, STORY-PLAN.md, R01–R08).

**Decided:**

1. **Document metadata (COURT-102).** Obiter writes only `Obiter.Version` and the document's actual citation standard. It never writes a person's name: an `Obiter.Author` property already in a document is removed the next time the document is opened. `Obiter.CreatedDate` is set once and never overwritten.
2. **Ibid in court mode (Q2).** Keep the current court-mode ibid suppression unchanged. No instrument read mentions ibid, so the research records it as an Obiter preference, but the owner chose to keep the behaviour and its labels as they are. (The toggle label was later shortened to "Ibid suppression"; see the owner follow-ups below.)
3. **Parallel-citation order (Q1, Q3).**
   - Where a court's instrument is silent, or only gives an example, the preset follows that court's own example.
     - MNC first: FCA (GPN-AUTH), Tasmania (PD 3/2014), WA and AIJA.
     - Report first: where observed practice shows it (NSW judgments).
     - Report first: otherwise, as now.
   - Each default records its source.
4. **Existing documents (Q5).** Corrected presets apply to new documents. An existing court-mode document keeps its current behaviour until the user accepts a per-document "Update court profile" prompt that shows what will change.
8. **Automatic AGLC4 styles (decided 7 Oct 2026).** Keep creating missing AGLC4 styles, create-only, on new blank academic documents. The setting stays on by default. Restyling on pane open stays removed (COURT-101).

**Owner follow-ups (7 Oct 2026):**

- **Para-only pinpoint fix waits for the prompt (COURT-110, item 4).** The corrected AGLC4 r 2.2.5 form (the report's starting page is kept with a paragraph pinpoint) applies to new documents. An existing court-mode document that used para-only keeps its earlier output until the user accepts the "Update court profile" prompt, which lists the change in plain words.
- **Track Changes: ask before managed writes (COURT-108).** Refresh All, the refresh after an insert or edit, and a refresh started by a Settings change ask first while Track Changes is on, where Word can report it (WordApi 1.4). The in-pane prompt explains the refresh will appear as tracked revisions and offers "Refresh anyway (as tracked changes)" or "Skip for now". Where the setting cannot be read, refresh behaves as before.
- **Ibid toggle label (COURT-107, item 2).** The court toggle is labelled "Ibid suppression". `(n X)` has had its own toggle since COURT-107. Behaviour is unchanged.
- **Metadata removal sticks (COURT-122, item 1).** A property the user removes in Prepare for handover stays removed. The choice is recorded in the document's own Obiter store, so it travels with the file. `Obiter.Author` is still always removed. The same panel can turn Obiter's properties back on.
- **Automatic styles (item 8).** Keep create-only AGLC4 styles on new blank academic documents, on by default (moved from open to decided).

**Open (from STORY-PLAN.md):**

5. NSW/Qld report-plus-paragraph pinpoint form: `1 [45]`, `1, [45]` or `1 at [45]`. No instrument gives an example.
6. The first document type to ship under the document-type axis: submissions only, or reasons too.
7. Which ZIP library to use for clean-copy export and OOXML fixtures, and whether its licence is compatible with GPLv3.
9. Re-read VSCA SC CA 3 (reissued 10 March 2026) for its record-locator wording.
10. Confirm by hand that FCA GPN-AUTH has not been reissued since 7 May 2025, and read APP 2 (1 December 2025). The site blocks automated access.
11. Whether court-published DOCX files may be kept as private test inputs. Until this is answered, only synthetic fixtures and derived counts are committed.
12. Eye-check the OCR of ACT PD 2/2022 and NSW SC CCA 1.
13. WA eCourts terms of use, and manual downloads from AustLII and the NT, for the missing corpus courts.
14. Whether to keep `Obiter.Website` as an attribution property. For now it is dropped under item 1.
