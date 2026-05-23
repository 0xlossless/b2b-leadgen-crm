import { NextRequest, NextResponse } from "next/server";
import { ulid } from "ulid";

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

async function supaFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${supabaseUrl()}/rest/v1/${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      ...headers(),
      ...(init?.headers ?? {}),
    },
  });
  return res;
}

// GET /api/marketing/campaigns - List all campaigns
export async function GET() {
  try {
    const res = await supaFetch(
      "marketing_campaigns?select=*&order=created_at.desc"
    );
    if (!res.ok) {
      const errText = await res.text();
      console.error("GET campaigns error:", errText);
      return NextResponse.json(
        { error: "Failed to fetch campaigns" },
        { status: 500 }
      );
    }
    const campaigns = await res.json();
    return NextResponse.json(campaigns);
  } catch (error) {
    console.error("GET /api/marketing/campaigns error:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

// POST /api/marketing/campaigns - Create a new campaign
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const now = new Date().toISOString();

    const campaign = {
      id: ulid(),
      name: body.name,
      platform: body.platform || "google_ads",
      status: body.status || "draft",
      campaign_type: body.campaign_type || body.campaignType || "search",
      budget: body.budget || 0,
      daily_budget: body.daily_budget || body.dailyBudget || 0,
      start_date: body.start_date || body.startDate || null,
      end_date: body.end_date || body.endDate || null,
      target_audience: body.target_audience || body.targetAudience || null,
      target_locations:
        body.target_locations || body.targetLocations || null,
      keywords: body.keywords || null,
      impressions: body.impressions || 0,
      clicks: body.clicks || 0,
      conversions: body.conversions || 0,
      spend: body.spend || 0,
      leads_generated: body.leads_generated || body.leadsGenerated || 0,
      ctr: body.ctr || 0,
      cpc: body.cpc || 0,
      cpa: body.cpa || 0,
      roas: body.roas || 0,
      notes: body.notes || null,
      created_at: now,
      updated_at: now,
    };

    const res = await supaFetch("marketing_campaigns", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(campaign),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("POST campaign error:", errText);
      return NextResponse.json(
        { error: "Failed to create campaign", details: errText },
        { status: 500 }
      );
    }

    const created = await res.json();
    return NextResponse.json(created?.[0] || campaign, { status: 201 });
  } catch (error) {
    console.error("POST /api/marketing/campaigns error:", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}
