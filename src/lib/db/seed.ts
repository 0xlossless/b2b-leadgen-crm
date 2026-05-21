import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { ulid } from "ulid";
import * as schema from "./schema";
import { scoreLead } from "../scoring";
import path from "path";
import fs from "fs";

const dbPath = path.join(process.cwd(), "data", "leadgen.db");
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

function now() {
  return new Date().toISOString();
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// ─── Seed Leads ─────────────────────────────────────────
const seedLeads = [
  {
    companyName: "Tri-Valley Property Management",
    website: "https://trivalleypm.com",
    industry: "Property Management",
    employeeCount: 18,
    revenueRange: "$2M-$5M",
    city: "Pleasanton",
    state: "CA",
    techStack: JSON.stringify(["Yelp", "Google Business", "Angi"]),
    source: "google_maps",
  },
  {
    companyName: "Bay Area Commercial Realty",
    website: "https://bayareacommercialrealty.com",
    industry: "Real Estate",
    employeeCount: 35,
    revenueRange: "$5M-$10M",
    city: "Walnut Creek",
    state: "CA",
    techStack: JSON.stringify(["Google Business", "Yelp"]),
    source: "referral",
  },
  {
    companyName: "Dublin Ranch Homeowners Assoc.",
    website: "https://dublinranchhoa.org",
    industry: "Property Management",
    employeeCount: 5,
    revenueRange: "$500K-$1M",
    city: "Dublin",
    state: "CA",
    techStack: JSON.stringify(["Google Business"]),
    source: "referral",
  },
  {
    companyName: "Livermore Valley Auto Group",
    website: "https://livermorevalleyauto.com",
    industry: "Automotive",
    employeeCount: 65,
    revenueRange: "$10M-$25M",
    city: "Livermore",
    state: "CA",
    techStack: JSON.stringify(["Google Business", "Yelp", "Angi"]),
    source: "google_maps",
  },
  {
    companyName: "Pacific Warehouse Solutions",
    website: "https://pacificwarehousesolutions.com",
    industry: "Warehouse",
    employeeCount: 120,
    revenueRange: "$10M-$25M",
    city: "Tracy",
    state: "CA",
    techStack: JSON.stringify(["Google Business"]),
    source: "permit_data",
  },
  {
    companyName: "Campos Family Restaurant Group",
    website: "https://camposdining.com",
    industry: "Restaurant",
    employeeCount: 80,
    revenueRange: "$5M-$10M",
    city: "Livermore",
    state: "CA",
    techStack: JSON.stringify(["Yelp", "Google Business"]),
    source: "yelp",
  },
  {
    companyName: "Sierra Construction Inc.",
    website: "https://sierraconstruction.com",
    industry: "Construction",
    employeeCount: 45,
    revenueRange: "$5M-$10M",
    city: "Pleasanton",
    state: "CA",
    techStack: JSON.stringify(["Angi", "HomeAdvisor", "BuildZoom", "Houzz"]),
    source: "referral",
  },
  {
    companyName: "Fremont Medical Plaza",
    website: "https://fremontmedicalplaza.com",
    industry: "Healthcare",
    employeeCount: 30,
    revenueRange: "$5M-$10M",
    city: "Fremont",
    state: "CA",
    techStack: JSON.stringify(["Google Business", "Yelp"]),
    source: "google_maps",
  },
  {
    companyName: "Castro Valley Fitness Center",
    website: "https://cvfitness.com",
    industry: "Hospitality",
    employeeCount: 22,
    revenueRange: "$1M-$2M",
    city: "Castro Valley",
    state: "CA",
    techStack: JSON.stringify(["Yelp", "Google Business"]),
    source: "google_maps",
  },
  {
    companyName: "Wente Vineyards",
    website: "https://wentevineyards.com",
    industry: "Hospitality",
    employeeCount: 150,
    revenueRange: "$25M-$50M",
    city: "Livermore",
    state: "CA",
    techStack: JSON.stringify(["Yelp", "Google Business", "Houzz"]),
    source: "referral",
  },
  {
    companyName: "Danville Smiles Dental",
    website: "https://danvillesmilesdental.com",
    industry: "Healthcare",
    employeeCount: 12,
    revenueRange: "$1M-$2M",
    city: "Danville",
    state: "CA",
    techStack: JSON.stringify(["Google Business", "Yelp"]),
    source: "google_maps",
  },
  {
    companyName: "San Ramon Retail Center LLC",
    website: "https://sanramonretailcenter.com",
    industry: "Retail",
    employeeCount: 8,
    revenueRange: "$2M-$5M",
    city: "San Ramon",
    state: "CA",
    techStack: JSON.stringify(["Google Business"]),
    source: "permit_data",
  },
  {
    companyName: "Oakland Industrial Coatings",
    website: "https://oaklandindustrialcoatings.com",
    industry: "Manufacturing",
    employeeCount: 40,
    revenueRange: "$5M-$10M",
    city: "Oakland",
    state: "CA",
    techStack: JSON.stringify(["Google Business", "Angi", "Thumbtack"]),
    source: "google_maps",
  },
  {
    companyName: "Pleasanton Luxury Homes",
    website: null,
    industry: "Real Estate",
    employeeCount: 3,
    revenueRange: "$1M-$2M",
    city: "Pleasanton",
    state: "CA",
    techStack: null,
    source: "referral",
  },
  {
    companyName: "Shadow Cliffs Brewing Co.",
    website: "https://shadowcliffsbrewing.com",
    industry: "Hospitality",
    employeeCount: 15,
    revenueRange: "$1M-$2M",
    city: "Livermore",
    state: "CA",
    techStack: JSON.stringify(["Yelp", "Google Business"]),
    source: "yelp",
  },
  {
    companyName: "East Bay Distribution Hub",
    website: "https://eastbaydistribution.com",
    industry: "Warehouse",
    employeeCount: 95,
    revenueRange: "$10M-$25M",
    city: "Tracy",
    state: "CA",
    techStack: JSON.stringify(["Google Business"]),
    source: "permit_data",
  },
  {
    companyName: "Mike's Auto Body & Repair",
    website: "https://mikesautobodylivermore.com",
    industry: "Automotive",
    employeeCount: 8,
    revenueRange: "$500K-$1M",
    city: "Livermore",
    state: "CA",
    techStack: JSON.stringify(["Yelp", "Google Business", "Angi"]),
    source: "yelp",
  },
  {
    companyName: "Hayward Commercial Properties",
    website: "https://haywardcommercial.com",
    industry: "Real Estate",
    employeeCount: 20,
    revenueRange: "$5M-$10M",
    city: "Hayward",
    state: "CA",
    techStack: JSON.stringify(["Google Business", "Yelp"]),
    source: "google_maps",
  },
  {
    companyName: "Valley Montessori School",
    website: "https://valleymontessori.com",
    industry: "Retail",
    employeeCount: 25,
    revenueRange: "$2M-$5M",
    city: "Livermore",
    state: "CA",
    techStack: JSON.stringify(["Google Business", "Yelp"]),
    source: "website",
  },
  {
    companyName: "Iron Horse Construction Co.",
    website: "https://ironhorseconstruction.com",
    industry: "Construction",
    employeeCount: 60,
    revenueRange: "$10M-$25M",
    city: "Danville",
    state: "CA",
    techStack: JSON.stringify(["Angi", "HomeAdvisor", "Houzz", "BuildZoom", "Thumbtack"]),
    source: "referral",
  },
  {
    companyName: "Primrose Bakery & Cafe",
    website: "https://primrosebakerycafe.com",
    industry: "Restaurant",
    employeeCount: 10,
    revenueRange: "$500K-$1M",
    city: "Dublin",
    state: "CA",
    techStack: JSON.stringify(["Yelp", "Google Business"]),
    source: "yelp",
  },
  {
    companyName: "Walnut Creek Veterinary Hospital",
    website: "https://wcvethospital.com",
    industry: "Healthcare",
    employeeCount: 18,
    revenueRange: "$2M-$5M",
    city: "Walnut Creek",
    state: "CA",
    techStack: JSON.stringify(["Google Business", "Yelp"]),
    source: "google_maps",
  },
];

// Contacts for each lead
const contactTemplates = [
  { fullName: "Carlos Mendez", title: "Property Manager", isDecisionMaker: true, emailVerified: true },
  { fullName: "Jennifer Liu", title: "Managing Director", isDecisionMaker: true, emailVerified: true },
  { fullName: "Mark Sullivan", title: "HOA President", isDecisionMaker: true, emailVerified: false },
  { fullName: "Tony Rossi", title: "General Manager", isDecisionMaker: true, emailVerified: true },
  { fullName: "Dave Nakamura", title: "Facility Manager", isDecisionMaker: true, emailVerified: true },
  { fullName: "Maria Campos", title: "Owner", isDecisionMaker: true, emailVerified: true },
  { fullName: "Rick Patterson", title: "Project Manager", isDecisionMaker: true, emailVerified: false },
  { fullName: "Dr. Priya Anand", title: "Practice Owner", isDecisionMaker: true, emailVerified: true },
  { fullName: "Steve Kowalski", title: "Owner", isDecisionMaker: true, emailVerified: true },
  { fullName: "Karl Wente", title: "Facilities Director", isDecisionMaker: true, emailVerified: true },
  { fullName: "Dr. Lisa Chang", title: "Practice Owner", isDecisionMaker: true, emailVerified: true },
  { fullName: "Robert Kim", title: "Property Manager", isDecisionMaker: true, emailVerified: false },
  { fullName: "Frank DiMaggio", title: "Operations Manager", isDecisionMaker: true, emailVerified: true },
  { fullName: "Susan Park", title: "Homeowner", isDecisionMaker: true, emailVerified: false },
  { fullName: "Brian O'Malley", title: "Taproom Manager", isDecisionMaker: false, emailVerified: true },
  { fullName: "James Thornton", title: "Warehouse Director", isDecisionMaker: true, emailVerified: true },
  { fullName: "Mike Pham", title: "Owner", isDecisionMaker: true, emailVerified: true },
  { fullName: "Angela Torres", title: "Leasing Manager", isDecisionMaker: true, emailVerified: false },
  { fullName: "Rebecca Nguyen", title: "School Director", isDecisionMaker: true, emailVerified: true },
  { fullName: "Tom Hennessy", title: "General Contractor", isDecisionMaker: true, emailVerified: true },
  { fullName: "Sophie Laurent", title: "Owner / Head Baker", isDecisionMaker: true, emailVerified: true },
  { fullName: "Dr. Kevin Patel", title: "Hospital Director", isDecisionMaker: true, emailVerified: true },
];

// Assign stages to leads for variety
const stageAssignments = [
  "demo_scheduled", "proposal_sent", "qualified", "closed_won",
  "negotiating", "new_lead", "contacted", "demo_scheduled",
  "proposal_sent", "new_lead", "qualified", "negotiating",
  "closed_won", "closed_lost", "contacted", "new_lead",
  "demo_scheduled", "qualified", "proposal_sent", "closed_won",
  "new_lead", "contacted",
];

const dealValues = [
  18000, 45000, 8500, 35000, 50000, 0, 12000, 22000,
  15000, 0, 9500, 28000, 42000, 0, 6000, 0,
  5500, 32000, 11000, 48000, 3500, 7500,
];

const reps = ["Joseph Galindo", "Maria Rivera", "Danny Tran"];

async function seed() {
  console.log("🌱 Seeding database...\n");

  const ts = now();

  // Create a scrape job for the google_maps leads
  const scrapeJobId = ulid();
  db.insert(schema.scrapeJobs)
    .values({
      id: scrapeJobId,
      source: "google_maps",
      status: "completed",
      params: JSON.stringify({ query: "commercial properties epoxy flooring prospects", location: "Livermore, CA" }),
      recordsFound: 10,
      recordsNew: 10,
      recordsDuplicate: 0,
      errors: 0,
      startedAt: daysAgo(7),
      completedAt: daysAgo(7),
      createdAt: daysAgo(7),
    })
    .run();

  for (let i = 0; i < seedLeads.length; i++) {
    const lead = seedLeads[i];
    const contact = contactTemplates[i];
    const leadId = ulid();
    const contactId = ulid();
    const scoreId = ulid();
    const dealId = ulid();
    const createdAt = daysAgo(30 - i); // Stagger creation dates

    // Insert lead
    db.insert(schema.leads)
      .values({
        id: leadId,
        ...lead,
        scrapeJobId: lead.source === "google_maps" ? scrapeJobId : null,
        confidenceScore: lead.website ? 75 + Math.floor(Math.random() * 25) : 30,
        createdAt,
        updatedAt: ts,
      })
      .run();

    // Insert contact
    const domain = lead.website
      ? lead.website.replace(/https?:\/\//, "").replace(/\/$/, "")
      : null;
    const emailLocal = contact.fullName.toLowerCase().replace(/\s+/g, ".").replace(/'/g, "");
    db.insert(schema.contacts)
      .values({
        id: contactId,
        leadId,
        fullName: contact.fullName,
        title: contact.title,
        email: domain ? `${emailLocal}@${domain}` : null,
        emailVerified: contact.emailVerified,
        phone: `(925) ${518 + i}-${1000 + i * 123}`,
        linkedinUrl: `https://linkedin.com/in/${contact.fullName.toLowerCase().replace(/\s+/g, "-").replace(/'/g, "")}`,
        isDecisionMaker: contact.isDecisionMaker,
        createdAt,
      })
      .run();

    // Score the lead
    const scoreResult = scoreLead({
      industry: lead.industry,
      employeeCount: lead.employeeCount,
      techStack: lead.techStack,
      hasDecisionMaker: contact.isDecisionMaker,
      hasVerifiedEmail: contact.emailVerified,
      hasFundingEvent: Math.random() > 0.6,
      monthlyTraffic: lead.website ? Math.floor(Math.random() * 5000) : 0,
    });

    db.insert(schema.leadScores)
      .values({
        id: scoreId,
        leadId,
        ...scoreResult,
        scoredAt: ts,
      })
      .run();

    // Create deal
    const stage = stageAssignments[i];
    db.insert(schema.deals)
      .values({
        id: dealId,
        leadId,
        stage,
        dealValue: dealValues[i],
        assignedRep: reps[i % reps.length],
        nextAction:
          stage === "new_lead"
            ? "Initial outreach"
            : stage === "contacted"
            ? "Follow-up call"
            : stage === "qualified"
            ? "Schedule site visit"
            : stage === "demo_scheduled"
            ? "Prepare estimate"
            : stage === "proposal_sent"
            ? "Follow up on proposal"
            : stage === "negotiating"
            ? "Finalize scope & pricing"
            : null,
        nextActionDate:
          stage !== "closed_won" && stage !== "closed_lost"
            ? new Date(Date.now() + Math.random() * 7 * 86400000).toISOString()
            : null,
        closeDate:
          stage === "closed_won" || stage === "closed_lost"
            ? daysAgo(Math.floor(Math.random() * 14))
            : null,
        winLossReason:
          stage === "closed_won"
            ? "Great fit — signed for full epoxy install"
            : stage === "closed_lost"
            ? "Went with cheaper contractor"
            : null,
        createdAt,
        updatedAt: ts,
      })
      .run();

    // Create some activities
    const activityTypes = [
      { type: "scrape", description: `Lead found via ${lead.source}` },
      { type: "score_update", description: `Lead scored: ${scoreResult.totalScore}/100 (${scoreResult.tier})` },
    ];

    if (stage !== "new_lead") {
      activityTypes.push({
        type: "email_sent",
        description: `Outreach email sent to ${contact.fullName}`,
      });
    }
    if (["qualified", "demo_scheduled", "proposal_sent", "negotiating", "closed_won"].includes(stage)) {
      activityTypes.push({
        type: "call",
        description: `Site visit / estimate call with ${contact.fullName}`,
      });
    }
    if (stage === "closed_won") {
      activityTypes.push({
        type: "stage_change",
        description: `Deal closed won — $${dealValues[i].toLocaleString()}`,
      });
    }

    for (const act of activityTypes) {
      db.insert(schema.activities)
        .values({
          id: ulid(),
          leadId,
          dealId,
          type: act.type,
          description: act.description,
          metadata: JSON.stringify({ rep: reps[i % reps.length] }),
          createdAt: daysAgo(Math.floor(Math.random() * 20)),
        })
        .run();
    }

    const tierEmoji = scoreResult.tier === "hot" ? "🔥" : scoreResult.tier === "warm" ? "🟡" : "🔵";
    console.log(
      `  ${tierEmoji} ${lead.companyName.padEnd(40)} | Score: ${String(scoreResult.totalScore).padStart(3)} (${scoreResult.tier.padEnd(4)}) | Stage: ${stage.padEnd(16)} | $${dealValues[i].toLocaleString()}`
    );
  }

  console.log(`\n✅ Seeded ${seedLeads.length} leads with contacts, scores, deals, and activities.`);
  process.exit(0);
}

seed().catch(console.error);
