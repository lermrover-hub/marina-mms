# Work Progress - 2026-05-24

## Overall Progress

- Estimated total progress: 82%
- Current phase: Phase 2 stabilization and workflow validation
- Current session under work: Session 22 - React data hooks for list pages
- Session 22 status: PASS

## Session 22 Scope

Implemented a shared `useApiList<T>()` hook for low-risk list-page data fetching.

Pages refactored:

- `/customers`
- `/boats`
- `/berths`
- `/utility-readings`

Business logic, UI behavior, API routes, database, Docker, and mutation flows were not changed.

## Validation Result

Commands:

- `npm.cmd run lint`: PASS
- `npx.cmd tsc --noEmit`: PASS
- `npm.cmd run build`: PASS
- `docker compose up --build -d app`: PASS

Runtime smoke test after login:

- `/customers`: PASS
- `/boats`: PASS
- `/berths`: PASS
- `/utility-readings`: PASS
- `/api/db/customers`: PASS, array response
- `/api/db/boats`: PASS, array response
- `/api/db/berths`: PASS, array response
- `/api/db/utility-readings?limit=1`: PASS, array response

## Bugs Found

No blocking bug found in Session 22.

Known limitation:

- `NewReadingModal` still uses local fetch for berth and boat dropdown data. This was intentionally kept out of scope because the current session only refactored list-page fetching.

## Claude Code Report

No debug handoff is required for Session 22 because validation passed.

If a future session fails, only debug that failing session and report the exact file, route, failing command, expected behavior, actual behavior, and proposed fix to Claude Code before continuing.

## Next Sessions

Passed sessions do not need full markdown reread next time. Use this checkpoint first, then inspect only the route/files under the next active session.

## Test / Debug Workflow Rule

For the next test run:

- If Claude Code runs tests and finds a bug, let Claude Code debug until it reports the task/session is finished.
- After Claude Code finishes debugging, start the test run again.
- If the session still does not work properly during the test run, debug it directly until every workflow in that session works correctly.
- Send a debug report back to Claude Code with the exact failing route/file, expected behavior, actual behavior, fix applied, and retest result.
- Only test the session that needs debugging. Do not retest passed sessions unless a shared dependency changed.
- When Claude Code restarts, resume from this checkpoint and continue the assigned test/debug task until the active session is finished.

Estimated phases left:

- Phase 2 remaining: 3 sessions
- Phase 3 production completeness: 4 sessions
- Phase 4 deployment/user acceptance: 2 sessions

Total estimated phases/sessions left: 9
