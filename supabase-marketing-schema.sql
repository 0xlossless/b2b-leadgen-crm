-- Marketing Module - Database Schema
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'google_ads',
  status TEXT NOT NULL DEFAULT 'draft',
  campaign_type TEXT DEFAULT 'search',
  budget NUMERIC DEFAULT 0,
  daily_budget NUMERIC DEFAULT 0,
  start_date TEXT,
  end_date TEXT,
  target_audience TEXT,
  target_locations TEXT,
  keywords TEXT,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  spend NUMERIC DEFAULT 0,
  leads_generated INTEGER DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  cpa NUMERIC DEFAULT 0,
  roas NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ad_creatives (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ad_type TEXT DEFAULT 'text',
  headline TEXT,
  description TEXT,
  cta TEXT,
  image_url TEXT,
  landing_page_url TEXT,
  platform_ad_id TEXT,
  status TEXT DEFAULT 'draft',
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  spend NUMERIC DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_platform ON marketing_campaigns(platform);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_created_at ON marketing_campaigns(created_at);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_campaign_id ON ad_creatives(campaign_id);

ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_creatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON marketing_campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON ad_creatives FOR ALL USING (true) WITH CHECK (true);
