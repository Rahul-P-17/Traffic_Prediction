"""
Single source of truth for the model's feature vector.

BOTH scripts/build_pipeline.py (training) and ml-service/app/main.py
(serving) import FEATURES from this module. Before this fix, the two
files maintained separately hand-typed copies of the same 32-item list.
They happened to match, but nothing enforced that going forward, and a
saved XGBoost booster does not store feature names when trained from a
plain numpy array (as this project's training code does), so a future
edit to one copy without the other would silently corrupt inference
with no runtime error. This module removes that failure mode.

Order matters: XGBoost's saved booster has no feature-name metadata for
this model, so position in this list IS the feature's identity at
inference time. Do not reorder without retraining.
"""

FEATURES = [
    # Temporal
    "hour", "day_of_week", "is_weekend", "month", "season", "day_of_year",
    # Zone characteristics
    "zone_type_enc", "road_capacity_norm",
    # Weather
    "rain_mm_per_hr", "temperature", "speed_factor_weather", "capacity_factor_weather",
    # Festival
    "festival_flag", "festival_proximity", "festival_multiplier",
    # Activity schedules
    "school_activity", "office_activity", "shopping_activity",
    # Synthetic contextual
    "syn_public_transport_activity", "syn_parking_occupancy",
    "syn_accident_flag", "syn_accident_severity",
    "syn_construction_flag", "syn_construction_impact",
    # Lag features
    "lag_1h", "lag_2h", "lag_3h", "lag_6h", "lag_24h",
    # Rolling means
    "rolling_mean_3h", "rolling_mean_6h", "rolling_mean_24h",
]

TARGET = "vehicle_count"
