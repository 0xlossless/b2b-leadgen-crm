import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Temporary route to run raw SQL via Supabase Management API
// DELETE THIS AFTER USE
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
  }

  const statements = [
    // Create campaigns table
    `CREATE TABLE IF NOT EXISTS marketing_campaigns (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      name text NOT NULL,
      platform text NOT NULL,
      type text NOT NULL,
      status text NOT NULL DEFAULT 'draft',
      budget_daily numeric(10,2),
      budget_total numeric(10,2),
      spend_total numeric(10,2) DEFAULT 0,
      impressions integer DEFAULT 0,
      clicks integer DEFAULT 0,
      conversions integer DEFAULT 0,
      leads_generated integer DEFAULT 0,
      cpc_avg numeric(10,2) DEFAULT 0,
      ctr numeric(5,2) DEFAULT 0,
      conversion_rate numeric(5,2) DEFAULT 0,
      start_date date,
      end_date date,
      target_locations text[],
      target_keywords text[],
      ad_copy_headline text,
      ad_copy_description text,
      ad_copy_cta text,
      landing_url text DEFAULT 'https://goldenstateepoxyflooring.com',
      notes text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )`,

    // Create ad_creatives table
    `CREATE TABLE IF NOT EXISTS marketing_ad_creatives (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      campaign_id uuid REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
      platform text NOT NULL,
      format text NOT NULL,
      headline text,
      description text,
      cta_text text,
      image_url text,
      preview_data jsonb,
      status text DEFAULT 'draft',
      impressions integer DEFAULT 0,
      clicks integer DEFAULT 0,
      conversions integer DEFAULT 0,
      created_at timestamptz DEFAULT now()
    )`,

    // Indexes
    `CREATE INDEX IF NOT EXISTS idx_mc_status ON marketing_campaigns(status)`,
    `CREATE INDEX IF NOT EXISTS idx_mc_platform ON marketing_campaigns(platform)`,
    `CREATE INDEX IF NOT EXISTS idx_mac_campaign_id ON marketing_ad_creatives(campaign_id)`,

    // RLS
    `ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE marketing_ad_creatives ENABLE ROW LEVEL SECURITY`,
  ];

  const results: any[] = [];

  // Use postgres.js if DATABASE_URL is available
  let databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    // If using direct connection (db.xxx.supabase.co), try pooler instead
    const directMatch = databaseUrl.match(/db\.([a-z]+)\.supabase\.co/);
    if (directMatch) {
      databaseUrl = databaseUrl.replace(
        `db.${directMatch[1]}.supabase.co:5432`,
        `aws-0-us-west-1.pooler.supabase.com:6543`
      ).replace(
        `db.${directMatch[1]}.supabase.co`,
        `aws-0-us-west-1.pooler.supabase.com:6543`
      );
    }
    try {
      const pgModule = await import("postgres");
      const sql = pgModule.default(databaseUrl, {
        ssl: { rejectUnauthorized: false },
        connect_timeout: 10,
      });

      for (const stmt of statements) {
        try {
          await sql.unsafe(stmt);
          results.push({ ok: true, stmt: stmt.substring(0, 50) });
        } catch (e: any) {
          results.push({ ok: false, stmt: stmt.substring(0, 50), error: e.message });
        }
      }

      // Seed data using individual INSERTs
      const checkRes = await sql`SELECT count(*) as cnt FROM marketing_campaigns`;
      const count = Number(checkRes[0]?.cnt || 0);

      if (count === 0) {
        // Seed campaigns
        await sql`INSERT INTO marketing_campaigns (name, platform, type, status, budget_daily, budget_total, spend_total, impressions, clicks, conversions, leads_generated, cpc_avg, ctr, conversion_rate, start_date, end_date, target_locations, target_keywords, ad_copy_headline, ad_copy_description, ad_copy_cta, landing_url, notes)
        VALUES ('Bay Area Epoxy Flooring - Search', 'google_ads', 'search', 'active', 75.00, 2250.00, 1847.50, 28450, 1124, 47, 38, 1.64, 3.95, 4.18, '2025-05-01', '2025-05-31', ARRAY['San Francisco','Oakland','San Jose','Fremont','Hayward','Walnut Creek'], ARRAY['epoxy floor coating','garage floor epoxy','commercial epoxy flooring','metallic epoxy floor'], 'Professional Epoxy Flooring - Bay Areas #1 Rated', 'Transform your garage or commercial space with stunning durable epoxy floors. Free estimates. Licensed and insured. 10-year warranty.', 'Get Free Quote', 'https://goldenstateepoxyflooring.com/quote', 'Top performing campaign. Generating quality leads.')`;

        await sql`INSERT INTO marketing_campaigns (name, platform, type, status, budget_daily, budget_total, spend_total, impressions, clicks, conversions, leads_generated, cpc_avg, ctr, conversion_rate, start_date, end_date, target_locations, target_keywords, ad_copy_headline, ad_copy_description, ad_copy_cta, landing_url, notes)
        VALUES ('Garage Floor Transformations - Social', 'facebook', 'social', 'active', 50.00, 1500.00, 1123.75, 45200, 892, 31, 24, 1.26, 1.97, 3.48, '2025-05-03', '2025-06-03', ARRAY['San Francisco','Oakland','San Jose','Berkeley','Concord','Pleasanton','Dublin','Livermore'], ARRAY['garage makeover','home improvement','garage floor','epoxy flooring'], 'Your Garage Deserves Better', 'Stop hiding your garage! Our metallic epoxy floors turn ugly concrete into a showroom finish.', 'See Transformations', 'https://goldenstateepoxyflooring.com/gallery', 'Before/after photos performing well on FB and IG.')`;

        await sql`INSERT INTO marketing_campaigns (name, platform, type, status, budget_daily, budget_total, spend_total, impressions, clicks, conversions, leads_generated, cpc_avg, ctr, conversion_rate, start_date, end_date, target_locations, target_keywords, ad_copy_headline, ad_copy_description, ad_copy_cta, landing_url, notes)
        VALUES ('Local Neighborhood Promos', 'nextdoor', 'local', 'paused', 25.00, 750.00, 412.50, 12800, 384, 14, 11, 1.07, 3.00, 3.65, '2025-04-15', '2025-05-15', ARRAY['Walnut Creek','Pleasant Hill','Lafayette','Danville','San Ramon'], ARRAY['garage floor','home improvement','local contractor','epoxy flooring'], 'Your Neighbors Garage Looks Amazing', 'Golden State Epoxy Flooring is transforming garages in your neighborhood. Mention Nextdoor for 10% off.', 'Claim 10% Off', 'https://goldenstateepoxyflooring.com/nextdoor-offer', 'Paused - seasonal budget reallocation.')`;

        await sql`INSERT INTO marketing_campaigns (name, platform, type, status, budget_daily, budget_total, spend_total, impressions, clicks, conversions, leads_generated, cpc_avg, ctr, conversion_rate, target_locations, target_keywords, ad_copy_headline, ad_copy_description, ad_copy_cta, landing_url, notes)
        VALUES ('Yelp Business Listing Ads', 'yelp', 'local', 'draft', 35.00, 1050.00, 0.00, 0, 0, 0, 0, 0.00, 0.00, 0.00, ARRAY['San Francisco','Oakland','San Jose','Fremont','Hayward','Concord','Walnut Creek'], ARRAY['epoxy flooring','garage floor coating','floor refinishing'], 'Top-Rated Epoxy Flooring in the Bay Area', '5-star rated on Yelp! Professional epoxy floor installation. Free estimates, 10-year warranty.', 'Request a Quote', 'https://goldenstateepoxyflooring.com/yelp', 'Draft - pending approval from Yelp rep.')`;

        results.push({ ok: true, seeded: 4 });
      } else {
        results.push({ ok: true, seeded: 0, existing: count });
      }

      // Create RLS policies (ignore errors if they already exist)
      try {
        await sql.unsafe(`CREATE POLICY "public_read_mc" ON marketing_campaigns FOR SELECT USING (true)`);
      } catch (e) { /* already exists */ }
      try {
        await sql.unsafe(`CREATE POLICY "service_all_mc" ON marketing_campaigns FOR ALL USING (true)`);
      } catch (e) { /* already exists */ }
      try {
        await sql.unsafe(`CREATE POLICY "public_read_mac" ON marketing_ad_creatives FOR SELECT USING (true)`);
      } catch (e) { /* already exists */ }
      try {
        await sql.unsafe(`CREATE POLICY "service_all_mac" ON marketing_ad_creatives FOR ALL USING (true)`);
      } catch (e) { /* already exists */ }

      await sql.end();
      return NextResponse.json({ success: true, method: "postgres-direct", results });
    } catch (e: any) {
      results.push({ ok: false, error: e.message });
    }
  }

  // Fallback: try using Supabase REST to create a helper function
  // Use the Supabase service key to try direct operations
  try {
    // Try to insert directly via REST (won't work for CREATE TABLE, but let's check if tables exist)
    const checkResp = await fetch(
      `${supabaseUrl}/rest/v1/marketing_campaigns?select=count&limit=0`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Prefer: "count=exact",
        },
      }
    );
    if (checkResp.ok) {
      const count = checkResp.headers.get("content-range")?.split("/")?.[1];
      return NextResponse.json({ success: true, tables_exist: true, count, results });
    }
  } catch (e) {}

  return NextResponse.json({
    success: false,
    results,
    message: "Could not auto-migrate. DATABASE_URL may not be set.",
    hint: "Set DATABASE_URL env var in Vercel to: postgresql://postgres.[ref]:[password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres",
  });
}

export async function POST() {
  return GET();
}
