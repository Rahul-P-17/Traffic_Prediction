export default function ModelEvaluation({ evaluations }: { evaluations: any[] }) {
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
      <div className="text-sm font-display mb-3">Model Evaluation (actual test-set results)</div>
      <table className="w-full text-xs font-mono">
        <thead><tr style={{ color: "var(--muted)" }}>
          <th className="text-left py-1">Model</th><th className="text-left">MAE</th>
          <th className="text-left">RMSE</th><th className="text-left">R²</th>
        </tr></thead>
        <tbody>
          {evaluations.map((e, i) => (
            <tr key={i} className="border-t" style={{ borderColor: "var(--border)" }}>
              <td className="py-1" style={{ color: "var(--accent)" }}>{e.model_name}</td>
              <td>{e.mae}</td><td>{e.rmse}</td><td>{e.r2}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[11px] mt-2" style={{ color: "var(--muted)" }}>
        Chronological train/val/test split (70/15/15), no shuffling — metrics computed from real model execution on held-out future data.
      </p>
    </div>
  );
}
