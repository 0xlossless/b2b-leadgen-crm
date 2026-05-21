#!/usr/bin/env node
// enrich-emails.js — Run locally to crawl lead websites and push emails to Supabase
// Usage: SERPAPI_KEY=xxx node enrich-emails.js

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SERPAPI_KEY = process.env.SERPAPI_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY");
  process.exit(1);
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

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

const JUNK_PREFIXES = new Set([
  "noreply", "no-reply", "donotreply", "do-not-reply",
  "mailer-daemon", "postmaster", "webmaster",
  "abuse", "hostmaster", "root", "daemon",
]);

function isValidBusinessEmail(email) {
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

function scoreEmail(email) {
  const prefix = email.toLowerCase().split("@")[0];
  if (prefix === "info" || prefix === "contact" || prefix === "hello") return 100;
  if (prefix === "sales" || prefix === "inquiries" || prefix === "inquiry") return 90;
  if (prefix === "office" || prefix === "front" || prefix === "reception") return 80;
  if (prefix.includes(".") || prefix.includes("_")) return 70;
  if (prefix === "general" || prefix === "team" || prefix === "mail") return 60;
  if (prefix === "support" || prefix === "help" || prefix === "service") return 40;
  return 50;
}

async function crawlForEmails(website) {
  const allEmails = new Set();
  let pagesChecked = 0;

  let baseUrl = website.trim();
  if (!baseUrl.startsWith("http")) baseUrl = "https://" + baseUrl;
  try { new URL(baseUrl); } catch { return { emails: [], pagesChecked: 0 }; }

  const pagePaths = ["/", "/contact", "/contact-us", "/about", "/about-us"];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    for (const path of pagePaths) {
      try {
        const url = new URL(path, baseUrl).toString();
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          redirect: "follow",
        });

        if (!res.ok) continue;
        const html = await res.text();
        pagesChecked++;

        const found = html.match(EMAIL_REGEX) || [];
        for (const email of found) {
          if (isValidBusinessEmail(email)) {
            allEmails.add(email.toLowerCase());
          }
        }

        const mailtoRegex = /mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi;
        let match;
        while ((match = mailtoRegex.exec(html)) !== null) {
          const email = match[1].toLowerCase();
          if (isValidBusinessEmail(email)) allEmails.add(email);
        }

        if (allEmails.size >= 3) break;
      } catch {
        continue;
      }
    }
  } finally {
    clearTimeout(timeout);
  }

  const sorted = Array.from(allEmails).sort((a, b) => scoreEmail(b) - scoreEmail(a));
  return { emails: sorted, pagesChecked };
}

// Supabase REST helpers
async function supabaseGet(table, params = "") {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
  const res = await fetch(url, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
    },
  });
  return res.json();
}

async function supabaseInsert(table, data) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal",
    },
    body: JSON.stringify(data),
  });
  return res.ok;
}

async function supabaseUpdate(table, id, data) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal",
    },
    body: JSON.stringify(data),
  });
  return res.ok;
}

function ulid() {
  // Simple unique ID generator
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).substring(2, 12);
  return (t + r).toUpperCase();
}

async function main() {
  console.log("🔍 Fetching leads from Supabase...");
  
  // Get all leads with websites
  const leads = await supabaseGet("leads", "select=id,company_name,website&website=not.is.null&order=created_at.asc");
  console.log(`📊 Found ${leads.length} leads with websites`);

  // Get existing contacts
  const contacts = await supabaseGet("contacts", "select=id,lead_id,email");
  const contactsByLead = {};
  for (const c of contacts) {
    if (!contactsByLead[c.lead_id]) contactsByLead[c.lead_id] = [];
    contactsByLead[c.lead_id].push(c);
  }

  // Filter leads that need emails
  const needsEmail = leads.filter(l => {
    const existing = contactsByLead[l.id] || [];
    return existing.length === 0 || existing.every(c => !c.email);
  });

  console.log(`📧 ${needsEmail.length} leads need email enrichment\n`);

  let enriched = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 0; i < needsEmail.length; i++) {
    const lead = needsEmail[i];
    const progress = `[${i + 1}/${needsEmail.length}]`;
    
    try {
      const result = await crawlForEmails(lead.website);

      if (result.emails.length > 0) {
        const bestEmail = result.emails[0];
        enriched++;
        console.log(`✅ ${progress} ${lead.company_name.padEnd(40)} → ${bestEmail} (${result.emails.length} found, ${result.pagesChecked} pages)`);

        // Check if contact exists
        const existing = contactsByLead[lead.id] || [];
        if (existing.length > 0) {
          await supabaseUpdate("contacts", existing[0].id, {
            email: bestEmail,
            email_verified: true,
          });
        } else {
          await supabaseInsert("contacts", {
            id: ulid(),
            lead_id: lead.id,
            full_name: "General Contact",
            email: bestEmail,
            email_verified: true,
            is_decision_maker: false,
            created_at: new Date().toISOString(),
          });
        }

        // Update lead score
        const scores = await supabaseGet("lead_scores", `lead_id=eq.${lead.id}&select=id,total_score`);
        if (scores.length > 0) {
          await supabaseUpdate("lead_scores", scores[0].id, {
            email_verified_score: 5,
            total_score: Math.min(100, (scores[0].total_score || 0) + 5),
          });
        }

        // Log activity
        await supabaseInsert("activities", {
          id: ulid(),
          lead_id: lead.id,
          type: "enrichment",
          description: `Email enriched: ${bestEmail} (${result.emails.length} total found)`,
          metadata: JSON.stringify({ allEmails: result.emails, pagesChecked: result.pagesChecked }),
          created_at: new Date().toISOString(),
        });
      } else {
        notFound++;
        console.log(`❌ ${progress} ${lead.company_name.padEnd(40)} → no email (${result.pagesChecked} pages checked)`);
      }
    } catch (err) {
      errors++;
      console.log(`⚠️  ${progress} ${lead.company_name.padEnd(40)} → error: ${err.message}`);
    }

    // Small delay to be nice to servers
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`📊 ENRICHMENT COMPLETE`);
  console.log(`   ✅ Emails found: ${enriched}`);
  console.log(`   ❌ Not found:    ${notFound}`);
  console.log(`   ⚠️  Errors:      ${errors}`);
  console.log(`${"═".repeat(60)}`);
}

main().catch(console.error);
