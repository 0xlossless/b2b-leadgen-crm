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

function estimateDealValue(sqft: string | undefined): number {
  if (!sqft) return 3000; // Default min job value
  const num = parseInt(sqft.replace(/[^0-9]/g, ""));
  if (isNaN(num)) return 3000;
  // Rough estimate: $8-15/sqft for metallic epoxy
  const estimate = Math.max(3000, num * 10);
  return Math.min(estimate, 100000); // Cap at 100k
}
