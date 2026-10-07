import { useState } from "react";
import { api, levelColor, formatSimDate } from "../lib/api";

const FESTIVALS = ["Deepavali", "Pongal", "Christmas", "New Year"];
const PHASES = [
  { key: "day_before", label: "Day Before" },
  { key: "festival_day", label: "Festival Day" },
  { key: "day_after", label: "Day After" },
];

const FESTIVAL_DESCRIPTIONS: Record<string, string> = {
  Deepavali: "Largest shopping and intercity travel surge in Tamil Nadu. T.Nagar and Koyambedu see peak mobility.",
  Pongal: "4-day harvest festival; major intercity outbound travel for village visits. Kilambakkam and GST Road heavily loaded.",
  Christmas: "National holiday; shopping and entertainment surge. Moderate intercity demand.",
  "New Year": "Entertainment and celebration surge; late-night traffic peak in residential and mixed zones.",
};

export default function FestivalMode() {
  const [festival, setFestival] = useState("Deepavali");
  const [phase, setPhase] = useState("day_before");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = async (f: string, p: string) => {
    setFestival(f);
    setPhase(p);
    setLoading(true);
    try {
      const res = await api.festival(f, p);
      setData(res);
    } catch (e) {
      setData({ error: String(e) });
    } finally {
      setLoading(false);
    }
  };

  const zones = data?.zones ?? [];
  const heavyZones = zones.filter((z: any) => z.congestion_level === "HEAVY");
  const moderateZones = zones.filter((z: any) => z.congestion_level === "MODERATE");

  return (
    <div
      className="rounded-lg border p-4 space-y-4"
      style={{ borderColor: "var(--border)", background: "var(--panel)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-display">Festival / Event Scenario Simulation</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            Modelled mobility impacts — synthetic assumptions documented in chennai_zones.py
          </div>
        </div>
        <div
          className="text-[10px] font-mono px-2 py-0.5 rounded border uppercase"
          style={{ borderColor: "var(--mod)", color: "var(--mod)" }}
        >
          Scenario Mode
        </div>
      </div>

      {/* Festival selector */}
      <div>
        <div className="text-xs font-mono mb-1.5" style={{ color: "var(--muted)" }}>
          Select Festival
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FESTIVALS.map((f) => (
            <button
              key={f}
              onClick={() => load(f, phase)}
              className="text-xs px-3 py-1.5 rounded font-mono transition-all"
              style={{
                background: festival === f ? "var(--accent-dim)" : "transparent",
                border: `1px solid ${festival === f ? "var(--accent)" : "var(--border)"}`,
                color: festival === f ? "var(--accent)" : "var(--muted)",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Phase selector */}
      <div>
        <div className="text-xs font-mono mb-1.5" style={{ color: "var(--muted)" }}>
          Festival Phase
        </div>
        <div className="flex gap-1.5">
          {PHASES.map((p) => (
            <button
              key={p.key}
              onClick={() => load(festival, p.key)}
              className="text-xs px-3 py-1.5 rounded font-mono transition-all"
              style={{
                background: phase === p.key ? "rgba(251,191,36,0.15)" : "transparent",
                border: `1px solid ${phase === p.key ? "var(--mod)" : "var(--border)"}`,
                color: phase === p.key ? "var(--mod)" : "var(--muted)",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="text-xs" style={{ color: "var(--muted)" }}>
          Loading scenario…
        </div>
      )}

      {data?.error && (
        <div className="text-xs" style={{ color: "var(--heavy)" }}>
          Error: {data.error}
        </div>
      )}

      {data && !data.error && (
        <>
          {/* Label */}
          <div
            className="text-[11px] px-3 py-1.5 rounded inline-block"
            style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
          >
            {data.label ?? `Scenario: ${festival} — ${PHASES.find(p => p.key === phase)?.label}`}
          </div>

          {/* Festival description */}
          {FESTIVAL_DESCRIPTIONS[festival] && (
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              {FESTIVAL_DESCRIPTIONS[festival]}
            </p>
          )}

          {/* Note */}
          {data.note && (
            <p
              className="text-[11px] px-3 py-2 rounded border"
              style={{
                borderColor: "var(--border)",
                color: "var(--muted)",
                background: "var(--panel-2)",
              }}
            >
              {data.note}
            </p>
          )}

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "HEAVY congestion zones", value: heavyZones.length, color: "var(--heavy)" },
              { label: "MODERATE zones", value: moderateZones.length, color: "var(--mod)" },
              { label: "Total zones", value: zones.length, color: "var(--accent)" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded border p-2 text-center"
                style={{ borderColor: "var(--border)", background: "var(--panel-2)" }}
              >
                <div className="text-xl font-display font-bold" style={{ color: s.color }}>
                  {s.value}
                </div>
                <div className="text-[10px] font-mono" style={{ color: "var(--muted)" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Zone grid */}
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
            {zones.map((z: any, i: number) => (
              <div
                key={i}
                className="rounded border px-3 py-2 text-xs"
                style={{
                  borderColor:
                    z.congestion_level === "HEAVY"
                      ? "rgba(248,113,113,0.3)"
                      : z.congestion_level === "MODERATE"
                      ? "rgba(251,191,36,0.3)"
                      : "var(--border)",
                  background:
                    z.congestion_level === "HEAVY"
                      ? "rgba(248,113,113,0.05)"
                      : "var(--panel-2)",
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-display" style={{ color: "var(--text)" }}>
                      {z.zone_name}
                    </div>
                    <div style={{ color: "var(--muted)", fontSize: 10 }}>
                      {z.road_name}
                    </div>
                  </div>
                  <span
                    className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                    style={{ color: levelColor(z.congestion_level), border: `1px solid ${levelColor(z.congestion_level)}` }}
                  >
                    {z.congestion_level}
                  </span>
                </div>
                <div className="mt-1.5 space-y-0.5 font-mono" style={{ color: "var(--muted)" }}>
                  <div>
                    Sim avg:{" "}
                    <span style={{ color: "var(--text)" }}>
                      {Math.round(z.avg_festival_volume ?? 0)}
                    </span>{" "}
                    veh
                  </div>
                  <div>
                    Normal avg:{" "}
                    <span style={{ color: "var(--text)" }}>
                      {Math.round(z.avg_normal_volume ?? 0)}
                    </span>{" "}
                    veh
                  </div>
                  {z.demand_multiplier != null && (
                    <div>
                      Multiplier:{" "}
                      <span style={{ color: z.demand_multiplier > 1.2 ? "var(--mod)" : "var(--text)" }}>
                        {z.demand_multiplier?.toFixed(2)}×
                      </span>
                    </div>
                  )}
                  {z.peak_hour != null && (
                    <div>Peak hr: {z.peak_hour}:00</div>
                  )}
                </div>
                {z.narrative && (
                  <div
                    className="mt-1.5 text-[10px] italic"
                    style={{ color: "var(--accent)", borderTop: "1px solid var(--border)", paddingTop: 4 }}
                  >
                    {z.narrative}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
