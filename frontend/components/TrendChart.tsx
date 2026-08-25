"use client";

import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
);

export default function TrendChart({ labels, dataPoints, title }: any) {
  if (!labels || !dataPoints) return null;

  const data = {
    labels: labels,
    datasets: [
      {
        label: title,
        data: dataPoints,
        borderColor: "#111827",
        backgroundColor: "rgba(17,24,39,0.1)",
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
  };

  return <Line data={data} options={options} />;
}