import { NextRequest, NextResponse } from "next/server";
import { ulid } from "ulid";
import { QUALIFICATION_TIERS, type QualificationTier } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { stage, dealValue, qualificationTier } = body;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // ---------- Handle qualification tier ----------
    if (qualificationTier && qualificationTier in QUALIFICATION_TIERS) {
      const qt = qualificationTier as QualificationTier;
      const mapping = QUALIFICATION_TIERS[qt];

      // 1. Fetch the deal to get lead_id
      const dealRes = await fetch(`${url}/rest/v1/deals?id=eq.${params.id}&select=id,lead_id,stage`, {
        headers: { "apikey": serviceKey, "Authorization": `Bearer ${serviceKey}` },
        cache: "no-store",
      });
      if (!dealRes.ok) {
        return NextResponse.json({ error: "Failed to fetch deal" }, { status: 500 });
      }
      const dealArr = await dealRes.json();
      const deal = dealArr?.[0];
      if (!deal) {
        return NextResponse.json({ error: "Deal not found" }, { status: 404 });
      }

      // 2. Update lead_scores
      await fetch(`${url}/rest/v1/lead_scores?lead_id=eq.${deal.lead_id}`, {
        method: "PATCH",
        headers: {
          "apikey": serviceKey,
          "Authorization": `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation",
        },
        body: JSON.stringify({
          total_score: mapping.score,
          tier: mapping.tier,
          disqualify_reason: qt,
        }),
      });

      // 3. Move deal stage to "qualified" if currently new_lead or contacted
      const dealUpdates: Record<string, any> = {};
      if (deal.stage === "new_lead" || deal.stage === "contacted") {
        dealUpdates.stage = "qualified";
      }
      if (Object.keys(dealUpdates).length > 0) {
        await fetch(`${url}/rest/v1/deals?id=eq.${params.id}`, {
          method: "PATCH",
          headers: {
            "apikey": serviceKey,
            "Authorization": `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation",
          },
          body: JSON.stringify(dealUpdates),
        });
      }

      // 4. Log qualification activity
      await fetch(`${url}/rest/v1/activities`, {
        method: "POST",
        headers: {
          "apikey": serviceKey,
          "Authorization": `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: ulid(),
          lead_id: deal.lead_id,
          deal_id: deal.id,
          type: "qualification",
          description: `Lead qualified as ${qt}`,
          created_at: new Date().toISOString(),
        }),
      });

      return NextResponse.json({
        ...deal,
        stage: dealUpdates.stage ?? deal.stage,
        qualificationTier: qt,
        totalScore: mapping.score,
        tier: mapping.tier,
      });
    }

    // ---------- Handle normal deal updates ----------
    const updates: Record<string, any> = {};
    if (stage) updates.stage = stage;
    if (dealValue !== undefined) updates.deal_value = String(dealValue);
    if (body.nextAction !== undefined) updates.next_action = body.nextAction;
    if (body.nextActionDate !== undefined) updates.next_action_date = body.nextActionDate;
    if (body.assignedRep !== undefined) updates.assigned_rep = body.assignedRep;
    if (body.winLossReason !== undefined) updates.win_loss_reason = body.winLossReason;
    if (stage === "closed_won" || stage === "closed_lost") updates.close_date = new Date().toISOString();

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    // Use direct REST API to bypass Supabase JS client issues
    const updateRes = await fetch(`${url}/rest/v1/deals?id=eq.${params.id}`, {
      method: "PATCH",
      headers: {
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
      body: JSON.stringify(updates),
    });

    if (!updateRes.ok) {
      const errBody = await updateRes.text();
      console.error("PATCH update error:", errBody);
      return NextResponse.json({ error: "Failed to update deal" }, { status: 500 });
    }

    const updated = await updateRes.json();
    const deal = updated?.[0];

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    // Log activity
    if (stage) {
      await fetch(`${url}/rest/v1/activities`, {
        method: "POST",
        headers: {
          "apikey": serviceKey,
          "Authorization": `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: ulid(),
          lead_id: deal.lead_id,
          deal_id: deal.id,
          type: "stage_change",
          description: `Deal moved to ${stage.replace(/_/g, " ")}`,
          created_at: new Date().toISOString(),
        }),
      });
    }

    return NextResponse.json(deal);
  } catch (error) {
    console.error("PATCH /api/pipeline/[id] error:", error);
    return NextResponse.json({ error: "Failed to update deal" }, { status: 500 });
  }
}
