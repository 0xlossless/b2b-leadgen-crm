import { db, schema } from "@/lib/db";
import { eq, desc, sql } from "drizzle-orm";
import {
  Users,
  Flame,
  DollarSign,
  Trophy,
  TrendingUp,
  Target,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LeadsBySourceChart } from "@/components/dashboard/leads-by-source-chart";
import { ScoreDistributionChart } from "@/components/dashboard/score-distribution-chart";
import { PipelineFunnelChart } from "@/components/dashboard/pipeline-funnel-chart";
import { ActivityFeed } from "@/components/dashboard/activity-feed";

export const dynamic = "force-dynamic";

function formatCurrency(value: number) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

async function getDashboardData() {
  // Total leads
  const [totalLeads] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.leads);

  // Hot leads
  const [hotLeads] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.leadScores)
    .where(eq(schema.leadScores.tier, "hot"));

  // Pipeline value (active deals)
  const [pipelineValue] = await db
    .select({ total: sql<number>`coalesce(sum(cast(deal_value as numeric)), 0)` })
    .from(schema.deals)
    .where(sql`${schema.deals.stage} NOT IN ('closed_won', 'closed_lost')`);

  // Deals closed this month
  const [closedThisMonth] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.deals)
    .where(
      sql`${schema.deals.stage} = 'closed_won' AND ${schema.deals.closeDate} >= to_char(date_trunc('month', now()), 'YYYY-MM-DD')`
    );

  // Avg deal size (closed won)
  const [avgDeal] = await db
    .select({ avg: sql<number>`coalesce(avg(cast(deal_value as numeric)), 0)` })
    .from(schema.deals)
    .where(eq(schema.deals.stage, "closed_won"));

  // Conversion rate
  const [totalDeals] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.deals);
  const [wonDeals] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.deals)
    .where(eq(schema.deals.stage, "closed_won"));

  const conversionRate =
    totalDeals?.count && totalDeals.count > 0
      ? ((wonDeals?.count || 0) / totalDeals.count) * 100
      : 0;

  // Recent activities
  const activities = await db
    .select({
      id: schema.activities.id,
      type: schema.activities.type,
      description: schema.activities.description,
      createdAt: schema.activities.createdAt,
      leadId: schema.activities.leadId,
    })
    .from(schema.activities)
    .orderBy(desc(schema.activities.createdAt))
    .limit(20);

  // Leads by source
  const leadsBySource = await db
    .select({
      source: schema.leads.source,
      count: sql<number>`count(*)`,
    })
    .from(schema.leads)
    .groupBy(schema.leads.source);

  // Score distribution
  const scoreDistribution = await db
    .select({
      range: sql<string>`
        CASE 
          WHEN total_score >= 0 AND total_score < 20 THEN '0-20'
          WHEN total_score >= 20 AND total_score < 40 THEN '20-40'
          WHEN total_score >= 40 AND total_score < 60 THEN '40-60'
          WHEN total_score >= 60 AND total_score < 80 THEN '60-80'
          WHEN total_score >= 80 THEN '80-100'
        END`,
      count: sql<number>`count(*)`,
    })
    .from(schema.leadScores)
    .groupBy(
      sql`CASE 
        WHEN total_score >= 0 AND total_score < 20 THEN '0-20'
        WHEN total_score >= 20 AND total_score < 40 THEN '20-40'
        WHEN total_score >= 40 AND total_score < 60 THEN '40-60'
        WHEN total_score >= 60 AND total_score < 80 THEN '60-80'
        WHEN total_score >= 80 THEN '80-100'
      END`
    );

  // Pipeline funnel
  const pipelineFunnel = await db
    .select({
      stage: schema.deals.stage,
      count: sql<number>`count(*)`,
    })
    .from(schema.deals)
    .groupBy(schema.deals.stage);

  return {
    kpis: {
      totalLeads: totalLeads?.count || 0,
      hotLeads: hotLeads?.count || 0,
      pipelineValue: pipelineValue?.total || 0,
      closedThisMonth: closedThisMonth?.count || 0,
      avgDealSize: Math.round(avgDeal?.avg || 0),
      conversionRate: Math.round(conversionRate * 10) / 10,
    },
    activities,
    leadsBySource,
    scoreDistribution,
    pipelineFunnel,
  };
}

export default async function CommandCenter() {
  const data = await getDashboardData();

  const kpiCards = [
    {
      title: "Total Leads",
      value: data.kpis.totalLeads.toString(),
      sublabel: "All time",
      icon: Users,
      iconColor: "text-zinc-400",
      iconBg: "bg-zinc-400/10",
    },
    {
      title: "Hot Leads",
      value: data.kpis.hotLeads.toString(),
      sublabel: "Score 80+",
      icon: Flame,
      iconColor: "text-red-400",
      iconBg: "bg-red-400/10",
    },
    {
      title: "Pipeline Value",
      value: formatCurrency(data.kpis.pipelineValue),
      sublabel: "Active deals",
      icon: DollarSign,
      iconColor: "text-amber-400",
      iconBg: "bg-amber-400/10",
    },
    {
      title: "Deals Closed",
      value: data.kpis.closedThisMonth.toString(),
      sublabel: "This month",
      icon: Trophy,
      iconColor: "text-amber-400",
      iconBg: "bg-amber-400/10",
    },
    {
      title: "Avg Deal Size",
      value: formatCurrency(data.kpis.avgDealSize),
      sublabel: "Closed won",
      icon: TrendingUp,
      iconColor: "text-blue-400",
      iconBg: "bg-blue-400/10",
    },
    {
      title: "Conversion Rate",
      value: `${data.kpis.conversionRate}%`,
      sublabel: "Won / Total",
      icon: Target,
      iconColor: "text-purple-400",
      iconBg: "bg-purple-400/10",
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">Golden State Epoxy — Command Center</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Pipeline overview for Golden State Epoxy Flooring
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.title}
              className="bg-zinc-900 border-zinc-800"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">
                  {kpi.title}
                </CardTitle>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${kpi.iconBg}`}
                >
                  <Icon className={`h-4 w-4 ${kpi.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-zinc-100">
                  {kpi.value}
                </div>
                <p className="text-xs text-zinc-500 mt-1">{kpi.sublabel}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Middle Section: Activity Feed + Leads by Source */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-8">
        <Card className="lg:col-span-3 bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed activities={data.activities} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100">Leads by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <LeadsBySourceChart data={data.leadsBySource} />
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Score Distribution + Pipeline Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100">Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreDistributionChart data={data.scoreDistribution} />
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100">Pipeline Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <PipelineFunnelChart data={data.pipelineFunnel} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
