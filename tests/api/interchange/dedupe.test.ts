/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * ENP-002: duplicate clusters over the library. Each citation joins at most
 * one cluster, on the strongest key it shares (doi → isbn → citeKey → legal
 * → loose); singletons are dropped; a `dedupe:ignore:<key>` tag suppresses
 * the pairs a citation would form on that key.
 */

import {
  DedupeIndex,
  DEDUPE_IGNORE_TAG_PREFIX,
  findDuplicateClusters,
} from "../../../src/api/interchange/dedupe";
import type { Citation, SourceType } from "../../../src/types/citation";

function cite(
  id: string,
  sourceType: SourceType,
  data: Record<string, unknown>,
  createdAt = "2026-01-01T00:00:00.000Z",
  tags: string[] = []
): Citation {
  return {
    id,
    aglcVersion: "4",
    sourceType,
    data,
    tags,
    createdAt,
    modifiedAt: createdAt,
  };
}

const ids = (c: { members: Citation[] }): string[] => c.members.map((m) => m.id);

describe("findDuplicateClusters (ENP-002)", () => {
  test("MNC match survives a different party spelling", () => {
    const a = cite("a", "case.unreported.mnc", {
      party1: "Smith",
      party2: "Jones",
      court: "HCA",
      year: 2020,
      caseNumber: 41,
    });
    const b = cite(
      "b",
      "case.unreported.mnc",
      { party1: "Smyth", party2: "Jones", court: "HCA", year: "2020", caseNumber: "41" },
      "2026-01-02T00:00:00.000Z"
    );
    const clusters = findDuplicateClusters([b, a]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].kind).toBe("legal");
    expect(clusters[0].key).toBe("mnc|2020|hca|41");
    expect(ids(clusters[0])).toEqual(["a", "b"]);
  });

  test("DOI match survives a different title casing and a doi.org prefix", () => {
    const a = cite("a", "journal.article", {
      authors: [{ givenNames: "Harold", surname: "Luntz" }],
      title: "A Personal Journey through the Law of Torts",
      year: 2005,
      doi: "10.1000/SLR.393",
    });
    const b = cite("b", "journal.article", {
      authors: [{ givenNames: "H", surname: "Luntz" }],
      title: "a personal journey THROUGH the law of torts",
      year: 2005,
      doi: "https://doi.org/10.1000/slr.393",
    });
    const clusters = findDuplicateClusters([a, b]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].kind).toBe("doi");
    expect(clusters[0].key).toBe("10.1000/slr.393");
    expect(ids(clusters[0])).toEqual(["a", "b"]);
  });

  test("report citation match on year, series and starting page", () => {
    const a = cite("mabo-1", "case.reported", {
      party1: "Mabo",
      party2: "Queensland (No 2)",
      year: 1992,
      volume: 175,
      reportSeries: "CLR",
      startingPage: 1,
    });
    const b = cite("mabo-2", "case.reported", {
      party1: "Mabo",
      party2: "Queensland [No 2]",
      year: "1992",
      volume: "175",
      reportSeries: "CLR",
      startingPage: "1",
    });
    const other = cite("wik", "case.reported", {
      party1: "Wik Peoples",
      party2: "Queensland",
      year: 1996,
      volume: 187,
      reportSeries: "CLR",
      startingPage: 1,
    });
    const clusters = findDuplicateClusters([a, other, b]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].kind).toBe("legal");
    expect(clusters[0].key).toBe("report|1992|clr|1");
    expect(ids(clusters[0])).toEqual(["mabo-1", "mabo-2"]);
  });

  test("loose title + year + surname match ignores punctuation and diacritics", () => {
    const a = cite("a", "book", {
      authors: [{ givenNames: "Émile", surname: "Durkheim" }],
      title: "The Rules of Sociological Method",
      year: 1895,
      publisher: "Alcan",
    });
    const b = cite("b", "book", {
      authors: [{ givenNames: "E", surname: "Durkheim" }],
      title: "The Rules of Sociological Method.",
      year: "1895",
      publisher: "Free Press",
    });
    const clusters = findDuplicateClusters([a, b]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].kind).toBe("loose");
    expect(clusters[0].key).toBe("the rules of sociological method|1895|durkheim");
  });

  test("a citation matched by two keys lands in one cluster, on the strongest", () => {
    const shared = {
      authors: [{ givenNames: "Harold", surname: "Luntz" }],
      title: "Torts",
      year: 2005,
    };
    const a = cite("a", "journal.article", { ...shared, doi: "10.1000/x" });
    const b = cite("b", "journal.article", { ...shared, doi: "10.1000/x" });
    const c = cite("c", "journal.article", { ...shared });
    const clusters = findDuplicateClusters([a, b, c]);
    // a and b share the DOI and the loose key; c shares only the loose key
    // and is left alone once a and b are spoken for.
    expect(clusters).toHaveLength(1);
    expect(clusters[0].kind).toBe("doi");
    expect(ids(clusters[0])).toEqual(["a", "b"]);
  });

  test("singletons produce no cluster", () => {
    const a = cite("a", "journal.article", { title: "One", year: 2001, doi: "10.1000/1" });
    const b = cite("b", "journal.article", { title: "Two", year: 2002, doi: "10.1000/2" });
    const c = cite("c", "book", { title: "Three", year: 2003 });
    expect(findDuplicateClusters([a, b, c])).toEqual([]);
    expect(findDuplicateClusters([])).toEqual([]);
    expect(DedupeIndex.clusters([a])).toEqual([]);
  });

  test("an ignore tag on either member suppresses the pair for that key", () => {
    const a = cite("a", "journal.article", { title: "One", year: 2001, doi: "10.1000/1" });
    const b = cite(
      "b",
      "journal.article",
      { title: "Uno", year: 2001, doi: "10.1000/1" },
      "2026-01-02T00:00:00.000Z",
      [`${DEDUPE_IGNORE_TAG_PREFIX}10.1000/1`]
    );
    const c = cite(
      "c",
      "journal.article",
      { title: "Eins", year: 2001, doi: "10.1000/1" },
      "2026-01-03T00:00:00.000Z"
    );
    expect(findDuplicateClusters([a, b])).toEqual([]);
    // b is dropped from the DOI grouping; a and c still cluster.
    const clusters = findDuplicateClusters([a, b, c]);
    expect(clusters).toHaveLength(1);
    expect(ids(clusters[0])).toEqual(["a", "c"]);
    // A tag for a different key does not suppress the DOI pair.
    const tagged = { ...a, tags: [`${DEDUPE_IGNORE_TAG_PREFIX}other`] };
    expect(findDuplicateClusters([tagged, c])).toHaveLength(1);
  });

  test("ordering is deterministic: members by createdAt then id, clusters by earliest member", () => {
    const late = cite("z", "book", { title: "Alpha", year: 2000 }, "2026-03-01T00:00:00.000Z");
    const early = cite("y", "book", { title: "Alpha", year: 2000 }, "2026-01-01T00:00:00.000Z");
    const sameTimeB = cite("b", "book", { title: "Beta", year: 2000 }, "2026-02-01T00:00:00.000Z");
    const sameTimeA = cite("a", "book", { title: "Beta", year: 2000 }, "2026-02-01T00:00:00.000Z");
    const expected = [
      ["y", "z"],
      ["a", "b"],
    ];
    const inputs = [
      [late, early, sameTimeB, sameTimeA],
      [sameTimeA, sameTimeB, early, late],
      [sameTimeB, late, sameTimeA, early],
    ];
    for (const input of inputs) {
      expect(findDuplicateClusters(input).map(ids)).toEqual(expected);
    }
  });
});
