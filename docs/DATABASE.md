# Database

Postgres on Supabase. Migrations live in `supabase/migrations` and are applied in order:

| Migration | Contents |
|---|---|
| `…0001_core_schema.sql` | Enums, all tables, indexes, `updated_at` triggers, sign-up trigger, `plan_limits` seed |
| `…0002_rls.sql` | RLS enabled on every table + policies; privilege revokes on server-only tables |
| `…0003_functions.sql` | Entitlement helpers, limit triggers, RPCs (`get_entitlement`, `record_export`, `accept_blueprint`, `save_brand_profile`, `decide_recommendation`, `get_home_state`, `get_public_portfolio`, `submit_portfolio_enquiry`, `is_slug_available`) |
| `…0004_storage.sql` | `voice-notes` (private) and `portfolio-media` (public read) buckets + policies |
| `…0005_service_helpers.sql` | `increment_proof_usage` (service role only) |

## Tables

| Area | Tables |
|---|---|
| Account | `profiles` (1:1 `auth.users`), `onboarding_responses` (resumable answers + current step) |
| Brand | `blueprints` (versioned AI/manual strategy, status generated/accepted/rejected/superseded), `brand_profiles` (current accepted identity), `content_pillars`, `brand_versions` (snapshot before every change) |
| Proof Bank | `proof_entries` (text/voice/link, AI suggestion stored separately from user fields, generated `search` tsvector + GIN, trigram index on title) |
| Content | `content_projects` (slides as validated JSON array, caption, status, publication fields), `content_sources` (content ↔ proof entries) |
| Results | `experiments`, `metric_snapshots` (nullable per-metric columns — null means "not reported", never zero) |
| Evolution | `weekly_reviews` (deterministic facts + AI review), `recommendations` (pending/accepted/rejected/deferred), `strategic_decisions` |
| Monetisation | `offers`, `portfolios` (unique slug), `portfolio_items`, `leads`, `lead_activities`, `enquiry_rate` |
| Billing/usage | `subscriptions` (server-written), `revenuecat_events` (webhook dedupe), `ai_usage`, `export_usage`, `plan_limits` |

All user tables reference `auth.users(id) ON DELETE CASCADE`, so deleting the auth user removes every row.

## Integrity rules worth knowing

- `content_projects.published_requires_confirmation`: status `published` requires `published_confirmed = true` and `published_at`.
- URL columns must start with `http(s)://`; text columns have length limits; `slides` ≤ 20 and ≤ ~200 KB.
- Limit triggers: Proof Bank size, active experiments, offers, portfolio items, custom portfolio colours (Pro).
- `record_export` serialises per user with an advisory lock so the monthly limit can't be raced.

## Security model

- RLS: owner-only (`user_id = auth.uid()`) for all private tables. Inserts that reference other rows (pillar, experiment, content, lead, offer) are checked with `EXISTS` sub-queries that themselves run under RLS, so users can only link to rows they own.
- Server-only tables (`subscriptions`, `ai_usage`, `export_usage`, `revenuecat_events`, `enquiry_rate`, `plan_limits`) have no client write privileges; `blueprints`, `weekly_reviews`, `recommendations` cannot be inserted by clients.
- Internal helpers (`is_pro`, `current_plan`, `plan_limit`, usage counters) are not executable by `anon`/`authenticated`.
- Anonymous visitors can only call `get_public_portfolio`, `submit_portfolio_enquiry` and read `plan_limits`.
- `get_public_portfolio` returns an explicit allow-list of fields: published portfolio fields, visible items whose content is `published`, and active offers marked public. Never Proof Bank entries, drafts, analytics or account email (verified by integration tests). Note: if a user uploads a portfolio photo, its public storage URL contains their opaque account UUID as the folder name.

## Working with migrations

```bash
pnpm db:start                  # local stack + migrations
npx supabase migration new <name>
pnpm db:reset                  # re-apply all migrations locally
npx supabase db lint --level warning
pnpm db:types                  # regenerate packages/core/src/database.types.ts (+ sync to functions)
npx supabase link --project-ref <ref> && npx supabase db push   # apply to a hosted project
```

When you change numeric plan limits, update **both** `packages/core/src/plans.ts` and the `plan_limits` seed (via a new migration). The integration test "SQL plan_limits matches packages/core PLAN_LIMITS" fails if they drift.
