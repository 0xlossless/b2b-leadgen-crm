import { NextRequest, NextResponse } from "next/server";
import { ulid } from "ulid";
import { QUALIFICATION_TIERS, type QualificationTier } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { qualificationTier } = await request.json();
    const leadId = params.id;

    if (!qualificationTier || !(qualificationTier in QUALIFICATION_TIERS)) {
      return NextResponse.json(
        { error: "Invalid qualification tier. Use: rich, broke, or poor" },
        { status: 400 }
      );
    }

    const qt = qualificationTier as QualificationTier;
    const mapping = QUALIFICATION_TIERS[qt];

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const headers = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    };

    // 1. Verify lead exists
    const leadRes = await fetch(
      `${url}/rest/v1/leads?id=eq.${leadId}&select=id,company_name`,
      { headers, cache: "no-store" }
    );
    const leadArr = await leadRes.json();
    if (!leadArr?.[0]) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // 2. Update lead_scores (tier, score, disqualify_reason stores the qualification)
    const scoreRes = await fetch(
      `${url}/rest/v1/lead_scores?lead_id=eq.${leadId}`,
      {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify({
          total_score: mapping.score,
          tier: mapping.tier,
          disqualify_reason: qt,
        }),
      }
    );

    // If no lead_scores row exists, create one
    if (scoreRes.status === 200) {
      const scoreArr = await scoreRes.json();
      if (!scoreArr || scoreArr.length === 0) {
        // Insert a new score row
        await fetch(`${url}/rest/v1/lead_scores`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            id: ulid(),
            lead_id: leadId,
            total_score: mapping.score,
            tier: mapping.tier,
            disqualify_reason: qt,
            scored_at: new Date().toISOString(),
          }),
        });
      }
    }

    // 3. Move deal to "qualified" if currently new_lead or contacted
    const dealRes = await fetch(
      `${url}/rest/v1/deals?lead_id=eq.${leadId}&select=id,stage`,
      { headers, cache: "no-store" }
    );
    const dealArr = await dealRes.json();
    const deal = dealArr?.[0];

    if (deal && (deal.stage === "new_lead" || deal.stage === "contacted")) {
      await fetch(`${url}/rest/v1/deals?id=eq.${deal.id}`, {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify({ stage: "qualified" }),
      });
    }

    // 4. Log qualification activity
    await fetch(`${url}/rest/v1/activities`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        id: ulid(),
        lead_id: leadId,
        deal_id: deal?.id ?? null,
        type: "qualification",
        description: `Lead qualified as ${qt.toUpperCase()} — ${mapping.description}`,
        created_at: new Date().toISOString(),
      }),
    });

    return NextResponse.json({
      success: true,
      leadId,
      qualificationTier: qt,
      totalScore: mapping.score,
      tier: mapping.tier,
    });
  } catch (error) {
    console.error("POST /api/leads/[id]/qualify error:", error);
    return NextResponse.json(
      { error: "Failed to qualify lead" },
      { status: 500 }
    );
  }
}
