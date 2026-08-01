# AGLC5 Publication-Day Runbook & Monitoring (A5-WS-1)

**Author:** Matthew Watt · **Project:** Obiter · **Created 2026-08-01**

> **Purpose.** Obiter ships several **experimental, clearly-labelled** extensions ahead of
> AGLC5 (the EXP-* features of EPIC: AGLC5X — generative-AI output v2, dataset, software,
> archived-web fields, and the AI-layer marker). Each is badged **"Experimental · pending
> AGLC5 (not an official AGLC4 form)"** (DECISION-036) precisely because AGLC5 may adopt,
> reshape, or reject it. This runbook defines what happens on publication day so that no
> user document is stranded, and the monitoring cadence that watches for the trigger.

---

## 1. Monitoring cadence (until AGLC5 publishes)

| Cadence | Watch | Source | Action |
|---|---|---|---|
| **Monthly** | AGLC5 publication status | `law.unimelb.edu.au/mulr/aglc/aglc-5` (last-modified currently 2026-05-12); `@AGLCTweets` | On any change from "considering the outcomes" → announced date / pre-order / ISBN, start the publication-day sequence (§2) |
| **Quarterly** | Australian court AI protocols | Law Society of NSW "Court Protocols on AI" hub (current at 14 May 2026) | Re-scan for new/amended instruments; update the court-mode AI reminders (A5-CM-1) and `docs/court-practices-review.md` §5 |
| **Annually** | Practice-direction link freshness | the 23 links + 5 AI-instrument links in `src/engine/court/practiceDirections.ts` | Re-open each; fix retired hosts (as with the 2026 NSW host move); bump `lastVerified` |

As of 2026-08-01: **AGLC5 is unpublished**, consultations are closed and outcomes are being
considered (`docs/aglc5-and-peer-standards-research.md` Part 1). No date announced; publication
is not imminent, so the correspondence window (the open letter) remains usefully open.

---

## 2. Publication-day sequence (when AGLC5 is released)

Run in order. The goal: **existing user documents keep rendering**, and each experimental
item is either promoted to an official AGLC5 form or cleanly retired.

1. **Acquire and diff.** Obtain AGLC5; produce a rule-by-rule diff against the AGLC4 engine.
   The consolidated critique (`docs/aglc4-critique.md`) and the `AGLC5-DELTA` plan are the
   checklist of predicted changes; confirm which landed.
2. **Stand up the v5 engine path.** Rules live under `src/engine/rules/v5/` (the engine is
   already version-parameterised; `aglcVersion` is on every citation). Do not mutate the v4
   path — v4 documents must keep rendering under v4 rules.
3. **Reconcile each EXP-* item** against the published AGLC5 rule:
   | EXP item | If AGLC5 adopts a matching rule | If AGLC5 differs | If AGLC5 is silent |
   |---|---|---|---|
   | EXP-1 genai_output v2 | Map fields to the official GenAI rule; drop the experimental badge; keep v4 docs rendering via a shim | Add a v5 formatter; migrate stored fields; keep the badge until fully mapped | Keep as an Obiter extension, badge retained |
   | EXP-2 dataset / EXP-3 software | Promote to official types; badge off | Adjust element order/labels in v5; badge off once conformant | Keep experimental |
   | EXP-4 archived-web fields | Fold into the official archived-source rule | Adjust rendering | Keep experimental |
   | EXP-5 AI-layer marker | Replace with the official marker syntax | Adjust | Keep experimental |
   No stored citation is deleted; a migration pass re-keys fields where the official schema
   differs, and any unmappable field is preserved on the record (never dropped).
4. **Flip provenance.** For each item AGLC5 blesses, change its `provenance` from
   `experimental_pending_aglc5` to `aglc4`/`aglc5` (official) in `SOURCE_TYPE_METADATA`; the
   badge disappears automatically (it is data-driven — DECISION-036). Items AGLC5 leaves
   unaddressed keep the badge, now reading against AGLC5 rather than AGLC4.
5. **Conformance recount.** Move promoted items into the conformance count; regenerate the
   audit total in `docs/aglc4-audit.md` / the AGLC5 audit.
6. **Docs + letter.** Update `docs/obiter-extensions.md` (retire promoted rows), the
   modern-sources proposal (mark shipped), and the public site; close the relevant DECISIONs.
7. **Regression.** Run the full suite plus a migration test that a v4 document with each EXP
   field opens and renders unchanged after the upgrade.

**Rollback:** the v4 engine path is untouched, so reverting the v5 rollout is a config flip;
no user data is lost because migration is additive/re-keying, never destructive.

---

## 3. Invariants (must always hold)

- A document authored with an experimental field **always renders**, before and after AGLC5,
  under some rule (experimental, or the official successor).
- The experimental badge is **data-driven** (`provenance` in `SOURCE_TYPE_METADATA`): promoting
  an item is a one-line metadata change, not a UI edit.
- Experimental items are **never counted** in an AGLC4-conformance claim (DECISION-036).
- No stored field is deleted during migration; unmappable fields are preserved on the record.

*Cross-references: `docs/decisions.md` (DECISION-036), `docs/obiter-extensions.md`,
`docs/modern-sources-proposal.md`, `docs/aglc5-and-peer-standards-research.md`,
`../footnote-backlog.md` (EPIC: AGLC5X).*
