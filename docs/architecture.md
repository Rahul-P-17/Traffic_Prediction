# Architecture

```
React (Vite/TS/Tailwind/Leaflet/Recharts)
        |  HTTP (proxied /api)
Node.js + Express + TypeScript  <---- MySQL (chennai_traffic DB, seeded from pipeline_output.json via npm run db:init)
        |  HTTP (chat, festival)
FastAPI ML Service (Python)
        |  reads
ml-service/app/models/pipeline_output.json  <---- produced by scripts/build_pipeline.py
        |  trained on
data/processed/master_dataset.parquet (real UCI dataset + derived zones + synthetic context)
```

`scripts/build_pipeline.py` is the single source of truth: it loads the real dataset, builds the
master dataset, trains XGBoost/RandomForest (chronological split), runs KMeans behaviour clustering
and IsolationForest anomaly detection, computes forecasts/recommendations/alerts/festival scenarios,
and writes everything to `pipeline_output.json`. The Express backend loads that JSON into MySQL at
startup; the FastAPI service reads it directly for `/chat/query` and `/festival/forecast`. Re-running
the script regenerates every number end-to-end — nothing downstream is hardcoded.
