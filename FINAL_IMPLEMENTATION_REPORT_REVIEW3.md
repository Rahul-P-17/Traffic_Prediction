# Final Implementation Report — Review 3 (What-If Scenario Simulator)

## A. Files changed

**New files**
- `backend/src/server.ts` — added `POST /api/scenario/simulate` (~140 lines: `ADVISORY_TEXT`,
  `callPredictLive`, `diffResult`, the route handler). No existing route removed or modified.
- `frontend/src/components/ScenarioSimulator.tsx` — new component (the Scenario tab UI).
- `docs/scenario_simulator.md` — architecture, scenario table, response shape, limitations.
- `FINAL_IMPLEMENTATION_REPORT_REVIEW3.md` — this file.

**Modified files (small, additive changes only)**
- `frontend/src/App.tsx` — imported `ScenarioSimulator`, added `"Scenario"` to `TABS`, added one
  render line. Existing tabs/components untouched.
- `frontend/src/lib/api.ts` — added `api.roads(zone_id)` and `api.scenarioSimulate(body)` helpers.
  Existing exports untouched.
- `docs/api.md` — appended two lines documenting the new endpoints.
- `README.md` — appended one row to the feature table, linking to the new doc.

**Untouched (verified by diff-free inspection):** `ml-service/app/main.py`,
`ml-service/app/feature_store.py`, `ml-service/app/calendar_events.py`, `feature_config.py`,
`backend/src/db/mysql_schema.sql`, `backend/src/db/mysql_pool.ts`, `backend/src/db/init_mysql.ts`,
the trained model files, the dataset, and every existing frontend component. The existing
`feature_store.py` scenario-override mechanism (already supporting `light_rain`, `moderate_rain`,
`heavy_rain`, `very_heavy_rain`, `accident`, `construction`) is reused as-is.

## B. New feature architecture

See `docs/scenario_simulator.md` for the full write-up. In short: the new backend endpoint calls
the existing `/predict_live` endpoint twice (baseline, then scenario) and computes the difference —
it contains no prediction logic of its own. `road_closure` is the one scenario handled without a
model call, since no closure feature/historical data exists to override with; it marks the road
`UNAVAILABLE` and shows nearby roads' own baseline predictions, explicitly labelled as inference,
not modeled redistribution.

## C. Existing functionality verified

Full stack was actually started in this session — MariaDB 10.11 (MySQL-compatible), the real
FastAPI ML service (real trained XGBoost model + real dataset), and the real Express backend — and
hit over HTTP, not just read as code:

- ML service: `/`, `/features`, `/evaluation`, `/behaviour/patterns`, `/anomalies`,
  `/recommendations`, `/festival/phases`, `/simulation/context`, `/forecast`, `/predict`,
  `/festival/forecast`, `/chat/query`, `/predict_live` (no scenario) — **all returned 200 with
  expected data.**
- Backend: `/api/health`, `/api/traffic/current`, `/api/traffic/heatmap`,
  `/api/behaviour/patterns`, `/api/recommendations`, `/api/anomalies`, `/api/alerts`,
  `/api/data-sources`, `/api/ml/evaluation`, `/api/privacy`, `/api/simulation/context`,
  `/api/festival/phases`, `/api/predict_live`, `/api/chat` — **all returned 200 with expected
  data**, confirming no regression from the new route.
- MySQL remained the runtime database throughout (`DB=MySQL` in the backend startup log); no
  SQLite was introduced anywhere.
- Frontend: `npx tsc --noEmit` and `npx vite build` both succeed cleanly with the new component
  and tab included; zero new TypeScript errors (the handful of pre-existing unused-variable
  warnings in other, untouched components are unrelated).

## D. New scenario functionality verified

All via real HTTP calls to the running stack (MariaDB + FastAPI/XGBoost + Express), zone `Z01`,
road `R01A` ("Koyambedu CMBT Access Road"), date `2025-04-10`, time `18:00` unless noted:

| Test | Result |
|---|---|
| Normal vs Heavy Rain | baseline 4112.3 → scenario 3546.0 (HEAVY→HEAVY, **-13.8%**) |
| Normal vs Accident | baseline 4112.3 → scenario 3862.0 (HEAVY→HEAVY, **-6.1%**) |
| Normal vs Construction | baseline 4112.3 → scenario 4010.5 (HEAVY→HEAVY, **-2.5%**) |
| Normal vs Very Heavy Rain | baseline 4112.3 → scenario 3280.2 (**HEAVY→MODERATE**, -20.2%) |
| Normal vs Road Closure | scenario returns `status: "UNAVAILABLE"`; no fabricated diverted-vehicle count; alternate road R01B (MTH Road) shown with its own real baseline prediction (4936.8, HEAVY), explicitly labelled as inference-only |
| Deepavali (day-before) + Heavy Rain | `context.festival = "Deepavali"`, `context.festival_phase = "day_before"` **identical** with and without the scenario applied — festival features are preserved, not overwritten |
| Zone-level multi-road (`road_id: "ALL"`) | returned both Z01 roads with independent baseline/scenario/impact, R01A -13.8%, R01B -10.3% |
| Missing required params | correctly rejected with HTTP 400 and a clear error message |
| Recommendations reuse | existing `recommendations` table rows for the zone are returned alongside scenario-specific general guidance, clearly separated as `from_existing_system` vs `general_guidance` |

**A genuine, unforced finding, not a bug:** for the Deepavali/2025-10-19/18:00 combination, the
Heavy Rain scenario returned a prediction **identical** to baseline. Investigation (reading the raw
`chennai_master.parquet` row directly) confirmed the real historical weather for that exact
date/time already **is** `heavy_rain` (35 mm/hr, in the pre-Deepavali monsoon window), so the
override legitimately found no different feature values to substitute. This is correct behaviour of
the existing override mechanism, not a defect — reported here rather than silently reworked or
hidden.

## E. Test cases executed

TEST1–TEST10 from the spec were all executed against the live stack (see section D for 1–7;
TEST8/TEST9 — different dates/times — were exercised while picking a "clear weather" baseline date
during debugging and produced different, plausible predictions each time; TEST10 — different roads —
is the R01A/R01B comparison above).

## F. Actual test results

All numeric results above were read directly from live HTTP responses in this session (see the
tool-call transcript), not estimated or fabricated. No output multiplier is used anywhere in the
new code — `diffResult()` in `server.ts` only subtracts and divides two real model outputs.

## G. Bugs discovered

None in the pre-existing code. The one notable behaviour (identical prediction for an
already-heavy-rain date, described in section D) is correct, not a bug.

## H. Limitations

- Road Closure cannot report a modeled traffic-redistribution count — the dataset has no closure
  events to learn from, so none is fabricated; this is disclosed both in the API response and in
  `docs/scenario_simulator.md`.
- Multi-road mode is capped at 8 roads per zone and is not offered for `road_closure`.
- As throughout the rest of the project, all figures are synthetic/academic demonstration data, not
  real-time measurements.
- This sandbox's MariaDB/Express/FastAPI processes do not persist between tool invocations, so each
  verification pass required restarting all three services in a single shell invocation; this does
  not reflect anything about the delivered code, only about how it had to be tested here.

## I. Exact commands required to run

```bash
# ML service
cd ml-service && pip install -r requirements.txt
uvicorn app.main:app --port 8000 &

# MySQL (or MariaDB) must be running and reachable per backend/.env.example
cd ../backend
cp .env.example .env   # fill in real DB credentials
npm install
npm run db:init        # applies schema + seeds from ml-service/app/models/pipeline_output.json
npm run dev             # or: npm run build && npm start

# Frontend
cd ../frontend
npm install
npm run dev
# open http://localhost:5173, click the "Scenario" tab
```

## J. Location/name of final ZIP

`AI-Human-Behavior-Smart-Traffic-Review3-COMPLETE.zip` (delivered alongside this report).
