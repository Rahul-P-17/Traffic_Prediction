# What-If Scenario Simulator

Added as part of the Review 3 extension. Lets a user pick a zone, road, date,
time and hypothetical scenario, and compares the normal traffic prediction
against the same request run under that scenario — using the **existing
trained XGBoost model** and the **existing `feature_store.py` scenario
override mechanism**. No new model, no new dataset, no new prediction logic.

## Architecture

```
Frontend (Scenario tab)
   |  POST /api/scenario/simulate { zone_id, road_id, date, time, scenario }
   v
Express backend (server.ts)
   |  calls the EXISTING ML endpoint twice:
   |    1) POST /predict_live  (scenario=normal)        -> baseline
   |    2) POST /predict_live  (scenario=<scenario>)     -> scenario result
   v
FastAPI ML service (main.py + feature_store.py, UNCHANGED)
   |  feature_store.apply_scenario_override() finds a real historical hour
   |  matching the requested weather/incident condition and substitutes
   |  those weather/incident feature values into the 32-feature vector.
   |  Festival-related features are NOT touched, so festival context is
   |  automatically preserved alongside the scenario.
   v
XGBoost model.predict() -> genuine prediction, both times
```

The backend endpoint (`POST /api/scenario/simulate` in `backend/src/server.ts`)
contains **no independent prediction logic**. It only:
1. calls `/predict_live` for the baseline,
2. calls `/predict_live` again with `scenario=<scenario>` (except for
   Road Closure — see below),
3. computes `absolute_change`, `percentage_change`, and the congestion-level
   transition from the two real model outputs,
4. attaches existing recommendations (`SELECT ... FROM recommendations WHERE
   target_zone = ?`, the same table the Recommendations panel already uses)
   plus a short static "general guidance" list for scenario types where that
   makes sense.

## Supported scenarios

| Scenario key      | How it's produced                                                              |
|--------------------|---------------------------------------------------------------------------------|
| `normal`           | Baseline `/predict_live` call, no override                                     |
| `light_rain` / `moderate_rain` / `heavy_rain` / `very_heavy_rain` | Existing weather override in `feature_store.py` — finds the closest real historical hour with that `weather_condition` and substitutes its rain/speed/capacity features |
| `accident`         | Existing accident override in `feature_store.py`                               |
| `construction`     | Existing construction override in `feature_store.py`                           |
| `road_closure`     | **New**, handled entirely in the backend — see below                            |

Unknown/unsupported scenario strings are passed through as-is; the ML service
returns `scenario_note: "Unknown scenario '<x>'; no override applied."` and
falls back to the baseline feature vector rather than guessing.

## Road Closure — why it does NOT call the model

The training data contains no "road closed" events and no feature that
represents unavailability. Forcing a fabricated feature value, or simply
returning `0`, would not be a genuine model prediction — it would be
inventing a number. So Road Closure is intentionally **not** run through
XGBoost:

- The requested road is marked `status: "UNAVAILABLE"`.
- Its own baseline prediction is still shown, for context.
- Other roads in the same zone (from the `roads` table) each get their own
  **real baseline `/predict_live` prediction** for the same date/time, shown
  under "Potentially affected corridors."
- These are explicitly labelled: `"Traffic redistribution is not directly
  modeled; affected corridors are identified from the available road
  network and their own current baseline prediction, not a redistributed
  count."` No diverted-vehicle number is ever shown, because the model
  cannot legitimately produce one.

## Festival + Scenario combination

`feature_store.apply_scenario_override()` only overwrites
weather/accident/construction-related feature columns. Festival-derived
feature columns (from the historical row matched to the requested date) are
left untouched, so a request for e.g. `2025-10-19` (Deepavali, day before)
with `scenario=heavy_rain` produces a feature vector containing **both**
the festival context and the weather override. Verified in testing (see
`FINAL_IMPLEMENTATION_REPORT.md`) — `context.festival` /
`context.festival_phase` in the response are identical with and without the
scenario applied.

## Zone-level (multi-road) mode

Passing `"road_id": "ALL"` instead of a specific road ID runs baseline +
scenario for every road in the zone (capped at 8) and returns
`{ mode: "zone_multi_road", roads: [...] }` instead of a single
baseline/scenario pair. Not available for `road_closure` (a closure is
inherently road-specific).

## Response shape

```jsonc
{
  "baseline": { /* full /predict_live forecast object for scenario=normal */ },
  "scenario": { /* full /predict_live forecast object for the given scenario,
                   OR { status: "UNAVAILABLE", ... } for road_closure */ },
  "impact": {
    "absolute_change": -566.4,
    "percentage_change": -13.8,
    "congestion_change": "No change (HEAVY)"   // or "HEAVY -> MODERATE" etc.
  },
  "recommendations": {
    "from_existing_system": [ /* rows from the recommendations table */ ],
    "general_guidance": [ "..." ]               // static, clearly separated, not ML output
  },
  "context": { "festival": "Deepavali", "festival_phase": "day_before" }
}
```

## Limitations (honest disclosure)

- Figures are simulated/academic synthetic data, as throughout the rest of
  the project — not real-time measurements.
- Road-closure "affected corridors" show each alternate road's own baseline
  prediction, **not** a modeled traffic-redistribution count — the dataset
  does not support that and no such number is fabricated.
- At some date/times, a "heavy rain" scenario can legitimately return a
  prediction identical to baseline — this happens when the real historical
  weather for that date/time is already heavy rain, so the override finds
  no different hour to substitute. This is correct behaviour, not a bug
  (confirmed by inspecting the raw dataset row during testing).
