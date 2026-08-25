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

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [list, sum] = await Promise.all([
        apiFetch<Portfolio[]>("/api/v1/portfolios"),
        apiFetch<PortfolioSummary>("/api/v1/portfolios/summary"),
      ]);
      setPortfolios(list);
      setSummary(sum);
    } catch (err: any) {
      setError(err.message || "Failed to load saved portfolios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const handleDelete = async (portfolioId: number, name: string) => {
    if (!confirm(`Are you sure you want to delete the portfolio "${name}"?`)) {
      return;
    }
    setDeleteLoading(portfolioId);
    try {
      await apiFetch(`/api/v1/portfolios/${portfolioId}`, {
        method: "DELETE",
      });
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

        <Link
          href="/portfolio"
          className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
        >
          New Portfolio
        </Link>
      </div>

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
          {portfolios.map((p) => (
            <div
              key={p.id}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-5"
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Created on {new Date(p.created_at).toLocaleDateString()}
                    </p>
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
                    {p.assets.map((a) => (
                      <div
                        key={a.id}
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
          ))}
        </div>
      )}
      </div>
    </AuthTeaserGate>
  );
}
