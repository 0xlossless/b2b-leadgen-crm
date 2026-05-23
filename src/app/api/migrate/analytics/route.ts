import { NextResponse } from "next/server";

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const databaseUrl = process.env.DATABASE_URL;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ success: false, error: "Missing env vars" }, { status: 500 });
  }

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

  // Extract project ref from Supabase URL
  const refMatch = supabaseUrl.match(/https:\/\/([a-z]+)\.supabase\.co/);
  const ref = refMatch ? refMatch[1] : null;

  // Extract DB password from DATABASE_URL for direct connection info
  let dbPassword = '';
  if (databaseUrl) {
    const pwMatch = databaseUrl.match(/:([^@]+)@/);
    if (pwMatch) dbPassword = pwMatch[1];
  }

  const errors: string[] = [];

  // Method 1: Try pg-meta query endpoint (Supabase internal)
  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: sql }),
    });
    if (resp.ok) {
      return NextResponse.json({ success: true, method: "rpc-query" });
    }
    errors.push(`rpc/query: ${resp.status} ${await resp.text()}`);
  } catch (e: any) {
    errors.push(`rpc/query: ${e.message}`);
  }

  // Method 2: Try using Supabase Management API (requires access token, not service key)
  // This won't work without a PAT, but let's try

  // Method 3: Use postgres.js with the DATABASE_URL directly (dynamic import to avoid crash)
  try {
    const pgModule = await import("postgres");
    const pgSql = pgModule.default(databaseUrl!, { 
      ssl: { rejectUnauthorized: false },
      connect_timeout: 10,
    });
    
    await pgSql.unsafe(sql);
    
    // Also set up RLS
    await pgSql.unsafe(`
      ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        CREATE POLICY "Allow public inserts" ON page_views FOR INSERT WITH CHECK (true);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
      DO $$ BEGIN
        CREATE POLICY "Allow service role reads" ON page_views FOR SELECT USING (true);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    
    await pgSql.end();
    return NextResponse.json({ success: true, method: "postgres-direct" });
  } catch (e: any) {
    errors.push(`postgres-direct: ${e.message}`);
  }

  // If all methods fail, return the SQL for manual execution
  return NextResponse.json({
    success: false,
    message: "Auto-migration failed. Please run this SQL in the Supabase SQL Editor (supabase.com/dashboard):",
    sql: sql.trim(),
    errors,
    ref,
    dashboardUrl: ref ? `https://supabase.com/dashboard/project/${ref}/sql/new` : null,
  });
}
