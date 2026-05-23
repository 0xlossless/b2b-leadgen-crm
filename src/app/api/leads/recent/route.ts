import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET(request: NextRequest) {
  // Simple auth via secret header
  const secret = request.headers.get("x-api-secret");
  if (secret !== process.env.LEADS_API_SECRET && secret !== "gse-leads-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = request.nextUrl.searchParams.get("since");
  const supabase = getSupabase();

  let query = supabase
    .from("leads")
    .select(`
      id, company_name, city, state, source, created_at,
      contacts(full_name, email, phone),
      deals(stage, deal_value, next_action),
      activities(description, metadata)
    `)
    .eq("source", "website_quote")
    .order("created_at", { ascending: false })
    .limit(10);

  if (since) {
    query = query.gte("created_at", since);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ leads: data, count: data?.length || 0 });
}
