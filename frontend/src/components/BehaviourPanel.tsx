import { useState } from "react";

const PROFILE_COLORS: Record<string, string> = {
  "Office / IT Commuter Pattern": "#21D4C4",
  "School Zone Mobility Pattern": "#34D399",
  "Shopping / Evening Demand Pattern": "#FBBF24",
  "Intercity / Transit Hub Pattern": "#F472B6",
  "Industrial Shift Pattern": "#A78BFA",
  "High-Volume Commuter Corridor": "#F87171",
  "Residential Mixed Pattern": "#60A5FA",
  "General Urban Traffic Pattern": "#94A3B8",
};

export default function BehaviourPanel({ patterns }: { patterns: any[] }) {
  const [filter, setFilter] = useState<string>("all");
  const [weekendOnly, setWeekendOnly] = useState(false);

  const zoneTypes = Array.from(new Set(patterns.map((p) => p.zone_type).filter(Boolean)));
  const profileTypes = Array.from(new Set(patterns.map((p) => p.interpreted_pattern)));

  const displayed = patterns.filter((p) => {
    if (weekendOnly && !p.is_weekend) return false;
    if (filter === "all") return true;
    return p.zone_type === filter || p.interpreted_pattern === filter;
  });

  // Profile summary
  const profileSummary = profileTypes.map((pt) => ({
    name: pt,
    count: patterns.filter((p) => p.interpreted_pattern === pt).length,
    color: PROFILE_COLORS[pt] ?? "var(--muted)",
  }));

  return (
    <div
      className="rounded-lg border p-4 space-y-4"
      style={{ borderColor: "var(--border)", background: "var(--panel)" }}
    >
      {/* Header */}
      <div>
        <div className="text-sm font-display">Human Mobility Pattern Analysis</div>
        <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
          K-Means clustering (k=7) on aggregated hourly traffic profiles per zone.
          Population-level analysis only — no individual tracking, no personal data.
          Patterns are interpreted from temporal demand curve shapes.
        </p>
      </div>

      {/* Profile legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {profileSummary.map((ps) => (
          <div
            key={ps.name}
            className="rounded border px-2 py-1.5 cursor-pointer"
            style={{
              borderColor: filter === ps.name ? ps.color : "var(--border)",
              background: filter === ps.name ? `${ps.color}15` : "transparent",
            }}
            onClick={() => setFilter(filter === ps.name ? "all" : ps.name)}
          >
            <div className="text-[10px] font-mono" style={{ color: ps.color }}>
              ● {ps.count} zones
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: "var(--text)" }}>
              {ps.name}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: "var(--muted)" }}>
          <input
            type="checkbox"
            checked={weekendOnly}
            onChange={(e) => setWeekendOnly(e.target.checked)}
            className="rounded"
          />
          Weekend only
        </label>
        <button
          onClick={() => { setFilter("all"); setWeekendOnly(false); }}
          className="text-xs px-2 py-0.5 rounded"
          style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
        >
          Reset filters
        </button>
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          Showing {displayed.length} of {patterns.length} zone-profiles
        </span>
      </div>

      {/* Pattern cards */}
      <div className="grid md:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
        {displayed.map((p, i) => {
          const color = PROFILE_COLORS[p.interpreted_pattern] ?? "var(--muted)";
          // Mini sparkline from hourly_profile
          const hours = p.hourly_profile ? Object.entries(p.hourly_profile) : [];
          const maxVol = hours.length ? Math.max(...hours.map(([, v]) => Number(v))) : 1;
          return (
            <div
              key={i}
              className="rounded border px-3 py-2 text-xs"
              style={{ borderColor: "var(--border)", background: "var(--panel-2)" }}
            >
              <div className="flex justify-between items-start mb-1.5">
                <div>
                  <div className="font-display" style={{ color: "var(--text)" }}>
                    {p.zone_name ?? p.zone_id}
                  </div>
                  <div className="font-mono text-[10px]" style={{ color: "var(--muted)" }}>
                    {p.zone_type?.replace("_", " ") ?? ""} | {p.is_weekend ? "Weekend" : "Weekday"} | cluster {p.cluster}
                  </div>
                </div>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ color, border: `1px solid ${color}`, whiteSpace: "nowrap" }}
                >
                  Peak {p.peak_hour ?? "—"}:00
                </span>
              </div>
              <div style={{ color, fontWeight: 600, fontSize: 11 }}>
                {p.interpreted_pattern}
              </div>
              {/* Mini bar chart */}
              {hours.length > 0 && (
                <div
                  className="flex items-end gap-px mt-2"
                  style={{ height: 24 }}
                  title="Avg hourly traffic profile"
                >
                  {hours.map(([h, v]) => {
                    const pct = (Number(v) / Math.max(maxVol, 1)) * 100;
                    return (
                      <div
                        key={h}
                        style={{
                          flex: 1,
                          height: `${Math.max(pct, 2)}%`,
                          background: pct > 70 ? color : "var(--border)",
                          borderRadius: 1,
                          opacity: pct > 70 ? 1 : 0.5,
                        }}
                        title={`${h}:00 — ${Math.round(Number(v))} veh`}
                      />
                    );
                  })}
                </div>
              )}
              <div
                className="text-[9px] font-mono mt-0.5 flex justify-between"
                style={{ color: "var(--muted)" }}
              >
                <span>0:00</span>
                <span>12:00</span>
                <span>23:00</span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px]" style={{ color: "var(--muted)" }}>
        Clusters are aggregated zone-level traffic profiles — not individual behaviour.
        No personal identifiers used. Analysis performed on synthetic simulation data.
      </p>
    </div>
  );
}
