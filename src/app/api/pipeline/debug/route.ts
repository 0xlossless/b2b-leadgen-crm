import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const dealId = "01KS8ZABWNANHSZE3881YJNT77";

    // Read current state
    const beforeRes = await fetch(`${url}/rest/v1/deals?id=eq.${dealId}&select=stage,updated_at,deal_value,assigned_rep`, {
      headers: { "apikey": serviceKey, "Authorization": `Bearer ${serviceKey}` },
    });
    const before = await beforeRes.json();

    // Test: Update stage ONLY (no updated_at)
    const updateRes = await fetch(`${url}/rest/v1/deals?id=eq.${dealId}`, {
      method: "PATCH",
      headers: {
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
      body: JSON.stringify({ stage: "closed_won" }),
    });
    const update = await updateRes.json();

    // Read back
    const afterRes = await fetch(`${url}/rest/v1/deals?id=eq.${dealId}&select=stage,updated_at,deal_value,assigned_rep`, {
      headers: { "apikey": serviceKey, "Authorization": `Bearer ${serviceKey}` },
    });
    const after = await afterRes.json();

    return NextResponse.json({
      before: before?.[0],
      updateResponse: { stage: update?.[0]?.stage },
      after: after?.[0],
      stage_persisted: after?.[0]?.stage === "closed_won",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
