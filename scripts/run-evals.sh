#!/usr/bin/env bash
# Runs the eval cases of one suite in evals/ with `claude plugin eval`.
# Cases live outside plugins/ (maintainer files never ship) and name the plugins they load with
# `plugins:` in prompt.md. Each run calls the model with your credentials and costs money.
# Usage: scripts/run-evals.sh <suite> [max-cost-usd]   (cost ceiling for the suite; default 5)
#   suites: namespaces, sdd-engineering, architecture-review
# Reports stay local (--no-publish) under evals/results/, which git ignores.
# Kept bash 3.2-compatible so it runs on stock macOS.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ $# -lt 1 ] || [ $# -gt 2 ]; then
  echo "Usage: scripts/run-evals.sh <suite> [max-cost-usd]" >&2
  exit 2
fi
suite="$1"
ceiling="${2:-5}"
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
out="evals/results/$stamp/$suite"
# The target is the repository root: `claude plugin eval` loads a case's `plugins:` only from under
# the directory it runs against, and plugins/ is outside every case directory. Each case carries
# its suite name as a tag. No baseline arm: without the plugins, the namespaced agents don't exist
# and every baseline run fails. Judge graders use Sonnet: the default Haiku judge failed reviews
# that met their rubric.
if claude plugin eval . \
  --tag "$suite" \
  --ablation none \
  --judge-model sonnet \
  --no-publish \
  --trust-plugin \
  --max-cost-usd "$ceiling" \
  --output-dir "$out"; then
  echo "✔ $suite passed; report in $out/"
else
  echo "✘ $suite: a case scored below the threshold or failed to run; report in $out/"
  exit 1
fi
