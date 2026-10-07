import { useEffect, useState } from "react";
import { api } from "./lib/api";
import SimulationBanner from "./components/SimulationBanner";
import DashboardKPIs from "./components/DashboardKPIs";
import TrafficMap from "./components/TrafficMap";
import TrafficCharts from "./components/TrafficCharts";
import BehaviourPanel from "./components/BehaviourPanel";
import ForecastPanel from "./components/ForecastPanel";
import RecommendationPanel from "./components/RecommendationPanel";
import AnomalyPanel from "./components/AnomalyPanel";
import AlertPanel from "./components/AlertPanel";
import FestivalMode from "./components/FestivalMode";
import ScenarioSimulator from "./components/ScenarioSimulator";
import TrafficChatbot from "./components/TrafficChatbot";
import ModelEvalPanel from "./components/ModelEvalPanel";
import DataSourcesPanel from "./components/DataSourcesPanel";
import PrivacyPanel from "./components/PrivacyPanel";

const TABS = ["Overview", "Forecast", "Behaviour", "Anomalies", "Festival", "Scenario", "Chatbot", "System"] as const;

export default function App() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [current, setCurrent] = useState<any>({ data: [], label: "", demo_mode: true });
  const [heatmap, setHeatmap] = useState<any[]>([]);
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [behaviour, setBehaviour] = useState<any[]>([]);
  const [recs, setRecs] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [privacy, setPrivacy] = useState<any>(null);
  const [simContext, setSimContext] = useState<any>(null);

  useEffect(() => {
    api.current().then(setCurrent).catch(() => {});
    api.heatmap().then((r) => setHeatmap(r.zones)).catch(() => {});
    api.forecast().then((r) => setForecasts(r.forecasts)).catch(() => {});
    api.behaviour().then((r) => setBehaviour(r.patterns)).catch(() => {});
    api.recommendations().then((r) => setRecs(r.recommendations)).catch(() => {});
    api.anomalies().then((r) => setAnomalies(r.anomalies)).catch(() => {});
    api.alerts().then((r) => setAlerts(r.alerts)).catch(() => {});
    api.dataSources().then((r) => setSources(r.sources)).catch(() => {});
    api.evaluation().then((r) => setEvaluations(r.evaluations)).catch(() => {});
    api.privacy().then(setPrivacy).catch(() => {});
    api.simContext().then(setSimContext).catch(() => {});
  }, []);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>

      {/* Simulation banner — always visible */}
      <SimulationBanner simContext={simContext} />

      {/* Alert ticker */}
      <div className="overflow-hidden border-b" style={{ borderColor: "var(--border)", background: "var(--panel-2)" }}>
        <div className="whitespace-nowrap py-1.5 text-[11px] font-mono marquee-track" style={{ color: "var(--mod)" }}>
          {(alerts.length ? alerts : [{ message: "No active alerts — Chennai simulation nominal." }])
            .concat(alerts)
            .map((a, i) => (
              <span key={i} className="mx-6">&#9888; {a.message ?? a}</span>
            ))}
        </div>
      </div>

      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b" style={{ borderColor: "var(--border)" }}>
        <div>
          <div className="font-display text-lg" style={{ color: "var(--text)" }}>
            Chennai Smart Traffic Command Centre
          </div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>
            AI-Based Human Behaviour Analysis for Smart Traffic Management — Chennai Metropolitan Region
          </div>
        </div>
        <div className="text-xs font-mono px-3 py-1 rounded-full" style={{ border: "1px solid var(--accent-dim)", color: "var(--accent)" }}>
          {current.label || "Chennai Metropolitan Region — Simulation Mode"}
        </div>
      </header>

      {/* Navigation */}
      <nav className="px-6 flex gap-1 border-b" style={{ borderColor: "var(--border)" }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-3 py-2 text-xs font-mono border-b-2"
            style={{
              borderColor: tab === t ? "var(--accent)" : "transparent",
              color: tab === t ? "var(--accent)" : "var(--muted)",
            }}
          >
            {t}
          </button>
        ))}
      </nav>

      {/* Main content */}
      <main className="p-6 space-y-4">
        {tab === "Overview" && (
          <>
            <DashboardKPIs
              current={current.data ?? []}
              demoMode={!!current.demo_mode}
              alertCount={alerts.length}
              simContext={simContext}
            />
            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <TrafficMap zones={heatmap} />
                <TrafficCharts forecasts={forecasts} />
              </div>
              <div className="space-y-4">
                <AlertPanel alerts={alerts} />
                <RecommendationPanel recommendations={recs} />
              </div>
            </div>
          </>
        )}
        {tab === "Forecast" && (
          <ForecastPanel forecasts={forecasts} simContext={simContext} />
        )}
        {tab === "Behaviour" && <BehaviourPanel patterns={behaviour} />}
        {tab === "Anomalies" && (
          <div className="grid lg:grid-cols-2 gap-4">
            <AnomalyPanel anomalies={anomalies} />
            <AlertPanel alerts={alerts} />
          </div>
        )}
        {tab === "Festival" && <FestivalMode />}
        {tab === "Scenario" && <ScenarioSimulator simContext={simContext} />}
        {tab === "Chatbot" && <TrafficChatbot />}
        {tab === "System" && (
          <div className="space-y-4">
            <ModelEvalPanel evaluations={evaluations} />
            <div className="grid lg:grid-cols-2 gap-4">
              <DataSourcesPanel sources={sources} />
              <PrivacyPanel privacy={privacy} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
