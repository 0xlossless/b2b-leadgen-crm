import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, leadScores, deals, activities } from "@/lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { PIPELINE_STAGES } from "@/lib/db/schema";

// ─── GET /api/analytics ─────────────────────────────────
export async function GET() {
  try {
    // Total leads
    const [{ count: totalLeads }] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(leads);

    // Leads by tier
    const [{ count: hotLeads }] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(leadScores)
      .where(eq(leadScores.tier, "hot"));

    const [{ count: warmLeads }] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(leadScores)
      .where(eq(leadScores.tier, "warm"));

    const [{ count: coldLeads }] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(leadScores)
      .where(eq(leadScores.tier, "cold"));

    // Pipeline value (sum of all non-closed deal values)
    const [{ total: pipelineValue }] = await db
      .select({ total: sql<number>`coalesce(cast(sum(cast(${deals.dealValue} as numeric)) as float), 0)` })
      .from(deals)
      .where(
        sql`${deals.stage} NOT IN ('closed_won', 'closed_lost')`
      );

    // Deals closed this month
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);
    const firstOfMonthStr = firstOfMonth.toISOString();

    const [closedThisMonth] = await db
      .select({
        count: sql<number>`cast(count(*) as integer)`,
        value: sql<number>`coalesce(cast(sum(cast(${deals.dealValue} as numeric)) as float), 0)`,
      })
      .from(deals)
      .where(
        sql`${deals.stage} = 'closed_won' AND ${deals.closeDate} >= ${firstOfMonthStr}`
      );

    // Total deals & closed won for conversion rate
    const [{ totalDeals }] = await db
      .select({ totalDeals: sql<number>`cast(count(*) as integer)` })
      .from(deals);

    const [{ closedWon }] = await db
      .select({ closedWon: sql<number>`cast(count(*) as integer)` })
      .from(deals)
      .where(eq(deals.stage, "closed_won"));

    // Average deal size (closed won)
    const [{ avg: avgDealSize }] = await db
      .select({ avg: sql<number>`coalesce(cast(avg(cast(${deals.dealValue} as numeric)) as float), 0)` })
      .from(deals)
      .where(eq(deals.stage, "closed_won"));

    const conversionRate = totalDeals > 0 ? closedWon / totalDeals : 0;

    // Leads by source
    const leadsBySource = await db
      .select({
        source: leads.source,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(leads)
      .groupBy(leads.source)
      .orderBy(sql`count(*) desc`);

    // Score distribution (0-20, 20-40, 40-60, 60-80, 80-100)
    const scoreRanges = [
      { range: "0-20", min: 0, max: 20 },
      { range: "20-40", min: 20, max: 40 },
      { range: "40-60", min: 40, max: 60 },
      { range: "60-80", min: 60, max: 80 },
      { range: "80-100", min: 80, max: 100 },
    ];

    const scoreDistribution = await Promise.all(
      scoreRanges.map(async ({ range, min, max }) => {
        const [{ count }] = await db
          .select({ count: sql<number>`cast(count(*) as integer)` })
          .from(leadScores)
          .where(
            max === 100
              ? sql`${leadScores.totalScore} >= ${min} AND ${leadScores.totalScore} <= ${max}`
              : sql`${leadScores.totalScore} >= ${min} AND ${leadScores.totalScore} < ${max}`
          );
        return { range, count };
      })
    );

    // Pipeline funnel
    const pipelineFunnel = await Promise.all(
      PIPELINE_STAGES.map(async (stage) => {
        const [result] = await db
          .select({
            count: sql<number>`cast(count(*) as integer)`,
            value: sql<number>`coalesce(cast(sum(cast(${deals.dealValue} as numeric)) as float), 0)`,
          })
          .from(deals)
          .where(eq(deals.stage, stage));
        return { stage, count: result.count, value: result.value };
      })
    );

    // Recent activities (last 20 with lead company name)
    const recentActivities = await db
      .select({
        activity: activities,
        companyName: leads.companyName,
      })
      .from(activities)
      .leftJoin(leads, eq(leads.id, activities.leadId))
      .orderBy(desc(activities.createdAt))
      .limit(20);

    return NextResponse.json({
      totalLeads,
      hotLeads,
      warmLeads,
      coldLeads,
      pipelineValue,
      dealsClosedThisMonth: {
        count: closedThisMonth.count,
        value: closedThisMonth.value,
      },
      avgDealSize: Math.round(avgDealSize * 100) / 100,
      conversionRate: Math.round(conversionRate * 10000) / 10000,
      leadsBySource,
      scoreDistribution,
      pipelineFunnel,
      recentActivities: recentActivities.map((r) => ({
        ...r.activity,
        companyName: r.companyName,
      })),
    });
  } catch (error) {
    console.error("GET /api/analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
