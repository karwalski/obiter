/**
 * @jest-environment jsdom
 *
 * Backup serializer and snapshot policy tests (SAFE-001).
 *
 * Pure module — no Office.js mocks required. jsdom environment + polyfill
 * guard match the xmlSerializer.test.ts pattern.
 */

let hasDOMParser = typeof DOMParser !== "undefined";
try {
  if (!hasDOMParser) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { JSDOM } = eval("require")("jsdom");
    const jsdom = new JSDOM();
    (global as Record<string, unknown>).DOMParser = jsdom.window.DOMParser;
    (global as Record<string, unknown>).XMLSerializer = jsdom.window.XMLSerializer;
    hasDOMParser = true;
  }
} catch {
  // jsdom not available — tests will be skipped
}

const describeIfDOMParser = hasDOMParser ? describe : describe.skip;

import {
  BACKUP_NAMESPACE,
  BackupData,
  BackupXmlError,
  MAX_BACKUP_CHARS,
  MAX_FOOTNOTE_GENERATIONS,
  MAX_STORE_SNAPSHOTS,
  SNAPSHOT_THROTTLE_MS,
  StoreSnapshot,
  applyFootnoteSnapshot,
  applyStoreSnapshot,
  deserializeBackup,
  emptyBackupData,
  mergeBackupData,
  serializeBackup,
} from "../../src/store/backupSerializer";

// ─── Fixtures ───────────────────────────────────────────────────────────────

function snap(overrides: Partial<StoreSnapshot> = {}): StoreSnapshot {
  return {
    timestamp: "2026-07-21T10:00:00.000Z",
    reason: "persist",
    citationCount: 2,
    storeXml: `<?xml version="1.0"?><obiter:citationStore xmlns:obiter="urn:obiter:aglc" version="2"></obiter:citationStore>`,
    ...overrides,
  };
}

function secondsAfter(base: string, seconds: number): string {
  return new Date(Date.parse(base) + seconds * 1000).toISOString();
}

const T0 = "2026-07-21T10:00:00.000Z";

// ─── Round-trip ─────────────────────────────────────────────────────────────

describeIfDOMParser("backup (de)serialization round-trip (SAFE-001)", () => {
  test("store snapshots round-trip with all attributes and full XML payload", () => {
    const data: BackupData = {
      snapshots: [
        snap({ timestamp: secondsAfter(T0, 60), reason: "pre-restore", citationCount: 5 }),
        snap({ timestamp: T0, reason: "persist", citationCount: 3 }),
      ],
      footnoteSnapshots: [],
    };
    const xml = serializeBackup(data);
    expect(xml).toContain(`xmlns:obiter="${BACKUP_NAMESPACE}"`);
    expect(xml).toContain('version="1"');

    const back = deserializeBackup(xml);
    expect(back).toEqual(data);
  });

  test('payloads containing "]]>" survive — escaped text, not CDATA', () => {
    // The reason CDATA is banned: a store XML containing ]]> would terminate
    // a CDATA section early and corrupt the backup.
    const hostile = snap({
      storeXml: `<obiter:citationStore xmlns:obiter="urn:obiter:aglc" version="2"><obiter:citation id="x"><obiter:field name="title">a ]]&gt; b &amp; "quotes" &lt;tags&gt; 'apos'</obiter:field></obiter:citation></obiter:citationStore>`,
    });
    const literal = snap({
      timestamp: secondsAfter(T0, 10),
      storeXml: `raw ]]> and & < > " ' payload`,
    });
    const xml = serializeBackup({ snapshots: [literal, hostile], footnoteSnapshots: [] });
    expect(xml).not.toContain("<![CDATA[");

    const back = deserializeBackup(xml);
    expect(back.snapshots[0].storeXml).toBe(literal.storeXml);
    expect(back.snapshots[1].storeXml).toBe(hostile.storeXml);
  });

  test("footnote snapshots round-trip with fn number, hash, and text", () => {
    const data: BackupData = {
      snapshots: [],
      footnoteSnapshots: [
        {
          timestamp: T0,
          footnotes: [
            { n: 12, hash: "a1b2c3d4", text: "Mabo v Queensland (No 2) (1992) 175 CLR 1." },
            { n: 13, hash: "ffffffff", text: `Text with ]]> & <angles> and "quotes".` },
          ],
        },
      ],
    };
    const back = deserializeBackup(serializeBackup(data));
    expect(back).toEqual(data);
  });

  test("throws BackupXmlError on empty, malformed, and wrong-root payloads", () => {
    expect(() => deserializeBackup("")).toThrow(BackupXmlError);
    expect(() => deserializeBackup("   ")).toThrow(BackupXmlError);
    expect(() => deserializeBackup("<obiter:backupStore truncated")).toThrow(BackupXmlError);
    expect(() => deserializeBackup("<wrongRoot/>")).toThrow(BackupXmlError);
  });

  test("snapshot elements without a timestamp are skipped, not fatal", () => {
    const xml =
      `<?xml version="1.0"?>` +
      `<obiter:backupStore xmlns:obiter="${BACKUP_NAMESPACE}" version="1">` +
      `<obiter:snapshot reason="persist" citationCount="1">no timestamp</obiter:snapshot>` +
      `<obiter:snapshot timestamp="${T0}" reason="persist" citationCount="2">kept</obiter:snapshot>` +
      `</obiter:backupStore>`;
    const back = deserializeBackup(xml);
    expect(back.snapshots).toHaveLength(1);
    expect(back.snapshots[0].storeXml).toBe("kept");
  });
});

// ─── Snapshot-add policy ────────────────────────────────────────────────────

describeIfDOMParser("applyStoreSnapshot policy (SAFE-001)", () => {
  test("dedup: identical store XML to the newest snapshot is skipped", () => {
    const existing = snap({ timestamp: T0 });
    const data: BackupData = { snapshots: [existing], footnoteSnapshots: [] };
    const result = applyStoreSnapshot(
      data,
      snap({ timestamp: secondsAfter(T0, 3600) }) // same XML, well past throttle
    );
    expect(result.added).toBe(false);
    expect(result.skipped).toBe("duplicate");
    expect(result.data.snapshots).toHaveLength(1);
  });

  test("throttle: a second persist snapshot within 30 s is skipped", () => {
    const data: BackupData = { snapshots: [snap({ timestamp: T0 })], footnoteSnapshots: [] };
    const result = applyStoreSnapshot(
      data,
      snap({ timestamp: secondsAfter(T0, 10), storeXml: "different xml" })
    );
    expect(result.added).toBe(false);
    expect(result.skipped).toBe("throttled");
  });

  test("throttle expires: a persist snapshot after 30 s is added", () => {
    const data: BackupData = { snapshots: [snap({ timestamp: T0 })], footnoteSnapshots: [] };
    const later = snap({
      timestamp: secondsAfter(T0, SNAPSHOT_THROTTLE_MS / 1000 + 1),
      storeXml: "different xml",
    });
    const result = applyStoreSnapshot(data, later);
    expect(result.added).toBe(true);
    expect(result.data.snapshots[0]).toEqual(later);
  });

  test("shrink-override beats the throttle: a shrinking write always snapshots", () => {
    const data: BackupData = { snapshots: [snap({ timestamp: T0 })], footnoteSnapshots: [] };
    const shrinking = snap({
      timestamp: secondsAfter(T0, 2),
      citationCount: 10,
      storeXml: "about to be shrunk",
    });
    const result = applyStoreSnapshot(data, shrinking, { incomingCitationCount: 4 });
    expect(result.added).toBe(true);
  });

  test("growing writes within the throttle window stay throttled", () => {
    const data: BackupData = { snapshots: [snap({ timestamp: T0 })], footnoteSnapshots: [] };
    const growing = snap({
      timestamp: secondsAfter(T0, 2),
      citationCount: 4,
      storeXml: "about to grow",
    });
    const result = applyStoreSnapshot(data, growing, { incomingCitationCount: 10 });
    expect(result.added).toBe(false);
    expect(result.skipped).toBe("throttled");
  });

  test('"pre-restore" and "manual" reasons bypass the throttle', () => {
    const data: BackupData = { snapshots: [snap({ timestamp: T0 })], footnoteSnapshots: [] };
    for (const reason of ["pre-restore", "manual"] as const) {
      const result = applyStoreSnapshot(
        data,
        snap({ timestamp: secondsAfter(T0, 1), reason, storeXml: `xml for ${reason}` })
      );
      expect(result.added).toBe(true);
    }
  });

  test("ring buffer keeps the newest MAX_STORE_SNAPSHOTS snapshots", () => {
    let data = emptyBackupData();
    for (let i = 0; i < 5; i++) {
      const result = applyStoreSnapshot(
        data,
        snap({ timestamp: secondsAfter(T0, i * 60), storeXml: `store ${i}` })
      );
      expect(result.added).toBe(true);
      data = result.data;
    }
    expect(data.snapshots).toHaveLength(MAX_STORE_SNAPSHOTS);
    expect(data.snapshots.map((s) => s.storeXml)).toEqual(["store 4", "store 3", "store 2"]);
  });

  test("size cap evicts oldest snapshots until under ~1.5 MB", () => {
    const big = (label: string): string => label + "x".repeat(700_000);
    let data = emptyBackupData();
    for (let i = 0; i < 3; i++) {
      data = applyStoreSnapshot(
        data,
        snap({ timestamp: secondsAfter(T0, i * 60), storeXml: big(`store ${i}`) })
      ).data;
    }
    // Three 700 KB snapshots exceed the cap — only the newest two survive.
    expect(data.snapshots.map((s) => s.storeXml.slice(0, 7))).toEqual(["store 2", "store 1"]);
    expect(serializeBackup(data).length).toBeLessThanOrEqual(MAX_BACKUP_CHARS);
  });

  test("a single oversized snapshot degrades the ring to 1", () => {
    const data = applyStoreSnapshot(
      emptyBackupData(),
      snap({ timestamp: T0, storeXml: "y".repeat(MAX_BACKUP_CHARS + 100) })
    ).data;
    const next = applyStoreSnapshot(
      data,
      snap({ timestamp: secondsAfter(T0, 60), storeXml: "z".repeat(MAX_BACKUP_CHARS + 100) })
    ).data;
    expect(next.snapshots).toHaveLength(1);
    expect(next.snapshots[0].storeXml.charAt(0)).toBe("z");
  });
});

// ─── Footnote generations (consumed by SAFE-004) ────────────────────────────

describeIfDOMParser("applyFootnoteSnapshot generations (SAFE-001/SAFE-004)", () => {
  test("keeps the newest MAX_FOOTNOTE_GENERATIONS generations", () => {
    let data = emptyBackupData();
    for (let i = 0; i < 4; i++) {
      data = applyFootnoteSnapshot(data, {
        timestamp: secondsAfter(T0, i * 60),
        footnotes: [{ n: 1, hash: `h${i}`, text: `generation ${i}` }],
      });
    }
    expect(data.footnoteSnapshots).toHaveLength(MAX_FOOTNOTE_GENERATIONS);
    expect(data.footnoteSnapshots.map((g) => g.footnotes[0].text)).toEqual([
      "generation 3",
      "generation 2",
    ]);
  });

  test("generations share the byte cap with store snapshots", () => {
    let data = applyStoreSnapshot(
      emptyBackupData(),
      snap({ timestamp: secondsAfter(T0, 600), storeXml: "n".repeat(1_400_000) })
    ).data;
    data = applyFootnoteSnapshot(data, {
      timestamp: secondsAfter(T0, 660),
      footnotes: [{ n: 1, hash: "h", text: "t".repeat(400_000) }],
    });
    // Over cap with both present; the newest store snapshot is preserved and
    // the generation is evicted last-resort.
    expect(data.snapshots).toHaveLength(1);
    expect(data.footnoteSnapshots).toHaveLength(0);
  });
});

// ─── Merge (duplicate backup parts) ─────────────────────────────────────────

describeIfDOMParser("mergeBackupData (SAFE-001 co-authoring duplicates)", () => {
  test("merges by timestamp keeping newest entries across parts", () => {
    const partA: BackupData = {
      snapshots: [
        snap({ timestamp: secondsAfter(T0, 120), storeXml: "s2" }),
        snap({ timestamp: T0, storeXml: "s0" }),
      ],
      footnoteSnapshots: [{ timestamp: T0, footnotes: [] }],
    };
    const partB: BackupData = {
      snapshots: [
        snap({ timestamp: secondsAfter(T0, 180), storeXml: "s3" }),
        snap({ timestamp: secondsAfter(T0, 60), storeXml: "s1" }),
        snap({ timestamp: T0, storeXml: "s0 duplicate" }),
      ],
      footnoteSnapshots: [],
    };
    const merged = mergeBackupData([partA, partB]);
    expect(merged.snapshots.map((s) => s.storeXml)).toEqual(["s3", "s2", "s1"]);
    expect(merged.footnoteSnapshots).toHaveLength(1);
  });

  test("merging nothing yields empty backup data", () => {
    expect(mergeBackupData([])).toEqual(emptyBackupData());
  });
});
