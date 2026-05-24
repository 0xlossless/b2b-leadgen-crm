import { NextRequest, NextResponse } from "next/server";
import { buildSayTwiml } from "@/lib/voice-agent/twilio";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const dialCallStatus = String(form.get("DialCallStatus") || "");
    const fallbackMessage =
      dialCallStatus === "completed"
        ? "Thanks for calling Golden State Epoxy Flooring."
        : "Joseph could not be connected right now. We will call you back shortly.";

    return new NextResponse(buildSayTwiml(fallbackMessage), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("POST /api/voice-agent/twilio/dial-action error:", error);
    return new NextResponse(buildSayTwiml("Thank you for calling Golden State Epoxy Flooring."), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}
