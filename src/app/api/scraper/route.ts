import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ulid } from "ulid";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from("scrape_jobs").select("*").order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("GET /api/scraper error:", error);
    return NextResponse.json({ error: "Failed to fetch scraper jobs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const nowDate = new Date().toISOString();
    const jobId = ulid();

    await supabase.from("scrape_jobs").insert({
      id: jobId,
      source: body.source || "google_maps",
      status: "completed",
      params: JSON.stringify(body.params || {}),
      records_found: 0,
      records_new: 0,
      records_duplicate: 0,
      errors: 0,
      started_at: nowDate,
      completed_at: nowDate,
      created_at: nowDate,
    });

    await supabase.from("activities").insert({
      id: ulid(),
      type: "scrape",
      description: `Scrape job started: ${body.source || "google_maps"}`,
      created_at: nowDate,
    });

    return NextResponse.json({ id: jobId, status: "completed" }, { status: 201 });
  } catch (error) {
    console.error("POST /api/scraper error:", error);
    return NextResponse.json({ error: "Failed to create scraper job" }, { status: 500 });
  }
}
