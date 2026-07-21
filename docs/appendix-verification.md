# DATA-004 — Appendix A/B/C verification

**Source:** `aglc4-appendix.pdf` (37-page photo scan of AGLC4 printed pp 297–333;
kept as a local reference, **not** committed to the repo). OCR'd 2026-07-20 by
six parallel subagents; assembled to `appendix-a.tsv` / `-b.tsv` / `-c.tsv`.

## Actions taken (2026-07-20)

- **Appendix A (1,202 rows)** imported in full to `src/engine/data/appendix-a-series.ts`
  and unioned into `ALL_REPORT_SERIES` (curated core first — it still drives the
  rule 2.2.2 hierarchy and wins on shared abbreviations; every appendix entry not
  already curated is appended for search / autocomplete / browse). Added optional
  `years` coverage field to `ReportSeriesEntry`.
- **Appendix B (89 identifiers)** — 51 new court/tribunal identifiers added to
  `court-identifiers.ts` (jurisdiction/level inferred; appendix prints no years).
- **Appendix C (29 rows)** — `pinpoint-abbrevs.ts` rewritten to the full table:
  new descriptors (amendment, figure, item, note, sub-regulation, sub-rule, table,
  title, annexure, preamble), jurisdiction-scoped variants (chapter → ch/c/cap,
  section → s/§) and a `use` scope field.
- **Decisions:** DECISION-015 (ACTR era-split), DECISION-024 (ord/ords), DECISION-026
  (bare "Ex" = Exchequer Reports) **resolved**; DECISION-023/025 **updated**;
  **DECISION-031 raised** — Appendix A shows Queensland Reports changed citation
  from "Qd R" (1958–Mar 2020) to "QR" (Apr 2020–), reversing the earlier
  "QR is fabricated" call (flagged for researcher sign-off).
- **Marker caveat:** the scanned `*` (authorised) markers were found to be
  under-captured (eg CLR read as unmarked), so *absence* of a marker was **not**
  used to downgrade curated authorised series — the curated classification remains
  the authority for the rule 2.2.2 tier.
- **Tests/gates:** full suite 3,005 passing; `tsc --noEmit` and ESLint clean.

---

- Appendix A entries (scan): **1202** (1150 distinct abbreviations)
- Curated `report-series.ts` entries: **193**
- Appendix A entries NOT in curated dataset (coverage gap now filled): **1047**
- Curated entries NOT in Appendix A (medium-neutral ids + non-App-A foreign series): **88**

## Authorised-flag mismatches (appendix `*` vs curated `type`)

- `ACTR` — Australian Capital Territory Reports: curated type=`unauthorised_generalist`, appendix marker=`*`
- `ALD` — Administrative Law Decisions: curated type=`unauthorised_generalist`, appendix marker=`†`
- `CLR` — Commonwealth Law Reports: curated type=`authorised`, appendix marker=`(none)`
- `Cal 4th` — California Reports (Fourth Series): curated type=`authorised`, appendix marker=`(none)`
- `ER` — English Reports: curated type=`authorised`, appendix marker=`(none)`
- `FC` — Federal Court Reports (Canada): curated type=`authorised`, appendix marker=`(none)`
- `FCR` — Federal Court Reports: curated type=`authorised`, appendix marker=`(none)`
- `Fam` — Family Division: curated type=`authorised`, appendix marker=`(none)`
- `IR` — Industrial Reports: curated type=`unauthorised_subject`, appendix marker=`*`
- `IR` — Industrial Reports: curated type=`unauthorised_subject`, appendix marker=`‡`
- `IR` — Irish Reports: curated type=`authorised`, appendix marker=`(none)`
- `NE 2d` — North Eastern Reporter (Second Series): curated type=`unauthorised_generalist`, appendix marker=`*`
- `NSWLR` — New South Wales Law Reports: curated type=`authorised`, appendix marker=`(none)`
- `NTR` — Northern Territory Reports: curated type=`authorised`, appendix marker=`(none)`
- `NW 2d` — North Western Reporter (Second Series): curated type=`unauthorised_generalist`, appendix marker=`*`
- `NY 2d` — New York Reports (Second Series): curated type=`authorised`, appendix marker=`(none)`
- `OR` — Ontario Reports: curated type=`authorised`, appendix marker=`(none)`
- `P 2d` — Pacific Reporter (Second Series): curated type=`unauthorised_generalist`, appendix marker=`*`
- `P 3d` — Pacific Reporter (Third Series): curated type=`unauthorised_generalist`, appendix marker=`*`
- `PCIJ (ser A/B)` — Permanent Court of International Justice Series A/B: Judgments, Orders and Advisory Opinions: curated type=`authorised`, appendix marker=`(none)`
- `PCIJ (ser B)` — Permanent Court of International Justice Series B: Collection of Advisory Opinions: curated type=`authorised`, appendix marker=`(none)`
- `Qd R` — Queensland Reports: curated type=`authorised`, appendix marker=`(none)`
- `RIAA` — Reports of International Arbitral Awards: curated type=`authorised`, appendix marker=`(none)`
- `SE 2d` — South Eastern Reporter (Second Series): curated type=`unauthorised_generalist`, appendix marker=`*`
- `SLR` — Singapore Law Reports: curated type=`authorised`, appendix marker=`(none)`
- `SW 3d` — South Western Reporter (Third Series): curated type=`unauthorised_generalist`, appendix marker=`*`
- `So 2d` — Southern Reporter (Second Series): curated type=`unauthorised_generalist`, appendix marker=`*`
- `Tas LR` — Tasmanian Law Reports: curated type=`authorised`, appendix marker=`(none)`
- `Tas SR` — Tasmanian State Reports: curated type=`authorised`, appendix marker=`(none)`

## Full-name mismatches (shared abbreviation, differing name)

- `AC` — curated: "Appeal Cases"  |  appendix: "Law Reports, Appeal Cases"
- `AILR` — curated: "Australian Indigenous Law Reporter"  |  appendix: "Australian Industrial Law Reports | Australian Industrial Law Review"
- `APR` — curated: "Australian Patent Reports"  |  appendix: "Atlantic Provinces Reports"
- `AR (NSW)` — curated: "Arbitration Reports (New South Wales)"  |  appendix: "Industrial Arbitration Reports"
- `BCLC` — curated: "Building and Construction Law Cases"  |  appendix: "Butterworths' Company Law Cases"
- `BCLC` — curated: "Butterworths Company Law Cases (UK)"  |  appendix: "Butterworths' Company Law Cases"
- `BCLR` — curated: "British Columbia Law Reports"  |  appendix: "British Columbia Law Reports, First Series"
- `BPR` — curated: "Building and Property Reports"  |  appendix: "Butterworths' Property Reports"
- `Ch` — curated: "Chancery"  |  appendix: "Law Reports, Chancery Division"
- `ECR` — curated: "European Court Reports"  |  appendix: "European Court Reports, Reports of Cases before the Court | European Court Reports, Reports of Cases before the Court of Justice and the Court of First Instance"
- `F Supp` — curated: "Federal Supplement"  |  appendix: "Federal Supplement, District Court Reports"
- `F Supp 2d` — curated: "Federal Supplement (Second Series)"  |  appendix: "Federal Supplement, District Court Reports, Second Series"
- `FC` — curated: "Federal Court Reports (Canada)"  |  appendix: "Faculty Collection, New Series | Faculty Collection, Old Series | Federal Court Reports"
- `FLC` — curated: "Family Law Cases"  |  appendix: "Australian Family Law Cases"
- `Fam` — curated: "Family Division"  |  appendix: "Law Reports, Family Division"
- `HKLRD` — curated: "Hong Kong Law Reports and Digest"  |  appendix: "Authorised Hong Kong Law Reports and Digest"
- `IR` — curated: "Irish Reports"  |  appendix: "Industrial Reports | Irish Reports, Fifth Series | Law Reports, Ireland, Fourth Series"
- `KB` — curated: "King's Bench"  |  appendix: "Law Reports, King's Bench Division"
- `L Ed` — curated: "Lawyers' Edition"  |  appendix: "United States Supreme Court Reports, Lawyer's Edition, First Series"
- `L Ed 2d` — curated: "Lawyers' Edition (Second Series)"  |  appendix: "United States Supreme Court Reports, Lawyers' Edition, Second Series"
- `LGERA` — curated: "Local Government and Environment Reports of Australia"  |  appendix: "Local Government and Environmental Reports of Australia"
- `PCIJ (ser A)` — curated: "Permanent Court of International Justice Series A: Collection of Judgments"  |  appendix: "Publications of the Permanent Court of International Justice, Series A"
- `PCIJ (ser A/B)` — curated: "Permanent Court of International Justice Series A/B: Judgments, Orders and Advisory Opinions"  |  appendix: "Publications of the Permanent Court of International Justice, Series A/B"
- `PCIJ (ser B)` — curated: "Permanent Court of International Justice Series B: Collection of Advisory Opinions"  |  appendix: "Publications of the Permanent Court of International Justice, Series B"
- `QB` — curated: "Queen's Bench"  |  appendix: "Law Reports, Queen's Bench Division"
- `RIAA` — curated: "Reports of International Arbitral Awards"  |  appendix: "United Nations Reports of International Arbitral Awards"
- `RPC` — curated: "Reports of Patent Cases"  |  appendix: "Reports of Patent, Design and Trade Mark Cases"
- `SCR` — curated: "Supreme Court Reports"  |  appendix: "Canada Law Reports, Supreme Court of Canada | Canada Supreme Court Reports | Supreme Court Reports, Supreme Court of India"
- `SR (WA)` — curated: "Western Australian Supreme Court Reports"  |  appendix: "State Reports, Western Australia"
- `TCLR` — curated: "Trade and Commerce Law Reports"  |  appendix: "Trade and Competition Law Reports"
- `US` — curated: "United States Reports"  |  appendix: "United States Supreme Court Reports"

## Curated entries not present in Appendix A

`AATA`, `AATR`, `ACAT`, `ACHPR`, `ACTCA`, `ACTMC`, `ACTSC`, `AGLR`, `AIJLF`, `AIR`, `ATS`, `Aust Ins LR`, `BCL`, `CLLC`, `Crim LJ`, `ECHR`, `EWCA Civ`, `EWCA Crim`, `EWHC`, `F 4th`, `F Supp 3d`, `FCA`, `FCAFC`, `FMCA`, `FamCA`, `FamCAFC`, `FedCFamC1A`, `HCA`, `HKCA`, `HKCFA`, `HRLRA`, `IACtHR (ser C)`, `ICC`, `ICJ Reports`, `ICSID`, `ICTR`, `ICTY`, `ITLOS`, `LNTS`, `NNTT`, `NSWCA`, `NSWCCA`, `NSWCCR`, `NSWCIMC`, `NSWCR`, `NSWDC`, `NSWDCR`, `NSWIR`, `NSWLEC`, `NSWSC`, `NSWWCC`, `NTCA`, `NTLJ`, `NTMC`, `NZELR`, `NZHC`, `NZSC`, `PC`, `QCAT`, `QDC`, `QMC`, `QSC`, `SACAT`, `SADC`, `SAET`, `SASC`, `SASCFC`, `SCC`, `SGCA`, `SGHC`, `SR (SA)`, `St R Qd`, `TASFC`, `TASMC`, `Tax Cas`, `UKHL`, `UKPC`, `UKSC`, `UNTS`, `VCAT`, `VCC`, `VMC`, `VSC`, `VicRp`, `WADC`, `WASAT`, `WASC`, `ZACC`
