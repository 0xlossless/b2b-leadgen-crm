const DEFAULT_APP_BASE_URL = "https://b2b-leadgen-kappa.vercel.app";
const DEFAULT_REMINDER_CRON_SCHEDULE = "0 16 * * *";
const DEFAULT_REMINDER_WINDOW_HOURS = "24";

export type RolloutCheckStatus = "ready" | "action_required" | "verify_in_prod";

export interface RolloutCheck {
  id: string;
  title: string;
  status: RolloutCheckStatus;
  detail: string;
  action?: string;
}

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
  reminders: {
    cronSecret: boolean;
    windowHours: string;
    cronSchedule: string;
  };
  endpoints: {
    twilioIncomingVoiceWebhook: string;
    twilioDialActionWebhook: string;
    retellInboundWebhook: string;
    retellEventWebhook: string;
    voiceBlueprintApi: string;
    voiceIntakeApi: string;
    voiceReminderApi: string;
  };
  rollout: {
    checks: RolloutCheck[];
    readyCount: number;
    actionRequiredCount: number;
    verifyInProdCount: number;
    totalCount: number;
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

  const reminders = {
    cronSecret: Boolean(process.env.CRON_SECRET),
    windowHours: process.env.VOICE_REMINDER_WINDOW_HOURS || DEFAULT_REMINDER_WINDOW_HOURS,
    cronSchedule: process.env.VOICE_REMINDER_CRON_SCHEDULE || DEFAULT_REMINDER_CRON_SCHEDULE,
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
  if (!reminders.cronSecret) {
    missing.push("CRON_SECRET (recommended to secure Vercel cron invocations)");
  }

  const endpoints = {
    twilioIncomingVoiceWebhook: `${appBaseUrl}/api/voice-agent/twilio/incoming`,
    twilioDialActionWebhook: `${appBaseUrl}/api/voice-agent/twilio/dial-action`,
    retellInboundWebhook: `${appBaseUrl}/api/voice-agent/retell/inbound`,
    retellEventWebhook: `${appBaseUrl}/api/voice-agent/retell/events`,
    voiceBlueprintApi: `${appBaseUrl}/api/voice-agent/blueprint`,
    voiceIntakeApi: `${appBaseUrl}/api/voice-agent/intake`,
    voiceReminderApi: `${appBaseUrl}/api/voice-agent/reminders`,
  };

  const checks: RolloutCheck[] = [
    {
      id: "twilio-config",
      title: "Twilio voice + SMS credentials configured",
      status: twilio.configured ? "ready" : "action_required",
      detail: twilio.configured
        ? "Twilio account credentials and from number are configured."
        : "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER in production.",
      action: twilio.configured ? undefined : "Add missing Twilio environment variables in Vercel.",
    },
    {
      id: "retell-config",
      title: "Retell agent credentials configured",
      status: retell.configured ? "ready" : "action_required",
      detail: retell.configured
        ? "Retell API key and agent ID are present."
        : "Set RETELL_API_KEY and RETELL_AGENT_ID (or RETELL_DEFAULT_AGENT_ID).",
      action: retell.configured ? undefined : "Add missing Retell environment variables in Vercel.",
    },
    {
      id: "app-base-url",
      title: "Production callback base URL pinned",
      status: process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL ? "ready" : "action_required",
      detail:
        process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL
          ? `Callbacks will use ${appBaseUrl}.`
          : "The app will fall back to the production default URL, but explicitly setting APP_BASE_URL is safer.",
      action:
        process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL
          ? undefined
          : "Set APP_BASE_URL in Vercel so provider callbacks and cron links are explicit.",
    },
    {
      id: "reminder-auth",
      title: "Reminder cron route secured",
      status: reminders.cronSecret ? "ready" : "action_required",
      detail: reminders.cronSecret
        ? "CRON_SECRET is configured and Vercel cron requests can be authenticated."
        : "Reminder route is callable, but cron requests are not yet protected by CRON_SECRET.",
      action: reminders.cronSecret ? undefined : "Add CRON_SECRET in Vercel before relying on scheduled reminders.",
    },
    {
      id: "reminder-endpoint",
      title: "Reminder automation endpoint available",
      status: "ready",
      detail: `Reminder automation route is live at ${endpoints.voiceReminderApi} and supports GET or POST invocations.`,
    },
    {
      id: "vercel-cron-deploy",
      title: "Vercel cron registration verified after deploy",
      status: "verify_in_prod",
      detail: `Deploy the repo with vercel.json and confirm the cron job shows ${reminders.cronSchedule} for /api/voice-agent/reminders in the Vercel dashboard.`,
      action: "After deployment, open the Vercel Cron Jobs UI and confirm the reminder schedule exists.",
    },
    {
      id: "real-call-validation",
      title: "Real booked-call reminder validated end-to-end",
      status: "verify_in_prod",
      detail: "Create a near-term voice-booked estimate, wait for the cron window, and confirm reminder SMS delivery plus voice_calls status updates.",
      action: "Run one live production booking test and inspect cron logs plus voice_calls reminder fields.",
    },
  ];

  const rollout = {
    checks,
    readyCount: checks.filter((check) => check.status === "ready").length,
    actionRequiredCount: checks.filter((check) => check.status === "action_required").length,
    verifyInProdCount: checks.filter((check) => check.status === "verify_in_prod").length,
    totalCount: checks.length,
  };

  return {
    appBaseUrl,
    twilio,
    retell,
    reminders,
    endpoints,
    rollout,
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
          "CRON_SECRET",
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
      {
        provider: "Vercel Cron",
        action: "Configure the scheduled reminder job to invoke the voice reminder endpoint once per day in UTC.",
        schedule: status.reminders.cronSchedule,
        url: status.endpoints.voiceReminderApi,
        auth: status.reminders.cronSecret ? "CRON_SECRET configured" : "Add CRON_SECRET to secure cron invocations",
        windowHours: status.reminders.windowHours,
      },
    ],
  };
}
