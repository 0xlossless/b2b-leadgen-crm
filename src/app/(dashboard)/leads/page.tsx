"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadsTable } from "@/components/leads/leads-table";
import { LeadFilters } from "@/components/leads/lead-filters";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  qualificationTier: string | null;
  lastActivity: {
    type: string;
    description: string;
    createdAt: string;
  } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function LeadDatabasePage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filter states
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("all");
  const [tier, setTier] = useState("all");
  const [stage, setStage] = useState("all");
  const [source, setSource] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showAddLead, setShowAddLead] = useState(false);
  const [addingLead, setAddingLead] = useState(false);
  const [newLead, setNewLead] = useState({
    companyName: "",
    website: "",
    industry: "",
    city: "",
    state: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  });

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "20");
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);

      if (search) params.set("search", search);
      if (industry && industry !== "all") params.set("industry", industry);
      if (tier && tier !== "all") params.set("tier", tier);
      if (stage && stage !== "all") params.set("stage", stage);
      if (source && source !== "all") params.set("source", source);

      const response = await fetch(`/api/leads?${params.toString()}`);
      const data = await response.json();

      setLeads(data.leads || []);
      setPagination(data.pagination || {
        page: data.page ?? 1,
        limit: data.limit ?? 20,
        total: data.total ?? 0,
        totalPages: data.totalPages ?? 0,
      });
    } catch (error) {
      console.error("Failed to fetch leads:", error);
    } finally {
      setLoading(false);
    }
  }, [page, search, industry, tier, stage, source, sortBy, sortOrder]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, industry, tier, stage, source]);

  // Debounce search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  function handleSort(column: string) {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  }

  function handleExportCSV() {
    if (leads.length === 0) return;

    const headers = [
      "Company",
      "Contact",
      "Title",
      "Email",
      "Score",
      "Tier",
      "Stage",
      "Source",
      "Industry",
    ];
    const rows = leads.map((lead) => [
      lead.companyName,
      lead.contactName || "",
      lead.contactTitle || "",
      lead.contactEmail || "",
      (lead.score ?? "").toString(),
      lead.scoreTier || "",
      lead.dealStage || "",
      lead.source,
      lead.industry || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDeleteRequest(leadId: string, companyName: string) {
    setDeleteTarget({ id: leadId, name: companyName });
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/leads/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchLeads();
      } else {
        console.error("Failed to delete lead");
      }
    } catch (error) {
      console.error("Failed to delete lead:", error);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  async function handleAddLead() {
    if (!newLead.companyName.trim()) return;
    setAddingLead(true);
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: newLead.companyName,
          website: newLead.website || undefined,
          industry: newLead.industry || undefined,
          city: newLead.city || undefined,
          state: newLead.state || undefined,
          source: "manual",
          contactName: newLead.contactName || undefined,
          contactEmail: newLead.contactEmail || undefined,
          contactPhone: newLead.contactPhone || undefined,
        }),
      });
      if (response.ok) {
        setShowAddLead(false);
        setNewLead({ companyName: "", website: "", industry: "", city: "", state: "", contactName: "", contactEmail: "", contactPhone: "" });
        fetchLeads();
      } else {
        console.error("Failed to add lead");
      }
    } catch (error) {
      console.error("Failed to add lead:", error);
    } finally {
      setAddingLead(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Lead Database</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {pagination.total} total leads
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:text-zinc-100"
            onClick={handleExportCSV}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white" onClick={() => setShowAddLead(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <LeadFilters
          search={searchInput}
          onSearchChange={setSearchInput}
          industry={industry}
          onIndustryChange={setIndustry}
          tier={tier}
          onTierChange={setTier}
          stage={stage}
          onStageChange={setStage}
          source={source}
          onSourceChange={setSource}
        />
      </div>

      {/* Table */}
      <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
        <LeadsTable
          leads={leads}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          onDelete={handleDeleteRequest}
        />
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-zinc-500">
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-700 text-zinc-400"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
                (p) => (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "outline"}
                    size="sm"
                    className={
                      p === page
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                        : "border-zinc-700 text-zinc-400"
                    }
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                )
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-700 text-zinc-400"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100">Delete Lead</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete <span className="font-semibold text-zinc-200">{deleteTarget?.name}</span>? This will also remove all associated contacts, scores, deals, and activity logs. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-500 text-white"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Lead"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Lead Dialog */}
      <Dialog open={showAddLead} onOpenChange={setShowAddLead}>
        <DialogContent className="bg-zinc-900 border-zinc-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Add New Lead</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label className="text-zinc-300">Company Name *</Label>
              <Input
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
                placeholder="Acme Corp"
                value={newLead.companyName}
                onChange={(e) => setNewLead({ ...newLead, companyName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-zinc-300">Website</Label>
                <Input
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  placeholder="https://example.com"
                  value={newLead.website}
                  onChange={(e) => setNewLead({ ...newLead, website: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-zinc-300">Industry</Label>
                <Input
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  placeholder="Restaurant"
                  value={newLead.industry}
                  onChange={(e) => setNewLead({ ...newLead, industry: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-zinc-300">City</Label>
                <Input
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  placeholder="Livermore"
                  value={newLead.city}
                  onChange={(e) => setNewLead({ ...newLead, city: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-zinc-300">State</Label>
                <Input
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  placeholder="CA"
                  value={newLead.state}
                  onChange={(e) => setNewLead({ ...newLead, state: e.target.value })}
                />
              </div>
            </div>
            <div className="border-t border-zinc-800 pt-4">
              <p className="text-sm font-medium text-zinc-400 mb-3">Contact (optional)</p>
              <div className="grid gap-3">
                <Input
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  placeholder="Contact name"
                  value={newLead.contactName}
                  onChange={(e) => setNewLead({ ...newLead, contactName: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                    placeholder="Email"
                    value={newLead.contactEmail}
                    onChange={(e) => setNewLead({ ...newLead, contactEmail: e.target.value })}
                  />
                  <Input
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                    placeholder="Phone"
                    value={newLead.contactPhone}
                    onChange={(e) => setNewLead({ ...newLead, contactPhone: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => setShowAddLead(false)}>
                Cancel
              </Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
                onClick={handleAddLead}
                disabled={addingLead || !newLead.companyName.trim()}
              >
                {addingLead ? "Adding..." : "Add Lead"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
