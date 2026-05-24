import { NextRequest, NextResponse } from "next/server";
import { getRetellWebhookSummary, verifyRetellSignature } from "@/lib/voice-agent/retell";
import { logVoiceCallActivity, upsertVoiceCall } from "@/lib/voice-agent/calls";

export const dynamic = "force-dynamic";

function extractMetadata(call: Record<string, unknown>) {
  return (call.metadata as Record<string, unknown> | undefined) || {};
}

function extractLeadId(call: Record<string, unknown>) {
  const metadata = extractMetadata(call);
  if (metadata?.lead_id) return String(metadata.lead_id);
  return "";
}

function extractDealId(call: Record<string, unknown>) {
  const metadata = extractMetadata(call);
  if (metadata?.deal_id) return String(metadata.deal_id);
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
    const call = (payload.call || {}) as Record<string, unknown>;
    const metadata = extractMetadata(call);
    const leadId = extractLeadId(call);
    const dealId = extractDealId(call);

    const voiceCall = await upsertVoiceCall({
      leadId: leadId || null,
      dealId: dealId || null,
      provider: "retell",
      source: "retell_webhook",
      twilioCallSid: metadata.twilio_call_sid ? String(metadata.twilio_call_sid) : null,
      retellCallId: summary.callId || null,
      retellAgentId: summary.agentId || null,
      fromNumber: summary.fromNumber || null,
      toNumber: summary.toNumber || null,
      direction: String(call.direction || "inbound") || null,
      status: summary.status || null,
      transcript: summary.transcript || null,
      recordingUrl: summary.recordingUrl || null,
      summary: summary.endUserMessage || null,
      lastEvent: summary.event || null,
      metadata: {
        retellMetadata: metadata,
        summary,
        payload,
      },
    });

    if (voiceCall.lead_id) {
      const description = `Retell event ${summary.event}: ${summary.status || "unknown status"}`;
      await logVoiceCallActivity({
        leadId: voiceCall.lead_id,
        dealId: voiceCall.deal_id,
        description,
        metadata: {
          source: "retell_webhook",
          voiceCallId: voiceCall.id,
          summary,
          payload,
        },
      });
    }

    return NextResponse.json({ ok: true, voiceCallId: voiceCall.id });
  } catch (error) {
    console.error("POST /api/voice-agent/retell/events error:", error);
    return NextResponse.json({ error: "Failed to process Retell event" }, { status: 500 });
  }
}
