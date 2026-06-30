# Obiter — shared deployment configuration.
#
# Sourced by the deploy/restart scripts. Real values are NOT committed: they
# live in scripts/deploy.env (gitignored) or the environment. Copy
# scripts/deploy.env.example to scripts/deploy.env and fill it in.
#
# Required: OBITER_SSH_HOST (server IP or hostname), OBITER_SSH_KEY (path to the
# private key). Optional: OBITER_SSH_USER (defaults to bitnami).

# shellcheck shell=bash
_DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$_DEPLOY_DIR/deploy.env" ]; then
  # shellcheck disable=SC1091
  source "$_DEPLOY_DIR/deploy.env"
fi

: "${OBITER_SSH_HOST:?Set OBITER_SSH_HOST in scripts/deploy.env (copy scripts/deploy.env.example)}"
: "${OBITER_SSH_KEY:?Set OBITER_SSH_KEY in scripts/deploy.env (path to your SSH private key)}"
OBITER_SSH_USER="${OBITER_SSH_USER:-bitnami}"

SSH_KEY="$OBITER_SSH_KEY"
SSH_TARGET="${OBITER_SSH_USER}@${OBITER_SSH_HOST}"
