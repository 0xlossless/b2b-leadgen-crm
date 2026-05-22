import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const dealId = "01KS8ZABWNANHSZE3881YJNT77";
    const newStage = "proposal_sent";
    const nowDate = new Date().toISOString();

    // Direct REST API call - bypasses any JS client issues
    const updateRes = await fetch(`${url}/rest/v1/deals?id=eq.${dealId}`, {
      method: "PATCH",
      headers: {
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
      body: JSON.stringify({ stage: newStage, updated_at: nowDate }),
    });

    const updateBody = await updateRes.json();

    // Read back
    const readRes = await fetch(`${url}/rest/v1/deals?id=eq.${dealId}&select=id,stage,updated_at`, {
      headers: {
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
      },
    });

    const readBody = await readRes.json();

    return NextResponse.json({
      updateStatus: updateRes.status,
      updateBody,
      readBack: readBody,
      persisted: readBody?.[0]?.stage === newStage,
      serviceKeyPresent: !!serviceKey,
      serviceKeyLength: serviceKey?.length,
      supabaseUrl: url,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
