import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ulid } from "ulid";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const source = searchParams.get("source") || "";
    const tier = searchParams.get("tier") || "";
    const stage = searchParams.get("stage") || "";
    const offset = (page - 1) * limit;

    // Get leads with related data
    // Note: Using separate queries for lead_scores since FK relationship may not exist
    let query = supabase.from("leads").select("*, contacts(*), deals(*)", { count: "exact" });

    if (search) {
      query = query.or(`company_name.ilike.%${search}%,industry.ilike.%${search}%,city.ilike.%${search}%`);
    }
    if (source) query = query.eq("source", source);

    const { data: leads, count, error } = await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

    if (error) throw error;

    // Fetch all lead_scores for the returned leads
    const leadIds = (leads || []).map(l => l.id);
    const { data: allScores } = leadIds.length > 0
      ? await supabase.from("lead_scores").select("*").in("lead_id", leadIds)
      : { data: [] };
    
    const scoreMap = new Map((allScores || []).map(s => [s.lead_id, s]));

    // Filter by tier/stage in JS (since they're in related tables)
    let filtered = (leads || []).map(lead => {
      const score = scoreMap.get(lead.id);
      return {
      id: lead.id,
      companyName: lead.company_name,
      website: lead.website,
      industry: lead.industry,
      employeeCount: lead.employee_count,
      revenueRange: lead.revenue_range,
      city: lead.city,
      state: lead.state,
      country: lead.country,
      source: lead.source,
      confidenceScore: lead.confidence_score,
      score: score?.total_score ?? null,
      scoreTier: score?.tier ?? null,
      tier: score?.tier ?? null,
      qualificationTier: score?.disqualify_reason ?? null,
      stage: lead.deals?.[0]?.stage ?? null,
      dealStage: lead.deals?.[0]?.stage ?? null,
      dealValue: lead.deals?.[0]?.deal_value ?? null,
      assignedRep: lead.deals?.[0]?.assigned_rep ?? null,
      contactName: lead.contacts?.[0]?.full_name ?? null,
      contactEmail: lead.contacts?.[0]?.email ?? null,
      emailVerified: lead.contacts?.[0]?.email_verified ?? false,
      createdAt: lead.created_at,
      updatedAt: lead.updated_at,
    };
    });

    if (tier) filtered = filtered.filter(l => l.tier === tier);
    if (stage) filtered = filtered.filter(l => l.stage === stage);

    return NextResponse.json({
      leads: filtered,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("GET /api/leads error:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const nowDate = new Date().toISOString();

    const newLead = {
      id: ulid(),
      company_name: body.companyName,
      website: body.website || null,
      industry: body.industry || null,
      employee_count: body.employeeCount || null,
      revenue_range: body.revenueRange || null,
      city: body.city || null,
      state: body.state || null,
      country: body.country || "US",
      tech_stack: body.techStack ? JSON.stringify(body.techStack) : null,
      source: body.source || "manual",
      confidence_score: body.confidenceScore || 50,
      created_at: nowDate,
      updated_at: nowDate,
    };

    const { error } = await supabase.from("leads").insert(newLead);
    if (error) throw error;

    // Create default deal
    await supabase.from("deals").insert({
      id: ulid(),
      lead_id: newLead.id,
      stage: "new_lead",
      deal_value: "0",
      created_at: nowDate,
      updated_at: nowDate,
    });

    // Create contact if contact info provided
    if (body.contactName || body.contactEmail || body.contactPhone) {
      await supabase.from("contacts").insert({
        id: ulid(),
        lead_id: newLead.id,
        full_name: body.contactName || "Unknown",
        email: body.contactEmail || null,
        phone: body.contactPhone || null,
        created_at: nowDate,
      });
    }

    return NextResponse.json(newLead, { status: 201 });
  } catch (error) {
    console.error("POST /api/leads error:", error);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
