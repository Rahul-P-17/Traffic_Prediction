"""
Re-runs ONLY the two fixed sections (forecast generation, cluster
interpretation) against the EXISTING trained model and EXISTING dataset —
no retraining, no dataset regeneration, per explicit instruction.

This mirrors exactly the patched logic now in scripts/build_pipeline.py's
"Generating forecasts" and "K-Means behaviour clustering" sections, so that
re-running the full pipeline later would reproduce the same result.
"""
import json
import os
import sys
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "scripts"))
sys.path.insert(0, os.path.join(ROOT, "ml-service"))

from feature_config import FEATURES
from chennai_zones import ZONES
import app.feature_store as feature_store

SEED = 42
PIPELINE_JSON = os.path.join(ROOT, "ml-service", "app", "models", "pipeline_output.json")
MODEL_PATH = os.path.join(ROOT, "ml-service", "app", "models", "xgb_traffic_model.json")
PARQUET_PATH = os.path.join(ROOT, "data", "processed", "chennai_master.parquet")

print("Loading existing trained model (NOT retraining)...")
xgb_model = xgb.XGBRegressor()
xgb_model.load_model(MODEL_PATH)

print("Loading existing dataset (NOT regenerating)...")
master = pd.read_parquet(PARQUET_PATH)
master["timestamp"] = pd.to_datetime(master["timestamp"])
master_sorted = master.sort_values("timestamp").reset_index(drop=True)

with open(PIPELINE_JSON) as f:
    pipeline = json.load(f)

# =====================================================================
# BUG 1 FIX — forecasts via feature_store (same path as /predict_live)
# =====================================================================
print("\n[BUG 1] Regenerating forecasts via feature_store...")

sim_date = master_sorted["timestamp"].max() + pd.Timedelta(hours=1)
sim_date_str = sim_date.strftime("%Y-%m-%d")

horizon_defs = [
    ("next_1h",      sim_date),
    ("next_6h",      sim_date + pd.Timedelta(hours=5)),
    ("tomorrow",     sim_date + pd.Timedelta(days=1)),
    ("next_weekend", sim_date + pd.Timedelta(days=(5 - sim_date.dayofweek) % 7 + 1)),
]

forecasts = []
for zone in ZONES:
    for road in zone["roads"]:
        for horizon_name, ts in horizon_defs:
            feat, ctx_meta = feature_store.get_context_row(
                zone["zone_id"], road["road_id"], ts.to_pydatetime()
            )
            if feat is None:
                continue
            X_pred = pd.DataFrame([[feat[f] for f in FEATURES]], columns=FEATURES).values
            pred_volume = float(xgb_model.predict(X_pred)[0])
            pred_volume = max(5.0, pred_volume)
            cap = road["capacity"]
            vc = pred_volume / cap
            cong = "LOW" if vc < 0.40 else "MODERATE" if vc < 0.75 else "HEAVY"
            forecasts.append({
                "zone_id": zone["zone_id"], "zone_name": zone["zone_name"],
                "zone_type": zone["zone_type"], "road_id": road["road_id"],
                "road_name": road["road_name"], "road_capacity": cap,
                "horizon": horizon_name, "forecast_timestamp": ts.isoformat(),
                "simulation_date": sim_date_str,
                "predicted_traffic_volume": round(pred_volume, 1),
                "congestion_level": cong, "expected_demand": round(vc, 3),
                "festival_context": ctx_meta.get("festival_name") or "None",
                "is_fallback_date": ctx_meta.get("is_fallback", False),
                "fallback_reason": ctx_meta.get("fallback_reason"),
                "latitude": zone["lat"], "longitude": zone["lon"],
            })

print(f"  -> {len(forecasts)} forecast rows generated ({len(horizon_defs)} horizons x "
      f"{sum(len(z['roads']) for z in ZONES)} roads)")
pipeline["forecasts"] = forecasts

# =====================================================================
# BUG 2 FIX — cluster interpretation from actual per-cluster statistics
# =====================================================================
print("\n[BUG 2] Re-deriving cluster interpretations from cluster statistics...")

master["hour"] = master["timestamp"].dt.hour
agg = (master
    .groupby(["zone_id", "zone_name", "zone_type", "hour", "is_weekend"])["vehicle_count"]
    .mean().reset_index())
pivot = agg.pivot_table(
    index=["zone_id", "zone_name", "zone_type", "is_weekend"],
    columns="hour", values="vehicle_count"
).fillna(0).reset_index()

hour_cols = [c for c in pivot.columns if isinstance(c, int)]
scaler = StandardScaler()
pivot_scaled = scaler.fit_transform(pivot[hour_cols].values)

kmeans = KMeans(n_clusters=7, random_state=SEED, n_init=15, max_iter=500)
labels = kmeans.fit_predict(pivot_scaled)
pivot["cluster"] = labels

cong_freq_lookup = (
    master.assign(is_heavy=(master["congestion_level"] == "HEAVY").astype(int))
    .groupby(["zone_id", "is_weekend"])["is_heavy"].mean()
)

cluster_stats = {}
for cluster_id in sorted(pivot["cluster"].unique()):
    members = pivot[pivot["cluster"] == cluster_id]
    avg_profile = members[hour_cols].mean()
    overall_mean = float(avg_profile.mean())

    def _band_mean(hours, avg_profile=avg_profile):
        present = [h for h in hours if h in avg_profile.index]
        return float(avg_profile.loc[present].mean()) if present else 0.0

    morning = _band_mean([7, 8, 9])
    evening = _band_mean([17, 18, 19, 20])
    midday = _band_mean([11, 12, 13, 14, 15])
    night = _band_mean([0, 1, 2, 3, 4])
    variability = float(avg_profile.std() / overall_mean) if overall_mean > 0 else 0.0

    weekday_members = members[members["is_weekend"] == False]
    weekend_members = members[members["is_weekend"] == True]
    weekday_avg = float(weekday_members[hour_cols].values.mean()) if len(weekday_members) else float("nan")
    weekend_avg = float(weekend_members[hour_cols].values.mean()) if len(weekend_members) else float("nan")
    wk_ratio = weekday_avg / weekend_avg if (not pd.isna(weekend_avg) and weekend_avg > 0) else float("nan")
    wk_ratio_for_rule = 1.0 if pd.isna(wk_ratio) else wk_ratio

    cf_vals = []
    for _, m in members.iterrows():
        key = (m["zone_id"], bool(m["is_weekend"]))
        if key in cong_freq_lookup.index:
            cf_vals.append(cong_freq_lookup.loc[key])
    congestion_frequency = float(np.mean(cf_vals)) if cf_vals else 0.0

    peak_hours = [int(h) for h in avg_profile.sort_values(ascending=False).head(3).index]
    morning_peak_strength = round(morning / overall_mean, 2) if overall_mean > 0 else 0.0
    evening_peak_strength = round(evening / overall_mean, 2) if overall_mean > 0 else 0.0
    midday_activity = round(midday / overall_mean, 2) if overall_mean > 0 else 0.0
    nighttime_activity = round(night / overall_mean, 2) if overall_mean > 0 else 0.0

    if morning_peak_strength >= 1.25 and evening_peak_strength >= 1.25 and wk_ratio_for_rule >= 1.15:
        label = "Office Commute Pattern"
    elif not pd.isna(weekend_avg) and not pd.isna(weekday_avg) and weekend_avg > weekday_avg * 1.15 and evening_peak_strength >= 1.15:
        label = "Weekend / Shopping Pattern"
    elif nighttime_activity <= 0.5 and variability >= 0.5 and (evening_peak_strength >= 1.1 or morning_peak_strength >= 1.1) and congestion_frequency >= 0.15:
        label = "High-Volume Transit Pattern"
    elif morning_peak_strength >= 1.2 and midday_activity >= 0.6 and evening_peak_strength < 1.2:
        label = "School / Residential Pattern"
    elif variability < 0.25:
        label = "Low-Variability Steady Traffic Pattern"
    elif evening_peak_strength >= 1.15:
        label = "High Evening Activity Pattern"
    else:
        label = "Balanced Urban Traffic Pattern"

    cluster_stats[int(cluster_id)] = {
        "interpreted_pattern": label, "peak_hours": peak_hours,
        "weekday_average": None if pd.isna(weekday_avg) else round(weekday_avg, 1),
        "weekend_average": None if pd.isna(weekend_avg) else round(weekend_avg, 1),
        "weekday_weekend_ratio": None if pd.isna(wk_ratio) else round(wk_ratio, 2),
        "morning_peak_strength": morning_peak_strength,
        "evening_peak_strength": evening_peak_strength,
        "midday_activity": midday_activity, "nighttime_activity": nighttime_activity,
        "variability": round(variability, 2),
        "congestion_frequency": round(congestion_frequency, 3),
        "members_count": int(len(members)),
    }

print("  Cluster interpretations (one per cluster ID, derived from statistics):")
for cid, cstats in sorted(cluster_stats.items()):
    print(f"    cluster {cid}: {cstats['interpreted_pattern']:<32s} "
          f"members={cstats['members_count']:<3d} peak_hours={cstats['peak_hours']} "
          f"wk_ratio={cstats['weekday_weekend_ratio']}")

behaviour_patterns = []
for _, row in pivot.iterrows():
    hour_profile = {int(h): round(float(row[h]), 1) for h in hour_cols}
    cid = int(row["cluster"])
    cstats = cluster_stats[cid]
    peak_h = max(hour_profile, key=lambda h: hour_profile[h])
    behaviour_patterns.append({
        "zone_id": str(row["zone_id"]), "zone_name": str(row["zone_name"]),
        "zone_type": row["zone_type"], "is_weekend": bool(row["is_weekend"]),
        "cluster": cid, "interpreted_pattern": cstats["interpreted_pattern"],
        "peak_hour": int(peak_h), "peak_hours": cstats["peak_hours"],
        "weekday_average": cstats["weekday_average"], "weekend_average": cstats["weekend_average"],
        "morning_peak_strength": cstats["morning_peak_strength"],
        "evening_peak_strength": cstats["evening_peak_strength"],
        "congestion_frequency": cstats["congestion_frequency"],
        "cluster_members_count": cstats["members_count"],
        "hourly_profile": hour_profile,
    })

pipeline["behaviour_patterns"] = behaviour_patterns

# =====================================================================
# Verification: prove the bug is actually fixed before saving
# =====================================================================
print("\n[VERIFY] cluster -> set of labels used (must be exactly 1 each):")
from collections import defaultdict
c2l = defaultdict(set)
for b in behaviour_patterns:
    c2l[b["cluster"]].add(b["interpreted_pattern"])
ok = True
for c, labs in sorted(c2l.items()):
    status = "OK" if len(labs) == 1 else "STILL BROKEN"
    if len(labs) != 1:
        ok = False
    print(f"  cluster {c}: {labs}  [{status}]")

if not ok:
    print("FAILED: bug not fixed, aborting write.")
    sys.exit(1)

with open(PIPELINE_JSON, "w") as f:
    json.dump(pipeline, f, indent=2, default=str)
print(f"\nSaved updated pipeline_output.json ({os.path.getsize(PIPELINE_JSON):,} bytes)")
print("model_evaluation, anomalies, recommendations, alerts, festival_forecasts, meta: UNCHANGED")
