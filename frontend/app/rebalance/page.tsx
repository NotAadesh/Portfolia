"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";

export default function TaxRebalancePage() {
  const [loading, setLoading] = useState(false);
  const [taxData, setTaxData] = useState<any>(null);

  // Default Holdings fallback if none in localStorage
  const defaultHoldings = [
    {
      ticker: "RELIANCE.NS",
      company_name: "Reliance Industries",
      quantity: 35,
      avg_buy_price: 2600,
      current_price: 2980,
      current_value: 104300,
      buy_date: "2024-02-15",
    },
    {
      ticker: "TCS.NS",
      company_name: "Tata Consultancy Services",
      quantity: 25,
      avg_buy_price: 3500,
      current_price: 4150,
      current_value: 103750,
      buy_date: "2023-08-10",
    },
    {
      ticker: "HDFCBANK.NS",
      company_name: "HDFC Bank",
      quantity: 40,
      avg_buy_price: 1550,
      current_price: 1640,
      current_value: 65600,
      buy_date: "2024-05-12",
    },
  ];

  const defaultTargetWeights = {
    "RELIANCE.NS": 0.22,
    "TCS.NS": 0.18,
    "ICICIBANK.NS": 0.20,
    "LT.NS": 0.16,
    "INFY.NS": 0.14,
    "BHARTIARTL.NS": 0.10,
  };

  const runTaxOptimizer = async () => {
    setLoading(true);
    let storedHoldings = defaultHoldings;
    let targetWeights = defaultTargetWeights;

    try {
      const raw = localStorage.getItem("imported_holdings");
      if (raw) storedHoldings = JSON.parse(raw);
    } catch {}

    try {
      const bState = localStorage.getItem("portfolio_builder_state");
      if (bState) {
        const parsedB = JSON.parse(bState);
        if (parsedB.result?.optimal_weights) {
          const mapped: any = {};
          Object.entries(parsedB.result.optimal_weights).forEach(([t, w]: any) => {
            mapped[t] = Number(w) / 100;
          });
          targetWeights = mapped;
        }
      }
    } catch {}

    const totalVal = storedHoldings.reduce((sum: number, h: any) => sum + (h.current_value || 0), 0) || 273650;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/lifecycle/rebalance/tax-optimizer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdings: storedHoldings,
          target_weights: targetWeights,
          total_portfolio_value: totalVal,
        }),
      });

      const data = await res.json();
      setTaxData(data);

      // Save orders for /execute page
      const allOrders = [...(data.sell_orders || []), ...(data.buy_orders || [])];
      localStorage.setItem("rebalance_orders", JSON.stringify(allOrders));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runTaxOptimizer();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider font-mono">
              Union Budget 2024
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Tax-Aware Portfolio Rebalancing</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Rebalance into Markowitz Efficient Frontier while minimizing Indian STCG (20%), LTCG (12.5%), and utilizing the ₹1.25L exemption.
          </p>
        </div>

        <Link
          href="/execute"
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors shadow-sm"
        >
          Proceed to Order Execution →
        </Link>
      </div>

      {/* TAX SUMMARY CARDS */}
      {taxData?.rebalance_summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Rebalance Volume</span>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">
              ₹{Number(taxData.rebalance_summary.total_sells_value + taxData.rebalance_summary.total_buys_value).toLocaleString()}
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
              ₹{taxData.rebalance_summary.total_sells_value.toLocaleString()} Sells • ₹{taxData.rebalance_summary.total_buys_value.toLocaleString()} Buys
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">LTCG Exemption Utilized</span>
            <h2 className="text-2xl font-bold text-emerald-600 mt-1">
              ₹{Number(taxData.rebalance_summary.ltcg_exemption_utilized).toLocaleString()}
            </h2>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
              100% Tax-Free under ₹1.25L Limit
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tax-Loss Harvesting Offset</span>
            <h2 className="text-2xl font-bold text-blue-600 mt-1">
              ₹{Number(taxData.rebalance_summary.tax_loss_harvested).toLocaleString()}
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Capital gains tax reduction</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimated Tax Bill</span>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">
              ₹{Number(taxData.rebalance_summary.total_tax_bill).toLocaleString()}
            </h2>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Net Post-Tax Alpha: Positive</p>
          </div>
        </div>
      )}

      {/* AI TAX HARVESTING & STRATEGY SYNTHESIS */}
      {taxData?.ai_insights && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-wrap justify-between items-start gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <h3 className="font-bold text-slate-900 text-base tracking-tight">
                  AI Tax-Loss Harvesting & Capital Reallocation Synthesis
                </h3>
                <span className="bg-slate-900 text-white text-[10px] font-semibold px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                  {taxData.ai_insights.powered_by || "Google Gemini"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-mono">
                Institutional analysis under Union Budget 2024 (20% STCG / 12.5% LTCG with ₹1.25L Exemption).
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-lg text-right font-mono">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Efficiency Rating</span>
              <p className="text-xs font-bold text-emerald-600 mt-0.5">{taxData.ai_insights.tax_efficiency_rating}</p>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="space-y-1">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Executive Tax Review
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed">
              {taxData.ai_insights.executive_summary}
            </p>
          </div>

          {/* 2-Column: Harvesting Breakdown & Practical Tips */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-1.5">
              <div className="flex items-center gap-1.5 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                <h5 className="text-xs font-semibold text-slate-900">Tax-Loss Harvesting Analysis</h5>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {taxData.ai_insights.harvesting_analysis}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-1.5">
              <div className="flex items-center gap-1.5 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                <h5 className="text-xs font-semibold text-slate-900">Actionable Execution Tips</h5>
              </div>
              <div className="space-y-1">
                {taxData.ai_insights.actionable_tax_tips?.map((tip: string, tIdx: number) => (
                  <div key={tIdx} className="flex items-start gap-1.5 text-xs text-slate-600">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SELL ORDERS (TRIMS) TABLE */}
      {taxData?.sell_orders && taxData.sell_orders.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="bg-rose-700 text-white text-[10px] font-bold px-2 py-0.5 rounded font-mono">SELL</span>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Positions to Trim ({taxData.sell_orders.length})
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Releases capital for optimal Sharpe allocation</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-200 font-mono">
                <tr>
                  <th className="px-4 py-3">Security</th>
                  <th className="px-4 py-3 text-right">Qty to Sell</th>
                  <th className="px-4 py-3 text-right">LTP (₹)</th>
                  <th className="px-4 py-3 text-right">Order Value</th>
                  <th className="px-4 py-3">Tax Category</th>
                  <th className="px-4 py-3 text-right">Realized Gain</th>
                  <th className="px-4 py-3 text-right">Est. Tax</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {taxData.sell_orders.map((o: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900 block">{o.company_name}</span>
                      <span className="font-mono text-[10px] text-slate-400">{o.ticker}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-rose-600">{o.quantity} shares</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">₹{o.current_price}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">₹{o.order_value.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                        {o.tax_category} ({o.days_held}d)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">
                      ₹{o.realized_gain.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                      ₹{o.estimated_tax}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BUY ORDERS (ALLOCATIONS) TABLE */}
      {taxData?.buy_orders && taxData.buy_orders.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-700 text-white text-[10px] font-bold px-2 py-0.5 rounded font-mono">BUY</span>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Target Frontier Allocations ({taxData.buy_orders.length})
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Deploys trimmed capital to tangency frontier</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-200 font-mono">
                <tr>
                  <th className="px-4 py-3">Security</th>
                  <th className="px-4 py-3 text-right">Qty to Buy</th>
                  <th className="px-4 py-3 text-right">LTP (₹)</th>
                  <th className="px-4 py-3 text-right">Allocation Amount</th>
                  <th className="px-4 py-3">Rebalance Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {taxData.buy_orders.map((o: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900 block">{o.company_name}</span>
                      <span className="font-mono text-[10px] text-slate-400">{o.ticker}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">+{o.quantity} shares</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">₹{o.current_price}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">₹{o.order_value.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-500 text-[11px] font-medium">{o.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h4 className="text-sm font-bold text-white">Ready to place these tax-optimized rebalance orders?</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Export directly to 1-Click Zerodha Kite Connect Baskets or AngelOne SmartAPI.
          </p>
        </div>

        <Link
          href="/execute"
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-6 py-2.5 rounded-lg transition-colors shadow-sm"
        >
          Open Broker Execution Terminal →
        </Link>
      </div>
    </div>
  );
}
