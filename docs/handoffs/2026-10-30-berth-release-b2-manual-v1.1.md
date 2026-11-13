# Marina MMS staging handoff — Berth release, B2 and manual v1.1

**Date:** 30 October 2026 (Asia/Bangkok)  
**Environment:** Supabase staging project `zanlunbgupdtqznruzok` only

## Verified changes

- Corrected the completed C-8 assignment `9fe522d4-fd6f-4853-bee4-91930a6e029a` from the erroneous `2100-10-18` end date to `2026-10-18`.
- C-8 is `AVAILABLE` with no current boat. Because assignment end dates are inclusive, 19/10/2026 is now the first white/free day in Berth Management.
- Added canonical dry-storage slot `B2` (`b-02`) to `mms_berths`, zone B, max LOA 60 ft, status `AVAILABLE`, with no current boat. Berth Map and Berth Management read this same master.
- No staging assignment or customer/boat record containing “Gavin” was found. The boat was not invented or moved without an exact record identifier; assigning Gavin to B2 remains a staff action after the correct boat is selected.
- Added server-side date validation for berth assignment writes. It accepts long-term dates, requires `YYYY-MM-DD`, and rejects an end date before the start date.
- Updated `docs/03-user-manual.md` to **Version 1.1 — 30 October 2026** with B2, check-out/next-free-day, tide-only billing, monthly scenarios, recurring reminder and Wet Berth rules.

## Reproduction rule

For a boat checked out or launched on 18/10/2026: set End Date to 18/10/2026 and status to Completed / Check-out. Do not use a far-future placeholder. The 19/10 column is available for a new assignment.

## Validation

- `npm test`: **139 passed, 0 failed**.
- `npx tsc --noEmit`: passed.
- `git diff --check`: no whitespace errors; only existing Windows line-ending warnings.

## Not changed

- No Production database, deployment, quotation, invoice or historical accounting record was changed.
- No Gavin record was fabricated. Once the exact boat/customer record is identified, staff can assign it to the new B2 slot through the normal Berth Management workflow.
