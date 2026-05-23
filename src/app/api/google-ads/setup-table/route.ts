import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * GET /api/google-ads/setup-table
 *
 * Creates the google_ads_tokens table using Supabase service role.
 * This is a one-time setup endpoint — delete after use.
 */
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceKey) {
      return NextResponse.json({ error: "Service role key not available" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Try to query the table first
    const { data: existing, error: checkError } = await supabase
      .from("google_ads_tokens")
      .select("id")
      .limit(1);

    if (!checkError) {
      return NextResponse.json({
        message: "google_ads_tokens table already exists",
        rows: existing?.length || 0,
      });
    }

    // Table doesn't exist — create it via raw SQL using Supabase's rpc
    // Since we can't run DDL via the JS client, let's use the REST API directly
    // with the pg_net extension or the SQL endpoint

    // Alternative: Use the management API
    const sqlRes = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    // The JS client can't run DDL, so return the SQL for manual execution
    const sql = `
CREATE TABLE IF NOT EXISTS google_ads_tokens (
  id SERIAL PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  customer_id TEXT,
  created_at TEXT NOT NULL DEFAULT now()::text,
  updated_at TEXT NOT NULL DEFAULT now()::text
);

-- Enable RLS but allow service role full access
ALTER TABLE google_ads_tokens ENABLE ROW LEVEL SECURITY;

-- Allow the service role to do everything
CREATE POLICY "Service role full access" ON google_ads_tokens
  FOR ALL USING (true) WITH CHECK (true);
`.trim();

    return NextResponse.json({
      error: checkError.message,
      message: "Table does not exist. Please create it by running the SQL below in the Supabase SQL Editor.",
      sql,
      supabase_sql_editor: "https://supabase.com/dashboard/project/raeoimowqintjumxetsx/sql/new",
      instructions: [
        "1. Click the Supabase SQL Editor link above",
        "2. Log in to your Supabase dashboard",
        "3. Paste the SQL and click 'Run'",
        "4. Then click 'Connect Google Ads' in the CRM — it will stay connected"
      ],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
