#!/usr/bin/env bash
# Runs the Playwright end-to-end journey locally against the real backend.
# Prereqs: `supabase start` running; Deno installed; web app built (pnpm build:web).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANON=$(cd "$ROOT" && npx supabase status -o json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).ANON_KEY))')
pids=()
cleanup() { kill "${pids[@]}" 2>/dev/null || true; }
trap cleanup EXIT

"$ROOT/scripts/serve-functions-deno.sh" "$ROOT/tests/integration/functions.env" & pids+=($!)
node "$ROOT/tests/e2e/harness/gateway.mjs" & pids+=($!)
node "$ROOT/tests/e2e/harness/rc-mock.mjs" & pids+=($!)

# App (Expo web build) pointed at the local gateway
(cd "$ROOT/apps/mobile" && EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54500 EXPO_PUBLIC_SUPABASE_ANON_KEY="$ANON" EXPO_PUBLIC_WEB_URL=http://localhost:3000 \
  npx expo export --platform web --output-dir "$ROOT/tests/e2e/.app-web")
node "$ROOT/tests/e2e/harness/static.mjs" "$ROOT/tests/e2e/.app-web" 8081 & pids+=($!)

# Public web app (portfolios)
(cd "$ROOT/apps/web" && NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON" NEXT_PUBLIC_SITE_URL=http://localhost:3000 npx next start -p 3000) & pids+=($!)
sleep 20
(cd "$ROOT/tests/e2e" && npx playwright test)
