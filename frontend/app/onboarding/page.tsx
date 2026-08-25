"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, API_BASE_URL } from "@/lib/api";

export default function GoalOnboarding() {
  const router = useRouter();

  // Wizard Steps: 1. Goal & Horizon, 2. Risk & Mode, 3. AI Portfolios, 4. Activation
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form Parameters
  const [goalName, setGoalName] = useState("Long-Term Wealth Accumulation");
  const [goalAmount, setGoalAmount] = useState(2500000);
  const [horizonYears, setHorizonYears] = useState(5);
  const [riskScale, setRiskScale] = useState(3);
  const [investmentMode, setInvestmentMode] = useState<"LUMP_SUM" | "SIP">("SIP");
  const [initialCapital, setInitialCapital] = useState(100000);
  const [monthlySip, setMonthlySip] = useState(20000);

  // AI Generated Baseline Portfolios
  const [baselineData, setBaselineData] = useState<any>(null);
  const [selectedProfile, setSelectedProfile] = useState<string>("Balanced");

  // Fetch AI Baselines
  const generateBaselines = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/lifecycle/onboarding/generate-baselines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal_amount: goalAmount,
          horizon_years: horizonYears,
          risk_scale: riskScale,
          investment_mode: investmentMode,
          initial_investment: initialCapital,
          monthly_sip: monthlySip,
        }),
      });
      const data = await res.json();
      setBaselineData(data);
      if (data.parameters?.recommended) {
        setSelectedProfile(data.parameters.recommended);
      }
      setStep(3);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateGoal = () => {
    if (!baselineData || !baselineData.portfolios[selectedProfile]) return;
    const portfolio = baselineData.portfolios[selectedProfile];

    // Store in localStorage for seamless handoff to Portfolio Maker & Simulation
    const tickers = portfolio.assets.map((a: any) => a.ticker);
    const weights = portfolio.assets.map((a: any) => a.weight);

    localStorage.setItem(
      "portfolio_data",
      JSON.stringify({
        goal_name: goalName,
        goal_amount: goalAmount,
        investment: investmentMode === "SIP" ? initialCapital + monthlySip * 12 : initialCapital,
        years: horizonYears,
        expected_return: portfolio.expected_cagr,
        volatility: portfolio.volatility,
        tickers: tickers,
        weights: weights,
      })
    );

    router.push("/portfolio");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
              Step {step} of 3
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Goal-Driven Portfolio Onboarding</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Define your financial target in rupees and generate institutional quantitative portfolios matching your risk budget.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-lg">
          <div className={`px-3 py-1 text-xs font-bold rounded ${step >= 1 ? "bg-white text-slate-900 shadow-xs" : "text-slate-400"}`}>
            1. Goal
          </div>
          <span className="text-slate-300">→</span>
          <div className={`px-3 py-1 text-xs font-bold rounded ${step >= 2 ? "bg-white text-slate-900 shadow-xs" : "text-slate-400"}`}>
            2. Risk & Mode
          </div>
          <span className="text-slate-300">→</span>
          <div className={`px-3 py-1 text-xs font-bold rounded ${step >= 3 ? "bg-blue-600 text-white shadow-xs" : "text-slate-400"}`}>
            3. AI Portfolios
          </div>
        </div>
      </div>

      {/* STEP 1: GOAL OBJECTIVE & TARGET AMOUNT */}
      {step === 1 && (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">What is your primary financial goal?</h2>
            <p className="text-xs text-slate-500 mt-0.5">Select a preset or enter a custom target.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { name: "🏠 House Downpayment", target: 3500000, years: 5 },
              { name: "🚀 Early Financial Freedom", target: 15000000, years: 10 },
              { name: "🎓 Higher Education / Child Fund", target: 5000000, years: 7 },
              { name: "🚗 Luxury Car / Dream Purchase", target: 2000000, years: 3 },
              { name: "🛡️ 1-Crore Wealth Compounder", target: 10000000, years: 8 },
              { name: "💼 Long-Term Equity Nest Egg", target: 5000000, years: 6 },
            ].map((preset, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setGoalName(preset.name.replace(/^[^\s]+\s/, ""));
                  setGoalAmount(preset.target);
                  setHorizonYears(preset.years);
                }}
                className={`p-4 border rounded-xl cursor-pointer transition-all ${
                  goalAmount === preset.target
                    ? "border-blue-600 bg-blue-50/50 shadow-sm"
                    : "border-slate-200 hover:border-slate-400 bg-slate-50/30"
                }`}
              >
                <p className="text-xs font-bold text-slate-900">{preset.name}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Target: <strong>₹{(preset.target / 100000).toFixed(1)} Lakh</strong> in {preset.years} Years
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Target Wealth Goal Amount (₹)</label>
              <input
                type="number"
                value={goalAmount}
                onChange={(e) => setGoalAmount(Number(e.target.value))}
                className="w-full border border-slate-200 px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-900 outline-none focus:border-slate-900"
              />
              <p className="text-[11px] text-slate-400 mt-1">₹{(goalAmount).toLocaleString()} ({ (goalAmount / 100000).toFixed(2) } Lakhs)</p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Time Horizon (Years)</label>
              <input
                type="range"
                min="1"
                max="20"
                value={horizonYears}
                onChange={(e) => setHorizonYears(Number(e.target.value))}
                className="w-full accent-slate-900 mt-2"
              />
              <div className="flex justify-between text-xs font-bold text-slate-700 mt-1">
                <span>1 Year</span>
                <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{horizonYears} Years</span>
                <span>20 Years</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setStep(2)}
              className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg text-xs font-bold transition-colors"
            >
              Continue to Risk & Mode →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: RISK SCALE & INVESTMENT MODE */}
      {step === 2 && (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Risk Profile & Investment Strategy</h2>
            <p className="text-xs text-slate-500 mt-0.5">Determine how much market volatility you can comfortably tolerate.</p>
          </div>

          {/* Investment Mode Toggle */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">Investment Mode</label>
            <div className="grid grid-cols-2 gap-4">
              <div
                onClick={() => setInvestmentMode("SIP")}
                className={`p-4 border rounded-xl cursor-pointer transition-all ${
                  investmentMode === "SIP" ? "border-blue-600 bg-blue-50/50" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">📈 Monthly SIP (Systematic Plan)</span>
                  {investmentMode === "SIP" && <span className="text-blue-600 text-xs font-bold">✓ Selected</span>}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Disciplined monthly contributions benefiting from rupee-cost averaging.</p>
              </div>

              <div
                onClick={() => setInvestmentMode("LUMP_SUM")}
                className={`p-4 border rounded-xl cursor-pointer transition-all ${
                  investmentMode === "LUMP_SUM" ? "border-blue-600 bg-blue-50/50" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">💰 One-Time Lump-sum Capital</span>
                  {investmentMode === "LUMP_SUM" && <span className="text-blue-600 text-xs font-bold">✓ Selected</span>}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Deploy an upfront capital amount deployed across tangency weights.</p>
              </div>
            </div>
          </div>

          {/* Financial Numbers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Starting Initial Capital (₹)</label>
              <input
                type="number"
                value={initialCapital}
                onChange={(e) => setInitialCapital(Number(e.target.value))}
                className="w-full border border-slate-200 px-4 py-2.5 rounded-lg text-xs font-semibold outline-none focus:border-slate-900"
              />
            </div>

            {investmentMode === "SIP" && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Monthly SIP Amount (₹)</label>
                <input
                  type="number"
                  value={monthlySip}
                  onChange={(e) => setMonthlySip(Number(e.target.value))}
                  className="w-full border border-slate-200 px-4 py-2.5 rounded-lg text-xs font-semibold outline-none focus:border-slate-900"
                />
              </div>
            )}
          </div>

          {/* Risk Scale 1 to 5 */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700">Risk Tolerance Scale (1 to 5)</label>
              <span className="text-xs font-bold text-blue-600">
                {riskScale <= 2 ? "Conservative (Low Risk)" : riskScale === 3 ? "Balanced (Moderate)" : "Aggressive (High Alpha)"}
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={riskScale}
              onChange={(e) => setRiskScale(Number(e.target.value))}
              className="w-full accent-slate-900"
            />

            <div className="grid grid-cols-5 text-center text-[10px] text-slate-500 font-semibold gap-1">
              <span>1. Defensive</span>
              <span>2. Conservative</span>
              <span>3. Balanced</span>
              <span>4. Growth</span>
              <span>5. High Beta</span>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(1)}
              className="text-slate-600 hover:text-slate-900 text-xs font-bold"
            >
              ← Back
            </button>

            <button
              onClick={generateBaselines}
              disabled={loading}
              className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
            >
              {loading ? "Optimizing Markowitz Baselines..." : "Generate AI Baseline Portfolios →"}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: AI BASELINE PORTFOLIOS GENERATION */}
      {step === 3 && baselineData && (
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800 flex justify-between items-center">
            <div>
              <span className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded uppercase">
                Markowitz Goal Feasibility
              </span>
              <h2 className="text-lg font-bold text-white mt-1">
                Target: ₹{Number(goalAmount).toLocaleString()} in {horizonYears} Years
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Mode: {investmentMode} • Initial: ₹{initialCapital.toLocaleString()} {investmentMode === "SIP" && `• SIP: ₹${monthlySip.toLocaleString()}/mo`}
              </p>
            </div>

            <button
              onClick={() => setStep(2)}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700"
            >
              Edit Inputs
            </button>
          </div>

          {/* 3 Interactive Baseline Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(baselineData.portfolios).map(([key, port]: [string, any]) => {
              const isSelected = selectedProfile === key;
              const isRec = baselineData.parameters.recommended === key;

              return (
                <div
                  key={key}
                  onClick={() => setSelectedProfile(key)}
                  className={`bg-white rounded-xl border p-6 flex flex-col justify-between cursor-pointer transition-all ${
                    isSelected
                      ? "border-blue-600 ring-2 ring-blue-600/20 shadow-md"
                      : "border-slate-200 hover:border-slate-400 shadow-sm"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        {isRec && (
                          <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-wider block mb-1 w-fit">
                            ★ Recommended For You
                          </span>
                        )}
                        <h3 className="text-base font-bold text-slate-900">{key} Portfolio</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">{port.tagline}</p>
                      </div>
                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => setSelectedProfile(key)}
                        className="accent-blue-600 w-4 h-4 mt-1"
                      />
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">Expected CAGR</span>
                        <p className="text-sm font-bold text-emerald-600">{port.expected_cagr}%</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">Volatility</span>
                        <p className="text-sm font-bold text-slate-900">{port.volatility}%</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">Sharpe Ratio</span>
                        <p className="text-sm font-bold text-blue-600">{port.sharpe_ratio}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">Goal Success</span>
                        <p className="text-sm font-bold text-emerald-600">{port.goal_stats?.probability_of_success}%</p>
                      </div>
                    </div>

                    {/* Stock Allocation Preview */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Asset Breakdown</span>
                      <div className="space-y-1">
                        {port.assets.slice(0, 4).map((a: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="font-medium text-slate-700">{a.name}</span>
                            <span className="font-mono font-bold text-slate-900">{Math.round(a.weight * 100)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 mt-4">
                    <button
                      onClick={() => setSelectedProfile(key)}
                      className={`w-full py-2 rounded-lg text-xs font-bold transition-colors ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {isSelected ? "✓ Active Selection" : "Select Portfolio"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Bar */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-4">
            <div>
              <p className="text-xs font-bold text-slate-900">Ready to activate your {selectedProfile} Goal Portfolio?</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                This will load the exact optimal asset weights into your Portfolio Maker and Monte Carlo stress tester.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/compare"
                className="border border-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Compare Against Nifty 50 →
              </Link>

              <button
                onClick={handleActivateGoal}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-6 py-2.5 rounded-lg transition-colors shadow-sm"
              >
                Activate & Optimize in Portfolio Maker →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
