import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = createClient(url, serviceKey || anonKey);

    // List ALL deals - raw, no joins
    const { data: allDeals, error: dealsErr } = await supabase
      .from("deals")
      .select("*")
      .order("created_at", { ascending: false });

    // List ALL deals - with joins (same as GET /api/pipeline)
    const { data: joinedDeals, error: joinErr } = await supabase
      .from("deals")
      .select("*, leads(company_name, industry, city, contacts(full_name, email, phone))")
      .order("created_at", { ascending: false });

    // Test update on Mike Thompson's deal specifically
    const mikeId = "01KS8ZABWNANHSZE3881YJNT77";
    
    const { data: mikeBefore } = await supabase
      .from("deals")
      .select("*")
      .eq("id", mikeId)
      .single();

    const { data: mikeUpdate, error: mikeUpdateErr } = await supabase
      .from("deals")
      .update({ stage: "contacted", updated_at: new Date().toISOString() })
      .eq("id", mikeId)
      .select()
      .single();

    const { data: mikeAfter } = await supabase
      .from("deals")
      .select("*")
      .eq("id", mikeId)
      .single();

    return NextResponse.json({
      keyUsed: serviceKey ? "service_role" : "anon",
      rawDeals: (allDeals || []).map(d => ({ id: d.id, stage: d.stage, lead_id: d.lead_id, updated_at: d.updated_at })),
      rawDealsError: dealsErr,
      joinedDeals: (joinedDeals || []).map(d => ({ id: d.id, stage: d.stage, lead_id: d.lead_id })),
      joinedDealsError: joinErr,
      mikeTest: {
        before: mikeBefore ? { stage: mikeBefore.stage, updated_at: mikeBefore.updated_at } : null,
        updateResult: mikeUpdate ? { stage: mikeUpdate.stage, updated_at: mikeUpdate.updated_at } : null,
        updateError: mikeUpdateErr,
        after: mikeAfter ? { stage: mikeAfter.stage, updated_at: mikeAfter.updated_at } : null,
        updatePersisted: mikeAfter?.stage === "contacted",
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
