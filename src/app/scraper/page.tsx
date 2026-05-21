"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Loader2, CheckCircle2, XCircle, Clock, Play, Mail, Globe, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ScrapeJob {
  id: string;
  source: string;
  status: string;
  params: string;
  recordsFound: number;
  recordsNew: number;
  recordsDuplicate: number;
  errors: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface EnrichmentStatus {
  total: number;
  withWebsite: number;
  withEmail: number;
  withVerifiedEmail: number;
  needsEnrichment: number;
}

interface EnrichResult {
  company: string;
  email: string | null;
  allEmails: string[];
  status: "found" | "not_found" | "error";
  pagesChecked: number;
}

export default function ScraperPage() {
  const [jobs, setJobs] = useState<ScrapeJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [query, setQuery] = useState("tech companies");
  const [location, setLocation] = useState("San Francisco, CA");
  const [maxResults, setMaxResults] = useState(5);

  // Enrichment state
  const [enrichStatus, setEnrichStatus] = useState<EnrichmentStatus | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [enrichResults, setEnrichResults] = useState<EnrichResult[]>([]);
  const [enrichProgress, setEnrichProgress] = useState<{ enriched: number; processed: number; remaining: number } | null>(null);

  useEffect(() => {
    fetchJobs();
    fetchEnrichmentStatus();
  }, []);

  async function fetchJobs() {
    try {
      const res = await fetch("/api/scraper");
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchEnrichmentStatus() {
    try {
      const res = await fetch("/api/enrich/email");
      const data = await res.json();
      setEnrichStatus(data);
    } catch (err) {
      console.error("Failed to fetch enrichment status:", err);
    }
  }

  async function runEnrichment() {
    setEnriching(true);
    setEnrichResults([]);
    setEnrichProgress(null);
    try {
      const res = await fetch("/api/enrich/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchSize: 50 }),
      });
      const data = await res.json();
      setEnrichResults(data.results || []);
      setEnrichProgress({
        enriched: data.enriched || 0,
        processed: data.processed || 0,
        remaining: data.remaining || 0,
      });
      // Refresh status
      await fetchEnrichmentStatus();
    } catch (err) {
      console.error("Enrichment failed:", err);
    } finally {
      setEnriching(false);
    }
  }

  async function startScrape() {
    setScraping(true);
    try {
      const res = await fetch("/api/scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, location, maxResults }),
      });
      const data = await res.json();
      if (data.job) {
        await fetchJobs();
      }
    } catch (err) {
      console.error("Scrape failed:", err);
    } finally {
      setScraping(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
          </Badge>
        );
      case "running":
        return (
          <Badge className="bg-amber-500/20 text-amber-400 border-0">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Running
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-500/20 text-red-400 border-0">
            <XCircle className="h-3 w-3 mr-1" /> Failed
          </Badge>
        );
      default:
        return (
          <Badge className="bg-zinc-500/20 text-zinc-400 border-0">
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        );
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Scraper Control Panel</h1>
        <p className="text-zinc-400 mt-1">
          Launch scrape jobs and monitor their progress
        </p>
      </div>

      {/* New Scrape Job Form */}
      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-zinc-100 flex items-center gap-2">
            <Search className="h-5 w-5 text-emerald-400" />
            New Scrape Job
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Configure and launch a new lead scraping job. For MVP, this demonstrates
            the job management UI with simulated results.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <label className="text-sm text-zinc-400 mb-1.5 block">Search Query</label>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. tech companies"
                className="bg-zinc-900 border-zinc-700 text-zinc-100"
              />
            </div>
            <div className="md:col-span-1">
              <label className="text-sm text-zinc-400 mb-1.5 block">Location</label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. San Francisco, CA"
                className="bg-zinc-900 border-zinc-700 text-zinc-100"
              />
            </div>
            <div className="md:col-span-1">
              <label className="text-sm text-zinc-400 mb-1.5 block">Max Results</label>
              <Input
                type="number"
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
                min={1}
                max={20}
                className="bg-zinc-900 border-zinc-700 text-zinc-100"
              />
            </div>
            <div className="md:col-span-1 flex items-end">
              <Button
                onClick={startScrape}
                disabled={scraping || !query}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {scraping ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Scraping...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Scrape
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Enrichment Panel */}
      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-zinc-100 flex items-center gap-2">
            <Mail className="h-5 w-5 text-indigo-400" />
            Email Enrichment
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Crawl lead websites to discover contact emails. Checks homepage, /contact, and /about pages.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Cards */}
          {enrichStatus && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-700/50">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Leads</p>
                <p className="text-xl font-bold text-zinc-100 mt-1">{enrichStatus.total}</p>
              </div>
              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-700/50">
                <div className="flex items-center gap-1">
                  <Globe className="h-3 w-3 text-sky-400" />
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Have Website</p>
                </div>
                <p className="text-xl font-bold text-sky-400 mt-1">{enrichStatus.withWebsite}</p>
              </div>
              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-700/50">
                <div className="flex items-center gap-1">
                  <Mail className="h-3 w-3 text-emerald-400" />
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Have Email</p>
                </div>
                <p className="text-xl font-bold text-emerald-400 mt-1">{enrichStatus.withEmail}</p>
              </div>
              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-700/50">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Verified</p>
                </div>
                <p className="text-xl font-bold text-emerald-400 mt-1">{enrichStatus.withVerifiedEmail}</p>
              </div>
              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-700/50">
                <div className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Needs Enrichment</p>
                </div>
                <p className="text-xl font-bold text-amber-400 mt-1">{enrichStatus.needsEnrichment}</p>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {enrichStatus && enrichStatus.total > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Email coverage</span>
                <span>{Math.round((enrichStatus.withEmail / enrichStatus.total) * 100)}%</span>
              </div>
              <Progress 
                value={(enrichStatus.withEmail / enrichStatus.total) * 100} 
                className="h-2 bg-zinc-700"
              />
            </div>
          )}

          {/* Run Button */}
          <div className="flex items-center gap-3">
            <Button
              onClick={runEnrichment}
              disabled={enriching || (enrichStatus?.needsEnrichment ?? 0) === 0}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {enriching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enriching... (this may take a minute)
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Enrich Emails (batch of 50)
                </>
              )}
            </Button>
            {enrichProgress && (
              <p className="text-sm text-zinc-400">
                Found <span className="text-emerald-400 font-medium">{enrichProgress.enriched}</span> emails 
                out of <span className="text-zinc-300">{enrichProgress.processed}</span> crawled
                {enrichProgress.remaining > 0 && (
                  <> · <span className="text-amber-400">{enrichProgress.remaining}</span> remaining</>
                )}
              </p>
            )}
          </div>

          {/* Results Table */}
          {enrichResults.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-zinc-300 mb-2">Enrichment Results</h3>
              <div className="max-h-80 overflow-auto rounded-lg border border-zinc-700">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-700 hover:bg-transparent">
                      <TableHead className="text-zinc-400">Company</TableHead>
                      <TableHead className="text-zinc-400">Email Found</TableHead>
                      <TableHead className="text-zinc-400">Status</TableHead>
                      <TableHead className="text-zinc-400 text-right">Pages Checked</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrichResults.map((result, i) => (
                      <TableRow key={i} className="border-zinc-700 hover:bg-zinc-800/50">
                        <TableCell className="text-zinc-300 font-medium">{result.company}</TableCell>
                        <TableCell>
                          {result.email ? (
                            <span className="text-emerald-400 font-mono text-xs">{result.email}</span>
                          ) : (
                            <span className="text-zinc-500 text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {result.status === "found" ? (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Found
                            </Badge>
                          ) : result.status === "error" ? (
                            <Badge className="bg-red-500/20 text-red-400 border-0">
                              <XCircle className="h-3 w-3 mr-1" /> Error
                            </Badge>
                          ) : (
                            <Badge className="bg-zinc-500/20 text-zinc-400 border-0">
                              <XCircle className="h-3 w-3 mr-1" /> Not Found
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-zinc-400 text-right">{result.pagesChecked}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job History */}
      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-zinc-100">Job History</CardTitle>
          <CardDescription className="text-zinc-400">
            Past and current scraping jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : jobs.length === 0 ? (
            <p className="text-center text-zinc-500 py-8">
              No scrape jobs yet. Start one above!
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-700 hover:bg-transparent">
                  <TableHead className="text-zinc-400">Job ID</TableHead>
                  <TableHead className="text-zinc-400">Source</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-zinc-400">Query</TableHead>
                  <TableHead className="text-zinc-400 text-right">Found</TableHead>
                  <TableHead className="text-zinc-400 text-right">New</TableHead>
                  <TableHead className="text-zinc-400 text-right">Duplicates</TableHead>
                  <TableHead className="text-zinc-400">Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => {
                  let params: any = {};
                  try {
                    params = JSON.parse(job.params || "{}");
                  } catch {}
                  return (
                    <TableRow
                      key={job.id}
                      className="border-zinc-700 hover:bg-zinc-800/50"
                    >
                      <TableCell className="text-zinc-300 font-mono text-xs">
                        {job.id.slice(0, 10)}...
                      </TableCell>
                      <TableCell className="text-zinc-300">{job.source}</TableCell>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell className="text-zinc-300">
                        {params.query || "-"}
                      </TableCell>
                      <TableCell className="text-zinc-300 text-right">
                        {job.recordsFound}
                      </TableCell>
                      <TableCell className="text-emerald-400 text-right font-medium">
                        {job.recordsNew}
                      </TableCell>
                      <TableCell className="text-zinc-500 text-right">
                        {job.recordsDuplicate}
                      </TableCell>
                      <TableCell className="text-zinc-400 text-sm">
                        {job.startedAt
                          ? formatDistanceToNow(new Date(job.startedAt), {
                              addSuffix: true,
                            })
                          : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
