import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import { pool, checkMysqlConnection } from "./db/mysql_pool.js";
import { initDb } from "./db/init_mysql.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
const DEMO_MODE = (process.env.DEMO_MODE ?? "true") === "true";
const AUTO_SEED = (process.env.AUTO_SEED_ON_START ?? "false") === "true";

const app = express();
app.use(cors());
app.use(express.json());

// ---- Simulation context helpers ----
async function getSimContext() {
  const [rows] = await pool.query(
    "SELECT * FROM simulation_scenarios ORDER BY id DESC LIMIT 1"
  );
  const row = (rows as any[])[0];
  return row ?? { simulation_date: new Date().toISOString().substring(0, 10), scenario_name: "Normal Day" };
}

// Small helper so every route doesn't repeat the same try/catch shape.
function route(handler: (req: express.Request, res: express.Response) => Promise<void>) {
  return async (req: express.Request, res: express.Response) => {
    try {
      await handler(req, res);
    } catch (err: any) {
      console.error(`[api] ${req.method} ${req.path} failed:`, err?.message ?? err);
      res.status(500).json({ error: "Internal server error", detail: String(err?.message ?? err) });
    }
  };
}

// ---- Traffic ----
app.get("/api/traffic/current", route(async (req, res) => {
  const ctx = await getSimContext();
  const [rows] = await pool.query(
    `SELECT f.zone_id, f.zone_name, f.zone_type, f.road_id, f.road_name,
            f.predicted_traffic_volume, f.congestion_level, f.festival_context,
            f.latitude, f.longitude
     FROM forecasts f WHERE f.horizon = 'next_1h'`
  );
  res.json({
    label: "Chennai Metropolitan Region — Simulation Mode",
    simulation_date: ctx.simulation_date,
    scenario: ctx.scenario_name,
    demo_mode: DEMO_MODE,
    data_classification: "SYNTHETIC / RESEARCH-GROUNDED",
    disclaimer: "All traffic figures are SIMULATED. Not real-time data.",
    data: rows,
  });
}));

app.get("/api/traffic/historical", route(async (req, res) => {
  res.json({
    note: "Historical traffic is served from data/processed/chennai_master.parquet " +
          "(synthetic Chennai data). See DATA_PROVENANCE.md for full methodology.",
    sample_path: "data/demo/chennai_sample.csv",
    data_type: "SYNTHETIC",
  });
}));

app.get("/api/traffic/predictions", route(async (req, res) => {
  const [rows] = await pool.query(`SELECT * FROM forecasts WHERE horizon = 'next_1h'`);
  res.json({ predictions: rows });
}));

app.get("/api/traffic/forecast", route(async (req, res) => {
  const { zone_id, horizon, road_id } = req.query;
  let q = "SELECT * FROM forecasts WHERE 1=1";
  const params: any[] = [];
  if (zone_id) { q += " AND zone_id = ?"; params.push(zone_id); }
  if (horizon) { q += " AND horizon = ?"; params.push(horizon); }
  if (road_id) { q += " AND road_id = ?"; params.push(road_id); }
  const [rows] = await pool.query(q, params);
  res.json({ forecasts: rows });
}));

app.post("/api/predict_live", route(async (req, res) => {
  const { zone_id, road_id, date, time, scenario } = req.body ?? {};
  let url = `${ML_SERVICE_URL}/predict_live?date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`;
  if (zone_id) url += `&zone_id=${encodeURIComponent(zone_id)}`;
  if (road_id) url += `&road_id=${encodeURIComponent(road_id)}`;
  // Optional what-if scenario override (normal|light_rain|moderate_rain|
  // heavy_rain|very_heavy_rain|accident|construction). See
  // ml-service/app/feature_store.py for how these are grounded in real
  // historical synthetic data rather than invented values.
  if (scenario) url += `&scenario=${encodeURIComponent(scenario)}`;
  try {
    const r = await fetch(url, { method: "POST" });
    if (!r.ok) {
      const err = await r.text();
      res.status(r.status).json({ error: "ML Service Error", detail: err });
      return;
    }
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(503).json({ error: "ML Service Unavailable", detail: String(e) });
  }
}));

// ---- What-If Scenario Simulator ----
// Reuses the existing /predict_live XGBoost inference (see
// ml-service/app/feature_store.py for how scenario overrides are grounded
// in real historical synthetic data, never invented values). This endpoint
// implements NO independent prediction logic of its own — it calls
// predict_live for the baseline and, separately, for the requested
// scenario, then computes the difference. Road Closure is special-cased:
// it does NOT call the model with a fabricated "closed" feature (no such
// feature/historical closure data exists), it marks the road unavailable
// and shows nearby roads' own baseline predictions as context, explicitly
// labelled as analytical inference rather than modeled redistribution.

const ADVISORY_TEXT: Record<string, string[]> = {
  heavy_rain: [
    "Reduce speed limits on affected corridors",
    "Increase MTC bus frequency to reduce private vehicle load",
    "Monitor low-lying stretches for waterlogging",
  ],
  very_heavy_rain: [
    "Consider temporary lane restrictions",
    "Activate flood-prone-zone alerts",
    "Increase MTC bus frequency",
  ],
  accident: [
    "Dispatch traffic police to manage the affected stretch",
    "Advise motorists of an alternate route",
    "Monitor for secondary congestion buildup",
  ],
  construction: [
    "Advise motorists to use alternate routes during peak hours",
    "Coordinate lane closures outside peak windows where possible",
  ],
  road_closure: [
    "Deploy signage/diversion at nearest junctions",
    "Coordinate with traffic police for manual regulation at alternate corridors",
    "Communicate closure via public alerts",
  ],
};

async function callPredictLive(zone_id: string, road_id: string, date: string, time: string, scenario?: string) {
  let url = `${ML_SERVICE_URL}/predict_live?date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}` +
    `&zone_id=${encodeURIComponent(zone_id)}&road_id=${encodeURIComponent(road_id)}`;
  if (scenario && scenario !== "normal") url += `&scenario=${encodeURIComponent(scenario)}`;
  const r = await fetch(url, { method: "POST" });
  if (!r.ok) throw new Error(`ML service error ${r.status}: ${await r.text()}`);
  const data = await r.json();
  const rows = data.forecasts ?? [];
  return rows[0] ?? null;
}

function diffResult(baseline: any, scenarioResult: any) {
  const base = baseline.predicted_traffic_volume;
  const scen = scenarioResult.predicted_traffic_volume;
  const absChange = scen - base;
  const pctChange = base !== 0 ? (absChange / base) * 100 : null;
  const congestionChange = baseline.congestion_level === scenarioResult.congestion_level
    ? `No change (${baseline.congestion_level})`
    : `${baseline.congestion_level} -> ${scenarioResult.congestion_level}`;
  return {
    absolute_change: Math.round(absChange * 10) / 10,
    percentage_change: pctChange !== null ? Math.round(pctChange * 10) / 10 : null,
    congestion_change: congestionChange,
    note: absChange === 0 ? "No meaningful change in predicted traffic volume for this scenario." : undefined,
  };
}

app.post("/api/scenario/simulate", route(async (req, res) => {
  const { zone_id, road_id, date, time, scenario } = req.body ?? {};
  if (!zone_id || !road_id || !date || !time || !scenario) {
    res.status(400).json({ error: "zone_id, road_id, date, time and scenario are all required." });
    return;
  }

  // ---- Zone-level multi-road mode (road_id = "ALL") ----
  if (road_id === "ALL") {
    if (scenario === "road_closure") {
      res.status(400).json({ error: "Road Closure requires a specific road_id, not multi-road mode." });
      return;
    }
    const [roadRows] = await pool.query("SELECT * FROM roads WHERE zone_id = ?", [zone_id]);
    const roads = (roadRows as any[]).slice(0, 8);
    const perRoad: any[] = [];
    for (const rd of roads) {
      try {
        const base = await callPredictLive(zone_id, rd.road_id, date, time, "normal");
        const scen = await callPredictLive(zone_id, rd.road_id, date, time, scenario);
        if (base && !base.error && scen && !scen.error) {
          perRoad.push({ road_id: rd.road_id, road_name: rd.road_name, baseline: base, scenario: scen, impact: diffResult(base, scen) });
        }
      } catch { /* skip a road that fails, report the rest */ }
    }
    res.json({ mode: "zone_multi_road", zone_id, scenario, roads: perRoad });
    return;
  }

  let baseline;
  try {
    baseline = await callPredictLive(zone_id, road_id, date, time, "normal");
  } catch (e) {
    res.status(503).json({ error: "ML service unavailable for baseline prediction", detail: String(e) });
    return;
  }
  if (!baseline || baseline.error) {
    res.status(404).json({ error: baseline?.error ?? "No baseline data available for this zone/road/date/time." });
    return;
  }

  const context = { festival: baseline.festival_context ?? null, festival_phase: baseline.festival_phase ?? null };
  const [recRows] = await pool.query("SELECT * FROM recommendations WHERE target_zone = ?", [zone_id]);

  // ---- Road Closure: special-cased, no model call under a fabricated "closed" feature ----
  if (scenario === "road_closure") {
    const [roadRows] = await pool.query("SELECT * FROM roads WHERE zone_id = ? AND road_id != ?", [zone_id, road_id]);
    const altRoads = (roadRows as any[]).slice(0, 4);
    const affected: any[] = [];
    for (const alt of altRoads) {
      try {
        const r = await callPredictLive(zone_id, alt.road_id, date, time, "normal");
        if (r && !r.error) affected.push(r);
      } catch { /* skip */ }
    }
    res.json({
      baseline,
      scenario: {
        status: "UNAVAILABLE",
        road_id,
        road_name: baseline.road_name,
        scenario_applied: "road_closure",
        note: "This road is marked CLOSED for the what-if scenario. Traffic redistribution to other roads is NOT directly modeled by the trained XGBoost model (the training data contains no road-closure events), so no diverted-vehicle figures are shown.",
      },
      impact: {
        absolute_change: null,
        percentage_change: null,
        congestion_change: `${baseline.congestion_level} -> UNAVAILABLE`,
        analysis_type: "INFERENCE_ONLY",
        note: "Traffic redistribution is not directly modeled; affected corridors are identified from the available road network and their own current baseline prediction, not a redistributed count.",
      },
      potentially_affected_corridors: affected.map(a => ({
        road_id: a.road_id, road_name: a.road_name,
        baseline_predicted_traffic_volume: a.predicted_traffic_volume,
        baseline_congestion_level: a.congestion_level,
      })),
      recommendations: { from_existing_system: recRows, general_guidance: ADVISORY_TEXT.road_closure },
      context,
    });
    return;
  }

  // ---- Weather / accident / construction / normal: genuine XGBoost re-inference ----
  let scenarioResult;
  try {
    scenarioResult = await callPredictLive(zone_id, road_id, date, time, scenario);
  } catch (e) {
    res.status(503).json({ error: "ML service unavailable for scenario prediction", detail: String(e) });
    return;
  }
  if (!scenarioResult || scenarioResult.error) {
    res.status(404).json({ error: scenarioResult?.error ?? "No scenario data available." });
    return;
  }

  res.json({
    baseline,
    scenario: scenarioResult,
    impact: diffResult(baseline, scenarioResult),
    recommendations: { from_existing_system: recRows, general_guidance: ADVISORY_TEXT[scenario] ?? [] },
    context,
  });
}));

app.get("/api/traffic/heatmap", route(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT f.zone_id, f.zone_name, f.zone_type, f.road_id, f.road_name,
           f.latitude, f.longitude, f.predicted_traffic_volume,
           f.congestion_level, f.festival_context,
           z.festival_sensitivity, z.weather_sensitivity
    FROM forecasts f
    LEFT JOIN zones z ON z.zone_id = f.zone_id
    WHERE f.horizon = 'next_1h'
  `);
  res.json({ demo_mode: DEMO_MODE, zones: rows });
}));

// ---- Zones ----
app.get("/api/zones", route(async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM zones ORDER BY zone_id");
  res.json({ zones: rows });
}));

app.get("/api/zones/:zone_id/roads", route(async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM roads WHERE zone_id = ?", [req.params.zone_id]);
  res.json({ roads: rows });
}));

// ---- Simulation context ----
app.get("/api/simulation/context", route(async (req, res) => {
  const ctx = await getSimContext();
  const pipelinePath = path.join(__dirname, "..", "..", "ml-service", "app", "models", "pipeline_output.json");
  let simCtx: any = {};
  let meta: any = {};
  try {
    const pipeline = JSON.parse(fs.readFileSync(pipelinePath, "utf-8"));
    simCtx = pipeline.simulation_context ?? {};
    meta = pipeline.meta ?? {};
  } catch { /* pipeline not yet generated */ }
  res.json({
    simulation_date: ctx.simulation_date ?? simCtx.simulation_date,
    scenario: ctx.scenario_name ?? simCtx.scenario ?? "Normal Day",
    study_region: "Chennai Metropolitan Region, Tamil Nadu, India",
    data_classification: "SYNTHETIC / RESEARCH-GROUNDED",
    disclaimer: simCtx.disclaimer ?? "",
    database: { engine: "MySQL", database: process.env.DB_NAME || "chennai_traffic" },
    meta,
  });
}));

// ---- Behaviour ----
// Returns, per (zone, weekday/weekend): the KMeans cluster ID, the
// interpretation derived from that cluster's actual statistics (NOT
// zone_type — see scripts/build_pipeline.py), and the statistics
// themselves, so the frontend can show *why* a pattern was assigned
// rather than just the label.
app.get("/api/behaviour/patterns", route(async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM behaviour_patterns ORDER BY zone_id, is_weekend");
  res.json({
    patterns: (rows as any[]).map(r => ({
      zone_id: r.zone_id,
      zone_name: r.zone_name,
      zone_type: r.zone_type,
      is_weekend: !!r.is_weekend,
      cluster_id: r.cluster,
      interpreted_pattern: r.interpreted_pattern,
      peak_hour: r.peak_hour,
      peak_hours: typeof r.peak_hours === "string" ? JSON.parse(r.peak_hours) : r.peak_hours,
      weekday_average: r.weekday_average,
      weekend_average: r.weekend_average,
      morning_peak_strength: r.morning_peak_strength,
      evening_peak_strength: r.evening_peak_strength,
      congestion_frequency: r.congestion_frequency,
      cluster_members_count: r.cluster_members_count,
      hourly_profile: typeof r.hourly_profile === "string" ? JSON.parse(r.hourly_profile) : r.hourly_profile,
    })),
  });
}));

// ---- Recommendations / Anomalies / Alerts ----
app.get("/api/recommendations", route(async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM recommendations");
  res.json({ recommendations: rows });
}));
app.get("/api/anomalies", route(async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM anomalies ORDER BY anomaly_score DESC");
  res.json({ anomalies: rows });
}));
app.get("/api/alerts", route(async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM alerts ORDER BY timestamp DESC");
  res.json({ alerts: rows });
}));

// ---- Context sources ----
app.get("/api/weather", route(async (req, res) => {
  res.json({
    source_type: "SYNTHETIC",
    methodology: "Generated from IMD climatological normals for Chennai",
    note: "Weather series is synthetic. No real-time weather API is connected.",
  });
}));
app.get("/api/events", route(async (req, res) => {
  res.json({
    source_type: "SYNTHETIC ASSUMPTION",
    note: "Festival calendar for Tamil Nadu; mobility multipliers from documented sources.",
  });
}));
app.get("/api/parking", route(async (req, res) => {
  res.json({ source_type: "SYNTHETIC", note: "Parking occupancy correlated with zone type and time of day." });
}));
app.get("/api/accidents", route(async (req, res) => {
  res.json({ source_type: "SYNTHETIC", note: "Sparse accident events; ~0.3% hourly probability per road." });
}));

app.get("/api/data-sources", route(async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM data_sources");
  const list = rows as any[];
  res.json({
    study_region: "Chennai Metropolitan Region",
    sources: list.length > 0 ? list : [
      { name: "Zone characteristics", type: "DOMAIN KNOWLEDGE", detail: "CMDA, CUMTA, academic sources" },
      { name: "Traffic volumes", type: "SYNTHETIC", detail: "Research-grounded demand curves" },
      { name: "Festival effects", type: "SYNTHETIC ASSUMPTION", detail: "Calibrated from news/official reports" },
      { name: "Weather series", type: "SYNTHETIC", detail: "IMD climatological normals" },
      { name: "School calendar", type: "DOMAIN KNOWLEDGE", detail: "TN school academic calendar" },
      { name: "Public transport activity", type: "SYNTHETIC", detail: "Aggregated anonymised index" },
      { name: "Parking, accidents, construction", type: "SYNTHETIC", detail: "Rule-based plausible scenarios" },
    ],
    demo_mode: DEMO_MODE,
  });
}));

// ---- Festival Mode ----
app.post("/api/festival/forecast", route(async (req, res) => {
  const { festival, phase } = req.body ?? {};
  const targetPhase = phase || "day_before";

  try {
    const r = await fetch(
      `${ML_SERVICE_URL}/festival/forecast?festival=${encodeURIComponent(festival)}&phase=${encodeURIComponent(targetPhase)}`,
      { method: "POST" }
    );
    if (r.ok) { res.json(await r.json()); return; }
  } catch { /* fall through to DB */ }

  const [rows] = await pool.query(
    `SELECT * FROM festival_forecasts WHERE festival_name = ? AND festival_phase = ?`,
    [festival, targetPhase]
  );
  const list = rows as any[];
  if (!list.length) {
    const [anyRows] = await pool.query(
      "SELECT * FROM festival_forecasts WHERE festival_name = ?", [festival]
    );
    const anyList = anyRows as any[];
    if (!anyList.length) { res.status(404).json({ error: `No scenario for ${festival}` }); return; }
    res.json({ label: `Scenario / Simulation Forecast — ${festival}`, zones: anyList });
    return;
  }
  res.json({ label: `Scenario / Simulation Forecast — ${festival} (${targetPhase})`, zones: list });
}));

app.get("/api/festival/phases", route(async (req, res) => {
  const { festival } = req.query;
  let q = "SELECT DISTINCT festival_name, festival_phase FROM festival_forecasts";
  const params: any[] = [];
  if (festival) { q += " WHERE festival_name = ?"; params.push(festival); }
  const [rows] = await pool.query(q, params);
  res.json({ phases: rows });
}));

// ---- Chatbot ----
app.post("/api/chat", route(async (req, res) => {
  const { question } = req.body ?? {};
  try {
    const r = await fetch(`${ML_SERVICE_URL}/chat/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const j = await r.json();
    await pool.query(
      "INSERT INTO chat_queries (question, answer, source, timestamp) VALUES (?,?,?,?)",
      [question, j.answer, j.source ?? "unknown", new Date()]
    );
    res.json(j);
  } catch (e) {
    res.status(503).json({ error: "ML service unavailable", detail: String(e) });
  }
}));

// ---- ML meta ----
app.get("/api/ml/evaluation", route(async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM model_evaluations");
  res.json({ evaluations: rows });
}));
app.get("/api/ml/features", route(async (req, res) => {
  try {
    const r = await fetch(`${ML_SERVICE_URL}/features`);
    if (r.ok) { res.json(await r.json()); return; }
  } catch { /* ignore */ }
  res.status(503).json({ error: "ML service unavailable" });
}));

app.get("/api/privacy", route(async (req, res) => {
  res.json({
    statement:
      "All mobility analysis is performed using ANONYMISED and AGGREGATED synthetic data. " +
      "No real personally identifiable information is stored or processed.",
    details: [
      "All traffic records are synthetic — no real sensor data from individuals.",
      "Public transport activity is stored as an aggregated 0-1 index per zone/hour.",
      "No names, phone numbers, or individual location histories are collected.",
      "No facial recognition, emotion detection, or individual psychology is performed.",
      "Analysis is at the population/zone level — not individual behaviour.",
    ],
    data_classification: "SYNTHETIC / RESEARCH-GROUNDED",
  });
}));

app.get("/api/health", route(async (req, res) => {
  const dbOk = await checkMysqlConnection();
  res.json({ status: dbOk ? "ok" : "degraded", database: dbOk ? "connected" : "unavailable" });
}));

const PORT = process.env.PORT || 4000;

async function start() {
  const dbOk = await checkMysqlConnection();
  if (!dbOk) {
    console.error("[server] Refusing to start cleanly without a MySQL connection.");
    console.error("[server] Fix your .env / MySQL server, then restart. See README.md 'Database setup'.");
    process.exit(1);
  }
  if (AUTO_SEED) {
    console.log("[server] AUTO_SEED_ON_START=true — running schema + seed before serving requests...");
    await initDb();
  }
  app.listen(PORT, () =>
    console.log(`Backend running on :${PORT} (Chennai Simulation Mode, DB=MySQL, ML=${ML_SERVICE_URL})`)
  );
}

start();
