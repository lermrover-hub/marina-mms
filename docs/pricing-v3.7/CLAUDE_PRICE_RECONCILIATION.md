# Claude Price Reconciliation — ORM Marina MMS v3.7

**Audit date:** 2026-11-02
**Code and data source:** `origin/codex/v37-catalog-admin` @ `53a8f0e`
**Canonical rate data in repository:** `scripts/pricing-v3.6-final-merged.json`
**Declared source of that data:** `ORM_Rate_Structure_v3_6_FINAL_MERGED.xlsx`, SHA-256 `AAA63443ABD839508D063B5029159B0E1A05A31A7621A73D5B8D6073C6243203`, version string `"ORM Pricing Structure v3.6 FINAL_MERGED"`

---

## 1. Reconciliation status

A three-way reconciliation was requested:

```
(1) Approved Excel v3.7  ↔  (2) Summary workbook v3.7  ↔  (3) Pricing Master implementation
```

| Side | Reachable? | Notes |
|---|---|---|
| (1) `1-ORM_Quote_Tidal_v3_7_Tier3_41_50_Tier4_51_60_APPROVED.xlsx` | **No** | Local-only file under `.codex-remote-attachments` on a Windows machine. Not committed. Not reachable from this cloud session; Remote Control is not configured. |
| (2) `ORM_Rate_Summary_v3_7_Latest_2026-11-03.xlsx` | **No** | Local-only file under `artifacts/`. `artifacts/` does not exist in any branch. |
| (3) Pricing Master implementation | **Yes** | Fully audited: schema, access layer, calculation paths, canonical committed rate data. Live table contents remain BLOCKED (no staging credentials). |

**Therefore no per-row price reconciliation is produced in this document.** Fabricating added/missing/changed rows or price deltas would violate the audit's own constraint ("Do not invent missing prices"). What follows is (a) the complete canonical rate set that *is* committed, so the workbook can be diffed against it the moment it is available, and (b) the specific discrepancies that could be established **without** the workbook.

Repository-wide spreadsheet search result, for the record: exactly one spreadsheet-class file exists on the audited branch — `docs/pricing-v3.6/RATE_RECONCILIATION.csv`. No `.xlsx` or `.xls` file exists anywhere.

---

## 2. Discrepancies established without the workbook

### 2.1 Version lineage — the implementation is not v3.7

| Signal | Value |
|---|---|
| v3.7 references in all code/data/docs | **2 files only** — `docs/handoffs/2026-10-27-alex-jaguar-workflow-test.md` and an unrelated `package-lock.json` string |
| Canonical data version string | `ORM Pricing Structure v3.6 FINAL_MERGED` |
| Branch's own handoff note | *"Pricing records used by this test still identify source version v3.5; the active master also contains mixed v3.5/v3.6 data, so v3.7 migration status must be verified separately."* |
| Test assertion still in force | `tests/pricing-accounting.test.js` test 11 — *"generated rate card preserves **v3.5** pricing and zero operational discount"* |
| Hardcoded version strings in runtime messages | `lib/storage-pricing.ts`, `service-requests/route.ts:170`, `new/page.tsx:238`, stored `storageNote` — all say **v3.6** |

**Conclusion:** the gap between the approved v3.7 workbook and the implementation is a **full version migration**, not incremental drift.

### 2.2 Tier boundary conflict — the 48–50 ft band

This is derivable from the approved workbook's **filename alone** (`Tier3_41_50_Tier4_51_60`), so it does not depend on opening the file.

| Source | Tier 3 / SB3 | Tier 4 / SB4 |
|---|---|---|
| v3.7 approved workbook (filename) | **41–50 ft** | **51–60 ft** |
| `lib/storage-pricing.ts` → `speedboatStorageClass` | ≤ 47 ft | 48–60 ft |
| `lib/speedboat-classification.ts` → `loaToEngineGroup` | ≤ 47 ft | 48–60 ft |
| `scripts/pricing-v3.6-final-merged.json` → `SB3_HAUL_LAUNCH` | `"loa": "41-47 ft"` | — |
| `scripts/pricing-v3.6-final-merged.json` → `SB4_HAUL_LAUNCH` | — | `"loa": "48-60 ft"` |
| Historical retired alias | — | `STORE_SB_4ENG_48_55_M` (SB4 was once 48–55) |

**Impact of the 48–50 ft band moving from SB4 to Tier 3:**

| Area | Current behaviour for a 49 ft vessel | Behaviour required by v3.7 |
|---|---|---|
| Storage class | `SB4` | Tier 3 (SB3) |
| Storage rate codes | `SB4_W4_*` or `SB4_B1_*` | `SB3_STORAGE_DAY/WEEK/MONTH` |
| Physical slot | **W4 or B1 mandatory** (`validateSb4Storage` throws otherwise) | `ANY_APPROVED` — no slot constraint |
| Storage method | W4 → trailer only; B1 → boat stands only | unconstrained |
| Haul-out rate | `SB4_HAUL_LAUNCH` 18,000 full / 13,500 soft, `MANAGER_REVIEW`, *"reference price only"* | `SB3_HAUL_LAUNCH` 12,500 full / 9,375 soft, `MANAGER_REVIEW` |
| Engine group | 4 | 3 |

So a 49 ft vessel is currently forced into a slot-gated, oversized-reference-priced class. Under v3.7 it should be a Tier-3 vessel with no slot constraint and a materially lower haul-out rate (**13,500 → 9,375 soft**, a 4,125 THB difference per round trip). Both classifier functions, the `loa` labels, and potentially the rate rows themselves must change together.

### 2.3 Baseline count conflicts

| Expected v3.7 baseline | Repository-documented v3.6 value | Source | Delta |
|---|---|---|---|
| Canonical rates **126** | **127 → 126**, then **126 → 132** | `ISSUE-3-IMPLEMENTATION.md:14`; `STAGING_READINESS_2026-10-12.md:12` | **+6** vs the 126 baseline. 13 canonical haul-out/yacht/catamaran rates were added after the 126 snapshot. |
| Quote allowed **107** | not documented | — | BLOCKED. Note 107 + 19 = 126, internally consistent with the 126 figure but not with 132. |
| Manager review **19** | not documented | — | BLOCKED |
| Active PENDING/BLOCKED **0** | *"W4 and B1 full rates remain pending; only approved soft rates are used."* | `STAGING_READINESS_2026-10-12.md:17` | **At risk.** Depends whether a pending `full_rate_thb` counts as a pending rate. |
| Legacy aliases retired **39** | **16** / **17 rows** / *"seven"* | `ISSUE-3-IMPLEMENTATION.md:17`; `RATE_RECONCILIATION.csv`; `STAGING_READINESS_2026-10-12.md:15` | **−22 to −23.** The repo's three figures also disagree with each other. |

### 2.4 Known data gap already documented in-repo

`STAGING_READINESS_2026-10-12.md` line 17: *"W4 and B1 full rates remain pending; only approved soft rates are used."*

This matters for the "Missing standard/full rates" integrity check: for the SB4 slot storage rates, `full_rate_thb` is expected to be **absent or unapproved**, while `rate_thb` (the soft rate) is populated. Any v3.7 check that requires a full rate on every row will flag these legitimately.

---

## 3. Canonical rate set committed in the repository

This is the complete reference set the workbook should be diffed against. All values are **THB, ex VAT**. `rate_thb` is the **soft / opening** price; `full_rate_thb` is the standard price; every row carries `source_discount_pct: 25` and satisfies `rate_thb = full_rate_thb × 0.75`.

Shared defaults applied to the speedboat-storage rows: `category` Storage, `service_group` `4. Storage`, `subgroup` `Speedboat storage v3.6`, `provider_type` `ORM Core Boatyard Service`, `revenue_gl_code` **4120**, `cost_gl_code` **5100**, `pnl_category` `C.Storage`, `cost_pnl_category` `Direct Service Cost (COGS)`, `discount_pct` **0**, `quote_allowed` `YES`, `price_status` `ACTIVE`, `is_active` `true`.

### 3.1 Haul-out and launch

| Code | Vessel category | LOA band | Unit | Calc type | Full | Soft | Quote allowed | Eligibility |
|---|---|---|---|---|---|---|---|---|
| `SB1_HAUL_LAUNCH` | SB1 | 15–27 ft | round trip | `FLAT_RATE` | 5,500 | 4,125 | `YES` | STANDARD IF APPROVED |
| `SB2_HAUL_LAUNCH` | SB2 | 28–40 ft | round trip | `FLAT_RATE` | 8,500 | 6,375 | `YES` | STANDARD IF APPROVED |
| `SB3_HAUL_LAUNCH` | SB3 | **41–47 ft** | round trip | `FLAT_RATE` | 12,500 | 9,375 | `MANAGER_REVIEW` | CHECK WEIGHT / LENGTH |
| `SB4_HAUL_LAUNCH` | SB4 | **48–60 ft** | round trip | `FLAT_RATE` | 18,000 | 13,500 | `MANAGER_REVIEW` | MANUAL TECHNICAL APPROVAL — *reference price only; SB4 classification does not authorize standard haul-out* |
| `YACHT_HAUL_LAUNCH` | MOTOR_YACHT | — | ft/round trip | `PER_FOOT` | 420 | 315 | `MANAGER_REVIEW` | MAX 42 ft / 12 t |
| `PCAT_HAUL_LAUNCH` | POWER_CATAMARAN | ~35 ft max | ft/round trip | `PER_FOOT` | 700 | 525 | `MANAGER_REVIEW` | APPROVAL REQUIRED |
| `SCAT_HAUL_LAUNCH` | SAILING_CATAMARAN | ~35 ft max | ft/round trip | `PER_FOOT` | 750 | 562.5 | `MANAGER_REVIEW` | APPROVAL REQUIRED |

Note: all haul-out rows are `service_group` `1. Haul-out & Launch`, which maps to canonical workflow section **RAMP** — the only section where `MANAGER_REVIEW` currently escalates (audit report §4.5).

### 3.2 Per-foot storage (yacht and catamaran)

| Code | Vessel category | Period | Unit | Calc type | Full | Soft | Note |
|---|---|---|---|---|---|---|---|
| `YACHT_STORAGE_D` | MOTOR_YACHT | DAY (1) | ft/day | `PER_FOOT` | 40 | 30 | Outdoor; storage eligibility separate from haul-out |
| `YACHT_STORAGE_M` | MOTOR_YACHT | MONTH (30) | ft/month | `PER_FOOT` | 700 | 525 | *"Thirty-day package; no unapproved weekly rate."* |
| `PCAT_STORAGE_D` | POWER_CATAMARAN | DAY (1) | ft/day | `PER_FOOT` | 60 | 45 | — |
| `PCAT_STORAGE_M` | POWER_CATAMARAN | MONTH (30) | ft/month | `PER_FOOT` | 1,050 | 787.5 | *"no unapproved weekly rate"* |
| `SCAT_STORAGE_D` | SAILING_CATAMARAN | DAY (1) | ft/day | `PER_FOOT` | 60 | 45 | — |
| `SCAT_STORAGE_M` | SAILING_CATAMARAN | MONTH (30) | ft/month | `PER_FOOT` | 1,050 | 787.5 | *"no unapproved weekly rate"* |

**There is no `*_STORAGE_W` row for any per-foot vessel category.** This is the data-side confirmation of the weekly per-foot gap (audit report §5.2 / matrix T08). If the v3.7 workbook contains a weekly yacht or catamaran storage rate, it is a **new row** requiring both a data migration and a code + test change.

### 3.3 Speedboat flat-package storage

| Code | Class | LOA band | Slot | Period | Full | Soft |
|---|---|---|---|---|---|---|
| `SB1_STORAGE_DAY` | SB1 | 15–27 ft | ANY_APPROVED | DAY (1) | 400 | 300 |
| `SB1_STORAGE_WEEK` | SB1 | 15–27 ft | ANY_APPROVED | WEEK (7) | 2,400 | 1,800 |
| `SB1_STORAGE_MONTH` | SB1 | 15–27 ft | ANY_APPROVED | MONTH (30) | 8,500 | 6,375 |
| `SB2_STORAGE_DAY` | SB2 | 28–40 ft | ANY_APPROVED | DAY (1) | 550 | 412.5 |
| `SB2_STORAGE_WEEK` | SB2 | 28–40 ft | ANY_APPROVED | WEEK (7) | 3,300 | 2,475 |
| `SB2_STORAGE_MONTH` | SB2 | 28–40 ft | ANY_APPROVED | MONTH (30) | 14,000 | 10,500 |
| `SB3_STORAGE_DAY` | SB3 | 41–47 ft | ANY_APPROVED | DAY (1) | — | — |
| `SB3_STORAGE_WEEK` | SB3 | 41–47 ft | ANY_APPROVED | WEEK (7) | — | — |
| `SB3_STORAGE_MONTH` | SB3 | 41–47 ft | ANY_APPROVED | MONTH (30) | — | — |
| `SB4_W4_DAY` | SB4 | 48–60 ft | **W4** (trailer only) | DAY (1) | pending | **700** |
| `SB4_W4_WEEK` | SB4 | 48–60 ft | **W4** | WEEK (7) | pending | **4,200** |
| `SB4_W4_MONTH` | SB4 | 48–60 ft | **W4** | MONTH (30) | pending | **18,000** |
| `SB4_B1_DAY` | SB4 | 48–60 ft | **B1** (boat stands only) | DAY (1) | pending | **900** |
| `SB4_B1_WEEK` | SB4 | 48–60 ft | **B1** | WEEK (7) | pending | **5,400** |
| `SB4_B1_MONTH` | SB4 | 48–60 ft | **B1** | MONTH (30) | pending | **19,500** |

SB4 soft rates above are **derived by executed computation**, not transcription: the committed test assertions (`tests/storage-pricing.test.js`, `scripts/test-pricing-v36-staging.mjs`) fix W4 at 7 d = 4,200 / 10 d = 6,300 / 30 d = 18,000 and B1 at 7 d = 5,400 / 10 d = 8,100 / 30 d = 19,500. The 10-day figures resolve the day rate uniquely (6,300 − 4,200 = 2,100 over 3 days → 700/day; 8,100 − 5,400 = 2,700 over 3 days → 900/day). SB3 storage values were not visible in the inspected portion of the JSON and are left blank rather than guessed.

Note the asymmetry worth flagging to Finance: **SB1 and SB2 have a weekly storage rate, and SB4 has one per slot — but the per-foot yacht and catamaran categories deliberately do not.** Weekly pricing is therefore not absent from the catalogue as a concept; it is absent only from per-foot categories.

### 3.4 Storage package optimisation — verified totals

Executed against `lowestStoragePackage` (exact-cover minimiser over the 1 / 7 / 30-day packages):

| Days | W4 total | W4 composition | B1 total | B1 composition |
|---|---|---|---|---|
| 7 | **4,200** | `WEEK ×1` | **5,400** | `WEEK ×1` |
| 10 | **6,300** | `WEEK ×1` + `DAY ×3` | **8,100** | `WEEK ×1` + `DAY ×3` |
| 14 | — | — | **10,800** | `WEEK ×2` |
| 21 | — | — | **16,200** | `WEEK ×3` |
| 30 | **18,000** | `MONTH ×1` | **19,500** | `MONTH ×1` |

### 3.5 Per-foot storage — verified totals

| Case | Rate | Computation | Total |
|---|---|---|---|
| Yacht 40 ft, 10 days | 30 /ft/day | 40 × 30 × 10 | **12,000** |
| Yacht 40 ft, 60 days | 525 /ft/month | 40 × 525 × 2 | **42,000** |
| Yacht 40 ft, 7 days **weekly** | — | — | **ERROR** — *"An approved storage billing period is required."* |
| Yacht 40 ft, 31 days monthly | 525 /ft/month | — | **ERROR** — *"Monthly per-foot storage requires complete 30-day periods."* |
| Power catamaran 40 ft, 10 days | 45 /ft/day | 40 × 45 × 10 | **18,000** |
| Sailing catamaran 40 ft, 10 days | 45 /ft/day | 40 × 45 × 10 | **18,000** |

---

## 4. Retired legacy aliases committed in the repository

From `docs/pricing-v3.6/RATE_RECONCILIATION.csv` — 17 rows (16 retired + 1 reference-only). All are retained, not deleted, preserving historical references.

| Legacy code | Canonical resolution | Staging refs | Action |
|---|---|---|---|
| `STORE_SB_S_D` | `SB1_STORAGE_DAY` | 0 | RETIRED_NOT_DELETED |
| `STORE_SB_S_W` | `SB1_STORAGE_WEEK` | 0 | RETIRED_NOT_DELETED |
| `STORE_SB_S_M` | `SB1_STORAGE_MONTH` | 0 | RETIRED_NOT_DELETED |
| `STORE_SB1_W` | `SB1_STORAGE_WEEK` | 0 | RETIRED_NOT_DELETED |
| `STORE_SB_1ENG_15_27_M` | `SB1_STORAGE_MONTH` | 0 | RETIRED_NOT_DELETED |
| `STORE_SB_M_D` | `SB2_STORAGE_DAY` | 0 | RETIRED_NOT_DELETED |
| `STORE_SB2_D` | `SB2_STORAGE_DAY` | 0 | RETIRED_NOT_DELETED |
| `STORE_SB2_W` | `SB2_STORAGE_WEEK` | **1** | RETIRED_NOT_DELETED |
| `STORE_SB_M_M` | `SB2_STORAGE_MONTH` | 0 | RETIRED_NOT_DELETED |
| `STORE_SB_2ENG_28_40_M` | `SB2_STORAGE_MONTH` | **1** | RETIRED_NOT_DELETED |
| `STORE_SB_L_D` | `SB3_STORAGE_DAY` | **2** | RETIRED_NOT_DELETED |
| `STORE_SB3_D` | `SB3_STORAGE_DAY` | 0 | RETIRED_NOT_DELETED |
| `STORE_SB3_W` | `SB3_STORAGE_WEEK` | 0 | RETIRED_NOT_DELETED |
| `STORE_SB_L_M` | `SB3_STORAGE_MONTH` | 0 | RETIRED_NOT_DELETED |
| `STORE_SB_3ENG_41_47_M` | `SB3_STORAGE_MONTH` | 0 | RETIRED_NOT_DELETED |
| `STORE_SB_4ENG_48_55_M` | `RESOLVE_SB4_SLOT_MONTH` | 0 | RETIRED_NOT_DELETED |
| `SB4_D` | `RESOLVE_W4_OR_B1_DAY` | 0 | REFERENCE_ONLY_NOT_QUOTEABLE |

Four aliases still carry live staging references (`STORE_SB2_W` ×1, `STORE_SB_2ENG_28_40_M` ×1, `STORE_SB_L_D` ×2). These must be re-pointed before the aliases can be fully withdrawn, and they are the most likely source of mixed-version data in existing quotations.

Against the expected v3.7 baseline of **39** retired aliases, **22 further retirements are unaccounted for** in the repository.

---

## 5. What to run once the workbooks are available

The reconciliation can be completed mechanically against §3 above. Recommended order:

1. **Confirm tier boundaries first.** Read the Tier 3 / Tier 4 LOA bands and the SB3/SB4 rates from the approved workbook. This single answer determines whether `speedboatStorageClass`, `loaToEngineGroup`, the `loa` labels and the haul-out rates all need to change.
2. **Confirm whether a weekly per-foot storage rate exists** for MOTOR_YACHT / POWER_CATAMARAN / SAILING_CATAMARAN. This determines whether `storageDurationMultiplier` and its blocking test must change, or must be left exactly as they are.
3. **Resolve the canonical count** — 126 or 132 — and reconcile the 13 added haul-out/yacht/catamaran rates.
4. **Resolve the retired-alias count** — 16/17 or 39 — and list the additional 22.
5. **Resolve the W4/B1 `full_rate_thb` pending state** — approve full rates, or formally confirm soft-rate-only operation.
6. **Verify the quote-allowed / manager-review split** (107 / 19) against `quote_allowed` values.
7. **Then, and only then**, diff per-row: code, service name, vessel category, service category, storage location, billing period, calculation method, full rate, soft rate, effective rate, quote allowed, approval status, notes.
8. **Separately**, obtain a read-only staging snapshot of `pricing_master` and diff it against the approved workbook to find rows that exist live but not in the workbook, legacy `calc_type` values still in use, and any `is_active = true` row with a non-ACTIVE `price_status`.

No price in this document may be used to update any system. All figures here are the **v3.6** committed baseline, recorded so the v3.7 diff can be performed accurately.
