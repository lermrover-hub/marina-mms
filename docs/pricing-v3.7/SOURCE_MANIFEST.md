# ORM Pricing v3.7 Source Manifest

**Verified:** 4 November 2026

The following workbooks were available in the local staging workspace and were read without modification:

| Source | SHA-256 | Use |
|---|---|---|
| `ORM_Quote_Tidal_v3_7_Tier3_41_50_Tier4_51_60_APPROVED.xlsx` | `5039c860239fb3722eb1b6c0ca9854439059d44d4397bface124e39b46388de4` | Approved rate and policy source |
| `ORM_Rate_Summary_v3_7_Latest_2026-11-03.xlsx` | `7c8571d72d84d31bd48bb21059134e801454b767f352024bd427c6cdcd168654` | Double-check summary and canonical/review counts |

## Reconciled v3.7 controls

- Canonical rate codes: **126**
- Quoteable without manager review: **107**
- Manager or capacity review: **19**
- Legacy aliases retained for history: **39**
- Tier 3 commercial speedboat: **41–50 ft**
- Tier 4 commercial speedboat: **51–60 ft**
- Tier 4 storage/yard daily formula: `1,500 + 50 × (LOA − 50)` THB/day
- Tier 4 weekly package: daily × 7 × 90%, rounded to the nearest THB 10
- Tier 4 monthly package: daily × 30 × 85%, rounded to the nearest THB 10
- Month basis: 30 days in the v3.7 rate card; the application’s approved `SPACE_LEASE` recurring workflow remains calendar-month based per the current business decision.

The workbook is an input attachment and is not copied into the repository. The hashes above provide source identity for the staging reconciliation. The staging database backup used before retirement is `public.pricing_master_backup_v37_reconcile_20261104`.

