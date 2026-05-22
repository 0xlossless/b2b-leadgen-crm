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
} from "@/lib/db/schema";
import { Loader2, KanbanSquare } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export default function PipelinePage() {
  const [deals, setDeals] = useState<DealCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDeal, setActiveDeal] = useState<DealCardData | null>(null);

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
      // API returns { stages: { new_lead: [...], contacted: [...], ... } }
      // Flatten into a single array
      const allDeals: DealCardData[] = [];
      if (data.stages) {
        for (const stageDeals of Object.values(data.stages)) {
          allDeals.push(...(stageDeals as DealCardData[]));
        }
      }
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
    </div>
  );
}
