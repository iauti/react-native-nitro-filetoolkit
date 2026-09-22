#!/usr/bin/env bash

set -euo pipefail

ensure_github_token() {
  if [[ -n "${GITHUB_TOKEN:-}" ]]; then
    export GITHUB_TOKEN
    return
  fi
  if [[ -n "${GH_TOKEN:-}" ]]; then
    export GITHUB_TOKEN="$GH_TOKEN"
    return
  fi
  if command -v gh >/dev/null 2>&1; then
    if GITHUB_TOKEN="$(gh auth token 2>/dev/null)" && [[ -n "$GITHUB_TOKEN" ]]; then
      export GITHUB_TOKEN
      return
    fi
  fi
  echo "GitHub authentication required: set GITHUB_TOKEN or GH_TOKEN, or run gh auth login." >&2
  exit 1
}

ensure_github_token

echo "Running release quality checks..."
bun run check:ci

for pkg in packages/*; do
  [[ -d "$pkg" ]] || continue
  echo "Releasing $pkg..."
  (cd "$pkg" && bun release "$@")
done

echo "Creating workspace release..."
bun run release-it "$@"
