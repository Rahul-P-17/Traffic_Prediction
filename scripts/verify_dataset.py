"""
Dataset Verification Script
============================
Validates the generated Chennai synthetic dataset.
Run after build_pipeline.py:
  python scripts/verify_dataset.py
"""
import os, sys, json
import numpy as np
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PARQUET = os.path.join(ROOT, "data", "processed", "chennai_master.parquet")
JSON_OUT = os.path.join(ROOT, "ml-service", "app", "models", "pipeline_output.json")

errors = []
warnings = []

def check(condition, msg_pass, msg_fail, is_warning=False):
    if condition:
        print(f"  [PASS] {msg_pass}")
    else:
        tag = "[WARN]" if is_warning else "[FAIL]"
        print(f"  {tag} {msg_fail}")
        if is_warning:
            warnings.append(msg_fail)
        else:
            errors.append(msg_fail)

print("\n" + "="*60)
print("Chennai Dataset Verification")
print("="*60)

# 1. FILE EXISTENCE
print("\n[1] File existence checks")
check(os.path.exists(PARQUET), f"Parquet exists", "Parquet NOT FOUND")
check(os.path.exists(JSON_OUT), "pipeline_output.json exists", "pipeline_output.json NOT FOUND")

if not os.path.exists(PARQUET):
    print("\n[FAIL] Cannot proceed without dataset. Run build_pipeline.py first.")
    sys.exit(1)

# 2. SCHEMA
print("\n[2] Schema checks")
df = pd.read_parquet(PARQUET)
print(f"     Rows: {len(df):,}  |  Columns: {len(df.columns)}")

required_cols = [
    "zone_id", "zone_name", "zone_type", "road_id", "road_name",
    "timestamp", "vehicle_count", "average_speed", "congestion_level",
    "hour", "day_of_week", "is_weekend", "month", "season",
    "weather_condition", "rain_mm_per_hr", "temperature",
    "festival_flag", "festival_name", "festival_phase",
    "school_activity", "office_activity", "shopping_activity",
    "syn_public_transport_activity", "syn_parking_occupancy",
    "syn_accident_flag", "syn_construction_flag",
    "lag_1h", "lag_24h", "rolling_mean_6h",
    "source_type", "generated_flag",
]
for col in required_cols:
    check(col in df.columns, f"Column '{col}' present", f"Column '{col}' MISSING")

# 3. SIZE
print("\n[3] Dataset size checks")
check(len(df) >= 100_000, f"Sufficient rows: {len(df):,}", f"Too few rows: {len(df):,}")
n_zones = df["zone_id"].nunique()
n_roads = df["road_id"].nunique()
check(n_zones >= 15, f"Zones: {n_zones} (>=15)", f"Too few zones: {n_zones}")
check(n_roads >= 30, f"Roads: {n_roads} (>=30)", f"Too few roads: {n_roads}")
months = df["month"].nunique()
check(months >= 6, f"Months covered: {months}", f"Too few months: {months}")
hours = df["hour"].nunique()
check(hours == 24, "All 24 hours present", f"Missing hours: only {hours}")

# 4. MISSING VALUES
print("\n[4] Missing value checks")
for col in ["vehicle_count", "average_speed", "hour", "day_of_week", "zone_id"]:
    nulls = df[col].isna().sum()
    check(nulls == 0, f"No nulls in '{col}'", f"{nulls} nulls in '{col}'")

lag_nulls = df["lag_1h"].isna().sum()
check(lag_nulls == 0, "No nulls in lag_1h",
      f"{lag_nulls} nulls in lag_1h", is_warning=(lag_nulls > 0))

# 5. IMPOSSIBLE VALUES
print("\n[5] Impossible value checks")
neg_vol = (df["vehicle_count"] < 0).sum()
check(neg_vol == 0, "No negative vehicle counts", f"{neg_vol} negative vehicle counts")
zero_vol = (df["vehicle_count"] == 0).sum()
check(zero_vol == 0, "No zero vehicle counts", f"{zero_vol} zero vehicle counts", is_warning=True)
neg_speed = (df["average_speed"] <= 0).sum()
check(neg_speed == 0, "No zero/negative speeds", f"{neg_speed} zero/negative speeds")
very_high = (df["average_speed"] > 150).sum()
check(very_high == 0, "No speeds > 150 km/h", f"{very_high} rows speed > 150", is_warning=True)
neg_rain = (df["rain_mm_per_hr"] < 0).sum()
check(neg_rain == 0, "No negative rain values", f"{neg_rain} negative rain values")
bad_hour = ((df["hour"] < 0) | (df["hour"] > 23)).sum()
check(bad_hour == 0, "Hour values 0-23", f"{bad_hour} invalid hour values")
pt_out = ((df["syn_public_transport_activity"] < 0) | (df["syn_public_transport_activity"] > 1)).sum()
check(pt_out == 0, "Public transport index in [0,1]", f"{pt_out} out-of-range PT values")
park_out = ((df["syn_parking_occupancy"] < 0) | (df["syn_parking_occupancy"] > 1)).sum()
check(park_out == 0, "Parking occupancy in [0,1]", f"{park_out} out-of-range parking values")

# 6. TRAFFIC VOLUMES
print("\n[6] Traffic volume range checks")
vol_stats = df.groupby("zone_type")["vehicle_count"].describe()
print("     Zone type volume summary (min / median / max):")
for zt, row in vol_stats.iterrows():
    print(f"       {zt:20s}  min={row['min']:.0f}  median={row['50%']:.0f}  max={row['max']:.0f}")
    check(row["max"] <= 15000, f"{zt}: max volume <=15000",
          f"{zt}: max volume {row['max']:.0f} too high", is_warning=(row["max"] > 15000))
    check(row["50%"] > 50, f"{zt}: median volume > 50",
          f"{zt}: median volume {row['50%']:.0f} too low")

# 7. SPEED RANGES
print("\n[7] Speed range checks")
speed_stats = df.groupby("zone_type")["average_speed"].describe()
print("     Zone type speed summary (min / median / max):")
for zt, row in speed_stats.iterrows():
    print(f"       {zt:20s}  min={row['min']:.1f}  median={row['50%']:.1f}  max={row['max']:.1f}")
    check(5 <= row["50%"] <= 100,
          f"{zt}: median speed in range",
          f"{zt}: median speed {row['50%']:.1f} out of range")

# 8. CONGESTION
print("\n[8] Congestion logic checks")
low_r = (df["congestion_level"] == "LOW").sum()
mod_r = (df["congestion_level"] == "MODERATE").sum()
hvy_r = (df["congestion_level"] == "HEAVY").sum()
total = len(df)
print(f"     LOW: {low_r/total*100:.1f}%  MODERATE: {mod_r/total*100:.1f}%  HEAVY: {hvy_r/total*100:.1f}%")
check(low_r > 0, "Some LOW congestion rows", "No LOW congestion rows")
check(hvy_r > 0, "Some HEAVY congestion rows", "No HEAVY congestion rows")
check(hvy_r / total < 0.50, "HEAVY congestion < 50%", f"Too many HEAVY rows: {hvy_r/total*100:.1f}%")

# 9. FESTIVAL EFFECTS
print("\n[9] Festival effect checks")
fest_rows = df[df["festival_flag"] == 1]
normal_rows = df[df["festival_flag"] == 0]
check(len(fest_rows) > 0, f"Festival rows present: {len(fest_rows):,}", "No festival rows found")
if len(fest_rows) > 0:
    fest_avg = fest_rows["vehicle_count"].mean()
    normal_avg = normal_rows["vehicle_count"].mean()
    ratio = fest_avg / max(normal_avg, 1)
    print(f"     Festival avg: {fest_avg:.0f}  |  Normal avg: {normal_avg:.0f}  |  Ratio: {ratio:.2f}")
    check(ratio != 1.0, f"Festival volumes differ (ratio={ratio:.2f})", "Festival volumes identical to normal")
    phases = df["festival_phase"].value_counts()
    print(f"     Festival phases: {dict(phases)}")
    check("day_before" in df["festival_phase"].values, "day_before phase present", "day_before missing")
    check("festival_day" in df["festival_phase"].values, "festival_day phase present", "festival_day missing")

# 10. WEATHER EFFECTS
print("\n[10] Weather effect checks")
weather_spd = df.groupby("weather_condition")["average_speed"].mean()
print("     Avg speed by weather:")
for wc, spd in weather_spd.items():
    print(f"       {wc:20s}: {spd:.1f} km/h")
if "clear" in weather_spd and "heavy_rain" in weather_spd:
    check(weather_spd["clear"] > weather_spd["heavy_rain"],
          "Clear > heavy_rain speed", "Weather speed effect not working")
if "clear" in weather_spd and "moderate_rain" in weather_spd:
    check(weather_spd["clear"] > weather_spd["moderate_rain"],
          "Clear > moderate_rain speed", "Moderate rain effect not working")

# 11. SCHEDULE
print("\n[11] Activity schedule checks")
school_zones = df[df["zone_type"] == "school"]
if len(school_zones) > 0:
    sp = school_zones[school_zones["hour"].isin([7, 8, 13, 14])]["vehicle_count"].mean()
    so = school_zones[school_zones["hour"].isin([0, 1, 2, 3])]["vehicle_count"].mean()
    check(sp > so, "School zones higher peak vs overnight", "School peak not higher than overnight")

office_zones = df[df["zone_type"].isin(["office", "it_corridor"])]
if len(office_zones) > 0:
    op = office_zones[office_zones["hour"].isin([8, 9])]["vehicle_count"].mean()
    oo = office_zones[office_zones["hour"].isin([2, 3])]["vehicle_count"].mean()
    check(op > oo, "Office zones higher AM-peak vs overnight", "Office AM peak not higher than overnight")

# 12. TEMPORAL
print("\n[12] Temporal ordering checks")
ts_min = df["timestamp"].min()
ts_max = df["timestamp"].max()
days_span = (ts_max - ts_min).days
check(days_span >= 180, f"Dataset spans {days_span} days (>=180)", f"Dataset too short: {days_span} days")
print(f"     Date range: {ts_min.date()} to {ts_max.date()} ({days_span} days)")

# 13. JSON OUTPUT
print("\n[13] Pipeline output JSON checks")
if os.path.exists(JSON_OUT):
    with open(JSON_OUT) as f:
        pj = json.load(f)

    check("zones" in pj, "zones key present", "zones key missing")
    check("model_evaluation" in pj, "model_evaluation present", "model_evaluation missing")
    check("forecasts" in pj, "forecasts present", "forecasts missing")
    check("behaviour_patterns" in pj, "behaviour_patterns present", "behaviour_patterns missing")
    check("anomalies" in pj, "anomalies present", "anomalies missing")
    check("festival_forecasts" in pj, "festival_forecasts present", "festival_forecasts missing")

    n_zones_json = len(pj.get("zones", []))
    check(n_zones_json >= 15, f"JSON has {n_zones_json} zones (>=15)", f"JSON only {n_zones_json} zones")

    n_fc = len(pj.get("forecasts", []))
    check(n_fc > 0, f"Forecasts in JSON: {n_fc}", "No forecasts in JSON")

    xgb = pj.get("model_evaluation", {}).get("XGBoost", {})
    xgb_r2 = xgb.get("R2", 0)
    check(0 < xgb_r2 <= 1.0, f"XGBoost R2 = {xgb_r2:.4f} (valid)", f"XGBoost R2 = {xgb_r2} (invalid)")
    check(xgb_r2 not in [0.9829, 0.9819],
          f"XGBoost R2 is not a hard-coded UCI value ({xgb_r2:.4f})",
          f"XGBoost R2 = {xgb_r2} looks hard-coded (old UCI value)")

    rf = pj.get("model_evaluation", {}).get("RandomForest", {})
    rf_r2 = rf.get("R2", 0)
    check(0 < rf_r2 <= 1.0, f"RandomForest R2 = {rf_r2:.4f} (valid)", f"RandomForest R2 = {rf_r2} (invalid)")

    sim_ctx = pj.get("simulation_context", {})
    sim_date = sim_ctx.get("simulation_date", "")
    check(bool(sim_date), "simulation_date present", "simulation_date missing")
    check("2018" not in str(sim_date), f"simulation_date is {sim_date} (not 2018 UCI data)",
          f"simulation_date is {sim_date} -- old UCI data still in use!")

    dc = pj.get("meta", {}).get("primary_dataset_type", "")
    check("SYNTHETIC" in dc.upper(), f"Data labelled: {dc}", f"Data not labelled SYNTHETIC: {dc}")

    print(f"\n     Model Metrics Summary:")
    print(f"       XGBoost  - MAE={xgb.get('MAE','?')}  RMSE={xgb.get('RMSE','?')}  R2={xgb.get('R2','?')}")
    print(f"       RandForest - MAE={rf.get('MAE','?')}  RMSE={rf.get('RMSE','?')}  R2={rf.get('R2','?')}")
    split = pj.get("model_evaluation", {}).get("split", {})
    print(f"       Split method: {split.get('method','?')}")
    print(f"       Train period: {split.get('train_period','?')}")
    print(f"       Test period:  {split.get('test_period','?')}")

# SUMMARY
print(f"\n{'='*60}")
print("VERIFICATION SUMMARY")
print(f"  Errors:   {len(errors)}")
print(f"  Warnings: {len(warnings)}")
if errors:
    print("\n  ERRORS:")
    for e in errors:
        print(f"    [FAIL] {e}")
if warnings:
    print("\n  WARNINGS:")
    for w in warnings:
        print(f"    [WARN] {w}")
if not errors:
    print(f"\n  [PASS] Dataset verification PASSED ({len(warnings)} warnings)")
else:
    print("\n  [FAIL] Dataset verification FAILED")
print("="*60 + "\n")
