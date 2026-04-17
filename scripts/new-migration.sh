#!/bin/bash
set -euo pipefail

NAME=$1
if [ -z "$NAME" ]; then
  echo "Usage: pnpm db:new <migration_name>"
  exit 1
fi

REMOTE_LATEST=$(supabase migration list 2>/dev/null | grep -oE '[0-9]{14}' | sort -n | tail -1)
LOCAL_LATEST=$(ls supabase/migrations/*.sql 2>/dev/null | grep -oE '[0-9]{14}' | sort -n | tail -1)

LATEST=$(printf '%s\n' "$REMOTE_LATEST" "$LOCAL_LATEST" | sort -n | tail -1)
NEXT=$(( 10#${LATEST:-$(date +%Y%m%d%H%M%S)} + 1 ))

FILE="supabase/migrations/${NEXT}_${NAME}.sql"
touch "$FILE"
echo "Created: $FILE"
