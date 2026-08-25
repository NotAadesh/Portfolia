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

export default function StockChart({ prices, dates }: any) {
  const data = {
    labels: dates,
    datasets: [
      {
        label: "Stock Price (₹)",
        data: prices,
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
    plugins: {
      tooltip: {
        callbacks: {
          label: function (context: any) {
            return `₹${context.raw}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          maxTicksLimit: 8,
          callback: function (value: any, index: number) {
            const date = dates[index];
            return date ? date.slice(0, 7) : "";
          },
        },
      },
      y: {
        ticks: {
          callback: function (value: any) {
            return `₹${value}`;
          },
        },
      },
    },
  };

  return <Line data={data} options={options} />;
}