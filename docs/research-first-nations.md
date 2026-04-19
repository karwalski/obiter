# Research: First Nations Materials for AGLC5 — Theme 4

**Story:** RESEARCH-004
**Status:** Draft
**Date:** 2026-04-18
**Author:** Matthew Watt

---

> **Acknowledgement.** This document was prepared by a non-Indigenous developer. It is a preliminary research survey only. The recommendations below explicitly call for partnership with First Nations legal scholars and communities before any implementation proceeds. Nothing in this document should be treated as a final design. The authority on how First Nations materials should be cited belongs to First Nations peoples.

---

## 1. Source Types That May Be Needed

The following categories of First Nations materials arise in Australian legal practice and scholarship. Each would potentially require its own source type (or sub-type) in Obiter's citation engine.

### 1.1 Native Title Determinations and Agreements

- Federal Court and High Court determinations under the *Native Title Act 1993* (Cth).
- Consent determinations, which are negotiated agreements registered with the Court.
- These already fall partly within existing case law citation rules (AGLC4 Part 2), but a dedicated type could carry additional metadata such as the relevant Nation(s) and Country.

### 1.2 Indigenous Land Use Agreements (ILUAs)

- Body corporate agreements, area agreements, and alternative procedure agreements registered on the National Native Title Tribunal (NNTT) Register of Indigenous Land Use Agreements.
- These are not legislation and not case law; they are sui generis statutory instruments with their own NNTT reference numbers.

### 1.3 Cultural Heritage Reports and Assessments

- Reports prepared under state and territory cultural heritage legislation (e.g., *Aboriginal Heritage Act 2006* (Vic), *Aboriginal Cultural Heritage Act 2003* (Qld)).
- Archaeological and anthropological survey reports commissioned for development approvals.
- Many of these have restricted access and cultural sensitivity considerations.

### 1.4 Oral Histories and Traditional Knowledge Records

- Recorded oral histories held by AIATSIS, land councils, community organisations, or universities.
- Traditional ecological knowledge records, songline documentation, language recordings.
- These raise fundamental questions about authorship, ownership, and access that Western citation frameworks are not well equipped to handle.

### 1.5 Aboriginal and Torres Strait Islander Community Governance Documents

- Community constitutions and governance rules (e.g., prescribed body corporate rule books under the *Native Title Act*).
- Community plans, strategic documents, and policy statements.

### 1.6 Land Council Decisions and Reports

- Decisions and annual reports of statutory land councils (e.g., Northern Land Council, Central Land Council, NSW Aboriginal Land Council).
- These are quasi-governmental bodies with statutory functions but are not departments of state.

### 1.7 Reconciliation Action Plans (RAPs)

- Published by organisations under the Reconciliation Australia framework (Reflect, Innovate, Stretch, Elevate).
- Increasingly cited in legal and policy scholarship.

### 1.8 Royal Commission and Inquiry Materials

- Royal Commission into Aboriginal Deaths in Custody (1991) — the report itself, individual case reports, and recommendations.
- Bringing Them Home report (1997) and related Stolen Generations testimony.
- Wiyi Yani U Thangani (Women's Safety) report (2020).
- Testimony, submissions, and transcripts from these proceedings.

### 1.9 Truth-Telling Commission Materials

- Yoorrook Justice Commission (Victoria) — Australia's first formal truth-telling process.
- Transcripts, submissions, findings, and community evidence sessions.
- Future truth-telling bodies that may be established at state or federal level.

---

## 2. Metadata Considerations

Citing First Nations materials responsibly requires metadata fields that standard legal citation does not typically accommodate.

### 2.1 Country and Nation Names

- Citations should be able to record the relevant First Nations Country or Nation — e.g., Wiradjuri, Wurundjeri, Yawuru, Noongar — not merely the state or territory jurisdiction code.
- Country names should use the spelling preferred by the relevant community (spellings vary and communities have authority over their own names).
- A single determination or agreement may involve multiple Nations.

### 2.2 Language Names

- Materials in or about First Nations languages should record the language name.
- Language names should follow the AIATSIS language thesaurus (Austlang) where available.
- Titles that include words in a First Nations language should preserve the original language, with an English translation where the author has provided one.

### 2.3 Community Self-Identification Preferences

- Some communities prefer specific terms (e.g., "Koori" in south-eastern Australia, "Murri" in Queensland, "Yolngu" in north-east Arnhem Land).
- The citation system should not impose a single generic label.
- Where a community or author has expressed a preference, the citation should respect it.

### 2.4 Oral Tradition vs Written Record

- Standard citation assumes a written, published document with a fixed text. Oral histories and traditional knowledge do not fit this model.
- Metadata should distinguish between: a written transcription of oral material, an audio/video recording, a published account of oral tradition, and a reference to living oral tradition (which may not have a fixed "source" in the Western sense).
- Attribution may be to a community rather than an individual.

### 2.5 Cultural Sensitivity Flags

- Some materials carry cultural restrictions — for example, materials that should not be viewed by uninitiated persons, materials relating to deceased persons, gender-restricted knowledge, or sacred site information.
- Obiter should support a sensitivity metadata field that can carry warnings such as:
  - "Aboriginal and Torres Strait Islander peoples are advised that this material may contain images or names of deceased persons."
  - "This material contains culturally sensitive content. Access may be restricted."
- The citation engine should never auto-retrieve or display restricted content without explicit user action.

### 2.6 Dual Naming

- Places, water bodies, and landmarks increasingly carry dual names (Traditional name and colonial name) — e.g., Uluru/Ayers Rock, Gariwerd/Grampians.
- The citation system should support dual names and allow the Traditional name to appear first, consistent with current government gazettal practice in most jurisdictions.

---

## 3. Existing Citation Guidance

### 3.1 AIATSIS Guidelines

- The Australian Institute of Aboriginal and Torres Strait Islander Studies (AIATSIS) publishes guidelines for referencing Aboriginal and Torres Strait Islander materials, with particular attention to:
  - Correct attribution to communities and knowledge holders.
  - Cultural protocols for citing restricted or sensitive materials.
  - Acknowledgement of Country in scholarly work.
- AIATSIS also maintains the Austlang database of Australian Indigenous languages, which could serve as an authority file for language name metadata.

### 3.2 National Native Title Tribunal Citation Conventions

- The NNTT uses its own reference numbering system for applications, determinations, and ILUAs (e.g., NNTT reference WC2004/010).
- Determinations are also cited by their Federal Court citation.
- The NNTT provides a searchable register that could serve as a data source for validation.

### 3.3 Comparable International Approaches

#### New Zealand — NZLSG and Waitangi Tribunal

- The New Zealand Law Style Guide provides specific citation rules for Waitangi Tribunal reports and claims.
- Waitangi Tribunal reports have a dedicated citation format: *Report title* (Waitangi Tribunal, year).
- Te reo Maori titles are preserved in citations, with macrons.
- This is the closest comparable system and a useful model.

#### Canada — Canadian Guide to Uniform Legal Citation (McGill Guide)

- The McGill Guide (9th edition) includes rules for citing Indigenous legal orders, treaties, and materials from the Truth and Reconciliation Commission of Canada.
- It recognises Indigenous legal traditions as distinct legal orders, not merely a subcategory of Canadian law.
- It provides guidance on citing oral testimony from the TRC.
- The McGill Guide's approach of treating Indigenous legal orders as a top-level category (rather than a subsection of "other sources") is worth considering.

#### United States — The Bluebook

- The Bluebook (21st edition) has limited guidance on citing tribal law and tribal court decisions.
- It treats tribal courts as a subcategory of "other courts" which has been criticised as inadequate.
- This approach should be avoided.

---

## 4. Recommendations for Obiter Implementation

### 4.1 Proposed Source Types

Subject to consultation (see section 4.4), the following source type identifiers are proposed as starting points for discussion:

| Source Type Identifier | Description |
|---|---|
| `indigenous.native_title_determination` | Federal Court/High Court native title determinations |
| `indigenous.ilua` | Indigenous Land Use Agreements registered with NNTT |
| `indigenous.land_council_report` | Land council decisions, reports, annual reports |
| `indigenous.oral_history` | Recorded oral histories, traditional knowledge records |
| `indigenous.cultural_heritage_report` | Cultural heritage assessments and surveys |
| `indigenous.governance` | Community constitutions, PBC rule books |
| `indigenous.rap` | Reconciliation Action Plans |
| `indigenous.truth_telling` | Truth-telling commission materials (Yoorrook, future bodies) |
| `indigenous.royal_commission` | Royal Commission materials specific to First Nations issues |

Note: the `indigenous.*` namespace is a working label. The appropriate top-level term should be determined through consultation — "First Nations", "Aboriginal and Torres Strait Islander", or another term preferred by the communities involved.

### 4.2 Metadata Fields Needed

Beyond the standard Obiter metadata fields, the following additional fields are proposed:

- `country`: string[] — the relevant First Nations Country or Countries.
- `nation`: string[] — the relevant Nation(s) or language group(s).
- `language`: string — the language of the material, using Austlang identifiers where applicable.
- `traditionalName`: string — the Traditional name for a place or entity.
- `colonialName`: string — the colonial/English name, where dual naming applies.
- `sensitivityWarning`: string — a cultural sensitivity notice, if applicable.
- `accessRestriction`: enum — e.g., `unrestricted`, `community_restricted`, `gender_restricted`, `deceased_persons`.
- `communityAttribution`: string — attribution to a community rather than an individual author.
- `oralSource`: boolean — whether the material originates from oral tradition.
- `nnttReference`: string — NNTT reference number for native title materials.

### 4.3 Sensitivity Handling

- The citation engine should check the `accessRestriction` field before any auto-retrieval or preview operation.
- If a sensitivity warning is present, it should be displayed to the user before the material is accessed.
- The UI should never auto-load or display thumbnails/previews of restricted materials.
- Deceased person warnings should be displayed where the `accessRestriction` includes `deceased_persons`.
- These behaviours should be on by default and require explicit user action to proceed, not an opt-in setting.

### 4.4 Consultation Requirement

**This is the most important recommendation in this document.**

The source types, metadata fields, and citation formats described above are preliminary proposals developed without First Nations input. Before any implementation:

1. **Engage First Nations legal scholars** — particularly those working in native title, Indigenous legal orders, and legal education — to review and reshape these proposals.
2. **Consult with AIATSIS** about their citation guidelines and whether a formal collaboration is appropriate.
3. **Engage with the Uluru Dialogue, NNTRC, and relevant land councils** where their materials are involved.
4. **Seek input from First Nations law students and academics** at Australian law schools, who are the most likely users of a citation tool in this space.
5. **Do not ship any `indigenous.*` source types until this consultation has occurred.** Getting this wrong is worse than not having the feature.

Potential consultation partners (to be approached respectfully and without assumption of participation):

- AIATSIS
- Indigenous legal academics at UNSW, Melbourne, ANU, UTS, Deakin, James Cook
- National Native Title Council
- NATSILS (National Aboriginal and Torres Strait Islander Legal Services)
- Yoorrook Justice Commission (for truth-telling citation conventions)
- Reconciliation Australia (for RAP citation conventions)

---

## 5. Open Questions

- Should `indigenous.*` be a top-level category (like `case`, `legislation`, `secondary`) or nested within existing categories where the material type overlaps (e.g., native title determinations within `case`)?
- How should the system handle materials where the relevant Nation or Country is unknown to the user?
- Should the system include an authority file of Country/Nation names, and if so, who maintains it?
- How should the citation format handle communal authorship?
- What is the appropriate way to cite oral tradition that has no fixed recording?

These questions cannot and should not be answered without First Nations input.

---

## References

- Australian Institute of Aboriginal and Torres Strait Islander Studies, *Guidelines for Ethical Research in Australian Indigenous Studies* (AIATSIS, 2012).
- Austlang: AIATSIS Language Thesaurus, <https://collection.aiatsis.gov.au/austlang/search>.
- National Native Title Tribunal, *Register of Native Title Claims*, <http://www.nntt.gov.au>.
- New Zealand Law Style Guide (3rd ed, 2018), ch 5.
- Canadian Guide to Uniform Legal Citation (McGill Guide) (9th ed, 2018), ch 8.
- Kirsten Anker, 'The Truth in Masquerade: Claimant Identity and Native Title Law' (2008) 33(1) *Alternative Law Journal* 7.
