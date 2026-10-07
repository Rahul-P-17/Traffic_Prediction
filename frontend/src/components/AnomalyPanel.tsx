import { levelColor } from "../lib/api";

const SEV_COLOR: Record<string, string> = {
  CRITICAL: "var(--heavy)",
  HIGH: "var(--mod)",
  MEDIUM: "var(--accent)",
  LOW: "var(--muted)",
};

const ANOMALY_ICONS: Record<string, string> = {
  "Sudden traffic spike": "↑",
  "Unexpected traffic drop": "↓",
  "Accident-linked congestion": "⚠",
  "Festival-related unusual demand": "◆",
  "Unusual traffic pattern": "~",
};

export default function AnomalyPanel({ anomalies }: { anomalies: any[] }) {
  const critical = anomalies.filter((a) => a.severity === "CRITICAL").length;
  const high = anomalies.filter((a) => a.severity === "HIGH").length;

  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm font-display">Anomaly Detection</div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded border"
          style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
          Isolation Forest
        </span>
      </div>
      <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
        Statistical outliers vs expected zone-level traffic patterns.
        Zone-level analysis only — no individual data.
      </p>

      {/* Summary pills */}
      <div className="flex gap-2 mb-3">
        {[
          { label: `${critical} CRITICAL`, color: "var(--heavy)" },
          { label: `${high} HIGH`, color: "var(--mod)" },
          { label: `${anomalies.length} total`, color: "var(--muted)" },
        ].map((p) => (
          <span key={p.label} className="text-[10px] font-mono px-2 py-0.5 rounded border"
            style={{ color: p.color, borderColor: p.color }}>
            {p.label}
          </span>
        ))}
      </div>

      {anomalies.length === 0 && (
        <div className="text-xs" style={{ color: "var(--muted)" }}>
          No anomalies detected in this simulation window.
        </div>
      )}

      <div className="space-y-1.5 max-h-80 overflow-y-auto">
        {anomalies.slice(0, 15).map((a, i) => {
          const sevColor = SEV_COLOR[a.severity] ?? "var(--muted)";
          const icon = ANOMALY_ICONS[a.anomaly_type] ?? "•";
          const delta = a.observed_traffic - Math.round(a.expected_traffic ?? 0);
          const pct = a.expected_traffic > 0
            ? Math.abs((delta / a.expected_traffic) * 100).toFixed(0)
            : "?";
          return (
            <div key={i} className="rounded border px-3 py-2 text-xs"
              style={{
                borderColor: a.severity === "CRITICAL" ? "rgba(248,113,113,0.4)" : "var(--border)",
                background: a.severity === "CRITICAL" ? "rgba(248,113,113,0.05)" : "transparent",
              }}>
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono mr-1" style={{ color: sevColor }}>{icon}</span>
                  <span style={{ color: "var(--text)" }}>{a.zone_name ?? a.zone_id}</span>
                  <span className="mx-1" style={{ color: "var(--muted)" }}>·</span>
                  <span style={{ color: "var(--muted)" }}>{a.road_name}</span>
                </div>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                  style={{ color: sevColor, border: `1px solid ${sevColor}` }}>
                  {a.severity}
                </span>
              </div>
              <div className="mt-1 font-mono text-[10px]" style={{ color: "var(--muted)" }}>
                <span>{a.anomaly_type}</span>
                <span className="mx-2">|</span>
                <span>Obs: <span style={{ color: "var(--text)" }}>{a.observed_traffic}</span></span>
                <span className="mx-2">|</span>
                <span>Exp: <span style={{ color: "var(--text)" }}>{Math.round(a.expected_traffic ?? 0)}</span></span>
                <span className="mx-2">|</span>
                <span style={{ color: delta > 0 ? "var(--heavy)" : "var(--mod)" }}>
                  {delta > 0 ? "+" : ""}{delta} ({pct}%)
                </span>
              </div>
              {a.weather_condition && a.weather_condition !== "clear" && (
                <div className="mt-0.5 text-[10px]" style={{ color: "var(--accent)" }}>
                  Weather: {a.weather_condition.replace("_", " ")}
                </div>
              )}
              <div className="mt-0.5 text-[10px] font-mono" style={{ color: "var(--muted)" }}>
                {new Date(a.timestamp).toLocaleString("en-IN", {
                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] mt-2" style={{ color: "var(--muted)" }}>
        Anomaly scores from Isolation Forest on last 60 days of simulation.
        All values are synthetic — not real incident reports.
      </p>
    </div>
  );
}
