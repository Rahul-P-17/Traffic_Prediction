const PRIVACY_PRINCIPLES = [
  {
    icon: "→",
    title: "Population-level analysis only",
    detail: "K-Means clustering and behaviour analysis operate on aggregated zone-level hourly traffic profiles, not on individual vehicle or person trajectories.",
  },
  {
    icon: "→",
    title: "No individual tracking",
    detail: "No GPS traces, phone data, CCTV feeds, or individual mobility patterns are used. Public transport activity is an aggregated 0–1 zone-level index.",
  },
  {
    icon: "→",
    title: "No real-time sensor data",
    detail: "All traffic volumes are computationally generated from research-grounded demand curves. No real physical sensors or IoT devices feed this system.",
  },
  {
    icon: "→",
    title: "No personal identifiers",
    detail: "No names, phone numbers, vehicle registration numbers, Aadhaar numbers, or any other PII are stored or processed.",
  },
  {
    icon: "→",
    title: "No facial recognition",
    detail: "No image or video data is processed. No facial recognition, emotion detection, or biometric analysis is performed.",
  },
  {
    icon: "→",
    title: "Synthetic data transparency",
    detail: "All data is labelled with its classification (DOMAIN KNOWLEDGE / SYNTHETIC / SYNTHETIC ASSUMPTION). Full provenance documented in DATA_PROVENANCE.md.",
  },
];

export default function PrivacyPanel({ privacy }: { privacy: any }) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{ borderColor: "var(--accent-dim)", background: "rgba(33,212,196,0.04)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-display" style={{ color: "var(--accent)" }}>
          Privacy Protection
        </div>
        <span
          className="text-[10px] font-mono px-2 py-0.5 rounded border"
          style={{ borderColor: "var(--accent-dim)", color: "var(--accent)" }}
        >
          PDPA / IT Act Compliant
        </span>
      </div>

      {privacy?.statement && (
        <p className="text-xs mb-3" style={{ color: "var(--text)" }}>
          {privacy.statement}
        </p>
      )}

      <div className="space-y-2">
        {(privacy?.details
          ? privacy.details.map((d: string, i: number) => ({
              icon: "→", title: d, detail: "",
            }))
          : PRIVACY_PRINCIPLES
        ).map((p: any, i: number) => (
          <div key={i} className="flex gap-2 text-xs">
            <span style={{ color: "var(--accent)", flexShrink: 0, fontWeight: 600 }}>{p.icon}</span>
            <div>
              <span style={{ color: "var(--text)" }}>{p.title}</span>
              {p.detail && (
                <span style={{ color: "var(--muted)" }}> — {p.detail}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div
        className="mt-4 text-[10px] px-3 py-2 rounded border"
        style={{
          borderColor: "var(--accent-dim)",
          color: "var(--accent)",
          background: "rgba(33,212,196,0.06)",
        }}
      >
        Data classification: <strong>SYNTHETIC / RESEARCH-GROUNDED</strong> —
        This system was built for academic demonstration. No real personal data is
        collected, stored, or processed.
      </div>
    </div>
  );
}
