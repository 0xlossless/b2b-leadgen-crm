import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/google-ads/migrate
 *
 * Creates the google_ads_tokens table in Supabase if it doesn't exist.
 * Uses Supabase REST API with RPC to run raw SQL.
 */
export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // First check if the table exists by trying to query it
    const checkRes = await fetch(`${url}/rest/v1/google_ads_tokens?select=id&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      cache: "no-store",
    });

    if (checkRes.ok) {
      const rows = await checkRes.json();
      return NextResponse.json({
        message: "google_ads_tokens table already exists",
        rows: Array.isArray(rows) ? rows.length : 0,
      });
    }

    // Table doesn't exist — create it via RPC
    // Try using the Supabase SQL endpoint
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
    `;

    // Try via RPC if available
    const rpcRes = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    });

    if (rpcRes.ok) {
      return NextResponse.json({ message: "google_ads_tokens table created via RPC" });
    }

    // RPC not available — return SQL for manual execution
    return NextResponse.json({
      message: "Cannot create table automatically. Please run this SQL in the Supabase SQL Editor:",
      sql: sql.trim(),
      supabase_url: `https://supabase.com/dashboard/project/${url.split("//")[1].split(".")[0]}/sql/new`,
    });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: "Migration failed", detail: error?.message },
      { status: 500 }
    );
  }
}
