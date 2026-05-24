import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ulid } from "ulid";
import { getVoiceAgentBlueprint } from "@/lib/voice-agent/config";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function extractCity(address?: string | null) {
  if (!address) return null;
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return parts[parts.length - 2];
  return parts[0] || null;
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return phone;
}

function inferPriority(payload: Record<string, unknown>) {
  const projectType = String(payload.projectType || payload.project_type || "").toLowerCase();
  const propertyType = String(payload.propertyType || payload.property_type || "").toLowerCase();
  const timeline = String(payload.timeline || "").toLowerCase();
  const squareFootage = Number(payload.squareFootage || payload.square_footage || 0);
  const wantsTransfer = Boolean(payload.requestImmediateTransfer || payload.request_immediate_transfer);

  const isCommercial =
    propertyType.includes("commercial") ||
    projectType.includes("commercial") ||
    projectType.includes("warehouse") ||
    projectType.includes("showroom");

  if (wantsTransfer) return "hot";
  if (isCommercial && squareFootage >= 1000) return "hot";
  if (timeline.includes("asap") || timeline.includes("this week") || timeline.includes("soon")) return "hot";
  return "standard";
}

function summarizeCall(payload: Record<string, unknown>, priority: string) {
  const projectType = payload.projectType || payload.project_type || "project";
  const city = payload.serviceCity || payload.service_city || payload.projectAddress || payload.project_address || "unknown location";
  const sqft = payload.squareFootage || payload.square_footage || "unknown sqft";
  return `Voice agent ${priority} lead: ${projectType} in ${city}, approx ${sqft}.`;
}

export async function POST(request: NextRequest) {
  try {
    const blueprint = getVoiceAgentBlueprint();
    const body = await request.json();

    const fullName = String(body.fullName || body.full_name || "").trim();
    const callbackPhone = String(body.callbackPhone || body.callback_phone || "").trim();
    const serviceCity = String(body.serviceCity || body.service_city || "").trim();
    const projectType = String(body.projectType || body.project_type || "").trim();

    if (!fullName || !callbackPhone || !serviceCity || !projectType) {
      return NextResponse.json(
        {
          error:
            "Missing required voice intake fields: fullName, callbackPhone, serviceCity, and projectType are required.",
        },
        { status: 400 }
      );
    }

    const serviceAreaMatch = blueprint.businessRules.serviceAreas.some(
      (area) => area.toLowerCase() === serviceCity.toLowerCase()
    );

    const priority = inferPriority(body);
    const now = new Date().toISOString();
    const leadId = ulid();
    const supabase = getSupabase();

    const projectAddress = String(body.projectAddress || body.project_address || "").trim() || null;
    const coatingInterest = String(body.coatingInterest || body.coating_interest || "").trim() || null;
    const squareFootage = String(body.squareFootage || body.square_footage || "").trim() || null;
    const timeline = String(body.timeline || "").trim() || null;
    const notes = String(body.notes || "").trim() || null;
    const email = String(body.email || "").trim() || null;
    const bestCallbackTime = String(body.bestCallbackTime || body.best_callback_time || "").trim() || null;
    const normalizedPhone = normalizePhone(callbackPhone);
    const callSummary = summarizeCall(body, priority);
    const confidence = serviceAreaMatch ? 85 : 55;

    const newLead = {
      id: leadId,
      company_name: `${fullName} — Voice Agent Lead`,
      website: null,
      industry: projectType,
      employee_count: null,
      revenue_range: null,
      city: serviceCity || extractCity(projectAddress),
      state: "CA",
      country: "US",
      tech_stack: null,
      source: "voice_agent",
      confidence_score: confidence,
      created_at: now,
      updated_at: now,
    };

    const { error: leadError } = await supabase.from("leads").insert(newLead);
    if (leadError) throw leadError;

    const { error: contactError } = await supabase.from("contacts").insert({
      id: ulid(),
      lead_id: leadId,
      full_name: fullName,
      email,
      phone: normalizedPhone,
      is_decision_maker: true,
      email_verified: Boolean(email),
      created_at: now,
    });
    if (contactError) throw contactError;

    const estimatedValue = squareFootage ? String(Math.max(3000, Number(squareFootage) * 8 || 3000)) : "3000";
    const dealId = ulid();
    const { error: dealError } = await supabase.from("deals").insert({
      id: dealId,
      lead_id: leadId,
      stage: priority === "hot" ? "qualified" : "new_lead",
      deal_value: estimatedValue,
      next_action: priority === "hot" ? "Call immediately — voice agent hot lead" : "Call back — voice agent lead",
      next_action_date: now,
      created_at: now,
      updated_at: now,
    });
    if (dealError) throw dealError;

    const { error: scoreError } = await supabase.from("lead_scores").insert({
      id: ulid(),
      lead_id: leadId,
      total_score: priority === "hot" ? 92 : 72,
      tier: priority === "hot" ? "hot" : "warm",
      industry_match: 20,
      employee_fit: 10,
      decision_maker: 20,
      tech_match: 5,
      funding_event: 5,
      traffic_score: 10,
      email_verified_score: email ? 10 : 0,
      scored_at: now,
    });
    if (scoreError) throw scoreError;

    const metadata = {
      intakeSource: "voice_agent",
      serviceAreaMatch,
      priority,
      projectType,
      serviceCity,
      projectAddress,
      coatingInterest,
      squareFootage,
      timeline,
      notes,
      bestCallbackTime,
      callDisposition: body.callDisposition || "captured",
      transferRequested: Boolean(body.requestImmediateTransfer || body.request_immediate_transfer),
      rawPayload: body,
    };

    const { error: activityError } = await supabase.from("activities").insert({
      id: ulid(),
      lead_id: leadId,
      deal_id: dealId,
      type: "call",
      description: callSummary,
      metadata: JSON.stringify(metadata),
      created_at: now,
    });
    if (activityError) throw activityError;

    return NextResponse.json(
      {
        success: true,
        leadId,
        dealId,
        priority,
        serviceAreaMatch,
        nextAction:
          priority === "hot" ? "transfer_or_immediate_callback" : "standard_callback",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/voice-agent/intake error:", error);
    return NextResponse.json({ error: "Failed to capture voice agent intake" }, { status: 500 });
  }
}
