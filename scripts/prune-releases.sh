#!/usr/bin/env bash
#
# prune-releases.sh — Keep only the most recent classic GitHub Releases.
#
# OPS-RELEASES-01 (2026-07-08 decision): only the last couple of classic
# add-in versions stay published as GitHub Releases, for rollback and manual
# sideload. Older classic releases are deleted (the underlying git tags are
# KEPT — only the release entry and its assets are removed).
#
# Copilot skill releases and tags are NEVER touched: anything whose tag
# contains "copilot" or is exactly v1.15.1 (the tag used by the Copilot
# skill) is excluded from consideration entirely.
#
# Usage:
#   GH_TOKEN=... bash scripts/prune-releases.sh
#
# Environment:
#   GH_TOKEN / GITHUB_TOKEN  Auth for gh (provided automatically in Actions)
#   GITHUB_REPOSITORY        owner/repo (set in Actions; defaults to origin)
#   KEEP                     How many classic releases to keep (default 2)
#   DRY_RUN                  Set to 1 to print what would be deleted

set -euo pipefail

KEEP="${KEEP:-2}"
DRY_RUN="${DRY_RUN:-0}"

if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR: gh CLI is required" >&2
  exit 1
fi

# Repo: use Actions-provided GITHUB_REPOSITORY, else derive from origin.
if [ -n "${GITHUB_REPOSITORY:-}" ]; then
  REPO="$GITHUB_REPOSITORY"
else
  REPO=$(git remote get-url origin | sed -E 's#^.*[:/]([^/]+/[^/]+?)(\.git)?$#\1#')
fi

echo "==> Pruning classic releases in ${REPO} (keeping ${KEEP} most recent)"

# All release tags, one per line.
ALL_TAGS=$(gh release list --repo "$REPO" --limit 200 --json tagName \
  --jq '.[].tagName')

if [ -z "$ALL_TAGS" ]; then
  echo "==> No releases found; nothing to prune."
  exit 0
fi

# Classic releases only: strict vX.Y.Z tags. Everything else (copilot tags,
# beta suffixes, the reserved v1.15.1) is never considered for deletion.
CLASSIC_TAGS=$(printf '%s\n' "$ALL_TAGS" \
  | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' \
  | grep -iv 'copilot' \
  | grep -Fvx 'v1.15.1' \
  || true)

if [ -z "$CLASSIC_TAGS" ]; then
  echo "==> No classic releases found; nothing to prune."
  exit 0
fi

# Newest first by version number; everything after the first $KEEP goes.
DELETE_TAGS=$(printf '%s\n' "$CLASSIC_TAGS" | sort -rV | tail -n "+$((KEEP + 1))")

if [ -z "$DELETE_TAGS" ]; then
  echo "==> $(printf '%s\n' "$CLASSIC_TAGS" | wc -l | tr -d ' ') classic release(s) exist; nothing to prune."
  exit 0
fi

while IFS= read -r TAG; do
  # Belt and braces: re-check the exclusions before every delete.
  case "$TAG" in
    *[Cc]opilot*|v1.15.1)
      echo "==> SKIP ${TAG} (Copilot — never pruned)"
      continue
      ;;
  esac
  if [ "$DRY_RUN" = "1" ]; then
    echo "==> DRY RUN: would delete release ${TAG} (tag kept)"
  else
    echo "==> Deleting release ${TAG} (tag kept)"
    gh release delete "$TAG" --repo "$REPO" --yes
  fi
done <<< "$DELETE_TAGS"

echo "==> Done. Kept the ${KEEP} most recent classic release(s)."
