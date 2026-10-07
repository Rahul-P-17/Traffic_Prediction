const TYPE_STYLE: Record<string, { color: string; label: string }> = {
  alternate_route:         { color: "var(--accent)", label: "Alternate Route" },
  extra_buses:             { color: "#34D399", label: "Extra MTC Buses" },
  festival_traffic_control:{ color: "var(--mod)", label: "Festival Control" },
  speed_limit:             { color: "var(--muted)", label: "Speed Limit" },
  signal_timing:           { color: "#60A5FA", label: "Signal Timing" },
};

export default function RecommendationPanel({ recommendations }: { recommendations: any[] }) {
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm font-display">Smart Recommendations</div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded border"
          style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
          AI-Generated
        </span>
      </div>
      <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
        Triggered by HEAVY congestion predictions and public transport demand.
        Chennai Metropolitan Region — Simulation Mode.
      </p>

      {recommendations.length === 0 && (
        <div
          className="text-xs px-3 py-2 rounded border"
          style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--panel-2)" }}
        >
          No recommendations triggered — all zones within normal congestion thresholds.
        </div>
      )}

      <div className="space-y-2 max-h-72 overflow-y-auto">
        {recommendations.map((r, i) => {
          const style = TYPE_STYLE[r.type] ?? { color: "var(--muted)", label: r.type };
          return (
            <div key={i} className="rounded border px-3 py-2 text-xs"
              style={{
                borderColor: "var(--border)",
                background: "var(--panel-2)",
              }}>
              <div className="flex justify-between items-start mb-1">
                <span className="font-mono uppercase text-[10px]" style={{ color: style.color }}>
                  {style.label}
                </span>
                <div className="flex gap-1">
                  {r.horizon && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                      style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>
                      {r.horizon.replace("_", " ")}
                    </span>
                  )}
                  {r.congestion_level && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                      style={{ color: r.congestion_level === "HEAVY" ? "var(--heavy)" : "var(--mod)",
                               border: `1px solid ${r.congestion_level === "HEAVY" ? "var(--heavy)" : "var(--mod)"}` }}>
                      {r.congestion_level}
                    </span>
                  )}
                </div>
              </div>
              <div className="font-display" style={{ color: "var(--text)" }}>
                {r.message}
              </div>
              {r.zone_name && (
                <div className="mt-0.5 text-[10px] font-mono" style={{ color: "var(--muted)" }}>
                  Zone: {r.zone_name}{r.road_name ? ` · ${r.road_name}` : ""}
                </div>
              )}
              <div className="mt-1 text-[10px]" style={{ color: "var(--muted)" }}>
                Reason: {r.reason}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
