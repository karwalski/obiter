#!/bin/bash
# Restart the backend server on the server
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/_deploy-env.sh"

ssh -i "$SSH_KEY" "$SSH_TARGET" 'pkill -f "node.*index.js" 2>/dev/null; sleep 1; source /etc/obiter/env.sh && cd /var/www/obiter/server && screen -dmS obiter bash -c "source /etc/obiter/env.sh && node index.js"'
sleep 3
ssh -i "$SSH_KEY" "$SSH_TARGET" 'curl -s http://localhost:3001/api/signatures | head -1'
echo "Server restarted"
