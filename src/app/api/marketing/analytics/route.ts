import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = () =>
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function supaFetch(path: string) {
  const res = await fetch(`${supabaseUrl()}/rest/v1/${path}`, {
    headers: {
      apikey: serviceKey(),
      Authorization: `Bearer ${serviceKey()}`,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase fetch failed: ${res.status} ${text}`);
  }
  return res.json();
}

// GET /api/marketing/analytics - Marketing analytics summary
export async function GET() {
  try {
    // Fetch all campaigns
    const campaigns: any[] = await supaFetch(
      "marketing_campaigns?select=*&order=created_at.desc"
    );

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({
        total_spend: 0,
        total_impressions: 0,
        total_clicks: 0,
        total_conversions: 0,
        total_leads: 0,
        overall_ctr: 0,
        overall_cpc: 0,
        overall_conversion_rate: 0,
        spend_by_platform: {},
        performance_by_campaign: [],
        monthly_spend_trend: [],
        roi_estimate: 0,
      });
    }

    // Aggregate totals
    let total_spend = 0;
    let total_impressions = 0;
    let total_clicks = 0;
    let total_conversions = 0;
    let total_leads = 0;

    const platformSpend: Record<string, { spend: number; impressions: number; clicks: number; conversions: number; leads: number }> = {};
    const monthlySpend: Record<string, number> = {};

    for (const c of campaigns) {
      const spend = Number(c.spend) || 0;
      const impressions = Number(c.impressions) || 0;
      const clicks = Number(c.clicks) || 0;
      const conversions = Number(c.conversions) || 0;
      const leads = Number(c.leads_generated) || 0;

      total_spend += spend;
      total_impressions += impressions;
      total_clicks += clicks;
      total_conversions += conversions;
      total_leads += leads;

      // Group by platform
      const platform = c.platform || "unknown";
      if (!platformSpend[platform]) {
        platformSpend[platform] = { spend: 0, impressions: 0, clicks: 0, conversions: 0, leads: 0 };
      }
      platformSpend[platform].spend += spend;
      platformSpend[platform].impressions += impressions;
      platformSpend[platform].clicks += clicks;
      platformSpend[platform].conversions += conversions;
      platformSpend[platform].leads += leads;

      // Monthly trend - group by YYYY-MM from created_at
      if (c.created_at) {
        const month = c.created_at.substring(0, 7); // "YYYY-MM"
        monthlySpend[month] = (monthlySpend[month] || 0) + spend;
      }
    }

    // Calculate rates
    const overall_ctr = total_impressions > 0
      ? Number(((total_clicks / total_impressions) * 100).toFixed(2))
      : 0;
    const overall_cpc = total_clicks > 0
      ? Number((total_spend / total_clicks).toFixed(2))
      : 0;
    const overall_conversion_rate = total_clicks > 0
      ? Number(((total_conversions / total_clicks) * 100).toFixed(2))
      : 0;

    // Top 10 campaigns by impressions
    const performance_by_campaign = [...campaigns]
      .sort((a, b) => (Number(b.impressions) || 0) - (Number(a.impressions) || 0))
      .slice(0, 10)
      .map((c) => ({
        id: c.id,
        name: c.name,
        platform: c.platform,
        status: c.status,
        impressions: Number(c.impressions) || 0,
        clicks: Number(c.clicks) || 0,
        conversions: Number(c.conversions) || 0,
        spend: Number(c.spend) || 0,
        leads_generated: Number(c.leads_generated) || 0,
        ctr: Number(c.impressions) > 0
          ? Number(((Number(c.clicks) / Number(c.impressions)) * 100).toFixed(2))
          : 0,
        cpc: Number(c.clicks) > 0
          ? Number((Number(c.spend) / Number(c.clicks)).toFixed(2))
          : 0,
      }));

    // Spend by platform (enriched with rates)
    const spend_by_platform: Record<string, any> = {};
    for (const [platform, data] of Object.entries(platformSpend)) {
      spend_by_platform[platform] = {
        ...data,
        ctr: data.impressions > 0
          ? Number(((data.clicks / data.impressions) * 100).toFixed(2))
          : 0,
        cpc: data.clicks > 0
          ? Number((data.spend / data.clicks).toFixed(2))
          : 0,
      };
    }

    // Monthly spend trend - last 6 months
    const sortedMonths = Object.keys(monthlySpend).sort().slice(-6);
    const monthly_spend_trend = sortedMonths.map((month) => ({
      month,
      spend: monthlySpend[month],
    }));

    // ROI estimate: (conversions * avg_deal_value) / total_spend
    // Fetch average deal value from deals table
    let avg_deal_value = 5000; // default fallback
    try {
      const deals: any[] = await supaFetch(
        "deals?select=deal_value&deal_value=gt.0"
      );
      if (deals && deals.length > 0) {
        const totalDealValue = deals.reduce(
          (sum: number, d: any) => sum + (Number(d.deal_value) || 0),
          0
        );
        avg_deal_value = totalDealValue / deals.length;
      }
    } catch {
      // Use default avg_deal_value
    }

    const roi_estimate = total_spend > 0
      ? Number(
          (((total_conversions * avg_deal_value) / total_spend) * 100).toFixed(2)
        )
      : 0;

    return NextResponse.json({
      total_spend: Number(total_spend.toFixed(2)),
      total_impressions,
      total_clicks,
      total_conversions,
      total_leads,
      overall_ctr,
      overall_cpc,
      overall_conversion_rate,
      spend_by_platform,
      performance_by_campaign,
      monthly_spend_trend,
      roi_estimate,
      avg_deal_value: Number(avg_deal_value.toFixed(2)),
      campaign_count: campaigns.length,
    });
  } catch (error) {
    console.error("GET /api/marketing/analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch marketing analytics" },
      { status: 500 }
    );
  }
}
