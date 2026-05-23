import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { renderEmail, INDUSTRY_MAP } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

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

// GET /api/outreach — List outreach activities for a lead or all
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");
    const status = searchParams.get("status"); // draft, sent, opened, replied

    let query = supabase
      .from("activities")
      .select("*")
      .in("type", ["email_draft", "email_sent", "email_opened", "email_replied"])
      .order("created_at", { ascending: false })
      .limit(100);

    if (leadId) query = query.eq("lead_id", leadId);

    const { data, error } = await query;
    if (error) throw error;

    // Parse metadata for each activity to get outreach details
    const outreach = (data || []).map((a: Record<string, unknown>) => {
      let meta: Record<string, unknown> = {};
      try {
        meta = typeof a.metadata === "string" ? JSON.parse(a.metadata as string) : (a.metadata || {});
      } catch {
        meta = {};
      }
      return {
        id: a.id,
        leadId: a.lead_id,
        type: a.type,
        status: meta.status || (a.type === "email_draft" ? "draft" : "sent"),
        subject: meta.subject || "",
        body: meta.body || "",
        emailTo: meta.email_to || "",
        templateUsed: meta.template_used || "",
        variant: meta.variant || "",
        createdAt: a.created_at,
        sentAt: meta?.sent_at || null,
      };
    });

    // Filter by status if requested
    const filtered = status ? outreach.filter((o: Record<string, unknown>) => o.status === status) : outreach;

    return NextResponse.json({
      outreach: filtered,
      total: filtered.length,
      stats: {
        drafts: outreach.filter((o: Record<string, unknown>) => o.status === "draft").length,
        sent: outreach.filter((o: Record<string, unknown>) => o.status === "sent").length,
        opened: outreach.filter((o: Record<string, unknown>) => o.status === "opened").length,
        replied: outreach.filter((o: Record<string, unknown>) => o.status === "replied").length,
      },
    });
  } catch (error) {
    console.error("GET /api/outreach error:", error);
    return NextResponse.json({ error: "Failed to fetch outreach" }, { status: 500 });
  }
}

// POST /api/outreach — Create outreach email for a lead
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { leadId, variant = "initial", customSubject, customBody } = await request.json();

    if (!leadId) {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    }

    // Fetch lead with contacts
    const { data: lead } = await supabase
      .from("leads")
      .select("*, contacts(*)")
      .eq("id", leadId)
      .single();

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const contact = lead.contacts?.[0];
    const industry = lead.industry || "";
    const emailTo = contact?.email || "";

    let subject: string;
    let body: string;
    let templateUsed: string;

    if (customSubject && customBody) {
      // Use custom email content
      subject = customSubject;
      body = customBody;
      templateUsed = "custom";
    } else {
      // Generate from template
      const rendered = renderEmail(industry, variant as "initial" | "followup", {
        company_name: lead.company_name?.replace(" — Quote Request", "") || "your company",
        contact_name: contact?.full_name || "there",
        city: lead.city || "the Bay Area",
      });

      if (rendered) {
        subject = rendered.subject;
        body = rendered.body;
        templateUsed = INDUSTRY_MAP[industry] || industry;
      } else {
        subject = `Quick question for ${lead.company_name}`;
        body = `Hey ${contact?.full_name || "there"},\n\nI'm Joseph with Golden State Epoxy Flooring. We do commercial and residential epoxy coatings in the ${lead.city || "Bay Area"} area. If your floors have been on your mind, I'd be happy to come take a look — no cost, no pressure.\n\nJoseph Galindo\n(925) 518-2985`;
        templateUsed = "generic";
      }
    }

    // Log as activity
    const activityId = ulid();
    const now = new Date().toISOString();

    const { error: actError } = await supabase.from("activities").insert({
      id: activityId,
      lead_id: leadId,
      type: "email_draft",
      description: `Email draft: ${subject}`,
      metadata: JSON.stringify({
        subject,
        body,
        email_to: emailTo,
        phone: contact?.phone || "",
        template_used: templateUsed,
        variant,
        status: "draft",
        contact_name: contact?.full_name || "",
        company_name: lead.company_name,
      }),
      created_at: now,
    });

    if (actError) throw actError;

    // Update deal stage to 'contacted' if it's still 'new_lead'
    const { data: deals } = await supabase
      .from("deals")
      .select("*")
      .eq("lead_id", leadId)
      .eq("stage", "new_lead")
      .limit(1);

    if (deals && deals.length > 0) {
      await supabase
        .from("deals")
        .update({ stage: "contacted", updated_at: now })
        .eq("id", deals[0].id);

      // Log stage change
      await supabase.from("activities").insert({
        id: ulid(),
        lead_id: leadId,
        deal_id: deals[0].id,
        type: "stage_change",
        description: "Stage: New Lead → Contacted (outreach initiated)",
        created_at: now,
      });
    }

    return NextResponse.json({
      success: true,
      outreach: {
        id: activityId,
        leadId,
        subject,
        body,
        emailTo,
        phone: contact?.phone || "",
        templateUsed,
        variant,
        status: "draft",
        companyName: lead.company_name,
        contactName: contact?.full_name || "",
        createdAt: now,
      },
    });
  } catch (error) {
    console.error("POST /api/outreach error:", error);
    return NextResponse.json({ error: "Failed to create outreach" }, { status: 500 });
  }
}

// PATCH /api/outreach — Update outreach status (draft → sent → opened → replied)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { activityId, status } = await request.json();

    if (!activityId || !status) {
      return NextResponse.json({ error: "activityId and status required" }, { status: 400 });
    }

    const validStatuses = ["draft", "sent", "opened", "replied"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be: ${validStatuses.join(", ")}` }, { status: 400 });
    }

    // Get current activity
    const { data: activity } = await supabase
      .from("activities")
      .select("*")
      .eq("id", activityId)
      .single();

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    // Update metadata with new status
    let meta: Record<string, unknown> = {};
    try {
      meta = typeof activity.metadata === "string" ? JSON.parse(activity.metadata) : (activity.metadata || {});
    } catch {
      meta = {};
    }
    meta.status = status;
    meta.updated_at = new Date().toISOString();

    // Update activity type to match status
    const typeMap: Record<string, string> = {
      draft: "email_draft",
      sent: "email_sent",
      opened: "email_opened",
      replied: "email_replied",
    };

    const { error } = await supabase
      .from("activities")
      .update({
        type: typeMap[status] || "email_draft",
        metadata: JSON.stringify(meta),
      })
      .eq("id", activityId);

    if (error) throw error;

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error("PATCH /api/outreach error:", error);
    return NextResponse.json({ error: "Failed to update outreach" }, { status: 500 });
  }
}
