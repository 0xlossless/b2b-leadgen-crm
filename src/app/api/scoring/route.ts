import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ulid } from "ulid";
import { scoreLead } from "@/lib/scoring";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { leadId, all } = body;
    const nowDate = new Date().toISOString();

    let leadIds: string[] = [];
    if (all) {
      const { data } = await supabase.from("leads").select("id");
      leadIds = (data || []).map(l => l.id);
    } else if (leadId) {
      leadIds = [leadId];
    }

    const results = [];
    for (const id of leadIds) {
      const { data: lead } = await supabase.from("leads").select("*").eq("id", id).single();
      if (!lead) continue;

      const { data: contacts } = await supabase.from("contacts").select("*").eq("lead_id", id);
      const contact = contacts?.[0];

      const scoreResult = scoreLead({
        industry: lead.industry,
        employeeCount: lead.employee_count,
        hasDecisionMaker: contact?.is_decision_maker ?? false,
        techStack: lead.tech_stack,
        hasVerifiedEmail: contact?.email_verified ?? false,
        hasFundingEvent: false,
        monthlyTraffic: 0,
      });

      // Upsert score
      const { data: existing } = await supabase.from("lead_scores").select("id").eq("lead_id", id).single();
      if (existing) {
        await supabase.from("lead_scores").update({ ...scoreResult, scored_at: nowDate }).eq("lead_id", id);
      } else {
        await supabase.from("lead_scores").insert({ id: ulid(), lead_id: id, ...scoreResult, scored_at: nowDate });
      }

      results.push({ leadId: id, ...scoreResult });
    }

    return NextResponse.json({ scored: results.length, results });
  } catch (error) {
    console.error("POST /api/scoring error:", error);
    return NextResponse.json({ error: "Failed to score leads" }, { status: 500 });
  }
}
