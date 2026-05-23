import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

function getRedirectUri() {
  return "https://b2b-leadgen-kappa.vercel.app/api/google-ads/callback";
}

function getBaseUrl() {
  return "https://b2b-leadgen-kappa.vercel.app";
}

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Check for OAuth errors
    if (error) {
      console.error("Google OAuth error:", error);
      return NextResponse.redirect(
        `${getBaseUrl()}/marketing?error=auth_failed&reason=${error}`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${getBaseUrl()}/marketing?error=auth_failed&reason=no_code`
      );
    }

    // Verify CSRF state
    const storedState = request.cookies.get("gads_oauth_state")?.value;
    if (!state || !storedState || state !== storedState) {
      console.error("OAuth state mismatch - possible CSRF attack");
      return NextResponse.redirect(
        `${getBaseUrl()}/marketing?error=auth_failed&reason=state_mismatch`
      );
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GADS_CLIENT_ID!,
        client_secret: process.env.GADS_CLIENT_SECRET!,
        redirect_uri: getRedirectUri(),
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      console.error("Token exchange failed:", errBody);
      return NextResponse.redirect(
        `${getBaseUrl()}/marketing?error=auth_failed&reason=token_exchange`
      );
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;

    if (!access_token || !refresh_token) {
      console.error("Missing tokens in response:", tokens);
      return NextResponse.redirect(
        `${getBaseUrl()}/marketing?error=auth_failed&reason=missing_tokens`
      );
    }

    // Calculate expiration time
    const expiresAt = new Date(
      Date.now() + (expires_in || 3600) * 1000
    ).toISOString();

    // Get customer ID from env (can be updated later)
    const customerId = process.env.GADS_CUSTOMER_ID || null;

    // Upsert tokens in Supabase - first check if a row exists
    const existingRes = await supaFetch(
      "google_ads_tokens?select=id&limit=1"
    );
    const existing = await existingRes.json();

    if (Array.isArray(existing) && existing.length > 0) {
      // Update existing row
      await supaFetch(`google_ads_tokens?id=eq.${existing[0].id}`, {
        method: "PATCH",
        body: JSON.stringify({
          access_token,
          refresh_token,
          expires_at: expiresAt,
          customer_id: customerId,
          updated_at: new Date().toISOString(),
        }),
      });
    } else {
      // Insert new row
      await supaFetch("google_ads_tokens", {
        method: "POST",
        body: JSON.stringify({
          access_token,
          refresh_token,
          expires_at: expiresAt,
          customer_id: customerId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    }

    // Clear the CSRF cookie and redirect to success
    const response = NextResponse.redirect(
      `${getBaseUrl()}/marketing?connected=true`
    );
    response.cookies.delete("gads_oauth_state");

    return response;
  } catch (error) {
    console.error("GET /api/google-ads/callback error:", error);
    return NextResponse.redirect(
      `${getBaseUrl()}/marketing?error=auth_failed&reason=server_error`
    );
  }
}
