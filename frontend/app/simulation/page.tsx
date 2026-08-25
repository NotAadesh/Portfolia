"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import MonteCarloCharts from "@/components/MonteCarloCharts";
import AuthTeaserGate from "@/components/AuthTeaserGate";
import AISimulationInsights, { SimulationInsightsData } from "@/components/AISimulationInsights";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, API_BASE_URL } from "@/lib/api";

export default function Simulation() {
  const { user } = useAuth();

  const [amount, setAmount] = useState(100000);
  const [years, setYears] = useState(3);
  const [rebalance, setRebalance] = useState("None");

  const [data, setData] = useState<any>(null);
  const [compareData, setCompareData] = useState<any>(null);
  const [compareMode, setCompareMode] = useState(false);

  const [loading, setLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState<SimulationInsightsData | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState("");

  const [tickers, setTickers] = useState<string[]>(["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS"]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [expReturn, setExpReturn] = useState(15);
  const [volatility, setVolatility] = useState(18);
  const [simulations, setSimulations] = useState(600);
  const [weights, setWeights] = useState<number[] | null>(null);
  const [backtest, setBacktest] = useState<any>(null);

  // Guide accordion state
  const [showGuide, setShowGuide] = useState(false);

  // Preset starter baskets
  const starterBaskets = [
    {
      name: "Nifty 50 Core Leaders",
      tickers: ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS"],
      desc: "Balanced large-cap Indian bluechips",
    },
    {
      name: "Defensive Compounders",
      tickers: ["HINDUNILVR.NS", "ITC.NS", "SUNPHARMA.NS"],
      desc: "Low-volatility consumer & pharma compounders",
    },
    {
      name: "High Growth & Infra",
      tickers: ["TATAMOTORS.NS", "LT.NS", "ICICIBANK.NS", "SBIN.NS"],
      desc: "Capex & manufacturing expansion leaders",
    },
  ];

  // Fetch companies
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/companies`);
        const data = await res.json();
        setCompanies(data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchCompanies();
  }, []);

  // Load from portfolio builder if available
  useEffect(() => {
    const stored = localStorage.getItem("portfolio_data");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.tickers && parsed.tickers.length > 0) setTickers(parsed.tickers);
      if (parsed.investment) setAmount(parsed.investment);
      if (parsed.years) setYears(parsed.years);
      if (parsed.expected_return) setExpReturn(parsed.expected_return);
      if (parsed.volatility) setVolatility(parsed.volatility);
      if (parsed.weights) setWeights(parsed.weights);

      setTimeout(() => {
        runSimulation(parsed.tickers || ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS"]);
      }, 500);
    } else {
      // Auto run first simulation with default basket
      setTimeout(() => {
        runSimulation(["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS"]);
      }, 400);
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Run simulation
  const runSimulation = async (customTickers?: string[]) => {
    setLoading(true);
    setAiLoading(true);
    setError("");

    const tickersToUse = customTickers || tickers;
    if (tickersToUse.length === 0) {
      setError("Please select at least one stock to simulate");
      setLoading(false);
      setAiLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/monte-carlo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tickers: tickersToUse,
          years,
          investment: amount,
          expected_return: expReturn,
          volatility: volatility,
          simulations: simulations,
          weights: weights,
        }),
      });

      const result = await res.json();

      if (result.error) {
        setError(result.error);
        setLoading(false);
        setAiLoading(false);
        return;
      }

      if (compareMode && data) {
        setCompareData(result);
      } else {
        setData(result);
        setCompareData(null);
      }
      setLoading(false);

      // Run backtest in parallel
      const backtestRes = await runBacktest(tickersToUse);

      // Fetch Gemini Stochastic Intelligence
      try {
        const aiRes = await apiFetch<SimulationInsightsData>("/api/v1/ai/simulation-insights", {
          method: "POST",
          body: JSON.stringify({
            tickers: tickersToUse,
            investment: Number(amount) || 100000,
            years: Number(years) || 3,
            expected_value: result.expected_value,
            best_case: result.best_case,
            worst_case: result.worst_case,
            probability_of_loss: result.probability_of_loss,
            max_drawdown: result.max_drawdown,
            target_probability: result.target_probability,
            backtest: backtestRes || backtest,
          }),
        });
        setAiInsights(aiRes);
      } catch (aiErr) {
        console.error("AI simulation insights failed:", aiErr);
      } finally {
        setAiLoading(false);
      }

    } catch (err) {
      console.error(err);
      setError("Failed to run simulation");
      setLoading(false);
      setAiLoading(false);
    }
  };

  const runBacktest = async (customTickers?: string[]) => {
    const tickersToUse = customTickers || tickers;
    try {
      const res = await fetch(`${API_BASE_URL}/backtest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tickers: tickersToUse,
          years,
          investment: amount,
          weights: weights,
        }),
      });

      const result = await res.json();
      setBacktest(result);
      return result;
    } catch {
      console.log("Backtest failed");
      return null;
    }
  };

  const applyStarterBasket = (basket: typeof starterBaskets[0]) => {
    setTickers(basket.tickers);
    runSimulation(basket.tickers);
  };

  return (
    <AuthTeaserGate
      title="Monte Carlo Simulation & Stress Testing"
      subtitle="Multivariate stochastic asset simulation, dynamic path forecasting, 95% value-at-risk (VaR), and historical backtesting."
      features={[
        "1,000+ stochastic price trajectories & confidence bands",
        "Market crash (-10% / +40% vol) and bull run scenario modeling",
        "Probability of portfolio loss calculation (VaR)",
        "Historical CAGR and Max Drawdown backtesting engine",
      ]}
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* 🗺️ COHESIVE 4-STAGE LIFECYCLE WORKFLOW STEPPER */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
            <Link
              href="/onboarding"
              className="p-3 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all flex flex-col justify-between"
            >
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold uppercase text-slate-400">Step 1</span>
                <span className="text-[10px] text-blue-600 font-semibold">Change Goal</span>
              </div>
              <span className="font-bold text-slate-800 mt-1">🎯 Goal & Demat Basket</span>
            </Link>

            <Link
              href="/portfolio"
              className="p-3 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all flex flex-col justify-between"
            >
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold uppercase text-slate-400">Step 2</span>
                <span className="text-[10px] text-blue-600 font-semibold">Adjust Weights</span>
              </div>
              <span className="font-bold text-slate-800 mt-1">📊 Markowitz MPT Optimizer</span>
            </Link>

            <div className="p-3 rounded-lg bg-slate-900 text-white shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold uppercase text-blue-400">Step 3 • Active Hub</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <span className="font-bold text-white mt-1">🎲 Monte Carlo Stress Test</span>
            </div>

            <Link
              href="/rebalance"
              className="p-3 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all flex flex-col justify-between"
            >
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold uppercase text-slate-400">Step 4</span>
                <span className="text-[10px] text-slate-500 font-medium">Final Stage</span>
              </div>
              <span className="font-bold text-slate-800 mt-1">⚖️ Tax Rebalance & Orders</span>
            </Link>
          </div>
        </div>

        {/* Header with Beginner Guide Toggle */}
        <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Monte Carlo Simulation & Risk Engine</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Stochastic multivariate forecasting and 95% Value-at-Risk envelope modeling
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/compare"
              className="text-xs bg-slate-100 border border-slate-200 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-200 font-semibold transition-colors"
            >
              👥 Compare with Peers
            </Link>

            <button
              onClick={() => setShowGuide(!showGuide)}
              className="text-xs bg-slate-100 border border-slate-200 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-200 font-semibold transition-colors flex items-center gap-1.5"
            >
              <span>{showGuide ? "Hide Beginner Guide" : "📖 How to Read This Simulation"}</span>
            </button>
          </div>
        </div>

        {/* Beginner Guide Card (Collapsible) */}
        {showGuide && (
          <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800 shadow-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Beginner Guide: Understanding Monte Carlo Modeling
              </h3>
              <button
                onClick={() => setShowGuide(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs leading-relaxed text-slate-300">
              <div className="p-3.5 bg-slate-800/80 rounded-lg border border-slate-700 space-y-1">
                <p className="font-bold text-emerald-400">1. What are the Trajectories?</p>
                <p>
                  Instead of guessing a single future price, Monte Carlo runs <strong>600+ realistic simulated market paths</strong> incorporating asset correlations, daily volatility, and mean returns.
                </p>
              </div>

              <div className="p-3.5 bg-slate-800/80 rounded-lg border border-slate-700 space-y-1">
                <p className="font-bold text-blue-400">2. What is the 5th Percentile (Tail Risk)?</p>
                <p>
                  In <strong>95 out of 100 market conditions</strong>, your capital will perform better than this number. It models how your basket survives severe bear markets and macro recessions.
                </p>
              </div>

              <div className="p-3.5 bg-slate-800/80 rounded-lg border border-slate-700 space-y-1">
                <p className="font-bold text-amber-400">3. Probability of Loss (VaR)</p>
                <p>
                  The exact percentage of simulated paths that ended up below your starting capital. Lower is safer; long horizons and rebalancing reduce this risk.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ONE-CLICK STARTER BASKETS FOR QUICK EXPLORATION */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Quick One-Click Starter Portfolios
            </h2>
            <span className="text-[10px] text-slate-400">Click to instantly simulate</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {starterBaskets.map((b, idx) => (
              <div
                key={idx}
                onClick={() => applyStarterBasket(b)}
                className="p-3.5 border border-slate-200 hover:border-slate-800 rounded-lg cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-all space-y-1"
              >
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-900">{b.name}</h4>
                  <span className="text-blue-600 text-xs font-bold">Simulate →</span>
                </div>
                <p className="text-[11px] text-slate-500">{b.desc}</p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {b.tickers.map((t) => (
                    <span key={t} className="text-[10px] font-mono bg-white border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                      {t.replace(".NS", "")}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CUSTOM BASKET SELECTION */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Active Portfolio Basket</h2>

          <div className="relative w-full max-w-md" ref={dropdownRef}>
            <input
              type="text"
              placeholder="Search company to add (e.g. Reliance, TCS)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-slate-200 px-3.5 py-2 rounded-lg text-xs outline-none focus:border-slate-800"
            />

            {search && (
              <div className="absolute w-full bg-white border border-slate-200 mt-1 rounded-lg max-h-40 overflow-y-auto z-10 shadow-lg divide-y divide-slate-100">
                {companies
                  .filter((c) =>
                    c.name.toLowerCase().includes(search.toLowerCase())
                  )
                  .slice(0, 8)
                  .map((c, idx) => (
                    <div
                      key={idx}
                      className="px-3.5 py-2 hover:bg-slate-50 cursor-pointer text-xs flex justify-between"
                      onClick={() => {
                        if (!tickers.includes(c.ticker)) {
                          setTickers([...tickers, c.ticker]);
                        }
                        setSearch("");
                      }}
                    >
                      <span className="font-medium text-slate-900">{c.name}</span>
                      <span className="font-mono text-slate-400">{c.ticker}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {tickers.length === 0 ? (
              <p className="text-xs text-slate-400">No stocks selected. Search above or pick a starter basket.</p>
            ) : (
              tickers.map((t, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm"
                >
                  <span className="font-mono">{t}</span>
                  <button
                    onClick={() =>
                      setTickers(tickers.filter((x) => x !== t))
                    }
                    className="text-slate-400 hover:text-white font-bold ml-1"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CONTROLS */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Simulation Parameters & Stress Presets</h2>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Investment Capital (₹)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full border border-slate-200 px-3.5 py-2 rounded-lg text-xs outline-none focus:border-slate-800"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Time Horizon (Years)</label>
              <input
                type="number"
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
                className="w-full border border-slate-200 px-3.5 py-2 rounded-lg text-xs outline-none focus:border-slate-800"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Rebalancing Frequency</label>
              <select
                value={rebalance}
                onChange={(e) => setRebalance(e.target.value)}
                className="w-full border border-slate-200 px-3.5 py-2 rounded-lg text-xs outline-none focus:border-slate-800 bg-white"
              >
                <option>None (Buy & Hold)</option>
                <option>Monthly</option>
                <option>Quarterly</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Expected Return (%)</label>
              <input
                type="number"
                value={expReturn}
                onChange={(e) => setExpReturn(Number(e.target.value))}
                className="w-full border border-slate-200 px-3.5 py-2 rounded-lg text-xs outline-none focus:border-slate-800"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Volatility (%)</label>
              <input
                type="number"
                value={volatility}
                onChange={(e) => setVolatility(Number(e.target.value))}
                className="w-full border border-slate-200 px-3.5 py-2 rounded-lg text-xs outline-none focus:border-slate-800"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Iterations</label>
              <input
                type="number"
                value={simulations}
                onChange={(e) => setSimulations(Number(e.target.value))}
                className="w-full border border-slate-200 px-3.5 py-2 rounded-lg text-xs outline-none focus:border-slate-800"
              />
            </div>
          </div>

          {/* SCENARIOS */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs font-medium text-slate-400 mr-1">Stress Presets:</span>
            <button
              onClick={() => {
                setExpReturn(-10);
                setVolatility(40);
              }}
              className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold hover:bg-rose-100 transition-colors"
            >
              Market Crash (-10% Ret, 40% Vol)
            </button>

            <button
              onClick={() => {
                setExpReturn(22);
                setVolatility(16);
              }}
              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors"
            >
              Bull Run (+22% Ret, 16% Vol)
            </button>

            <button
              onClick={() => {
                setVolatility(35);
              }}
              className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold hover:bg-amber-100 transition-colors"
            >
              High Volatility (35% Vol)
            </button>
          </div>

          <div className="flex gap-3 pt-3 border-t border-slate-100">
            <button
              onClick={() => runSimulation()}
              disabled={loading || tickers.length === 0}
              className="bg-slate-900 text-white px-6 py-2.5 rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {loading ? "Simulating Stochastic Trajectories..." : "Run Stochastic Simulation"}
            </button>

            <button
              onClick={() => setCompareMode(!compareMode)}
              className="border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
            >
              {compareMode ? "Disable Comparison" : "Compare Scenarios"}
            </button>
          </div>
        </div>

        {/* STATUS */}
        {error && <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-200">{error}</p>}

        {/* RESULTS */}
        {data && (
          <div className="space-y-6">
            {/* Plain-English Investor Takeaway Banner */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-start gap-3">
              <span className="text-xl">💡</span>
              <div className="text-xs leading-relaxed text-slate-700">
                <p className="font-semibold text-slate-900">Investor Simulation Summary:</p>
                <p className="mt-0.5">
                  With a starting capital of <strong>₹{Number(amount).toLocaleString()}</strong> over <strong>{years} years</strong>, your expected average terminal valuation is <strong>₹{Number(data.expected_value).toLocaleString()}</strong>.
                  In <strong>95 out of 100 simulated market cycles</strong>, your capital remains above the tail-risk floor of <strong>₹{Number(data.worst_case).toLocaleString()}</strong>, with a <strong>{data.probability_of_loss}%</strong> probability of finishing below your starting capital.
                </p>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expected Future Value</p>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">
                  ₹{Number(data.expected_value).toLocaleString()}
                </h2>
                <p className="text-[10px] text-slate-400 mt-1">Mean stochastic path</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Best Case (95th %ile)</p>
                <h2 className="text-2xl font-bold text-emerald-600 mt-1">
                  ₹{Number(data.best_case).toLocaleString()}
                </h2>
                <p className="text-[10px] text-slate-400 mt-1">Upper confidence bound</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Worst Case (5th %ile)</p>
                <h2 className="text-2xl font-bold text-rose-600 mt-1">
                  ₹{Number(data.worst_case).toLocaleString()}
                </h2>
                <p className="text-[10px] text-slate-400 mt-1">Tail-risk drawdown</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Probability of Loss</p>
                <h2 className="text-2xl font-bold text-blue-600 mt-1">
                  {data.probability_of_loss}%
                </h2>
                <p className="text-[10px] text-slate-400 mt-1">Value-at-Risk metric</p>
              </div>
            </div>

            {/* 🔥 PHASE 6: GEMINI AI STOCHASTIC SIMULATION & TAIL-RISK INTELLIGENCE */}
            {(aiInsights || aiLoading) && (
              <AISimulationInsights insights={aiInsights || ({} as any)} loading={aiLoading} />
            )}

            {/* COMPARISON */}
            {compareMode && compareData && (
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
                  <h3 className="font-semibold text-xs text-slate-700 uppercase tracking-wider">Baseline Scenario</h3>
                  <p className="text-sm font-bold text-slate-900">Expected: ₹{Number(data.expected_value).toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Loss Probability: {data.probability_of_loss}%</p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
                  <h3 className="font-semibold text-xs text-slate-700 uppercase tracking-wider">Alternative Scenario</h3>
                  <p className="text-sm font-bold text-slate-900">Expected: ₹{Number(compareData.expected_value).toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Loss Probability: {compareData.probability_of_loss}%</p>
                </div>
              </div>
            )}

            {/* 📈 INTERACTIVE CHARTS WITH VIEW FILTERS */}
            {data?.paths && (
              <MonteCarloCharts
                paths={data.paths}
                finalValues={data.final_values}
                initialInvestment={Number(amount)}
                years={Number(years)}
              />
            )}

            {/* BACKTEST RESULTS */}
            {backtest && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-sm tracking-tight">Historical Backtest Benchmark</h3>

                <div className="grid grid-cols-3 gap-6 text-center">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Final Backtested Value</p>
                    <h4 className="font-bold text-base text-slate-900 mt-0.5">
                      ₹{Number(backtest.final_value).toLocaleString()}
                    </h4>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Historical CAGR</p>
                    <h4 className="font-bold text-base text-emerald-600 mt-0.5">
                      {backtest.cagr}%
                    </h4>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Max Historical Drawdown</p>
                    <h4 className="font-bold text-base text-rose-600 mt-0.5">
                      {backtest.max_drawdown}%
                    </h4>
                  </div>
                </div>
              </div>
            )}

            {/* 🚀 GUIDED NEXT STEP ACTION BAR */}
            <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800 flex flex-wrap justify-between items-center gap-4">
              <div>
                <span className="text-[10px] font-bold bg-emerald-500 text-slate-950 px-2 py-0.5 rounded uppercase">Step 3 Complete</span>
                <h4 className="text-sm font-bold text-white mt-1">Ready to optimize taxes & execute your portfolio?</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Calculate Union Budget 2024 STCG/LTCG liabilities and generate 1-click Zerodha Kite order baskets.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/portfolio"
                  className="text-xs text-slate-300 hover:text-white px-3 py-2"
                >
                  ← Back to MPT Optimizer
                </Link>

                <Link
                  href="/rebalance"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-6 py-2.5 rounded-lg transition-colors shadow-sm"
                >
                  ⚖️ Proceed to Step 4: Tax Rebalance & Execution →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthTeaserGate>
  );
}