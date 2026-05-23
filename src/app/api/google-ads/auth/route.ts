import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

function getRedirectUri() {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/google-ads/callback`;
  }
  return "https://b2b-leadgen-kappa.vercel.app/api/google-ads/callback";
}

export async function GET() {
  try {
    const clientId = process.env.GADS_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        { error: "GADS_CLIENT_ID not configured" },
        { status: 500 }
      );
    }

    // Generate CSRF state token
    const state = randomBytes(32).toString("hex");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: getRedirectUri(),
      response_type: "code",
      scope: "https://www.googleapis.com/auth/adwords",
      access_type: "offline",
      prompt: "consent",
      state,
    });

    const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;

    // Store state in cookie for CSRF verification on callback
    const response = NextResponse.redirect(authUrl);
    response.cookies.set("gads_oauth_state", state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("GET /api/google-ads/auth error:", error);
    return NextResponse.json(
      { error: "Failed to initiate OAuth flow" },
      { status: 500 }
    );
  }
}
