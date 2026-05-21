import {
  pgTable,
  text,
  integer,
  boolean,
  numeric,
} from "drizzle-orm/pg-core";

// ─── Leads ───────────────────────────────────────────────
export const leads = pgTable("leads", {
  id: text("id").primaryKey(),
  companyName: text("company_name").notNull(),
  website: text("website"),
  industry: text("industry"),
  employeeCount: integer("employee_count"),
  revenueRange: text("revenue_range"),
  city: text("city"),
  state: text("state"),
  country: text("country").default("US"),
  techStack: text("tech_stack"), // JSON array string
  source: text("source").notNull(), // 'google_maps', 'manual', 'apollo', etc
  scrapeJobId: text("scrape_job_id"),
  confidenceScore: integer("confidence_score").default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── Contacts ────────────────────────────────────────────
export const contacts = pgTable("contacts", {
  id: text("id").primaryKey(),
  leadId: text("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  title: text("title"),
  email: text("email"),
  emailVerified: boolean("email_verified").default(false),
  phone: text("phone"),
  linkedinUrl: text("linkedin_url"),
  isDecisionMaker: boolean("is_decision_maker").default(false),
  createdAt: text("created_at").notNull(),
});

// ─── Lead Scores ─────────────────────────────────────────
export const leadScores = pgTable("lead_scores", {
  id: text("id").primaryKey(),
  leadId: text("lead_id")
    .notNull()
    .unique()
    .references(() => leads.id, { onDelete: "cascade" }),
  totalScore: integer("total_score").notNull().default(0),
  tier: text("tier").notNull().default("cold"), // 'hot', 'warm', 'cold'
  industryMatch: integer("industry_match").default(0),
  employeeFit: integer("employee_fit").default(0),
  decisionMaker: integer("decision_maker").default(0),
  techMatch: integer("tech_match").default(0),
  fundingEvent: integer("funding_event").default(0),
  trafficScore: integer("traffic_score").default(0),
  emailVerified: integer("email_verified_score").default(0),
  disqualified: boolean("disqualified").default(false),
  disqualifyReason: text("disqualify_reason"),
  scoredAt: text("scored_at").notNull(),
});

// ─── Deals ───────────────────────────────────────────────
export const deals = pgTable("deals", {
  id: text("id").primaryKey(),
  leadId: text("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  stage: text("stage").notNull().default("new_lead"),
  dealValue: numeric("deal_value").default("0"),
  assignedRep: text("assigned_rep"),
  nextAction: text("next_action"),
  nextActionDate: text("next_action_date"),
  closeDate: text("close_date"),
  winLossReason: text("win_loss_reason"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── Activities ──────────────────────────────────────────
export const activities = pgTable("activities", {
  id: text("id").primaryKey(),
  leadId: text("lead_id").references(() => leads.id, { onDelete: "set null" }),
  dealId: text("deal_id").references(() => deals.id, { onDelete: "set null" }),
  type: text("type").notNull(), // 'email_sent', 'call', 'note', 'stage_change', 'scrape', 'score_update'
  description: text("description").notNull(),
  metadata: text("metadata"), // JSON blob
  createdAt: text("created_at").notNull(),
});

// ─── Scrape Jobs ─────────────────────────────────────────
export const scrapeJobs = pgTable("scrape_jobs", {
  id: text("id").primaryKey(),
  source: text("source").notNull(), // 'google_maps'
  status: text("status").notNull().default("pending"), // 'pending', 'running', 'completed', 'failed'
  params: text("params"), // JSON (query, location, etc)
  recordsFound: integer("records_found").default(0),
  recordsNew: integer("records_new").default(0),
  recordsDuplicate: integer("records_duplicate").default(0),
  errors: integer("errors").default(0),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull(),
});

// ─── Pipeline Stage Constants ────────────────────────────
export const PIPELINE_STAGES = [
  "new_lead",
  "contacted",
  "qualified",
  "demo_scheduled",
  "proposal_sent",
  "negotiating",
  "closed_won",
  "closed_lost",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const STAGE_LABELS: Record<PipelineStage, string> = {
  new_lead: "New Lead",
  contacted: "Contacted",
  qualified: "Qualified",
  demo_scheduled: "Demo Scheduled",
  proposal_sent: "Proposal Sent",
  negotiating: "Negotiating",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

export const SCORE_TIERS = {
  hot: { min: 80, max: 100, color: "red" },
  warm: { min: 50, max: 79, color: "amber" },
  cold: { min: 0, max: 49, color: "sky" },
} as const;

export type ScoreTier = keyof typeof SCORE_TIERS;
