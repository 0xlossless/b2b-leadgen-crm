import { NextResponse } from "next/server";
import postgres from "postgres";

export async function POST() {
  let databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    return NextResponse.json(
      { success: false, error: "DATABASE_URL not configured" },
      { status: 500 }
    );
  }

  // Debug: extract host info before any transformations
  function safeParseUrl(u: string) {
    return new URL(u.replace(/^postgres(ql)?:\/\//, 'http://'));
  }
  
  let origHost = '';
  try {
    origHost = safeParseUrl(databaseUrl).hostname;
  } catch { origHost = 'parse-error'; }

  // Supabase direct connection may not work from serverless — use pooler
  // The pooler URL format is: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
  if (databaseUrl.includes(".supabase.co") && !databaseUrl.includes("pooler.supabase.com")) {
    // Extract the project ref from the URL (could be db.REF.supabase.co or just REF.supabase.co)
    const refMatch = databaseUrl.match(/(?:db\.)?([a-z]+)\.supabase\.co/);
    if (refMatch) {
      const ref = refMatch[1];
      // Replace direct host with pooler, add ref to username
      databaseUrl = databaseUrl
        .replace(/postgres(ql)?:\/\/postgres:/, `postgresql://postgres.${ref}:`)
        .replace(/[a-z.]*\.supabase\.co:\d+/, `aws-0-us-west-1.pooler.supabase.com:6543`)
        .replace(/[a-z.]*\.supabase\.co/, `aws-0-us-west-1.pooler.supabase.com:6543`);
    }
  }

  // Debug: extract host info after transformations
  let debugInfo: Record<string, string> = { originalHost: origHost };
  try {
    const newUrlObj = safeParseUrl(databaseUrl);
    debugInfo = { 
      originalHost: origHost, 
      newHost: newUrlObj.hostname, 
      newPort: newUrlObj.port, 
      newUser: newUrlObj.username 
    };
  } catch { debugInfo.parseError = 'true'; }

  const sql = postgres(databaseUrl, { ssl: "require" });

  try {
    // Create page_views table
    await sql`
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
      )
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON page_views(session_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_page_views_page_path ON page_views(page_path)`;

    // Enable RLS but allow inserts from anon (for the tracking script)
    await sql`ALTER TABLE page_views ENABLE ROW LEVEL SECURITY`;
    
    // Policy: allow inserts from any source (tracking is public)
    await sql`
      DO $$ BEGIN
        CREATE POLICY "Allow public inserts" ON page_views FOR INSERT WITH CHECK (true);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `;
    
    // Policy: allow reads with service role only
    await sql`
      DO $$ BEGIN
        CREATE POLICY "Allow service role reads" ON page_views FOR SELECT USING (true);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `;

    await sql.end();

    return NextResponse.json({
      success: true,
      message: "page_views table created with indexes and RLS policies.",
      debug: debugInfo,
    });
  } catch (e: unknown) {
    await sql.end();
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg, debug: debugInfo }, { status: 500 });
  }
}
