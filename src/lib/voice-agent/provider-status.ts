const DEFAULT_APP_BASE_URL = "https://b2b-leadgen-kappa.vercel.app";

export interface ProviderConfigStatus {
  appBaseUrl: string;
  twilio: {
    configured: boolean;
    accountSid: boolean;
    authToken: boolean;
    fromNumber: boolean;
    messagingServiceSid: boolean;
  };
  retell: {
    configured: boolean;
    apiKey: boolean;
    agentId: boolean;
  };
  endpoints: {
    twilioIncomingVoiceWebhook: string;
    twilioDialActionWebhook: string;
    retellInboundWebhook: string;
    retellEventWebhook: string;
    voiceBlueprintApi: string;
    voiceIntakeApi: string;
  };
  missing: string[];
}

export function getAppBaseUrl() {
  return process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_BASE_URL;
}

export function getProviderConfigStatus(): ProviderConfigStatus {
  const appBaseUrl = getAppBaseUrl().replace(/\/$/, "");

  const twilio = {
    accountSid: Boolean(process.env.TWILIO_ACCOUNT_SID),
    authToken: Boolean(process.env.TWILIO_AUTH_TOKEN),
    fromNumber: Boolean(process.env.TWILIO_FROM_NUMBER),
    messagingServiceSid: Boolean(process.env.TWILIO_MESSAGING_SERVICE_SID),
    configured:
      Boolean(process.env.TWILIO_ACCOUNT_SID) &&
      Boolean(process.env.TWILIO_AUTH_TOKEN) &&
      Boolean(process.env.TWILIO_FROM_NUMBER),
  };

  const retell = {
    apiKey: Boolean(process.env.RETELL_API_KEY),
    agentId: Boolean(process.env.RETELL_AGENT_ID || process.env.RETELL_DEFAULT_AGENT_ID),
    configured:
      Boolean(process.env.RETELL_API_KEY) &&
      Boolean(process.env.RETELL_AGENT_ID || process.env.RETELL_DEFAULT_AGENT_ID),
  };

  const missing: string[] = [];
  if (!twilio.accountSid) missing.push("TWILIO_ACCOUNT_SID");
  if (!twilio.authToken) missing.push("TWILIO_AUTH_TOKEN");
  if (!twilio.fromNumber) missing.push("TWILIO_FROM_NUMBER");
  if (!retell.apiKey) missing.push("RETELL_API_KEY");
  if (!retell.agentId) missing.push("RETELL_AGENT_ID or RETELL_DEFAULT_AGENT_ID");
  if (!process.env.APP_BASE_URL && !process.env.NEXT_PUBLIC_APP_URL) {
    missing.push("APP_BASE_URL or NEXT_PUBLIC_APP_URL (recommended for provider callbacks)");
  }

  return {
    appBaseUrl,
    twilio,
    retell,
    endpoints: {
      twilioIncomingVoiceWebhook: `${appBaseUrl}/api/voice-agent/twilio/incoming`,
      twilioDialActionWebhook: `${appBaseUrl}/api/voice-agent/twilio/dial-action`,
      retellInboundWebhook: `${appBaseUrl}/api/voice-agent/retell/inbound`,
      retellEventWebhook: `${appBaseUrl}/api/voice-agent/retell/events`,
      voiceBlueprintApi: `${appBaseUrl}/api/voice-agent/blueprint`,
      voiceIntakeApi: `${appBaseUrl}/api/voice-agent/intake`,
    },
    missing,
  };
}

export function getProviderSetupChecklist() {
  const status = getProviderConfigStatus();
  return {
    status,
    steps: [
      {
        provider: "Vercel",
        action: "Add or confirm required environment variables.",
        fields: [
          "TWILIO_ACCOUNT_SID",
          "TWILIO_AUTH_TOKEN",
          "TWILIO_FROM_NUMBER",
          "RETELL_API_KEY",
          "RETELL_AGENT_ID",
          "APP_BASE_URL",
        ],
      },
      {
        provider: "Twilio",
        action: "Set the phone number Voice webhook to the Twilio incoming voice webhook URL using HTTP POST.",
        url: status.endpoints.twilioIncomingVoiceWebhook,
      },
      {
        provider: "Retell",
        action: "Configure the inbound webhook URL and account or agent event webhook URL.",
        inboundWebhookUrl: status.endpoints.retellInboundWebhook,
        eventWebhookUrl: status.endpoints.retellEventWebhook,
      },
      {
        provider: "Testing",
        action: "Place a real inbound call, then verify call bridge behavior and CRM intake output.",
        verificationApis: [status.endpoints.voiceBlueprintApi, status.endpoints.voiceIntakeApi],
      },
    ],
  };
}
