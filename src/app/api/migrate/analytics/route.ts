import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const sql = `
    CREATE TABLE IF NOT EXISTS page_views (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      session_id text NOT NULL,
      page_path text NOT NULL,
      page_title text,
      referrer text,
      user_agent text,
      screen_width integer,
      screen_height integer,
      device_type text DEFAULT 'desktop',
      browser text,
      os text,
      country text,
      city text,
      utm_source text,
      utm_medium text,
      utm_campaign text,
      duration_seconds integer DEFAULT 0,
      is_bounce boolean DEFAULT true,
      created_at timestamptz DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at);
    CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON page_views(session_id);
    CREATE INDEX IF NOT EXISTS idx_page_views_page_path ON page_views(page_path);
  `;

  try {
    // Try the Supabase SQL endpoint (available on hosted Supabase)
    const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ sql }),
    });

    if (resp.ok) {
      return NextResponse.json({ success: true, message: "Table created via RPC." });
    }

    // Fallback: try running via the pg-meta / query endpoint (Supabase platform)
    const metaResp = await fetch(`${supabaseUrl}/pg/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (metaResp.ok) {
      return NextResponse.json({ success: true, message: "Table created via pg-meta." });
    }

    // If neither works, check whether the table already exists by trying a simple select
    const supabase = createClient(supabaseUrl, serviceKey);
    const { error: probeErr } = await supabase
      .from("page_views")
      .select("id")
      .limit(1);

    if (!probeErr) {
      return NextResponse.json({
        success: true,
        message: "Table already exists.",
      });
    }

    // Table doesn't exist and auto-migration failed — return SQL for manual use
    return NextResponse.json(
      {
        success: false,
        message:
          "Auto-migration not available. Please run this SQL in the Supabase SQL Editor:",
        sql: sql.trim(),
        error: probeErr.message,
      },
      { status: 200 }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
