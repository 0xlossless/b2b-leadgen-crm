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

interface FunnelChartProps {
  data: {
    stage: string;
    label: string;
    count: number;
    conversionRate: number;
  }[];
}

const STAGE_COLORS = [
  "#10b981", // new_lead - emerald
  "#34d399", // contacted
  "#6ee7b7", // qualified
  "#a7f3d0", // demo_scheduled
  "#fbbf24", // proposal_sent - amber
  "#f59e0b", // negotiating
  "#22c55e", // closed_won - green
  "#ef4444", // closed_lost - red
];

export function FunnelChart({ data }: FunnelChartProps) {
  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis type="number" stroke="#71717a" fontSize={12} />
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
            formatter={(value: any, name: any, props: any) => {
              const payload = props.payload as { conversionRate: number };
              return [
                `${value} deals (${payload.conversionRate}% conversion)`,
                "Count",
              ];
            }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((_, index) => (
              <Cell key={index} fill={STAGE_COLORS[index % STAGE_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
