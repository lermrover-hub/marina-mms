# Speedboat haul-out rate correction — 22 November 2026

## Owner decision

`HAUL_SB_*` and `PKG-HL-SB*` describe the same speedboat haul-out and launch round-trip service. Keep the existing `HAUL_SB_*` rate identity, use the approved v3.8 package price and inclusions, and remove the duplicate package codes from active quoting. Apply this to all four speedboat tiers. This does not change Sport & Cruiser or other vessel categories.

| Tier | Canonical active code | Current rate (THB/package) | Retired duplicate |
| --- | --- | ---: | --- |
| SB1, 15–27 ft | `HAUL_SB_1ENG_15_27` | 7,000 | `PKG-HL-SB1` |
| SB2, >27–40 ft | `HAUL_SB_2ENG_28_40` | 9,500 | `PKG-HL-SB2` |
| SB3, >40–50 ft | `HAUL_SB_3ENG_41_50` | 12,500 | `PKG-HL-SB3` |
| SB4, >50–60 ft | `HAUL_SB_4ENG_51_60` | 16,000 | `PKG-HL-SB4` |

SB3 and SB4 code suffixes were corrected from the old 41–47 and 48–55 ranges to match the approved v3.8 tier boundaries. The original `HAUL_SB_*` row IDs were retained. Duplicate `PKG-HL-SB*` rows were deactivated, marked `LEGACY_ALIAS`, and made non-quotable instead of physically deleted, preserving an audit trail. No quotation or service-request line referenced the eight affected rates before the staging correction.

## Staging change and verification

- Target: `marina-mms-staging` Supabase project `zanlunbgupdtqznruzok` only. No production database write.
- Applied the guarded transaction in `scripts/staging-v38-speedboat-haul-dedupe.sql` after a transaction rollback rehearsal. It rejects unexpected prices, codes, active-row counts, or new document references.
- Readback: four canonical package rates active and quotable; zero active `PKG-HL-SB*` duplicates; 80 active v3.8 rates total; zero active pending rates available for quotation.
- Original direct costs were for narrower haul services. The complete package cost was therefore cleared and marked for Finance review. Revenue GL 4110 was retained. Do not use the old direct cost to calculate package margin.
- The seed generator now uses the canonical codes so a fresh v3.8 catalog will not recreate these duplicates. Existing databases require the guarded data correction before a fresh seed because the canonical codes already exist there.

## Validation

- `node --test tests/pricing-v38.test.ts`: 10/10 pass.
- `npx tsc --noEmit`: pass.
- ESLint on changed JS/TS files: pass.
- `git diff --check`: pass.
- `vercel env run -e preview --git-branch codex/v38-protected-review -- npm run build`: pass, with pre-existing lint warnings outside the changed files. A plain local build without environment variables fails at page-data collection because `supabaseUrl` is missing.
- Protected Preview smoke on `marina-mms-v38-review`: logged in as temporary Finance QA user, verified the active rate table, saved and inspected four quotation drafts using the existing UI workflow. The speedboat haul-out draft used `HAUL_SB_2ENG_28_40`, THB 9,500, unit `package`, and stored the package-inclusion snapshot. All temporary drafts and the temporary user were removed; readback showed zero remaining QA records.
- `npm test`: 40/41 pass; pre-existing `tests/auth-user.test.js` fails under the bare Node loader because `@/lib` path alias is not resolved. No changed code is in that test.

## Remaining review

Finance must enter and approve **complete package direct costs** for SB1–SB4 before package margin reports should be treated as final. Production rates and deployments remain unchanged.
