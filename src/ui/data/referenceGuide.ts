export interface ReferenceGuideEntry {
  id: string;           // e.g., "GEN-002"
  ruleNumber: string;   // e.g., "1.1.2"
  title: string;
  summary: string;      // 2-3 sentence plain-text summary of the rule
  examples: string[];   // Example citations or text demonstrating the rule
  tips: string[];       // Practical tips for authors
}

export const referenceGuideEntries: ReferenceGuideEntry[] = [
  {
    id: "GEN-002",
    ruleNumber: "1.1.2",
    title: "Footnote Number Positioning",
    summary:
      "Footnote reference numbers should appear at the end of a sentence, after the closing punctuation mark. Where it is necessary for clarity, a footnote number may be placed directly after the relevant word or phrase within a sentence, but this should be avoided where possible.",
    examples: [
      "The High Court held that the legislation was valid.1",
      "The term 'proportionality'1 has been interpreted differently across jurisdictions.",
    ],
    tips: [
      "Always place footnote numbers after punctuation (full stops, commas, semicolons) at the end of a clause or sentence.",
      "Only place a footnote number mid-sentence when the reference would otherwise be ambiguous.",
      "Footnote numbers should appear in superscript without any surrounding punctuation or brackets.",
    ],
  },
  {
    id: "GEN-012",
    ruleNumber: "1.5.1",
    title: "Short Quotation Formatting",
    summary:
      "Quotations of three lines or fewer should be enclosed in single quotation marks and run into the body text. Quotations within quotations alternate between single and double quotation marks: single for the outer quote, double for the nested quote, and single again for a further nested quote.",
    examples: [
      "As Brennan J observed, 'the power is not unlimited'.",
      "The court noted that 'the phrase \"beyond reasonable doubt\" requires no further elaboration'.",
      "Smith argued that 'the witness stated \"I heard him say 'stop' loudly\" before leaving'.",
    ],
    tips: [
      "Use single quotation marks (' ') for short quotations, not double (\u201c \u201d).",
      "Quotations longer than three lines should be set as indented block quotations without quotation marks (see Rule 1.5.1).",
      "Alternate quotation marks for nested quotes: single \u2192 double \u2192 single.",
    ],
  },
  {
    id: "GEN-014",
    ruleNumber: "1.5.2",
    title: "Introducing Quotations",
    summary:
      "How a quotation is introduced depends on its grammatical relationship to the preceding text. If the introductory text forms a complete clause, use a colon before the quotation. If the quotation is grammatically integrated into the sentence, no colon is needed. When altering the capitalisation of the first word to fit the sentence, enclose the changed letter in square brackets.",
    examples: [
      "The court stated: 'The evidence was insufficient'.",
      "The court found that 'the evidence was insufficient'.",
      "The court held that '[t]he evidence was insufficient to establish liability'.",
    ],
    tips: [
      "Use a colon when the introductory text is a complete grammatical clause (e.g., 'The court stated:').",
      "Integrate the quotation seamlessly when it forms part of the sentence's grammar (e.g., 'the court held that ...').",
      "Use square brackets around a letter when you change its case to fit the sentence, e.g., '[T]he' or '[t]he'.",
    ],
  },
  {
    id: "GEN-015",
    ruleNumber: "1.5.3",
    title: "Ellipses in Quotations",
    summary:
      "When omitting words from a quotation, use a spaced ellipsis to indicate the omission. The AGLC4 ellipsis consists of three full stops separated by spaces ( ... ) with a space before and after the ellipsis. An ellipsis should not be used at the beginning or end of a quotation.",
    examples: [
      "The court held that 'the Act ... does not extend to such circumstances'.",
      "'Freedom of expression ... is not an absolute right'.",
    ],
    tips: [
      "Use three spaced full stops ( ... ) for ellipses, not the single ellipsis character (\u2026) or three unspaced periods (...).",
      "Do not place an ellipsis at the very start or very end of a quotation.",
      "If omitting material that spans one or more sentences, still use a single spaced ellipsis.",
    ],
  },
  {
    id: "GEN-016",
    ruleNumber: "1.5.4, 1.5.5",
    title: "Editing Quotations and [sic]",
    summary:
      "Any additions or alterations to a quotation must be enclosed in square brackets. This includes changes to grammar, tense, or capitalisation needed to integrate the quotation into the surrounding text. The notation [sic] in italics should be placed immediately after an error in the original source to indicate that the error is in the original, not introduced by the author.",
    examples: [
      "'[T]he defendant argued that [the legislation] was unconstitutional'.",
      "The witness stated that 'he was their [sic] at the time'.",
      "'The plaintiff[s] were aware of the risk'.",
    ],
    tips: [
      "Use square brackets [ ] for any word or letter you add, change, or alter within a quotation.",
      "Italicise [sic] when indicating an error in the original source: [sic].",
      "Place [sic] immediately after the error without any additional punctuation.",
      "Do not correct the original error when using [sic] \u2014 reproduce the text as it appears in the source.",
    ],
  },
  {
    id: "GEN-017",
    ruleNumber: "1.5.6",
    title: "Quotation Closing Punctuation",
    summary:
      "Under AGLC4, punctuation is placed outside the closing quotation mark unless the punctuation is part of the original quoted material. This follows the logical (British/Australian) convention rather than the American convention of placing punctuation inside quotation marks.",
    examples: [
      "The court described the doctrine as 'untenable'.",
      "Was the conduct truly 'reasonable'?",
      "The judge asked: 'Is there any further evidence?'",
    ],
    tips: [
      "Place commas and full stops outside the closing quotation mark unless they appear in the original quoted text.",
      "If the quoted material itself ends with a question mark or exclamation mark, that punctuation stays inside the quotation mark.",
      "Do not double up punctuation \u2014 if the quote ends with a question mark, do not add a full stop outside the closing quotation mark.",
    ],
  },
  {
    id: "GEN-018",
    ruleNumber: "1.5.7",
    title: "Omitting Citations and Adding Emphasis",
    summary:
      "When citations are omitted from quoted material, note this with '(citations omitted)' after the quotation. When emphasis is added to a quotation by the author, note this with '(emphasis added)' after the quotation. If the emphasis existed in the original, use '(emphasis in original)' to clarify.",
    examples: [
      "'The principle has been affirmed repeatedly' (citations omitted).",
      "'The requirement is mandatory' (emphasis added).",
      "'The requirement is absolutely mandatory' (emphasis in original).",
      "'The test requires a causal connection' (citations omitted) (emphasis added).",
    ],
    tips: [
      "Place parenthetical notations such as '(citations omitted)' and '(emphasis added)' after the closing quotation mark but before the footnote number.",
      "Multiple notations can be combined in sequence, each in its own parentheses.",
      "Always indicate when you have added emphasis (e.g., italics or bold) to quoted material.",
      "If the original source already contained emphasis, use '(emphasis in original)' to make this clear.",
    ],
  },
  {
    id: "GEN-020",
    ruleNumber: "1.6.2",
    title: "Punctuation \u2014 Commas",
    summary:
      "AGLC4 does not require the Oxford (serial) comma before the final item in a list. A comma is only used before 'and' or 'or' in a list if it is necessary to avoid ambiguity. In general, follow standard Australian English comma usage.",
    examples: [
      "The court considered the evidence, submissions and precedent.",
      "The parties included the plaintiff, the first defendant, and the insurer and its agent.",
    ],
    tips: [
      "Do not use the Oxford comma as a matter of course. Only insert a comma before 'and'/'or' in a list when omitting it would cause ambiguity.",
      "Use commas to separate introductory phrases, parenthetical clauses, and items in a simple list.",
      "When a list item itself contains 'and' or 'or', a serial comma before the conjunction may be needed for clarity.",
    ],
  },
  {
    id: "GEN-022",
    ruleNumber: "1.6.4, 1.6.5",
    title: "Parentheses and Square Brackets",
    summary:
      "Round parentheses are used for subsidiary or explanatory text within the author's own writing. Square brackets are used for editorial insertions or alterations within quoted material. If parentheses are needed within text that is already in parentheses, use square brackets for the inner parenthetical.",
    examples: [
      "The doctrine of precedent (stare decisis) is fundamental to the common law.",
      "The court observed that '[t]he plaintiff failed to establish causation'.",
      "The Act (Competition and Consumer Act 2010 (Cth) [formerly the Trade Practices Act 1974 (Cth)]) was amended.",
    ],
    tips: [
      "Use round parentheses ( ) for your own explanatory asides and subsidiary information.",
      "Use square brackets [ ] for any insertion or alteration within quoted material.",
      "When nesting, place square brackets inside round parentheses: ( ... [ ... ] ... ).",
      "Avoid excessive nesting of parentheses \u2014 consider restructuring the sentence if brackets become hard to follow.",
    ],
  },
  {
    id: "GEN-024",
    ruleNumber: "1.8.1",
    title: "Italicisation for Emphasis",
    summary:
      "Italics may be used sparingly to emphasise particular words or phrases in the author's own text. When emphasis is added to quoted material through italics, the author must indicate this by including '(emphasis added)' after the quotation. Overuse of italics for emphasis diminishes their effect.",
    examples: [
      "The requirement is that the conduct must be voluntary.",
      "'The duty of care is non-delegable' (emphasis added).",
    ],
    tips: [
      "Use italics for emphasis sparingly \u2014 if everything is emphasised, nothing is.",
      "When you italicise words within a quotation that were not italicised in the original, always note '(emphasis added)'.",
      "Do not use bold, underlining, or capitals for emphasis in academic legal writing.",
    ],
  },
  {
    id: "GEN-026",
    ruleNumber: "1.8.3",
    title: "Italicisation of Foreign Words",
    summary:
      "Foreign words and phrases that have not been absorbed into common English usage should be italicised. However, foreign words that are in common use in English, including many Latin legal terms, should not be italicised. The Macquarie Dictionary is the reference for whether a foreign word has been adopted into Australian English.",
    examples: [
      "The concept of Zeitgeist influenced the decision.",
      "The writ of habeas corpus was sought.",
      "The defence raised the principle of volenti non fit injuria.",
      "The court applied the prima facie test.",
    ],
    tips: [
      "Do not italicise common Latin legal terms: habeas corpus, prima facie, bona fide, ex parte, inter alia, de facto, de jure, per se, pro rata, ultra vires, etc.",
      "Italicise foreign words and phrases not in common English usage, including less common Latin terms.",
      "Check the Macquarie Dictionary if unsure whether a foreign word has been absorbed into English.",
      "Case names and legislation titles have their own italicisation rules \u2014 this rule applies only to foreign words used in running text.",
    ],
  },
  {
    id: "GEN-027",
    ruleNumber: "1.9.1",
    title: "Spelling \u2014 Official Dictionary",
    summary:
      "The Macquarie Dictionary is the authoritative reference for spelling under AGLC4. Australian English spelling conventions should be followed, including '-ise' rather than '-ize' suffixes and '-our' rather than '-or' endings. Where the Macquarie Dictionary offers variant spellings, the first listed spelling should be used.",
    examples: [
      "Use 'organisation' not 'organization'.",
      "Use 'honour' not 'honor'.",
      "Use 'defence' not 'defense'.",
      "Use 'judgement' in ordinary prose, but 'judgment' when referring to a court's decision.",
    ],
    tips: [
      "Always use Australian English spelling as per the Macquarie Dictionary.",
      "Prefer '-ise' over '-ize' (e.g., 'recognise', 'authorise').",
      "Prefer '-our' over '-or' (e.g., 'colour', 'favour', 'honour').",
      "When the Macquarie Dictionary lists multiple spellings, use the first entry.",
      "Note the distinction: 'judgement' (general usage) vs 'judgment' (a court's formal decision).",
    ],
  },
  {
    id: "GEN-028",
    ruleNumber: "1.9.2, 1.9.3",
    title: "Grammar \u2014 Official Guide and Inclusive Language",
    summary:
      "Fowler's Dictionary of Modern English Usage is the recommended reference for grammar and usage questions under AGLC4. Authors should use inclusive, gender-neutral language throughout their writing. Avoid gendered pronouns when the gender of the person is unknown or when referring to people in general; use 'they' as a singular pronoun or restructure sentences to avoid the issue.",
    examples: [
      "Use 'they' instead of 'he or she': 'A judge must ensure they act impartially'.",
      "Use 'chairperson' or 'chair' instead of 'chairman'.",
      "Use 'police officer' instead of 'policeman'.",
      "Restructure: 'Judges must ensure impartiality' rather than 'A judge must ensure his or her impartiality'.",
    ],
    tips: [
      "Consult Fowler's Dictionary of Modern English Usage for grammar and usage questions.",
      "Use singular 'they' when referring to a person whose gender is unknown or unspecified.",
      "Replace gendered nouns with gender-neutral alternatives (e.g., 'firefighter' not 'fireman').",
      "Restructure sentences to avoid gendered pronouns where possible.",
      "Be consistent in your approach to inclusive language throughout the document.",
    ],
  },
  {
    id: "GENAI-001",
    ruleNumber: "7.12 (interim)",
    title: "Citing AI-Generated Content",
    summary:
      "Under the Melbourne University Law Review interim guidance, AI-generated content (such as output from ChatGPT, Claude or Gemini) is cited as written correspondence under AGLC4 Rule 7.12. The AI platform and model are treated as the sender, and the user is the recipient.",
    examples: [
      "Correspondence from ChatGPT (OpenAI, GPT-4) to the author, 15 March 2025.",
      "Correspondence from Claude (Anthropic, Claude 3.5 Sonnet) to the author, 10 January 2026 <https://claude.ai/chat/abc123>.",
    ],
    tips: [
      "Identify both the platform name and the specific model used (e.g., 'ChatGPT (OpenAI, GPT-4)' rather than just 'ChatGPT').",
      "Use 'the author' as the recipient unless the correspondence was directed to a named third party.",
      "Include a URL in angle brackets if the chat session has a shareable link.",
      "This interim guidance will likely change when AGLC5 is published with dedicated rules for AI-generated content.",
    ],
  },

  // ──────────────────────────────────────────────
  // Chapter 2 — Cases
  // ──────────────────────────────────────────────
  {
    id: "CASE-REF-001",
    ruleNumber: "2.1",
    title: "Case Name Formatting",
    summary:
      "Case names are italicised in both footnotes and the text. Party names are separated by 'v' (italic, no full stop). Omit given names and use only surnames for individual parties. The Crown is cited as 'R' for criminal matters and 'The King' or 'The Queen' for civil matters involving the Crown.",
    examples: [
      "Mabo v Queensland (No 2) (1992) 175 CLR 1.",
      "R v Tang (2008) 237 CLR 1.",
    ],
    tips: [
      "Use a lowercase italic 'v' (not 'vs' or 'v.') to separate party names.",
      "Omit first names, initials, and titles of individual parties — use surnames only.",
    ],
  },
  {
    id: "CASE-REF-002",
    ruleNumber: "2.2",
    title: "Reported Decisions",
    summary:
      "Reported decisions are cited with the case name, year, volume number, report series abbreviation, and starting page number. The year appears in round parentheses when the report series uses sequential volume numbering, or in square brackets when the year is the volume identifier. Include a court identifier in parentheses only when the court is not obvious from the report series.",
    examples: [
      "Pape v Federal Commissioner of Taxation (2009) 238 CLR 1.",
      "Thoroughvision Pty Ltd v Sky Channel Pty Ltd [2010] FCA 1135.",
    ],
    tips: [
      "Use round brackets for the year when volumes are numbered sequentially: (2009) 238 CLR 1.",
      "Use square brackets when the year itself identifies the volume: [2010] 2 AC 534.",
    ],
  },
  {
    id: "CASE-REF-003",
    ruleNumber: "2.3",
    title: "Unreported Decisions (Medium Neutral Citations)",
    summary:
      "Unreported decisions use the medium neutral citation (MNC) format assigned by the court. The MNC consists of the case name, the year in square brackets, the court identifier, and the judgment number. No page or paragraph pinpoint uses 'p' — use the judgment number alone. Include the full date if no MNC is available.",
    examples: [
      "Kadir v The Queen [2020] HCA 1.",
      "Smith v Jones [2023] NSWSC 456, [32].",
    ],
    tips: [
      "Always prefer the medium neutral citation for unreported decisions when one is available.",
      "Pinpoint references in MNC decisions use paragraph numbers in square brackets, e.g., [32].",
    ],
  },
  {
    id: "CASE-REF-004",
    ruleNumber: "2.4",
    title: "Judicial Officers in Citations",
    summary:
      "When referring to a judicial officer in text, use the appropriate abbreviated title after their surname. High Court justices are cited with the post-nominal relevant to the period in question. For joint judgments, list judicial officers separated by commas with 'and' before the last name.",
    examples: [
      "Brennan J held that the power was not unlimited.",
      "Gleeson CJ, Gummow and Hayne JJ delivered a joint judgment.",
    ],
    tips: [
      "Use abbreviated post-nominals: J (Justice), JJ (Justices), CJ (Chief Justice), JA (Justice of Appeal), P (President).",
      "When two or more judges deliver a joint judgment, place the plural post-nominal after the last name only: 'Gummow and Hayne JJ'.",
    ],
  },

  {
    id: "CASE-REF-005",
    ruleNumber: "2.5",
    title: "Pinpoint References in Cases",
    summary:
      "Pinpoint references in cases direct the reader to a specific page, paragraph or section of a judgment. For law reports with page numbers, cite the specific page after the starting page, separated by a comma. For medium neutral citations, use paragraph numbers in square brackets.",
    examples: [
      "Mabo v Queensland (No 2) (1992) 175 CLR 1, 42.",
      "Kadir v The Queen [2020] HCA 1, [15]–[20].",
    ],
    tips: [
      "Use a comma to separate the starting page from the pinpoint page: 175 CLR 1, 42.",
      "For paragraph pinpoints in MNC decisions, use square brackets and an en-dash for ranges: [15]–[20].",
    ],
  },

  // ──────────────────────────────────────────────
  // Chapter 3 — Legislation
  // ──────────────────────────────────────────────
  {
    id: "LEG-REF-001",
    ruleNumber: "3.1",
    title: "Statute Citation",
    summary:
      "Statutes are cited with their full title in italics, the year, and the jurisdiction abbreviation in round parentheses. The jurisdiction abbreviation is mandatory unless the jurisdiction is obvious from the context. Pinpoint references cite specific sections using 's' for a single section and 'ss' for multiple sections.",
    examples: [
      "Corporations Act 2001 (Cth) s 181.",
      "Evidence Act 1995 (NSW) ss 135\u2013137.",
    ],
    tips: [
      "Always include the jurisdiction abbreviation in parentheses, e.g., (Cth), (Vic), (NSW).",
      "Use 's' for a single section and 'ss' for a range or multiple sections — do not use the section symbol (\u00a7).",
    ],
  },
  {
    id: "LEG-REF-002",
    ruleNumber: "3.4",
    title: "Delegated Legislation",
    summary:
      "Delegated legislation (regulations, rules, orders) is cited similarly to primary legislation: the title in italics, the year, and the jurisdiction abbreviation. Where the enabling Act is not obvious from the title of the delegated legislation, include a cross-reference to the parent Act.",
    examples: [
      "Competition and Consumer Regulations 2010 (Cth) reg 41.",
      "Fair Work Regulations 2009 (Cth) sch 3.1.",
    ],
    tips: [
      "Use 'reg' for regulation and 'regs' for multiple regulations as pinpoint abbreviations.",
      "Cite the enabling Act in a cross-reference when the relationship is not obvious from the delegated legislation's title.",
    ],
  },
  {
    id: "LEG-REF-003",
    ruleNumber: "3.6",
    title: "Constitutional Citations",
    summary:
      "The Australian Constitution is cited as 'Australian Constitution' in italics, with no year or jurisdiction abbreviation. References to specific sections, chapters or parts follow the title directly. State constitutions include the jurisdiction abbreviation.",
    examples: [
      "Australian Constitution s 51(xxxi).",
      "Constitution Act 1975 (Vic) s 18.",
    ],
    tips: [
      "Do not include a year or jurisdiction for the Australian Constitution — it is cited simply as 'Australian Constitution'.",
      "Use lowercase Roman numerals in parentheses for paragraph references within constitutional sections, e.g., s 51(xxxi).",
    ],
  },

  {
    id: "LEG-REF-004",
    ruleNumber: "3.3",
    title: "Bills",
    summary:
      "Bills before parliament are cited with the title in italics, the year, and the jurisdiction abbreviation in parentheses. Since bills are not yet enacted legislation, include the stage of the bill (e.g., as introduced, as passed) if relevant to the discussion.",
    examples: [
      "Privacy Legislation Amendment (Enforcement and Other Measures) Bill 2022 (Cth).",
    ],
    tips: [
      "Cite bills similarly to Acts but note they have not been enacted — do not refer to a bill as an Act.",
      "If discussing the bill at a particular stage, note this in parentheses, e.g., '(as introduced)'.",
    ],
  },

  // ──────────────────────────────────────────────
  // Chapter 4 — Secondary Sources General
  // ──────────────────────────────────────────────
  {
    id: "SEC-REF-001",
    ruleNumber: "4.1",
    title: "Author Formatting",
    summary:
      "Authors are listed with their first name (or initial) followed by their surname. Post-nominals and titles are omitted. For two or three authors, list all names separated by commas with 'and' before the final author. For four or more authors, list the first author followed by 'et al'.",
    examples: [
      "Mark Aronson, Matthew Groves and Greg Weeks, ...",
      "Jane Smith et al, ...",
    ],
    tips: [
      "Omit post-nominals (QC, SC, AM) and academic titles (Professor, Dr) from author names.",
      "Use 'et al' (not italicised) for works with four or more authors, listing only the first author.",
    ],
  },
  {
    id: "SEC-REF-002",
    ruleNumber: "4.2",
    title: "Title Formatting (Italic vs Quotation Marks)",
    summary:
      "Titles of independently published works (books, reports, legislation) are italicised. Titles of works published as part of a larger work (journal articles, book chapters, essays) are enclosed in single quotation marks and not italicised. Capitalise all significant words in titles.",
    examples: [
      "Michael Kirby, Judicial Activism (Federation Press, 2004).",
      "Sarah Joseph, 'Human Rights in the High Court' (2005) 29 Melbourne University Law Review 1.",
    ],
    tips: [
      "Italicise titles of books, reports, and standalone publications.",
      "Use single quotation marks (not double) for article and chapter titles.",
    ],
  },
  {
    id: "SEC-REF-003",
    ruleNumber: "4.4",
    title: "URLs in Citations",
    summary:
      "URLs are included when they provide the most accessible or only means of locating a source. URLs are enclosed in angle brackets and placed at the end of the citation. Do not include a full stop after the closing angle bracket. Archived URLs (e.g., Wayback Machine) may be used when the original URL is no longer accessible.",
    examples: [
      "Australian Law Reform Commission, Serious Invasions of Privacy in the Digital Era (Report No 123, June 2014) <https://www.alrc.gov.au/publication/serious-invasions-of-privacy-in-the-digital-era-alrc-report-123/>.",
    ],
    tips: [
      "Enclose URLs in angle brackets: < >. Do not place a full stop after the closing angle bracket.",
      "Only include a URL when it adds value — do not include URLs for sources easily found through standard databases like AustLII or Westlaw.",
    ],
  },

  // ──────────────────────────────────────────────
  // Chapter 5 — Journal Articles
  // ──────────────────────────────────────────────
  {
    id: "JRNL-REF-001",
    ruleNumber: "5.1",
    title: "Standard Journal Article Citation",
    summary:
      "A journal article citation includes the author, the article title in single quotation marks, the publication year in round parentheses, the volume number, the journal name abbreviation (using the Appendix), and the starting page number. Pinpoint references follow the starting page after a comma.",
    examples: [
      "Jeremy Kirk, 'Constitutional Guarantees, Characterisation and the Concept of Proportionality' (1997) 21 Melbourne University Law Review 1, 12.",
      "Cheryl Saunders, 'The Concept of the Crown' (2015) 38 Melbourne University Law Review 873.",
    ],
    tips: [
      "Use abbreviated journal names from AGLC4 Appendix A — do not spell out journal names in full.",
      "The starting page of the article comes after the journal abbreviation, and pinpoints follow after a comma.",
    ],
  },
  {
    id: "JRNL-REF-002",
    ruleNumber: "5.10",
    title: "Online Journal Articles",
    summary:
      "Articles from journals published exclusively online that lack volume or page numbers use a document number or article identifier instead. Include the URL in angle brackets at the end of the citation if the journal is not available through standard legal databases.",
    examples: [
      "John Doe, 'Digital Privacy in the Modern Era' (2024) 5 Journal of Technology Law and Policy (online) 1 <https://example.com/article>.",
    ],
    tips: [
      "If the online journal assigns article or document numbers instead of page numbers, use those as the pinpoint locator.",
      "Include '(online)' after the journal name if it is exclusively an online publication without a print counterpart.",
    ],
  },

  {
    id: "JRNL-REF-003",
    ruleNumber: "5.2",
    title: "Forthcoming Journal Articles",
    summary:
      "Articles accepted for publication but not yet published are cited with '(forthcoming)' in place of the volume number and page number. Once published, the citation should be updated to include the final volume, issue, and page details.",
    examples: [
      "Anna Lee, 'Reforming Administrative Law' (forthcoming) Sydney Law Review.",
    ],
    tips: [
      "Use '(forthcoming)' after the year to indicate the article has been accepted but not yet assigned a volume or page number.",
      "Update the citation to the final published version once it becomes available.",
    ],
  },

  // ──────────────────────────────────────────────
  // Chapter 6 — Books
  // ──────────────────────────────────────────────
  {
    id: "BOOK-REF-001",
    ruleNumber: "6.1",
    title: "Standard Book Citation",
    summary:
      "A book citation includes the author, the title in italics, the publisher and year in parentheses, and a pinpoint reference if applicable. For subsequent editions, include the edition number before the year. The publisher name should be given as it appears on the title page.",
    examples: [
      "J D Heydon, Cross on Evidence (LexisNexis Butterworths, 13th ed, 2021) 145.",
      "Mark Leeming, Authority to Decide: The Law of Jurisdiction in Australia (Federation Press, 2012) ch 5.",
    ],
    tips: [
      "Include the edition number (e.g., '13th ed') before the year for editions after the first.",
      "Pinpoint references can use page numbers, chapter numbers ('ch'), or paragraph numbers ('[5.10]') depending on how the book is structured.",
    ],
  },
  {
    id: "BOOK-REF-002",
    ruleNumber: "6.6",
    title: "Chapters in Edited Books",
    summary:
      "When citing a chapter in an edited book, begin with the chapter author and chapter title in single quotation marks, then 'in', then the editor(s) with '(ed)' or '(eds)', the book title in italics, and publication details. The pinpoint refers to the chapter's starting page.",
    examples: [
      "Wendy Lacey, 'Inherent Jurisdiction, Judicial Power and Implied Guarantees' in Rosalind Dixon (ed), Australian Constitutional Values (Hart Publishing, 2018) 75.",
    ],
    tips: [
      "Use 'in' (not italicised) to connect the chapter details to the book details.",
      "Identify editors with '(ed)' for one editor or '(eds)' for multiple editors, placed after the editor names.",
    ],
  },

  {
    id: "BOOK-REF-003",
    ruleNumber: "6.3",
    title: "Translated Books",
    summary:
      "When citing a translated book, include the translator's name after the title, preceded by 'tr'. The original author remains the primary author. If the work is well known under a particular English title, use that title.",
    examples: [
      "Hans Kelsen, Pure Theory of Law (tr Max Knight, University of California Press, 2nd ed, 1967).",
    ],
    tips: [
      "Place the translator's name after the title, introduced by 'tr': (tr Translator Name, Publisher, Year).",
      "If both an editor and translator are involved, list the translator first: (tr X, ed Y, Publisher, Year).",
    ],
  },

  // ──────────────────────────────────────────────
  // Chapter 7 — Other Sources
  // ──────────────────────────────────────────────
  {
    id: "OTHER-REF-001",
    ruleNumber: "7.5.1",
    title: "Hansard / Parliamentary Debates",
    summary:
      "Parliamentary debates are cited with the jurisdiction (e.g., 'Commonwealth'), 'Parliamentary Debates', the chamber, the full date, the page number, and the speaker's name in parentheses. The jurisdiction and chamber names are italicised.",
    examples: [
      "Commonwealth, Parliamentary Debates, House of Representatives, 12 February 2020, 1523 (Christian Porter, Attorney-General).",
      "Victoria, Parliamentary Debates, Legislative Assembly, 5 March 2019, 678 (Jill Hennessy).",
    ],
    tips: [
      "Include the speaker's full name and their title or portfolio in parentheses at the end of the citation.",
      "Use the full date (day month year) rather than just the year.",
    ],
  },
  {
    id: "OTHER-REF-002",
    ruleNumber: "7.11",
    title: "Newspaper Articles",
    summary:
      "Newspaper articles are cited with the author (if identified), the article title in single quotation marks, the newspaper name in italics, and the full date. Page numbers are generally not included for newspaper articles. If accessed online, include the URL in angle brackets.",
    examples: [
      "Michaela Whitbourn, 'High Court Rules on Climate Case', The Sydney Morning Herald (online, 15 March 2025) <https://www.smh.com.au/example>.",
      "'New Sentencing Laws Passed', The Australian (Melbourne, 10 June 2024) 5.",
    ],
    tips: [
      "If the article has no named author, begin the citation with the article title.",
      "Include '(online, date)' for articles accessed via the newspaper's website, with the URL at the end.",
    ],
  },
  {
    id: "OTHER-REF-003",
    ruleNumber: "7.12",
    title: "Written Correspondence",
    summary:
      "Written correspondence (letters, emails, memoranda) is cited by identifying the type of correspondence, the sender, the recipient, and the full date. If the correspondence is not publicly accessible, include a note such as '(copy on file with author)'. AI-generated content is also cited under this rule (see GENAI-001).",
    examples: [
      "Letter from Robert Garran to Alfred Deakin, 15 September 1902.",
      "Email from Jane Smith to John Doe, 3 November 2024 (copy on file with author).",
    ],
    tips: [
      "Identify the type of correspondence at the start: 'Letter from', 'Email from', 'Memorandum from'.",
      "Include '(copy on file with author)' if the correspondence is not publicly available.",
    ],
  },
  {
    id: "OTHER-REF-004",
    ruleNumber: "7.15",
    title: "Internet Materials",
    summary:
      "Internet materials that do not fall into another source category are cited with the author (if identifiable), the title of the web page or document in single quotation marks, the website name in italics, and the full date or 'n.d.' if undated. The URL is included in angle brackets at the end.",
    examples: [
      "Attorney-General's Department, 'Family Law', Australian Government (Web Page, 2024) <https://www.ag.gov.au/families-and-marriage/family-law>.",
    ],
    tips: [
      "Use '(Web Page, date)' to describe the type and date of the material after the website name.",
      "Only cite internet materials under this rule if the source does not fit a more specific category (e.g., newspaper, report, journal).",
    ],
  },

  {
    id: "OTHER-REF-005",
    ruleNumber: "7.8",
    title: "Government Reports and Law Reform Commission Reports",
    summary:
      "Government and law reform commission reports are cited with the authoring body, the report title in italics, the report number and date in parentheses. If the report has a specific author, their name appears first, followed by the commissioning body.",
    examples: [
      "Australian Law Reform Commission, Traditional Rights and Freedoms: Encroachments by Commonwealth Laws (Report No 129, December 2015).",
      "Royal Commission into Misconduct in the Banking, Superannuation and Financial Services Industry (Final Report, February 2019).",
    ],
    tips: [
      "Include the report number (e.g., 'Report No 129') where one is assigned.",
      "For royal commissions and similar inquiries, the name of the inquiry is the author — include the report type (Interim Report, Final Report) in parentheses.",
    ],
  },
  {
    id: "OTHER-REF-006",
    ruleNumber: "7.9",
    title: "Working Papers and Research Papers",
    summary:
      "Working papers, research papers, and discussion papers are cited with the author, the title in single quotation marks, the series name and number, and the date. These are treated as part of a series rather than as standalone publications.",
    examples: [
      "Michael Adams, 'Corporate Governance in Australia' (Working Paper No 45, Centre for Corporate Law, University of Sydney, 2020).",
    ],
    tips: [
      "Include the series name and number in parentheses along with the issuing institution and date.",
      "Use single quotation marks for the paper title, as it forms part of a larger series.",
    ],
  },

  // ──────────────────────────────────────────────
  // Chapters 8–14 — International Materials
  // ──────────────────────────────────────────────
  {
    id: "INTL-REF-001",
    ruleNumber: "8.1",
    title: "Treaty Citation",
    summary:
      "Treaties are cited with their full title in italics, the date of signature or adoption, the treaty series abbreviation and volume/page numbers, and the date of entry into force (if relevant). Multilateral treaties use the relevant treaty series (UNTS, ATS). Bilateral treaties follow the same general format.",
    examples: [
      "Convention on the Rights of the Child, opened for signature 20 November 1989, 1577 UNTS 3 (entered into force 2 September 1990).",
      "International Covenant on Civil and Political Rights, opened for signature 16 December 1966, 999 UNTS 171 (entered into force 23 March 1976).",
    ],
    tips: [
      "Include the date the treaty was opened for signature and the date of entry into force in parentheses.",
      "Use standard treaty series abbreviations: UNTS (United Nations Treaty Series), ATS (Australian Treaty Series).",
    ],
  },
  {
    id: "INTL-REF-002",
    ruleNumber: "9.2",
    title: "UN Official Documents",
    summary:
      "United Nations documents are cited with the UN body, the document title in italics (or in quotation marks for resolutions), the UN document number, and the date. General Assembly and Security Council resolutions have specific citation formats including the resolution number and session details.",
    examples: [
      "Universal Declaration of Human Rights, GA Res 217A (III), UN GAOR, 3rd sess, 183rd plen mtg, UN Doc A/810 (10 December 1948).",
      "United Nations Security Council, SC Res 1373, UN SCOR, 56th sess, 4385th mtg, UN Doc S/RES/1373 (28 September 2001).",
    ],
    tips: [
      "Always include the UN document number (e.g., UN Doc A/810) as it is the primary locator for UN materials.",
      "Use standard abbreviations: GA Res (General Assembly Resolution), SC Res (Security Council Resolution), GAOR, SCOR.",
    ],
  },
  {
    id: "INTL-REF-003",
    ruleNumber: "10.1",
    title: "ICJ Decisions",
    summary:
      "International Court of Justice decisions are cited with the case name in italics, the parties in parentheses, the phase of the proceedings (e.g., 'Merits', 'Preliminary Objections'), the year in square brackets, the report abbreviation (ICJ Rep), and the page number.",
    examples: [
      "Case Concerning East Timor (Portugal v Australia) (Judgment) [1995] ICJ Rep 90.",
      "Pulp Mills on the River Uruguay (Argentina v Uruguay) (Judgment) [2010] ICJ Rep 14.",
    ],
    tips: [
      "Include the parties in parentheses after the case name: (Applicant v Respondent).",
      "Identify the phase of proceedings in parentheses: (Judgment), (Preliminary Objections), (Advisory Opinion).",
    ],
  },

  // ──────────────────────────────────────────────
  // Chapters 15–26 — Foreign Materials
  // ──────────────────────────────────────────────
  {
    id: "FRGN-REF-001",
    ruleNumber: "15–26",
    title: "General Guidance on Foreign Materials",
    summary:
      "When citing foreign materials, follow the AGLC4 rules for the relevant jurisdiction in Chapters 15\u201326. If no specific rule is provided, apply the general principles from the domestic rules (Chapters 2\u20137) with appropriate adaptations. Foreign court abbreviations, report series, and legislation titles are used as they appear in the foreign jurisdiction.",
    examples: [
      "Donoghue v Stevenson [1932] AC 562 (United Kingdom).",
      "Brown v Board of Education, 347 US 483 (1954) (United States).",
    ],
    tips: [
      "Each major jurisdiction (UK, US, Canada, NZ, Hong Kong) has its own chapter with specific citation rules — consult the relevant chapter.",
      "When a foreign jurisdiction is not specifically covered in AGLC4, adapt the general citation principles and note the jurisdiction clearly.",
    ],
  },
  {
    id: "FRGN-REF-002",
    ruleNumber: "15.1, 16.1, 18.1",
    title: "UK, US and NZ Citation Differences",
    summary:
      "United Kingdom cases use neutral citations or law report abbreviations (AC, QB, Ch). United States cases cite the US Reports or Federal Reporter with the court in parentheses. New Zealand cases follow a format similar to Australian citations but use NZ-specific report series (NZLR) and court abbreviations (NZSC, NZCA).",
    examples: [
      "R (Miller) v Secretary of State for Exiting the European Union [2017] UKSC 5.",
      "Marbury v Madison, 5 US (1 Cranch) 137 (1803).",
      "Couch v Attorney-General [2008] NZSC 45.",
    ],
    tips: [
      "For UK cases, use the neutral citation format ([year] UKSC/UKHL/EWCA number) when available.",
      "For US cases, always include the court in parentheses unless the court is obvious from the reporter (e.g., US Reports = Supreme Court).",
    ],
  },
];

// ──────────────────────────────────────────────
// OSCOLA Reference Guide Entries (GUIDE-EXT-001)
// ──────────────────────────────────────────────

export const oscolaReferenceGuideEntries: ReferenceGuideEntry[] = [
  {
    id: "OSC-REF-001",
    ruleNumber: "OSCOLA 1.1",
    title: "Footnotes and Citation Order",
    summary:
      "OSCOLA uses footnotes (not endnotes) numbered consecutively through the text. Each citation in a footnote ends with a full stop. Multiple sources in a single footnote are separated by semicolons. Pinpoints follow the citation without a comma for paragraphs, or with a comma for page numbers after a starting page.",
    examples: [
      "1 R v Smith [2020] UKSC 15, [45].",
      "2 Human Rights Act 1998, s 6.",
    ],
    tips: [
      "Footnotes are numbered consecutively; do not restart numbering at chapters.",
      "Each footnote ends with a full stop.",
      "Pinpoint paragraphs in square brackets: [45]. Page numbers use comma then page: 884, 890.",
    ],
  },
  {
    id: "OSC-REF-002",
    ruleNumber: "OSCOLA 1.2",
    title: "Quotation Marks and Block Quotations",
    summary:
      "OSCOLA uses single quotation marks for all short quotations. Double quotation marks are used only for quotations within quotations. Quotations of three lines or more are set as indented block quotations without quotation marks. Punctuation follows the British/logical convention (outside the closing quotation mark unless part of the original).",
    examples: [
      "Lord Bingham observed that 'the rule of law requires compliance'.",
      "The witness stated that 'he heard someone say \"stop\" before leaving'.",
    ],
    tips: [
      "Use single quotation marks for all short quotations, not double.",
      "Place punctuation outside the closing quotation mark unless it is part of the quoted text.",
      "Block quotations (3+ lines) are indented and have no quotation marks.",
    ],
  },
  {
    id: "OSC-REF-003",
    ruleNumber: "OSCOLA 1.3",
    title: "Subsequent References and Short Forms",
    summary:
      "In OSCOLA 5, ibid is formally deprecated. All subsequent references use the short-form cross-reference: author surname and '(n X)' where X is the footnote number of the first full citation. For cases, use the short case name and '(n X)'. For statutes, repeat the short title.",
    examples: [
      "Smith (n 3) 42.",
      "R v Jones (n 7) [15].",
    ],
    tips: [
      "Do not use 'ibid' in OSCOLA 5 — always use the short-form '(n X)' cross-reference.",
      "The short form is: Author surname (n X) pinpoint.",
      "For cases, use the short case name: Jones (n X) [para].",
    ],
  },
  {
    id: "OSC-REF-004",
    ruleNumber: "OSCOLA 1.4",
    title: "Bibliography Structure",
    summary:
      "OSCOLA requires a three-part bibliography: (1) Table of Cases, (2) Table of Legislation, and (3) Bibliography of secondary sources. Case names in the Table of Cases are not italicised. The bibliography of secondary sources may be subdivided into books, articles, official publications, and online sources.",
    examples: [
      "TABLE OF CASES\nCorr v IBC Vehicles Ltd [2008] UKHL 15, [2008] 1 AC 884",
      "TABLE OF LEGISLATION\nHuman Rights Act 1998",
      "BIBLIOGRAPHY\nSmith J, Contract Law (OUP 2020)",
    ],
    tips: [
      "Case names are NOT italicised in the Table of Cases (unlike footnotes).",
      "Legislation titles are roman (not italic) in the Table of Legislation.",
      "Secondary sources are listed alphabetically by author surname.",
    ],
  },
  {
    id: "OSC-REF-005",
    ruleNumber: "OSCOLA 2.1",
    title: "Cases — Neutral Citations (Post-2001)",
    summary:
      "UK cases from 2001 onwards should be cited with the neutral citation followed by the best law report. The neutral citation format is: [year] court number. The hierarchy of law reports is: Law Reports (AC, QB, Ch, Fam) > WLR > All ER > specialist reports. Case names are italic; 'v' is italic.",
    examples: [
      "Corr v IBC Vehicles Ltd [2008] UKHL 15, [2008] 1 AC 884.",
      "R (Miller) v Secretary of State for Exiting the European Union [2017] UKSC 5.",
    ],
    tips: [
      "Always include the neutral citation for post-2001 cases.",
      "Follow the neutral citation with the best available law report, separated by a comma.",
      "Court identifiers: UKSC, UKPC, EWCA Civ/Crim, EWHC (QB/Ch/Fam/Admin/Comm).",
    ],
  },
  {
    id: "OSC-REF-006",
    ruleNumber: "OSCOLA 2.1.6",
    title: "Cases — Pre-2001 and Historical",
    summary:
      "Cases before 2001 are cited using the law report only, without a neutral citation. Include the court in parentheses at the end if it is not apparent from the report series. Historical nominate reports use their specific abbreviation.",
    examples: [
      "Donoghue v Stevenson [1932] AC 562 (HL).",
      "Carlill v Carbolic Smoke Ball Co [1893] 1 QB 256 (CA).",
    ],
    tips: [
      "Do not use retrospective BAILII neutral citations for pre-2001 cases.",
      "Include the court identifier in parentheses if not apparent from the report series.",
      "Use round or square brackets for the year depending on the report series convention.",
    ],
  },
  {
    id: "OSC-REF-007",
    ruleNumber: "OSCOLA 2.2",
    title: "Legislation — Primary",
    summary:
      "UK legislation titles are in roman (not italic). The format is: Short Title Year. No comma appears between the title and year. Pinpoints use 's' for section. Scottish Acts use '(asp X)', Welsh Acts use '(anaw X)' pre-2020 or '(asc X)' post-2020.",
    examples: [
      "Human Rights Act 1998, s 6.",
      "Scotland Act 1998, s 29.",
      "Renting Homes (Wales) Act 2016 (anaw 1), s 7.",
    ],
    tips: [
      "Legislation titles are NEVER italic in OSCOLA — always roman.",
      "Use 's' (no full stop) for section and 'ss' for multiple sections.",
      "No comma between the short title and year: 'Human Rights Act 1998'.",
    ],
  },
  {
    id: "OSC-REF-008",
    ruleNumber: "OSCOLA 2.2.6",
    title: "Legislation — Secondary (Statutory Instruments)",
    summary:
      "Statutory Instruments are cited with: Short Title Year, SI Year/Number. Scottish Statutory Instruments use SSI, Welsh use WSI, and Northern Ireland Statutory Rules use SR.",
    examples: [
      "Civil Procedure Rules 1998, SI 1998/3132, r 3.4.",
      "National Health Service (General Medical Services Contracts) (Scotland) Regulations 2018, SSI 2018/66.",
    ],
    tips: [
      "Include the SI number after the year: SI 1998/3132.",
      "Pinpoints in SIs use 'r' for rule, 'reg' for regulation, 'art' for article.",
      "SI titles are roman, like primary legislation.",
    ],
  },
  {
    id: "OSC-REF-009",
    ruleNumber: "OSCOLA 2.3",
    title: "Parliamentary Materials",
    summary:
      "Hansard is cited as: HC Deb or HL Deb, date, vol X, col Y. Command Papers use the appropriate prefix per series (C, Cd, Cmd, Cmnd, Cm). Law Commission reports cite the body, title, and report number.",
    examples: [
      "HC Deb 3 July 2019, vol 662, col 1234.",
      "Law Commission, Cohabitation: The Financial Consequences of Relationship Breakdown (Law Com No 307, 2007).",
    ],
    tips: [
      "Hansard: HC Deb (Commons) or HL Deb (Lords), then date, volume, column.",
      "Command Paper prefixes vary by year: Cm (1986+), Cmnd (1956-86), Cmd (1919-56).",
      "Law Commission: 'Law Commission, Title (Law Com No X, Year)'.",
    ],
  },
  {
    id: "OSC-REF-010",
    ruleNumber: "OSCOLA 3.1",
    title: "Books",
    summary:
      "Books are cited: Author, Title (Publisher, Edition, Year) pinpoint. The title is italic. The publisher name is abbreviated where conventional. Edition uses 'edn' (British English). Pinpoints follow the closing parenthesis without a comma.",
    examples: [
      "Andrew Burrows, The Law of Restitution (3rd edn, OUP 2011) 42.",
      "HLA Hart, The Concept of Law (Clarendon Press 1961).",
    ],
    tips: [
      "Use 'edn' (not 'ed') for edition in OSCOLA: '3rd edn'.",
      "Pinpoint page numbers follow the closing parenthesis directly: (OUP 2011) 42.",
      "Omit initials spaces: 'HLA Hart' not 'H L A Hart'.",
    ],
  },
  {
    id: "OSC-REF-011",
    ruleNumber: "OSCOLA 3.2",
    title: "Chapters in Edited Collections",
    summary:
      "Chapters in edited books: Author, 'Chapter Title' in Editor (ed), Book Title (Publisher, Year) starting page. Use '(eds)' for multiple editors.",
    examples: [
      "John Gardner, 'The Purity and Priority of Private Law' in Andrew Robertson and Tang Hang Wu (eds), The Goals of Private Law (Hart Publishing 2009) 1.",
    ],
    tips: [
      "Chapter titles in single quotation marks; book titles in italics.",
      "Use 'in' (roman, not italic) to connect chapter to book.",
      "Pinpoint is the starting page of the chapter.",
    ],
  },
  {
    id: "OSC-REF-012",
    ruleNumber: "OSCOLA 3.3",
    title: "Journal Articles",
    summary:
      "Journal articles: Author, 'Title' [Year] or (Year) Volume Journal Abbreviation Starting Page. Use square brackets when the year identifies the volume; round brackets with a volume number otherwise.",
    examples: [
      "John Eekelaar, 'The End of an Era' (2006) 33 Journal of Law and Society 230.",
      "Thomas Poole, 'Questioning Common Law Constitutionalism' [2005] LS 142.",
    ],
    tips: [
      "Article titles in single quotation marks.",
      "Journal names are abbreviated and not italic.",
      "Use standard abbreviations; do not spell out journal names in full.",
    ],
  },
  {
    id: "OSC-REF-013",
    ruleNumber: "OSCOLA 3.7",
    title: "Online and Digital Sources",
    summary:
      "Websites and blogs: Author, 'Title' (Site Name, Date) <URL> accessed Date. Include the access date for online sources. Blog posts treat the blog name as the site name.",
    examples: [
      "Emily Henderson, 'Supreme Court Rules on Prorogation' (UK Constitutional Law Blog, 25 September 2019) <https://example.com> accessed 1 October 2019.",
    ],
    tips: [
      "Include 'accessed [date]' after the URL for online sources.",
      "Enclose the URL in angle brackets.",
      "Blog name functions as the site/publication name.",
    ],
  },
  {
    id: "OSC-REF-014",
    ruleNumber: "OSCOLA 4.1",
    title: "International Treaties",
    summary:
      "Treaties are cited: Title (adopted/opened for signature Date, entered into force Date) Treaty Series. The title is italic. Include the UNTS, UKTS, or ETS reference as appropriate.",
    examples: [
      "Convention for the Protection of Human Rights and Fundamental Freedoms (European Convention on Human Rights, as amended) (ECHR).",
      "Vienna Convention on the Law of Treaties (adopted 23 May 1969, entered into force 27 January 1980) 1155 UNTS 331.",
    ],
    tips: [
      "Treaty titles are italic.",
      "Include both the adoption/signature date and entry-into-force date where known.",
      "Well-known treaties may use short forms after first full citation.",
    ],
  },
  {
    id: "OSC-REF-015",
    ruleNumber: "OSCOLA 4.3",
    title: "European Court of Human Rights",
    summary:
      "ECtHR cases: Case Name v State App No XXXXX/YY (Court, Date). Grand Chamber is noted. Reports references may be included where available.",
    examples: [
      "Othman (Abu Qatada) v United Kingdom App No 8139/09 (ECtHR, 17 January 2012).",
      "Al-Skeini v United Kingdom [GC] App No 55721/07 (ECtHR, 7 July 2011).",
    ],
    tips: [
      "Include the application number: App No XXXXX/YY.",
      "Grand Chamber is indicated with [GC] after the case name.",
      "The date is the judgment date, not the application date.",
    ],
  },

  // ──────────────────────────────────────────────
  // Section 1 — General (expanded) (GUIDE-FULL-001)
  // ──────────────────────────────────────────────
  {
    id: "OSC-REF-016",
    ruleNumber: "OSCOLA 1.1",
    title: "Footnote Format and Closing Punctuation",
    summary:
      "Every OSCOLA footnote ends with a full stop, regardless of what the citation itself ends with (a URL, a pinpoint number, etc.). Footnotes are numbered consecutively through the entire text and should not restart at chapter or section breaks. The footnote reference number in the text appears in superscript after the relevant punctuation mark.",
    examples: [
      "1 Human Rights Act 1998, s 6.",
      "2 R v Smith [2020] UKSC 15, [45].",
      "3 Andrew Burrows, The Law of Restitution (3rd edn, OUP 2011) 42.",
    ],
    tips: [
      "Every footnote must end with a full stop, even if the citation ends with a URL or closing parenthesis.",
      "Footnote numbers are consecutive throughout the document; do not restart per chapter.",
      "Place the superscript footnote number after punctuation in the main text.",
    ],
  },
  {
    id: "OSC-REF-017",
    ruleNumber: "OSCOLA 1.1",
    title: "Multiple Sources in One Footnote",
    summary:
      "When citing multiple sources in a single footnote, separate each citation with a semicolon. Each citation within the footnote follows its normal format. The footnote as a whole ends with a single full stop after the last citation.",
    examples: [
      "1 R v Smith [2020] UKSC 15; R v Jones [2019] EWCA Crim 200; Human Rights Act 1998, s 6.",
    ],
    tips: [
      "Use semicolons to separate multiple citations within one footnote.",
      "Only a single full stop appears at the very end of the footnote.",
      "Each citation follows its standard OSCOLA format within the footnote.",
    ],
  },
  {
    id: "OSC-REF-018",
    ruleNumber: "OSCOLA 1.3",
    title: "Subsequent References — No Ibid in OSCOLA 5",
    summary:
      "OSCOLA 5 formally deprecates 'ibid'. All subsequent references use the short-form cross-reference: the author surname (or short case name) followed by '(n X)' where X is the footnote number of the first full citation. A pinpoint follows directly after the cross-reference.",
    examples: [
      "Smith (n 3) 42.",
      "R v Jones (n 7) [15].",
      "Burrows (n 1) 55.",
    ],
    tips: [
      "Never use 'ibid' in OSCOLA 5 — always use the '(n X)' short-form cross-reference.",
      "The short form is: Author surname (n X) pinpoint.",
      "For cases, use the short case name: Jones (n X) [para].",
      "For legislation, simply repeat the short title with the new pinpoint.",
    ],
  },
  {
    id: "OSC-REF-019",
    ruleNumber: "OSCOLA 1.3",
    title: "Introducing Short Titles",
    summary:
      "When a source has a long title, a short title may be introduced in the first full citation for use in subsequent references. The short title appears in parentheses with single quotation marks at the end of the first citation. For well-known statutes and treaties, the short form can be used without formal introduction.",
    examples: [
      "Convention for the Protection of Human Rights and Fundamental Freedoms (European Convention on Human Rights, as amended) (ECHR) ('the Convention').",
    ],
    tips: [
      "Introduce a short title in parentheses with single quotation marks on first citation.",
      "Well-known short forms (e.g. HRA 1998, ECHR) may be used without formal introduction.",
      "Be consistent: once a short title is introduced, use it for all subsequent references.",
    ],
  },
  {
    id: "OSC-REF-020",
    ruleNumber: "OSCOLA 1.4",
    title: "Bibliography Structure",
    summary:
      "OSCOLA requires a three-part bibliography: (1) Table of Cases, (2) Table of Legislation, and (3) Bibliography of secondary sources. Case names in the Table of Cases are not italicised. The bibliography of secondary sources may be subdivided into books, articles, official publications, and online sources. Secondary sources are listed alphabetically by author surname.",
    examples: [
      "TABLE OF CASES\nCorr v IBC Vehicles Ltd [2008] UKHL 15, [2008] 1 AC 884",
      "TABLE OF LEGISLATION\nHuman Rights Act 1998",
      "BIBLIOGRAPHY\nBurrows A, The Law of Restitution (3rd edn, OUP 2011)",
    ],
    tips: [
      "Case names are NOT italicised in the Table of Cases (unlike footnotes).",
      "Legislation titles are roman (not italic) in the Table of Legislation.",
      "In the bibliography, author names are inverted: surname first, then initials.",
      "Secondary sources are listed alphabetically by author surname.",
    ],
  },
  {
    id: "OSC-REF-021",
    ruleNumber: "OSCOLA 1.2",
    title: "Quotation Marks — Single for Titles",
    summary:
      "OSCOLA uses single quotation marks for short quotations and for titles of articles, chapters, and other works published as part of a larger work. Double quotation marks are used only for quotations within quotations. This follows British English convention.",
    examples: [
      "Lord Bingham observed that 'the rule of law requires compliance'.",
      "John Gardner, 'The Purity and Priority of Private Law' in Robertson and Wu (eds), The Goals of Private Law (Hart Publishing 2009).",
    ],
    tips: [
      "Use single quotation marks for short quotations and article/chapter titles.",
      "Double quotation marks are reserved for quotes within quotes.",
      "Place punctuation outside the closing quotation mark unless it is part of the original.",
    ],
  },
  {
    id: "OSC-REF-022",
    ruleNumber: "OSCOLA 1.5",
    title: "Italicisation Conventions",
    summary:
      "In OSCOLA, case names and book titles are italicised. Legislation titles (including EU instruments) are always in roman type (not italic). Journal names, report series abbreviations, and procedural terms like 'v' in case names are also roman. Foreign words not absorbed into English should be italicised.",
    examples: [
      "Corr v IBC Vehicles Ltd [2008] UKHL 15.",
      "Human Rights Act 1998, s 6.",
      "Andrew Burrows, The Law of Restitution (3rd edn, OUP 2011).",
    ],
    tips: [
      "Case names: italic. Legislation titles: roman (not italic).",
      "Book titles: italic. Article and chapter titles: single quotation marks, roman.",
      "The 'v' in case names is roman, not italic.",
      "Journal abbreviations are roman and not italicised.",
    ],
  },

  // ──────────────────────────────────────────────
  // Section 2 — Primary Sources: Cases (expanded) (GUIDE-FULL-001)
  // ──────────────────────────────────────────────
  {
    id: "OSC-REF-023",
    ruleNumber: "OSCOLA 2.1.1–2.1.5",
    title: "UK Cases — Modern with Neutral Citation (Post-2001)",
    summary:
      "UK cases from 2001 onwards are cited with the neutral citation followed by the best law report, separated by a comma. The neutral citation format is: case name, [year] court number. The report hierarchy is: Law Reports (AC, QB, Ch, Fam) then WLR then All ER then specialist reports.",
    examples: [
      "Corr v IBC Vehicles Ltd [2008] UKHL 15, [2008] 1 AC 884.",
      "R (Miller) v Secretary of State for Exiting the European Union [2017] UKSC 5.",
    ],
    tips: [
      "Always include the neutral citation first, then the best available report after a comma.",
      "Court identifiers: UKSC, UKPC, EWCA Civ/Crim, EWHC (with division).",
      "Prefer the Law Reports (AC, QB, Ch, Fam) over WLR, All ER, or specialist reports.",
    ],
  },
  {
    id: "OSC-REF-024",
    ruleNumber: "OSCOLA 2.1.6–2.1.8",
    title: "UK Cases — Pre-2001 with Law Reports Only",
    summary:
      "Cases before 2001 are cited using the law report only, without a neutral citation. Include the court in parentheses at the end if it is not apparent from the report series. Do not use retrospective BAILII neutral citations for pre-2001 cases, as OSCOLA 5 disregards these.",
    examples: [
      "Donoghue v Stevenson [1932] AC 562 (HL).",
      "Carlill v Carbolic Smoke Ball Co [1893] 1 QB 256 (CA).",
    ],
    tips: [
      "Do not use retrospective BAILII neutral citations for pre-2001 cases.",
      "Include the court identifier in parentheses if not apparent from the report series.",
      "Use round brackets for years with sequential volume numbering, square brackets when the year is the volume identifier.",
    ],
  },
  {
    id: "OSC-REF-025",
    ruleNumber: "OSCOLA 2.1.5",
    title: "UK Cases — EWHC Divisions",
    summary:
      "England and Wales High Court cases include a division designation in parentheses after the case number: (Admin), (Ch), (QB), (Fam), (Comm), (TCC), (Pat), (Admlty). The division appears within the neutral citation itself, not as a separate court identifier.",
    examples: [
      "R (Cart) v Upper Tribunal [2009] EWHC 3052 (Admin).",
      "Re Sigma Finance Corp [2008] EWHC 1480 (Ch).",
    ],
    tips: [
      "The EWHC division appears in parentheses as part of the neutral citation.",
      "Common divisions: Admin (Administrative Court), Ch (Chancery), QB (Queen's/King's Bench), Fam (Family), Comm (Commercial), TCC (Technology and Construction).",
      "The division replaces the need for a separate court identifier in parentheses.",
    ],
  },
  {
    id: "OSC-REF-026",
    ruleNumber: "OSCOLA 2.1.9",
    title: "Scottish Cases — Neutral Citation",
    summary:
      "Scottish cases use the Session Cases (SC), Scots Law Times (SLT), and devolved court identifiers (CSIH for Inner House, CSOH for Outer House, HCJAC for High Court of Justiciary). Modern Scottish cases include a neutral citation followed by the best report.",
    examples: [
      "AXA General Insurance Ltd v Lord Advocate [2011] CSIH 31, 2011 SC 158.",
    ],
    tips: [
      "Scottish court identifiers: CSIH (Inner House), CSOH (Outer House), HCJAC (Justiciary Appeal Court).",
      "The neutral citation precedes the report citation, separated by a comma.",
      "Report series hierarchy: Session Cases (SC) is preferred, then SLT.",
    ],
  },
  {
    id: "OSC-REF-027",
    ruleNumber: "OSCOLA 2.1.9",
    title: "Scottish Cases — Historical Series (Pre-1906)",
    summary:
      "Pre-1906 Scottish cases use historical Session Cases series identified by editor initial: S (Shaw), D (Dunlop), M (Macpherson), R (Rettie), F (Fraser). These are cited with the year in round brackets, followed by the volume number, series initial, and starting page.",
    examples: [
      "Balfour v Baird (1857) 19 D 534.",
    ],
    tips: [
      "Pre-1906 Scottish series: S (Shaw), D (Dunlop), M (Macpherson), R (Rettie), F (Fraser).",
      "The year appears in round brackets followed by the volume and series letter.",
      "Post-1906 Scottish cases use the modern Session Cases (SC) format.",
    ],
  },
  {
    id: "OSC-REF-028",
    ruleNumber: "OSCOLA 2.1 (NI)",
    title: "Northern Ireland Cases",
    summary:
      "Northern Ireland cases use neutral citation identifiers NICA (Court of Appeal), NIQB (High Court, Queen's Bench), NICh (Chancery), NIFam (Family). The NI report series is used as the best report where available. Court identifier is placed in parentheses if not apparent from the series or neutral citation.",
    examples: [
      "Re McFarland [2004] NICA 29, [2004] NI 380.",
      "R v Magee [2001] NIQB 14.",
    ],
    tips: [
      "NI court identifiers: NICA, NIQB, NICh, NIFam, NICC, NIMag.",
      "Include a parallel report citation (NI series) where available.",
      "Format follows the same pattern as England and Wales cases.",
    ],
  },
  {
    id: "OSC-REF-029",
    ruleNumber: "OSCOLA Ireland",
    title: "Irish Cases (OSCOLA Ireland Overlay)",
    summary:
      "The OSCOLA Ireland overlay adapts OSCOLA for Irish courts. Irish case citations use neutral citations (IESC, IECA, IEHC) for modern cases and Irish Reports (IR) or ILRM for reported decisions. The format mirrors standard OSCOLA but with Irish court identifiers and report series.",
    examples: [
      "Langan v Health Service Executive [2024] IESC 1.",
      "Maguire v Ardagh [2002] 1 IR 385.",
    ],
    tips: [
      "Irish court identifiers: IESC (Supreme Court), IECA (Court of Appeal), IEHC (High Court).",
      "Irish report series hierarchy: IR > ILRM.",
      "Irish legislation is roman (not italic), following OSCOLA conventions.",
    ],
  },

  // ──────────────────────────────────────────────
  // Section 2 — Primary Sources: Legislation (expanded) (GUIDE-FULL-001)
  // ──────────────────────────────────────────────
  {
    id: "OSC-REF-030",
    ruleNumber: "OSCOLA 2.2.1–2.2.2",
    title: "UK Primary Legislation (Acts of Parliament)",
    summary:
      "UK Acts of Parliament are cited by short title and year in roman type (not italic). No comma appears between the title and year. Section pinpoints use 's' for a single section and 'ss' for multiple sections. There is no full stop after the section abbreviation.",
    examples: [
      "Human Rights Act 1998, s 6.",
      "Equality Act 2010, ss 4-9.",
      "Scotland Act 1998, s 29.",
    ],
    tips: [
      "Legislation titles are NEVER italic in OSCOLA — always roman.",
      "Use 's' (no full stop) for section and 'ss' for multiple sections.",
      "No comma between the short title and year: 'Human Rights Act 1998'.",
    ],
  },
  {
    id: "OSC-REF-031",
    ruleNumber: "OSCOLA 2.2.3",
    title: "Scottish Legislation (asp)",
    summary:
      "Acts of the Scottish Parliament are cited with the short title, year, and '(asp X)' suffix indicating the act number in the session. The format is otherwise identical to UK Acts. Legislation is in roman type.",
    examples: [
      "Adoption and Children (Scotland) Act 2007 (asp 4).",
    ],
    tips: [
      "Scottish Parliament Acts use the '(asp X)' suffix after the year.",
      "The title remains in roman type (not italic).",
      "Section pinpoints follow the same 's' convention as UK Acts.",
    ],
  },
  {
    id: "OSC-REF-032",
    ruleNumber: "OSCOLA 2.2.4",
    title: "Welsh Legislation (anaw/asc)",
    summary:
      "Welsh Acts use '(anaw X)' for Acts of the National Assembly for Wales (pre-2020) and '(asc X)' for Acts of Senedd Cymru (2020 onwards). The format is otherwise identical to UK Acts. The change in suffix reflects the renaming of the Welsh legislature.",
    examples: [
      "Legislation (Wales) Act 2019 (anaw 4).",
      "Curriculum and Assessment (Wales) Act 2021 (asc 4).",
    ],
    tips: [
      "Pre-2020 Welsh Acts: '(anaw X)' — Acts of the National Assembly for Wales.",
      "Post-2020 Welsh Acts: '(asc X)' — Acts of Senedd Cymru.",
      "All in roman type, following standard OSCOLA legislation conventions.",
    ],
  },
  {
    id: "OSC-REF-033",
    ruleNumber: "OSCOLA 2.2.5",
    title: "Northern Ireland Legislation",
    summary:
      "Northern Ireland Acts of the Assembly are cited with the short title, year, and '(NI)' suffix. The format follows standard OSCOLA legislation conventions with roman type throughout. Pre-devolution legislation follows historical conventions.",
    examples: [
      "Justice (Northern Ireland) Act 2002 (NI).",
    ],
    tips: [
      "NI Acts use '(NI)' suffix after the year.",
      "All in roman type (not italic).",
      "Section pinpoints use 's' as with UK Acts.",
    ],
  },
  {
    id: "OSC-REF-034",
    ruleNumber: "OSCOLA 2.2.6–2.2.8",
    title: "UK Secondary Legislation (SI, SSI, WSI, SR)",
    summary:
      "Statutory Instruments are cited with the short title, year, and instrument reference: SI Year/Number for England and Wales, SSI for Scottish Statutory Instruments, WSI for Welsh Statutory Instruments, and SR for Northern Ireland Statutory Rules. All in roman type.",
    examples: [
      "Civil Procedure Rules 1998, SI 1998/3132, r 3.4.",
      "National Health Service (General Medical Services Contracts) (Scotland) Regulations 2018, SSI 2018/66.",
      "Phosphorus Compounds (Prohibition) Regulations (Northern Ireland) 1989, SR 1989/182.",
    ],
    tips: [
      "Include the instrument number: SI Year/Number, SSI Year/Number, etc.",
      "Pinpoints use 'r' for rule, 'reg' for regulation, 'art' for article.",
      "SI titles are roman, like primary legislation.",
    ],
  },

  // ──────────────────────────────────────────────
  // Section 2 — Primary Sources: Parliamentary (expanded) (GUIDE-FULL-001)
  // ──────────────────────────────────────────────
  {
    id: "OSC-REF-035",
    ruleNumber: "OSCOLA 2.3",
    title: "Hansard (HC Deb / HL Deb)",
    summary:
      "UK Parliamentary debates are cited as: HC Deb (House of Commons) or HL Deb (House of Lords), followed by the date, volume number, and column number. The speaker's name may be included in parentheses at the end. All in roman type.",
    examples: [
      "HC Deb 3 March 2020, vol 672, col 800 (Boris Johnson).",
      "HL Deb 18 November 2019, vol 800, col 60.",
    ],
    tips: [
      "Format: HC Deb/HL Deb date, vol X, col Y.",
      "Include the speaker in parentheses if relevant.",
      "Use column numbers, not page numbers, for Hansard pinpoints.",
    ],
  },
  {
    id: "OSC-REF-036",
    ruleNumber: "OSCOLA 2.3",
    title: "Command Papers",
    summary:
      "Command Papers are cited with the issuing body, the title in italics, and the command paper number and year in parentheses. The series prefix (C, Cd, Cmd, Cmnd, Cm) indicates the historical series: C (1833-1869), Cd (1900-1918), Cmd (1919-1956), Cmnd (1956-1986), Cm (1986-present).",
    examples: [
      "Lord Chancellor's Department, Striking the Balance (Cm 6189, 2004).",
      "Ministry of Justice, Proposals for the Reform of Legal Aid in England and Wales (Cm 7967, 2010).",
    ],
    tips: [
      "Title is italic; the command paper number and year are in parentheses.",
      "Command paper prefixes vary by year: Cm (1986+), Cmnd (1956-86), Cmd (1919-56), Cd (1900-18), C (1833-69).",
      "The issuing body appears before the title.",
    ],
  },
  {
    id: "OSC-REF-037",
    ruleNumber: "OSCOLA 2.3",
    title: "Law Commission Reports",
    summary:
      "Law Commission reports are cited as: Law Commission, Title (Law Com No X, Year). The title is in italics; 'Law Commission' and the parenthetical details are in roman. Scottish Law Commission reports follow a similar format with 'Scot Law Com No X'.",
    examples: [
      "Law Commission, Aggravated, Exemplary and Restitutionary Damages (Law Com No 247, 1997).",
      "Law Commission, Cohabitation: The Financial Consequences of Relationship Breakdown (Law Com No 307, 2007).",
    ],
    tips: [
      "Format: Law Commission, Title (Law Com No X, Year).",
      "Title is italic; everything else is roman.",
      "For Scottish Law Commission: 'Scot Law Com No X'.",
    ],
  },
  {
    id: "OSC-REF-038",
    ruleNumber: "OSCOLA 2.3",
    title: "Parliamentary Select Committee Reports",
    summary:
      "Parliamentary select committee reports are cited with the committee name, the report title in italics, and the session identifier and paper number in parentheses. House of Commons papers use 'HC' and House of Lords papers use 'HL Paper'.",
    examples: [
      "House of Commons Justice Committee, The Coroner Service (2019-21, HC 68).",
    ],
    tips: [
      "Include the full committee name at the start.",
      "Title is italic; session and paper number are in parentheses.",
      "HC papers: 'HC X'. HL papers: 'HL Paper X'.",
    ],
  },

  // ──────────────────────────────────────────────
  // Section 3 — Secondary Sources (expanded) (GUIDE-FULL-001)
  // ──────────────────────────────────────────────
  {
    id: "OSC-REF-039",
    ruleNumber: "OSCOLA 3.1",
    title: "Books — Single, Multiple, and Edited",
    summary:
      "Books are cited: Author, Title (Publisher, Edition, Year) pinpoint. The title is italic. For multiple authors, list all names. For edited books, add '(ed)' or '(eds)' after editor names. Edition uses 'edn' (British English). Pinpoints follow the closing parenthesis without a comma.",
    examples: [
      "Andrew Burrows, The Law of Restitution (3rd edn, OUP 2011) 42.",
      "HLA Hart, The Concept of Law (Clarendon Press 1961).",
      "Andrew Ashworth and Jeremy Horder, Principles of Criminal Law (7th edn, OUP 2013) 100.",
    ],
    tips: [
      "Use 'edn' (not 'ed') for edition in OSCOLA: '3rd edn'.",
      "Pinpoint page numbers follow the closing parenthesis directly: (OUP 2011) 42.",
      "For edited books without citing a specific chapter, use: Editor (ed), Title (Publisher Year).",
    ],
  },
  {
    id: "OSC-REF-040",
    ruleNumber: "OSCOLA 3.2",
    title: "Book Chapters in Edited Collections",
    summary:
      "Chapters in edited books are cited: Author, 'Chapter Title' in Editor (ed), Book Title (Publisher, Year) starting page. The chapter title is in single quotation marks; the book title is italic. Use 'in' (roman) to connect the chapter to the book.",
    examples: [
      "John Gardner, 'The Purity and Priority of Private Law' in Andrew Robertson and Tang Hang Wu (eds), The Goals of Private Law (Hart Publishing 2009) 1.",
    ],
    tips: [
      "Chapter titles in single quotation marks; book titles in italics.",
      "Use 'in' (roman, not italic) to connect chapter to book.",
      "Pinpoint is the starting page of the chapter.",
    ],
  },
  {
    id: "OSC-REF-041",
    ruleNumber: "OSCOLA 3.3",
    title: "Journal Articles",
    summary:
      "Journal articles are cited: Author, 'Title' [Year] or (Year) Volume Journal Abbreviation Starting Page. Use square brackets when the year identifies the volume; round brackets with a volume number otherwise. Article titles are in single quotation marks. Journal names are abbreviated and in roman type.",
    examples: [
      "John Eekelaar, 'The End of an Era' (2006) 33 Journal of Law and Society 230.",
      "Thomas Poole, 'Questioning Common Law Constitutionalism' [2005] LS 142.",
    ],
    tips: [
      "Article titles in single quotation marks.",
      "Journal names are abbreviated and not italic.",
      "Use round brackets + volume number, or square brackets when the year is the volume identifier.",
    ],
  },
  {
    id: "OSC-REF-042",
    ruleNumber: "OSCOLA 3.3",
    title: "Online Journal Articles",
    summary:
      "Articles from journals published exclusively online follow the same format as print journal articles where possible. If page numbers are not available, use article or document numbers. Include the URL in angle brackets and an access date. If the article has a DOI, that may be used as the persistent identifier.",
    examples: [
      "Michael Addo, 'The Practice of the UN Human Rights Treaty Bodies' (2010) 4(1) Human Rights and International Legal Discourse 50 <https://example.com> accessed 1 March 2026.",
    ],
    tips: [
      "Follow the standard journal article format as closely as possible.",
      "Include a URL and access date if the article is only available online.",
      "If no page numbers exist, use the article or document number.",
    ],
  },
  {
    id: "OSC-REF-043",
    ruleNumber: "OSCOLA 3.6",
    title: "Theses and Dissertations",
    summary:
      "Theses are cited: Author, 'Title' (Type of thesis, University Year) pinpoint. The title is in single quotation marks (not italic). The thesis type (DPhil thesis, PhD thesis, LLM thesis) and university appear in parentheses. Pinpoints follow directly without 'at'.",
    examples: [
      "John Smith, 'The Doctrine of Legitimate Expectations in EU Law' (DPhil thesis, University of Oxford 2020) 45.",
    ],
    tips: [
      "Title is in single quotation marks, not italic.",
      "Specify the thesis type: DPhil thesis, PhD thesis, LLM thesis, etc.",
      "No comma between the university name and year in the parenthetical.",
    ],
  },
  {
    id: "OSC-REF-044",
    ruleNumber: "OSCOLA 3.7.1",
    title: "Websites and Online Sources",
    summary:
      "Website content is cited: Author, 'Title' (Website Name, Date) <URL> accessed Date. The title is in single quotation marks. The URL is enclosed in angle brackets. An access date is required for all online sources.",
    examples: [
      "Jane Smith, 'The Future of Legal Tech' (Law Society Gazette, 15 March 2026) <https://example.com/article> accessed 20 April 2026.",
    ],
    tips: [
      "Always include 'accessed [date]' after the URL for online sources.",
      "Enclose the URL in angle brackets.",
      "If no author is identifiable, begin with the title.",
    ],
  },
  {
    id: "OSC-REF-045",
    ruleNumber: "OSCOLA 3.7.2",
    title: "Blog Posts",
    summary:
      "Blog posts follow the same format as website sources: Author, 'Post Title' (Blog Name, Date) <URL> accessed Date. The blog name functions as the website/publication name. Titles are in single quotation marks.",
    examples: [
      "Jack of Kent, 'The Importance of Section 3' (Jack of Kent Blog, 15 March 2026) <https://example.com> accessed 20 April 2026.",
    ],
    tips: [
      "Blog name functions as the publication name in the parenthetical.",
      "Include the URL in angle brackets and the access date.",
      "If the author uses a pseudonym, cite the pseudonym.",
    ],
  },
  {
    id: "OSC-REF-046",
    ruleNumber: "OSCOLA 3.7.3",
    title: "Social Media",
    summary:
      "Social media posts are cited: Author (@handle), 'Content excerpt' (Platform, Date) <URL> accessed Date. The content is placed in single quotation marks and truncated to approximately 50 characters with an ellipsis if necessary. The platform name is included in the parenthetical.",
    examples: [
      "The Law Society (@TheLawSociety), 'New guidance on remote hearings published today...' (Twitter, 15 March 2026) <https://twitter.com/...> accessed 20 April 2026.",
    ],
    tips: [
      "Include the author's handle in parentheses after their name.",
      "Truncate long posts to a meaningful excerpt of about 50 characters.",
      "Include the platform name (Twitter/X, LinkedIn, etc.) in the parenthetical.",
    ],
  },
  {
    id: "OSC-REF-047",
    ruleNumber: "OSCOLA 3.7.4–3.7.5",
    title: "Podcasts and Video",
    summary:
      "Podcasts and videos are cited: Author (if applicable), 'Episode/Video Title' (Series/Platform Name, Date) <URL> accessed Date. For podcasts, the series name functions as the publication. For videos, the platform (e.g. YouTube) functions as the publication.",
    examples: [
      "'Law in Action: Supreme Court Review' (BBC Radio 4, 15 March 2026) <https://example.com/podcast> accessed 20 April 2026.",
      "UK Supreme Court, 'R v Adams Judgment Summary' (YouTube, 15 March 2026) <https://youtube.com/watch?v=abc> accessed 20 April 2026.",
    ],
    tips: [
      "For podcasts, the series or programme name functions as the publication.",
      "For video, the platform (YouTube, Vimeo, etc.) appears as the publication.",
      "Include an access date for all digital sources.",
    ],
  },
  {
    id: "OSC-REF-048",
    ruleNumber: "OSCOLA 3.7.13",
    title: "Generative AI (Rule 3.7.13)",
    summary:
      "OSCOLA 5 includes a dedicated rule for citing AI-generated content. The citation includes the AI tool name with provider, the prompt in single quotation marks, the date of generation, and optionally a URL to a shared session. This is a new rule specific to OSCOLA 5.",
    examples: [
      "ChatGPT (OpenAI), 'Summarise the rule in Donoghue v Stevenson' (response generated 15 March 2026) <https://chat.openai.com/share/abc123>.",
      "Claude (Anthropic), 'What are the elements of negligence in English law?' (response generated 10 January 2026).",
    ],
    tips: [
      "Include the AI tool name and provider: 'ChatGPT (OpenAI)', 'Claude (Anthropic)'.",
      "The prompt text goes in single quotation marks per OSCOLA convention.",
      "Include 'response generated [date]' in parentheses.",
      "Include a shareable URL if one exists.",
    ],
  },

  // ──────────────────────────────────────────────
  // Section 4 — International and EU (expanded) (GUIDE-FULL-001)
  // ──────────────────────────────────────────────
  {
    id: "OSC-REF-049",
    ruleNumber: "OSCOLA 4.1",
    title: "Treaties (UNTS Format)",
    summary:
      "Treaties are cited with the title in italics, followed by the adoption date and entry-into-force date in parentheses, and the treaty series reference (volume, series abbreviation, and starting page). The common format uses UNTS (United Nations Treaty Series).",
    examples: [
      "Convention on the Rights of the Child (adopted 20 November 1989, entered into force 2 September 1990) 1577 UNTS 3.",
      "Vienna Convention on the Law of Treaties (adopted 23 May 1969, entered into force 27 January 1980) 1155 UNTS 331, art 31.",
    ],
    tips: [
      "Treaty titles are italic.",
      "Use 'adopted' as the date prefix, then 'entered into force' in the same parenthetical.",
      "Treaty series format: Volume UNTS Page.",
    ],
  },
  {
    id: "OSC-REF-050",
    ruleNumber: "OSCOLA 4.2",
    title: "UN Documents and Resolutions",
    summary:
      "UN documents are cited with the body abbreviation (UNGA, UNSC), the resolution number, the date in parentheses, and the UN document symbol. General Assembly resolutions use 'UNGA Res', Security Council resolutions use 'UNSC Res'. The document symbol is the primary locator.",
    examples: [
      "UNGA Res 217A (III) (10 December 1948) UN Doc A/810.",
      "UNSC Res 1373 (28 September 2001) UN Doc S/RES/1373.",
    ],
    tips: [
      "Use standard abbreviations: UNGA (General Assembly), UNSC (Security Council).",
      "The UN document symbol (UN Doc A/...) is essential.",
      "Session information in parentheses follows the resolution number.",
    ],
  },
  {
    id: "OSC-REF-051",
    ruleNumber: "OSCOLA 4.4",
    title: "ICJ Cases",
    summary:
      "International Court of Justice cases are cited with the case name in italics, the phase of proceedings in parentheses, the year in square brackets, 'ICJ Rep', and the starting page. The phase (Judgment, Preliminary Objections, Advisory Opinion) indicates the stage of the case.",
    examples: [
      "Case Concerning Armed Activities on the Territory of the Congo (Democratic Republic of the Congo v Uganda) (Merits) [2005] ICJ Rep 168.",
    ],
    tips: [
      "Case name in italics, including the parties.",
      "Phase of proceedings in parentheses: (Judgment), (Preliminary Objections), (Advisory Opinion).",
      "Format: [Year] ICJ Rep Page.",
    ],
  },
  {
    id: "OSC-REF-052",
    ruleNumber: "OSCOLA 4.4",
    title: "ITLOS Cases",
    summary:
      "International Tribunal for the Law of the Sea cases are cited with the case name in italics, the phase of proceedings, the year in round brackets, 'ITLOS Reports', and the page number. The case number may be included where relevant.",
    examples: [
      "The M/V \"Saiga\" (No 2) Case (Saint Vincent and the Grenadines v Guinea) (Merits) (1999) ITLOS Reports 10.",
    ],
    tips: [
      "Case name in italics, including the parties in parentheses.",
      "Format: (Year) ITLOS Reports Page.",
      "Include the case number if it aids identification.",
    ],
  },
  {
    id: "OSC-REF-053",
    ruleNumber: "OSCOLA 4.5",
    title: "ICC Cases",
    summary:
      "International Criminal Court cases are cited with the case name in italics, the phase of proceedings, and parenthetical details including the court, chamber, case number, and date. The case number uses the ICC numbering format (e.g. ICC-01/04-01/06).",
    examples: [
      "Prosecutor v Lubanga (Judgment) (ICC, Trial Chamber I, Case No ICC-01/04-01/06, 14 March 2012).",
    ],
    tips: [
      "Case name in italics.",
      "Include the court, chamber, case number, and date in parentheses.",
      "ICC case numbers follow the format: ICC-situation/case.",
    ],
  },
  {
    id: "OSC-REF-054",
    ruleNumber: "OSCOLA 4.6",
    title: "WTO Panel/Appellate Body Reports",
    summary:
      "WTO dispute settlement reports are cited with the report type (Panel Report or Appellate Body Report), the title in italics (using the short title of the dispute), the WTO document number, and the date in parentheses.",
    examples: [
      "Appellate Body Report, United States — Import Prohibition of Certain Shrimp and Shrimp Products, WT/DS58/AB/R (12 October 1998).",
    ],
    tips: [
      "Specify 'Panel Report' or 'Appellate Body Report' before the title.",
      "Title in italics (the short title of the dispute).",
      "Include the WTO document number (WT/DSxx/...) and date.",
    ],
  },
  {
    id: "OSC-REF-055",
    ruleNumber: "OSCOLA 2.4.1–2.4.4",
    title: "EU Regulations and Directives (OJ Format)",
    summary:
      "EU legislative instruments are cited with the instrument type, number, title, and Official Journal reference. The format is: Type Number Title [Year] OJ Series/Page. Legislation titles are in roman type (not italic), consistent with OSCOLA's treatment of all legislation.",
    examples: [
      "Council Regulation (EC) 139/2004 on the control of concentrations between undertakings [2004] OJ L24/1.",
    ],
    tips: [
      "EU legislation titles are roman (not italic) in OSCOLA.",
      "Include the Official Journal reference: [Year] OJ Series/Page.",
      "OJ L series for legislation, OJ C series for information and notices.",
    ],
  },
  {
    id: "OSC-REF-056",
    ruleNumber: "OSCOLA 2.4.5–2.4.7",
    title: "CJEU Cases (ECLI Format)",
    summary:
      "Court of Justice of the European Union cases use the ECLI (European Case Law Identifier) for modern cases. The format is: Case C-X/YY Case Name ECLI. For older cases, the ECR (European Court Reports) reference is used: Case C-X/YY Case Name [Year] ECR Page.",
    examples: [
      "Case C-402/05 P Kadi v Council of the European Union ECLI:EU:C:2008:461.",
      "Case C-6/64 Costa v ENEL [1964] ECR 585.",
    ],
    tips: [
      "Modern CJEU cases: use ECLI identifier.",
      "Older cases: use [Year] ECR Page.",
      "Case name is italic; case number prefix is roman.",
    ],
  },
  {
    id: "OSC-REF-057",
    ruleNumber: "OSCOLA 2.4.6",
    title: "General Court Cases",
    summary:
      "General Court cases (formerly the Court of First Instance) use Case T- as the prefix, distinguishing them from Court of Justice cases (Case C-). The citation format is otherwise identical to CJEU cases, using either ECLI or ECR references.",
    examples: [
      "Case T-315/01 Kadi v Council of the European Union [2005] ECR II-3649.",
    ],
    tips: [
      "General Court cases use Case T- prefix.",
      "Court of Justice cases use Case C- prefix.",
      "ECR references for the General Court use 'ECR II-' (second part).",
    ],
  },
  {
    id: "OSC-REF-058",
    ruleNumber: "OSCOLA 2.4.9",
    title: "Assimilated EU Law (Post-Brexit)",
    summary:
      "After the end of the transition period (31 December 2020), EU legislation retained in UK law is cited as UK domestic legislation (using the SI reference) with a note indicating the EU origin. This is referred to as 'assimilated law' following the Retained EU Law (Revocation and Reform) Act 2023.",
    examples: [
      "General Food Regulations 2004, SI 2004/3279 (originally Council Regulation (EC) 178/2002).",
    ],
    tips: [
      "Cite as UK domestic legislation with an SI reference.",
      "Note the EU origin in parentheses: '(originally [EU instrument])'.",
      "Include '(as amended)' if the retained instrument has been modified post-Brexit.",
    ],
  },
  {
    id: "OSC-REF-059",
    ruleNumber: "OSCOLA 2.4.8",
    title: "EU Treaties",
    summary:
      "EU treaties are cited in roman type (not italic, unlike international treaties) with the consolidated version reference where applicable. Include the Official Journal reference with the year and page. Pinpoints typically refer to article numbers.",
    examples: [
      "Treaty on the Functioning of the European Union [2012] OJ C326/47, art 267.",
      "Consolidated Version of the Treaty on European Union [2012] OJ C326/1, art 6.",
    ],
    tips: [
      "EU treaty titles are in roman type in OSCOLA.",
      "Use the consolidated version where available.",
      "Include the OJ reference: [Year] OJ CPage.",
    ],
  },
  {
    id: "OSC-REF-060",
    ruleNumber: "OSCOLA 4.3",
    title: "ECtHR Cases — Grand Chamber and Section",
    summary:
      "European Court of Human Rights cases are cited with the case name in italics, 'App no' followed by the application number, and the court designation and date in parentheses. Grand Chamber cases include '[GC]' in the parenthetical. Section or Chamber designation is included where relevant to distinguish the formation.",
    examples: [
      "Othman (Abu Qatada) v United Kingdom App no 8139/09 (ECtHR, 17 January 2012).",
      "Al-Adsani v United Kingdom App no 35763/97 (ECtHR [GC], 21 November 2001).",
    ],
    tips: [
      "Grand Chamber designation: '(ECtHR [GC], Date)'.",
      "Standard section judgment: '(ECtHR, Date)'.",
      "Application number format: App no XXXXX/YY.",
      "Admissibility decisions add '(dec)' after the case name.",
    ],
  },
  {
    id: "OSC-REF-061",
    ruleNumber: "OSCOLA 4.3",
    title: "Council of Europe Treaties and Documents",
    summary:
      "Council of Europe treaties are cited with the title in italics, an optional short title, the adoption date, and the ETS or CETS number. Council of Europe documents (recommendations, resolutions) are cited with the issuing body, title in italics, and document number and date in parentheses.",
    examples: [
      "Convention for the Protection of Human Rights and Fundamental Freedoms (European Convention on Human Rights, as amended) (CETS No 005).",
      "Committee of Ministers, Recommendation Rec(2004)6 of the Committee of Ministers to Member States on the Improvement of Domestic Remedies (12 May 2004).",
    ],
    tips: [
      "Treaty titles are italic; short titles appear in parentheses.",
      "Use ETS for original European Treaty Series, CETS for Council of Europe Treaty Series.",
      "Document citations include the issuing body, title, and date.",
    ],
  },
];

// ──────────────────────────────────────────────
// NZLSG Reference Guide Entries (GUIDE-EXT-002)
// ──────────────────────────────────────────────

export const nzlsgReferenceGuideEntries: ReferenceGuideEntry[] = [
  {
    id: "NZLSG-REF-001",
    ruleNumber: "NZLSG 2.1",
    title: "Footnotes and First Citations",
    summary:
      "NZLSG uses footnotes numbered consecutively. The first citation of a source must be in full. Subsequent references use 'above n X, at [pinpoint]' in general style, or short-form only in commercial style. Each footnote ends with a full stop.",
    examples: [
      "1 Andrew Butler and Petra Butler The New Zealand Bill of Rights Act: A Commentary (2nd ed, LexisNexis, Wellington, 2015) at 42.",
    ],
    tips: [
      "First citations must always be the full form.",
      "Footnotes are numbered consecutively through the document.",
      "Each footnote ends with a full stop.",
    ],
  },
  {
    id: "NZLSG-REF-002",
    ruleNumber: "NZLSG 2.3",
    title: "Subsequent References — General Style",
    summary:
      "In NZLSG general style (academic/court), subsequent references use 'above n X, at [pinpoint]'. Ibid is not used. The format is: Author, above n X, at pinpoint. For cases, use the short case name, above n X, at [pinpoint].",
    examples: [
      "Butler and Butler, above n 1, at 55.",
      "Couch v Attorney-General, above n 3, at [42].",
    ],
    tips: [
      "Do not use 'ibid' — always use 'above n X, at [pinpoint]'.",
      "Note the comma after the author name and before 'above'.",
      "Use 'at' before all pinpoints in NZLSG.",
    ],
  },
  {
    id: "NZLSG-REF-003",
    ruleNumber: "NZLSG 2.3",
    title: "Subsequent References — Commercial Style",
    summary:
      "In NZLSG commercial style (publisher), subsequent references use a short-form citation only: author/short title + pinpoint. No cross-reference numbering, no 'above n X', no ibid.",
    examples: [
      "Butler and Butler, at 55.",
      "Couch v Attorney-General at [42].",
    ],
    tips: [
      "Do not use '(n X)' or 'above n X' in commercial style.",
      "The short form is simply: Author, at pinpoint.",
      "Ibid is also not used in commercial style.",
    ],
  },
  {
    id: "NZLSG-REF-004",
    ruleNumber: "NZLSG 3.2",
    title: "NZ Cases — Neutral Citation",
    summary:
      "NZ cases from 2001+ use a neutral citation: [Year] CourtIdentifier Number. The neutral citation is followed by the best report citation, separated by a comma. Case names are italic. Court identifiers include NZSC, NZCA, NZHC, NZDC.",
    examples: [
      "Couch v Attorney-General [2008] NZSC 45.",
      "R v Fonotia [2007] NZCA 188, [2007] 3 NZLR 338.",
    ],
    tips: [
      "Always include the neutral citation for post-2001 NZ cases.",
      "Report series hierarchy: NZLR > NZFLR > CRNZ > NZAR.",
      "Court identifiers: NZSC, NZCA, NZHC, NZDC, NZFC, NZEnvC, etc.",
    ],
  },
  {
    id: "NZLSG-REF-005",
    ruleNumber: "NZLSG 3.5",
    title: "Maori Land Court Citations",
    summary:
      "Maori Land Court decisions use a block/minute book format: Name (Year) BlockNumber CourtAbbrev MinuteBookPage (BlockNumber CourtAbbrev MinuteBookPage). Te reo Maori diacritics (macrons) must be preserved in all names and place names.",
    examples: [
      "Pomare \u2014 Peter Here Pomare (2015) 103 Taitokerau MB 95 (103 TTK 95).",
    ],
    tips: [
      "Use the full minute book reference followed by the abbreviated form in parentheses.",
      "Preserve macrons in all te reo Maori names and place names.",
      "The Maori Land Court uses a full stop after 'v.' in case names (departing from the general rule).",
    ],
  },
  {
    id: "NZLSG-REF-006",
    ruleNumber: "NZLSG 3.6",
    title: "Waitangi Tribunal Reports",
    summary:
      "Waitangi Tribunal reports are cited as primary sources: Waitangi Tribunal Title (Wai Number, Year). The title is in italics. The Wai number is the tribunal's claim number. These appear in a dedicated section of the bibliography.",
    examples: [
      "Waitangi Tribunal Te Whanganui a Tara me ona Takiwa: Report on the Wellington District (Wai 145, 2003).",
    ],
    tips: [
      "The Wai number is the tribunal's claim number, not a page reference.",
      "Report title is italic.",
      "Waitangi Tribunal reports have their own section in the bibliography.",
    ],
  },
  {
    id: "NZLSG-REF-007",
    ruleNumber: "NZLSG 4.1",
    title: "NZ Legislation",
    summary:
      "NZ legislation is cited: Short Title Year — in roman (not italic). No jurisdiction identifier for NZ Acts. Foreign legislation includes the jurisdiction in parentheses. Sections use 's' and 'ss'. Delegated legislation follows the same format.",
    examples: [
      "Privacy Act 2020, s 22.",
      "Counter-Terrorism Act 2008 (UK), s 1.",
    ],
    tips: [
      "NZ legislation titles are NEVER italic.",
      "Do not include a jurisdiction identifier for NZ domestic legislation.",
      "Include the jurisdiction in parentheses for foreign legislation: '(UK)', '(Cth)'.",
    ],
  },
  {
    id: "NZLSG-REF-008",
    ruleNumber: "NZLSG 5.4",
    title: "NZ Parliamentary Debates (NZPD)",
    summary:
      "NZ Hansard is cited: (Date) Volume NZPD Page (Speaker). The date is in parentheses at the start. The speaker's name appears in parentheses at the end.",
    examples: [
      "(12 June 2019) 739 NZPD 12345 (Andrew Little).",
    ],
    tips: [
      "Date comes first in parentheses: (12 June 2019).",
      "Volume number precedes 'NZPD'.",
      "Speaker name in parentheses at the end.",
    ],
  },
  {
    id: "NZLSG-REF-009",
    ruleNumber: "NZLSG 6.1",
    title: "Books",
    summary:
      "Books in NZLSG: Author Title (edition, Publisher, Place, Year) at page. Note the 'at' pinpoint prefix and the inclusion of place of publication. Edition uses 'ed' (not 'edn'). No spaces between author initials.",
    examples: [
      "Andrew Butler and Petra Butler The New Zealand Bill of Rights Act: A Commentary (2nd ed, LexisNexis, Wellington, 2015) at 42.",
    ],
    tips: [
      "Include the place of publication: (Publisher, Place, Year).",
      "Use 'at' before pinpoint references: 'at 42' not just '42'.",
      "Use 'ed' (not 'edn') for edition.",
      "No spaces between initials: 'JF Burrows' not 'J F Burrows'.",
    ],
  },
  {
    id: "NZLSG-REF-010",
    ruleNumber: "NZLSG 6.2",
    title: "Journal Articles",
    summary:
      "Journal articles in NZLSG: Author \"Title\" (Year) Volume Journal Starting Page at pinpoint. Note double quotation marks for the title and 'at' before the pinpoint. Journal abbreviations follow the LCANZ database.",
    examples: [
      "Claudia Geiringer \"Tavita and All That: Confronting the Confusion Surrounding Unincorporated Treaties and Administrative Law\" (2004) 21 NZULR 66 at 70.",
    ],
    tips: [
      "Use double quotation marks for article titles (not single).",
      "Journal abbreviations per LCANZ — no spaces between initials in abbreviations.",
      "Pinpoint uses 'at': 'at 70' not ', 70'.",
    ],
  },
  {
    id: "NZLSG-REF-011",
    ruleNumber: "NZLSG 6.5",
    title: "Online Looseleaf Commentaries",
    summary:
      "Online looseleaf services: Author (ed) Title (online ed, Publisher) at [paragraph]. Include the retrieval date when citing content that may change.",
    examples: [
      "Stephen Todd (ed) The Law of Torts in New Zealand (online ed, Brookers) at [5.3.01].",
    ],
    tips: [
      "Include '(online ed, Publisher)' for online looseleaf services.",
      "Pinpoint to paragraph numbers in square brackets.",
      "Consider including a retrieval date for frequently updated content.",
    ],
  },
  {
    id: "NZLSG-REF-012",
    ruleNumber: "NZLSG 6.7",
    title: "NZ Law Commission Reports",
    summary:
      "NZ Law Commission reports: Law Commission Title (NZLC R/SP/IP/PP Number, Year). The title is italic. Use the correct prefix: R for reports, SP for study papers, IP for issues papers, PP for preliminary papers.",
    examples: [
      "Law Commission Strangulation: The Case for a New Offence (NZLC R138, 2016).",
      "Law Commission The News Media Meets 'New Media' (NZLC IP27, 2011).",
    ],
    tips: [
      "Use the correct NZLC prefix: R (report), SP (study paper), IP (issues paper), PP (preliminary paper).",
      "Title is italic.",
      "Include the year in parentheses after the report number.",
    ],
  },
  {
    id: "NZLSG-REF-013",
    ruleNumber: "NZLSG 10.1",
    title: "Treaty of Waitangi",
    summary:
      "The Treaty of Waitangi is cited by its English or te reo Maori name with article references. Both the English text (Treaty of Waitangi) and the Maori text (Te Tiriti o Waitangi) are available as citation forms.",
    examples: [
      "Treaty of Waitangi, art 2.",
      "Te Tiriti o Waitangi, art 2.",
    ],
    tips: [
      "Use 'Treaty of Waitangi' for the English text and 'Te Tiriti o Waitangi' for the Maori text.",
      "Preamble references are supported: 'Treaty of Waitangi, preamble'.",
      "The Treaty is a primary source in the bibliography.",
    ],
  },
  {
    id: "NZLSG-REF-014",
    ruleNumber: "NZLSG 1.1.2",
    title: "Quotation Marks — Double Quotes",
    summary:
      "NZLSG uses double quotation marks for short quotations and titles of articles and chapters. Single quotation marks are used for quotations within quotations. This differs from AGLC4 and OSCOLA which use single quotation marks.",
    examples: [
      "The court observed that \"the duty is non-delegable\".",
      "Geiringer \"Tavita and All That\" (2004) 21 NZULR 66.",
    ],
    tips: [
      "Use double quotation marks (\u201C \u201D) for short quotations and titles.",
      "Use single quotation marks for quotes within quotes.",
      "This is the opposite of AGLC4 and OSCOLA convention.",
    ],
  },
  {
    id: "NZLSG-REF-015",
    ruleNumber: "NZLSG 10.2",
    title: "International Materials",
    summary:
      "International materials in NZLSG follow the same general format as AGLC4 but with 'at' before pinpoints. Treaties, UN documents, and ICJ decisions adapt the closest AGLC4 rule with NZLSG conventions applied.",
    examples: [
      "International Covenant on Civil and Political Rights (adopted 16 December 1966, entered into force 23 March 1976) 999 UNTS 171, art 14.",
    ],
    tips: [
      "Apply NZLSG pinpoint conventions ('at') to international materials.",
      "Where NZLSG is silent, adapt the closest AGLC4 rule (Rules 8-14).",
      "Treaty titles are italic.",
    ],
  },

  // ── General Rules (expanded) ──────────────────────────────────────────────
  {
    id: "NZLSG-REF-016",
    ruleNumber: "NZLSG 2.1",
    title: "Footnote Closing Punctuation",
    summary:
      "Every NZLSG footnote ends with a full stop, regardless of whether the citation itself ends with a URL in angle brackets, a parenthetical, or a pinpoint reference. The full stop signals the end of the footnote.",
    examples: [
      "Couch v Attorney-General [2008] NZSC 45 at [42].",
      "Privacy Act 2020, s 22.",
    ],
    tips: [
      "Always terminate each footnote with a full stop.",
      "If the citation ends with a URL in angle brackets, the full stop still follows: <https://example.com>.",
      "Do not omit the full stop after parenthetical references.",
    ],
  },
  {
    id: "NZLSG-REF-017",
    ruleNumber: "NZLSG 2.2",
    title: "Multiple Sources in One Footnote",
    summary:
      "When citing multiple sources in a single footnote, separate each citation with a semicolon. Each source follows its own citation format. The footnote ends with a single full stop after the last citation.",
    examples: [
      "Couch v Attorney-General [2008] NZSC 45; Brooker v Police [2007] NZSC 30.",
      "Privacy Act 2020, s 22; Butler and Butler, above n 1, at 55.",
    ],
    tips: [
      "Use semicolons to separate multiple sources in a single footnote.",
      "Only one full stop at the end of the footnote, not after each source.",
      "Each individual citation follows its normal format.",
    ],
  },
  {
    id: "NZLSG-REF-018",
    ruleNumber: "NZLSG 2.3",
    title: "Short Title Introduction",
    summary:
      "When a source has a long title, a short title can be introduced in the first full citation by including the short form in square brackets after the full title. Subsequent references then use the short title with the 'above n X' cross-reference (general style) or on its own (commercial style).",
    examples: [
      "Andrew Butler and Petra Butler The New Zealand Bill of Rights Act: A Commentary (2nd ed, LexisNexis, Wellington, 2015) [NZBORA Commentary] at 42.",
      "NZBORA Commentary, above n 1, at 55.",
    ],
    tips: [
      "Introduce short titles in square brackets in the first full citation.",
      "Use the short title in all subsequent references.",
      "Short titles should be distinctive and easily recognisable.",
    ],
  },
  {
    id: "NZLSG-REF-019",
    ruleNumber: "NZLSG 2.4",
    title: "Pinpoint 'at' Convention",
    summary:
      "NZLSG uses 'at' before all pinpoint references, unlike AGLC4 which uses a comma. This applies to page numbers, paragraph numbers, section numbers in secondary sources, and article numbers in treaties. The 'at' prefix is a distinctive NZLSG convention.",
    examples: [
      "Butler and Butler, above n 1, at 134.",
      "Couch v Attorney-General [2008] NZSC 45 at [42].",
      "Geiringer \"Tavita and All That\" (2004) 21 NZULR 66 at 70.",
    ],
    tips: [
      "Always use 'at' before pinpoints in NZLSG — never a bare comma.",
      "Paragraph pinpoints use square brackets after 'at': at [42].",
      "Page pinpoints are bare numbers after 'at': at 134.",
    ],
  },
  {
    id: "NZLSG-REF-020",
    ruleNumber: "NZLSG 8.1",
    title: "Bibliography Structure",
    summary:
      "NZLSG bibliographies are divided into four sections: (1) Cases, (2) Legislation, (3) Waitangi Tribunal Reports, and (4) Secondary Sources. The Waitangi Tribunal section is a distinctive NZLSG feature. Within each section, entries are listed alphabetically.",
    examples: [
      "A Cases\nCouch v Attorney-General [2008] NZSC 45.",
      "B Legislation\nPrivacy Act 2020.",
      "C Waitangi Tribunal\nWaitangi Tribunal Ko Aotearoa Tenei (Wai 262, 2011).",
      "D Secondary Sources\nButler and Butler The New Zealand Bill of Rights Act (2nd ed, LexisNexis, Wellington, 2015).",
    ],
    tips: [
      "The four-section structure (Cases, Legislation, Waitangi Tribunal, Secondary) is mandatory.",
      "Waitangi Tribunal reports have their own dedicated section.",
      "Within each section, entries are listed alphabetically by first significant word.",
    ],
  },

  // ── Cases (expanded) ──────────────────────────────────────────────────────
  {
    id: "NZLSG-REF-021",
    ruleNumber: "NZLSG 3.2",
    title: "NZ Cases — Parallel Report Citation",
    summary:
      "When a NZ case has both a neutral citation and a report series citation, both are included separated by a comma. The neutral citation comes first, followed by the report series. Report series hierarchy: NZLR > NZFLR > CRNZ > NZAR.",
    examples: [
      "R v Fonotia [2007] NZCA 188, [2007] 3 NZLR 338.",
      "Brooker v Police [2007] NZSC 30, [2007] 3 NZLR 91.",
    ],
    tips: [
      "The neutral citation always comes first.",
      "Separate the neutral citation and report citation with a comma.",
      "Report citation format: [Year] Volume ReportSeries StartPage.",
    ],
  },
  {
    id: "NZLSG-REF-022",
    ruleNumber: "NZLSG 3.4",
    title: "Pre-Neutral Citation Cases",
    summary:
      "NZ cases from before 2001 (when neutral citations were introduced) are cited with the case name, court abbreviation, registry, file number, and date. Registries are omitted for single-registry courts (NZCA, NZSC).",
    examples: [
      "Taylor v Beere HC Wellington CP 291/85, 7 November 1985.",
    ],
    tips: [
      "Format: Case Name Court Registry FileNumber, Date.",
      "Omit registry for single-registry courts (NZCA does not have registries).",
      "Date is in day-month-year format: 7 November 1985.",
    ],
  },
  {
    id: "NZLSG-REF-023",
    ruleNumber: "NZLSG 3.5",
    title: "Maori Appellate Court Citations",
    summary:
      "Maori Appellate Court decisions follow the same block/minute book format as the Maori Land Court. The court is identified by the minute book district. Te reo Maori diacritics (macrons) must be preserved in all names.",
    examples: [
      "Fenwick v Naera (2015) 50 Waikato Maniapoto ACMB 1 (50 WAMAC 1).",
    ],
    tips: [
      "Use the same block/minute book format as the Maori Land Court.",
      "ACMB indicates Appellate Court Minute Book.",
      "Preserve macrons in all te reo Maori names and place names.",
    ],
  },
  {
    id: "NZLSG-REF-024",
    ruleNumber: "NZLSG 3.2",
    title: "Case Pinpoints with 'at' Prefix",
    summary:
      "Pinpoint references in NZ cases use 'at' before paragraph or page numbers. Paragraph numbers appear in square brackets after 'at'. Page numbers appear as bare numbers after 'at'. Ranges use an en-dash.",
    examples: [
      "Couch v Attorney-General [2008] NZSC 45 at [42].",
      "Couch v Attorney-General [2008] NZSC 45 at [42]\u2013[50].",
      "R v Fonotia [2007] NZCA 188, [2007] 3 NZLR 338 at 345.",
    ],
    tips: [
      "Always use 'at' before case pinpoints in NZLSG.",
      "Paragraph ranges use en-dash: at [42]\u2013[50].",
      "When citing a report series, the pinpoint follows the report page.",
    ],
  },
  {
    id: "NZLSG-REF-025",
    ruleNumber: "NZLSG 3.3.3",
    title: "NZ Court Identifiers",
    summary:
      "NZ court identifiers are standardised abbreviations used in neutral citations. The main identifiers are: NZSC (Supreme Court), NZCA (Court of Appeal), NZHC (High Court), NZDC (District Court), NZFC (Family Court), NZEnvC (Environment Court), NZEmpC (Employment Court).",
    examples: [
      "Couch v Attorney-General [2008] NZSC 45.",
      "R v Fonotia [2007] NZCA 188.",
      "Smith v Jones [2020] NZHC 1234.",
    ],
    tips: [
      "NZSC = Supreme Court, NZCA = Court of Appeal, NZHC = High Court, NZDC = District Court.",
      "Specialist courts: NZEnvC, NZEmpC, NZFC, NZHRRT, NZACC, NZLCRO.",
      "Tribunal identifiers: NZBSA, NZMVDT, NZIEAA, NZIACDT, NZREADT, NZTRA.",
    ],
  },

  // ── Legislation (expanded) ────────────────────────────────────────────────
  {
    id: "NZLSG-REF-026",
    ruleNumber: "NZLSG 4.1",
    title: "Foreign Legislation with Jurisdiction",
    summary:
      "When citing foreign legislation in NZLSG, the jurisdiction is included in parentheses after the year. NZ domestic legislation omits the jurisdiction identifier entirely. Common jurisdiction abbreviations include (UK), (Cth), (NSW), (Vic).",
    examples: [
      "Counter-Terrorism Act 2008 (UK), s 1.",
      "Corporations Act 2001 (Cth), s 181.",
      "Evidence Act 1995 (NSW), ss 135\u2013137.",
    ],
    tips: [
      "Only add jurisdiction in parentheses for foreign legislation.",
      "NZ domestic legislation never includes a jurisdiction identifier.",
      "Use standard abbreviations: (UK), (Cth), (NSW), (Vic), (Qld).",
    ],
  },
  {
    id: "NZLSG-REF-027",
    ruleNumber: "NZLSG 4.2",
    title: "NZ Delegated Legislation",
    summary:
      "NZ delegated legislation (regulations, rules, orders) is cited in roman (not italic) with the title, year, and pinpoint. The format mirrors primary legislation. Common pinpoint abbreviations include 'reg' for regulation, 'cl' for clause, and 'r' for rule.",
    examples: [
      "Land Transfer Regulations 2002, reg 4.",
      "District Court Rules 2014, r 3.5.",
    ],
    tips: [
      "Delegated legislation titles are roman (not italic), same as primary legislation.",
      "Use 'reg' for regulation, 'cl' for clause, 'r' for rule, 'sch' for schedule.",
      "No jurisdiction identifier needed for NZ domestic delegated legislation.",
    ],
  },
  {
    id: "NZLSG-REF-028",
    ruleNumber: "NZLSG 4.1",
    title: "NZ Bills",
    summary:
      "NZ Bills are cited with the title in italics (unlike enacted legislation which is roman), followed by the bill number in the format '(no X-N)'. The bill number identifies the bill and its stage through the parliamentary process.",
    examples: [
      "Trusts Bill (no 105-2), cl 5.",
      "Taxation (Annual Rates for 2018\u201319, Modernising Tax Administration, and Remedial Matters) Bill (no 196-1).",
    ],
    tips: [
      "Bill titles are italic — this distinguishes them from enacted legislation.",
      "The bill number format is '(no X-N)' where N indicates the version/stage.",
      "Use 'cl' for clause pinpoints in Bills (not 's' for section).",
    ],
  },
  {
    id: "NZLSG-REF-029",
    ruleNumber: "NZLSG 4.1",
    title: "Legislation Pinpoints",
    summary:
      "Legislation pinpoints in NZLSG use standard abbreviations separated from the title by a comma. Singular and plural forms differ: 's' (section) / 'ss' (sections), 'reg' / 'regs', 'cl' / 'cls', 'sch' / 'schs'. Ranges use en-dashes.",
    examples: [
      "Privacy Act 2020, s 22.",
      "Privacy Act 2020, ss 22\u201325.",
      "Land Transfer Regulations 2002, reg 4.",
      "Resource Management Act 1991, sch 4, cl 6.",
    ],
    tips: [
      "Use 's' for a single section, 'ss' for multiple sections.",
      "Use 'reg' / 'regs', 'cl' / 'cls', 'r' / 'rr' for regulations, clauses, and rules.",
      "Use 'sch' for schedule; combine with clause: 'sch 4, cl 6'.",
      "Ranges use en-dashes: ss 22\u201325 (not hyphens).",
    ],
  },
  {
    id: "NZLSG-REF-030",
    ruleNumber: "NZLSG 4.1",
    title: "NZ Legislation — Roman Not Italic",
    summary:
      "A key NZLSG convention is that NZ legislation titles are set in roman type (not italic). This differs from AGLC4 where legislation titles are italic. The roman convention applies to both primary and delegated legislation, but not to Bills (which are italic).",
    examples: [
      "Privacy Act 2020, s 22.",
      "Resource Management Act 1991, s 5.",
      "But: Trusts Bill (no 105-2), cl 5.",
    ],
    tips: [
      "NZ legislation: ALWAYS roman (not italic).",
      "NZ Bills: ALWAYS italic (distinguishes enacted from pending legislation).",
      "This is opposite to AGLC4 which italicises all legislation titles.",
    ],
  },

  // ── Parliamentary Materials (expanded) ────────────────────────────────────
  {
    id: "NZLSG-REF-031",
    ruleNumber: "NZLSG 5.5",
    title: "Select Committee Submissions",
    summary:
      "Select committee submissions are cited with the submitter, the submission title in double quotation marks (formatted as 'Submission to the [Committee] on the [Bill/Inquiry]'), and the date in parentheses.",
    examples: [
      "New Zealand Law Society \"Submission to the Justice and Electoral Committee on the Search and Surveillance Bill\" (2009).",
    ],
    tips: [
      "The submission title follows a standard formula: 'Submission to the [Committee] on the [Bill/Inquiry]'.",
      "Use double quotation marks around the submission title.",
      "The date appears in parentheses at the end.",
    ],
  },
  {
    id: "NZLSG-REF-032",
    ruleNumber: "NZLSG 5.5",
    title: "Cabinet Documents",
    summary:
      "Cabinet documents are cited with 'Cabinet Office' as the author, the document title in double quotation marks, and the cabinet reference number and date in parentheses.",
    examples: [
      "Cabinet Office \"Power to Delay Commencement of the Search and Surveillance Act 2012\" (CAB Min (12) 14/11, 30 April 2012).",
    ],
    tips: [
      "Use 'Cabinet Office' as the author.",
      "Title in double quotation marks.",
      "The cabinet reference number appears before the date in parentheses.",
    ],
  },
  {
    id: "NZLSG-REF-033",
    ruleNumber: "NZLSG 5.5",
    title: "New Zealand Gazette",
    summary:
      "Notices in the New Zealand Gazette are cited with the notice title in double quotation marks, the year in parentheses, followed by 'New Zealand Gazette' and the page number.",
    examples: [
      "\"Appointment of District Court Judge\" (2018) New Zealand Gazette 1234.",
    ],
    tips: [
      "Title of the notice in double quotation marks.",
      "Year appears in parentheses before 'New Zealand Gazette'.",
      "Page number follows without 'at' — this source uses a direct page reference.",
    ],
  },
  {
    id: "NZLSG-REF-034",
    ruleNumber: "NZLSG 5.5",
    title: "Appendices to the Journals of the House (AJHR)",
    summary:
      "AJHR documents are cited with the author (if any), the title in italics, and the AJHR reference in the format 'AJHR Year Reference'. These are historical parliamentary papers.",
    examples: [
      "Department of Justice Reform of the Law of Contempt AJHR 1987 I.11.",
    ],
    tips: [
      "The AJHR reference includes year and alphanumeric code: 'AJHR 1987 I.11'.",
      "Title is italic.",
      "Author/body is optional and precedes the title when included.",
    ],
  },

  // ── Secondary Sources (expanded) ──────────────────────────────────────────
  {
    id: "NZLSG-REF-035",
    ruleNumber: "NZLSG 6.5",
    title: "Theses",
    summary:
      "Theses in NZLSG use double quotation marks for the title (not italic). The degree type, university, and year appear in parentheses. The word 'Thesis' follows the degree abbreviation.",
    examples: [
      "John Smith \"The Impact of Treaty Settlements\" (LLM Thesis, Victoria University of Wellington, 2015) at 45.",
    ],
    tips: [
      "Thesis titles use double quotation marks, NOT italics.",
      "Include the degree type followed by 'Thesis': 'LLM Thesis', 'PhD Thesis'.",
      "University and year in the same parenthetical: (LLM Thesis, University, Year).",
      "Pinpoints use the standard 'at' prefix.",
    ],
  },
  {
    id: "NZLSG-REF-036",
    ruleNumber: "NZLSG 6.6",
    title: "Edited Book Chapters",
    summary:
      "Chapters in edited books are cited with the chapter author, chapter title in double quotation marks, 'in' followed by the editor name(s) with '(ed)' or '(eds)', the book title in italics, and publication details. The 'at' pinpoint prefix applies.",
    examples: [
      "Grant Huscroft \"Rights, Bills of Rights, and the Role of Courts and Legislatures\" in Grant Huscroft and Paul Rishworth (eds) Litigating Rights (Hart Publishing, Oxford, 2002) at 1.",
    ],
    tips: [
      "Chapter title in double quotation marks; book title in italics.",
      "Use 'in' (not italic) to connect chapter to book.",
      "Editors designated with '(ed)' or '(eds)' after their names.",
      "Include place of publication in parenthetical details.",
    ],
  },
  {
    id: "NZLSG-REF-037",
    ruleNumber: "NZLSG 7",
    title: "Internet Materials",
    summary:
      "Internet materials in NZLSG use double quotation marks for titles and include the URL in angle brackets. The format is: Author \"Title\" (Year) Website <URL>. The 'at' prefix applies to pinpoints.",
    examples: [
      "John Smith \"Legal Aid in New Zealand\" (2024) Ministry of Justice <https://example.govt.nz/legal-aid>.",
    ],
    tips: [
      "Use double quotation marks for the page/article title.",
      "Website name follows the year in parentheses.",
      "URL in angle brackets at the end.",
      "Pinpoints use 'at' prefix.",
    ],
  },
  {
    id: "NZLSG-REF-038",
    ruleNumber: "NZLSG 7",
    title: "Newspaper Articles",
    summary:
      "Newspaper articles use double quotation marks for the article title and italics for the newspaper name. The place of publication and date appear in parentheses. Pinpoints use 'at' before the page reference.",
    examples: [
      "Jane Doe \"Courts Face Backlog\" The New Zealand Herald (Auckland, 15 March 2024) at A3.",
    ],
    tips: [
      "Article title in double quotation marks.",
      "Newspaper name in italics.",
      "Place and date in parentheses: (Auckland, 15 March 2024).",
      "Pinpoint uses 'at' prefix: at A3.",
    ],
  },

  // ── Treaty of Waitangi (expanded) ─────────────────────────────────────────
  {
    id: "NZLSG-REF-039",
    ruleNumber: "NZLSG 10.1",
    title: "Treaty of Waitangi — English Version",
    summary:
      "The English text of the Treaty of Waitangi is cited as 'Treaty of Waitangi' followed by the article reference. Preamble references use 'preamble' after a comma. The Treaty is a primary source in the bibliography with its own dedicated section.",
    examples: [
      "Treaty of Waitangi art 2.",
      "Treaty of Waitangi, preamble.",
    ],
    tips: [
      "Use 'Treaty of Waitangi' for the English text.",
      "Article references: 'art 1', 'art 2', 'art 3'.",
      "Preamble reference uses comma: 'Treaty of Waitangi, preamble'.",
    ],
  },
  {
    id: "NZLSG-REF-040",
    ruleNumber: "NZLSG 10.1",
    title: "Te Tiriti o Waitangi — Te Reo Maori Version",
    summary:
      "The te reo Maori text of the Treaty is cited as 'Te Tiriti o Waitangi' with the same article and preamble reference conventions. Both language versions are valid citation forms; the choice depends on which text is being discussed.",
    examples: [
      "Te Tiriti o Waitangi art 2.",
      "Te Tiriti o Waitangi, preamble.",
    ],
    tips: [
      "Use 'Te Tiriti o Waitangi' when citing the Maori-language text.",
      "The choice between English and Maori text is substantive — it depends on which version is being analysed.",
      "Both versions are primary sources in the bibliography.",
    ],
  },
  {
    id: "NZLSG-REF-041",
    ruleNumber: "NZLSG 10.1",
    title: "Treaty of Waitangi — Article and Preamble References",
    summary:
      "The Treaty of Waitangi has a preamble and three articles. Article references use 'art' followed by the number. Preamble references use 'preamble' after a comma. Both English and Maori versions support the same reference conventions.",
    examples: [
      "Treaty of Waitangi art 1.",
      "Treaty of Waitangi art 3.",
      "Te Tiriti o Waitangi, preamble.",
    ],
    tips: [
      "Use 'art' (not 'article') for brevity.",
      "The Treaty has three articles (art 1, art 2, art 3) and a preamble.",
      "Different articles have different implications — art 2 is the most frequently cited.",
    ],
  },

  // ── International Materials (expanded) ────────────────────────────────────
  {
    id: "NZLSG-REF-042",
    ruleNumber: "NZLSG 10.1",
    title: "International Treaties with 'at' Pinpoint",
    summary:
      "International treaties are cited with the title in italics, signing and entry-into-force details in parentheses, and the treaty series reference. NZLSG applies the 'at' pinpoint convention to treaty article references, unlike AGLC4.",
    examples: [
      "Vienna Convention on the Law of Treaties (opened for signature 23 May 1969, entered into force 27 January 1980) at art 31.",
      "Convention on the Rights of the Child (opened for signature 20 November 1989, entered into force 2 September 1990) 1577 UNTS 3 at art 3.",
    ],
    tips: [
      "Treaty titles are italic.",
      "Use 'at' before article pinpoints: 'at art 31'.",
      "Include treaty series (UNTS, ATS) where applicable.",
      "Signing and entry-into-force dates in parentheses.",
    ],
  },
  {
    id: "NZLSG-REF-043",
    ruleNumber: "NZLSG 10.2",
    title: "UN Documents and Resolutions",
    summary:
      "UN documents are cited with the body, the document title in italics, the document symbol (e.g. A/RES/61/295), and the date in parentheses. NZLSG applies the 'at' pinpoint prefix.",
    examples: [
      "UN General Assembly United Nations Declaration on the Rights of Indigenous Peoples A/RES/61/295 (2007) at art 26.",
    ],
    tips: [
      "Include the UN body as the first element.",
      "Document title in italics.",
      "Document symbol (e.g. A/RES/61/295) follows the title.",
      "Pinpoints use 'at' prefix: at art 26.",
    ],
  },
  {
    id: "NZLSG-REF-044",
    ruleNumber: "NZLSG 10.3",
    title: "ICJ Cases",
    summary:
      "International Court of Justice decisions are cited with the case name in italics (including parties), the phase in parentheses, the year in square brackets, the ICJ Reports reference, and 'at' before pinpoints.",
    examples: [
      "Nuclear Tests (New Zealand v France) (Interim Protection) [1973] ICJ Rep 135 at 139.",
    ],
    tips: [
      "Case name and parties in italics.",
      "Phase in parentheses: (Judgment), (Interim Protection), (Advisory Opinion).",
      "Use 'at' before page pinpoints: at 139.",
      "ICJ Reports abbreviation: ICJ Rep.",
    ],
  },

  // ── Te Reo Maori Conventions ──────────────────────────────────────────────
  {
    id: "NZLSG-REF-045",
    ruleNumber: "NZLSG 1.1",
    title: "Te Reo Maori — Macron Preservation",
    summary:
      "NZLSG requires that macrons (tohut\u014D) be preserved in all te reo M\u0101ori words, names, and place names throughout citations. This applies to case names, place names in registries, Waitangi Tribunal report titles, and any other Maori-language text.",
    examples: [
      "Waitangi Tribunal Ko Aotearoa T\u0113nei (Wai 262, 2011).",
      "Waitangi Tribunal Te Whanganui a Tara me ona Takiw\u0101: Report on the Wellington District (Wai 145, 2003).",
    ],
    tips: [
      "Always preserve macrons (\u0101, \u0113, \u012B, \u014D, \u016B) in te reo M\u0101ori text.",
      "This applies to place names (T\u0101maki Makaurau, \u014Ctautahi), personal names, and titles.",
      "Use Unicode characters for macrons, not approximations.",
    ],
  },
  {
    id: "NZLSG-REF-046",
    ruleNumber: "NZLSG 1.1",
    title: "Te Reo Maori — Place Names and Terminology",
    summary:
      "Te reo M\u0101ori place names and legal terminology are used throughout NZ legal citation. Key terms include wh\u0101nau, hap\u016B, iwi, mana whenua, tikanga, and kaitiakitanga. These are not italicised as they are accepted NZ English terms.",
    examples: [
      "The principle of tikanga M\u0101ori was considered by the court.",
      "The wh\u0101nau trust was established under the Te Ture Whenua Maori Act 1993.",
    ],
    tips: [
      "Common te reo M\u0101ori legal terms are not italicised in NZ legal writing.",
      "Preserve macrons in all te reo M\u0101ori words.",
      "Terms like tikanga, wh\u0101nau, hap\u016B, iwi, kaitiakitanga are treated as NZ English.",
    ],
  },

  // ── Digital and Blog Sources ──────────────────────────────────────────────
  {
    id: "NZLSG-REF-047",
    ruleNumber: "NZLSG 7",
    title: "Blog Posts",
    summary:
      "Blog posts in NZLSG are cited with the author, the post title in double quotation marks, the date in parentheses, the blog name, and the URL in angle brackets.",
    examples: [
      "Andrew Geddis \"The Bill of Rights and Parliament\" (15 March 2024) Pundit <https://example.com>.",
    ],
    tips: [
      "Post title in double quotation marks.",
      "Blog name is not italicised.",
      "Date in parentheses between title and blog name.",
      "URL in angle brackets at the end.",
    ],
  },
  {
    id: "NZLSG-REF-048",
    ruleNumber: "NZLSG 7",
    title: "Social Media Posts",
    summary:
      "Social media posts are cited with the author, optional handle in parentheses, a content excerpt in double quotation marks, the platform and date in parentheses, and the URL in angle brackets.",
    examples: [
      "Andrew Little (@AndrewLittleMP) \"Justice reforms announced today\" (Twitter, 15 March 2024) <https://example.com>.",
    ],
    tips: [
      "Include the social media handle in parentheses after the author name.",
      "Content excerpt in double quotation marks.",
      "Platform and date in parentheses: (Twitter, 15 March 2024).",
    ],
  },
  {
    id: "NZLSG-REF-049",
    ruleNumber: "NZLSG 7",
    title: "Broadcast Material",
    summary:
      "Broadcast material (radio, television) is cited with the programme title in double quotation marks, followed by production details in parentheses: director or presenter, broadcaster, and date.",
    examples: [
      "\"The Case for Justice\" (Kim Hill, RNZ, 15 March 2024).",
    ],
    tips: [
      "Programme title in double quotation marks.",
      "Production details in parentheses: presenter/director, broadcaster, date.",
      "Common NZ broadcasters: RNZ, TVNZ, Newshub.",
    ],
  },

  // ── Additional Secondary Source Types ─────────────────────────────────────
  {
    id: "NZLSG-REF-050",
    ruleNumber: "NZLSG 6.7",
    title: "NZ Law Commission Report Types",
    summary:
      "The NZ Law Commission publishes several types of documents, each with a distinct prefix: R (Report), SP (Study Paper), IP (Issues Paper), PP (Preliminary Paper). The prefix and number are included in the NZLC reference within parentheses.",
    examples: [
      "Law Commission Strangulation: The Case for a New Offence (NZLC R138, 2016).",
      "Law Commission The News Media Meets 'New Media' (NZLC IP27, 2011).",
      "Law Commission Review of the Privacy Act 1993 (NZLC R123, 2011) at 55.",
    ],
    tips: [
      "R = Report (final recommendations).",
      "SP = Study Paper (detailed analysis).",
      "IP = Issues Paper (consultation document).",
      "PP = Preliminary Paper (early-stage discussion).",
    ],
  },
  {
    id: "NZLSG-REF-051",
    ruleNumber: "NZLSG 6.4",
    title: "Online Looseleaf Services",
    summary:
      "Online looseleaf commentaries are cited with the editor, '(ed)' designation, title in italics, '(online ed, Publisher)' in parentheses, and paragraph pinpoints. Consider including a retrieval date for frequently updated content.",
    examples: [
      "Stephen Todd (ed) The Law of Torts in New Zealand (online ed, Brookers) at [5.3.01].",
    ],
    tips: [
      "Include '(online ed, Publisher)' in parentheses.",
      "Pinpoint to paragraph numbers in square brackets: at [5.3.01].",
      "Consider including a retrieval date for volatile online content.",
      "Editor designated with '(ed)' after their name.",
    ],
  },
  {
    id: "NZLSG-REF-052",
    ruleNumber: "NZLSG 3.6",
    title: "Waitangi Tribunal Reports — Expanded",
    summary:
      "Waitangi Tribunal reports are primary sources with their own bibliography section. The Wai number is the claim number assigned by the Tribunal. Reports are cited: Waitangi Tribunal Title (Wai Number, Year). The title is italicised. Te reo Maori titles preserve macrons.",
    examples: [
      "Waitangi Tribunal Ko Aotearoa T\u0113nei (Wai 262, 2011) at 23.",
      "Waitangi Tribunal Te Whanganui a Tara me ona Takiw\u0101: Report on the Wellington District (Wai 145, 2003).",
      "Waitangi Tribunal The Napier Hospital and Health Services Report (Wai 692, 2001).",
    ],
    tips: [
      "The Wai number is the Tribunal's claim number, not a page reference.",
      "Reports appear in the dedicated 'Waitangi Tribunal' section of the bibliography.",
      "Te reo M\u0101ori titles preserve macrons.",
      "Pinpoints use 'at' prefix: at 23.",
    ],
  },
];

// ──────────────────────────────────────────────
// Court Mode Reference Guide Entries (COURT-011 / COURT-012)
// ──────────────────────────────────────────────

/**
 * COURT-011: Selectivity duty reminder for Queensland courts.
 * Displayed when any Qld preset is active.
 *
 * @source Qld SC PD 1/2024 cl 5
 */
export const courtGuideQldSelectivity: ReferenceGuideEntry = {
  id: "COURT-011-QLD",
  ruleNumber: "PD 1/2024 cl 5",
  title: "Queensland Selectivity Duty",
  summary:
    "PD 1/2024 cl 5: Limit citation to authorities necessary to establish principles. Do not cite authorities that merely rephrase, illustrate, or apply principles established in other cited authorities.",
  examples: [],
  tips: [
    "Before adding another authority, ask whether it establishes a new principle or merely illustrates one already cited.",
    "Courts may make adverse costs orders where excessive authorities are cited without justification.",
  ],
};

/**
 * COURT-011: Selectivity duty reminder for NSW courts.
 * Displayed when any NSW preset is active.
 *
 * @source NSW SC PN Gen 20
 */
export const courtGuideNswSelectivity: ReferenceGuideEntry = {
  id: "COURT-011-NSW",
  ruleNumber: "PN SC Gen 20",
  title: "NSW Selectivity Duty",
  summary:
    "PN SC Gen 20: Citation of unreported judgments is limited to cases containing a material statement of legal principle not found in reported authority.",
  examples: [],
  tips: [
    "Prefer reported authorities where available. Cite unreported judgments only when they contain a novel statement of principle.",
    "If citing an unreported judgment, be prepared to explain why no reported authority covers the same point.",
  ],
};

/**
 * COURT-012: Victoria AGLC adoption note.
 * Displayed when any Vic preset is active.
 *
 * @source Vic SC PN Gen 3 cl 4.1
 */
export const courtGuideVicAglcAdoption: ReferenceGuideEntry = {
  id: "COURT-012-VIC",
  ruleNumber: "PN SC Gen 3 cl 4.1",
  title: "Victoria AGLC Adoption",
  summary:
    "The Supreme Court of Victoria uses the AGLC as the basis for citation formats (PN SC Gen 3 cl 4.1). Academic AGLC4 formatting is appropriate for Victorian court submissions, with the addition of parallel citations.",
  examples: [],
  tips: [
    "AGLC4-compliant formatting requires no adjustment for Victorian court submissions beyond adding parallel citations.",
    "Vic pinpoint style uses both page and paragraph: 420, [45].",
  ],
};
