import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = () =>
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function headers(extra?: Record<string, string>) {
  return {
    apikey: serviceKey(),
    Authorization: `Bearer ${serviceKey()}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

// GET /api/marketing/campaigns/[id] - Get single campaign with ad_creatives
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Fetch campaign
    const campaignRes = await fetch(
      `${supabaseUrl()}/rest/v1/marketing_campaigns?id=eq.${id}&select=*`,
      { headers: headers(), cache: "no-store" }
    );

    if (!campaignRes.ok) {
      const errText = await campaignRes.text();
      console.error("GET campaign error:", errText);
      return NextResponse.json(
        { error: "Failed to fetch campaign" },
        { status: 500 }
      );
    }

    const campaigns = await campaignRes.json();
    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    const campaign = campaigns[0];

    // Fetch associated ad_creatives
    const creativesRes = await fetch(
      `${supabaseUrl()}/rest/v1/marketing_ad_creatives?campaign_id=eq.${id}&select=*&order=created_at.desc`,
      { headers: headers(), cache: "no-store" }
    );

    let ad_creatives: any[] = [];
    if (creativesRes.ok) {
      ad_creatives = await creativesRes.json();
    }

    return NextResponse.json({ ...campaign, ad_creatives });
  } catch (error) {
    console.error("GET /api/marketing/campaigns/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaign" },
      { status: 500 }
    );
  }
}

// PATCH /api/marketing/campaigns/[id] - Update campaign fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();

    // Map camelCase to snake_case where needed
    const updates: Record<string, any> = {};
    const fieldMap: Record<string, string> = {
      name: "name",
      platform: "platform",
      status: "status",
      campaignType: "campaign_type",
      campaign_type: "campaign_type",
      budget: "budget",
      dailyBudget: "daily_budget",
      daily_budget: "daily_budget",
      startDate: "start_date",
      start_date: "start_date",
      endDate: "end_date",
      end_date: "end_date",
      targetAudience: "target_audience",
      target_audience: "target_audience",
      targetLocations: "target_locations",
      target_locations: "target_locations",
      keywords: "keywords",
      impressions: "impressions",
      clicks: "clicks",
      conversions: "conversions",
      spend: "spend",
      leadsGenerated: "leads_generated",
      leads_generated: "leads_generated",
      ctr: "ctr",
      cpc: "cpc",
      cpa: "cpa",
      roas: "roas",
      notes: "notes",
    };

    for (const [key, value] of Object.entries(body)) {
      const dbField = fieldMap[key];
      if (dbField && value !== undefined) {
        updates[dbField] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    updates.updated_at = new Date().toISOString();

    const res = await fetch(
      `${supabaseUrl()}/rest/v1/marketing_campaigns?id=eq.${id}`,
      {
        method: "PATCH",
        headers: headers({ Prefer: "return=representation" }),
        body: JSON.stringify(updates),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("PATCH campaign error:", errText);
      return NextResponse.json(
        { error: "Failed to update campaign" },
        { status: 500 }
      );
    }

    const updated = await res.json();
    if (!updated || updated.length === 0) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("PATCH /api/marketing/campaigns/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 }
    );
  }
}

// DELETE /api/marketing/campaigns/[id] - Delete a campaign
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Delete associated ad_creatives first
    await fetch(
      `${supabaseUrl()}/rest/v1/marketing_ad_creatives?campaign_id=eq.${id}`,
      {
        method: "DELETE",
        headers: headers(),
      }
    );

    // Delete the campaign
    const res = await fetch(
      `${supabaseUrl()}/rest/v1/marketing_campaigns?id=eq.${id}`,
      {
        method: "DELETE",
        headers: headers({ Prefer: "return=representation" }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("DELETE campaign error:", errText);
      return NextResponse.json(
        { error: "Failed to delete campaign" },
        { status: 500 }
      );
    }

    const deleted = await res.json();
    if (!deleted || deleted.length === 0) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deleted: deleted[0] });
  } catch (error) {
    console.error("DELETE /api/marketing/campaigns/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete campaign" },
      { status: 500 }
    );
  }
}
