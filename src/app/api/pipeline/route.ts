import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function supaFetch(path: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: {
      "apikey": key,
      "Authorization": `Bearer ${key}`,
    },
    cache: "no-store",
  });
  return res.json();
}

export async function GET() {
  try {
    // Query deals directly via REST
    const deals = await supaFetch("deals?select=*&order=created_at.desc");

    if (!deals || deals.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch leads separately
    const leadIds = Array.from(new Set(deals.map((d: any) => d.lead_id).filter(Boolean)));
    const leadsQuery = leadIds.map(id => `id.eq.${id}`).join(",");
    const allLeads = leadIds.length > 0
      ? await supaFetch(`leads?select=*,contacts(full_name,email,phone)&or=(${leadsQuery})`)
      : [];
    const leadMap = new Map<string, any>((allLeads || []).map((l: any) => [l.id, l]));

    // Fetch lead_scores separately
    const scoresQuery = leadIds.map(id => `lead_id.eq.${id}`).join(",");
    const allScores = leadIds.length > 0
      ? await supaFetch(`lead_scores?select=*&or=(${scoresQuery})`)
      : [];
    const scoreMap = new Map<string, any>((allScores || []).map((s: any) => [s.lead_id, s]));

    const mapped = deals.map((d: any) => {
      const lead = leadMap.get(d.lead_id);
      const score = scoreMap.get(d.lead_id);
      return {
        id: d.id,
        leadId: d.lead_id,
        stage: d.stage,
        dealValue: d.deal_value ? Number(d.deal_value) : null,
        assignedRep: d.assigned_rep,
        nextAction: d.next_action,
        nextActionDate: d.next_action_date,
        closeDate: d.close_date,
        winLossReason: d.win_loss_reason,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        companyName: lead?.company_name ?? "Unknown",
        industry: lead?.industry,
        city: lead?.city,
        contactName: lead?.contacts?.[0]?.full_name,
        contactEmail: lead?.contacts?.[0]?.email,
        contactPhone: lead?.contacts?.[0]?.phone,
        tier: score?.tier ?? null,
        totalScore: score?.total_score ?? null,
        qualificationTier: score?.disqualify_reason ?? null,
      };
    });

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("GET /api/pipeline error:", error);
    return NextResponse.json({ error: "Failed to fetch pipeline" }, { status: 500 });
  }
}
