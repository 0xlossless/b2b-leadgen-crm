import { NextRequest, NextResponse } from "next/server";
import { GoogleAdsClient } from "@/lib/google-ads";

export const dynamic = "force-dynamic";

// ── helpers ──────────────────────────────────────────────────────────
function microsToUsd(micros: number | string | null | undefined): number {
  if (micros == null) return 0;
  return Number(micros) / 1_000_000;
}

function customerId(): string {
  return (process.env.GADS_CUSTOMER_ID ?? "").replace(/-/g, "");
}

type RouteContext = { params: Promise<{ id: string }> };

// ── GET  /api/google-ads/campaigns/[id] ─────────────────────────────
export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const client = await GoogleAdsClient.getClient();

    // Campaign details
    const campaignQuery = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign.start_date,
        campaign.end_date,
        campaign_budget.amount_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros,
        metrics.ctr,
        metrics.average_cpc,
        metrics.average_cpm,
        metrics.conversion_rate
      FROM campaign
      WHERE campaign.id = ${id}
    `;

    // Ad groups under this campaign
    const adGroupQuery = `
      SELECT
        ad_group.id,
        ad_group.name,
        ad_group.status,
        ad_group.cpc_bid_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros
      FROM ad_group
      WHERE campaign.id = ${id}
      ORDER BY metrics.clicks DESC
    `;

    // Keywords under this campaign
    const keywordQuery = `
      SELECT
        ad_group_criterion.criterion_id,
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        ad_group_criterion.status,
        ad_group.name,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros,
        metrics.ctr,
        metrics.average_cpc
      FROM keyword_view
      WHERE campaign.id = ${id}
      ORDER BY metrics.clicks DESC
    `;

    // Ads under this campaign
    const adQuery = `
      SELECT
        ad_group_ad.ad.id,
        ad_group_ad.ad.responsive_search_ad.headlines,
        ad_group_ad.ad.responsive_search_ad.descriptions,
        ad_group_ad.ad.final_urls,
        ad_group_ad.status,
        ad_group.name,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros,
        metrics.ctr
      FROM ad_group_ad
      WHERE campaign.id = ${id}
      ORDER BY metrics.impressions DESC
    `;

    const [campaignRows, adGroupRows, keywordRows, adRows] = await Promise.all(
      [
        client.search(campaignQuery),
        client.search(adGroupQuery),
        client.search(keywordQuery),
        client.search(adQuery),
      ]
    );

    if (!campaignRows || campaignRows.length === 0) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    const c = campaignRows[0];
    const campaign = {
      id: c.campaign?.id,
      name: c.campaign?.name,
      status: c.campaign?.status,
      type: c.campaign?.advertisingChannelType,
      startDate: c.campaign?.startDate,
      endDate: c.campaign?.endDate,
      budget: microsToUsd(c.campaignBudget?.amountMicros),
      spend: microsToUsd(c.metrics?.costMicros),
      impressions: Number(c.metrics?.impressions ?? 0),
      clicks: Number(c.metrics?.clicks ?? 0),
      conversions: Number(c.metrics?.conversions ?? 0),
      ctr: Number(c.metrics?.ctr ?? 0),
      cpc: microsToUsd(c.metrics?.averageCpc),
      cpm: microsToUsd(c.metrics?.averageCpm),
      conversionRate: Number(c.metrics?.conversionRate ?? 0),
    };

    const adGroups = adGroupRows.map((row: any) => ({
      id: row.adGroup?.id,
      name: row.adGroup?.name,
      status: row.adGroup?.status,
      cpcBid: microsToUsd(row.adGroup?.cpcBidMicros),
      impressions: Number(row.metrics?.impressions ?? 0),
      clicks: Number(row.metrics?.clicks ?? 0),
      conversions: Number(row.metrics?.conversions ?? 0),
      spend: microsToUsd(row.metrics?.costMicros),
    }));

    const keywords = keywordRows.map((row: any) => ({
      id: row.adGroupCriterion?.criterionId,
      text: row.adGroupCriterion?.keyword?.text,
      matchType: row.adGroupCriterion?.keyword?.matchType,
      status: row.adGroupCriterion?.status,
      adGroup: row.adGroup?.name,
      impressions: Number(row.metrics?.impressions ?? 0),
      clicks: Number(row.metrics?.clicks ?? 0),
      conversions: Number(row.metrics?.conversions ?? 0),
      spend: microsToUsd(row.metrics?.costMicros),
      ctr: Number(row.metrics?.ctr ?? 0),
      cpc: microsToUsd(row.metrics?.averageCpc),
    }));

    const ads = adRows.map((row: any) => ({
      id: row.adGroupAd?.ad?.id,
      headlines:
        row.adGroupAd?.ad?.responsiveSearchAd?.headlines?.map(
          (h: any) => h.text
        ) ?? [],
      descriptions:
        row.adGroupAd?.ad?.responsiveSearchAd?.descriptions?.map(
          (d: any) => d.text
        ) ?? [],
      finalUrls: row.adGroupAd?.ad?.finalUrls ?? [],
      status: row.adGroupAd?.status,
      adGroup: row.adGroup?.name,
      impressions: Number(row.metrics?.impressions ?? 0),
      clicks: Number(row.metrics?.clicks ?? 0),
      conversions: Number(row.metrics?.conversions ?? 0),
      spend: microsToUsd(row.metrics?.costMicros),
      ctr: Number(row.metrics?.ctr ?? 0),
    }));

    return NextResponse.json({ campaign, adGroups, keywords, ads });
  } catch (error: any) {
    const isNotConnected =
      error?.message?.includes("not connected") ||
      error?.message?.includes("GADS_") ||
      !process.env.GADS_CUSTOMER_ID;

    if (isNotConnected) {
      return NextResponse.json(
        {
          error: "Google Ads account is not connected",
          message: "Connect your Google Ads account to view campaign details.",
        },
        { status: 422 }
      );
    }

    console.error(`[google-ads/campaigns/${id} GET]`, error);
    return NextResponse.json(
      { error: "Failed to fetch campaign details", detail: error?.message },
      { status: 500 }
    );
  }
}

// ── PATCH  /api/google-ads/campaigns/[id] ───────────────────────────
export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = await req.json();
    const { status, budget } = body;

    if (!status && budget == null) {
      return NextResponse.json(
        { error: "Provide at least status or budget to update" },
        { status: 400 }
      );
    }

    const client = await GoogleAdsClient.getClient();
    const cid = customerId();
    const mutateOperations: any[] = [];

    // Update campaign status
    if (status) {
      if (!["ENABLED", "PAUSED"].includes(status)) {
        return NextResponse.json(
          { error: "status must be ENABLED or PAUSED" },
          { status: 400 }
        );
      }

      mutateOperations.push({
        campaignOperation: {
          updateMask: "status",
          update: {
            resourceName: `customers/${cid}/campaigns/${id}`,
            status,
          },
        },
      });
    }

    // Update campaign budget
    if (budget != null) {
      // First, look up the campaign's budget resource name
      const budgetQuery = `
        SELECT campaign_budget.resource_name
        FROM campaign
        WHERE campaign.id = ${id}
        LIMIT 1
      `;
      const budgetRows = await client.search(budgetQuery);

      if (!budgetRows || budgetRows.length === 0) {
        return NextResponse.json(
          { error: "Campaign not found" },
          { status: 404 }
        );
      }

      const budgetResourceName = budgetRows[0].campaignBudget?.resourceName;
      if (budgetResourceName) {
        mutateOperations.push({
          campaignBudgetOperation: {
            updateMask: "amount_micros",
            update: {
              resourceName: budgetResourceName,
              amountMicros: Math.round(budget * 1_000_000).toString(),
            },
          },
        });
      }
    }

    const result = await client.mutate(mutateOperations);

    return NextResponse.json({
      success: true,
      updated: { id, status, budget },
      mutateResult: result,
    });
  } catch (error: any) {
    const isNotConnected =
      error?.message?.includes("not connected") ||
      error?.message?.includes("GADS_") ||
      !process.env.GADS_CUSTOMER_ID;

    if (isNotConnected) {
      return NextResponse.json(
        {
          error: "Google Ads account is not connected",
          message: "Connect your Google Ads account to update campaigns.",
        },
        { status: 422 }
      );
    }

    console.error(`[google-ads/campaigns/${id} PATCH]`, error);
    return NextResponse.json(
      { error: "Failed to update campaign", detail: error?.message },
      { status: 500 }
    );
  }
}

// ── DELETE  /api/google-ads/campaigns/[id] ──────────────────────────
export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const client = await GoogleAdsClient.getClient();
    const cid = customerId();

    const result = await client.mutate([
      {
        campaignOperation: {
          updateMask: "status",
          update: {
            resourceName: `customers/${cid}/campaigns/${id}`,
            status: "REMOVED",
          },
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      message: `Campaign ${id} has been removed`,
      mutateResult: result,
    });
  } catch (error: any) {
    const isNotConnected =
      error?.message?.includes("not connected") ||
      error?.message?.includes("GADS_") ||
      !process.env.GADS_CUSTOMER_ID;

    if (isNotConnected) {
      return NextResponse.json(
        {
          error: "Google Ads account is not connected",
          message: "Connect your Google Ads account to remove campaigns.",
        },
        { status: 422 }
      );
    }

    console.error(`[google-ads/campaigns/${id} DELETE]`, error);
    return NextResponse.json(
      { error: "Failed to remove campaign", detail: error?.message },
      { status: 500 }
    );
  }
}
