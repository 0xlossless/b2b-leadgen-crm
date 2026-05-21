import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { renderEmail, INDUSTRY_MAP } from "@/lib/email-templates";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function ulid() {
  const t = Date.now().toString(36).toUpperCase().padStart(10, "0");
  const r = Array.from({ length: 16 }, () =>
    "0123456789ABCDEFGHJKMNPQRSTVWXYZ"[Math.floor(Math.random() * 32)]
  ).join("");
  return t + r;
}

// POST /api/outreach/bulk — Generate emails for all leads with verified emails
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { variant = "initial", dryRun = true, industries } = await request.json();

    // Get all leads with contacts that have emails
    const { data: leads, error } = await supabase
      .from("leads")
      .select("id, company_name, industry, city, contacts(id, full_name, email, email_verified, phone)")
      .order("company_name");

    if (error) throw error;
    if (!leads) return NextResponse.json({ error: "No leads found" }, { status: 404 });

    // Filter to leads with email contacts
    const leadsWithEmail = leads.filter((l: Record<string, unknown>) => {
      const contacts = l.contacts as Array<Record<string, unknown>> || [];
      return contacts.some((c) => c.email && typeof c.email === "string" && c.email.includes("@"));
    });

    // Optional industry filter
    const filtered = industries
      ? leadsWithEmail.filter((l: Record<string, unknown>) => industries.includes(l.industry))
      : leadsWithEmail;

    const drafts: Array<Record<string, unknown>> = [];
    let created = 0;

    for (const lead of filtered) {
      const contacts = lead.contacts as Array<Record<string, unknown>> || [];
      const contact = contacts.find((c) => c.email && typeof c.email === "string" && c.email.includes("@"));
      if (!contact) continue;

      const email = renderEmail(
        lead.industry as string || "",
        variant as "initial" | "followup",
        {
          company_name: (lead.company_name as string) || "your company",
          contact_name: (contact.full_name as string) || "there",
          city: (lead.city as string) || "the Bay Area",
        }
      );

      const draft = {
        leadId: lead.id,
        companyName: lead.company_name,
        industry: lead.industry,
        city: lead.city,
        contactName: contact.full_name,
        emailTo: contact.email,
        phone: contact.phone || "",
        subject: email?.subject || `Golden State Epoxy — Premium Flooring for ${lead.company_name}`,
        body: email?.body || "",
        templateUsed: INDUSTRY_MAP[lead.industry as string] || "generic",
        variant,
      };

      drafts.push(draft);

      // If not dry run, save to activities
      if (!dryRun) {
        await supabase.from("activities").insert({
          id: ulid(),
          lead_id: lead.id,
          type: "email_draft",
          description: `Email draft: ${draft.subject}`,
          metadata: JSON.stringify({
            ...draft,
            status: "draft",
          }),
          created_at: new Date().toISOString(),
        });
        created++;
      }
    }

    // Summary by industry
    const byIndustry: Record<string, number> = {};
    for (const d of drafts) {
      const ind = (d.templateUsed as string) || "unknown";
      byIndustry[ind] = (byIndustry[ind] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      dryRun,
      total: drafts.length,
      created: dryRun ? 0 : created,
      byIndustry,
      drafts: dryRun ? drafts : drafts.map((d) => ({
        companyName: d.companyName,
        emailTo: d.emailTo,
        subject: d.subject,
        templateUsed: d.templateUsed,
      })),
    });
  } catch (error) {
    console.error("POST /api/outreach/bulk error:", error);
    return NextResponse.json({ error: "Failed to generate bulk outreach" }, { status: 500 });
  }
}
