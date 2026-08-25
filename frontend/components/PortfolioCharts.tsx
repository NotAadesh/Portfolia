"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer
} from "recharts";

const COLORS = ["#111", "#444", "#777", "#aaa", "#ccc"];

export default function PortfolioCharts({ result }: any) {

  if (!result) return null;

  const pieData = Object.entries(result.optimal_weights).map(
    ([name, value]: any) => ({
      name,
      value: Number(value)
    })
  );

  const barData = [
    {
      name: "Portfolio",
      Return: Number(result.expected_return),
      Risk: Number(result.volatility),
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-6">

      {/* PIE */}
      <div className="bg-white p-4 rounded-xl shadow border">
        <h3 className="font-semibold mb-4">Optimal Allocation</h3>

        <div style={{ width: "100%", height: 250 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label
              >
                {pieData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* BAR */}
      <div className="bg-white p-4 rounded-xl shadow border">
        <h3 className="font-semibold mb-4">Risk vs Return</h3>

        <div style={{ width: "100%", height: 250 }}>
          <ResponsiveContainer>
            <BarChart data={barData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="Return" />
              <Bar dataKey="Risk" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}