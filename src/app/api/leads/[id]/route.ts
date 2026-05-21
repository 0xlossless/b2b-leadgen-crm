import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, contacts, leadScores, deals, activities } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

// ─── GET /api/leads/[id] ─────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const leadContacts = await db
      .select()
      .from(contacts)
      .where(eq(contacts.leadId, id));

    const [score] = await db
      .select()
      .from(leadScores)
      .where(eq(leadScores.leadId, id));

    const leadDeals = await db
      .select()
      .from(deals)
      .where(eq(deals.leadId, id));

    const recentActivities = await db
      .select()
      .from(activities)
      .where(eq(activities.leadId, id))
      .orderBy(desc(activities.createdAt))
      .limit(20);

    return NextResponse.json({
      ...lead,
      contacts: leadContacts,
      score: score ?? null,
      deals: leadDeals,
      activities: recentActivities,
    });
  } catch (error) {
    console.error("GET /api/leads/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch lead" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/leads/[id] ───────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // Check lead exists
    const [existing] = await db.select().from(leads).where(eq(leads.id, id));
    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Only update allowed fields
    const allowedFields = [
      "companyName",
      "website",
      "industry",
      "employeeCount",
      "revenueRange",
      "city",
      "state",
      "country",
      "techStack",
      "source",
      "confidenceScore",
    ] as const;

    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    updates.updatedAt = new Date().toISOString();

    await db.update(leads).set(updates).where(eq(leads.id, id));

    const [updated] = await db.select().from(leads).where(eq(leads.id, id));
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/leads/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update lead" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/leads/[id] ──────────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const [existing] = await db.select().from(leads).where(eq(leads.id, id));
    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Cascade deletes are handled by FK constraints, but let's be explicit
    await db.delete(activities).where(eq(activities.leadId, id));
    await db.delete(deals).where(eq(deals.leadId, id));
    await db.delete(leadScores).where(eq(leadScores.leadId, id));
    await db.delete(contacts).where(eq(contacts.leadId, id));
    await db.delete(leads).where(eq(leads.id, id));

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error("DELETE /api/leads/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete lead" },
      { status: 500 }
    );
  }
}
