"""
FastAPI ML Service — Chennai Metropolitan Region
=================================================
This service has TWO distinct kinds of endpoints — do not confuse them:

1. PRECOMPUTED / CACHED endpoints (dashboard, forecasts, anomalies,
   recommendations, festival snapshots, evaluation metrics, feature
   importance): these read pipeline_output.json, a snapshot produced by
   scripts/build_pipeline.py at build time. They are fast to serve and
   fine for a dashboard, but they are NOT live model inference — they
   reflect whatever date/scenario the pipeline was last run for. Each
   such endpoint below is marked "[PRECOMPUTED]" in its docstring.

2. LIVE inference: /predict_live only. This is the only endpoint that
   actually runs the trained XGBoost model per-request against a
   feature vector built for the caller's chosen date/time/zone/road.
   It does not read pipeline_output.json for its prediction (only for
   the static zones/roads catalogue — ids, names, capacities). See
   feature_store.py for where its inputs come from.

pipeline_output.json and the trained models are both produced by
scripts/build_pipeline.py from the Chennai synthetic dataset.
"""
import json
import os
import sys
import datetime
import pandas as pd
import xgboost as xgb
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .calendar_events import get_calendar_context
from . import feature_store

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, ROOT)
from feature_config import FEATURES  # noqa: E402 — single source of truth, see feature_config.py

APP_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(APP_DIR, "models", "pipeline_output.json")
MODEL_PATH = os.path.join(APP_DIR, "models", "xgb_traffic_model.json")

# Load XGBoost model globally
try:
    xgb_model = xgb.XGBRegressor()
    xgb_model.load_model(MODEL_PATH)
    # The saved booster for this model does NOT persist feature names
    # (it was trained from a raw numpy array, not a DataFrame/DMatrix
    # with named columns), so there is no way to ask the model itself
    # "what order do you expect?". The only verifiable guarantee is that
    # the vector length matches what it was trained on, AND that the
    # FEATURES list used here is the exact same object used at training
    # time (see feature_config.py, imported by both sides). We assert
    # the length match loudly at startup instead of failing silently.
    n_expected = getattr(xgb_model, "n_features_in_", None)
    if n_expected is not None and n_expected != len(FEATURES):
        raise RuntimeError(
            f"FATAL: model was trained on {n_expected} features but "
            f"feature_config.FEATURES has {len(FEATURES)} entries. "
            f"Inference would silently misalign features. Refusing to serve."
        )
except Exception as e:
    xgb_model = None
    print(f"Warning: Could not load XGBoost model from {MODEL_PATH}: {e}")

APP_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(APP_DIR, "models", "pipeline_output.json")

app = FastAPI(title="Chennai Smart Traffic ML Service", version="2.0.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

_cache: dict = {"data": None, "mtime": None}

def load_data():
    mtime = os.path.getmtime(DATA_PATH)
    if _cache["data"] is None or _cache["mtime"] != mtime:
        with open(DATA_PATH) as f:
            _cache["data"] = json.load(f)
        _cache["mtime"] = mtime
    return _cache["data"]


class ChatQuery(BaseModel):
    question: str


@app.get("/")
def root():
    d = load_data()
    return {
        "service": "chennai-smart-traffic-ml",
        "status": "ok",
        "simulation_date": d.get("simulation_context", {}).get("simulation_date", "unknown"),
        "zones": len(d.get("zones", [])),
    }


@app.get("/features")
def features():
    """[PRECOMPUTED] From pipeline_output.json — the last build_pipeline.py training run."""
    d = load_data()
    return {"feature_importance": d["feature_importance"], "meta": d["meta"]}


@app.get("/evaluation")
def evaluation():
    """[PRECOMPUTED] Model evaluation metrics from the last training run (pipeline_output.json)."""
    return load_data()["model_evaluation"]


@app.get("/behaviour/patterns")
def behaviour_patterns(zone_id: str | None = None):
    """[PRECOMPUTED] Behaviour clusters computed at build time (pipeline_output.json)."""
    d = load_data()["behaviour_patterns"]
    if zone_id:
        d = [x for x in d if x["zone_id"] == zone_id]
    return {"patterns": d}


@app.get("/anomalies")
def anomalies():
    """[PRECOMPUTED] Anomalies flagged during the last pipeline build, not live detection."""
    return {"anomalies": load_data()["anomalies"]}


@app.get("/recommendations")
def recommendations():
    """[PRECOMPUTED] Recommendations generated during the last pipeline build."""
    return {"recommendations": load_data()["recommendations"]}


@app.post("/forecast")
def forecast(zone_id: str | None = None, horizon: str | None = None,
             road_id: str | None = None):
    """[PRECOMPUTED] Forecast snapshots from the last pipeline build. For live per-request inference, use /predict_live."""
    d = load_data()["forecasts"]
    if zone_id:  d = [x for x in d if x["zone_id"] == zone_id]
    if horizon:  d = [x for x in d if x["horizon"] == horizon]
    if road_id:  d = [x for x in d if x.get("road_id") == road_id]
    return {"forecasts": d}


@app.post("/predict")
def predict(zone_id: str):
    """[PRECOMPUTED] Convenience lookup into the cached next_1h forecast. For live inference, use /predict_live."""
    d = load_data()["forecasts"]
    match = [x for x in d if x["zone_id"] == zone_id and x["horizon"] == "next_1h"]
    if not match:
        raise HTTPException(404, "zone not found")
    return match[0]


@app.post("/predict_live")
def predict_live(zone_id: str = None, road_id: str = None, date: str = None, time: str = None,
                  scenario: str = None):
    """
    Dynamically execute XGBoost inference given a selected date, time,
    zone and road. The feature vector is NOT hardcoded: weather,
    accident, construction, and lag/rolling-mean features are looked up
    from the project's actual generated synthetic history for that
    exact zone/road/hour (see feature_store.py). Only the target
    quantity (traffic volume) comes from the model — every input to the
    model is either the genuinely selected date/time/location or a
    real recorded value from the dataset for that location.

    Optional `scenario` param (one of: normal, light_rain, moderate_rain,
    heavy_rain, very_heavy_rain, accident, construction) overrides just
    the relevant weather/incident features using a REAL historical hour
    for the same road that actually experienced that condition — never
    an invented number, and never a change to the model's output.

    NOTE: this endpoint intentionally does NOT read pipeline_output.json.
    That file is precomputed/cached data for the dashboard's other
    endpoints (see their docstrings) — using it here would mean
    "live" predictions weren't actually live.
    """
    if xgb_model is None:
        raise HTTPException(503, "XGBoost model is not loaded.")

    d = load_data()  # zones/roads catalogue only (ids, names, capacities) — not used for prediction values
    try:
        dt = datetime.datetime.strptime(f"{date} {time}", "%Y-%m-%d %H:%M")
    except ValueError:
        raise HTTPException(400, "Invalid date/time format. Expected YYYY-MM-DD and HH:MM")

    target_roads = []
    for z in d.get("zones", []):
        if zone_id and z["zone_id"] != zone_id:
            continue
        for r in z["roads"]:
            if road_id and r["road_id"] != road_id:
                continue
            target_roads.append((z, r))

    if not target_roads:
        raise HTTPException(404, "No matching zones/roads found")

    results = []

    for zone, road in target_roads:
        feat, meta = feature_store.get_context_row(zone["zone_id"], road["road_id"], dt)
        if feat is None:
            results.append({
                "zone_id": zone["zone_id"],
                "zone_name": zone["zone_name"],
                "road_id": road["road_id"],
                "road_name": road["road_name"],
                "error": meta.get("error", "No data available for this date/time/location."),
            })
            continue

        scenario_note = None
        if scenario:
            feat, scenario_note = feature_store.apply_scenario_override(
                feat, meta, zone["zone_id"], road["road_id"], dt, scenario
            )

        # Feature order is load-bearing (see feature_config.py) — build the
        # vector by iterating FEATURES itself, never a hand-typed list.
        x_input = [feat[f] for f in FEATURES]
        df_input = pd.DataFrame([x_input], columns=FEATURES)

        pred = float(xgb_model.predict(df_input.values)[0])
        pred = max(5.0, pred)

        vc_ratio = pred / road["capacity"]
        if vc_ratio < 0.40: cong = "LOW"
        elif vc_ratio < 0.75: cong = "MODERATE"
        else: cong = "HEAVY"

        results.append({
            "zone_id": zone["zone_id"],
            "zone_name": zone["zone_name"],
            "road_id": road["road_id"],
            "road_name": road["road_name"],
            "predicted_traffic_volume": pred,
            "congestion_level": cong,
            "forecast_timestamp": dt.isoformat(),
            "festival_context": meta.get("festival_name"),
            "festival_phase": meta.get("festival_phase"),
            "scenario_applied": scenario or "normal",
            "scenario_note": scenario_note,
            "is_fallback_date": meta.get("is_fallback", False),
            "fallback_reason": meta.get("fallback_reason"),
            "actual_historical_vehicle_count": meta.get("actual_historical_vehicle_count"),
            "debug_features": feat,
        })

    print(f"[PREDICT LIVE] Ran inference for {len(results)} roads at {date} {time} (scenario={scenario or 'normal'})")
    return {"forecasts": results}

@app.get("/simulation/context")
def simulation_context():
    d = load_data()
    return {
        "simulation_context": d.get("simulation_context", {}),
        "meta": d.get("meta", {}),
    }


@app.post("/festival/forecast")
def festival_forecast(festival: str, phase: str = "day_before"):
    """[PRECOMPUTED] Festival scenario snapshot from the last pipeline build, not live inference."""
    d = load_data()["festival_forecasts"]
    if festival not in d:
        raise HTTPException(404, f"No scenario for {festival}. Available: {list(d.keys())}")
    fdata = d[festival]
    if "phases" in fdata and phase in fdata["phases"]:
        return fdata["phases"][phase]
    # fallback to flat zones
    return {"label": fdata.get("label", ""), "zones": fdata.get("zones", [])}


@app.get("/festival/phases")
def festival_phases():
    d = load_data()["festival_forecasts"]
    result = {}
    for fname, fdata in d.items():
        if "phases" in fdata:
            result[fname] = list(fdata["phases"].keys())
        else:
            result[fname] = ["festival_day"]
    return {"festivals": result}


@app.post("/chat/query")
def chat_query(q: ChatQuery):
    """
    Deterministic retrieval-based chatbot.
    Answers are constructed only from actual pipeline_output.json data.
    No LLM or generative AI — purely retrieval from pipeline outputs.
    """
    d = load_data()
    text = q.question.lower()
    forecasts = d["forecasts"]
    anomalies = d["anomalies"]
    behaviour = d["behaviour_patterns"]
    recs = d["recommendations"]
    sim_ctx = d.get("simulation_context", {})
    sim_date = sim_ctx.get("simulation_date", "the simulation date")

    # Build zone name lookup
    zone_names = {z["zone_id"]: z["zone_name"] for z in d.get("zones", [])}
    # Reverse: zone_name lower -> zone_id
    zone_by_name = {z["zone_name"].lower(): z["zone_id"] for z in d.get("zones", [])}
    # Also partial name matching for known areas
    known_areas = {
        "koyambedu": "Z01", "anna nagar": "Z02", "vadapalani": "Z03",
        "t. nagar": "Z04", "t nagar": "Z04", "tnagar": "Z04", "t.nagar": "Z04",
        "guindy": "Z05", "velachery": "Z06", "adyar": "Z07",
        "sholinganallur": "Z08", "omr": "Z08", "madhavaram": "Z09",
        "poonamallee": "Z10", "tambaram": "Z11", "kilambakkam": "Z12",
        "vandalur": "Z13", "perungalathur": "Z14", "sriperumbudur": "Z15",
        "red hills": "Z16", "manali": "Z17",
    }

    def find_zone_in_text(text_lower):
        for name, zid in known_areas.items():
            if name in text_lower:
                return zid, zone_names.get(zid, zid)
        for name, zid in zone_by_name.items():
            if name in text_lower:
                return zid, zone_names.get(zid, zid)
        return None, None

    # ---- Busiest zone/road ----
    if any(k in text for k in ["busiest", "highest traffic", "most congested", "most traffic"]):
        horizon = "tomorrow" if "tomorrow" in text else "next_1h"
        rows = [f for f in forecasts if f["horizon"] == horizon]
        if not rows:
            return {"answer": f"No {horizon} forecast available in current simulation.", "source": "forecasts"}
        top = max(rows, key=lambda x: x["predicted_traffic_volume"])
        return {
            "answer": (
                f"On {sim_date}, {top['road_name']} ({top['zone_name']}) is predicted "
                f"to have the highest traffic volume ({top['predicted_traffic_volume']:.0f} vehicles) "
                f"with congestion level {top['congestion_level']} "
                f"(horizon: {horizon.replace('_', ' ')})."
            ),
            "source": f"forecasts.{horizon}",
        }

    # ---- Specific zone query ----
    zone_id, zone_label = find_zone_in_text(text)
    if zone_id and any(k in text for k in ["traffic", "congestion", "busy", "volume", "predict"]):
        horizon = "tomorrow" if "tomorrow" in text else "next_1h"
        rows = [f for f in forecasts if f["zone_id"] == zone_id and f["horizon"] == horizon]
        if rows:
            row = rows[0]
            return {
                "answer": (
                    f"{zone_label} (zone {zone_id}): predicted {row['predicted_traffic_volume']:.0f} "
                    f"vehicles on {row['road_name']} for {horizon.replace('_', ' ')} "
                    f"— congestion level {row['congestion_level']}."
                ),
                "source": f"forecasts.{horizon}.{zone_id}",
            }

    # ---- Festival question ----
    if any(k in text for k in ["festival", "deepavali", "diwali", "pongal", "christmas", "new year"]):
        fest_map = {
            "deepavali": "Deepavali", "diwali": "Deepavali",
            "pongal": "Pongal", "christmas": "Christmas",
            "new year": "New Year",
        }
        matched_fest = None
        for k, v in fest_map.items():
            if k in text:
                matched_fest = v
                break
        
        if matched_fest and matched_fest in d["festival_forecasts"]:
            fdata = d["festival_forecasts"][matched_fest]
            phase = "day_before"
            if "day of" in text or "festival day" in text:
                phase = "festival_day"
            elif "day after" in text or "after" in text:
                phase = "day_after"
            
            if "phases" in fdata and phase in fdata["phases"]:
                p = fdata["phases"][phase]
                heavy_zones = [z["zone_name"] for z in p["zones"] if z["congestion_level"] == "HEAVY"]
                return {
                    "answer": (
                        f"During {matched_fest} ({phase.replace('_', ' ')}): "
                        f"{fdata['description']}. "
                        f"Zones with HEAVY congestion: {', '.join(heavy_zones) if heavy_zones else 'None predicted'}. "
                        f"Note: This is a simulation scenario based on documented behavioural assumptions."
                    ),
                    "source": f"festival_forecasts.{matched_fest}.{phase}",
                }
        return {
            "answer": (
                f"Festival simulation is available for Deepavali, Pongal, Christmas, and New Year. "
                f"Use the Festival tab to see zone-by-zone mobility predictions for each phase "
                f"(day before, festival day, day after). All values are synthetic scenario simulations."
            ),
            "source": "festival_forecasts",
        }

    # ---- Kilambakkam / GST Road (known corridor questions) ----
    if "kilambakkam" in text or "gst road" in text:
        rows = [f for f in forecasts if f["zone_id"] in ("Z12", "Z13") and f["horizon"] == "next_1h"]
        if rows:
            summary = "; ".join(
                f"{r['zone_name']}: {r['predicted_traffic_volume']:.0f} veh ({r['congestion_level']})"
                for r in rows
            )
            return {
                "answer": (
                    f"Kilambakkam/GST Road corridor (next 1h): {summary}. "
                    f"This corridor is modelled as an intercity bus terminal and national highway zone. "
                    f"Demand surges significantly before major festivals (Deepavali, Pongal)."
                ),
                "source": "forecasts.next_1h.Z12_Z13",
            }

    # ---- Peak hour ----
    if any(k in text for k in ["peak", "peak hour", "rush hour"]):
        rows = [f for f in forecasts if f["horizon"] == "next_6h"]
        if rows:
            top = max(rows, key=lambda x: x["predicted_traffic_volume"])
            return {
                "answer": (
                    f"Based on the next-6-hour simulation, {top['road_name']} ({top['zone_name']}) "
                    f"shows the highest predicted peak at {top['forecast_timestamp']} "
                    f"with {top['predicted_traffic_volume']:.0f} vehicles."
                ),
                "source": "forecasts.next_6h",
            }

    # ---- Heavy congestion ----
    if any(k in text for k in ["heavy", "severe congestion", "worst"]):
        rows = [f for f in forecasts if f["congestion_level"] == "HEAVY"]
        if not rows:
            return {"answer": "No roads currently show HEAVY predicted congestion.", "source": "forecasts"}
        names = sorted(set(f"{r['road_name']} ({r['zone_name']})" for r in rows))
        return {
            "answer": f"Roads with HEAVY predicted congestion: {'; '.join(names)}.",
            "source": "forecasts",
        }

    # ---- Rain / weather ----
    if any(k in text for k in ["rain", "weather", "monsoon"]):
        return {
            "answer": (
                "Weather (rain, temperature) is included as a model feature. "
                "In the simulation, Chennai's Northeast monsoon (Oct-Dec) increases rain probability. "
                "Heavy rain reduces average speed by up to 50% and road capacity by up to 35% "
                "(documented assumptions in the weather model). "
                "Check /features for rain_mm_per_hr importance ranking."
            ),
            "source": "feature_importance",
        }

    # ---- Anomaly ----
    if "anomal" in text:
        rows = anomalies
        if not rows:
            return {"answer": "No anomalies detected in the current simulation window.", "source": "anomalies"}
        top = rows[0]
        return {
            "answer": (
                f"Top anomaly: {top['anomaly_type']} on {top['road_name']} ({top.get('zone_name', '')}) "
                f"at {top['timestamp']} "
                f"(observed {top['observed_traffic']} vs expected {top['expected_traffic']:.0f}, "
                f"severity {top['severity']})."
            ),
            "source": "anomalies",
        }

    # ---- Office/IT zone behaviour ----
    if any(k in text for k in ["office", "commute", "it corridor", "omr", "tech"]):
        rows = [b for b in behaviour if "Office" in b["interpreted_pattern"] or "IT" in b["interpreted_pattern"]]
        if not rows:
            rows = [b for b in behaviour if b["zone_type"] in ("office", "it_corridor")]
        zones_listed = sorted(set(b["zone_name"] for b in rows))
        return {
            "answer": (
                f"Zones with Office/IT Commuter mobility patterns: {', '.join(zones_listed)}. "
                f"These zones show strong weekday morning (8-10am) and evening (6-8pm) peaks, "
                f"with significantly lower weekend demand."
            ),
            "source": "behaviour_patterns",
        }

    # ---- Weekend ----
    if "weekend" in text:
        rows = [b for b in behaviour if b["is_weekend"]]
        rows.sort(key=lambda b: max(b["hourly_profile"].values()), reverse=True)
        if rows:
            top = rows[0]
            return {
                "answer": (
                    f"Highest weekend activity: {top['zone_name']} (zone {top['zone_id']}) "
                    f"with pattern '{top['interpreted_pattern']}', "
                    f"peak hour {top.get('peak_hour', 'unknown')}:00."
                ),
                "source": "behaviour_patterns",
            }

    # ---- Recommendations ----
    if any(k in text for k in ["recommend", "alternate", "divert", "route"]):
        if not recs:
            return {"answer": "No route recommendations triggered in current simulation.", "source": "recommendations"}
        r = recs[0]
        return {
            "answer": f"Recommendation: {r['message']} — Reason: {r['reason']}",
            "source": "recommendations",
        }

    # ---- Simulation date / context ----
    if any(k in text for k in ["simulation date", "current date", "today", "date"]):
        return {
            "answer": (
                f"The simulation date is {sim_date}. "
                f"All traffic figures are simulated scenarios, not real-time data. "
                f"Scenario: {sim_ctx.get('scenario', 'Normal Day')}."
            ),
            "source": "simulation_context",
        }

    return {
        "answer": (
            "I can answer questions about: "
            "busiest zones/roads, specific area traffic (Koyambedu, T.Nagar, OMR, Kilambakkam etc.), "
            "festival scenarios (Deepavali, Pongal), peak hours, heavy congestion roads, "
            "weather/rain effects, anomalies, office/IT commute patterns, weekend patterns, "
            "and route recommendations. Try asking about one of these topics."
        ),
        "source": "fallback",
    }
