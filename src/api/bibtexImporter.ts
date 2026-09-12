/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * bibtexImporter.ts — compatibility shim over the interchange layer.
 *
 * The BibTeX parser and mapping now live in src/api/interchange (the codec
 * in codecs/bibtex.ts, the mapping in mapper/toCitation.ts). The three
 * exports below keep their original signatures for existing callers
 * (INTEROP-004). New code should use prepareImport and commitImport from
 * src/api/interchange directly, which also give a preview, duplicate
 * detection by DOI, ISBN and legal signature, and a single persist.
 */

import type { Citation } from "../types/citation";
import type { CitationStore } from "../store/citationStore";
import { getVersionForStandard } from "../actions/citationRequest";
import { bibtexCodec, parseBibTeX } from "./interchange/codecs/bibtex";
import type { BibEntry } from "./interchange/codecs/bibtex";
import { mapRecordToCitation } from "./interchange/mapper/toCitation";
import { commitImport, prepareImport } from "./interchange/importPipeline";

export type { BibEntry };
export { parseBibTeX };

/** Serialises a parsed entry back to BibTeX so the codec can read it. */
function entryToText(entry: BibEntry): string {
  const fields = Object.entries(entry.fields)
    .map(([key, value]) => `  ${key} = {${value.replace(/([{}])/g, "\\$1")}}`)
    .join(",\n");
  return `@${entry.entryType}{${entry.citeKey || "entry"},\n${fields}\n}\n`;
}

/**
 * Maps one parsed BibTeX entry to a citation. Kept for callers that parse
 * first and map later; the citation carries the interchange passthrough bag.
 */
export function mapBibEntryToObiter(entry: BibEntry): Citation {
  const { records } = bibtexCodec.parse(entryToText(entry));
  const record = records[0];
  if (!record) {
    throw new Error(`BibTeX entry "${entry.citeKey}" could not be read`);
  }
  return mapRecordToCitation(record, { aglcVersion: "4" }).citation;
}

/**
 * Imports every entry in a BibTeX string into the store. Returns the counts
 * the Citation Library shows. Entries already in the library (by DOI, ISBN,
 * legal signature or title, year and first author) are skipped.
 */
export async function importBibTeX(
  bibtexString: string,
  store: CitationStore
): Promise<{ imported: number; skipped: number }> {
  const preview = prepareImport([{ text: bibtexString, formatHint: "bibtex" }], {
    existing: store.getAll(),
    aglcVersion: getVersionForStandard(store.getStandardId()),
  });
  const result = await commitImport(preview, store, { includeIncomplete: true });
  return { imported: result.added, skipped: result.skippedDuplicates };
}
