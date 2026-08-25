"use client";

import React from "react";

interface CatalystOrRisk {
  title: string;
  description: string;
  impact?: string;
  severity?: string;
}

interface AnalystVerdict {
  rating: string;
  target_horizon: string;
  conviction: string;
  thesis: string;
}

interface SynthesisData {
  sentiment_score: number;
  sentiment_label: string;
  sentiment_rationale: string;
  executive_summary: string;
  growth_catalysts: CatalystOrRisk[];
  key_risks: CatalystOrRisk[];
  analyst_verdict: AnalystVerdict;
  suggested_questions?: string[];
  powered_by?: string;
}

interface AINewsSentimentRadarProps {
  synthesis: SynthesisData;
  companyName: string;
  ticker: string;
  onAskCopilot?: (question: string) => void;
}

export default function AINewsSentimentRadar({
  synthesis,
  companyName,
  ticker,
  onAskCopilot,
}: AINewsSentimentRadarProps) {
  const score = synthesis.sentiment_score ?? 0;
  const meterPercent = Math.min(Math.max(((score + 1) / 2) * 100, 5), 95);

  const getScoreColor = (s: number) => {
    if (s >= 0.4) return { text: "#047857", bg: "#059669", lightBg: "#ecfdf5", border: "#a7f3d0" };
    if (s >= 0.1) return { text: "#1d4ed8", bg: "#2563eb", lightBg: "#eff6ff", border: "#bfdbfe" };
    if (s >= -0.1) return { text: "#334155", bg: "#475569", lightBg: "#f8fafc", border: "#e2e8f0" };
    if (s >= -0.4) return { text: "#b45309", bg: "#d97706", lightBg: "#fffbeb", border: "#fde68a" };
    return { text: "#be123c", bg: "#e11d48", lightBg: "#fff1f2", border: "#fecdd3" };
  };

  const colors = getScoreColor(score);

  return (
    <div className="space-y-6">
      {/* Header Banner with Sentiment Gauge */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Quantitative Intelligence & Sentiment Synthesis
              </h2>
              <span
                style={{ backgroundColor: "#0f172a", color: "#ffffff" }}
                className="text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider"
              >
                {synthesis.powered_by || "Google Gemini"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Automated synthesis of fundamental metrics, quarterly performance, and financial disclosures for{" "}
              <span className="font-semibold text-slate-800">{companyName} ({ticker})</span>.
            </p>
          </div>

          {/* Sentiment Badge & Score */}
          <div
            style={{
              backgroundColor: colors.lightBg,
              borderColor: colors.border,
              borderWidth: "1px",
              borderStyle: "solid",
            }}
            className="px-4 py-2 rounded-lg text-right"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Sentiment Index
            </div>
            <div
              style={{ color: colors.text }}
              className="text-base font-bold flex items-center justify-end gap-1.5"
            >
              <span>{synthesis.sentiment_label}</span>
              <span className="text-xs font-mono font-normal opacity-80">
                ({score > 0 ? `+${score}` : score})
              </span>
            </div>
          </div>
        </div>

        {/* Visual Sentiment Meter */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-medium text-slate-400 uppercase tracking-wider">
            <span style={{ color: "#e11d48" }}>Negative (-1.0)</span>
            <span style={{ color: "#64748b" }}>Neutral (0.0)</span>
            <span style={{ color: "#059669" }}>Positive (+1.0)</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-rose-400 via-slate-300 to-emerald-400 opacity-30" />
            <div
              style={{ left: `calc(${meterPercent}% - 4px)`, backgroundColor: colors.bg }}
              className="absolute top-0 bottom-0 w-2 rounded-full ring-2 ring-white transition-all duration-500"
            />
          </div>
          <p className="text-[11px] text-slate-500 text-right">
            {synthesis.sentiment_rationale}
          </p>
        </div>

        {/* Executive Summary */}
        <div className="pt-3 border-t border-slate-100">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Executive Briefing
          </h3>
          <p className="text-xs text-slate-700 leading-relaxed font-normal">
            {synthesis.executive_summary}
          </p>
        </div>
      </div>

      {/* Catalysts vs Risks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Growth Catalysts */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              <h3 className="font-bold text-slate-900 text-sm tracking-tight">Growth Catalysts (Upside)</h3>
            </div>
            <span
              style={{ backgroundColor: "#ecfdf5", color: "#047857", borderColor: "#a7f3d0", borderWidth: "1px", borderStyle: "solid" }}
              className="text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider"
            >
              {synthesis.growth_catalysts.length} Factors
            </span>
          </div>

          <div className="space-y-2.5">
            {synthesis.growth_catalysts.map((cat, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1"
              >
                <div className="flex justify-between items-start gap-2">
                  <h4 className="text-xs font-semibold text-slate-900">{cat.title}</h4>
                  {cat.impact && (
                    <span
                      style={{ backgroundColor: "#047857", color: "#ffffff" }}
                      className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded"
                    >
                      {cat.impact}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{cat.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Downside Risks */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
              <h3 className="font-bold text-slate-900 text-sm tracking-tight">Risk Factors (Vulnerabilities)</h3>
            </div>
            <span
              style={{ backgroundColor: "#fff1f2", color: "#be123c", borderColor: "#fecdd3", borderWidth: "1px", borderStyle: "solid" }}
              className="text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider"
            >
              {synthesis.key_risks.length} Factors
            </span>
          </div>

          <div className="space-y-2.5">
            {synthesis.key_risks.map((risk, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1"
              >
                <div className="flex justify-between items-start gap-2">
                  <h4 className="text-xs font-semibold text-slate-900">{risk.title}</h4>
                  {risk.severity && (
                    <span
                      style={{ backgroundColor: "#0f172a", color: "#ffffff" }}
                      className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded"
                    >
                      {risk.severity}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{risk.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analyst Consensus & Thesis - Solid High Contrast Dark Box */}
      {synthesis.analyst_verdict && (
        <div
          style={{
            backgroundColor: "#0b0f19",
            color: "#ffffff",
            borderRadius: "14px",
            padding: "24px",
            border: "1px solid #1e293b",
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
          }}
          className="space-y-4"
        >
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <p style={{ color: "#94a3b8", fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Institutional Consensus Verdict
              </p>
              <h3 style={{ color: "#ffffff", fontSize: "18px", fontWeight: "700", letterSpacing: "-0.3px", marginTop: "2px" }}>
                {synthesis.analyst_verdict.rating}
              </h3>
            </div>

            <div className="flex gap-6 text-right">
              <div>
                <p style={{ color: "#94a3b8", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Horizon</p>
                <p style={{ color: "#e2e8f0", fontSize: "12px", fontWeight: "600", marginTop: "2px" }}>{synthesis.analyst_verdict.target_horizon}</p>
              </div>
              <div>
                <p style={{ color: "#94a3b8", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Conviction</p>
                <p style={{ color: "#34d399", fontSize: "12px", fontWeight: "700", marginTop: "2px" }}>{synthesis.analyst_verdict.conviction}</p>
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#111827",
              border: "1px solid #1f2937",
              borderRadius: "10px",
              padding: "16px",
              color: "#cbd5e1",
              fontSize: "12px",
              lineHeight: "1.6",
            }}
          >
            <p style={{ color: "#ffffff", fontWeight: "700", marginBottom: "4px" }}>Investment Thesis:</p>
            {synthesis.analyst_verdict.thesis}
          </div>

          {/* Suggested Prompt Chips */}
          {synthesis.suggested_questions && synthesis.suggested_questions.length > 0 && onAskCopilot && (
            <div style={{ paddingTop: "8px" }}>
              <p style={{ color: "#94a3b8", fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                Inquire with Copilot:
              </p>
              <div className="flex flex-wrap gap-2">
                {synthesis.suggested_questions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => onAskCopilot(q)}
                    style={{
                      backgroundColor: "#1e293b",
                      color: "#e2e8f0",
                      border: "1px solid #334155",
                      fontSize: "11px",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      textAlign: "left",
                      lineHeight: "1.4",
                    }}
                    className="hover:bg-slate-700 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
