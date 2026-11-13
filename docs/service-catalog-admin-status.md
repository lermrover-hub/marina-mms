# Service Catalog Admin — implementation checkpoint

Date: 2026-10-14. Branch: `codex/v37-catalog-admin`.

## Implemented in source

- Settings links to `/settings/service-catalog`.
- Super Admin-only page and GET/POST/PATCH API.
- Vessel types, main service groups and child services, bilingual names, stable codes, draft/active/retired states.
- Optional vessel length and engine bounds; usage remains separate metadata.
- Additive migration with restricted database access, parent validation, atomic history and optimistic version checks.
- No delete endpoint. No existing pricing, vessel, quotation or invoice tables changed.
- Writes default off and require both `ENABLE_CATALOG_ADMIN_WRITES=true` and the exact approved staging project URL.

## Verified

- TypeScript check passed.
- Targeted ESLint passed.
- Node test suite: 131 passed, including catalog validation and mapping tests.
- Build compiled and completed type/lint checks but failed collecting page data: existing `/api/db/berth-assignments` requires a Supabase URL not configured in this shell. Full build is NOT passed. Existing unrelated lint and auth Edge Runtime warnings remain.
- Before migration, read-only checks confirmed project `zanlunbgupdtqznruzok` is `marina-mms-staging` and both new tables were absent.
- Following explicit user approval, applied only `configurable_service_catalog` on staging, version `20261014152729`. Local filename aligned to the server-assigned version to prevent duplicate replay.
- Executed `tests/service-catalog-staging.sql` against staging with anon, authenticated and service_role contexts: passed. Covers inserts, duplicate rejection, invalid bounds, immutable identity, parent/child retirement, stale version rejection, before/after audit, no delete and no history mutation.
- Test transaction rolled back. Follow-up query confirmed catalog rows = 0, history rows = 0, both tables have RLS enabled. Sequence values may advance despite rollback, as expected in PostgreSQL.
- Security advisor returned INFO-only RLS-without-policy notices, including the two new tables. Intentional server-only access: anon/authenticated grants revoked; server API enforces Super Admin. See [Supabase advisory explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). No unrelated table policies modified.

## Rate Card connection (2026-10-14)

- Applied staging-only migration `20261014154525_catalog_rate_links`; adds unique nullable price FK to child services, not a new price table.
- Imported 48 existing category labels and linked 132 currently active rates using `scripts/seed-catalog-from-current-rates.sql`. No prices or existing documents modified. Import created 180 catalog audit entries.
- Before/after fingerprint of all 156 pricing rows: `3a4d2f1a45bfe6ed20dc8c25ab7128a0` (unchanged).
- Read-only live test `scripts/verify-catalog-staging.mjs` verified all 132 linked rates preserve every original price field, category and operational section.
- Transactional staging checks rejected duplicate price mappings, linking a price to a vessel type, and nonexistent price IDs. All test writes rolled back.
- Service Request uses catalog display labels and suppresses inactive mapped services. The server independently checks availability before creating new requests. Historical documents and pricing calculations untouched; unlinked rates retain existing behavior.
- Local server on port 3004 uses the verified staging environment, with catalog writes/links enabled for this process only. AI/automation/customer-message switches remain off. No persisted environment settings changed.

## Remaining validation

- ACTIVE remains catalog metadata status, not operational approval. No new vessel classifications or v3.7 prices were imported.
- Browser connector timed out. Regular Playwright with installed Chrome was used; login renders at 1440x1000 and 390x844 with no page errors or mobile horizontal overflow. Protected catalog API redirects unauthenticated access to login (307). Initial 200 was the followed login redirect, not authorized API access.
- After user Super Admin sign-in, real Admin GET returned 180 catalog rows and linked Rate Card GET returned 132 rates. Opened Foam wash and verified its dropdown points to the original FOAM_FT price ID; saved unchanged fields through the form (PATCH 200, version 1 to 2). No business values changed; the save adds an audit entry.
- Admin screenshot captured outside the repo; page rendered without an error overlay. Opened Service Request and confirmed the existing three-step form renders. Browser automation timed out waiting for a native option to become visible and reset its session before service selection; this is NOT evidence of an application failure. New test browser is awaiting sign-in. Service selection, mobile authenticated UI and full submit/quotation workflow remain unverified. No authentication bypass or test account was added.
- Simultaneous-session concurrency remains untested.
- Browser follow-up after second login: verified UAT TestCustomer / UAT TestVessel (28 ft), Tow in without Haul-out, Yard category -> FOAM_FT, duplicate rejection, manual quantity 28 -> THB 2,800, and Review Draft. Verified Storage 10 days -> SB2 week x1 plus day x3 (2475 + 412.5 x3 = 3712.50); existing whole-baht formatter displays 3713. Desktop 1440x1000 and mobile 390x844 checked; no horizontal overflow or framework overlay. No submit, document creation, payment, customer delivery or production writes performed.
- Findings: existing LOA_RATE_QTY calculation type is not recognized by Service Request's UI/server auto-quantity branches, so FOAM_FT defaults to quantity 1 rather than vessel LOA. Test explicitly entered 28 manually; automatic per-foot behavior is NOT passed. Existing customer-contacts endpoint returns HTTP 500 with opaque `[object Object]`; cause not yet established. Neither issue was silently corrected as part of catalog testing. Screenshots are outside repository in the temporary `marina-ratecard-verified-NxEQ5Z` folder.
- Audit history is stored by the proposed database trigger, not yet exposed in the UI.

## Next gates

1. DONE: isolated additive migration on approved staging only; no blanket migration push.
2. DONE: SQL integration assertions. Next validate HTTP authorization and simultaneous-session conflicts.
3. Map existing vessel/service identifiers and approved workbook rows before importing; preserve historical identifiers and prices.
4. DONE: linked Service Request picker and server validation; preserved safety and approval gates.
5. Test actual Admin and staff screens before declaring ready for user testing.

No production changes, push, merge or deployment performed.
