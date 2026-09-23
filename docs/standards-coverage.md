# Standards coverage: OSCOLA 5 and NZLSG 3

Generated from `tests/fixtures/standards/coverage.ts` (STD-003 coverage contract) on 2026-09-23. Do not edit the tables by hand: change the fixture and regenerate (a one-off Node script that transpiles the fixture with the repo's Babel and prints these tables; no script is kept in the repo). The companion AGLC4 audit is `docs/aglc4-coverage.md`.

**`tests/standards/coverage.test.ts` enforces this table.** It reads every key of `SOURCE_DISPATCH` in `src/engine/engine.ts` and every `export function` in `src/engine/rules/oscola/*` and `src/engine/rules/nzlsg/*`, and fails when a source type or formatter has no entry here, when a `native` type still renders the AGLC4 form, or when an `unsupported` entry's story has landed and the entry was not moved. A new source type or formatter therefore cannot ship without a declared class under both standards.

## How to read

Each engine source type (the key the Insert form and the interchange mapper write to `sourceType`) is classified under each standard:

- **Native** — the standard has its own rendering path for the type: an `OSCOLA_DISPATCH` entry or a `dispatchNzlsg` gate. Where the gate needs a data flag (a `waiNumber`, a `T-` case number, a `medium` of Podcast), the reason names it; records without the flag keep the AGLC4 form. **Native (shared formatter)** means the shared AGLC formatter renders the standard's form from the document config (STD-016: author order, quotation marks, edition abbreviation, italics, place of publication) rather than through a dispatch entry; the suite proves it by the output differing from the AGLC4 rendering.
- **Fall-through** — the AGLC4 rendering is acceptable under the standard: Australian-only forms with no counterpart, jurisdiction-specific AGLC4 Part V foreign forms, standard-neutral free text, or experimental AGLC5-pending types the standard has no rule for. The reason says which. **"unclassified, review"** marks a type whose treatment under the standard was not settled from the rule authority; Rule 1 of the project (never guess) leaves it on the AGLC4 form and lists it in DECISION-040 (`docs/decisions.md`).
- **Unsupported** — the standard has its own form but Obiter renders the AGLC4 one. The story in brackets names the fix. When it lands the entry moves to Native, or the suite's `test.failing` guard flips red.

Counts at generation: OSCOLA 5 — 31 native (7 through the shared formatter), 42 fall-through (15 unclassified, review), 14 unsupported. NZLSG 3 — 29 native (6 shared), 48 fall-through (21 unclassified, review), 10 unsupported. 87 source types in all.

## Source types by standard

### Cases

| Source type | OSCOLA 5 | NZLSG 3 |
|---|---|---|
| `case.reported` | Native — OSCOLA_DISPATCH → UK / Scottish / NI / Irish case formatters by courtId or jurisdiction | Native — dispatchNzlsg → formatNeutralCitation, or formatPreNeutralCase when fileNumber is set |
| `case.unreported.mnc` | Native — OSCOLA_DISPATCH → formatOscolaCase (neutral citation) | Native — dispatchNzlsg → formatNeutralCitation, or formatPreNeutralCase when fileNumber is set |
| `case.unreported.no_mnc` | Fall-through — unclassified, review | Fall-through — unclassified, review |
| `case.proceeding` | Fall-through — Australian-only AGLC4 form; no counterpart in the standard | Fall-through — Australian-only AGLC4 form; no counterpart in the standard |
| `case.court_order` | Fall-through — Australian-only AGLC4 form; no counterpart in the standard | Fall-through — Australian-only AGLC4 form; no counterpart in the standard |
| `case.quasi_judicial` | Fall-through — Australian tribunal form (AGLC 2.6) | Native — dispatchNzlsg → formatMaoriLandCourt when minuteBookAbbrev is set; other tribunals fall through to AGLC 2.6 |
| `case.arbitration` | Fall-through — unclassified, review | Fall-through — Australian-only AGLC4 form; no counterpart in the standard |
| `case.transcript` | Fall-through — Australian transcript form (AGLC 2.7) | Fall-through — Australian transcript form (AGLC 2.7) |
| `case.submission` | Fall-through — Australian-only AGLC4 form; no counterpart in the standard | Fall-through — Australian-only AGLC4 form; no counterpart in the standard |

### Legislation

| Source type | OSCOLA 5 | NZLSG 3 |
|---|---|---|
| `legislation.statute` | Native — OSCOLA_DISPATCH → primary / secondary / Irish legislation formatters | Native — dispatchNzlsg → formatLegislation |
| `legislation.bill` | Fall-through — unclassified, review | Native — dispatchNzlsg → formatBill |
| `legislation.delegated` | Native — OSCOLA_DISPATCH → formatOscolaSecondaryLegislation | Native — dispatchNzlsg → formatDelegatedLegislation |
| `legislation.constitution` | Native — OSCOLA_DISPATCH → formatBunreachtNaHEireann when jurisdiction is IE (or the title is Bunreacht na hÉireann); other constitutions keep the AGLC 3.6 form | Fall-through — NZ has no single constitutional instrument; the Constitution Act 1986 is cited as legislation.statute |
| `legislation.explanatory` | Fall-through — unclassified, review | Fall-through — unclassified, review |
| `legislation.quasi` | Fall-through — Australian-only AGLC4 form; no counterpart in the standard | Fall-through — Australian-only AGLC4 form; no counterpart in the standard |

### Secondary sources

| Source type | OSCOLA 5 | NZLSG 3 |
|---|---|---|
| `journal.article` | Native (shared formatter) — STD-016: formatJournalArticle renders OSCOLA 5 §3.3 from the config | Native — dispatchNzlsg → formatJournalArticle |
| `journal.online` | Native (shared formatter) — STD-016: formatJournalArticle renders OSCOLA 5 §3.3 from the config | Native (shared formatter) — STD-016: formatJournalArticle renders NZLSG 3 §6.4 from the config |
| `journal.forthcoming` | Native (shared formatter) — STD-016: formatJournalArticle renders OSCOLA 5 §3.3 from the config | Native (shared formatter) — STD-016: formatJournalArticle renders NZLSG 3 §6.4 from the config |
| `book` | Native (shared formatter) — STD-016: formatBook renders OSCOLA 5 §3.2.1 from the config | Native — dispatchNzlsg → formatBook |
| `book.chapter` | Native (shared formatter) — STD-016: formatBookChapter renders OSCOLA 5 §3.2.4 from the config | Native (shared formatter) — STD-016: formatBookChapter renders NZLSG 3 §6.2 from the config |
| `book.translated` | Native (shared formatter) — STD-016: formatBook renders OSCOLA 5 §3.2.1 from the config | Native (shared formatter) — STD-016: formatBook renders NZLSG 3 §6.1.1 from the config |
| `book.audiobook` | Unsupported — renders AGLC 6.9 form (STD-016) | Native (shared formatter) — STD-016: formatBook renders NZLSG 3 §6.1.1 from the config |
| `book.ebook` | Native (shared formatter) — STD-016: formatBook renders OSCOLA 5 §3.2.1 from the config | Native (shared formatter) — STD-016: formatBook renders NZLSG 3 §6.1.1 from the config |
| `report` | Unsupported — renders AGLC 7.1 form (STD-016) | Native — dispatchNzlsg → formatWaitangiTribunalReport when waiNumber is set; other reports render the AGLC 7.1 form |
| `report.parliamentary` | Native — OSCOLA_DISPATCH → command paper / Law Commission / select committee formatters | Native — dispatchNzlsg → cabinet document / Gazette / AJHR formatters by cabinetDocument, gazette or ajhr flag; otherwise AGLC 7.1.2 |
| `report.royal_commission` | Fall-through — unclassified, review | Fall-through — unclassified, review |
| `report.law_reform` | Native — OSCOLA_DISPATCH → formatOscolaLawCommission when reportNumber is set, else formatOscolaParliamentaryReport | Native — dispatchNzlsg → formatLawCommission when reportType is set |
| `report.waitangi_tribunal` | Fall-through — NZ-only body; AGLC report form acceptable under OSCOLA | Native — dispatchNzlsg → formatWaitangiTribunalReport |
| `report.abs` | Fall-through — Australian-only AGLC4 form; no counterpart in the standard | Fall-through — Australian-only AGLC4 form; no counterpart in the standard |
| `research_paper` | Unsupported — renders AGLC 7.2 form (STD-016) | Unsupported — renders AGLC 7.2 form (STD-016) |
| `research_paper.parliamentary` | Unsupported — renders AGLC 7.2.3 form (STD-016) | Unsupported — renders AGLC 7.2.3 form (STD-016) |
| `conference_paper` | Unsupported — renders AGLC 7.2.4 form (STD-016) | Unsupported — renders AGLC 7.2.4 form (STD-016) |
| `thesis` | Native — OSCOLA_DISPATCH → formatOscolaThesis (OSCOLA 5 §3.7.6 italic; OSCOLA 4 §3.4.7 quoted via thesisTitleStyle) | Native — dispatchNzlsg → formatThesis |
| `speech` | Unsupported — renders AGLC 7.3 form (STD-016) | Unsupported — renders AGLC 7.3 form (STD-016) |
| `press_release` | Unsupported — renders AGLC 7.4 form (STD-016) | Unsupported — renders AGLC 7.4 form (STD-016) |
| `hansard` | Native — OSCOLA_DISPATCH → formatOscolaHansard | Native — dispatchNzlsg → formatNZPD when nzpd is set; otherwise AGLC 7.5.1 |
| `submission.government` | Fall-through — Australian-only AGLC4 form; no counterpart in the standard | Native — dispatchNzlsg → formatSelectCommitteeSubmission when committee is set; otherwise AGLC 7.5.2 |
| `evidence.parliamentary` | Fall-through — Australian-only AGLC4 form; no counterpart in the standard | Fall-through — Australian-only AGLC4 form; no counterpart in the standard |
| `constitutional_convention` | Fall-through — Australian-only AGLC4 form; no counterpart in the standard | Fall-through — Australian-only AGLC4 form; no counterpart in the standard |
| `dictionary` | Unsupported — renders AGLC 7.6 form (STD-016) | Unsupported — renders AGLC 7.6 form (STD-016) |
| `legal_encyclopedia` | Unsupported — renders AGLC 7.7 form (STD-016) | Unsupported — renders AGLC 7.7 form (STD-016) |
| `looseleaf` | Unsupported — renders AGLC 7.8 form (STD-016) | Native — dispatchNzlsg → formatOnlineLooseleaf |
| `ip_material` | Fall-through — unclassified, review | Fall-through — unclassified, review |
| `constitutive_document` | Fall-through — unclassified, review | Fall-through — unclassified, review |
| `periodical` | Unsupported — renders AGLC 7.11.3 form (STD-016) | Unsupported — renders AGLC 7.11.3 form (STD-016) |
| `newspaper` | Unsupported — renders AGLC 7.11 form (STD-016) | Native — dispatchNzlsg → formatNZNewspaper |
| `correspondence` | Unsupported — renders AGLC 7.12 form (STD-016) | Unsupported — renders AGLC 7.12 form (STD-016) |
| `interview` | Unsupported — renders AGLC 7.13 form (STD-016) | Unsupported — renders AGLC 7.13 form (STD-016) |
| `film_tv_media` | Native — OSCOLA_DISPATCH → formatOscolaPodcast (medium Podcast or Radio) or formatOscolaVideo (medium Video); films and television keep the AGLC 7.14 form | Native — dispatchNzlsg → formatNZBroadcast |
| `internet_material` | Native — OSCOLA_DISPATCH → formatOscolaBlog (documentType Blog Post, blogName or isBlog) or formatOscolaWebsite | Native — dispatchNzlsg → formatNZBlog (documentType Blog Post, blogName or isBlog, with an author and date) or formatNZWebsite |
| `social_media` | Native — OSCOLA_DISPATCH → formatOscolaSocialMedia | Native — dispatchNzlsg → formatNZSocialMedia |
| `genai_output` | Native — OSCOLA_DISPATCH → formatGenAiCitation | Fall-through — experimental AGLC5-pending form; the standard has no rule for it |
| `dataset` | Fall-through — experimental AGLC5-pending form; the standard has no rule for it | Fall-through — experimental AGLC5-pending form; the standard has no rule for it |
| `software` | Fall-through — experimental AGLC5-pending form; the standard has no rule for it | Fall-through — experimental AGLC5-pending form; the standard has no rule for it |

### International materials

| Source type | OSCOLA 5 | NZLSG 3 |
|---|---|---|
| `treaty` | Native — OSCOLA_DISPATCH → treaty / Council of Europe treaty / EU treaty formatters by data | Native — dispatchNzlsg → formatTreatyOfWaitangi when treatyOfWaitangi is set; otherwise formatTreaty |
| `treaty.mou` | Fall-through — unclassified, review | Fall-through — unclassified, review |
| `un.charter` | Fall-through — unclassified, review | Fall-through — unclassified, review |
| `un.document` | Native — OSCOLA_DISPATCH → formatUnResolution for a numbered resolution without a title (or documentType resolution), else formatUnDocument | Native — dispatchNzlsg → formatUNDocument |
| `un.communication` | Fall-through — unclassified, review | Fall-through — unclassified, review |
| `un.yearbook` | Fall-through — unclassified, review | Fall-through — unclassified, review |
| `icj.decision` | Native — OSCOLA_DISPATCH → formatItlosCase when tribunal or court is ITLOS, else formatIcjCase | Native — dispatchNzlsg → formatICJCase |
| `icj.pleading` | Fall-through — unclassified, review | Fall-through — unclassified, review |
| `arbitral.state_state` | Fall-through — unclassified, review | Fall-through — unclassified, review |
| `arbitral.individual_state` | Fall-through — unclassified, review | Fall-through — unclassified, review |
| `icc_tribunal.case` | Native — OSCOLA_DISPATCH → formatIccCase | Fall-through — unclassified, review |
| `wto.document` | Native — OSCOLA_DISPATCH → formatWtoReport | Fall-through — unclassified, review |
| `wto.decision` | Native — OSCOLA_DISPATCH → formatWtoReport | Fall-through — unclassified, review |
| `gatt.document` | Fall-through — unclassified, review | Fall-through — unclassified, review |
| `eu.official_journal` | Native — OSCOLA_DISPATCH → formatAssimilatedEuLaw when assimilated is set, else formatEuLegislation | Fall-through — unclassified, review |
| `eu.court` | Native — OSCOLA_DISPATCH → formatGeneralCourtCase for a T- case number or court General Court, else formatCjeuCase | Fall-through — unclassified, review |
| `echr.decision` | Native — OSCOLA_DISPATCH → formatEcommhrDecision when commission is set or the body is ECommHR; formatEcthrCase / formatEcthrDecision by isDecision | Fall-through — unclassified, review |
| `supranational.decision` | Native — OSCOLA_DISPATCH → formatEcommhrDecision when the body is ECommHR (or commission is set); other bodies keep the AGLC 14.4 form | Fall-through — unclassified, review |
| `supranational.document` | Native — OSCOLA_DISPATCH → formatCouncilOfEuropeDocument when the body is the Council of Europe, its Committee of Ministers or Parliamentary Assembly (or councilOfEurope is set); other bodies keep the AGLC 14.5 form | Fall-through — unclassified, review |

### Foreign domestic sources (AGLC4 Part V)

| Source type | OSCOLA 5 | NZLSG 3 |
|---|---|---|
| `foreign.canada` | Fall-through — jurisdiction-specific AGLC4 Part V form; AGLC rendering acceptable | Fall-through — jurisdiction-specific AGLC4 Part V form; AGLC rendering acceptable |
| `foreign.china` | Fall-through — jurisdiction-specific AGLC4 Part V form; AGLC rendering acceptable | Fall-through — jurisdiction-specific AGLC4 Part V form; AGLC rendering acceptable |
| `foreign.france` | Fall-through — jurisdiction-specific AGLC4 Part V form; AGLC rendering acceptable | Fall-through — jurisdiction-specific AGLC4 Part V form; AGLC rendering acceptable |
| `foreign.germany` | Fall-through — jurisdiction-specific AGLC4 Part V form; AGLC rendering acceptable | Fall-through — jurisdiction-specific AGLC4 Part V form; AGLC rendering acceptable |
| `foreign.hong_kong` | Fall-through — jurisdiction-specific AGLC4 Part V form; AGLC rendering acceptable | Fall-through — jurisdiction-specific AGLC4 Part V form; AGLC rendering acceptable |
| `foreign.malaysia` | Fall-through — jurisdiction-specific AGLC4 Part V form; AGLC rendering acceptable | Fall-through — jurisdiction-specific AGLC4 Part V form; AGLC rendering acceptable |
| `foreign.new_zealand` | Fall-through — jurisdiction-specific AGLC4 Part V form; AGLC rendering acceptable | Fall-through — jurisdiction-specific AGLC4 Part V form; AGLC rendering acceptable |
| `foreign.singapore` | Fall-through — jurisdiction-specific AGLC4 Part V form; AGLC rendering acceptable | Fall-through — jurisdiction-specific AGLC4 Part V form; AGLC rendering acceptable |
| `foreign.south_africa` | Fall-through — jurisdiction-specific AGLC4 Part V form; AGLC rendering acceptable | Fall-through — jurisdiction-specific AGLC4 Part V form; AGLC rendering acceptable |
| `foreign.uk` | Fall-through — jurisdiction-specific AGLC4 Part V form; AGLC rendering acceptable | Fall-through — jurisdiction-specific AGLC4 Part V form; AGLC rendering acceptable |
| `foreign.usa` | Fall-through — jurisdiction-specific AGLC4 Part V form; AGLC rendering acceptable | Fall-through — jurisdiction-specific AGLC4 Part V form; AGLC rendering acceptable |
| `foreign.other` | Fall-through — jurisdiction-specific AGLC4 Part V form; AGLC rendering acceptable | Fall-through — jurisdiction-specific AGLC4 Part V form; AGLC rendering acceptable |

### Custom and manual

| Source type | OSCOLA 5 | NZLSG 3 |
|---|---|---|
| `custom` | Fall-through — standard-neutral free text | Fall-through — standard-neutral free text |
| `explanatory_note` | Fall-through — standard-neutral free text | Fall-through — standard-neutral free text |

## Unclassified types (DECISION-040)

These fall through to the AGLC4 form because neither the guide text fetched on 22 September 2026 nor the repo's rule notes settle their form under the standard. They are listed for researchers in DECISION-040; when a form is confirmed the fixture entry becomes `native` (with a formatter) or `fallthrough-ok` (with a reason).

- **OSCOLA 5** (15): `case.unreported.no_mnc`, `case.arbitration`, `legislation.bill`, `legislation.explanatory`, `report.royal_commission`, `ip_material`, `constitutive_document`, `treaty.mou`, `un.charter`, `un.communication`, `un.yearbook`, `icj.pleading`, `arbitral.state_state`, `arbitral.individual_state`, `gatt.document`.
- **NZLSG 3** (21): `case.unreported.no_mnc`, `legislation.explanatory`, `report.royal_commission`, `ip_material`, `constitutive_document`, `treaty.mou`, `un.charter`, `un.communication`, `un.yearbook`, `icj.pleading`, `arbitral.state_state`, `arbitral.individual_state`, `icc_tribunal.case`, `wto.document`, `wto.decision`, `gatt.document`, `eu.official_journal`, `eu.court`, `echr.decision`, `supranational.decision`, `supranational.document`.

## Formatter wiring

Every exported formatter in the two rule trees and the source type that reaches it. `Condition` is the data gate the dispatcher checks before choosing the formatter; blank means the type alone selects it. The suite spies on each formatter through `formatCitation` (or the bibliography generator where noted) and fails for any export not listed here.

### OSCOLA (`src/engine/rules/oscola/*`)

39 formatters, 0 unwired.

| Module | Formatter | Reached via | Condition |
|---|---|---|---|
| `cases.ts` | `formatOscolaCase` | `case.reported` |  |
| `cases-scotland.ts` | `formatOscolaScottishCase` | `case.reported` | Scottish courtId or jurisdiction Scot |
| `cases-ni.ts` | `formatOscolaNICase` | `case.reported` | NI courtId or jurisdiction NI |
| `ireland.ts` | `formatIrishCase` | `case.reported` | Irish courtId or jurisdiction IE |
| `ireland.ts` | `formatIrishAct` | `legislation.statute` | jurisdiction IE |
| `ireland.ts` | `formatIrishStatutoryInstrument` | `legislation.statute` | jurisdiction IE with siNumber |
| `ireland.ts` | `formatBunreachtNaHEireann` | `legislation.constitution` | jurisdiction IE |
| `legislation.ts` | `formatOscolaPrimaryLegislation` | `legislation.statute` |  |
| `legislation.ts` | `formatOscolaSecondaryLegislation` | `legislation.delegated` |  |
| `parliamentary.ts` | `formatOscolaHansard` | `hansard` |  |
| `parliamentary.ts` | `formatOscolaCommandPaper` | `report.parliamentary` | reportType command_paper or seriesPrefix |
| `parliamentary.ts` | `formatOscolaLawCommission` | `report.law_reform` | reportNumber set |
| `parliamentary.ts` | `formatOscolaParliamentaryReport` | `report.parliamentary` |  |
| `secondary.ts` | `formatOscolaThesis` | `thesis` |  |
| `digital.ts` | `formatOscolaWebsite` | `internet_material` |  |
| `digital.ts` | `formatOscolaBlog` | `internet_material` | documentType Blog Post, blogName or isBlog |
| `digital.ts` | `formatOscolaSocialMedia` | `social_media` |  |
| `digital.ts` | `formatOscolaPodcast` | `film_tv_media` | medium Podcast or Radio |
| `digital.ts` | `formatOscolaVideo` | `film_tv_media` | medium Video / Online Video |
| `eu.ts` | `formatEuLegislation` | `eu.official_journal` |  |
| `eu.ts` | `formatCjeuCase` | `eu.court` |  |
| `eu.ts` | `formatGeneralCourtCase` | `eu.court` | caseNumber T-… or court General Court |
| `eu.ts` | `formatAssimilatedEuLaw` | `eu.official_journal` | assimilated set |
| `eu.ts` | `formatEuTreaty` | `treaty` | ojReference set |
| `echr.ts` | `formatEcthrCase` | `echr.decision` |  |
| `echr.ts` | `formatEcthrDecision` | `echr.decision` | isDecision set |
| `echr.ts` | `formatEcommhrDecision` | `echr.decision` | commission set or body ECommHR (also supranational.decision with body ECommHR) |
| `echr.ts` | `formatCouncilOfEuropeTreaty` | `treaty` | etsNumber or shortTitle set |
| `echr.ts` | `formatCouncilOfEuropeDocument` | `supranational.document` | body Council of Europe / Committee of Ministers / Parliamentary Assembly, or councilOfEurope set |
| `international.ts` | `formatTreaty` | `treaty` |  |
| `international.ts` | `formatUnDocument` | `un.document` |  |
| `international.ts` | `formatUnResolution` | `un.document` | resolutionNumber without a title, or documentType resolution |
| `international.ts` | `formatIcjCase` | `icj.decision` |  |
| `international.ts` | `formatItlosCase` | `icj.decision` | tribunal or court ITLOS (kept as an icj.decision sibling: the '(year) ITLOS Reports page' form parallels '[year] ICJ Rep page') |
| `international.ts` | `formatIccCase` | `icc_tribunal.case` |  |
| `international.ts` | `formatWtoReport` | `wto.document` |  |
| `genai.ts` | `formatGenAiCitation` | `genai_output` |  |
| `tables.ts` | `generateTableOfCases` | `case.reported` | bibliography: generateOscolaBibliography |
| `tables.ts` | `generateTableOfLegislation` | `legislation.statute` | bibliography: generateOscolaBibliography |

### NZLSG (`src/engine/rules/nzlsg/*`)

28 formatters, 0 unwired.

| Module | Formatter | Reached via | Condition |
|---|---|---|---|
| `cases.ts` | `formatNeutralCitation` | `case.reported` |  |
| `cases.ts` | `formatPreNeutralCase` | `case.reported` | fileNumber set |
| `maori-land-court.ts` | `formatMaoriLandCourt` | `case.quasi_judicial` | minuteBookAbbrev set |
| `waitangi.ts` | `formatWaitangiTribunalReport` | `report.waitangi_tribunal` |  |
| `treaty-of-waitangi.ts` | `formatTreatyOfWaitangi` | `treaty` | treatyOfWaitangi set |
| `legislation.ts` | `formatLegislation` | `legislation.statute` |  |
| `legislation.ts` | `formatDelegatedLegislation` | `legislation.delegated` |  |
| `legislation.ts` | `formatBill` | `legislation.bill` |  |
| `parliamentary.ts` | `formatNZPD` | `hansard` | nzpd set |
| `parliamentary.ts` | `formatSelectCommitteeSubmission` | `submission.government` | committee set |
| `parliamentary.ts` | `formatCabinetDocument` | `report.parliamentary` | cabinetDocument set |
| `parliamentary.ts` | `formatNZGazette` | `report.parliamentary` | gazette set |
| `parliamentary.ts` | `formatAJHR` | `report.parliamentary` | ajhr set |
| `secondary.ts` | `formatBook` | `book` |  |
| `secondary.ts` | `formatJournalArticle` | `journal.article` |  |
| `secondary.ts` | `formatLawCommission` | `report.law_reform` | reportType set |
| `secondary.ts` | `formatThesis` | `thesis` |  |
| `secondary.ts` | `formatOnlineLooseleaf` | `looseleaf` |  |
| `digital.ts` | `formatNZWebsite` | `internet_material` |  |
| `digital.ts` | `formatNZBlog` | `internet_material` | documentType Blog Post, blogName or isBlog, with an author and date |
| `digital.ts` | `formatNZSocialMedia` | `social_media` |  |
| `digital.ts` | `formatNZNewspaper` | `newspaper` |  |
| `digital.ts` | `formatNZBroadcast` | `film_tv_media` |  |
| `international.ts` | `formatTreaty` | `treaty` |  |
| `international.ts` | `formatUNDocument` | `un.document` |  |
| `international.ts` | `formatICJCase` | `icj.decision` |  |
| `styles.ts` | `formatGeneralSubsequent` | `case.reported` | subsequent reference, general style |
| `styles.ts` | `formatCommercialSubsequent` | `case.reported` | subsequent reference, nzlsgStyle commercial |

## Related

- `docs/standards-rule-notes.md` — the derived rule notes the fixtures cite by section, with the unresolved points that feed DECISION-040.
- `tests/fixtures/standards/README.md` — how the expectation tables and the `pending` convention work.
- `docs/decisions.md` DECISION-040 — the open rule questions for OSCOLA 5, OSCOLA 4, NZLSG 3 and court mode.
