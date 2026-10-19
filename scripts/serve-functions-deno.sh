#!/usr/bin/env bash
# Runs every Edge Function under plain Deno on the host (one port each).
# Useful where the Supabase edge-runtime container can't reach npm (e.g. behind a
# TLS-intercepting proxy). Normal development should use `supabase functions serve`.
# Usage: scripts/serve-functions-deno.sh <env-file>
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${1:-$ROOT/tests/integration/functions.env}"
set -a; source "$ENV_FILE"; set +a
# Host processes reach host services on localhost, not host.docker.internal.
export REVENUECAT_API_BASE="${REVENUECAT_API_BASE/host.docker.internal/127.0.0.1}"
export SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:54321}"
export SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-$(cd "$ROOT" && npx supabase status -o json 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).SERVICE_ROLE_KEY))')}"
declare -A PORTS=( [ai]=54401 [subscription-sync]=54402 [revenuecat-webhook]=54403 [account-delete]=54404 [account-export]=54405 [transcribe]=54406 )
for fn in "${!PORTS[@]}"; do
  LOCAL_FUNCTION_PORT=${PORTS[$fn]} deno run --allow-net --allow-env --allow-read \
    --config "$ROOT/supabase/functions/$fn/deno.json" "$ROOT/supabase/functions/$fn/index.ts" &
done
wait
