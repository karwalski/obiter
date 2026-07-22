#!/bin/bash
# Deploy website static files to the server
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/_deploy-env.sh"

scp -i "$SSH_KEY" website/*.html "$SSH_TARGET:/opt/bitnami/nginx/html/"
scp -i "$SSH_KEY" -r website/css website/js "$SSH_TARGET:/opt/bitnami/nginx/html/"
scp -i "$SSH_KEY" website/robots.txt website/sitemap.xml "$SSH_TARGET:/opt/bitnami/nginx/html/"
# ACCT-005/006: the add-in opens its sign-in/reset/verify dialogs at
# obiter.com.au/account/*.html (see src/api/authDialog.ts). Ship that subtree.
ssh -i "$SSH_KEY" "$SSH_TARGET" 'mkdir -p /opt/bitnami/nginx/html/account'
scp -i "$SSH_KEY" -r website/account/. "$SSH_TARGET:/opt/bitnami/nginx/html/account/"
echo "Website deployed"
