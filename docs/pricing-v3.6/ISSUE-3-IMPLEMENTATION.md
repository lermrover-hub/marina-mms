# GitHub issue #3 — Pricing v3.6 implementation

## Source and scope

Source of truth: `ORM_Rate_Structure_v3_6_FINAL_MERGED.xlsx` with SHA-256 `AAA63443ABD839508D063B5029159B0E1A05A31A7621A73D5B8D6073C6243203`.

Only staging project `zanlunbgupdtqznruzok` was changed. Production project `csltloqbjupxqwbkunsd` is explicitly blocked by the reconciliation script.

## Reconciliation result

| Metric | Before | After |
| --- | ---: | ---: |
| Total `pricing_master` rows | 127 | 143 |
| Active rows | 127 | 126 |
| Active quoteable rows | 109 | 108 |
| Canonical v3.6 rows added | 0 | 15 |
| Legacy aliases retired | 0 | 16 |
| Generic `SB4_D` reference rows | 0 | 1 inactive/nonquoteable |

No rate row was deleted. Three legacy aliases have four historical references in total. Their IDs, rate values, quotation/service-request references, and historical quotation snapshots remain intact. They are only excluded from new rate selection with `is_active=false`, `quote_allowed=NO`, and `price_status=LEGACY_ALIAS`.

The detailed mapping is in `RATE_RECONCILIATION.csv`. Timestamped full backups and reference exports are produced by `scripts/reconcile-pricing-v36.mjs` under `artifacts/pricing-v3.6/` when the script runs.

## Implemented application rules

- SB1, SB2, SB3, and SB4 use the FINAL_MERGED classification limits; SB4 ends at 60 ft and 61 ft is outside the configured range.
- Engine-count/LOA conflicts are retained as manager-review warnings.
- SB4 requires a physical slot: W4 with trailer storage, or B1 with boat stands.
- W4/B1 availability and configured LOA capacity are checked server-side.
- Storage permission remains independent from haul-out/launch approval.
- The server replaces submitted speedboat storage lines with canonical v3.6 package lines and ignores client-entered storage prices.
- The lowest exact combination of approved 1-day, 7-day, and 30-day packages is selected.
- SB4 soft rates have source discount 0%, preventing a second 25% discount.
- Every quotation item keeps its rate code, current/full rate snapshots, source version, and pricing timestamp.

## Staging slot configuration

- W4 remains its existing Workshop physical slot and existing occupancy is preserved. Its v3.6 test capacity is configured to 60 ft; current staging status is `OCCUPIED`, so a new allocation is blocked.
- B1 was missing from staging and was added as a `DRY_STORAGE` physical slot with 60 ft capacity and status `AVAILABLE` for boat-stand validation.

This is staging test data only. No production berth/storage row was changed.

## Verification

| Check | Result |
| --- | --- |
| Main application tests | 116 passed |
| AI-agent tests | 133 passed, 20 live tests intentionally skipped in safe mode |
| Next.js production build with staging environment | Passed; pre-existing lint warnings only |
| Staging v3.6 rate/duplicate/slot checks | 21 passed, 0 failed |
| W4 10-day simulation | THB 6,300 ex VAT |
| B1 10-day simulation | THB 8,100 ex VAT |
| Post-apply reconciliation preview | 0 adds, 0 updates, 0 retirements pending |

Protected browser E2E should be repeated on the PR preview after Vercel builds the branch. The staging data and deterministic server logic are already verified; production was not accessed or modified.
