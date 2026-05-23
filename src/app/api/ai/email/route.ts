import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { renderEmail, getAvailableIndustries, INDUSTRY_MAP, type TemplateVars } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { leadId, variant = "initial" } = await request.json();

    const { data: lead } = await supabase.from("leads").select("*, contacts(*), deals(*), activities(*)").eq("id", leadId).single();
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const contact = lead.contacts?.[0];
    const deal = lead.deals?.[0];
    const industry = lead.industry || "";
    const emailVariant = variant === "followup" ? "followup" : "initial";

    // Extract quote data from activities (if this lead came from a website quote)
    let coatingType = "";
    let squareFootage = "";
    let projectType = "";
    let customerMessage = "";

    const quoteActivity = (lead.activities || []).find(
      (a: any) => a.type === "quote_request"
    );
    if (quoteActivity?.metadata) {
      try {
        const meta = typeof quoteActivity.metadata === "string"
          ? JSON.parse(quoteActivity.metadata)
          : quoteActivity.metadata;
        coatingType = meta.coatingType || "";
        squareFootage = meta.squareFootage || "";
        projectType = meta.projectType || "";
        customerMessage = meta.message || "";
      } catch {}
    }

    // Build template vars with all available data
    const vars: TemplateVars = {
      company_name: lead.company_name?.replace(" — Quote Request", "") || "your company",
      contact_name: contact?.full_name || "there",
      city: lead.city || "the Bay Area",
      coating_type: coatingType || undefined,
      square_footage: squareFootage || undefined,
      project_type: projectType || undefined,
      message: customerMessage || undefined,
    };

    // Try industry-specific or quote-aware template
    const rendered = renderEmail(industry, emailVariant as "initial" | "followup", vars);

    if (rendered) {
      return NextResponse.json({
        subject: rendered.subject,
        body: rendered.body,
        to: contact?.email || "",
        phone: contact?.phone || "",
        contactName: contact?.full_name || "",
        companyName: lead.company_name,
        industry: industry,
        variant: emailVariant,
        dealValue: deal?.deal_value ?? 0,
        templateUsed: coatingType ? "quote_personalized" : (INDUSTRY_MAP[industry] || industry),
        availableIndustries: getAvailableIndustries(),
      });
    }

    // Fallback generic template
    const subject = `Quick question for ${vars.company_name}`;
    const body = `Hey ${vars.contact_name},

I'm Joseph with Golden State Epoxy Flooring, based in the ${vars.city} area. I came across ${vars.company_name} and figured I'd reach out.

We do commercial and residential epoxy floor coatings — everything from garage floors to full warehouse or retail spaces. If your floors have been on your mind at all, I'd be happy to come take a look and give you an honest idea of what it would take. No cost for that.

If the timing's off, no worries at all. Just wanted to put it on your radar.

Joseph Galindo
Golden State Epoxy Flooring
(925) 518-2985`;

    return NextResponse.json({
      subject,
      body,
      to: contact?.email || "",
      phone: contact?.phone || "",
      contactName: contact?.full_name || "",
      companyName: lead.company_name,
      industry: industry,
      variant: "generic",
      dealValue: deal?.deal_value ?? 0,
      templateUsed: "generic",
      availableIndustries: getAvailableIndustries(),
    });
  } catch (error) {
    console.error("POST /api/ai/email error:", error);
    return NextResponse.json({ error: "Failed to generate email" }, { status: 500 });
  }
}
