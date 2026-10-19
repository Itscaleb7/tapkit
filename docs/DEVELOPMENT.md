# Development

## Prerequisites

Node 22, pnpm 10 (`corepack enable`), Docker (for the local Supabase stack), Deno 2 (function tests). For iOS builds: macOS with Xcode 26+, or EAS cloud builds.

## Install

```bash
pnpm install          # pnpm workspace, hoisted node_modules (see .npmrc), recommended for React Native
```

## Local backend

```bash
pnpm db:start                                   # Postgres, Auth, Storage, API on :54321 (Studio disabled in config)
cp supabase/functions/.env.example supabase/functions/.env
#   for local work without an API key: AI_PROVIDER=mock, ENVIRONMENT=development
pnpm functions:serve
```

Local auth has email confirmation disabled (`supabase/config.toml`). Emails (password reset) go to Mailpit at http://127.0.0.1:54324.

## iOS app

```bash
cd apps/mobile
cp .env.example .env      # EXPO_PUBLIC_SUPABASE_URL=http://<your-LAN-IP>:54321 on a physical device
npx expo run:ios          # development build on the simulator (macOS)
# or: npx eas-cli build --profile development --platform ios
pnpm mobile               # Metro dev server
```

Notes
- Expo Go won't work: the app uses native modules (RevenueCat, view-shot, expo-audio, media library).
- Without `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`, the paywall explains that purchases aren't configured. It never fakes a purchase.
- Without Supabase config, the app shows a "TapKit isn't configured yet" screen instead of crashing.
- `npx expo export --platform web` also builds the app for the browser. This is used for E2E tests only; export to images is iOS-only.

## Web app

```bash
cd apps/web && cp .env.example .env.local && pnpm dev    # http://localhost:3000, portfolios at /p/<slug>
```

## Shared core

`packages/core/src` is TypeScript with explicit `.ts` imports, consumed directly by Metro, Next.js (`transpilePackages`), Vitest and Deno. After editing it, run `pnpm sync:functions` to refresh `supabase/functions/_shared/core` (`pnpm test` fails if you forget).

Regenerate font metrics after changing carousel fonts: `pnpm --filter @tapkit/core gen:fonts`. Regenerate brand assets: `node apps/mobile/scripts/generate-brand-assets.mjs`. Preview all slide layouts/themes as PNGs: `RENDER_PREVIEW=/tmp/out pnpm --filter @tapkit/core exec vitest run test/render-preview.test.ts`.

## Conventions

- Validate inputs with the Zod schemas in `packages/core/src/schemas.ts` on the client; the database re-enforces constraints and RLS.
- Use `alert`/`confirm` from `@/lib/confirm` (they work on iOS and web), `Screen` for layouts, and the tokens in `theme/tokens.ts`. Don't hard-code colours.
- Data access goes through hooks in `lib/queries.ts`. Privileged work goes through Edge Functions.
