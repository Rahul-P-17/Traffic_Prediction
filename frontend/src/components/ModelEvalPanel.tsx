interface Props {
  evaluations: any[];
}

export default function ModelEvalPanel({ evaluations }: Props) {
  if (!evaluations.length) return null;
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
      <div className="text-sm font-display mb-3">ML Model Evaluation</div>
      <div className="grid md:grid-cols-2 gap-3">
        {evaluations.map((ev, i) => (
          <div
            key={i}
            className="rounded border p-3 text-xs"
            style={{ borderColor: "var(--border)", background: "var(--panel-2)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-display text-sm">{ev.model_name}</span>
              {ev.model_name === "XGBoost" && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded font-mono"
                  style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
                >
                  Primary
                </span>
              )}
              {ev.model_name === "RandomForest" && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded font-mono"
                  style={{ background: "rgba(96,165,250,0.15)", color: "#60A5FA" }}
                >
                  Baseline
                </span>
              )}
            </div>
            <div className="font-mono space-y-1">
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <div style={{ color: "var(--muted)", fontSize: 10 }}>Test MAE</div>
                  <div style={{ color: "var(--text)" }}>{ev.mae?.toFixed(1) ?? "—"}</div>
                </div>
                <div className="text-center">
                  <div style={{ color: "var(--muted)", fontSize: 10 }}>Test RMSE</div>
                  <div style={{ color: "var(--text)" }}>{ev.rmse?.toFixed(1) ?? "—"}</div>
                </div>
                <div className="text-center">
                  <div style={{ color: "var(--muted)", fontSize: 10 }}>Test R²</div>
                  <div
                    style={{
                      color: (ev.r2 ?? 0) > 0.90 ? "var(--low)" :
                             (ev.r2 ?? 0) > 0.80 ? "var(--mod)" : "var(--heavy)",
                    }}
                  >
                    {ev.r2?.toFixed(4) ?? "—"}
                  </div>
                </div>
              </div>
              {ev.val_r2 != null && (
                <div className="grid grid-cols-3 gap-2 pt-1" style={{ borderTop: "1px solid var(--border)" }}>
                  <div className="text-center">
                    <div style={{ color: "var(--muted)", fontSize: 10 }}>Val MAE</div>
                    <div style={{ color: "var(--muted)" }}>{ev.val_mae?.toFixed(1) ?? "—"}</div>
                  </div>
                  <div className="text-center">
                    <div style={{ color: "var(--muted)", fontSize: 10 }}>Val RMSE</div>
                    <div style={{ color: "var(--muted)" }}>{ev.val_rmse?.toFixed(1) ?? "—"}</div>
                  </div>
                  <div className="text-center">
                    <div style={{ color: "var(--muted)", fontSize: 10 }}>Val R²</div>
                    <div style={{ color: "var(--muted)" }}>{ev.val_r2?.toFixed(4) ?? "—"}</div>
                  </div>
                </div>
              )}
              <div className="pt-1" style={{ borderTop: "1px solid var(--border)", color: "var(--muted)", fontSize: 10 }}>
                <div>Split: {ev.split_method ?? "chronological"}</div>
                {ev.train_period && <div>Train: {ev.train_period}</div>}
                {ev.test_period && <div>Test: {ev.test_period}</div>}
                <div>Dataset: {ev.dataset ?? "Chennai Synthetic"}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] mt-2" style={{ color: "var(--muted)" }}>
        Metrics computed on held-out chronological test set (not training data).
        No data leakage — all lag/rolling features computed strictly from past values.
        Trained on Chennai Metropolitan Region synthetic dataset (Jan-Dec 2025 simulation).
      </p>
    </div>
  );
}
