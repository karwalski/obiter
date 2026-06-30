#!/bin/bash
# Deploy backend server to the server
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/_deploy-env.sh"

scp -i "$SSH_KEY" website/server/*.js website/server/package.json "$SSH_TARGET:/var/www/obiter/server/"
ssh -i "$SSH_KEY" "$SSH_TARGET" 'cd /var/www/obiter/server && npm install --production'
echo "Server files deployed. Restart with: npm run restart:server"
