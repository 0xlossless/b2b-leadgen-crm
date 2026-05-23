import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    // Use the Supabase SQL API (available since 2024)
    // POST /rest/v1/sql with service role key
    const sqlRes = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
    });

    // Try using the Supabase Data API to create via raw fetch
    // The Supabase Management API endpoint for SQL is: 
    // https://api.supabase.com/v1/projects/{ref}/database/query
    
    // But for now, let's check if we can use the postgres library 
    // by connecting to the DIRECT host (not pooler) via IPv4
    const dbUrl = process.env.DATABASE_URL;
    
    // Debug: return the DATABASE_URL structure (masked)
    if (dbUrl) {
      const parsed = new URL(dbUrl);
      const masked = `${parsed.protocol}//***:***@${parsed.host}${parsed.pathname}${parsed.search}`;
      let connStr = dbUrl;
      
      try {
        const pg = require("postgres");
        
        // Replace direct connection with session pooler for Vercel IPv6 compatibility
        const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1];
        
        if (connStr.includes("db.") && connStr.includes("supabase.co") && projectRef) {
          // Change host from db.xxx.supabase.co:5432 to pooler
          connStr = connStr.replace(
            /db\.[^:]+\.supabase\.co:\d+/,
            "aws-0-us-west-1.pooler.supabase.com:6543"
          );
          // Change username from postgres to postgres.projectRef for pooler
          connStr = connStr.replace(
            /\/\/postgres:/,
            `//postgres.${projectRef}:`
          );
        }
        
        const sql = pg(connStr, { ssl: "require", connect_timeout: 15 });
        
        await sql.unsafe(`
          CREATE TABLE IF NOT EXISTS appointments (
            id TEXT PRIMARY KEY,
            lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
            deal_id TEXT REFERENCES deals(id) ON DELETE SET NULL,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            notes TEXT,
            date TEXT NOT NULL,
            start_time TEXT,
            end_time TEXT,
            all_day BOOLEAN DEFAULT false,
            completed BOOLEAN DEFAULT false,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          )
        `);
        
        await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date)`);
        await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_appointments_lead_id ON appointments(lead_id)`);
        await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_appointments_type ON appointments(type)`);
        await sql.unsafe(`GRANT ALL ON appointments TO anon, authenticated, service_role`);
        await sql.unsafe(`NOTIFY pgrst, 'reload schema'`);
        
        const rows = await sql`SELECT COUNT(*) as cnt FROM appointments`;
        await sql.end();
        
        return NextResponse.json({ 
          success: true, 
          message: "Table created!",
          rowCount: rows[0]?.cnt,
          connInfo: masked,
        });
      } catch (pgErr: any) {
        return NextResponse.json({ 
          error: pgErr.message,
          code: pgErr.code,
          connInfo: masked,
          transformedHost: connStr ? connStr.replace(/:[^@]+@/, ":***@").substring(0, 100) : "n/a",
        }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 500 });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
