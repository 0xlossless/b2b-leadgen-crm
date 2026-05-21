import { cn } from "@/lib/utils";
import { STAGE_LABELS, type PipelineStage } from "@/lib/db/schema";

interface StageBadgeProps {
  stage: string | null;
}

export function StageBadge({ stage }: StageBadgeProps) {
  if (!stage) return <span className="text-zinc-500 text-xs">—</span>;

  const label = STAGE_LABELS[stage as PipelineStage] || stage;

  const stageColors: Record<string, string> = {
    new_lead: "border-indigo-500/40 text-indigo-400",
    contacted: "border-violet-500/40 text-violet-400",
    qualified: "border-blue-500/40 text-blue-400",
    demo_scheduled: "border-cyan-500/40 text-cyan-400",
    proposal_sent: "border-emerald-500/40 text-emerald-400",
    negotiating: "border-amber-500/40 text-amber-400",
    closed_won: "border-green-500/40 text-green-400",
    closed_lost: "border-red-500/40 text-red-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        stageColors[stage] || "border-zinc-500/40 text-zinc-400"
      )}
    >
      {label}
    </span>
  );
}
