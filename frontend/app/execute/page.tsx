"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch, API_BASE_URL } from "@/lib/api";

export default function BrokerExecutionPage() {
  const [loading, setLoading] = useState(false);
  const [basketData, setBasketData] = useState<any>(null);
  const [driftData, setDriftData] = useState<any>(null);
  const [copiedKite, setCopiedKite] = useState(false);
  const [copiedAngel, setCopiedAngel] = useState(false);

  // Sample order fallback
  const defaultOrders = [
    { ticker: "RELIANCE.NS", action: "SELL", quantity: 15, current_price: 2980 },
    { ticker: "TCS.NS", action: "SELL", quantity: 9, current_price: 4150 },
    { ticker: "ICICIBANK.NS", action: "BUY", quantity: 45, current_price: 1210 },
    { ticker: "LT.NS", action: "BUY", quantity: 12, current_price: 3620 },
    { ticker: "INFY.NS", action: "BUY", quantity: 24, current_price: 1820 },
  ];

  const defaultHoldings = [
    { ticker: "RELIANCE.NS", company_name: "Reliance Industries", current_value: 104300 },
    { ticker: "TCS.NS", company_name: "Tata Consultancy Services", current_value: 103750 },
    { ticker: "HDFCBANK.NS", company_name: "HDFC Bank", current_value: 65600 },
  ];

  const defaultTargetWeights = {
    "RELIANCE.NS": 0.22,
    "TCS.NS": 0.18,
    "ICICIBANK.NS": 0.20,
    "LT.NS": 0.16,
    "INFY.NS": 0.14,
    "BHARTIARTL.NS": 0.10,
  };

  const loadBasketAndDrift = async () => {
    setLoading(true);

    let orders = defaultOrders;
    try {
      const stored = localStorage.getItem("rebalance_orders");
      if (stored) orders = JSON.parse(stored);
    } catch {}

    try {
      // 1. Generate Broker Baskets
      const basketRes = await fetch(`${API_BASE_URL}/api/v1/lifecycle/execute/generate-basket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders }),
      });
      const bData = await basketRes.json();
      setBasketData(bData);

      // 2. Check Drift
      const driftRes = await fetch(`${API_BASE_URL}/api/v1/lifecycle/drift-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdings: defaultHoldings,
          target_weights: defaultTargetWeights,
          threshold: 0.05,
        }),
      });
      const dData = await driftRes.json();
      setDriftData(dData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBasketAndDrift();
  }, []);

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
            <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
              Automated Execution
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Broker Execution & Drift Engine</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Export rebalance orders directly to Zerodha Kite Connect & AngelOne SmartAPI, and monitor weekly portfolio drift.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-bold text-slate-700">Drift Sentinel: Active</span>
        </div>
      </div>

      {/* WEEKLY DRIFT MONITORING CARD */}
      {driftData && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-base">📡</span>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Portfolio Allocation Drift Sentinel
              </h2>
            </div>
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                driftData.has_drift
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {driftData.drift_alert_message}
            </span>
          </div>

          {/* Drifted Asset Meters */}
          {driftData.drifted_assets && driftData.drifted_assets.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {driftData.drifted_assets.map((a: any, idx: number) => (
                <div key={idx} className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-900">{a.company_name}</span>
                    <span
                      className={`font-bold font-mono ${
                        a.drift_pct > 0 ? "text-amber-600" : "text-blue-600"
                      }`}
                    >
                      {a.drift_pct > 0 ? `+${a.drift_pct}% Overweight` : `${a.drift_pct}% Underweight`}
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${a.drift_pct > 0 ? "bg-amber-500" : "bg-blue-500"}`}
                      style={{ width: `${Math.min(100, Math.abs(a.current_weight_pct))}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <span>Current: {a.current_weight_pct}%</span>
                    <span>Target: {a.target_weight_pct}%</span>
                    <span>Action: {a.recommended_action}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BROKER BASKETS CONTAINER */}
      {basketData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Zerodha Kite Connect Basket */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#ff5722] text-white font-bold text-xs flex items-center justify-center">
                    K
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Zerodha Kite Connect Basket</h3>
                </div>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                  {basketData.zerodha_kite_basket.length} Orders
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                1-click JSON order payload formatted for Zerodha Kite Web and Kite Connect API.
              </p>

              {/* Code Box */}
              <pre className="bg-slate-900 text-slate-100 font-mono text-[10px] p-3.5 rounded-lg max-h-56 overflow-y-auto leading-relaxed">
                {JSON.stringify(basketData.zerodha_kite_basket, null, 2)}
              </pre>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={copyKiteJSON}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-lg transition-colors shadow-sm"
              >
                {copiedKite ? "✓ Copied Kite Basket JSON!" : "📋 Copy Kite Basket JSON"}
              </button>

              <a
                href={basketData.copyable_kite_url}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 bg-[#ff5722] hover:bg-[#f4511e] text-white text-xs font-bold rounded-lg transition-colors text-center"
              >
                1-Click Kite →
              </a>
            </div>
          </div>

          {/* AngelOne SmartAPI Basket */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#0066cc] text-white font-bold text-xs flex items-center justify-center">
                    A
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">AngelOne SmartAPI Batch</h3>
                </div>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                  {basketData.angelone_smartapi_basket.length} Orders
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Batch order payload compatible with AngelOne SmartAPI Python SDK and Webhook executions.
              </p>

              {/* Code Box */}
              <pre className="bg-slate-900 text-slate-100 font-mono text-[10px] p-3.5 rounded-lg max-h-56 overflow-y-auto leading-relaxed">
                {JSON.stringify(basketData.angelone_smartapi_basket, null, 2)}
              </pre>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={copyAngelJSON}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-lg transition-colors shadow-sm"
              >
                {copiedAngel ? "✓ Copied AngelOne Payload!" : "📋 Copy SmartAPI Payload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS BANNER */}
      <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl flex items-start gap-3">
        <span className="text-xl">✅</span>
        <div className="text-xs text-emerald-900 space-y-1">
          <p className="font-bold">Lifecycle Phase Completed!</p>
          <p className="text-emerald-800 leading-relaxed">
            Your portfolio rebalance orders are generated and ready for direct broker execution. Portfolia will continuously monitor weekly drift against your target Markowitz Efficient Frontier.
          </p>
        </div>
      </div>
    </div>
  );
}
