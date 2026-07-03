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

echo "Deploying add-in to obiter.com.au/app/beta/ (staging — production /app/ untouched)..."
ssh -i "$SSH_KEY" "$SSH_TARGET" "sudo mkdir -p /opt/bitnami/nginx/html/app/beta"
rsync -avz --delete -e "ssh -i $SSH_KEY" dist/ "$SSH_TARGET:/opt/bitnami/nginx/html/app/beta/"
echo "Deployed. Beta available at https://obiter.com.au/app/beta/taskpane.html"
