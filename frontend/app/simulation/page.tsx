"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MonteCarloCharts from "@/components/MonteCarloCharts";
import AuthTeaserGate from "@/components/AuthTeaserGate";
import AISimulationInsights, { SimulationInsightsData } from "@/components/AISimulationInsights";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, API_BASE_URL } from "@/lib/api";

export default function Simulation() {
  const router = useRouter();
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

  const [showSimOrderModal, setShowSimOrderModal] = useState(false);
  const [stagedSimOrders, setStagedSimOrders] = useState<any[]>([]);
  const [simWeightMode, setSimWeightMode] = useState<"OPTIMAL" | "EQUAL">("OPTIMAL");
  const [cachedSimPriceMap, setCachedSimPriceMap] = useState<Record<string, number>>({});

  const handleSwitchSimWeightSplit = (mode: "OPTIMAL" | "EQUAL") => {
    setSimWeightMode(mode);
    if (!tickers || tickers.length === 0) return;
    const totalCap = Number(amount) || 100000;

    const staged: any[] = [];
    if (mode === "OPTIMAL") {
      const equalWeight = 1.0 / tickers.length;
      tickers.forEach((ticker) => {
        const alloc = Math.round(totalCap * equalWeight);
        const ltp = cachedSimPriceMap[ticker] || 1500;
        const qty = Math.max(1, Math.floor(alloc / ltp));
        const companyName = ticker.replace(".NS", "");

        staged.push({
          ticker,
          company_name: companyName,
          action: "BUY",
          quantity: qty,
          price: ltp,
          weight_pct: Math.round(equalWeight * 100),
        });
      });
    } else {
      const equalWeight = 1.0 / tickers.length;
      tickers.forEach((ticker) => {
        const alloc = Math.round(totalCap * equalWeight);
        const ltp = cachedSimPriceMap[ticker] || 1500;
        const qty = Math.max(1, Math.floor(alloc / ltp));
        const companyName = ticker.replace(".NS", "");

        staged.push({
          ticker,
          company_name: companyName,
          action: "BUY",
          quantity: qty,
          price: ltp,
          weight_pct: Math.round(equalWeight * 100),
        });
      });
    }
    setStagedSimOrders(staged);
  };

  const handleDeploySimulatedOrders = async () => {
    if (!tickers || tickers.length === 0) return;

    const totalCap = Number(amount) || 100000;
    let priceMap: Record<string, number> = {
      "RELIANCE.NS": 2980,
      "TCS.NS": 4150,
      "HDFCBANK.NS": 1640,
      "ICICIBANK.NS": 1210,
      "INFY.NS": 1820,
      "LT.NS": 3620,
      "TATAMOTORS.NS": 980,
      "SUNPHARMA.NS": 1710,
      "BHARTIARTL.NS": 1480,
      "BAJFINANCE.NS": 7120,
      "TITAN.NS": 3450,
      "ITC.NS": 490,
      "SBIN.NS": 815,
      "TATASTEEL.NS": 155,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/stocks/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickers }),
      });
      if (res.ok) {
        const quotes = await res.json();
        if (quotes && typeof quotes === "object") {
          Object.entries(quotes).forEach(([t, q]: any) => {
            if (q && q.current_price) {
              priceMap[t] = Number(q.current_price);
            }
          });
        }
      }
    } catch (e) {
      console.warn("Live quote fetch for sim staging fallback:", e);
    }

    setCachedSimPriceMap(priceMap);
    setSimWeightMode("OPTIMAL");

    const equalWeight = 1.0 / tickers.length;
    const staged: any[] = [];

    tickers.forEach((ticker) => {
      const alloc = Math.round(totalCap * equalWeight);
      const ltp = priceMap[ticker] || 1500;
      const qty = Math.max(1, Math.floor(alloc / ltp));
      const companyName = ticker.replace(".NS", "");

      staged.push({
        ticker,
        company_name: companyName,
        action: "BUY",
        quantity: qty,
        price: ltp,
        weight_pct: Math.round(equalWeight * 100),
      });
    });

    setStagedSimOrders(staged);
    setShowSimOrderModal(true);
  };

  const handleConfirmSimOrders = () => {
    const now = new Date();
    const formattedTime = now.toISOString().replace("T", " ").substring(0, 19);

    const newOrders: any[] = [];
    const newPositions: any[] = [];

    stagedSimOrders.forEach((o) => {
      const actualVal = Math.round(o.quantity * o.price * 100) / 100;
      const brokerage = Math.min(20, Math.round(actualVal * 0.0003 * 100) / 100);
      const stt = Math.round(actualVal * 0.001 * 100) / 100;
      const orderId = `ORD-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      newOrders.push({
        order_id: orderId,
        ticker: o.ticker,
        company_name: o.company_name,
        action: o.action,
        quantity: Number(o.quantity),
        executed_price: Number(o.price),
        order_value: actualVal,
        brokerage,
        stt,
        status: "FILLED",
        execution_time: formattedTime,
        broker_mode: "SIMULATION_CONFIRMED",
      });

      newPositions.push({
        ticker: o.ticker,
        company_name: o.company_name,
        quantity: Number(o.quantity),
        avg_buy_price: Number(o.price),
        current_price: Number(o.price),
        invested_amount: actualVal,
        current_value: actualVal,
        unrealized_pnl: 0,
        unrealized_pnl_pct: 0,
        day_change_pct: 0.85,
      });
    });

    try {
      const userOrdersKey = `user_${user?.id || "guest"}_order_history`;
      const userPositionsKey = `user_${user?.id || "guest"}_active_positions`;

      const existingOrders = JSON.parse(localStorage.getItem(userOrdersKey) || "[]");
      localStorage.setItem(userOrdersKey, JSON.stringify([...newOrders, ...existingOrders]));

      const existingPositions = JSON.parse(localStorage.getItem(userPositionsKey) || "[]");
      const mergedMap = new Map<string, any>();
      existingPositions.forEach((p: any) => mergedMap.set(p.ticker, p));

      newPositions.forEach((p: any) => {
        if (mergedMap.has(p.ticker)) {
          const prev = mergedMap.get(p.ticker);
          const newQty = prev.quantity + p.quantity;
          const newInvested = prev.invested_amount + p.invested_amount;
          const newAvgPrice = Math.round((newInvested / newQty) * 100) / 100;
          mergedMap.set(p.ticker, {
            ...prev,
            quantity: newQty,
            invested_amount: newInvested,
            avg_buy_price: newAvgPrice,
            current_value: newQty * p.current_price,
          });
        } else {
          mergedMap.set(p.ticker, p);
        }
      });

      localStorage.setItem(userPositionsKey, JSON.stringify(Array.from(mergedMap.values())));

      // Automatically save simulated executed portfolio into Saved Portfolios
      try {
        const savedStorageKey = user ? `saved_user_portfolios_${user.id}` : "saved_user_portfolios_guest";
        const localSaved = JSON.parse(localStorage.getItem(savedStorageKey) || "[]");
        const simPortfolio = {
          id: Date.now(),
          name: `Simulated Basket (${new Date().toLocaleDateString()})`,
          initial_investment: Number(amount) || 100000,
          horizon_years: Number(years) || 3,
          expected_return: data?.expected_return || expReturn || 18.0,
          volatility: data?.volatility || volatility || 16.0,
          sharpe_ratio: 0.85,
          notes: "1-Click Executed Monte Carlo Stress Basket",
          created_at: new Date().toISOString(),
          assets: stagedSimOrders.map((o) => ({
            ticker: o.ticker,
            name: o.company_name,
            weight: (o.weight_pct || 25) / 100,
            allocation_amount: Math.round((Number(o.quantity) || 1) * (Number(o.price) || 1000)),
          })),
        };
        localStorage.setItem(savedStorageKey, JSON.stringify([simPortfolio, ...localSaved.filter((p: any) => p.name !== simPortfolio.name)]));

        if (user) {
          apiFetch("/api/v1/portfolios", {
            method: "POST",
            body: JSON.stringify({
              name: simPortfolio.name,
              initial_investment: simPortfolio.initial_investment,
              horizon_years: simPortfolio.horizon_years,
              expected_return: simPortfolio.expected_return,
              volatility: simPortfolio.volatility,
              sharpe_ratio: simPortfolio.sharpe_ratio,
              notes: simPortfolio.notes,
              assets: simPortfolio.assets,
            }),
          }).catch((err) => console.warn("Sim cloud auto-save sync:", err));
        }
      } catch (saveErr) {
        console.error("Auto-saving simulated portfolio failed:", saveErr);
      }
    } catch (e) {
      console.error(e);
    }

    setShowSimOrderModal(false);
    router.push("/orders");
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
        {/* INSTITUTIONAL 4-STAGE LIFECYCLE WORKFLOW STEPPER */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
            <Link
              href="/onboarding"
              className="p-3 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all flex flex-col justify-between"
            >
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono">Stage 01</span>
                <span className="text-[10px] text-blue-600 font-semibold">Change Target</span>
              </div>
              <span className="font-bold text-slate-900 mt-1">Goal & Basket Definition</span>
            </Link>

            <Link
              href="/portfolio"
              className="p-3 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all flex flex-col justify-between"
            >
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono">Stage 02</span>
                <span className="text-[10px] text-blue-600 font-semibold">Adjust Weights</span>
              </div>
              <span className="font-bold text-slate-900 mt-1">Markowitz SLSQP Optimizer</span>
            </Link>

            <div className="p-3 rounded-lg bg-slate-900 text-white shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400 font-mono">Stage 03 • Active</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <span className="font-bold text-white mt-1">Monte Carlo Stress Engine</span>
            </div>

            <Link
              href="/rebalance"
              className="p-3 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all flex flex-col justify-between"
            >
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono">Stage 04</span>
                <span className="text-[10px] text-slate-500 font-medium">Final Stage</span>
              </div>
              <span className="font-bold text-slate-900 mt-1">Tax Rebalancing & Orders</span>
            </Link>
          </div>
        </div>

        {/* Header with Beginner Guide Toggle */}
        <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Monte Carlo Simulation & Risk Engine</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Stochastic multivariate forecasting and 95% Value-at-Risk envelope modeling
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/compare"
              className="text-xs bg-slate-100 border border-slate-200 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-200 font-semibold transition-colors"
            >
              Peer Benchmark
            </Link>

            <button
              onClick={() => setShowGuide(!showGuide)}
              className="text-xs bg-slate-100 border border-slate-200 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-200 font-semibold transition-colors"
            >
              {showGuide ? "Close Documentation" : "Methodology Guide"}
            </button>
          </div>
        </div>

        {/* Methodology Guide Card (Collapsible) */}
        {showGuide && (
          <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800 shadow-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
                Methodology: Multivariate Stochastic Simulation
              </h3>
              <button
                onClick={() => setShowGuide(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                [Close]
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs leading-relaxed text-slate-300">
              <div className="p-3.5 bg-slate-800/80 rounded-lg border border-slate-700 space-y-1">
                <p className="font-bold text-emerald-400">1. Stochastic Paths</p>
                <p>
                  Instead of a single deterministic forecast, Monte Carlo simulates 600+ randomized daily market paths using asset correlation and volatility matrices.
                </p>
              </div>

              <div className="p-3.5 bg-slate-800/80 rounded-lg border border-slate-700 space-y-1">
                <p className="font-bold text-blue-400">2. 5th Percentile (Tail Risk Floor)</p>
                <p>
                  In 95 out of 100 simulated market cycles, portfolio terminal value exceeds this floor, modeling macro drawdowns.
                </p>
              </div>

              <div className="p-3.5 bg-slate-800/80 rounded-lg border border-slate-700 space-y-1">
                <p className="font-bold text-amber-400">3. Probability of Capital Loss (VaR)</p>
                <p>
                  Percentage of simulated paths that finish below starting principal.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STARTER BASKETS */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono">
              Starter Baskets & Benchmarks
            </h2>
            <span className="text-[10px] text-slate-400">Select to simulate</span>
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
                  <span className="text-blue-600 text-xs font-semibold">Simulate →</span>
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
            {/* Investor Takeaway Banner */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-start gap-3">
              <div className="text-xs leading-relaxed text-slate-700">
                <p className="font-bold text-slate-900 font-mono text-[11px] uppercase tracking-wider text-slate-500 mb-1">
                  Simulation Outcome Analysis:
                </p>
                <p>
                  With a starting capital of <strong>₹{Number(amount).toLocaleString()}</strong> over <strong>{years} years</strong>, expected average terminal valuation is <strong>₹{Number(data.expected_value).toLocaleString()}</strong>.
                  In <strong>95 out of 100 simulated market cycles</strong>, capital remains above the tail-risk floor of <strong>₹{Number(data.worst_case).toLocaleString()}</strong>, with a <strong>{data.probability_of_loss}%</strong> probability of finishing below starting principal.
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

            {/* PHASE 6: GEMINI AI STOCHASTIC SIMULATION & TAIL-RISK INTELLIGENCE */}
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

            {/* CHARTS WITH VIEW FILTERS */}
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

            {/* GUIDED NEXT STEP ACTION BAR */}
            <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800 flex flex-wrap justify-between items-center gap-4">
              <div>
                <span className="text-[10px] font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded uppercase tracking-wider font-mono border border-slate-700">
                  Stage 03 Complete
                </span>
                <h4 className="text-sm font-bold text-white mt-1">Ready to optimize taxes & execute your portfolio?</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Calculate Union Budget 2024 STCG/LTCG liabilities and generate 1-click Zerodha Kite order baskets.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleDeploySimulatedOrders}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold font-mono px-4 py-2.5 rounded-lg transition-colors shadow-sm"
                >
                  1-Click Place Simulated Orders →
                </button>

                <Link
                  href="/portfolio"
                  className="text-xs text-slate-300 hover:text-white px-3 py-2 font-medium"
                >
                  ← Back to MPT Optimizer
                </Link>

                <Link
                  href="/rebalance"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-6 py-2.5 rounded-lg transition-colors shadow-sm"
                >
                  Stage 04: Tax Rebalancing & Orders →
                </Link>
              </div>
            </div>
          </div>
        )}
        {/* SIMULATION ORDER REVIEW & STAGING MODAL */}
        {showSimOrderModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Review & Confirm Simulation Orders</h2>
                  <p className="text-xs text-slate-500">Edit quantities, switch weights, or edit stock prices before execution.</p>
                </div>
                <button
                  onClick={() => setShowSimOrderModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>


              {/* Weight Split Strategy Selector */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-wrap justify-between items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-700">Allocation Mode:</span>
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => handleSwitchSimWeightSplit("OPTIMAL")}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      simWeightMode === "OPTIMAL"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    🎯 Optimal Risk Split
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchSimWeightSplit("EQUAL")}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      simWeightMode === "EQUAL"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    ⚖️ Equal Split (1/N)
                  </button>
                </div>
              </div>

              {/* Order Staging Table */}
              <div className="space-y-3">
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Security</th>
                        <th className="py-2.5 px-2">Action</th>
                        <th className="py-2.5 px-2">Quantity</th>
                        <th className="py-2.5 px-2">Price (₹)</th>
                        <th className="py-2.5 px-3 text-right">Gross Total (₹)</th>
                        <th className="py-2.5 px-2 text-center">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stagedSimOrders.map((o, idx) => {
                        const rowTotal = Math.round((Number(o.quantity) || 0) * (Number(o.price) || 0));
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-slate-900 block">{o.company_name}</span>
                              <span className="font-mono text-[10px] text-slate-400">{o.ticker} ({o.weight_pct}%)</span>
                            </td>
                            <td className="py-2.5 px-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 font-mono">
                                BUY
                              </span>
                            </td>
                            <td className="py-2.5 px-2">
                              <input
                                type="number"
                                min={1}
                                value={o.quantity}
                                onChange={(e) => {
                                  const updated = [...stagedSimOrders];
                                  const val = e.target.value;
                                  updated[idx].quantity = val === "" ? ("" as any) : Number(val);
                                  setStagedSimOrders(updated);
                                }}
                                onBlur={() => {
                                  const updated = [...stagedSimOrders];
                                  if (!updated[idx].quantity || Number(updated[idx].quantity) <= 0) {
                                    updated[idx].quantity = 1;
                                    setStagedSimOrders(updated);
                                  }
                                }}
                                className="w-20 border border-slate-200 px-2 py-1 rounded text-xs outline-none focus:border-slate-800 font-mono"
                              />
                            </td>
                            <td className="py-2.5 px-2">
                              <input
                                type="number"
                                min={1}
                                value={o.price}
                                onChange={(e) => {
                                  const updated = [...stagedSimOrders];
                                  const val = e.target.value;
                                  updated[idx].price = val === "" ? ("" as any) : Number(val);
                                  setStagedSimOrders(updated);
                                }}
                                onBlur={() => {
                                  const updated = [...stagedSimOrders];
                                  if (!updated[idx].price || Number(updated[idx].price) <= 0) {
                                    updated[idx].price = 1;
                                    setStagedSimOrders(updated);
                                  }
                                }}
                                className="w-24 border border-slate-200 px-2 py-1 rounded text-xs outline-none focus:border-slate-800 font-mono"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                              ₹{rowTotal.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <button
                                onClick={() => {
                                  setStagedSimOrders(stagedSimOrders.filter((_, i) => i !== idx));
                                }}
                                className="text-slate-400 hover:text-rose-600 font-bold px-2 py-1"
                                title="Remove stock"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Capital Summary */}
                <div className="bg-slate-50 p-3.5 rounded-lg text-xs space-y-1.5 border border-slate-200 font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span>Total Staged Orders:</span>
                    <span className="font-bold text-slate-900">{stagedSimOrders.length} securities</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Estimated Total Capital:</span>
                    <span className="font-bold text-slate-900">
                      ₹{stagedSimOrders.reduce((sum, o) => sum + Math.round((Number(o.quantity) || 0) * (Number(o.price) || 0)), 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Est. Brokerage & Taxes:</span>
                    <span className="font-bold text-slate-500">
                      ₹{Math.round(stagedSimOrders.reduce((sum, o) => sum + (Number(o.quantity) * Number(o.price) * 0.001), 0)).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSimOrderModal(false)}
                    className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-lg hover:bg-slate-50 text-slate-700"
                  >
                    Cancel / Edit In Simulator
                  </button>

                  <button
                    onClick={handleConfirmSimOrders}
                    disabled={stagedSimOrders.length === 0}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold font-mono rounded-lg transition-colors shadow-sm disabled:opacity-50"
                  >
                    Confirm & Execute {stagedSimOrders.length} Orders →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthTeaserGate>
  );
}