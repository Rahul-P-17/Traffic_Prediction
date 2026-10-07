-- ============================================================
-- Chennai Metropolitan Region — MySQL Schema (PRIMARY runtime DB)
-- ============================================================
-- MySQL is the actual runtime database for this backend — there is no
-- SQLite fallback. Applied automatically by `npm run db:init`
-- (backend/src/db/init_mysql.ts) against whatever database the
-- connection pool is configured for (DB_NAME in .env).
--
-- This file intentionally does NOT contain CREATE DATABASE / USE —
-- the target database and its user must be created once (see
-- README.md "Database setup"), so the schema is applied against
-- exactly the database named in .env rather than a name hardcoded
-- here that could silently diverge from your configuration.
-- ============================================================

-- ---- Zones ----
CREATE TABLE IF NOT EXISTS zones (
  zone_id VARCHAR(10) PRIMARY KEY,
  zone_name VARCHAR(100) NOT NULL,
  area_name VARCHAR(100),
  district VARCHAR(100) DEFAULT 'Chennai',
  zone_type VARCHAR(50),
  latitude DOUBLE,
  longitude DOUBLE,
  description TEXT,
  festival_sensitivity DOUBLE DEFAULT 0.5,
  weather_sensitivity DOUBLE DEFAULT 0.4,
  weekend_factor DOUBLE DEFAULT 0.8,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---- Roads ----
CREATE TABLE IF NOT EXISTS roads (
  road_id VARCHAR(10) PRIMARY KEY,
  road_name VARCHAR(200) NOT NULL,
  zone_id VARCHAR(10),
  capacity INT DEFAULT 5000,
  road_type VARCHAR(50) DEFAULT 'arterial',
  speed_limit INT DEFAULT 50,
  lanes INT DEFAULT 2,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (zone_id) REFERENCES zones(zone_id) ON DELETE SET NULL
) ENGINE=InnoDB;
CREATE INDEX idx_roads_zone ON roads(zone_id);

-- ---- Traffic records ----
CREATE TABLE IF NOT EXISTS traffic_records (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  road_id VARCHAR(10),
  zone_id VARCHAR(10),
  timestamp DATETIME NOT NULL,
  vehicle_count INT,
  average_speed DOUBLE,
  congestion_level VARCHAR(20),
  source_type VARCHAR(50) DEFAULT 'SYNTHETIC',
  generated_flag TINYINT DEFAULT 1,
  INDEX idx_traffic_ts (timestamp),
  INDEX idx_traffic_road (road_id),
  INDEX idx_traffic_zone (zone_id)
) ENGINE=InnoDB;

-- ---- Forecasts ----
CREATE TABLE IF NOT EXISTS forecasts (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  zone_id VARCHAR(10),
  zone_name VARCHAR(100),
  zone_type VARCHAR(50),
  road_id VARCHAR(10),
  road_name VARCHAR(200),
  road_capacity INT,
  horizon VARCHAR(30),
  forecast_timestamp DATETIME,
  simulation_date DATE,
  predicted_traffic_volume DOUBLE,
  congestion_level VARCHAR(20),
  expected_demand DOUBLE,
  festival_context VARCHAR(100) DEFAULT 'None',
  is_fallback_date TINYINT DEFAULT 0,
  fallback_reason TEXT,
  latitude DOUBLE,
  longitude DOUBLE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fc_zone (zone_id),
  INDEX idx_fc_horizon (horizon),
  INDEX idx_fc_timestamp (forecast_timestamp)
) ENGINE=InnoDB;

-- ---- Behaviour patterns ----
CREATE TABLE IF NOT EXISTS behaviour_patterns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  zone_id VARCHAR(10),
  zone_name VARCHAR(100),
  zone_type VARCHAR(50),
  is_weekend TINYINT DEFAULT 0,
  cluster INT,
  interpreted_pattern VARCHAR(200),
  peak_hour INT,
  -- The fields below are what makes the interpretation checkable rather
  -- than a bare label: they are the actual per-cluster statistics the
  -- interpretation was derived FROM (see scripts/build_pipeline.py's
  -- cluster_stats computation). Two rows sharing a cluster ID always share
  -- these values — they are cluster-level, not per-zone.
  peak_hours JSON,
  weekday_average DOUBLE,
  weekend_average DOUBLE,
  morning_peak_strength DOUBLE,
  evening_peak_strength DOUBLE,
  congestion_frequency DOUBLE,
  cluster_members_count INT,
  hourly_profile JSON,
  INDEX idx_bp_cluster (cluster)
) ENGINE=InnoDB;

-- ---- Anomalies ----
CREATE TABLE IF NOT EXISTS anomalies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  zone_id VARCHAR(10),
  zone_name VARCHAR(100),
  road_name VARCHAR(200),
  timestamp DATETIME,
  expected_traffic DOUBLE,
  observed_traffic INT,
  anomaly_score DOUBLE,
  anomaly_type VARCHAR(200),
  severity VARCHAR(20),
  weather_condition VARCHAR(50) DEFAULT '',
  festival_context VARCHAR(100) DEFAULT '',
  INDEX idx_anom_sev (severity)
) ENGINE=InnoDB;

-- ---- Alerts ----
CREATE TABLE IF NOT EXISTS alerts (
  alert_id VARCHAR(20) PRIMARY KEY,
  type VARCHAR(50),
  severity VARCHAR(20),
  location VARCHAR(200),
  zone_name VARCHAR(100),
  timestamp DATETIME,
  message TEXT,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  INDEX idx_alerts_status (status)
) ENGINE=InnoDB;

-- ---- Recommendations ----
CREATE TABLE IF NOT EXISTS recommendations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(100),
  target_zone VARCHAR(10),
  zone_name VARCHAR(100),
  road_name VARCHAR(200),
  message TEXT,
  reason TEXT,
  horizon VARCHAR(30),
  congestion_level VARCHAR(20),
  label VARCHAR(100) DEFAULT 'AI-Generated Recommendation'
) ENGINE=InnoDB;

-- ---- Festival forecasts ----
CREATE TABLE IF NOT EXISTS festival_forecasts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  festival_name VARCHAR(100),
  festival_phase VARCHAR(30),
  zone_id VARCHAR(10),
  zone_name VARCHAR(100),
  zone_type VARCHAR(50),
  road_id VARCHAR(10),
  road_name VARCHAR(200),
  avg_festival_volume DOUBLE,
  avg_normal_volume DOUBLE,
  demand_multiplier DOUBLE,
  peak_hour INT,
  congestion_level VARCHAR(20),
  narrative TEXT,
  label VARCHAR(200),
  latitude DOUBLE,
  longitude DOUBLE,
  INDEX idx_ff_festival (festival_name),
  INDEX idx_ff_phase (festival_phase)
) ENGINE=InnoDB;

-- ---- Model evaluations ----
CREATE TABLE IF NOT EXISTS model_evaluations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  model_name VARCHAR(100),
  dataset VARCHAR(200) DEFAULT 'Chennai Synthetic',
  mae DOUBLE,
  rmse DOUBLE,
  r2 DOUBLE,
  val_mae DOUBLE,
  val_rmse DOUBLE,
  val_r2 DOUBLE,
  split_method VARCHAR(100) DEFAULT 'chronological',
  train_period VARCHAR(100),
  test_period VARCHAR(100),
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---- Simulation scenarios ----
CREATE TABLE IF NOT EXISTS simulation_scenarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  scenario_name VARCHAR(200),
  simulation_date DATE,
  scenario_type VARCHAR(50),
  festival_name VARCHAR(100),
  festival_phase VARCHAR(30),
  weather_condition VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sim_date (simulation_date)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS data_sources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200),
  type VARCHAR(100),
  detail TEXT,
  source_url VARCHAR(500),
  data_quality VARCHAR(50),
  notes TEXT
) ENGINE=InnoDB;

-- ---- Chat queries ----
CREATE TABLE IF NOT EXISTS chat_queries (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  question TEXT,
  answer TEXT,
  source VARCHAR(100),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
