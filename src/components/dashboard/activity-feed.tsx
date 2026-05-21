"use client";

import { formatDistanceToNow } from "date-fns";
import { Mail, Phone, FileText, ArrowRight, Search, Activity } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  leadId: string | null;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  email_sent: Mail,
  call: Phone,
  note: FileText,
  stage_change: ArrowRight,
  scrape: Search,
  score_update: Activity,
};

const TYPE_COLORS: Record<string, string> = {
  email_sent: "text-blue-400 bg-blue-400/10",
  call: "text-green-400 bg-green-400/10",
  note: "text-amber-400 bg-amber-400/10",
  stage_change: "text-purple-400 bg-purple-400/10",
  scrape: "text-cyan-400 bg-cyan-400/10",
  score_update: "text-orange-400 bg-orange-400/10",
};

interface ActivityFeedProps {
  activities: ActivityItem[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <ScrollArea className="h-[380px]">
      <div className="space-y-1 pr-4">
        {activities.map((activity) => {
          const Icon = TYPE_ICONS[activity.type] || Activity;
          const colorClass = TYPE_COLORS[activity.type] || "text-zinc-400 bg-zinc-400/10";

          let relativeTime = "";
          try {
            relativeTime = formatDistanceToNow(new Date(activity.createdAt), {
              addSuffix: true,
            });
          } catch {
            relativeTime = "unknown";
          }

          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-zinc-800/50"
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  colorClass
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-100 truncate">
                  {activity.description}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">{relativeTime}</p>
              </div>
            </div>
          );
        })}
        {activities.length === 0 && (
          <p className="text-sm text-zinc-500 text-center py-8">
            No recent activities
          </p>
        )}
      </div>
    </ScrollArea>
  );
}
