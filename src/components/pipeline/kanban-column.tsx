"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Badge } from "@/components/ui/badge";
import { DealCard, type DealCardData } from "./deal-card";
import type { PipelineStage } from "@/lib/db/schema";

interface KanbanColumnProps {
  stage: PipelineStage;
  label: string;
  deals: DealCardData[];
}

function getColumnAccent(stage: PipelineStage): string {
  switch (stage) {
    case "closed_lost":
      return "border-t-red-500";
    case "negotiating":
      return "border-t-amber-500";
    case "closed_won":
      return "border-t-emerald-500";
    default:
      return "border-t-emerald-500/60";
  }
}

export function KanbanColumn({ stage, label, deals }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  const totalValue = deals.reduce((sum, d) => sum + (d.dealValue ?? 0), 0);
  const formattedTotal = totalValue > 0 ? `$${totalValue.toLocaleString()}` : "$0";

  return (
    <div
      className={`flex flex-col min-w-[280px] max-w-[280px] bg-zinc-900 rounded-lg border border-zinc-800 border-t-2 ${getColumnAccent(stage)} ${
        isOver ? "ring-2 ring-emerald-500/50" : ""
      }`}
    >
      {/* Column header */}
      <div className="p-3 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-zinc-200">{label}</h3>
          <Badge
            variant="secondary"
            className="bg-zinc-800 text-zinc-400 text-[11px] px-1.5 h-5"
          >
            {deals.length}
          </Badge>
        </div>
        <p className="text-xs text-zinc-500">{formattedTotal}</p>
      </div>

      {/* Droppable area with cards */}
      <div
        ref={setNodeRef}
        className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px] max-h-[calc(100vh-220px)]"
      >
        <SortableContext
          items={deals.map((d) => d.id)}
          strategy={verticalListSortingStrategy}
        >
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </SortableContext>

        {deals.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-zinc-600 border border-dashed border-zinc-800 rounded-md">
            No deals
          </div>
        )}
      </div>
    </div>
  );
}
