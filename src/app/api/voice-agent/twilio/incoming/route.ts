import { NextRequest, NextResponse } from "next/server";
import { getVoiceAgentBlueprint } from "@/lib/voice-agent/config";
import { buildDialSipTwiml, buildSayTwiml } from "@/lib/voice-agent/twilio";
import { registerRetellPhoneCall } from "@/lib/voice-agent/retell";

export const dynamic = "force-dynamic";

function getPublicBaseUrl(request: NextRequest) {
  return (
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    `${request.nextUrl.protocol}//${request.headers.get("host")}`
  );
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return phone;
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const fromNumber = normalizePhone(String(form.get("From") || ""));
    const toNumber = normalizePhone(String(form.get("To") || process.env.TWILIO_FROM_NUMBER || ""));
    const callSid = String(form.get("CallSid") || "");

    if (!fromNumber || !toNumber) {
      return new NextResponse(buildSayTwiml("We could not connect your call right now. Please try again shortly."), {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    const blueprint = getVoiceAgentBlueprint();
    const agentId = process.env.RETELL_AGENT_ID || process.env.RETELL_DEFAULT_AGENT_ID;
    if (!agentId) {
      return new NextResponse(
        buildSayTwiml(
          `${blueprint.businessRules.brandName} is temporarily unavailable by phone. Please leave a message or try again shortly.`
        ),
        {
          status: 200,
          headers: { "Content-Type": "text/xml" },
        }
      );
    }

    const registration = await registerRetellPhoneCall({
      agentId,
      fromNumber,
      toNumber,
      metadata: {
        source: "twilio_voice_webhook",
        twilio_call_sid: callSid,
        telephony_provider: "twilio",
      },
      dynamicVariables: {
        business_name: blueprint.businessRules.brandName,
        owner_name: blueprint.businessRules.ownerName,
        caller_number: fromNumber,
      },
    });

    const sipUri = `sip:${registration.call_id}@sip.retellai.com`;
    const actionUrl = `${getPublicBaseUrl(request)}/api/voice-agent/twilio/dial-action`;
    const twiml = buildDialSipTwiml(sipUri, actionUrl);

    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("POST /api/voice-agent/twilio/incoming error:", error);
    const fallback = buildSayTwiml(
      "Sorry, we are having trouble connecting your call right now. Please call back in a few minutes."
    );
    return new NextResponse(fallback, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}
