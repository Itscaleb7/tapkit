# Deployment

## 1. Supabase (backend)

```bash
npx supabase login
npx supabase projects create tapkit --org-id <org> --region <region>   # or create in the dashboard
npx supabase link --project-ref <ref>
npx supabase db push                                                   # applies all migrations
cp supabase/functions/.env.example supabase/functions/.env             # fill in real values
npx supabase secrets set --env-file supabase/functions/.env
npx supabase functions deploy ai subscription-sync revenuecat-webhook account-export account-delete transcribe
```

`revenuecat-webhook` has `verify_jwt = false` in `config.toml` (it authenticates with its own secret). The others require a user JWT.

Dashboard settings:
- **Auth → URL configuration:** Site URL `https://tapkit.app`; redirect URLs `tapkit://**` (mobile deep links for email confirmation and password reset).
- **Auth → Email:** enable confirmations, configure a custom SMTP sender (the built-in sender is rate-limited), customise the templates.
- **Auth → Passwords:** minimum length 8; consider leaked-password protection.
- Review **Advisors** (security and performance) after the first push.
- Enable **Point-in-time recovery** / backups on a paid plan before launch.

## 2. Web app (Vercel or any Node host)

- Project root: `apps/web`; install command `pnpm install`; build command `pnpm --filter @tapkit/web build`.
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPPORT_EMAIL`, and later `NEXT_PUBLIC_APP_STORE_URL`.
- Point your domain at it. The privacy policy (`/privacy`), terms (`/terms`) and support (`/support`) URLs are needed for App Store Connect.
- Fill in the bracketed operator details in the privacy policy and terms, and get them reviewed.

## 3. iOS app (EAS)

```bash
cd apps/mobile
npx eas-cli login
npx eas-cli init                         # creates the EAS project; set EAS_PROJECT_ID
# Set env vars for the "production" environment in EAS (EXPO_PUBLIC_*), e.g.
npx eas-cli env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value https://<ref>.supabase.co
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios --profile production   # uploads to App Store Connect / TestFlight
```

Set `submit.production.ios.ascAppId` in `eas.json` to your App Store Connect app id.

## 4. GitHub

No GitHub credentials were available where this was built, so the repository is local only:

```bash
gh repo create <you>/tapkit --private --source . --remote origin --push
# or
git remote add origin git@github.com:<you>/tapkit.git && git push -u origin main
```

`.github/workflows/ci.yml` runs typecheck, lint, unit tests, the web build, the iOS bundle, Deno tests, and the integration suites against a local Supabase stack. The CI workflow has not been run yet.
