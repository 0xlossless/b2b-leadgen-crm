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

    const { data: lead } = await supabase.from("leads").select("*, contacts(*), deals(*)").eq("id", leadId).single();
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const contact = lead.contacts?.[0];
    const deal = lead.deals?.[0];

    const subject = `Golden State Epoxy — Premium Flooring for ${lead.company_name}`;
    const body = `Hi ${contact?.full_name || "there"},

I'm Joseph with Golden State Epoxy Flooring. We specialize in commercial and residential epoxy flooring solutions in the ${lead.city || "Bay Area"} area.

I noticed ${lead.company_name} might benefit from our services${lead.industry ? ` in the ${lead.industry} space` : ""}. We offer:

• Metallic epoxy floors
• Commercial-grade coatings
• Garage floor transformations
• Custom color matching

Would you be open to a quick 15-minute call this week to discuss how we can help?

Best regards,
Joseph Galindo
Golden State Epoxy Flooring
(925) 518-2985`;

    return NextResponse.json({
      subject,
      body,
      to: contact?.email || "",
      contactName: contact?.full_name || "",
      companyName: lead.company_name,
      dealValue: deal?.deal_value ?? 0,
    });
  } catch (error) {
    console.error("POST /api/ai/email error:", error);
    return NextResponse.json({ error: "Failed to generate email" }, { status: 500 });
  }
}
