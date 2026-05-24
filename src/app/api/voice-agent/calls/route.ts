import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") || 50), 200);

    const { data, error } = await supabase
      .from("voice_calls")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data || []).map((row: any) => ({
      id: row.id,
      leadId: row.lead_id,
      dealId: row.deal_id,
      appointmentId: row.appointment_id,
      provider: row.provider,
      source: row.source,
      twilioCallSid: row.twilio_call_sid,
      retellCallId: row.retell_call_id,
      retellAgentId: row.retell_agent_id,
      orchestrationAction: row.orchestration_action,
      bookingStatus: row.booking_status,
      confirmationSmsStatus: row.confirmation_sms_status,
      confirmationSmsSentAt: row.confirmation_sms_sent_at,
      reminderSmsStatus: row.reminder_sms_status,
      reminderSmsSentAt: row.reminder_sms_sent_at,
      transferTargetNumber: row.transfer_target_number,
      transferStatus: row.transfer_status,
      transferReason: row.transfer_reason,
      transferUpdatedAt: row.transfer_updated_at,
      fromNumber: row.from_number,
      toNumber: row.to_number,
      direction: row.direction,
      status: row.status,
      priority: row.priority,
      serviceAreaMatch: row.service_area_match,
      transcript: row.transcript,
      recordingUrl: row.recording_url,
      summary: row.summary,
      lastEvent: row.last_event,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ calls: rows });
  } catch (error) {
    console.error("GET /api/voice-agent/calls error:", error);
    return NextResponse.json({ error: "Failed to fetch voice calls" }, { status: 500 });
  }
}
