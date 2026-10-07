import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { levelColor } from "../lib/api";

// Chennai Metropolitan Region centre
const CHENNAI_CENTER: [number, number] = [13.0827, 80.2707];

export default function TrafficMap({ zones }: { zones: any[] }) {
  if (!zones.length) return (
    <div
      className="rounded-lg border flex items-center justify-center"
      style={{ borderColor: "var(--border)", height: 360, background: "var(--panel)" }}
    >
      <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>
        Loading Chennai zone data…
      </span>
    </div>
  );

  // De-duplicate zones (show one marker per zone_id — highest predicted volume)
  const zoneMap = new Map<string, any>();
  for (const z of zones) {
    const existing = zoneMap.get(z.zone_id);
    if (!existing || z.predicted_traffic_volume > existing.predicted_traffic_volume) {
      zoneMap.set(z.zone_id, z);
    }
  }
  const displayZones = Array.from(zoneMap.values());

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)" }}>
      <div
        className="px-4 py-2 flex items-center justify-between"
        style={{ background: "var(--panel)" }}
      >
        <div>
          <span className="text-sm font-display">Chennai Metropolitan Region — Simulation Forecast</span>
          <span
            className="ml-2 text-[10px] font-mono px-2 py-0.5 rounded"
            style={{ background: "rgba(251,191,36,0.15)", color: "var(--mod)" }}
          >
            Simulation Mode
          </span>
        </div>
        <div className="flex gap-3 text-xs font-mono">
          <span>
            <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: "var(--low)" }} />
            LOW
          </span>
          <span>
            <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: "var(--mod)" }} />
            MODERATE
          </span>
          <span>
            <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: "var(--heavy)" }} />
            HEAVY
          </span>
        </div>
      </div>
      <MapContainer center={CHENNAI_CENTER} zoom={11} style={{ height: 400, width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
        />
        {displayZones.map((z) => {
          const lat = z.latitude ?? z.lat;
          const lon = z.longitude ?? z.lon;
          if (!lat || !lon) return null;
          const color = levelColor(z.congestion_level);
          // Scale radius by volume for visual impact
          const maxVol = Math.max(...displayZones.map((x) => x.predicted_traffic_volume || 1));
          const radius = 10 + 12 * ((z.predicted_traffic_volume || 0) / Math.max(maxVol, 1));
          return (
            <CircleMarker
              key={z.zone_id}
              center={[lat, lon]}
              radius={radius}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.55,
                weight: 2,
              }}
            >
              <Tooltip direction="top" permanent={false}>
                <div className="text-xs" style={{ minWidth: 160 }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>
                    {z.zone_name}
                  </div>
                  <div style={{ color: "#666", fontSize: 10 }}>
                    {z.zone_type?.replace("_", " ").toUpperCase() ?? ""}
                  </div>
                  <div>
                    Predicted:{" "}
                    <strong>{Math.round(z.predicted_traffic_volume ?? 0)}</strong> veh
                  </div>
                  <div>
                    Level:{" "}
                    <span style={{ color: color }}>
                      <strong>{z.congestion_level}</strong>
                    </span>
                  </div>
                  {z.festival_context && z.festival_context !== "None" && (
                    <div style={{ color: "#f59e0b", marginTop: 2 }}>
                      Festival: {z.festival_context}
                    </div>
                  )}
                  <div style={{ color: "#aaa", fontSize: 9, marginTop: 2 }}>
                    Simulation / Research-Grounded Synthetic Data
                  </div>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
      <div
        className="px-4 py-1.5 text-[10px] font-mono"
        style={{ background: "var(--panel)", color: "var(--muted)", borderTop: "1px solid var(--border)" }}
      >
        {displayZones.length} zones displayed | Chennai Metropolitan Region Simulation |
        Not real-time data — research-grounded synthetic simulation
      </div>
    </div>
  );
}
