#!/usr/bin/env bash
# Install and verify Canon's clone-local hooks and repository-backed operator files.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODE="${1:---install}"

usage() {
  cat <<EOF
Usage: ./enforcement/bootstrap.sh [--install|--check]

  --install  Enable clone-local Git hooks, sync Cursor and Copilot files,
             then verify the result. This is the default.
  --check    Read-only verification of hook activation, executable modes,
             and synchronized repository entrypoints.
EOF
}

failures=0

fail() {
  echo "AOC/Canon bootstrap: $*" >&2
  failures=$((failures + 1))
}

verify_file() {
  local source="$1"
  local destination="$2"
  if [[ ! -f "$destination" ]]; then
    fail "missing $destination"
  elif ! cmp -s "$source" "$destination"; then
    fail "$destination is not synchronized with $source"
  fi
}

verify() {
  local hooks_path
  hooks_path="$(git -C "$ROOT" config --local --get core.hooksPath || true)"
  if [[ "$hooks_path" != ".githooks" ]]; then
    fail "core.hooksPath is '${hooks_path:-unset}', expected '.githooks'"
  fi

  local executable
  for executable in \
    "$ROOT/enforcement/bootstrap.sh" \
    "$ROOT/enforcement/sync.sh" \
    "$ROOT/.githooks/commit-msg" \
    "$ROOT/.githooks/pre-commit" \
    "$ROOT/.githooks/pre-push"; do
    if [[ ! -x "$executable" ]]; then
      fail "$executable is not executable"
    fi
  done

  verify_file "$ROOT/enforcement/SYSTEM-PROMPT.txt" "$ROOT/.cursor/SYSTEM.md"
  verify_file "$ROOT/platforms/cursor/rules.mdc" "$ROOT/.cursor/rules/aoc.mdc"
  verify_file "$ROOT/platforms/copilot/copilot-instructions.md" "$ROOT/.github/copilot-instructions.md"

  if ! node "$ROOT/enforcement/verify-checksums.mjs"; then
    fail "central checksum manifest did not verify"
  fi

  if (( failures > 0 )); then
    echo "AOC/Canon bootstrap verification failed with $failures issue(s)." >&2
    return 1
  fi

  echo "AOC/Canon bootstrap verification passed."
}

if ! git -C "$ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "AOC/Canon bootstrap: $ROOT is not a Git working tree." >&2
  exit 1
fi

case "$MODE" in
  --install|install)
    git -C "$ROOT" config --local core.hooksPath .githooks
    (
      cd "$ROOT"
      ./enforcement/sync.sh --target cursor
      ./enforcement/sync.sh --target copilot
    )
    verify
    ;;
  --check|check)
    verify
    ;;
  --help|-h)
    usage
    ;;
  *)
    echo "unknown mode: $MODE" >&2
    usage >&2
    exit 1
    ;;
esac
