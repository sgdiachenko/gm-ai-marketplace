#!/usr/bin/env bash
# Runs the eval cases of one suite in evals/ with `claude plugin eval`, one case at a time.
# Cases live outside plugins/ (maintainer files never ship) and name the plugins they load with
# `plugins:` in prompt.md. Each run calls the model with your credentials and costs money.
# Usage: scripts/run-evals.sh <suite> [max-cost-usd-per-case]   (default ceiling: 2)
#   suites: namespaces, sdd-engineering, architecture-review
# Reports stay local (--no-publish) under evals/results/, which git ignores.
# Kept bash 3.2-compatible so it runs on stock macOS.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ $# -lt 1 ] || [ $# -gt 2 ]; then
  echo "Usage: scripts/run-evals.sh <suite> [max-cost-usd-per-case]" >&2
  exit 2
fi
suite="$1"
ceiling="${2:-2}"
if [ ! -d "evals/$suite" ] || [ "$suite" = results ]; then
  available=""
  for dir in evals/*/; do
    name="$(basename "$dir")"
    [ "$name" = results ] || available="$available $name"
  done
  echo "No suite evals/$suite; available:$available" >&2
  exit 2
fi
if ! command -v claude >/dev/null 2>&1; then
  echo "claude CLI not found: https://code.claude.com/docs/en/setup" >&2
  exit 1
fi

stamp="$(date +%Y%m%d-%H%M%S)"
failed=0
for prompt in evals/"$suite"/*/prompt.md; do
  case_dir="$(dirname "$prompt")"
  case_name="$(basename "$case_dir")"
  echo "==> $suite/$case_name"
  # No baseline arm: without the plugins, the namespaced agents don't exist and every baseline run fails.
  if ! claude plugin eval "$prompt" \
    --ablation none \
    --no-publish \
    --trust-plugin \
    --max-cost-usd "$ceiling" \
    --output-dir "evals/results/$stamp/$suite/$case_name"; then
    failed=$((failed + 1))
  fi
done

echo
if [ "$failed" -gt 0 ]; then
  echo "✘ $failed case(s) in $suite below threshold or failed; reports in evals/results/$stamp/$suite/"
  exit 1
fi
echo "✔ $suite passed; reports in evals/results/$stamp/$suite/"
