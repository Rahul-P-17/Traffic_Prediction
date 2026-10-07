# Feature Engineering

Calendar: hour, day_of_week, is_weekend, month, season, is_holiday.
Lag/rolling: lag_1h, lag_24h, rolling_avg_6h (per zone, computed after chronological sort).
Weather (real): temp, rain_1h, snow_1h, clouds_all.
Synthetic context: syn_public_transport_activity, syn_school_timing, syn_office_timing,
syn_construction_impact, syn_parking_occupancy, syn_accident_flag/severity, syn_event_presence/level.
