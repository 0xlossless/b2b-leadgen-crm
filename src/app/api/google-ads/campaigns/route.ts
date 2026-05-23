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

// ── Empty fallback when Google Ads is not connected ─────────────

// ── GET  /api/google-ads/campaigns ──────────────────────────────────
export async function GET() {
  try {
    const client = await GoogleAdsClient.getClient();

    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign_budget.amount_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros,
        metrics.ctr,
        metrics.average_cpc
      FROM campaign
      WHERE campaign.status != 'REMOVED'
      ORDER BY metrics.impressions DESC
    `;

    const rows = await client.search(query);

    const campaigns = rows.map((row: any) => ({
      id: row.campaign?.id ?? "",
      name: row.campaign?.name ?? "",
      status: row.campaign?.status ?? "UNKNOWN",
      type: row.campaign?.advertisingChannelType ?? "SEARCH",
      budget: microsToUsd(row.campaignBudget?.amountMicros),
      spend: microsToUsd(row.metrics?.costMicros),
      impressions: Number(row.metrics?.impressions ?? 0),
      clicks: Number(row.metrics?.clicks ?? 0),
      conversions: Number(row.metrics?.conversions ?? 0),
      ctr: Number(row.metrics?.ctr ?? 0),
      cpc: microsToUsd(row.metrics?.averageCpc),
    }));

    return NextResponse.json({ campaigns, source: "live" });
  } catch (error: any) {
    // If Google Ads isn't connected, return mock data so the UI still works
    const isNotConnected =
      error?.message?.includes("not connected") ||
      error?.message?.includes("GADS_") ||
      error?.message?.includes("token") ||
      error?.message?.includes("credentials") ||
      !process.env.GADS_CUSTOMER_ID;

    if (isNotConnected) {
      return NextResponse.json({
        campaigns: [],
        source: "not_connected",
        message: "Google Ads is not connected. Connect your account in Settings to see campaigns.",
      });
    }

    console.error("[google-ads/campaigns GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns", detail: error?.message },
      { status: 500 }
    );
  }
}

// ── POST  /api/google-ads/campaigns ─────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      budgetAmountPerDay,
      startDate,
      endDate,
      targetLocations,
      keywords,
      adHeadlines,
      adDescriptions,
      finalUrl,
    } = body;

    if (!name || !budgetAmountPerDay) {
      return NextResponse.json(
        { error: "name and budgetAmountPerDay are required" },
        { status: 400 }
      );
    }

    const client = await GoogleAdsClient.getClient();
    const cid = customerId();

    // ── Temporary resource name references (negative IDs for batched ops)
    const budgetTempId = "-1";
    const campaignTempId = "-2";
    const adGroupTempId = "-3";

    const budgetMicros = Math.round((budgetAmountPerDay ?? 50) * 1_000_000);

    // ── Build mutate operations ─────────────────────────────────────
    const mutateOperations: any[] = [];

    // 1. Campaign budget
    mutateOperations.push({
      campaignBudgetOperation: {
        create: {
          resourceName: `customers/${cid}/campaignBudgets/${budgetTempId}`,
          name: `${name} Budget`,
          amountMicros: budgetMicros.toString(),
          deliveryMethod: "STANDARD",
          explicitlyShared: false,
        },
      },
    });

    // 2. Campaign
    const campaignResource: any = {
      resourceName: `customers/${cid}/campaigns/${campaignTempId}`,
      name,
      status: "PAUSED",
      advertisingChannelType: "SEARCH",
      campaignBudget: `customers/${cid}/campaignBudgets/${budgetTempId}`,
      networkSettings: {
        targetGoogleSearch: true,
        targetSearchNetwork: true,
        targetContentNetwork: false,
        targetPartnerSearchNetwork: false,
      },
      manualCpc: {
        enhancedCpcEnabled: true,
      },
    };

    if (startDate) {
      campaignResource.startDate = startDate.replace(/-/g, ""); // YYYYMMDD
    }
    if (endDate) {
      campaignResource.endDate = endDate.replace(/-/g, "");
    }

    mutateOperations.push({
      campaignOperation: {
        create: campaignResource,
      },
    });

    // 3. Ad group
    mutateOperations.push({
      adGroupOperation: {
        create: {
          resourceName: `customers/${cid}/adGroups/${adGroupTempId}`,
          name: `${name} – Ad Group 1`,
          campaign: `customers/${cid}/campaigns/${campaignTempId}`,
          status: "ENABLED",
          type: "SEARCH_STANDARD",
          cpcBidMicros: "2000000", // $2.00 default bid
        },
      },
    });

    // 4. Keywords
    if (keywords && keywords.length > 0) {
      let kwTempCounter = -100;
      for (const kw of keywords) {
        const keyword = typeof kw === "string" ? kw : kw.text;
        const matchType =
          typeof kw === "string" ? "BROAD" : kw.matchType ?? "BROAD";

        mutateOperations.push({
          adGroupCriterionOperation: {
            create: {
              resourceName: `customers/${cid}/adGroupCriteria/${adGroupTempId}~${kwTempCounter}`,
              adGroup: `customers/${cid}/adGroups/${adGroupTempId}`,
              status: "ENABLED",
              keyword: {
                text: keyword,
                matchType,
              },
            },
          },
        });
        kwTempCounter--;
      }
    }

    // 5. Responsive Search Ad
    if (adHeadlines && adHeadlines.length > 0) {
      const headlines = adHeadlines.slice(0, 15).map((h: string) => ({
        text: h,
      }));
      const descriptions = (adDescriptions ?? [])
        .slice(0, 4)
        .map((d: string) => ({ text: d }));

      mutateOperations.push({
        adGroupAdOperation: {
          create: {
            adGroup: `customers/${cid}/adGroups/${adGroupTempId}`,
            status: "ENABLED",
            ad: {
              responsiveSearchAd: {
                headlines,
                descriptions,
              },
              finalUrls: [finalUrl ?? "https://example.com"],
            },
          },
        },
      });
    }

    // 6. Location targeting (campaign criteria)
    if (targetLocations && targetLocations.length > 0) {
      for (const loc of targetLocations) {
        // loc can be a geo target constant ID (e.g., 1014221 for San Francisco)
        const geoTargetId = typeof loc === "string" ? loc : loc.id;
        mutateOperations.push({
          campaignCriterionOperation: {
            create: {
              campaign: `customers/${cid}/campaigns/${campaignTempId}`,
              location: {
                geoTargetConstant: `geoTargetConstants/${geoTargetId}`,
              },
            },
          },
        });
      }
    }

    const result = await client.mutate(mutateOperations);

    return NextResponse.json(
      {
        success: true,
        campaign: {
          name,
          status: "PAUSED",
          budget: budgetAmountPerDay,
          keywords: keywords?.length ?? 0,
          headlines: adHeadlines?.length ?? 0,
        },
        mutateResult: result,
      },
      { status: 201 }
    );
  } catch (error: any) {
    // If not connected, return a helpful error instead of crashing
    const isNotConnected =
      error?.message?.includes("not connected") ||
      error?.message?.includes("GADS_") ||
      !process.env.GADS_CUSTOMER_ID;

    if (isNotConnected) {
      return NextResponse.json(
        {
          error: "Google Ads account is not connected",
          message:
            "Connect your Google Ads account in Settings to create live campaigns.",
        },
        { status: 422 }
      );
    }

    console.error("[google-ads/campaigns POST]", error);
    return NextResponse.json(
      { error: "Failed to create campaign", detail: error?.message },
      { status: 500 }
    );
  }
}
