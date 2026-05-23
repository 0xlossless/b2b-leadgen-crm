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

// ── Empty analytics returned when Google Ads is not connected ──────
function getEmptyAnalytics() {
  return {
    source: "not_connected" as const,
    message: "Google Ads is not connected. Connect your account in Settings to see analytics.",
    period: { start: "", end: "", days: 0 },
    summary: {
      totalSpend: 0,
      totalImpressions: 0,
      totalClicks: 0,
      totalConversions: 0,
      ctr: 0,
      averageCpc: 0,
      conversionRate: 0,
      costPerConversion: 0,
    },
    dailyPerformance: [],
    topKeywords: [],
    deviceBreakdown: [],
    locationBreakdown: [],
    searchTerms: [],
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
      return NextResponse.json(getEmptyAnalytics());
    }

    console.error("[google-ads/analytics GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics", detail: error?.message },
      { status: 500 }
    );
  }
}
