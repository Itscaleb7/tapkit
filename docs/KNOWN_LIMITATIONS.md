# Known limitations

## Blocked by credentials or hardware (implemented, not live-verified)
- **Real AI output.** No Anthropic key was available. All AI flows were verified with the mock provider through the same validation path. Review real output quality in staging.
- **StoreKit purchases.** The purchase and restore code is implemented. Server-side verification is tested against a mock RevenueCat API, but no sandbox purchase was possible.
- **On-device export.** The PNG capture, Photos save and share-sheet code paths need a device or simulator check. The renderer and ZIP are verified in Node.
- **Transcription.** Optional; needs `TRANSCRIPTION_PROVIDER=openai` and a key. Without it, voice notes are saved and the user is asked to type a summary.
- **CI workflow** is written but has not run (no GitHub remote).

## Product limitations (by design for v1)
- Analytics are entered manually; there are no platform API integrations. Metrics offered per platform are a curated list.
- The app is iPhone-first and light mode only. The web build of the app exists for automated testing and isn't a supported product surface.
- Proof Bank search is Postgres full-text plus title substring. There is no semantic/vector search, and none is claimed.
- Saved links store the URL and your note; page titles aren't fetched.
- Weekly reviews cover the current Monday–Sunday week (UTC dates). The free plan includes 1 AI review per month, and empty weeks don't use it.
- Monthly AI limits are checked before the call, so concurrent requests could exceed the limit by a request or two. Exports are strictly serialised.
- Portfolio enquiries are capped at 20 per portfolio per day with a honeypot. There's no CAPTCHA.
- Sign in with Apple isn't included (email/password only, so Apple doesn't require it).
- Legal pages are templates and need review before launch.
- In the build sandbox, the Supabase edge-runtime container couldn't fetch npm modules through the proxy, so functions were tested under host Deno with identical code.
