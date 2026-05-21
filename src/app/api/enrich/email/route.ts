import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ulid } from "ulid";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min max for Vercel

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── Email extraction patterns ───────────────────────────
const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

// Domains to ignore (not real business emails)
const IGNORE_DOMAINS = new Set([
  "example.com", "sentry.io", "wixpress.com", "wordpress.com",
  "gravatar.com", "googleapis.com", "w3.org", "schema.org",
  "googleusercontent.com", "gstatic.com", "facebook.com",
  "twitter.com", "instagram.com", "youtube.com", "cloudflare.com",
  "cloudfront.net", "amazonaws.com", "jquery.com", "bootstrapcdn.com",
  "google.com", "yahoo.com", "hotmail.com", "outlook.com",
  "aol.com", "icloud.com", "mail.com", "protonmail.com",
  "yandex.com", "zoho.com",
]);

// Patterns for junk/automated addresses
const JUNK_PREFIXES = new Set([
  "noreply", "no-reply", "donotreply", "do-not-reply",
  "mailer-daemon", "postmaster", "webmaster", "admin@",
  "abuse", "hostmaster", "support@wix", "wordpress@",
  "root", "daemon",
]);

function isValidBusinessEmail(email: string): boolean {
  const lower = email.toLowerCase();
  const domain = lower.split("@")[1];
  
  if (!domain) return false;
  if (IGNORE_DOMAINS.has(domain)) return false;
  if (JUNK_PREFIXES.has(lower.split("@")[0])) return false;
  if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".svg")) return false;
  if (lower.includes("..") || lower.startsWith(".") || lower.startsWith("-")) return false;
  if (domain.split(".").length < 2) return false;
  
  return true;
}

// Score emails: prefer info@, contact@, hello@ for businesses
function scoreEmail(email: string): number {
  const prefix = email.toLowerCase().split("@")[0];
  if (prefix === "info" || prefix === "contact" || prefix === "hello") return 100;
  if (prefix === "sales" || prefix === "inquiries" || prefix === "inquiry") return 90;
  if (prefix === "office" || prefix === "front" || prefix === "reception") return 80;
  if (prefix.includes(".") || prefix.includes("_")) return 70; // likely first.last
  if (prefix === "general" || prefix === "team" || prefix === "mail") return 60;
  if (prefix === "support" || prefix === "help" || prefix === "service") return 40;
  return 50;
}

// ─── Crawl a website for emails ──────────────────────────
async function crawlForEmails(website: string): Promise<{ emails: string[]; pagesChecked: number }> {
  const allEmails = new Set<string>();
  let pagesChecked = 0;

  // Normalize URL
  let baseUrl = website.trim();
  if (!baseUrl.startsWith("http")) baseUrl = "https://" + baseUrl;
  try { new URL(baseUrl); } catch { return { emails: [], pagesChecked: 0 }; }

  // Pages to check — homepage + common contact/about pages
  const pagePaths = [
    "/",
    "/contact",
    "/contact-us",
    "/about",
    "/about-us",
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s max per site

  try {
    for (const path of pagePaths) {
      try {
        const url = new URL(path, baseUrl).toString();
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; LeadEnricher/1.0; +https://goldenstateepoxy.com)",
            "Accept": "text/html",
          },
          redirect: "follow",
        });

        if (!res.ok) continue;

        const html = await res.text();
        pagesChecked++;

        // Extract emails from HTML
        const found = html.match(EMAIL_REGEX) || [];
        for (const email of found) {
          if (isValidBusinessEmail(email)) {
            allEmails.add(email.toLowerCase());
          }
        }

        // Also check mailto: links explicitly
        const mailtoRegex = /mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi;
        let match;
        while ((match = mailtoRegex.exec(html)) !== null) {
          const email = match[1].toLowerCase();
          if (isValidBusinessEmail(email)) {
            allEmails.add(email);
          }
        }

        // If we found emails, no need to check more pages
        if (allEmails.size >= 3) break;
      } catch {
        continue;
      }
    }
  } finally {
    clearTimeout(timeout);
  }

  // Sort by score — best emails first
  const sorted = Array.from(allEmails).sort((a, b) => scoreEmail(b) - scoreEmail(a));
  return { emails: sorted, pagesChecked };
}

// ─── GET: Check enrichment status ────────────────────────
export async function GET() {
  try {
    const supabase = getSupabase();

    // Count leads with and without emails
    const { data: allLeads } = await supabase.from("leads").select("id, website");
    const { data: allContacts } = await supabase.from("contacts").select("lead_id, email, email_verified");

    const total = allLeads?.length || 0;
    const withWebsite = allLeads?.filter(l => l.website)?.length || 0;

    const contactMap = new Map<string, { email: string | null; verified: boolean }>();
    for (const c of allContacts || []) {
      const existing = contactMap.get(c.lead_id);
      if (!existing || (c.email && !existing.email)) {
        contactMap.set(c.lead_id, { email: c.email, verified: c.email_verified });
      }
    }

    const withEmail = Array.from(contactMap.values()).filter(c => c.email).length;
    const withVerifiedEmail = Array.from(contactMap.values()).filter(c => c.verified).length;

    return NextResponse.json({
      total,
      withWebsite,
      withEmail,
      withVerifiedEmail,
      needsEnrichment: withWebsite - withEmail,
    });
  } catch (error) {
    console.error("GET /api/enrich/email error:", error);
    return NextResponse.json({ error: "Failed to check enrichment status" }, { status: 500 });
  }
}

// ─── POST: Run email enrichment ──────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json().catch(() => ({}));
    const batchSize = Math.min(body.batchSize || 50, 100);
    const nowDate = new Date().toISOString();

    // Get leads that have a website but no email in contacts
    const { data: leadsWithWeb } = await supabase
      .from("leads")
      .select("id, company_name, website, contacts(id, email)")
      .not("website", "is", null)
      .order("created_at", { ascending: true });

    // Filter to leads without emails
    const needsEmail = (leadsWithWeb || []).filter(lead => {
      const contacts = lead.contacts || [];
      return contacts.length === 0 || contacts.every((c: any) => !c.email);
    });

    const batch = needsEmail.slice(0, batchSize);
    
    if (batch.length === 0) {
      return NextResponse.json({
        message: "All leads with websites already have emails",
        enriched: 0,
        total: leadsWithWeb?.length || 0,
      });
    }

    // Process batch
    const results: Array<{
      leadId: string;
      company: string;
      emails: string[];
      pagesChecked: number;
      status: "found" | "not_found" | "error";
    }> = [];

    // Process in parallel batches of 5 to respect rate limits
    for (let i = 0; i < batch.length; i += 5) {
      const chunk = batch.slice(i, i + 5);
      const chunkResults = await Promise.allSettled(
        chunk.map(async (lead) => {
          try {
            const result = await crawlForEmails(lead.website!);
            return {
              leadId: lead.id,
              company: lead.company_name,
              emails: result.emails,
              pagesChecked: result.pagesChecked,
              status: (result.emails.length > 0 ? "found" : "not_found") as "found" | "not_found",
            };
          } catch {
            return {
              leadId: lead.id,
              company: lead.company_name,
              emails: [] as string[],
              pagesChecked: 0,
              status: "error" as const,
            };
          }
        })
      );

      for (const r of chunkResults) {
        if (r.status === "fulfilled") results.push(r.value);
      }
    }

    // Update database with found emails
    let enrichedCount = 0;
    for (const result of results) {
      if (result.emails.length === 0) continue;

      const bestEmail = result.emails[0];
      enrichedCount++;

      // Check if lead has existing contact
      const { data: existingContacts } = await supabase
        .from("contacts")
        .select("id")
        .eq("lead_id", result.leadId)
        .limit(1);

      if (existingContacts && existingContacts.length > 0) {
        // Update existing contact
        await supabase
          .from("contacts")
          .update({
            email: bestEmail,
            email_verified: true,
          })
          .eq("id", existingContacts[0].id);
      } else {
        // Create new contact
        await supabase.from("contacts").insert({
          id: ulid(),
          lead_id: result.leadId,
          full_name: "General Contact",
          email: bestEmail,
          email_verified: true,
          is_decision_maker: false,
          created_at: nowDate,
        });
      }

      // Update lead score email_verified field
      const { data: existingScore } = await supabase
        .from("lead_scores")
        .select("id, total_score")
        .eq("lead_id", result.leadId)
        .limit(1);

      if (existingScore && existingScore.length > 0) {
        await supabase
          .from("lead_scores")
          .update({
            email_verified_score: 5,
            total_score: Math.min(100, (existingScore[0].total_score || 0) + 5),
          })
          .eq("id", existingScore[0].id);
      }

      // Log activity
      await supabase.from("activities").insert({
        id: ulid(),
        lead_id: result.leadId,
        type: "enrichment",
        description: `Email enriched: found ${result.emails.length} email(s) — ${bestEmail}`,
        metadata: JSON.stringify({
          allEmails: result.emails,
          pagesChecked: result.pagesChecked,
          source: "website_crawl",
        }),
        created_at: nowDate,
      });
    }

    // Log summary activity
    await supabase.from("activities").insert({
      id: ulid(),
      type: "enrichment",
      description: `Email enrichment batch complete: ${enrichedCount}/${batch.length} leads enriched`,
      metadata: JSON.stringify({
        batchSize: batch.length,
        enriched: enrichedCount,
        notFound: batch.length - enrichedCount,
        remaining: needsEmail.length - batch.length,
      }),
      created_at: nowDate,
    });

    return NextResponse.json({
      enriched: enrichedCount,
      processed: batch.length,
      remaining: needsEmail.length - batch.length,
      results: results.map(r => ({
        company: r.company,
        email: r.emails[0] || null,
        allEmails: r.emails,
        status: r.status,
        pagesChecked: r.pagesChecked,
      })),
    });
  } catch (error) {
    console.error("POST /api/enrich/email error:", error);
    return NextResponse.json({ error: "Failed to enrich emails" }, { status: 500 });
  }
}
