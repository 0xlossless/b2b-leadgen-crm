import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET() {
  try {
    const supabase = getSupabase();

    const { count: totalLeads } = await supabase.from("leads").select("*", { count: "exact", head: true });
    const { data: allDeals } = await supabase.from("deals").select("*");
    const deals = allDeals || [];

    const activeDeals = deals.filter(d => d.stage !== "closed_won" && d.stage !== "closed_lost");
    const pipelineValue = activeDeals.reduce((s, d) => s + (parseFloat(d.deal_value || "0") || 0), 0);

    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);
    const closedThisMonth = deals.filter(d => d.stage === "closed_won" && d.close_date && d.close_date >= firstOfMonth.toISOString());
    const closedValue = closedThisMonth.reduce((s, d) => s + (parseFloat(d.deal_value || "0") || 0), 0);

    const wonDeals = deals.filter(d => d.stage === "closed_won");
    const lostDeals = deals.filter(d => d.stage === "closed_lost");
    const conversionRate = (wonDeals.length + lostDeals.length) > 0
      ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100)
      : 0;

    const avgDealSize = wonDeals.length > 0
      ? Math.round(wonDeals.reduce((s, d) => s + (parseFloat(d.deal_value || "0") || 0), 0) / wonDeals.length)
      : 0;

    // Pipeline by stage
    const stageData: Record<string, { count: number; value: number }> = {};
    deals.forEach(d => {
      if (!stageData[d.stage]) stageData[d.stage] = { count: 0, value: 0 };
      stageData[d.stage].count++;
      stageData[d.stage].value += parseFloat(d.deal_value || "0") || 0;
    });

    // Source attribution
    const { data: leadsWithScores } = await supabase.from("leads").select("source, lead_scores(total_score)");
    const sourceMap = new Map<string, { totalScore: number; count: number }>();
    (leadsWithScores || []).forEach(l => {
      const curr = sourceMap.get(l.source) ?? { totalScore: 0, count: 0 };
      curr.totalScore += l.lead_scores?.[0]?.total_score ?? 0;
      curr.count++;
      sourceMap.set(l.source, curr);
    });
    const sourceAttribution = Array.from(sourceMap.entries()).map(([source, { totalScore, count }]) => ({
      source,
      avgScore: count > 0 ? Math.round(totalScore / count) : 0,
      leadCount: count,
    }));

    return NextResponse.json({
      totalLeads: totalLeads || 0,
      totalDeals: deals.length,
      pipelineValue,
      closedThisMonth: closedThisMonth.length,
      closedValue,
      conversionRate,
      avgDealSize,
      stageData,
      sourceAttribution,
    });
  } catch (error) {
    console.error("GET /api/analytics error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
