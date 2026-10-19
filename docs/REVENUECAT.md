# RevenueCat & subscriptions

## How it works

1. The app configures `react-native-purchases` with the **public** Apple SDK key and logs in with the Supabase user id (`Purchases.logIn(userId)`), so RevenueCat's `app_user_id` = our `auth.users.id`.
2. The paywall loads the **current offering** and shows the store's localized `priceString`. Prices are never hard-coded in the app.
3. After a purchase or restore, the app calls the `subscription-sync` Edge Function. The function fetches `GET https://api.revenuecat.com/v1/subscribers/{user_id}` with the **secret** key and writes `subscriptions`.
4. `revenuecat-webhook` receives lifecycle events (renewal, cancellation, expiration, billing issue, refund…), authenticates them with a shared secret, dedupes by event id, and re-fetches the subscriber.
5. Features are unlocked only from `get_entitlement()` / SQL `is_pro()`: active `pro` entitlement whose expiry (or billing grace period) is in the future, and not refunded.

Handled states: active, cancelled-but-unexpired (keeps access, shows "Cancellation scheduled"), billing issue (banner + grace period), expired, refunded, sandbox vs production (shown in Settings → Subscription), pending payments (Ask to Buy), user-cancelled purchases.

## Setup (needs your accounts)

1. **App Store Connect**
   - Create the app with bundle ID `app.tapkit.ios` (or set `IOS_BUNDLE_IDENTIFIER`).
   - Create a subscription group "TapKit Pro" with two auto-renewable products: `tapkit_pro_monthly` (1 month) and `tapkit_pro_annual` (1 year). Suggested test prices: US$9.99 and US$59.99. These are hypotheses, not validated prices.
   - Add localized display names/descriptions and a review screenshot of the paywall.
   - Agreements, Tax and Banking must be complete for products to load.
   - Generate an **In-App Purchase key** (App Store Connect → Users and Access → Integrations) for RevenueCat.
2. **RevenueCat**
   - Create a project and an App Store app; upload the In-App Purchase key and App Store Connect API key; enter the bundle ID.
   - Entitlement: identifier **`pro`**. Attach both products.
   - Offering: identifier `default`, marked **Current**, with packages `$rc_monthly` → `tapkit_pro_monthly` and `$rc_annual` → `tapkit_pro_annual`.
   - Copy the **public Apple SDK key** (`appl_…`) → `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`.
   - Create a **secret API key** (v1) → Supabase secret `REVENUECAT_SECRET_API_KEY`.
   - Webhook: URL `https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook`, Authorization header `Bearer <REVENUECAT_WEBHOOK_SECRET>`; set the same secret in Supabase. Send a test event (it's acknowledged and ignored).
3. **Sandbox testing**
   - Create a Sandbox Apple Account in App Store Connect; sign in on a device under Settings → App Store → Sandbox Account.
   - Install a development or TestFlight build, purchase from the paywall, and confirm Settings → Subscription shows **TapKit Pro · Sandbox (test) purchase**.
   - Test Restore on a second install, cancel via Settings → Subscriptions (sandbox renewals are accelerated), and confirm the webhook moves the user back to Free after expiry.

## Verification status

- Server logic is tested end-to-end against a mock RevenueCat REST server: purchase sync, cancel-but-active, billing issue, expiry via webhook, event dedupe, bad webhook secret, restore (`tests/integration/functions.test.ts`), plus Deno unit tests for the mapping (grace period, refunds, anonymous ids).
- The UI journey test verifies the app shows Pro after server verification.
- **Not yet verified:** a real StoreKit sandbox purchase. This needs your Apple Developer account, RevenueCat project and a device or simulator build. No purchase of any kind was made.

## Web billing

None. Purchases happen only through Apple in the iOS app. The website says Pro is purchased in the iOS app. If web billing is ever added, keep it separate (e.g. RevenueCat Web Billing / Stripe) and follow Apple's current guidelines on external purchase links.
