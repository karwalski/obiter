# AGLC5 Progress & Peer-Standards Modernisation — Research Report (CRIT-003)

**Author:** Matthew Watt · **Project:** Obiter · **Compiled 2026-07-22**
**Method:** Multi-source web research with adversarial claim verification (deep-research
harness: fan-out search → source fetch → 3-vote verification → synthesis). Recent items
(AGLC5 status, OSCOLA 5th ed, Chicago 18th ed) were verified against live sources rather
than model memory, because they post-date the January 2026 knowledge cutoff.

> **Scope.** Comparison/research only, to inform the AGLC5 recommendations in
> `docs/aglc4-critique.md` and the proposals in `docs/modern-sources-proposal.md`. This
> is **not** an implementation spec, and no peer style is proposed for implementation
> (per the 21 Apr 2026 multi-standard scope decision).

> **Confidence.** Claims are marked **[high]** / **[medium]** where the underlying
> verification was mixed. Some primary Australian sources (unimelb.edu.au sub-pages) return
> HTTP 403 to automated fetchers; those claims were corroborated via the Wayback Machine,
> search-indexed text, and Wikipedia. On the July 2026 CRIT-005 pass the main AGLC5 status
> page (`/mulr/aglc/aglc-5`) was reachable directly (last-modified 2026-05-12) — see the
> Part 1 retrieval note.

---

## Part 1 — AGLC5: status, governance, scope, timeline

**Status [high]:** As of mid-2026, **AGLC5 is officially in progress but not yet
published**; **AGLC4 remains the current edition**. Obiter's continued AGLC4 focus is
correct.

**Governance [high]:** AGLC5 is run jointly by the **Melbourne University Law Review
(MULR)** and the **Melbourne Journal of International Law (MJIL)**, through an **AGLC5
Committee established in 2023**.

**Consultation [high]:** The Committee's page (last-modified 2026-05-12) now records that
**consultations ran across 2023–2026** (extended a year from the earlier "2023–2025"
wording), that it is **"considering the outcomes of this consultation"**, and that it is
**"not accepting further feedback at this time"** — a softening from the earlier "preparing
the edition for publication". Implication: publication is not imminent, and the
correspondence window (open letter / MULR route) is effectively still open even though the
formal feedback window has closed. No published date announced (CRIT-005 Part B.1).

**Retrieval note [CRIT-005]:** the live `law.unimelb.edu.au/mulr/aglc/aglc-5` page was
**reachable directly** on the July 2026 pass (page last-modified **2026-05-12**), so no
Wayback fallback was needed for the current status; the 403-to-bots behaviour below still
applies to some sub-pages, and if the page 403s later, use the snapshot nearest that date.

**Announced scope [high]** (the Committee's stated "identified areas of improvement" —
these are *aims*, not confirmed features of a published edition). They map almost exactly
onto the defect classes in `docs/aglc4-critique.md`:

| Announced AGLC5 aim | Corresponding CRIT-001 finding |
|---|---|
| Make the guide more comprehensive | Silence on modern sources (§CRIT-002); many under-specified rules |
| Improve the structure | Rules buried in notes (6.6.2); example/table/appendix disagreement |
| Simplify and improve usability | Jargon ("bare year"), undefined categories |
| Cite First Nations materials; decolonise scholarship | (New scope — DECISION-007 deferred pending consultation) |
| Update internet-materials rules; move into the digital age, **explicitly accounting for AI** | No GenAI rule; internet rules trail practice (CRIT-002 modern-sources) |
| Gender-inclusive, culturally-sensitive language and examples | (Language/quality — aligns with the example-quality findings) |

**Implication:** the AGLC5 Committee has *publicly committed* to fixing exactly the
categories Obiter documents. The CRIT-001 critique and the modern-sources proposal are
well-timed as consultation-adjacent input (even though the formal window has closed, the
open letter / MULR correspondence route remains — `website/aglc5.html`).

---

## Part 2 — AGLC4 criticism and the generative-AI interim ecosystem

**The core gap [high]:** AGLC4 (2018) **predates generative AI and contains no rule for
citing it.** Australian law schools filled the gap with interim LibGuide guidance, the
dominant pattern being **cite GenAI output as Written Correspondence under AGLC4 rule
7.12**:

- **Monash University** — treat GenAI output as Written Correspondence (rule 7.12) as an
  explicit interim workaround; states plainly that AGLC4 "does not include any specific
  rule for citing Generative AI tools." **Confirmed live [high].**
- **UWA (dated 15 Sep 2025), Macquarie** — parallel AGLC4 GenAI LibGuides on the same
  rule-7.12 written-correspondence analogy (rule 1.1.5 discursive text; an appendix for
  prompt/transcript custody; bibliography under "Other", rule 1.13). **Confirmed live
  [high]** (CRIT-005 Part B.4).
- **QUT** — a parallel AGLC4 "legal internet/AI" LibGuide is **inferred only** from the
  uniform sector pattern; not directly confirmed this pass. [low]

This is precisely the ecosystem Obiter's `genai_output` type mirrors (see
`docs/obiter-extensions.md`), which strengthens the case that Obiter's interim choice
tracks sector practice rather than inventing a convention.

**New Zealand contrast [high]:** the **NZLSG provides no GenAI guidance at all**; the
University of Auckland guide states the NZLSG has no AI format and **defers students to
their lecturers**. So among the styles Obiter implements, AGLC (via libraries) has the
richer interim ecosystem and NZLSG is silent.

**Nature of the criticism:** the published criticism is less "AGLC4 is wrong" and more
"AGLC4 is *incomplete and dated*" — no AI rule, thin digital-source rules, and (from the
Committee's own aims) structural and inclusivity gaps. This aligns with the CRIT-001
finding that AGLC4's defects are *numerous and systematic in shape* rather than fatal.

---

## Part 3 — How peer styles have modernised

Peer styles have moved **well ahead of AGLC4** on generative AI and computational
sources. The verified highlights:

| Style (latest ed.) | GenAI citation | Dataset / software | Integrity / disclosure track |
|---|---|---|---|
| **APA 7** | Structured rule: cite ChatGPT-style output using the **software/reference template** — author = the maker (e.g. OpenAI), year, italic tool name + version, bracketed descriptor, URL. Blog guidance "How to cite ChatGPT". [high] | Mature **data-set** and **software** reference templates (§10.10; dedicated data-set examples page). [high] | AI is a tool, not an author; describe prompt/use in the text. |
| **MLA 9** | Dedicated "Citing Generative AI" guidance: prompt as the source "title", tool as container, version + date + URL. [high] | Uses the flexible container model. | Advises describing AI use. |
| **Chicago 18th ed (2024)** | GenAI addressed in the manual (Ch 14 citation + Ch 4 guidance): cite the tool, note the prompt, and **disclose** AI assistance. [high] | Established dataset/software citation patterns. | Explicit **disclosure** guidance (Ch 4). |
| **ICMJE / Vancouver** | AI **cannot be an author**; authors must **disclose** AI use in methods/acknowledgements. Focus is integrity, not a citation slot. [high] | Data-sharing/citation norms via ICMJE. | The strongest disclosure regime. |
| **AMS (sciences)** | — | Explicit **dataset and software** citation templates (reuse-the-template pattern). [medium] | — |
| **Bluebook (22nd ed, May 2025)** | **Rule 18.3** (LLMs, search results, AI-generated content; requires preserving output as a PDF screenshot) drew **published criticism** as over-engineered — Tanner ("disclose, don't cite"; AI is a tool not an authority), Gunder (four grounds: internal errors, unreasonable burden, incompatibility with real usage, conflict with confidentiality/work-product), O'Keefe (the rule's own examples fail its stated requirements); aggregated by Ambrogi (LawSites, Sep 2025). [high] | Traditional legal focus. | Criticism consensus: disclose, don't cite. |
| **McGill Guide (10th ed, 2023)** | **No GenAI rule.** CanLII elevated in the source hierarchy; commitment to Indigenous-source citation by the 11th ed. The community **COAL** guide (Canadian Open Access Legal Citation, ch 8) is the only Canadian legal style with a GenAI format — a fork out-modernising the incumbent. [high] | — | — |
| **OSCOLA 5th ed (2026)** | **Published 25 March 2026** (Hart; ed Goudkamp, consultant ed Nolan; **ISBN 978-1-50997-369-9**). GenAI rule **3.7.13**: cite the AI tool as author; user prompts in inverted commas; developing organisation; generation date. Reinstates a substantially revised public-international-law section. [high] | — | — |
| **NZLSG** | **No AI rule** (defers to lecturers). [high] | — | — |
| **Harvard / MHRA / ALWD** | Thinner or institution-specific GenAI guidance; not a distinct structured rule of note in the verified set. [low] | — | — |

**Dominant design pattern across styles [high]:** rather than invent a wholly new
category, the leaders **reuse the software/reference template and add a bracketed
source-type descriptor** (APA's "[Large language model]", MLA's container model), and run
a **parallel professional-integrity track** requiring *disclosure* of AI use (ICMJE,
Chicago Ch 4) distinct from *citation* of AI output.

---

## Part 4 — Implications for AGLC5 and Obiter

1. **AGLC5 should adopt the "reuse-the-template + bracketed descriptor" pattern**, not a
   bespoke AI chapter. For AGLC that means extending the written-correspondence /
   internet-materials machinery with a GenAI descriptor and model/version/date/custody
   elements — which is exactly the shape of Obiter's `genai_output` and the proposal in
   `docs/modern-sources-proposal.md` §2.
2. **Two tracks, not one.** AGLC5 (and Obiter's court mode) should separate **citing AI
   output** from **disclosing AI assistance** in a filed or submitted document — the
   ICMJE/Chicago split. This validates routing AI-use disclosure into court mode
   (`docs/court-practices-review.md`) rather than the academic citation engine.
3. **Datasets and software need first-class templates.** APA/AMS/Chicago show the way;
   AGLC has nothing. `docs/modern-sources-proposal.md` §3 should cite these as precedent.
4. **AGLC is behind, and the Committee knows it.** Every peer style with a 2020–2026
   edition has a GenAI position; AGLC4 relies on library workarounds. This is the single
   strongest, best-evidenced recommendation for the open letter.
5. **NZLSG silence is a differentiation opportunity** for Obiter (it already provides a
   consistent GenAI rendering where NZLSG gives none) — but not a peer-style implementation
   target under current scope.

---

## Sources (selected, verified)

**AGLC5 / AGLC4:** law.unimelb.edu.au/mulr/aglc/aglc-5 · /mulr/aglc/about (403 to bots;
via Wayback `web.archive.org/web/20250324032707/…`) · en.wikipedia.org/wiki/Australian_Guide_to_Legal_Citation ·
x.com/AGLCTweets. **AU GenAI interim:** guides.lib.monash.edu/aglc4/artificial-intelligence ·
guides.library.uwa.edu.au/AGLC4/Gen_AI · citewrite.qut.edu.au/cite/examples/legal/legal_internet_ai.html ·
libguides.mq.edu.au. **NZLSG:** auckland.libguides.com/nzlsg/generative-ai ·
lawfoundation.org.nz/style-guide2019. **Peer styles:** apastyle.apa.org/blog/how-to-cite-chatgpt ·
apastyle.apa.org/blog/cite-generative-ai-references · apastyle.apa.org/style-grammar-guidelines/references/examples/data-set-references ·
style.mla.org/citing-generative-ai · chicagomanualofstyle.org/book/ed18 · chicagomanualofstyle.org/help-tools/what-s-new.html ·
icmje.org/recommendations/browse/artificial-intelligence/ai-use-by-authors.html ·
libguides.mcmaster.ca/cite-gen-ai/vancouver · libguides.mcmaster.ca/cite-gen-ai/chicago ·
libraryguides.mcgill.ca · guides.library.georgetown.edu/ai/citing ·
abajournal.com / lawnext.com (Bluebook AI-rule criticism, 2025) ·
ametsoc.org (AMS dataset/software templates) · doi.org/10.3886/ICPSR36966.v1 (dataset DOI example).

*Cross-references: `docs/aglc4-critique.md` §10 (AGLC5 recommendations),
`docs/modern-sources-proposal.md` (proposed types), `website/aglc5.html` (LETTER epic).*
