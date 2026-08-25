"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PortfolioCharts from "@/components/PortfolioCharts";
import EfficientFrontier from "@/components/EfficientFrontier";
import AuthTeaserGate from "@/components/AuthTeaserGate";
import AIPortfolioInsights, { PortfolioInsightsData } from "@/components/AIPortfolioInsights";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, API_BASE_URL } from "@/lib/api";

export default function Portfolio() {
  const router = useRouter();
  const { user } = useAuth();

  const [companies, setCompanies] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState<any[]>([]);

  const [selected, setSelected] = useState<any[]>([]);
  const [investment, setInvestment] = useState("100000");
  const [years, setYears] = useState("3");

  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState<PortfolioInsightsData | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Save Modal States
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [portfolioName, setPortfolioName] = useState("");
  const [portfolioNotes, setPortfolioNotes] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/companies`)
      .then((res) => res.json())
      .then((data) => {
        setCompanies(data);
        setFiltered(data.slice(0, 10));
      });
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("portfolio_builder_state");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.selected) setSelected(parsed.selected);
      if (parsed.investment) setInvestment(parsed.investment);
      if (parsed.years) setYears(parsed.years);
      if (parsed.result) setResult(parsed.result);
      if (parsed.aiInsights) setAiInsights(parsed.aiInsights);
    }
  }, []);

  const handleSearch = (value: string) => {
    setQuery(value);
    const results = companies
      .filter((c) => c.name.toLowerCase().includes(value.toLowerCase()))
      .slice(0, 10);
    setFiltered(results);
  };

  const addCompany = (company: any) => {
    if (selected.find((c) => c.ticker === company.ticker)) return;
    setSelected([...selected, company]);
    setQuery("");
    setFiltered([]);
  };

  const removeCompany = (ticker: string) => {
    setSelected(selected.filter((c) => c.ticker !== ticker));
  };

  const handleReplaceStock = (oldTicker: string, newTicker: string, newName: string) => {
    const updated = selected.map((s) => (s.ticker === oldTicker ? { ticker: newTicker, name: newName } : s));
    setSelected(updated);
    setTimeout(() => {
      analyzePortfolio(updated);
    }, 100);
  };

  const analyzePortfolio = async (customSelected?: any[]) => {
    const basketToUse = customSelected || selected;
    if (basketToUse.length === 0) {
      alert("Please select at least one company");
      return;
    }
    setLoading(true);
    setAiLoading(true);
    setResult(null);
    setAiInsights(null);

    try {
      const res = await fetch(`${API_BASE_URL}/portfolio-analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tickers: basketToUse.map((c) => c.ticker),
          investment: Number(investment) || 100000,
          years: Number(years) || 3,
        }),
      });

      const data = await res.json();
      setResult(data);
      setLoading(false);

      // Fetch Gemini AI portfolio intelligence & diagnostics
      try {
        const aiRes = await apiFetch<PortfolioInsightsData>("/api/v1/ai/portfolio-insights", {
          method: "POST",
          body: JSON.stringify({
            tickers: basketToUse.map((c) => c.ticker),
            optimal_weights: data.optimal_weights,
            expected_return: data.expected_return,
            volatility: data.volatility,
            sharpe_ratio: data.sharpe_ratio,
            weak_stocks: data.weak_stocks,
            years: Number(years) || 3,
            investment: Number(investment) || 100000,
          }),
        });
        setAiInsights(aiRes);

        localStorage.setItem(
          "portfolio_builder_state",
          JSON.stringify({
            selected: basketToUse,
            investment,
            years,
            result: data,
            aiInsights: aiRes,
          })
        );
      } catch (aiErr) {
        console.error("AI Portfolio insights failed:", aiErr);
      } finally {
        setAiLoading(false);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      setAiLoading(false);
    }
  };

  const handleOpenSaveModal = () => {
    if (!user) {
      if (confirm("You need to sign in to save your portfolios to the cloud. Go to login?")) {
        router.push("/login");
      }
      return;
    }
    setPortfolioName(`Portfolio (${selected.map((s) => s.ticker.replace(".NS", "")).join(", ")})`);
    setShowSaveModal(true);
    setSaveSuccess(false);
  };

  const handleSaveToCloud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portfolioName) return;

    setSaveLoading(true);
    try {
      const assets = Object.entries(result.optimal_weights).map(([ticker, weight]: any) => ({
        ticker,
        weight: Number(weight) / 100,
        allocation_amount: (Number(investment) * Number(weight)) / 100,
      }));

      await apiFetch("/api/v1/portfolios", {
        method: "POST",
        body: JSON.stringify({
          name: portfolioName,
          initial_investment: Number(investment),
          horizon_years: Number(years),
          expected_return: result.expected_return,
          volatility: result.volatility,
          sharpe_ratio: result.sharpe_ratio,
          notes: portfolioNotes,
          assets,
        }),
      });

      setSaveSuccess(true);
    } catch (err: any) {
      alert(err.message || "Failed to save portfolio to cloud");
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <AuthTeaserGate
      title="Portfolio Maker & Asset Allocator"
      subtitle="Markowitz Modern Portfolio Theory (MPT) asset allocation, SLSQP numerical optimization, and cloud portfolio storage."
      features={[
        "Markowitz Efficient Frontier & Tangency Allocation",
        "Weak asset detection & AI replacement suggestions",
        "Cloud-synced portfolio saving & multi-device tracking",
        "Direct export to Monte Carlo Simulation engine",
      ]}
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header with Guide Toggle */}
        <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Portfolio Maker & Optimizer</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Markowitz Modern Portfolio Theory (MPT) asset allocation with SLSQP optimization
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="text-xs bg-slate-100 border border-slate-200 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-200 font-semibold transition-colors flex items-center gap-1.5"
            >
              <span>{showGuide ? "Hide Guide" : "📖 How to Use Portfolio Maker"}</span>
            </button>

            {user && (
              <Link
                href="/my-portfolios"
                className="text-xs bg-slate-900 text-white px-3.5 py-2 rounded-lg hover:bg-slate-800 font-medium transition-colors"
              >
                Saved Portfolios
              </Link>
            )}
          </div>
        </div>

        {/* Beginner Guide Card (Collapsible) */}
        {showGuide && (
          <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800 shadow-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Beginner Guide: How to Build & Optimize Your Portfolio
              </h3>
              <button
                onClick={() => setShowGuide(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 text-xs leading-relaxed text-slate-300">
              <div className="p-3.5 bg-slate-800/80 rounded-lg border border-slate-700 space-y-1">
                <p className="font-bold text-emerald-400">1. Markowitz Theory (MPT)</p>
                <p>
                  Holding multiple stocks with low correlation reduces total portfolio risk without sacrificing returns (known as the &ldquo;free lunch&rdquo; of finance).
                </p>
              </div>

              <div className="p-3.5 bg-slate-800/80 rounded-lg border border-slate-700 space-y-1">
                <p className="font-bold text-blue-400">2. What is Sharpe Ratio?</p>
                <p>
                  Measures <strong>return earned per unit of risk</strong> (volatility). A Sharpe &gt; 1.0 means high compounding efficiency; &lt; 0.5 means excess risk for low returns.
                </p>
              </div>

              <div className="p-3.5 bg-slate-800/80 rounded-lg border border-slate-700 space-y-1">
                <p className="font-bold text-indigo-400">3. SLSQP Optimal Weights</p>
                <p>
                  Instead of equal 25% splits, our mathematical solver shifts capital toward high-Sharpe assets to maximize risk-adjusted compounding.
                </p>
              </div>

              <div className="p-3.5 bg-slate-800/80 rounded-lg border border-slate-700 space-y-1">
                <p className="font-bold text-purple-400">4. The Efficient Frontier</p>
                <p>
                  The parabolic curve plotting maximum possible returns for every unit of volatility. The tangency point marks your optimal allocation.
                </p>
              </div>

              <div className="p-3.5 bg-slate-800/80 rounded-lg border border-slate-700 space-y-1">
                <p className="font-bold text-amber-400">5. AI Diagnostics & Swaps</p>
                <p>
                  Google Gemini detects underperforming laggards in your basket and lets you 1-click swap them for higher-efficiency alternatives.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Search & Selection */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Search Indian Companies (NSE)</label>
            <div className="relative w-full max-w-md">
              <input
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search company (e.g. Reliance, TCS, HDFC)..."
                className="border border-slate-200 px-3.5 py-2 rounded-lg w-full outline-none focus:border-slate-800 text-xs"
              />

              {query && (
                <div className="absolute bg-white border border-slate-200 mt-1 w-full max-h-48 overflow-y-auto rounded-lg shadow-lg z-50 divide-y divide-slate-100">
                  {filtered.map((c, idx) => (
                    <div
                      key={idx}
                      onClick={() => addCompany(c)}
                      className="flex justify-between px-3.5 py-2 hover:bg-slate-50 cursor-pointer text-xs"
                    >
                      <span className="font-medium text-slate-900">{c.name}</span>
                      <span className="text-blue-600 font-bold">+</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Selected Companies Tags */}
          <div>
            <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Selected Basket ({selected.length} assets)
            </h2>

            {selected.length === 0 ? (
              <p className="text-xs text-slate-400">No assets selected yet. Search above to add stocks.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selected.map((c) => (
                  <div
                    key={c.ticker}
                    className="bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm"
                  >
                    <span>{c.name}</span>
                    <button
                      onClick={() => removeCompany(c.ticker)}
                      className="text-slate-400 hover:text-white font-bold ml-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Capital & Horizon Inputs */}
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Investment Capital (₹)</label>
              <input
                type="number"
                placeholder="100000"
                value={investment}
                onChange={(e) => setInvestment(e.target.value)}
                className="border border-slate-200 px-3.5 py-2 rounded-lg w-full outline-none focus:border-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Time Horizon (Years)</label>
              <input
                type="number"
                placeholder="3"
                value={years}
                onChange={(e) => setYears(e.target.value)}
                className="border border-slate-200 px-3.5 py-2 rounded-lg w-full outline-none focus:border-slate-800 text-xs"
              />
            </div>
          </div>

          <button
            onClick={() => analyzePortfolio()}
            disabled={loading || selected.length === 0}
            className="bg-slate-900 text-white text-xs font-semibold px-6 py-2.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {loading ? "Optimizing Portfolio..." : "Optimize & Analyze Portfolio"}
          </button>
        </div>

        {/* RESULTS */}
        {result && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expected Return</p>
                <h2 className="text-2xl font-bold text-emerald-600 mt-1">+{result.expected_return}%</h2>
                <p className="text-[10px] text-slate-400 mt-1">Annualized return</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Volatility (Risk)</p>
                <h2 className="text-2xl font-bold text-yellow-600 mt-1">{result.volatility}%</h2>
                <p className="text-[10px] text-slate-400 mt-1">Annualized std dev</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sharpe Ratio</p>
                <h2 className="text-2xl font-bold text-blue-600 mt-1">{result.sharpe_ratio}</h2>
                <p className="text-[10px] text-slate-400 mt-1">Risk-adjusted efficiency</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Future Value</p>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">
                  ₹{Number(result.future_value).toLocaleString()}
                </h2>
                <p className="text-[10px] text-slate-400 mt-1">In {years} years</p>
              </div>
            </div>

            {/* 🔥 PHASE 6: GEMINI AI PORTFOLIO ALLOCATION INTELLIGENCE & REAL ASSET DIAGNOSTICS */}
            {(aiInsights || aiLoading) && (
              <AIPortfolioInsights
                insights={aiInsights || ({} as any)}
                loading={aiLoading}
                onReplaceStock={handleReplaceStock}
              />
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <div>
                <p className="font-semibold text-slate-900 text-xs uppercase tracking-wider">Portfolio Actions</p>
                <p className="text-slate-600 text-xs mt-0.5">Persist this asset allocation to your account or run stress testing.</p>
              </div>

              <div className="flex gap-2.5">
                <button
                  onClick={handleOpenSaveModal}
                  className="bg-white text-slate-800 border border-slate-300 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Save Portfolio
                </button>

                <button
                  onClick={() => {
                    localStorage.setItem(
                      "portfolio_data",
                      JSON.stringify({
                        tickers: selected.map((c) => c.ticker),
                        weights: Object.values(result.optimal_weights).map((w: any) => w / 100),
                        investment: Number(investment),
                        years: Number(years),
                        expected_return: result.expected_return,
                        volatility: result.volatility,
                      })
                    );
                    router.push("/simulation");
                  }}
                  className="bg-slate-900 text-white px-5 py-2 rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
                >
                  Run Monte Carlo Simulation
                </button>
              </div>
            </div>

            {/* Allocation & Risk Charts */}
            <PortfolioCharts result={result} />

            {/* Efficient Frontier Chart */}
            {result?.efficient_frontier && (
              <EfficientFrontier
                data={result.efficient_frontier}
                portfolio={result}
              />
            )}

            {/* Weights Tables */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-semibold text-xs text-slate-700 uppercase tracking-wider mb-3">Equal Allocation (Baseline)</h3>
                <div className="divide-y divide-slate-100 text-xs">
                  {Object.entries(result.weights).map(([k, v]: any) => (
                    <div key={k} className="py-2 flex justify-between">
                      <span className="font-mono text-slate-600">{k}</span>
                      <span className="font-medium text-slate-800">{v}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-semibold text-xs text-slate-700 uppercase tracking-wider mb-3">Optimal Allocation (Markowitz SLSQP)</h3>
                <div className="divide-y divide-slate-100 text-xs">
                  {Object.entries(result.optimal_weights).map(([k, v]: any) => (
                    <div key={k} className="py-2 flex justify-between">
                      <span className="font-mono text-slate-900 font-semibold">{k}</span>
                      <span className="font-bold text-blue-600">{v}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SAVE PORTFOLIO MODAL */}
        {showSaveModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-base font-bold text-slate-900">Save Portfolio to Cloud</h2>
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {saveSuccess ? (
                <div className="text-center py-6 space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm">Portfolio Saved Successfully</h3>
                  <p className="text-xs text-slate-500">
                    Your portfolio is now stored in your account and accessible from any device.
                  </p>
                  <div className="flex gap-2 justify-center pt-2">
                    <Link
                      href="/my-portfolios"
                      className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800"
                    >
                      View in Saved Portfolios
                    </Link>
                    <button
                      onClick={() => setShowSaveModal(false)}
                      className="px-4 py-2 border border-slate-200 text-xs font-medium rounded-lg hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveToCloud} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Portfolio Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={portfolioName}
                      onChange={(e) => setPortfolioName(e.target.value)}
                      placeholder="e.g. Bluechip Growth Basket"
                      className="w-full border border-slate-200 px-3.5 py-2 rounded-lg text-xs outline-none focus:border-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Notes / Strategy (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={portfolioNotes}
                      onChange={(e) => setPortfolioNotes(e.target.value)}
                      placeholder="e.g. Optimized for 3-year compound growth"
                      className="w-full border border-slate-200 px-3.5 py-2 rounded-lg text-xs outline-none focus:border-slate-800 resize-none"
                    />
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1 text-slate-600">
                    <div className="flex justify-between">
                      <span>Initial Capital:</span>
                      <span className="font-semibold text-slate-900">₹{Number(investment).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Expected Return:</span>
                      <span className="font-semibold text-emerald-600">+{result.expected_return}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Holdings:</span>
                      <span className="font-semibold text-slate-900">{selected.length} stocks</span>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setShowSaveModal(false)}
                      className="px-4 py-2 border border-slate-200 text-xs font-medium rounded-lg hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saveLoading}
                      className="px-5 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50"
                    >
                      {saveLoading ? "Saving..." : "Save Portfolio"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </AuthTeaserGate>
  );
}