import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildVoiceBookingReminderMessage } from "@/lib/voice-agent/notifications";
import { normalizeUsPhone, sendTwilioSms } from "@/lib/twilio-sms";
import { logVoiceCallActivity, type VoiceCallRecord } from "@/lib/voice-agent/calls";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || null;
  const headerSecret = request.headers.get("x-cron-secret");
  return bearer === secret || headerSecret === secret;
}

function parseMetadata(metadata: string | null) {
  if (!metadata) return {} as Record<string, unknown>;
  try {
    return JSON.parse(metadata) as Record<string, unknown>;
  } catch {
    return { rawMetadata: metadata };
  }
}

function parseAppointmentDateTime(date: string | null, startTime: string | null) {
  if (!date) return null;
  const value = `${date}T${startTime || "10:00"}:00`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

async function handleReminderRequest(request: NextRequest, rawWindowHours?: unknown) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reminderWindowHours = Math.min(
      Math.max(Number(rawWindowHours || process.env.VOICE_REMINDER_WINDOW_HOURS || 24), 1),
      72
    );

    const now = new Date();
    const windowEnd = new Date(now.getTime() + reminderWindowHours * 60 * 60 * 1000);
    const startDate = now.toISOString().slice(0, 10);
    const endDate = windowEnd.toISOString().slice(0, 10);
    const supabase = getSupabase();

    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select("id, lead_id, title, date, start_time, end_time, completed, type")
      .eq("type", "in_person_quote")
      .eq("completed", false)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (appointmentsError) throw appointmentsError;

    const relevantAppointments = (appointments || []).filter((appointment: any) => {
      const scheduledAt = parseAppointmentDateTime(appointment.date, appointment.start_time);
      return scheduledAt && scheduledAt > now && scheduledAt <= windowEnd;
    });

    if (relevantAppointments.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
        message: "No upcoming voice-booked estimates currently need reminders.",
      });
    }

    const appointmentIds = relevantAppointments.map((appointment: any) => appointment.id);
    const leadIds = unique(
      relevantAppointments.map((appointment: any) => appointment.lead_id).filter(Boolean)
    );

    const [{ data: voiceCalls, error: voiceCallsError }, { data: contacts, error: contactsError }] =
      await Promise.all([
        supabase
          .from("voice_calls")
          .select("*")
          .in("appointment_id", appointmentIds)
          .eq("booking_status", "scheduled"),
        leadIds.length > 0
          ? supabase.from("contacts").select("lead_id, full_name, phone").in("lead_id", leadIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

    if (voiceCallsError) throw voiceCallsError;
    if (contactsError) throw contactsError;

    const appointmentById = new Map(relevantAppointments.map((appointment: any) => [appointment.id, appointment]));
    const contactByLeadId = new Map((contacts || []).map((contact: any) => [contact.lead_id, contact]));

    const results: Array<Record<string, unknown>> = [];
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const call of (voiceCalls || []) as VoiceCallRecord[]) {
      if (!call.appointment_id || call.reminder_sms_status === "sent") continue;

      const appointment = appointmentById.get(call.appointment_id);
      if (!appointment) continue;

      const contact = call.lead_id ? contactByLeadId.get(call.lead_id) : null;
      const callerName = contact?.full_name || appointment.title || "there";
      const callerPhone = normalizeUsPhone(contact?.phone || call.from_number);

      if (!callerPhone) {
        skipped += 1;
        await supabase
          .from("voice_calls")
          .update({
            reminder_sms_status: "skipped",
            reminder_sms_sent_at: null,
            last_event: "reminder_sms_skipped_missing_phone",
            updated_at: new Date().toISOString(),
            metadata: JSON.stringify({
              ...parseMetadata(call.metadata),
              reminder: {
                status: "skipped",
                reason: "No reminder phone number available.",
                attemptedAt: new Date().toISOString(),
              },
            }),
          })
          .eq("id", call.id);

        results.push({ voiceCallId: call.id, appointmentId: call.appointment_id, status: "skipped", reason: "missing_phone" });
        continue;
      }

      const message = buildVoiceBookingReminderMessage({
        callerName,
        callerPhone,
        preferredDate: appointment.date,
        preferredStartTime: appointment.start_time || "10:00",
      });

      const sms = await sendTwilioSms(callerPhone, message);
      const status = sms.ok ? "sent" : sms.skipped ? "skipped" : "failed";
      const sentAt = sms.ok ? new Date().toISOString() : null;

      if (status === "sent") sent += 1;
      if (status === "skipped") skipped += 1;
      if (status === "failed") failed += 1;

      await supabase
        .from("voice_calls")
        .update({
          reminder_sms_status: status,
          reminder_sms_sent_at: sentAt,
          last_event: `reminder_sms_${status}`,
          updated_at: new Date().toISOString(),
          metadata: JSON.stringify({
            ...parseMetadata(call.metadata),
            reminder: {
              status,
              attemptedAt: new Date().toISOString(),
              message,
              sms,
            },
          }),
        })
        .eq("id", call.id);

      await logVoiceCallActivity({
        leadId: call.lead_id,
        dealId: call.deal_id,
        description: `Voice appointment reminder SMS ${status} for ${appointment.date} at ${appointment.start_time || "10:00"}`,
        metadata: {
          voiceCallId: call.id,
          appointmentId: call.appointment_id,
          sms,
        },
      });

      results.push({
        voiceCallId: call.id,
        appointmentId: call.appointment_id,
        status,
        to: callerPhone,
        error: sms.error,
      });
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      sent,
      skipped,
      failed,
      windowHours: reminderWindowHours,
      results,
    });
  } catch (error) {
    console.error("POST /api/voice-agent/reminders error:", error);
    return NextResponse.json({ error: "Failed to process voice appointment reminders" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  return handleReminderRequest(request, searchParams.get("windowHours"));
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return handleReminderRequest(request, body.windowHours);
}
