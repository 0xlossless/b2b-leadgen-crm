import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, contacts, leadScores, activities } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import { scoreLead, type LeadData } from "@/lib/scoring";
import { ulid } from "ulid";

// ─── POST /api/scoring ──────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { leadIds } = body as { leadIds?: string[] };

    // Fetch leads to score
    let leadsToScore;
    if (leadIds && leadIds.length > 0) {
      leadsToScore = await db
        .select()
        .from(leads)
        .where(or(...leadIds.map((id) => eq(leads.id, id))));
    } else {
      leadsToScore = await db.select().from(leads);
    }

    if (leadsToScore.length === 0) {
      return NextResponse.json({ scored: 0, results: [] });
    }

    // Get all contacts for these leads to check for decision makers & verified emails
    const allLeadIds = leadsToScore.map((l) => l.id);
    const allContacts = await db
      .select()
      .from(contacts)
      .where(or(...allLeadIds.map((id) => eq(contacts.leadId, id))));

    const contactsByLead = allContacts.reduce<Record<string, typeof allContacts>>(
      (acc, c) => {
        (acc[c.leadId] ??= []).push(c);
        return acc;
      },
      {}
    );

    const results: any[] = [];
    const nowDate = new Date().toISOString();

    for (const lead of leadsToScore) {
      const leadContacts = contactsByLead[lead.id] ?? [];
      const hasDecisionMaker = leadContacts.some((c) => c.isDecisionMaker);
      const hasVerifiedEmail = leadContacts.some((c) => c.emailVerified);

      const data: LeadData = {
        industry: lead.industry,
        employeeCount: lead.employeeCount,
        techStack: lead.techStack,
        hasDecisionMaker,
        hasVerifiedEmail,
        hasFundingEvent: false,
        monthlyTraffic: 0,
      };

      const scoreResult = scoreLead(data);

      // Upsert lead score
      const [existingScore] = await db
        .select()
        .from(leadScores)
        .where(eq(leadScores.leadId, lead.id));

      if (existingScore) {
        await db
          .update(leadScores)
          .set({
            totalScore: scoreResult.totalScore,
            tier: scoreResult.tier,
            industryMatch: scoreResult.industryMatch,
            employeeFit: scoreResult.employeeFit,
            decisionMaker: scoreResult.decisionMaker,
            techMatch: scoreResult.techMatch,
            fundingEvent: scoreResult.fundingEvent,
            trafficScore: scoreResult.trafficScore,
            emailVerified: scoreResult.emailVerified,
            disqualified: scoreResult.disqualified,
            disqualifyReason: scoreResult.disqualifyReason,
            scoredAt: nowDate,
          })
          .where(eq(leadScores.id, existingScore.id));
      } else {
        await db.insert(leadScores).values({
          id: ulid(),
          leadId: lead.id,
          totalScore: scoreResult.totalScore,
          tier: scoreResult.tier,
          industryMatch: scoreResult.industryMatch,
          employeeFit: scoreResult.employeeFit,
          decisionMaker: scoreResult.decisionMaker,
          techMatch: scoreResult.techMatch,
          fundingEvent: scoreResult.fundingEvent,
          trafficScore: scoreResult.trafficScore,
          emailVerified: scoreResult.emailVerified,
          disqualified: scoreResult.disqualified,
          disqualifyReason: scoreResult.disqualifyReason,
          scoredAt: nowDate,
        });
      }

      // Log score activity
      await db.insert(activities).values({
        id: ulid(),
        leadId: lead.id,
        type: "score_update",
        description: `Score updated: ${scoreResult.totalScore}/100 (${scoreResult.tier})`,
        metadata: JSON.stringify(scoreResult),
        createdAt: nowDate,
      });

      results.push({
        leadId: lead.id,
        companyName: lead.companyName,
        ...scoreResult,
      });
    }

    return NextResponse.json({ scored: results.length, results });
  } catch (error) {
    console.error("POST /api/scoring error:", error);
    return NextResponse.json(
      { error: "Failed to score leads" },
      { status: 500 }
    );
  }
}
