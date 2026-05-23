import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: allDeals, error: dealsError } = await supabase.from("deals").select("*");
  const deals = allDeals || [];

  const { count: totalLeads, error: leadsError } = await supabase.from("leads").select("*", { count: "exact", head: true });

  const activeDeals = deals.filter(d => d.stage !== "closed_won" && d.stage !== "closed_lost");
  const pipelineValue = activeDeals.reduce((s, d) => s + (parseFloat(d.deal_value || "0") || 0), 0);

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const closedThisMonth = deals.filter(d => d.stage === "closed_won" && d.close_date && d.close_date >= firstOfMonth);

  const wonDeals = deals.filter(d => d.stage === "closed_won");
  const wonValue = wonDeals.reduce((s, d) => s + (parseFloat(d.deal_value || "0") || 0), 0);
  const avgDealSize = wonDeals.length > 0 ? Math.round(wonValue / wonDeals.length) : 0;
  const conversionRate = deals.length > 0 ? Math.round((wonDeals.length / deals.length) * 1000) / 10 : 0;

  return NextResponse.json({
    env: {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      usingKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? "service_role" : "anon",
    },
    errors: { dealsError, leadsError },
    totalLeads,
    rawDeals: deals.map(d => ({
      id: d.id,
      stage: d.stage,
      deal_value: d.deal_value,
      deal_value_type: typeof d.deal_value,
      close_date: d.close_date,
      close_date_type: typeof d.close_date,
    })),
    computed: {
      activeDeals: activeDeals.length,
      pipelineValue,
      closedThisMonth: closedThisMonth.length,
      closedThisMonthDetails: closedThisMonth.map(d => ({ id: d.id, close_date: d.close_date })),
      wonDeals: wonDeals.length,
      wonValue,
      avgDealSize,
      conversionRate,
      firstOfMonth,
    },
  });
}
