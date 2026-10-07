# ML Methodology

- **Primary model**: XGBoost regressor predicting `traffic_volume` per zone/hour.
- **Baseline**: Random Forest regressor, same features.
- **Split**: chronological 70/15/15 (train/val/test) — no shuffling, since traffic is a time series.
- **Metrics**: MAE, RMSE, R² computed on the held-out, strictly-future test set. See
  `docs/model_evaluation.md` and the dashboard's System tab for the actual numbers from the last run.
- **Features**: hour, day_of_week, is_weekend, month, season, is_holiday, temp, rain_1h, snow_1h,
  clouds_all, lag_1h, lag_24h, rolling_avg_6h, plus the synthetic context features
  (`syn_public_transport_activity`, `syn_school_timing`, `syn_office_timing`,
  `syn_construction_impact`, `syn_parking_occupancy`, `syn_accident_flag`, `syn_accident_severity`,
  `syn_event_presence`, `syn_event_crowd_level`). Every feature genuinely exists as a column in the
  master dataset — none are fabricated at inference time beyond the obvious extrapolation needed to
  build a forecast row's calendar features (hour/day/month of the target timestamp).
