#!/usr/bin/env node
/**
 * generate-icons.js
 *
 * Generates distinct ribbon icons for each Obiter button using ImageMagick.
 * Each icon is a rounded square in the Obiter brand colour (#2AA198) with a
 * white glyph/symbol to distinguish it from the others.
 *
 * Usage: node scripts/generate-icons.js
 */

const { execSync } = require('child_process');
const path = require('path');

const ASSETS_DIR = path.resolve(__dirname, '..', 'assets');

// Obiter brand colours
const BG_COLOUR = '#2AA198';
const FG_COLOUR = '#FFFFFF';
const ACCENT = '#e94560';

// Button definitions: [name, glyph, useAccent]
// useAccent: if true, draws the glyph in accent red instead of white
const BUTTONS = [
  ['insert',      '+',  false],
  ['library',     null,  false],  // special: three horizontal lines
  ['validate',    '\u2713', false],  // checkmark
  ['bibliography','B',  false],
  ['guide',       '?',  false],
  ['refresh',     '\u21BB', false], // circular arrow (may not render; fallback below)
  ['template',    'T',  false],
  ['blockquote',  '\u201C', false], // left double quotation mark
  ['settings',    '\u2699', false], // gear
];

const SIZES = [16, 32, 80];

function magickCmd() {
  // Prefer `magick` (ImageMagick 7) over `convert` (ImageMagick 6)
  try {
    execSync('which magick', { stdio: 'ignore' });
    return 'magick';
  } catch {
    return 'convert';
  }
}

function generateIcon(cmd, name, glyph, size) {
  const outFile = path.join(ASSETS_DIR, `icon-${name}-${size}.png`);
  const radius = Math.round(size * 0.2);
  const fontSize = Math.round(size * 0.6);

  if (name === 'library') {
    // Draw three horizontal lines (list/book icon)
    const barH = Math.max(1, Math.round(size * 0.08));
    const gap = Math.round(size * 0.22);
    const cx = Math.round(size * 0.5);
    const cy = Math.round(size * 0.5);
    const barW = Math.round(size * 0.5);
    const x1 = cx - Math.round(barW / 2);
    const x2 = cx + Math.round(barW / 2);

    const y1 = cy - gap;
    const y2 = cy;
    const y3 = cy + gap;

    const drawCmds = [
      `roundrectangle 0,0 ${size - 1},${size - 1} ${radius},${radius}`,
      `rectangle ${x1},${y1 - barH} ${x2},${y1 + barH}`,
      `rectangle ${x1},${y2 - barH} ${x2},${y2 + barH}`,
      `rectangle ${x1},${y3 - barH} ${x2},${y3 + barH}`,
    ].join(' ');

    execSync(
      `${cmd} -size ${size}x${size} xc:none ` +
      `-fill '${BG_COLOUR}' -draw "roundrectangle 0,0 ${size - 1},${size - 1} ${radius},${radius}" ` +
      `-fill '${FG_COLOUR}' ` +
      `-draw "rectangle ${x1},${y1 - barH} ${x2},${y1 + barH}" ` +
      `-draw "rectangle ${x1},${y2 - barH} ${x2},${y2 + barH}" ` +
      `-draw "rectangle ${x1},${y3 - barH} ${x2},${y3 + barH}" ` +
      `"${outFile}"`,
      { stdio: 'inherit' }
    );
    return;
  }

  if (name === 'refresh') {
    // Draw two curved arrows as a simple refresh icon
    // Fallback: use the letter R with a circular accent
    const args = [
      `${cmd}`,
      `-size ${size}x${size} xc:none`,
      `-fill '${BG_COLOUR}' -draw "roundrectangle 0,0 ${size - 1},${size - 1} ${radius},${radius}"`,
      `-fill '${FG_COLOUR}' -font '/Library/Fonts/Arial Unicode.ttf' -pointsize ${fontSize}`,
      `-gravity center -annotate +0+0 'R'`,
      // Add a small curved arrow accent in the corner
      `-fill '${ACCENT}' -draw "circle ${Math.round(size * 0.75)},${Math.round(size * 0.25)} ${Math.round(size * 0.75)},${Math.round(size * 0.15)}"`,
      `"${outFile}"`,
    ];
    execSync(args.join(' '), { stdio: 'inherit' });
    return;
  }

  // Settings: draw a gear using circles and rectangles
  if (name === 'settings') {
    const cx = Math.round(size / 2);
    const cy = Math.round(size / 2);
    const outerR = Math.round(size * 0.28);
    const innerR = Math.round(size * 0.15);
    const toothW = Math.round(size * 0.08);
    const toothH = Math.round(size * 0.12);
    // Draw outer circle with 8 teeth (rectangles at 45-degree intervals)
    const teeth = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i * 45) * Math.PI / 180;
      const tx = Math.round(cx + Math.cos(angle) * outerR);
      const ty = Math.round(cy + Math.sin(angle) * outerR);
      teeth.push(`rectangle ${tx - toothW},${ty - toothW} ${tx + toothW},${ty + toothW}`);
    }
    const args = [
      `${cmd}`,
      `-size ${size}x${size} xc:none`,
      `-fill '${BG_COLOUR}' -draw "roundrectangle 0,0 ${size - 1},${size - 1} ${radius},${radius}"`,
      `-fill '${FG_COLOUR}' -draw "circle ${cx},${cy} ${cx},${cy - outerR}"`,
      ...teeth.map(t => `-draw "${t}"`),
      `-fill '${BG_COLOUR}' -draw "circle ${cx},${cy} ${cx},${cy - innerR}"`,
      `"${outFile}"`,
    ];
    execSync(args.join(' '), { stdio: 'inherit' });
    return;
  }

  // Standard glyph icon
  const args = [
    `${cmd}`,
    `-size ${size}x${size} xc:none`,
    `-fill '${BG_COLOUR}' -draw "roundrectangle 0,0 ${size - 1},${size - 1} ${radius},${radius}"`,
    `-fill '${FG_COLOUR}' -font '/Library/Fonts/Arial Unicode.ttf' -pointsize ${fontSize}`,
    `-gravity center -annotate +0+0 '${glyph}'`,
    `"${outFile}"`,
  ];

  execSync(args.join(' '), { stdio: 'inherit' });
}

// Main
const cmd = magickCmd();
console.log(`Using: ${cmd}`);
console.log(`Output: ${ASSETS_DIR}`);
console.log('');

let count = 0;
for (const [name, glyph] of BUTTONS) {
  for (const size of SIZES) {
    generateIcon(cmd, name, glyph, size);
    count++;
    console.log(`  icon-${name}-${size}.png`);
  }
}

console.log(`\nGenerated ${count} icons.`);
