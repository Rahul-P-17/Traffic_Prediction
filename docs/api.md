# API Reference (selected)

## FastAPI ML Service (port 8000)
GET  /features · GET /evaluation · GET /behaviour/patterns?zone_id=
GET  /anomalies · GET /recommendations
POST /forecast?zone_id=&horizon= · POST /predict?zone_id=
POST /festival/forecast?festival= · POST /chat/query {question}

## Express Backend (port 4000)
GET  /api/traffic/current | historical | predictions | forecast | heatmap
GET  /api/behaviour/patterns · GET /api/recommendations · GET /api/anomalies · GET /api/alerts
GET  /api/weather | events | parking | accidents | data-sources | privacy
POST /api/festival/forecast {festival} · POST /api/chat {question}
GET  /api/ml/evaluation · GET /api/ml/features
GET  /api/zones/:zone_id/roads
POST /api/scenario/simulate {zone_id, road_id, date, time, scenario} — What-If Scenario
     Simulator; see docs/scenario_simulator.md for full details.
