"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Globe,
  Eye,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Monitor,
  Smartphone,
  Tablet,
  TrendingUp,
  Code,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle,
  Database,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ---------- Types ----------

interface AnalyticsData {
  kpis: {
    totalVisitors: number;
    visitorsChange: number;
    totalPageViews: number;
    pageViewsChange: number;
    avgDurationSeconds: number;
    durationChange: number;
    bounceRate: number;
    bounceRateChange: number;
  };
  dailyTraffic: Array<{
    date: string;
    label: string;
    visitors: number;
    pageViews: number;
  }>;
  topPages: Array<{
    path: string;
    views: number;
    uniqueVisitors: number;
    avgDuration: number;
    bounceRate: number;
  }>;
  trafficSources: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
  devices: Array<{ device: string; count: number; percentage: number }>;
  liveVisitors: number;
}

// ---------- Helpers ----------

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

const PIE_COLORS = [
  "#C9A84C",
  "#a1a1aa",
  "#D4B96A",
  "#71717a",
  "#52525b",
  "#E8D48B",
  "#3f3f46",
  "#9CA38F",
];

const DEVICE_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

// ---------- Custom Tooltip ----------

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 shadow-xl">
      <p className="mb-1 text-xs font-medium text-zinc-400">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.dataKey === "visitors" ? "Visitors" : "Page Views"}:{" "}
          <span className="font-semibold text-zinc-100">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

// ---------- KPI Card ----------

function KpiCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  positive,
}: {
  title: string;
  value: string;
  change: string;
  changeLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  positive: boolean;
}) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
            <Icon className="h-5 w-5 text-[#C9A84C]" />
          </div>
          <div
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              positive
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {positive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {change}
          </div>
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold text-zinc-100">{value}</p>
          <p className="text-xs text-zinc-500">{title}</p>
        </div>
        <p className="mt-1 text-[11px] text-zinc-600">{changeLabel}</p>
      </CardContent>
    </Card>
  );
}

// ---------- Loading Skeleton ----------

function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-zinc-800 ${className ?? ""}`}
    />
  );
}

function LoadingSkeleton() {
  return (
    <section className="space-y-6">
      <div className="border-t border-zinc-800 pt-8">
        <div className="flex items-center gap-3">
          <SkeletonPulse className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <SkeletonPulse className="h-5 w-48" />
            <SkeletonPulse className="h-3 w-64" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <SkeletonPulse className="h-10 w-10 rounded-lg" />
                <SkeletonPulse className="h-5 w-16 rounded-full" />
              </div>
              <SkeletonPulse className="h-7 w-24" />
              <SkeletonPulse className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-6">
          <SkeletonPulse className="h-[300px] w-full rounded-lg" />
        </CardContent>
      </Card>
    </section>
  );
}

// ---------- Migration Card ----------

function MigrationCard({
  onMigrate,
}: {
  onMigrate: () => Promise<void>;
}) {
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    sql?: string;
  } | null>(null);

  async function handleMigrate() {
    setMigrating(true);
    setResult(null);
    try {
      await onMigrate();
      const resp = await fetch("/api/migrate/analytics", { method: "POST" });
      const data = await resp.json();
      setResult(data);
    } catch {
      setResult({ success: false, message: "Request failed" });
    } finally {
      setMigrating(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="border-t border-zinc-800 pt-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#C9A84C]/10">
            <Globe className="h-5 w-5 text-[#C9A84C]" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-zinc-100">
              Website Analytics
            </h2>
            <p className="text-sm text-zinc-500">Setup required</p>
          </div>
        </div>
      </div>
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-8 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
            <Database className="h-8 w-8 text-[#C9A84C]" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-100">
            Database Setup Required
          </h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            The <code className="text-[#C9A84C]">page_views</code> table
            needs to be created in Supabase before analytics can be tracked.
          </p>
          <button
            onClick={handleMigrate}
            disabled={migrating}
            className="inline-flex items-center gap-2 rounded-lg bg-[#C9A84C] px-5 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-[#D4B96A] disabled:opacity-50"
          >
            {migrating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            {migrating ? "Running migration..." : "Create Table"}
          </button>
          {result && (
            <div className="mt-4 text-left max-w-lg mx-auto">
              {result.success ? (
                <div className="rounded-lg border border-emerald-800/50 bg-emerald-900/20 p-4">
                  <p className="text-sm text-emerald-400">
                    ✓ {result.message}
                  </p>
                  <p className="mt-2 text-xs text-zinc-400">
                    Refresh the page to see the analytics dashboard.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {result.message}
                    </span>
                  </div>
                  {result.sql && (
                    <pre className="overflow-x-auto rounded bg-zinc-900 p-3 text-xs text-zinc-300">
                      {result.sql}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

// ---------- Empty State ----------

function EmptyState() {
  const [showSetup, setShowSetup] = useState(false);

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-8 text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
          <Globe className="h-8 w-8 text-[#C9A84C] animate-pulse" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-100">
          Waiting for first visitor...
        </h3>
        <p className="text-sm text-zinc-400 max-w-md mx-auto">
          No page views recorded yet. Add the tracking script to your website
          to start collecting analytics data.
        </p>
        <button
          onClick={() => setShowSetup(!showSetup)}
          className="inline-flex items-center gap-2 text-sm text-[#C9A84C] hover:text-[#D4B96A] transition-colors"
        >
          <Code className="h-4 w-4" />
          Setup Instructions
          {showSetup ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>
        {showSetup && (
          <div className="mt-2 text-left max-w-lg mx-auto rounded-lg border border-zinc-700 bg-zinc-800 p-4 space-y-3">
            <p className="text-xs text-zinc-400">
              Add this to your website&apos;s{" "}
              <code className="text-[#C9A84C]">&lt;head&gt;</code> tag:
            </p>
            <pre className="overflow-x-auto rounded bg-zinc-900 p-3 text-xs text-emerald-400">
              {`<script src="https://b2b-leadgen-kappa.vercel.app/tracker.js" defer></script>`}
            </pre>
            <p className="text-[11px] text-zinc-500">
              The script is lightweight (~1KB), non-blocking, and privacy-friendly.
              No cookies are used.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- Main Component ----------

export function WebsiteAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const resp = await fetch("/api/analytics/website");
      if (!resp.ok) throw new Error("Failed to fetch analytics");
      const json = await resp.json();

      if (json.needsMigration) {
        setNeedsMigration(true);
        setData(null);
      } else {
        setNeedsMigration(false);
        setData(json.data);
      }
      setError(null);
    } catch (e) {
      console.error("Analytics fetch error:", e);
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000); // auto-refresh every 60s
    return () => clearInterval(interval);
  }, [fetchData]);

  // Loading state
  if (loading) return <LoadingSkeleton />;

  // Migration needed
  if (needsMigration) {
    return (
      <MigrationCard
        onMigrate={async () => {
          /* Migration is handled inside the card */
        }}
      />
    );
  }

  // Error state
  if (error && !data) {
    return (
      <section className="space-y-6">
        <div className="border-t border-zinc-800 pt-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-zinc-100">
                Website Analytics
              </h2>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const kpis = data?.kpis;
  const hasData = (kpis?.totalVisitors ?? 0) > 0 || (kpis?.totalPageViews ?? 0) > 0;

  // Build chart-friendly data for traffic sources pie
  const pieData = (data?.trafficSources || []).map((s, i) => ({
    name: s.source,
    value: s.percentage,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  // Build device data with icons
  const deviceData = (data?.devices || []).map((d) => ({
    name: d.device.charAt(0).toUpperCase() + d.device.slice(1),
    percent: d.percentage,
    icon: DEVICE_ICONS[d.device] || Monitor,
  }));

  return (
    <section className="space-y-6">
      {/* Section Header */}
      <div className="border-t border-zinc-800 pt-8">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#C9A84C]/10">
              <Globe className="h-5 w-5 text-[#C9A84C]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-zinc-100">
                Website Analytics
              </h2>
              <p className="text-sm text-zinc-500">
                goldenstateepoxyfloors.com — Last 30 days
              </p>
            </div>
          </div>
          {/* Real-time indicator */}
          <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-zinc-400">
              <span className="text-emerald-400">
                {data?.liveVisitors ?? 0}
              </span>{" "}
              visitor{(data?.liveVisitors ?? 0) !== 1 ? "s" : ""} online now
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Visitors"
          value={formatNumber(kpis?.totalVisitors ?? 0)}
          change={`${Math.abs(kpis?.visitorsChange ?? 0)}%`}
          changeLabel="vs last month"
          icon={TrendingUp}
          positive={(kpis?.visitorsChange ?? 0) >= 0}
        />
        <KpiCard
          title="Page Views"
          value={formatNumber(kpis?.totalPageViews ?? 0)}
          change={`${Math.abs(kpis?.pageViewsChange ?? 0)}%`}
          changeLabel="vs last month"
          icon={Eye}
          positive={(kpis?.pageViewsChange ?? 0) >= 0}
        />
        <KpiCard
          title="Avg Session Duration"
          value={formatDuration(kpis?.avgDurationSeconds ?? 0)}
          change={`${Math.abs(kpis?.durationChange ?? 0)}%`}
          changeLabel="vs last month"
          icon={Clock}
          positive={(kpis?.durationChange ?? 0) >= 0}
        />
        <KpiCard
          title="Bounce Rate"
          value={`${kpis?.bounceRate ?? 0}%`}
          change={`${Math.abs(kpis?.bounceRateChange ?? 0)}%`}
          changeLabel="lower is better"
          icon={ArrowDownRight}
          positive={(kpis?.bounceRateChange ?? 0) <= 0}
        />
      </div>

      {/* Empty state with setup instructions */}
      {!hasData && <EmptyState />}

      {/* Traffic Over Time Chart */}
      {hasData && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-zinc-100">
              Traffic Over Time
            </CardTitle>
            <p className="text-xs text-zinc-500">
              Daily visitors and page views
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data?.dailyTraffic ?? []}
                  margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="visitorsGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#C9A84C"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="#C9A84C"
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient
                      id="pageViewsGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#a1a1aa"
                        stopOpacity={0.15}
                      />
                      <stop
                        offset="95%"
                        stopColor="#a1a1aa"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#27272a"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#71717a", fontSize: 11 }}
                    axisLine={{ stroke: "#3f3f46" }}
                    tickLine={false}
                    interval={4}
                  />
                  <YAxis
                    tick={{ fill: "#71717a", fontSize: 11 }}
                    axisLine={{ stroke: "#3f3f46" }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="pageViews"
                    stroke="#a1a1aa"
                    strokeWidth={1.5}
                    fill="url(#pageViewsGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    stroke="#C9A84C"
                    strokeWidth={2}
                    fill="url(#visitorsGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center gap-6 text-xs text-zinc-500">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#C9A84C]" />
                Visitors
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-400" />
                Page Views
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two-column: Top Pages + Traffic Sources & Devices */}
      {hasData && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Top Pages Table */}
          <Card className="bg-zinc-900 border-zinc-800 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-zinc-100">
                Top Pages
              </CardTitle>
              <p className="text-xs text-zinc-500">
                Most visited pages this month
              </p>
            </CardHeader>
            <CardContent>
              {(data?.topPages?.length ?? 0) === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">
                  No page data yet
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 text-left">
                        <th className="pb-3 pr-4 text-xs font-medium text-zinc-500">
                          Page
                        </th>
                        <th className="pb-3 pr-4 text-right text-xs font-medium text-zinc-500">
                          Views
                        </th>
                        <th className="hidden pb-3 pr-4 text-right text-xs font-medium text-zinc-500 sm:table-cell">
                          Unique
                        </th>
                        <th className="hidden pb-3 pr-4 text-right text-xs font-medium text-zinc-500 md:table-cell">
                          Avg Time
                        </th>
                        <th className="pb-3 text-right text-xs font-medium text-zinc-500">
                          Bounce
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.topPages ?? []).map((row) => (
                        <tr
                          key={row.path}
                          className="border-b border-zinc-800/50 last:border-0"
                        >
                          <td className="py-3 pr-4">
                            <span className="font-medium text-zinc-200">
                              {row.path}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-right font-medium text-zinc-300">
                            {row.views.toLocaleString()}
                          </td>
                          <td className="hidden py-3 pr-4 text-right text-zinc-400 sm:table-cell">
                            {row.uniqueVisitors.toLocaleString()}
                          </td>
                          <td className="hidden py-3 pr-4 text-right text-zinc-400 md:table-cell">
                            {formatDuration(row.avgDuration)}
                          </td>
                          <td className="py-3 text-right text-zinc-400">
                            {row.bounceRate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right column: Traffic Sources + Device Breakdown */}
          <div className="flex flex-col gap-4">
            {/* Traffic Sources Pie */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-zinc-100">
                  Traffic Sources
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length === 0 ? (
                  <p className="py-8 text-center text-sm text-zinc-500">
                    No source data yet
                  </p>
                ) : (
                  <>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                          >
                            {pieData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.color}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#18181b",
                              border: "1px solid #3f3f46",
                              borderRadius: "8px",
                              color: "#f4f4f5",
                              fontSize: "12px",
                            }}
                            formatter={(value) => [`${value}%`, ""]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {pieData.map((source) => (
                        <div
                          key={source.name}
                          className="flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: source.color }}
                            />
                            <span className="text-zinc-400">
                              {source.name}
                            </span>
                          </div>
                          <span className="font-medium text-zinc-300">
                            {source.value}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Device Breakdown */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-zinc-100">
                  Devices
                </CardTitle>
              </CardHeader>
              <CardContent>
                {deviceData.length === 0 ? (
                  <p className="py-4 text-center text-sm text-zinc-500">
                    No device data yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {deviceData.map((device) => {
                      const DeviceIcon = device.icon;
                      return (
                        <div key={device.name} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-zinc-400">
                              <DeviceIcon className="h-4 w-4" />
                              <span>{device.name}</span>
                            </div>
                            <span className="font-medium text-zinc-200">
                              {device.percent}%
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                            <div
                              className="h-full rounded-full bg-[#C9A84C] transition-all"
                              style={{ width: `${device.percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </section>
  );
}
