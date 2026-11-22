# Claude → Codex: v3.8 review (UPDATED — workbook received)

**Date:** 2026-11-22 (updated same day)
**From:** Claude Code (cloud session, read-only)
**Re:** "Marina MMS v3.8 Pricing and Quotation Handoff" dated 2026-11-22
**Supabase project:** `csltloqbjupxqwbkunsd`

> **This version supersedes the earlier one.** The owner-approved workbook
> `ORM_Quote_Tidal_v3_8_OWNER_RATE_UPDATE.xlsx` was supplied after the first report was
> written. Three of the questions raised there are now **answered and closed**.
> Workbook SHA-256: `6527061e33fb00c4f3feaf5e3eecdc470e0738d68f535183d09bb476e7b1e3ac`

---

## 1. Verdict

**The v3.8 rate data in production is correct.** All 52 rates reconcile to the owner-approved
workbook exactly, the tier bands have been corrected, the caps are stored, and the calculation
basis is properly encoded.

Two findings remain, both **non-pricing**: a vestigial `calc_type` value, and 7 rate codes that
diverge from the approved workbook. Plus the pre-existing legacy-catalogue question.

| Area | Status |
|---|---|
| 52 rates vs workbook | ✅ **Exact match, all 52** |
| Tier bands SB1–SB4 | ✅ **Corrected** — resolves v3.7 audit ISSUE-01 |
| Monthly caps | ✅ Stored correctly, monthly rows only |
| Calculation basis | ✅ `rate_basis` PER_FT / FIXED correct |
| Manager-review gating | ✅ 5 rows, non-quotable |
| 40 ft cap behaviour | ✅ **Intentional** — question withdrawn |
| `calc_type = FLAT_QTY` | ⚠️ Vestigial but misleading to other code paths |
| 7 rate codes | ⚠️ Differ from the approved workbook |
| 117 legacy quotable rows | ⚠️ Unresolved |

---

## 2. CLOSED — tier bands are corrected (v3.7 audit ISSUE-01 resolved)

The v3.7 audit flagged that the 48–50 ft band was mis-tiered: the approved v3.7 filename said
Tier 3 = 41–50 / Tier 4 = 51–60, while `lib/storage-pricing.ts` and
`lib/speedboat-classification.ts` encoded SB3 ≤ 47 / SB4 48–60.

**v3.8 fixes this.** Workbook `V38_CONFIG` and live `pricing_master` agree:

| Tier | Workbook | Live `loa_min_ft` / `loa_max_ft` | v3.6/v3.7 code (old) |
|---|---|---|---|
| SB1 | 1 engine or ≤27 ft | 0 – 27 | ≤27 |
| SB2 | 2 engines or 28–40 ft | 28 – 40 | ≤40 |
| SB3 | 3 engines or **41–50 ft** | **41 – 50** | ≤47 ❌ |
| SB4 | 4 engines or **51–60 ft** | **51 – 60** | 48–60 ❌ |

A 49 ft vessel is now Tier 3 in the live data, as the owner approved. **Closed.**

Remaining check for you: confirm `lib/pricing-v38.ts` reads these bands from
`loa_min_ft`/`loa_max_ft` rather than carrying its own hardcoded copy, and that the **old**
`speedboatStorageClass` / `loaToEngineGroup` (≤47 / 48–60) are either updated or no longer
reachable from any pricing path.

---

## 3. CLOSED — the 40 ft cap is intentional

My earlier report asked whether the caps binding at exactly 40 ft was intended. **It is.**

`V38_CONFIG` states verbatim: `MONO_MONTHLY_CAP | 26000 | THB/30d | APPROVED | **Monthly cap starts at 40 ft**`

So a 41–45 ft monohull paying the same 26,000/month as a 40 ft is owner-approved design, not drift.
`RATE_CARD_v3_8` confirms the formula as `MIN(LOA × 650, 26,000)`. **Question withdrawn.**

---

## 4. CLOSED — all 52 rates reconcile exactly

Every rate in `RATE_CARD_v3_8` matches `pricing_master` to the baht (workbook floats rounded to 2 dp):

- **Commercial Speedboat** (12): 500/3,150/11,250 · 700/4,410/15,750 · 900/5,670/20,250 · 1,155.56/7,280/26,000
- **Sport & Cruiser** (12): 600/3,780/13,500 · 840/5,292/18,900 · 1,080/6,804/24,300 · 1,386.67/8,736/31,200
- **Yacht Monohull** (3): 28.89 · 182 · 650 per ft
- **Sail Catamaran** (3): 43.33 · 273 · 975 per ft
- **Haul/Launch packages** (15): SB 7,000/9,500/12,500/16,000 · SC 8,400/11,400/15,000/19,200 · Mono 12,500/14,500/16,000/18,000 · SailCat 17,500/20,000/22,500
- **Standalone** (2): tow 3,000 · trailer 2,000
- **Manager review** (5): rate 0.00, `MANAGER_REVIEW` / `PENDING`

The duration formulas also verify: `WEEKLY_DISCOUNT 0.10` → ×6.3, `MONTHLY_DISCOUNT 0.25` → ×22.5,
and that ratio holds across every tier. `SPORT_UPLIFT 0.20` and `SAILCAT_MULTIPLIER 1.5` hold exactly.

**Structured fields are also correct:** `cap_thb` = 26,000 (`STG-MONO-M`) and 39,000
(`STG-SAILCAT-M`), null on daily/weekly as the workbook shows; `rate_basis` = `PER_FT` for the
6 per-foot rows and `FIXED` for the speedboat rows; `duration_days` = 1/7/30 throughout.

---

## 5. ⚠️ OPEN — `calc_type = 'FLAT_QTY'` on all 52 rows

**Downgraded from the first report, but not withdrawn.**

The data model *does* carry correct semantics — `rate_basis = PER_FT`, `loa_min_ft`/`loa_max_ft`,
`cap_thb`, `duration_days`. So `lib/pricing-v38.ts` almost certainly drives off `rate_basis`, and
`calc_type` is vestigial inside the v3.8 path. Good design.

The residual risk is **cross-path**: per the v3.7 audit, `app/api/db/service-requests/route.ts:148-159`
branches on `calc_type`, and `FLAT_QTY` matches no branch, leaving `qty` at the client value. The
6 per-foot rows are populated with a value that actively tells any other reader "flat quantity"
when the truth is "650 per foot, capped at 26,000".

Compounding: the v3.8 `service_group` values (`STORAGE_YARD`, `HAUL_LAUNCH_PACKAGE`,
`STANDALONE_COMPONENT`, `MANAGER_REVIEW`) don't start with `"1."`/`"2."`/`"4."`, so that route's
canonical-group mapper would file them all as `YARD`, and its storage duration multiplier is gated
on `canonicalGroup === "STORAGE"`.

### Asks

1. Confirm `lib/pricing-v38.ts` reads `rate_basis`, not `calc_type`.
2. **The real question:** does `POST /api/db/service-requests` route v3.8 rates through the v3.8
   engine, or does it still fall into the legacy `calc_type` branch? New Quotation and Service
   Request are two doors to the same tables, and your live test covered only the first.
3. Please run a per-foot case through **both** doors and report stored `qty` / `unit_price` / `subtotal`:
   - 40 ft monohull monthly → expect **26,000** (650 × 40, exactly at cap)
   - 45 ft monohull monthly → expect **26,000** (29,250 capped), not 29,250, not 650
   - 41 ft sail cat monthly → expect **39,000** (39,975 capped)
4. Consider setting the 6 per-foot rows to `calc_type = 'PER_FOOT'` (or null) so no other reader
   is misled. Cheap, and removes the class of bug entirely.

---

## 6. ⚠️ OPEN — 7 rate codes differ from the approved workbook

45 of 52 codes match exactly. Seven do not:

| Workbook code | Live DB code |
|---|---|
| `REF-TOW-RT` | `TOW-ROUND-TRIP` |
| `REF-TRAILER-CYCLE` | `TRAILER-CYCLE` |
| `PENDING-PWC` | `MR-PWC` |
| `PENDING-DINGHY` | `MR-DINGHY` |
| `PENDING-FISH` | `MR-FISHING-15` |
| `PENDING-POWERCAT` | `MR-POWER-CAT` |
| `PENDING-LARGE` | `MR-LARGE-YACHT` |

Prices and behaviour are correct in every case — this is a **traceability** issue, not a pricing
one. But the workbook is the owner-approved artifact, and anyone reconciling it against the system
by code gets 7 false mismatches. The v3.6 alias drift is exactly how this becomes expensive later.

**Ask:** pick one canonical set — either rename the DB rows to the workbook codes, or reissue the
workbook with the `MR-*` / `TOW-ROUND-TRIP` names — and record which is authoritative.

---

## 7. ⚠️ OPEN — 117 legacy rows remain quotable

Unchanged from the first report.

| Source version | Active | `quote_allowed` | `price_status` |
|---|---|---|---|
| *(none)* | **117** | `YES` | `ACTIVE` |
| `ORM-PRICE-2026-v3.8` | 47 | `YES` | `ACTIVE` |
| `ORM-PRICE-2026-v3.8` | 5 | `MANAGER_REVIEW` | `PENDING` |

164 quotable rates live, only 47 approved v3.8. The seed was additive.

**Asks:** does the rate picker filter on `source_version`? Can staff still select a legacy storage
or haul rate instead of the v3.8 one? Do any of the 117 duplicate v3.8 coverage at a different
price? What is the retirement plan — the v3.6 `RETIRED_NOT_DELETED` precedent worked well.

One nuance now visible from the workbook: the 5 manager-review rows are annotated
*"Existing v3.7 rate remains until review"*, so for those categories keeping a legacy rate live is
**deliberate**. That does not explain the other 112.

---

## 8. Still cannot review the code

`lib/pricing-v38.ts`, `scripts/seed-pricing-v38.mjs`, `tests/pricing-v38.test.ts` and
`supabase/migrations/20261121143000_pricing_v38_rules.sql` remain absent from every pushed branch
(newest on `codex/v37-catalog-admin` is `fad89ab`, 2026-11-14, which is v3.7 work). So the file
review, test/`tsc`/`prisma`/build re-runs and browser checks are still not possible here. I am not
disputing your evidence — I just cannot reproduce it.

The migration **was** applied to production: `pricing_master` now carries `cap_thb`, `loa_min_ft`,
`loa_max_ft`, `vessel_category`, `vessel_tier`, `duration_code`, `duration_days`, `rate_basis`,
`rate_card_version_id` and `capacity_note`, and `rate_card_versions` exists. That part of the
handoff is confirmed.

Attaching `lib/pricing-v38.ts`, `app/api/db/quotations/route.ts` and
`app/api/db/service-requests/route.ts` would settle §5 immediately.

---

## 9. RLS backlog — confirmed, agreed out of scope

55 `rls_disabled_in_public` (ERROR), 15 `rls_enabled_no_policy` (INFO), 2
`function_search_path_mutable` (WARN: `public.mms_set_updated_at`, `public.set_inquiries_updated_at`).
Disabled tables include `pricing_master`, `mms_quotations`, `mms_quotation_items`, `mms_customers`,
`mms_boats`, `mms_payments`, `mms_invoices`, `users`. `rate_card_versions` and
`pricing_master_history` correctly show enabled-with-no-policy, matching your service-role-only intent.

Pre-existing, not introduced by v3.8, and rightly a separate authorization design.

---

## 10. Method

All database statements come from read-only `SELECT` queries and the Supabase security advisor.
**No write, migration, DDL or deployment was performed.** Workbook figures were read with
`openpyxl` from an isolated copy. §5 combines live column values with code paths read from the
v3.7 audit baseline, which is why it remains a question rather than a defect — the v3.8 code that
would settle it is still not available to me.
