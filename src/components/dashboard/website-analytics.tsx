"use client";

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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ---------- Mock Data ----------

const trafficData = [
  { date: "Apr 23", visitors: 78, pageViews: 210 },
  { date: "Apr 24", visitors: 92, pageViews: 265 },
  { date: "Apr 25", visitors: 105, pageViews: 298 },
  { date: "Apr 26", visitors: 45, pageViews: 118 },
  { date: "Apr 27", visitors: 38, pageViews: 95 },
  { date: "Apr 28", visitors: 88, pageViews: 245 },
  { date: "Apr 29", visitors: 97, pageViews: 278 },
  { date: "Apr 30", visitors: 110, pageViews: 312 },
  { date: "May 1", visitors: 115, pageViews: 330 },
  { date: "May 2", visitors: 102, pageViews: 290 },
  { date: "May 3", visitors: 48, pageViews: 125 },
  { date: "May 4", visitors: 42, pageViews: 108 },
  { date: "May 5", visitors: 95, pageViews: 268 },
  { date: "May 6", visitors: 108, pageViews: 305 },
  { date: "May 7", visitors: 118, pageViews: 342 },
  { date: "May 8", visitors: 125, pageViews: 358 },
  { date: "May 9", visitors: 112, pageViews: 318 },
  { date: "May 10", visitors: 52, pageViews: 138 },
  { date: "May 11", visitors: 44, pageViews: 112 },
  { date: "May 12", visitors: 98, pageViews: 275 },
  { date: "May 13", visitors: 106, pageViews: 298 },
  { date: "May 14", visitors: 120, pageViews: 348 },
  { date: "May 15", visitors: 132, pageViews: 382 },
  { date: "May 16", visitors: 115, pageViews: 325 },
  { date: "May 17", visitors: 55, pageViews: 145 },
  { date: "May 18", visitors: 48, pageViews: 120 },
  { date: "May 19", visitors: 102, pageViews: 288 },
  { date: "May 20", visitors: 114, pageViews: 322 },
  { date: "May 21", visitors: 128, pageViews: 368 },
  { date: "May 22", visitors: 95, pageViews: 270 },
];

const topPages = [
  { page: "/", label: "Homepage", views: 3245, unique: 1890, avgTime: "1m 48s", bounce: "28.4%" },
  { page: "/services", label: "Services", views: 1876, unique: 1102, avgTime: "3m 12s", bounce: "22.1%" },
  { page: "/gallery", label: "Gallery", views: 1340, unique: 845, avgTime: "4m 05s", bounce: "18.7%" },
  { page: "/contact", label: "Contact", views: 892, unique: 654, avgTime: "2m 22s", bounce: "35.6%" },
  { page: "/about", label: "About Us", views: 645, unique: 412, avgTime: "2m 45s", bounce: "42.3%" },
  { page: "/quote", label: "Get a Quote", views: 434, unique: 318, avgTime: "5m 18s", bounce: "12.8%" },
];

const trafficSources = [
  { name: "Google Organic", value: 42, color: "#C9A84C" },
  { name: "Direct", value: 28, color: "#a1a1aa" },
  { name: "Google Ads", value: 15, color: "#D4B96A" },
  { name: "Social Media", value: 10, color: "#71717a" },
  { name: "Referral", value: 5, color: "#52525b" },
];

const devices = [
  { name: "Desktop", percent: 58, icon: Monitor },
  { name: "Mobile", percent: 35, icon: Smartphone },
  { name: "Tablet", percent: 7, icon: Tablet },
];

// ---------- Custom Tooltip ----------

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 shadow-xl">
      <p className="mb-1 text-xs font-medium text-zinc-400">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.dataKey === "visitors" ? "Visitors" : "Page Views"}: <span className="font-semibold text-zinc-100">{entry.value}</span>
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

// ---------- Main Component ----------

export function WebsiteAnalytics() {
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
              <span className="text-emerald-400">12</span> visitors online now
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Visitors"
          value="2,847"
          change="12.3%"
          changeLabel="vs last month"
          icon={TrendingUp}
          positive={true}
        />
        <KpiCard
          title="Page Views"
          value="8,432"
          change="18.7%"
          changeLabel="vs last month"
          icon={Eye}
          positive={true}
        />
        <KpiCard
          title="Avg Session Duration"
          value="2m 34s"
          change="5.2%"
          changeLabel="vs last month"
          icon={Clock}
          positive={true}
        />
        <KpiCard
          title="Bounce Rate"
          value="34.2%"
          change="3.1%"
          changeLabel="lower is better"
          icon={ArrowDownRight}
          positive={true}
        />
      </div>

      {/* Traffic Over Time Chart */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-zinc-100">
            Traffic Over Time
          </CardTitle>
          <p className="text-xs text-zinc-500">Daily visitors and page views</p>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trafficData}
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
                  dataKey="date"
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
                <Tooltip
                  content={<ChartTooltip />}
                />
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

      {/* Two-column: Top Pages + Traffic Sources & Devices */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Top Pages Table */}
        <Card className="bg-zinc-900 border-zinc-800 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-zinc-100">
              Top Pages
            </CardTitle>
            <p className="text-xs text-zinc-500">Most visited pages this month</p>
          </CardHeader>
          <CardContent>
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
                  {topPages.map((row) => (
                    <tr
                      key={row.page}
                      className="border-b border-zinc-800/50 last:border-0"
                    >
                      <td className="py-3 pr-4">
                        <div>
                          <span className="font-medium text-zinc-200">
                            {row.label}
                          </span>
                          <span className="ml-2 text-xs text-zinc-600">
                            {row.page}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-right font-medium text-zinc-300">
                        {row.views.toLocaleString()}
                      </td>
                      <td className="hidden py-3 pr-4 text-right text-zinc-400 sm:table-cell">
                        {row.unique.toLocaleString()}
                      </td>
                      <td className="hidden py-3 pr-4 text-right text-zinc-400 md:table-cell">
                        {row.avgTime}
                      </td>
                      <td className="py-3 text-right text-zinc-400">
                        {row.bounce}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={trafficSources}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {trafficSources.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
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
                {trafficSources.map((source) => (
                  <div
                    key={source.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: source.color }}
                      />
                      <span className="text-zinc-400">{source.name}</span>
                    </div>
                    <span className="font-medium text-zinc-300">
                      {source.value}%
                    </span>
                  </div>
                ))}
              </div>
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
              <div className="space-y-3">
                {devices.map((device) => {
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
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
