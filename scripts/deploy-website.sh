#!/bin/bash
# Deploy website static files to the server
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/_deploy-env.sh"

scp -i "$SSH_KEY" website/*.html "$SSH_TARGET:/opt/bitnami/nginx/html/"
scp -i "$SSH_KEY" -r website/css website/js "$SSH_TARGET:/opt/bitnami/nginx/html/"
scp -i "$SSH_KEY" website/robots.txt website/sitemap.xml "$SSH_TARGET:/opt/bitnami/nginx/html/"
echo "Website deployed"
