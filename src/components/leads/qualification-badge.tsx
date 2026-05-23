import { QUALIFICATION_TIERS, type QualificationTier } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

interface QualificationBadgeProps {
  tier?: string | null;
  size?: "sm" | "md";
}

export function QualificationBadge({ tier, size = "sm" }: QualificationBadgeProps) {
  if (!tier || !(tier in QUALIFICATION_TIERS)) {
    return (
      <span className="text-xs text-zinc-600">—</span>
    );
  }

  const qt = tier as QualificationTier;
  const mapping = QUALIFICATION_TIERS[qt];

  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    amber: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    red: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-semibold",
        colorMap[mapping.color] || colorMap.amber,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
    >
      <span>{mapping.emoji}</span>
      <span className="capitalize">{qt}</span>
    </span>
  );
}
