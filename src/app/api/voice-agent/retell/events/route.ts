import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ulid } from "ulid";
import { getRetellWebhookSummary, verifyRetellSignature } from "@/lib/voice-agent/retell";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function extractLeadId(call: Record<string, unknown>) {
  const metadata = call.metadata as Record<string, unknown> | undefined;
  if (metadata?.lead_id) return String(metadata.lead_id);
  return "";
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-retell-signature");

  try {
    const verified = await verifyRetellSignature(rawBody, signature);
    if (!verified) {
      return NextResponse.json({ error: "Invalid Retell signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const summary = getRetellWebhookSummary(payload);
    const supabase = getSupabase();
    const leadId = extractLeadId(payload.call || {});

    if (leadId) {
      const description = `Retell event ${summary.event}: ${summary.status || "unknown status"}`;
      await supabase.from("activities").insert({
        id: ulid(),
        lead_id: leadId,
        deal_id: null,
        type: "call",
        description,
        metadata: JSON.stringify({
          source: "retell_webhook",
          summary,
          payload,
        }),
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/voice-agent/retell/events error:", error);
    return NextResponse.json({ error: "Failed to process Retell event" }, { status: 500 });
  }
}
