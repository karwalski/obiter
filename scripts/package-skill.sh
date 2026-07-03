#!/usr/bin/env bash
#
# package-skill.sh — Build the Obiter Copilot skill app package (COPILOT-013).
#
# Produces a Microsoft 365 app package (.zip) containing the unified manifest and
# the two icons, ready to sideload via the Microsoft 365 Agents Toolkit or upload
# in the Microsoft 365 admin centre. This is STAGED: it does not touch the
# production manifest.xml or deploy anything. Live Copilot verification (needs a
# Copilot licence + preview tenant) is COPILOT-014.
#
# The package root must contain: manifest.json, color.png, outline.png, and the
# declarativeAgent.json referenced by copilotAgents.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

DEV_URL="https://localhost:3000"
PROD_URL="https://obiter.com.au/app"

echo "==> Generating skill manifest + declarative agent..."
npm run export-skill >/dev/null

echo "==> Generating skill icons..."
node scripts/generate-skill-icons.js >/dev/null

# Version comes from the generated unified manifest (single source of truth).
VERSION=$(node -p "require('./manifest.skill.json').version")

# BETA=1 targets the staging slot https://obiter.com.au/app/beta (see
# docs/beta-testing.md) so the skill can be tested without deploying to production.
if [ "${BETA:-0}" = "1" ]; then
  ZIP_NAME="obiter-copilot-skill-v${VERSION}-beta.zip"
  echo "==> Packaging Obiter Copilot skill v${VERSION} (BETA → /app/beta)"
else
  ZIP_NAME="obiter-copilot-skill-v${VERSION}.zip"
  echo "==> Packaging Obiter Copilot skill v${VERSION}"
fi

STAGING_DIR=$(mktemp -d)
trap 'rm -rf "$STAGING_DIR"' EXIT

# manifest.json at the package root (any lingering dev URL → production).
sed "s|${DEV_URL}|${PROD_URL}|g" manifest.skill.json > "$STAGING_DIR/manifest.json"

# Beta: repoint the production host at the /app/beta staging slot.
if [ "${BETA:-0}" = "1" ]; then
  sed -i.bak "s#obiter\.com\.au/app/#obiter.com.au/app/beta/#g" "$STAGING_DIR/manifest.json"
  rm -f "$STAGING_DIR/manifest.json.bak"
fi

cp declarativeAgent.json "$STAGING_DIR/declarativeAgent.json"
cp assets/color.png "$STAGING_DIR/color.png"
cp assets/outline.png "$STAGING_DIR/outline.png"

echo "==> Creating ${ZIP_NAME}..."
rm -f "$PROJECT_ROOT/$ZIP_NAME"
(cd "$STAGING_DIR" && zip -r -q "$PROJECT_ROOT/$ZIP_NAME" manifest.json declarativeAgent.json color.png outline.png)

echo "==> Package created: ${ZIP_NAME}"
echo "    $(du -h "$PROJECT_ROOT/$ZIP_NAME" | cut -f1) compressed"
echo "    Contents:"
unzip -l "$PROJECT_ROOT/$ZIP_NAME" | sed 's/^/      /'
echo
echo "Next (COPILOT-014, needs a Copilot licence + preview tenant):"
echo "  - Validate with the Microsoft 365 Agents Toolkit"
echo "  - Sideload and confirm Copilot invokes insertCitation → native footnote"
