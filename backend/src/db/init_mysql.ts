import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import { pool, checkMysqlConnection } from "./mysql_pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.join(__dirname, "mysql_schema.sql");
const PIPELINE_PATH = path.join(
  __dirname, "..", "..", "..", "ml-service", "app", "models", "pipeline_output.json"
);

/**
 * Splits a .sql file into individual statements on `;` at end-of-line.
 * Good enough for this schema (no stored procedures/triggers with
 * embedded semicolons). mysql2 does not run multi-statement files
 * safely without multipleStatements:true on the pool, so we execute
 * them one at a time instead of widening the pool's attack surface.
 */
function splitStatements(sql: string): string[] {
  // Strip full-line SQL comments first (MySQL "-- comment" lines), then
  // split on statement-terminating semicolons. Doing it in this order
  // avoids accidentally dropping a real statement just because a
  // preceding comment line shared the same chunk after splitting.
  const withoutComments = sql
    .split("\n")
    .filter(line => !line.trim().startsWith("--"))
    .join("\n");
  return withoutComments
    .split(/;\s*(?:\r?\n|$)/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

async function applySchema() {
  const raw = fs.readFileSync(SCHEMA_PATH, "utf-8");
  const statements = splitStatements(raw);
  let applied = 0, skipped = 0;
  for (const stmt of statements) {
    try {
      await pool.query(stmt);
      applied++;
    } catch (err: any) {
      // Genuinely idempotent re-run: CREATE TABLE already uses IF NOT
      // EXISTS, but MySQL has no CREATE INDEX IF NOT EXISTS, so re-running
      // this schema against an already-initialized database used to throw
      // on every index statement. Treat "already exists" as success, not
      // a schema bug — anything else still fails loudly.
      const alreadyExists = ["ER_DUP_KEYNAME", "ER_DUP_FIELDNAME", "ER_TABLE_EXISTS_ERROR"];
      if (alreadyExists.includes(err?.code)) {
        skipped++;
        continue;
      }
      throw err;
    }
  }
  console.log(`[db:init] Schema applied (${applied} run, ${skipped} already present).`);
}

async function seed() {
  const pipeline = JSON.parse(fs.readFileSync(PIPELINE_PATH, "utf-8"));
  const now = new Date();

  // ---- Zones + Roads ----
  for (const z of pipeline.zones) {
    await pool.query(
      `INSERT INTO zones
       (zone_id, zone_name, area_name, district, zone_type, latitude, longitude,
        description, festival_sensitivity, weather_sensitivity, weekend_factor)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         zone_name=VALUES(zone_name), area_name=VALUES(area_name), district=VALUES(district),
         zone_type=VALUES(zone_type), latitude=VALUES(latitude), longitude=VALUES(longitude),
         description=VALUES(description), festival_sensitivity=VALUES(festival_sensitivity),
         weather_sensitivity=VALUES(weather_sensitivity), weekend_factor=VALUES(weekend_factor)`,
      [
        z.zone_id, z.zone_name, z.area_name ?? z.zone_name, z.district ?? "Chennai",
        z.type, z.lat, z.lon, z.description ?? "",
        z.festival_sensitivity ?? 0.5, z.weather_sensitivity ?? 0.4, z.weekend_factor ?? 0.8,
      ]
    );
    for (const r of (z.roads ?? [])) {
      await pool.query(
        `INSERT INTO roads (road_id, road_name, zone_id, capacity, road_type)
         VALUES (?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
           road_name=VALUES(road_name), zone_id=VALUES(zone_id),
           capacity=VALUES(capacity), road_type=VALUES(road_type)`,
        [r.road_id, r.road_name, z.zone_id, r.capacity ?? 5000, r.road_type ?? "arterial"]
      );
    }
  }

  // ---- Clear dynamic tables (re-derived from pipeline_output.json each run) ----
  const dynamicTables = [
    "behaviour_patterns", "anomalies", "forecasts", "recommendations",
    "alerts", "festival_forecasts", "model_evaluations",
    "simulation_scenarios", "data_sources",
  ];
  for (const t of dynamicTables) {
    await pool.query(`DELETE FROM \`${t}\``);
  }

  // ---- Behaviour patterns ----
  for (const b of pipeline.behaviour_patterns) {
    await pool.query(
      `INSERT INTO behaviour_patterns
       (zone_id, zone_name, zone_type, is_weekend, cluster, interpreted_pattern, peak_hour,
        peak_hours, weekday_average, weekend_average, morning_peak_strength,
        evening_peak_strength, congestion_frequency, cluster_members_count, hourly_profile)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        b.zone_id, b.zone_name ?? b.zone_id, b.zone_type ?? "",
        b.is_weekend ? 1 : 0, b.cluster, b.interpreted_pattern,
        b.peak_hour ?? 8,
        JSON.stringify(b.peak_hours ?? []),
        b.weekday_average ?? null, b.weekend_average ?? null,
        b.morning_peak_strength ?? null, b.evening_peak_strength ?? null,
        b.congestion_frequency ?? null, b.cluster_members_count ?? null,
        JSON.stringify(b.hourly_profile),
      ]
    );
  }

  // ---- Anomalies ----
  for (const a of pipeline.anomalies) {
    await pool.query(
      `INSERT INTO anomalies
       (zone_id, zone_name, road_name, timestamp, expected_traffic, observed_traffic,
        anomaly_score, anomaly_type, severity, weather_condition, festival_context)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        a.zone_id, a.zone_name ?? a.zone_id, a.road_name,
        a.timestamp, a.expected_traffic, a.observed_traffic,
        a.anomaly_score, a.anomaly_type, a.severity,
        a.weather_condition ?? "", a.festival_context ?? "",
      ]
    );
  }

  // ---- Forecasts ----
  for (const f of pipeline.forecasts) {
    await pool.query(
      `INSERT INTO forecasts
       (zone_id, zone_name, zone_type, road_id, road_name, road_capacity,
        horizon, forecast_timestamp, simulation_date, predicted_traffic_volume,
        congestion_level, expected_demand, festival_context,
        is_fallback_date, fallback_reason, latitude, longitude)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        f.zone_id, f.zone_name ?? f.zone_id, f.zone_type ?? "",
        f.road_id ?? "", f.road_name, f.road_capacity ?? 5000,
        f.horizon, f.forecast_timestamp,
        f.simulation_date ?? (pipeline.simulation_context?.simulation_date ?? null),
        f.predicted_traffic_volume, f.congestion_level, f.expected_demand,
        f.festival_context ?? "None",
        f.is_fallback_date ? 1 : 0, f.fallback_reason ?? null,
        f.latitude ?? 13.08, f.longitude ?? 80.27,
      ]
    );
  }

  // ---- Recommendations ----
  for (const r of pipeline.recommendations) {
    await pool.query(
      `INSERT INTO recommendations
       (type, target_zone, zone_name, road_name, message, reason, horizon, congestion_level, label)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        r.type, r.target_zone, r.zone_name ?? r.target_zone,
        r.road_name ?? "", r.message, r.reason, r.horizon,
        r.congestion_level ?? "", r.label ?? "AI-Generated Recommendation",
      ]
    );
  }

  // ---- Alerts ----
  for (const a of pipeline.alerts) {
    await pool.query(
      `INSERT INTO alerts (alert_id, type, severity, location, zone_name, timestamp, message, status)
       VALUES (?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         type=VALUES(type), severity=VALUES(severity), location=VALUES(location),
         zone_name=VALUES(zone_name), timestamp=VALUES(timestamp),
         message=VALUES(message), status=VALUES(status)`,
      [a.alert_id, a.type, a.severity, a.location, a.zone_name ?? a.location, a.timestamp, a.message, a.status ?? "ACTIVE"]
    );
  }

  // ---- Festival forecasts ----
  for (const [fname, fobj] of Object.entries<any>(pipeline.festival_forecasts)) {
    if (fobj.phases) {
      for (const [phase, pdata] of Object.entries<any>(fobj.phases)) {
        for (const z of (pdata.zones ?? [])) {
          await pool.query(
            `INSERT INTO festival_forecasts
             (festival_name, festival_phase, zone_id, zone_name, zone_type,
              road_id, road_name, avg_festival_volume, avg_normal_volume,
              demand_multiplier, peak_hour, congestion_level, narrative, label,
              latitude, longitude)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              fname, phase, z.zone_id, z.zone_name ?? z.zone_id, z.zone_type ?? "",
              z.road_id ?? "", z.road_name, z.avg_festival_volume, z.avg_normal_volume,
              z.demand_multiplier ?? 1.0, z.peak_hour, z.congestion_level,
              z.narrative ?? "", pdata.label ?? "", z.latitude ?? 13.08, z.longitude ?? 80.27,
            ]
          );
        }
      }
    } else {
      for (const z of (fobj.zones ?? [])) {
        await pool.query(
          `INSERT INTO festival_forecasts
           (festival_name, festival_phase, zone_id, zone_name, zone_type,
            road_id, road_name, avg_festival_volume, avg_normal_volume,
            demand_multiplier, peak_hour, congestion_level, narrative, label,
            latitude, longitude)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            fname, "festival_day", z.zone_id, z.zone_name ?? z.zone_id, z.zone_type ?? "",
            z.road_id ?? "", z.road_name, z.avg_festival_volume, z.avg_normal_volume,
            z.demand_multiplier ?? 1.0, z.peak_hour, z.congestion_level,
            z.narrative ?? "", fobj.label ?? "", z.latitude ?? 13.08, z.longitude ?? 80.27,
          ]
        );
      }
    }
  }

  // ---- Model evaluations ----
  const split = pipeline.model_evaluation.split ?? {};
  for (const [mname, mdata] of Object.entries<any>(pipeline.model_evaluation)) {
    if (typeof mdata !== "object" || !("MAE" in mdata)) continue;
    await pool.query(
      `INSERT INTO model_evaluations
       (model_name, dataset, mae, rmse, r2, val_mae, val_rmse, val_r2,
        split_method, train_period, test_period, generated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        mname, pipeline.meta?.primary_dataset ?? "Chennai Synthetic",
        mdata.MAE ?? 0, mdata.RMSE ?? 0, mdata.R2 ?? 0,
        mdata.val?.MAE ?? 0, mdata.val?.RMSE ?? 0, mdata.val?.R2 ?? 0,
        split.method ?? "chronological", split.train_period ?? "", split.test_period ?? "",
        now,
      ]
    );
  }

  // ---- Simulation scenario ----
  const ctx = pipeline.simulation_context ?? {};
  await pool.query(
    `INSERT INTO simulation_scenarios
     (scenario_name, simulation_date, scenario_type, festival_name,
      festival_phase, weather_condition, description, created_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      ctx.scenario ?? "Normal Day",
      ctx.simulation_date ?? now.toISOString().substring(0, 10),
      "current", "", "", "Clear", ctx.disclaimer ?? "Simulation mode", now,
    ]
  );

  // ---- Data sources ----
  const dataSources: [string, string, string, string, string][] = [
    ["Zone characteristics", "DOMAIN KNOWLEDGE", "Chennai land-use info from CMDA, CUMTA, academic sources", "HIGH", "See chennai_zones.py for full rationale"],
    ["Traffic volumes", "SYNTHETIC", "Generated from research-grounded demand curves + noise", "MEDIUM", "Multipliers documented in chennai_zones.py"],
    ["Festival calendar", "SYNTHETIC ASSUMPTION", "Tamil Nadu festival dates; multipliers from news/official reports", "MEDIUM", "Conservative estimates; documented rationale"],
    ["Weather series", "SYNTHETIC", "Generated from IMD climatological normals for Chennai", "MEDIUM", "Block generation; seasonal probabilities"],
    ["Weather effects on traffic", "SYNTHETIC ASSUMPTION", "Speed/capacity reductions from transport research literature", "MEDIUM", "Rakha et al. 2008 TRB; FHWA weather reports"],
    ["School calendar", "DOMAIN KNOWLEDGE", "TN school academic calendar (approximate)", "HIGH", "TN School Education Department pattern"],
    ["Public transport activity", "SYNTHETIC", "Aggregated anonymised index; no individual tracking", "LOW", "Correlated with peak hours; no real GPS used"],
    ["Parking occupancy", "SYNTHETIC", "Correlated with zone type and time of day", "LOW", "Rule-based; no real sensor data"],
    ["Accident reports", "SYNTHETIC", "Sparse random events (0.3% hourly probability)", "LOW", "Plausible scenarios; not real incident reports"],
    ["Road construction", "SYNTHETIC", "Deterministic sparse pattern per road", "LOW", "Plausible scenarios; not real project data"],
  ];
  for (const [name, type, detail, quality, notes] of dataSources) {
    await pool.query(
      `INSERT INTO data_sources (name, type, detail, data_quality, notes) VALUES (?,?,?,?,?)`,
      [name, type, detail, quality, notes]
    );
  }

  console.log(`[db:init] Seeded MySQL — zones: ${pipeline.zones.length}, forecasts: ${pipeline.forecasts.length}`);
  console.log(`[db:init] Simulation date: ${ctx.simulation_date}`);
}

export async function initDb() {
  const ok = await checkMysqlConnection();
  if (!ok) {
    throw new Error("Cannot initialize database: MySQL connection failed. See the error above.");
  }
  await applySchema();
  await seed();
}

if (process.argv[1] && process.argv[1].endsWith("init_mysql.ts")) {
  initDb()
    .then(() => {
      console.log("[db:init] Done.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("[db:init] Failed:", err);
      process.exit(1);
    });
}
