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
    // 1. Check if user arrived from Goal Onboarding or Importer with portfolio_data
    const goalData = localStorage.getItem("portfolio_data");
    const importedHoldings = localStorage.getItem("imported_holdings");
    const builderState = localStorage.getItem("portfolio_builder_state");

    if (goalData) {
      try {
        const parsed = JSON.parse(goalData);
        if (parsed.investment) setInvestment(parsed.investment);
        if (parsed.years) setYears(parsed.years);
        if (parsed.goal_name) setPortfolioName(parsed.goal_name);

        if (parsed.tickers && parsed.tickers.length > 0) {
          const mappedCompanies = parsed.tickers.map((t: string) => {
            const cleanName = t.replace(".NS", "");
            return { ticker: t, name: cleanName };
          });
          setSelected(mappedCompanies);

          // Auto-optimize this basket
          setTimeout(() => {
            analyzePortfolio(mappedCompanies);
          }, 300);
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (importedHoldings) {
      try {
        const parsed = JSON.parse(importedHoldings);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const mapped = parsed.map((h: any) => ({
            ticker: h.ticker,
            name: h.company_name || h.ticker.replace(".NS", ""),
          }));
          setSelected(mapped);
          setTimeout(() => {
            analyzePortfolio(mapped);
          }, 300);
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (builderState) {
      try {
        const parsed = JSON.parse(builderState);
        if (parsed.selected) setSelected(parsed.selected);
        if (parsed.investment) setInvestment(parsed.investment);
        if (parsed.years) setYears(parsed.years);
        if (parsed.result) setResult(parsed.result);
        if (parsed.aiInsights) setAiInsights(parsed.aiInsights);
      } catch (e) {
        console.error(e);
      }
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

  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<any>(null);
  const [recsLoading, setRecsLoading] = useState(false);

  const fetchAiRecommendations = async () => {
    setRecsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/ai/recommend-stocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_tickers: selected.map((c) => c.ticker),
          goal_type: "Maximum Sharpe Growth",
          horizon_years: Number(years) || 3,
        }),
      });
      const data = await res.json();
      setAiRecommendations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setRecsLoading(false);
    }
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
    setAnalysisError(null);

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
      if (!res.ok || data.error || !data.optimal_weights) {
        setAnalysisError(data.error || "Failed to calculate portfolio optimization");
        setLoading(false);
        setAiLoading(false);
        return;
      }

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
    } catch (err: any) {
      console.error(err);
      setAnalysisError(err?.message || "Failed to connect to optimization server");
      setLoading(false);
      setAiLoading(false);
    }
  };

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [stagedOrders, setStagedOrders] = useState<any[]>([]);

  const handleOpenSaveModal = () => {
    setPortfolioName(`Portfolio (${selected.map((s) => s.ticker.replace(".NS", "")).join(", ")})`);
    setShowSaveModal(true);
    setSaveSuccess(false);
  };

  const handleSaveToCloud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portfolioName || !result?.optimal_weights) return;

    setSaveLoading(true);
    try {
      const assets = Object.entries(result.optimal_weights).map(([ticker, weight]: any, aIdx: number) => ({
        id: Date.now() + aIdx,
        ticker,
        weight: Number(weight) / 100,
        allocation_amount: (Number(investment) * Number(weight)) / 100,
      }));

      const newSavedPortfolio = {
        id: Date.now(),
        name: portfolioName,
        initial_investment: Number(investment),
        horizon_years: Number(years),
        expected_return: result.expected_return,
        volatility: result.volatility,
        sharpe_ratio: result.sharpe_ratio,
        notes: portfolioNotes,
        created_at: new Date().toISOString(),
        assets,
      };

      // Save to user-specific localStorage if logged in, else guest
      try {
        const storageKey = user ? `saved_user_portfolios_${user.id}` : "saved_user_portfolios_guest";
        const localSaved = JSON.parse(localStorage.getItem(storageKey) || "[]");
        localStorage.setItem(storageKey, JSON.stringify([newSavedPortfolio, ...localSaved]));
      } catch (lErr) {
        console.error("Local save error:", lErr);
      }

      // Also sync to cloud API if authenticated
      if (user) {
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
      }

      setSaveSuccess(true);
    } catch (err: any) {
      console.warn("Cloud sync notice:", err);
      // Still consider success because local save succeeded
      setSaveSuccess(true);
    } finally {
      setSaveLoading(false);
    }
  };

  // Open Staging & Review Modal with Live Market Prices
  const handleDeployDirectOrders = async () => {
    if (!result?.optimal_weights) return;

    const totalCap = Number(investment) || 100000;
    const tickers = Object.keys(result.optimal_weights);

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
      console.warn("Live quote fetch for order staging fallback:", e);
    }

    const staged: any[] = [];
    Object.entries(result.optimal_weights).forEach(([ticker, weight]: any) => {
      const wPct = Number(weight) / 100;
      if (wPct <= 0) return;

      const alloc = Math.round(totalCap * wPct);
      const ltp = priceMap[ticker] || 1500;
      const qty = Math.max(1, Math.floor(alloc / ltp));
      const foundName = selected.find((s) => s.ticker === ticker)?.name || ticker.replace(".NS", "");

      staged.push({
        ticker,
        company_name: foundName,
        action: "BUY",
        quantity: qty,
        price: ltp,
        weight_pct: Math.round(wPct * 100),
      });
    });

    setStagedOrders(staged);
    setShowOrderModal(true);
  };

  // Confirm Staged Orders
  const handleConfirmAndExecuteOrders = () => {
    const now = new Date();
    const formattedTime = now.toISOString().replace("T", " ").substring(0, 19);

    const newOrders: any[] = [];
    const newPositions: any[] = [];

    stagedOrders.forEach((o) => {
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
        broker_mode: "PORTFOLIO_STUDIO_CONFIRMED",
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
        day_change_pct: 0.8,
      });
    });

    try {
      const userOrdersKey = `user_${user?.id || "guest"}_order_history`;
      const userPositionsKey = `user_${user?.id || "guest"}_active_positions`;

      const existingOrders = JSON.parse(localStorage.getItem(userOrdersKey) || "[]");
      localStorage.setItem(userOrdersKey, JSON.stringify([...newOrders, ...existingOrders]));

      // Merge with active positions
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

      // Automatically save this executed portfolio in Saved Portfolios
      try {
        const savedStorageKey = user ? `saved_user_portfolios_${user.id}` : "saved_user_portfolios_guest";
        const localSaved = JSON.parse(localStorage.getItem(savedStorageKey) || "[]");
        const executedPortfolio = {
          id: Date.now(),
          name: portfolioName || `Executed Portfolio (${new Date().toLocaleDateString()})`,
          initial_investment: Number(investment) || 100000,
          horizon_years: Number(years) || 3,
          expected_return: result.expected_return,
          volatility: result.volatility,
          sharpe_ratio: result.sharpe_ratio,
          notes: portfolioNotes || "1-Click Executed Markowitz Allocation",
          created_at: new Date().toISOString(),
          assets: stagedOrders.map((o) => ({
            ticker: o.ticker,
            name: o.company_name,
            weight: (o.weight_pct || 20) / 100,
            allocation_amount: Math.round((Number(o.quantity) || 1) * (Number(o.price) || 1000)),
          })),
        };
        localStorage.setItem(savedStorageKey, JSON.stringify([executedPortfolio, ...localSaved.filter((p: any) => p.name !== executedPortfolio.name)]));

        if (user) {
          apiFetch("/api/v1/portfolios", {
            method: "POST",
            body: JSON.stringify({
              name: executedPortfolio.name,
              initial_investment: executedPortfolio.initial_investment,
              horizon_years: executedPortfolio.horizon_years,
              expected_return: executedPortfolio.expected_return,
              volatility: executedPortfolio.volatility,
              sharpe_ratio: executedPortfolio.sharpe_ratio,
              notes: executedPortfolio.notes,
              assets: executedPortfolio.assets,
            }),
          }).catch((err) => console.warn("Portfolio cloud auto-save sync:", err));
        }
      } catch (saveErr) {
        console.error("Auto-saving executed portfolio failed:", saveErr);
      }
    } catch (e) {
      console.error(e);
    }

    setShowOrderModal(false);
    router.push("/orders");
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

            <div className="p-3 rounded-lg bg-slate-900 text-white shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400 font-mono">Stage 02 • Active</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <span className="font-bold text-white mt-1">Markowitz SLSQP Optimizer</span>
            </div>

            <Link
              href="/simulation"
              className="p-3 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all flex flex-col justify-between"
            >
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono">Stage 03</span>
                <span className="text-[10px] text-slate-500 font-medium">Next Stage</span>
              </div>
              <span className="font-bold text-slate-900 mt-1">Monte Carlo Stress Engine</span>
            </Link>

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

        {/* Header with Guide Toggle */}
        <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Portfolio Studio & Asset Allocator</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Modern Portfolio Theory (MPT) mean-variance optimization with SLSQP numerical solver
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/import"
              className="text-xs bg-slate-100 border border-slate-200 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-200 font-semibold transition-colors"
            >
              Import Demat Holdings
            </Link>

            <button
              onClick={() => setShowGuide(!showGuide)}
              className="text-xs bg-slate-100 border border-slate-200 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-200 font-semibold transition-colors"
            >
              {showGuide ? "Close Documentation" : "Methodology Guide"}
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

        {/* Methodology Guide Card (Collapsible) */}
        {showGuide && (
          <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800 shadow-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
                Methodology & Optimization Framework
              </h3>
              <button
                onClick={() => setShowGuide(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                [Close]
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 text-xs leading-relaxed text-slate-300">
              <div className="p-3.5 bg-slate-800/80 rounded-lg border border-slate-700 space-y-1">
                <p className="font-bold text-emerald-400">1. Covariance Matrix</p>
                <p>
                  Holding assets with divergent correlation profiles lowers total portfolio variance without sacrificing expected CAGR.
                </p>
              </div>

              <div className="p-3.5 bg-slate-800/80 rounded-lg border border-slate-700 space-y-1">
                <p className="font-bold text-blue-400">2. Sharpe Ratio</p>
                <p>
                  Quantifies excess return earned per unit of total risk (annualized standard deviation).
                </p>
              </div>

              <div className="p-3.5 bg-slate-800/80 rounded-lg border border-slate-700 space-y-1">
                <p className="font-bold text-indigo-400">3. SLSQP Numerical Solver</p>
                <p>
                  Calculates exact constraint boundaries (5% min, 70% max) to locate the global maximum Sharpe ratio.
                </p>
              </div>

              <div className="p-3.5 bg-slate-800/80 rounded-lg border border-slate-700 space-y-1">
                <p className="font-bold text-purple-400">4. Efficient Frontier</p>
                <p>
                  The optimal hyperbola mapping highest achievable CAGR for every unit of volatility.
                </p>
              </div>

              <div className="p-3.5 bg-slate-800/80 rounded-lg border border-slate-700 space-y-1">
                <p className="font-bold text-amber-400">5. Diagnostics & Swaps</p>
                <p>
                  Automated detection of low-Sharpe constituents with recommended high-efficiency alternatives.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Search & Selection */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-wrap justify-between items-end gap-3">
            <div className="space-y-1.5 flex-1 max-w-md">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Search Indian Companies (NSE)</label>
              <div className="relative w-full">
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

            <button
              onClick={fetchAiRecommendations}
              disabled={recsLoading || selected.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-1.5 font-mono disabled:opacity-50"
            >
              {recsLoading ? "Analyzing Sector Gaps..." : "AI: Suggest High-Alpha Stocks →"}
            </button>
          </div>

          {/* AI STOCK RECOMMENDATIONS CARD (IF TRIGGERED) */}
          {aiRecommendations && (
            <div className="p-4 bg-blue-50/50 border border-blue-200/80 rounded-xl space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-blue-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <h4 className="text-xs font-bold text-slate-900 uppercase font-mono">
                    AI Sector Gap Analysis & Suggested Additions
                  </h4>
                  <span className="text-[9px] font-bold bg-blue-900 text-white px-2 py-0.5 rounded font-mono">
                    {aiRecommendations.powered_by || "Google Gemini"}
                  </span>
                </div>
                <button
                  onClick={() => setAiRecommendations(null)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-700 font-mono"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed">
                {aiRecommendations.sector_gap_analysis}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                {aiRecommendations.recommendations?.map((rec: any, rIdx: number) => {
                  const alreadyAdded = selected.some((s) => s.ticker === rec.ticker);
                  return (
                    <div
                      key={rIdx}
                      className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs space-y-2 flex flex-col justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-xs text-slate-900 block">{rec.name || rec.ticker}</span>
                            <span className="font-mono text-[10px] text-slate-500">{rec.sector}</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                            +{rec.expected_cagr}%
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">{rec.rationale}</p>
                      </div>

                      <button
                        onClick={() => {
                          if (!alreadyAdded) {
                            addCompany({ name: rec.name || rec.ticker, ticker: rec.ticker });
                          }
                        }}
                        disabled={alreadyAdded}
                        className={`w-full py-1.5 rounded text-xs font-semibold transition-colors mt-2 ${
                          alreadyAdded
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                            : "bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
                        }`}
                      >
                        {alreadyAdded ? "In Portfolio" : "+ Add to Basket"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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

        {/* ERROR STATE BANNER */}
        {analysisError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-xs flex items-center justify-between font-mono">
            <div className="flex items-center gap-2">
              <span className="font-bold uppercase text-[10px] bg-rose-200 px-1.5 py-0.5 rounded">Alert</span>
              <span>{analysisError}</span>
            </div>
            <button
              onClick={() => analyzePortfolio()}
              className="px-3 py-1 bg-rose-600 text-white rounded font-semibold hover:bg-rose-700 transition-colors"
            >
              Retry Optimization
            </button>
          </div>
        )}

        {/* RESULTS */}
        {result && result.optimal_weights && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expected Return</p>
                <h2 className="text-2xl font-bold text-emerald-600 mt-1">+{result.expected_return}%</h2>
                <p className="text-[10px] text-slate-400 mt-1">Annualized CAGR</p>
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
                  ₹{Number(result.future_value || 0).toLocaleString()}
                </h2>
                <p className="text-[10px] text-slate-400 mt-1">In {years} years</p>
              </div>
            </div>

            {/* PHASE 6: GEMINI AI PORTFOLIO ALLOCATION INTELLIGENCE & REAL ASSET DIAGNOSTICS */}
            {(aiInsights || aiLoading) && (
              <AIPortfolioInsights
                insights={aiInsights || ({} as any)}
                loading={aiLoading}
                onReplaceStock={handleReplaceStock}
              />
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-between items-center bg-slate-50 border border-slate-200 p-5 rounded-xl gap-4">
              <div>
                <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded uppercase tracking-wider font-mono">Workflow Next</span>
                <h4 className="font-bold text-slate-900 text-sm mt-1">Ready to test risk & execute this allocation?</h4>
                <p className="text-slate-500 text-xs mt-0.5">Seamlessly carry these optimal weights into stochastic stress testing or tax rebalancing.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={handleDeployDirectOrders}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold font-mono transition-colors shadow-sm"
                >
                  1-Click Place Portfolio Orders →
                </button>

                <button
                  onClick={handleOpenSaveModal}
                  className="bg-white text-slate-800 border border-slate-300 px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Save Allocation
                </button>

                <Link
                  href="/compare"
                  className="bg-white text-slate-800 border border-slate-300 px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Peer Benchmark
                </Link>

                <button
                  onClick={() => {
                    localStorage.setItem(
                      "portfolio_data",
                      JSON.stringify({
                        tickers: selected.map((c) => c.ticker),
                        weights: Object.values(result.optimal_weights || {}).map((w: any) => w / 100),
                        investment: Number(investment),
                        years: Number(years),
                        expected_return: result.expected_return,
                        volatility: result.volatility,
                      })
                    );
                    router.push("/simulation");
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors shadow-sm"
                >
                  Stage 03: Stress Engine →
                </button>

                <Link
                  href="/rebalance"
                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors shadow-sm"
                >
                  Stage 04: Tax Rebalance →
                </Link>
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
                  {Object.entries(result.weights || {}).map(([k, v]: any) => (
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
                  {Object.entries(result.optimal_weights || {}).map(([k, v]: any) => (
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
        {/* INTERACTIVE ORDER REVIEW & EDIT STAGING MODAL */}
        {showOrderModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Review & Confirm Portfolio Orders</h2>
                  <p className="text-xs text-slate-500">Edit quantities, adjust target prices, or switch weight distribution before executing.</p>
                </div>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
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
                      {stagedOrders.map((o, idx) => {
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
                                  const updated = [...stagedOrders];
                                  updated[idx].quantity = Math.max(1, Number(e.target.value));
                                  setStagedOrders(updated);
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
                                  const updated = [...stagedOrders];
                                  updated[idx].price = Number(e.target.value);
                                  setStagedOrders(updated);
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
                                  setStagedOrders(stagedOrders.filter((_, i) => i !== idx));
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
                    <span>Total Basket Orders:</span>
                    <span className="font-bold text-slate-900">{stagedOrders.length} securities</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Estimated Total Capital:</span>
                    <span className="font-bold text-slate-900">
                      ₹{stagedOrders.reduce((sum, o) => sum + Math.round((Number(o.quantity) || 0) * (Number(o.price) || 0)), 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Est. Brokerage & Taxes:</span>
                    <span className="font-bold text-slate-500">
                      ₹{Math.round(stagedOrders.reduce((sum, o) => sum + (Number(o.quantity) * Number(o.price) * 0.001), 0)).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setShowOrderModal(false)}
                    className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-lg hover:bg-slate-50 text-slate-700"
                  >
                    Cancel / Edit In Studio
                  </button>

                  <button
                    onClick={handleConfirmAndExecuteOrders}
                    disabled={stagedOrders.length === 0}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold font-mono rounded-lg transition-colors shadow-sm disabled:opacity-50"
                  >
                    Confirm & Execute {stagedOrders.length} Orders →
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