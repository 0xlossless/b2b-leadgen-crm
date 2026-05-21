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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Loader2, CheckCircle2, XCircle, Clock, Play } from "lucide-react";
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

export default function ScraperPage() {
  const [jobs, setJobs] = useState<ScrapeJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [query, setQuery] = useState("tech companies");
  const [location, setLocation] = useState("San Francisco, CA");
  const [maxResults, setMaxResults] = useState(5);

  useEffect(() => {
    fetchJobs();
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
