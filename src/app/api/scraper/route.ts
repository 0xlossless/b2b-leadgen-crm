import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import { ulid } from "ulid";
import { scoreLead } from "@/lib/scoring";

export const dynamic = "force-dynamic";

// GET /api/scraper - List all scrape jobs
export async function GET() {
  try {
    const jobs = await db
      .select()
      .from(schema.scrapeJobs)
      .orderBy(desc(schema.scrapeJobs.createdAt));
    return NextResponse.json({ jobs });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}

// Simulated business data for MVP scraper
const SIMULATED_BUSINESSES = [
  { name: "Bright Solutions LLC", industry: "Technology", employees: 45, city: "San Francisco", state: "CA", tech: ["React", "AWS"] },
  { name: "Peak Performance Gym", industry: "Health & Fitness", employees: 12, city: "Oakland", state: "CA", tech: ["WordPress"] },
  { name: "Valley Digital Agency", industry: "Marketing", employees: 28, city: "San Jose", state: "CA", tech: ["HubSpot", "React", "Next.js"] },
  { name: "Coastal Eats Delivery", industry: "Food & Beverage", employees: 8, city: "Santa Cruz", state: "CA", tech: ["Shopify"] },
  { name: "Summit Cloud Services", industry: "SaaS", employees: 95, city: "Palo Alto", state: "CA", tech: ["AWS", "React", "Node.js", "Stripe"] },
  { name: "Harbor View Properties", industry: "Real Estate Tech", employees: 35, city: "Sausalito", state: "CA", tech: ["Next.js", "Stripe"] },
  { name: "Redwood Analytics Co", industry: "Technology", employees: 150, city: "Redwood City", state: "CA", tech: ["Python", "AWS", "Salesforce"] },
  { name: "Golden Gate Consulting", industry: "Consulting", employees: 20, city: "San Francisco", state: "CA", tech: ["Salesforce", "HubSpot"] },
  { name: "Bay Area Robotics", industry: "Technology", employees: 60, city: "Berkeley", state: "CA", tech: ["Python", "AWS"] },
  { name: "Pacific Freight Solutions", industry: "Logistics", employees: 200, city: "Oakland", state: "CA", tech: ["Salesforce", "AWS"] },
];

// POST /api/scraper - Start a new (simulated) scrape job
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { query = "businesses", location = "California", maxResults = 5 } = body;

    const jobId = ulid();
    const nowDate = new Date().toISOString();

    // Create the scrape job
    await db.insert(schema.scrapeJobs)
      .values({
        id: jobId,
        source: "google_maps",
        status: "running",
        params: JSON.stringify({ query, location, maxResults }),
        recordsFound: 0,
        recordsNew: 0,
        recordsDuplicate: 0,
        errors: 0,
        startedAt: nowDate,
        createdAt: nowDate,
      });

    // Simulate scraping by picking random businesses
    const shuffled = [...SIMULATED_BUSINESSES].sort(() => Math.random() - 0.5);
    const results = shuffled.slice(0, Math.min(maxResults, SIMULATED_BUSINESSES.length));

    let newCount = 0;
    let dupCount = 0;

    for (const biz of results) {
      // Check for duplicate by company name
      const [existing] = await db
        .select()
        .from(schema.leads)
        .where(eq(schema.leads.companyName, biz.name))
        .limit(1);

      if (existing) {
        dupCount++;
        continue;
      }

      const leadId = ulid();
      const contactId = ulid();
      const scoreId = ulid();
      const dealId = ulid();

      // Create lead
      await db.insert(schema.leads)
        .values({
          id: leadId,
          companyName: biz.name,
          website: `https://${biz.name.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "")}.com`,
          industry: biz.industry,
          employeeCount: biz.employees,
          revenueRange: biz.employees > 100 ? "$10M-$25M" : biz.employees > 30 ? "$2M-$5M" : "$500K-$1M",
          city: biz.city,
          state: biz.state,
          country: "US",
          techStack: JSON.stringify(biz.tech),
          source: "google_maps",
          scrapeJobId: jobId,
          confidenceScore: 60 + Math.floor(Math.random() * 30),
          createdAt: nowDate,
          updatedAt: nowDate,
        });

      // Create a contact
      const contactNames = ["Alex Rivera", "Jordan Lee", "Morgan Chen", "Casey Davis", "Taylor Kim"];
      const contactName = contactNames[Math.floor(Math.random() * contactNames.length)];
      const domain = `${biz.name.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "")}.com`;

      await db.insert(schema.contacts)
        .values({
          id: contactId,
          leadId,
          fullName: contactName,
          title: "Owner",
          email: `info@${domain}`,
          emailVerified: Math.random() > 0.5,
          phone: `(${415 + Math.floor(Math.random() * 10)}) ${100 + Math.floor(Math.random() * 900)}-${1000 + Math.floor(Math.random() * 9000)}`,
          isDecisionMaker: true,
          createdAt: nowDate,
        });

      // Score the lead
      const scoreResult = scoreLead({
        industry: biz.industry,
        employeeCount: biz.employees,
        techStack: JSON.stringify(biz.tech),
        hasDecisionMaker: true,
        hasVerifiedEmail: Math.random() > 0.5,
        hasFundingEvent: false,
        monthlyTraffic: Math.floor(Math.random() * 15000),
      });

      await db.insert(schema.leadScores)
        .values({
          id: scoreId,
          leadId,
          ...scoreResult,
          scoredAt: nowDate,
        });

      // Create a deal in new_lead stage
      await db.insert(schema.deals)
        .values({
          id: dealId,
          leadId,
          stage: "new_lead",
          dealValue: "0",
          assignedRep: "Unassigned",
          nextAction: "Initial outreach",
          createdAt: nowDate,
          updatedAt: nowDate,
        });

      // Log activity
      await db.insert(schema.activities)
        .values({
          id: ulid(),
          leadId,
          type: "scrape",
          description: `Scraped from Google Maps: "${query}" in ${location}`,
          metadata: JSON.stringify({ jobId, source: "google_maps" }),
          createdAt: nowDate,
        });

      newCount++;
    }

    // Update job as completed
    await db.update(schema.scrapeJobs)
      .set({
        status: "completed",
        recordsFound: results.length,
        recordsNew: newCount,
        recordsDuplicate: dupCount,
        completedAt: new Date().toISOString(),
      })
      .where(eq(schema.scrapeJobs.id, jobId));

    return NextResponse.json({
      job: {
        id: jobId,
        status: "completed",
        recordsFound: results.length,
        recordsNew: newCount,
        recordsDuplicate: dupCount,
      },
    });
  } catch (error) {
    console.error("Scraper error:", error);
    return NextResponse.json({ error: "Scraper failed" }, { status: 500 });
  }
}
