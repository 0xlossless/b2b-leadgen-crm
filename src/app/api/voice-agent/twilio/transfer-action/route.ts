import { NextRequest, NextResponse } from "next/server";
import { buildSayTwiml } from "@/lib/voice-agent/twilio";
import { findVoiceCallByProviderIds, logVoiceCallActivity, upsertVoiceCall } from "@/lib/voice-agent/calls";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const parentCallSid = String(form.get("CallSid") || "");
    const dialCallStatus = String(form.get("DialCallStatus") || "");
    const dialCallSid = String(form.get("DialCallSid") || "");
    const dialBridged = String(form.get("DialBridged") || "false") === "true";

    const existingCall = parentCallSid
      ? await findVoiceCallByProviderIds({ twilioCallSid: parentCallSid })
      : null;

    if (existingCall) {
      const transferStatus = dialBridged || dialCallStatus === "completed" ? "connected" : "failed";
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
        transcript: existingCall.transcript,
        recordingUrl: existingCall.recording_url,
        summary: existingCall.summary,
        transferTargetNumber: existingCall.transfer_target_number,
        transferStatus,
        transferReason:
          transferStatus === "connected"
            ? "Live transfer connected successfully."
            : `Live transfer did not complete (${dialCallStatus || "unknown"}).`,
        lastEvent: transferStatus === "connected" ? "transfer_connected" : "transfer_failed",
        metadata: {
          transferAction: {
            dialCallSid,
            dialCallStatus,
            dialBridged,
          },
        },
      });

      await logVoiceCallActivity({
        leadId: updatedCall.lead_id,
        dealId: updatedCall.deal_id,
        description:
          transferStatus === "connected"
            ? "Live transfer connected to Joseph"
            : `Live transfer failed or ended: ${dialCallStatus || "unknown"}`,
        metadata: {
          voiceCallId: updatedCall.id,
          transferStatus,
          dialCallSid,
          dialCallStatus,
          dialBridged,
        },
      });
    }

    const message = dialBridged || dialCallStatus === "completed"
      ? "Thanks for calling Golden State Epoxy Flooring."
      : "Joseph could not be connected right now. We will call you back shortly.";

    return new NextResponse(buildSayTwiml(message), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("POST /api/voice-agent/twilio/transfer-action error:", error);
    return new NextResponse(buildSayTwiml("Thank you for calling Golden State Epoxy Flooring."), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}
