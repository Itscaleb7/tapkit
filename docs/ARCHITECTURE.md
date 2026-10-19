# Architecture

## Overview

```
┌──────────────────────┐        HTTPS (user JWT)        ┌──────────────────────────────┐
│ iOS app (Expo/RN)    │ ─────────────────────────────▶ │ Supabase                     │
│  Expo Router screens │  PostgREST (RLS-protected)     │  Postgres + RLS + RPCs       │
│  React Query         │  Storage (private/public)      │  Auth (email/password)       │
│  RevenueCat SDK      │  Edge Functions                │  Storage buckets             │
│  Carousel renderer   │                                │  Edge Functions (Deno) ──────┼──▶ Anthropic (AI)
└─────────┬────────────┘                                │    ai, subscription-sync,    │──▶ RevenueCat REST
          │ StoreKit purchases                          │    revenuecat-webhook, ...   │──▶ OpenAI (optional STT)
          ▼                                             └──────────────▲───────────────┘
   Apple / RevenueCat ── webhook ──────────────────────────────────────┘
                                                                        ▲ anon key, public RPCs only
┌──────────────────────┐                                                │
│ Web (Next.js)        │ ───────────────────────────────────────────────┘
│  Landing, /p/[slug]  │
└──────────────────────┘
```

## Key decisions

| Decision | Why |
|---|---|
| **Expo SDK 58 + Expo Router** | Native iOS app with file-based routing, native stack/tab navigators, config plugins for permissions, EAS for builds without local Xcode. Not a WebView wrapper. |
| **`packages/core` shared by app, web and Edge Functions** | One source of truth for validation (Zod), plan limits, prompts and the carousel renderer. Functions get a synced copy (`pnpm sync:functions`) because Deno bundles only the functions folder; `pnpm test` fails if the copy drifts. |
| **Supabase RLS on every user table** | The app talks to Postgres directly for CRUD; RLS guarantees isolation. Privileged work (AI, billing, deletion) runs in Edge Functions with the service role and always filters by the verified user id. |
| **Server-side entitlements** | `subscriptions` is written only by `subscription-sync`/`revenuecat-webhook` after re-reading RevenueCat with the secret key. Limits are enforced in SQL (`plan_limits`, triggers, `record_export`) and in the `ai` function. The client's RevenueCat state never unlocks anything by itself. |
| **Deterministic carousel rendering** | `layoutSlide()` measures text with generated font metrics (Inter, DM Serif Display, Space Grotesk), wraps and fits it, and emits SVG. The same SVG renders in the editor (react-native-svg), is captured to 1080×1350 PNG for export (react-native-view-shot), and is server-rendered on public portfolios. No AI-generated text in images. |
| **AI behind one task-routed function** | Small context per task, versioned prompts, structured outputs validated with Zod, rate limiting, monthly metering, usage logging, and a provider abstraction (`AI_PROVIDER`). |
| **Manual analytics first** | Platforms expose different metrics; the entry form only offers metrics each platform reports. Nothing is estimated. |
| **Next.js for portfolios** | Shareable links that work without the app, server-rendered, reading only the `get_public_portfolio` RPC. |

## Mobile app structure (`apps/mobile/src`)

- `app/` — routes. Tabs: `home`, `brand`, `create`, `insights`, `opportunities`. Stacks/modals: onboarding, blueprint, proof capture/detail, content new/detail/editor/export/results, experiments, reviews, offers, portfolio, leads, paywall, settings.
- `lib/` — `supabase` (chunked Keychain session storage), `auth` (session, expiry detection), `queries` (React Query hooks), `api` (edge function calls + error mapping), `purchases` (RevenueCat), `entitlement` (server plan + usage), `exportCarousel` (PNG/ZIP/Photos), `outbox` (offline captures), `confirm` (cross-platform dialogs).
- `components/` — design system: `ui`, `forms`, `states` (loading/empty/error/offline), `Screen`, `SlideView`, `charts`, `VoiceRecorder`.
- `theme/tokens.ts` — colours, type scale, spacing, radii, shadows.

## Data flow examples

**Generate content:** app → `ai` `{task:"generate_content", proof_entry_ids, format…}` → function verifies JWT, plan and rate limit → loads only the accepted brand + selected entries (owner-filtered) → Claude with structured output → Zod validation → inserts `content_projects` (+ `content_sources`) → returns the draft.

**Purchase:** paywall → `Purchases.purchasePackage` (StoreKit) → app calls `subscription-sync` → function fetches `GET /v1/subscribers/{user_id}` from RevenueCat with the secret key → upserts `subscriptions` → app refetches `get_entitlement`. Renewals/expirations/billing issues arrive via `revenuecat-webhook`, which re-fetches the subscriber (never trusting the event body) and dedupes by event id.

**Export:** export screen → `record_export` RPC (checks monthly limit + premium theme on the server) → each slide's SVG captured offscreen at 1080×1350 → PNGs named `slide-01.png…` → saved to Photos, shared individually, or zipped (JSZip) and shared.
