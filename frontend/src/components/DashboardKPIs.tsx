import { formatSimDate } from "../lib/api";

interface Props {
  current: any[];
  demoMode: boolean;
  alertCount: number;
  simContext?: any;
}

export default function DashboardKPIs({ current, demoMode, alertCount, simContext }: Props) {
  const heavy = current.filter((c) => c.congestion_level === "HEAVY").length;
  const avg = current.length
    ? Math.round(current.reduce((a, c) => a + (c.predicted_traffic_volume ?? 0), 0) / current.length)
    : 0;
  const worst = [...current].sort(
    (a, b) => (b.predicted_traffic_volume ?? 0) - (a.predicted_traffic_volume ?? 0)
  )[0];

  const simDate = simContext?.simulation_date ?? "";
  const scenario = simContext?.scenario ?? "Normal Day";

  const cards = [
    { label: "Zones monitored", value: current.length || "—", mono: true },
    { label: "Avg predicted volume", value: avg || "—", mono: true },
    {
      label: "Heavy congestion zones",
      value: heavy,
      accent: heavy > 0 ? "var(--heavy)" : "var(--low)",
    },
    {
      label: "Active alerts",
      value: alertCount,
      accent: alertCount > 0 ? "var(--mod)" : "var(--low)",
    },
    { label: "Busiest road (1h)", value: worst?.road_name ?? "—", small: true },
  ];

  return (
    <div className="space-y-2">
      {/* Simulation context bar */}
      <div
        className="rounded-lg border px-4 py-2.5 flex flex-wrap gap-4 items-center"
        style={{ borderColor: "var(--accent-dim)", background: "rgba(33,212,196,0.04)" }}
      >
        <div className="text-xs">
          <span style={{ color: "var(--muted)" }}>Study Region: </span>
          <span style={{ color: "var(--accent)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
            Chennai Metropolitan Region, Tamil Nadu
          </span>
        </div>
        {simDate && (
          <>
            <span style={{ color: "var(--border)" }}>|</span>
            <div className="text-xs">
              <span style={{ color: "var(--muted)" }}>Simulation Date: </span>
              <span
                className="font-mono px-1.5 py-0.5 rounded text-xs"
                style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
              >
                {formatSimDate(simDate)}
              </span>
            </div>
            <span style={{ color: "var(--border)" }}>|</span>
            <div className="text-xs">
              <span style={{ color: "var(--muted)" }}>Scenario: </span>
              <span style={{ color: "var(--text)" }}>{scenario}</span>
            </div>
          </>
        )}
        <div
          className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded border uppercase"
          style={{ borderColor: "var(--mod)", color: "var(--mod)" }}
        >
          Simulation / Scenario Mode
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-lg border p-4"
            style={{ borderColor: "var(--border)", background: "var(--panel)" }}
          >
            <div
              className="text-xs uppercase tracking-wide"
              style={{ color: "var(--muted)" }}
            >
              {c.label}
            </div>
            <div
              className={`font-display mt-1 ${c.small ? "text-base" : "text-2xl"}`}
              style={{
                color: c.accent ?? "var(--text)",
                fontFamily: c.mono ? "'JetBrains Mono', monospace" : undefined,
              }}
            >
              {c.value}
            </div>
          </div>
        ))}

        {/* Data note */}
        <div
          className="col-span-2 md:col-span-5 text-xs px-3 py-2 rounded border"
          style={{
            borderColor: "var(--accent-dim)",
            color: "var(--accent)",
            background: "rgba(33,212,196,0.04)",
          }}
        >
          <strong>Chennai Simulation</strong> — All traffic figures are research-grounded synthetic data.
          Zone characteristics based on publicly available land-use and transport information.
          Not real-time measured data. See Data Sources panel for full provenance.
        </div>
      </div>
    </div>
  );
}
