import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deals, activities, PIPELINE_STAGES } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ulid } from "ulid";

// ─── PATCH /api/pipeline/[id] ────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { stage, dealValue } = body;

    if (!stage || !PIPELINE_STAGES.includes(stage)) {
      return NextResponse.json(
        {
          error: "Invalid stage",
          validStages: PIPELINE_STAGES,
        },
        { status: 400 }
      );
    }

    // Find existing deal
    const [existing] = await db.select().from(deals).where(eq(deals.id, id));
    if (!existing) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const nowDate = new Date().toISOString();
    const updates: Record<string, any> = {
      stage,
      updatedAt: nowDate,
    };

    if (dealValue !== undefined) {
      updates.dealValue = String(dealValue);
    }

    // If closing, set closeDate
    if (stage === "closed_won" || stage === "closed_lost") {
      updates.closeDate = nowDate;
    }

    await db.update(deals).set(updates).where(eq(deals.id, id));

    // Log activity for the stage change
    await db.insert(activities).values({
      id: ulid(),
      leadId: existing.leadId,
      dealId: id,
      type: "stage_change",
      description: `Deal moved from "${existing.stage}" to "${stage}"`,
      metadata: JSON.stringify({
        previousStage: existing.stage,
        newStage: stage,
        dealValue: dealValue ?? existing.dealValue,
      }),
      createdAt: nowDate,
    });

    const [updated] = await db.select().from(deals).where(eq(deals.id, id));
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/pipeline/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update deal" },
      { status: 500 }
    );
  }
}
