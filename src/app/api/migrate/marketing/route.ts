import { NextResponse } from "next/server";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const databaseUrl = process.env.DATABASE_URL;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ success: false, error: "Missing env vars" }, { status: 500 });
  }

  const createTablesSql = `
    CREATE TABLE IF NOT EXISTS marketing_campaigns (
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
    );

    CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);
    CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_platform ON marketing_campaigns(platform);
    CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_created_at ON marketing_campaigns(created_at);

    CREATE TABLE IF NOT EXISTS marketing_ad_creatives (
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
    );

    CREATE INDEX IF NOT EXISTS idx_marketing_ad_creatives_campaign_id ON marketing_ad_creatives(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_marketing_ad_creatives_status ON marketing_ad_creatives(status);
  `;

  const seedSql = `
    INSERT INTO marketing_campaigns (
      name, platform, type, status,
      budget_daily, budget_total, spend_total,
      impressions, clicks, conversions, leads_generated,
      cpc_avg, ctr, conversion_rate,
      start_date, end_date,
      target_locations, target_keywords,
      ad_copy_headline, ad_copy_description, ad_copy_cta,
      landing_url, notes
    )
    SELECT * FROM (VALUES
      (
        'Bay Area Epoxy Flooring - Search',
        'google_ads',
        'search',
        'active',
        75.00::numeric(10,2),
        2250.00::numeric(10,2),
        1847.50::numeric(10,2),
        28450,
        1124,
        47,
        38,
        1.64::numeric(10,2),
        3.95::numeric(5,2),
        4.18::numeric(5,2),
        '2025-05-01'::date,
        '2025-05-31'::date,
        ARRAY['San Francisco','Oakland','San Jose','Fremont','Hayward','Palo Alto','Mountain View','Sunnyvale','Santa Clara','Walnut Creek'],
        ARRAY['epoxy floor coating','garage floor epoxy','commercial epoxy flooring','epoxy floor installers near me','metallic epoxy floor','epoxy garage floor cost','industrial floor coating','decorative epoxy flooring'],
        'Professional Epoxy Flooring - Bay Area''s #1 Rated',
        'Transform your garage or commercial space with stunning, durable epoxy floors. Free estimates. Licensed & insured. 10-year warranty included.',
        'Get Free Quote',
        'https://goldenstateepoxyflooring.com/quote',
        'Top performing campaign. Consistently generating quality leads from homeowners and businesses.'
      ),
      (
        'Garage Floor Transformations - Social',
        'facebook',
        'social',
        'active',
        50.00::numeric(10,2),
        1500.00::numeric(10,2),
        1123.75::numeric(10,2),
        45200,
        892,
        31,
        24,
        1.26::numeric(10,2),
        1.97::numeric(5,2),
        3.48::numeric(5,2),
        '2025-05-03'::date,
        '2025-06-03'::date,
        ARRAY['San Francisco','Oakland','San Jose','Berkeley','Concord','Pleasanton','Dublin','Livermore'],
        ARRAY['garage makeover','home improvement','garage floor','epoxy flooring','before and after'],
        'Your Garage Deserves Better',
        'Stop hiding your garage! Our metallic epoxy floors turn ugly concrete into a showroom finish. See the transformation for yourself.',
        'See Transformations',
        'https://goldenstateepoxyflooring.com/gallery',
        'Running on Facebook and Instagram feeds. Before/after photos performing well.'
      ),
      (
        'Local Neighborhood Promos',
        'nextdoor',
        'local',
        'paused',
        25.00::numeric(10,2),
        750.00::numeric(10,2),
        412.50::numeric(10,2),
        12800,
        384,
        14,
        11,
        1.07::numeric(10,2),
        3.00::numeric(5,2),
        3.65::numeric(5,2),
        '2025-04-15'::date,
        '2025-05-15'::date,
        ARRAY['Walnut Creek','Pleasant Hill','Lafayette','Danville','San Ramon','Alamo','Orinda','Moraga'],
        ARRAY['garage floor','home improvement','local contractor','epoxy flooring'],
        'Your Neighbor''s Garage Looks Amazing - Here''s Why',
        'Golden State Epoxy Flooring is transforming garages in your neighborhood. Mention Nextdoor for 10% off your project.',
        'Claim 10% Off',
        'https://goldenstateepoxyflooring.com/nextdoor-offer',
        'Paused - seasonal budget reallocation. Will resume in June.'
      ),
      (
        'Yelp Business Listing Ads',
        'yelp',
        'local',
        'draft',
        35.00::numeric(10,2),
        1050.00::numeric(10,2),
        0.00::numeric(10,2),
        0,
        0,
        0,
        0,
        0.00::numeric(10,2),
        0.00::numeric(5,2),
        0.00::numeric(5,2),
        NULL::date,
        NULL::date,
        ARRAY['San Francisco','Oakland','San Jose','Fremont','Hayward','Concord','Walnut Creek','Berkeley'],
        ARRAY['epoxy flooring','garage floor coating','floor refinishing','concrete coating'],
        'Top-Rated Epoxy Flooring in the Bay Area',
        '5-star rated on Yelp! Professional epoxy floor installation. Free estimates, 10-year warranty.',
        'Request a Quote',
        'https://goldenstateepoxyflooring.com/yelp',
        'Draft - pending approval from Yelp rep.'
      )
    ) AS t(
      name, platform, type, status,
      budget_daily, budget_total, spend_total,
      impressions, clicks, conversions, leads_generated,
      cpc_avg, ctr, conversion_rate,
      start_date, end_date,
      target_locations, target_keywords,
      ad_copy_headline, ad_copy_description, ad_copy_cta,
      landing_url, notes
    )
    WHERE NOT EXISTS (SELECT 1 FROM marketing_campaigns LIMIT 1);

    INSERT INTO marketing_ad_creatives (campaign_id, platform, format, headline, description, cta_text, status, impressions, clicks, conversions, preview_data)
    SELECT c.id, 'google_ads', 'search_text',
      'Professional Epoxy Flooring - Bay Area''s #1 Rated',
      'Transform your garage or commercial space with stunning, durable epoxy floors. Free estimates.',
      'Get Free Quote', 'active', 28450, 1124, 47,
      '{"type":"search_text","headlines":["Professional Epoxy Flooring","Bay Area #1 Rated","Free Estimates Available"],"descriptions":["Transform your space with stunning, durable epoxy floors.","Licensed & insured. 10-year warranty included."],"displayUrl":"goldenstateepoxyflooring.com/quote"}'::jsonb
    FROM marketing_campaigns c WHERE c.platform = 'google_ads' AND c.status = 'active'
    AND NOT EXISTS (SELECT 1 FROM marketing_ad_creatives LIMIT 1);

    INSERT INTO marketing_ad_creatives (campaign_id, platform, format, headline, description, cta_text, status, impressions, clicks, conversions, preview_data)
    SELECT c.id, 'facebook', 'image_post',
      'Your Garage Deserves Better',
      'Stop hiding your garage! Our metallic epoxy floors turn ugly concrete into a showroom finish.',
      'See Transformations', 'active', 45200, 892, 31,
      '{"type":"image_post","format":"1200x628","primaryText":"Stop hiding your garage! Our metallic epoxy floors turn ugly concrete into a showroom finish.","headline":"Your Garage Deserves Better","cta":"See Transformations"}'::jsonb
    FROM marketing_campaigns c WHERE c.platform = 'facebook' AND c.status = 'active'
    AND NOT EXISTS (SELECT 1 FROM marketing_ad_creatives WHERE platform = 'facebook' LIMIT 1);

    INSERT INTO marketing_ad_creatives (campaign_id, platform, format, headline, description, cta_text, status, impressions, clicks, conversions, preview_data)
    SELECT c.id, 'nextdoor', 'image_post',
      'Your Neighbor''s Garage Looks Amazing',
      'Golden State Epoxy Flooring is transforming garages in your neighborhood. Mention Nextdoor for 10% off.',
      'Claim 10% Off', 'paused', 12800, 384, 14,
      '{"type":"image_post","format":"local_post","primaryText":"Golden State Epoxy Flooring is transforming garages in your neighborhood.","headline":"Your Neighbors Garage Looks Amazing","cta":"Claim 10% Off"}'::jsonb
    FROM marketing_campaigns c WHERE c.platform = 'nextdoor'
    AND NOT EXISTS (SELECT 1 FROM marketing_ad_creatives WHERE platform = 'nextdoor' LIMIT 1);
  `;

  const errors: string[] = [];

  // Method 1: Try Supabase RPC query endpoint
  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: createTablesSql }),
    });
    if (resp.ok) {
      const seedResp = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query: seedSql }),
      });
      return NextResponse.json({
        success: true,
        method: "rpc-query",
        seeded: seedResp.ok,
        tables: ["marketing_campaigns", "marketing_ad_creatives"],
      });
    }
    errors.push(`rpc/query: ${resp.status} ${await resp.text()}`);
  } catch (e: any) {
    errors.push(`rpc/query: ${e.message}`);
  }

  // Method 2: Use postgres.js with DATABASE_URL directly
  try {
    const pgModule = await import("postgres");
    const pgSql = pgModule.default(databaseUrl!, {
      ssl: { rejectUnauthorized: false },
      connect_timeout: 10,
    });

    await pgSql.unsafe(createTablesSql);

    await pgSql.unsafe(`
      ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        CREATE POLICY "Allow public reads on marketing_campaigns" ON marketing_campaigns FOR SELECT USING (true);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
      DO $$ BEGIN
        CREATE POLICY "Allow service role all on marketing_campaigns" ON marketing_campaigns FOR ALL USING (true);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;

      ALTER TABLE marketing_ad_creatives ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        CREATE POLICY "Allow public reads on marketing_ad_creatives" ON marketing_ad_creatives FOR SELECT USING (true);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
      DO $$ BEGIN
        CREATE POLICY "Allow service role all on marketing_ad_creatives" ON marketing_ad_creatives FOR ALL USING (true);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await pgSql.unsafe(seedSql);
    await pgSql.end();

    return NextResponse.json({
      success: true,
      method: "postgres-direct",
      tables: ["marketing_campaigns", "marketing_ad_creatives"],
      seeded: true,
    });
  } catch (e: any) {
    errors.push(`postgres-direct: ${e.message}`);
  }

  // Fallback: return the SQL for manual execution
  const fullSql = createTablesSql + "\n\n" + seedSql;
  const refMatch = supabaseUrl.match(/https:\/\/([a-z]+)\.supabase\.co/);
  const ref = refMatch ? refMatch[1] : null;

  return NextResponse.json({
    success: false,
    message: "Auto-migration failed. Run this SQL in the Supabase SQL Editor:",
    sql: fullSql.trim(),
    errors,
    dashboardUrl: ref ? `https://supabase.com/dashboard/project/${ref}/sql/new` : null,
  });
}

export async function POST() {
  return GET();
}
