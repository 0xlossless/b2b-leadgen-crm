"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const RANGE_COLORS: Record<string, string> = {
  "0-20": "#38bdf8",    // sky-400
  "20-40": "#38bdf8",   // sky-400
  "40-60": "#fbbf24",   // amber-400
  "60-80": "#fbbf24",   // amber-400
  "80-100": "#f87171",  // red-400
};

interface ScoreDistributionChartProps {
  data: { range: string; count: number }[];
}

export function ScoreDistributionChart({ data }: ScoreDistributionChartProps) {
  // Ensure all ranges exist, sorted properly
  const allRanges = ["0-20", "20-40", "40-60", "60-80", "80-100"];
  const formatted = allRanges.map((range) => {
    const found = data.find((d) => d.range === range);
    return { range, count: found?.count || 0 };
  });

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={formatted} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="range"
          tick={{ fill: "#a1a1aa", fontSize: 12 }}
          axisLine={{ stroke: "#3f3f46" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#a1a1aa", fontSize: 12 }}
          axisLine={{ stroke: "#3f3f46" }}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#18181b",
            border: "1px solid #3f3f46",
            borderRadius: "8px",
            color: "#f4f4f5",
          }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {formatted.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={RANGE_COLORS[entry.range] || "#6366f1"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
