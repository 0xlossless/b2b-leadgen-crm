import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = () =>
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// DELETE /api/marketing/campaigns/purge - Delete ALL marketing campaigns
export async function DELETE() {
  try {
    // Supabase REST API: DELETE with a filter that matches all rows
    // Using "id=not.is.null" to match every row
    const res = await fetch(
      `${supabaseUrl()}/rest/v1/marketing_campaigns?id=not.is.null`,
      {
        method: "DELETE",
        headers: {
          apikey: serviceKey(),
          Authorization: `Bearer ${serviceKey()}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("Purge campaigns error:", errText);
      return NextResponse.json(
        { error: "Failed to purge campaigns", details: errText },
        { status: 500 }
      );
    }

    const deleted = await res.json();
    return NextResponse.json({
      success: true,
      message: `Deleted ${deleted.length} campaigns`,
      deleted,
    });
  } catch (error) {
    console.error("DELETE /api/marketing/campaigns/purge error:", error);
    return NextResponse.json(
      { error: "Failed to purge campaigns" },
      { status: 500 }
    );
  }
}
