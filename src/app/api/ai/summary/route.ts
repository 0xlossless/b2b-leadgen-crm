import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { leadId } = await request.json();

    const { data: lead } = await supabase.from("leads").select("*, contacts(*), lead_scores(*), deals(*), activities(*)").eq("id", leadId).single();
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const contact = lead.contacts?.[0];
    const score = lead.lead_scores?.[0];
    const deal = lead.deals?.[0];
    const activityCount = lead.activities?.length || 0;

    let techStack: string[] = [];
    try { if (lead.tech_stack) techStack = JSON.parse(lead.tech_stack); } catch {}

    const summary = `${lead.company_name} is a ${lead.industry || "business"} company${lead.city ? ` based in ${lead.city}, ${lead.state}` : ""}${lead.employee_count ? ` with approximately ${lead.employee_count} employees` : ""}. ${contact ? `Primary contact is ${contact.full_name}${contact.title ? ` (${contact.title})` : ""}${contact.email_verified ? " with a verified email" : ""}.` : "No contact information available."} ${score ? `Lead score: ${score.total_score}/100 (${score.tier}).` : ""} ${deal ? `Current stage: ${deal.stage.replace(/_/g, " ")}${deal.deal_value && parseFloat(deal.deal_value) > 0 ? ` with deal value $${parseFloat(deal.deal_value).toLocaleString()}` : ""}.` : ""} ${techStack.length > 0 ? `Tech stack includes ${techStack.join(", ")}.` : ""} ${activityCount > 0 ? `${activityCount} activities logged.` : ""}`;

    return NextResponse.json({
      summary: summary.trim(),
      generatedAt: new Date().toISOString(),
      leadId,
    });
  } catch (error) {
    console.error("POST /api/ai/summary error:", error);
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}
