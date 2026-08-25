"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StockChart from "@/components/StockChart";
import { API_BASE_URL } from "@/lib/api";

export default function Home() {
  const router = useRouter();

  const [ticker, setTicker] = useState("TCS.NS");
  const [companyName, setCompanyName] = useState("TCS");

  const [data, setData] = useState<any>(null);
  const [range, setRange] = useState("1Y");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [companies, setCompanies] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ticker }),
      });

      const result = await res.json();
      if (result.error) setError(result.error);
      else setData(result);
    } catch {
      setError("Failed to fetch market data");
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    fetch(`${API_BASE_URL}/companies`)
      .then((res) => res.json())
      .then((data) => {
        setCompanies(data);
        setFiltered(data.slice(0, 10));
      });
  }, []);

  const handleSearch = (value: string) => {
    setQuery(value);
    const results = companies
      .filter((c) =>
        c.name.toLowerCase().includes(value.toLowerCase())
      )
      .slice(0, 10);
    setFiltered(results);
  };

  const getFilteredData = () => {
    if (!data?.prices) return { prices: [], dates: [] };

    let length = data.prices.length;
    if (range === "1M") length = 22;
    if (range === "6M") length = 126;
    if (range === "1Y") length = 252;
    if (range === "5Y") length = 252 * 5;
    if (range === "MAX") length = data.prices.length;

    return {
      prices: data.prices.slice(-length),
      dates: data.dates.slice(-length),
    };
  };

  const filteredData = getFilteredData();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 🚀 BEGINNER-FRIENDLY QUICK LAUNCH CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pathway 1: Build Goal Portfolio */}
        <div
          onClick={() => router.push("/onboarding")}
          className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl border border-slate-700 shadow-md cursor-pointer hover:border-blue-500 transition-all flex flex-col justify-between space-y-4 group"
        >
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded uppercase tracking-wider">
                Guided Wizard
              </span>
              <span className="text-blue-400 text-xs font-bold group-hover:translate-x-1 transition-transform">
                Start Goal →
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-2">🎯 Build a Goal-Driven Portfolio</h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Define a financial target (e.g. ₹25 Lakhs) and automatically generate 3 optimal Markowitz baseline portfolios matching your risk tolerance.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-700/60 text-[11px] text-slate-400">
            <span>✨ 3-Step Wizard</span>
            <span>•</span>
            <span>📈 Lumpsum / SIP</span>
            <span>•</span>
            <span>🎲 Goal Probability</span>
          </div>
        </div>

        {/* Pathway 2: Import Existing Demat Holdings */}
        <div
          onClick={() => router.push("/import")}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-slate-800 transition-all flex flex-col justify-between space-y-4 group"
        >
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded uppercase tracking-wider">
                Frictionless Import
              </span>
              <span className="text-slate-900 text-xs font-bold group-hover:translate-x-1 transition-transform">
                Import Demat →
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-2">📥 Import & Optimize Existing Holdings</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Zero file downloads. Copy-paste your holdings screen directly from Zerodha Kite, Groww, or AngelOne to run instant tax-loss and risk checks.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
            <span>📋 Clipboard Paste</span>
            <span>•</span>
            <span>⚖️ 2024 Tax Optimizer</span>
            <span>•</span>
            <span>⚡ 1-Click Kite Basket</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Market Overview</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">{companyName} ({ticker})</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative">
            <input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search Indian equities (NSE)..."
              className="border border-slate-200 px-3.5 py-2 rounded-lg text-xs w-64 outline-none focus:border-slate-800"
            />

            {query && filtered.length > 0 && (
              <div className="absolute bg-white border border-slate-200 mt-1 w-full max-h-56 overflow-y-auto rounded-lg shadow-xl z-50 divide-y divide-slate-100">
                {filtered.map((c, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setTicker(c.ticker);
                      setCompanyName(c.name);
                      setQuery(c.name);
                      setFiltered([]);
                    }}
                    className="px-3.5 py-2 hover:bg-slate-50 cursor-pointer text-xs font-medium text-slate-800 flex justify-between"
                  >
                    <span>{c.name}</span>
                    <span className="font-mono text-[11px] text-slate-400">{c.ticker}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={fetchData}
            className="bg-slate-900 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Update
          </button>

          <button
            onClick={() =>
              router.push(
                `/analysis?ticker=${ticker}&name=${companyName}`
              )
            }
            className="border border-slate-200 text-slate-700 text-xs font-medium px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Full Analysis
          </button>
        </div>
      </div>

      {loading && <p className="text-xs text-slate-400">Synchronizing market data...</p>}
      {error && <p className="text-xs text-rose-600">{error}</p>}

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Revenue (Annualized)</p>
          <h2 className="text-xl font-bold text-slate-900 mt-1">{data?.revenue || "—"}</h2>
          <p className="text-[10px] text-slate-400 mt-1">Consolidated top-line</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Profit</p>
          <h2 className="text-xl font-bold text-slate-900 mt-1">{data?.net_profit || "—"}</h2>
          <p className="text-[10px] text-slate-400 mt-1">Consolidated bottom-line</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Return on Equity</p>
          <h2 className="text-xl font-bold text-emerald-600 mt-1">{data?.roe || "—"}</h2>
          <p className="text-[10px] text-slate-400 mt-1">Shareholder capital yield</p>
        </div>
      </div>

      {/* Range Filter Controls */}
      <div className="flex justify-between items-center">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {["1M", "6M", "1Y", "5Y", "MAX"].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                range === r
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[420px]">
        {data?.prices ? (
          <StockChart
            prices={filteredData.prices}
            dates={filteredData.dates}
          />
        ) : (
          <p className="text-slate-400 text-xs text-center mt-28">
            Chart data unavailable
          </p>
        )}
      </div>
    </div>
  );
}