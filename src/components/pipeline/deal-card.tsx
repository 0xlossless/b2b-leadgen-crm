"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Clock, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface DealCardData {
  id: string;
  leadId: string;
  stage: string;
  dealValue: number | null;
  assignedRep: string | null;
  companyName: string;
  industry: string | null;
  contactName: string | null;
  contactTitle: string | null;
  totalScore: number;
  scoreTier: string;
  updatedAt: string;
}

interface DealCardProps {
  deal: DealCardData;
}

function getTierColor(tier: string) {
  switch (tier) {
    case "hot":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "warm":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    default:
      return "bg-sky-500/20 text-sky-400 border-sky-500/30";
  }
}

export function DealCard({ deal }: DealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formattedValue = deal.dealValue
    ? `$${deal.dealValue.toLocaleString()}`
    : "$0";

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(deal.updatedAt), {
        addSuffix: true,
      });
    } catch {
      return "Unknown";
    }
  })();

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing bg-zinc-800 border-zinc-700 p-3 space-y-2 hover:border-zinc-600 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm text-zinc-100 leading-tight">
          {deal.companyName}
        </p>
        <Badge
          variant="outline"
          className={`text-[10px] px-1.5 py-0 shrink-0 ${getTierColor(deal.scoreTier)}`}
        >
          {deal.totalScore}
        </Badge>
      </div>

      {deal.contactName && (
        <p className="text-xs text-zinc-400 truncate">
          {deal.contactName}
          {deal.contactTitle && (
            <span className="text-zinc-500"> · {deal.contactTitle}</span>
          )}
        </p>
      )}

      <div className="flex items-center justify-between pt-1">
        <span className="text-sm font-medium text-emerald-400">
          {formattedValue}
        </span>
      </div>

      <div className="flex items-center justify-between text-[11px] text-zinc-500">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {timeAgo}
        </span>
        {deal.assignedRep && (
          <span className="flex items-center gap-1 truncate max-w-[100px]">
            <User className="h-3 w-3" />
            {deal.assignedRep}
          </span>
        )}
      </div>
    </Card>
  );
}
