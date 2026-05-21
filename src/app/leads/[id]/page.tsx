import { createClient } from "@supabase/supabase-js";
import { STAGE_LABELS, type PipelineStage, SCORE_TIERS, type ScoreTier } from "@/lib/db/schema";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Building2, Globe, Users, DollarSign, MapPin, Mail, Phone,
  ExternalLink, ShieldCheck, BadgeCheck, CalendarClock, User, Activity,
  Mail as MailIcon, PhoneCall, StickyNote, ArrowRightLeft, Search, TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CopyButton } from "@/components/copy-button";
import { EmailComposer } from "@/components/leads/email-composer";
import { AiSummary } from "@/components/leads/ai-summary";
import { formatDistanceToNow, format } from "date-fns";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

export default async function LeadProfilePage({ params }: { params: { id: string } }) {
  const supabase = getSupabase();

  const { data: lead } = await supabase.from("leads").select("*").eq("id", params.id).single();
  if (!lead) notFound();

  const { data: leadContacts } = await supabase.from("contacts").select("*").eq("lead_id", lead.id);
  const { data: scoreData } = await supabase.from("lead_scores").select("*").eq("lead_id", lead.id).single();
  const { data: dealData } = await supabase.from("deals").select("*").eq("lead_id", lead.id).single();
  const { data: leadActivities } = await supabase.from("activities").select("*").eq("lead_id", lead.id).order("created_at", { ascending: false });

  const contacts = leadContacts || [];
  const score = scoreData;
  const deal = dealData;
  const activities = leadActivities || [];

  let techStack: string[] = [];
  try { if (lead.tech_stack) techStack = JSON.parse(lead.tech_stack); } catch {}

  const tierColor = (tier: string) => {
    switch (tier) {
      case "hot": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "warm": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default: return "bg-sky-500/20 text-sky-400 border-sky-500/30";
    }
  };

  const activityIcon = (type: string) => {
    switch (type) {
      case "email_sent": return <MailIcon className="h-4 w-4 text-blue-400" />;
      case "call": return <PhoneCall className="h-4 w-4 text-green-400" />;
      case "note": return <StickyNote className="h-4 w-4 text-yellow-400" />;
      case "stage_change": return <ArrowRightLeft className="h-4 w-4 text-purple-400" />;
      case "scrape": return <Search className="h-4 w-4 text-zinc-400" />;
      case "score_update": return <TrendingUp className="h-4 w-4 text-emerald-400" />;
      default: return <Activity className="h-4 w-4 text-zinc-400" />;
    }
  };

  const scoreFactors = score ? [
    { label: "Industry Match", value: score.industry_match ?? 0, max: 20 },
    { label: "Employee Fit", value: score.employee_fit ?? 0, max: 15 },
    { label: "Decision Maker", value: score.decision_maker ?? 0, max: 20 },
    { label: "Tech Match", value: score.tech_match ?? 0, max: 15 },
    { label: "Funding Event", value: score.funding_event ?? 0, max: 15 },
    { label: "Traffic Score", value: score.traffic_score ?? 0, max: 10 },
    { label: "Email Verified", value: score.email_verified_score ?? 0, max: 5 },
  ] : [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 px-6 py-4">
        <Link href="/leads" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Leads
        </Link>
      </div>
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <AiSummary leadId={lead.id} />
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader><CardTitle className="flex items-center gap-2 text-zinc-100"><Building2 className="h-5 w-5 text-emerald-500" />{lead.company_name}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {lead.website && <div className="flex items-center gap-2 text-sm"><Globe className="h-4 w-4 text-zinc-500" /><a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline truncate">{lead.website}</a></div>}
                  {lead.industry && <div className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4 text-zinc-500" /><span className="text-zinc-300">{lead.industry}</span></div>}
                  {lead.employee_count && <div className="flex items-center gap-2 text-sm"><Users className="h-4 w-4 text-zinc-500" /><span className="text-zinc-300">{lead.employee_count.toLocaleString()} employees</span></div>}
                  {lead.revenue_range && <div className="flex items-center gap-2 text-sm"><DollarSign className="h-4 w-4 text-zinc-500" /><span className="text-zinc-300">{lead.revenue_range}</span></div>}
                  {(lead.city || lead.state) && <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-zinc-500" /><span className="text-zinc-300">{[lead.city, lead.state, lead.country].filter(Boolean).join(", ")}</span></div>}
                </div>
                {techStack.length > 0 && <div className="pt-2"><p className="text-xs text-zinc-500 mb-2">Tech Stack</p><div className="flex flex-wrap gap-1.5">{techStack.map((tech) => <Badge key={tech} variant="outline" className="bg-zinc-800 text-zinc-300 border-zinc-700 text-xs">{tech}</Badge>)}</div></div>}
              </CardContent>
            </Card>
            {contacts.length > 0 && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader><div className="flex items-center justify-between"><CardTitle className="flex items-center gap-2 text-zinc-100 text-base"><Users className="h-5 w-5 text-amber-500" />Contacts ({contacts.length})</CardTitle><EmailComposer leadId={lead.id} companyName={lead.company_name} /></div></CardHeader>
                <CardContent className="space-y-4">
                  {contacts.map((contact: any, idx: number) => (
                    <div key={contact.id}>
                      {idx > 0 && <Separator className="bg-zinc-800 mb-4" />}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-zinc-100">{contact.full_name}</p>
                          {contact.is_decision_maker && <Badge variant="outline" className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] px-1.5"><ShieldCheck className="h-3 w-3 mr-1" />Decision Maker</Badge>}
                          {contact.email_verified && <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5"><BadgeCheck className="h-3 w-3 mr-1" />Verified</Badge>}
                        </div>
                        {contact.title && <p className="text-sm text-zinc-400">{contact.title}</p>}
                        <div className="flex flex-wrap gap-4 text-sm">
                          {contact.email && <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-zinc-500" /><span className="text-zinc-300">{contact.email}</span><CopyButton text={contact.email} /></div>}
                          {contact.phone && <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-zinc-500" /><span className="text-zinc-300">{contact.phone}</span></div>}
                          {contact.linkedin_url && <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-emerald-400 hover:underline"><ExternalLink className="h-3.5 w-3.5" />LinkedIn</a>}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            {score && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader><div className="flex items-center justify-between"><CardTitle className="flex items-center gap-2 text-zinc-100 text-base"><TrendingUp className="h-5 w-5 text-emerald-500" />Lead Score</CardTitle><div className="flex items-center gap-2"><span className="text-3xl font-bold text-zinc-100">{score.total_score}</span><Badge variant="outline" className={`${tierColor(score.tier)} text-sm px-2`}>{score.tier.toUpperCase()}</Badge></div></div></CardHeader>
                <CardContent className="space-y-3">
                  {scoreFactors.map((factor) => (<div key={factor.label}><div className="flex justify-between text-sm mb-1"><span className="text-zinc-400">{factor.label}</span><span className="text-zinc-300">{factor.value}/{factor.max}</span></div><Progress value={(factor.value / factor.max) * 100} className="h-2 bg-zinc-800" /></div>))}
                  {score.disqualified && score.disqualify_reason && <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-md"><p className="text-sm text-red-400">⚠ Disqualified: {score.disqualify_reason}</p></div>}
                </CardContent>
              </Card>
            )}
          </div>
          <div className="space-y-6">
            {deal && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader><CardTitle className="flex items-center gap-2 text-zinc-100 text-base"><DollarSign className="h-5 w-5 text-emerald-500" />Deal</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center"><span className="text-sm text-zinc-500">Stage</span><Badge variant="outline" className="bg-zinc-800 text-zinc-200 border-zinc-700">{STAGE_LABELS[deal.stage as PipelineStage] ?? deal.stage}</Badge></div>
                  <Separator className="bg-zinc-800" />
                  <div className="flex justify-between items-center"><span className="text-sm text-zinc-500">Value</span><span className="text-lg font-bold text-emerald-400">${(parseFloat(deal.deal_value ?? "0") || 0).toLocaleString()}</span></div>
                  <Separator className="bg-zinc-800" />
                  {deal.assigned_rep && <><div className="flex justify-between items-center"><span className="text-sm text-zinc-500">Assigned Rep</span><span className="flex items-center gap-1.5 text-sm text-zinc-300"><User className="h-3.5 w-3.5" />{deal.assigned_rep}</span></div><Separator className="bg-zinc-800" /></>}
                  {deal.next_action && <div className="space-y-1"><span className="text-sm text-zinc-500">Next Action</span><p className="text-sm text-zinc-200">{deal.next_action}</p>{deal.next_action_date && <p className="text-xs text-zinc-500 flex items-center gap-1"><CalendarClock className="h-3 w-3" />{(() => { try { return format(new Date(deal.next_action_date), "MMM d, yyyy"); } catch { return deal.next_action_date; } })()}</p>}</div>}
                </CardContent>
              </Card>
            )}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader><CardTitle className="flex items-center gap-2 text-zinc-100 text-base"><Activity className="h-5 w-5 text-emerald-500" />Activity ({activities.length})</CardTitle></CardHeader>
              <CardContent>
                {activities.length === 0 ? <p className="text-sm text-zinc-500">No activities yet.</p> : (
                  <div className="relative">
                    <div className="absolute left-[11px] top-2 bottom-2 w-px bg-zinc-800" />
                    <div className="space-y-4">
                      {activities.map((act: any) => (
                        <div key={act.id} className="flex gap-3 relative">
                          <div className="shrink-0 mt-0.5 z-10 bg-zinc-900 p-0.5">{activityIcon(act.type)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-zinc-300 leading-relaxed">{act.description}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">{(() => { try { return formatDistanceToNow(new Date(act.created_at), { addSuffix: true }); } catch { return act.created_at; } })()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
