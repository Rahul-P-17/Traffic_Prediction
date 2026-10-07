import { useState } from "react";
import { api } from "../lib/api";

const SUGGESTED = [
  "Which zone has the busiest traffic right now?",
  "What is the predicted traffic on OMR/Sholinganallur next hour?",
  "Which roads are HEAVY congestion predicted?",
  "What happens during Deepavali in Koyambedu?",
  "How does heavy rain affect traffic speed in Chennai?",
  "Show me peak hour traffic for office zones",
  "What anomalies are detected in the simulation?",
  "How does Kilambakkam look before Pongal?",
  "Which zones have shopping mobility patterns on weekends?",
  "Recommend alternate routes for HEAVY congestion",
];

interface Message {
  from: "user" | "bot";
  text: string;
  source?: string;
}

export default function TrafficChatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      from: "bot",
      text:
        "Hello! I can answer questions about the Chennai Metropolitan Region traffic simulation. " +
        "Try asking about specific zones (Koyambedu, T.Nagar, OMR), festival scenarios, " +
        "peak hours, or route recommendations.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async (question: string) => {
    if (!question.trim()) return;
    setMessages((m) => [...m, { from: "user", text: question }]);
    setInput("");
    setLoading(true);
    try {
      const res = await api.chat(question);
      setMessages((m) => [
        ...m,
        { from: "bot", text: res.answer ?? "No answer available.", source: res.source },
      ]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { from: "bot", text: "Service unavailable — please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="rounded-lg border p-4 flex flex-col gap-3"
      style={{
        borderColor: "var(--border)",
        background: "var(--panel)",
        height: 520,
      }}
    >
      {/* Header */}
      <div>
        <div className="text-sm font-display">AI Traffic Assistant</div>
        <div className="text-xs" style={{ color: "var(--muted)" }}>
          Chennai Metropolitan Region Simulation — Retrieval-based (no generative AI)
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[85%] text-xs rounded-lg px-3 py-2"
              style={{
                background:
                  m.from === "user" ? "var(--accent-dim)" : "var(--panel-2)",
                color: m.from === "user" ? "var(--accent)" : "var(--text)",
                border:
                  m.from === "bot" ? "1px solid var(--border)" : "none",
              }}
            >
              {m.text}
              {m.source && (
                <div
                  className="mt-1 font-mono"
                  style={{ fontSize: 9, color: "var(--muted)" }}
                >
                  source: {m.source}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div
              className="text-xs rounded-lg px-3 py-2"
              style={{
                background: "var(--panel-2)",
                border: "1px solid var(--border)",
                color: "var(--muted)",
              }}
            >
              Retrieving answer…
            </div>
          </div>
        )}
      </div>

      {/* Suggested questions */}
      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
        {SUGGESTED.map((q) => (
          <button
            key={q}
            onClick={() => send(q)}
            className="text-[10px] px-2 py-0.5 rounded-full font-mono transition-all"
            style={{
              border: "1px solid var(--border)",
              color: "var(--muted)",
              background: "transparent",
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder="Ask about Chennai zones, festivals, routes…"
          className="flex-1 text-xs rounded px-3 py-2 outline-none"
          style={{
            background: "var(--panel-2)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        />
        <button
          onClick={() => send(input)}
          disabled={loading}
          className="text-xs px-4 py-2 rounded font-mono transition-all"
          style={{
            background: "var(--accent)",
            color: "#000",
            opacity: loading ? 0.6 : 1,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
