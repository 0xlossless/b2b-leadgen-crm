import { NextResponse } from "next/server";
import { getProviderConfigStatus, getProviderSetupChecklist } from "@/lib/voice-agent/provider-status";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: getProviderConfigStatus(),
    checklist: getProviderSetupChecklist(),
  });
}
