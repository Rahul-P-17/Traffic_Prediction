# Data Pipeline

Ingestion (real CSV + synthetic generators) → de-duplication/chronological sort → zone derivation →
feature engineering (calendar features, lags, rolling average) → chronological split → model
training/clustering/anomaly detection → forecasts/recommendations/alerts/festival scenarios →
`pipeline_output.json` → MySQL (backend, via `npm run db:init`) / direct read (FastAPI) → dashboard. `/predict_live` bypasses this entirely and calls the ML service live — see ml-service/app/feature_store.py.
