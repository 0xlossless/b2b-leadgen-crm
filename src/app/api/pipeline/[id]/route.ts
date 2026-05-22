import { NextRequest, NextResponse } from "next/server";
import { ulid } from "ulid";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { stage, dealValue } = body;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
