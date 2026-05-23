"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QUALIFICATION_TIERS, type QualificationTier } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Award, Loader2 } from "lucide-react";

interface QualifyLeadCardProps {
  leadId: string;
  currentTier: string | null;
  currentScore: number | null;
}

export function QualifyLeadCard({ leadId, currentTier, currentScore }: QualifyLeadCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [activeTier, setActiveTier] = useState<string | null>(currentTier);

  async function handleQualify(tier: QualificationTier) {
    setLoading(tier);
    try {
      const res = await fetch(`/api/leads/${leadId}/qualify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qualificationTier: tier }),
      });

      if (res.ok) {
        setActiveTier(tier);
        // Refresh the page to show updated score/tier/activity
        router.refresh();
      } else {
        console.error("Failed to qualify lead");
      }
    } catch (err) {
      console.error("Qualification error:", err);
    } finally {
      setLoading(null);
    }
  }

  const tiers: { key: QualificationTier; emoji: string; label: string; description: string; bgColor: string; borderColor: string; textColor: string; activeRing: string }[] = [
    {
      key: "rich",
      emoji: "💰",
      label: "RICH",
      description: "High budget, ready to buy",
      bgColor: "bg-emerald-500/10 hover:bg-emerald-500/20",
      borderColor: "border-emerald-500/30",
      textColor: "text-emerald-400",
      activeRing: "ring-2 ring-emerald-500 bg-emerald-500/20",
    },
    {
      key: "broke",
      emoji: "😐",
      label: "BROKE",
      description: "Limited budget, might convert",
      bgColor: "bg-amber-500/10 hover:bg-amber-500/20",
      borderColor: "border-amber-500/30",
      textColor: "text-amber-400",
      activeRing: "ring-2 ring-amber-500 bg-amber-500/20",
    },
    {
      key: "poor",
      emoji: "🚫",
      label: "POOR",
      description: "No budget, unlikely to convert",
      bgColor: "bg-red-500/10 hover:bg-red-500/20",
      borderColor: "border-red-500/30",
      textColor: "text-red-400",
      activeRing: "ring-2 ring-red-500 bg-red-500/20",
    },
  ];

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-zinc-100 text-base">
            <Award className="h-5 w-5 text-amber-500" />
            Qualify Lead
          </CardTitle>
          {activeTier && activeTier in QUALIFICATION_TIERS && (
            <Badge
              variant="outline"
              className={cn(
                "text-sm px-2.5",
                activeTier === "rich" && "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
                activeTier === "broke" && "bg-amber-500/20 text-amber-400 border-amber-500/30",
                activeTier === "poor" && "bg-red-500/20 text-red-400 border-red-500/30"
              )}
            >
              {QUALIFICATION_TIERS[activeTier as QualificationTier].emoji}{" "}
              {activeTier.toUpperCase()}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {tiers.map((t) => {
            const isActive = activeTier === t.key;
            const isLoading = loading === t.key;

            return (
              <button
                key={t.key}
                onClick={() => handleQualify(t.key)}
                disabled={loading !== null}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200",
                  "cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
                  isActive
                    ? `${t.activeRing} ${t.borderColor}`
                    : `${t.bgColor} ${t.borderColor}`
                )}
              >
                {isLoading ? (
                  <Loader2 className={cn("h-8 w-8 animate-spin", t.textColor)} />
                ) : (
                  <span className="text-3xl">{t.emoji}</span>
                )}
                <p className={cn("font-bold text-lg", t.textColor)}>{t.label}</p>
                <p className="text-xs text-zinc-500 text-center leading-tight">
                  {t.description}
                </p>
              </button>
            );
          })}
        </div>
        {activeTier && (
          <p className="text-xs text-zinc-500 mt-3 text-center">
            Click a different category to re-qualify this lead
          </p>
        )}
      </CardContent>
    </Card>
  );
}
