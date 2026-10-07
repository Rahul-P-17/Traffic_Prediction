# AI-Based Human Behaviour Analysis for Smart Traffic Management
## Chennai Metropolitan Region Simulation System — Review 1

---

## Overview

This project implements an AI-driven traffic analysis and simulation system for the **Chennai Metropolitan Region, Tamil Nadu, India**. It demonstrates multi-zone traffic behaviour prediction, human mobility pattern analysis, festival/weather effect modelling, and smart recommendations using machine learning.

**Architecture:** React + Vite + TypeScript frontend | Node.js + Express backend | Python + FastAPI ML service

---

## Quick Start

### 1. Generate the Chennai dataset and train models (required first time)
```bash
cd AI-Human-Behavior-Smart-Traffic-Review1
.venv\Scripts\python.exe scripts/build_pipeline.py
```
This generates ~297,000 hourly synthetic records for 17 Chennai zones and trains XGBoost + Random Forest.

### 2. Start the ML service
```bash
cd ml-service
..\\.venv\Scripts\uvicorn app.main:app --port 8000 --reload
```

### 3. Start the backend
```bash
cd backend
npm run dev
```

### 4. Start the frontend
```bash
cd frontend
npm run dev
```
Frontend available at: http://localhost:5173

---

## Study Region

**Chennai Metropolitan Region, Tamil Nadu, India**
- 17 zones spanning the Chennai Metropolitan Development Authority (CMDA) planning area
- Includes core city zones, IT corridors, intercity bus terminals, and peripheral industrial zones
- Geographic coverage: approximately 12.88°N–13.19°N, 79.94°E–80.27°E

---

## Review 1 Features

| Feature | Implementation |
|---|---|
| Multi-source data integration | 17 zones × 10+ contextual feature streams |
| AI-based traffic prediction | XGBoost (primary), Random Forest (baseline) |
| Human behaviour pattern analysis | K-Means k=7, population-level mobility profiles |
| Congestion forecasting | 4 horizons: next_1h, next_6h, tomorrow, next_weekend |
| Heat-map visualization | Leaflet/OpenStreetMap, centred on Chennai |
| Traffic dashboard | Real-time KPIs, alerts, simulation date display |
| Smart recommendations | AI-generated from forecast + public transport analysis |
| Anomaly detection | Isolation Forest on last 60 days |
| Alert system | Rule-based + anomaly-triggered |
| Privacy protection | Population-level only; no individual data |
| AI chatbot | Retrieval-based; answers Chennai-specific questions |
| Festival mode | 4 festivals × 3 phases; zone-specific narratives |
| What-If Scenario Simulator | Baseline vs. scenario (weather/accident/construction/road closure), live XGBoost inference — see [docs/scenario_simulator.md](docs/scenario_simulator.md) |

---

## Data

See [DATA_PROVENANCE.md](DATA_PROVENANCE.md) for full data source classification.
See [DATA_GENERATION.md](DATA_GENERATION.md) for synthetic data methodology.

**Important:** All traffic volumes are **synthetic / research-grounded**. No real-time sensor data is used.

---

## ML Pipeline

See [ML_METHODOLOGY.md](ML_METHODOLOGY.md) for full methodology.

**Models:**
- **XGBoost** (primary): 400 estimators, early stopping, 28 features
- **Random Forest** (baseline): 200 estimators, max_depth=14
- **K-Means** (behaviour): k=7, on aggregated hourly zone profiles
- **Isolation Forest** (anomaly): contamination=0.02, last 60 days

**Split:** Chronological 70/15/15 (no shuffling = no data leakage)

---

## Database

**MySQL is the primary runtime database** (not SQLite — that was migrated away; see `FINAL_AUDIT.md` for details). See [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md) for setup, and `backend/.env.example` for required environment variables.

Quick start:
```
mysql -u root -p -e "CREATE DATABASE chennai_traffic CHARACTER SET utf8mb4; \
  CREATE USER 'traffic_app'@'localhost' IDENTIFIED BY 'yourpassword'; \
  GRANT ALL PRIVILEGES ON chennai_traffic.* TO 'traffic_app'@'localhost';"
cp backend/.env.example backend/.env   # then edit DB_PASSWORD etc.
cd backend && npm install && npm run db:init && npm run dev
```

