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

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { stage, dealValue } = body;
    const nowDate = new Date().toISOString();

    const updates: Record<string, any> = { updated_at: nowDate };
    if (stage) updates.stage = stage;
    if (dealValue !== undefined) updates.deal_value = String(dealValue);
    if (body.nextAction !== undefined) updates.next_action = body.nextAction;
    if (body.nextActionDate !== undefined) updates.next_action_date = body.nextActionDate;
    if (body.assignedRep !== undefined) updates.assigned_rep = body.assignedRep;
    if (body.winLossReason !== undefined) updates.win_loss_reason = body.winLossReason;
    if (stage === "closed_won" || stage === "closed_lost") updates.close_date = nowDate;

    // Perform update
    const { error: updateError, count } = await supabase
      .from("deals")
      .update(updates)
      .eq("id", params.id);

    if (updateError) {
      console.error("PATCH update error:", updateError);
      return NextResponse.json({ error: updateError.message, details: updateError }, { status: 500 });
    }

    // Fetch the updated record separately
    const { data: deal, error: fetchError } = await supabase
      .from("deals")
      .select("*")
      .eq("id", params.id)
      .single();

    if (fetchError) {
      console.error("PATCH fetch error:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    console.log("PATCH result - stage:", deal.stage, "expected:", stage, "match:", deal.stage === stage);

    // Log activity
    if (stage) {
      await supabase.from("activities").insert({
        id: ulid(),
        lead_id: deal.lead_id,
        deal_id: deal.id,
        type: "stage_change",
        description: `Deal moved to ${stage.replace(/_/g, " ")}`,
        created_at: nowDate,
      });
    }

    return NextResponse.json({ ...deal, _debug: { requestedStage: stage, actualStage: deal.stage, matched: deal.stage === stage } });
  } catch (error) {
    console.error("PATCH /api/pipeline/[id] error:", error);
    return NextResponse.json({ error: "Failed to update deal" }, { status: 500 });
  }
}
