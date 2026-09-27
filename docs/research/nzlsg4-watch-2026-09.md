# NZLSG 4th edition watch, September 2026

Checked on 27 Sep 2026 (story LCT-014). I found no evidence that NZLSG 4 has been published. There's no public draft, preview chapter or list of changes, and no adoption date. This is based on what could be fetched, so it shows only that nothing was found, not that nothing exists.

## Evidence

**Signals that a 4th edition is coming:**
- **Campus Books** lists "New Zealand Law Style Guide 4ed", ISBN 9781991304612. The listing shows no publisher, date or price: https://www.campusbooks.nz/new-zealand-law-style-guide-4ed-9781991304612
- **Zotero forums**, 17 Oct 2025: a user wrote that the 4th edition was "expected in early 2026". There has been no later post: https://forums.zotero.org/discussion/102632/adding-new-style-request-new-zealand-law-style-guide
- **3rd edition preface:** the editors hoped a 4th edition would not be needed until 2025: https://lawfoundation.org.nz/style-guide2018/preface.html
- **NZLLA:** a search result for a page titled "NZLSG 4th edition" (the search snippet is dated Apr 2024). The page now returns 404.

**Everywhere else still points to the 3rd edition:**
- **Thomson Reuters NZ** sells only the 3rd edition (2018, ISBN 9781988553153): https://store.thomsonreuters.co.nz/new-zealand-law-style-guide-3rd-edition/productdetail/125930
- **The Law Foundation** has the free 3rd edition at /style-guide2018/ and /style-guide2019/, and says nothing about a 4th edition.
- **University library guides** show 3rd edition only, with no 4th edition notice:
  - Auckland (updated 14 Jul 2026): https://auckland.libguides.com/nzlsg
  - VUW (updated 24 Sep 2026): https://libguides.victoria.ac.nz/referencing-citing/styles/nzlsg
- **Auckland's generative AI page** says NZLSG currently gives no guidance on AI-generated material: https://auckland.libguides.com/nzlsg/generative-ai

**Inference, not confirmed:** the 4th edition's ISBN prefix differs from the 3rd's, which may mean a new publisher or imprint. The "early 2026" expectation has slipped.

## Access routes (drafts for the owner to send; nothing has been sent)

- **The editors:** `nzlawstyleguide@gmail.com` (the errors address in the 3rd edition preface). Ask about the status, any draft or early-access review, and whether practitioner or software feedback is welcome.
- **The Law Foundation:** inquiries@lawfoundation.org.nz, +64 4 566 4399.
- **NZLLA** (law librarians), who were consulted for the 3rd edition.
- **Campus Books**, for the listing's publisher and expected date.

## Experimental adoption

- **Nothing qualifies yet.** Obiter adopts an experimental form only when the current guide has a gap and there is backing from analogy, a peer standard or several library guides (DECISION-036, DECISION-041). An expected new edition alone has never been enough.
- **The only candidate** is the NZLSG generative AI form: Canterbury's adaptation of NZLSG r 7.6, with OSCOLA 5 r 3.7.13 as a peer precedent. This is already tracked as A5-EXP-16, deferred until a second NZ source appears.
- **Hook points for when a description or draft appears:**
  - `NZLSG4_CONFIG` in `src/engine/standards/profiles.ts`, which currently has `comingSoon: true`, and the `nzlsg4` registry entry in `src/engine/standards/index.ts`;
  - a new `experimental_pending_nzlsg4` provenance in `src/engine/ruleExporter.ts`, with a badge that depends on the standard (the current badge text names AGLC4);
  - `src/llm/parseVerification.ts`, which reads `provenance` for the brief.
