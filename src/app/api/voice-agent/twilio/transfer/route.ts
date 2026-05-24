import { NextRequest, NextResponse } from "next/server";
import { buildSayAndDialNumberTwiml, buildSayTwiml } from "@/lib/voice-agent/twilio";
import { decideLiveTransfer } from "@/lib/voice-agent/transfer";
import { findVoiceCallByProviderIds, logVoiceCallActivity, upsertVoiceCall } from "@/lib/voice-agent/calls";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const twilioCallSid = String(body.twilioCallSid || body.twilio_call_sid || "").trim();

    if (!twilioCallSid) {
      return NextResponse.json({ error: "twilioCallSid is required" }, { status: 400 });
    }

    const existingCall = await findVoiceCallByProviderIds({ twilioCallSid });
    if (!existingCall) {
      return NextResponse.json({ error: "Voice call record not found" }, { status: 404 });
    }

    const decision = decideLiveTransfer({
      priority: String(body.priority || existingCall.priority || ""),
      serviceAreaMatch:
        typeof body.serviceAreaMatch === "boolean"
          ? body.serviceAreaMatch
          : existingCall.service_area_match,
      requestedImmediateTransfer: Boolean(
        body.requestImmediateTransfer || body.request_immediate_transfer
      ),
    });

    const updatedCall = await upsertVoiceCall({
      provider: existingCall.provider,
      source: existingCall.source,
      twilioCallSid: existingCall.twilio_call_sid,
      retellCallId: existingCall.retell_call_id,
      retellAgentId: existingCall.retell_agent_id,
      leadId: existingCall.lead_id,
      dealId: existingCall.deal_id,
      fromNumber: existingCall.from_number,
      toNumber: existingCall.to_number,
      direction: existingCall.direction,
      status: existingCall.status,
      priority: existingCall.priority,
      serviceAreaMatch: existingCall.service_area_match,
      transferTargetNumber: decision.targetNumber,
      transferStatus: decision.shouldTransfer ? "requested" : "skipped",
      transferReason: decision.reason,
      lastEvent: decision.shouldTransfer ? "transfer_requested" : "transfer_skipped",
      metadata: {
        transferRequestPayload: body,
        fallbackAction: decision.fallbackAction,
      },
    });

    if (!decision.shouldTransfer || !decision.targetNumber) {
      await logVoiceCallActivity({
        leadId: updatedCall.lead_id,
        dealId: updatedCall.deal_id,
        description: `Live transfer skipped: ${decision.reason}`,
        metadata: {
          voiceCallId: updatedCall.id,
          transferStatus: "skipped",
          reason: decision.reason,
        },
      });

      return NextResponse.json({
        success: true,
        transferRequested: false,
        reason: decision.reason,
        fallbackAction: decision.fallbackAction,
      });
    }

    const actionUrl = `${process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://b2b-leadgen-kappa.vercel.app"}/api/voice-agent/twilio/transfer-action`;
    const twiml = buildSayAndDialNumberTwiml({
      message: "Please hold while I connect you with Joseph.",
      phoneNumber: decision.targetNumber,
      actionUrl,
      callerId: process.env.TWILIO_FROM_NUMBER || undefined,
      timeoutSeconds: decision.timeoutSeconds,
    });

    await logVoiceCallActivity({
      leadId: updatedCall.lead_id,
      dealId: updatedCall.deal_id,
      description: `Live transfer requested to ${decision.targetNumber}`,
      metadata: {
        voiceCallId: updatedCall.id,
        transferStatus: "requested",
        targetNumber: decision.targetNumber,
        reason: decision.reason,
      },
    });

    return NextResponse.json({
      success: true,
      transferRequested: true,
      targetNumber: decision.targetNumber,
      reason: decision.reason,
      twiml,
      voiceCallId: updatedCall.id,
    });
  } catch (error) {
    console.error("POST /api/voice-agent/twilio/transfer error:", error);
    return NextResponse.json({ error: "Failed to prepare live transfer" }, { status: 500 });
  }
}
