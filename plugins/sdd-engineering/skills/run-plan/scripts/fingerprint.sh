#!/usr/bin/env bash
# Prints a fingerprint of the working tree: HEAD plus every staged, unstaged and untracked
# (non-ignored) change. Two runs print the same value only if no such file changed in between,
# so a check result recorded with one fingerprint can be reused while the fingerprint holds.
# Usage: fingerprint.sh [--exclude <path>]...   run from inside the repository
#   --exclude  leave a path out, e.g. the plans directory the workflow writes its state to
# Kept bash 3.2-compatible so it runs on stock macOS.
set -euo pipefail

pathspec=(.)
while [ $# -gt 0 ]; do
  case "$1" in
    --exclude)
      [ $# -ge 2 ] || { echo "--exclude needs a path" >&2; exit 2; }
      pathspec+=(":(exclude)$2")
      shift 2
      ;;
    *)
      echo "Usage: fingerprint.sh [--exclude <path>]..." >&2
      exit 2
      ;;
  esac
done

cd "$(git rev-parse --show-toplevel)"
head="$(git rev-parse --verify --quiet HEAD || echo none)"

{
  echo "$head"
  if [ "$head" != none ]; then git diff HEAD --binary -- "${pathspec[@]}"; fi
  git diff --cached --binary -- "${pathspec[@]}"
  git ls-files --others --exclude-standard -z -- "${pathspec[@]}" |
    while IFS= read -r -d '' file; do
      printf '%s %s\n' "$(git hash-object -- "$file")" "$file"
    done
} | git hash-object --stdin | cut -c1-12
