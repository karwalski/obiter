# Marketplace Listing — Obiter for Microsoft 365 Copilot

App id: `1fe03f6c-b9b7-4a44-a55f-4b08f9813729` · Product type: Microsoft 365 app (unified manifest) · Companion to the classic "Obiter — AGLC4 Citations" add-in (id `933c30ed…`). Ships from the `copilot/v*` branch via `npm run package:skill`.

## Short Description (99 chars)
Cite legal sources in Word by asking Microsoft 365 Copilot — Obiter formats them to AGLC4 for you.

## Long Description

Obiter for Microsoft 365 Copilot connects the Obiter AGLC4 citation engine to Copilot in Word. Describe a source or paste a rough reference in Copilot — "cite Mabo v Queensland (No 2)" — and Obiter inserts a correctly formatted AGLC4 citation as a native Word footnote. Copilot handles the language understanding; Obiter's engine remains the sole authority for citation correctness, so every footnote stays traceable to a numbered AGLC4 rule.

This package includes the full Obiter Word add-in (everything in the free classic add-in) plus the Copilot skill.

MICROSOFT 365 COPILOT:

- Ask Copilot in plain language to cite a source; Obiter formats it per AGLC4 and inserts a native Word footnote
- Copilot extracts the structured fields; Obiter's engine does the formatting — no citation is invented, each traces to a rule
- Insert directly, or preview the formatted text first
- Update, refresh, and renumber citations through Copilot as well as the task pane
- Requires a Microsoft 365 Copilot licence

CITATION ENGINE (SAME AS THE CLASSIC ADD-IN):

- Automatic AGLC4 formatting for 80+ source types across all 26 chapters, including international materials and foreign jurisdictions
- Ibid and subsequent-reference resolution; cross-reference fields that auto-renumber; short titles; linking phrases; explanatory footnotes
- One-click bibliography with AGLC4 section headings; document validation; Scan and Repair; AGLC4 heading styles and document template
- Court submission mode (jurisdictional presets, parallel citations, List of Authorities, ibid suppression)
- OSCOLA 5 and NZLSG 3 in addition to AGLC4
- Quotation tools; inline case-name and embedded-title italics; searchable reference guide
- Optional in-app AI (BYO API key) for parsing, classification, and verification — independent of Copilot

WHO IS IT FOR:

Australian law students, academics, and practitioners with a Microsoft 365 Copilot licence who want to cite legal sources conversationally while keeping AGLC4 correctness guaranteed by a dedicated engine. Users without a Copilot licence should install the free classic "Obiter — AGLC4 Citations" add-in instead — it has the full citation engine and the BYO-key AI features.

PRIVACY:

Obiter collects no personal data and no document content. All citation data remains in your document. The Copilot skill passes only the source details you provide to Copilot in order to insert a citation; Obiter's formatting runs locally in the add-in. Optional in-app AI features require user-provided API keys and only process text you explicitly select. Optional error reporting is anonymous and requires explicit consent. See the full privacy policy at https://obiter.com.au/privacy.html.
