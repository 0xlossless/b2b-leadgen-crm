import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = createClient(url, serviceKey || anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const dealId = "01KS8ZABWNANHSZE3881YJNT77";

    // Read before
    const { data: before } = await supabase.from("deals").select("id, stage, updated_at").eq("id", dealId).single();

    // Update
    const { error: updateErr } = await supabase.from("deals").update({ stage: "contacted", updated_at: new Date().toISOString() }).eq("id", dealId);

    // Read after
    const { data: after } = await supabase.from("deals").select("id, stage, updated_at").eq("id", dealId).single();

    return NextResponse.json({
      keyUsed: serviceKey ? "service_role" : "anon",
      before: before ? { stage: before.stage, updated_at: before.updated_at } : null,
      updateError: updateErr,
      after: after ? { stage: after.stage, updated_at: after.updated_at } : null,
      persisted: after?.stage === "contacted",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
