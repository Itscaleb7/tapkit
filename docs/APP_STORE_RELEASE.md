# App Store release checklist

Status: **not submitted.** Every item below needs your Apple account, credentials, device or approval unless marked ✅ (done in the codebase).

## Apple Developer & App Store Connect
- [ ] Apple Developer Program membership (US$99/yr) — *your payment*
- [ ] Register bundle ID `app.tapkit.ios` (or set `IOS_BUNDLE_IDENTIFIER`), capability: In-App Purchase
- [ ] Create the app record in App Store Connect (name "TapKit", primary language, SKU)
- [ ] Agreements, Tax and Banking (Paid Apps agreement) — required for subscriptions
- [ ] Signing: let EAS manage certificates and provisioning profiles (`eas build` prompts), or upload your own

## Configuration in code
- ✅ Display name, slug, scheme `tapkit`, version 1.0.0, build number auto-increment (EAS)
- ✅ App icon 1024×1024, opaque (`apps/mobile/assets/icon.png`), splash screen
- ✅ iPhone only (`supportsTablet: false`), portrait, minimum iOS 16.4
- ✅ Permission strings: microphone (voice notes), photo library add (export), photo library (portfolio photo)
- ✅ `ITSAppUsesNonExemptEncryption = false`
- ✅ Privacy manifest required-reason APIs declared in `app.config.ts`
- ✅ In-app account deletion (Settings → Account → Delete account), data export
- ✅ Restore Purchases on the paywall and in Settings; auto-renewal disclosure; links to Terms of Use (Apple EULA) and Privacy Policy on the paywall
- ✅ Offline, error, empty and loading states; Dynamic Type capped at 1.6×; accessibility labels on controls and slide images

## Subscriptions
- [ ] Subscription group "TapKit Pro": `tapkit_pro_monthly`, `tapkit_pro_annual` (prices of your choice; test hypotheses US$9.99 / US$59.99)
- [ ] Localized names and descriptions, review screenshot of the paywall, review notes
- [ ] RevenueCat project, `pro` entitlement, current offering — see [REVENUECAT.md](REVENUECAT.md)
- [ ] Sandbox purchase, restore, cancellation and expiry tested on a device

## App privacy (App Store Connect → App Privacy)
Suggested answers. Verify against your final configuration:
- **Contact Info → Email address:** App Functionality; linked to user; not tracking
- **Contact Info → Name:** App Functionality; linked
- **User Content → Audio data** (voice notes), **Photos** (portfolio photo), **Other user content** (Proof Bank, content, offers, leads): App Functionality; linked
- **Purchases → Purchase history:** App Functionality; linked
- **Identifiers → User ID:** App Functionality; linked
- **Usage data / Diagnostics:** not collected, unless you add analytics or crash reporting
- Tracking: **No** (no third-party ad tracking)

## Store listing
- [ ] Privacy Policy URL: `https://<domain>/privacy` (review the template first)
- [ ] Support URL: `https://<domain>/support`; Marketing URL: `https://<domain>`
- [ ] Description. Suggested opening: "Build your personal brand from zero. TapKit helps you discover what you should be known for, capture your real experiences, turn them into polished Instagram carousels, learn from your results, and build toward clients and opportunities."
- [ ] Keywords, category (Productivity or Business), age rating questionnaire (user-generated content: portfolio pages, which can be reported via support)
- [ ] Screenshots: 6.9" and 6.5" iPhone. Capture from a simulator build. Don't use invented metrics or testimonials.
- [ ] App Review notes, e.g.:
  > Demo account: reviewer@yourdomain.com / <password> (pre-onboarded). AI features call our server, which uses Anthropic's API. Exports save images to Photos or share a ZIP. Subscriptions are managed with RevenueCat; use the sandbox. Account deletion: Settings → Account → Delete account. Public portfolio example: https://<domain>/p/<demo-slug>.
- [ ] Create that demo account in production and keep it working through review

## Build & submit
- [ ] Production Supabase, functions and secrets deployed ([DEPLOYMENT.md](DEPLOYMENT.md)); `ENVIRONMENT=production`, `AI_PROVIDER=anthropic`
- [ ] `eas build --platform ios --profile production` → `eas submit`
- [ ] TestFlight internal testing: run the manual QA script in [TESTING.md](TESTING.md) on a small and a large iPhone
- [ ] Submit the version together with the subscription products for review
- [ ] After approval: set `NEXT_PUBLIC_APP_STORE_URL` on the website
