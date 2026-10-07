# CI/CD Pipeline

How continuous integration, deployment and releases work for Obiter.

CI checks every change but never deploys. Deploys use the reviewed scripts
(`npm run deploy:beta`, `deploy:app`, `deploy:website`, `deploy:server`,
`restart:server`), either run locally or through the manual Deploy workflow,
which calls the same scripts.

## CI Pipeline (ci.yml)

The CI workflow runs on every push to `main` or `develop`, and on pull requests targeting those branches.

### Jobs

1. **lint-and-typecheck** -- Runs the supply-chain gates (`npm audit` and `lockfile-lint`, see [Supply-Chain Gates](#supply-chain-gates)), then `npm run lint`, `npm run typecheck` and `npm run check-version`.
2. **test** -- Runs `npm test`. On failure, uploads coverage and JUnit results as artifacts (retained 14 days).
3. **build** -- Runs `npm run build` and `npm run validate` (manifest validation). Uploads the `dist/` directory as an artifact (retained 30 days).

CI needs no secrets.

### Why CI does not deploy

Until 7 October 2026 a `deploy-website` job ran after a green build on every push to `main`. It was removed, because:

- It mirrored `website/` into the nginx web root with `--delete`, excluding only `server/`. That would have deleted the add-in at `/app` and `/app/beta`.
- It deployed every `src/` change straight to production, without a version bump, beta step or tag.
- It restarted the API with `pkill` and `screen`, not systemd, which had caused outages.

A lint failure had blocked the job since September, so it never ran in that state.

## Manual Deploy (deploy.yml)

Start it from the Actions tab (**Run workflow**) or with `gh workflow run deploy.yml`. It runs the same scripts as a local deploy:

| Input | Default | What runs |
|---|---|---|
| `addin` | `none` | `beta`: the gates, `npm run build:prod` and `npm run deploy:beta`. `production`: the same, then `npm run deploy:app`, but only when the run is on the release tag `v<package.json version>`. |
| `website` | `false` | `npm run check-seo`, then `npm run deploy:website` (copies the pages with `scp`; nothing is deleted). |
| `server` | `false` | `npm run deploy:server` (API files and `npm ci --production`). |
| `restart_server` | `false` | `npm run restart:server` (`systemctl restart obiter`, then a health check). |

After an add-in deploy, the workflow checks that the slot serves the bundle it just built. Runs share a concurrency group, so two deploys never overlap.

```bash
# Beta from main
gh workflow run deploy.yml --ref main -f addin=beta
# Production from the release tag
gh workflow run deploy.yml --ref v1.17.10 -f addin=production
# Website pages only
gh workflow run deploy.yml --ref main -f website=true
```

The release itself (version bump, tag, GitHub Release) and `npm run verify-release` stay local steps; see the checklist below.

## Required GitHub Secrets (Deploy workflow only)

Set these under **Settings > Secrets and variables > Actions**. CI does not use them.

| Secret | Purpose |
|---|---|
| `OBITER_SSH_HOST` | The server IP or hostname (the same value as `OBITER_SSH_HOST` in `scripts/deploy.env`). |
| `OBITER_SSH_KEY` | The deploy private key: its full contents, including the BEGIN and END lines. The workflow writes it to a temporary file and deletes it at the end of the run. |
| `OBITER_SSH_USER` | Optional; defaults to `bitnami`. |

Use a dedicated key for the workflow, so it can be revoked without affecting a laptop:

1. `ssh-keygen -t ed25519 -f obiter_actions_deploy -C "github-actions-deploy"`
2. Append `obiter_actions_deploy.pub` to `~bitnami/.ssh/authorized_keys` on the server.
3. Paste the private key into the `OBITER_SSH_KEY` secret, then delete the local copy.

Git pushes use the separate `deploy-obiter` key locally; the workflows push nothing.

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
- **Retention amplifies a failed release.** With only two entries kept, a single failed workflow run leaves the Releases page showing a version that is two behind production, which reads as "GitHub is stale". Raising `KEEP` widens the visible history; `npm run verify-release` is what actually catches the failure.

### Deploy checklist — every version change

Every version change must end with the release publish step; releases must not drift from tags again:

1. Bump the version in **every** location — `npm run check-version` enforces this and runs automatically before `npm run build` (`prebuild`) and in CI, so drift fails the build rather than shipping silently:
   - `package.json` — the single source of truth.
   - `src/constants.ts` `APP_VERSION` — the version shown in the UI; must match exactly.
   - `README.md` — the `# Obiter vX.Y.Z` H1. This is the repo's landing page, so a stale heading is the most publicly visible drift there is (it sat at v1.14.4 while v1.16.12 was live). The guard now enforces it.
   - `src/sw.js` `CACHE_NAME` (`obiter-v<version>`) — bumping it makes the service worker purge stale caches on activate. **This is the web-deploy cache-buster and must change on every release, including patches**, or clients keep serving the old bundle.
   - The manifests' `<Version>` — major.minor must match `package.json`. A **patch is web-deploy only and does not touch the manifest XML** (see the versioning policy), so the patch component may lag; the guard allows this.
   - `?v=` icon/asset cache-busters where applicable.

   The tag **must** equal `v<package.json version>` or the release workflow fails.
2. Build and deploy **both slots** — `npm run deploy:app` (production `/app/`) *and* `npm run deploy:beta` (staging `/app/beta/`). Deploying only production is a silent drift: beta keeps serving an old bundle and beta testers report bugs that were already fixed.
3. Package the zip (`scripts/package.sh`) — CI repeats this for the release asset, so a local zip is for verification only.
4. Commit, tag `vX.Y.Z`, and push the commit **and the tag**.
5. **Run `npm run verify-release`.** Do not treat a release as done until this passes.

   Pushing the tag is not the same as publishing a release: the workflow can fail *after* the tag exists (a flaky test is enough), and nothing surfaces that — the tag is there, the deploy went out from the laptop, and GitHub quietly keeps showing an older version as Latest. `v1.16.5`, `v1.16.8` and `v1.16.11` all failed exactly that way and published no release.

   `verify-release` walks the whole chain for the current `package.json` version and names every broken link:

   - version locations agree (`check-version-sync`)
   - the local tag exists and sits on `HEAD`
   - the tag is on `origin`
   - the release workflow run for the tag **succeeded**
   - a GitHub Release exists for the tag, and it is the one marked **Latest**
   - production serves that version
   - the beta slot serves that version

   If the workflow failed, re-run it (`gh run rerun <run-id>`) rather than leaving the release unpublished.

The Copilot skill packages (`scripts/package-skill.sh`) are on hold and outside this flow; they are released manually if and when that variant resumes.

## Rollback Procedure

### Option 1: Redeploy the previous release tag (preferred)

Each add-in release is a tag, so roll back by redeploying the last good one:

```bash
gh workflow run deploy.yml --ref v<previous version> -f addin=production
```

The production guard accepts a tag only when it matches that tag's own `package.json`, so an old tag deploys exactly what it released. Locally, the same thing is `git checkout v<previous version> && npm ci && npm run build:prod && npm run deploy:app`.

For the website or server, revert the commit on `main`, then run the Deploy workflow with `website=true` or `server=true restart_server=true`.

### Option 2: Direct server intervention

If the workflow is unavailable, SSH in and restart through systemd:

```bash
ssh -i <key> bitnami@<server-host>
sudo systemctl restart obiter
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/api/signatures
```

This bypasses version control, so use it last.

## Server Environment

The API runs as the systemd service `obiter`, which loads `/etc/obiter/env.sh`. To change environment variables:

1. SSH in and edit `/etc/obiter/env.sh`.
2. Restart with `npm run restart:server` locally, or run the Deploy workflow with `restart_server=true`.

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
