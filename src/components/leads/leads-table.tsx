"use client";

import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, MoreHorizontal, Eye, Pencil, Trash2, CalendarDays } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScoreBadge } from "./score-badge";
import { StageBadge } from "./stage-badge";
import { QualificationBadge } from "./qualification-badge";
import { cn } from "@/lib/utils";

interface Lead {
  id: string;
  companyName: string;
  website: string | null;
  industry: string | null;
  source: string;
  createdAt: string;
  contactName: string | null;
  contactTitle: string | null;
  contactEmail: string | null;
  emailVerified: boolean | null;
  score: number | null;
  scoreTier: string | null;
  dealStage: string | null;
  dealValue: number | null;
  qualificationTier?: string | null;
  lastActivity: {
    type: string;
    description: string;
    createdAt: string;
  } | null;
}

interface LeadsTableProps {
  leads: Lead[];
  sortBy: string;
  sortOrder: string;
  onSort: (column: string) => void;
  onDelete?: (leadId: string, companyName: string) => void;
  onScheduleQuote?: (lead: Lead) => void;
}

export function LeadsTable({ leads, sortBy, sortOrder, onSort, onDelete, onScheduleQuote }: LeadsTableProps) {
  const router = useRouter();

  function SortIndicator({ column }: { column: string }) {
    if (sortBy !== column) return null;
    return (
      <span className="ml-1 text-zinc-500">
        {sortOrder === "asc" ? "↑" : "↓"}
      </span>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-800 hover:bg-transparent">
            <TableHead
              className="text-zinc-400 cursor-pointer select-none"
              onClick={() => onSort("companyName")}
            >
              Company
              <SortIndicator column="companyName" />
            </TableHead>
            <TableHead className="text-zinc-400">Contact</TableHead>
            <TableHead
              className="text-zinc-400 cursor-pointer select-none"
              onClick={() => onSort("score")}
            >
              Score
              <SortIndicator column="score" />
            </TableHead>
            <TableHead className="text-zinc-400">Qualification</TableHead>
            <TableHead className="text-zinc-400">Stage</TableHead>
            <TableHead className="text-zinc-400">Source</TableHead>
            <TableHead
              className="text-zinc-400 cursor-pointer select-none"
              onClick={() => onSort("createdAt")}
            >
              Last Activity
              <SortIndicator column="createdAt" />
            </TableHead>
            <TableHead className="text-zinc-400 w-[50px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => {
            let relativeTime = "";
            try {
              const dateStr = lead.lastActivity?.createdAt || lead.createdAt;
              relativeTime = formatDistanceToNow(new Date(dateStr), {
                addSuffix: true,
              });
            } catch {
              relativeTime = "—";
            }

            return (
              <TableRow
                key={lead.id}
                className="border-zinc-800 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                onClick={() => router.push(`/leads/${lead.id}`)}
              >
                {/* Company */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-100">
                      {lead.companyName}
                    </span>
                    {lead.website && (
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </TableCell>

                {/* Contact */}
                <TableCell>
                  <div>
                    <p className="text-sm text-zinc-100">
                      {lead.contactName || "—"}
                    </p>
                    {lead.contactTitle && (
                      <p className="text-xs text-zinc-500">{lead.contactTitle}</p>
                    )}
                  </div>
                </TableCell>

                {/* Score */}
                <TableCell>
                  <ScoreBadge score={lead.score} tier={lead.scoreTier} />
                </TableCell>

                {/* Qualification */}
                <TableCell>
                  <QualificationBadge tier={lead.qualificationTier} />
                </TableCell>

                {/* Stage */}
                <TableCell>
                  <StageBadge stage={lead.dealStage} />
                </TableCell>

                {/* Source */}
                <TableCell className="text-zinc-400 text-sm">
                  {lead.source
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </TableCell>

                {/* Last Activity */}
                <TableCell className="text-zinc-500 text-sm">
                  {relativeTime}
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-zinc-900 border-zinc-700"
                    >
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/leads/${lead.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/leads/${lead.id}?edit=true`);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onScheduleQuote) {
                            onScheduleQuote(lead);
                          }
                        }}
                      >
                        <CalendarDays className="h-4 w-4 mr-2" />
                        Schedule Quote
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onDelete) {
                            onDelete(lead.id, lead.companyName);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
          {leads.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={8}
                className="text-center py-12 text-zinc-500"
              >
                No leads found. Try adjusting your filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
