export interface TwilioSmsResult {
  ok: boolean;
  skipped: boolean;
  sid: string | null;
  error: string | null;
  code: string | number | null;
  to: string | null;
}

export function normalizeUsPhone(phone?: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  const trimmed = phone.trim();
  return trimmed || null;
}

export async function sendTwilioSms(to: string | null | undefined, body: string): Promise<TwilioSmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const normalizedTo = normalizeUsPhone(to);

  if (!normalizedTo) {
    return {
      ok: false,
      skipped: true,
      sid: null,
      error: "Missing destination phone number.",
      code: null,
      to: null,
    };
  }

  if (!accountSid || !authToken || (!fromNumber && !messagingServiceSid)) {
    return {
      ok: false,
      skipped: true,
      sid: null,
      error: "Twilio SMS is not configured.",
      code: null,
      to: normalizedTo,
    };
  }

  try {
    const params = new URLSearchParams({
      To: normalizedTo,
      Body: body,
    });

    if (messagingServiceSid) {
      params.set("MessagingServiceSid", messagingServiceSid);
    } else if (fromNumber) {
      params.set("From", fromNumber);
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        },
        body: params,
      }
    );

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      return {
        ok: false,
        skipped: false,
        sid: null,
        error: data.message || `Twilio SMS failed with status ${response.status}`,
        code: data.code || response.status,
        to: normalizedTo,
      };
    }

    return {
      ok: true,
      skipped: false,
      sid: data.sid || null,
      error: null,
      code: null,
      to: normalizedTo,
    };
  } catch (error: any) {
    return {
      ok: false,
      skipped: false,
      sid: null,
      error: error?.message || "Unknown Twilio SMS error",
      code: null,
      to: normalizedTo,
    };
  }
}
