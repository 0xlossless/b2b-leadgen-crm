-- B2B LeadGen CRM - Database Schema
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  website TEXT,
  industry TEXT,
  employee_count INTEGER,
  revenue_range TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'US',
  tech_stack TEXT,
  source TEXT NOT NULL,
  scrape_job_id TEXT,
  confidence_score INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  phone TEXT,
  linkedin_url TEXT,
  is_decision_maker BOOLEAN DEFAULT FALSE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lead_scores (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  total_score INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'cold',
  industry_match INTEGER DEFAULT 0,
  employee_fit INTEGER DEFAULT 0,
  decision_maker INTEGER DEFAULT 0,
  tech_match INTEGER DEFAULT 0,
  funding_event INTEGER DEFAULT 0,
  traffic_score INTEGER DEFAULT 0,
  email_verified_score INTEGER DEFAULT 0,
  disqualified BOOLEAN DEFAULT FALSE,
  disqualify_reason TEXT,
  scored_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'new_lead',
  deal_value NUMERIC DEFAULT 0,
  assigned_rep TEXT,
  next_action TEXT,
  next_action_date TEXT,
  close_date TEXT,
  win_loss_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  deal_id TEXT REFERENCES deals(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scrape_jobs (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  params TEXT,
  records_found INTEGER DEFAULT 0,
  records_new INTEGER DEFAULT 0,
  records_duplicate INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_contacts_lead_id ON contacts(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_lead_id ON lead_scores(lead_id);
CREATE INDEX IF NOT EXISTS idx_deals_lead_id ON deals(lead_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON lead_scores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON deals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON scrape_jobs FOR ALL USING (true) WITH CHECK (true);
