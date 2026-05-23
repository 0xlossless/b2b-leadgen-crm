"use client";

import { useState } from "react";
import { CalendarDays, Clock, MapPin, ClipboardList, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APPOINTMENT_TYPES } from "@/lib/db/schema";

interface ScheduleQuoteLead {
  id: string;
  companyName: string;
  contactName: string | null;
  contactEmail: string | null;
  industry: string | null;
}

interface ScheduleQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: ScheduleQuoteLead | null;
  onSuccess?: () => void;
}

export function ScheduleQuoteDialog({
  open,
  onOpenChange,
  lead,
  onSuccess,
}: ScheduleQuoteDialogProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const [date, setDate] = useState(todayStr);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [appointmentType, setAppointmentType] = useState<string>("in_person_quote");
  const [notes, setNotes] = useState("");

  function resetForm() {
    const now = new Date();
    setDate(now.toISOString().split("T")[0]);
    setStartTime("10:00");
    setEndTime("11:00");
    setAppointmentType("in_person_quote");
    setNotes("");
    setError(null);
    setSuccess(false);
  }

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  }

  async function handleSubmit() {
    if (!lead || !date) return;

    setSaving(true);
    setError(null);

    try {
      const typeLabel = APPOINTMENT_TYPES[appointmentType as keyof typeof APPOINTMENT_TYPES]?.label || "Quote Meeting";
      const title = `${typeLabel} — ${lead.companyName}`;

      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          type: appointmentType,
          title,
          date,
          startTime,
          endTime,
          notes: notes.trim() || undefined,
          allDay: false,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create appointment");
      }

      setSuccess(true);
      setTimeout(() => {
        handleOpenChange(false);
        onSuccess?.();
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-amber-400" />
            Schedule Quote Meeting
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Book a quote appointment for{" "}
            <span className="text-zinc-200 font-medium">{lead.companyName}</span>
            {lead.contactName && (
              <span> with {lead.contactName}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 mb-3">
              <CalendarDays className="h-6 w-6 text-emerald-400" />
            </div>
            <p className="text-zinc-100 font-medium">Meeting Scheduled!</p>
            <p className="text-zinc-400 text-sm mt-1">
              Added to your calendar for {new Date(date + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 py-2">
            {/* Appointment Type */}
            <div className="grid gap-2">
              <Label className="text-zinc-300">Meeting Type</Label>
              <Select value={appointmentType} onValueChange={setAppointmentType}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {Object.entries(APPOINTMENT_TYPES).map(([key, val]) => (
                    <SelectItem key={key} value={key} className="text-zinc-100">
                      <span className="flex items-center gap-2">
                        <span>{val.emoji}</span>
                        <span>{val.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="grid gap-2">
              <Label className="text-zinc-300 flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                Date
              </Label>
              <Input
                type="date"
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
                value={date}
                min={todayStr}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-zinc-300 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Start Time
                </Label>
                <Input
                  type="time"
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-zinc-300 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  End Time
                </Label>
                <Input
                  type="time"
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label className="text-zinc-300">Notes (optional)</Label>
              <Textarea
                className="bg-zinc-800 border-zinc-700 text-zinc-100 resize-none"
                placeholder="Address, special instructions, sqft estimate..."
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                onClick={() => handleOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-500 text-white"
                onClick={handleSubmit}
                disabled={saving || !date}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <CalendarDays className="h-4 w-4 mr-2" />
                    Schedule Meeting
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
