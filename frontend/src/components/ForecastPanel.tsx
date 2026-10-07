import { useState, useEffect } from "react";
import { levelColor, formatSimDate } from "../lib/api";

const HORIZONS = ["next_1h", "next_6h", "tomorrow", "next_weekend"];
const HORIZON_LABELS: Record<string, string> = {
  next_1h: "Next 1 Hour",
  next_6h: "Next 6 Hours",
  tomorrow: "Tomorrow",
  next_weekend: "Next Weekend",
};

export default function ForecastPanel({ forecasts, simContext }: { forecasts: any[]; simContext?: any }) {
  const [horizon, setHorizon] = useState("next_1h");
  const [filterZone, setFilterZone] = useState("");

  const [simDate, setSimDate] = useState(() => simContext?.simulation_date ?? "2026-08-26");
  const [simTime, setSimTime] = useState("18:00");
  
  const [liveMode, setLiveMode] = useState(false);
  const [liveData, setLiveData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If the user selects a Horizon, we turn off live mode to show pre-computed horizons
  const handleHorizonClick = (h: string) => {
    setHorizon(h);
    setLiveMode(false);
  };

  const fetchLivePrediction = async () => {
    setLoading(true);
    setError(null);
    setLiveMode(true);
    try {
      const res = await fetch("http://localhost:4000/api/predict_live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: simDate, time: simTime }),
      });
      if (!res.ok) throw new Error("Failed to fetch live prediction");
      const data = await res.json();
      setLiveData(data.forecasts ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Determine which rows to show
  const sourceRows = liveMode ? liveData : forecasts.filter((f) => f.horizon === horizon);
  const rows = sourceRows.filter((f) => !filterZone || (f.zone_name ?? "").toLowerCase().includes(filterZone.toLowerCase()));

  // If live, we take the simulation date from the picker, else from context
  const displayDate = liveMode ? simDate : simContext?.simulation_date ?? "";

  return (
    <div className="rounded-lg border p-4 space-y-4" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-display">Congestion Forecast</div>
          {displayDate && (
            <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              Simulation date: {formatSimDate(displayDate)} |{" "}
              <span style={{ color: "var(--mod)" }}>
                {liveMode ? "Live Dynamic Inference" : "Scenario / Simulation Forecast"}
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-1">
          {HORIZONS.map((h) => (
            <button
              key={h}
              onClick={() => handleHorizonClick(h)}
              className="text-xs px-2 py-1 rounded font-mono"
              style={{
                background: (!liveMode && horizon === h) ? "var(--accent-dim)" : "transparent",
                border: "1px solid var(--border)",
                color: (!liveMode && horizon === h) ? "var(--accent)" : "var(--muted)",
              }}
            >
              {HORIZON_LABELS[h] ?? h.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Live Date/Time Selector */}
      <div className="flex items-center gap-2 text-xs p-2 rounded" style={{ background: "var(--panel-2)", border: "1px solid var(--border)" }}>
        <div style={{ color: "var(--accent)" }} className="font-mono">Live Predict:</div>
        <input
          type="date"
          value={simDate}
          onChange={(e) => setSimDate(e.target.value)}
          className="px-2 py-1 outline-none bg-transparent rounded border"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        />
        <select
          value={simTime}
          onChange={(e) => setSimTime(e.target.value)}
          className="px-2 py-1 outline-none bg-transparent rounded border"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          {Array.from({ length: 24 }).map((_, i) => {
            const hr = i.toString().padStart(2, "0") + ":00";
            return <option key={hr} value={hr}>{hr}</option>;
          })}
        </select>
        <button
          onClick={fetchLivePrediction}
          disabled={loading}
          className="px-3 py-1 rounded hover:opacity-80 transition-opacity disabled:opacity-50"
          style={{ background: "var(--accent)", color: "black", fontWeight: 500 }}
        >
          {loading ? "Running XGBoost..." : "Run Prediction"}
        </button>
      </div>

      {error && (
        <div className="text-xs p-2 rounded" style={{ background: "rgba(248,113,113,0.1)", color: "var(--heavy)" }}>
          {error}
        </div>
      )}

      {/* Filter */}
      <input
        placeholder="Filter by zone name…"
        value={filterZone}
        onChange={(e) => setFilterZone(e.target.value)}
        className="text-xs w-full rounded px-3 py-1.5 outline-none"
        style={{
          background: "var(--panel-2)",
          border: "1px solid var(--border)",
          color: "var(--text)",
        }}
      />

      {/* Summary bar */}
      {rows.length > 0 && (
        <div className="flex gap-4 text-xs font-mono">
          {(["LOW", "MODERATE", "HEAVY"] as const).map((lvl) => {
            const count = rows.filter((r) => r.congestion_level === lvl).length;
            return (
              <span key={lvl} style={{ color: levelColor(lvl) }}>
                {lvl}: <strong>{count}</strong>
              </span>
            );
          })}
          <span style={{ color: "var(--muted)" }}>Total: {rows.length} roads</span>
        </div>
      )}

      {/* Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
        {rows.map((f, i) => (
          <div
            key={i}
            className="rounded border px-3 py-2 text-xs"
            style={{
              borderColor:
                f.congestion_level === "HEAVY"
                  ? "rgba(248,113,113,0.3)"
                  : "var(--border)",
              background:
                f.congestion_level === "HEAVY"
                  ? "rgba(248,113,113,0.05)"
                  : "transparent",
            }}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-display text-[11px]" style={{ color: "var(--text)" }}>
                  {f.zone_name ?? f.zone_id}
                </div>
                <div className="font-mono text-[10px]" style={{ color: "var(--muted)" }}>
                  {f.road_name}
                </div>
              </div>
              <span
                className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                style={{
                  color: levelColor(f.congestion_level),
                  border: `1px solid ${levelColor(f.congestion_level)}`,
                }}
              >
                {f.congestion_level}
              </span>
            </div>
            <div className="mt-1.5 space-y-0.5 font-mono" style={{ color: "var(--muted)" }}>
              <div>
                Volume:{" "}
                <span style={{ color: "var(--text)" }}>
                  {Math.round(f.predicted_traffic_volume ?? 0)}
                </span>{" "}
                veh
              </div>
              <div style={{ fontSize: 10 }}>
                Sim timestamp: {f.forecast_timestamp?.substring(0, 16) ?? "—"}
              </div>
              {f.festival_context && f.festival_context !== "None" && (
                <div style={{ color: "var(--mod)", fontSize: 10 }}>
                  Festival: {f.festival_context}
                </div>
              )}
            </div>
          </div>
        ))}
        {rows.length === 0 && !loading && (
          <div className="col-span-3 text-xs text-center py-4" style={{ color: "var(--muted)" }}>
            No forecast data for this horizon/filter.
          </div>
        )}
      </div>

      <p className="text-[10px]" style={{ color: "var(--muted)" }}>
        Forecasts generated by XGBoost model from Chennai synthetic dataset.
        All figures are simulated — not real-time measurements.
      </p>
    </div>
  );
}
