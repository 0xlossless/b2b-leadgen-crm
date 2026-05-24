import { getVoiceAgentBlueprint } from "./config";
import { assessVoiceLead } from "./decision";

const RETELL_API_BASE = "https://api.retellai.com";

export interface RetellInboundCallPayload {
  event: string;
  call_inbound: {
    from_number: string;
    to_number: string;
    agent_id?: string;
    agent_version?: number;
  };
}

export interface RetellWebhookEvent {
  event: string;
  call?: Record<string, unknown>;
}

function getRetellApiKey() {
  return process.env.RETELL_API_KEY || "";
}

export function parseRetellSignature(signatureHeader?: string | null) {
  if (!signatureHeader) return null;
  const match = signatureHeader.match(/v=(\d+),d=(.*)/);
  if (!match) return null;
  return { timestamp: match[1], digest: match[2] };
}

export async function verifyRetellSignature(rawBody: string, signatureHeader?: string | null) {
  const apiKey = getRetellApiKey();
  if (!apiKey || !signatureHeader) return false;

  const parsed = parseRetellSignature(signatureHeader);
  if (!parsed) return false;

  const now = Date.now();
  const timestampMs = Number(parsed.timestamp);
  const maxAgeMs = 5 * 60 * 1000;
  if (!timestampMs || Math.abs(now - timestampMs) > maxAgeMs) return false;

  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(apiKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signed = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(rawBody + parsed.timestamp)
  );

  const digest = Array.from(new Uint8Array(signed))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return digest === parsed.digest;
}

export async function registerRetellPhoneCall(args: {
  agentId: string;
  fromNumber: string;
  toNumber: string;
  metadata?: Record<string, unknown>;
  dynamicVariables?: Record<string, unknown>;
}) {
  const apiKey = getRetellApiKey();
  if (!apiKey) {
    throw new Error("RETELL_API_KEY is not configured");
  }

  const response = await fetch(`${RETELL_API_BASE}/v2/register-phone-call`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      agent_id: args.agentId,
      from_number: args.fromNumber,
      to_number: args.toNumber,
      direction: "inbound",
      metadata: args.metadata || {},
      retell_llm_dynamic_variables: args.dynamicVariables || {},
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Retell register phone call failed: ${response.status} ${text}`);
  }

  return response.json();
}

export function buildRetellInboundWebhookResponse(payload: RetellInboundCallPayload) {
  const blueprint = getVoiceAgentBlueprint();
  const phone = payload.call_inbound.from_number;
  const calledNumber = payload.call_inbound.to_number;

  const assessment = assessVoiceLead({
    callback_phone: phone,
    service_city: "",
    project_type: "",
  });

  return {
    call_inbound: {
      override_agent_id: payload.call_inbound.agent_id,
      dynamic_variables: {
        business_name: blueprint.businessRules.brandName,
        owner_name: blueprint.businessRules.ownerName,
        caller_number: phone,
        called_number: calledNumber,
        default_next_action: assessment.action,
      },
      metadata: {
        source: "retell_inbound_webhook",
        called_number: calledNumber,
        caller_number: phone,
      },
    },
  };
}

export function getRetellWebhookSummary(event: RetellWebhookEvent) {
  const call = (event.call || {}) as Record<string, unknown>;
  const callAnalysis = (call.call_analysis || {}) as Record<string, unknown>;

  return {
    event: event.event,
    callId: String(call.call_id || ""),
    agentId: String(call.agent_id || ""),
    fromNumber: String(call.from_number || ""),
    toNumber: String(call.to_number || ""),
    status: String(call.call_status || ""),
    disconnectionReason: String(call.disconnection_reason || ""),
    transcript: String(call.transcript || ""),
    recordingUrl: String(call.recording_url || ""),
    endUserMessage: String(callAnalysis.call_summary || ""),
  };
}
