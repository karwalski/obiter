#!/bin/bash
# Obiter — AGLC4 Word Add-in
# Copyright (C) 2026. Licensed under GPLv3.
#
# Script: setup-corpus-nginx
#
# Configures nginx on the Lightsail instance to serve corpus index files
# with CORS headers and caching. Run once during initial setup.
#
# Usage:
#   bash scripts/setup-corpus-nginx.sh

set -euo pipefail

SERVER="bitnami@3.106.204.98"
SSH_KEY="$HOME/.ssh/obiter.pem"
CORPUS_DIR="/opt/bitnami/nginx/html/corpus"
NGINX_CONF="/opt/bitnami/nginx/conf/server_blocks/corpus.conf"

echo "Obiter Corpus Nginx Setup"
echo "========================="
echo ""

# ------------------------------------------------------------------ #
#  1. Create corpus directory and placeholder manifest                #
# ------------------------------------------------------------------ #

echo "Creating corpus directory on server..."
ssh -i "$SSH_KEY" "$SERVER" << 'REMOTE_SETUP'
set -euo pipefail

CORPUS_DIR="/opt/bitnami/nginx/html/corpus"

# Create directory
sudo mkdir -p "$CORPUS_DIR"
sudo chown bitnami:bitnami "$CORPUS_DIR"

# Write placeholder manifest so download checks don't error
cat > "$CORPUS_DIR/manifest.json" << 'MANIFEST'
{
  "version": "0.0.0",
  "entryCount": 0,
  "checksum": "",
  "buildDate": "",
  "source": "placeholder",
  "sourceUrl": ""
}
MANIFEST

echo "  Created $CORPUS_DIR/manifest.json (placeholder v0.0.0)"
REMOTE_SETUP

echo ""

# ------------------------------------------------------------------ #
#  2. Add nginx location block for corpus serving                     #
# ------------------------------------------------------------------ #

echo "Configuring nginx location block..."
ssh -i "$SSH_KEY" "$SERVER" << 'REMOTE_NGINX'
set -euo pipefail

NGINX_CONF="/opt/bitnami/nginx/conf/server_blocks/corpus.conf"
NGINX_INCLUDE_DIR="/opt/bitnami/nginx/conf/server_blocks"

# Ensure server_blocks directory exists
sudo mkdir -p "$NGINX_INCLUDE_DIR"

# Write the corpus location block
sudo tee "$NGINX_CONF" > /dev/null << 'NGINX'
# Obiter Corpus Index — static file serving with CORS
# Serves index.json and manifest.json from /corpus/

location /corpus/ {
    alias /opt/bitnami/nginx/html/corpus/;

    # CORS: allow the add-in and website origins
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS" always;
    add_header Access-Control-Allow-Headers "*" always;

    # Handle preflight
    if ($request_method = 'OPTIONS') {
        add_header Access-Control-Allow-Origin "*";
        add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS";
        add_header Access-Control-Allow-Headers "*";
        add_header Access-Control-Max-Age 86400;
        add_header Content-Length 0;
        add_header Content-Type text/plain;
        return 204;
    }

    # Cache for one week; clients check manifest for version changes
    add_header Cache-Control "public, max-age=604800" always;

    # Serve pre-compressed gzip if available (index.json.gz)
    gzip_static on;

    # JSON content type
    types {
        application/json json;
    }
}
NGINX

echo "  Wrote $NGINX_CONF"

# Check if server_blocks are included in the main nginx config
MAIN_CONF="/opt/bitnami/nginx/conf/nginx.conf"
if ! grep -q "server_blocks" "$MAIN_CONF" 2>/dev/null; then
    echo "  WARNING: $MAIN_CONF may not include server_blocks/*.conf"
    echo "  You may need to add: include server_blocks/*.conf; inside the server block"
fi

# Test nginx configuration
echo "  Testing nginx configuration..."
sudo /opt/bitnami/nginx/sbin/nginx -t

# Reload nginx
echo "  Reloading nginx..."
sudo /opt/bitnami/nginx/sbin/nginx -s reload

echo "  Nginx reloaded successfully"
REMOTE_NGINX

echo ""
echo "Setup complete."
echo ""
echo "Corpus files should be uploaded to: $SERVER:$CORPUS_DIR/"
echo "  - index.json    (the corpus metadata index)"
echo "  - manifest.json (version, checksum, entry count)"
echo ""
echo "They will be accessible at: https://obiter.com.au/corpus/"
