"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Clock, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRef } from "react";

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
  qualificationTier: string | null;
  updatedAt: string;
}

interface DealCardProps {
  deal: DealCardData;
  onQualify?: (dealId: string) => void;
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

function getQualificationBadge(tier: string | null) {
  switch (tier) {
    case "rich":
      return { emoji: "💰", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" };
    case "broke":
      return { emoji: "😐", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" };
    case "poor":
      return { emoji: "🚫", className: "bg-red-500/20 text-red-400 border-red-500/30" };
    default:
      return null;
  }
}

export function DealCard({ deal, onQualify }: DealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: deal.id });

  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
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

  const qualBadge = getQualificationBadge(deal.qualificationTier);

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!onQualify) return;
    if (isDragging) return;
    // Check if pointer moved significantly (drag detection)
    if (pointerDownPos.current) {
      const dx = Math.abs(e.clientX - pointerDownPos.current.x);
      const dy = Math.abs(e.clientY - pointerDownPos.current.y);
      if (dx > 5 || dy > 5) return; // Was a drag, not a click
    }
    onQualify(deal.id);
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      className="cursor-grab active:cursor-grabbing bg-zinc-800 border-zinc-700 p-3 space-y-2 hover:border-zinc-600 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm text-zinc-100 leading-tight">
          {deal.companyName}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          {qualBadge && (
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${qualBadge.className}`}
            >
              {qualBadge.emoji}
            </Badge>
          )}
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 ${getTierColor(deal.scoreTier)}`}
          >
            {deal.totalScore}
          </Badge>
        </div>
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
