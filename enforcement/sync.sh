#!/usr/bin/env bash
# Copy central enforcement into a platform destination.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:-}"
if [[ "${TARGET}" == "--target" ]]; then
  TARGET="${2:-}"
fi

usage() {
  cat <<EOF
Usage: ./enforcement/sync.sh --target <cursor|copilot|chatgpt|gemini|manus|clickup|list>

Copies Canon enforcement files into the current working tree's platform slots.
EOF
}

case "${TARGET}" in
  ""|--help|-h) usage; exit 0 ;;
  --list|list)
    echo "cursor copilot chatgpt gemini manus clickup"
    exit 0
    ;;
  cursor)
    mkdir -p .cursor/rules
    cp "$ROOT/enforcement/SYSTEM-PROMPT.txt" .cursor/SYSTEM.md
    cp "$ROOT/platforms/cursor/rules.mdc" .cursor/rules/aoc.mdc
    echo "synced cursor"
    ;;
  copilot)
    mkdir -p .github
    cp "$ROOT/platforms/copilot/copilot-instructions.md" .github/copilot-instructions.md
    echo "synced copilot"
    ;;
  chatgpt)
    mkdir -p .aoc/platforms
    cp "$ROOT/platforms/chatgpt/instructions.md" .aoc/platforms/chatgpt.md
    echo "synced chatgpt (paste .aoc/platforms/chatgpt.md into the GPT Instructions field)"
    ;;
  gemini)
    mkdir -p .aoc/platforms
    cp "$ROOT/platforms/gemini/instructions.md" .aoc/platforms/gemini.md
    echo "synced gemini"
    ;;
  manus)
    mkdir -p .aoc/platforms
    cp "$ROOT/platforms/manus/instructions.md" .aoc/platforms/manus.md
    echo "synced manus"
    ;;
  clickup)
    mkdir -p .aoc/platforms
    cp "$ROOT/platforms/clickup/fields.md" .aoc/platforms/clickup.md
    echo "synced clickup"
    ;;
  *)
    echo "unknown target: ${TARGET}" >&2
    usage
    exit 1
    ;;
esac
