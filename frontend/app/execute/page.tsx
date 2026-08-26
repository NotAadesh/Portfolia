"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";

export default function BrokerExecutionPage() {
  const [loading, setLoading] = useState(false);
  const [basketData, setBasketData] = useState<any>(null);
  const [copiedKite, setCopiedKite] = useState(false);
  const [copiedAngel, setCopiedAngel] = useState(false);

  // Direct In-Page Order Execution State
  const [brokerMode, setBrokerMode] = useState<"PAPER_SIMULATION" | "ZERODHA_KITE" | "ANGELONE">("PAPER_SIMULATION");
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionReceipt, setExecutionReceipt] = useState<any>(null);

  // Every-Minute AI Health Sentinel State
  const [sentinelActive, setSentinelActive] = useState(true);
  const [sentinelData, setSentinelData] = useState<any>(null);
  const [secondsUntilScan, setSecondsUntilScan] = useState(60);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [activeHoldings, setActiveHoldings] = useState<any[]>([]);
  const [activeTargetWeights, setActiveTargetWeights] = useState<Record<string, number>>({});

  // Fallback defaults
  const defaultOrders = [
    { ticker: "RELIANCE.NS", company_name: "Reliance Industries", action: "SELL", quantity: 15, current_price: 2980 },
    { ticker: "TCS.NS", company_name: "Tata Consultancy Services", action: "SELL", quantity: 9, current_price: 4150 },
    { ticker: "ICICIBANK.NS", company_name: "ICICI Bank", action: "BUY", quantity: 45, current_price: 1210 },
    { ticker: "LT.NS", company_name: "Larsen & Toubro", action: "BUY", quantity: 12, current_price: 3620 },
    { ticker: "INFY.NS", company_name: "Infosys", action: "BUY", quantity: 24, current_price: 1820 },
  ];

  const defaultHoldings = [
    { ticker: "RELIANCE.NS", company_name: "Reliance Industries", current_value: 104300 },
    { ticker: "TCS.NS", company_name: "Tata Consultancy Services", current_value: 103750 },
    { ticker: "HDFCBANK.NS", company_name: "HDFC Bank", current_value: 65600 },
    { ticker: "ICICIBANK.NS", company_name: "ICICI Bank", current_value: 54450 },
  ];

  const defaultTargetWeights: Record<string, number> = {
    "RELIANCE.NS": 0.22,
    "TCS.NS": 0.18,
    "ICICIBANK.NS": 0.20,
    "LT.NS": 0.16,
    "INFY.NS": 0.14,
    "BHARTIARTL.NS": 0.10,
  };

  const loadBasketAndSentinel = async () => {
    setLoading(true);

    let orders = defaultOrders;
    let holdings = defaultHoldings;
    let targetWeights = defaultTargetWeights;

    try {
      const storedOrders = localStorage.getItem("rebalance_orders");
      if (storedOrders) orders = JSON.parse(storedOrders);

      const storedHoldings = localStorage.getItem("imported_holdings");
      if (storedHoldings) holdings = JSON.parse(storedHoldings);

      const bState = localStorage.getItem("portfolio_builder_state");
      if (bState) {
        const parsedB = JSON.parse(bState);
        if (parsedB.result?.optimal_weights) {
          const mapped: Record<string, number> = {};
          Object.entries(parsedB.result.optimal_weights).forEach(([t, w]: any) => {
            mapped[t] = Number(w) / 100;
          });
          targetWeights = mapped;
        }
      }
    } catch (e) {
      console.error(e);
    }

    setActiveOrders(orders);
    setActiveHoldings(holdings);
    setActiveTargetWeights(targetWeights);

    try {
      // 1. Generate Broker Baskets
      const basketRes = await fetch(`${API_BASE_URL}/api/v1/lifecycle/execute/generate-basket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders }),
      });
      const bData = await basketRes.json();
      setBasketData(bData);

      // 2. Initial Sentinel Health Audit
      const sentinelRes = await fetch(`${API_BASE_URL}/api/v1/lifecycle/sentinel/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdings,
          target_weights: targetWeights,
        }),
      });
      const sData = await sentinelRes.json();
      setSentinelData(sData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBasketAndSentinel();
  }, []);

  // 60-Second Real-Time Pulse Timer
  useEffect(() => {
    if (!sentinelActive) return;

    const interval = setInterval(() => {
      setSecondsUntilScan((prev) => {
        if (prev <= 1) {
          triggerSentinelScan();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sentinelActive, activeHoldings, activeTargetWeights]);

  const triggerSentinelScan = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/lifecycle/sentinel/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdings: activeHoldings.length > 0 ? activeHoldings : defaultHoldings,
          target_weights: Object.keys(activeTargetWeights).length > 0 ? activeTargetWeights : defaultTargetWeights,
        }),
      });
      const data = await res.json();
      setSentinelData(data);
    } catch (e) {
      console.error("Sentinel scan error:", e);
    }
  };

  // Direct In-Page Order Booking
  const handleDirectExecute = async () => {
    setIsExecuting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/lifecycle/execute/direct-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orders: activeOrders.length > 0 ? activeOrders : defaultOrders,
          broker_mode: brokerMode,
        }),
      });
      const data = await res.json();
      setExecutionReceipt(data);

      // Re-trigger sentinel to show newly balanced state
      setTimeout(() => {
        triggerSentinelScan();
      }, 500);
    } catch (err) {
      console.error("Order execution failed:", err);
      alert("Order placement encountered an issue. Please verify network connection.");
    } finally {
      setIsExecuting(false);
    }
  };

  const copyKiteJSON = () => {
    if (!basketData?.zerodha_kite_basket) return;
    navigator.clipboard.writeText(JSON.stringify(basketData.zerodha_kite_basket, null, 2));
    setCopiedKite(true);
    setTimeout(() => setCopiedKite(false), 2500);
  };

  const copyAngelJSON = () => {
    if (!basketData?.angelone_smartapi_basket) return;
    navigator.clipboard.writeText(JSON.stringify(basketData.angelone_smartapi_basket, null, 2));
    setCopiedAngel(true);
    setTimeout(() => setCopiedAngel(false), 2500);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider font-mono">
              Broker Direct Execution
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Order Execution & Real-Time Performance Sentinel</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Book orders directly in-page, dispatch to Zerodha Kite / AngelOne SmartAPI, and monitor real-time constituent health every 60 seconds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSentinelActive(!sentinelActive)}
            className={`px-3 py-1.5 rounded-lg border font-mono text-xs flex items-center gap-2 transition-all ${
              sentinelActive
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${sentinelActive ? "bg-emerald-400 animate-pulse" : "bg-slate-400"}`}></span>
            <span>{sentinelActive ? `Sentinel Active (${secondsUntilScan}s)` : "Sentinel Paused"}</span>
          </button>

          <button
            onClick={triggerSentinelScan}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono px-3 py-1.5 rounded-lg border border-slate-200"
          >
            Scan Now
          </button>
        </div>
      </div>

      {/* 1. DIRECT IN-PAGE ORDER BOOKING TERMINAL */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-wrap justify-between items-center gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase">
                Direct Trading Desk
              </span>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                Order Placement & Dispatch Terminal
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Execute buy and sell rebalance baskets immediately with automated transaction cost receipts.
            </p>
          </div>

          {/* Broker Selector Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-mono">
            <button
              onClick={() => setBrokerMode("PAPER_SIMULATION")}
              className={`px-3 py-1.5 rounded-md font-bold transition-all ${
                brokerMode === "PAPER_SIMULATION" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Paper Simulation
            </button>
            <button
              onClick={() => setBrokerMode("ZERODHA_KITE")}
              className={`px-3 py-1.5 rounded-md font-bold transition-all ${
                brokerMode === "ZERODHA_KITE" ? "bg-white text-orange-600 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Zerodha Kite Web
            </button>
            <button
              onClick={() => setBrokerMode("ANGELONE")}
              className={`px-3 py-1.5 rounded-md font-bold transition-all ${
                brokerMode === "ANGELONE" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              AngelOne SmartAPI
            </button>
          </div>
        </div>

        {/* Live Staged Order Basket Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-200 font-mono">
              <tr>
                <th className="px-4 py-3">Security</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3 text-right">Live LTP</th>
                <th className="px-4 py-3 text-right">Estimated Traded Value</th>
                <th className="px-4 py-3 text-right">Est. STT + Brokerage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeOrders.map((o: any, idx: number) => {
                const price = o.current_price || 1000;
                const val = o.quantity * price;
                const charges = Math.min(20, val * 0.0003) + val * 0.001;
                return (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900 block">{o.company_name || o.ticker}</span>
                      <span className="font-mono text-[10px] text-slate-400">{o.ticker}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono ${
                          o.action === "BUY" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {o.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">{o.quantity}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">₹{price}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">₹{val.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-[10px] text-slate-500">₹{charges.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Execution Actions & Deep Links */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap justify-between items-center gap-4">
          <div className="text-xs font-mono text-slate-600">
            <span>Total Orders: <strong>{activeOrders.length}</strong></span> • 
            <span className="ml-2">Mode: <strong className="text-slate-900">{brokerMode}</strong></span>
          </div>

          <div className="flex items-center gap-3">
            {brokerMode === "PAPER_SIMULATION" && (
              <button
                onClick={handleDirectExecute}
                disabled={isExecuting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs font-bold px-6 py-2.5 rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <span>{isExecuting ? "Executing Basket..." : `⚡ Confirm & Execute ${activeOrders.length} Orders`}</span>
              </button>
            )}

            {brokerMode === "ZERODHA_KITE" && (
              <div className="flex items-center gap-2">
                <button
                  onClick={copyKiteJSON}
                  className="bg-[#ff5722] hover:bg-[#f4511e] text-white font-mono text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm"
                >
                  {copiedKite ? "Copied Kite JSON!" : "Copy Kite Multi-Order Payload"}
                </button>
                <a
                  href="https://kite.zerodha.com"
                  target="_blank"
                  rel="noreferrer"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm"
                >
                  Open Kite Web ↗
                </a>
              </div>
            )}

            {brokerMode === "ANGELONE" && (
              <div className="flex items-center gap-2">
                <button
                  onClick={copyAngelJSON}
                  className="bg-blue-700 hover:bg-blue-800 text-white font-mono text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm"
                >
                  {copiedAngel ? "Copied SmartAPI JSON!" : "Copy SmartAPI Order Payload"}
                </button>
                <a
                  href="https://trade.angelone.in"
                  target="_blank"
                  rel="noreferrer"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm"
                >
                  Open AngelOne Web ↗
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Execution Receipt Box */}
        {executionReceipt && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 animate-in fade-in duration-200 font-mono">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                ✅ Execution Status: {executionReceipt.execution_status} ({executionReceipt.broker_mode})
              </span>
              <span className="text-[11px] text-emerald-700">{executionReceipt.timestamp}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-emerald-200">
                <span className="text-[10px] text-slate-400 block uppercase">Filled Orders</span>
                <span className="font-bold text-slate-900">{executionReceipt.total_orders_executed} Orders</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-emerald-200">
                <span className="text-[10px] text-slate-400 block uppercase">Total Traded Volume</span>
                <span className="font-bold text-slate-900">₹{executionReceipt.total_traded_volume?.toLocaleString()}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-emerald-200">
                <span className="text-[10px] text-slate-400 block uppercase">Total Turnover Fees</span>
                <span className="font-bold text-slate-900">₹{executionReceipt.total_turnover_charges}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. REAL-TIME AI PERFORMANCE SENTINEL */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-wrap justify-between items-center gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                Live Markowitz Health Sentinel & Drift Scanner
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Audits real-time allocation drift, momentum fatigue, and emergency stock swap triggers every 60 seconds.
            </p>
          </div>

          <div className="text-xs font-mono text-slate-500">
            Next scan in: <strong className="text-slate-900 font-bold">{secondsUntilScan}s</strong>
          </div>
        </div>

        {sentinelData && (
          <div className="space-y-4">
            {/* Sentinel Verdict Banner */}
            <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-wrap justify-between items-center gap-3 font-mono">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Health Score: {sentinelData.overall_health_score}/100
                  </span>
                  <span className="text-[10px] text-slate-400">Last Scanned: {sentinelData.scan_time}</span>
                </div>
                <p className="text-xs text-slate-200">{sentinelData.sentinel_verdict}</p>
              </div>

              {sentinelData.needs_rebalance && (
                <Link
                  href="/rebalance"
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  Quick Rebalance →
                </Link>
              )}
            </div>

            {/* Constituents Diagnostic Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-200 font-mono">
                  <tr>
                    <th className="px-4 py-3">Asset</th>
                    <th className="px-4 py-3 text-right">Current Weight</th>
                    <th className="px-4 py-3 text-right">Target Frontier</th>
                    <th className="px-4 py-3 text-right">Allocation Drift</th>
                    <th className="px-4 py-3 text-right">Intraday Momentum</th>
                    <th className="px-4 py-3">Health Status</th>
                    <th className="px-4 py-3">Sentinel Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sentinelData.diagnostics?.map((d: any, idx: number) => {
                    const isDriftHigh = Math.abs(d.drift_pct) >= 5.0;
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-900 block">{d.company_name}</span>
                          <span className="font-mono text-[10px] text-slate-400">{d.ticker}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                          {d.current_weight_pct}%
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500">
                          {d.target_weight_pct}%
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-bold ${isDriftHigh ? "text-amber-600" : "text-slate-700"}`}>
                          {d.drift_pct > 0 ? `+${d.drift_pct}%` : `${d.drift_pct}%`}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-semibold ${d.intraday_change_pct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {d.intraday_change_pct > 0 ? `+${d.intraday_change_pct}%` : `${d.intraday_change_pct}%`}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono ${
                              d.status === "HEALTHY"
                                ? "bg-emerald-100 text-emerald-800"
                                : d.status === "OVERWEIGHT"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {d.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700">
                          <span className="font-semibold text-slate-900 block">{d.action}</span>
                          <span className="text-[10px] text-slate-400">{d.reason}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
