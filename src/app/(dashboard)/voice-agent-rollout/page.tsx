"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, CheckCircle2, AlertTriangle, Clock3, Link as LinkIcon, ShieldCheck } from "lucide-react";

type RolloutCheckStatus = "ready" | "action_required" | "verify_in_prod";

type RolloutCheck = {
  id: string;
  title: string;
  status: RolloutCheckStatus;
  detail: string;
  action?: string;
};

type VoiceAgentStatusPayload = {
  status: {
    appBaseUrl: string;
    twilio: {
      configured: boolean;
      accountSid: boolean;
      authToken: boolean;
      fromNumber: boolean;
      messagingServiceSid: boolean;
    };
    retell: {
      configured: boolean;
      apiKey: boolean;
      agentId: boolean;
    };
    reminders: {
      cronSecret: boolean;
      windowHours: string;
      cronSchedule: string;
    };
    endpoints: {
      twilioIncomingVoiceWebhook: string;
      twilioDialActionWebhook: string;
      retellInboundWebhook: string;
      retellEventWebhook: string;
      voiceBlueprintApi: string;
      voiceIntakeApi: string;
      voiceReminderApi: string;
    };
    missing: string[];
  };
  rollout: {
    checks: RolloutCheck[];
    readyCount: number;
    actionRequiredCount: number;
    verifyInProdCount: number;
    totalCount: number;
  };
};

function statusBadge(status: RolloutCheckStatus) {
  if (status === "ready") {
    return <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">ready</Badge>;
  }
  if (status === "verify_in_prod") {
    return <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/30">verify in prod</Badge>;
  }
  return <Badge className="bg-red-500/15 text-red-400 border border-red-500/30">action required</Badge>;
}

function boolBadge(value: boolean, trueLabel = "configured", falseLabel = "missing") {
  return value ? (
    <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">{trueLabel}</Badge>
  ) : (
    <Badge className="bg-red-500/15 text-red-400 border border-red-500/30">{falseLabel}</Badge>
  );
}

export default function VoiceAgentRolloutPage() {
  const [payload, setPayload] = useState<VoiceAgentStatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadStatus() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/voice-agent/status", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load rollout status");
      setPayload(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  const rollout = payload?.rollout;
  const status = payload?.status;

  const metrics = useMemo(() => {
    return {
      ready: rollout?.readyCount || 0,
      actionRequired: rollout?.actionRequiredCount || 0,
      verifyInProd: rollout?.verifyInProdCount || 0,
      total: rollout?.totalCount || 0,
    };
  }, [rollout]);

  return (
    <div className="min-h-screen bg-zinc-950 p-6 lg:p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-amber-400" />
            Voice Agent Rollout
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Production readiness checklist for Twilio, Retell, and automated voice reminder delivery.
          </p>
        </div>
        <Button onClick={loadStatus} variant="outline" className="border-zinc-700 text-zinc-200 hover:bg-zinc-800">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Ready</p>
                <p className="text-2xl font-bold text-zinc-100">{metrics.ready}</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Action Required</p>
                <p className="text-2xl font-bold text-zinc-100">{metrics.actionRequired}</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Verify in Prod</p>
                <p className="text-2xl font-bold text-zinc-100">{metrics.verifyInProd}</p>
              </div>
              <Clock3 className="h-5 w-5 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Total Checks</p>
                <p className="text-2xl font-bold text-zinc-100">{metrics.total}</p>
              </div>
              <ShieldCheck className="h-5 w-5 text-amber-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <Card className="xl:col-span-3 bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100">Rollout Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[620px] pr-4">
              <div className="space-y-4">
                {loading ? (
                  <p className="text-zinc-400">Loading rollout checks...</p>
                ) : !rollout ? (
                  <p className="text-zinc-400">No rollout data available.</p>
                ) : (
                  rollout.checks.map((check) => (
                    <div key={check.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-zinc-100 font-medium">{check.title}</h3>
                          <p className="text-sm text-zinc-400 mt-1">{check.detail}</p>
                        </div>
                        {statusBadge(check.status)}
                      </div>
                      {check.action && (
                        <div className="rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-300">
                          <span className="text-zinc-500">Next action:</span> {check.action}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="xl:col-span-2 space-y-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-zinc-100">Reminder Automation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">CRON_SECRET</span>
                {boolBadge(status?.reminders.cronSecret ?? false)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Window Hours</span>
                <span className="text-zinc-100">{status?.reminders.windowHours || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Cron Schedule</span>
                <span className="text-zinc-100">{status?.reminders.cronSchedule || "—"}</span>
              </div>
              <div>
                <p className="text-zinc-500 mb-2">Reminder Endpoint</p>
                <a
                  href={status?.endpoints.voiceReminderApi || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 break-all"
                >
                  <LinkIcon className="h-4 w-4" />
                  {status?.endpoints.voiceReminderApi || "—"}
                </a>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-zinc-100">Environment Gaps</CardTitle>
            </CardHeader>
            <CardContent>
              {!status || status.missing.length === 0 ? (
                <p className="text-sm text-emerald-400">No missing critical environment variables detected.</p>
              ) : (
                <div className="space-y-2">
                  {status.missing.map((item) => (
                    <div key={item} className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-zinc-100">Provider Endpoints</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {status && Object.entries(status.endpoints).map(([key, value]) => (
                <div key={key}>
                  <p className="text-zinc-500 capitalize">{key}</p>
                  <p className="text-zinc-100 break-all">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
