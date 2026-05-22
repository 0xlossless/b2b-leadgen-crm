import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// POST /api/wipe — Wipe all CRM data for a fresh start
// Requires confirmation header: x-confirm: WIPE_ALL_DATA
export async function POST(request: NextRequest) {
  const confirm = request.headers.get("x-confirm");
  if (confirm !== "WIPE_ALL_DATA") {
    return NextResponse.json(
      { error: "Missing confirmation header: x-confirm: WIPE_ALL_DATA" },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabase();
    const results: Record<string, string> = {};

    // Delete in order (respecting foreign keys)
    const tables = ["activities", "lead_scores", "deals", "contacts", "leads"];

    for (const table of tables) {
      // Count first
      const { count } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });

      // Delete all rows (neq on id with empty string matches all)
      const { error } = await supabase
        .from(table)
        .delete()
        .neq("id", "");

      if (error) {
        results[table] = `ERROR: ${error.message}`;
      } else {
        results[table] = `Deleted ${count || 0} rows`;
      }
    }

    return NextResponse.json({
      success: true,
      message: "CRM wiped clean! Fresh start.",
      results,
    });
  } catch (error) {
    console.error("POST /api/wipe error:", error);
    return NextResponse.json(
      { error: "Failed to wipe data" },
      { status: 500 }
    );
  }
}
