"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface SourceAttributionChartProps {
  data: {
    source: string;
    avgScore: number;
    leadCount: number;
  }[];
}

export function SourceAttributionChart({ data }: SourceAttributionChartProps) {
  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="source" stroke="#71717a" fontSize={12} />
          <YAxis yAxisId="left" stroke="#71717a" fontSize={12} />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#71717a"
            fontSize={12}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: "8px",
              color: "#e4e4e7",
            }}
          />
          <Legend wrapperStyle={{ color: "#a1a1aa" }} />
          <Bar
            yAxisId="left"
            dataKey="avgScore"
            name="Avg Score"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            yAxisId="right"
            dataKey="leadCount"
            name="Lead Count"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
