"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Phone,
  ClipboardList,
  Hammer,
  Clock,
  MapPin,
  Check,
  Trash2,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { APPOINTMENT_TYPES, type AppointmentType } from "@/lib/db/schema";

interface Appointment {
  id: string;
  leadId: string | null;
  dealId: string | null;
  type: AppointmentType;
  title: string;
  notes: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  lead: {
    companyName: string;
    industry: string | null;
    city: string | null;
    state: string | null;
  } | null;
}

interface LeadOption {
  id: string;
  companyName: string;
  contactName: string | null;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getTypeIcon(type: AppointmentType) {
  switch (type) {
    case "phone_call": return <Phone className="h-3 w-3" />;
    case "in_person_quote": return <ClipboardList className="h-3 w-3" />;
    case "construction": return <Hammer className="h-3 w-3" />;
  }
}

function getTypeStyles(type: AppointmentType) {
  const t = APPOINTMENT_TYPES[type];
  return {
    bg: t.bgLightClass,
    text: t.textClass,
    border: t.borderClass,
    dot: t.bgClass,
    color: t.color,
  };
}

export default function CalendarPage() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<LeadOption[]>([]);

  // Dialog state
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formType, setFormType] = useState<AppointmentType>("phone_call");
  const [formTitle, setFormTitle] = useState("");
  const [formLeadId, setFormLeadId] = useState<string>("none");
  const [formDate, setFormDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("10:00");
  const [formNotes, setFormNotes] = useState("");

  const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments?month=${monthStr}`);
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
    } finally {
      setLoading(false);
    }
  }, [monthStr]);

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch("/api/leads?limit=100");
      if (res.ok) {
        const data = await res.json();
        setLeads(
          (data.leads || []).map((l: any) => ({
            id: l.id,
            companyName: l.companyName,
            contactName: l.contactName,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to fetch leads:", err);
    }
  }, []);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);
  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Calendar math
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const calendarDays: { day: number; month: "prev" | "current" | "next"; dateStr: string }[] = [];

  // Previous month days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const m = currentMonth === 0 ? 12 : currentMonth;
    const y = currentMonth === 0 ? currentYear - 1 : currentYear;
    calendarDays.push({
      day: d,
      month: "prev",
      dateStr: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push({
      day: d,
      month: "current",
      dateStr: `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    });
  }

  // Next month days (fill to 42 = 6 rows)
  const remaining = 42 - calendarDays.length;
  for (let d = 1; d <= remaining; d++) {
    const m = currentMonth === 11 ? 1 : currentMonth + 2;
    const y = currentMonth === 11 ? currentYear + 1 : currentYear;
    calendarDays.push({
      day: d,
      month: "next",
      dateStr: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    });
  }

  function getAppointmentsForDate(dateStr: string) {
    return appointments.filter((a) => a.date === dateStr);
  }

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  }

  function goToToday() {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  }

  function openNewAppointment(dateStr?: string) {
    setFormType("phone_call");
    setFormTitle("");
    setFormLeadId("none");
    setFormDate(dateStr || `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`);
    setFormStartTime("09:00");
    setFormEndTime("10:00");
    setFormNotes("");
    setSelectedAppointment(null);
    setShowNewDialog(true);
  }

  function openAppointmentDetail(appt: Appointment) {
    setSelectedAppointment(appt);
    setFormType(appt.type);
    setFormTitle(appt.title);
    setFormLeadId(appt.leadId || "none");
    setFormDate(appt.date);
    setFormStartTime(appt.startTime || "09:00");
    setFormEndTime(appt.endTime || "10:00");
    setFormNotes(appt.notes || "");
    setShowNewDialog(true);
  }

  async function handleSave() {
    if (!formTitle.trim() || !formDate) return;
    setSaving(true);

    try {
      const payload = {
        type: formType,
        title: formTitle.trim(),
        leadId: formLeadId !== "none" ? formLeadId : null,
        date: formDate,
        startTime: formStartTime,
        endTime: formEndTime,
        notes: formNotes.trim() || null,
        allDay: false,
      };

      if (selectedAppointment) {
        // Update
        await fetch(`/api/appointments/${selectedAppointment.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        // Create
        await fetch("/api/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      setShowNewDialog(false);
      fetchAppointments();
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedAppointment) return;
    setSaving(true);
    try {
      await fetch(`/api/appointments/${selectedAppointment.id}`, {
        method: "DELETE",
      });
      setShowNewDialog(false);
      fetchAppointments();
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleComplete(appt: Appointment, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await fetch(`/api/appointments/${appt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !appt.completed }),
      });
      fetchAppointments();
    } catch (err) {
      console.error("Toggle error:", err);
    }
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Upcoming appointments (next 7 days)
  const upcoming = appointments
    .filter((a) => a.date >= todayStr && !a.completed)
    .slice(0, 5);

  // Stats
  const totalThisMonth = appointments.length;
  const completedThisMonth = appointments.filter((a) => a.completed).length;
  const byType = {
    phone_call: appointments.filter((a) => a.type === "phone_call").length,
    in_person_quote: appointments.filter((a) => a.type === "in_person_quote").length,
    construction: appointments.filter((a) => a.type === "construction").length,
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="border-zinc-700 text-zinc-400 hover:text-zinc-100" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-xl font-bold min-w-[200px] text-center">
                {MONTHS[currentMonth]} {currentYear}
              </h1>
              <Button variant="outline" size="icon" className="border-zinc-700 text-zinc-400 hover:text-zinc-100" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-400 hover:text-zinc-100" onClick={goToToday}>
              Today
            </Button>
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white" onClick={() => openNewAppointment()}>
            <Plus className="h-4 w-4 mr-2" />
            New Appointment
          </Button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <div className="xl:col-span-3">
          {/* Legend */}
          <div className="flex items-center gap-4 mb-4">
            {(Object.entries(APPOINTMENT_TYPES) as [AppointmentType, typeof APPOINTMENT_TYPES[AppointmentType]][]).map(([key, val]) => (
              <div key={key} className="flex items-center gap-2 text-xs text-zinc-400">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: val.color }} />
                <span>{val.label}</span>
              </div>
            ))}
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-zinc-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 border border-zinc-800 rounded-lg overflow-hidden">
            {calendarDays.map((cell, idx) => {
              const dayAppointments = getAppointmentsForDate(cell.dateStr);
              const isToday = cell.dateStr === todayStr;
              const isCurrentMonth = cell.month === "current";

              return (
                <div
                  key={idx}
                  className={cn(
                    "min-h-[120px] border-b border-r border-zinc-800 p-1.5 cursor-pointer transition-colors hover:bg-zinc-800/30",
                    !isCurrentMonth && "bg-zinc-900/50",
                    isToday && "bg-indigo-500/5"
                  )}
                  onClick={() => openNewAppointment(cell.dateStr)}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn(
                        "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                        isToday && "bg-indigo-500 text-white",
                        !isToday && isCurrentMonth && "text-zinc-300",
                        !isToday && !isCurrentMonth && "text-zinc-600"
                      )}
                    >
                      {cell.day}
                    </span>
                    {dayAppointments.length > 0 && (
                      <span className="text-[10px] text-zinc-500">{dayAppointments.length}</span>
                    )}
                  </div>

                  {/* Appointments */}
                  <div className="space-y-0.5">
                    {dayAppointments.slice(0, 3).map((appt) => {
                      const styles = getTypeStyles(appt.type);
                      return (
                        <button
                          key={appt.id}
                          className={cn(
                            "w-full text-left px-1.5 py-0.5 rounded text-[11px] font-medium truncate flex items-center gap-1 border transition-colors",
                            styles.bg, styles.text, styles.border,
                            appt.completed && "opacity-50 line-through"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            openAppointmentDetail(appt);
                          }}
                        >
                          {getTypeIcon(appt.type)}
                          <span className="truncate">{appt.startTime ? `${appt.startTime} ` : ""}{appt.title}</span>
                        </button>
                      );
                    })}
                    {dayAppointments.length > 3 && (
                      <div className="text-[10px] text-zinc-500 px-1.5">
                        +{dayAppointments.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-zinc-400">This Month</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Total</span>
                <span className="text-lg font-bold text-zinc-100">{totalThisMonth}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Completed</span>
                <span className="text-lg font-bold text-emerald-400">{completedThisMonth}</span>
              </div>
              <div className="border-t border-zinc-800 pt-3 space-y-2">
                {(Object.entries(APPOINTMENT_TYPES) as [AppointmentType, typeof APPOINTMENT_TYPES[AppointmentType]][]).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: val.color }} />
                      <span className="text-xs text-zinc-400">{val.label}</span>
                    </div>
                    <span className="text-sm font-medium text-zinc-300">{byType[key as AppointmentType]}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-zinc-400">Upcoming</CardTitle>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <p className="text-xs text-zinc-600">No upcoming appointments</p>
              ) : (
                <div className="space-y-3">
                  {upcoming.map((appt) => {
                    const styles = getTypeStyles(appt.type);
                    const typeInfo = APPOINTMENT_TYPES[appt.type];
                    return (
                      <button
                        key={appt.id}
                        className="w-full text-left flex items-start gap-3 group"
                        onClick={() => openAppointmentDetail(appt)}
                      >
                        <div className="mt-0.5 h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: typeInfo.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
                            {appt.title}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                            <span>{new Date(appt.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                            {appt.startTime && (
                              <>
                                <span>·</span>
                                <span className="flex items-center gap-0.5">
                                  <Clock className="h-2.5 w-2.5" />
                                  {appt.startTime}
                                </span>
                              </>
                            )}
                          </div>
                          {appt.lead && (
                            <p className="text-[11px] text-zinc-500 flex items-center gap-0.5 mt-0.5">
                              <MapPin className="h-2.5 w-2.5" />
                              {appt.lead.companyName}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* New/Edit Appointment Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">
              {selectedAppointment ? "Edit Appointment" : "New Appointment"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Appointment Type */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(APPOINTMENT_TYPES) as [AppointmentType, typeof APPOINTMENT_TYPES[AppointmentType]][]).map(([key, val]) => {
                  const isActive = formType === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setFormType(key as AppointmentType)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all",
                        isActive
                          ? `${val.bgLightClass} ${val.borderClass} ring-2 ring-offset-1 ring-offset-zinc-900`
                          : "border-zinc-700 hover:border-zinc-600 bg-zinc-800/50",
                        isActive && key === "phone_call" && "ring-blue-500",
                        isActive && key === "in_person_quote" && "ring-amber-500",
                        isActive && key === "construction" && "ring-emerald-500"
                      )}
                    >
                      <span className="text-xl">{val.emoji}</span>
                      <span className={cn("text-xs font-medium", isActive ? val.textClass : "text-zinc-400")}>
                        {val.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Title</label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder={
                  formType === "phone_call" ? "Follow-up call with client" :
                  formType === "in_person_quote" ? "On-site quote — garage floor" :
                  "Epoxy install — residential garage"
                }
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>

            {/* Lead */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Link to Lead (optional)</label>
              <Select value={formLeadId} onValueChange={setFormLeadId}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                  <SelectValue placeholder="Select a lead" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="none">No lead</SelectItem>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.companyName} {lead.contactName ? `(${lead.contactName})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Date</label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Start</label>
                <Input
                  type="time"
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">End</label>
                <Input
                  type="time"
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Notes</label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Address, special instructions, measurements..."
                rows={3}
                className="w-full rounded-md bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-2 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                {selectedAppointment && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      onClick={handleDelete}
                      disabled={saving}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "border-zinc-700",
                        selectedAppointment.completed
                          ? "text-amber-400 hover:bg-amber-500/10"
                          : "text-emerald-400 hover:bg-emerald-500/10"
                      )}
                      onClick={(e) => {
                        handleToggleComplete(selectedAppointment, e);
                        setShowNewDialog(false);
                      }}
                      disabled={saving}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      {selectedAppointment.completed ? "Mark Incomplete" : "Mark Done"}
                    </Button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="border-zinc-700 text-zinc-400"
                  onClick={() => setShowNewDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                  onClick={handleSave}
                  disabled={saving || !formTitle.trim()}
                >
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {selectedAppointment ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
