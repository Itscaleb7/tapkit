# Testing

| Suite | Command | Needs | Covers |
|---|---|---|---|
| Core unit | `pnpm --filter @tapkit/core test` | — | Validation, plan limits, slide operations, text measurement/wrapping/fitting, layout geometry for every layout × theme, SVG escaping, **real PNG rendering at 1080×1350 with bundled fonts, ZIP contents and order**, experiment maths, evidence levels, next-action logic, weekly facts, prompts |
| Mobile unit | `pnpm --filter @tapkit/mobile test` | — | Error mapping, chunked Keychain session storage, offline capture outbox |
| Web unit | `pnpm --filter @tapkit/web test` | — | Portfolio enquiry server action (validation, honeypot, rate-limit messaging) |
| Function unit | `pnpm test:functions` | Deno | RevenueCat subscriber mapping (active, expired, grace period, cancellation, refund, anonymous ids) |
| Integration: DB | `pnpm test:integration` | `supabase start` | Sign-up bootstrap, resumable onboarding, sign in/out, RLS isolation, cross-user linking, anon access, forged Pro/usage, blueprint acceptance + version history, full-text search (exact app filter), publication rule, export limits and premium themes, Pro unlock and expiry, experiment/offer limits, portfolio privacy, enquiries, storage privacy and MIME checks |
| Integration: functions | same | + functions served (`supabase functions serve --env-file tests/integration/functions.env`) | Full backend journey: blueprint → classification → content from Proof Bank → experiment analysis → weekly review → Pro gating → RevenueCat sync, cancel, billing issue, webhook expiry and dedupe, restore → data export → account deletion (rows + files + login removed) |
| E2E UI | `scripts/e2e-local.sh` | Supabase, Deno, Chromium | The real app UI (Expo web build) for the 12-step journey below |

## E2E journey (`tests/e2e/specs/journey.spec.ts`)

Sign up → onboarding (with reload mid-way to prove it resumes) → blueprint generated and accepted → My Brand updated → capture Proof Bank entries → AI classification shown → search → generate carousel from the entry → edit slides (add slide, autosave) → mark published with explicit confirmation → record results → create a growth experiment → weekly review built from recorded data → set up and publish portfolio → open the public web page (verifies an unused private entry and the account email are absent) → hit a Pro feature and see the paywall with Apple's disclosures → server-verified sandbox subscription unlocks Pro in Settings → sign out and back in (data persists) → delete account (portfolio returns 404, login fails).

## Latest results (this build)

- Core 48 passed (+1 manual preview test skipped) · Mobile 12 · Web 4 · Deno 7
- Integration 46 passed (27 database + 19 functions)
- E2E journey: passed
- Typecheck: all packages pass · Lint: 0 errors (warnings only)
- Production builds: `next build` ✓, `expo export --platform ios` (Hermes bundle) ✓, `expo export --platform web` ✓, `expo prebuild --platform ios` ✓ (Info.plist permissions, URL scheme, bundle id verified)

## Environment notes

- In the sandbox where this was built, the Supabase edge-runtime container couldn't download npm packages because a TLS-intercepting proxy wasn't trusted inside it. The functions were run with the same code under host Deno instead (`scripts/serve-functions-deno.sh`, `FUNCTIONS_MODE=deno`), with `tests/e2e/harness/gateway.mjs` routing `/functions/v1/*`. On a normal machine or in CI, use `supabase functions serve`.
- AI tests use `AI_PROVIDER=mock`. RevenueCat tests use a mock REST server. Neither replaces a staging check with real keys (see AI.md / REVENUECAT.md).

## Not covered by automated tests (needs hardware or accounts)

- On-device PNG capture via react-native-view-shot, saving to Photos and the iOS share sheet. The renderer and ZIP are tested in Node with resvg; the device path needs a manual check on an iPhone/simulator.
- Voice recording and transcription with a real provider.
- A real StoreKit sandbox purchase.
- Push of real Anthropic output through the schemas.

Manual QA script for a TestFlight build: run the E2E journey by hand on iPhone SE (small) and iPhone 16 Pro Max (large) and test the device-only paths above.
