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
  LabelList,
} from "recharts";
import { STAGE_LABELS, PIPELINE_STAGES, type PipelineStage } from "@/lib/db/schema";

const STAGE_COLORS: Record<string, string> = {
  new_lead: "#6366f1",
  contacted: "#8b5cf6",
  qualified: "#3b82f6",
  demo_scheduled: "#0ea5e9",
  proposal_sent: "#10b981",
  negotiating: "#f59e0b",
  closed_won: "#22c55e",
  closed_lost: "#ef4444",
};

interface PipelineFunnelChartProps {
  data: { stage: string; count: number }[];
}

export function PipelineFunnelChart({ data }: PipelineFunnelChartProps) {
  // Order by pipeline stage sequence
  const formatted = PIPELINE_STAGES.map((stage) => {
    const found = data.find((d) => d.stage === stage);
    return {
      stage,
      label: STAGE_LABELS[stage as PipelineStage] || stage,
      count: found?.count || 0,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={formatted}
        layout="vertical"
        margin={{ top: 8, right: 40, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: "#a1a1aa", fontSize: 12 }}
          axisLine={{ stroke: "#3f3f46" }}
          tickLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fill: "#a1a1aa", fontSize: 11 }}
          axisLine={{ stroke: "#3f3f46" }}
          tickLine={false}
          width={110}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#18181b",
            border: "1px solid #3f3f46",
            borderRadius: "8px",
            color: "#f4f4f5",
          }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28}>
          {formatted.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={STAGE_COLORS[entry.stage] || "#6366f1"}
            />
          ))}
          <LabelList
            dataKey="count"
            position="right"
            fill="#a1a1aa"
            fontSize={12}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
