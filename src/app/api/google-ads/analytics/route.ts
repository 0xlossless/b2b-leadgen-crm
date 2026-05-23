import { NextResponse } from "next/server";
import { GoogleAdsClient } from "@/lib/google-ads";

export const dynamic = "force-dynamic";

// ── helpers ──────────────────────────────────────────────────────────
function microsToUsd(micros: number | string | null | undefined): number {
  if (micros == null) return 0;
  return Number(micros) / 1_000_000;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
}

// ── Mock analytics for Golden State Epoxy Flooring ──────────────────
function getMockAnalytics() {
  const now = new Date();

  // Generate 30 days of daily data
  const dailyPerformance = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (29 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const baseImpressions = 1400 + Math.floor(Math.random() * 600);
    const baseClicks = Math.floor(baseImpressions * (0.035 + Math.random() * 0.015));
    const baseConversions = Math.floor(baseClicks * (0.06 + Math.random() * 0.03));
    const baseCost = baseClicks * (1.1 + Math.random() * 0.5);
    // Weekends get ~60% of weekday traffic
    const dayOfWeek = d.getDay();
    const weekendMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 0.6 : 1.0;

    return {
      date: dateStr,
      impressions: Math.round(baseImpressions * weekendMultiplier),
      clicks: Math.round(baseClicks * weekendMultiplier),
      conversions: Math.round(baseConversions * weekendMultiplier),
      spend: Math.round(baseCost * weekendMultiplier * 100) / 100,
    };
  });

  const totalImpressions = dailyPerformance.reduce((s, d) => s + d.impressions, 0);
  const totalClicks = dailyPerformance.reduce((s, d) => s + d.clicks, 0);
  const totalConversions = dailyPerformance.reduce((s, d) => s + d.conversions, 0);
  const totalSpend = Math.round(dailyPerformance.reduce((s, d) => s + d.spend, 0) * 100) / 100;

  return {
    source: "mock" as const,
    message: "Google Ads is not connected. Showing demo data for Golden State Epoxy Flooring.",
    period: {
      start: dailyPerformance[0].date,
      end: dailyPerformance[29].date,
      days: 30,
    },
    summary: {
      totalSpend,
      totalImpressions,
      totalClicks,
      totalConversions,
      ctr: totalClicks / totalImpressions,
      averageCpc: totalSpend / totalClicks,
      conversionRate: totalConversions / totalClicks,
      costPerConversion: totalSpend / totalConversions,
    },
    dailyPerformance,
    topKeywords: [
      { keyword: "epoxy flooring near me", impressions: 8420, clicks: 412, conversions: 34, spend: 528.36, ctr: 0.049 },
      { keyword: "garage floor coating", impressions: 6230, clicks: 298, conversions: 22, spend: 387.4, ctr: 0.048 },
      { keyword: "commercial epoxy flooring", impressions: 5100, clicks: 241, conversions: 19, spend: 349.45, ctr: 0.047 },
      { keyword: "metallic epoxy floor", impressions: 4300, clicks: 189, conversions: 14, spend: 245.7, ctr: 0.044 },
      { keyword: "epoxy floor contractor bay area", impressions: 3800, clicks: 178, conversions: 16, spend: 231.4, ctr: 0.047 },
      { keyword: "industrial floor coating", impressions: 3200, clicks: 134, conversions: 10, spend: 174.2, ctr: 0.042 },
      { keyword: "epoxy flooring cost", impressions: 2900, clicks: 121, conversions: 8, spend: 133.1, ctr: 0.042 },
      { keyword: "floor coating service sacramento", impressions: 2400, clicks: 108, conversions: 9, spend: 140.4, ctr: 0.045 },
      { keyword: "warehouse floor epoxy", impressions: 2100, clicks: 89, conversions: 7, spend: 115.7, ctr: 0.042 },
      { keyword: "decorative concrete coating", impressions: 1800, clicks: 74, conversions: 5, spend: 96.2, ctr: 0.041 },
    ],
    deviceBreakdown: [
      { device: "MOBILE", impressions: Math.round(totalImpressions * 0.58), clicks: Math.round(totalClicks * 0.55), spend: Math.round(totalSpend * 0.54 * 100) / 100, ctr: 0.037 },
      { device: "DESKTOP", impressions: Math.round(totalImpressions * 0.32), clicks: Math.round(totalClicks * 0.35), spend: Math.round(totalSpend * 0.36 * 100) / 100, ctr: 0.043 },
      { device: "TABLET", impressions: Math.round(totalImpressions * 0.10), clicks: Math.round(totalClicks * 0.10), spend: Math.round(totalSpend * 0.10 * 100) / 100, ctr: 0.039 },
    ],
    locationBreakdown: [
      { location: "San Francisco, CA", impressions: 12400, clicks: 598, conversions: 45, spend: 777.4 },
      { location: "Oakland, CA", impressions: 8900, clicks: 401, conversions: 31, spend: 521.3 },
      { location: "San Jose, CA", impressions: 7600, clicks: 342, conversions: 26, spend: 444.6 },
      { location: "Sacramento, CA", impressions: 6200, clicks: 279, conversions: 21, spend: 362.7 },
      { location: "Fremont, CA", impressions: 3400, clicks: 153, conversions: 11, spend: 198.9 },
      { location: "Palo Alto, CA", impressions: 2800, clicks: 134, conversions: 10, spend: 174.2 },
    ],
    searchTerms: [
      { searchTerm: "epoxy flooring cost bay area", impressions: 1200, clicks: 89, conversions: 8, spend: 115.7 },
      { searchTerm: "best epoxy floor company near me", impressions: 980, clicks: 72, conversions: 7, spend: 93.6 },
      { searchTerm: "garage floor epoxy coating price", impressions: 870, clicks: 58, conversions: 4, spend: 75.4 },
      { searchTerm: "commercial floor coating contractor", impressions: 760, clicks: 49, conversions: 4, spend: 63.7 },
      { searchTerm: "metallic epoxy flooring san francisco", impressions: 650, clicks: 43, conversions: 3, spend: 55.9 },
      { searchTerm: "industrial epoxy floor installation", impressions: 540, clicks: 35, conversions: 3, spend: 45.5 },
      { searchTerm: "epoxy floor resurfacing", impressions: 480, clicks: 31, conversions: 2, spend: 40.3 },
      { searchTerm: "warehouse floor coating service", impressions: 420, clicks: 27, conversions: 2, spend: 35.1 },
    ],
  };
}

// ── GET  /api/google-ads/analytics ──────────────────────────────────
export async function GET() {
  try {
    const client = await GoogleAdsClient.getClient();

    const startDate = daysAgo(30);
    const endDate = daysAgo(0);

    // ── 1. Summary (last 30 days) ───────────────────────────────────
    const summaryQuery = `
      SELECT
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions_from_interactions_rate
      FROM customer
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    `;

    // ── 2. Daily performance breakdown ──────────────────────────────
    const dailyQuery = `
      SELECT
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros
      FROM customer
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      ORDER BY segments.date ASC
    `;

    // ── 3. Top keywords by clicks ───────────────────────────────────
    const keywordsQuery = `
      SELECT
        ad_group_criterion.keyword.text,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros,
        metrics.ctr
      FROM keyword_view
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND campaign.status != 'REMOVED'
      ORDER BY metrics.clicks DESC
      LIMIT 20
    `;

    // ── 4. Device breakdown ─────────────────────────────────────────
    const deviceQuery = `
      SELECT
        segments.device,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.ctr
      FROM customer
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    `;

    // ── 5. Location breakdown ───────────────────────────────────────
    const locationQuery = `
      SELECT
        campaign_criterion.location.geo_target_constant,
        geographic_view.country_criterion_id,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros
      FROM geographic_view
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND campaign.status != 'REMOVED'
      ORDER BY metrics.clicks DESC
      LIMIT 20
    `;

    // ── 6. Search terms report ──────────────────────────────────────
    const searchTermsQuery = `
      SELECT
        search_term_view.search_term,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros
      FROM search_term_view
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND campaign.status != 'REMOVED'
      ORDER BY metrics.clicks DESC
      LIMIT 20
    `;

    // Execute all queries in parallel
    const [summaryRows, dailyRows, keywordRows, deviceRows, locationRows, searchTermRows] =
      await Promise.all([
        client.search(summaryQuery),
        client.search(dailyQuery),
        client.search(keywordsQuery),
        client.search(deviceQuery),
        client.search(locationQuery),
        client.search(searchTermsQuery),
      ]);

    // ── Transform summary ───────────────────────────────────────────
    // The customer-level query may return a single aggregated row
    const s = summaryRows[0] ?? {};
    const totalSpend = microsToUsd(s.metrics?.costMicros);
    const totalImpressions = Number(s.metrics?.impressions ?? 0);
    const totalClicks = Number(s.metrics?.clicks ?? 0);
    const totalConversions = Number(s.metrics?.conversions ?? 0);

    const summary = {
      totalSpend,
      totalImpressions,
      totalClicks,
      totalConversions,
      ctr: Number(s.metrics?.ctr ?? 0),
      averageCpc: microsToUsd(s.metrics?.averageCpc),
      conversionRate: Number(s.metrics?.conversionsFromInteractionsRate ?? 0),
      costPerConversion: totalConversions > 0 ? totalSpend / totalConversions : 0,
    };

    // ── Transform daily performance ─────────────────────────────────
    const dailyPerformance = dailyRows.map((row: any) => ({
      date: row.segments?.date ?? "",
      impressions: Number(row.metrics?.impressions ?? 0),
      clicks: Number(row.metrics?.clicks ?? 0),
      conversions: Number(row.metrics?.conversions ?? 0),
      spend: microsToUsd(row.metrics?.costMicros),
    }));

    // ── Transform top keywords ──────────────────────────────────────
    const topKeywords = keywordRows.map((row: any) => ({
      keyword: row.adGroupCriterion?.keyword?.text ?? "",
      impressions: Number(row.metrics?.impressions ?? 0),
      clicks: Number(row.metrics?.clicks ?? 0),
      conversions: Number(row.metrics?.conversions ?? 0),
      spend: microsToUsd(row.metrics?.costMicros),
      ctr: Number(row.metrics?.ctr ?? 0),
    }));

    // ── Transform device breakdown ──────────────────────────────────
    const deviceBreakdown = deviceRows.map((row: any) => ({
      device: row.segments?.device ?? "UNKNOWN",
      impressions: Number(row.metrics?.impressions ?? 0),
      clicks: Number(row.metrics?.clicks ?? 0),
      spend: microsToUsd(row.metrics?.costMicros),
      ctr: Number(row.metrics?.ctr ?? 0),
    }));

    // ── Transform location breakdown ────────────────────────────────
    const locationBreakdown = locationRows.map((row: any) => ({
      location: row.campaignCriterion?.location?.geoTargetConstant ?? row.geographicView?.countryCriterionId ?? "Unknown",
      impressions: Number(row.metrics?.impressions ?? 0),
      clicks: Number(row.metrics?.clicks ?? 0),
      conversions: Number(row.metrics?.conversions ?? 0),
      spend: microsToUsd(row.metrics?.costMicros),
    }));

    // ── Transform search terms ──────────────────────────────────────
    const searchTerms = searchTermRows.map((row: any) => ({
      searchTerm: row.searchTermView?.searchTerm ?? "",
      impressions: Number(row.metrics?.impressions ?? 0),
      clicks: Number(row.metrics?.clicks ?? 0),
      conversions: Number(row.metrics?.conversions ?? 0),
      spend: microsToUsd(row.metrics?.costMicros),
    }));

    return NextResponse.json({
      source: "live",
      period: {
        start: `${startDate.slice(0, 4)}-${startDate.slice(4, 6)}-${startDate.slice(6, 8)}`,
        end: `${endDate.slice(0, 4)}-${endDate.slice(4, 6)}-${endDate.slice(6, 8)}`,
        days: 30,
      },
      summary,
      dailyPerformance,
      topKeywords,
      deviceBreakdown,
      locationBreakdown,
      searchTerms,
    });
  } catch (error: any) {
    // If Google Ads isn't connected, return realistic mock data
    const isNotConnected =
      error?.message?.includes("not connected") ||
      error?.message?.includes("GADS_") ||
      error?.message?.includes("token") ||
      error?.message?.includes("credentials") ||
      !process.env.GADS_CUSTOMER_ID;

    if (isNotConnected) {
      return NextResponse.json(getMockAnalytics());
    }

    console.error("[google-ads/analytics GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics", detail: error?.message },
      { status: 500 }
    );
  }
}
