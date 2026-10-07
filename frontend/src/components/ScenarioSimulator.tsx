import { useEffect, useState } from "react";
import { api, levelColor } from "../lib/api";

const SCENARIOS = [
  { key: "normal", label: "Normal Conditions" },
  { key: "light_rain", label: "Light Rain" },
  { key: "moderate_rain", label: "Moderate Rain" },
  { key: "heavy_rain", label: "Heavy Rain" },
  { key: "very_heavy_rain", label: "Very Heavy Rain" },
  { key: "accident", label: "Accident" },
  { key: "construction", label: "Road Construction" },
  { key: "road_closure", label: "Road Closure" },
];

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-mono" style={{ color: "var(--muted)" }}>
        <span>{label}</span>
        <span style={{ color: "var(--text)" }}>{Math.round(value)} veh</span>
      </div>
      <div className="h-2.5 rounded overflow-hidden" style={{ background: "var(--panel-2)" }}>
        <div style={{ width: `${pct}%`, background: color, height: "100%" }} />
      </div>
    </div>
  );
}

export default function ScenarioSimulator({ simContext }: { simContext?: any }) {
  const [zones, setZones] = useState<any[]>([]);
  const [roads, setRoads] = useState<any[]>([]);
  const [zoneId, setZoneId] = useState("");
  const [roadId, setRoadId] = useState("");
  const [multiRoad, setMultiRoad] = useState(false);
  const [date, setDate] = useState(() => simContext?.simulation_date ?? "2026-08-26");
  const [time, setTime] = useState("18:00");
  const [scenario, setScenario] = useState("heavy_rain");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.zones().then((r) => {
      setZones(r.zones ?? []);
      if (r.zones?.length) setZoneId(r.zones[0].zone_id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!zoneId) return;
    api.roads(zoneId).then((r) => {
      setRoads(r.roads ?? []);
      if (r.roads?.length) setRoadId(r.roads[0].road_id);
    }).catch(() => {});
  }, [zoneId]);

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.scenarioSimulate({
        zone_id: zoneId,
        road_id: multiRoad ? "ALL" : roadId,
        date, time, scenario,
      });
      if (res.error) throw new Error(res.error);
      setResult(res);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const isClosure = scenario === "road_closure";
  const scenarioLabel = SCENARIOS.find((s) => s.key === scenario)?.label ?? scenario;

  return (
    <div className="rounded-lg border p-4 space-y-4" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-display">What-If Scenario Simulator</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            Baseline vs. scenario — both run through the live XGBoost model (predict_live). Not precomputed.
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded border uppercase"
          style={{ borderColor: "var(--accent-dim)", color: "var(--accent)" }}>
          Live Inference
        </span>
      </div>

      {/* Config panel */}
      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-2 p-3 rounded" style={{ background: "var(--panel-2)", border: "1px solid var(--border)" }}>
        <div>
          <div className="text-[10px] font-mono mb-1" style={{ color: "var(--muted)" }}>Zone</div>
          <select value={zoneId} onChange={(e) => setZoneId(e.target.value)}
            className="w-full px-2 py-1.5 text-xs rounded border bg-transparent outline-none"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}>
            {zones.map((z) => <option key={z.zone_id} value={z.zone_id}>{z.zone_name}</option>)}
          </select>
        </div>
        <div>
          <div className="text-[10px] font-mono mb-1" style={{ color: "var(--muted)" }}>Road</div>
          <select value={roadId} onChange={(e) => setRoadId(e.target.value)} disabled={multiRoad}
            className="w-full px-2 py-1.5 text-xs rounded border bg-transparent outline-none disabled:opacity-40"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}>
            {roads.map((r) => <option key={r.road_id} value={r.road_id}>{r.road_name}</option>)}
          </select>
          <label className="flex items-center gap-1 mt-1 text-[10px] font-mono" style={{ color: "var(--muted)" }}>
            <input type="checkbox" checked={multiRoad} disabled={isClosure}
              onChange={(e) => setMultiRoad(e.target.checked)} />
            All roads in zone
          </label>
        </div>
        <div>
          <div className="text-[10px] font-mono mb-1" style={{ color: "var(--muted)" }}>Date</div>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full px-2 py-1.5 text-xs rounded border bg-transparent outline-none"
            style={{ borderColor: "var(--border)", color: "var(--text)" }} />
        </div>
        <div>
          <div className="text-[10px] font-mono mb-1" style={{ color: "var(--muted)" }}>Time</div>
          <select value={time} onChange={(e) => setTime(e.target.value)}
            className="w-full px-2 py-1.5 text-xs rounded border bg-transparent outline-none"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}>
            {Array.from({ length: 24 }).map((_, i) => {
              const hr = i.toString().padStart(2, "0") + ":00";
              return <option key={hr} value={hr}>{hr}</option>;
            })}
          </select>
        </div>
        <div>
          <div className="text-[10px] font-mono mb-1" style={{ color: "var(--muted)" }}>Scenario</div>
          <select value={scenario} onChange={(e) => { setScenario(e.target.value); if (e.target.value === "road_closure") setMultiRoad(false); }}
            className="w-full px-2 py-1.5 text-xs rounded border bg-transparent outline-none"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}>
            {SCENARIOS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <button onClick={run} disabled={loading || !zoneId || (!multiRoad && !roadId)}
        className="px-4 py-2 rounded text-xs font-mono hover:opacity-80 transition-opacity disabled:opacity-50"
        style={{ background: "var(--accent)", color: "black", fontWeight: 600 }}>
        {loading ? "Running XGBoost inference…" : "Run Simulation"}
      </button>

      {error && (
        <div className="text-xs p-2 rounded" style={{ background: "rgba(248,113,113,0.1)", color: "var(--heavy)" }}>
          {error}
        </div>
      )}

      {/* ---- Zone multi-road result ---- */}
      {result?.mode === "zone_multi_road" && (
        <div className="space-y-2">
          <div className="text-xs font-display" style={{ color: "var(--text)" }}>
            Zone-Level Impact — {scenarioLabel}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] font-mono">
              <thead>
                <tr style={{ color: "var(--muted)" }}>
                  <th className="text-left py-1">Road</th>
                  <th className="text-right py-1">Baseline</th>
                  <th className="text-right py-1">Scenario</th>
                  <th className="text-right py-1">Change</th>
                  <th className="text-right py-1">Congestion</th>
                </tr>
              </thead>
              <tbody>
                {result.roads.map((r: any) => (
                  <tr key={r.road_id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td className="py-1" style={{ color: "var(--text)" }}>{r.road_name}</td>
                    <td className="text-right py-1">{Math.round(r.baseline.predicted_traffic_volume)}</td>
                    <td className="text-right py-1">{Math.round(r.scenario.predicted_traffic_volume)}</td>
                    <td className="text-right py-1" style={{ color: r.impact.absolute_change < 0 ? "var(--low)" : r.impact.absolute_change > 0 ? "var(--heavy)" : "var(--muted)" }}>
                      {r.impact.absolute_change > 0 ? "+" : ""}{r.impact.absolute_change} ({r.impact.percentage_change ?? "—"}%)
                    </td>
                    <td className="text-right py-1" style={{ color: levelColor(r.scenario.congestion_level) }}>
                      {r.impact.congestion_change}
                    </td>
                  </tr>
                ))}
                {result.roads.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-3" style={{ color: "var(--muted)" }}>No roads returned usable predictions.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- Single-road result ---- */}
      {result && result.baseline && result.mode !== "zone_multi_road" && (
        <div className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            {/* Baseline */}
            <div className="rounded border p-3 space-y-2" style={{ borderColor: "var(--border)" }}>
              <div className="text-[10px] font-mono uppercase" style={{ color: "var(--muted)" }}>Baseline (Normal)</div>
              <div className="text-xs" style={{ color: "var(--text)" }}>
                {result.baseline.zone_name} — {result.baseline.road_name}
              </div>
              <div className="text-lg font-display" style={{ color: "var(--text)" }}>
                {Math.round(result.baseline.predicted_traffic_volume)} <span className="text-xs" style={{ color: "var(--muted)" }}>vehicles</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ color: levelColor(result.baseline.congestion_level), border: `1px solid ${levelColor(result.baseline.congestion_level)}` }}>
                {result.baseline.congestion_level}
              </span>
              {result.context?.festival && (
                <div className="text-[10px]" style={{ color: "var(--mod)" }}>
                  Festival context: {result.context.festival} ({result.context.festival_phase})
                </div>
              )}
            </div>

            {/* Scenario */}
            <div className="rounded border p-3 space-y-2" style={{ borderColor: isClosure ? "var(--heavy)" : "var(--border)" }}>
              <div className="text-[10px] font-mono uppercase" style={{ color: "var(--muted)" }}>Scenario — {scenarioLabel}</div>
              {isClosure ? (
                <>
                  <div className="text-lg font-display" style={{ color: "var(--heavy)" }}>ROAD CLOSED</div>
                  <div className="text-[10px]" style={{ color: "var(--muted)" }}>{result.scenario.road_name} — status: {result.scenario.status}</div>
                </>
              ) : (
                <>
                  <div className="text-lg font-display" style={{ color: "var(--text)" }}>
                    {Math.round(result.scenario.predicted_traffic_volume)} <span className="text-xs" style={{ color: "var(--muted)" }}>vehicles</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ color: levelColor(result.scenario.congestion_level), border: `1px solid ${levelColor(result.scenario.congestion_level)}` }}>
                    {result.scenario.congestion_level}
                  </span>
                  {result.scenario.scenario_note && (
                    <div className="text-[10px]" style={{ color: "var(--muted)" }}>{result.scenario.scenario_note}</div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Visual comparison */}
          {!isClosure && (
            <div className="rounded border p-3 space-y-2" style={{ borderColor: "var(--border)" }}>
              <div className="text-[10px] font-mono uppercase mb-1" style={{ color: "var(--muted)" }}>Visual Comparison</div>
              <Bar label="Baseline" value={result.baseline.predicted_traffic_volume}
                max={Math.max(result.baseline.predicted_traffic_volume, result.scenario.predicted_traffic_volume) * 1.15}
                color="var(--accent)" />
              <Bar label="Scenario" value={result.scenario.predicted_traffic_volume}
                max={Math.max(result.baseline.predicted_traffic_volume, result.scenario.predicted_traffic_volume) * 1.15}
                color={levelColor(result.scenario.congestion_level)} />
            </div>
          )}

          {/* Impact summary */}
          <div className="rounded border p-3" style={{ borderColor: "var(--border)", background: "var(--panel-2)" }}>
            <div className="text-[10px] font-mono uppercase mb-2" style={{ color: "var(--muted)" }}>Scenario Impact</div>
            {isClosure ? (
              <div className="text-xs space-y-1" style={{ color: "var(--text)" }}>
                <div>Closed Road: <strong>{result.scenario.road_name}</strong></div>
                <div style={{ color: "var(--heavy)" }}>{result.impact.congestion_change}</div>
                <div className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>{result.impact.note}</div>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-2 text-xs">
                <div>
                  <div style={{ color: "var(--muted)" }}>Traffic Change</div>
                  <div style={{ color: result.impact.absolute_change < 0 ? "var(--low)" : result.impact.absolute_change > 0 ? "var(--heavy)" : "var(--text)" }}>
                    {result.impact.absolute_change > 0 ? "+" : ""}{result.impact.absolute_change} vehicles
                  </div>
                </div>
                <div>
                  <div style={{ color: "var(--muted)" }}>Percentage Change</div>
                  <div style={{ color: "var(--text)" }}>{result.impact.percentage_change ?? "—"}%</div>
                </div>
                <div>
                  <div style={{ color: "var(--muted)" }}>Congestion Change</div>
                  <div style={{ color: "var(--text)" }}>{result.impact.congestion_change}</div>
                </div>
                {result.impact.note && (
                  <div className="md:col-span-3 text-[10px]" style={{ color: "var(--muted)" }}>{result.impact.note}</div>
                )}
              </div>
            )}
          </div>

          {/* Affected corridors (road closure only) */}
          {isClosure && result.potentially_affected_corridors?.length > 0 && (
            <div className="rounded border p-3" style={{ borderColor: "var(--border)" }}>
              <div className="text-[10px] font-mono uppercase mb-2" style={{ color: "var(--muted)" }}>
                Potentially Affected Corridors (baseline prediction shown — not a redistributed count)
              </div>
              <div className="space-y-1">
                {result.potentially_affected_corridors.map((c: any) => (
                  <div key={c.road_id} className="flex justify-between text-xs">
                    <span style={{ color: "var(--text)" }}>{c.road_name}</span>
                    <span>
                      <span style={{ color: "var(--muted)" }}>{Math.round(c.baseline_predicted_traffic_volume)} veh</span>{" "}
                      <span style={{ color: levelColor(c.baseline_congestion_level) }}>({c.baseline_congestion_level})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {(result.recommendations?.from_existing_system?.length > 0 || result.recommendations?.general_guidance?.length > 0) && (
            <div className="rounded border p-3" style={{ borderColor: "var(--border)" }}>
              <div className="text-[10px] font-mono uppercase mb-2" style={{ color: "var(--muted)" }}>Recommended Actions</div>
              {result.recommendations.from_existing_system?.length > 0 && (
                <div className="mb-2 space-y-1">
                  {result.recommendations.from_existing_system.map((r: any, i: number) => (
                    <div key={i} className="text-xs" style={{ color: "var(--text)" }}>• {r.message}</div>
                  ))}
                </div>
              )}
              {result.recommendations.general_guidance?.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px]" style={{ color: "var(--muted)" }}>General guidance for this scenario type:</div>
                  {result.recommendations.general_guidance.map((g: string, i: number) => (
                    <div key={i} className="text-xs" style={{ color: "var(--muted)" }}>• {g}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <p className="text-[10px]" style={{ color: "var(--muted)" }}>
        Baseline and scenario predictions are both live XGBoost inference (predict_live), using real
        synthetic-dataset hours to ground weather/accident/construction feature overrides. Figures are
        simulated/academic data, not real-time measurements.
      </p>
    </div>
  );
}
