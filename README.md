# TapKit

**Build your personal brand from zero.** TapKit is an iOS app (Expo / React Native) with a Supabase backend and a Next.js web app for public portfolios. It helps people discover what they should be known for, capture their real experiences, create personalised content, learn from recorded results, and turn that reputation into opportunities.

```
Brand Blueprint → Proof Bank → Content Studio → Growth Experiments → Brand Evolution → Monetisation Hub
```

## Repository layout

| Path | What it is |
|---|---|
| `apps/mobile` | iOS app — Expo SDK 58, Expo Router, TypeScript |
| `apps/web` | Landing page, public portfolios (`/p/[slug]`), privacy/terms/support — Next.js 16 |
| `packages/core` | Shared TypeScript: Zod schemas, plan limits, prompts, experiment maths, next-action logic, **deterministic carousel layout + SVG renderer** |
| `supabase/migrations` | Database schema, RLS, RPCs, storage buckets |
| `supabase/functions` | Edge Functions: `ai`, `subscription-sync`, `revenuecat-webhook`, `account-export`, `account-delete`, `transcribe` |
| `tests/integration` | Vitest suites against a live local Supabase (RLS, limits, privacy, the full backend journey) |
| `tests/e2e` | Playwright journey through the real app UI (Expo web build) |
| `docs/` | Architecture, database, AI, RevenueCat, testing, deployment, App Store checklist, limitations |

## Quick start (local)

Prereqs: Node 22, pnpm 10, Docker, Deno 2 (for function tests).

```bash
pnpm install
pnpm db:start                         # local Supabase (applies migrations)
cp supabase/functions/.env.example supabase/functions/.env   # set AI_PROVIDER=mock to run without an API key
pnpm functions:serve                  # Edge Functions on http://127.0.0.1:54321/functions/v1
cp apps/mobile/.env.example apps/mobile/.env                 # use the anon key printed by `supabase status`
pnpm mobile                           # Expo dev server (press i for iOS simulator on macOS)
cp apps/web/.env.example apps/web/.env.local
pnpm web                              # http://localhost:3000
```

The app needs a **development build** (not Expo Go) because it uses native modules (RevenueCat, view-shot, audio). On macOS: `cd apps/mobile && npx expo run:ios`. Or use EAS: `npx eas-cli build --profile development --platform ios`.

## Checks

```bash
pnpm typecheck && pnpm lint && pnpm test   # unit tests (core, mobile, web) + core/functions sync check
pnpm test:functions                        # Deno unit tests for Edge Function helpers
pnpm test:integration                      # needs `pnpm db:start` + functions served
scripts/e2e-local.sh                       # full UI journey (Playwright)
```

See [docs/TESTING.md](docs/TESTING.md) for what each suite covers and the latest verified results.

## Configuration

All variables are documented in [`.env.example`](.env.example). Client-safe values use `EXPO_PUBLIC_*` / `NEXT_PUBLIC_*`. Server secrets (Anthropic, RevenueCat secret key, webhook secret, optional OpenAI) live only in Supabase Edge Function secrets — see [`supabase/functions/.env.example`](supabase/functions/.env.example). No secrets are committed.

## What needs your accounts

Everything that can run locally has been implemented and tested. These steps need your credentials or approval — full instructions in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and [docs/APP_STORE_RELEASE.md](docs/APP_STORE_RELEASE.md):

1. **Supabase project** — create, link, push migrations, deploy functions, set secrets.
2. **AI key** — OpenAI (`AI_PROVIDER=openai`, `OPENAI_API_KEY`) or Anthropic (`ANTHROPIC_API_KEY`). Real AI output hasn't been exercised yet; tests use the mock provider.
3. **Apple Developer + App Store Connect** — bundle ID, subscription products `tapkit_pro_monthly` / `tapkit_pro_annual`.
4. **RevenueCat** — project, `pro` entitlement, offering, public iOS key, secret key, webhook.
5. **Web hosting** (e.g. Vercel) for `apps/web` and your domain.
6. **GitHub** — this sandbox has no GitHub credentials, so the repo is local. To publish:
   `gh repo create tapkit --private --source . --push` (or add a remote and `git push -u origin main`).

## Documentation

- [Architecture](docs/ARCHITECTURE.md) · [Database](docs/DATABASE.md) · [AI integration](docs/AI.md) · [RevenueCat](docs/REVENUECAT.md)
- [Development](docs/DEVELOPMENT.md) · [Testing](docs/TESTING.md) · [Deployment](docs/DEPLOYMENT.md)
- [App Store release checklist](docs/APP_STORE_RELEASE.md) · [Known limitations](docs/KNOWN_LIMITATIONS.md) · [Organic content plan](docs/CONTENT_MARKETING.md)
