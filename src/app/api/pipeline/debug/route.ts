import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const dealId = "01KS8ZABWNANHSZE3881YJNT77";

    // Use Supabase's pg_net or direct SQL via the SQL endpoint
    // Actually, use the rpc endpoint to run custom SQL
    
    // First, let's check triggers via information_schema
    const triggersRes = await fetch(`${url}/rest/v1/rpc/`, {
      method: "POST",
      headers: {
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
    });
    
    // Can't do arbitrary SQL via REST. Let's try a different approach.
    // Check if the issue is with the specific column or value
    
    // Test 1: Update ONLY updated_at (no stage change)
    const test1Res = await fetch(`${url}/rest/v1/deals?id=eq.${dealId}`, {
      method: "PATCH",
      headers: {
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
      body: JSON.stringify({ updated_at: "2099-01-01T00:00:00.000Z" }),
    });
    const test1 = await test1Res.json();

    // Read back
    const read1Res = await fetch(`${url}/rest/v1/deals?id=eq.${dealId}&select=stage,updated_at`, {
      headers: { "apikey": serviceKey, "Authorization": `Bearer ${serviceKey}` },
    });
    const read1 = await read1Res.json();

    // Test 2: Update deal_value
    const test2Res = await fetch(`${url}/rest/v1/deals?id=eq.${dealId}`, {
      method: "PATCH",
      headers: {
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
      body: JSON.stringify({ deal_value: 99999 }),
    });
    const test2 = await test2Res.json();

    // Read back
    const read2Res = await fetch(`${url}/rest/v1/deals?id=eq.${dealId}&select=deal_value,updated_at`, {
      headers: { "apikey": serviceKey, "Authorization": `Bearer ${serviceKey}` },
    });
    const read2 = await read2Res.json();

    // Test 3: Update assigned_rep
    const test3Res = await fetch(`${url}/rest/v1/deals?id=eq.${dealId}`, {
      method: "PATCH",
      headers: {
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
      body: JSON.stringify({ assigned_rep: "test_rep" }),
    });
    const test3 = await test3Res.json();

    const read3Res = await fetch(`${url}/rest/v1/deals?id=eq.${dealId}&select=assigned_rep`, {
      headers: { "apikey": serviceKey, "Authorization": `Bearer ${serviceKey}` },
    });
    const read3 = await read3Res.json();

    return NextResponse.json({
      test1_updated_at: {
        response_updated_at: test1?.[0]?.updated_at,
        readback_updated_at: read1?.[0]?.updated_at,
        persisted: read1?.[0]?.updated_at === "2099-01-01T00:00:00.000Z",
      },
      test2_deal_value: {
        response_deal_value: test2?.[0]?.deal_value,
        readback_deal_value: read2?.[0]?.deal_value,
        persisted: read2?.[0]?.deal_value == 99999,
      },
      test3_assigned_rep: {
        response_assigned_rep: test3?.[0]?.assigned_rep,
        readback_assigned_rep: read3?.[0]?.assigned_rep,
        persisted: read3?.[0]?.assigned_rep === "test_rep",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
