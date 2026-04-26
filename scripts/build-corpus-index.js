#!/usr/bin/env node
/**
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Script: build-corpus-index
 *
 * Builds a metadata-only index from the Open Australian Legal Corpus (JSONL)
 * hosted on Hugging Face. Strips all full-text content and outputs a compact
 * index.json suitable for bundled corpus search in the add-in.
 *
 * Usage:
 *   node scripts/build-corpus-index.js --input path/to/corpus.jsonl --output corpus/
 *   node scripts/build-corpus-index.js --download --output corpus/
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const https = require("https");
const http = require("http");
const { createReadStream } = require("fs");
const { createInterface } = require("readline");

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const HF_DATASET_URL =
  "https://huggingface.co/datasets/umarbutler/open-australian-legal-corpus/resolve/main/corpus.jsonl";

const JURISDICTION_MAP = {
  commonwealth: "Cth",
  "new south wales": "NSW",
  victoria: "Vic",
  queensland: "Qld",
  "western australia": "WA",
  "south australia": "SA",
  tasmania: "Tas",
  "australian capital territory": "ACT",
  "northern territory": "NT",
};

const VALID_TYPES = new Set([
  "decision",
  "primary_legislation",
  "secondary_legislation",
  "bill",
]);

/* ------------------------------------------------------------------ */
/*  CLI argument parsing                                               */
/* ------------------------------------------------------------------ */

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { download: false, input: null, output: "corpus/" };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--download":
        parsed.download = true;
        break;
      case "--input":
        parsed.input = args[++i];
        break;
      case "--output":
        parsed.output = args[++i];
        break;
      case "--help":
        console.log(
          [
            "Usage:",
            "  node scripts/build-corpus-index.js --input <file.jsonl> --output <dir>",
            "  node scripts/build-corpus-index.js --download --output <dir>",
            "",
            "Options:",
            "  --input <path>   Path to a local corpus JSONL file",
            "  --download       Download corpus JSONL from Hugging Face",
            "  --output <dir>   Output directory (default: corpus/)",
            "  --help           Show this help message",
          ].join("\n"),
        );
        process.exit(0);
        break;
      default:
        console.error(`Unknown argument: ${args[i]}`);
        process.exit(1);
    }
  }

  if (!parsed.download && !parsed.input) {
    console.error("Error: Specify --input <file> or --download");
    process.exit(1);
  }

  return parsed;
}

/* ------------------------------------------------------------------ */
/*  Download helper                                                    */
/* ------------------------------------------------------------------ */

/**
 * Download a URL to a local file, following redirects (up to 5).
 * Returns the path to the downloaded file.
 */
function downloadFile(url, destPath, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      return reject(new Error("Too many redirects"));
    }

    const client = url.startsWith("https") ? https : http;

    console.log(`Fetching: ${url}`);
    const request = client.get(url, (response) => {
      // Follow redirects
      if (
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        const redirectUrl = new URL(response.headers.location, url).href;
        console.log(`  Redirected to: ${redirectUrl}`);
        return resolve(downloadFile(redirectUrl, destPath, redirectCount + 1));
      }

      if (response.statusCode !== 200) {
        return reject(
          new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`),
        );
      }

      const contentLength = parseInt(
        response.headers["content-length"] || "0",
        10,
      );
      let downloaded = 0;
      let lastPercent = -1;

      const file = fs.createWriteStream(destPath);
      response.on("data", (chunk) => {
        downloaded += chunk.length;
        if (contentLength > 0) {
          const percent = Math.floor((downloaded / contentLength) * 100);
          if (percent !== lastPercent && percent % 5 === 0) {
            lastPercent = percent;
            const mb = (downloaded / 1024 / 1024).toFixed(1);
            const totalMb = (contentLength / 1024 / 1024).toFixed(1);
            process.stdout.write(`  Downloaded ${mb} / ${totalMb} MB (${percent}%)\r`);
          }
        }
      });

      response.pipe(file);
      file.on("finish", () => {
        file.close();
        console.log(`\n  Download complete: ${destPath}`);
        resolve(destPath);
      });
      file.on("error", (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    });

    request.on("error", reject);
  });
}

/* ------------------------------------------------------------------ */
/*  Metadata extraction                                                */
/* ------------------------------------------------------------------ */

/**
 * Normalise a jurisdiction string to our standard codes.
 */
function normaliseJurisdiction(raw) {
  if (!raw) return "Cth";
  const lower = raw.toLowerCase().trim();
  return JURISDICTION_MAP[lower] || raw;
}

/**
 * Normalise a citation string for matching:
 * lowercase, strip brackets and excess whitespace.
 */
function normaliseCitation(citation) {
  return citation
    .replace(/[[\](){}]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract the year from a citation or date string.
 * Tries citation first (e.g. "[2023] HCA 1"), then falls back to date field.
 */
function extractYear(citation, date) {
  // Try bracketed year in citation: [2023] or (2023)
  const bracketMatch = citation?.match(/[[(](\d{4})[)\]]/);
  if (bracketMatch) return parseInt(bracketMatch[1], 10);

  // Try trailing year: ... 2023
  const trailingMatch = citation?.match(/\b(1[89]\d{2}|20\d{2})\b/);
  if (trailingMatch) return parseInt(trailingMatch[1], 10);

  // Fall back to date field
  if (date) {
    const dateMatch = date.match(/\b(1[89]\d{2}|20\d{2})\b/);
    if (dateMatch) return parseInt(dateMatch[1], 10);
  }

  return 0;
}

/**
 * Extract party names from a case citation.
 * Looks for "X v Y" or "X v. Y" patterns, or "Re X", "Ex parte X".
 */
function extractParties(citation) {
  if (!citation) return undefined;

  // "Party A v Party B [2023] HCA 1" — take everything before the first bracket/paren
  const beforeBracket = citation.split(/[[(]/)[0].trim();

  // Check for "v" or "v." separator
  if (/\bv\.?\s/i.test(beforeBracket)) {
    return beforeBracket.replace(/\s+/g, " ").trim();
  }

  // "Re X" or "Ex parte X"
  if (/^(Re|Ex parte)\s/i.test(beforeBracket)) {
    return beforeBracket.trim();
  }

  return beforeBracket || undefined;
}

/**
 * Map the corpus "type" field to our internal type enum.
 * The corpus uses "decision" for cases.
 */
function mapDocType(rawType) {
  if (!rawType) return "case";
  const lower = rawType.toLowerCase().trim();
  if (lower === "decision") return "case";
  if (VALID_TYPES.has(lower)) return lower;
  return "case";
}

/**
 * Extract a CorpusEntry from a raw JSONL record.
 */
function extractEntry(record, index) {
  const citation = record.citation || record.title || `Unknown #${index}`;
  const docType = mapDocType(record.type);
  const jurisdiction = normaliseJurisdiction(record.jurisdiction);
  const year = extractYear(citation, record.date || record.when);

  const entry = {
    citation,
    normalisedCitation: normaliseCitation(citation),
    jurisdiction,
    courtOrRegister: record.court || record.source || "",
    type: docType,
    year,
    sourceUrl: record.url || record.source_url || "",
    corpusDocId: record.version_id || record.document_id || `corpus-${index}`,
  };

  if (docType === "case") {
    const parties = extractParties(citation);
    if (parties) entry.parties = parties;
  } else {
    // Legislation or bill — use title
    const title = record.title || record.name;
    if (title) entry.title = title;
  }

  return entry;
}

/* ------------------------------------------------------------------ */
/*  JSONL streaming processor                                          */
/* ------------------------------------------------------------------ */

/**
 * Process a JSONL file line-by-line, extracting metadata entries.
 * Uses streaming to handle large files without excessive memory.
 */
async function processJsonl(filePath) {
  const entries = [];
  let lineCount = 0;
  let errorCount = 0;

  const rl = createInterface({
    input: createReadStream(filePath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    lineCount++;
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const record = JSON.parse(trimmed);
      entries.push(extractEntry(record, lineCount));
    } catch {
      errorCount++;
      if (errorCount <= 5) {
        console.warn(`  Warning: Failed to parse line ${lineCount}`);
      }
    }

    if (lineCount % 50000 === 0) {
      console.log(`  Processed ${lineCount.toLocaleString()} lines...`);
    }
  }

  if (errorCount > 5) {
    console.warn(`  (${errorCount} total parse errors)`);
  }

  return entries;
}

/* ------------------------------------------------------------------ */
/*  Output                                                             */
/* ------------------------------------------------------------------ */

function writeIndex(entries, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });

  const indexPath = path.join(outputDir, "index.json");
  const manifestPath = path.join(outputDir, "manifest.json");

  // Write index.json
  console.log(`Writing ${entries.length.toLocaleString()} entries to ${indexPath}...`);
  const indexJson = JSON.stringify(entries);
  fs.writeFileSync(indexPath, indexJson, "utf-8");

  const indexSizeMb = (Buffer.byteLength(indexJson, "utf-8") / 1024 / 1024).toFixed(2);
  console.log(`  index.json: ${indexSizeMb} MB`);

  // Compute SHA-256 checksum
  const hash = crypto.createHash("sha256").update(indexJson).digest("hex");

  // Write manifest.json
  const manifest = {
    version: "1.0.0",
    entryCount: entries.length,
    checksum: hash,
    buildDate: new Date().toISOString(),
    source: "open-australian-legal-corpus",
    sourceUrl: HF_DATASET_URL,
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf-8");
  console.log(`  manifest.json written`);

  return { indexPath, manifestPath, indexSizeMb, hash };
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

async function main() {
  const args = parseArgs();
  const outputDir = path.resolve(args.output);

  console.log("Obiter Corpus Index Builder");
  console.log("==========================\n");

  let inputPath;

  if (args.download) {
    // Download corpus from Hugging Face
    const tmpDir = path.join(outputDir, ".tmp");
    fs.mkdirSync(tmpDir, { recursive: true });
    inputPath = path.join(tmpDir, "corpus.jsonl");

    console.log("Downloading corpus from Hugging Face...");
    console.log(`  Source: ${HF_DATASET_URL}\n`);

    await downloadFile(HF_DATASET_URL, inputPath);
    console.log("");
  } else {
    inputPath = path.resolve(args.input);
    if (!fs.existsSync(inputPath)) {
      console.error(`Error: Input file not found: ${inputPath}`);
      process.exit(1);
    }
  }

  // Process the JSONL
  console.log(`Processing ${inputPath}...`);
  const entries = await processJsonl(inputPath);
  console.log(`  Extracted ${entries.length.toLocaleString()} entries\n`);

  // Write output
  const result = writeIndex(entries, outputDir);

  // Clean up tmp download
  if (args.download) {
    const tmpDir = path.join(outputDir, ".tmp");
    fs.rmSync(tmpDir, { recursive: true, force: true });
    console.log("  Cleaned up temporary download\n");
  }

  // Summary
  console.log("Build complete:");
  console.log(`  Entries: ${entries.length.toLocaleString()}`);
  console.log(`  Size:    ${result.indexSizeMb} MB`);
  console.log(`  SHA-256: ${result.hash}`);
  console.log(`  Output:  ${result.indexPath}`);
}

main().catch((err) => {
  console.error(`\nFatal error: ${err.message}`);
  process.exit(1);
});
