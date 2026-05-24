import { NextRequest, NextResponse } from "next/server";
import { ulid } from "ulid";
import { decideVoiceOrchestration } from "@/lib/voice-agent/orchestration";
import { buildSayAndDialNumberTwiml, buildSayTwiml } from "@/lib/voice-agent/twilio";
import { decideLiveTransfer } from "@/lib/voice-agent/transfer";
import { findVoiceCallByProviderIds, logVoiceCallActivity, upsertVoiceCall } from "@/lib/voice-agent/calls";
import { sendVoiceBookingNotifications } from "@/lib/voice-agent/notifications";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const twilioCallSid = String(body.twilioCallSid || body.twilio_call_sid || "").trim() || null;
    const retellCallId = String(body.retellCallId || body.retell_call_id || "").trim() || null;
    const existingCall = await findVoiceCallByProviderIds({ twilioCallSid, retellCallId });

    if (!existingCall) {
      return NextResponse.json({ error: "Voice call record not found" }, { status: 404 });
    }

    const orchestration = decideVoiceOrchestration({
      priority: String(body.priority || existingCall.priority || ""),
      serviceAreaMatch:
        typeof body.serviceAreaMatch === "boolean"
          ? body.serviceAreaMatch
          : existingCall.service_area_match,
      requestedImmediateTransfer: Boolean(
        body.requestImmediateTransfer || body.request_immediate_transfer
      ),
      wantsBooking: Boolean(body.wantsBooking || body.wants_booking),
      preferredDate: String(body.preferredDate || body.preferred_date || "") || null,
      preferredStartTime: String(body.preferredStartTime || body.preferred_start_time || "") || null,
    });

    let appointmentId: string | null = existingCall.appointment_id || null;
    let actionPayload: Record<string, unknown> = {};
    let confirmationSmsStatus = existingCall.confirmation_sms_status || null;
    let confirmationSmsSentAt = existingCall.confirmation_sms_sent_at || null;
    let reminderSmsStatus = existingCall.reminder_sms_status || null;
    let reminderSmsSentAt = existingCall.reminder_sms_sent_at || null;

    if (orchestration.action === "book_estimate") {
      const supabase = getSupabase();
      const now = new Date().toISOString();
      appointmentId = ulid();
      const preferredDate = String(body.preferredDate || body.preferred_date || "").trim();
      const preferredStartTime = String(body.preferredStartTime || body.preferred_start_time || "10:00").trim() || "10:00";
      const preferredEndTime = String(body.preferredEndTime || body.preferred_end_time || "11:00").trim() || "11:00";
      const appointmentTitle = `In-Person Quote — ${body.companyName || existingCall.lead_id || "Voice Lead"}`;

      const { error: appointmentError } = await supabase.from("appointments").insert({
        id: appointmentId,
        lead_id: existingCall.lead_id,
        deal_id: existingCall.deal_id,
        type: "in_person_quote",
        title: appointmentTitle,
        notes: String(body.notes || "Booked by voice agent orchestration").trim() || null,
        date: preferredDate,
        start_time: preferredStartTime,
        end_time: preferredEndTime,
        all_day: false,
        completed: false,
        created_at: now,
        updated_at: now,
      });

      if (appointmentError) throw appointmentError;

      const notificationInput = {
        callerName: String(body.fullName || body.full_name || body.contactName || "").trim() || null,
        callerPhone:
          existingCall.from_number ||
          String(body.callbackPhone || body.callback_phone || body.fromNumber || body.from_number || "").trim() ||
          null,
        preferredDate,
        preferredStartTime,
        serviceCity: String(body.serviceCity || body.service_city || "").trim() || null,
        projectType: String(body.projectType || body.project_type || "").trim() || null,
      };

      const smsResults = await sendVoiceBookingNotifications(notificationInput);
      confirmationSmsStatus = smsResults.customer.ok ? "sent" : smsResults.customer.skipped ? "skipped" : "failed";
      confirmationSmsSentAt = smsResults.customer.ok ? now : null;
      reminderSmsStatus = "pending";
      reminderSmsSentAt = null;

      await logVoiceCallActivity({
        leadId: existingCall.lead_id,
        dealId: existingCall.deal_id,
        description: `Voice agent booked an estimate for ${preferredDate} at ${preferredStartTime}`,
        metadata: {
          appointmentId,
          source: "voice_orchestration",
          smsResults,
        },
      });

      actionPayload = {
        appointmentId,
        confirmationMessage: smsResults.customerMessage,
        ownerAlertMessage: smsResults.ownerMessage,
        smsResults,
        twiml: buildSayTwiml(
          `Great, I have you down for ${preferredDate} at ${preferredStartTime}. Joseph will see those details shortly.`
        ),
      };
    }

    if (orchestration.action === "transfer_to_joseph") {
      const transfer = decideLiveTransfer({
        priority: existingCall.priority,
        serviceAreaMatch: existingCall.service_area_match,
        requestedImmediateTransfer: Boolean(
          body.requestImmediateTransfer || body.request_immediate_transfer
        ),
      });

      actionPayload = {
        transferTargetNumber: transfer.targetNumber,
        twiml: transfer.targetNumber
          ? buildSayAndDialNumberTwiml({
              message: "Please hold while I connect you with Joseph.",
              phoneNumber: transfer.targetNumber,
              actionUrl: `${process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://b2b-leadgen-kappa.vercel.app"}/api/voice-agent/twilio/transfer-action`,
              callerId: process.env.TWILIO_FROM_NUMBER || undefined,
              timeoutSeconds: transfer.timeoutSeconds,
            })
          : null,
      };
    }

    const updatedCall = await upsertVoiceCall({
      provider: existingCall.provider,
      source: existingCall.source,
      twilioCallSid: existingCall.twilio_call_sid,
      retellCallId: existingCall.retell_call_id,
      retellAgentId: existingCall.retell_agent_id,
      leadId: existingCall.lead_id,
      dealId: existingCall.deal_id,
      appointmentId,
      fromNumber: existingCall.from_number,
      toNumber: existingCall.to_number,
      direction: existingCall.direction,
      status: existingCall.status,
      priority: existingCall.priority,
      serviceAreaMatch: existingCall.service_area_match,
      transcript: existingCall.transcript,
      recordingUrl: existingCall.recording_url,
      summary: existingCall.summary,
      orchestrationAction: orchestration.action,
      bookingStatus: orchestration.action === "book_estimate" ? "scheduled" : existingCall.booking_status || null,
      confirmationSmsStatus,
      confirmationSmsSentAt,
      reminderSmsStatus,
      reminderSmsSentAt,
      transferTargetNumber:
        typeof actionPayload.transferTargetNumber === "string"
          ? (actionPayload.transferTargetNumber as string)
          : existingCall.transfer_target_number,
      transferStatus:
        orchestration.action === "transfer_to_joseph"
          ? "requested"
          : existingCall.transfer_status || null,
      transferReason:
        orchestration.action === "transfer_to_joseph"
          ? orchestration.reason
          : existingCall.transfer_reason || null,
      lastEvent: `orchestration_${orchestration.action}`,
      metadata: {
        orchestration,
        requestBody: body,
        actionPayload,
      },
    });

    await logVoiceCallActivity({
      leadId: updatedCall.lead_id,
      dealId: updatedCall.deal_id,
      description: `Voice orchestration selected ${orchestration.action}`,
      metadata: {
        voiceCallId: updatedCall.id,
        orchestration,
        actionPayload,
      },
    });

    return NextResponse.json({
      success: true,
      voiceCallId: updatedCall.id,
      orchestration,
      actionPayload,
    });
  } catch (error) {
    console.error("POST /api/voice-agent/orchestrate error:", error);
    return NextResponse.json({ error: "Failed to orchestrate voice-agent outcome" }, { status: 500 });
  }
}
