"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthTeaserGate from "@/components/AuthTeaserGate";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";

interface PortfolioAsset {
  id: number;
  ticker: string;
  weight: number;
  allocation_amount?: number;
}

interface Portfolio {
  id: number;
  user_id: number;
  name: string;
  initial_investment: number;
  horizon_years: number;
  expected_return: number | null;
  volatility: number | null;
  sharpe_ratio: number | null;
  notes?: string;
  created_at: string;
  assets: PortfolioAsset[];
}

interface PortfolioSummary {
  total_portfolios: number;
  total_capital_invested: number;
  average_horizon_years: number;
  top_holdings: { ticker: string; count: number; total_allocated: number }[];
}

export default function MyPortfoliosPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [selectedForCompare, setSelectedForCompare] = useState<number[]>([]);

  const handleToggleSelect = (id: number) => {
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare(selectedForCompare.filter((i) => i !== id));
    } else {
      if (selectedForCompare.length >= 4) {
        alert("You can select up to 4 portfolios at once for comparison.");
        return;
      }
      setSelectedForCompare([...selectedForCompare, id]);
    }
  };

  const handleCompareSelected = () => {
    if (selectedForCompare.length < 2) {
      alert("Please select at least 2 portfolios to compare.");
      return;
    }
    router.push(`/compare?selected_ids=${selectedForCompare.join(",")}`);
  };

  const fetchData = async () => {
    if (!user) {
      setPortfolios([]);
      setSummary(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      let cloudList: Portfolio[] = [];
      let cloudSum: PortfolioSummary | null = null;

      try {
        const [list, sum] = await Promise.all([
          apiFetch<Portfolio[]>("/api/v1/portfolios"),
          apiFetch<PortfolioSummary>("/api/v1/portfolios/summary"),
        ]);
        cloudList = list || [];
        cloudSum = sum || null;
      } catch (cErr) {
        console.warn("Cloud portfolios fetch error:", cErr);
      }

      // 1. Read user-specific local storage portfolios
      let localList: Portfolio[] = [];
      try {
        localList = JSON.parse(localStorage.getItem(`saved_user_portfolios_${user.id}`) || "[]");
      } catch (lErr) {
        console.error("Local load error:", lErr);
      }

      // 2. Synthesize portfolios strictly from this user's active positions
      try {
        const userPositionsKey = `user_${user.id}_active_positions`;
        const userPositions: any[] = JSON.parse(localStorage.getItem(userPositionsKey) || "[]");

        if (userPositions.length > 0) {
          const grouped: Record<string, any[]> = {};
          userPositions.forEach((pos) => {
            const pName = pos.portfolio_name || "Direct Demat Holdings";
            if (!grouped[pName]) grouped[pName] = [];
            if (!grouped[pName].some((item) => item.ticker === pos.ticker)) {
              grouped[pName].push(pos);
            }
          });

          Object.entries(grouped).forEach(([groupName, items], gIdx) => {
            const totalVal = items.reduce((s, i) => s + (i.invested_amount || i.current_value || (i.quantity * i.avg_buy_price) || 10000), 0);
            localList.push({
              id: 900000 + gIdx,
              user_id: user.id,
              name: groupName,
              initial_investment: totalVal || 100000,
              horizon_years: 3,
              expected_return: 17.2,
              volatility: 16.5,
              sharpe_ratio: 0.85,
              notes: "Executed Market Orders Basket",
              created_at: new Date().toISOString(),
              assets: items.map((itm) => ({
                id: Math.floor(Math.random() * 10000),
                ticker: itm.ticker,
                weight: Math.round((((itm.invested_amount || (itm.quantity * (itm.avg_buy_price || 1000))) / (totalVal || 1)) || (1 / items.length)) * 100) / 100,
                allocation_amount: itm.invested_amount || (itm.quantity * (itm.avg_buy_price || 1000)),
              })),
            });
          });
        }
      } catch (posErr) {
        console.warn("Positions synthesis warning:", posErr);
      }

      // Merge and deduplicate by name / id
      const map = new Map<string | number, Portfolio>();
      [...cloudList, ...localList].forEach((p) => {
        const key = p.name || p.id;
        if (!map.has(key)) {
          map.set(key, p);
        }
      });

      const mergedList = Array.from(map.values());
      setPortfolios(mergedList);

      // Compute or update summary
      if (mergedList.length > 0) {
        const totalInvested = mergedList.reduce((s, p) => s + (p.initial_investment || 0), 0);
        const avgHorizon = Math.round(
          mergedList.reduce((s, p) => s + (p.horizon_years || 0), 0) / mergedList.length
        );

        // Top holdings count
        const holdingMap: Record<string, { count: number; total_allocated: number }> = {};
        mergedList.forEach((p) => {
          (p.assets || []).forEach((a) => {
            if (!holdingMap[a.ticker]) {
              holdingMap[a.ticker] = { count: 0, total_allocated: 0 };
            }
            holdingMap[a.ticker].count += 1;
            holdingMap[a.ticker].total_allocated +=
              a.allocation_amount || (p.initial_investment * (a.weight || 0.2));
          });
        });

        const topHoldings = Object.entries(holdingMap)
          .map(([ticker, d]) => ({ ticker, count: d.count, total_allocated: Math.round(d.total_allocated) }))
          .sort((a, b) => b.total_allocated - a.total_allocated);

        setSummary({
          total_portfolios: mergedList.length,
          total_capital_invested: totalInvested,
          average_horizon_years: avgHorizon || 3,
          top_holdings: topHoldings,
        });
      } else {
        setSummary(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load saved portfolios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleDelete = async (portfolioId: number, name: string) => {
    if (!confirm(`Are you sure you want to delete the portfolio "${name}"?`)) {
      return;
    }
    setDeleteLoading(portfolioId);
    try {
      if (user) {
        // Remove from user-specific local storage
        try {
          const localList: Portfolio[] = JSON.parse(
            localStorage.getItem(`saved_user_portfolios_${user.id}`) || "[]"
          );
          const filtered = localList.filter((p) => p.id !== portfolioId && p.name !== name);
          localStorage.setItem(`saved_user_portfolios_${user.id}`, JSON.stringify(filtered));
        } catch (lErr) {
          console.error(lErr);
        }

        // Delete from cloud backend
        if (portfolioId < 1000000000000) {
          try {
            await apiFetch(`/api/v1/portfolios/${portfolioId}`, {
              method: "DELETE",
            });
          } catch (cErr) {
            console.warn(cErr);
          }
        }
      }

      await fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to delete portfolio");
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleRunSimulation = (portfolio: Portfolio) => {
    localStorage.setItem(
      "portfolio_data",
      JSON.stringify({
        tickers: portfolio.assets.map((a) => a.ticker),
        weights: portfolio.assets.map((a) => a.weight),
        investment: portfolio.initial_investment,
        years: portfolio.horizon_years,
        expected_return: portfolio.expected_return || 12,
        volatility: portfolio.volatility || 20,
      })
    );
    router.push("/simulation");
  };

  const handleLoadInBuilder = (portfolio: Portfolio) => {
    localStorage.setItem(
      "portfolio_builder_state",
      JSON.stringify({
        selected: portfolio.assets.map((a) => ({ ticker: a.ticker, name: a.ticker })),
        investment: String(portfolio.initial_investment),
        years: String(portfolio.horizon_years),
      })
    );
    router.push("/portfolio");
  };

  return (
    <AuthTeaserGate
      title="Saved Portfolios & Analytics"
      subtitle="Cloud-synced portfolio management, multi-asset performance tracking, and direct simulation loading."
      features={[
        "Save custom stock baskets to the cloud",
        "Track investment allocation and Sharpe performance",
        "1-click launch into Monte Carlo Simulation",
        "Cross-device sync and continuous portfolio adjustments",
      ]}
    >
      <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Saved Portfolios</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Cloud-synced investment baskets, asset weights & risk-return profiles
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCompareSelected}
            disabled={selectedForCompare.length < 2}
            className={`px-4 py-2 text-xs font-semibold rounded-lg font-mono transition-all flex items-center gap-1.5 shadow-sm ${
              selectedForCompare.length >= 2
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
            }`}
          >
            <span>Compare Selected ({selectedForCompare.length}/4) →</span>
          </button>

          <Link
            href="/portfolio"
            className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
          >
            New Portfolio
          </Link>
        </div>
      </div>

      {/* SELECTION HELPER BANNER */}
      {portfolios.length >= 2 && (
        <div className="bg-blue-50/60 border border-blue-200/70 p-3 rounded-xl flex justify-between items-center text-xs font-mono text-blue-900">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <span>Select up to 4 portfolios below using the checkboxes to compare risk-adjusted return & AI rankings.</span>
          </div>
          <span className="font-bold">{selectedForCompare.length} / 4 Selected</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
          {error}
        </div>
      )}

      {/* Summary KPI Cards */}
      {summary && summary.total_portfolios > 0 && (
        <div className="grid grid-cols-4 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Invested</p>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              ₹{summary.total_capital_invested.toLocaleString()}
            </h2>
            <p className="text-[10px] text-slate-400 mt-1">Across all saved portfolios</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Saved Baskets</p>
            <h2 className="text-xl font-bold text-slate-900 mt-1">{summary.total_portfolios}</h2>
            <p className="text-[10px] text-slate-400 mt-1">Cloud-synced portfolios</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Horizon</p>
            <h2 className="text-xl font-bold text-slate-900 mt-1">{summary.average_horizon_years} Yrs</h2>
            <p className="text-[10px] text-slate-400 mt-1">Investment time window</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Top Holding</p>
            <h2 className="text-xl font-bold text-blue-600 mt-1">
              {summary.top_holdings[0]?.ticker || "—"}
            </h2>
            <p className="text-[10px] text-slate-400 mt-1">
              {summary.top_holdings[0] ? `₹${summary.top_holdings[0].total_allocated.toLocaleString()} allocated` : "No assets"}
            </p>
          </div>
        </div>
      )}

      {/* Portfolios Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Loading saved portfolios...</div>
      ) : portfolios.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3 max-w-md mx-auto my-8 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">No Portfolios Saved Yet</h2>
          <p className="text-xs text-slate-500">
            Use the Portfolio Maker to optimize your favorite Indian stocks and save them directly to your account.
          </p>
          <div className="pt-2">
            <Link
              href="/portfolio"
              className="inline-block px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
            >
              Build Your First Portfolio
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {portfolios.map((p) => {
            const isSelected = selectedForCompare.includes(p.id);
            return (
              <div
                key={p.id}
                className={`bg-white p-6 rounded-xl border shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5 ${
                  isSelected ? "border-blue-600 ring-2 ring-blue-500/20" : "border-slate-200"
                }`}
              >
                <div className="space-y-4">
                  {/* Header with Selection Checkbox */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(p.id)}
                        className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        title="Select to compare"
                      />
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Created on {new Date(p.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      disabled={deleteLoading === p.id}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1 text-xs font-semibold"
                      title="Delete portfolio"
                    >
                      Delete
                    </button>
                  </div>

                {p.notes && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                    "{p.notes}"
                  </p>
                )}

                {/* Metrics Grid */}
                <div className="grid grid-cols-4 gap-2 py-3 border-y border-slate-100 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Capital</span>
                    <span className="font-semibold text-slate-900 text-xs">
                      ₹{(p.initial_investment / 1e5).toFixed(2)}L
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Horizon</span>
                    <span className="font-semibold text-slate-900 text-xs">{p.horizon_years} Yrs</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Return</span>
                    <span className="font-semibold text-emerald-600 text-xs">
                      {p.expected_return ? `+${p.expected_return}%` : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Sharpe</span>
                    <span className="font-semibold text-blue-600 text-xs">
                      {p.sharpe_ratio || "—"}
                    </span>
                  </div>
                </div>

                {/* Asset Allocation Breakdown */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-slate-700 block uppercase tracking-wider">Asset Allocation:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {p.assets.map((a, aIdx) => (
                      <div
                        key={a.id || a.ticker || `${aIdx}-${a.ticker || 'asset'}`}
                        className="text-xs bg-slate-50 border border-slate-200 px-2 py-0.5 rounded flex items-center gap-1.5"
                      >
                        <span className="font-mono font-medium text-slate-900">{a.ticker}</span>
                        <span className="text-slate-500 font-semibold">
                          {(a.weight * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleRunSimulation(p)}
                    className="flex-1 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    Run Monte Carlo
                  </button>
                  <button
                    onClick={() => handleLoadInBuilder(p)}
                    className="py-2 px-3 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors"
                    title="Edit or rebalance in Portfolio Maker"
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </AuthTeaserGate>
  );
}

