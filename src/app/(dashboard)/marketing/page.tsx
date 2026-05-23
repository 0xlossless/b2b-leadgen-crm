"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus, Loader2, Copy, Sparkles, ChevronDown, ChevronRight,
  DollarSign, Eye, MousePointer, Target, TrendingUp, Percent,
  Filter, LayoutTemplate, RefreshCw, Link, CheckCircle, Pause, Play,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Legend, ResponsiveContainer, BarChart, Bar,
  Funnel, FunnelChart,
} from "recharts";

// ─── Types ──────────────────────────────────────────────────
type Platform = "google" | "facebook" | "instagram" | "nextdoor" | "yelp";
type CampaignStatus = "draft" | "active" | "paused" | "completed";
type AdPlatform = "google_search" | "facebook_feed" | "instagram_story" | "nextdoor_post";

interface Campaign {
  id: string;
  name: string;
  platform: Platform;
  status: CampaignStatus;
  type: string;
  budget: number;
  budgetType: "daily" | "total";
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  startDate: string;
  endDate: string;
  targetLocations: string[];
  targetKeywords: string[];
  adCopy: string;
  source?: "local" | "google_ads";
  googleAdsId?: string;
}

interface AdVariant {
  id: number;
  headline: string;
  headline2: string;
  headline3: string;
  description: string;
  description2: string;
  cta: string;
  displayUrl: string;
}

// ─── Constants ──────────────────────────────────────────────
const PLATFORM_CONFIG: Record<Platform, { label: string; color: string; bg: string }> = {
  google: { label: "Google", color: "text-red-400", bg: "bg-red-500/20" },
  facebook: { label: "Facebook", color: "text-blue-400", bg: "bg-blue-500/20" },
  instagram: { label: "Instagram", color: "text-purple-400", bg: "bg-purple-500/20" },
  nextdoor: { label: "Nextdoor", color: "text-green-400", bg: "bg-green-500/20" },
  yelp: { label: "Yelp", color: "text-red-400", bg: "bg-red-500/20" },
};

const STATUS_CONFIG: Record<CampaignStatus, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
  active: { label: "Active", cls: "bg-green-500/20 text-green-400 border-green-500/30 animate-pulse" },
  paused: { label: "Paused", cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  completed: { label: "Completed", cls: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

const CITIES = [
  "Rancho Cucamonga", "Upland", "Ontario", "Fontana", "Claremont",
  "La Verne", "San Dimas", "Glendora", "Azusa", "Covina",
  "West Covina", "Pomona", "Diamond Bar", "Chino", "Chino Hills",
];

const CHAR_LIMITS: Record<AdPlatform, { headline: number; description: number; cta: number }> = {
  google_search: { headline: 30, description: 90, cta: 0 },
  facebook_feed: { headline: 40, description: 125, cta: 25 },
  instagram_story: { headline: 40, description: 125, cta: 25 },
  nextdoor_post: { headline: 50, description: 150, cta: 25 },
};

const AD_TEMPLATES: Record<string, Partial<AdVariant>> = {
  "Garage Floor Special": {
    headline: "Transform Your Garage Floor",
    headline2: "Premium Epoxy Coatings",
    headline3: "Free Estimates Available",
    description: "Professional garage floor epoxy coating. Durable, beautiful, and built to last. Serving the Inland Empire.",
    description2: "Lifetime warranty. 1-day install. Custom colors and flake options available.",
    cta: "Get Free Quote",
    displayUrl: "gsepoxy.com/garage-floors",
  },
  "Commercial Floors": {
    headline: "Commercial Epoxy Flooring",
    headline2: "Industrial-Grade Solutions",
    headline3: "Licensed & Insured",
    description: "Heavy-duty commercial epoxy for warehouses, restaurants, and retail. Minimal downtime installation.",
    description2: "Trusted by 500+ businesses. Anti-slip, chemical resistant coatings.",
    cta: "Request a Bid",
    displayUrl: "gsepoxy.com/commercial",
  },
  "Restaurant Remodel": {
    headline: "Restaurant Floor Solutions",
    headline2: "Health Code Compliant",
    headline3: "Weekend Installation",
    description: "Food-safe, slip-resistant epoxy for kitchens and dining areas. Meets all health code requirements.",
    description2: "Installed over the weekend so you don't miss a day of business.",
    cta: "Schedule Consult",
    displayUrl: "gsepoxy.com/restaurants",
  },
  "Free Quote": {
    headline: "Free Epoxy Floor Quote",
    headline2: "No Obligation Estimate",
    headline3: "Same-Day Response",
    description: "Get a free, no-obligation quote for your epoxy flooring project. Residential & commercial.",
    description2: "Serving Rancho Cucamonga, Ontario, Fontana & surrounding areas.",
    cta: "Get Free Quote",
    displayUrl: "gsepoxy.com/free-quote",
  },
};

// ─── Placeholder Data ───────────────────────────────────────
const MOCK_CAMPAIGNS: Campaign[] = [
  { id: "c1", name: "Garage Floor Spring Promo", platform: "google", status: "active", type: "Search", budget: 1500, budgetType: "total", spend: 842.50, impressions: 24300, clicks: 486, conversions: 32, startDate: "2025-04-01", endDate: "2025-05-31", targetLocations: ["Rancho Cucamonga", "Upland", "Ontario"], targetKeywords: ["epoxy garage floor", "garage floor coating"], adCopy: "Transform your garage with premium epoxy coating" },
  { id: "c2", name: "Facebook - Restaurant Floors", platform: "facebook", status: "active", type: "Feed", budget: 800, budgetType: "total", spend: 523.10, impressions: 18200, clicks: 312, conversions: 18, startDate: "2025-04-15", endDate: "2025-06-15", targetLocations: ["Fontana", "Ontario", "Pomona"], targetKeywords: ["restaurant flooring", "commercial epoxy"], adCopy: "Food-safe, slip-resistant epoxy floors" },
  { id: "c3", name: "Instagram - Before/After Showcase", platform: "instagram", status: "paused", type: "Story", budget: 600, budgetType: "total", spend: 290.00, impressions: 31500, clicks: 720, conversions: 8, startDate: "2025-03-01", endDate: "2025-05-01", targetLocations: ["Claremont", "La Verne", "San Dimas"], targetKeywords: ["floor transformation", "epoxy before after"], adCopy: "See the incredible transformation" },
  { id: "c4", name: "Nextdoor - Local Specials", platform: "nextdoor", status: "completed", type: "Post", budget: 300, budgetType: "total", spend: 300.00, impressions: 8900, clicks: 245, conversions: 15, startDate: "2025-02-01", endDate: "2025-03-31", targetLocations: ["Rancho Cucamonga", "Upland"], targetKeywords: ["local epoxy", "floor coating near me"], adCopy: "Your neighbor's floors never looked better" },
  { id: "c5", name: "Yelp Ads - Brand Awareness", platform: "yelp", status: "draft", type: "Sponsored", budget: 500, budgetType: "daily", spend: 0, impressions: 0, clicks: 0, conversions: 0, startDate: "2025-06-01", endDate: "2025-08-31", targetLocations: ["Diamond Bar", "Chino Hills"], targetKeywords: ["yelp epoxy", "floor coating reviews"], adCopy: "5-star rated epoxy flooring company" },
  { id: "c6", name: "Google - Commercial Buildings", platform: "google", status: "active", type: "Search", budget: 2000, budgetType: "total", spend: 1120.30, impressions: 15800, clicks: 380, conversions: 22, startDate: "2025-03-15", endDate: "2025-06-30", targetLocations: ["Ontario", "Fontana", "Pomona", "Chino"], targetKeywords: ["commercial epoxy flooring", "warehouse floor coating"], adCopy: "Industrial-grade epoxy for commercial spaces" },
];

const MOCK_DAILY_DATA = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(); d.setDate(d.getDate() - 29 + i);
  return {
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    impressions: Math.floor(2000 + Math.random() * 3000),
    clicks: Math.floor(40 + Math.random() * 120),
  };
});

const FUNNEL_DATA = [
  { name: "Impressions", value: 98700, fill: "#f59e0b" },
  { name: "Clicks", value: 2143, fill: "#eab308" },
  { name: "Landing Page", value: 1680, fill: "#d97706" },
  { name: "Quote Form", value: 420, fill: "#b45309" },
  { name: "Lead", value: 95, fill: "#92400e" },
];

// ─── Helpers ────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString();
const fmtCurrency = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const ctr = (clicks: number, impressions: number) =>
  impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) + "%" : "0%";

const emptyVariant = (id: number): AdVariant => ({
  id, headline: "", headline2: "", headline3: "", description: "", description2: "",
  cta: "Get Free Quote", displayUrl: "gsepoxy.com",
});

// ─── Google Ads Analytics Types ──────────────────────────────
interface GoogleAdsAnalytics {
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  ctr: number;
  avgCpc: number;
  dateRange: string;
}

// ─── Campaign Tab ───────────────────────────────────────────
function CampaignsTab({ googleAdsConnected, googleCustomerId }: { googleAdsConnected: boolean; googleCustomerId: string }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(MOCK_CAMPAIGNS);
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showNew, setShowNew] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [launchOnGoogleAds, setLaunchOnGoogleAds] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // New campaign form state
  const [form, setForm] = useState({
    name: "", platform: "google" as Platform, type: "Search",
    budget: "", budgetType: "total" as "daily" | "total",
    startDate: "", endDate: "", targetLocations: [] as string[],
    targetKeywords: "", adCopy: "",
  });

  useEffect(() => {
    fetch("/api/marketing/campaigns").then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.campaigns) setCampaigns(data.campaigns); })
      .catch(() => {});
  }, []);

  const filtered = campaigns.filter(c =>
    (filterPlatform === "all" || c.platform === filterPlatform) &&
    (filterStatus === "all" || c.status === filterStatus)
  );

  const syncFromGoogle = async () => {
    if (!googleAdsConnected) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/google-ads/campaigns");
      if (res.ok) {
        const data = await res.json();
        const googleCampaigns: Campaign[] = (data.campaigns || []).map((gc: any) => ({
          id: gc.id || `gads-${Date.now()}-${Math.random()}`,
          name: gc.name,
          platform: "google" as Platform,
          status: (gc.status === "ENABLED" ? "active" : gc.status === "PAUSED" ? "paused" : "draft") as CampaignStatus,
          type: gc.type || "Search",
          budget: gc.budget || 0,
          budgetType: "daily" as const,
          spend: gc.metrics?.cost || 0,
          impressions: gc.metrics?.impressions || 0,
          clicks: gc.metrics?.clicks || 0,
          conversions: gc.metrics?.conversions || 0,
          startDate: gc.startDate || "",
          endDate: gc.endDate || "",
          targetLocations: gc.targetLocations || [],
          targetKeywords: gc.targetKeywords || [],
          adCopy: gc.adCopy || "",
          source: "google_ads" as const,
          googleAdsId: gc.id,
        }));
        setCampaigns(prev => {
          const localCampaigns = prev.filter(c => c.source !== "google_ads");
          const existingGoogleIds = new Set(googleCampaigns.map((gc: Campaign) => gc.googleAdsId));
          return [...localCampaigns, ...googleCampaigns];
        });
      }
    } catch (err) {
      console.error("Failed to sync Google Ads campaigns:", err);
    }
    setSyncing(false);
  };

  const toggleGoogleAdsCampaign = async (campaign: Campaign) => {
    if (!campaign.googleAdsId) return;
    setTogglingId(campaign.googleAdsId);
    try {
      const newStatus = campaign.status === "active" ? "PAUSED" : "ENABLED";
      const res = await fetch(`/api/google-ads/campaigns/${campaign.googleAdsId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setCampaigns(prev => prev.map(c =>
          c.googleAdsId === campaign.googleAdsId
            ? { ...c, status: newStatus === "ENABLED" ? "active" : "paused" }
            : c
        ));
      }
    } catch (err) {
      console.error("Failed to toggle campaign:", err);
    }
    setTogglingId(null);
  };

  const handleCreate = () => {
    const newCampaign: Campaign = {
      id: `c${Date.now()}`, name: form.name, platform: form.platform,
      status: "draft", type: form.type, budget: parseFloat(form.budget) || 0,
      budgetType: form.budgetType, spend: 0, impressions: 0, clicks: 0,
      conversions: 0, startDate: form.startDate, endDate: form.endDate,
      targetLocations: form.targetLocations,
      targetKeywords: form.targetKeywords.split(",").map(k => k.trim()).filter(Boolean),
      adCopy: form.adCopy,
    };
    setCampaigns(prev => [newCampaign, ...prev]);

    // Also create on Google Ads if checkbox is checked
    if (launchOnGoogleAds && googleAdsConnected) {
      fetch("/api/google-ads/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          budget: parseFloat(form.budget) || 0,
          budgetType: form.budgetType,
          targetKeywords: form.targetKeywords.split(",").map(k => k.trim()).filter(Boolean),
          targetLocations: form.targetLocations,
          adCopy: form.adCopy,
        }),
      }).catch(err => console.error("Failed to create Google Ads campaign:", err));
    }

    setShowNew(false);
    setLaunchOnGoogleAds(false);
    setForm({ name: "", platform: "google", type: "Search", budget: "", budgetType: "total", startDate: "", endDate: "", targetLocations: [], targetKeywords: "", adCopy: "" });
  };

  const toggleLocation = (city: string) => {
    setForm(prev => ({
      ...prev,
      targetLocations: prev.targetLocations.includes(city)
        ? prev.targetLocations.filter(c => c !== city)
        : [...prev.targetLocations, city],
    }));
  };

  return (
    <div className="space-y-4">
      {/* Filters & Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterPlatform} onValueChange={setFilterPlatform}>
            <SelectTrigger className="w-[150px] bg-zinc-900 border-zinc-700">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {Object.entries(PLATFORM_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] bg-zinc-900 border-zinc-700">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex gap-2">
          {googleAdsConnected && (
            <Button onClick={syncFromGoogle} disabled={syncing} variant="ghost"
              className="border border-green-500/30 text-green-400 hover:bg-green-500/10">
              {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Sync from Google
            </Button>
          )}
          <Button onClick={() => setShowNew(true)} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
            <Plus className="h-4 w-4 mr-2" /> New Campaign
          </Button>
        </div>
      </div>

      {/* Campaign Table */}
      <Card className="border-zinc-800 bg-zinc-950">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400 w-8"></TableHead>
                <TableHead className="text-zinc-400">Campaign</TableHead>
                <TableHead className="text-zinc-400">Source</TableHead>
                <TableHead className="text-zinc-400">Platform</TableHead>
                <TableHead className="text-zinc-400">Status</TableHead>
                <TableHead className="text-zinc-400 text-right">Budget</TableHead>
                <TableHead className="text-zinc-400 text-right">Spend</TableHead>
                <TableHead className="text-zinc-400 text-right">Impressions</TableHead>
                <TableHead className="text-zinc-400 text-right">Clicks</TableHead>
                <TableHead className="text-zinc-400 text-right">CTR</TableHead>
                <TableHead className="text-zinc-400 text-right">Conversions</TableHead>
                {googleAdsConnected && <TableHead className="text-zinc-400 text-center">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <>
                  <TableRow
                    key={c.id}
                    className="border-zinc-800 cursor-pointer hover:bg-zinc-900/50 transition-colors"
                    onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                  >
                    <TableCell>
                      {expanded === c.id ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{c.name}</TableCell>
                    <TableCell>
                      <Badge className={c.source === "google_ads"
                        ? "bg-blue-500/20 text-blue-400 border-0 text-[10px]"
                        : "bg-zinc-500/20 text-zinc-400 border-0 text-[10px]"}>
                        {c.source === "google_ads" ? "Google Ads" : "Local"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${PLATFORM_CONFIG[c.platform].bg} ${PLATFORM_CONFIG[c.platform].color} border-0`}>
                        {PLATFORM_CONFIG[c.platform].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_CONFIG[c.status].cls}>{STATUS_CONFIG[c.status].label}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-zinc-300">{fmtCurrency(c.budget)}</TableCell>
                    <TableCell className="text-right text-zinc-300">{fmtCurrency(c.spend)}</TableCell>
                    <TableCell className="text-right text-zinc-300">{fmt(c.impressions)}</TableCell>
                    <TableCell className="text-right text-zinc-300">{fmt(c.clicks)}</TableCell>
                    <TableCell className="text-right text-amber-400">{ctr(c.clicks, c.impressions)}</TableCell>
                    <TableCell className="text-right text-green-400">{c.conversions}</TableCell>
                    {googleAdsConnected && (
                      <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                        {c.source === "google_ads" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={togglingId === c.googleAdsId}
                            onClick={() => toggleGoogleAdsCampaign(c)}
                            className={c.status === "active"
                              ? "text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 h-7 px-2"
                              : "text-green-400 hover:text-green-300 hover:bg-green-500/10 h-7 px-2"}>
                            {togglingId === c.googleAdsId
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : c.status === "active"
                                ? <><Pause className="h-3 w-3 mr-1" /> Pause</>
                                : <><Play className="h-3 w-3 mr-1" /> Resume</>}
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                  {expanded === c.id && (
                    <TableRow key={`${c.id}-detail`} className="border-zinc-800 bg-zinc-900/30">
                      <TableCell colSpan={12}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3">
                          <div>
                            <p className="text-xs text-zinc-500 mb-1">Campaign Type</p>
                            <p className="text-sm text-zinc-300">{c.type}</p>
                            <p className="text-xs text-zinc-500 mt-2 mb-1">Budget Type</p>
                            <p className="text-sm text-zinc-300 capitalize">{c.budgetType}</p>
                            <p className="text-xs text-zinc-500 mt-2 mb-1">Dates</p>
                            <p className="text-sm text-zinc-300">{c.startDate} → {c.endDate}</p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500 mb-1">Target Locations</p>
                            <div className="flex flex-wrap gap-1">
                              {c.targetLocations.map(l => (
                                <Badge key={l} variant="outline" className="text-xs border-zinc-700 text-zinc-400">{l}</Badge>
                              ))}
                            </div>
                            <p className="text-xs text-zinc-500 mt-2 mb-1">Keywords</p>
                            <div className="flex flex-wrap gap-1">
                              {c.targetKeywords.map(k => (
                                <Badge key={k} variant="outline" className="text-xs border-amber-500/30 text-amber-400">{k}</Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500 mb-1">Ad Copy</p>
                            <p className="text-sm text-zinc-300">{c.adCopy}</p>
                            <p className="text-xs text-zinc-500 mt-2 mb-1">Cost Per Conversion</p>
                            <p className="text-sm font-semibold text-amber-400">
                              {c.conversions > 0 ? fmtCurrency(c.spend / c.conversions) : "N/A"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
              {filtered.length === 0 && (
                <TableRow className="border-zinc-800">
                  <TableCell colSpan={12} className="text-center py-8 text-zinc-500">No campaigns match your filters</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* New Campaign Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="bg-zinc-950 border-zinc-800 max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Create New Campaign</DialogTitle>
            <DialogDescription>Set up a new marketing campaign across any platform.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Google Ads Launch Option */}
            {googleAdsConnected && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={launchOnGoogleAds}
                    onChange={e => setLaunchOnGoogleAds(e.target.checked)}
                    className="h-4 w-4 rounded border-amber-500 text-amber-500 focus:ring-amber-500 accent-amber-500"
                  />
                  <span className="text-sm font-medium text-amber-400">Launch on Google Ads</span>
                </label>
                {launchOnGoogleAds && (
                  <p className="text-xs text-zinc-500 mt-2 ml-7">
                    ⚡ Campaign will be created as <span className="text-yellow-400 font-medium">PAUSED</span>. Enable it when ready.
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs text-zinc-400 mb-1 block">Campaign Name</label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Summer Garage Floor Promo" className="bg-zinc-900 border-zinc-700" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Platform</label>
                <Select value={form.platform} onValueChange={(v: Platform) => setForm(p => ({ ...p, platform: v }))}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLATFORM_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Campaign Type</label>
                <Input value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                  placeholder="Search, Feed, Story..." className="bg-zinc-900 border-zinc-700" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Budget ($)</label>
                <Input type="number" value={form.budget} onChange={e => setForm(p => ({ ...p, budget: e.target.value }))}
                  placeholder="1500" className="bg-zinc-900 border-zinc-700" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Budget Type</label>
                <Select value={form.budgetType} onValueChange={(v: "daily" | "total") => setForm(p => ({ ...p, budgetType: v }))}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="total">Total</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Start Date</label>
                <Input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                  className="bg-zinc-900 border-zinc-700" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">End Date</label>
                <Input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                  className="bg-zinc-900 border-zinc-700" />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-2 block">Target Locations</label>
              <div className="flex flex-wrap gap-1.5">
                {CITIES.map(city => (
                  <Badge key={city} variant="outline"
                    className={`cursor-pointer transition-colors text-xs ${form.targetLocations.includes(city) ? "bg-amber-500/20 text-amber-400 border-amber-500/50" : "border-zinc-700 text-zinc-500 hover:border-zinc-500"}`}
                    onClick={() => toggleLocation(city)}>
                    {city}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Target Keywords (comma-separated)</label>
              <Input value={form.targetKeywords} onChange={e => setForm(p => ({ ...p, targetKeywords: e.target.value }))}
                placeholder="epoxy flooring, garage floor coating" className="bg-zinc-900 border-zinc-700" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Ad Copy</label>
              <textarea value={form.adCopy} onChange={e => setForm(p => ({ ...p, adCopy: e.target.value }))}
                placeholder="Write your ad copy..."
                className="w-full h-20 rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.name} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
              Create Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Ad Creator Tab ─────────────────────────────────────────
function AdCreatorTab() {
  const [platform, setPlatform] = useState<AdPlatform>("google_search");
  const [variants, setVariants] = useState<AdVariant[]>([emptyVariant(1)]);
  const [generating, setGenerating] = useState(false);
  const [activeVariant, setActiveVariant] = useState(0);

  const limits = CHAR_LIMITS[platform];
  const v = variants[activeVariant] || emptyVariant(1);

  const updateVariant = (field: keyof AdVariant, value: string) => {
    setVariants(prev => prev.map((vr, i) => i === activeVariant ? { ...vr, [field]: value } : vr));
  };

  const addVariant = () => {
    if (variants.length < 3) {
      setVariants(prev => [...prev, emptyVariant(prev.length + 1)]);
      setActiveVariant(variants.length);
    }
  };

  const applyTemplate = (name: string) => {
    const t = AD_TEMPLATES[name];
    if (t) {
      setVariants(prev => prev.map((vr, i) => i === activeVariant ? { ...vr, ...t } : vr));
    }
  };

  const generateAI = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/marketing/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, variant: v }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.variant) {
          setVariants(prev => prev.map((vr, i) => i === activeVariant ? { ...vr, ...data.variant } : vr));
        }
      }
    } catch {}
    setGenerating(false);
  };

  const copyToClipboard = () => {
    const text = `Headline: ${v.headline}\nHeadline 2: ${v.headline2}\nHeadline 3: ${v.headline3}\nDescription: ${v.description}\nDescription 2: ${v.description2}\nCTA: ${v.cta}\nURL: ${v.displayUrl}`;
    navigator.clipboard.writeText(text);
  };

  const CharCount = ({ value, max }: { value: string; max: number }) => (
    <span className={`text-xs ${value.length > max ? "text-red-400" : value.length > max * 0.8 ? "text-yellow-400" : "text-zinc-500"}`}>
      {value.length}/{max}
    </span>
  );

  const platformLabel: Record<AdPlatform, string> = {
    google_search: "Google Search",
    facebook_feed: "Facebook Feed",
    instagram_story: "Instagram Story",
    nextdoor_post: "Nextdoor Post",
  };

  return (
    <div className="space-y-4">
      {/* Controls Row */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={platform} onValueChange={(v: AdPlatform) => setPlatform(v)}>
          <SelectTrigger className="w-[180px] bg-zinc-900 border-zinc-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(platformLabel).map(([k, label]) => (
              <SelectItem key={k} value={k}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Templates */}
        <div className="flex items-center gap-2">
          <LayoutTemplate className="h-4 w-4 text-zinc-500" />
          {Object.keys(AD_TEMPLATES).map(name => (
            <Button key={name} variant="ghost" size="sm"
              className="text-xs text-zinc-400 hover:text-amber-400 border border-zinc-800 hover:border-amber-500/30"
              onClick={() => applyTemplate(name)}>
              {name}
            </Button>
          ))}
        </div>

        <div className="ml-auto flex gap-2">
          <Button onClick={generateAI} disabled={generating} variant="ghost"
            className="border border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generate with AI
          </Button>
        </div>
      </div>

      {/* Variant tabs */}
      <div className="flex items-center gap-2">
        {variants.map((vr, i) => (
          <Button key={i} size="sm" variant={i === activeVariant ? "default" : "ghost"}
            className={i === activeVariant ? "bg-amber-500 text-black" : "text-zinc-400"}
            onClick={() => setActiveVariant(i)}>
            Variant {String.fromCharCode(65 + i)}
          </Button>
        ))}
        {variants.length < 3 && (
          <Button size="sm" variant="ghost" className="text-zinc-500 border border-dashed border-zinc-700" onClick={addVariant}>
            <Plus className="h-3 w-3 mr-1" /> Add Variant
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <Card className="border-zinc-800 bg-zinc-950">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-zinc-400">Ad Copy Editor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-xs text-zinc-400">Headline 1</label>
                <CharCount value={v.headline} max={limits.headline} />
              </div>
              <Input value={v.headline} onChange={e => updateVariant("headline", e.target.value)}
                maxLength={limits.headline + 10} placeholder="Primary headline" className="bg-zinc-900 border-zinc-700" />
            </div>
            {platform === "google_search" && (
              <>
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs text-zinc-400">Headline 2</label>
                    <CharCount value={v.headline2} max={limits.headline} />
                  </div>
                  <Input value={v.headline2} onChange={e => updateVariant("headline2", e.target.value)}
                    maxLength={limits.headline + 10} placeholder="Second headline" className="bg-zinc-900 border-zinc-700" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs text-zinc-400">Headline 3</label>
                    <CharCount value={v.headline3} max={limits.headline} />
                  </div>
                  <Input value={v.headline3} onChange={e => updateVariant("headline3", e.target.value)}
                    maxLength={limits.headline + 10} placeholder="Third headline" className="bg-zinc-900 border-zinc-700" />
                </div>
              </>
            )}
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-xs text-zinc-400">Description</label>
                <CharCount value={v.description} max={limits.description} />
              </div>
              <textarea value={v.description} onChange={e => updateVariant("description", e.target.value)}
                placeholder="Main description"
                className="w-full h-16 rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            {platform === "google_search" && (
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-zinc-400">Description 2</label>
                  <CharCount value={v.description2} max={limits.description} />
                </div>
                <textarea value={v.description2} onChange={e => updateVariant("description2", e.target.value)}
                  placeholder="Second description"
                  className="w-full h-16 rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
            )}
            {limits.cta > 0 && (
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-zinc-400">Call to Action</label>
                  <CharCount value={v.cta} max={limits.cta} />
                </div>
                <Input value={v.cta} onChange={e => updateVariant("cta", e.target.value)}
                  maxLength={limits.cta + 5} placeholder="Get Free Quote" className="bg-zinc-900 border-zinc-700" />
              </div>
            )}
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Display URL</label>
              <Input value={v.displayUrl} onChange={e => updateVariant("displayUrl", e.target.value)}
                placeholder="gsepoxy.com/page" className="bg-zinc-900 border-zinc-700" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold flex-1">
                Save to Campaign
              </Button>
              <Button variant="ghost" className="border border-zinc-700" onClick={copyToClipboard}>
                <Copy className="h-4 w-4 mr-2" /> Copy
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="border-zinc-800 bg-zinc-950">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-zinc-400">Live Preview — {platformLabel[platform]}</CardTitle>
          </CardHeader>
          <CardContent>
            {platform === "google_search" ? (
              /* Google Search Ad Preview */
              <div className="bg-white rounded-lg p-4 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center text-[10px] font-bold text-zinc-600">GS</div>
                  <div>
                    <p className="text-xs text-zinc-800 font-medium">GS Epoxy Flooring</p>
                    <p className="text-xs text-green-700">{v.displayUrl || "gsepoxy.com"}</p>
                  </div>
                </div>
                <div className="mb-1">
                  <span className="text-xs bg-zinc-800 text-white px-1 rounded mr-1 font-medium">Sponsored</span>
                </div>
                <h3 className="text-lg text-blue-800 hover:underline cursor-pointer leading-tight">
                  {[v.headline, v.headline2, v.headline3].filter(Boolean).join(" | ") || "Your Headline Here"}
                </h3>
                <p className="text-sm text-zinc-600 mt-1 leading-snug">
                  {v.description || "Your ad description will appear here. Write compelling copy to attract customers."}
                  {v.description2 ? ` ${v.description2}` : ""}
                </p>
                <div className="flex gap-4 mt-2 text-xs text-blue-700">
                  <span className="hover:underline cursor-pointer">Free Estimates</span>
                  <span className="hover:underline cursor-pointer">View Gallery</span>
                  <span className="hover:underline cursor-pointer">Call Now</span>
                </div>
              </div>
            ) : platform === "facebook_feed" ? (
              /* Facebook Feed Ad Preview */
              <div className="bg-white rounded-lg overflow-hidden">
                <div className="p-3 flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-sm font-bold text-white">GS</div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">GS Epoxy Flooring</p>
                    <p className="text-xs text-zinc-500">Sponsored · <span className="text-zinc-400">🌐</span></p>
                  </div>
                </div>
                <p className="px-3 pb-2 text-sm text-zinc-700">{v.description || "Your ad description here..."}</p>
                <div className="bg-zinc-200 h-52 flex items-center justify-center">
                  <div className="text-center text-zinc-400">
                    <Eye className="h-8 w-8 mx-auto mb-1" />
                    <p className="text-xs">Ad Image Preview</p>
                  </div>
                </div>
                <div className="p-3 border-t border-zinc-200">
                  <p className="text-xs text-zinc-500 uppercase">{v.displayUrl || "gsepoxy.com"}</p>
                  <p className="text-base font-semibold text-zinc-900 leading-tight">{v.headline || "Your Headline"}</p>
                  <p className="text-sm text-zinc-500">{v.description?.substring(0, 80) || "Short description"}</p>
                </div>
                <div className="px-3 pb-3">
                  <button className="w-full bg-blue-600 text-white text-sm font-semibold py-2 rounded-md">{v.cta || "Learn More"}</button>
                </div>
              </div>
            ) : platform === "instagram_story" ? (
              /* Instagram Story Ad Preview */
              <div className="bg-zinc-900 rounded-2xl overflow-hidden max-w-[280px] mx-auto">
                <div className="p-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-500 p-0.5">
                    <div className="w-full h-full rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-white">GS</div>
                  </div>
                  <span className="text-xs font-semibold text-white">gs_epoxy</span>
                  <span className="text-xs text-zinc-400">Sponsored</span>
                </div>
                <div className="bg-zinc-800 h-80 flex items-center justify-center relative">
                  <div className="text-center text-zinc-500">
                    <Eye className="h-10 w-10 mx-auto mb-2" />
                    <p className="text-xs">Story Image / Video</p>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-white text-sm font-semibold drop-shadow-lg">{v.headline || "Headline"}</p>
                    <p className="text-zinc-300 text-xs mt-1 drop-shadow">{v.description?.substring(0, 80) || "Description"}</p>
                  </div>
                </div>
                <div className="p-3">
                  <button className="w-full bg-white text-zinc-900 text-sm font-semibold py-2 rounded-full">{v.cta || "Learn More"}</button>
                </div>
              </div>
            ) : (
              /* Nextdoor Post Preview */
              <div className="bg-white rounded-lg overflow-hidden">
                <div className="p-3 flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center text-sm font-bold text-white">GS</div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">GS Epoxy Flooring</p>
                    <p className="text-xs text-zinc-500">Sponsored · Your Neighborhood</p>
                  </div>
                </div>
                <p className="px-3 pb-2 text-sm text-zinc-800">{v.headline || "Headline"}</p>
                <p className="px-3 pb-2 text-sm text-zinc-600">{v.description || "Description"}</p>
                <div className="bg-zinc-200 h-44 flex items-center justify-center">
                  <div className="text-center text-zinc-400">
                    <Eye className="h-8 w-8 mx-auto mb-1" />
                    <p className="text-xs">Ad Image</p>
                  </div>
                </div>
                <div className="p-3 flex gap-4 border-t border-zinc-200">
                  <button className="text-sm font-semibold text-green-700">{v.cta || "Learn More"}</button>
                  <span className="text-xs text-zinc-400 flex items-center">{v.displayUrl || "gsepoxy.com"}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Analytics Tab ──────────────────────────────────────────
function AnalyticsTab({ googleAdsConnected }: { googleAdsConnected: boolean }) {
  const [googleAnalytics, setGoogleAnalytics] = useState<GoogleAdsAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    if (googleAdsConnected) {
      setLoadingAnalytics(true);
      fetch("/api/google-ads/analytics")
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setGoogleAnalytics(data); })
        .catch(() => {})
        .finally(() => setLoadingAnalytics(false));
    }
  }, [googleAdsConnected]);

  const campaigns = MOCK_CAMPAIGNS;
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);
  const overallCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0";
  const costPerLead = totalConversions > 0 ? totalSpend / totalConversions : 0;

  const PIE_COLORS = ["#ef4444", "#3b82f6", "#a855f7", "#22c55e", "#ef4444"];
  const platformSpend = Object.entries(PLATFORM_CONFIG).map(([key, cfg], i) => {
    const spend = campaigns.filter(c => c.platform === key).reduce((s, c) => s + c.spend, 0);
    return { name: cfg.label, value: Math.round(spend * 100) / 100, fill: PIE_COLORS[i] };
  }).filter(p => p.value > 0);

  // Campaign ROI table
  const campaignROI = campaigns
    .filter(c => c.spend > 0)
    .map(c => ({
      ...c,
      ctr: c.impressions > 0 ? ((c.clicks / c.impressions) * 100) : 0,
      cpc: c.clicks > 0 ? c.spend / c.clicks : 0,
      cpa: c.conversions > 0 ? c.spend / c.conversions : Infinity,
    }))
    .sort((a, b) => a.cpa - b.cpa);

  // Budget utilization
  const budgetUtil = campaigns.filter(c => c.budget > 0).map(c => ({
    name: c.name.length > 25 ? c.name.substring(0, 25) + "..." : c.name,
    utilization: Math.round((c.spend / c.budget) * 100),
    spend: c.spend,
    budget: c.budget,
  }));

  const kpis = [
    { label: "Total Spend", value: fmtCurrency(totalSpend), icon: DollarSign, color: "text-red-400" },
    { label: "Impressions", value: fmt(totalImpressions), icon: Eye, color: "text-blue-400" },
    { label: "Clicks", value: fmt(totalClicks), icon: MousePointer, color: "text-purple-400" },
    { label: "Conversions", value: fmt(totalConversions), icon: Target, color: "text-green-400" },
    { label: "Overall CTR", value: overallCtr + "%", icon: Percent, color: "text-amber-400" },
    { label: "Cost / Lead", value: fmtCurrency(costPerLead), icon: TrendingUp, color: "text-cyan-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Google Ads Live Data Section */}
      <div className="flex items-center gap-2 mb-2">
        <Badge className={googleAdsConnected && googleAnalytics
          ? "bg-green-500/20 text-green-400 border-green-500/30 animate-pulse"
          : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"}>
          {googleAdsConnected && googleAnalytics ? "● Live Data" : "Demo Data"}
        </Badge>
        {googleAdsConnected && !googleAnalytics && loadingAnalytics && (
          <span className="text-xs text-zinc-500 flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading Google Ads data...
          </span>
        )}
      </div>

      {googleAdsConnected && googleAnalytics && (
        <Card className="border-green-500/20 bg-zinc-950">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm text-green-400">Google Ads — Live Performance</CardTitle>
              <Badge className="bg-green-500/20 text-green-400 border-0 text-[10px]">LIVE</Badge>
              {googleAnalytics.dateRange && (
                <span className="text-xs text-zinc-500 ml-auto">{googleAnalytics.dateRange}</span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="text-center p-3 rounded-lg bg-zinc-900/50">
                <p className="text-lg font-bold text-foreground">{fmt(googleAnalytics.impressions)}</p>
                <p className="text-xs text-zinc-500">Impressions</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-zinc-900/50">
                <p className="text-lg font-bold text-foreground">{fmt(googleAnalytics.clicks)}</p>
                <p className="text-xs text-zinc-500">Clicks</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-zinc-900/50">
                <p className="text-lg font-bold text-amber-400">{googleAnalytics.ctr.toFixed(2)}%</p>
                <p className="text-xs text-zinc-500">CTR</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-zinc-900/50">
                <p className="text-lg font-bold text-foreground">{fmtCurrency(googleAnalytics.avgCpc)}</p>
                <p className="text-xs text-zinc-500">Avg CPC</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-zinc-900/50">
                <p className="text-lg font-bold text-green-400">{fmt(googleAnalytics.conversions)}</p>
                <p className="text-xs text-zinc-500">Conversions</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-zinc-900/50">
                <p className="text-lg font-bold text-red-400">{fmtCurrency(googleAnalytics.cost)}</p>
                <p className="text-xs text-zinc-500">Total Cost</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(k => (
          <Card key={k.label} className="border-zinc-800 bg-zinc-950">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <k.icon className={`h-4 w-4 ${k.color}`} />
              </div>
              <p className="text-xl font-bold text-foreground">{k.value}</p>
              <p className="text-xs text-zinc-500">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Spend by Platform Pie */}
        <Card className="border-zinc-800 bg-zinc-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400">Spend by Platform</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={platformSpend} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  dataKey="value" paddingAngle={3} stroke="none">
                  {platformSpend.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <RTooltip
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px", fontSize: 12 }}
                  formatter={(value) => fmtCurrency(Number(value))}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance Over Time */}
        <Card className="border-zinc-800 bg-zinc-950 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400">Performance — Last 30 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={MOCK_DAILY_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#71717a" }} interval={4} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#71717a" }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#71717a" }} />
                <RTooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="left" type="monotone" dataKey="impressions" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="clicks" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Campaign ROI Table */}
      <Card className="border-zinc-800 bg-zinc-950">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-400">Campaign Performance (Ranked by Cost Per Conversion)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400">Campaign</TableHead>
                <TableHead className="text-zinc-400">Platform</TableHead>
                <TableHead className="text-zinc-400 text-right">Spend</TableHead>
                <TableHead className="text-zinc-400 text-right">Clicks</TableHead>
                <TableHead className="text-zinc-400 text-right">CTR</TableHead>
                <TableHead className="text-zinc-400 text-right">CPC</TableHead>
                <TableHead className="text-zinc-400 text-right">Conversions</TableHead>
                <TableHead className="text-zinc-400 text-right">Cost/Conv.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaignROI.map(c => (
                <TableRow key={c.id} className="border-zinc-800">
                  <TableCell className="font-medium text-foreground">{c.name}</TableCell>
                  <TableCell>
                    <Badge className={`${PLATFORM_CONFIG[c.platform].bg} ${PLATFORM_CONFIG[c.platform].color} border-0`}>
                      {PLATFORM_CONFIG[c.platform].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-zinc-300">{fmtCurrency(c.spend)}</TableCell>
                  <TableCell className="text-right text-zinc-300">{fmt(c.clicks)}</TableCell>
                  <TableCell className="text-right text-amber-400">{c.ctr.toFixed(2)}%</TableCell>
                  <TableCell className="text-right text-zinc-300">{fmtCurrency(c.cpc)}</TableCell>
                  <TableCell className="text-right text-green-400">{c.conversions}</TableCell>
                  <TableCell className="text-right font-semibold text-amber-400">
                    {c.cpa === Infinity ? "—" : fmtCurrency(c.cpa)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Bottom Row: Funnel + Budget Util */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Conversion Funnel */}
        <Card className="border-zinc-800 bg-zinc-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400">Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {FUNNEL_DATA.map((step, i) => {
                const maxVal = FUNNEL_DATA[0].value;
                const pct = (step.value / maxVal) * 100;
                const convRate = i > 0 ? ((step.value / FUNNEL_DATA[i - 1].value) * 100).toFixed(1) : "100";
                return (
                  <div key={step.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-zinc-400">{step.name}</span>
                      <span className="text-xs text-zinc-500">{fmt(step.value)} {i > 0 && <span className="text-amber-400">({convRate}%)</span>}</span>
                    </div>
                    <div className="h-7 bg-zinc-800 rounded-md overflow-hidden">
                      <div className="h-full rounded-md flex items-center justify-center transition-all"
                        style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: step.fill }}>
                        {pct > 15 && <span className="text-xs font-semibold text-white">{fmt(step.value)}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Budget Utilization */}
        <Card className="border-zinc-800 bg-zinc-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400">Budget Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {budgetUtil.map(b => (
                <div key={b.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-400 truncate max-w-[200px]">{b.name}</span>
                    <span className="text-xs text-zinc-500">
                      {fmtCurrency(b.spend)} / {fmtCurrency(b.budget)} <span className={`font-semibold ${b.utilization > 90 ? "text-red-400" : b.utilization > 70 ? "text-yellow-400" : "text-green-400"}`}>({b.utilization}%)</span>
                    </span>
                  </div>
                  <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${b.utilization > 90 ? "bg-red-500" : b.utilization > 70 ? "bg-yellow-500" : "bg-amber-500"}`}
                      style={{ width: `${Math.min(b.utilization, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Main Page Inner (with search params) ────────────────────
function MarketingPageInner() {
  const searchParams = useSearchParams();
  const [googleAdsConnected, setGoogleAdsConnected] = useState(false);
  const [googleCustomerId, setGoogleCustomerId] = useState("");
  const [showConnectedToast, setShowConnectedToast] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);

  // Check Google Ads connection status on mount
  useEffect(() => {
    fetch("/api/google-ads/token")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.connected) {
          setGoogleAdsConnected(true);
          setGoogleCustomerId(data.customerId || "");
        }
      })
      .catch(() => {})
      .finally(() => setCheckingConnection(false));
  }, []);

  // Show success toast when redirected from OAuth
  useEffect(() => {
    if (searchParams.get("connected") === "true") {
      setShowConnectedToast(true);
      setGoogleAdsConnected(true);
      const timer = setTimeout(() => setShowConnectedToast(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Success Toast */}
      {showConnectedToast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="bg-green-500/20 border border-green-500/30 rounded-lg px-4 py-3 flex items-center gap-2 shadow-lg backdrop-blur-sm">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <span className="text-sm text-green-400 font-medium">Google Ads connected successfully!</span>
            <button onClick={() => setShowConnectedToast(false)} className="text-green-400/60 hover:text-green-400 ml-2">✕</button>
          </div>
        </div>
      )}

      {/* Google Ads Connection Banner */}
      {!checkingConnection && (
        googleAdsConnected ? (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-green-500/10 border border-green-500/20">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-sm text-green-400 font-medium">Google Ads Connected ✓</span>
            {googleCustomerId && (
              <Badge className="bg-green-500/20 text-green-400 border-0 text-[10px]">
                ID: {googleCustomerId}
              </Badge>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-3">
              <Link className="h-5 w-5 text-amber-400" />
              <div>
                <p className="text-sm font-medium text-amber-400">Connect your Google Ads account</p>
                <p className="text-xs text-zinc-500">Sync campaigns, view real analytics, and manage ads directly from your CRM.</p>
              </div>
            </div>
            <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold" onClick={() => window.location.href = "/api/google-ads/auth"}>
              Connect Google Ads
            </Button>
          </div>
        )
      )}

      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="campaigns" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="creator" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
            Ad Creator
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
            Ad Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <CampaignsTab googleAdsConnected={googleAdsConnected} googleCustomerId={googleCustomerId} />
        </TabsContent>
        <TabsContent value="creator">
          <AdCreatorTab />
        </TabsContent>
        <TabsContent value="analytics">
          <AnalyticsTab googleAdsConnected={googleAdsConnected} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────
export default function MarketingPage() {
  return (
    <Suspense fallback={<div className="p-4 lg:p-6"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>}>
      <MarketingPageInner />
    </Suspense>
  );
}
