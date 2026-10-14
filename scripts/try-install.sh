#!/usr/bin/env bash
# Installs a plugin from a pushed branch into a throwaway Claude Code profile, the way users get it,
# and prints what got installed. Run it on a release branch before merging.
# A local-path marketplace loads plugins in place and ignores `version`, so it hides cache and path bugs;
# this goes through git and the plugin cache instead. ~/.claude is left alone.
# Usage: scripts/try-install.sh [--keep] <plugin> [branch]   (default branch: the current one)
#   --keep  keep the profile, to try the plugin in a session: CLAUDE_CONFIG_DIR=<dir> claude
# Kept bash 3.2-compatible so it runs on stock macOS.
set -euo pipefail

cd "$(dirname "$0")/.."

usage() {
  echo "Usage: scripts/try-install.sh [--keep] <plugin> [branch]" >&2
  exit 2
}

keep=""
if [ "${1:-}" = "--keep" ]; then
  keep=1
  shift
fi
if [ $# -lt 1 ] || [ $# -gt 2 ]; then usage; fi
plugin="$1"
branch="${2:-}"
if [ -z "$branch" ] && ! branch="$(git symbolic-ref --short -q HEAD)"; then
  echo "HEAD is detached; pass the branch to install from" >&2
  usage
fi

if ! command -v claude >/dev/null 2>&1; then
  echo "claude CLI not found: https://code.claude.com/docs/en/setup" >&2
  exit 1
fi

marketplace="$(node -p 'require("./.claude-plugin/marketplace.json").name')"

# GitHub remotes become owner/repo#branch, the form users install from; other hosts keep their URL.
url="$(git remote get-url origin)"
case "$url" in
  https://github.com/* | git@github.com:* | ssh://git@github.com/*)
    marketplace_source="$(printf '%s\n' "$url" | sed -E 's#^(https://github\.com/|git@github\.com:|ssh://git@github\.com/)##; s#\.git$##')#${branch}"
    ;;
  *)
    marketplace_source="${url}#${branch}"
    ;;
esac

# The install reads origin, so local commits that aren't pushed would go untested.
remote_sha="$(git ls-remote origin "refs/heads/${branch}" | cut -f1)"
if [ -z "$remote_sha" ]; then
  echo "Branch ${branch} is not on origin; push it first: git push -u origin ${branch}" >&2
  exit 1
fi
if local_sha="$(git rev-parse --verify --quiet "refs/heads/${branch}")" && [ "$local_sha" != "$remote_sha" ]; then
  echo "origin/${branch} is at ${remote_sha:0:7}, your local ${branch} at ${local_sha:0:7}; push or pull first" >&2
  exit 1
fi

profile="$(mktemp -d "${TMPDIR:-/tmp}/try-install.XXXXXX")"
if [ -z "$keep" ]; then
  trap 'rm -rf "$profile"' EXIT
fi
export CLAUDE_CONFIG_DIR="$profile"

echo "==> Adding marketplace ${marketplace_source} to a throwaway profile"
claude plugin marketplace add "$marketplace_source"

echo "==> Installing ${plugin}@${marketplace}"
claude plugin install "${plugin}@${marketplace}"

echo "==> Installed copy"
claude plugin details "$plugin"

if [ -n "$keep" ]; then
  echo
  echo "Profile kept. Try the plugin in a session (it may ask you to log in):"
  echo "  CLAUDE_CONFIG_DIR=${profile} claude"
  echo "Remove it when done: rm -rf ${profile}"
fi
