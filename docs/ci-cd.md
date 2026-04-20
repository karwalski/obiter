# CI/CD Pipeline

This document describes how continuous integration, automated deployment, and manual deployment work for Obiter.

## CI Pipeline (ci.yml)

The CI workflow runs on every push to `main` or `develop`, and on pull requests targeting those branches.

### Jobs

1. **lint-and-typecheck** -- Runs `npm run lint` and `npm run typecheck`.
2. **test** -- Runs `npm test`. On failure, uploads coverage and JUnit results as artifacts (retained 14 days).
3. **build** -- Runs `npm run build` and `npm run validate` (manifest validation). Uploads the `dist/` directory as an artifact (retained 30 days).
4. **deploy-website** -- Runs only on push to `main`. Detects which files changed and deploys accordingly (see below).

### Triggers

| Event | Branches | What runs |
|---|---|---|
| Push | `main`, `develop` | lint, test, build |
| Pull request | `main`, `develop` | lint, test, build |
| Push to `main` | `main` only | deploy-website (conditional) |

## Auto-Deploy (push to main)

When code is pushed to `main`, the `deploy-website` job compares the latest commit against `HEAD~1` to detect which paths changed. It then deploys only the affected components:

### Website static files (`website/` changes, excluding `server/`)

- Synced via `rsync` to `/opt/bitnami/nginx/html/` on the Lightsail instance.
- Excludes the `server/` subdirectory (deployed separately).

### Server (`website/server/` changes)

- Server source files synced to `/var/www/obiter/server/` on Lightsail.
- Runs `npm ci --production` on the remote to install/update dependencies.
- Restarts the Node.js backend by killing the existing process and launching a new `screen` session:
  ```
  pkill -f "node.*index.js"
  screen -dmS obiter bash -c "source /etc/obiter/env.sh && node index.js"
  ```

### Add-in (`src/` changes)

- Runs `npm run build:prod` in CI to produce the production add-in bundle.
- Synced via `rsync` to `/opt/bitnami/nginx/html/app/` on Lightsail.

### What does not trigger a deploy

Changes only to `tests/`, `docs/`, configuration files, or other paths outside `website/` and `src/` will not trigger any deployment step.

## Manual Deploy (deploy.yml)

The manual workflow can be triggered from the GitHub Actions tab using **workflow_dispatch**. It provides three boolean inputs:

| Input | Default | Description |
|---|---|---|
| `deploy_website` | `true` | Deploy website static files and server to Lightsail |
| `deploy_addin` | `true` | Build the add-in with `build:prod` and deploy to `/app/` |
| `restart_server` | `false` | Restart the Node.js backend without redeploying files |

Use `restart_server` on its own when you need to bounce the server process without pushing new code (e.g., after changing environment variables on the instance).

## Required GitHub Secrets

Two repository secrets must be configured under **Settings > Secrets and variables > Actions**:

| Secret | Purpose |
|---|---|
| `LIGHTSAIL_SSH_KEY` | SSH private key for `bitnami@3.106.204.98`. Used by rsync and ssh commands to deploy to the Lightsail instance. |
| `DEPLOY_KEY` | GitHub deploy key. Used for operations that require pushing back to the repository (e.g., tagging). |

### Setting up LIGHTSAIL_SSH_KEY

1. Generate an SSH key pair (or use the existing Lightsail key):
   ```
   ssh-keygen -t ed25519 -f lightsail_deploy -C "github-actions-deploy"
   ```
2. Add the **public** key to `~bitnami/.ssh/authorized_keys` on the Lightsail instance.
3. Copy the entire **private** key contents (including the `-----BEGIN` and `-----END` lines) into the `LIGHTSAIL_SSH_KEY` secret in GitHub.

### Setting up DEPLOY_KEY

1. Generate a deploy key:
   ```
   ssh-keygen -t ed25519 -f deploy_key -C "obiter-deploy"
   ```
2. Add the **public** key as a deploy key in the repository under **Settings > Deploy keys** (enable write access if needed).
3. Add the **private** key as the `DEPLOY_KEY` secret.

## Creating a Release

Releases are created by tagging a commit on `main` with a `v*` prefix:

```bash
git checkout main
git pull
git tag v1.2.0
git push origin v1.2.0
```

This does not currently trigger a separate release workflow, but the tag marks the exact commit that was deployed. You can create a GitHub Release from the tag via the web UI or CLI:

```bash
gh release create v1.2.0 --generate-notes
```

To attach the built add-in artifact, download it from the CI run's artifacts and upload it to the release:

```bash
gh run download <run-id> -n dist -D dist-release
gh release upload v1.2.0 dist-release/*
```

## Rollback Procedure

### Option 1: Revert and push (preferred)

Revert the problematic commit and push to `main`. The CI pipeline will automatically redeploy the previous state:

```bash
git revert <commit-sha>
git push origin main
```

This creates an auditable trail and triggers the normal deploy flow.

### Option 2: Manual deploy of a previous version

1. Check out the last known good commit:
   ```bash
   git checkout <good-commit-sha>
   ```
2. Trigger the manual deploy workflow from the Actions tab, or push to a temporary branch and manually deploy:
   ```bash
   gh workflow run deploy.yml --ref <good-commit-sha> \
     -f deploy_website=true \
     -f deploy_addin=true \
     -f restart_server=true
   ```

### Option 3: Direct server intervention

SSH into the instance and restore files manually:

```bash
ssh -i ~/.ssh/deploy_key bitnami@3.106.204.98
# Restore website from a backup or previous artifact
# Restart the server
pkill -f "node.*index.js" 2>/dev/null
sleep 1
source /etc/obiter/env.sh
cd /var/www/obiter/server
screen -dmS obiter bash -c "source /etc/obiter/env.sh && node index.js"
```

This is the least preferred option as it bypasses version control.

## Server Environment

The Lightsail instance loads environment variables from `/etc/obiter/env.sh`. This file is sourced before starting the Node.js server. If you need to change environment variables:

1. SSH into the instance and edit `/etc/obiter/env.sh`.
2. Restart the server using the manual deploy workflow with `restart_server=true`, or by running the restart command directly over SSH.
