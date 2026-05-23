"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DndContext,
  closestCorners,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/pipeline/kanban-column";
import { DealCard, type DealCardData } from "@/components/pipeline/deal-card";
import {
  PIPELINE_STAGES,
  STAGE_LABELS,
  type PipelineStage,
  QUALIFICATION_TIERS,
  type QualificationTier,
} from "@/lib/db/schema";
import { Loader2, KanbanSquare } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function PipelinePage() {
  const [deals, setDeals] = useState<DealCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDeal, setActiveDeal] = useState<DealCardData | null>(null);
  const [qualifyDealId, setQualifyDealId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const fetchDeals = useCallback(async () => {
    try {
      const res = await fetch("/api/pipeline");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      // API returns flat array of deals
      const allDeals: DealCardData[] = (Array.isArray(data) ? data : []).map((d: any) => ({
        id: d.id,
        leadId: d.leadId,
        stage: d.stage,
        dealValue: d.dealValue,
        assignedRep: d.assignedRep,
        companyName: d.companyName ?? "Unknown",
        industry: d.industry,
        contactName: d.contactName,
        contactTitle: null,
        totalScore: d.totalScore ?? 0,
        scoreTier: d.tier ?? "cold",
        qualificationTier: d.qualificationTier ?? null,
        updatedAt: d.updatedAt ?? d.createdAt,
      }));
      setDeals(allDeals);
    } catch (err) {
      console.error("Failed to load deals:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const dealsByStage = (stage: PipelineStage) =>
    deals.filter((d) => d.stage === stage);

  function handleDragStart(event: DragStartEvent) {
    const deal = deals.find((d) => d.id === event.active.id);
    setActiveDeal(deal ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDeal(null);
    const { active, over } = event;
    if (!over) return;

    const dealId = active.id as string;
    const deal = deals.find((d) => d.id === dealId);
    if (!deal) return;

    // Determine the target stage
    let newStage: string;

    // If dropped over a column (stage ID), use that
    if (PIPELINE_STAGES.includes(over.id as PipelineStage)) {
      newStage = over.id as string;
    } else {
      // Dropped over another card — find which stage that card is in
      const overDeal = deals.find((d) => d.id === over.id);
      if (!overDeal) return;
      newStage = overDeal.stage;
    }

    if (deal.stage === newStage) return;

    // Optimistic update
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d))
    );

    try {
      const res = await fetch(`/api/pipeline/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });

      if (!res.ok) {
        // Revert on failure
        setDeals((prev) =>
          prev.map((d) =>
            d.id === dealId ? { ...d, stage: deal.stage } : d
          )
        );
      }
    } catch {
      // Revert on error
      setDeals((prev) =>
        prev.map((d) =>
          d.id === dealId ? { ...d, stage: deal.stage } : d
        )
      );
    }
  }

  async function handleQualify(tier: QualificationTier) {
    if (!qualifyDealId) return;
    const dealId = qualifyDealId;
    const mapping = QUALIFICATION_TIERS[tier];

    // Close dialog immediately
    setQualifyDealId(null);

    // Optimistic update
    setDeals((prev) =>
      prev.map((d) => {
        if (d.id !== dealId) return d;
        const newStage = (d.stage === "new_lead" || d.stage === "contacted") ? "qualified" : d.stage;
        return {
          ...d,
          totalScore: mapping.score,
          scoreTier: mapping.tier,
          qualificationTier: tier,
          stage: newStage,
        };
      })
    );

    try {
      await fetch(`/api/pipeline/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qualificationTier: tier }),
      });
    } catch (err) {
      console.error("Failed to qualify deal:", err);
      // Refresh to get correct state
      fetchDeals();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <KanbanSquare className="h-6 w-6 text-emerald-500" />
          <div>
            <h1 className="text-xl font-bold">Pipeline</h1>
            <p className="text-sm text-zinc-500">
              {deals.length} deals · $
              {deals
                .reduce((s, d) => s + (d.dealValue ?? 0), 0)
                .toLocaleString()}{" "}
              total value
            </p>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <ScrollArea className="w-full">
        <div className="p-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4">
              {PIPELINE_STAGES.map((stage) => (
                <KanbanColumn
                  key={stage}
                  stage={stage}
                  label={STAGE_LABELS[stage]}
                  deals={dealsByStage(stage)}
                  onQualify={setQualifyDealId}
                />
              ))}
            </div>

            <DragOverlay>
              {activeDeal ? (
                <div className="w-[264px]">
                  <DealCard deal={activeDeal} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Qualification Dialog */}
      <Dialog open={qualifyDealId !== null} onOpenChange={(open) => { if (!open) setQualifyDealId(null); }}>
        <DialogContent className="bg-zinc-900 border-zinc-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 text-lg">Qualify Lead</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={() => handleQualify("rich")}
              className="flex items-center gap-4 p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors text-left"
            >
              <span className="text-3xl">💰</span>
              <div>
                <p className="font-bold text-emerald-400 text-lg">RICH</p>
                <p className="text-sm text-zinc-400">High budget, ready to buy</p>
              </div>
            </button>
            <button
              onClick={() => handleQualify("broke")}
              className="flex items-center gap-4 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-colors text-left"
            >
              <span className="text-3xl">😐</span>
              <div>
                <p className="font-bold text-amber-400 text-lg">BROKE</p>
                <p className="text-sm text-zinc-400">Limited budget, might convert</p>
              </div>
            </button>
            <button
              onClick={() => handleQualify("poor")}
              className="flex items-center gap-4 p-4 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition-colors text-left"
            >
              <span className="text-3xl">🚫</span>
              <div>
                <p className="font-bold text-red-400 text-lg">POOR</p>
                <p className="text-sm text-zinc-400">No budget, unlikely to convert</p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
