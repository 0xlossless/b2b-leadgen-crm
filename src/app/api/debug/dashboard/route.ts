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
  const supabase = getSupabase();

  const { data: allDeals, error } = await supabase.from("deals").select("*");
  const deals = allDeals || [];

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const activeDeals = deals.filter(d => d.stage !== "closed_won" && d.stage !== "closed_lost");
  const pipelineValue = activeDeals.reduce((s, d) => s + (parseFloat(d.deal_value || "0") || 0), 0);

  const closedThisMonth = deals.filter(d => d.stage === "closed_won" && d.close_date && d.close_date >= firstOfMonth);
  const wonDeals = deals.filter(d => d.stage === "closed_won");
  const wonValue = wonDeals.reduce((s, d) => s + (parseFloat(d.deal_value || "0") || 0), 0);
  const avgDealSize = wonDeals.length > 0 ? Math.round(wonValue / wonDeals.length) : 0;
  const conversionRate = deals.length > 0 ? Math.round((wonDeals.length / deals.length) * 1000) / 10 : 0;

  return NextResponse.json({
    debug: {
      totalDeals: deals.length,
      rawDeals: deals.map(d => ({
        id: d.id,
        stage: d.stage,
        deal_value: d.deal_value,
        close_date: d.close_date,
      })),
      firstOfMonth,
      activeDeals: activeDeals.length,
      pipelineValue,
      closedThisMonth: closedThisMonth.length,
      closedThisMonthDeals: closedThisMonth.map(d => ({ stage: d.stage, close_date: d.close_date })),
      wonDeals: wonDeals.length,
      wonValue,
      avgDealSize,
      conversionRate,
    },
    error: error?.message,
  });
}
