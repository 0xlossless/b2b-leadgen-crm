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

const SOURCE_COLORS: Record<string, string> = {
  google_maps: "#3b82f6",
  apollo: "#8b5cf6",
  manual: "#10b981",
  linkedin: "#0ea5e9",
  referral: "#f59e0b",
};

interface LeadsBySourceChartProps {
  data: { source: string; count: number }[];
}

export function LeadsBySourceChart({ data }: LeadsBySourceChartProps) {
  const formatted = data.map((item) => ({
    ...item,
    label: item.source
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={formatted} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="label"
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
              fill={SOURCE_COLORS[entry.source] || "#6366f1"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
