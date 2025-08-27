#!/usr/bin/env bash
set -euo pipefail

# Files that SHOULD trigger a FRONTEND build (tweak to match repo layout)
FRONTEND_REGEX='^(app/|components/|pages/|styles/|next\.config|tailwind\.config|postcss\.config|tsconfig\.json$|package\.json$|package-lock\.json$|pnpm-lock\.yaml$|yarn\.lock$)'

if git rev-parse --verify HEAD^ >/dev/null 2>&1; then
  changed="$(git diff --name-only HEAD^ HEAD || true)"
else
  exit 0
fi

if echo "$changed" | grep -Eq "$FRONTEND_REGEX"; then
  echo "[frontend] Frontend-relevant changes detected — building."
  exit 0
else
  echo "[frontend] No frontend changes — skipping build."
  exit 1
fi
