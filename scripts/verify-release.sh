#!/usr/bin/env bash
#
# verify-release.sh — End-to-end check that a release actually landed
# everywhere, not just locally.
#
# The deploy checklist has always covered "did I bump and push?". What it did
# NOT cover is "did the push actually produce a published release?". The
# release workflow can fail after the tag is pushed (a flaky test is enough),
# and nothing surfaces that: the tag exists, the deploy went out from the
# laptop, and GitHub quietly shows an older version as Latest. v1.16.5,
# v1.16.8 and v1.16.11 all failed that way.
#
# This walks the whole chain for the CURRENT package.json version and reports
# every link that is missing:
#
#   1. version locations agree              (scripts/check-version-sync.js)
#   2. local git tag exists and is on HEAD
#   3. the tag is pushed to origin
#   4. the release workflow run for the tag succeeded
#   5. a GitHub Release exists for the tag
#   6. production serves that version
#   7. the beta slot serves that version
#
# Usage:
#   npm run verify-release
#
# Exits non-zero if any link is broken, listing what to do about it.

set -uo pipefail

cd "$(dirname "$0")/.."

VERSION=$(node -p "require('./package.json').version")
TAG="v${VERSION}"
FAILED=0

pass() { printf '  \033[32mOK\033[0m   %s\n' "$1"; }
fail() { printf '  \033[31mFAIL\033[0m %s\n' "$1"; FAILED=1; }
warn() { printf '  \033[33mSKIP\033[0m %s\n' "$1"; }

echo "==> Verifying release ${TAG}"
echo

# 1. Version locations agree ------------------------------------------------
if node scripts/check-version-sync.js >/dev/null 2>&1; then
  pass "version locations agree (package.json, constants.ts, sw.js, README, manifests)"
else
  fail "version drift — run: npm run check-version"
fi

# 2. Local tag on HEAD ------------------------------------------------------
if git rev-parse -q --verify "refs/tags/${TAG}" >/dev/null; then
  if [ "$(git rev-parse "${TAG}^{commit}")" = "$(git rev-parse HEAD)" ]; then
    pass "local tag ${TAG} points at HEAD"
  else
    fail "local tag ${TAG} exists but is NOT on HEAD — re-tag the release commit"
  fi
else
  fail "local tag ${TAG} missing — run: git tag ${TAG}"
fi

# 3. Tag pushed to origin ---------------------------------------------------
# Prefer gh (HTTPS token) — plain `git ls-remote` needs the deploy key in
# GIT_SSH_COMMAND and otherwise fails with "Permission denied (publickey)",
# which would look like a missing tag.
REMOTE_TAG_OK=""
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  if gh api "repos/{owner}/{repo}/git/ref/tags/${TAG}" >/dev/null 2>&1; then
    REMOTE_TAG_OK=1
  fi
elif git ls-remote --tags origin 2>/dev/null | grep -q "refs/tags/${TAG}$"; then
  REMOTE_TAG_OK=1
fi

if [ -n "${REMOTE_TAG_OK}" ]; then
  pass "tag ${TAG} is on origin"
else
  fail "tag ${TAG} NOT pushed — run: git push origin main --tags"
fi

# 4/5. Workflow run + published release -------------------------------------
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  CONCLUSION=$(gh run list --workflow=release.yml --limit 40 \
    --json headBranch,conclusion --jq \
    ".[] | select(.headBranch == \"${TAG}\") | .conclusion" 2>/dev/null | head -1)

  case "${CONCLUSION}" in
    success) pass "release workflow for ${TAG} succeeded" ;;
    "")      fail "no release workflow run found for ${TAG} — was the tag pushed?" ;;
    *)       fail "release workflow for ${TAG} concluded '${CONCLUSION}' — no release was published.
         Inspect: gh run list --workflow=release.yml
         Re-run:  gh run rerun <run-id>  (or delete and re-push the tag)" ;;
  esac

  if gh release view "${TAG}" >/dev/null 2>&1; then
    pass "GitHub Release ${TAG} is published"
  else
    fail "no GitHub Release for ${TAG} — GitHub will show an older version as Latest"
  fi

  LATEST=$(gh release view --json tagName --jq .tagName 2>/dev/null || echo "")
  if [ -n "${LATEST}" ] && [ "${LATEST}" != "${TAG}" ]; then
    fail "GitHub 'Latest' release is ${LATEST}, not ${TAG}"
  elif [ -n "${LATEST}" ]; then
    pass "GitHub 'Latest' release is ${TAG}"
  fi
else
  warn "gh CLI unavailable/unauthenticated — cannot check workflow or release"
fi

# 6/7. Deployed bundles ------------------------------------------------------
check_deployed() {
  local label="$1" base="$2"
  local html bundle
  html=$(curl -fsS --max-time 20 "${base}/taskpane.html" 2>/dev/null) || {
    fail "${label}: could not fetch ${base}/taskpane.html"
    return
  }
  bundle=$(printf '%s' "${html}" | grep -oE 'taskpane\.[a-f0-9]+\.js' | head -1)
  if [ -z "${bundle}" ]; then
    fail "${label}: no taskpane bundle referenced in taskpane.html"
    return
  fi
  if curl -fsS --max-time 60 "${base}/${bundle}" 2>/dev/null | grep -q "${VERSION}"; then
    pass "${label} serves ${VERSION} (${bundle})"
  else
    fail "${label} does NOT serve ${VERSION} (${bundle}) — redeploy"
  fi
}

check_deployed "production" "https://obiter.com.au/app"
check_deployed "beta      " "https://obiter.com.au/app/beta"

echo
if [ "${FAILED}" -eq 0 ]; then
  echo "==> Release ${TAG} is consistent everywhere."
else
  echo "==> Release ${TAG} is INCOMPLETE — see the FAIL lines above."
fi
exit "${FAILED}"
