import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deals, leads, contacts, leadScores, PIPELINE_STAGES } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";

// ─── GET /api/pipeline ───────────────────────────────────
export async function GET() {
  try {
    // Fetch all deals with lead + contact + score info
    const allDeals = await db
      .select({
        deal: deals,
        companyName: leads.companyName,
        leadIndustry: leads.industry,
        scoreTier: leadScores.tier,
        totalScore: leadScores.totalScore,
      })
      .from(deals)
      .leftJoin(leads, eq(leads.id, deals.leadId))
      .leftJoin(leadScores, eq(leadScores.leadId, deals.leadId));

    // Get primary contacts for each deal's lead
    const leadIds = Array.from(new Set(allDeals.map((d) => d.deal.leadId)));
    const allContacts =
      leadIds.length > 0
        ? await db
            .select()
            .from(contacts)
            .where(or(...leadIds.map((id) => eq(contacts.leadId, id))))
        : [];

    const contactsByLead = allContacts.reduce<Record<string, (typeof allContacts)[0]>>(
      (acc, c) => {
        // Keep first contact (or decision maker) per lead
        if (!acc[c.leadId] || c.isDecisionMaker) {
          acc[c.leadId] = c;
        }
        return acc;
      },
      {}
    );

    // Group by stage
    const stages: Record<string, any[]> = {};
    for (const stage of PIPELINE_STAGES) {
      stages[stage] = [];
    }

    for (const row of allDeals) {
      const stage = row.deal.stage;
      const contact = contactsByLead[row.deal.leadId];

      stages[stage]?.push({
        ...row.deal,
        companyName: row.companyName,
        contactName: contact?.fullName ?? null,
        contactEmail: contact?.email ?? null,
        scoreTier: row.scoreTier ?? "cold",
        totalScore: row.totalScore ?? 0,
      });
    }

    return NextResponse.json({ stages });
  } catch (error) {
    console.error("GET /api/pipeline error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pipeline" },
      { status: 500 }
    );
  }
}
