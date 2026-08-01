#!/bin/bash
# Restart the backend server on the server
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/_deploy-env.sh"

# The server runs as the `obiter` systemd service (/etc/systemd/system/
# obiter.service) — it survives logout/reboot and auto-restarts on crash.
# (The old screen/nohup approach was reaped by systemd-logind on SSH logout and
# repeatedly left production down; systemctl is the reliable path.)
# Logs: `journalctl -u obiter`.
ssh -i "$SSH_KEY" "$SSH_TARGET" 'sudo systemctl restart obiter'
sleep 3
# Verify the process is actually up; fail loudly if not (do not report success blindly).
STATUS=$(ssh -i "$SSH_KEY" "$SSH_TARGET" 'curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/signatures')
if [ "$STATUS" = "200" ]; then
  echo "Server restarted — health check ${STATUS}"
else
  echo "ERROR: server did not come up healthy (health check ${STATUS}). Check /var/www/obiter/server/server.log" >&2
  exit 1
fi
