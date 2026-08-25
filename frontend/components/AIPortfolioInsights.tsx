"use client";

import React from "react";

export interface SuggestedReplacement {
  ticker: string;
  name: string;
  sharpe: number;
  rationale: string;
  catalyst: string;
}

export interface WeakAssetDiagnostic {
  ticker: string;
  why_underperforming: string;
  suggested_replacements: SuggestedReplacement[];
}

export interface PortfolioInsightsData {
  diversification_score: number;
  diversification_rating: string;
  executive_allocation_summary: string;
  rebalancing_strategy: string;
  sector_concentration_risks: string;
  actionable_recommendations: string[];
  weak_asset_diagnostics?: WeakAssetDiagnostic[];
  powered_by?: string;
}

interface AIPortfolioInsightsProps {
  insights: PortfolioInsightsData;
  loading?: boolean;
  onReplaceStock?: (oldTicker: string, newTicker: string, newName: string) => void;
}

export default function AIPortfolioInsights({
  insights,
  loading,
  onReplaceStock,
}: AIPortfolioInsightsProps) {
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>
          <span>Synthesizing multi-asset portfolio frontier with Google Gemini...</span>
        </div>
      </div>
    );
  }

  const score = insights.diversification_score ?? 75;

  return (
    <div className="space-y-6">
      {/* Main Allocation Intelligence Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
        {/* Header with Diversification Gauge */}
        <div className="flex flex-wrap justify-between items-start gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <h3 className="font-bold text-slate-900 text-base tracking-tight">
                AI Portfolio Allocation Intelligence
              </h3>
              <span
                style={{ backgroundColor: "#0f172a", color: "#ffffff" }}
                className="text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider"
              >
                {insights.powered_by || "Google Gemini"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Institutional synthesis of asset correlation matrix, SLSQP quadratic optimization, and capital compounding.
            </p>
          </div>

          {/* Diversification Score Badge */}
          <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Diversification Index
            </div>
            <div className="text-base font-bold text-slate-900 flex items-center justify-end gap-1.5">
              <span>{insights.diversification_rating}</span>
              <span className="text-xs font-mono font-normal text-slate-500">
                ({score}/100)
              </span>
            </div>
          </div>
        </div>

        {/* Visual Meter */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-medium text-slate-400 uppercase tracking-wider">
            <span>Concentrated (0)</span>
            <span>Balanced (50)</span>
            <span>Optimal Frontier (100)</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden relative">
            <div
              style={{ width: `${Math.min(Math.max(score, 5), 100)}%` }}
              className="h-full bg-slate-900 rounded-full transition-all duration-500"
            />
          </div>
        </div>

        {/* Executive Allocation Critique */}
        <div className="space-y-1.5">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Executive Allocation Review
          </h4>
          <p className="text-xs text-slate-700 leading-relaxed">
            {insights.executive_allocation_summary}
          </p>
        </div>

        {/* 2-Column: Rebalancing Strategy & Sector Risks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
              <h5 className="text-xs font-semibold text-slate-900">Rebalancing Strategy</h5>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {insights.rebalancing_strategy}
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
              <h5 className="text-xs font-semibold text-slate-900">Sector & Concentration Risks</h5>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {insights.sector_concentration_risks}
            </p>
          </div>
        </div>

        {/* Actionable Recommendations List */}
        {insights.actionable_recommendations && insights.actionable_recommendations.length > 0 && (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Quantitative Action Steps
            </h4>
            <div className="space-y-1.5">
              {insights.actionable_recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 🔥 REAL AI ASSET DIAGNOSTICS & REPLACEMENT SUGGESTIONS */}
      {insights.weak_asset_diagnostics && insights.weak_asset_diagnostics.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-600"></span>
              <h3 className="font-bold text-slate-900 text-sm tracking-tight">
                AI Asset Diagnostics & High-Efficiency Replacements
              </h3>
            </div>
            <span className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              Powered by Google Gemini
            </span>
          </div>

          <div className="space-y-4">
            {insights.weak_asset_diagnostics.map((diag, idx) => (
              <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                {/* Diagnostic Banner */}
                <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-lg space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-rose-600 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                      Underperforming: {diag.ticker}
                    </span>
                    <span className="text-xs font-semibold text-rose-900">Drag on Portfolio Sharpe</span>
                  </div>
                  <p className="text-xs text-rose-800 leading-relaxed pt-0.5">
                    {diag.why_underperforming}
                  </p>
                </div>

                {/* Replacement Options Grid */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Recommended High-Efficiency Bluechip Alternatives
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {diag.suggested_replacements.map((rep, rIdx) => (
                      <div
                        key={rIdx}
                        className="p-3.5 border border-slate-200 hover:border-slate-800 rounded-lg bg-slate-50/40 hover:bg-slate-50 transition-all space-y-2 flex flex-col justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-bold text-xs text-slate-900">{rep.name || rep.ticker}</h5>
                              <span className="font-mono text-[10px] text-slate-500">{rep.ticker}</span>
                            </div>
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Sharpe: {rep.sharpe}
                            </span>
                          </div>

                          <p className="text-xs text-slate-700 leading-relaxed pt-1">
                            {rep.rationale}
                          </p>

                          {rep.catalyst && (
                            <p className="text-[11px] text-slate-500">
                              <span className="font-semibold text-slate-700">Growth Catalyst:</span> {rep.catalyst}
                            </p>
                          )}
                        </div>

                        {onReplaceStock && (
                          <div className="pt-2 border-t border-slate-200/60">
                            <button
                              onClick={() => onReplaceStock(diag.ticker, rep.ticker, rep.name || rep.ticker)}
                              className="w-full text-center bg-white border border-slate-300 hover:border-slate-900 hover:bg-slate-900 hover:text-white text-slate-800 font-semibold text-xs py-1.5 rounded transition-all shadow-sm"
                            >
                              Swap {diag.ticker.replace(".NS", "")} with {rep.ticker.replace(".NS", "")}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
