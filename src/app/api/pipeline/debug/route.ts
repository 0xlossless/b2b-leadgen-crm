import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Check for triggers and RLS policies on deals table
    const queries = [
      { name: "triggers", sql: "SELECT trigger_name, event_manipulation, action_statement FROM information_schema.triggers WHERE event_object_table = 'deals'" },
      { name: "rls_policies", sql: "SELECT policyname, permissive, cmd, qual, with_check FROM pg_policies WHERE tablename = 'deals'" },
      { name: "rls_enabled", sql: "SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'deals'" },
    ];

    const results: Record<string, any> = {};

    for (const q of queries) {
      const res = await fetch(`${url}/rest/v1/rpc/`, {
        method: "POST",
        headers: {
          "apikey": serviceKey,
          "Authorization": `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        // Can't run arbitrary SQL via REST, but let's try the raw SQL endpoint
      });
    }

    // Use the SQL endpoint directly
    for (const q of queries) {
      const res = await fetch(`${url}/rest/v1/`, {
        method: "GET",
        headers: {
          "apikey": serviceKey,
          "Authorization": `Bearer ${serviceKey}`,
        },
      });
    }

    // Alternative: Just check the current deal state directly with multiple reads
    const dealId = "01KS8ZABWNANHSZE3881YJNT77";
    
    // 1. Read current state
    const read1Res = await fetch(`${url}/rest/v1/deals?id=eq.${dealId}&select=stage,updated_at`, {
      headers: { "apikey": serviceKey, "Authorization": `Bearer ${serviceKey}` },
    });
    const read1 = await read1Res.json();

    // 2. Update
    const updateRes = await fetch(`${url}/rest/v1/deals?id=eq.${dealId}`, {
      method: "PATCH",
      headers: {
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
      body: JSON.stringify({ stage: "closed_won", updated_at: new Date().toISOString() }),
    });
    const update = await updateRes.json();

    // 3. Read immediately
    const read2Res = await fetch(`${url}/rest/v1/deals?id=eq.${dealId}&select=stage,updated_at`, {
      headers: { "apikey": serviceKey, "Authorization": `Bearer ${serviceKey}` },
    });
    const read2 = await read2Res.json();

    // 4. Wait 1 second
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 5. Read again
    const read3Res = await fetch(`${url}/rest/v1/deals?id=eq.${dealId}&select=stage,updated_at`, {
      headers: { "apikey": serviceKey, "Authorization": `Bearer ${serviceKey}` },
    });
    const read3 = await read3Res.json();

    return NextResponse.json({
      read1_before: read1,
      update_response: update,
      read2_after_immediate: read2,
      read3_after_1s: read3,
      persisted_immediate: read2?.[0]?.stage === "closed_won",
      persisted_1s: read3?.[0]?.stage === "closed_won",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
