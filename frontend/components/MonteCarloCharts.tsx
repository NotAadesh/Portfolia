"use client";

import React, { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  ReferenceLine,
  Cell,
  Area,
  ComposedChart,
} from "recharts";

interface MonteCarloChartsProps {
  paths: number[][];
  finalValues: number[];
  initialInvestment?: number;
  years?: number;
}

type ViewFilter = "all" | "confidence" | "median" | "bull" | "bear";

export default function MonteCarloCharts({
  paths = [],
  finalValues = [],
  initialInvestment = 100000,
  years = 3,
}: MonteCarloChartsProps) {
  const [activeFilter, setActiveFilter] = useState<ViewFilter>("all");
  const [chartMode, setChartMode] = useState<"paths" | "distribution">("paths");

  // Sorted final values for percentiles
  const sortedFinals = useMemo(() => [...finalValues].sort((a, b) => a - b), [finalValues]);

  // Compute key percentiles across time steps
  const { trajectoryData, p95Path, p50Path, p5Path, bullPaths, bearPaths } = useMemo(() => {
    if (!paths || paths.length === 0 || !paths[0]) {
      return { trajectoryData: [], p95Path: [], p50Path: [], p5Path: [], bullPaths: [], bearPaths: [] };
    }

    const totalSteps = paths[0].length;
    const numPaths = paths.length;
    const stride = Math.max(1, Math.floor(totalSteps / 60));

    const sampledIndices: number[] = [];
    for (let i = 0; i < totalSteps; i += stride) {
      sampledIndices.push(i);
    }
    if (sampledIndices[sampledIndices.length - 1] !== totalSteps - 1) {
      sampledIndices.push(totalSteps - 1);
    }

    // Identify bull (top 25%) and bear (bottom 25%) path indices based on terminal values
    const indexedFinals = paths.map((p, idx) => ({ idx, finalVal: p[p.length - 1] }));
    indexedFinals.sort((a, b) => a.finalVal - b.finalVal);

    const bearIndices = new Set(indexedFinals.slice(0, Math.max(1, Math.floor(numPaths * 0.25))).map((x) => x.idx));
    const bullIndices = new Set(indexedFinals.slice(-Math.max(1, Math.floor(numPaths * 0.25))).map((x) => x.idx));

    // Sample visible paths (max 20 for performance)
    const visiblePathIndices = Array.from({ length: Math.min(20, numPaths) }, (_, i) => i);

    const data = sampledIndices.map((stepIdx, stepNum) => {
      // Timeline in years
      const progressFraction = stepIdx / (totalSteps - 1 || 1);
      const yearLabel = (progressFraction * years).toFixed(1);

      // Collect all values at this step to calculate step percentiles
      const stepValues = paths.map((p) => p[stepIdx]).sort((a, b) => a - b);
      const p5 = stepValues[Math.floor(numPaths * 0.05)] || stepValues[0];
      const p50 = stepValues[Math.floor(numPaths * 0.5)] || stepValues[0];
      const p95 = stepValues[Math.floor(numPaths * 0.95)] || stepValues[stepValues.length - 1];

      const point: Record<string, any> = {
        step: stepNum,
        year: `Yr ${yearLabel}`,
        p5,
        p50,
        p95,
        coneBand: [p5, p95],
      };

      visiblePathIndices.forEach((pathIdx) => {
        point[`sim${pathIdx}`] = paths[pathIdx][stepIdx];
      });

      return point;
    });

    return {
      trajectoryData: data,
      p95Path: data.map((d) => d.p95),
      p50Path: data.map((d) => d.p50),
      p5Path: data.map((d) => d.p5),
      bullPaths: Array.from(bullIndices).slice(0, 10),
      bearPaths: Array.from(bearIndices).slice(0, 10),
    };
  }, [paths, years]);

  // Terminal distribution buckets
  const distributionData = useMemo(() => {
    if (!finalValues || finalValues.length === 0) return [];
    const minVal = Math.min(...finalValues);
    const maxVal = Math.max(...finalValues);
    const range = maxVal - minVal;
    const bucketSize = Math.max(2000, Math.round(range / 24));

    const buckets: Record<number, number> = {};
    finalValues.forEach((val) => {
      const bucket = Math.round(val / bucketSize) * bucketSize;
      buckets[bucket] = (buckets[bucket] || 0) + 1;
    });

    return Object.entries(buckets)
      .map(([key, count]) => {
        const valNum = Number(key);
        return {
          value: valNum,
          count,
          isLoss: valNum < initialInvestment,
        };
      })
      .sort((a, b) => a.value - b.value);
  }, [finalValues, initialInvestment]);

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
      {/* Chart Header with View Tabs */}
      <div className="flex flex-wrap justify-between items-center gap-4 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <h3 className="font-bold text-slate-900 text-base tracking-tight">
              Stochastic Path Visualizer & Risk Envelope
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Interactive multi-path trajectories across {years}-year horizon with Value-at-Risk confidence intervals.
          </p>
        </div>

        {/* Primary View Switcher */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-lg flex gap-1 text-xs font-mono">
            <button
              onClick={() => setChartMode("paths")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                chartMode === "paths"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Price Trajectories
            </button>
            <button
              onClick={() => setChartMode("distribution")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                chartMode === "distribution"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Terminal Distribution
            </button>
          </div>
        </div>
      </div>

      {/* Trajectory Filters Toolbar */}
      {chartMode === "paths" && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
              Filter View:
            </span>
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                activeFilter === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              All Paths
            </button>
            <button
              onClick={() => setActiveFilter("confidence")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                activeFilter === "confidence"
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              Confidence Cone (90% Band)
            </button>
            <button
              onClick={() => setActiveFilter("median")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                activeFilter === "median"
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              Median Trend Only
            </button>
            <button
              onClick={() => setActiveFilter("bull")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                activeFilter === "bull"
                  ? "bg-emerald-600 text-white"
                  : "bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              Bullish Paths (Top 25%)
            </button>
            <button
              onClick={() => setActiveFilter("bear")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                activeFilter === "bear"
                  ? "bg-rose-600 text-white"
                  : "bg-white border border-rose-200 text-rose-700 hover:bg-rose-50"
              }`}
            >
              Stress Drawdowns (Bottom 25%)
            </button>
          </div>

          {/* Legend helper */}
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 95th %ile
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span> 50th Median
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span> 5th %ile Tail Risk
            </span>
          </div>
        </div>
      )}

      {/* Main Chart Area */}
      <div className="h-[420px] w-full pt-2">
        {chartMode === "paths" ? (
          trajectoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trajectoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="year" stroke="#94a3b8" fontSize={11} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs space-y-1 border border-slate-800">
                        <p className="font-semibold text-slate-300 pb-1 border-b border-slate-800">
                          {d.year} Timeline Snapshot
                        </p>
                        <p className="text-emerald-400">
                          95th %ile (Bull): <span className="font-bold">₹{Math.round(d.p95).toLocaleString()}</span>
                        </p>
                        <p className="text-blue-400">
                          50th %ile (Median): <span className="font-bold">₹{Math.round(d.p50).toLocaleString()}</span>
                        </p>
                        <p className="text-rose-400">
                          5th %ile (Worst): <span className="font-bold">₹{Math.round(d.p5).toLocaleString()}</span>
                        </p>
                      </div>
                    );
                  }}
                />

                {/* Baseline Initial Capital Horizontal Line */}
                <ReferenceLine
                  y={initialInvestment}
                  stroke="#64748b"
                  strokeDasharray="4 4"
                  label={{
                    value: `Initial (₹${(initialInvestment / 1000).toFixed(0)}k)`,
                    fill: "#64748b",
                    fontSize: 10,
                    position: "right",
                  }}
                />

                {/* Confidence Cone Area */}
                {(activeFilter === "confidence" || activeFilter === "all") && (
                  <Area
                    type="monotone"
                    dataKey="p95"
                    stroke="#10b981"
                    strokeWidth={1.5}
                    fill="#3b82f6"
                    fillOpacity={0.08}
                    isAnimationActive={false}
                  />
                )}

                {/* All Translucent Trajectories */}
                {activeFilter === "all" &&
                  Array.from({ length: Math.min(20, paths.length) }).map((_, idx) => (
                    <Line
                      key={idx}
                      type="monotone"
                      dataKey={`sim${idx}`}
                      dot={false}
                      stroke="#64748b"
                      strokeOpacity={0.18}
                      strokeWidth={1}
                      isAnimationActive={false}
                    />
                  ))}

                {/* Bullish Paths */}
                {activeFilter === "bull" &&
                  bullPaths.map((pathIdx) => (
                    <Line
                      key={pathIdx}
                      type="monotone"
                      dataKey={`sim${pathIdx}`}
                      dot={false}
                      stroke="#10b981"
                      strokeOpacity={0.7}
                      strokeWidth={1.5}
                      isAnimationActive={false}
                    />
                  ))}

                {/* Bearish Paths */}
                {activeFilter === "bear" &&
                  bearPaths.map((pathIdx) => (
                    <Line
                      key={pathIdx}
                      type="monotone"
                      dataKey={`sim${pathIdx}`}
                      dot={false}
                      stroke="#e11d48"
                      strokeOpacity={0.7}
                      strokeWidth={1.5}
                      isAnimationActive={false}
                    />
                  ))}

                {/* Highlighted Median Line (Always visible on all views) */}
                <Line
                  type="monotone"
                  dataKey="p50"
                  dot={false}
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  isAnimationActive={false}
                />

                {/* Tail Risk 5th Percentile */}
                {(activeFilter === "confidence" || activeFilter === "all") && (
                  <Line
                    type="monotone"
                    dataKey="p5"
                    dot={false}
                    stroke="#e11d48"
                    strokeWidth={1.5}
                    strokeDasharray="2 2"
                    isAnimationActive={false}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 text-xs">
              Simulation trajectories unavailable.
            </div>
          )
        ) : distributionData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distributionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="value"
                stroke="#94a3b8"
                fontSize={11}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-xl text-xs space-y-1 border border-slate-800">
                      <p className="font-semibold text-slate-300">
                        Terminal Value: ₹{Number(d.value).toLocaleString()}
                      </p>
                      <p className={d.isLoss ? "text-rose-400" : "text-emerald-400"}>
                        Simulations in bucket: <span className="font-bold">{d.count}</span>
                      </p>
                    </div>
                  );
                }}
              />
              <ReferenceLine
                x={initialInvestment}
                stroke="#64748b"
                strokeDasharray="4 4"
                label={{
                  value: "Break-Even Capital",
                  fill: "#64748b",
                  fontSize: 10,
                  position: "top",
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {distributionData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isLoss ? "#e11d48" : "#0f172a"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 text-xs">
            Distribution data unavailable.
          </div>
        )}
      </div>
    </div>
  );
}