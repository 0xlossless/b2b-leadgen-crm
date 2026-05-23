import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ulid } from "ulid";
import { APPOINTMENT_TYPES, type AppointmentType } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── GET /api/appointments ────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const leadId = searchParams.get("leadId");

    let query = supabase
      .from("appointments")
      .select("*, leads(company_name, industry, city, state)")
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (month) {
      const [year, m] = month.split("-");
      const startDate = `${year}-${m}-01`;
      const lastDay = new Date(parseInt(year), parseInt(m), 0).getDate();
      const endDate = `${year}-${m}-${String(lastDay).padStart(2, "0")}`;
      query = query.gte("date", startDate).lte("date", endDate);
    }

    if (leadId) {
      query = query.eq("lead_id", leadId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("GET appointments error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const appointments = (data || []).map((a: any) => ({
      id: a.id,
      leadId: a.lead_id,
      dealId: a.deal_id,
      type: a.type,
      title: a.title,
      notes: a.notes,
      date: a.date,
      startTime: a.start_time,
      endTime: a.end_time,
      allDay: a.all_day,
      completed: a.completed,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
      lead: a.leads ? {
        companyName: a.leads.company_name,
        industry: a.leads.industry,
        city: a.leads.city,
        state: a.leads.state,
      } : null,
    }));

    return NextResponse.json(appointments);
  } catch (error) {
    console.error("GET /api/appointments error:", error);
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }
}

// ─── POST /api/appointments ───────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { leadId, dealId, type, title, notes, date, startTime, endTime, allDay } = body;

    if (!type || !(type in APPOINTMENT_TYPES)) {
      return NextResponse.json(
        { error: "Invalid type. Use: phone_call, in_person_quote, or construction" },
        { status: 400 }
      );
    }

    if (!date || !title) {
      return NextResponse.json({ error: "Date and title are required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const appointment = {
      id: ulid(),
      lead_id: leadId || null,
      deal_id: dealId || null,
      type,
      title,
      notes: notes || null,
      date,
      start_time: startTime || null,
      end_time: endTime || null,
      all_day: allDay ?? false,
      completed: false,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from("appointments")
      .insert(appointment)
      .select()
      .single();

    if (error) {
      console.error("POST appointments error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity if linked to a lead
    if (leadId) {
      const typeLabel = APPOINTMENT_TYPES[type as AppointmentType].label;
      await supabase.from("activities").insert({
        id: ulid(),
        lead_id: leadId,
        deal_id: dealId || null,
        type: "note",
        description: `${typeLabel} scheduled for ${date}${startTime ? ` at ${startTime}` : ""}`,
        created_at: now,
      });

      // Auto-advance pipeline: move deal to "demo_scheduled" when a quote meeting is booked
      // Only advance if deal is in an earlier stage (don't move backwards)
      const earlyStages = ["new_lead", "contacted", "qualified"];
      const { data: dealRows } = await supabase
        .from("deals")
        .select("id, stage")
        .eq("lead_id", leadId)
        .limit(1);

      const deal = dealRows?.[0];
      if (deal && earlyStages.includes(deal.stage)) {
        // Use direct REST to avoid Supabase JS silent update issues
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        await fetch(
          `${supabaseUrl}/rest/v1/deals?id=eq.${deal.id}`,
          {
            method: "PATCH",
            headers: {
              "apikey": serviceKey,
              "Authorization": `Bearer ${serviceKey}`,
              "Content-Type": "application/json",
              "Prefer": "return=minimal",
            },
            body: JSON.stringify({ stage: "demo_scheduled" }),
          }
        );

        // Log the stage change
        await supabase.from("activities").insert({
          id: ulid(),
          lead_id: leadId,
          deal_id: deal.id,
          type: "stage_change",
          description: `Deal moved to Demo Scheduled (quote meeting booked)`,
          created_at: now,
        });
      }
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/appointments error:", error);
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
}
