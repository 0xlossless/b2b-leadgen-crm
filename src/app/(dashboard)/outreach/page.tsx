"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Mail,
  Send,
  Users,
  FileText,
  Loader2,
  Phone,
  AtSign,
  ChevronDown,
  ChevronRight,
  Zap,
  CheckCircle2,
  Clock,
  MessageSquare,
  Eye,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CopyButton } from "@/components/copy-button";
import { ScoreBadge } from "@/components/leads/score-badge";
import { StageBadge } from "@/components/leads/stage-badge";

// ─── Types ────────────────────────────────────────────────
interface Lead {
  id: string;
  companyName: string;
  industry: string | null;
  city: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  emailVerified: boolean | null;
  score: number | null;
  scoreTier: string | null;
  dealStage: string | null;
}

interface OutreachRecord {
  id: string;
  leadId: string;
  type: string;
  status: string;
  subject: string;
  body: string;
  emailTo: string;
  templateUsed: string;
  variant: string;
  createdAt: string;
  sentAt?: string;
}

interface OutreachStats {
  drafts: number;
  sent: number;
  opened: number;
  replied: number;
}

interface EmailPreview {
  subject: string;
  body: string;
  to: string;
  phone: string;
  companyName: string;
  contactName: string;
  templateUsed: string;
  industry: string;
  variant: string;
  outreachId?: string;
}

// ─── Industry Config ──────────────────────────────────────
const INDUSTRY_COLORS: Record<string, string> = {
  auto_repair: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  restaurant: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  gym_fitness: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  brewery_winery: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  property_management: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  manufacturing: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  warehouse: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

const INDUSTRY_LABELS: Record<string, string> = {
  auto_repair: "Auto Repair",
  restaurant: "Restaurant",
  gym_fitness: "Gym & Fitness",
  brewery_winery: "Brewery / Winery",
  property_management: "Property Management",
  manufacturing: "Manufacturing",
  warehouse: "Warehouse",
};

function IndustryBadge({ industry }: { industry: string | null }) {
  if (!industry) return <Badge variant="outline" className="text-zinc-500 border-zinc-700">Unknown</Badge>;
  const colors = INDUSTRY_COLORS[industry] || "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
  const label = INDUSTRY_LABELS[industry] || industry.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return <Badge className={`${colors} border`}>{label}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: React.ReactNode }> = {
    draft: { color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30", icon: <FileText className="h-3 w-3 mr-1" /> },
    sent: { color: "bg-blue-500/15 text-blue-400 border-blue-500/30", icon: <Send className="h-3 w-3 mr-1" /> },
    opened: { color: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: <Eye className="h-3 w-3 mr-1" /> },
    replied: { color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: <MessageSquare className="h-3 w-3 mr-1" /> },
  };
  const c = config[status] || config.draft;
  return (
    <Badge className={`${c.color} border`}>
      {c.icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function OutreachPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [outreach, setOutreach] = useState<OutreachRecord[]>([]);
  const [stats, setStats] = useState<OutreachStats>({ drafts: 0, sent: 0, opened: 0, replied: 0 });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null); // leadId being generated
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [emailPreview, setEmailPreview] = useState<EmailPreview | null>(null);
  const [collapsedIndustries, setCollapsedIndustries] = useState<Set<string>>(new Set());
  const [variant, setVariant] = useState<"initial" | "followup">("initial");
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null); // activityId being sent
  const [bulkSending, setBulkSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const [bulkPreview, setBulkPreview] = useState<{total: number; byIndustry: Record<string, number>; drafts: any[]} | null>(null);

  // Fetch leads and outreach data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [leadsRes, outreachRes] = await Promise.all([
        fetch("/api/leads?limit=200&sortBy=companyName&sortOrder=asc"),
        fetch("/api/outreach"),
      ]);
      const leadsData = await leadsRes.json();
      const outreachData = await outreachRes.json();

      const mappedLeads: Lead[] = (leadsData.leads || []).map((l: Record<string, unknown>) => ({
        id: l.id as string,
        companyName: (l.companyName as string) || "",
        industry: (l.industry as string) || null,
        city: (l.city as string) || null,
        contactName: (l.contactName as string) || null,
        contactEmail: (l.contactEmail as string) || null,
        contactPhone: (l.contactPhone as string) || null,
        emailVerified: l.emailVerified as boolean | null,
        score: l.score as number | null,
        scoreTier: (l.scoreTier as string) || (l.tier as string) || null,
        dealStage: (l.dealStage as string) || (l.stage as string) || null,
      }));

      setLeads(mappedLeads);
      setOutreach(outreachData.outreach || []);
      setStats(outreachData.stats || { drafts: 0, sent: 0, opened: 0, replied: 0 });
    } catch (error) {
      console.error("Failed to fetch outreach data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group leads by industry
  const leadsByIndustry = leads.reduce<Record<string, Lead[]>>((acc, lead) => {
    const key = lead.industry || "other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(lead);
    return acc;
  }, {});

  // Sort industry groups by count descending
  const sortedIndustries = Object.entries(leadsByIndustry).sort((a, b) => b[1].length - a[1].length);

  // Get outreach record for a lead
  function getLeadOutreach(leadId: string): OutreachRecord | undefined {
    return outreach.find((o) => o.leadId === leadId);
  }

  // Stats
  const totalLeads = leads.length;
  const leadsWithEmail = leads.filter((l) => l.contactEmail).length;

  // Toggle industry collapse
  function toggleIndustry(industry: string) {
    setCollapsedIndustries((prev) => {
      const next = new Set(prev);
      if (next.has(industry)) next.delete(industry);
      else next.add(industry);
      return next;
    });
  }

  // Generate email for a single lead
  async function handleGenerateEmail(lead: Lead) {
    setGenerating(lead.id);
    try {
      // First generate the email preview
      const emailRes = await fetch("/api/ai/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, variant }),
      });
      const emailData = await emailRes.json();

      if (emailData.error) {
        console.error("Email generation error:", emailData.error);
        return;
      }

      // Create the outreach draft using the AI-generated content
      const outreachRes = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          variant,
          customSubject: emailData.subject,
          customBody: emailData.body,
        }),
      });
      const outreachData = await outreachRes.json();

      // Show preview
      setEmailPreview({
        subject: emailData.subject,
        body: emailData.body,
        to: emailData.to,
        phone: emailData.phone || "",
        companyName: emailData.companyName,
        contactName: emailData.contactName || "",
        templateUsed: emailData.templateUsed,
        industry: emailData.industry,
        variant: emailData.variant,
        outreachId: outreachData.outreach?.id,
      });
      setPreviewOpen(true);

      // Refresh data
      const refreshRes = await fetch("/api/outreach");
      const refreshData = await refreshRes.json();
      setOutreach(refreshData.outreach || []);
      setStats(refreshData.stats || stats);
    } catch (error) {
      console.error("Failed to generate email:", error);
    } finally {
      setGenerating(null);
    }
  }

  // View existing outreach email
  function handleViewEmail(record: OutreachRecord) {
    setEmailPreview({
      subject: record.subject,
      body: record.body,
      to: record.emailTo,
      phone: "",
      companyName: "",
      contactName: "",
      templateUsed: record.templateUsed,
      industry: "",
      variant: record.variant,
      outreachId: record.id,
    });
    setPreviewOpen(true);
  }

  // Update outreach status
  async function handleStatusUpdate(activityId: string, newStatus: string) {
    setStatusUpdating(activityId);
    try {
      await fetch("/api/outreach", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId, status: newStatus }),
      });

      // Refresh outreach data
      const refreshRes = await fetch("/api/outreach");
      const refreshData = await refreshRes.json();
      setOutreach(refreshData.outreach || []);
      setStats(refreshData.stats || stats);
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setStatusUpdating(null);
    }
  }

  // Bulk generate
  async function handleBulkGenerate(dryRun: boolean) {
    setBulkGenerating(true);
    try {
      const res = await fetch("/api/outreach/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant, dryRun }),
      });
      const data = await res.json();

      if (!dryRun && data.success) {
        // Refresh data after bulk generate
        await fetchData();
      } else if (dryRun) {
        // Show summary in dialog
        setBulkPreview({
          total: data.total || 0,
          byIndustry: data.byIndustry || {},
          drafts: data.drafts || [],
        });
      }
    } catch (error) {
      console.error("Bulk generate failed:", error);
    } finally {
      setBulkGenerating(false);
    }
  }

  // Full email text for copying
  const fullEmailText = emailPreview
    ? `Subject: ${emailPreview.subject}\nTo: ${emailPreview.to}\n\n${emailPreview.body}`
    : "";

  // Send a single email via Resend
  async function handleSendEmail(preview: EmailPreview) {
    if (!preview.to || !preview.subject || !preview.body) {
      setSendResult({ success: false, message: "Missing email address, subject, or body." });
      return;
    }
    setSending(preview.outreachId || "new");
    setSendResult(null);
    try {
      const res = await fetch("/api/outreach/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId: preview.outreachId || undefined,
          emailTo: preview.to,
          subject: preview.subject,
          body: preview.body,
          leadId: undefined, // Will be looked up from the activity
          contactName: preview.contactName || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSendResult({ success: true, message: `✅ Email sent to ${data.sentTo}` });
        // Refresh outreach data
        const refreshRes = await fetch("/api/outreach");
        const refreshData = await refreshRes.json();
        setOutreach(refreshData.outreach || []);
        setStats(refreshData.stats || stats);
      } else {
        setSendResult({ success: false, message: data.error || "Failed to send email" });
      }
    } catch (error) {
      console.error("Failed to send email:", error);
      setSendResult({ success: false, message: "Network error — please try again" });
    } finally {
      setSending(null);
    }
  }

  // Send from table row (draft -> send)
  async function handleSendFromRow(record: OutreachRecord) {
    setSending(record.id);
    try {
      const res = await fetch("/api/outreach/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId: record.id,
          emailTo: record.emailTo,
          subject: record.subject,
          body: record.body,
          leadId: record.leadId,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(`Failed to send: ${data.error}`);
      }
      // Refresh
      const refreshRes = await fetch("/api/outreach");
      const refreshData = await refreshRes.json();
      setOutreach(refreshData.outreach || []);
      setStats(refreshData.stats || stats);
    } catch (error) {
      console.error("Failed to send:", error);
    } finally {
      setSending(null);
    }
  }

  // Bulk send all drafts
  async function handleBulkSend() {
    const drafts = outreach.filter((o) => o.status === "draft" && o.emailTo);
    if (drafts.length === 0) {
      alert("No draft emails to send. Generate emails first.");
      return;
    }
    if (!confirm(`Send ${drafts.length} emails? This will send real emails via Resend.`)) return;

    setBulkSending(true);
    try {
      const emails = drafts.map((d) => ({
        activityId: d.id,
        emailTo: d.emailTo,
        subject: d.subject,
        body: d.body,
        leadId: d.leadId,
      }));

      const res = await fetch("/api/outreach/send", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      const data = await res.json();

      alert(
        `Bulk send complete!\n\n✅ Sent: ${data.summary?.sent || 0}\n❌ Failed: ${data.summary?.failed || 0}\n⏱ Duration: ${Math.round(data.summary?.durationMs / 1000 || 0)}s`
      );

      // Refresh
      await fetchData();
    } catch (error) {
      console.error("Bulk send failed:", error);
      alert("Bulk send failed — check console for details");
    } finally {
      setBulkSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Mail className="h-6 w-6 text-amber-500" />
            Outreach
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Generate and manage cold emails for your leads
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Variant Toggle */}
          <div className="flex items-center rounded-lg border border-zinc-700 overflow-hidden">
            <button
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                variant === "initial"
                  ? "bg-amber-500/15 text-amber-400"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              onClick={() => setVariant("initial")}
            >
              Initial
            </button>
            <button
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                variant === "followup"
                  ? "bg-amber-500/15 text-amber-400"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              onClick={() => setVariant("followup")}
            >
              Follow-up
            </button>
          </div>

          <Button
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:text-zinc-100"
            onClick={() => handleBulkGenerate(true)}
            disabled={bulkGenerating}
          >
            {bulkGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            Preview All
          </Button>
          <Button
            className="bg-amber-600 hover:bg-amber-500 text-white"
            onClick={() => handleBulkGenerate(false)}
            disabled={bulkGenerating}
          >
            {bulkGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Generate All
          </Button>
          {stats.drafts > 0 && (
            <Button
              className="bg-blue-600 hover:bg-blue-500 text-white"
              onClick={handleBulkSend}
              disabled={bulkSending || bulkGenerating}
            >
              {bulkSending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send All ({stats.drafts})
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-zinc-100"
            onClick={fetchData}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Total Leads</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">{totalLeads}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                <Users className="h-5 w-5 text-zinc-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">With Email</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">{leadsWithEmail}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <AtSign className="h-5 w-5 text-blue-400" />
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              {totalLeads > 0 ? Math.round((leadsWithEmail / totalLeads) * 100) : 0}% coverage
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Drafted</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">{stats.drafts}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Sent</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">{stats.sent}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Send className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-2">
              {stats.opened > 0 && (
                <span className="text-xs text-amber-400">{stats.opened} opened</span>
              )}
              {stats.replied > 0 && (
                <span className="text-xs text-emerald-400">{stats.replied} replied</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
          <span className="ml-3 text-zinc-400">Loading outreach data...</span>
        </div>
      )}

      {/* Industry Groups */}
      {!loading && sortedIndustries.map(([industry, industryLeads]) => {
        const isCollapsed = collapsedIndustries.has(industry);
        const withEmail = industryLeads.filter((l) => l.contactEmail).length;
        const draftedCount = industryLeads.filter((l) => getLeadOutreach(l.id)).length;

        return (
          <div key={industry} className="mb-6">
            {/* Industry Header */}
            <button
              onClick={() => toggleIndustry(industry)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-t-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/70 transition-colors group"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
              ) : (
                <ChevronDown className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
              )}
              <IndustryBadge industry={industry === "other" ? null : industry} />
              <span className="text-sm text-zinc-400">
                {industryLeads.length} lead{industryLeads.length !== 1 && "s"}
              </span>
              <span className="text-xs text-zinc-600">•</span>
              <span className="text-sm text-zinc-500">
                {withEmail} with email
              </span>
              {draftedCount > 0 && (
                <>
                  <span className="text-xs text-zinc-600">•</span>
                  <span className="text-sm text-amber-400/80">
                    {draftedCount} drafted
                  </span>
                </>
              )}
            </button>

            {/* Leads Table */}
            {!isCollapsed && (
              <div className="rounded-b-lg border border-t-0 border-zinc-800 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="text-zinc-400 w-[220px]">Company</TableHead>
                      <TableHead className="text-zinc-400">Contact</TableHead>
                      <TableHead className="text-zinc-400">Email / Phone</TableHead>
                      <TableHead className="text-zinc-400 w-[80px]">Score</TableHead>
                      <TableHead className="text-zinc-400 w-[120px]">Stage</TableHead>
                      <TableHead className="text-zinc-400 w-[120px]">Status</TableHead>
                      <TableHead className="text-zinc-400 w-[200px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {industryLeads.map((lead) => {
                      const record = getLeadOutreach(lead.id);
                      const isGenerating = generating === lead.id;

                      return (
                        <TableRow key={lead.id} className="border-zinc-800 hover:bg-zinc-800/30 transition-colors">
                          {/* Company */}
                          <TableCell>
                            <span className="font-medium text-zinc-100">{lead.companyName}</span>
                            {lead.city && (
                              <p className="text-xs text-zinc-500 mt-0.5">{lead.city}</p>
                            )}
                          </TableCell>

                          {/* Contact */}
                          <TableCell>
                            <span className="text-sm text-zinc-300">{lead.contactName || "—"}</span>
                          </TableCell>

                          {/* Email / Phone */}
                          <TableCell>
                            {lead.contactEmail ? (
                              <div className="flex items-center gap-1.5">
                                <AtSign className="h-3 w-3 text-zinc-500" />
                                <span className="text-sm text-zinc-300 font-mono">{lead.contactEmail}</span>
                                <CopyButton text={lead.contactEmail} />
                                {lead.emailVerified && (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-zinc-600 italic">No email</span>
                            )}
                            {lead.contactPhone && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <Phone className="h-3 w-3 text-zinc-500" />
                                <span className="text-xs text-zinc-500">{lead.contactPhone}</span>
                                <CopyButton text={lead.contactPhone} />
                              </div>
                            )}
                          </TableCell>

                          {/* Score */}
                          <TableCell>
                            <ScoreBadge score={lead.score} tier={lead.scoreTier} />
                          </TableCell>

                          {/* Stage */}
                          <TableCell>
                            <StageBadge stage={lead.dealStage} />
                          </TableCell>

                          {/* Outreach Status */}
                          <TableCell>
                            {record ? (
                              <div className="flex flex-col gap-1">
                                <StatusBadge status={record.status} />
                                {record.sentAt && ["sent", "opened", "replied"].includes(record.status) && (
                                  <span className="text-zinc-500 text-xs">
                                    {new Date(record.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{", "}
                                    {new Date(record.sentAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-zinc-600">Not started</span>
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              {record ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-zinc-400 hover:text-zinc-100 h-8"
                                    onClick={() => handleViewEmail(record)}
                                  >
                                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                                    View
                                  </Button>
                                  {record.status === "draft" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-blue-400 hover:text-blue-300 h-8"
                                      disabled={sending === record.id || !record.emailTo}
                                      onClick={() => handleSendFromRow(record)}
                                    >
                                      {sending === record.id ? (
                                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                      ) : (
                                        <Send className="h-3.5 w-3.5 mr-1.5" />
                                      )}
                                      Send
                                    </Button>
                                  )}
                                  {record.status === "sent" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-emerald-400 hover:text-emerald-300 h-8"
                                      disabled={statusUpdating === record.id}
                                      onClick={() => handleStatusUpdate(record.id, "replied")}
                                    >
                                      {statusUpdating === record.id ? (
                                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                      ) : (
                                        <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                                      )}
                                      Replied
                                    </Button>
                                  )}
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  className="bg-amber-600 hover:bg-amber-500 text-white h-8"
                                  disabled={!lead.contactEmail || isGenerating}
                                  onClick={() => handleGenerateEmail(lead)}
                                >
                                  {isGenerating ? (
                                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                  ) : (
                                    <Mail className="h-3.5 w-3.5 mr-1.5" />
                                  )}
                                  Generate Email
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        );
      })}

      {/* Empty State */}
      {!loading && leads.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <Mail className="h-12 w-12 text-zinc-700 mb-4" />
          <h3 className="text-lg font-medium text-zinc-300">No leads found</h3>
          <p className="text-sm text-zinc-500 mt-1">
            Import leads from the Scraper or add them manually.
          </p>
        </div>
      )}

      {/* Bulk Preview Dialog */}
      <Dialog open={bulkPreview !== null} onOpenChange={(open) => { if (!open) setBulkPreview(null); }}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 flex items-center gap-2">
              <Eye className="h-5 w-5 text-amber-500" />
              Bulk Email Preview
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {bulkPreview?.total || 0} emails ready to generate:
            </DialogDescription>
          </DialogHeader>

          {bulkPreview && (
            <div className="space-y-4 mt-2">
              {/* Industry Breakdown */}
              <div className="rounded-lg bg-zinc-800/70 border border-zinc-700 p-4">
                <h4 className="text-sm font-medium text-zinc-300 mb-3">By Industry</h4>
                <div className="space-y-2">
                  {Object.entries(bulkPreview.byIndustry).map(([ind, count]) => (
                    <div key={ind} className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">
                        {INDUSTRY_LABELS[ind] || ind.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                      <Badge className="bg-zinc-700 text-zinc-300 border-zinc-600 border">{String(count)}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Drafts Table */}
              {bulkPreview.drafts.length > 0 && (
                <div className="rounded-lg border border-zinc-700 overflow-hidden max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800 hover:bg-transparent">
                        <TableHead className="text-zinc-400">Company</TableHead>
                        <TableHead className="text-zinc-400">Email</TableHead>
                        <TableHead className="text-zinc-400">Subject</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkPreview.drafts.map((draft: any, i: number) => (
                        <TableRow key={i} className="border-zinc-800 hover:bg-zinc-800/30">
                          <TableCell className="text-sm text-zinc-300">{draft.companyName || draft.company_name || "—"}</TableCell>
                          <TableCell className="text-sm text-zinc-400 font-mono">{draft.emailTo || draft.email_to || "—"}</TableCell>
                          <TableCell className="text-sm text-zinc-300">{draft.subject || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:text-zinc-100"
              onClick={() => setBulkPreview(null)}
            >
              Close
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-500 text-white"
              onClick={() => {
                setBulkPreview(null);
                handleBulkGenerate(false);
              }}
            >
              <Zap className="h-4 w-4 mr-2" />
              Generate All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 flex items-center gap-2">
              <Mail className="h-5 w-5 text-amber-500" />
              Email Preview
              {emailPreview?.templateUsed && (
                <Badge className="ml-2 bg-zinc-800 text-zinc-400 border-zinc-700 border text-xs">
                  {emailPreview.templateUsed}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {emailPreview?.companyName
                ? `Generated for ${emailPreview.companyName}`
                : "Review the generated email below"}
            </DialogDescription>
          </DialogHeader>

          {emailPreview && (
            <div className="space-y-4 mt-2">
              {/* To / Subject fields */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/70 border border-zinc-700">
                  <span className="text-xs font-medium text-zinc-500 w-12 shrink-0">To:</span>
                  <span className="text-sm text-zinc-200 font-mono">{emailPreview.to || "—"}</span>
                  {emailPreview.to && <CopyButton text={emailPreview.to} />}
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/70 border border-zinc-700">
                  <span className="text-xs font-medium text-zinc-500 w-12 shrink-0">Subject:</span>
                  <span className="text-sm text-zinc-200 font-medium">{emailPreview.subject}</span>
                  <CopyButton text={emailPreview.subject} />
                </div>
                {emailPreview.phone && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/70 border border-zinc-700">
                    <span className="text-xs font-medium text-zinc-500 w-12 shrink-0">Phone:</span>
                    <span className="text-sm text-zinc-400">{emailPreview.phone}</span>
                    <CopyButton text={emailPreview.phone} />
                  </div>
                )}
              </div>

              {/* Email Body */}
              <div className="relative">
                <div className="absolute top-2 right-2 z-10">
                  <CopyButton text={emailPreview.body} />
                </div>
                <div className="rounded-lg bg-zinc-950 border border-zinc-700 p-4 text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed font-mono min-h-[200px]">
                  {emailPreview.body}
                </div>
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-500">
                <Clock className="h-3 w-3" />
                <span>Variant: {emailPreview.variant}</span>
                {emailPreview.industry && (
                  <>
                    <span>•</span>
                    <span>Industry: {emailPreview.industry}</span>
                  </>
                )}
                {emailPreview.templateUsed && (
                  <>
                    <span>•</span>
                    <span>Template: {emailPreview.templateUsed}</span>
                  </>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 gap-2">
            {sendResult && (
              <div className={`flex-1 text-sm px-3 py-2 rounded-lg ${
                sendResult.success
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}>
                {sendResult.message}
              </div>
            )}
            <Button
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:text-zinc-100"
              onClick={() => {
                setPreviewOpen(false);
                setSendResult(null);
              }}
            >
              Close
            </Button>
            <Button
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
              onClick={() => {
                navigator.clipboard.writeText(fullEmailText);
              }}
            >
              <Mail className="h-4 w-4 mr-2" />
              Copy Full Email
            </Button>
            {emailPreview?.to && (
              <Button
                className="bg-blue-600 hover:bg-blue-500 text-white"
                disabled={sending !== null}
                onClick={() => {
                  if (emailPreview) {
                    handleSendEmail(emailPreview);
                  }
                }}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Email
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
