# Obiter Server Setup

Complete documentation for the Obiter production server on AWS Lightsail.

## Instance Details

| Property       | Value                          |
|----------------|--------------------------------|
| Provider       | AWS Lightsail                  |
| Static IP      | 3.106.204.98                   |
| OS             | Bitnami Debian 12              |
| SSH User       | bitnami                        |
| Domain         | obiter.com.au                  |
| DNS            | Cloudflare                     |

## SSH Access

```bash
ssh -i ~/.ssh/obiter.pem bitnami@3.106.204.98
```

The private key `obiter.pem` must be stored at `~/.ssh/obiter.pem` with permissions `chmod 400`.

## Web Server (Nginx)

Nginx is managed by the Bitnami stack. Do not use `systemctl` directly; use the Bitnami control scripts.

| Item              | Path                                  |
|-------------------|---------------------------------------|
| Nginx config      | `/opt/bitnami/nginx/conf/`            |
| Website root      | `/opt/bitnami/nginx/html/`            |
| Add-in hosting    | `/opt/bitnami/nginx/html/app/`        |

The add-in hosting directory serves the production `dist/` build of the Word Add-in. The manifest points to `https://obiter.com.au/app/taskpane.html`.

### Nginx Proxy

The `/api/` path is proxied to the backend Node.js server running on port 3001.

## Backend Server

| Item                  | Path / Value                              |
|-----------------------|-------------------------------------------|
| Application directory | `/var/www/obiter/server/`                 |
| Entry point           | `node index.js`                           |
| Port                  | 3001                                      |
| Process manager       | `screen` (session name: `obiter`)         |
| Environment variables | `/etc/obiter/env.sh`                      |
| Google credentials    | `/etc/obiter/google-credentials.json`     |
| Google token          | `/etc/obiter/google-token.json`           |
| SQLite database       | `/var/www/obiter/server/obiter.db`        |

### Starting / Restarting the Backend

Use the management script from the project root:

```bash
npm run restart:server
```

Or manually via SSH:

```bash
ssh -i ~/.ssh/obiter.pem bitnami@3.106.204.98
pkill -f "node.*index.js"
source /etc/obiter/env.sh
cd /var/www/obiter/server
screen -dmS obiter bash -c "source /etc/obiter/env.sh && node index.js"
```

### Verifying the Backend

```bash
curl http://localhost:3001/api/signatures | head -1
```

## SSL / HTTPS

SSL termination is handled by Cloudflare. The origin server communicates over HTTP. Cloudflare's DNS proxy provides HTTPS to end users.

- Cloudflare SSL mode: Flexible (or Full, depending on configuration)
- Origin: HTTP only (port 80)
- No origin certificate is installed on the server at this time

## Deployment

Deployment is currently manual via `scp`/`rsync`. Convenience scripts are provided:

| Script                       | npm command           | Purpose                              |
|------------------------------|-----------------------|--------------------------------------|
| `scripts/deploy-website.sh`  | `npm run deploy:website` | Deploy static website files       |
| `scripts/deploy-server.sh`   | `npm run deploy:server`  | Deploy backend server code        |
| `scripts/deploy-app.sh`      | `npm run deploy:app`     | Deploy Word Add-in dist           |
| `scripts/restart-server.sh`  | `npm run restart:server` | Restart the backend process       |

Future: GitHub Actions CI/CD pipeline.

## Directory Layout on Server

```
/opt/bitnami/nginx/
  conf/                     # Nginx configuration
  html/                     # Website root (static HTML/CSS/JS)
    app/                    # Word Add-in production build

/var/www/obiter/
  server/                   # Backend Node.js application
    index.js                # Entry point
    package.json
    obiter.db               # SQLite database

/etc/obiter/
  env.sh                    # Environment variables
  google-credentials.json   # Google API credentials
  google-token.json         # Google API token
```
