"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, API_BASE_URL } from "@/lib/api";

export default function PortfolioImportPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"CLIPBOARD" | "QUICK_TEXT" | "PRESETS" | "CSV">("CLIPBOARD");
  const [broker, setBroker] = useState("ZERODHA");
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [parsedData, setParsedData] = useState<any>(null);

  // Sample Zerodha Screen Copy Placeholder
  const sampleZerodhaText = `RELIANCE\t20\t2850.00\t2024-01-15
TCS\t15\t3920.00\t2023-10-20
HDFC Bank\t30\t1540.00\t2024-03-05
Infosys\t25\t1680.00\t2023-12-10
Tata Motors 40 shares @ 940`;

  // Superstar & Mutual Fund Presets
  const presets = [
    {
      name: "Parag Parikh Flexi Cap Mimic",
      desc: "Top Indian equity holdings of India's flagship flexi-cap fund.",
      text: `HDFCBANK\t45\t1600\t2023-05-10
ITC\t80\t450\t2023-06-15
BAJFINANCE\t12\t6900\t2023-08-20
ICICIBANK\t50\t1100\t2023-09-12
TCS\t15\t3850\t2023-11-04`,
    },
    {
      name: "Rakesh Jhunjhunwala Basket",
      desc: "Iconic consumer and banking high-conviction compounders.",
      text: `TITAN\t35\t3200\t2022-04-10
TATAMOTORS\t60\t880\t2023-01-15
CANBK\t100\t110\t2023-07-20
TATACOMM\t25\t1750\t2023-09-05`,
    },
    {
      name: "Nifty 50 Core Titan Basket",
      desc: "Top heavyweights powering India's GDP expansion.",
      text: `RELIANCE\t25\t2800\t2023-02-10
ICICIBANK\t40\t1050\t2023-04-12
LT\t20\t3400\t2023-08-18
INFY\t35\t1620\t2023-10-15
BHARTIARTL\t40\t1420\t2024-01-20`,
    },
  ];

  const handleParse = async (textToParse = inputText) => {
    if (!textToParse.trim()) {
      setError("Please paste or enter some stock holding text.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/lifecycle/import/smart-parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_text: textToParse,
          broker: broker,
        }),
      });

      const data = await res.json();
      if (!data.holdings || data.holdings.length === 0) {
        setError("Could not parse any recognized Indian stock tickers. Try selecting a preset or checking the text format.");
        setLoading(false);
        return;
      }

      setParsedData(data);

      // Save imported holdings to localStorage for instant downstream use
      localStorage.setItem("imported_holdings", JSON.stringify(data.holdings));
      localStorage.setItem(
        "portfolio_data",
        JSON.stringify({
          tickers: data.holdings.map((h: any) => h.ticker),
          investment: data.total_current_value,
          years: 3,
          weights: data.holdings.map((h: any) => h.current_value / data.total_current_value),
        })
      );
    } catch (err) {
      console.error(err);
      setError("Failed to connect to parser service.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setInputText(content);
      handleParse(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
              Frictionless
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Import Existing Demat Holdings</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Zero file downloads required. Copy-paste directly from Zerodha Kite, Groww, AngelOne or pick an institutional preset.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setInputText(sampleZerodhaText);
              handleParse(sampleZerodhaText);
            }}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-2 rounded-lg transition-colors"
          >
            ⚡ Load Sample Demat Basket
          </button>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("CLIPBOARD")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === "CLIPBOARD" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          📋 Screen Copy-Paste (Zero Download)
        </button>

        <button
          onClick={() => setActiveTab("PRESETS")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === "PRESETS" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          🏛️ Superstar & Mutual Fund Presets
        </button>

        <button
          onClick={() => setActiveTab("QUICK_TEXT")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === "QUICK_TEXT" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          ⚡ Multi-Ticker String (e.g. RELIANCE, TCS)
        </button>

        <button
          onClick={() => setActiveTab("CSV")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === "CSV" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          📂 CSV File Drop
        </button>
      </div>

      {/* TAB 1: CLIPBOARD PASTE */}
      {activeTab === "CLIPBOARD" && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Paste Broker Table / Holdings Screen</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Select your holdings rows on Zerodha Kite, Groww, or AngelOne web, press Cmd+C / Ctrl+C, and paste below:
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-semibold">Source Broker:</span>
              <select
                value={broker}
                onChange={(e) => setBroker(e.target.value)}
                className="border border-slate-200 text-xs px-2.5 py-1.5 rounded-lg bg-white outline-none"
              >
                <option value="ZERODHA">Zerodha Kite</option>
                <option value="GROWW">Groww</option>
                <option value="ANGELONE">AngelOne</option>
                <option value="UPSTOX">Upstox</option>
              </select>
            </div>
          </div>

          <textarea
            rows={6}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste your copied holding rows here... Example:&#10;RELIANCE  20  2850.00  2024-01-15&#10;TCS  15  3920.00  2023-10-20&#10;HDFC Bank 30 shares @ 1540"
            className="w-full font-mono text-xs border border-slate-200 p-3.5 rounded-lg outline-none focus:border-slate-800"
          />

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setInputText("")}
              className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
            >
              Clear Box
            </button>

            <button
              onClick={() => handleParse()}
              disabled={loading || !inputText.trim()}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Parsing Live LTP & P&L..." : "Smart Parse & Enrich Live Prices →"}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: PRESETS */}
      {activeTab === "PRESETS" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {presets.map((p, idx) => (
            <div
              key={idx}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between"
            >
              <div>
                <h3 className="text-xs font-bold text-slate-900">{p.name}</h3>
                <p className="text-[11px] text-slate-500 mt-1">{p.desc}</p>
                <pre className="mt-3 bg-slate-50 p-2.5 rounded-lg text-[10px] font-mono text-slate-600 overflow-x-auto">
                  {p.text}
                </pre>
              </div>

              <button
                onClick={() => {
                  setInputText(p.text);
                  handleParse(p.text);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-lg transition-colors"
              >
                1-Click Load & Analyze →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: QUICK TEXT */}
      {activeTab === "QUICK_TEXT" && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Quick Multi-Ticker Input</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Enter Indian stock symbols separated by commas (e.g. RELIANCE, TCS, INFY, HDFCBANK, TATAMOTORS, ITC):
            </p>
          </div>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="RELIANCE, TCS, HDFCBANK, INFY, TATAMOTORS, ICICIBANK, LT"
            className="w-full border border-slate-200 px-4 py-2.5 rounded-lg text-xs font-semibold outline-none focus:border-slate-800"
          />

          <div className="flex justify-end">
            <button
              onClick={() => handleParse()}
              disabled={loading || !inputText.trim()}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Fetching NSE Quotes..." : "Generate Equal-Weighted Demat Basket →"}
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: CSV UPLOAD */}
      {activeTab === "CSV" && (
        <div className="bg-white p-8 rounded-xl border-2 border-dashed border-slate-200 hover:border-slate-400 text-center space-y-3 cursor-pointer">
          <input
            type="file"
            accept=".csv,.txt"
            onChange={handleFileUpload}
            className="hidden"
            id="csv-file-input"
          />
          <label htmlFor="csv-file-input" className="cursor-pointer block space-y-2">
            <div className="w-12 h-12 mx-auto bg-slate-100 rounded-full flex items-center justify-center text-xl">
              📂
            </div>
            <p className="text-xs font-bold text-slate-900">Click to upload or drag & drop Zerodha / Groww CSV</p>
            <p className="text-[11px] text-slate-400">Supports standard holdings CSV, CAS PDF/text, or broker exports</p>
          </label>
        </div>
      )}

      {/* ERROR */}
      {error && <p className="text-xs text-rose-600 bg-rose-50 p-3.5 rounded-xl border border-rose-200">{error}</p>}

      {/* PARSED HEALTH CHECK RESULTS */}
      {parsedData && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Invested</span>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">
                ₹{Number(parsedData.total_invested).toLocaleString()}
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5">{parsedData.holdings_count} Securities</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Market Value</span>
              <h2 className="text-2xl font-bold text-blue-600 mt-1">
                ₹{Number(parsedData.total_current_value).toLocaleString()}
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5">Live NSE Pricing</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unrealized P&L</span>
              <h2 className={`text-2xl font-bold mt-1 ${parsedData.total_unrealized_pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {parsedData.total_unrealized_pnl >= 0 ? "+" : ""}₹{Number(parsedData.total_unrealized_pnl).toLocaleString()}
              </h2>
              <p className={`text-[10px] font-bold mt-0.5 ${parsedData.total_unrealized_pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {parsedData.total_unrealized_pnl >= 0 ? "▲" : "▼"} {parsedData.total_unrealized_pnl_percent}% Return
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Portfolio Health</span>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">
                {parsedData.holdings_count >= 5 ? "Diversified" : "Concentrated"}
              </h2>
              <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Ready for Tax Optimization</p>
            </div>
          </div>

          {/* Holdings Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Parsed Demat Assets ({parsedData.holdings.length})
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">Click any row to inspect</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Security</th>
                    <th className="px-4 py-3">Sector</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Avg Cost</th>
                    <th className="px-4 py-3 text-right">LTP (₹)</th>
                    <th className="px-4 py-3 text-right">Cur. Value (₹)</th>
                    <th className="px-4 py-3 text-right">P&L (₹ / %)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedData.holdings.map((h: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-900 block">{h.company_name}</span>
                        <span className="font-mono text-[10px] text-slate-400">{h.ticker}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-medium">{h.sector}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-700">{h.quantity}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">₹{h.avg_buy_price}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">₹{h.current_price}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">₹{h.current_value.toLocaleString()}</td>
                      <td className={`px-4 py-3 text-right font-mono font-bold ${h.unrealized_pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {h.unrealized_pnl >= 0 ? "+" : ""}₹{h.unrealized_pnl.toLocaleString()} ({h.unrealized_pnl_percent}%)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Bar: Next Steps in Lifecycle */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-4">
            <div>
              <p className="text-xs font-bold text-slate-900">What would you like to do with these imported holdings?</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Proceed directly to Tax-Loss Rebalancing, Multi-Portfolio Comparison, or Markowitz Optimization.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/compare"
                className="border border-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                👥 Compare vs. Nifty 50 & Friends →
              </Link>

              <Link
                href="/rebalance"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-lg transition-colors shadow-sm"
              >
                ⚖️ Tax & Exit-Load Rebalance →
              </Link>

              <Link
                href="/portfolio"
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-2.5 rounded-lg transition-colors shadow-sm"
              >
                📊 Markowitz MPT Optimizer →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
