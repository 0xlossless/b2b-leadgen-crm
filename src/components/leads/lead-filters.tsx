"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { PIPELINE_STAGES, STAGE_LABELS, type PipelineStage } from "@/lib/db/schema";

interface LeadFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  industry: string;
  onIndustryChange: (value: string) => void;
  tier: string;
  onTierChange: (value: string) => void;
  stage: string;
  onStageChange: (value: string) => void;
  source: string;
  onSourceChange: (value: string) => void;
}

const INDUSTRIES = [
  "SaaS",
  "Technology",
  "E-commerce",
  "FinTech",
  "HealthTech",
  "Construction",
  "EdTech",
  "Logistics",
  "Marketing",
  "Real Estate Tech",
  "Manufacturing",
  "Insurance",
  "Food & Beverage",
  "Retail",
];

const SOURCES = ["google_maps", "apollo", "manual"];

export function LeadFilters({
  search,
  onSearchChange,
  industry,
  onIndustryChange,
  tier,
  onTierChange,
  stage,
  onStageChange,
  source,
  onSourceChange,
}: LeadFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input
          placeholder="Search companies..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
        />
      </div>

      {/* Industry */}
      <Select value={industry} onValueChange={onIndustryChange}>
        <SelectTrigger className="w-[150px] bg-zinc-900 border-zinc-700 text-zinc-100">
          <SelectValue placeholder="Industry" />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-700">
          <SelectItem value="all">All Industries</SelectItem>
          {INDUSTRIES.map((ind) => (
            <SelectItem key={ind} value={ind}>
              {ind}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Score Tier */}
      <Select value={tier} onValueChange={onTierChange}>
        <SelectTrigger className="w-[130px] bg-zinc-900 border-zinc-700 text-zinc-100">
          <SelectValue placeholder="Score Tier" />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-700">
          <SelectItem value="all">All Tiers</SelectItem>
          <SelectItem value="hot">🔥 Hot</SelectItem>
          <SelectItem value="warm">🟡 Warm</SelectItem>
          <SelectItem value="cold">🔵 Cold</SelectItem>
        </SelectContent>
      </Select>

      {/* Stage */}
      <Select value={stage} onValueChange={onStageChange}>
        <SelectTrigger className="w-[160px] bg-zinc-900 border-zinc-700 text-zinc-100">
          <SelectValue placeholder="Stage" />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-700">
          <SelectItem value="all">All Stages</SelectItem>
          {PIPELINE_STAGES.map((s) => (
            <SelectItem key={s} value={s}>
              {STAGE_LABELS[s as PipelineStage]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Source */}
      <Select value={source} onValueChange={onSourceChange}>
        <SelectTrigger className="w-[140px] bg-zinc-900 border-zinc-700 text-zinc-100">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-700">
          <SelectItem value="all">All Sources</SelectItem>
          {SOURCES.map((src) => (
            <SelectItem key={src} value={src}>
              {src.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
