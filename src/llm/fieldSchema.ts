/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * The form field schema for every source type: the field names each Insert
 * form writes, with descriptions the AI prompts show the model. Moved out of
 * corpusEnhancedParse.ts so the parse-verification loop can read it without
 * a circular import (LCT-010).
 */

import type { SourceType } from "../types/citation";

export interface FieldDescriptor {
  name: string;
  description: string;
}

/**
 * Return the expected form field names for a given source type.
 * These match exactly the field names used by updateField() in each
 * renderXxxForm function in InsertCitation.tsx.
 */
export function getFieldSchemaForSourceType(sourceType: SourceType): FieldDescriptor[] {
  const schemas: Record<string, FieldDescriptor[]> = {
    "case.reported": [
      { name: "party1", description: "First party name" },
      { name: "party2", description: "Second party name" },
      {
        name: "separator",
        // BUG-002 / AGLC4 rule 2.1.1: opposing parties are separated only by
        // "v". "&" and "and" inside a name ("Land & House Property
        // Corporation") are part of that party's name — never a delimiter.
        description:
          'Party separator between the opposing parties: almost always "v". ' +
          'Never treat "&" or "and" inside a company or party name as the separator',
      },
      { name: "yearType", description: '"round" for (year) or "square" for [year]' },
      { name: "year", description: "Year of the decision" },
      { name: "volume", description: "Report volume number" },
      { name: "reportSeries", description: "Report series abbreviation (e.g. CLR, HCA)" },
      { name: "startingPage", description: "Starting page number" },
      { name: "courtId", description: "Court abbreviation (if not apparent from report series)" },
      { name: "mnc", description: "Medium neutral citation number (if also unreported)" },
      { name: "pinpoint", description: "Pinpoint reference (page, paragraph)" },
    ],
    "case.unreported.mnc": [
      { name: "party1", description: "First party name" },
      { name: "party2", description: "Second party name" },
      { name: "year", description: "Year of the decision" },
      { name: "court", description: "Court abbreviation (e.g. HCA, NSWSC)" },
      { name: "caseNumber", description: "Case/judgment number" },
      { name: "pinpoint", description: "Pinpoint reference" },
      { name: "judicialOfficer", description: "Name of the judicial officer" },
    ],
    "case.unreported.no_mnc": [
      { name: "party1", description: "First party name" },
      { name: "party2", description: "Second party name" },
      { name: "court", description: "Court name or abbreviation" },
      { name: "proceedingNumber", description: "Proceeding or file number" },
      { name: "date", description: "Date of the decision" },
    ],
    "case.proceeding": [
      { name: "party1", description: "First party name" },
      { name: "party2", description: "Second party name" },
      { name: "court", description: "Court name or abbreviation" },
      { name: "proceedingNumber", description: "Proceeding number" },
      { name: "commencedDate", description: "Date commenced" },
    ],
    "case.court_order": [
      { name: "party1", description: "First party name" },
      { name: "party2", description: "Second party name" },
      { name: "court", description: "Court name or abbreviation" },
      { name: "orderDate", description: "Date of the order" },
    ],
    "case.quasi_judicial": [
      { name: "party", description: "Party name or parties" },
      { name: "department", description: "Department or body" },
      { name: "year", description: "Year" },
      { name: "volume", description: "Report volume" },
      { name: "reportSeries", description: "Report series" },
      { name: "startingPage", description: "Starting page" },
      { name: "pinpoint", description: "Pinpoint reference" },
    ],
    "case.arbitration": [
      { name: "parties", description: "Parties to the arbitration" },
      { name: "arbitrationType", description: "Type of arbitration" },
      { name: "year", description: "Year of the award" },
      { name: "awardDetails", description: "Award details / citation" },
      { name: "pinpoint", description: "Pinpoint reference" },
    ],
    "case.transcript": [
      { name: "party1", description: "First party name" },
      { name: "party2", description: "Second party name" },
      { name: "year", description: "Year" },
      { name: "court", description: "Court" },
      { name: "caseNumber", description: "Case number" },
      { name: "proceedingNumber", description: "Proceeding number" },
      { name: "date", description: "Transcript date" },
      { name: "pinpoint", description: "Pinpoint reference" },
      { name: "hcaTranscript", description: "Whether this is an HCA transcript" },
    ],
    "case.submission": [
      { name: "partyName", description: "Submitting party name" },
      { name: "submissionTitle", description: "Submission title" },
      { name: "caseParty1", description: "First party in the case" },
      { name: "caseParty2", description: "Second party in the case" },
      { name: "proceedingNumber", description: "Proceeding number" },
      { name: "date", description: "Submission date" },
      { name: "pinpoint", description: "Pinpoint reference" },
    ],
    "legislation.statute": [
      { name: "title", description: "Short title of the Act" },
      { name: "year", description: "Year of enactment" },
      { name: "jurisdiction", description: 'Jurisdiction abbreviation (e.g. "Cth", "NSW", "Vic")' },
      { name: "number", description: "Act number" },
      { name: "pinpoint", description: "Section / schedule pinpoint (e.g. s 51, sch 2)" },
    ],
    "legislation.bill": [
      { name: "title", description: "Bill title" },
      { name: "year", description: "Year" },
      { name: "jurisdiction", description: "Jurisdiction abbreviation" },
      { name: "number", description: "Bill number" },
      { name: "pinpoint", description: "Clause pinpoint" },
    ],
    "legislation.delegated": [
      { name: "title", description: "Instrument title" },
      { name: "year", description: "Year" },
      { name: "jurisdiction", description: "Jurisdiction abbreviation" },
      { name: "number", description: "Instrument number" },
      { name: "pinpoint", description: "Pinpoint reference" },
    ],
    "legislation.constitution": [
      { name: "constitutionType", description: 'Type: "Commonwealth" or "State"' },
      { name: "jurisdiction", description: "Jurisdiction" },
      { name: "title", description: "Constitution title" },
      { name: "year", description: "Year" },
      { name: "pinpoint", description: "Section pinpoint" },
    ],
    "legislation.explanatory": [
      { name: "type", description: 'Type: "Explanatory Memorandum" or "Explanatory Statement"' },
      { name: "billTitle", description: "Title of the bill" },
      { name: "billYear", description: "Year of the bill" },
      { name: "jurisdiction", description: "Jurisdiction abbreviation" },
      { name: "pinpoint", description: "Pinpoint reference" },
    ],
    "legislation.quasi": [
      {
        name: "quasiVariant",
        description: 'Variant: e.g. "rules", "practice direction", "gazette notice"',
      },
      { name: "issuingBody", description: "Issuing body" },
      { name: "documentType", description: "Document type" },
      { name: "number", description: "Document number" },
      { name: "title", description: "Title" },
      { name: "date", description: "Date" },
      { name: "jurisdiction", description: "Jurisdiction" },
      { name: "gazetteType", description: "Gazette type" },
      { name: "page", description: "Page number" },
    ],
    "journal.article": [
      { name: "authors", description: "Array of { givenNames, surname }" },
      { name: "title", description: "Article title" },
      { name: "year", description: "Publication year" },
      { name: "volume", description: "Journal volume" },
      { name: "issue", description: "Journal issue number" },
      { name: "journal", description: "Journal name" },
      { name: "startingPage", description: "Starting page" },
      { name: "pinpoint", description: "Pinpoint page" },
    ],
    "journal.online": [
      { name: "authors", description: "Array of { givenNames, surname }" },
      { name: "title", description: "Article title" },
      { name: "journal", description: "Journal name" },
      { name: "url", description: "URL" },
      { name: "dateAccessed", description: "Date accessed" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "journal.forthcoming": [
      { name: "authors", description: "Array of { givenNames, surname }" },
      { name: "title", description: "Article title" },
      { name: "journal", description: "Journal name" },
      { name: "year", description: "Expected publication year" },
      { name: "volume", description: "Expected volume" },
      { name: "forthcomingNote", description: "Forthcoming note" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    book: [
      { name: "authors", description: "Array of { givenNames, surname }" },
      { name: "title", description: "Book title" },
      { name: "publisher", description: "Publisher name" },
      { name: "edition", description: "Edition" },
      { name: "year", description: "Publication year" },
      { name: "pinpoint", description: "Pinpoint page" },
    ],
    "book.chapter": [
      { name: "authors", description: "Array of { givenNames, surname } for chapter author" },
      { name: "chapterTitle", description: "Chapter title" },
      { name: "editors", description: "Array of { givenNames, surname } for editors" },
      { name: "title", description: "Book title" },
      { name: "publisher", description: "Publisher" },
      { name: "edition", description: "Edition" },
      { name: "year", description: "Year" },
      { name: "startingPage", description: "Starting page of chapter" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "book.translated": [
      { name: "authors", description: "Array of { givenNames, surname }" },
      { name: "title", description: "Book title" },
      { name: "translator", description: "Translator name" },
      { name: "publisher", description: "Publisher" },
      { name: "edition", description: "Edition" },
      { name: "year", description: "Year" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "book.audiobook": [
      { name: "authors", description: "Array of { givenNames, surname }" },
      { name: "title", description: "Book title" },
      { name: "narrator", description: "Narrator name" },
      { name: "publisher", description: "Publisher" },
      { name: "year", description: "Year" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    report: [
      { name: "author", description: "Author or institutional author name" },
      { name: "title", description: "Report title" },
      { name: "reportNumber", description: "Report number" },
      { name: "year", description: "Year" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "report.parliamentary": [
      { name: "body", description: "Parliamentary body or committee" },
      { name: "title", description: "Report title" },
      { name: "parlPaperNumber", description: "Parliamentary paper number" },
      { name: "year", description: "Year" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "report.royal_commission": [
      { name: "title", description: "Report title" },
      { name: "commissioner", description: "Commissioner name" },
      { name: "year", description: "Year" },
      { name: "volume", description: "Volume" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "report.law_reform": [
      { name: "body", description: "Law reform body" },
      { name: "title", description: "Report title" },
      { name: "reportNumber", description: "Report number" },
      { name: "year", description: "Year" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "report.abs": [
      { name: "title", description: "Publication title" },
      { name: "catalogueNumber", description: "ABS catalogue number" },
      { name: "date", description: "Date" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    research_paper: [
      { name: "authors", description: "Array of { givenNames, surname }" },
      { name: "title", description: "Paper title" },
      { name: "seriesNumber", description: "Series/working paper number" },
      { name: "year", description: "Year" },
      { name: "institution", description: "Institution" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "research_paper.parliamentary": [
      { name: "authors", description: "Array of { givenNames, surname }" },
      { name: "title", description: "Paper title" },
      { name: "researchPaperNumber", description: "Research paper number" },
      { name: "date", description: "Date" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    conference_paper: [
      { name: "authors", description: "Array of { givenNames, surname }" },
      { name: "title", description: "Paper title" },
      { name: "conferenceName", description: "Conference name" },
      { name: "location", description: "Conference location" },
      { name: "date", description: "Conference date" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    thesis: [
      { name: "author", description: "Author name" },
      { name: "title", description: "Thesis title" },
      { name: "thesisType", description: "Type (PhD, Masters, etc.)" },
      { name: "institution", description: "Institution" },
      { name: "year", description: "Year" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    speech: [
      { name: "speaker", description: "Speaker name" },
      { name: "title", description: "Speech title" },
      { name: "event", description: "Event or occasion" },
      { name: "location", description: "Location" },
      { name: "date", description: "Date" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    press_release: [
      { name: "issuingBody", description: "Issuing body or person" },
      { name: "title", description: "Title of the press release" },
      { name: "number", description: "Press release number" },
      { name: "date", description: "Date" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    hansard: [
      { name: "jurisdiction", description: "Parliament (e.g. Commonwealth, New South Wales)" },
      {
        name: "chamber",
        description: "Chamber (e.g. Senate, House of Representatives, Legislative Assembly)",
      },
      { name: "date", description: "Date of the debate" },
      { name: "pinpoint", description: "Page number" },
      { name: "speaker", description: "Name of the speaker" },
    ],
    "submission.government": [
      { name: "author", description: "Author or organisation" },
      { name: "title", description: "Submission title" },
      { name: "inquiryName", description: "Inquiry name" },
      { name: "submissionNumber", description: "Submission number" },
      { name: "date", description: "Date" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "evidence.parliamentary": [
      { name: "witness", description: "Witness name" },
      { name: "committee", description: "Committee name" },
      { name: "inquiryTitle", description: "Inquiry title" },
      { name: "date", description: "Date" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    constitutional_convention: [
      { name: "conventionName", description: "Convention name" },
      { name: "date", description: "Date" },
      { name: "pinpoint", description: "Pinpoint" },
      { name: "speaker", description: "Speaker name" },
    ],
    dictionary: [
      { name: "title", description: "Dictionary title" },
      { name: "edition", description: "Edition" },
      { name: "year", description: "Year" },
      { name: "entryTerm", description: "Entry term being defined" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    legal_encyclopedia: [
      { name: "title", description: "Encyclopedia title" },
      { name: "volume", description: "Volume" },
      { name: "titleNumber", description: "Title number within volume" },
      { name: "topic", description: "Topic name" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    looseleaf: [
      { name: "authors", description: "Array of { givenNames, surname }" },
      { name: "title", description: "Service title" },
      { name: "publisher", description: "Publisher" },
      { name: "serviceNumber", description: "Service number" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    ip_material: [
      { name: "applicant", description: "Applicant name" },
      { name: "title", description: "Title of the IP material" },
      { name: "ipType", description: "Type (Patent, Trade Mark, Design)" },
      { name: "country", description: "Country" },
      { name: "date", description: "Date" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    constitutive_document: [
      { name: "entityName", description: "Entity name" },
      { name: "documentType", description: "Document type (Constitution, Charter, etc.)" },
      { name: "date", description: "Date" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    newspaper: [
      { name: "author", description: "Author name" },
      { name: "title", description: "Article title" },
      { name: "newspaperName", description: "Newspaper name" },
      { name: "place", description: "Place of publication" },
      { name: "date", description: "Date" },
      { name: "page", description: "Page number" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    correspondence: [
      { name: "author", description: "Author / sender name" },
      { name: "recipient", description: "Recipient name" },
      { name: "date", description: "Date" },
      { name: "medium", description: "Medium (Letter, Email, etc.)" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    interview: [
      { name: "interviewee", description: "Interviewee name" },
      { name: "interviewer", description: "Interviewer name" },
      { name: "program", description: "Program or publication" },
      { name: "date", description: "Date" },
      { name: "medium", description: "Medium (Radio, Television, etc.)" },
    ],
    film_tv_media: [
      { name: "title", description: "Film / TV title" },
      { name: "director", description: "Director name" },
      { name: "productionCompany", description: "Production company" },
      { name: "year", description: "Year" },
      { name: "medium", description: "Medium (Film, Television, Podcast, etc.)" },
      { name: "episodeTitle", description: "Episode title (TV series)" },
      { name: "seriesTitle", description: "Series title (TV series)" },
      { name: "seasonNumber", description: "Season number (TV series)" },
      { name: "episodeNumber", description: "Episode number (TV series)" },
      { name: "pinpoint", description: "Pinpoint (timestamp, episode)" },
    ],
    internet_material: [
      { name: "author", description: "Author name" },
      { name: "title", description: "Page or article title" },
      { name: "websiteName", description: "Website name" },
      { name: "date", description: "Date" },
      { name: "url", description: "URL" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    social_media: [
      { name: "author", description: "Author / handle" },
      { name: "platform", description: "Platform (Twitter/X, Facebook, etc.)" },
      { name: "content", description: "Post content / excerpt" },
      { name: "date", description: "Date" },
      { name: "url", description: "URL" },
    ],
    genai_output: [
      { name: "platform", description: "AI platform name" },
      { name: "platformCustom", description: "Custom platform name (if other)" },
      { name: "model", description: "Model name" },
      { name: "prompt", description: "Prompt used" },
      { name: "outputDate", description: "Date of the output" },
      { name: "url", description: "URL (if applicable)" },
    ],
    treaty: [
      { name: "title", description: "Treaty title" },
      { name: "parties", description: "Parties to the treaty" },
      { name: "openedDate", description: "Date opened for signature" },
      { name: "signedDate", description: "Date signed" },
      { name: "treatySeries", description: "Treaty series abbreviation (e.g. UNTS)" },
      { name: "seriesVolume", description: "Series volume number" },
      { name: "startingPage", description: "Starting page in the series" },
      { name: "entryIntoForceDate", description: "Date of entry into force" },
      { name: "notYetInForce", description: "Whether not yet in force (boolean)" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "un.document": [
      { name: "body", description: "UN body (e.g. General Assembly, Security Council)" },
      { name: "title", description: "Document title" },
      { name: "docNumber", description: "UN document symbol (e.g. A/RES/70/1)" },
      { name: "date", description: "Date" },
      { name: "session", description: "Session" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "un.communication": [
      { name: "author", description: "Parties / author of the communication" },
      { name: "communicationNumber", description: "Communication number" },
      { name: "committee", description: "Committee (e.g. Human Rights Committee)" },
      { name: "date", description: "Date" },
      { name: "docNumber", description: "UN document symbol" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "un.yearbook": [
      { name: "title", description: "Yearbook title" },
      { name: "year", description: "Year" },
      { name: "volume", description: "Volume" },
      { name: "startingPage", description: "Starting page" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "icj.decision": [
      { name: "caseTitle", description: "Case title" },
      { name: "parties", description: "Parties (e.g. Portugal v Australia)" },
      { name: "decisionType", description: "Judgment, Advisory Opinion, or Order" },
      { name: "year", description: "Year of the decision" },
      { name: "icjReportsPage", description: "ICJ Reports starting page" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "icj.pleading": [
      { name: "caseTitle", description: "Case title" },
      { name: "documentType", description: "Document type (Memorial, Counter-Memorial, etc.)" },
      { name: "party", description: "Filing party" },
      { name: "date", description: "Date" },
      { name: "icjPleadingsVolume", description: "ICJ Pleadings volume" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "arbitral.state_state": [
      { name: "caseTitle", description: "Case title" },
      { name: "parties", description: "State parties" },
      { name: "tribunal", description: "Tribunal (e.g. PCA)" },
      { name: "awardDate", description: "Award date" },
      { name: "reportSeries", description: "Report series" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "arbitral.individual_state": [
      { name: "caseTitle", description: "Case title" },
      { name: "caseNumber", description: "Case number (e.g. ICSID Case No ARB/01/8)" },
      { name: "tribunal", description: "Tribunal (ICSID, UNCITRAL, PCA, Other)" },
      { name: "tribunalOther", description: "Custom tribunal name if Other" },
      { name: "awardDate", description: "Award date" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "icc_tribunal.case": [
      { name: "accused", description: "Accused name" },
      { name: "caseNumber", description: "Case number" },
      { name: "tribunal", description: "Tribunal (ICC, ICTY, ICTR, Other)" },
      { name: "tribunalOther", description: "Custom tribunal name if Other" },
      { name: "chamber", description: "Chamber" },
      { name: "decisionType", description: "Decision type" },
      { name: "date", description: "Date" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "wto.document": [
      { name: "title", description: "Document title" },
      { name: "docNumber", description: "WTO document number" },
      { name: "date", description: "Date" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "wto.decision": [
      { name: "title", description: "Case title" },
      { name: "complainant", description: "Complainant" },
      { name: "respondent", description: "Respondent" },
      { name: "panelType", description: "Panel or Appellate Body" },
      { name: "docNumber", description: "Document number" },
      { name: "date", description: "Date" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "gatt.document": [
      { name: "title", description: "Document title" },
      { name: "docNumber", description: "GATT document number" },
      { name: "date", description: "Date" },
      { name: "bisdVolume", description: "BISD volume" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "eu.official_journal": [
      { name: "title", description: "Document title" },
      { name: "documentType", description: "Type (Regulation, Directive, Decision)" },
      { name: "number", description: "Document number" },
      { name: "ojSeries", description: "OJ series (L or C)" },
      { name: "date", description: "Date" },
      { name: "page", description: "Page" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "eu.court": [
      { name: "caseTitle", description: "Case title" },
      { name: "caseNumber", description: "Case number" },
      { name: "court", description: "Court (CJEU, General Court)" },
      { name: "date", description: "Date" },
      { name: "ecrCitation", description: "ECR citation" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "echr.decision": [
      { name: "caseTitle", description: "Case title" },
      { name: "applicationNumber", description: "Application number" },
      { name: "court", description: "Court (ECtHR Grand Chamber, ECtHR Chamber)" },
      { name: "date", description: "Date" },
      { name: "echrReports", description: "ECHR Reports citation" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "supranational.decision": [
      { name: "caseTitle", description: "Case title / parties" },
      { name: "parties", description: "Parties" },
      { name: "court", description: "Court or tribunal" },
      { name: "date", description: "Date" },
      { name: "reportSeries", description: "Report series" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "supranational.document": [
      { name: "body", description: "Issuing body" },
      { name: "title", description: "Document title" },
      { name: "documentNumber", description: "Document number" },
      { name: "date", description: "Date" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    // DECISION-019: the invented '[Platform]' bracket is retired — ebooks
    // render as ordinary books (rules 6.1–6.5), so no platform field.
    "book.ebook": [
      { name: "authors", description: "Array of { givenNames, surname }" },
      { name: "title", description: "Book title" },
      { name: "publisher", description: "Publisher name" },
      { name: "edition", description: "Edition" },
      { name: "year", description: "Publication year" },
      { name: "url", description: "URL if applicable" },
      { name: "pinpoint", description: "Pinpoint page" },
    ],
    periodical: [
      { name: "author", description: "Author name" },
      { name: "title", description: "Article title" },
      { name: "periodicalName", description: "Periodical or magazine name" },
      { name: "datePeriod", description: "Date, month, or season (e.g. Spring 2024, March 2024)" },
      { name: "volume", description: "Volume number" },
      { name: "issue", description: "Issue number" },
      { name: "page", description: "Starting page" },
      { name: "pinpoint", description: "Pinpoint reference" },
    ],
    "treaty.mou": [
      { name: "title", description: "MOU title" },
      { name: "parties", description: "Parties to the MOU" },
      { name: "signedDate", description: "Date signed" },
      { name: "pinpoint", description: "Pinpoint reference" },
      { name: "url", description: "URL if applicable" },
    ],
  };

  // All foreign.* types share the same schema
  const foreignSchema: FieldDescriptor[] = [
    { name: "foreignSubType", description: '"case", "legislation", or "secondary"' },
    { name: "title", description: "Case name, legislation title, or source title" },
    {
      name: "citationDetails",
      description:
        "FULL citation identifier as used in that jurisdiction (e.g. 2018 FCA 153, [2020] UKSC 5) — do NOT split into parts",
    },
    { name: "court", description: "Court or body" },
    { name: "year", description: "Year" },
    { name: "pinpoint", description: "Pinpoint reference" },
  ];

  if (sourceType.startsWith("foreign.")) {
    return foreignSchema;
  }

  if (sourceType === "custom") {
    return [
      { name: "customText", description: "Free-text citation" },
      { name: "shortTitle", description: "Short title" },
    ];
  }

  if (sourceType === "explanatory_note") {
    return [{ name: "noteText", description: "Explanatory note text" }];
  }

  return (
    schemas[sourceType] ?? [
      { name: "author", description: "Author name" },
      { name: "title", description: "Title" },
      { name: "year", description: "Year" },
      { name: "pinpoint", description: "Pinpoint reference" },
    ]
  );
}
