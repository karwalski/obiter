#!/bin/bash
# Restart the backend server on Lightsail
set -e
ssh -i ~/.ssh/obiter.pem bitnami@3.106.204.98 'pkill -f "node.*index.js" 2>/dev/null; sleep 1; source /etc/obiter/env.sh && cd /var/www/obiter/server && screen -dmS obiter bash -c "source /etc/obiter/env.sh && node index.js"'
sleep 3
ssh -i ~/.ssh/obiter.pem bitnami@3.106.204.98 'curl -s http://localhost:3001/api/signatures | head -1'
echo "Server restarted"
