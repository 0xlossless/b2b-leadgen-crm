import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, contacts, leadScores, deals } from "@/lib/db/schema";
import { eq, and, like, desc, asc, sql, or } from "drizzle-orm";
import { ulid } from "ulid";
import { z } from "zod/v4";

// ─── GET /api/leads ──────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20")));
    const offset = (page - 1) * limit;

    const industry = url.searchParams.get("industry");
    const tier = url.searchParams.get("tier");
    const stage = url.searchParams.get("stage");
    const source = url.searchParams.get("source");
    const search = url.searchParams.get("search");
    const sortBy = url.searchParams.get("sortBy") ?? "createdAt";
    const sortDir = url.searchParams.get("sortDir") ?? "desc";

    // Build WHERE conditions
    const conditions: ReturnType<typeof eq>[] = [];

    if (industry) conditions.push(eq(leads.industry, industry));
    if (source) conditions.push(eq(leads.source, source));
    if (tier) conditions.push(eq(leadScores.tier, tier));
    if (stage) conditions.push(eq(deals.stage, stage));
    if (search) {
      conditions.push(
        or(
          like(leads.companyName, `%${search}%`),
          like(leads.industry, `%${search}%`),
          like(leads.city, `%${search}%`)
        )!
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Sort mapping
    const sortColumns: Record<string, any> = {
      createdAt: leads.createdAt,
      companyName: leads.companyName,
      industry: leads.industry,
      totalScore: leadScores.totalScore,
      dealValue: deals.dealValue,
    };
    const sortColumn = sortColumns[sortBy] ?? leads.createdAt;
    const orderFn = sortDir === "asc" ? asc : desc;

    // Count total
    const [{ count: total }] = await db
      .select({ count: sql<number>`cast(count(distinct ${leads.id}) as integer)` })
      .from(leads)
      .leftJoin(contacts, eq(contacts.leadId, leads.id))
      .leftJoin(leadScores, eq(leadScores.leadId, leads.id))
      .leftJoin(deals, eq(deals.leadId, leads.id))
      .where(whereClause);

    // Fetch leads with joins
    const rows = await db
      .select({
        lead: leads,
        score: leadScores,
        deal: deals,
      })
      .from(leads)
      .leftJoin(leadScores, eq(leadScores.leadId, leads.id))
      .leftJoin(deals, eq(deals.leadId, leads.id))
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset);

    // Get contacts for these leads
    const leadIds = Array.from(new Set(rows.map((r) => r.lead.id)));
    const allContacts =
      leadIds.length > 0
        ? await db
            .select()
            .from(contacts)
            .where(
              or(...leadIds.map((id) => eq(contacts.leadId, id)))
            )
        : [];

    // Group contacts by leadId
    const contactsByLead = allContacts.reduce<Record<string, typeof allContacts>>(
      (acc, c) => {
        (acc[c.leadId] ??= []).push(c);
        return acc;
      },
      {}
    );

    // Deduplicate leads (multiple joins can produce duplicates)
    const seen = new Set<string>();
    const leadsResult = rows
      .filter((r) => {
        if (seen.has(r.lead.id)) return false;
        seen.add(r.lead.id);
        return true;
      })
      .map((r) => {
        const leadContacts = contactsByLead[r.lead.id] ?? [];
        const primaryContact = leadContacts[0] ?? null;
        return {
          ...r.lead,
          // Flatten contact fields for the table
          contactName: primaryContact?.fullName ?? null,
          contactTitle: primaryContact?.title ?? null,
          contactEmail: primaryContact?.email ?? null,
          emailVerified: primaryContact?.emailVerified ?? null,
          // Flatten score fields
          score: r.score?.totalScore ?? null,
          scoreTier: r.score?.tier ?? null,
          // Flatten deal fields
          dealStage: r.deal?.stage ?? null,
          dealValue: r.deal?.dealValue ?? null,
          // Keep full objects for detail views
          scoreDetail: r.score,
          dealDetail: r.deal,
          contacts: leadContacts,
        };
      });

    const totalPages = Math.ceil(total / limit);
    return NextResponse.json({
      leads: leadsResult,
      pagination: { total, page, limit, totalPages },
    });
  } catch (error) {
    console.error("GET /api/leads error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}

// ─── POST /api/leads ─────────────────────────────────────
const createLeadSchema = z.object({
  companyName: z.string().min(1),
  website: z.string().optional(),
  industry: z.string().optional(),
  employeeCount: z.number().int().positive().optional(),
  revenueRange: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().default("US"),
  techStack: z.string().optional(), // JSON array string
  source: z.string().min(1),
  scrapeJobId: z.string().optional(),
  confidenceScore: z.number().int().min(0).max(100).default(0),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createLeadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const nowDate = new Date().toISOString();
    const newLead = {
      id: ulid(),
      ...parsed.data,
      createdAt: nowDate,
      updatedAt: nowDate,
    };

    await db.insert(leads).values(newLead);

    // Also create a default deal for the pipeline
    const newDeal = {
      id: ulid(),
      leadId: newLead.id,
      stage: "new_lead",
      dealValue: "0",
      createdAt: nowDate,
      updatedAt: nowDate,
    };
    await db.insert(deals).values(newDeal);

    return NextResponse.json(newLead, { status: 201 });
  } catch (error) {
    console.error("POST /api/leads error:", error);
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 }
    );
  }
}
