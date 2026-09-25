# AGLC5 watch: September 2026 research sweep

Recovered from deep-research run `wf_184936d5-3cb` (completed 23–24 Sep 2026, 106 agents, 23 sources, 25 claims checked: 20 confirmed, 5 refuted). This picks up from the baseline in `aglc5-and-peer-standards-research.md` and the open letter at `website/aglc5.html`.

**Method limit:** the checking step ran out of web searches before it could look for contradicting sources. Findings were confirmed by fetching the primary documents directly. Every "nothing found" result is therefore only an absence of evidence. Journal editors, ALLA and conference material were not reached.

## 1. AGLC5 status

- **No AGLC5 news as at 24 Sep 2026.** The Committee page at <https://law.unimelb.edu.au/mulr/aglc/aglc-5> still says the 2023–2026 consultation is closed and the Committee is considering the outcomes. It is not accepting feedback and gives no date, draft or ISBN. The page's meta last-modified date is still 2026-05-12.
- **The page's wording has softened, and its published aims have been removed.**
  - The March 2025 Wayback capture said MULR and MJIL were "preparing a new edition … for publication". The live page now says "consultations for a prospective new edition".
  - The `aglc-5@unimelb.edu.au` contact address has been deleted.
  - The whole "Feedback Wanted" block listing the aims has been deleted. The archive shows **seven** aims, not six. The seventh is a practice-oriented approach to encourage use by practitioners.
  - **Dating:** Wayback has no capture after 24 Mar 2025, so the rewrite cannot be dated. Do not describe it as happening after July 2026.
  - **Interpretation:** this may just be tidy-up after the consultation closed. The safe statement is "the aims are no longer published", not "the aims were abandoned".
- **Monitoring risk:** law.unimelb.edu.au and fedcourt.gov.au now sit behind Cloudflare and return HTTP 403 to plain fetchers such as curl and WebFetch. An automated A5-WS-1 watcher built on plain HTTP would keep reporting "no change" without ever reading the page. It needs a browser-grade fetch or a proxy.

## 2. Criticism of AGLC4

- **No new academic, library or journal criticism was found after July 2026.** This result is weak because of the method limit above.
- **Confirmation only:** RMIT Library's page, updated 29 Jul 2026, says AGLC4 has no rule for AI-generated content and none for software.
- **Interim practice has converged on citing GenAI by analogy to rule 7.12:**
  - UQ, page updated 14 Jul 2026, template: `Output from [program], [creator] to [recipient], [full date]`. Its examples are "ChatGPT, OpenAI" and "Copilot, Microsoft". It also recommends recording the prompt in a note or appendix.
  - RMIT's template is `Output from [tool], [company] to [your name], [date] <URL>`. RMIT attributes the analogy to the MULR editors, relayed through UWA.
  - Every source labels this "interim".

## 3. Court and tribunal instruments

- **New since July 2026:** the *Administrative Review Tribunal (Use of Generative AI) Practice Direction 2026*.
  - Signed by Kyrou J on 20 Aug 2026 and announced 24 Aug 2026.
  - Applies to all applications and all jurisdictional areas.
  - Clause 3.6 requires the responsible person to check that cited authorities exist and support the proposition.
  - Disclosure must be placed at or near the start of the document.
  - It is adapted from FCA GPN-AI.
  - Links: <https://www.art.gov.au/about/news-and-updates/new-generative-ai-practice-direction-available>, <https://www.art.gov.au/sites/default/files/2026-08/Administrative%20Review%20Tribunal%20(Generative%20AI)%20Practice%20Direction.pdf>
- **FCA GPN-AI** (16 Apr 2026) and **NSW SC Gen 23** (Jan 2025) have not changed. Cite GPN-AI at `.../practice-notes/gpn-ai`, not the notice-to-profession URL.
- **These instruments are about verification and disclosure, not citation form.** None prescribes how to cite AI output. The duties apply only where GenAI was actually used, and only to documents that name a responsible preparer.
- **Design constraint:** NSW SC Gen 23 para 17 bars GenAI from being the only means of verifying citations. This supports the existing `citationVerifier` design; it is not a new candidate feature.

## 4. Peer standards

- **OSCOLA 5 r 3.7.13 (March 2026) has a GenAI rule.**
  - The AI is the author and the prompt is shown in quotation marks.
  - The developer organisation and the generation date follow.
  - Example: "ChatGPT, response to '…', OpenAI (16 July 2023)".
  - The rule sits right after the personal-communications rule, which supports the logic of the 7.12 analogy.
- **OSCOLA 5 abolishes "ibid".** A later citation uses a short identifier plus "(n X)".
  - It is still not fully deterministic, because the author chooses the short form.
  - Legislative short forms work as a separate mechanism with no cross-reference.
  - Implication for the letter: ask for positional ambiguity to be removed, not for total determinism.
- **Licensing:** OSCOLA shows that a free full-text edition can coexist with a commercial print edition (Hart).
  - It does **not** show that a permissive licence is workable. The PDF has no licence statement.
  - The claim that OSCOLA is published under CC BY-NC-SA was refuted 1-2.
  - For the letter, split the request into open access (supported by this precedent) and a reuse licence (not supported by it).
- **Tooling lag:** six months after OSCOLA 5, Oxford's EndNote, LaTeX, Refworks and Zotero styles and the canonical CSL file are still 4th edition. Plan to implement AGLC5 ourselves rather than waiting for style files.

## 5. Candidate experimental changes (all non-official, badged "Experimental · pending AGLC5")

1. **GenAI developer field.** `GenaiOutputData` (`src/engine/rules/v4/secondary/genai.ts`) has no developer field, even though `modern-sources-proposal.md` §2.1 lists Developer as EXP-1 element 2. Both UQ and OSCOLA require it. Add an optional `developer` field. It only adds to the schema, so no migration is needed.
2. **GenAI recipient.** `formatGenaiOutput` always appends " to the author" (line 110). Add an optional `recipient` field that overrides that default, since UQ's examples name a person.
3. **GenAI prompt rendering.** The prompt is stored but not rendered. Offer it as an optional trailing note, following UQ's practice.
4. **Court mode.** Add a specific ART GenAI PD entry to `src/engine/court/practiceDirections.ts`. The only current ART row, at around line 176, is generic and was last verified 2026-04-21. The new entry belongs in the disclosure + restriction group of the A5-CM-1 reminder.
5. **AGLC5 watcher.** Make it use a browser-grade fetch because of the Cloudflare 403s.

## 6. Housekeeping: baseline items now out of date

- `website/aglc5.html`, `docs/aglc5-and-peer-standards-research.md` and `docs/modern-sources-proposal.md` cite the Committee aims as current. They should cite the 24 Mar 2025 Wayback capture instead and say the aims were withdrawn from the live page. Add the seventh aim.
- `docs/aglc5-publication-runbook.md` §1 assumes the correspondence window is still open. There is now no published channel. Update it, and record the Cloudflare issue and the lack of Wayback captures.
- Refuted, so do not reuse:
  - UQ "confirming" the analogy, as that claim was worded.
  - The ART PD having a source-traceability rule.
  - NSW SC Gen 23 having a metadata model for AI use by experts.
  - OSCOLA being published under CC BY-NC-SA.
  - GPN-AI being cited from the notice URL.

## Open questions

1. When and why was the Committee page rewritten? Only a direct enquiry to MULR or MJIL, or their editorials, can answer this. It is the most valuable question, because it decides how long the EXP-* features will live.
2. Has any Australian institution adopted the OSCOLA style (AI as author, prompt inline) instead of the 7.12 analogy?
3. What channel is left for implementers to give input now that the feedback address has been removed?
4. Do the ART Expert Evidence and Common Procedures PDs 2026 add citation-adjacent requirements? They were identified but not read.

## Addendum (24 September 2026, later the same day): generative AI decisions settled

A follow-up run (`wf_1081fbee-c21`) checked seven Australian library guides live. All of them use "Output from [program], [creator] to [recipient], [full date]". It also confirmed the OSCOLA 5 r 3.7.13 form. Changes shipped as a result:

- A5-EXP-9: "Output from" is the default wording, with a document setting that keeps "Correspondence from".
- A5-EXP-10: a later reference no longer loses its identifier.
- A5-EXP-11: an AGLC bibliography entry under Other.
- A5-EXP-12: the comma in the prompt note.
- A5-EXP-13: the OSCOLA form now follows r 3.7.13.

The evidence table is in DECISION-041.
