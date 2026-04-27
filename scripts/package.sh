#!/usr/bin/env bash
#
# package.sh — Build and package the Obiter add-in for distribution.
#
# Creates a zip file containing the production manifest, built assets,
# documentation, and sideloading instructions.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Read version from package.json
VERSION=$(node -p "require('./package.json').version")
ZIP_NAME="obiter-v${VERSION}.zip"
PROD_URL="https://obiter.com.au/app"
DEV_URL="https://localhost:3000"

echo "==> Packaging Obiter v${VERSION}"

# ── Step 1: Build production assets ──────────────────────────────────────────
echo "==> Running production build..."
npm run build

# ── Step 2: Create production manifest ───────────────────────────────────────
echo "==> Creating production manifest..."
STAGING_DIR=$(mktemp -d)
trap 'rm -rf "$STAGING_DIR"' EXIT

sed "s|${DEV_URL}|${PROD_URL}|g" manifest.xml > "$STAGING_DIR/manifest.xml"

# ── Step 3: Assemble zip contents ────────────────────────────────────────────
echo "==> Assembling package..."

# Copy dist/ into staging
cp -r dist "$STAGING_DIR/dist"

# Copy documentation
cp README.md "$STAGING_DIR/README.md"
cp LICENSE "$STAGING_DIR/LICENSE"
cp INSTALL.md "$STAGING_DIR/INSTALL.md"

# Copy corpus for offline use (pre-built index from Open Australian Legal Corpus)
if [ -d "$PROJECT_ROOT/corpus" ] && [ -f "$PROJECT_ROOT/corpus/index.json" ]; then
  echo "==> Including corpus for offline use..."
  mkdir -p "$STAGING_DIR/corpus"
  cp "$PROJECT_ROOT/corpus/index.json" "$STAGING_DIR/corpus/index.json"
  cp "$PROJECT_ROOT/corpus/manifest.json" "$STAGING_DIR/corpus/manifest.json"
fi

# ── Step 4: Create zip ───────────────────────────────────────────────────────
echo "==> Creating ${ZIP_NAME}..."

# Remove old zip if it exists
rm -f "$PROJECT_ROOT/$ZIP_NAME"

(cd "$STAGING_DIR" && zip -r "$PROJECT_ROOT/$ZIP_NAME" .)

echo "==> Package created: ${ZIP_NAME}"
echo "    $(du -h "$PROJECT_ROOT/$ZIP_NAME" | cut -f1) compressed"
