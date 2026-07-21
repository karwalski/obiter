# Obiter Server Setup

Complete documentation for the Obiter production server on AWS Lightsail.

## Instance Details

| Property       | Value                          |
|----------------|--------------------------------|
| Provider       | AWS Lightsail                  |
| Static IP      | <server-host>                   |
| OS             | Bitnami Debian 12              |
| SSH User       | bitnami                        |
| Domain         | obiter.com.au                  |
| DNS            | Cloudflare                     |

## SSH Access

```bash
ssh -i ~/.ssh/<deploy-key>.pem <user>@<server-host>
```

The private key `<deploy-key>.pem` must be stored at `~/.ssh/<deploy-key>.pem` with permissions `chmod 400`.

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

### Environment variables (`/etc/obiter/env.sh`)

Set these on the server (not committed). The accounts feature (ACCT epic) adds
several; the auth secrets have insecure development fallbacks and MUST be set in
production.

| Variable | Purpose |
|----------|---------|
| `ADMIN_TOKEN` | Legacy admin bearer token (retired by ADM-001 in favour of an admin account). Accepted for one release via the `Authorization` header only, until `ADMIN_TOKEN_SUNSET` is set. |
| `ADMIN_TOKEN_SUNSET` | When set to any value, the legacy `ADMIN_TOKEN` is refused and admin access requires an admin-role account access token (ADM-001). Set this once all operators have migrated to account login, then remove `ADMIN_TOKEN`. |
| `ADMIN_EMAIL` | Recipient for contact / error / security notifications. |
| `SITE_URL` | Public base URL for verification and reset links. |
| `TURNSTILE_SECRET` | Cloudflare Turnstile secret for `siteverify` (ACCT-002). When unset, human verification passes through (development only). Replaces the retired `HCAPTCHA_SECRET`. |
| `AUTH_TOKEN_SECRET` | HMAC key signing access tokens (ACCT-001). Must be a long random value in production. |
| `AUDIT_IP_SALT` | Salt for hashing client IPs in the audit log (ACCT-001). |
| `VAULT_MASTER_KEY` | 32-byte key (hex/base64) for AES-256-GCM encryption of MFA secrets and stored API keys (ACCT-003/004). The server refuses to start in production with the development fallback. Rotating it invalidates all encrypted secrets — see the key-rotation note before changing it. |

The public **Turnstile site key** is not a secret; it is embedded in the
website form pages (`data-sitekey="TURNSTILE_SITE_KEY"` placeholder) and replaced
at deploy.

### Starting / Restarting the Backend

Use the management script from the project root:

```bash
npm run restart:server
```

Or manually via SSH:

```bash
ssh -i ~/.ssh/<deploy-key>.pem <user>@<server-host>
pkill -f "node.*index.js"
source /etc/obiter/env.sh
cd /var/www/obiter/server
screen -dmS obiter bash -c "source /etc/obiter/env.sh && node index.js"
```

### Verifying the Backend

```bash
curl http://localhost:3001/api/signatures | head -1
```

### Bootstrapping the first admin (ADM-001)

Admin is a role on a normal account with mandatory MFA — there is no shared
static password any more. To create the first admin:

1. Register the account on the site (`/account`) and verify its email.
2. Promote it from the server (source the env so `DB_PATH` matches production):

   ```bash
   ssh -i ~/.ssh/<deploy-key>.pem <user>@<server-host>
   source /etc/obiter/env.sh
   cd /var/www/obiter/server
   node scripts/promote-admin.js admin@example.com
   ```

   The script refuses accounts that do not exist or are not email-verified, and
   reminds you to enrol MFA.
3. Sign in on the site and complete TOTP enrolment (MFA is mandatory for admins
   and cannot be removed). The admin dashboard login (`/admin.html`) then works
   with email + password + authentication code.

Subsequent admins can be promoted the same way, or from the user-management
console (ADM-002).

## Vault master key rotation (ACCT-004)

`VAULT_MASTER_KEY` encrypts every stored MFA (TOTP) secret and every stored LLM
API key at rest with AES-256-GCM. It lives only in `/etc/obiter/env.sh`, never in
`obiter.db`.

**Rotating the key invalidates all existing encrypted secrets.** There is no
re-encryption path: the old ciphertext cannot be decrypted with a new key, so
after rotation every user must re-enrol MFA and re-enter any stored API keys.
Rotate only when necessary (suspected key exposure, or scheduled hygiene), and
announce the disruption to users first.

Operational steps:

1. Generate a new key: `openssl rand -hex 32`.
2. Put the new value in `/etc/obiter/env.sh` as `VAULT_MASTER_KEY` (keep the old
   value noted only until step 5 confirms success, then destroy it).
3. Clear the now-undecryptable secrets so no user is left with a broken enrolment
   or a silently unusable stored key. On the server, with the env sourced:

   ```bash
   source /etc/obiter/env.sh
   cd /var/www/obiter/server
   sqlite3 obiter.db "UPDATE users SET mfa_secret_enc = NULL, mfa_enabled = 0, recovery_codes_hash = NULL, mfa_last_step = NULL; DELETE FROM user_keys;"
   ```

4. Restart the backend (`npm run restart:server`) so it picks up the new env.
5. Notify users that they must re-enrol MFA and re-enter any stored API keys.
6. VACUUM (see below) so the old ciphertext is not recoverable from free pages.

## Reclaiming space and scrubbing free pages: VACUUM (ACCT-004)

Account deletion (self-service or admin) and key removal use soft-delete /
anonymise semantics: settings and key rows are removed, but the SQLite file
retains the freed space as reclaimable free pages, and anonymised user rows are
kept so the audit trail stays referentially meaningful. The vacated bytes (old
ciphertext, prior column values) can linger in those free pages until overwritten.

After a batch of account/key deletions — and always after a master-key rotation —
run VACUUM to compact the file and ensure the anonymised/deleted data is not
recoverable from free pages:

```bash
source /etc/obiter/env.sh
cd /var/www/obiter/server
sqlite3 obiter.db "VACUUM;"
```

VACUUM rewrites the database file and briefly requires extra disk (roughly the
size of the database). It takes a write lock, so run it during a quiet window.

## Backups now that obiter.db holds credentials (ACCT-007)

Since accounts landed, `obiter.db` contains argon2id password hashes, encrypted
API keys and MFA secrets, refresh-token hashes, and the audit log. Treat a backup
of it with the same care as the master key.

- **Nightly encrypted snapshot.** Take a consistent snapshot with the SQLite
  online backup API (or `sqlite3 obiter.db ".backup '/path/backup.db'"`, which is
  safe under WAL) rather than copying the live file, then encrypt the result at
  rest (for example `age` or `gpg` with a key held separately from the server).
- **Protect the backup like the master key.** An unencrypted backup on shared or
  off-host storage is equivalent to leaking the credential database. Restrict
  access, and never store `VAULT_MASTER_KEY` alongside the backup — a backup plus
  the master key together disclose every stored secret.
- **Retention and testing.** Keep a short rolling window of snapshots, prune
  older ones, and periodically test a restore into a scratch instance.

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

## Security Headers for /app/ (TRUST-002)

The security headers for the add-in pages (CSP with `frame-ancestors`, HSTS,
`X-Content-Type-Options`, `Referrer-Policy`) are version-controlled in the
repo and generated from the single source of truth in `config/csp.js`:

```bash
node scripts/generate-nginx-headers.js
```

This writes two snippets (never hand-edit them):

| Snippet                                            | Variant                                | Remote path                                                  |
|----------------------------------------------------|----------------------------------------|--------------------------------------------------------------|
| `scripts/nginx/app-security-headers.conf`          | Enforced (production `/app/`)          | `/opt/bitnami/nginx/conf/obiter/app-security-headers.conf`      |
| `scripts/nginx/app-security-headers.report-only.conf` | `Content-Security-Policy-Report-Only` (beta `/app/beta/`) | `/opt/bitnami/nginx/conf/obiter/app-security-headers.beta.conf` |

All three app-deploy paths (`scripts/deploy-app.sh`, the manual
`.github/workflows/deploy.yml` workflow, and the `deploy-website` job in
`.github/workflows/ci.yml`) regenerate the snippet, push it to the server,
run `sudo /opt/bitnami/nginx/sbin/nginx -t`, and only on success run
`sudo /opt/bitnami/nginx/sbin/nginx -s reload`. If the config test fails the
deploy aborts and nginx keeps serving with its old configuration.
`scripts/deploy-beta.sh` pushes the Report-Only variant to the separate
`app-security-headers.beta.conf` include so beta can run Report-Only while
production is untouched.

There is deliberately **no `X-Frame-Options` header**: Office on the web
embeds the task pane in iframes from multiple Microsoft hosts, and
`X-Frame-Options` cannot allowlist more than one origin. The CSP
`frame-ancestors` directive is the correct mechanism.

### One-time manual setup: include lines

The deploy scripts push the snippet files but do NOT edit the nginx server
configuration. Once, on the server, add the include lines inside the location
blocks that serve the add-in (in the relevant server block under
`/opt/bitnami/nginx/conf/`):

```nginx
# Production add-in — enforced headers
location /app/ {
    ...existing directives...
    include /opt/bitnami/nginx/conf/obiter/app-security-headers.conf;
}

# Beta staging slot — Report-Only headers
# (must come before /app/ if using prefix matching, or be a more specific block)
location /app/beta/ {
    ...existing directives...
    include /opt/bitnami/nginx/conf/obiter/app-security-headers.beta.conf;
}
```

Note: nginx `add_header` directives are inherited from an outer level ONLY if
the location block defines none of its own — the `/app/beta/` block needs its
own include precisely so it gets the Report-Only set instead of the production
set. Then test and reload:

```bash
sudo /opt/bitnami/nginx/sbin/nginx -t
sudo /opt/bitnami/nginx/sbin/nginx -s reload
```

### Verifying the headers

```bash
curl -sI https://obiter.com.au/app/taskpane.html
```

Expected on production `/app/`:

- `Content-Security-Policy: default-src 'none'; ...; frame-ancestors 'self' https://*.officeapps.live.com https://*.office.com https://*.microsoft365.com https://*.cloud.microsoft https://*.sharepoint.com`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- **No** `X-Frame-Options` header

On `https://obiter.com.au/app/beta/taskpane.html` the CSP header is
`Content-Security-Policy-Report-Only` instead; the other three headers are
identical.

### Report-Only → enforce promotion

1. Deploy the build under test to beta (`npm run deploy:beta`) — beta serves
   the CSP as `Content-Security-Policy-Report-Only`.
2. Exercise the add-in from `/app/beta/` in Word on the web and desktop
   (insert, refresh, lookup, LLM parse, corpus search, version check) and
   watch the browser console for CSP violation reports. A violation report
   means the policy would have blocked something — fix `config/csp.js`
   (usually a missing `connect-src` host), regenerate, and redeploy beta.
3. When beta is clean, enforce on production: run `npm run deploy:app` (pushes
   the enforced snippet and reloads nginx). If the `/app/` include line from
   the one-time setup above is not yet present, add it first.
4. Re-verify with the `curl -sI` command above and confirm the add-in still
   loads in Word on the web and desktop.
5. Optionally promote beta to enforcement too by switching the `/app/beta/`
   include to `app-security-headers.conf`, or leave beta on Report-Only so
   future policy changes are always observed there first.
