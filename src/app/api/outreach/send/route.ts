import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min for bulk sends

// ─── Rate Limits ────────────────────────────────────────────────────────────
// Resend free tier: 100 emails/day, 1 email/second, 3000 emails/month
// Bulk sends enforce a 1-second delay between each email to stay compliant.
// ─────────────────────────────────────────────────────────────────────────────

const FROM_ADDRESS = "Golden State Epoxy <joseph@goldenstateepoxyflooring.com>";
const REPLY_TO = ["Jag.concrete22@gmail.com"];

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function ulid() {
  const t = Date.now().toString(36).toUpperCase().padStart(10, "0");
  const r = Array.from({ length: 16 }, () =>
    "0123456789ABCDEFGHJKMNPQRSTVWXYZ"[Math.floor(Math.random() * 32)]
  ).join("");
  return t + r;
}

/** Sleep helper for rate limiting */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Convert plain text email body to branded HTML */
function toHtml(body: string, contactName?: string): string {
  const escapedBody = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Golden State Epoxy</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="padding:24px 32px;border-bottom:2px solid #C9A84C;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#C9A84C;letter-spacing:0.5px;">
                ✦ Golden State Epoxy
              </h1>
              <p style="margin:4px 0 0;font-size:12px;color:#888;letter-spacing:1px;text-transform:uppercase;">
                Premium Commercial Flooring
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;background-color:#111111;border-left:1px solid #1a1a1a;border-right:1px solid #1a1a1a;">
              <div style="font-size:15px;line-height:1.7;color:#e0e0e0;">
                ${escapedBody}
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:2px solid #C9A84C;background-color:#0d0d0d;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:14px;font-weight:600;color:#C9A84C;">
                      Joseph Galindo
                    </p>
                    <p style="margin:4px 0 0;font-size:12px;color:#888;">
                      Golden State Epoxy Flooring<br>
                      (925) 518-2985 · Jag.concrete22@gmail.com
                    </p>
                  </td>
                  <td align="right" valign="top">
                    <p style="margin:0;font-size:11px;color:#555;">
                      Bay Area, CA
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Core function: send a single email via Resend API */
async function sendEmailViaResend(params: {
  emailTo: string;
  subject: string;
  body: string;
  contactName?: string;
}): Promise<{ success: boolean; resendId?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: "RESEND_API_KEY is not configured" };
  }

  const htmlBody = toHtml(params.body, params.contactName);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [params.emailTo],
        reply_to: REPLY_TO,
        subject: params.subject,
        html: htmlBody,
        text: params.body, // plain-text fallback
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", data);
      return {
        success: false,
        error: data?.message || data?.error || `Resend returned ${res.status}`,
      };
    }

    return { success: true, resendId: data.id };
  } catch (err) {
    console.error("Resend fetch error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error sending email",
    };
  }
}

/** CORS headers for cross-origin access */
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// ─── OPTIONS (CORS preflight) ───────────────────────────────────────────────
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

// ─── POST /api/outreach/send — Send a single email ─────────────────────────
// Body: { activityId, emailTo, subject, body, leadId, contactName? }
//
// Sends the email via Resend, updates the existing activity record to
// "email_sent", and logs a separate send event activity.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const {
      activityId,
      emailTo,
      subject,
      body,
      leadId,
      contactName,
    } = await request.json();

    // Validate required fields
    if (!emailTo || !subject || !body) {
      return NextResponse.json(
        { error: "emailTo, subject, and body are required" },
        { status: 400, headers: corsHeaders() }
      );
    }

    if (!emailTo.includes("@")) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Send via Resend
    const result = await sendEmailViaResend({ emailTo, subject, body, contactName });

    if (!result.success) {
      return NextResponse.json(
        { error: `Failed to send: ${result.error}` },
        { status: 502, headers: corsHeaders() }
      );
    }

    const now = new Date().toISOString();

    // If we have an activityId, update the existing draft activity to "email_sent"
    if (activityId) {
      // Fetch existing activity to preserve metadata
      const { data: existing } = await supabase
        .from("activities")
        .select("*")
        .eq("id", activityId)
        .single();

      let meta: Record<string, unknown> = {};
      if (existing) {
        try {
          meta = typeof existing.metadata === "string"
            ? JSON.parse(existing.metadata)
            : (existing.metadata || {});
        } catch {
          meta = {};
        }
      }

      // Merge send data into metadata
      meta.status = "sent";
      meta.sent_at = now;
      meta.resend_id = result.resendId;
      meta.email_to = emailTo;
      meta.subject = subject;
      meta.body = body;

      const { error: updateError } = await supabase
        .from("activities")
        .update({
          type: "email_sent",
          description: `Email sent: ${subject}`,
          metadata: JSON.stringify(meta),
        })
        .eq("id", activityId);

      if (updateError) {
        console.error("Failed to update activity:", updateError);
        // Don't fail the response — the email was already sent
      }
    }

    // Log a new send event activity (separate from the draft record)
    const sendActivityId = ulid();
    const { error: logError } = await supabase.from("activities").insert({
      id: sendActivityId,
      lead_id: leadId || null,
      type: "email_sent",
      description: `Email delivered to ${emailTo}: ${subject}`,
      metadata: JSON.stringify({
        subject,
        email_to: emailTo,
        contact_name: contactName || "",
        status: "sent",
        sent_at: now,
        resend_id: result.resendId,
        source_activity_id: activityId || null,
      }),
      created_at: now,
    });

    if (logError) {
      console.error("Failed to log send activity:", logError);
    }

    return NextResponse.json(
      {
        success: true,
        emailId: result.resendId,
        sentTo: emailTo,
        activityId: activityId || sendActivityId,
        sentAt: now,
      },
      { headers: corsHeaders() }
    );
  } catch (error) {
    console.error("POST /api/outreach/send error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500, headers: corsHeaders() }
    );
  }
}

// ─── PUT /api/outreach/send — Bulk send emails ─────────────────────────────
// Body: { emails: [{ activityId, emailTo, subject, body, leadId, contactName? }] }
//
// Sends an array of emails with 1-second delays between each to respect
// Resend's free-tier rate limit (1 email/second, 100 emails/day).
// Returns a summary with per-email results.
// ─────────────────────────────────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { emails } = await request.json();

    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: "emails array is required and must not be empty" },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Hard cap at 50 emails per bulk request (safety guardrail)
    if (emails.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 emails per bulk request (Resend free tier: 100/day)" },
        { status: 400, headers: corsHeaders() }
      );
    }

    const results: Array<{
      emailTo: string;
      subject: string;
      success: boolean;
      resendId?: string;
      error?: string;
    }> = [];

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < emails.length; i++) {
      const {
        activityId,
        emailTo,
        subject,
        body,
        leadId,
        contactName,
      } = emails[i];

      // Validate each email
      if (!emailTo || !subject || !body || !emailTo.includes("@")) {
        results.push({
          emailTo: emailTo || "unknown",
          subject: subject || "unknown",
          success: false,
          error: "Missing required fields or invalid email",
        });
        failed++;
        continue;
      }

      // Rate limit: wait 1 second between sends (skip for the first one)
      if (i > 0) {
        await sleep(1100); // 1.1s to be safe
      }

      const result = await sendEmailViaResend({ emailTo, subject, body, contactName });

      if (result.success) {
        sent++;
        const now = new Date().toISOString();

        // Update existing activity if we have one
        if (activityId) {
          const { data: existing } = await supabase
            .from("activities")
            .select("metadata")
            .eq("id", activityId)
            .single();

          let meta: Record<string, unknown> = {};
          if (existing) {
            try {
              meta = typeof existing.metadata === "string"
                ? JSON.parse(existing.metadata)
                : (existing.metadata || {});
            } catch {
              meta = {};
            }
          }

          meta.status = "sent";
          meta.sent_at = now;
          meta.resend_id = result.resendId;

          await supabase
            .from("activities")
            .update({
              type: "email_sent",
              description: `Email sent: ${subject}`,
              metadata: JSON.stringify(meta),
            })
            .eq("id", activityId);
        }

        // Log the send event
        await supabase.from("activities").insert({
          id: ulid(),
          lead_id: leadId || null,
          type: "email_sent",
          description: `Email delivered to ${emailTo}: ${subject}`,
          metadata: JSON.stringify({
            subject,
            email_to: emailTo,
            contact_name: contactName || "",
            status: "sent",
            sent_at: now,
            resend_id: result.resendId,
            source_activity_id: activityId || null,
            bulk_send: true,
          }),
          created_at: now,
        });

        results.push({
          emailTo,
          subject,
          success: true,
          resendId: result.resendId,
        });
      } else {
        failed++;
        results.push({
          emailTo,
          subject,
          success: false,
          error: result.error,
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        summary: {
          total: emails.length,
          sent,
          failed,
          estimatedTime: `${emails.length * 1.1}s`,
        },
        results,
      },
      { headers: corsHeaders() }
    );
  } catch (error) {
    console.error("PUT /api/outreach/send error:", error);
    return NextResponse.json(
      { error: "Failed to process bulk send" },
      { status: 500, headers: corsHeaders() }
    );
  }
}
