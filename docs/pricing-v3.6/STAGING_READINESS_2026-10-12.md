# Pricing v3.6 staging verification — 12 October 2026

Scope: issue #3, staging project `zanlunbgupdtqznruzok` only. No production deployment, migrations, historical-document rewrites or customer messages.

## Source and reconciliation

Source: `ORM_Rate_Structure_v3_6_FINAL_MERGED.xlsx`, SHA256 `AAA63443ABD839508D063B5029159B0E1A05A31A7621A73D5B8D6073C6243203`. FIXED and benchmark workbooks were not found; no prices were inferred from them.

| Metric | Before this import | After |
| --- | ---: | ---: |
| Pricing records | 143 | 156 |
| Active | 126 | 132 |
| Active, quote allowed other than NO | 108 | 114 |

Added 13 canonical haul-out/yacht/catamaran rates. Retired seven confirmed aliases, preserving rows and historical references. Fifteen canonical speedboat storage rates were already present. Generic SB4_D remains inactive/reference-only. Complete pricing and pricing-history backups and reference-impact exports are retained locally under `artifacts/pricing-v3.6-final/`; private exports are not committed.

Rerun dry-run: zero adds, zero canonical updates, zero further retirements. W4 and B1 full rates remain pending; only approved soft rates are used.

## Verification evidence

- Local automated suite: 121 passed, zero failed (includes source-contract tests; not equivalent to browser E2E).
- Staging price/read-only rules suite: 36 passed; combines real database rate assertions and local classification/safety simulations.
- TypeScript check passed before final UI deployment.
- W4 10 days: 6,300 THB ex VAT; B1 10 days: 8,100 THB ex VAT.
- Service Request server blocks standard haul-out quotations above capacity, including when a handling rate is selected without water-movement flags. Storage classification does not override handling limits.
- Per-foot daily storage multiplies LOA by duration; monthly per-foot packages require whole 30-day periods rather than inventing partial-month rates.

## Preview scope and remaining gaps

This is a supervised pricing preview, not a claim that the entire master implementation is complete.

- Ambiguous legacy trip vs round-trip service scopes are retained pending management reconciliation; exact duplicate-code validation is not a complete semantic inclusion engine.
- Commercial contract modifiers, full normalized vessel attributes, and all requested Pricing Master filters are not complete.
- Automatic optimization covers speedboat approved packages; yacht/catamaran mixed daily/monthly optimization remains pending.
- SB4 boat-stand crane scope/count, ORM trailer rental agreement, and special-operation costs require explicit review; storage pricing alone is not operational approval.
- Direct quotation/AI paths require further shared-engine integration. AI writes, automation writes, and real customer messaging remain disabled in this Preview.
- Monthly reminders are not a claim of a fully automated recurring invoice system.
- Authenticated browser flow, final invoice snapshots and mobile end-to-end acceptance must be reported separately from unit tests/build success.

## User acceptance sequence

1. Sign in with an existing staging staff account.
2. Open Pricing Master and verify canonical full/soft prices and retired aliases.
3. Create a Service Request for a suitable staging boat, using Tow in/Tow out for road delivery without compulsory haul-out.
4. Select Storage, 10 days, W4 trailer or B1 stands for an eligible SB4; review package totals before submit.
5. Verify Draft Quotation has 0% customer discount and prices match the selected package.
6. Exercise manager approval and payment gate using test data only. Do not send a real customer message or record a real payment.
7. Verify an over-capacity haul-out is blocked. Arrange manual technical assessment outside automatic standard pricing.
