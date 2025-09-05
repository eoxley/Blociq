#!/usr/bin/env bash
set -euo pipefail

# Files that SHOULD trigger a FRONTEND build (updated to include more paths)
FRONTEND_REGEX='^(components/|pages/|styles/|app/|contexts/|hooks/|lib/|next\.config|tailwind\.config|postcss\.config|tsconfig\.json$|package\.json$|package-lock\.json$|pnpm-lock\.yaml$|yarn\.lock$)'

if git rev-parse --verify HEAD^ >/dev/null 2>&1; then
  changed="$(git diff --name-only HEAD^ HEAD || true)"
else
  exit 0
fi

# Check for frontend-relevant changes
if echo "$changed" | grep -Eq "$FRONTEND_REGEX"; then
  echo "[frontend] Frontend-relevant changes detected — building."
  exit 0
fi

# Check for app files (excluding API routes)
if echo "$changed" | grep -q "^app/" && ! echo "$changed" | grep -q "^app/api/"; then
  echo "[frontend] App files changed (excluding API) — building."
  exit 0
fi

# Check for public files (including outlook-addin)
if echo "$changed" | grep -q "^public/"; then
  echo "[frontend] Public files changed — building."
  exit 0
fi

echo "[frontend] No frontend changes — skipping build."
exit 1
