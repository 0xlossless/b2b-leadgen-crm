import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ulid } from "ulid";

export const dynamic = "force-dynamic";

// Allow CORS for the static website
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ---- Twilio SMS (uses REST API directly, no SDK needed) ----
async function sendSMS(to: string, body: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.log("[SMS SKIPPED] Twilio not configured:", { accountSid: !!accountSid, authToken: !!authToken, fromNumber: !!fromNumber });
    return false;
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
        },
        body: new URLSearchParams({ To: to, From: fromNumber, Body: body }),
      }
    );

    const data = await response.json();
    if (response.ok) {
      console.log(`[SMS SENT] to ${to}, SID: ${data.sid}`);
      return true;
    } else {
      console.error(`[SMS ERROR] ${data.message}`);
      return false;
    }
  } catch (err) {
    console.error("[SMS ERROR]", err);
    return false;
  }
}

// Joseph's phone number for lead notifications
const JOSEPH_PHONE = process.env.NOTIFY_PHONE || "+19255182985";
const JOSEPH_EMAIL = "Jag.concrete22@gmail.com";

// ---- Email notification via Resend (or fallback log) ----
async function sendEmailNotification(lead: {
  name: string; email?: string; phone: string; address?: string;
  projectType?: string; squareFootage?: string; message?: string; estimatedValue: number;
}): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;
  
  if (!resendKey) {
    console.log("[EMAIL SKIPPED] RESEND_API_KEY not configured. Lead details:", JSON.stringify(lead));
    return false;
  }

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:30px;border-top:3px solid #C9A84C;">
      <h1 style="color:#C9A84C;font-size:24px;margin:0 0 5px;">🔥 New Quote Request</h1>
      <p style="color:#999;margin:0 0 20px;">From your website — goldenstateepoxyfloors.com</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:#C9A84C;width:140px;">Name</td><td style="padding:8px 0;">${lead.name}</td></tr>
        <tr><td style="padding:8px 0;color:#C9A84C;">Phone</td><td style="padding:8px 0;"><a href="tel:${lead.phone}" style="color:#fff;">${lead.phone}</a></td></tr>
        ${lead.email ? `<tr><td style="padding:8px 0;color:#C9A84C;">Email</td><td style="padding:8px 0;">${lead.email}</td></tr>` : ""}
        ${lead.address ? `<tr><td style="padding:8px 0;color:#C9A84C;">Address</td><td style="padding:8px 0;">${lead.address}</td></tr>` : ""}
        <tr><td style="padding:8px 0;color:#C9A84C;">Project Type</td><td style="padding:8px 0;">${lead.projectType || "Not specified"}</td></tr>
        <tr><td style="padding:8px 0;color:#C9A84C;">Square Footage</td><td style="padding:8px 0;">${lead.squareFootage || "Not specified"}</td></tr>
        <tr><td style="padding:8px 0;color:#C9A84C;">Est. Value</td><td style="padding:8px 0;font-weight:bold;color:#C9A84C;">$${lead.estimatedValue.toLocaleString()}</td></tr>
      </table>
      ${lead.message ? `<div style="margin-top:20px;padding:15px;background:#1a1a1a;border-left:3px solid #C9A84C;"><p style="color:#999;margin:0 0 5px;font-size:12px;">MESSAGE</p><p style="margin:0;">${lead.message}</p></div>` : ""}
      <div style="margin-top:25px;padding:15px;background:#C9A84C;text-align:center;">
        <a href="tel:${lead.phone}" style="color:#0a0a0a;font-weight:bold;text-decoration:none;font-size:16px;">📞 CALL ${lead.name.split(" ")[0].toUpperCase()} NOW</a>
      </div>
      <p style="color:#666;font-size:12px;margin-top:20px;text-align:center;">This lead is marked as HOT in your CRM dashboard</p>
    </div>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "Golden State Epoxy <leads@goldenstateepoxyflooring.com>",
        to: [JOSEPH_EMAIL],
        subject: `🔥 New Quote: ${lead.name} — ${lead.projectType || "Quote Request"} — $${lead.estimatedValue.toLocaleString()}`,
        html: htmlBody,
      }),
    });

    const data = await response.json();
    if (response.ok) {
      console.log(`[EMAIL SENT] to ${JOSEPH_EMAIL}, ID: ${data.id}`);
      return true;
    } else {
      console.error(`[EMAIL ERROR]`, data);
      return false;
    }
  } catch (err) {
    console.error("[EMAIL ERROR]", err);
    return false;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const nowDate = new Date().toISOString();

    // Validate required fields
    const { name, email, phone, address, projectType, squareFootage, message } = body;
    if (!name || !phone) {
      return NextResponse.json(
        { error: "Name and phone are required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Create the lead
    const leadId = ulid();
    const newLead = {
      id: leadId,
      company_name: `${name} — Quote Request`,
      website: null,
      industry: projectType || "Residential",
      employee_count: null,
      revenue_range: null,
      city: address ? extractCity(address) : null,
      state: "CA",
      country: "US",
      tech_stack: null,
      source: "website_quote",
      confidence_score: 80, // High confidence — they came to us
      created_at: nowDate,
      updated_at: nowDate,
    };

    const { error: leadError } = await supabase.from("leads").insert(newLead);
    if (leadError) throw leadError;

    // Create contact
    const { error: contactError } = await supabase.from("contacts").insert({
      id: ulid(),
      lead_id: leadId,
      full_name: name,
      email: email || null,
      phone: phone,
      is_decision_maker: true,
      email_verified: email ? true : false,
      created_at: nowDate,
    });
    if (contactError) throw contactError;

    // Create deal in pipeline (new_lead stage)
    const estimatedValue = estimateDealValue(squareFootage);
    const { error: dealError } = await supabase.from("deals").insert({
      id: ulid(),
      lead_id: leadId,
      stage: "new_lead",
      deal_value: estimatedValue.toString(),
      next_action: "Call back — website quote request",
      next_action_date: nowDate,
      created_at: nowDate,
      updated_at: nowDate,
    });
    if (dealError) throw dealError;

    // Score as HOT lead — they came to us
    const { error: scoreError } = await supabase.from("lead_scores").insert({
      id: ulid(),
      lead_id: leadId,
      total_score: 90,
      tier: "hot",
      industry_match: 20,
      employee_fit: 10,
      decision_maker: 20,
      tech_match: 10,
      funding_event: 10,
      traffic_score: 10,
      email_verified_score: email ? 10 : 0,
      disqualified: false,
      scored_at: nowDate,
    });
    if (scoreError) console.error("Score insert error:", scoreError);

    // Log the activity
    const metadata = JSON.stringify({
      projectType: projectType || "Not specified",
      squareFootage: squareFootage || "Not specified",
      address: address || "Not provided",
      message: message || "No message",
    });

    await supabase.from("activities").insert({
      id: ulid(),
      lead_id: leadId,
      type: "quote_request",
      description: `Website quote request from ${name}. Project: ${projectType || "N/A"}, ~${squareFootage || "?"} sq ft. ${message ? `Message: "${message}"` : ""}`,
      metadata,
      created_at: nowDate,
    });

    // ---- SEND NOTIFICATIONS (non-blocking) ----

    // 1. Notify Joseph via SMS (requires Twilio A2P registration)
    const josephMsg = `NEW LEAD: ${name} | ${phone} | ${projectType || "N/A"} | ${squareFootage ? squareFootage + "sqft" : "?"} | $${estimatedValue.toLocaleString()} | ${address || "No addr"}`;
    sendSMS(JOSEPH_PHONE, josephMsg).catch(console.error);

    // 2. Auto-confirm to the customer via SMS
    const firstName = name.split(" ")[0];
    const customerMsg = `Hi ${firstName}, Golden State Epoxy Floors got your quote request! Joseph will call you shortly. Questions? (925) 518-2985`;
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const customerPhone = cleanPhone.length === 10 ? "+1" + cleanPhone : 
                          cleanPhone.length === 11 && cleanPhone.startsWith("1") ? "+" + cleanPhone : phone;
    sendSMS(customerPhone, customerMsg).catch(console.error);

    // 3. Send email notification to Joseph (always works, no registration needed)
    sendEmailNotification({
      name, email, phone, address, projectType, squareFootage, message, estimatedValue
    }).catch(console.error);

    return NextResponse.json(
      { success: true, message: "Quote request received! We'll be in touch within 24 hours." },
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("POST /api/quote error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please call us at (925) 518-2985." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

function extractCity(address: string): string | null {
  // Try to pull a city from a freeform address string
  const parts = address.split(",").map(p => p.trim());
  if (parts.length >= 2) return parts[parts.length - 2] || parts[0];
  return parts[0] || null;
}

function estimateDealValue(sqft: string | undefined, projectType?: string): number {
  if (!sqft) return 3000; // Default min job value
  const num = parseInt(sqft.replace(/[^0-9]/g, ""));
  if (isNaN(num)) return 3000;
  // Pricing: $8/sqft flaked epoxy, $10/sqft metallic epoxy
  const isMetallic = projectType?.toLowerCase().includes("metallic");
  const ratePerSqft = isMetallic ? 10 : 8;
  const estimate = Math.max(3000, num * ratePerSqft);
  return Math.min(estimate, 100000); // Cap at 100k
}
