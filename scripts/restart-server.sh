#!/bin/bash
# Restart the backend server on the server
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/_deploy-env.sh"

# Kill any stale node AND any dead/orphan screen session named obiter, then
# start detached with exec (so signals reach node) and a logfile (a detached
# screen with no output sink was dropping the process — left production down).
ssh -i "$SSH_KEY" "$SSH_TARGET" '
  pkill -f "node.*index.js" 2>/dev/null
  screen -S obiter -X quit 2>/dev/null
  sleep 1
  cd /var/www/obiter/server
  screen -dmS obiter bash -c "source /etc/obiter/env.sh && exec node index.js >> /var/www/obiter/server/server.log 2>&1"
'
sleep 3
# Verify the process is actually up; fail loudly if not (do not report success blindly).
STATUS=$(ssh -i "$SSH_KEY" "$SSH_TARGET" 'curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/signatures')
if [ "$STATUS" = "200" ]; then
  echo "Server restarted — health check ${STATUS}"
else
  echo "ERROR: server did not come up healthy (health check ${STATUS}). Check /var/www/obiter/server/server.log" >&2
  exit 1
fi
