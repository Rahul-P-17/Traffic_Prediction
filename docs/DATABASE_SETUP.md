# Database Setup Guide

## Chennai Metropolitan Region Traffic System

MySQL is the **only** runtime database for this backend. There is no SQLite
fallback — an earlier revision had SQLite as the actual runtime path while
`mysql_schema.sql` existed unused; that has been fixed (see `FINAL_AUDIT.md`).

---

## Prerequisites

- MySQL 8.0+ (or MariaDB 10.6+) installed and running
- A MySQL/MariaDB admin login able to create databases and users

---

## Setup steps

### 1. Create the database and an app user

**Linux/macOS:**
```bash
mysql -u root -p -e "
  CREATE DATABASE chennai_traffic CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER 'traffic_app'@'localhost' IDENTIFIED BY 'your_secure_password';
  GRANT ALL PRIVILEGES ON chennai_traffic.* TO 'traffic_app'@'localhost';
  FLUSH PRIVILEGES;
"
```

**Windows PowerShell** (assuming `mysql` is on PATH):
```powershell
mysql -u root -p -e "CREATE DATABASE chennai_traffic CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER 'traffic_app'@'localhost' IDENTIFIED BY 'your_secure_password'; GRANT ALL PRIVILEGES ON chennai_traffic.* TO 'traffic_app'@'localhost'; FLUSH PRIVILEGES;"
```

### 2. Configure environment variables

```powershell
Copy-Item backend\.env.example backend\.env
notepad backend\.env   # set DB_PASSWORD to the password you used above
```

(Linux/macOS: `cp backend/.env.example backend/.env` then edit it.)

Required variables (see `backend/.env.example`):
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=traffic_app
DB_PASSWORD=your_secure_password
DB_NAME=chennai_traffic
ML_SERVICE_URL=http://localhost:8000
PORT=4000
```

Credentials are **never** hardcoded — `backend/src/db/mysql_pool.ts` reads them
only from these environment variables, and warns loudly at startup if any are
missing.

### 3. Install dependencies and apply schema + seed data

**Windows PowerShell:**
```powershell
cd backend
npm install
npm run db:init
```

**Linux/macOS:**
```bash
cd backend
npm install
npm run db:init
```

`npm run db:init` (backend/src/db/init_mysql.ts) applies `mysql_schema.sql`
(idempotent — safe to re-run) and then seeds every table from
`ml-service/app/models/pipeline_output.json`. It prints row counts on success
and a clear, actionable error (not a stack trace) if the database is
unreachable.

### 4. Start the backend

```powershell
npm run dev
```

On startup the backend calls `checkMysqlConnection()` and **refuses to start**
if MySQL is unreachable, logging exactly what to check (server running?
`.env` correct? database/user created?) rather than failing silently or
falling back to something else.

### 5. Verify MySQL is actually being used

```bash
curl http://localhost:4000/api/health
# {"status":"ok","database":"connected"}

mysql -u traffic_app -p chennai_traffic -e "SELECT COUNT(*) FROM forecasts;"
```

If you stop MySQL and restart the backend, it will exit with a clear error
instead of silently reverting to any local file — there is no local fallback
to revert to.

---

## Schema overview

| Table | Typical rows | Description |
|---|---|---|
| `zones` | 17 | Chennai Metropolitan Region zones |
| `roads` | 34 | Roads (2 per zone), FK → zones, indexed on `zone_id` |
| `forecasts` | ~136 | Cached/precomputed forecast snapshots, indexed on `zone_id`, `horizon`, `forecast_timestamp` |
| `behaviour_patterns` | ~34 | K-Means cluster assignments |
| `anomalies` | ~20-30 | Isolation-Forest-flagged anomalies, indexed on `severity` |
| `alerts` | varies | Active system alerts, indexed on `status` |
| `recommendations` | varies | Rule/ML-driven recommendations |
| `festival_forecasts` | ~400+ | Festival scenarios × phases × zones, indexed on `festival_name`, `festival_phase` |
| `model_evaluations` | 2 | XGBoost + Random Forest metrics |
| `simulation_scenarios` | grows | Dashboard simulation context, indexed on `simulation_date` |
| `data_sources` | 10 | Data provenance records |
| `chat_queries` | grows | Chatbot query log |

Note: these tables back the dashboard's **precomputed/cached** endpoints.
`/predict_live` (the live-inference endpoint) does not read from MySQL at
all for its prediction — it calls the FastAPI ML service directly, which
builds its feature vector from `data/processed/chennai_master.parquet` (see
`ml-service/app/feature_store.py`).

---

## Refreshing data

To re-generate the synthetic dataset and retrain models, then re-seed MySQL:
```bash
python scripts/build_pipeline.py
cd backend && npm run db:init
```
