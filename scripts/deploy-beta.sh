#!/bin/bash
# Deploy the current build to the BETA / staging slot: https://obiter.com.au/app/beta/
#
# The dist is location-agnostic (relative paths), so the same production build
# serves both /app/ and /app/beta/ — only the manifests differ. This deploys a
# build under test to /app/beta/ WITHOUT touching production /app/ (existing
# users are undisturbed). Promote by running deploy:app once you're happy.
#
# Prereq: run `npm run build:prod` first (produces dist/). Then sideload
# manifest.beta.xml (classic) and/or the beta Copilot package. See docs/beta-testing.md.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/_deploy-env.sh"

# TRUST-002: regenerate the nginx security-header snippets from config/csp.js
# so the deployed headers can never drift from the source of truth.
echo "Generating nginx security-header snippets..."
node "$SCRIPT_DIR/generate-nginx-headers.js"

echo "Deploying add-in to obiter.com.au/app/beta/ (staging — production /app/ untouched)..."
# plain mkdir (deploy user owns /app) — sudo would create a root-owned dir the
# rsync transfer can't write into.
ssh -i "$SSH_KEY" "$SSH_TARGET" "mkdir -p /opt/bitnami/nginx/html/app/beta"
rsync -avz --delete -e "ssh -i $SSH_KEY" dist/ "$SSH_TARGET:/opt/bitnami/nginx/html/app/beta/"

# TRUST-002: push the REPORT-ONLY security-header snippet for the beta slot.
# Beta runs Content-Security-Policy-Report-Only (violations are logged in the
# browser console, nothing is blocked) while production /app/ is untouched.
# The include line inside the /app/beta/ location block is a ONE-TIME manual
# step (see docs/server-setup.md); until it exists, pushing this file is
# harmless. /opt/bitnami/nginx/conf is root-owned, so write via sudo tee.
echo "Deploying nginx security headers (Report-Only, beta) to /opt/bitnami/nginx/conf/obiter/..."
ssh -i "$SSH_KEY" "$SSH_TARGET" "sudo mkdir -p /opt/bitnami/nginx/conf/obiter"
ssh -i "$SSH_KEY" "$SSH_TARGET" \
  "sudo tee /opt/bitnami/nginx/conf/obiter/app-security-headers.beta.conf > /dev/null" \
  < "$SCRIPT_DIR/nginx/app-security-headers.report-only.conf"

# Only reload nginx if the config test passes; otherwise abort loudly.
# nginx keeps serving with the OLD config, so a failed test never takes
# the site down — but the new headers are not live until this is fixed.
if ! ssh -i "$SSH_KEY" "$SSH_TARGET" "sudo /opt/bitnami/nginx/sbin/nginx -t"; then
  echo "ERROR: remote 'nginx -t' failed — nginx was NOT reloaded (old config still active)." >&2
  echo "Inspect /opt/bitnami/nginx/conf/obiter/app-security-headers.beta.conf on the server." >&2
  exit 1
fi
ssh -i "$SSH_KEY" "$SSH_TARGET" "sudo /opt/bitnami/nginx/sbin/nginx -s reload"

echo "Deployed. Beta available at https://obiter.com.au/app/beta/taskpane.html"
echo "Verify headers: curl -sI https://obiter.com.au/app/beta/taskpane.html"
