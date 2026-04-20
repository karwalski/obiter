#!/bin/bash
# Deploy website static files to Lightsail
set -e
scp -i ~/.ssh/obiter.pem website/*.html bitnami@3.106.204.98:/opt/bitnami/nginx/html/
scp -i ~/.ssh/obiter.pem -r website/css website/js bitnami@3.106.204.98:/opt/bitnami/nginx/html/
echo "Website deployed"
