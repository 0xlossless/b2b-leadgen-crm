"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface MonthlyDealsChartProps {
  data: {
    month: string;
    won: number;
    lost: number;
    value: number;
  }[];
}

export function MonthlyDealsChart({ data }: MonthlyDealsChartProps) {
  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 0, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="month" stroke="#71717a" fontSize={12} />
          <YAxis stroke="#71717a" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: "8px",
              color: "#e4e4e7",
            }}
          />
          <Legend wrapperStyle={{ color: "#a1a1aa" }} />
          <Line
            type="monotone"
            dataKey="won"
            name="Won"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ fill: "#22c55e", r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="lost"
            name="Lost"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ fill: "#ef4444", r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
