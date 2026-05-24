import { NextRequest, NextResponse } from "next/server";
import { buildRetellInboundWebhookResponse } from "@/lib/voice-agent/retell";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    return NextResponse.json(buildRetellInboundWebhookResponse(payload));
  } catch (error) {
    console.error("POST /api/voice-agent/retell/inbound error:", error);
    return NextResponse.json({ error: "Failed to process inbound Retell webhook" }, { status: 500 });
  }
}
