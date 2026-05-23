import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

async function supaFetch(path: string, options: RequestInit = {}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });
  return res;
}

/**
 * GET: Check if Google Ads is connected (tokens exist)
 */
export async function GET() {
  try {
    const res = await supaFetch(
      "google_ads_tokens?select=customer_id,expires_at,refresh_token&limit=1"
    );
    const rows = await res.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ connected: false, customerId: null });
    }

    const token = rows[0];

    // If a refresh_token exists, we're connected — the POST handler
    // will refresh the access_token when needed, so expiry doesn't matter here.
    const hasRefreshToken = !!token.refresh_token;

    return NextResponse.json({
      connected: hasRefreshToken,
      customerId: token.customer_id || process.env.GADS_CUSTOMER_ID || null,
    });
  } catch (error) {
    console.error("GET /api/google-ads/token error:", error);
    return NextResponse.json(
      { error: "Failed to check connection status" },
      { status: 500 }
    );
  }
}

/**
 * POST: Refresh the access token using the stored refresh_token
 */
export async function POST() {
  try {
    // Get stored tokens
    const res = await supaFetch(
      "google_ads_tokens?select=*&limit=1"
    );
    const rows = await res.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "No Google Ads tokens found. Please connect first." },
        { status: 404 }
      );
    }

    const stored = rows[0];

    // Check if token is still valid (with 5-minute buffer)
    const expiresAt = new Date(stored.expires_at).getTime();
    const now = Date.now();
    if (expiresAt - now > 5 * 60 * 1000) {
      // Token is still valid
      return NextResponse.json({
        access_token: stored.access_token,
        expires_at: stored.expires_at,
      });
    }

    // Refresh the token
    const refreshResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GADS_CLIENT_ID!,
        client_secret: process.env.GADS_CLIENT_SECRET!,
        refresh_token: stored.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!refreshResponse.ok) {
      const errBody = await refreshResponse.text();
      console.error("Token refresh failed:", errBody);
      return NextResponse.json(
        { error: "Failed to refresh token" },
        { status: 401 }
      );
    }

    const newTokens = await refreshResponse.json();
    const newExpiresAt = new Date(
      Date.now() + (newTokens.expires_in || 3600) * 1000
    ).toISOString();

    // Update tokens in Supabase
    await supaFetch(`google_ads_tokens?id=eq.${stored.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        access_token: newTokens.access_token,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      }),
    });

    return NextResponse.json({
      access_token: newTokens.access_token,
      expires_at: newExpiresAt,
    });
  } catch (error) {
    console.error("POST /api/google-ads/token error:", error);
    return NextResponse.json(
      { error: "Failed to refresh token" },
      { status: 500 }
    );
  }
}
