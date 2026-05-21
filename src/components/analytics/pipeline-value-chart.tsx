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

interface PipelineValueChartProps {
  data: {
    stage: string;
    label: string;
    value: number;
  }[];
}

const COLORS = [
  "#10b981",
  "#34d399",
  "#6ee7b7",
  "#a7f3d0",
  "#fbbf24",
  "#f59e0b",
  "#22c55e",
  "#ef4444",
];

export function PipelineValueChart({ data }: PipelineValueChartProps) {
  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            type="number"
            stroke="#71717a"
            fontSize={12}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          />
          <YAxis
            type="category"
            dataKey="label"
            stroke="#71717a"
            fontSize={12}
            width={120}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: "8px",
              color: "#e4e4e7",
            }}
            formatter={(value: any) => [`$${Number(value).toLocaleString()}`, "Value"]}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
