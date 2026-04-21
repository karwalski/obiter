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
