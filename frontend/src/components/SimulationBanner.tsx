import { formatSimDate } from "../lib/api";

interface Props {
  simContext: any;
}

export default function SimulationBanner({ simContext }: Props) {
  if (!simContext) return null;
  const { simulation_date, scenario, disclaimer, study_region } = simContext;

  return (
    <div
      style={{
        background: "linear-gradient(90deg, rgba(33,212,196,0.08) 0%, rgba(33,212,196,0.04) 100%)",
        borderBottom: "1px solid var(--accent-dim)",
        padding: "8px 24px",
      }}
    >
      <div className="flex flex-wrap items-center gap-4">
        {/* Study region */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest font-mono" style={{ color: "var(--muted)" }}>
            Region
          </span>
          <span className="text-xs font-display" style={{ color: "var(--text)" }}>
            {study_region ?? "Chennai Metropolitan Region"}
          </span>
        </div>

        <span style={{ color: "var(--border)" }}>|</span>

        {/* Simulation date */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest font-mono" style={{ color: "var(--muted)" }}>
            Simulation Date
          </span>
          <span
            className="text-xs font-mono px-2 py-0.5 rounded"
            style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
          >
            {formatSimDate(simulation_date)}
          </span>
        </div>

        <span style={{ color: "var(--border)" }}>|</span>

        {/* Scenario */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest font-mono" style={{ color: "var(--muted)" }}>
            Scenario
          </span>
          <span className="text-xs font-mono" style={{ color: "var(--text)" }}>
            {scenario ?? "Normal Day"}
          </span>
        </div>

        <span style={{ color: "var(--border)" }}>|</span>

        {/* Mode badge */}
        <div
          className="text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase tracking-wide"
          style={{ borderColor: "var(--mod)", color: "var(--mod)" }}
        >
          Simulation / Scenario Mode
        </div>

        {/* Disclaimer */}
        {disclaimer && (
          <span className="text-[10px] ml-auto" style={{ color: "var(--muted)" }}>
            {disclaimer}
          </span>
        )}
      </div>
    </div>
  );
}
