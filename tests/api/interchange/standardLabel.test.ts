/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * STD-025 — Interchange round trip per standard: standard label and no
 * derived keys.
 *
 * The formatted-citation note is written as "<standard> footnote: …" by
 * every codec from `record.formatted.standard` (the document standard's
 * label) and recognised on import under any label. A record carrying
 * Obiter's round-trip provenance is restored exactly from its
 * `obiter-field:` notes; derived inference is for foreign records only,
 * and the formatted note is never read as citation data.
 */

import { citationsToRecords, INTERCHANGE_DATA_KEY } from "../../../src/api/interchange";
import type { InterchangeFormat } from "../../../src/api/interchange";
import { bibtexCodec } from "../../../src/api/interchange/codecs/bibtex";
import { cslJsonCodec } from "../../../src/api/interchange/codecs/cslJson";
import { endnoteXmlCodec } from "../../../src/api/interchange/codecs/endnoteXml";
import { risCodec } from "../../../src/api/interchange/codecs/ris";
import type { InterchangeCodec } from "../../../src/api/interchange/codec";
import {
  DEFAULT_STANDARD_LABEL,
  formattedNoteLine,
  isFormattedNoteLine,
  liftFormattedNotes,
  parseFormattedNoteLine,
} from "../../../src/api/interchange/mapper/formattedNote";
import { mapCitationToRecord } from "../../../src/api/interchange/mapper/fromCitation";
import { mapRecordToCitation } from "../../../src/api/interchange/mapper/toCitation";
import { createRecord } from "../../../src/api/interchange/model";
import type { CitationInterchangeBag, InterchangeRecord } from "../../../src/api/interchange/model";
import type { Citation } from "../../../src/types/citation";
import { mlcPacey, nzBrooker } from "../../fixtures/standards/citations";

type Format = Exclude<InterchangeFormat, "word-sources-xml">;

const CODECS: ReadonlyArray<[Format, InterchangeCodec]> = [
  ["ris", risCodec],
  ["bibtex", bibtexCodec],
  ["csl-json", cslJsonCodec],
  ["endnote-xml", endnoteXmlCodec],
];

const OPTS = { aglcVersion: "4" as const, now: "2026-09-22T00:00:00.000Z" };

const FOOTNOTE = "Brooker v Police [2007] NZSC 30, [2007] 3 NZLR 91.";
const BIBLIOGRAPHY = "Brooker v Police [2007] NZSC 30, [2007] 3 NZLR 91";

function ownData(citation: Citation): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(citation.data)) {
    if (key !== INTERCHANGE_DATA_KEY) out[key] = value;
  }
  return out;
}

function bagOf(citation: Citation): CitationInterchangeBag {
  return citation.data[INTERCHANGE_DATA_KEY] as CitationInterchangeBag;
}

/** The record `exportCitations` builds for a citation under `standard`. */
function exported(citation: Citation, format: Format, standard: string): InterchangeRecord {
  return mapCitationToRecord(citation, {
    format,
    formatted: { standard, footnote: FOOTNOTE, bibliography: BIBLIOGRAPHY },
  });
}

/** Strips the Obiter provenance and field notes so the record reads as another tool's. */
function asForeign(record: InterchangeRecord): InterchangeRecord {
  const { obiterId: _id, obiterSourceType: _type, ...provenance } = record.provenance;
  return {
    ...record,
    provenance: { ...provenance, sourceLabel: "Zotero" },
    notes: record.notes.filter((n) => !n.startsWith("obiter-field:")),
  };
}

// ─── The note line ──────────────────────────────────────────────────────────

describe("formattedNote: the '<standard> footnote:' line", () => {
  test.each([
    ["AGLC4 footnote: Text.", "AGLC4", "footnote", "Text."],
    ["OSCOLA 5 footnote: Text.", "OSCOLA 5", "footnote", "Text."],
    ["NZLSG 3 bibliography: Text", "NZLSG 3", "bibliography", "Text"],
    ["AGLC 4th ed footnote: Text.", "AGLC 4th ed", "footnote", "Text."],
    ["  OSCOLA 5 footnote:   padded  ", "OSCOLA 5", "footnote", "padded"],
  ])("recognises %j", (line, standard, key, text) => {
    expect(parseFormattedNoteLine(line)).toEqual({ standard, key, text });
    expect(isFormattedNoteLine(line)).toBe(true);
  });

  test.each([
    "See the OSCOLA 5 footnote: above",
    "Note about a footnote: here",
    'obiter-field:title: "x"',
    "obiter-id: cit-1",
    "footnote: no label",
    "Checked by librarian",
  ])("leaves %j to the user", (line) => {
    expect(parseFormattedNoteLine(line)).toBeUndefined();
    expect(isFormattedNoteLine(line)).toBe(false);
  });

  test("writes the label it is given and falls back to AGLC4", () => {
    expect(formattedNoteLine("OSCOLA 5", "footnote", "T.")).toBe("OSCOLA 5 footnote: T.");
    expect(formattedNoteLine("NZLSG 3", "bibliography", "T")).toBe("NZLSG 3 bibliography: T");
    expect(formattedNoteLine(undefined, "footnote", "T.")).toBe("AGLC4 footnote: T.");
    expect(formattedNoteLine("  ", "footnote", "T.")).toBe("AGLC4 footnote: T.");
    expect(DEFAULT_STANDARD_LABEL).toBe("AGLC4");
  });

  test("liftFormattedNotes moves the lines into the passthrough bag and is idempotent", () => {
    const record = createRecord("article", { format: "ris", rawType: "JOUR" });
    record.notes = ["Keep me", "OSCOLA 5 footnote: F.", "NZLSG 3 bibliography: B", "And me"];
    liftFormattedNotes(record);
    expect(record.notes).toEqual(["Keep me", "And me"]);
    expect(record.passthrough).toEqual({
      "formatted-footnote": "F.",
      "formatted-bibliography": "B",
    });
    liftFormattedNotes(record);
    expect(record.notes).toEqual(["Keep me", "And me"]);
    expect(record.passthrough["formatted-footnote"]).toBe("F.");
  });
});

// ─── The export pipeline ────────────────────────────────────────────────────

describe("citationsToRecords: the standard label reaches the record", () => {
  const formatCitation = (): { footnote: string; bibliography?: string } => ({
    footnote: FOOTNOTE,
    bibliography: BIBLIOGRAPHY,
  });

  test.each([
    ["OSCOLA 5", "OSCOLA 5"],
    ["NZLSG 3", "NZLSG 3"],
    [undefined, "AGLC4"],
    ["   ", "AGLC4"],
  ])("standardLabel %j is written as %j", (standardLabel, expected) => {
    const { records } = citationsToRecords([nzBrooker], {
      format: "ris",
      formatCitation,
      standardLabel,
    });
    expect(records[0].formatted).toEqual({
      standard: expected,
      footnote: FOOTNOTE,
      bibliography: BIBLIOGRAPHY,
    });
  });
});

// ─── Every codec writes and reads the label ─────────────────────────────────

describe.each(CODECS)("%s: the formatted note under another standard", (format, codec) => {
  test("is written with the record's standard, not a hard-coded AGLC4", () => {
    const text = codec.serialise([exported(nzBrooker, format, "OSCOLA 5")]);
    expect(text).toContain(`OSCOLA 5 footnote: ${FOOTNOTE}`);
    expect(text).toContain(`OSCOLA 5 bibliography: ${BIBLIOGRAPHY}`);
    expect(text).not.toContain("AGLC4 footnote:");
    expect(text).not.toContain("AGLC4 bibliography:");
  });

  test("falls back to AGLC4 when the record names no standard", () => {
    const text = codec.serialise([exported(nzBrooker, format, "")]);
    expect(text).toContain(`AGLC4 footnote: ${FOOTNOTE}`);
  });

  test("on re-import is neither a user note nor citation data", () => {
    const text = codec.serialise([exported(nzBrooker, format, "NZLSG 3")]);
    const { records } = codec.parse(text);
    expect(records).toHaveLength(1);
    const { citation } = mapRecordToCitation(records[0], OPTS);
    expect(citation.id).toBe(nzBrooker.id);
    expect(citation.sourceType).toBe(nzBrooker.sourceType);
    expect(ownData(citation)).toEqual(nzBrooker.data);
    const bag = bagOf(citation);
    expect(bag.notes).toBeUndefined();
    expect(bag.passthrough?.["formatted-footnote"]).toBe(FOOTNOTE);
    expect(bag.passthrough?.["formatted-bibliography"]).toBe(BIBLIOGRAPHY);
  });

  test("a user note that mentions a footnote mid-sentence is kept", () => {
    const record = exported(nzBrooker, format, "OSCOLA 5");
    // User notes precede the field notes, as `mapCitationToRecord` writes them.
    record.notes.unshift("See the OSCOLA 5 footnote: it cites the NZLR report");
    const { records } = codec.parse(codec.serialise([record]));
    const bag = bagOf(mapRecordToCitation(records[0], OPTS).citation);
    expect(bag.notes).toEqual(["See the OSCOLA 5 footnote: it cites the NZLR report"]);
  });
});

test("bibtex: a lifted formatted line is not re-emitted as a field on export", () => {
  const { records } = bibtexCodec.parse(
    bibtexCodec.serialise([asForeign(exported(nzBrooker, "bibtex", "OSCOLA 5"))])
  );
  expect(records[0].passthrough["formatted-footnote"]).toBe(FOOTNOTE);
  const again = bibtexCodec.serialise(records);
  expect(again).not.toContain("formatted-footnote =");
  expect(again).not.toContain("formatted-bibliography =");
  expect(again).toContain(`footnote: ${FOOTNOTE}`);
});

// ─── The mapper: round trip versus foreign record ───────────────────────────

describe("mapRecordToCitation: a same-tool round trip adds no derived keys", () => {
  test.each([
    ["fx-nz-brooker", nzBrooker, "courtId"],
    ["fx-mlc-pacey", mlcPacey, "party1"],
  ])("%s comes back with exactly its own data", (_id, fixture, derivedKey) => {
    const record = exported(fixture, "ris", "NZLSG 3");
    const { citation, issues } = mapRecordToCitation(record, OPTS);
    expect(citation.sourceType).toBe(fixture.sourceType);
    expect(ownData(citation)).toEqual(fixture.data);
    expect(citation.shortTitle).toBe(fixture.shortTitle);
    expect(derivedKey in citation.data).toBe(false);
    expect(issues.map((i) => i.code)).not.toContain("party-split-failed");
  });

  test("the formatted note is never parsed as a report citation", () => {
    // The NZLSG rendering of a Māori Land Court decision reads as a report
    // citation; on a round trip it must not become reportSeries/volume.
    const record = mapCitationToRecord(mlcPacey, {
      format: "ris",
      formatted: { standard: "NZLSG 3", footnote: "Pacey v Adlam (2017) 178 Waiariki MB 32." },
    });
    const { citation } = mapRecordToCitation(record, OPTS);
    expect(ownData(citation)).toEqual(mlcPacey.data);
  });

  test("the same record from another tool still derives its fields", () => {
    const { citation } = mapRecordToCitation(
      asForeign(exported(nzBrooker, "ris", "NZLSG 3")),
      OPTS
    );
    expect(citation.id).not.toBe(nzBrooker.id);
    expect(citation.data.courtId).toBe("NZSC");
    expect(citation.data.party1).toBe("Brooker");
  });

  test("an export made before the field notes existed falls back to the derived mapping", () => {
    const record = exported(nzBrooker, "ris", "AGLC4");
    record.notes = record.notes.filter((n) => !n.startsWith("obiter-field:"));
    const { citation } = mapRecordToCitation(record, OPTS);
    expect(citation.id).toBe(nzBrooker.id);
    expect(citation.data.party1).toBe("Brooker");
    expect(citation.data.reportSeries).toBe("NZLR");
  });

  test("a type chosen in the preview that differs from the exported one is a foreign mapping", () => {
    const record = exported(nzBrooker, "ris", "AGLC4");
    const { citation } = mapRecordToCitation(record, {
      ...OPTS,
      sourceTypeOverride: "case.unreported.mnc",
    });
    expect(citation.sourceType).toBe("case.unreported.mnc");
    expect(citation.data.party1).toBe("Brooker");
    expect("reportSeries" in citation.data).toBe(false);
  });
});
