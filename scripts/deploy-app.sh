#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/_deploy-env.sh"

# TRUST-002: regenerate the nginx security-header snippets from config/csp.js
# so the deployed headers can never drift from the source of truth.
echo "Generating nginx security-header snippets..."
node "$SCRIPT_DIR/generate-nginx-headers.js"

echo "Deploying add-in to obiter.com.au/app/..."
# /app is owned by the deploy user; plain mkdir avoids a root-owned dir that
# the (non-sudo) rsync transfer then can't write into.
ssh -i "$SSH_KEY" "$SSH_TARGET" "mkdir -p /opt/bitnami/nginx/html/app"
# --exclude 'beta/' so a production deploy never wipes the /app/beta/ staging slot
# (see scripts/deploy-beta.sh, docs/beta-testing.md).
rsync -avz --delete --exclude 'beta/' -e "ssh -i $SSH_KEY" dist/ "$SSH_TARGET:/opt/bitnami/nginx/html/app/"

# TRUST-002: push the ENFORCED security-header snippet and reload nginx.
# The include line inside the /app/ location block is a ONE-TIME manual step
# (see docs/server-setup.md); until it exists, pushing this file is harmless.
# /opt/bitnami/nginx/conf is root-owned, so write via sudo tee (matches
# scripts/setup-corpus-nginx.sh conventions).
echo "Deploying nginx security headers (enforced) to /opt/bitnami/nginx/conf/obiter/..."
ssh -i "$SSH_KEY" "$SSH_TARGET" "sudo mkdir -p /opt/bitnami/nginx/conf/obiter"
ssh -i "$SSH_KEY" "$SSH_TARGET" \
  "sudo tee /opt/bitnami/nginx/conf/obiter/app-security-headers.conf > /dev/null" \
  < "$SCRIPT_DIR/nginx/app-security-headers.conf"

# Only reload nginx if the config test passes; otherwise abort loudly.
# nginx keeps serving with the OLD config, so a failed test never takes
# the site down — but the new headers are not live until this is fixed.
if ! ssh -i "$SSH_KEY" "$SSH_TARGET" "sudo /opt/bitnami/nginx/sbin/nginx -t"; then
  echo "ERROR: remote 'nginx -t' failed — nginx was NOT reloaded (old config still active)." >&2
  echo "Inspect /opt/bitnami/nginx/conf/obiter/app-security-headers.conf on the server." >&2
  exit 1
fi
ssh -i "$SSH_KEY" "$SSH_TARGET" "sudo /opt/bitnami/nginx/sbin/nginx -s reload"

echo "Deployed. Add-in available at https://obiter.com.au/app/taskpane.html"
echo "Verify headers: curl -sI https://obiter.com.au/app/taskpane.html"
