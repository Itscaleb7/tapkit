# AI integration

All model calls happen in the `ai` Edge Function (`supabase/functions/ai/index.ts`). The app never holds an AI key.

## Provider

Two real providers are implemented; choose with `AI_PROVIDER`:

- **OpenAI** (`AI_PROVIDER=openai`, `OPENAI_API_KEY`, model `gpt-5.5` by default, override with `OPENAI_MODEL`): Responses API with **strict structured outputs**. The Zod schema is converted by `_shared/ai/strictSchema.ts` (closed objects, all fields required, validation keywords removed) and the result is re-validated with the full Zod schema. Reasoning effort is sent for GPT-5/o-series models. Refusals and truncated responses are handled; invalid output is regenerated once. The same key powers optional voice-note transcription.
- **Anthropic Claude** (`AI_PROVIDER=anthropic`, the code default): via the official `@anthropic-ai/sdk`, model `claude-opus-5-5` (override with `AI_MODEL`).
- Requests use adaptive thinking, an explicit `effort` per task, **structured outputs** (`output_config.format` built from the Zod schema with the SDK's `zodOutputFormat`), and server-side refusal fallbacks (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`).
- Provider abstraction: `_shared/ai/provider.ts` (`AiProvider` interface), `anthropic.ts`, `mock.ts`, selected by `AI_PROVIDER`. To switch providers, add an implementation and a case in `_shared/ai/index.ts`.
- `AI_PROVIDER=mock` returns deterministic, schema-valid outputs for development and automated tests. It is **refused** when `ENVIRONMENT=production`.

Cost note: Opus is the default for quality. `classify_proof` runs at `low` effort and isn't counted against the user's monthly allowance; if costs matter, measure on real traffic and consider a cheaper model for classification via a per-task model override.

## Tasks

| Task | Context sent (minimal) | Output schema | Metered | Stored in |
|---|---|---|---|---|
| `blueprint` | onboarding answers (+ previous positioning + feedback on regenerate) | `brandBlueprintSchema` | yes | `blueprints` (new version) |
| `alternative_positioning` (Pro) | accepted brand + answers | `alternativePositioningSchema` | yes | returned only |
| `classify_proof` | one entry, pillar names, positioning/audience | `proofClassificationSchema` | no (rate-limited) | `proof_entries.ai_suggestion`; fills **empty** fields only |
| `generate_content` | accepted brand, ≤5 selected entries, pillar, optional previous post/experiment | `generatedContentSchema` | yes | `content_projects` + `content_sources` |
| `analyze_experiment` | experiment, deterministic stats, ≤30 snapshots | `experimentAnalysisSchema` | yes | `experiments.analysis` |
| `weekly_review` | brand + deterministic weekly facts + recent decisions | `weeklyReviewAiSchema` | yes | `weekly_reviews` (+ `recommendations`) |
| `offer_assist` (Pro) | brand, offer draft, selected evidence | `offerAssistSchema` | yes | returned; user applies to form |

When a week has no recorded activity, the weekly review is produced deterministically without calling the model, and no allowance is used.

## Prompts

`packages/core/src/prompts.ts`: shared grounding rules, a system prompt per task, user-prompt builders, and `PROMPT_VERSIONS` (stored with every output). User-written text is wrapped in `<user_content>` tags and the model is told to treat it as data (prompt-injection hardening). The rules forbid inventing experiences, credentials, results, follower counts, testimonials or revenue, and require placeholders/hypotheses instead.

## Reliability and safety

- JWT verified with Supabase Auth; every query filters by the verified user id.
- Rate limit: `AI_RATE_LIMIT_PER_MINUTE` (default 8) per user; monthly allowance from `plan_limits`.
- SDK timeout 75 s, 1 SDK retry for transient errors; one regeneration if the output fails validation or hits `max_tokens`.
- Error mapping: refusal → 422, rate limit → 429, config → 503, invalid output → 502 with friendly messages. Each call is logged in `ai_usage` (status, tokens, latency, prompt version), without storing prompt content.

## Enabling real AI

```bash
# OpenAI
npx supabase secrets set AI_PROVIDER=openai OPENAI_API_KEY=sk-... TRANSCRIPTION_PROVIDER=openai ENVIRONMENT=production
# or Anthropic
npx supabase secrets set AI_PROVIDER=anthropic ANTHROPIC_API_KEY=sk-ant-... ENVIRONMENT=production
```

**Verification status:** all tests ran with the mock provider. Both provider implementations type-check against their SDKs (Anthropic 0.135.0, OpenAI 7.39.0), and every AI output schema is unit-tested for OpenAI strict-mode compatibility, but no live API call has been made yet. After adding the key, generate a blueprint and a carousel in a staging project and review the output quality before release.
