# ORM Tide Forecast & Ramp Frame Clearance — 2026-10-16

## Confirmed operational geometry

| Parameter | Value |
|---|---|
| Hydrographic datum | **LLW** (confirm historical 2026 imported file against original publication) |
| Ramp offset relative to published LLW table | **−1.00 m** |
| Central trailer frame height above seabed at critical section | **0.60 m** |
| Side hull bunk top height | **1.00 m** (contact with hull is permitted; NOT added to keel clearance calculation) |
| Required keel-to-centre-frame free clearance | **0.10 m** |

Let `H` be the LLW tide-table height and `draft` be vertical draft beneath the waterline (m):
- Actual ramp depth: `D = H − 1.00`
- Required depth for freely floating keel above middle frame: `D_required = draft + 0.60 + 0.10 = draft + 0.70`
- Minimum table height: `H_required = draft + 1.70`
- Actual keel-to-frame clearance: `C = H − 1.00 − draft − 0.60` (at least 0.10 m).
- Additional forecast uncertainty `U >= 0` requires `H >= draft + 1.70 + U`.

A 0.50 m draft vessel therefore needs **2.20 m on the LLW table**, before adding optional uncertainty margin.

**Safety scope:** this is a geometric clearance rule for a freely floating hull only. Side bunk contact, hull shape, trailer posture, ramp slope, loading forces, significant waves, wind and the FULL operation window must be assessed separately. Never treat a pass as authorization to launch. Dockmaster physical verification is mandatory.

## Prediction sources and trust

1. **2026 reference**: existing `TIDE_2026` hourly table (original PDF-derived records retained). Sub-hourly values are linearly interpolated; the metadata in the old TS file says LAT, while the operations team specified LLW. The datum must be checked against the actual source table *before operational trust*.
2. **FES2022**: preferred future predictor. Separate `services/tide-fes/server.py` (PyFES) with licensed/downloaded atlas files and documented surveyed **MSL-to-local-LLW** offset. Do not infer this offset from the 1.00 m ramp-depth adjustment: these are DIFFERENT reference transformations.
3. **Harmonic preview**: if the FES sidecar isn't configured, the built-in 2026 14-constituent harmonic least-squares fit can show 2027–2028 planning previews, but NEVER returns operational time slots. Trained Jan–Sep 2026, holdout Oct–Dec 2026. Includes no explicit 18.6-year nodal correction; not gauge validated.

## Run / configure

1. Open `/ramp-bookings/tide-forecast` for the new dashboard. Existing `/ramp-bookings/tide-calculator` and `/ramp-bookings/new` are retained.
2. To enable FES predictions, separately acquire the FES2022 atlas (do not commit model binaries) and install `pyfes` and `numpy` on a Python machine/service.
3. Configure the sidecar environment: `FES_CONFIG_PATH` (approved YAML), `ORM_TIDE_FES_TOKEN`, `ORM_TIDE_LATITUDE`, `ORM_TIDE_LONGITUDE`, `FES_MSL_TO_LLW_M` (surveyed and SIGNED).
4. Run `python services/tide-fes/server.py`; reverse-proxy `127.0.0.1:8031/predict` behind **private HTTPS** and request authentication.
5. Configure Next.js server env: `ORM_TIDE_FES_URL=https://<private-host>/predict`, `ORM_TIDE_FES_TOKEN`, `ORM_TIDE_LATITUDE`, `ORM_TIDE_LONGITUDE`. Do not put secrets in NEXT_PUBLIC vars.
6. Only after documenting site coordinates, surveyed datum conversion, LLW station comparison, forecast residuals, and dockmaster SOP set `ORM_TIDE_SITE_VALIDATED=true`. That flag enables *advisory geometric window proposals*, not operation approval.
7. Validate using `npm test`, `npx tsc --noEmit`, and `npm run build` in a fully installed development clone before deployment. Existing production books remain gated by `ENABLE_PRODUCTION_BOOKINGS`.

API: `GET /api/tide/forecast?date=2027-01-02&days=1&step=10&draft=0.50&uncertainty=0&duration=60`.

Limits: days 1–31; step 10,30,60 minutes; 30-day requests must use 30- or 60-minute steps. UTC returned; UI converts to Asia/Bangkok. Deliberately no background cron yet; forecast is computed on demand, with no yearly PDF upload.

**Deployment status**: A GitHub feature branch is not a running FES2022 service. FES2022 cannot be used until its licensed data, configuration, and verified datum offset have been provided.

## Important database migration gate

The existing live `mms_agent_config` may still override the updated 0.60 m default with **0.70 m**. Tide Agent now fails closed with `stale_tide_agent_config` until the operator updates `trailer_height_m` in Settings. The API and new booking form default to 0.60 m. No production configuration has been changed by this PR.
