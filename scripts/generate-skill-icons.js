#!/usr/bin/env node
/**
 * generate-skill-icons.js
 *
 * Generates the two icons the unified Microsoft 365 manifest requires for the
 * Obiter Copilot skill (COPILOT-012), using ImageMagick:
 *
 *   assets/color.png    192x192  full-colour app icon (teal rounded square,
 *                                 white "O" glyph) — used in the apps store
 *   assets/outline.png   32x32   monochrome, transparent-background outline
 *                                 (white "O" glyph) — used in nav surfaces
 *
 * Brand colour: Obiter teal #2AA198 (single accent, per the style guide).
 *
 * Usage: node scripts/generate-skill-icons.js
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ASSETS_DIR = path.resolve(__dirname, "..", "assets");
const TEAL = "#2AA198";
const WHITE = "#FFFFFF";

function magickCmd() {
  try {
    execSync("which magick", { stdio: "ignore" });
    return "magick";
  } catch {
    return "convert";
  }
}

// ImageMagick on this environment has no font aliases configured, so resolve an
// actual bold font file (macOS first, then common Linux paths).
function resolveFont() {
  const candidates = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
  ];
  const found = candidates.find((f) => fs.existsSync(f));
  if (!found) {
    throw new Error(
      "No usable font file found for ImageMagick. Install DejaVu/Arial or edit resolveFont()."
    );
  }
  return found;
}

const cmd = magickCmd();
const FONT = resolveFont();

// ── Colour icon: 192x192 teal rounded square with a white "O" ────────────────
function generateColorIcon() {
  const size = 192;
  const radius = Math.round(size * 0.18);
  const fontSize = Math.round(size * 0.62);
  const out = path.join(ASSETS_DIR, "color.png");
  const draw = `roundrectangle 0,0 ${size - 1},${size - 1} ${radius},${radius}`;
  execSync(
    `${cmd} -size ${size}x${size} xc:none ` +
      `-fill "${TEAL}" -draw "${draw}" ` +
      `-fill "${WHITE}" -gravity center -pointsize ${fontSize} -font "${FONT}" ` +
      `-annotate +0+0 "O" ` +
      `"${out}"`,
    { stdio: "inherit" }
  );
  console.log(`  color.png   192x192  ${out}`);
}

// ── Outline icon: 32x32 transparent background, white "O" glyph ──────────────
function generateOutlineIcon() {
  const size = 32;
  const fontSize = Math.round(size * 0.82);
  const out = path.join(ASSETS_DIR, "outline.png");
  execSync(
    `${cmd} -size ${size}x${size} xc:none ` +
      `-fill "${WHITE}" -gravity center -pointsize ${fontSize} -font "${FONT}" ` +
      `-annotate +0+0 "O" ` +
      `"${out}"`,
    { stdio: "inherit" }
  );
  console.log(`  outline.png  32x32   ${out}`);
}

console.log("Generating Obiter Copilot skill icons...");
generateColorIcon();
generateOutlineIcon();
console.log("Done.");
