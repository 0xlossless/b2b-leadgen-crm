import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// CORS headers — allow any website to send tracking data
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

function parseUserAgent(ua: string): {
  browser: string;
  os: string;
  deviceType: string;
} {
  let browser = "Other";
  let os = "Other";
  let deviceType = "desktop";

  // Browser detection
  if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";

  // OS detection
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Linux")) os = "Linux";

  // Device type
  if (ua.includes("Mobile") || ua.includes("Android")) deviceType = "mobile";
  else if (ua.includes("iPad") || ua.includes("Tablet")) deviceType = "tablet";

  return { browser, os, deviceType };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sessionId,
      pagePath,
      pageTitle,
      referrer,
      screenWidth,
      screenHeight,
      durationSeconds,
      isBounce,
      utmSource,
      utmMedium,
      utmCampaign,
    } = body;

    if (!sessionId || !pagePath) {
      return NextResponse.json(
        { error: "sessionId and pagePath required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const userAgent = req.headers.get("user-agent") || "";
    const { browser, os, deviceType } = parseUserAgent(userAgent);

    // If durationSeconds is provided, this is an UPDATE (page unload / session ending)
    if (durationSeconds !== undefined && durationSeconds > 0) {
      const { error } = await supabase
        .from("page_views")
        .update({
          duration_seconds: durationSeconds,
          is_bounce: isBounce ?? false,
        })
        .eq("session_id", sessionId)
        .eq("page_path", pagePath)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Track update error:", error);
      }
      return NextResponse.json({ ok: true }, { headers: corsHeaders });
    }

    // INSERT new page view
    const { error } = await supabase.from("page_views").insert({
      session_id: sessionId,
      page_path: pagePath,
      page_title: pageTitle || null,
      referrer: referrer || null,
      user_agent: userAgent,
      screen_width: screenWidth || null,
      screen_height: screenHeight || null,
      device_type: deviceType,
      browser,
      os,
      utm_source: utmSource || null,
      utm_medium: utmMedium || null,
      utm_campaign: utmCampaign || null,
    });

    if (error) {
      console.error("Track insert error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ ok: true }, { headers: corsHeaders });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: msg },
      { status: 500, headers: corsHeaders }
    );
  }
}
