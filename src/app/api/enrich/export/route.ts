import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// GET: Return leads that need email enrichment with their websites
export async function GET() {
  try {
    const supabase = getSupabase();

    // Get all leads with websites
    const { data: leads, error } = await supabase
      .from("leads")
      .select("id, company_name, website, contacts(id, email, email_verified)")
      .not("website", "is", null)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Filter to leads needing enrichment (no email or fake/placeholder email)
    const fakeDomains = ["mailservice.com", "domain.com", "email.com"];
    const fakeEmails = ["user@domain.com", "your@email.com", "mymail@mailservice.com", "admin@admin.com"];

    const needsEnrichment = (leads || []).filter(lead => {
      const contacts = lead.contacts || [];
      if (contacts.length === 0) return true;
      const email = contacts[0]?.email;
      if (!email) return true;
      if (fakeEmails.includes(email.toLowerCase())) return true;
      if (fakeDomains.some(d => email.toLowerCase().endsWith("@" + d))) return true;
      return false;
    }).map(l => ({
      id: l.id,
      company: l.company_name,
      website: l.website,
      contactId: l.contacts?.[0]?.id || null,
    }));

    return NextResponse.json({
      total: leads?.length || 0,
      needsEnrichment: needsEnrichment.length,
      leads: needsEnrichment,
      // Include supabase config so local script can push results back
      config: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        key: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
    });
  } catch (error) {
    console.error("GET /api/enrich/export error:", error);
    return NextResponse.json({ error: "Failed to export leads" }, { status: 500 });
  }
}
