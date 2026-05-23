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
import { WebsiteAnalytics } from "@/components/dashboard/website-analytics";

export const dynamic = "force-dynamic";

function formatCurrency(value: number) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

// Use direct REST API instead of Supabase JS client to avoid stale data
async function supaFetch(path: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: {
      "apikey": key,
      "Authorization": `Bearer ${key}`,
      "Prefer": "count=exact",
    },
    cache: "no-store",
  });
  const data = await res.json();
  const count = res.headers.get("content-range")?.split("/")?.[1];
  return { data, count: count ? parseInt(count) : null };
}

async function getDashboardData() {
  // Fetch all data via direct REST (avoids Supabase JS client caching issue)
  const [leadsRes, dealsRes, scoresRes, activitiesRes] = await Promise.all([
    supaFetch("leads?select=id,source"),
    supaFetch("deals?select=*"),
    supaFetch("lead_scores?select=total_score,tier,lead_id"),
    supaFetch("activities?select=id,type,description,created_at,lead_id&order=created_at.desc&limit=20"),
  ]);

  const allLeads = leadsRes.data || [];
  const deals = dealsRes.data || [];
  const allScores = scoresRes.data || [];
  const rawActivities = activitiesRes.data || [];

  const totalLeads = allLeads.length;
  const hotLeads = allScores.filter((s: any) => s.tier === "hot").length;

  const activeDeals = deals.filter((d: any) => d.stage !== "closed_won" && d.stage !== "closed_lost");
  const pipelineValue = activeDeals.reduce((s: number, d: any) => s + (Number(d.deal_value) || 0), 0);

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const closedThisMonth = deals.filter((d: any) => d.stage === "closed_won" && d.close_date && d.close_date >= firstOfMonth).length;

  const wonDeals = deals.filter((d: any) => d.stage === "closed_won");
  const wonValue = wonDeals.reduce((s: number, d: any) => s + (Number(d.deal_value) || 0), 0);
  const avgDealSize = wonDeals.length > 0 ? Math.round(wonValue / wonDeals.length) : 0;
  const conversionRate = deals.length > 0 ? Math.round((wonDeals.length / deals.length) * 1000) / 10 : 0;

  // Activities
  const activities = rawActivities.map((a: any) => ({
    id: a.id,
    type: a.type,
    description: a.description,
    createdAt: a.created_at,
    leadId: a.lead_id,
  }));

  // Leads by source
  const sourceMap = new Map<string, number>();
  allLeads.forEach((l: any) => sourceMap.set(l.source, (sourceMap.get(l.source) || 0) + 1));
  const leadsBySource = Array.from(sourceMap.entries()).map(([source, count]) => ({ source, count }));

  // Score distribution
  const ranges = ["0-20", "20-40", "40-60", "60-80", "80-100"];
  const scoreDist = ranges.map(range => {
    const [min, max] = range.split("-").map(Number);
    const count = allScores.filter((s: any) => s.total_score >= min && (range === "80-100" ? s.total_score <= max : s.total_score < max)).length;
    return { range, count };
  });

  // Pipeline funnel
  const stageMap = new Map<string, number>();
  deals.forEach((d: any) => stageMap.set(d.stage, (stageMap.get(d.stage) || 0) + 1));
  const pipelineFunnel = Array.from(stageMap.entries()).map(([stage, count]) => ({ stage, count }));

  return {
    kpis: {
      totalLeads,
      hotLeads,
      pipelineValue,
      closedThisMonth,
      avgDealSize,
      conversionRate,
      totalRevenue: wonValue,
    },
    activities,
    leadsBySource,
    scoreDistribution: scoreDist,
    pipelineFunnel,
  };
}

export default async function CommandCenter() {
  const data = await getDashboardData();

  const kpiCards = [
    { title: "Total Leads", value: data.kpis.totalLeads.toString(), sublabel: "All time", icon: Users, iconColor: "text-zinc-400", iconBg: "bg-zinc-400/10" },
    { title: "Hot Leads", value: data.kpis.hotLeads.toString(), sublabel: "Score 80+", icon: Flame, iconColor: "text-red-400", iconBg: "bg-red-400/10" },
    { title: "Pipeline Value", value: formatCurrency(data.kpis.pipelineValue), sublabel: "Active deals", icon: DollarSign, iconColor: "text-amber-400", iconBg: "bg-amber-400/10" },
    { title: "Deals Closed", value: data.kpis.closedThisMonth.toString(), sublabel: "This month", icon: Trophy, iconColor: "text-amber-400", iconBg: "bg-amber-400/10" },
    { title: "Avg Deal Size", value: formatCurrency(data.kpis.avgDealSize), sublabel: "Closed won", icon: TrendingUp, iconColor: "text-blue-400", iconBg: "bg-blue-400/10" },
    { title: "Conversion Rate", value: `${data.kpis.conversionRate}%`, sublabel: "Won / Total", icon: Target, iconColor: "text-purple-400", iconBg: "bg-purple-400/10" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">Golden State Epoxy</h1>
        <p className="text-sm text-zinc-400 mt-1">Pipeline overview for Golden State Epoxy Flooring</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title} className="bg-zinc-900 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">{kpi.title}</CardTitle>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${kpi.iconBg}`}>
                  <Icon className={`h-4 w-4 ${kpi.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-zinc-100">{kpi.value}</div>
                <p className="text-xs text-zinc-500 mt-1">{kpi.sublabel}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Annual Revenue Tracker */}
      {(() => {
        const goal = 250_000;
        const revenue = data.kpis.totalRevenue;
        const pct = Math.min((revenue / goal) * 100, 100);
        const milestones = [
          { label: "$50K", value: 50_000 },
          { label: "$100K", value: 100_000 },
          { label: "$200K", value: 200_000 },
        ];
        return (
          <Card className="bg-zinc-900 border-zinc-800 mb-8">
            <CardContent className="pt-6 pb-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-400/10">
                    <DollarSign className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-zinc-400">Annual Revenue</h3>
                    <p className="text-2xl font-bold text-zinc-100">{formatCurrency(revenue)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-zinc-500">Goal</p>
                  <p className="text-lg font-semibold text-amber-400">$250,000</p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="relative">
                <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${Math.max(pct, 0.5)}%`,
                      background: "linear-gradient(90deg, #f59e0b, #eab308, #a3e635)",
                    }}
                  />
                </div>
                {/* Milestone markers */}
                {milestones.map((m) => (
                  <div
                    key={m.label}
                    className="absolute top-0 h-4 w-px bg-zinc-600"
                    style={{ left: `${(m.value / goal) * 100}%` }}
                  />
                ))}
              </div>
              {/* Labels under bar */}
              <div className="relative mt-1.5 h-5">
                <span className="absolute left-0 text-[10px] text-zinc-500">$0</span>
                {milestones.map((m) => (
                  <span
                    key={m.label}
                    className="absolute text-[10px] text-zinc-500 -translate-x-1/2"
                    style={{ left: `${(m.value / goal) * 100}%` }}
                  >
                    {m.label}
                  </span>
                ))}
                <span className="absolute right-0 text-[10px] text-zinc-500">$250K</span>
              </div>
              {/* Percentage */}
              <p className="text-center text-sm text-zinc-400 mt-2">
                <span className="text-amber-400 font-semibold">{pct.toFixed(1)}%</span> of $250K goal
                {revenue > 0 && (
                  <span className="text-zinc-500"> — {formatCurrency(goal - revenue)} to go</span>
                )}
              </p>
            </CardContent>
          </Card>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-8">
        <Card className="lg:col-span-3 bg-zinc-900 border-zinc-800">
          <CardHeader><CardTitle className="text-zinc-100">Recent Activity</CardTitle></CardHeader>
          <CardContent><ActivityFeed activities={data.activities} /></CardContent>
        </Card>
        <Card className="lg:col-span-2 bg-zinc-900 border-zinc-800">
          <CardHeader><CardTitle className="text-zinc-100">Leads by Source</CardTitle></CardHeader>
          <CardContent><LeadsBySourceChart data={data.leadsBySource} /></CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader><CardTitle className="text-zinc-100">Score Distribution</CardTitle></CardHeader>
          <CardContent><ScoreDistributionChart data={data.scoreDistribution} /></CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader><CardTitle className="text-zinc-100">Pipeline Funnel</CardTitle></CardHeader>
          <CardContent><PipelineFunnelChart data={data.pipelineFunnel} /></CardContent>
        </Card>
      </div>

      {/* Website Analytics Section */}
      <WebsiteAnalytics />
    </div>
  );
}
