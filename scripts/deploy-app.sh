#!/bin/bash
set -e
echo "Deploying add-in to obiter.com.au/app/..."
ssh -i ~/.ssh/obiter.pem bitnami@3.106.204.98 "sudo mkdir -p /opt/bitnami/nginx/html/app"
rsync -avz --delete -e "ssh -i ~/.ssh/obiter.pem" dist/ bitnami@3.106.204.98:/opt/bitnami/nginx/html/app/
echo "Deployed. Add-in available at https://obiter.com.au/app/taskpane.html"
