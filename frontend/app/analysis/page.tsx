"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import TrendChart from "@/components/TrendChart";
import AINewsSentimentRadar from "@/components/AINewsSentimentRadar";
import LiveNewsFeed from "@/components/LiveNewsFeed";
import AICopilotDrawer from "@/components/AICopilotDrawer";
import { apiFetch, API_BASE_URL } from "@/lib/api";

function AnalysisContent() {
  const params = useSearchParams();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [ticker, setTicker] = useState("TCS.NS");
  const [companyName, setCompanyName] = useState("TCS");

  const [data, setData] = useState<any>(null);
  const [aiData, setAiData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const [companies, setCompanies] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState<any[]>([]);

  // Copilot initial prompt trigger state
  const [copilotQuestion, setCopilotQuestion] = useState("");

  // URL Sync
  useEffect(() => {
    const t = params.get("ticker");
    const n = params.get("name");

    if (t) setTicker(t);
    if (n) {
      setCompanyName(n);
      setQuery(n);
    }
  }, [params]);

  // Fetch standard financial statements & ratios
  const fetchFinancials = async (currentTicker = ticker) => {
    setLoading(true);
    try {
      const result = await apiFetch<any>("/financial-analysis", {
        method: "POST",
        body: JSON.stringify({ ticker: currentTicker }),
      });
      setData(result);
    } catch (err) {
      console.error("Financial analysis error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch real AI synthesis & news feed
  const fetchAISynthesis = async (currentTicker = ticker, currentName = companyName) => {
    setAiLoading(true);
    try {
      const result = await apiFetch<any>("/api/v1/ai/synthesize", {
        method: "POST",
        body: JSON.stringify({ ticker: currentTicker, company_name: currentName }),
      });
      setAiData(result);
    } catch (err) {
      console.error("AI synthesis error:", err);
    } finally {
      setAiLoading(false);
    }
  };

  // Trigger fetch whenever ticker or companyName changes
  useEffect(() => {
    fetchFinancials(ticker);
    fetchAISynthesis(ticker, companyName);
  }, [ticker, companyName]);

  // Fetch Indian company search list
  useEffect(() => {
    fetch(`${API_BASE_URL}/companies`)
      .then((res) => res.json())
      .then((data) => {
        setCompanies(data);
        setFiltered(data.slice(0, 10));
      })
      .catch((err) => console.error(err));
  }, []);

  const handleSearch = (value: string) => {
    setQuery(value);
    const results = companies
      .filter((c) => c.name.toLowerCase().includes(value.toLowerCase()))
      .slice(0, 10);
    setFiltered(results);
  };

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setFiltered([]);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const download = (type: string) => {
    window.open(`${API_BASE_URL}/download/${type}/${ticker}`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & Search Bar */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Analysis & Synthesis</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">{companyName} ({ticker})</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Company Search Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search Indian Stock (e.g. SBI, Reliance)..."
              className="border border-slate-200 px-3.5 py-2 rounded-lg w-64 outline-none focus:border-slate-800 text-xs"
            />

            {filtered.length > 0 && (
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

          {/* Statement Export Buttons */}
          <div className="flex gap-1.5">
            <button
              onClick={() => download("income")}
              className="border border-slate-200 text-slate-700 text-xs px-3 py-2 rounded-lg hover:bg-slate-50 font-medium transition-colors"
            >
              Income CSV
            </button>
            <button
              onClick={() => download("balance")}
              className="border border-slate-200 text-slate-700 text-xs px-3 py-2 rounded-lg hover:bg-slate-50 font-medium transition-colors"
            >
              Balance CSV
            </button>
            <button
              onClick={() => download("cashflow")}
              className="border border-slate-200 text-slate-700 text-xs px-3 py-2 rounded-lg hover:bg-slate-50 font-medium transition-colors"
            >
              Cashflow CSV
            </button>
          </div>
        </div>
      </div>

      {/* Loading Indicator */}
      {(loading || aiLoading) && (
        <div className="p-3.5 bg-slate-100 border border-slate-200 text-slate-700 text-xs rounded-xl flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>
          <span>Synthesizing real-time filings, live media & Google Gemini models for {companyName}...</span>
        </div>
      )}

      {/* Key Financial KPIs */}
      {data?.ratios && (
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Return on Equity (ROE)</p>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">{data.ratios.roe}%</h2>
            <p className="text-[10px] text-slate-400 mt-1">Capital reinvestment efficiency</p>
          </div>

          <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Return on Assets (ROA)</p>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">{data.ratios.roa}%</h2>
            <p className="text-[10px] text-slate-400 mt-1">Asset utilization rate</p>
          </div>

          <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Profit Margin</p>
            <h2 className="text-2xl font-bold text-blue-600 mt-1">{data.ratios.margin}%</h2>
            <p className="text-[10px] text-slate-400 mt-1">Bottom-line operating margin</p>
          </div>
        </div>
      )}

      {/* Revenue & Profit Historical Charts */}
      {data?.years && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm h-[360px]">
            <TrendChart
              labels={data.years}
              dataPoints={data.revenue_trend}
              title="5-Year Revenue Trend (₹ Cr)"
            />
          </div>

          <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm h-[360px]">
            <TrendChart
              labels={data.years}
              dataPoints={data.profit_trend}
              title="5-Year Net Profit Trend (₹ Cr)"
            />
          </div>
        </div>
      )}

      {/* 🔥 PHASE 5: REAL AI NEWS SYNTHESIS & SENTIMENT RADAR (Google Gemini) */}
      {aiData?.synthesis && (
        <AINewsSentimentRadar
          synthesis={aiData.synthesis}
          companyName={companyName}
          ticker={ticker}
          onAskCopilot={(q) => setCopilotQuestion(q)}
        />
      )}

      {/* Grid: Live News Feed (Left) & Financial AI Copilot (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live News Feed */}
        <LiveNewsFeed
          news={aiData?.news || []}
          companyName={companyName}
          ticker={ticker}
        />

        {/* Interactive Financial AI Copilot Drawer */}
        <AICopilotDrawer
          ticker={ticker}
          companyName={companyName}
          initialQuestion={copilotQuestion}
        />
      </div>
    </div>
  );
}

export default function Analysis() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 text-xs">Loading analysis...</div>}>
      <AnalysisContent />
    </Suspense>
  );
}