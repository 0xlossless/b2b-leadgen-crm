import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET() {
  const supabase = getSupabase();
  const now = new Date();
  const thirtyDaysAgo = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();
  const sixtyDaysAgo = new Date(
    now.getTime() - 60 * 24 * 60 * 60 * 1000
  ).toISOString();

  // Current period (last 30 days)
  const { data: currentViews, error: cvErr } = await supabase
    .from("page_views")
    .select("*")
    .gte("created_at", thirtyDaysAgo);

  // If table doesn't exist yet, return a migration flag
  if (cvErr) {
    const msg = cvErr.message || "";
    if (
      msg.includes("does not exist") ||
      msg.includes("relation") ||
      cvErr.code === "42P01"
    ) {
      return NextResponse.json({ needsMigration: true, data: null });
    }
    // Some other error
    return NextResponse.json(
      { needsMigration: false, data: null, error: msg },
      { status: 500 }
    );
  }

  // Previous period (30-60 days ago) for comparison
  const { data: previousViews } = await supabase
    .from("page_views")
    .select("session_id, page_path, duration_seconds, is_bounce, created_at")
    .gte("created_at", sixtyDaysAgo)
    .lt("created_at", thirtyDaysAgo);

  const current = currentViews || [];
  const previous = previousViews || [];

  // === KPIs ===
  const currentSessions = new Set(current.map((v) => v.session_id));
  const previousSessions = new Set(previous.map((v) => v.session_id));

  const totalVisitors = currentSessions.size;
  const prevVisitors = previousSessions.size;
  const visitorsChange =
    prevVisitors > 0
      ? ((totalVisitors - prevVisitors) / prevVisitors) * 100
      : 0;

  const totalPageViews = current.length;
  const prevPageViews = previous.length;
  const pageViewsChange =
    prevPageViews > 0
      ? ((totalPageViews - prevPageViews) / prevPageViews) * 100
      : 0;

  const avgDuration =
    current.length > 0
      ? current.reduce((s, v) => s + (v.duration_seconds || 0), 0) /
        current.length
      : 0;
  const prevAvgDuration =
    previous.length > 0
      ? previous.reduce((s, v) => s + (v.duration_seconds || 0), 0) /
        previous.length
      : 0;
  const durationChange =
    prevAvgDuration > 0
      ? ((avgDuration - prevAvgDuration) / prevAvgDuration) * 100
      : 0;

  const bounces = current.filter((v) => v.is_bounce).length;
  const bounceRate =
    current.length > 0 ? (bounces / current.length) * 100 : 0;
  const prevBounces = previous.filter((v) => v.is_bounce).length;
  const prevBounceRate =
    previous.length > 0 ? (prevBounces / previous.length) * 100 : 0;
  const bounceRateChange =
    prevBounceRate > 0
      ? ((bounceRate - prevBounceRate) / prevBounceRate) * 100
      : 0;

  // === Daily traffic (last 30 days) ===
  const dailyMap = new Map<
    string,
    { visitors: Set<string>; pageViews: number }
  >();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, { visitors: new Set(), pageViews: 0 });
  }
  for (const v of current) {
    const day = v.created_at.slice(0, 10);
    if (dailyMap.has(day)) {
      dailyMap.get(day)!.visitors.add(v.session_id);
      dailyMap.get(day)!.pageViews++;
    }
  }
  const dailyTraffic = Array.from(dailyMap.entries()).map(([date, d]) => ({
    date,
    label: new Date(date + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    visitors: d.visitors.size,
    pageViews: d.pageViews,
  }));

  // === Top pages ===
  const pageMap = new Map<
    string,
    {
      views: number;
      sessions: Set<string>;
      totalDuration: number;
      bounces: number;
    }
  >();
  for (const v of current) {
    const existing = pageMap.get(v.page_path) || {
      views: 0,
      sessions: new Set<string>(),
      totalDuration: 0,
      bounces: 0,
    };
    existing.views++;
    existing.sessions.add(v.session_id);
    existing.totalDuration += v.duration_seconds || 0;
    if (v.is_bounce) existing.bounces++;
    pageMap.set(v.page_path, existing);
  }
  const topPages = Array.from(pageMap.entries())
    .map(([path, d]) => ({
      path,
      views: d.views,
      uniqueVisitors: d.sessions.size,
      avgDuration: d.views > 0 ? Math.round(d.totalDuration / d.views) : 0,
      bounceRate:
        d.views > 0
          ? Math.round((d.bounces / d.views) * 100 * 10) / 10
          : 0,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  // === Traffic sources ===
  const sourceMap = new Map<string, number>();
  for (const v of current) {
    let source = "Direct";
    if (v.utm_source) {
      source = v.utm_source;
    } else if (v.referrer) {
      try {
        const url = new URL(v.referrer);
        if (url.hostname.includes("google")) source = "Google Organic";
        else if (
          url.hostname.includes("facebook") ||
          url.hostname.includes("fb.")
        )
          source = "Facebook";
        else if (url.hostname.includes("instagram")) source = "Instagram";
        else if (url.hostname.includes("yelp")) source = "Yelp";
        else if (url.hostname.includes("nextdoor")) source = "Nextdoor";
        else source = url.hostname;
      } catch {
        source = "Referral";
      }
    }
    sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
  }
  const totalForSources = current.length || 1;
  const trafficSources = Array.from(sourceMap.entries())
    .map(([source, count]) => ({
      source,
      count,
      percentage:
        Math.round((count / totalForSources) * 100 * 10) / 10,
    }))
    .sort((a, b) => b.count - a.count);

  // === Device breakdown ===
  const deviceMap = new Map<string, number>();
  for (const v of current) {
    const dt = v.device_type || "desktop";
    deviceMap.set(dt, (deviceMap.get(dt) || 0) + 1);
  }
  const totalForDevices = current.length || 1;
  const devices = Array.from(deviceMap.entries())
    .map(([device, count]) => ({
      device,
      count,
      percentage:
        Math.round((count / totalForDevices) * 100 * 10) / 10,
    }))
    .sort((a, b) => b.count - a.count);

  // === Live visitors (last 5 minutes) ===
  const fiveMinAgo = new Date(
    now.getTime() - 5 * 60 * 1000
  ).toISOString();
  const { count: liveCount } = await supabase
    .from("page_views")
    .select("session_id", { count: "exact", head: true })
    .gte("created_at", fiveMinAgo);

  return NextResponse.json({
    needsMigration: false,
    data: {
      kpis: {
        totalVisitors,
        visitorsChange: Math.round(visitorsChange * 10) / 10,
        totalPageViews,
        pageViewsChange: Math.round(pageViewsChange * 10) / 10,
        avgDurationSeconds: Math.round(avgDuration),
        durationChange: Math.round(durationChange * 10) / 10,
        bounceRate: Math.round(bounceRate * 10) / 10,
        bounceRateChange: Math.round(bounceRateChange * 10) / 10,
      },
      dailyTraffic,
      topPages,
      trafficSources,
      devices,
      liveVisitors: liveCount || 0,
    },
  });
}
