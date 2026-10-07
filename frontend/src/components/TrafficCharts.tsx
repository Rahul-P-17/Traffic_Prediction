import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { levelColor } from "../lib/api";

export default function TrafficCharts({ forecasts }: { forecasts: any[] }) {
  const horizons = ["next_1h", "next_6h", "tomorrow", "next_weekend"];
  const byHorizon = horizons.map((h) => {
    const rows = forecasts.filter((f) => f.horizon === h);
    return { horizon: h, avg: rows.length ? Math.round(rows.reduce((a, r) => a + r.predicted_traffic_volume, 0) / rows.length) : 0 };
  });

  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
      <div className="text-sm font-display mb-3">Forecast Trend — Avg Predicted Volume by Horizon</div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={byHorizon}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="horizon" stroke="var(--muted)" fontSize={12} />
          <YAxis stroke="var(--muted)" fontSize={12} />
          <Tooltip contentStyle={{ background: "var(--panel-2)", border: "1px solid var(--border)", color: "var(--text)" }} />
          <Bar dataKey="avg" fill="var(--accent)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr style={{ color: "var(--muted)" }}>
              <th className="text-left py-1">Road</th><th className="text-left">Horizon</th>
              <th className="text-left">Predicted</th><th className="text-left">Level</th>
            </tr>
          </thead>
          <tbody>
            {forecasts.slice(0, 12).map((f, i) => (
              <tr key={i} className="border-t" style={{ borderColor: "var(--border)" }}>
                <td className="py-1">{f.road_name}</td>
                <td>{f.horizon}</td>
                <td>{f.predicted_traffic_volume}</td>
                <td><span style={{ color: levelColor(f.congestion_level) }}>{f.congestion_level}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
