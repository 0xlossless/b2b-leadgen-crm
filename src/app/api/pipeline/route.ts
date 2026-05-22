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
    const { data: deals, error } = await supabase
      .from("deals")
      .select("*, leads(company_name, industry, city, lead_scores(tier, total_score), contacts(full_name, email, phone))")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const mapped = (deals || []).map(d => ({
      id: d.id,
      leadId: d.lead_id,
      stage: d.stage,
      dealValue: d.deal_value,
      assignedRep: d.assigned_rep,
      nextAction: d.next_action,
      nextActionDate: d.next_action_date,
      closeDate: d.close_date,
      winLossReason: d.win_loss_reason,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      companyName: d.leads?.company_name,
      industry: d.leads?.industry,
      city: d.leads?.city,
      contactName: d.leads?.contacts?.[0]?.full_name,
      contactEmail: d.leads?.contacts?.[0]?.email,
      contactPhone: d.leads?.contacts?.[0]?.phone,
      tier: d.leads?.lead_scores?.[0]?.tier ?? null,
      totalScore: d.leads?.lead_scores?.[0]?.total_score ?? null,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("GET /api/pipeline error:", error);
    return NextResponse.json({ error: "Failed to fetch pipeline" }, { status: 500 });
  }
}
