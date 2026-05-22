import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const keyUsed = serviceKey ? "service_role" : "anon";
    
    const supabase = createClient(url, serviceKey || anonKey);

    // 1. Read current state
    const { data: before, error: readErr } = await supabase
      .from("deals")
      .select("id, stage, updated_at")
      .limit(5);

    if (readErr) {
      return NextResponse.json({ error: "read failed", details: readErr, keyUsed });
    }

    if (!before || before.length === 0) {
      return NextResponse.json({ error: "no deals found", keyUsed });
    }

    const dealId = before[0].id;
    const originalStage = before[0].stage;
    const testStage = originalStage === "new_lead" ? "contacted" : "new_lead";

    // 2. Attempt update
    const { data: updateData, error: updateErr, count: updateCount, status: updateStatus, statusText } = await supabase
      .from("deals")
      .update({ stage: testStage, updated_at: new Date().toISOString() })
      .eq("id", dealId)
      .select();

    // 3. Read after update
    const { data: after, error: afterErr } = await supabase
      .from("deals")
      .select("id, stage, updated_at")
      .eq("id", dealId)
      .single();

    // 4. Revert
    await supabase
      .from("deals")
      .update({ stage: originalStage })
      .eq("id", dealId);

    return NextResponse.json({
      keyUsed,
      dealId,
      originalStage,
      testStage,
      updateResult: {
        data: updateData,
        error: updateErr,
        count: updateCount,
        status: updateStatus,
        statusText,
      },
      afterUpdate: after,
      afterReadError: afterErr,
      stageChanged: after?.stage === testStage,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
