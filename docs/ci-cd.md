# CI/CD Pipeline

This document describes how continuous integration, automated deployment, and manual deployment work for Obiter.

## CI Pipeline (ci.yml)

The CI workflow runs on every push to `main` or `develop`, and on pull requests targeting those branches.

### Jobs

1. **lint-and-typecheck** -- Runs the supply-chain gates (`npm audit` and `lockfile-lint`, see [Supply-Chain Gates](#supply-chain-gates)), then `npm run lint` and `npm run typecheck`.
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
| `LIGHTSAIL_SSH_KEY` | SSH private key for `<user>@<server-host>`. Used by rsync and ssh commands to deploy to the Lightsail instance. |
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

## Creating a Release (release.yml)

Pushing a `v*` tag triggers the release workflow (`.github/workflows/release.yml`), which publishes the GitHub Release automatically — do not create releases by hand.

```bash
git checkout main
git pull
git tag v1.2.0
git push origin v1.2.0
```

The workflow then:

1. **Verifies the tag matches `package.json`** — `package.json` is the single source of truth for the version (`scripts/package.sh` reads it). If the tag is not exactly `v<package.json version>`, the workflow fails before building. Fix the version bump or re-tag the correct commit.
2. Runs `npm test` and `npm run typecheck`.
3. Builds and packages the classic add-in via `scripts/package.sh` (produces `obiter-vX.Y.Z.zip`).
4. Generates `SHA256SUMS.txt` for the zip (TRUST-005 — see the "Verifying downloads" section of INSTALL.md).
5. Creates the GitHub Release for the tag with the zip and `SHA256SUMS.txt` attached, generated release notes, and a link to the Actions run that built it.
6. **Prunes old classic releases** via `scripts/prune-releases.sh` — see below.

The workflow authenticates with the built-in `GITHUB_TOKEN` (the workflow has `contents: write`); no extra secrets are needed.

### Release retention (OPS-RELEASES-01)

Per the 2026-07-08 decision, only the **last two classic releases** stay published, for rollback and manual sideload. `scripts/prune-releases.sh` runs at the end of every release workflow and deletes older classic releases (strict `vX.Y.Z` tags). Notes:

- Only the **release entry and its assets** are deleted — git tags are always kept.
- **Copilot skill releases and tags are never touched**: anything matching `copilot` or the reserved `v1.15.1` tag is excluded, both from the candidate list and re-checked before each delete.
- The script can be run locally: `DRY_RUN=1 bash scripts/prune-releases.sh` prints what would be deleted without deleting anything. `KEEP=<n>` overrides the retention count (default 2).

### Deploy checklist — every version change

Every version change must end with the release publish step; releases must not drift from tags again:

1. Bump the version: `package.json`, `src/constants.ts` `APP_VERSION`, the manifests' `<Version>` (and `?v=` icon cache-busters where applicable). The tag **must** equal `v<package.json version>` or the release workflow fails.
2. Build and deploy (`scripts/build-prod.sh`, `scripts/deploy-app.sh` / website scripts as applicable).
3. Package the zip (`scripts/package.sh`) — CI repeats this for the release asset, so a local zip is for verification only.
4. Commit, tag `vX.Y.Z`, and push the commit **and the tag**.
5. Confirm the **Release** workflow run succeeded and the GitHub Release exists with `obiter-vX.Y.Z.zip` + `SHA256SUMS.txt` attached. Retention pruning is automatic.

The Copilot skill packages (`scripts/package-skill.sh`) are on hold and outside this flow; they are released manually if and when that variant resumes.

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
ssh -i ~/.ssh/deploy_key <user>@<server-host>
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

## Supply-Chain Gates

The `lint-and-typecheck` job runs two supply-chain checks before anything else (TRUST-004):

1. **Dependency audit** -- `npm audit --omit=dev --audit-level=high` fails the build on any high or critical advisory in **production** dependencies. Dev-only advisories and moderate/low advisories are reported by npm but do not block.
2. **Lockfile lint** -- `npx --yes lockfile-lint@5.0.0 --path package-lock.json --type npm --validate-https --allowed-hosts registry.npmjs.org` fails the build if any entry in `package-lock.json` resolves over plain HTTP or to a host other than the official npm registry.

Dependabot (`.github/dependabot.yml`) raises weekly update PRs for npm packages (minor and patch releases grouped into one PR; majors individually) and for the GitHub Actions used by the workflows.

### Advisory triage procedure

When the audit gate fails:

1. **Identify** the advisory: run `npm audit --omit=dev --audit-level=high` locally and read the GHSA link. Confirm it is a production dependency (`npm ls <package>` shows the dependency path).
2. **Fix forward (preferred)**: take the Dependabot PR if one exists, or run `npm audit fix` / bump the offending package range and verify with `npm test` and `npm run typecheck`. Transitive-only advisories can usually be resolved with an `overrides` entry in `package.json` pinning the patched version.
3. **Assess exploitability** if no fix is published yet: does the vulnerable code path run in the add-in webview or server, with attacker-controllable input? Record the assessment in `docs/decisions.md`.

### Overriding the gate

Only when no fix is available **and** the advisory is assessed as not exploitable in Obiter's context:

1. Exclude the specific advisory rather than lowering the gate: replace the audit step's command with a filtered check (e.g. `npm audit --omit=dev --audit-level=high --json | node -e '<filter script excluding the GHSA id>'`) or use `better-npm-audit` with an `.nsprc` exclusion listing the GHSA id, the reason, and an expiry date.
2. Never raise `--audit-level` past `high`, and never drop `--omit=dev` filtering as a workaround.
3. Record the override in `docs/decisions.md` with the GHSA id, justification, and a review date; remove the exclusion as soon as a patched release exists.

Lockfile-lint failures are never overridden: a non-HTTPS or non-registry resolved URL in `package-lock.json` means the lockfile must be regenerated (`rm -rf node_modules package-lock.json && npm install`) from the official registry.
