# Final Implementation Report — Review 1

1. **Dataset selected**: Metro Interstate Traffic Volume
2. **Dataset source**: UCI Machine Learning Repository (id 492), originally MnDOT ATR station 301, I-94 Westbound MN. CC BY 4.0.
3. **Dataset coverage**: 2012-10-02 to 2018-09-30, hourly, single physical location; multi-zone dashboard structure derived from it (see below).
4. **Number of records**: 48,151 unique real hourly records (raw); 202,755 rows in the final master dataset after 5-zone expansion, lag features, and dropping the first 24h per zone.
5. **Data sources integrated**: real historical traffic + real weather (temp/rain/snow/clouds) + real US holiday flag from the primary dataset, plus 7 synthetic/demo context sources (public transport GPS, events/festivals, school/office timing, construction, parking, accidents) and a derived multi-zone/road structure.
6. **Real vs synthetic sources**: 2 real (traffic volume, weather+holiday) / 1 derived (zones/roads) / 7 synthetic (public transport, events, school/office, construction, parking, accidents, festival calendar). All labeled in `GET /api/data-sources` and the dashboard's System tab.
7. **Features used**: hour, day_of_week, is_weekend, month, season, is_holiday, temp, rain_1h, snow_1h, clouds_all, lag_1h, lag_24h, rolling_avg_6h, syn_public_transport_activity, syn_school_timing, syn_office_timing, syn_construction_impact, syn_parking_occupancy, syn_accident_flag, syn_accident_severity, syn_event_presence, syn_event_crowd_level.
8. **Behaviour analysis method**: K-Means (k=4) on standardized aggregated hourly traffic profiles per (zone, weekday/weekend), interpreted post hoc by temporal shape.
9. **XGBoost results (actual test-set)**: MAE 218.721, RMSE 319.840, R² 0.983.
10. **Random Forest results (actual test-set)**: MAE 219.728, RMSE 330.226, R² 0.982.
11. **Best model**: XGBoost (marginally lower RMSE and higher R²).
12–14. **MAE / RMSE / R²**: see 9–10 above (XGBoost is primary).
15. **Classification results**: not implemented for Review 1 — regression (traffic volume) was prioritized per the spec; congestion level is derived post hoc from predicted volume vs. per-zone-type capacity, not a separate classifier.
16. **Anomaly detection methodology**: Isolation Forest (`n_estimators=200, contamination=0.02`) on `[traffic_volume, hour, day_of_week, rain_1h, syn_accident_flag]`, scored on the most recent 60 days; 25 anomalies surfaced, ranked by anomaly score, typed conservatively (accident-linked only when the synthetic accident flag is actually set).
17. **Forecasting methodology**: trained XGBoost model applied to feature rows built from each horizon's target timestamp (next 1h/6h/tomorrow/next-weekend) using the zone's most recent lag/rolling/context values; congestion level derived from a documented per-zone-type capacity table.
18. **Recommendation methodology**: rule-based engine over forecasts/anomalies/synthetic context (alternate route, extra buses, temporary diversion), each with an explicit reason string and "AI-Generated Recommendation" label.
19. **Chatbot implementation**: deterministic retrieval-based intent matcher over `pipeline_output.json` — no LLM API key required, no hallucination risk, explicit fallback for unmatched questions.
20. **Festival Mode implementation**: synthetic festival calendar (Diwali/Pongal/Christmas, 2012–2018) drives per-zone average-volume/peak-hour comparisons; every response labeled `"Scenario / Demo Forecast"`.
21. **Privacy implementation**: no PII fields in schema; public transport stored as an aggregated 0–1 index only; no facial/emotion/individual analysis anywhere in the pipeline.
22. **Known limitations**: single real sensor underlies all "real" traffic figures; 7 of 8 contextual sources are synthetic/demo; festival scenario is not learned from real history; no auth layer. Full list in README §28.
23. **Exact steps to run the project**:
```bash
cd ml-service && pip install -r requirements.txt
cd .. && python3 scripts/build_pipeline.py
cd ml-service && uvicorn app.main:app --port 8000 &
cd ../backend && npm install && npm run build && DEMO_MODE=true ML_SERVICE_URL=http://127.0.0.1:8000 node dist/server.js &
cd ../frontend && npm install && npm run dev
# open http://localhost:5173
```

All numerical results in this report were produced by actually executing `scripts/build_pipeline.py`
in this session and reading the printed/saved output — none were fabricated or estimated.
