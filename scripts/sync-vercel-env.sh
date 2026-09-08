#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERCEL="${VERCEL:-npx vercel}"

PREVIEW_ENV="$ROOT/.env.local"
PRODUCTION_ENV="$ROOT/.env.production.local"

if ! $VERCEL whoami >/dev/null 2>&1; then
  echo "Vercel CLI non autenticata. Esegui: npx vercel login"
  exit 1
fi

if [[ ! -f "$PREVIEW_ENV" ]]; then
  echo "Manca $PREVIEW_ENV (copia da .env.local.example)"
  exit 1
fi

if [[ ! -f "$PRODUCTION_ENV" ]]; then
  echo "Manca $PRODUCTION_ENV (copia da .env.production.local.example)"
  exit 1
fi

if [[ ! -d .vercel ]]; then
  echo "Collegamento progetto Vercel…"
  $VERCEL link --yes
fi

upsert_env() {
  local key="$1"
  local value="$2"
  local target="$3"

  if $VERCEL env ls "$target" 2>/dev/null | rg -q "^[[:space:]]*${key}[[:space:]]"; then
    printf '%s' "$value" | $VERCEL env update "$key" "$target" --yes
  else
    printf '%s' "$value" | $VERCEL env add "$key" "$target" --yes
  fi
}

read_env_file() {
  local file="$1"
  local key="$2"
  local line
  line="$(rg "^${key}=" "$file" | head -1 || true)"
  if [[ -z "$line" ]]; then
    echo ""
    return
  fi
  echo "${line#*=}"
}

sync_target() {
  local file="$1"
  local target="$2"
  shift 2
  local keys=("$@")

  echo ""
  echo "→ Target: $target (da $(basename "$file"))"

  for key in "${keys[@]}"; do
    local value
    value="$(read_env_file "$file" "$key")"
    if [[ -z "$value" ]]; then
      echo "  Salto $key (non presente in $(basename "$file"))"
      continue
    fi
    echo "  $key"
    upsert_env "$key" "$value" "$target"
  done
}

PREVIEW_KEYS=(
  HESTIA_AUTH_MODE
  MOCK_AUTH_PASSWORD
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
)

PRODUCTION_KEYS=(
  HESTIA_AUTH_MODE
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
)

sync_target "$PREVIEW_ENV" preview "${PREVIEW_KEYS[@]}"
sync_target "$PRODUCTION_ENV" production "${PRODUCTION_KEYS[@]}"

echo ""
echo "Fatto. Redeploy preview/production per applicare le variabili."
