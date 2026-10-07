const TYPE_COLORS: Record<string, string> = {
  "DOMAIN KNOWLEDGE": "var(--low)",
  "SYNTHETIC": "var(--accent)",
  "SYNTHETIC ASSUMPTION": "var(--mod)",
  "REAL/PUBLIC": "var(--low)",
  "DERIVED": "var(--accent)",
};

const badge = (t: string) => {
  for (const [key, color] of Object.entries(TYPE_COLORS)) {
    if (t.includes(key)) return color;
  }
  return "var(--muted)";
};

export default function DataSourcesPanel({ sources }: { sources: any[] }) {
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
      <div className="text-sm font-display mb-1">Data Source Provenance</div>
      <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
        Chennai Metropolitan Region Simulation — all data labelled by classification.
        See DATA_PROVENANCE.md for full methodology.
      </p>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap mb-3">
        {[
          { label: "DOMAIN KNOWLEDGE", color: "var(--low)" },
          { label: "SYNTHETIC", color: "var(--accent)" },
          { label: "SYNTHETIC ASSUMPTION", color: "var(--mod)" },
        ].map((l) => (
          <span key={l.label} className="text-[10px] font-mono flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>

      <div className="space-y-1">
        {sources.map((s, i) => (
          <div
            key={i}
            className="flex justify-between items-start text-xs border-t py-1.5 gap-2"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex-1">
              <span style={{ color: "var(--text)" }}>{s.name}</span>
              {s.detail && (
                <span style={{ color: "var(--muted)" }}> — {s.detail}</span>
              )}
              {s.notes && (
                <div className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>
                  {s.notes}
                </div>
              )}
            </div>
            <span
              className="font-mono px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap"
              style={{
                color: badge(s.type),
                border: `1px solid ${badge(s.type)}`,
              }}
            >
              {s.type}
            </span>
          </div>
        ))}
        {sources.length === 0 && (
          <div className="text-xs" style={{ color: "var(--muted)" }}>
            Loading data sources…
          </div>
        )}
      </div>

      <div
        className="text-[10px] mt-3 px-3 py-2 rounded border"
        style={{
          borderColor: "var(--border)",
          color: "var(--muted)",
          background: "var(--panel-2)",
        }}
      >
        No real-time sensor data is used. All traffic volumes are synthetic / simulation.
        Zone characteristics are derived from publicly available land-use information.
        See DATA_PROVENANCE.md for citations and rationale.
      </div>
    </div>
  );
}
