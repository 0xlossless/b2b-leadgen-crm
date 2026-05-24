import { NextResponse } from "next/server";
import { getVoiceAgentBlueprint } from "@/lib/voice-agent/config";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ blueprint: getVoiceAgentBlueprint() });
}
