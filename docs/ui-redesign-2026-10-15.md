# Ocean Rover UI update — 15 October 2026

## Scope and source assets

Presentation-only work on `codex/v37-catalog-admin`. The existing catalog changes on this branch were preserved. No commit, push, migration, deployment, production write, quotation creation or payment action was performed for this UI task.

- `public/orm-marina-approved.png`: unmodified supplied 18204 logo; used in dashboard shell, mobile header, authentication and customer portal.
- `public/orm-yard-approved.png`: unmodified supplied 18021 aerial image. Geometry is presentation-only and does not redefine berth records, allocation or capacity.
- `public/orm-boat-marker.png`: generated representative overhead boat marker, not a customer's boat photograph or a scale drawing. Built-in image generation, true alpha verified. Prompt: one realistic white recreational motor boat directly overhead, bow up, navy details, isolated transparent background, no water/text/logos, readable at small map sizes.
- Palette: #0B2F5B / #B18F2F / #16517F / #EDF3F8 / white. Existing semantic status colors retained. Thai-compatible system fonts retained.

## Changed UI areas

- `app/globals.css`, `app/marine-global.css`, `app/layout.tsx`: centralized palette, background and shared presentation.
- `app/(dashboard)/layout.tsx`, `app/(dashboard)/marine-theme.css`, `components/layout/Sidebar.tsx`, `components/layout/TopBar.tsx`: common brand, navy navigation and responsive shell. Mobile sidebar no longer blocks its own close button; closed sidebar is inert.
- `app/(auth)/layout.tsx`, `app/(auth)/login/page.tsx`, `app/(portal)/layout.tsx`: same approved logo, no added third-party logos.
- `components/ui/label.tsx`: readable semantic text color instead of near-white labels.
- `app/(dashboard)/dashboard/page.tsx`: four operational KPIs, bookings, map, tide chart, jobs and quick actions.
- `components/dashboard/ManagementDetails.tsx`: previous dashboard retained behind an expandable section; fictional alert/occupancy examples replaced with available API data.
- `components/berths/PhotoBerthMap.tsx`, `lib/yard-map-layout.ts`, `app/(dashboard)/berths/page.tsx`: assigned-boat overlay and accessible links; old capacity reference retained collapsed.
- `tests/yard-map-layout.test.js`: slot uniqueness/bounds and non-destructive display aliases.

## Data / visualization contract

| Layer | Source and meaning | Encoding / accessible fallback | Verification |
| --- | --- | --- | --- |
| Occupancy | Existing berth GET; mapped dry-yard slots only | Actual occupied / configured mapped total; no fictional denominator | Staging: 7 / 14 mapped records |
| Aerial map | Approved 23-slot image + berth status/current_boat_id | CSS percentage coordinates; status colors; representative boat only if current_boat_id exists; keyboard-accessible list | 14 configured links, 3 boat markers; B1 detail navigation verified |
| Tide chart | Existing date GET, Thailand local day | Linear hourly depth, metres, table height minus 1.00 m; hourly text values; unavailable state | Formula unchanged; not labelled live sensor or operational approval |
| Bookings / jobs | Existing authenticated API lists | Real names/status/dates; links to unchanged detail pages | Read-only browser checks |

Local specialist review used image-to-code, React/data-visualization and design QA guidance. No agents delegated. React owns data/labels/links; Recharts renders the time series. The map image is static and its editable overlays are data-driven. No geographic-coordinate claim is made.

## Important data distinctions

- Codes such as C-2 are normalized to C2 for display only; database IDs/codes stay unchanged.
- The image has 23 slots, but staging has only 14 matching configured records. B2/C10–C17 are not automatically created or assignable through the image.
- Existing unmapped WB records remain accessible in the full record list. This does not add a wet-berth service.
- Seven mapped spaces have OCCUPIED status; only three have a current_boat_id. The other four show status color without inventing boat identities. Reconciliation requires a separate operational review.
- Mobile order: KPIs, actions, tide, bookings, occupancy, jobs. At 820px the sidebar collapses and panels use two columns; no form remount is introduced by CSS breakpoints.

## Verification and remaining scope

- Unit/source tests: 133 passed, 0 failed.
- TypeScript: passed. Targeted ESLint: passed.
- Browser read-only tests: authenticated dashboard/map/form rendering, 390px no horizontal page overflow, mobile menu open/close, 820px two-column layout, berth detail link.
- No booking/quotation/payment write-based E2E was performed.
- Earlier rate-card findings remain separate: LOA_RATE_QTY auto-quantity and captain-contact endpoint error. This UI work does not claim those are resolved.
- Public/remote preview is not deployed. Local preview only; localhost cannot be opened from an unrelated phone/network.

Final screenshots and build outcome are recorded in the latest section of `design-qa.md`.
