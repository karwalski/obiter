#!/bin/bash
# Deploy backend server to the server
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/_deploy-env.sh"

REMOTE_DIR="/var/www/obiter/server"

# Top-level modules + manifest.
scp -i "$SSH_KEY" website/server/*.js website/server/package.json website/server/package-lock.json "$SSH_TARGET:$REMOTE_DIR/"

# ACCT/TRUST subtrees the server now requires (lib/ auth+crypto+ssrfGuard,
# routes/ account endpoints, scripts/ admin bootstrap). test/ is deliberately
# excluded from the deploy. Use rsync so removed files are pruned; fall back to
# recursive scp if rsync is unavailable on the runner.
if command -v rsync >/dev/null 2>&1; then
  rsync -az --delete -e "ssh -i $SSH_KEY" \
    website/server/lib website/server/routes website/server/scripts \
    "$SSH_TARGET:$REMOTE_DIR/"
else
  scp -i "$SSH_KEY" -r website/server/lib website/server/routes website/server/scripts "$SSH_TARGET:$REMOTE_DIR/"
fi

# npm ci --production rebuilds native argon2 against the server's Node ABI.
ssh -i "$SSH_KEY" "$SSH_TARGET" "cd $REMOTE_DIR && npm ci --production"
echo "Server files deployed. Restart with: npm run restart:server"
echo "NOTE: accounts require /etc/obiter/env.sh secrets (AUTH_TOKEN_SECRET, AUDIT_IP_SALT,"
echo "      VAULT_MASTER_KEY, TURNSTILE_SECRET) — see docs/server-setup.md before restart."
