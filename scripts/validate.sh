#!/usr/bin/env bash
# Runs every check CI runs on each push. Usage: scripts/validate.sh
# Kept bash 3.2-compatible so it runs on stock macOS.
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v claude >/dev/null 2>&1; then
  echo "claude CLI not found: https://code.claude.com/docs/en/setup" >&2
  exit 1
fi

echo "==> Marketplace catalog"
claude plugin validate . --strict

for dir in plugins/*/; do
  echo "==> Plugin ${dir%/}"
  claude plugin validate "$dir" --strict
done

echo "==> Repository conventions"
node scripts/check-marketplace.mjs

echo "==> Shell scripts"
if command -v shellcheck >/dev/null 2>&1; then
  find plugins scripts -name '*.sh' -exec shellcheck -x {} +
  echo "✔ shellcheck passed"
elif [ -n "${CI:-}" ]; then
  echo "shellcheck is required in CI" >&2
  exit 1
else
  echo "skipped: shellcheck not installed (brew install shellcheck)"
fi
