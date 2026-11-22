# Ramp rate scope — 23 November 2026

## Owner decision

The Ramp rate catalogue is for Speedboat and Sport & Cruiser only, with truck ramp access retained. Fishing-boat rates may be introduced later. Yacht monohull and both catamaran types do not have Ramp prices.

## Staging correction

Applied `scripts/staging-v38-ramp-scope.sql` to Supabase staging project `zanlunbgupdtqznruzok` after a rollback rehearsal. It deactivated and blocked quotation for these six rows:

| Code | Reason |
| --- | --- |
| `RAMP-V38-MONO` | Yacht monohull Ramp not offered |
| `RAMP-V38-POWERCAT` | Power catamaran Ramp not offered |
| `RAMP-V38-SAILCAT` | Sail catamaran Ramp not offered |
| `RAMP_FISH_LT15_SELF` | Fishing Ramp deferred |
| `RAMP_JETSKI` | Outside the approved Ramp scope |
| `RAMP-V38-DINGHY` | Outside the approved Ramp scope |

Rows and history remain in the database for audit; they are absent from the default Active rates view and the quotation rate picker. The three Yacht rows were already inactive but still allowed manager review; their `quote_allowed` is now `NO`. The old fixed-tier staging rollout is a historical script and is not edited; this corrective script supersedes its Ramp placeholders.

`RAMP_BIG_TRUCK` and `RAMP_SMALL_TRUCK` remain active at their existing prices. Speedboat rates remain as-is. `RAMP-V38-SC1` through `SC4` remain pending at THB 0 and manager review: no approved Sport & Cruiser Ramp prices were found, so none were invented.

## Validation

- Supabase readback confirmed six blocked rows, two active truck rates, and all four Sport & Cruiser placeholders still pending.
- Protected Vercel Preview UI showed the allowed Ramp rows and excluded the six blocked rows under the default Active rates filter. Saving test quotation drafts for an existing speedboat Ramp rate and unrelated v3.8 rates still worked; temporary records were removed. Readback showed zero temporary QA users and quotations.
- The quotation creation page exposed a pre-existing hydration mismatch when the server and browser use different dates. Its expiry preview now initializes after mount, without changing the saved quotation calculation. The full Preview smoke test passed without browser page errors after this fix.
- Preview deployment `dpl_4qhVmKeMnC4FFfqWJYY6RBCFF2iz` is READY at `https://marina-mms-v38-review-3bkk4yamc-lermrover-hubs-projects.vercel.app`. It is protected by Vercel authentication. TypeScript, changed-file ESLint, focused v3.8 tests (10/10), and Preview-environment build passed. The broader `npm test` still has an existing Node path-alias loader failure in `tests/auth-user.test.js` (40/41 pass).
- No production database or deployment was changed by the staging correction.
