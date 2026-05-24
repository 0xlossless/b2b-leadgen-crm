"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Phone,
  PhoneCall,
  CalendarDays,
  ArrowRightLeft,
  Clock3,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ScrollArea } from "@/components/ui/scroll-area";

type VoiceCall = {
  id: string;
  leadId: string | null;
  dealId: string | null;
  appointmentId: string | null;
  provider: string | null;
  source: string | null;
  twilioCallSid: string | null;
  retellCallId: string | null;
  retellAgentId: string | null;
  orchestrationAction: string | null;
  bookingStatus: string | null;
  confirmationSmsStatus: string | null;
  confirmationSmsSentAt: string | null;
  reminderSmsStatus: string | null;
  reminderSmsSentAt: string | null;
  transferTargetNumber: string | null;
  transferStatus: string | null;
  transferReason: string | null;
  transferUpdatedAt: string | null;
  fromNumber: string | null;
  toNumber: string | null;
  direction: string | null;
  status: string | null;
  priority: string | null;
  serviceAreaMatch: boolean | null;
  transcript: string | null;
  recordingUrl: string | null;
  summary: string | null;
  lastEvent: string | null;
  metadata: string | null;
  createdAt: string;
  updatedAt: string;
};

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function statusBadge(status?: string | null) {
  const normalized = (status || "unknown").toLowerCase();
  if (["completed", "connected", "scheduled", "sent"].includes(normalized)) {
    return <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">{status}</Badge>;
  }
  if (["requested", "eligible", "ongoing", "registered", "pending"].includes(normalized)) {
    return <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/30">{status}</Badge>;
  }
  if (["failed", "skipped", "disqualified"].includes(normalized)) {
    return <Badge className="bg-red-500/15 text-red-400 border border-red-500/30">{status}</Badge>;
  }
  return <Badge className="bg-zinc-800 text-zinc-300 border border-zinc-700">{status || "unknown"}</Badge>;
}

function priorityBadge(priority?: string | null) {
  const normalized = (priority || "unknown").toLowerCase();
  if (normalized === "hot") {
    return <Badge className="bg-red-500/15 text-red-400 border border-red-500/30">hot</Badge>;
  }
  if (normalized === "standard" || normalized === "warm") {
    return <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30">{priority}</Badge>;
  }
  if (normalized === "disqualified") {
    return <Badge className="bg-zinc-700 text-zinc-200 border border-zinc-600">disqualified</Badge>;
  }
  return <Badge className="bg-zinc-800 text-zinc-300 border border-zinc-700">{priority || "—"}</Badge>;
}

export default function VoiceCallsPage() {
  const [calls, setCalls] = useState<VoiceCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCall, setSelectedCall] = useState<VoiceCall | null>(null);

  async function loadCalls() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/voice-agent/calls?limit=100", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load voice calls");
      setCalls(data.calls || []);
      setSelectedCall((prev) => {
        if (!prev) return data.calls?.[0] || null;
        return data.calls?.find((c: VoiceCall) => c.id === prev.id) || data.calls?.[0] || null;
      });
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCalls();
  }, []);

  const metrics = useMemo(() => {
    const total = calls.length;
    const transferred = calls.filter((c) => c.transferStatus === "connected" || c.transferStatus === "requested").length;
    const booked = calls.filter((c) => c.bookingStatus === "scheduled").length;
    const hot = calls.filter((c) => c.priority === "hot").length;
    return { total, transferred, booked, hot };
  }, [calls]);

  return (
    <div className="min-h-screen bg-zinc-950 p-6 lg:p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Phone className="h-6 w-6 text-amber-400" />
            Voice Calls
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Monitor inbound AI call handling, transfers, bookings, and orchestration outcomes.
          </p>
        </div>
        <Button onClick={loadCalls} variant="outline" className="border-zinc-700 text-zinc-200 hover:bg-zinc-800">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Total Calls</p>
                <p className="text-2xl font-bold text-zinc-100">{metrics.total}</p>
              </div>
              <PhoneCall className="h-5 w-5 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Hot Leads</p>
                <p className="text-2xl font-bold text-zinc-100">{metrics.hot}</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Transfers</p>
                <p className="text-2xl font-bold text-zinc-100">{metrics.transferred}</p>
              </div>
              <ArrowRightLeft className="h-5 w-5 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Booked Estimates</p>
                <p className="text-2xl font-bold text-zinc-100">{metrics.booked}</p>
              </div>
              <CalendarDays className="h-5 w-5 text-amber-400" />
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
            <CardTitle className="text-zinc-100">Call Log</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[560px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800">
                    <TableHead className="text-zinc-400">Caller</TableHead>
                    <TableHead className="text-zinc-400">Priority</TableHead>
                    <TableHead className="text-zinc-400">Orchestration</TableHead>
                    <TableHead className="text-zinc-400">Transfer</TableHead>
                    <TableHead className="text-zinc-400">Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow className="border-zinc-800">
                      <TableCell colSpan={5} className="text-zinc-400">Loading voice calls...</TableCell>
                    </TableRow>
                  ) : calls.length === 0 ? (
                    <TableRow className="border-zinc-800">
                      <TableCell colSpan={5} className="text-zinc-400">No voice calls yet.</TableCell>
                    </TableRow>
                  ) : (
                    calls.map((call) => (
                      <TableRow
                        key={call.id}
                        className={`border-zinc-800 cursor-pointer ${selectedCall?.id === call.id ? "bg-zinc-800/60" : "hover:bg-zinc-800/40"}`}
                        onClick={() => setSelectedCall(call)}
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-zinc-100 font-medium">{call.fromNumber || "Unknown"}</span>
                            <span className="text-xs text-zinc-500">{call.provider || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell>{priorityBadge(call.priority)}</TableCell>
                        <TableCell>{statusBadge(call.orchestrationAction)}</TableCell>
                        <TableCell>{statusBadge(call.transferStatus)}</TableCell>
                        <TableCell>
                          <span className="text-sm text-zinc-400">{fmtDate(call.updatedAt)}</span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2 bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100">Call Detail</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedCall ? (
              <p className="text-zinc-400">Select a call to inspect its orchestration details.</p>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-zinc-500">Caller</p>
                    <p className="text-zinc-100">{selectedCall.fromNumber || "—"}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Called Number</p>
                    <p className="text-zinc-100">{selectedCall.toNumber || "—"}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Status</p>
                    <div className="mt-1">{statusBadge(selectedCall.status)}</div>
                  </div>
                  <div>
                    <p className="text-zinc-500">Priority</p>
                    <div className="mt-1">{priorityBadge(selectedCall.priority)}</div>
                  </div>
                  <div>
                    <p className="text-zinc-500">Booking</p>
                    <div className="mt-1">{statusBadge(selectedCall.bookingStatus)}</div>
                  </div>
                  <div>
                    <p className="text-zinc-500">Transfer</p>
                    <div className="mt-1">{statusBadge(selectedCall.transferStatus)}</div>
                  </div>
                  <div>
                    <p className="text-zinc-500">Confirmation SMS</p>
                    <div className="mt-1">{statusBadge(selectedCall.confirmationSmsStatus)}</div>
                  </div>
                  <div>
                    <p className="text-zinc-500">Reminder SMS</p>
                    <div className="mt-1">{statusBadge(selectedCall.reminderSmsStatus)}</div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-zinc-500">Orchestration Action</p>
                    <p className="text-zinc-100">{selectedCall.orchestrationAction || "—"}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Transfer Reason</p>
                    <p className="text-zinc-100">{selectedCall.transferReason || "—"}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Summary</p>
                    <p className="text-zinc-100">{selectedCall.summary || "—"}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Last Event</p>
                    <p className="text-zinc-100">{selectedCall.lastEvent || "—"}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Confirmation Sent At</p>
                    <p className="text-zinc-100">{fmtDate(selectedCall.confirmationSmsSentAt)}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Reminder Sent At</p>
                    <p className="text-zinc-100">{fmtDate(selectedCall.reminderSmsSentAt)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-zinc-500">Lead ID</p>
                    <p className="text-zinc-100 break-all">{selectedCall.leadId || "—"}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Appointment ID</p>
                    <p className="text-zinc-100 break-all">{selectedCall.appointmentId || "—"}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Twilio Call SID</p>
                    <p className="text-zinc-100 break-all">{selectedCall.twilioCallSid || "—"}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Retell Call ID</p>
                    <p className="text-zinc-100 break-all">{selectedCall.retellCallId || "—"}</p>
                  </div>
                </div>

                <div>
                  <p className="text-zinc-500 text-sm mb-2">Transcript</p>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-300 max-h-40 overflow-auto">
                    {selectedCall.transcript || "No transcript stored yet."}
                  </div>
                </div>

                {selectedCall.recordingUrl && (
                  <a
                    href={selectedCall.recordingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full items-center justify-center rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Recording
                  </a>
                )}

                <div className="pt-2 border-t border-zinc-800 text-xs text-zinc-500 space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-3.5 w-3.5" />
                    Created: {fmtDate(selectedCall.createdAt)}
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Updated: {fmtDate(selectedCall.updatedAt)}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
