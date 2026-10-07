Trained model artifacts are written to `ml-service/app/models/` by `scripts/build_pipeline.py`:
- `xgb_traffic_model.json` (included — ~1.9MB)
- `rf_traffic_model.joblib` (excluded from this zip — ~83MB; regenerate by re-running the pipeline script)
- `pipeline_output.json` (included — all computed predictions/metrics/clusters/anomalies/etc.)
