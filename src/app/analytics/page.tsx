import { db } from "@/lib/db";
import { deals, leads, leadScores } from "@/lib/db/schema";
import {
  PIPELINE_STAGES,
  STAGE_LABELS,
  type PipelineStage,
} from "@/lib/db/schema";
import { eq, sql, count, avg } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  Target,
  DollarSign,
  BarChart3,
  PieChart,
  Activity,
  Percent,
} from "lucide-react";
import { FunnelChart } from "@/components/analytics/funnel-chart";
import { SourceAttributionChart } from "@/components/analytics/source-attribution-chart";
import { PipelineValueChart } from "@/components/analytics/pipeline-value-chart";
import { MonthlyDealsChart } from "@/components/analytics/monthly-deals-chart";

function getAnalyticsData() {
  // Total deals
  const allDeals = db.select().from(deals).all();
  const totalDeals = allDeals.length;

  // Deals by stage
  const dealsByStage = PIPELINE_STAGES.map((stage) => {
    const stageDeals = allDeals.filter((d) => d.stage === stage);
    return {
      stage,
      label: STAGE_LABELS[stage],
      count: stageDeals.length,
      totalValue: stageDeals.reduce((sum, d) => sum + (d.dealValue ?? 0), 0),
    };
  });

  // Conversion rates (from first stage to each subsequent stage)
  const funnelData = dealsByStage.map((s, idx) => {
    // Cumulative: how many deals reached this stage or beyond
    const reachedCount = PIPELINE_STAGES.slice(idx).reduce((sum, st) => {
      return sum + dealsByStage.find((d) => d.stage === st)!.count;
    }, 0);
    // For closed_lost, just show its own count
    if (s.stage === "closed_lost") {
      return {
        ...s,
        count: s.count,
        conversionRate: totalDeals > 0 ? Math.round((s.count / totalDeals) * 100) : 0,
      };
    }
    return {
      ...s,
      count: reachedCount,
      conversionRate: totalDeals > 0 ? Math.round((reachedCount / totalDeals) * 100) : 0,
    };
  });

  // KPIs
  const wonDeals = allDeals.filter((d) => d.stage === "closed_won");
  const lostDeals = allDeals.filter((d) => d.stage === "closed_lost");
  const activeDeals = allDeals.filter(
    (d) => d.stage !== "closed_won" && d.stage !== "closed_lost"
  );
  const totalPipelineValue = activeDeals.reduce(
    (s, d) => s + (d.dealValue ?? 0),
    0
  );
  const wonValue = wonDeals.reduce((s, d) => s + (d.dealValue ?? 0), 0);
  const winRate =
    wonDeals.length + lostDeals.length > 0
      ? Math.round(
          (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100
        )
      : 0;
  const avgDealValue =
    wonDeals.length > 0
      ? Math.round(wonValue / wonDeals.length)
      : 0;

  // Source attribution
  const allLeads = db
    .select({
      source: leads.source,
      totalScore: leadScores.totalScore,
    })
    .from(leads)
    .leftJoin(leadScores, eq(leadScores.leadId, leads.id))
    .all();

  const sourceMap = new Map<string, { totalScore: number; count: number }>();
  for (const lead of allLeads) {
    const curr = sourceMap.get(lead.source) ?? { totalScore: 0, count: 0 };
    curr.totalScore += lead.totalScore ?? 0;
    curr.count += 1;
    sourceMap.set(lead.source, curr);
  }

  const sourceData = Array.from(sourceMap.entries()).map(
    ([source, { totalScore, count: cnt }]) => ({
      source,
      avgScore: cnt > 0 ? Math.round(totalScore / cnt) : 0,
      leadCount: cnt,
    })
  );

  // Pipeline value by stage
  const pipelineValueData = dealsByStage
    .filter((s) => s.totalValue > 0)
    .map((s) => ({
      stage: s.stage,
      label: s.label,
      value: s.totalValue,
    }));

  // Monthly deals (simulate from seed data close dates)
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const monthlyData = months.map((month, idx) => {
    // Distribute won/lost deals across months for demo
    const wonInMonth = wonDeals.filter((_, i) => i % months.length === idx).length;
    const lostInMonth = lostDeals.filter((_, i) => i % months.length === idx).length;
    const valueInMonth = wonDeals
      .filter((_, i) => i % months.length === idx)
      .reduce((s, d) => s + (d.dealValue ?? 0), 0);
    return {
      month,
      won: wonInMonth,
      lost: lostInMonth,
      value: valueInMonth,
    };
  });

  return {
    totalDeals,
    wonDeals: wonDeals.length,
    lostDeals: lostDeals.length,
    activeDeals: activeDeals.length,
    totalPipelineValue,
    wonValue,
    winRate,
    avgDealValue,
    funnelData,
    sourceData,
    pipelineValueData,
    monthlyData,
  };
}

export default function AnalyticsPage() {
  const data = getAnalyticsData();

  const kpis = [
    {
      label: "Total Deals",
      value: data.totalDeals.toString(),
      icon: Target,
      color: "text-blue-400",
    },
    {
      label: "Win Rate",
      value: `${data.winRate}%`,
      icon: Percent,
      color: "text-emerald-400",
    },
    {
      label: "Pipeline Value",
      value: `$${data.totalPipelineValue.toLocaleString()}`,
      icon: DollarSign,
      color: "text-amber-400",
    },
    {
      label: "Avg Deal (Won)",
      value: `$${data.avgDealValue.toLocaleString()}`,
      icon: TrendingUp,
      color: "text-purple-400",
    },
    {
      label: "Deals Won",
      value: data.wonDeals.toString(),
      icon: Activity,
      color: "text-green-400",
    },
    {
      label: "Won Revenue",
      value: `$${data.wonValue.toLocaleString()}`,
      icon: DollarSign,
      color: "text-emerald-400",
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-emerald-500" />
          <div>
            <h1 className="text-xl font-bold">Analytics & Reporting</h1>
            <p className="text-sm text-zinc-500">
              Pipeline performance and conversion metrics
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpis.map((kpi) => (
            <Card
              key={kpi.label}
              className="bg-zinc-900 border-zinc-800"
            >
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                  <p className="text-xs text-zinc-500">{kpi.label}</p>
                </div>
                <p className="text-xl font-bold text-zinc-100">{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Funnel Chart */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
                <PieChart className="h-5 w-5 text-emerald-500" />
                Pipeline Funnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FunnelChart data={data.funnelData} />
            </CardContent>
          </Card>

          {/* Source Attribution */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
                <Target className="h-5 w-5 text-emerald-500" />
                Source Attribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SourceAttributionChart data={data.sourceData} />
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pipeline Value by Stage */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
                <DollarSign className="h-5 w-5 text-emerald-500" />
                Pipeline Value by Stage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PipelineValueChart data={data.pipelineValueData} />
            </CardContent>
          </Card>

          {/* Monthly Deals */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Monthly Deals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MonthlyDealsChart data={data.monthlyData} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
