import { normalizeUsPhone, sendTwilioSms, type TwilioSmsResult } from "@/lib/twilio-sms";

export interface VoiceBookingNotificationInput {
  callerName?: string | null;
  callerPhone?: string | null;
  preferredDate: string;
  preferredStartTime: string;
  serviceCity?: string | null;
  projectType?: string | null;
}

export interface VoiceBookingNotificationResult {
  customer: TwilioSmsResult;
  owner: TwilioSmsResult;
  customerMessage: string;
  ownerMessage: string;
}

function getFirstName(name?: string | null) {
  const value = name?.trim();
  if (!value) return "there";
  return value.split(/\s+/)[0] || "there";
}

function buildOwnerAlertMessage(input: VoiceBookingNotificationInput) {
  const parts = [
    "VOICE BOOKED:",
    input.callerName || "Unknown caller",
    normalizeUsPhone(input.callerPhone) || input.callerPhone || "No callback",
    input.projectType || "Project type unknown",
    `${input.preferredDate} ${input.preferredStartTime}`,
    input.serviceCity || "Unknown city",
  ];

  return parts.join(" | ");
}

export function buildVoiceBookingConfirmationMessage(input: VoiceBookingNotificationInput) {
  const firstName = getFirstName(input.callerName);
  return `Hi ${firstName}, you're booked for a free estimate on ${input.preferredDate} at ${input.preferredStartTime}. Questions? Call Joseph at (925) 518-2985.`;
}

export function buildVoiceBookingReminderMessage(input: VoiceBookingNotificationInput) {
  const firstName = getFirstName(input.callerName);
  return `Reminder: your Golden State Epoxy estimate is set for ${input.preferredDate} at ${input.preferredStartTime}. Need to reschedule? Call Joseph at (925) 518-2985.`;
}

export async function sendVoiceBookingNotifications(
  input: VoiceBookingNotificationInput
): Promise<VoiceBookingNotificationResult> {
  const ownerPhone = process.env.NOTIFY_PHONE || process.env.TRANSFER_TO_NUMBER || null;
  const customerMessage = buildVoiceBookingConfirmationMessage(input);
  const ownerMessage = buildOwnerAlertMessage(input);

  const [customer, owner] = await Promise.all([
    sendTwilioSms(input.callerPhone, customerMessage),
    sendTwilioSms(ownerPhone, ownerMessage),
  ]);

  return {
    customer,
    owner,
    customerMessage,
    ownerMessage,
  };
}
