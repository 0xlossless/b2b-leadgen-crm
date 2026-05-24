import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const sql = `
CREATE TABLE IF NOT EXISTS voice_calls (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  deal_id TEXT REFERENCES deals(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  source TEXT NOT NULL,
  twilio_call_sid TEXT,
  retell_call_id TEXT,
  retell_agent_id TEXT,
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_voice_calls_twilio_call_sid ON voice_calls(twilio_call_sid) WHERE twilio_call_sid IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_voice_calls_retell_call_id ON voice_calls(retell_call_id) WHERE retell_call_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_voice_calls_lead_id ON voice_calls(lead_id);
CREATE INDEX IF NOT EXISTS idx_voice_calls_created_at ON voice_calls(created_at);
CREATE INDEX IF NOT EXISTS idx_voice_calls_provider ON voice_calls(provider);
`;

  return NextResponse.json({
    message: "Run this SQL in the Supabase SQL Editor to create the voice_calls table.",
    sql,
  });
}
