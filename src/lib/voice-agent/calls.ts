import { createClient } from "@supabase/supabase-js";
import { ulid } from "ulid";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export type VoiceCallProvider = "twilio" | "retell" | "internal";

export interface VoiceCallRecord {
  id: string;
  lead_id: string | null;
  deal_id: string | null;
  appointment_id?: string | null;
  provider: VoiceCallProvider;
  source: string;
  twilio_call_sid: string | null;
  retell_call_id: string | null;
  retell_agent_id: string | null;
  orchestration_action?: string | null;
  booking_status?: string | null;
  confirmation_sms_status?: string | null;
  confirmation_sms_sent_at?: string | null;
  reminder_sms_status?: string | null;
  reminder_sms_sent_at?: string | null;
  transfer_target_number?: string | null;
  transfer_status?: string | null;
  transfer_reason?: string | null;
  transfer_updated_at?: string | null;
  from_number: string | null;
  to_number: string | null;
  direction: string | null;
  status: string | null;
  priority: string | null;
  service_area_match: boolean | null;
  transcript: string | null;
  recording_url: string | null;
  summary: string | null;
  last_event: string | null;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertVoiceCallInput {
  leadId?: string | null;
  dealId?: string | null;
  appointmentId?: string | null;
  provider: VoiceCallProvider;
  source: string;
  twilioCallSid?: string | null;
  retellCallId?: string | null;
  retellAgentId?: string | null;
  orchestrationAction?: string | null;
  bookingStatus?: string | null;
  confirmationSmsStatus?: string | null;
  confirmationSmsSentAt?: string | null;
  reminderSmsStatus?: string | null;
  reminderSmsSentAt?: string | null;
  transferTargetNumber?: string | null;
  transferStatus?: string | null;
  transferReason?: string | null;
  fromNumber?: string | null;
  toNumber?: string | null;
  direction?: string | null;
  status?: string | null;
  priority?: string | null;
  serviceAreaMatch?: boolean | null;
  transcript?: string | null;
  recordingUrl?: string | null;
  summary?: string | null;
  lastEvent?: string | null;
  metadata?: Record<string, unknown> | null;
}

function serializeMetadata(metadata?: Record<string, unknown> | null) {
  if (!metadata) return null;
  return JSON.stringify(metadata);
}

function buildVoiceCallPayload(input: UpsertVoiceCallInput, existing?: Partial<VoiceCallRecord> | null) {
  const now = new Date().toISOString();
  return {
    id: existing?.id || ulid(),
    lead_id: input.leadId ?? existing?.lead_id ?? null,
    deal_id: input.dealId ?? existing?.deal_id ?? null,
    appointment_id: input.appointmentId ?? existing?.appointment_id ?? null,
    provider: input.provider ?? existing?.provider ?? "internal",
    source: input.source ?? existing?.source ?? "voice_agent",
    twilio_call_sid: input.twilioCallSid ?? existing?.twilio_call_sid ?? null,
    retell_call_id: input.retellCallId ?? existing?.retell_call_id ?? null,
    retell_agent_id: input.retellAgentId ?? existing?.retell_agent_id ?? null,
    orchestration_action: input.orchestrationAction ?? existing?.orchestration_action ?? null,
    booking_status: input.bookingStatus ?? existing?.booking_status ?? null,
    confirmation_sms_status: input.confirmationSmsStatus ?? existing?.confirmation_sms_status ?? null,
    confirmation_sms_sent_at: input.confirmationSmsSentAt ?? existing?.confirmation_sms_sent_at ?? null,
    reminder_sms_status: input.reminderSmsStatus ?? existing?.reminder_sms_status ?? null,
    reminder_sms_sent_at: input.reminderSmsSentAt ?? existing?.reminder_sms_sent_at ?? null,
    transfer_target_number: input.transferTargetNumber ?? existing?.transfer_target_number ?? null,
    transfer_status: input.transferStatus ?? existing?.transfer_status ?? null,
    transfer_reason: input.transferReason ?? existing?.transfer_reason ?? null,
    transfer_updated_at:
      input.transferStatus || input.transferReason || input.transferTargetNumber
        ? now
        : existing?.transfer_updated_at ?? null,
    from_number: input.fromNumber ?? existing?.from_number ?? null,
    to_number: input.toNumber ?? existing?.to_number ?? null,
    direction: input.direction ?? existing?.direction ?? null,
    status: input.status ?? existing?.status ?? null,
    priority: input.priority ?? existing?.priority ?? null,
    service_area_match: input.serviceAreaMatch ?? existing?.service_area_match ?? null,
    transcript: input.transcript ?? existing?.transcript ?? null,
    recording_url: input.recordingUrl ?? existing?.recording_url ?? null,
    summary: input.summary ?? existing?.summary ?? null,
    last_event: input.lastEvent ?? existing?.last_event ?? null,
    metadata: serializeMetadata(input.metadata) ?? existing?.metadata ?? null,
    created_at: existing?.created_at || now,
    updated_at: now,
  };
}

export async function findVoiceCallByProviderIds(args: {
  twilioCallSid?: string | null;
  retellCallId?: string | null;
}) {
  const supabase = getSupabase();

  if (args.twilioCallSid) {
    const { data, error } = await supabase
      .from("voice_calls")
      .select("*")
      .eq("twilio_call_sid", args.twilioCallSid)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data) return data as VoiceCallRecord;
  }

  if (args.retellCallId) {
    const { data, error } = await supabase
      .from("voice_calls")
      .select("*")
      .eq("retell_call_id", args.retellCallId)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data) return data as VoiceCallRecord;
  }

  return null;
}

export async function upsertVoiceCall(input: UpsertVoiceCallInput) {
  const supabase = getSupabase();
  const existing = await findVoiceCallByProviderIds({
    twilioCallSid: input.twilioCallSid,
    retellCallId: input.retellCallId,
  });

  const payload = buildVoiceCallPayload(input, existing);

  if (existing) {
    const { data, error } = await supabase
      .from("voice_calls")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return data as VoiceCallRecord;
  }

  const { data, error } = await supabase
    .from("voice_calls")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as VoiceCallRecord;
}

export async function logVoiceCallActivity(args: {
  leadId?: string | null;
  dealId?: string | null;
  description: string;
  metadata?: Record<string, unknown> | null;
}) {
  if (!args.leadId) return null;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("activities")
    .insert({
      id: ulid(),
      lead_id: args.leadId,
      deal_id: args.dealId || null,
      type: "call",
      description: args.description,
      metadata: serializeMetadata(args.metadata),
      created_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
