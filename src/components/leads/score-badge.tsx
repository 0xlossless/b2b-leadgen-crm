import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number | null;
  tier?: string | null;
}

export function ScoreBadge({ score, tier }: ScoreBadgeProps) {
  const displayScore = score ?? 0;
  const displayTier = tier || (displayScore >= 80 ? "hot" : displayScore >= 50 ? "warm" : "cold");

  const colorMap: Record<string, string> = {
    hot: "bg-red-500/20 text-red-400",
    warm: "bg-amber-500/20 text-amber-400",
    cold: "bg-sky-500/20 text-sky-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        colorMap[displayTier] || colorMap.cold
      )}
    >
      {displayScore}
    </span>
  );
}
