#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/_deploy-env.sh"

echo "Deploying add-in to obiter.com.au/app/..."
ssh -i "$SSH_KEY" "$SSH_TARGET" "sudo mkdir -p /opt/bitnami/nginx/html/app"
# --exclude 'beta/' so a production deploy never wipes the /app/beta/ staging slot
# (see scripts/deploy-beta.sh, docs/beta-testing.md).
rsync -avz --delete --exclude 'beta/' -e "ssh -i $SSH_KEY" dist/ "$SSH_TARGET:/opt/bitnami/nginx/html/app/"
echo "Deployed. Add-in available at https://obiter.com.au/app/taskpane.html"
