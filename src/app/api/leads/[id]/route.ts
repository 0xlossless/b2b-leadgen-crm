import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── GET /api/leads/[id] ─────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = getSupabase();

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const { data: contactsData } = await supabase
      .from("contacts")
      .select("*")
      .eq("lead_id", id);

    const { data: scoreData } = await supabase
      .from("lead_scores")
      .select("*")
      .eq("lead_id", id)
      .single();

    const { data: dealsData } = await supabase
      .from("deals")
      .select("*")
      .eq("lead_id", id);

    const { data: activitiesData } = await supabase
      .from("activities")
      .select("*")
      .eq("lead_id", id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Map to camelCase for API response
    const leadResult = {
      id: lead.id,
      companyName: lead.company_name,
      website: lead.website,
      industry: lead.industry,
      employeeCount: lead.employee_count,
      revenueRange: lead.revenue_range,
      city: lead.city,
      state: lead.state,
      country: lead.country,
      techStack: lead.tech_stack,
      source: lead.source,
      scrapeJobId: lead.scrape_job_id,
      confidenceScore: lead.confidence_score,
      createdAt: lead.created_at,
      updatedAt: lead.updated_at,
    };

    return NextResponse.json({
      ...leadResult,
      contacts: (contactsData ?? []).map((c) => ({
        id: c.id,
        leadId: c.lead_id,
        fullName: c.full_name,
        title: c.title,
        email: c.email,
        emailVerified: c.email_verified,
        phone: c.phone,
        linkedinUrl: c.linkedin_url,
        isDecisionMaker: c.is_decision_maker,
        createdAt: c.created_at,
      })),
      score: scoreData
        ? {
            id: scoreData.id,
            leadId: scoreData.lead_id,
            totalScore: scoreData.total_score,
            tier: scoreData.tier,
            industryMatch: scoreData.industry_match,
            employeeFit: scoreData.employee_fit,
            decisionMaker: scoreData.decision_maker,
            techMatch: scoreData.tech_match,
            fundingEvent: scoreData.funding_event,
            trafficScore: scoreData.traffic_score,
            emailVerified: scoreData.email_verified_score,
            disqualified: scoreData.disqualified,
            disqualifyReason: scoreData.disqualify_reason,
            scoredAt: scoreData.scored_at,
          }
        : null,
      deals: (dealsData ?? []).map((d) => ({
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
      })),
      activities: (activitiesData ?? []).map((a) => ({
        id: a.id,
        leadId: a.lead_id,
        dealId: a.deal_id,
        type: a.type,
        description: a.description,
        metadata: a.metadata,
        createdAt: a.created_at,
      })),
    });
  } catch (error) {
    console.error("GET /api/leads/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch lead" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/leads/[id] ───────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const supabase = getSupabase();
    const { data: existing, error: existError } = await supabase
      .from("leads")
      .select("id")
      .eq("id", id)
      .single();

    if (existError || !existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Map camelCase input to snake_case DB columns
    const fieldMap: Record<string, string> = {
      companyName: "company_name",
      website: "website",
      industry: "industry",
      employeeCount: "employee_count",
      revenueRange: "revenue_range",
      city: "city",
      state: "state",
      country: "country",
      techStack: "tech_stack",
      source: "source",
      confidenceScore: "confidence_score",
    };

    const updates: Record<string, any> = {};
    for (const [camelKey, snakeKey] of Object.entries(fieldMap)) {
      if (body[camelKey] !== undefined) {
        updates[snakeKey] = body[camelKey];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    updates.updated_at = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("leads")
      .update(updates)
      .eq("id", id);

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update lead" },
        { status: 500 }
      );
    }

    const { data: updated } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .single();

    if (!updated) {
      return NextResponse.json({ error: "Lead not found after update" }, { status: 500 });
    }

    return NextResponse.json({
      id: updated.id,
      companyName: updated.company_name,
      website: updated.website,
      industry: updated.industry,
      employeeCount: updated.employee_count,
      revenueRange: updated.revenue_range,
      city: updated.city,
      state: updated.state,
      country: updated.country,
      techStack: updated.tech_stack,
      source: updated.source,
      scrapeJobId: updated.scrape_job_id,
      confidenceScore: updated.confidence_score,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    });
  } catch (error) {
    console.error("PATCH /api/leads/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update lead" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/leads/[id] ──────────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = getSupabase();

    const { data: existing, error: existError } = await supabase
      .from("leads")
      .select("id")
      .eq("id", id)
      .single();

    if (existError || !existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Cascade deletes are handled by FK constraints, but let's be explicit
    await supabase.from("activities").delete().eq("lead_id", id);
    await supabase.from("deals").delete().eq("lead_id", id);
    await supabase.from("lead_scores").delete().eq("lead_id", id);
    await supabase.from("contacts").delete().eq("lead_id", id);
    await supabase.from("leads").delete().eq("id", id);

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error("DELETE /api/leads/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete lead" },
      { status: 500 }
    );
  }
}
