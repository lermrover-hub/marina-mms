# Debug Report - Production Auth

Date: 2026-05-25

## Failing Session

Production deployment smoke test on `https://marina-mms.vercel.app`.

## Bug Found

Sign in failed on production because NextAuth endpoints returned `500 TypeError: Invalid URL`.

Affected routes:

- `/api/auth/csrf`
- `/api/auth/providers`
- `/api/auth/callback/credentials`

Secondary symptom:

- `/api/db/*` routes redirected to `/login` because a valid session could not be established.

## Expected Behavior

- `/api/auth/csrf` returns `200`.
- `/api/auth/providers` returns production callback URLs.
- Credentials login succeeds.
- Authenticated dashboard pages and `/api/db/*` routes return `200`.

## Actual Behavior

- Vercel logs showed `TypeError: Invalid URL` for auth routes.
- `/api/auth/providers` returned `http://localhost:3000/...` callback URLs during one deploy.

## Root Cause

The Vercel build/runtime was receiving localhost auth URL values from local/project environment context. Auth.js then generated invalid or wrong callback URLs for production.

## Fix Applied

Updated `auth.ts`:

- Added `trustHost: true`.
- On Vercel runtime, ignore `AUTH_URL` and `NEXTAUTH_URL` when they contain `localhost`.

Commits:

- `7682da8` - Fix production auth host trust
- `a4c9fed` - Ignore localhost auth URLs on Vercel

## Retest Result

Production URL:

- `https://marina-mms.vercel.app`

Passed:

- `/login`: `200`
- `/api/auth/csrf`: `200`
- `/api/auth/providers`: `200`, callback URL is `https://marina-mms.vercel.app/api/auth/callback/credentials`
- `/api/auth/callback/credentials`: `302`, Vercel log status `200`
- `/dashboard`: `200`
- `/customers`: `200`
- `/boats`: `200`
- `/berths`: `200`
- `/berths/management`: `200`
- `/utility-readings`: `200`
- `/payments`: `200`
- `/quotations`: `200`
- `/reports`: `200`

Authenticated APIs passed:

- `/api/db/dashboard`
- `/api/db/customers`
- `/api/db/boats`
- `/api/db/berths`
- `/api/db/invoices`
- `/api/db/payments`
- `/api/db/quotations`
- `/api/db/service-requests`
- `/api/db/work-orders`
- `/api/db/reports`

Vercel logs after retest showed only `200`/expected `302` responses and no new auth errors.

## Remaining Risks

- Lint still reports warnings for unused imports in `app/(dashboard)/staff/kpi/page.tsx` and existing `any` usage in `auth.ts`; these are warnings, not blocking errors.
- Direct deployment URLs are not the stable test target. Use the production alias for the 30-day test window.
