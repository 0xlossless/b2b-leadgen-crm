import { db } from "@/lib/db";
import { leads, contacts, leadScores, deals, activities } from "@/lib/db/schema";
import { STAGE_LABELS, type PipelineStage, SCORE_TIERS, type ScoreTier } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Globe,
  Users,
  DollarSign,
  MapPin,
  Mail,
  Phone,
  ExternalLink,
  ShieldCheck,
  BadgeCheck,
  CalendarClock,
  User,
  Activity,
  Mail as MailIcon,
  PhoneCall,
  StickyNote,
  ArrowRightLeft,
  Search,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CopyButton } from "@/components/copy-button";
import { EmailComposer } from "@/components/leads/email-composer";
import { AiSummary } from "@/components/leads/ai-summary";
import { formatDistanceToNow, format } from "date-fns";

export default function LeadProfilePage({
  params,
}: {
  params: { id: string };
}) {
  // Fetch lead
  const lead = db
    .select()
    .from(leads)
    .where(eq(leads.id, params.id))
    .get();

  if (!lead) {
    notFound();
  }

  // Fetch related data
  const leadContacts = db
    .select()
    .from(contacts)
    .where(eq(contacts.leadId, lead.id))
    .all();

  const score = db
    .select()
    .from(leadScores)
    .where(eq(leadScores.leadId, lead.id))
    .get();

  const deal = db
    .select()
    .from(deals)
    .where(eq(deals.leadId, lead.id))
    .get();

  const leadActivities = db
    .select()
    .from(activities)
    .where(eq(activities.leadId, lead.id))
    .orderBy(desc(activities.createdAt))
    .all();

  // Parse tech stack
  let techStack: string[] = [];
  try {
    if (lead.techStack) techStack = JSON.parse(lead.techStack);
  } catch {}

  const tierColor = (tier: string) => {
    switch (tier) {
      case "hot":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "warm":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default:
        return "bg-sky-500/20 text-sky-400 border-sky-500/30";
    }
  };

  const activityIcon = (type: string) => {
    switch (type) {
      case "email_sent":
        return <MailIcon className="h-4 w-4 text-blue-400" />;
      case "call":
        return <PhoneCall className="h-4 w-4 text-green-400" />;
      case "note":
        return <StickyNote className="h-4 w-4 text-yellow-400" />;
      case "stage_change":
        return <ArrowRightLeft className="h-4 w-4 text-purple-400" />;
      case "scrape":
        return <Search className="h-4 w-4 text-zinc-400" />;
      case "score_update":
        return <TrendingUp className="h-4 w-4 text-emerald-400" />;
      default:
        return <Activity className="h-4 w-4 text-zinc-400" />;
    }
  };

  // Score breakdown factors
  const scoreFactors = score
    ? [
        { label: "Industry Match", value: score.industryMatch ?? 0, max: 20 },
        { label: "Employee Fit", value: score.employeeFit ?? 0, max: 15 },
        { label: "Decision Maker", value: score.decisionMaker ?? 0, max: 20 },
        { label: "Tech Match", value: score.techMatch ?? 0, max: 15 },
        { label: "Funding Event", value: score.fundingEvent ?? 0, max: 15 },
        { label: "Traffic Score", value: score.trafficScore ?? 0, max: 10 },
        { label: "Email Verified", value: score.emailVerified ?? 0, max: 5 },
      ]
    : [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Top bar */}
      <div className="border-b border-zinc-800 px-6 py-4">
        <Link
          href="/leads"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Leads
        </Link>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left Column (wider) ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Summary */}
            <AiSummary leadId={lead.id} />

            {/* Company Info Card */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-zinc-100">
                  <Building2 className="h-5 w-5 text-emerald-500" />
                  {lead.companyName}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {lead.website && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-zinc-500" />
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:underline truncate"
                      >
                        {lead.website}
                      </a>
                    </div>
                  )}
                  {lead.industry && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-zinc-500" />
                      <span className="text-zinc-300">{lead.industry}</span>
                    </div>
                  )}
                  {lead.employeeCount && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-zinc-500" />
                      <span className="text-zinc-300">
                        {lead.employeeCount.toLocaleString()} employees
                      </span>
                    </div>
                  )}
                  {lead.revenueRange && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-zinc-500" />
                      <span className="text-zinc-300">{lead.revenueRange}</span>
                    </div>
                  )}
                  {(lead.city || lead.state) && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-zinc-500" />
                      <span className="text-zinc-300">
                        {[lead.city, lead.state, lead.country]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                  )}
                </div>

                {techStack.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs text-zinc-500 mb-2">Tech Stack</p>
                    <div className="flex flex-wrap gap-1.5">
                      {techStack.map((tech) => (
                        <Badge
                          key={tech}
                          variant="outline"
                          className="bg-zinc-800 text-zinc-300 border-zinc-700 text-xs"
                        >
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contacts */}
            {leadContacts.length > 0 && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-zinc-100 text-base">
                      <Users className="h-5 w-5 text-amber-500" />
                      Contacts ({leadContacts.length})
                    </CardTitle>
                    <EmailComposer leadId={lead.id} companyName={lead.companyName} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {leadContacts.map((contact, idx) => (
                    <div key={contact.id}>
                      {idx > 0 && <Separator className="bg-zinc-800 mb-4" />}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-zinc-100">
                            {contact.fullName}
                          </p>
                          {contact.isDecisionMaker && (
                            <Badge
                              variant="outline"
                              className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] px-1.5"
                            >
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              Decision Maker
                            </Badge>
                          )}
                          {contact.emailVerified && (
                            <Badge
                              variant="outline"
                              className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5"
                            >
                              <BadgeCheck className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                        {contact.title && (
                          <p className="text-sm text-zinc-400">
                            {contact.title}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-4 text-sm">
                          {contact.email && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5 text-zinc-500" />
                              <span className="text-zinc-300">
                                {contact.email}
                              </span>
                              <CopyButton text={contact.email} />
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 text-zinc-500" />
                              <span className="text-zinc-300">
                                {contact.phone}
                              </span>
                            </div>
                          )}
                          {contact.linkedinUrl && (
                            <a
                              href={contact.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-emerald-400 hover:underline"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              LinkedIn
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Score Breakdown */}
            {score && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-zinc-100 text-base">
                      <TrendingUp className="h-5 w-5 text-emerald-500" />
                      Lead Score
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-bold text-zinc-100">
                        {score.totalScore}
                      </span>
                      <Badge
                        variant="outline"
                        className={`${tierColor(score.tier)} text-sm px-2`}
                      >
                        {score.tier.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {scoreFactors.map((factor) => (
                    <div key={factor.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-zinc-400">{factor.label}</span>
                        <span className="text-zinc-300">
                          {factor.value}/{factor.max}
                        </span>
                      </div>
                      <Progress
                        value={(factor.value / factor.max) * 100}
                        className="h-2 bg-zinc-800"
                      />
                    </div>
                  ))}
                  {score.disqualified && score.disqualifyReason && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                      <p className="text-sm text-red-400">
                        ⚠ Disqualified: {score.disqualifyReason}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Right Column ── */}
          <div className="space-y-6">
            {/* Deal Info Card */}
            {deal && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-zinc-100 text-base">
                    <DollarSign className="h-5 w-5 text-emerald-500" />
                    Deal
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-500">Stage</span>
                    <Badge
                      variant="outline"
                      className="bg-zinc-800 text-zinc-200 border-zinc-700"
                    >
                      {STAGE_LABELS[deal.stage as PipelineStage] ?? deal.stage}
                    </Badge>
                  </div>
                  <Separator className="bg-zinc-800" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-500">Value</span>
                    <span className="text-lg font-bold text-emerald-400">
                      ${(deal.dealValue ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <Separator className="bg-zinc-800" />
                  {deal.assignedRep && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-500">
                          Assigned Rep
                        </span>
                        <span className="flex items-center gap-1.5 text-sm text-zinc-300">
                          <User className="h-3.5 w-3.5" />
                          {deal.assignedRep}
                        </span>
                      </div>
                      <Separator className="bg-zinc-800" />
                    </>
                  )}
                  {deal.nextAction && (
                    <div className="space-y-1">
                      <span className="text-sm text-zinc-500">
                        Next Action
                      </span>
                      <p className="text-sm text-zinc-200">
                        {deal.nextAction}
                      </p>
                      {deal.nextActionDate && (
                        <p className="text-xs text-zinc-500 flex items-center gap-1">
                          <CalendarClock className="h-3 w-3" />
                          {(() => {
                            try {
                              return format(
                                new Date(deal.nextActionDate),
                                "MMM d, yyyy"
                              );
                            } catch {
                              return deal.nextActionDate;
                            }
                          })()}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Activity Timeline */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-zinc-100 text-base">
                  <Activity className="h-5 w-5 text-emerald-500" />
                  Activity ({leadActivities.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {leadActivities.length === 0 ? (
                  <p className="text-sm text-zinc-500">No activities yet.</p>
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-[11px] top-2 bottom-2 w-px bg-zinc-800" />

                    <div className="space-y-4">
                      {leadActivities.map((act) => (
                        <div key={act.id} className="flex gap-3 relative">
                          <div className="shrink-0 mt-0.5 z-10 bg-zinc-900 p-0.5">
                            {activityIcon(act.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-zinc-300 leading-relaxed">
                              {act.description}
                            </p>
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {(() => {
                                try {
                                  return formatDistanceToNow(
                                    new Date(act.createdAt),
                                    { addSuffix: true }
                                  );
                                } catch {
                                  return act.createdAt;
                                }
                              })()}
                            </p>
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
