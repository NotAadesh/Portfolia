"use client";

import React from "react";

export interface SimulationInsightsData {
  stress_test_verdict: string;
  tail_risk_analysis: string;
  probability_assessment: string;
  risk_mitigation_plan: string[];
  powered_by?: string;
}

interface AISimulationInsightsProps {
  insights: SimulationInsightsData;
  loading?: boolean;
}

export default function AISimulationInsights({ insights, loading }: AISimulationInsightsProps) {
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>
          <span>Synthesizing stochastic trajectories & tail-risk models with Google Gemini...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <h3 className="font-bold text-slate-900 text-base tracking-tight">
              Stochastic Stress Test & Tail-Risk Intelligence
            </h3>
            <span
              style={{ backgroundColor: "#0f172a", color: "#ffffff" }}
              className="text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider"
            >
              {insights.powered_by || "Google Gemini"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Multivariate risk synthesis across 1,000+ stochastic price trajectories, VaR parameters, and macro shocks.
          </p>
        </div>

        {/* Stress Verdict Pill */}
        <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg text-right">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Stress Test Rating
          </div>
          <div className="text-xs font-bold text-slate-900 mt-0.5">
            {insights.stress_test_verdict}
          </div>
        </div>
      </div>

      {/* 2-Column: Tail Risk & Probability Assessment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tail Risk Analysis */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
            <h4 className="text-xs font-semibold text-slate-900">Tail-Risk Analysis (5th Percentile)</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {insights.tail_risk_analysis}
          </p>
        </div>

        {/* Probability & Feasibility Assessment */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            <h4 className="text-xs font-semibold text-slate-900">Capital Compounding Feasibility</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {insights.probability_assessment}
          </p>
        </div>
      </div>

      {/* Risk Mitigation Plan */}
      {insights.risk_mitigation_plan && insights.risk_mitigation_plan.length > 0 && (
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Risk Mitigation & Drawdown Protection Plan
          </h4>
          <div className="space-y-1.5">
            {insights.risk_mitigation_plan.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                <span className="text-blue-600 font-bold">•</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
