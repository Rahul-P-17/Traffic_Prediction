const BASE = "http://localhost:4000";

export async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

export const api = {
  current:       () => apiFetch("/api/traffic/current"),
  heatmap:       () => apiFetch("/api/traffic/heatmap"),
  forecast:      (params?: string) => apiFetch(`/api/traffic/forecast${params ? "?" + params : ""}`),
  behaviour:     () => apiFetch("/api/behaviour/patterns"),
  recommendations: () => apiFetch("/api/recommendations"),
  anomalies:     () => apiFetch("/api/anomalies"),
  alerts:        () => apiFetch("/api/alerts"),
  dataSources:   () => apiFetch("/api/data-sources"),
  evaluation:    () => apiFetch("/api/ml/evaluation"),
  privacy:       () => apiFetch("/api/privacy"),
  zones:         () => apiFetch("/api/zones"),
  roads:         (zone_id: string) => apiFetch(`/api/zones/${encodeURIComponent(zone_id)}/roads`),
  scenarioSimulate: (body: { zone_id: string; road_id: string; date: string; time: string; scenario: string }) =>
    apiFetch("/api/scenario/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  simContext:    () => apiFetch("/api/simulation/context"),
  festivalPhases:() => apiFetch("/api/festival/phases"),
  festival:      (name: string, phase?: string) =>
    apiFetch("/api/festival/forecast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ festival: name, phase: phase ?? "day_before" }),
    }),
  chat: (question: string) =>
    apiFetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    }),
};

export function levelColor(level: string) {
  if (level === "HEAVY") return "var(--heavy)";
  if (level === "MODERATE") return "var(--mod)";
  return "var(--low)";
}

export function formatSimDate(dateStr: string) {
  if (!dateStr) return "Simulation Date";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
