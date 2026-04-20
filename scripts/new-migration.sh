#!/bin/bash
set -euo pipefail

NAME="${1:-}"
if [ -z "$NAME" ]; then
  echo "Usage: pnpm db:new <migration_name>"
  exit 1
fi

REMOTE_LATEST=$(
  (supabase migration list 2>/dev/null || true) |
    grep -oE '[0-9]{14}' |
    sort -n |
    tail -1 ||
    true
)
LOCAL_LATEST=$(
  printf '%s\n' supabase/migrations/*.sql 2>/dev/null |
    grep -oE '[0-9]{14}' |
    sort -n |
    tail -1 ||
    true
)

LATEST=$(printf '%s\n' "$REMOTE_LATEST" "$LOCAL_LATEST" | sort -n | tail -1)
NOW=$(date +%Y%m%d%H%M%S)

if [ -n "${LATEST:-}" ] && [ "$NOW" -le "$LATEST" ]; then
  NEXT=$((10#$LATEST + 1))
else
  NEXT="$NOW"
fi

SAFE_NAME=$(printf '%s' "$NAME" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^[:alnum:]]+/_/g; s/^_+//; s/_+$//')
if [ -z "$SAFE_NAME" ]; then
  echo "Invalid migration name: $NAME"
  exit 1
fi

mkdir -p supabase/migrations

FILE="supabase/migrations/${NEXT}_${SAFE_NAME}.sql"
if [ -e "$FILE" ]; then
  echo "Migration already exists: $FILE"
  exit 1
fi

touch "$FILE"
echo "Created: $FILE"
