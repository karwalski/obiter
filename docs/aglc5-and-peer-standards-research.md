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
> verification was mixed. Primary Australian sources (unimelb.edu.au) return HTTP 403 to
> automated fetchers; those claims were corroborated via the Wayback Machine, search-indexed
> text, and Wikipedia.

---

## Part 1 — AGLC5: status, governance, scope, timeline

**Status [high]:** As of mid-2026, **AGLC5 is officially in progress but not yet
published**; **AGLC4 remains the current edition**. Obiter's continued AGLC4 focus is
correct.

**Governance [high]:** AGLC5 is run jointly by the **Melbourne University Law Review
(MULR)** and the **Melbourne Journal of International Law (MJIL)**, through an **AGLC5
Committee established in 2023**.

**Consultation [high]:** Across **2023–2025** the Committee sought feedback from legal
academia, the profession, and the public. **Consultations are now closed** and the
Committee is "preparing the edition for publication" — i.e. drafting/production, no
published date announced.

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
  rule for citing Generative AI tools." [high]
- **UWA, QUT, Macquarie** — parallel AGLC4 GenAI LibGuides (QUT's "legal internet/AI"
  examples; UWA's AGLC4 Gen-AI guide). [medium — same interim pattern, wording varies]

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
| **Bluebook (21st ed, 2020)** | A new rule on citing AI attracted **public criticism** from scholars/practitioners (2025 commentary) as awkward/over-engineered. [medium] | Traditional legal focus. | — |
| **McGill Guide (Canadian)** | Library guidance exists for citing GenAI under McGill conventions. [medium] | — | — |
| **OSCOLA 5th ed (2026)** | Published in 2026; reintegrated international materials and added modern-source handling (incl. an AI/GenAI provision) per prior project research. [medium — corroborate against the official OSCOLA 5 PDF before relying] | — | — |
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
