import { NextResponse } from "next/server";
import { getProviderConfigStatus, getProviderSetupChecklist } from "@/lib/voice-agent/provider-status";

export const dynamic = "force-dynamic";

const VOICE_CALLS_SQL = `
CREATE TABLE IF NOT EXISTS voice_calls (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  deal_id TEXT REFERENCES deals(id) ON DELETE SET NULL,
  appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  source TEXT NOT NULL,
  twilio_call_sid TEXT,
  retell_call_id TEXT,
  retell_agent_id TEXT,
  orchestration_action TEXT,
  booking_status TEXT,
  confirmation_sms_status TEXT,
  confirmation_sms_sent_at TEXT,
  reminder_sms_status TEXT,
  reminder_sms_sent_at TEXT,
  transfer_target_number TEXT,
  transfer_status TEXT,
  transfer_reason TEXT,
  transfer_updated_at TEXT,
  from_number TEXT,
  to_number TEXT,
  direction TEXT,
  status TEXT,
  priority TEXT,
  service_area_match BOOLEAN,
  transcript TEXT,
  recording_url TEXT,
  summary TEXT,
  last_event TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL;
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS orchestration_action TEXT;
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS booking_status TEXT;
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS confirmation_sms_status TEXT;
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS confirmation_sms_sent_at TEXT;
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS reminder_sms_status TEXT;
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS reminder_sms_sent_at TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_voice_calls_twilio_call_sid ON voice_calls(twilio_call_sid) WHERE twilio_call_sid IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_voice_calls_retell_call_id ON voice_calls(retell_call_id) WHERE retell_call_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_voice_calls_lead_id ON voice_calls(lead_id);
CREATE INDEX IF NOT EXISTS idx_voice_calls_appointment_id ON voice_calls(appointment_id);
CREATE INDEX IF NOT EXISTS idx_voice_calls_created_at ON voice_calls(created_at);
CREATE INDEX IF NOT EXISTS idx_voice_calls_provider ON voice_calls(provider);
`.trim();

export async function GET() {
  const status = getProviderConfigStatus();

  return NextResponse.json({
    status,
    checklist: getProviderSetupChecklist(),
    rollout: status.rollout,
    migrations: {
      voiceCallsSql: VOICE_CALLS_SQL,
      voiceCallsMigrationApi: "/api/voice-agent/migrate",
    },
  });
}
