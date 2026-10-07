# Model Evaluation

Actual results from the last pipeline run (chronological 70/15/15 split, test = most recent 15% of
the timeline):

XGBoost   — MAE 218.72, RMSE 319.84, R² 0.983
RandomForest — MAE 219.73, RMSE 330.23, R² 0.982
Best model: XGBoost

These are read live from `ml-service/app/models/pipeline_output.json` / the `model_evaluations` MySQL
table / `GET /api/ml/evaluation` — re-run `scripts/build_pipeline.py` to regenerate them from scratch.
