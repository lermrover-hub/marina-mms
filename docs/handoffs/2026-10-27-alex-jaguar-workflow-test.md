# Marina MMS — Alex / Jaguar Workflow Test Handoff

Date: 2026-10-27
Environment: Vercel Preview + staging Supabase only
Production: not touched

## Saved goal

Complete the Marina MMS staging workflow for Customer → Boat → Berth/Hardstand → Recurring Billing → Service Request → Quotation → Finance Gate → Service Order → Work Order, while preserving the existing workflow, preventing real customer messages and real-money transactions, and documenting every blocking business-rule or UI issue with screenshots.

## Test scenario

- Customer: Alex Test (synthetic staging customer)
- Boat: Jaguar
- Builder/model: Chaparral 370 Signature
- Owner is captain / operational contact
- Usage: private
- LOA: 37 ft
- Storage: hardstand, C-1
- Period: 22/09/2026–22/12/2026
- Boat stands: 7
- Repair contractor: selected by the boat owner
- Billing: monthly recurring
- No real customer notification

## Records created in staging

- Customer ID: `21faba51-2d29-409e-a04b-bf6ed1549126`
- Boat ID: `d9b27d56-d5b9-4775-b72c-8ed8f2310302`
- Contract: `CTR-202610-0001`
- Contract ID: `6486a9bd-6740-4ff6-b55e-846c5268657b`
- Service Request: `SR-145223`
- Service Request ID: `0ddf92fc-3e33-45f1-b555-5abd4142e5ac`
- Quotation: `DRAFT-1792256148720`
- Quotation ID: `eea39bb7-acf6-4c50-b8ea-bf50a51bd691`

## Verified pricing

| Item | Calculation | Amount before VAT |
|---|---:|---:|
| Monohull repair yard monthly (`REPAIR_MONO_M`) | 37 ft × THB 800 | THB 29,600 |
| Boat stands monthly (`STAND_MONTH`) | 7 × THB 700 | THB 4,900 |
| Monthly subtotal | | THB 34,500 |
| VAT 7% | | THB 2,415 |
| Monthly total | | THB 36,915 |

The recurring-billing dry run for October 2026 produced one proposed invoice for THB 36,915, due 31/10/2026. No invoice was generated because broad automation writes remain disabled.

## Workflow results

### Passed

- Customer and boat registration completed.
- Owner-as-captain selection saved.
- C-1 hardstand assignment completed.
- Three-month dry-storage contract created and activated.
- Recurring-billing dry run calculated correctly.
- Service Request created with Yard Service and owner-appointed contractor.
- Quotation generated from canonical Pricing Master items.
- Internal quotation approval completed.
- Server correctly rejected Finance credit clearance before customer delivery (`409`).
- Server correctly rejected Work Order creation before payment clearance and Service Order confirmation (`409`).
- 23 principal authenticated routes returned HTTP 200; no dead route was found in this route-level audit.

### Blocked

The test could not legitimately continue to Finance clearance, Service Order, or Work Order.

1. Preview Safe Mode intentionally prevents real customer delivery. The quotation stays `APPROVED`; `customer_sent_at` remains null. Finance requires quotation status `SENT`, `ACCEPTED`, or `CONVERTED`.
2. Service Request workflow fields exist both as database columns and legacy JSON inside `notes`. The GET handler merges legacy metadata over current columns. After insurance was changed to `VERIFIED` in the database, the page still read legacy `REQUESTED`.
3. The same dual-source problem affects payment mode: UI/legacy metadata shows `CREDIT`, while the database column still contains `FULL_PREPAYMENT`. The Work Order server check therefore reports `FULL_PREPAYMENT: AWAITING_PAYMENT`.
4. Because successful column updates do not also refresh the legacy metadata, the workflow can remain permanently stale even after valid actions.

## Business-rule and UI findings

1. Customer form requires last name and phone even for a single-name customer, encouraging placeholder data.
2. Beam and Draft show decimal examples but the numeric fields reject decimal input because a decimal step is not configured.
3. Chaparral 370 Signature is not available in Boat Spec DB; dimensions require manual verification.
4. C-1 displays a legacy THB 3,500/month slot price that conflicts with canonical Pricing Master hardstand pricing.
5. The contract stores one monthly amount and does not preserve the same visible line-item snapshot as the quotation.
6. Standard contract wording says payment is due within 7 days, while this scenario uses monthly/30-day credit.
7. Service Request displays Request Menu = `RAMP SERVICE` although the selected service is `YARD SERVICE`.
8. Finance select visually defaults to `PAID` while disabled and the actual status is `AWAITING PAYMENT`.
9. The initial required amount THB 5,358.75 is derived from committed cost, but the UI does not explain that rule clearly.
10. Running both the recurring contract and Service Request quotation for the same monthly storage creates a duplicate-billing risk unless they are explicitly linked or one path is marked non-billable.
11. Pricing records used by this test still identify source version v3.5; the active master also contains mixed v3.5/v3.6 data, so v3.7 migration status must be verified separately.

## Recommended next implementation

1. Fix the Service Request compatibility layer so current database columns are authoritative, or update the legacy JSON atomically with every workflow change.
2. Add a staging-only, audited `Mark as manually delivered` action. It must not send an email/LINE/WhatsApp message and must not be available in Production without authorization.
3. Re-run the same record through `CREDIT_APPROVED` → Confirm Service Order → Create Work Order.
4. Link the recurring contract and Service Request billing scope to prevent duplicate charges.
5. Keep `ENABLE_REAL_CUSTOMER_MESSAGES`, `ENABLE_AUTOMATION_WRITES`, and real payment writes disabled during the rerun.

## Screenshot evidence

Folder:

`C:/Users/asus/.codex/visualizations/2026/09/09/01a08738-d37c-7750-bfb0-7dc32deacbc4/workflow-test-alex-jaguar-2026-10-17`

Files:

1. `01-dashboard.png`
2. `02-customer-form.png`
3. `03-customer-created.png`
4. `04-boat-form-owner-captain.png`
5. `05-boat-created-owner-captain.png`
6. `06-c1-available.png`
7. `07-c1-assignment-form.png`
8. `08-c1-assigned-jaguar.png`
9. `09-contract-active.png`
10. `10-recurring-contract.png`
11. `11-service-request-workflow-blocked.png`
12. `12-quotation-approved.png`
13. `13-recurring-dry-run-preview.png`
14. `15-payment-gate-blocked-by-preview-safe-mode.png`

## Cleanup completed

All temporary `codex-e2e-*` login rows created solely for browser automation were removed from `public.users` and verified absent. The Alex/Jaguar workflow records remain in staging for the continuation test.

## Continuation — canonical workflow fix (2026-10-27)

### Code changes

- Added `mergeWorkflowMetadata()` in `lib/service-workflow-compat.ts`. Canonical Service Request columns now win; the `__MMS_WORKFLOW__` notes marker is used only when a column is null.
- Service Request GET/PATCH now use that merge rule. Successful workflow updates also refresh the legacy marker for compatibility.
- Work Order validation now reads the same canonical-first effective state.
- Added a Preview-only `mark_staging_delivered` quotation action and UI confirmation. It records `SENT` / `customer_sent_at` for workflow testing without sending email, LINE, or WhatsApp, and is blocked when `VERCEL_ENV=production`.
- Finance payment selector now defaults from the returned payment mode/status instead of visually defaulting every request to `PAID`.

### Validation

- `npx tsc --noEmit`: PASS.
- `npm test`: PASS — 134/134 tests.
- Local `npm run build`: reaches compilation/type validation, then stops because this checkout has no local Supabase environment variables.
- Commit: `39760ab` (`fix(workflow): keep canonical service request state in staging`); pushed to `codex/v37-catalog-admin`.

### Preview status

Vercel Preview deployment `https://marina-c87zyfmu1-lermrover-hubs-projects.vercel.app` was attempted, but failed during Next.js page-data collection because the branch has no `SUPABASE_SERVICE_ROLE_KEY`. No production deployment was made. The branch lacks the existing staging secret configuration used by the older `feature/orm-tide-prediction-engine-20261016` preview. This must be configured by an authorized project administrator before authenticated E2E can continue.

### Current staging evidence

The synthetic Alex/Jaguar Service Request currently has canonical DB state `QUOTATION_DRAFT`, `insurance_status=VERIFIED`, `payment_mode=FULL_PREPAYMENT`, `payment_gate_status=AWAITING_PAYMENT`, and `quotation_id=NULL`; the legacy marker still contains the prior `CREDIT` and quotation ID values. This is the exact dual-source mismatch the code fix prevents from being silently presented as current state. The linked synthetic quotation remains internally `APPROVED` with no customer delivery timestamp. No real payment or customer message was recorded.

## Controlled quotation test delivery (2026-10-29)

During Preview testing, quotations may be sent by email to the controlled test
recipient `lermrover@gmail.com`. They must not be sent to the customer's real
email, LINE, or WhatsApp channels. Production must never use this override.

The implementation is opt-in and fail-closed through these Preview-only
environment variables:

- `ENABLE_TEST_QUOTATION_EMAILS=true`
- `MMS_TEST_QUOTATION_RECIPIENT=lermrover@gmail.com`

When enabled, the response records that the email was sent to the test
recipient and keeps the real customer messaging flag separate. Finance,
payment confirmation, and Work Order gates remain unchanged.

The Preview branch now has the two test-recipient flags plus the Staging
Supabase service-role and Auth secrets configured. A fresh deployment is
required after this environment update; the earlier deployment was built
before the secrets were attached and is not valid evidence.
