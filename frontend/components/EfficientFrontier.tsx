"use client";

import { useState, useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  Line,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

export default function EfficientFrontier({ data, portfolio }: any) {
  if (!data) return null;

  const rawScatter = data.scatter || [];
  const rawFrontier = data.frontier || [];

  // Limit points for smooth rendering
  const scatterData = useMemo(() => rawScatter.slice(0, 200), [rawScatter]);
  const frontierData = useMemo(() => rawFrontier.slice(0, 100), [rawFrontier]);

  const portfolioPoint = useMemo(() => ({
    risk: Number(portfolio?.volatility || 0),
    return: Number(portfolio?.expected_return || 0),
  }), [portfolio]);

  // STATES
  const [showFrontier, setShowFrontier] = useState(true);
  const [showRandom, setShowRandom] = useState(true);
  const [showPortfolio, setShowPortfolio] = useState(true);
  const [showOptimal, setShowOptimal] = useState(true);
  const [showClosest, setShowClosest] = useState(true);

  // OPTIMAL
  const optimalPoint = useMemo(() => {
    if (!scatterData.length) return null;
    return scatterData.reduce((best: any, curr: any) => {
      const s1 = curr.risk > 0 ? curr.return / curr.risk : 0;
      const s2 = best.risk > 0 ? best.return / best.risk : 0;
      return s1 > s2 ? curr : best;
    }, scatterData[0]);
  }, [scatterData]);

  // CLOSEST
  const nearestFrontierPoint = useMemo(() => {
    if (!frontierData.length) return null;
    return frontierData.reduce((closest: any, curr: any) => {
      const d1 = Math.hypot(curr.risk - portfolioPoint.risk, curr.return - portfolioPoint.return);
      const d2 = Math.hypot(closest.risk - portfolioPoint.risk, closest.return - portfolioPoint.return);
      return d1 < d2 ? curr : closest;
    }, frontierData[0]);
  }, [frontierData, portfolioPoint]);

  // GAP
  const efficiencyGap = nearestFrontierPoint && nearestFrontierPoint.return !== 0
    ? ((nearestFrontierPoint.return - portfolioPoint.return) / Math.abs(nearestFrontierPoint.return)) * 100
    : 0;

  const gapLine = nearestFrontierPoint ? [portfolioPoint, nearestFrontierPoint] : [];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const point = payload.find((p: any) => p?.payload)?.payload;
      if (!point) return null;

      const risk = Number(point.risk ?? point.x ?? 0);
      const ret = Number(point.return ?? point.y ?? 0);
      const sharpe = risk !== 0 ? (ret / risk).toFixed(2) : "N/A";

      return (
        <div
          style={{
            background: "#111827",
            color: "white",
            padding: "8px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            border: "1px solid #374151",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ marginBottom: "4px", color: "#9ca3af" }}>Portfolio Point</div>
          <div>Return: <span style={{ color: "#22c55e", fontWeight: 600 }}>{ret.toFixed(2)}%</span></div>
          <div>Risk: <span style={{ color: "#facc15", fontWeight: 600 }}>{risk.toFixed(2)}%</span></div>
          <div>Sharpe: <span style={{ color: "#60a5fa", fontWeight: 600 }}>{sharpe}</span></div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      style={{
        background: "white",
        padding: "24px",
        borderRadius: "12px",
        border: "1px solid #e5e7eb",
      }}
    >
      <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "6px" }}>
        Efficient Frontier
      </h3>

      <div style={{ fontSize: "14px", marginBottom: "10px", color: "#4b5563" }}>
        Efficiency Gap:
        <span style={{ color: "#ef4444", fontWeight: 600 }}>
          {" "} {efficiencyGap.toFixed(2)}%
        </span>
      </div>

      {/* CHART */}
      <div style={{ width: "100%", height: 400, position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart>
            <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="risk"
              name="Risk"
              unit="%"
              stroke="#6b7280"
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="number"
              dataKey="return"
              name="Return"
              unit="%"
              stroke="#6b7280"
              tickFormatter={(v) => `${v}%`}
            />

            <Tooltip
              content={<CustomTooltip />}
              wrapperStyle={{ zIndex: 9999, pointerEvents: "none" }}
            />

            {/* RANDOM PORTFOLIOS */}
            {showRandom && (
              <Scatter
                data={scatterData}
                fill="#9ca3af"
                opacity={0.35}
                isAnimationActive={false}
              />
            )}

            {/* FRONTIER */}
            {showFrontier && (
              <Line
                type="monotone"
                dataKey="return"
                data={frontierData}
                stroke="#16a34a"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
            )}

            {/* GAP LINE */}
            {gapLine.length > 0 && (
              <Line
                data={gapLine}
                dataKey="return"
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            )}

            {/* USER PORTFOLIO */}
            {showPortfolio && (
              <Scatter data={[portfolioPoint]} fill="#ef4444" isAnimationActive={false} />
            )}

            {/* OPTIMAL */}
            {optimalPoint && showOptimal && (
              <Scatter data={[optimalPoint]} fill="#2563eb" isAnimationActive={false} />
            )}

            {/* CLOSEST */}
            {nearestFrontierPoint && showClosest && (
              <Scatter data={[nearestFrontierPoint]} fill="#22c55e" isAnimationActive={false} />
            )}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* LEGEND */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "18px",
          marginTop: "12px",
          fontSize: "13px",
          flexWrap: "wrap",
        }}
      >
        <span onClick={() => setShowFrontier(!showFrontier)} style={{ cursor: "pointer", color: "#16a34a" }}>
          ━● Efficient Frontier
        </span>
        <span onClick={() => setShowRandom(!showRandom)} style={{ cursor: "pointer", color: "#6b7280" }}>
          ● Random Portfolios
        </span>
        <span onClick={() => setShowPortfolio(!showPortfolio)} style={{ cursor: "pointer", color: "#ef4444" }}>
          ● Your Portfolio
        </span>
        <span onClick={() => setShowOptimal(!showOptimal)} style={{ cursor: "pointer", color: "#2563eb" }}>
          ● Optimal Portfolio
        </span>
        <span onClick={() => setShowClosest(!showClosest)} style={{ cursor: "pointer", color: "#22c55e" }}>
          ● Closest Efficient
        </span>
      </div>
    </div>
  );
}