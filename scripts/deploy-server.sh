#!/bin/bash
# Deploy backend server to Lightsail
set -e
scp -i ~/.ssh/obiter.pem website/server/*.js website/server/package.json bitnami@3.106.204.98:/var/www/obiter/server/
ssh -i ~/.ssh/obiter.pem bitnami@3.106.204.98 'cd /var/www/obiter/server && npm install --production'
echo "Server files deployed. Restart with: npm run restart:server"
