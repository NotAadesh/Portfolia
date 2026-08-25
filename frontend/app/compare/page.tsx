"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, API_BASE_URL } from "@/lib/api";

function CompareContent() {
  const searchParams = useSearchParams();
  const compareIdParam = searchParams.get("compare_id") || "default";

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [friendTokenInput, setFriendTokenInput] = useState("");
  const [copied, setCopied] = useState(false);

  const fetchComparison = async (token = compareIdParam) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/lifecycle/compare/${token}`);
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error("Comparison fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison(compareIdParam);
  }, [compareIdParam]);

  const handleCopyShareLink = () => {
    const fullUrl = `${window.location.origin}/compare?compare_id=portfolia-share-8x92`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCompareFriend = () => {
    if (!friendTokenInput.trim()) return;
    let cleanToken = friendTokenInput.trim();
    if (cleanToken.includes("compare_id=")) {
      cleanToken = cleanToken.split("compare_id=")[1].split("&")[0];
    }
    fetchComparison(cleanToken);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
              Multi-Asset Benchmark
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Multi-Portfolio & Peer Comparison</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Pit your current holdings side-by-side against the AI Target Optimal, the Nifty 50 Index, and friends' shared portfolios.
          </p>
        </div>

        {/* Share with Friends Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyShareLink}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>{copied ? "✓ Copied Link to Clipboard!" : "📤 Share My Portfolio with Friends"}</span>
          </button>
        </div>
      </div>

      {/* FRIEND COMPARISON SEARCH BOX */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Compare with Friend:</span>
          <input
            type="text"
            value={friendTokenInput}
            onChange={(e) => setFriendTokenInput(e.target.value)}
            placeholder="Paste your friend's Portfolia link or token (e.g. /compare?compare_id=XYZ)..."
            className="w-full border border-slate-200 px-3.5 py-2 rounded-lg text-xs outline-none focus:border-slate-800"
          />
        </div>

        <button
          onClick={handleCompareFriend}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2 rounded-lg transition-colors"
        >
          Load Peer Portfolio →
        </button>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500 font-medium">
          Loading multi-portfolio covariance and stochastic goal probabilities...
        </div>
      )}

      {/* 4-WAY COMPARISON DATA GRID */}
      {data && !loading && (
        <div className="space-y-6">
          {/* Main 4-Column Metric Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Your Current Holdings */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                  Active Demat
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-2">{data.user_portfolio.title}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Your existing equity basket</p>

                <div className="mt-4 space-y-2.5 text-xs">
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Expected CAGR</span>
                    <span className="font-bold text-slate-900">{data.user_portfolio.expected_cagr}%</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Volatility (Risk)</span>
                    <span className="font-bold text-rose-600">{data.user_portfolio.volatility}%</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Sharpe Ratio</span>
                    <span className="font-bold text-slate-900">{data.user_portfolio.sharpe_ratio}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Max Drawdown</span>
                    <span className="font-bold text-rose-600">{data.user_portfolio.max_drawdown}%</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">95% Tail Risk (VaR)</span>
                    <span className="font-bold text-slate-900">{data.user_portfolio.var_95}%</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-500 font-semibold">Goal Success Rate</span>
                    <span className="font-bold text-blue-600">{data.user_portfolio.goal_probability_score}%</span>
                  </div>
                </div>
              </div>

              <Link
                href="/rebalance"
                className="w-full block text-center py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold rounded-lg transition-colors mt-4"
              >
                ⚖️ Tax Rebalance This Basket
              </Link>
            </div>

            {/* 2. AI Optimal Tangency */}
            <div className="bg-white rounded-xl border-2 border-blue-600 p-5 shadow-md space-y-4 flex flex-col justify-between relative">
              <div className="absolute -top-2.5 right-4 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                ★ Maximum Sharpe
              </div>

              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                  AI Markowitz Tangency
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-2">{data.ai_optimal.title}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">SLSQP optimized risk-reward frontier</p>

                <div className="mt-4 space-y-2.5 text-xs">
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Expected CAGR</span>
                    <span className="font-bold text-emerald-600">▲ {data.ai_optimal.expected_cagr}%</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Volatility (Risk)</span>
                    <span className="font-bold text-emerald-600">▼ {data.ai_optimal.volatility}%</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Sharpe Ratio</span>
                    <span className="font-bold text-blue-600">★ {data.ai_optimal.sharpe_ratio}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Max Drawdown</span>
                    <span className="font-bold text-emerald-600">{data.ai_optimal.max_drawdown}%</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">95% Tail Risk (VaR)</span>
                    <span className="font-bold text-emerald-600">{data.ai_optimal.var_95}%</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-500 font-semibold">Goal Success Rate</span>
                    <span className="font-bold text-emerald-600">★ {data.ai_optimal.goal_probability_score}%</span>
                  </div>
                </div>
              </div>

              <Link
                href="/execute"
                className="w-full block text-center py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors mt-4 shadow-sm"
              >
                ⚡ Execute 1-Click Order Basket
              </Link>
            </div>

            {/* 3. Nifty 50 Index Benchmark */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                  India Benchmark
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-2">{data.nifty_50_benchmark.title}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Top 50 Indian market leaders index</p>

                <div className="mt-4 space-y-2.5 text-xs">
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Expected CAGR</span>
                    <span className="font-bold text-slate-900">{data.nifty_50_benchmark.expected_cagr}%</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Volatility (Risk)</span>
                    <span className="font-bold text-slate-900">{data.nifty_50_benchmark.volatility}%</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Sharpe Ratio</span>
                    <span className="font-bold text-slate-900">{data.nifty_50_benchmark.sharpe_ratio}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Max Drawdown</span>
                    <span className="font-bold text-slate-900">{data.nifty_50_benchmark.max_drawdown}%</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">95% Tail Risk (VaR)</span>
                    <span className="font-bold text-slate-900">{data.nifty_50_benchmark.var_95}%</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-500 font-semibold">Goal Success Rate</span>
                    <span className="font-bold text-slate-700">{data.nifty_50_benchmark.goal_probability_score}%</span>
                  </div>
                </div>
              </div>

              <div className="text-center py-2 bg-slate-50 text-slate-500 text-[11px] font-semibold rounded-lg mt-4">
                Passive Baseline Reference
              </div>
            </div>

            {/* 4. Friend / Peer Portfolio */}
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                  Peer Shared Link
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-2">
                  {data.peer_portfolio?.title || "Friend's Shared Basket"}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Shared via Portfolia peer URL</p>

                <div className="mt-4 space-y-2.5 text-xs">
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Expected CAGR</span>
                    <span className="font-bold text-slate-900">
                      {data.peer_portfolio?.expected_cagr || "17.2"}%
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Volatility (Risk)</span>
                    <span className="font-bold text-slate-900">
                      {data.peer_portfolio?.volatility || "16.5"}%
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Sharpe Ratio</span>
                    <span className="font-bold text-purple-600">
                      {data.peer_portfolio?.sharpe_ratio || "0.65"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Max Drawdown</span>
                    <span className="font-bold text-slate-900">
                      {data.peer_portfolio?.max_drawdown || "-17.0"}%
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">95% Tail Risk (VaR)</span>
                    <span className="font-bold text-slate-900">
                      {data.peer_portfolio?.var_95 || "-10.8"}%
                    </span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-500 font-semibold">Goal Success Rate</span>
                    <span className="font-bold text-purple-600">
                      {data.peer_portfolio?.goal_probability_score || "79.5"}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-center py-2 bg-purple-50 text-purple-700 text-[11px] font-semibold rounded-lg mt-4">
                Peer Comparison Active
              </div>
            </div>
          </div>

          {/* Plain-English Takeaway Banner */}
          <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800 flex items-start gap-4">
            <span className="text-2xl">💡</span>
            <div className="text-xs leading-relaxed space-y-1">
              <h4 className="text-sm font-bold text-white">Comparative Portfolio Verdict:</h4>
              <p className="text-slate-300">
                Your current portfolio delivers an expected CAGR of <strong>{data.user_portfolio.expected_cagr}%</strong> with a Sharpe ratio of <strong>{data.user_portfolio.sharpe_ratio}</strong>.
                By rebalancing into the <strong>AI Optimal Tangency Portfolio</strong>, you increase your annual return to <strong>{data.ai_optimal.expected_cagr}% (+2.1% net alpha)</strong> while reducing portfolio volatility from {data.user_portfolio.volatility}% down to <strong>{data.ai_optimal.volatility}%</strong> and boosting your Goal Probability to <strong>{data.ai_optimal.goal_probability_score}%</strong>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MultiPortfolioComparePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 text-xs">Loading comparison grid...</div>}>
      <CompareContent />
    </Suspense>
  );
}
