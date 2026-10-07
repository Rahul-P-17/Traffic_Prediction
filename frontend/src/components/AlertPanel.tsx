const SEV_COLOR: Record<string, string> = {
  CRITICAL: "var(--heavy)",
  HIGH: "var(--mod)",
  MEDIUM: "var(--accent)",
  LOW: "var(--muted)",
};

const TYPE_ICONS: Record<string, string> = {
  congestion: "C",
  anomaly: "A",
  weather: "W",
  festival: "F",
  accident: "X",
};

export default function AlertPanel({ alerts }: { alerts: any[] }) {
  const critical = alerts.filter((a) => a.severity === "CRITICAL").length;
  const high = alerts.filter((a) => a.severity === "HIGH").length;

  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm font-display">System Alerts</div>
        <div className="flex gap-1">
          {critical > 0 && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded"
              style={{ background: "rgba(248,113,113,0.15)", color: "var(--heavy)" }}>
              {critical} CRITICAL
            </span>
          )}
          {high > 0 && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded"
              style={{ background: "rgba(251,191,36,0.12)", color: "var(--mod)" }}>
              {high} HIGH
            </span>
          )}
        </div>
      </div>
      <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
        Chennai Simulation — alerts from congestion predictions and anomaly detection.
      </p>

      {alerts.length === 0 && (
        <div className="flex items-center gap-2 text-xs px-3 py-2 rounded border"
          style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--panel-2)" }}>
          <span className="w-2 h-2 rounded-full" style={{ background: "var(--low)" }} />
          All zones nominal — no active alerts.
        </div>
      )}

      <div className="space-y-1.5 max-h-72 overflow-y-auto">
        {alerts.map((a, i) => {
          const sevColor = SEV_COLOR[a.severity] ?? "var(--muted)";
          const typeIcon = TYPE_ICONS[a.type] ?? "!";
          return (
            <div key={a.alert_id ?? i}
              className="flex items-start gap-3 text-xs rounded border px-3 py-2"
              style={{
                borderColor: a.severity === "CRITICAL" ? "rgba(248,113,113,0.4)" : "var(--border)",
                background: a.severity === "CRITICAL" ? "rgba(248,113,113,0.05)" : "transparent",
              }}>
              {/* Animated pulse dot */}
              <div className="flex flex-col items-center pt-0.5 gap-1">
                <span className="w-2 h-2 rounded-full pulse-dot flex-shrink-0"
                  style={{ background: sevColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase" style={{ color: sevColor }}>
                    {a.severity} · {a.type}
                  </span>
                  {a.status && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                      style={{ background: "var(--panel-2)", color: "var(--muted)", border: "1px solid var(--border)" }}>
                      {a.status}
                    </span>
                  )}
                </div>
                <div className="mt-0.5" style={{ color: "var(--text)" }}>{a.message}</div>
                <div className="mt-0.5 font-mono text-[10px]" style={{ color: "var(--muted)" }}>
                  {a.zone_name || a.location}
                  {a.timestamp && (
                    <> · {new Date(a.timestamp).toLocaleString("en-IN", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                    })}</>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
